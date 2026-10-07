import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const RouterContext = createContext(null);

// Hash routing is only used for the static demo preview build (VITE_HASH_ROUTER=1),
// which is served from a URL whose path we do not control.
const HASH = import.meta.env.VITE_HASH_ROUTER === "1";
const hashPath = () => window.location.hash.replace(/^#/, "");
const current = () => (HASH ? hashPath().split("?")[0] || "/" : window.location.pathname.replace(/\/+$/, "") || "/");
const currentSearch = () => (HASH ? (hashPath().includes("?") ? `?${hashPath().split("?")[1]}` : "") : window.location.search);

export function Router({ children }) {
  const [path, setPath] = useState(current);
  const [search, setSearch] = useState(currentSearch);

  useEffect(() => {
    const onPop = () => {
      setPath(current());
      setSearch(currentSearch());
    };
    window.addEventListener("popstate", onPop);
    window.addEventListener("hashchange", onPop);
    return () => { window.removeEventListener("popstate", onPop); window.removeEventListener("hashchange", onPop); };
  }, []);

  const navigate = useCallback((to, { replace = false, keepScroll = false } = {}) => {
    const url = new URL(to, window.location.origin);
    if (HASH) {
      if (replace) window.history.replaceState({}, "", `#${url.pathname}${url.search}`);
      else window.location.hash = `${url.pathname}${url.search}`;
      setPath(url.pathname.replace(/\/+$/, "") || "/");
      setSearch(url.search);
      if (!keepScroll) window.scrollTo(0, 0);
      return;
    }
    if (url.origin !== window.location.origin) {
      window.location.assign(to);
      return;
    }
    const method = replace ? "replaceState" : "pushState";
    window.history[method]({}, "", url.pathname + url.search + url.hash);
    setPath(url.pathname.replace(/\/+$/, "") || "/");
    setSearch(url.search);
    if (!url.hash && !keepScroll) window.scrollTo(0, 0);
  }, []);

  const value = useMemo(() => ({ path, search, navigate, params: new URLSearchParams(search) }), [path, search, navigate]);
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export const useRouter = () => useContext(RouterContext);

/** State that lives in the URL (?key=value) so filters, tabs and ranges are shareable and survive reloads. */
export function useQueryState(key, fallback = "") {
  const { path, params, navigate } = useRouter();
  const value = params.get(key) ?? fallback;
  const set = useCallback((next) => {
    const p = new URLSearchParams(window.location.search || (HASH ? (hashPath().split("?")[1] || "") : ""));
    if (next === fallback || next === "" || next === null || next === undefined) p.delete(key);
    else p.set(key, String(next));
    const qs = p.toString();
    navigate(`${path}${qs ? `?${qs}` : ""}`, { replace: true, keepScroll: true });
  }, [key, fallback, path, navigate]);
  return [value, set];
}

/** Match "/app/links/:id" against a path. Returns params or null. */
export function match(pattern, path) {
  const p = pattern.split("/").filter(Boolean);
  const s = path.split("/").filter(Boolean);
  if (pattern.endsWith("/*")) {
    p.pop();
    if (s.length < p.length) return null;
  } else if (p.length !== s.length) return null;
  const params = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(":")) params[p[i].slice(1)] = decodeURIComponent(s[i]);
    else if (p[i] !== s[i]) return null;
  }
  return params;
}

export function Link({ to, children, onClick, replace, ...rest }) {
  const { navigate } = useRouter();
  const handle = (e) => {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || rest.target === "_blank") return;
    e.preventDefault();
    navigate(to, { replace });
  };
  return (
    <a href={HASH && to.startsWith("/") ? `#${to}` : to} onClick={handle} {...rest}>
      {children}
    </a>
  );
}

/** Click handler for in-page anchors (skip links, docs navigation) that works with any router mode. */
export const jump = (id) => (e) => {
  e.preventDefault();
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ block: "start" });
  el.focus?.({ preventScroll: true });
};
