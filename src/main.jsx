import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  CalendarDays,
  ChevronDown,
  CircleHelp,
  Copy,
  ExternalLink,
  Globe2,
  LayoutDashboard,
  Link2,
  ListFilter,
  MoreHorizontal,
  MousePointerClick,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Tag,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import {
  auth,
  firebaseConfigured,
  googleProvider,
  signInWithPopup,
} from "./firebase";
import "./styles.css";

const chartPoints = [
  36, 42, 38, 55, 48, 62, 57, 72, 68, 78, 73, 89, 82, 96, 88, 104, 98, 112, 108,
  124, 116, 132, 126, 145,
];

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [theme, setTheme] = useState(
    () => window.localStorage.getItem("lss-theme") || "light",
  );
  const [links, setLinks] = useState([]);
  const [activePage, setActivePage] = useState("Overview");
  const [showModal, setShowModal] = useState(false);
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [linkError, setLinkError] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);
  const totalClicks = links.reduce(
    (total, link) => total + Number(link.clickCount || 0),
    0,
  );

  const copyLink = () => {
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("lss-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!auth) {
      setAuthLoading(false);
      return undefined;
    }
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!user || !auth) return;
    const loadLinks = async () => {
      try {
        const token = await user.getIdToken();
        const apiUrl = import.meta.env.VITE_SHORTENER_API_URL || "";
        const result = await fetch(`${apiUrl}/api/links`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!result.ok) return;
        const data = await result.json();
        setLinks(data.links || []);
      } catch (error) {
        console.error("Unable to load links", error);
      }
    };
    loadLinks();
  }, [user]);

  const createShortLink = async (event) => {
    event.preventDefault();
    setLinkError("");
    setLinkBusy(true);
    try {
      const token = await user.getIdToken();
      const form = new FormData(event.currentTarget);
      const result = await fetch(
        `${import.meta.env.VITE_SHORTENER_API_URL || ""}/api/links`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            destination: form.get("destination"),
            slug: form.get("slug"),
          }),
        },
      );
      const data = await result.json();
      if (!result.ok) throw new Error(data.error || "Unable to create link");
      setLinks((current) => [data.link, ...current]);
      await navigator.clipboard?.writeText(data.link.shortUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
      setShowModal(false);
      setUrl("");
    } catch (error) {
      setLinkError(error.message);
    } finally {
      setLinkBusy(false);
    }
  };

  if (!firebaseConfigured) {
    return <AuthScreen configured={false} />;
  }
  if (authLoading) {
    return (
      <div className="auth-loading">
        <div className="brand-mark">
          <Link2 size={18} />
        </div>
        <span>Loading your workspace...</span>
      </div>
    );
  }
  if (!user) {
    return <AuthScreen configured />;
  }

  return (
    <div className={`app-shell ${theme === "dark" ? "dark-theme" : ""}`}>
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark">
            <Link2 size={18} strokeWidth={2.6} />
          </div>
          <div>
            <strong>
              Long Story
              <br />
              <span>Short</span>
            </strong>
          </div>
        </div>
        <div className="workspace-switcher">
          <div className="workspace-avatar">A</div>
          <div>
            <span className="eyebrow">Workspace</span>
            <strong>Acme Studio</strong>
          </div>
          <ChevronDown size={15} />
        </div>
        <nav className="primary-nav">
          <p className="nav-label">Workspace</p>
          {[
            ["Overview", LayoutDashboard],
            ["Links", Link2],
            ["Analytics", BarChart3],
            ["Audiences", Users],
          ].map(([label, Icon]) => (
            <button
              className={`nav-item ${activePage === label ? "selected" : ""}`}
              key={label}
              onClick={() => setActivePage(label)}
            >
              <Icon size={18} />
              <span>{label}</span>
              {label === "Links" && <b className="nav-count">24</b>}
            </button>
          ))}
          <p className="nav-label nav-label-spaced">Manage</p>
          {[
            ["Domains", Globe2],
            ["Tags", Tag],
            ["Integrations", Sparkles],
          ].map(([label, Icon]) => (
            <button
              className={`nav-item ${activePage === label ? "selected" : ""}`}
              key={label}
              onClick={() => setActivePage(label)}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="usage-card">
            <div className="usage-top">
              <span>Monthly clicks</span>
              <span>72%</span>
            </div>
            <div className="progress">
              <span />
            </div>
            <p>
              72,340 <em>of 100,000</em>
            </p>
            <button onClick={() => setActivePage("Billing")}>
              Manage plan <ArrowUpRight size={13} />
            </button>
          </div>
          <button className="nav-item">
            <Settings2 size={18} />
            <span>Settings</span>
          </button>
          <button className="nav-item">
            <CircleHelp size={18} />
            <span>Help center</span>
          </button>
          <div className="profile">
            <div className="profile-avatar">MK</div>
            <div>
              <strong>Marcus Kim</strong>
              <span>Admin</span>
            </div>
            <MoreHorizontal size={17} />
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Workspace</span>
            <span>/</span>
            <strong>{activePage}</strong>
          </div>
          <div className="top-actions">
            <button className="icon-button">
              <Bell size={18} />
              <i />
            </button>
            <button className="help-button">
              <CircleHelp size={16} /> Support
            </button>
            <button
              className="theme-toggle"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? "☀" : "☾"}
            </button>
            <button
              className="avatar-small"
              onClick={() => signOut(auth)}
              title="Sign out"
            >
              {(user.displayName || user.email || "U")
                .slice(0, 2)
                .toUpperCase()}
            </button>
          </div>
        </header>
        <div className="content-wrap">
          <div className="page-heading">
            <div>
              <p className="kicker">
                <Activity size={14} /> Workspace overview
              </p>
              <h1>
                Good morning, Marcus <span>✦</span>
              </h1>
              <p className="subheading">
                Here is what is happening with your links today.
              </p>
            </div>
            <button
              className="primary-button"
              onClick={() => setShowModal(true)}
            >
              <Plus size={18} /> Shorten a link
            </button>
          </div>

          <section className="stats-grid">
            <StatCard
              label="Total clicks"
              value={totalClicks.toLocaleString()}
              change="Live"
              trend="neutral"
              icon={MousePointerClick}
              note="from your links"
            />
            <StatCard
              label="Active links"
              value={links.filter((link) => link.status === "active").length}
              change="Live"
              trend="neutral"
              icon={Link2}
              note="in your workspace"
            />
            <StatCard
              label="Click-through rate"
              value="—"
              change="Soon"
              trend="neutral"
              icon={BarChart3}
              note="needs traffic data"
            />
            <StatCard
              label="Top location"
              value="—"
              change="Soon"
              trend="neutral"
              icon={Globe2}
              note="needs traffic data"
            />
          </section>

          <section className="dashboard-grid">
            <div className="panel analytics-panel">
              <div className="panel-header">
                <div>
                  <h2>Click performance</h2>
                  <p>Track how your links are performing over time.</p>
                </div>
                <div className="period-picker">
                  <CalendarDays size={15} /> Last 30 days{" "}
                  <ChevronDown size={14} />
                </div>
              </div>
              <div className="chart-meta">
                <div>
                  <strong>{totalClicks.toLocaleString()}</strong>
                  <span>Total clicks</span>
                </div>
                <div className="chart-change">
                  {links.length ? (
                    <>
                      <ArrowUpRight size={15} /> Live
                    </>
                  ) : (
                    "No click data yet"
                  )}
                </div>
              </div>
              <div className="chart">
                <div className="y-axis">
                  <span>160k</span>
                  <span>120k</span>
                  <span>80k</span>
                  <span>40k</span>
                  <span>0</span>
                </div>
                <div className="chart-body">
                  <div className="grid-lines">
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                  </div>
                  {links.length ? (
                    <svg
                      viewBox="0 0 720 190"
                      preserveAspectRatio="none"
                      role="img"
                      aria-label="Click performance line chart"
                    >
                      <defs>
                        <linearGradient
                          id="fillBlue"
                          x1="0"
                          x2="0"
                          y1="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#2168f3"
                            stopOpacity=".2"
                          />
                          <stop
                            offset="100%"
                            stopColor="#2168f3"
                            stopOpacity="0"
                          />
                        </linearGradient>
                      </defs>
                      <path
                        d="M0 160 C30 150 34 150 62 148 S94 145 123 136 S154 145 185 125 S216 118 247 120 S280 102 308 108 S338 96 370 95 S404 80 432 86 S462 71 493 76 S530 56 555 61 S586 43 617 49 S650 27 677 31 S700 19 720 20 L720 190 L0 190 Z"
                        fill="url(#fillBlue)"
                      />
                      <path
                        d="M0 160 C30 150 34 150 62 148 S94 145 123 136 S154 145 185 125 S216 118 247 120 S280 102 308 108 S338 96 370 95 S404 80 432 86 S462 71 493 76 S530 56 555 61 S586 43 617 49 S650 27 677 31 S700 19 720 20"
                        fill="none"
                        stroke="#2168f3"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    </svg>
                  ) : (
                    <div className="chart-empty">
                      Create your first short link to start collecting click
                      data.
                    </div>
                  )}
                  <div className="x-axis">
                    <span>Aug 12</span>
                    <span>Aug 17</span>
                    <span>Aug 22</span>
                    <span>Aug 27</span>
                    <span>Sep 01</span>
                    <span>Sep 06</span>
                    <span>Sep 11</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="panel traffic-panel">
              <div className="panel-header">
                <div>
                  <h2>Top traffic sources</h2>
                  <p>Where your audience comes from.</p>
                </div>
                <button className="more-button">
                  <MoreHorizontal size={18} />
                </button>
              </div>
              <div className="donut-wrap">
                <div className="donut">
                  <div>
                    <strong>72.3k</strong>
                    <span>Clicks</span>
                  </div>
                </div>
                <div className="legend">
                  <Legend color="blue" label="Direct / none" value="42.1%" />
                  <Legend color="green" label="Instagram" value="24.8%" />
                  <Legend color="yellow" label="Google" value="18.4%" />
                  <Legend color="coral" label="Other" value="14.7%" />
                </div>
              </div>
              <button
                className="text-button"
                onClick={() => setActivePage("Analytics")}
              >
                View full report <ArrowUpRight size={14} />
              </button>
            </div>
          </section>

          <section className="panel links-panel">
            <div className="panel-header links-header">
              <div>
                <h2>Recent links</h2>
                <p>Your latest shortened links and their performance.</p>
              </div>
              <div className="table-actions">
                <div className="search-field">
                  <Search size={16} />
                  <input placeholder="Search links" />
                </div>
                <button className="filter-button">
                  <ListFilter size={16} /> Filter
                </button>
                <button
                  className="view-all"
                  onClick={() => setActivePage("Links")}
                >
                  View all <ArrowUpRight size={14} />
                </button>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Link</th>
                    <th>Clicks</th>
                    <th>Change</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {links.length ? (
                    links.map((link) => {
                      const displayLink = presentLink(link);
                      return (
                        <tr key={link.id || link.slug}>
                          <td>
                            <div className="link-cell">
                              <span
                                className={`link-icon ${displayLink.color}`}
                              >
                                <Link2 size={15} />
                              </span>
                              <div>
                                <strong>{displayLink.title}</strong>
                                <span>{displayLink.slug}</span>
                              </div>
                            </div>
                          </td>
                          <td className="number-cell">{displayLink.clicks}</td>
                          <td>
                            <span
                              className={
                                displayLink.change.startsWith("+")
                                  ? "positive"
                                  : "negative"
                              }
                            >
                              {displayLink.change.startsWith("+") ? (
                                <ArrowUpRight size={14} />
                              ) : (
                                <ArrowDownRight size={14} />
                              )}
                              {displayLink.change}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`status ${displayLink.status.toLowerCase()}`}
                            >
                              <i />
                              {displayLink.status}
                            </span>
                          </td>
                          <td className="date-cell">{displayLink.date}</td>
                          <td>
                            <button className="row-menu">
                              <MoreHorizontal size={17} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="6" className="table-empty">
                        No links yet. Create your first short link above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
          <footer className="footer">
            <span>Long Story Short · Built for the links that matter.</span>
            <span>
              System status <i className="status-dot" /> All systems operational
            </span>
          </footer>
        </div>
      </main>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-heading">
              <div>
                <p className="kicker">
                  <Sparkles size={14} /> Quick action
                </p>
                <h2>Shorten a link</h2>
                <p>Turn a long URL into something worth sharing.</p>
              </div>
              <button
                className="close-button"
                onClick={() => setShowModal(false)}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={createShortLink}>
              <label>
                Destination URL
                <input
                  autoFocus
                  name="destination"
                  required
                  type="url"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="https://example.com/your-long-url"
                />
              </label>
              <div className="modal-options">
                <label>
                  Short domain
                  <select disabled>
                    <option>go.consolaktif.com.tr</option>
                  </select>
                </label>
                <label>
                  Custom slug
                  <input
                    name="slug"
                    pattern="[A-Za-z0-9_-]{3,48}"
                    placeholder="optional"
                  />
                </label>
              </div>
              {linkError && <p className="auth-error">{linkError}</p>}
              <button
                className="primary-button modal-submit"
                disabled={linkBusy}
              >
                <Link2 size={17} />{" "}
                {linkBusy ? "Creating..." : "Create short link"}
              </button>
            </form>
            <div className="modal-note">
              <ShieldCheck size={15} /> Your link is protected by
              enterprise-grade analytics.
            </div>
          </div>
        </div>
      )}
      {copied && (
        <div className="toast">
          <Copy size={15} /> Link copied to clipboard
        </div>
      )}
    </div>
  );
}

function AuthScreen({ configured }) {
  const [mode, setMode] = useState("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleEmailAuth = async (event) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "sign-in") {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (authError) {
      setError(
        authError.code?.replace("auth/", "").replaceAll("-", " ") ||
          "Unable to authenticate",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError("");
    setBusy(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (authError) {
      setError(
        authError.code?.replace("auth/", "").replaceAll("-", " ") ||
          "Google sign-in was cancelled",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-shell">
      <div className="auth-visual">
        <div className="auth-visual-brand">
          <div className="brand-mark">
            <Link2 size={19} />
          </div>
          <strong>
            Long Story
            <br />
            <span>Short</span>
          </strong>
        </div>
        <div className="auth-quote">
          <span>“</span>
          <h1>
            Make every link
            <br />
            worth the click.
          </h1>
          <p>
            A link shortener for teams who care about what happens after the
            share.
          </p>
          <div className="auth-stat">
            <strong>2.4B+</strong>
            <span>links understood by our platform</span>
          </div>
        </div>
      </div>
      <section className="auth-card">
        <div className="auth-mobile-brand">
          <div className="brand-mark">
            <Link2 size={18} />
          </div>
          <strong>
            Long Story <span>Short</span>
          </strong>
        </div>
        {!configured ? (
          <div className="setup-state">
            <div className="setup-icon">
              <Settings2 size={24} />
            </div>
            <h2>Connect Firebase to continue</h2>
            <p>
              Copy <strong>.env.example</strong> to <strong>.env.local</strong>,
              add your Firebase Web App values, then restart Vite.
            </p>
            <code>cp .env.example .env.local</code>
            <div className="setup-steps">
              <span>1. Create a Firebase project</span>
              <span>2. Enable Google and Email/Password providers</span>
              <span>3. Add your web app config to .env.local</span>
            </div>
          </div>
        ) : (
          <>
            <div className="auth-heading">
              <p className="kicker">
                <Sparkles size={14} /> Welcome back
              </p>
              <h2>
                {mode === "sign-in"
                  ? "Sign in to your workspace"
                  : "Create your workspace"}
              </h2>
              <p>Manage, share, and understand every link in one place.</p>
            </div>
            <button
              className="google-button"
              onClick={handleGoogleAuth}
              disabled={busy}
            >
              <span className="google-g">G</span>
              {busy ? "Connecting..." : "Continue with Google"}
            </button>
            <div className="auth-divider">
              <span>or continue with email</span>
            </div>
            <form onSubmit={handleEmailAuth}>
              <label>
                Email address
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@company.com"
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  required
                  minLength="6"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 6 characters"
                />
              </label>
              {error && <p className="auth-error">{error}</p>}
              <button className="primary-button auth-submit" disabled={busy}>
                {mode === "sign-in" ? "Sign in" : "Create account"}
                <ArrowUpRight size={16} />
              </button>
            </form>
            <p className="auth-switch">
              {mode === "sign-in"
                ? "New to Long Story Short?"
                : "Already have an account?"}{" "}
              <button
                onClick={() => {
                  setMode(mode === "sign-in" ? "sign-up" : "sign-in");
                  setError("");
                }}
              >
                {mode === "sign-in" ? "Create an account" : "Sign in"}
              </button>
            </p>
          </>
        )}
      </section>
    </main>
  );
}

function presentLink(link) {
  let title = link.title;
  try {
    title = title || new URL(link.destination).hostname;
  } catch {
    title = title || "Untitled link";
  }

  const createdAt = link.createdAt?.seconds
    ? new Date(link.createdAt.seconds * 1000).toLocaleDateString()
    : "Just now";

  return {
    title,
    slug: link.slug,
    clicks: String(link.clickCount ?? 0),
    change: "—",
    status: link.status === "active" ? "Active" : "Paused",
    date: createdAt,
    color: "blue",
  };
}

function StatCard({ label, value, change, trend, icon: Icon, note }) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span className="stat-icon">
          <Icon size={17} />
        </span>
        <span className="stat-label">{label}</span>
        <button className="card-more">
          <MoreHorizontal size={16} />
        </button>
      </div>
      <strong className="stat-value">{value}</strong>
      <div className="stat-bottom">
        <span className={trend === "neutral" ? "neutral" : "positive"}>
          {trend === "up" && <ArrowUpRight size={14} />}
          {change}
        </span>
        <span>{note}</span>
      </div>
    </div>
  );
}
function Legend({ color, label, value }) {
  return (
    <div className="legend-row">
      <span>
        <i className={`legend-dot ${color}`} />
        {label}
      </span>
      <strong>{value}</strong>
    </div>
  );
}

export default App;

createRoot(document.getElementById("root")).render(<App />);
