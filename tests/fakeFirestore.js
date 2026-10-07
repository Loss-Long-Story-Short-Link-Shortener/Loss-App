// Tiny in-memory Firestore double: just enough surface for the API handlers.
// Timestamp stand-in: a Date that also answers toDate()/toMillis() like Firestore's Timestamp.
class FakeTs extends Date {
  toDate() { return new Date(this.getTime()); }
  toMillis() { return this.getTime(); }
}

function clone(v) {
  if (Array.isArray(v)) return v.map(clone);
  if (v instanceof Date) return v; // immutable enough for tests; keeps FakeTs methods
  if (v && typeof v === "object" && Object.getPrototypeOf(v) === Object.prototype) {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clone(x)]));
  }
  return v;
}

function resolveSentinels(data, existing = {}) {
  const out = { ...existing };
  for (const [key, value] of Object.entries(data)) {
    const name = value?.constructor?.name;
    if (name === "ServerTimestampTransform") out[key] = new FakeTs();
    else if (name === "NumericIncrementTransform") out[key] = (existing[key] || 0) + value.operand;
    else if (name === "DeleteTransform") delete out[key];
    else if (name === "ArrayUnionTransform") out[key] = [...new Set([...(existing[key] || []), ...value.elements])];
    else if (name === "ArrayRemoveTransform") out[key] = (existing[key] || []).filter((x) => !value.elements.includes(x));
    else out[key] = value;
  }
  return out;
}

class DocSnap {
  constructor(ref, data) { this.ref = ref; this.id = ref.id; this._data = data; this.exists = data !== undefined; }
  data() { return this._data === undefined ? undefined : clone(this._data); }
}

class DocRef {
  constructor(store, path) { this.store = store; this.path = path; this.id = path.split("/").pop(); }
  async get() { return new DocSnap(this, this.store.docs.get(this.path)); }
  async create(data) {
    if (this.store.docs.has(this.path)) throw Object.assign(new Error("6 ALREADY_EXISTS"), { code: 6 });
    this.store.docs.set(this.path, resolveSentinels(data));
  }
  async set(data, opts) {
    const existing = opts?.merge ? this.store.docs.get(this.path) || {} : {};
    this.store.docs.set(this.path, resolveSentinels(data, existing));
  }
  async update(data) {
    if (!this.store.docs.has(this.path)) throw new Error("NOT_FOUND");
    // update() treats dotted keys as nested field paths, like real Firestore.
    const next = clone(this.store.docs.get(this.path));
    for (const [key, value] of Object.entries(data)) {
      const parts = key.split(".");
      let target = next;
      for (const part of parts.slice(0, -1)) target = target[part] ??= {};
      const last = parts.at(-1);
      if (value?.constructor?.name === "DeleteTransform") delete target[last];
      else Object.assign(target, resolveSentinels({ [last]: value }, target));
    }
    this.store.docs.set(this.path, next);
  }
  async delete() { this.store.docs.delete(this.path); }
  collection(name) { return new Query(this.store, `${this.path}/${name}`); }
}

class Query {
  constructor(store, path, filters = [], order = null, max = Infinity, after = null) {
    Object.assign(this, { store, path, filters, order, max, after });
  }
  doc(id) { return new DocRef(this.store, `${this.path}/${id}`); }
  where(field, op, value) { return new Query(this.store, this.path, [...this.filters, { field, op, value }], this.order, this.max, this.after); }
  orderBy(field, dir = "asc") { return new Query(this.store, this.path, this.filters, { field, dir }, this.max, this.after); }
  limit(n) { return new Query(this.store, this.path, this.filters, this.order, n, this.after); }
  startAfter(snap) { return new Query(this.store, this.path, this.filters, this.order, this.max, snap.id); }
  select() { return this; }
  _rows() {
    const prefix = `${this.path}/`;
    const group = this.path.startsWith("*group:") ? this.path.slice(7) : null;
    let rows = [...this.store.docs.entries()]
      .filter(([p]) => {
        if (group) {
          const parts = p.split("/");
          return parts.length >= 2 && parts.length % 2 === 0 && parts[parts.length - 2] === group;
        }
        return p.startsWith(prefix) && !p.slice(prefix.length).includes("/");
      })
      .map(([p, d]) => [p, d])
      .filter(([, d]) => this.filters.every(({ field, op, value }) => {
        const v = d[field];
        if (op === "==") return v === value;
        if (op === ">=") return v >= value;
        if (op === "<=") return v <= value;
        if (op === "in") return value.includes(v);
        if (op === "array-contains") return Array.isArray(v) && v.includes(value);
        return true;
      }));
    if (this.order) {
      const { field, dir } = this.order;
      rows.sort(([, a], [, b]) => (a[field] > b[field] ? 1 : a[field] < b[field] ? -1 : 0) * (dir === "desc" ? -1 : 1));
    }
    if (this.after) {
      const i = rows.findIndex(([p]) => p.endsWith(`/${this.after}`));
      rows = rows.slice(i + 1);
    }
    return rows.slice(0, this.max);
  }
  async get() {
    const docs = this._rows().map(([p, d]) => new DocSnap(new DocRef(this.store, p), d));
    return { docs, size: docs.length, empty: docs.length === 0 };
  }
  count() { return { get: async () => ({ data: () => ({ count: this._rows().length }) }) }; }
  async add(data) {
    const id = `auto${this.store.seq++}`;
    await this.doc(id).set(data);
    return this.doc(id);
  }
}

export function createFakeDb() {
  const store = { docs: new Map(), seq: 1 };
  const db = new Query(store, "");
  db.collection = (name) => new Query(store, name);
  db.collectionGroup = (name) => new Query(store, `*group:${name}`);
  db.runTransaction = async (fn) =>
    fn({
      get: (ref) => ref.get(),
      set: (ref, data, opts) => ref.set(data, opts),
      update: (ref, data) => ref.update(data),
    });
  db.recursiveDelete = async (ref) => {
    for (const key of [...store.docs.keys()]) if (key === ref.path || key.startsWith(`${ref.path}/`)) store.docs.delete(key);
  };
  db.store = store;
  db.seed = (path, data) => store.docs.set(path, data);
  return db;
}

export function mockResponse() {
  const res = { statusCode: 200, headers: {}, body: undefined, ended: false };
  res.setHeader = (k, v) => { res.headers[k.toLowerCase()] = v; return res; };
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (b) => { res.body = b; res.ended = true; return res; };
  res.send = (b) => { res.body = b; res.ended = true; return res; };
  res.end = () => { res.ended = true; return res; };
  res.redirect = (code, url) => { res.statusCode = code; res.headers.location = url; res.ended = true; return res; };
  return res;
}
