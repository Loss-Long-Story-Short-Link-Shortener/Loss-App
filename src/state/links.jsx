import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "./auth";

const LinksContext = createContext(null);

export function LinksProvider({ children }) {
  const { user, me, workspaceId, refreshMe } = useAuth();
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const seq = useRef(0);

  const reload = useCallback(async () => {
    const id = ++seq.current;
    setLoading(true);
    try {
      const list = await api.links.listAll();
      if (id !== seq.current) return;
      setLinks(list);
      setError("");
    } catch (e) {
      if (id === seq.current) setError(e.message);
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, []);

  // Reload whenever the account or the active workspace changes (after /me resolved the session).
  useEffect(() => {
    if (!user || !me) { if (!user) { setLinks([]); setLoading(false); } return; }
    reload();
  }, [user, workspaceId, me?.workspace?.id, reload]); // eslint-disable-line react-hooks/exhaustive-deps

  const create = useCallback(async (body) => {
    const link = await api.links.create(body);
    setLinks((l) => [link, ...l]);
    refreshMe();
    return link;
  }, [refreshMe]);

  const update = useCallback(async (id, body) => {
    const link = await api.links.update(id, body);
    setLinks((l) => l.map((x) => (x.id === id ? { ...x, ...link } : x)));
    return link;
  }, []);

  const remove = useCallback(async (id) => {
    await api.links.remove(id);
    setLinks((l) => l.filter((x) => x.id !== id));
    refreshMe();
  }, [refreshMe]);

  const bulk = useCallback(async (action, ids, extra) => {
    const res = await api.links.bulk(action, ids, extra);
    await reload();
    refreshMe();
    return res;
  }, [reload, refreshMe]);

  const value = useMemo(() => ({ links, loading, error, reload, create, update, remove, bulk }), [links, loading, error, reload, create, update, remove, bulk]);
  return <LinksContext.Provider value={value}>{children}</LinksContext.Provider>;
}

export const useLinks = () => useContext(LinksContext);
