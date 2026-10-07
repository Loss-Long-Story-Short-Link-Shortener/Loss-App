import { Suspense, lazy, useEffect } from "react";
import { I18nProvider, useI18n } from "./lib/i18n";
import { Router, match, useRouter } from "./lib/router";
import { AuthProvider } from "./state/auth";
import { ThemeProvider } from "./state/theme";
import { ToastProvider } from "./state/toast";
import { ErrorBoundary } from "./ui/ErrorBoundary";
import { ConfirmProvider } from "./ui/Confirm";
import Landing from "./pages/marketing/Landing";

const AppShell = lazy(() => import("./pages/app/AppShell"));
const AuthPage = lazy(() => import("./pages/auth/AuthPage"));
const InvitePage = lazy(() => import("./pages/auth/InvitePage"));
const Pricing = lazy(() => import("./pages/marketing/Pricing"));
const Features = lazy(() => import("./pages/marketing/Features"));
const Docs = lazy(() => import("./pages/marketing/Docs"));
const Legal = lazy(() => import("./pages/marketing/Legal"));
const Abuse = lazy(() => import("./pages/marketing/Abuse"));
const NotFound = lazy(() => import("./pages/marketing/NotFound"));

const SEO = {
  "/": ["Loss - Link kısaltma, dinamik QR kod ve analiz platformu", "Loss - Link shortener, dynamic QR codes and analytics"],
  "/pricing": ["Fiyatlandırma - Loss", "Pricing - Loss"], "/features": ["Özellikler - Loss", "Features - Loss"], "/developers": ["API dokümantasyonu - Loss", "API documentation - Loss"],
  "/privacy": ["Gizlilik politikası - Loss", "Privacy policy - Loss"], "/terms": ["Kullanım koşulları - Loss", "Terms of service - Loss"], "/abuse": ["Kötüye kullanım bildir - Loss", "Report abuse - Loss"],
};

function Routes() {
  const { path } = useRouter();
  const { t } = useI18n();

  useEffect(() => {
    const pair = SEO[path];
    const isApp = path.startsWith("/app") || path === "/login" || path === "/register" || path.startsWith("/invite");
    document.title = pair ? t(...pair) : isApp ? "Loss" : t("Sayfa bulunamadı - Loss", "Page not found - Loss");
    let robots = document.querySelector('meta[name="robots"]');
    if (!robots) { robots = document.createElement("meta"); robots.name = "robots"; document.head.appendChild(robots); }
    robots.content = pair ? "index, follow, max-image-preview:large" : "noindex, nofollow";
    let canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.href = `https://loss.tr${path === "/" ? "/" : path}`;
  }, [path, t]);

  if (path === "/") return <Landing />;
  if (path === "/app" || path.startsWith("/app/")) return <AppShell />;
  if (path === "/login" || path === "/register") return <AuthPage mode={path === "/login" ? "login" : "register"} />;
  const invite = match("/invite/:token", path);
  if (invite) return <InvitePage token={invite.token} />;
  if (path === "/pricing") return <Pricing />;
  if (path === "/features") return <Features />;
  if (path === "/developers") return <Docs />;
  if (path === "/privacy" || path === "/terms") return <Legal kind={path.slice(1)} />;
  if (path === "/abuse") return <Abuse />;
  return <NotFound />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <I18nProvider>
          <ToastProvider>
            <ConfirmProvider>
            <AuthProvider>
              <Router>
                <Suspense fallback={<div className="route-loading" role="status"><span className="sr-only">Loading</span></div>}>
                  <Routes />
                </Suspense>
              </Router>
            </AuthProvider>
            </ConfirmProvider>
          </ToastProvider>
        </I18nProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
