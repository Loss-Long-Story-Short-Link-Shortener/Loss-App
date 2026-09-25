import { useState, useEffect } from "react";
import { useAuth } from "./context/AuthContext";
import { LossNavbar } from "./components/layout/LossNavbar";
import { LossFooter } from "./components/layout/LossFooter";
import { Sidebar } from "./components/layout/Sidebar";

import { ToastContainer } from "./components/common/Toast";

// Pages
import { OverviewPage } from "./pages/OverviewPage";
import { ShortenerStudioPage } from "./pages/ShortenerStudioPage";
import { LinksPage } from "./pages/LinksPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { QrStudioPage } from "./pages/QrStudioPage";
import { BillingPage } from "./pages/BillingPage";
import { SettingsPage } from "./pages/SettingsPage";
import { RedirectPage } from "./pages/RedirectPage";

// Modals
import { CreateLinkModal } from "./components/modals/CreateLinkModal";
import { EditLinkModal } from "./components/modals/EditLinkModal";
import { QrDetailModal } from "./components/modals/QrDetailModal";
import { UpgradeModal } from "./components/modals/UpgradeModal";
import { DeleteModal } from "./components/modals/DeleteModal";
import { AuthModal } from "./components/modals/AuthModal";
import { BackgroundMesh } from "./components/common/BackgroundMesh";

export default function App() {
  const { authLoading, authModalOpen, setAuthModalOpen, authModalReason } =
    useAuth();

  // Slug route detection for client-side redirection
  const [redirectSlug, setRedirectSlug] = useState(() => {
    if (typeof window !== "undefined") {
      const path = window.location.pathname.replace(/^\/+/, "").split("/")[0];
      const ignored = [
        "",
        "login",
        "register",
        "admin",
        "api",
        "app",
        "s",
        "shortener",
        "link-shortener",
        "kisalt",
        "short",
        "dashboard",
        "links",
        "analytics",
        "qr",
        "qrcodes",
        "billing",
        "settings",
      ];
      if (path && !ignored.includes(path.toLowerCase())) {
        return path;
      }
    }
    return null;
  });

  // Navigation state initialized by pathname
  const [activePage, setActivePage] = useState(() => {
    if (typeof window !== "undefined") {
      const p = window.location.pathname.toLowerCase();
      if (
        p.startsWith("/s/") ||
        p === "/s" ||
        p === "/s/link-shortener" ||
        p === "/link-shortener" ||
        p === "/shortener" ||
        p === "/short" ||
        p === "/kisalt"
      ) {
        return "Shortener";
      }
      if (p === "/links") return "Links";
      if (p === "/analytics") return "Analytics";
      if (p === "/qr" || p === "/qrcodes") return "QRCodes";
      if (p === "/billing") return "Billing";
      if (p === "/settings") return "Settings";
    }
    return "Overview";
  });

  const [prefilledUrl, setPrefilledUrl] = useState("");
  const [createModalPrefill, setCreateModalPrefill] = useState({});
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  // Synchronize browser history on navigation
  const handleNavigate = (pageName, urlParam = "") => {
    setActivePage(pageName);
    if (urlParam) {
      setPrefilledUrl(urlParam);
    }
    if (typeof window !== "undefined") {
      let targetPath = "/";
      if (pageName === "Shortener") targetPath = "/link-shortener";
      else if (pageName === "Links") targetPath = "/links";
      else if (pageName === "Analytics") targetPath = "/analytics";
      else if (pageName === "QRCodes") targetPath = "/qrcodes";
      else if (pageName === "Billing") targetPath = "/billing";
      else if (pageName === "Settings") targetPath = "/settings";
      window.history.pushState({}, "", targetPath);
    }
  };

  // Listen to popstate (browser back/forward)
  useEffect(() => {
    const onPop = () => {
      const p = window.location.pathname.toLowerCase();
      if (
        p.startsWith("/s/") ||
        p === "/s" ||
        p === "/s/link-shortener" ||
        p === "/link-shortener" ||
        p === "/shortener" ||
        p === "/short" ||
        p === "/kisalt"
      ) {
        setActivePage("Shortener");
      } else if (p === "/links") setActivePage("Links");
      else if (p === "/analytics") setActivePage("Analytics");
      else if (p === "/qr" || p === "/qrcodes") setActivePage("QRCodes");
      else if (p === "/billing") setActivePage("Billing");
      else if (p === "/settings") setActivePage("Settings");
      else setActivePage("Overview");
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Modal States
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalLink, setEditModalLink] = useState(null);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [qrModalLink, setQrModalLink] = useState(null);
  const [deleteModalLink, setDeleteModalLink] = useState(null);

  const openCreateModal = (prefill = {}) => {
    setCreateModalPrefill(prefill);
    setCreateModalOpen(true);
  };

  if (redirectSlug) {
    return (
      <RedirectPage
        slug={redirectSlug}
        onGoHome={() => {
          window.history.pushState({}, "", "/");
          setRedirectSlug(null);
        }}
      />
    );
  }

  if (authLoading) {
    return (
      <div className="loss-loading-screen">
        <div className="loss-loader-pulse">
          <img
            src="/loss.png"
            alt="loss.tr"
            style={{ width: "48px", height: "48px", objectFit: "contain" }}
          />
        </div>
        <span className="loss-loader-text">loss.tr yükleniyor...</span>
      </div>
    );
  }

  const isHome = activePage === "Overview";

  return (
    <div
      className={`loss-app-root ${isHome ? "landing-mode" : "dashboard-mode"}`}
    >
      {/* Ambient BypaxDPI Glowing Backdrop */}
      <BackgroundMesh />

      {/* Floating Capsule Navigation */}
      <LossNavbar
        activePage={activePage}
        onSelectPage={handleNavigate}
        onOpenCreateModal={() => setCreateModalOpen(true)}
        onToggleSidebar={() => setMobileOpen((v) => !v)}
      />

      {isHome ? (
        /* Full width Website Presentation */
        <main className="loss-main-content">
          <OverviewPage
            onOpenCreateModal={openCreateModal}
            onOpenQr={(link) => setQrModalLink(link)}
            onDeleteRequest={(link) => setDeleteModalLink(link)}
            onNavigate={handleNavigate}
          />
        </main>
      ) : (
        /* Dashboard App Shell for Workspaces (Shortener, Links, Analytics, QR, Billing, Settings) */
        <div className="loss-subpage-shell">
          <div className="loss-subpage-container">
            {activePage === "Shortener" && (
              <ShortenerStudioPage
                initialUrl={prefilledUrl}
                onOpenCreateModal={openCreateModal}
                onOpenQr={(link) => setQrModalLink(link)}
                onEditRequest={(link) => setEditModalLink(link)}
                onDeleteRequest={(link) => setDeleteModalLink(link)}
                onNavigate={handleNavigate}
              />
            )}

            {activePage === "Links" && (
              <LinksPage
                onOpenCreateModal={openCreateModal}
                onOpenQr={(link) => setQrModalLink(link)}
                onEditRequest={(link) => setEditModalLink(link)}
                onDeleteRequest={(link) => setDeleteModalLink(link)}
              />
            )}

            {activePage === "Analytics" && <AnalyticsPage />}

            {activePage === "QRCodes" && (
              <QrStudioPage
                onOpenCreateModal={openCreateModal}
                onOpenQr={(link) => setQrModalLink(link)}
              />
            )}

            {activePage === "Billing" && <BillingPage />}

            {activePage === "Settings" && <SettingsPage />}
          </div>
        </div>
      )}

      {/* Modern Footer */}
      <LossFooter onSelectPage={handleNavigate} />

      {/* Modals */}
      <CreateLinkModal
        isOpen={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          setCreateModalPrefill({});
        }}
        initialUrl={createModalPrefill.initialUrl}
        initialSlug={createModalPrefill.initialSlug}
        onOpenQr={(link) => setQrModalLink(link)}
        onOpenUpgradeModal={() => {
          setCreateModalOpen(false);
          setUpgradeModalOpen(true);
        }}
      />

      <EditLinkModal
        isOpen={Boolean(editModalLink)}
        onClose={() => setEditModalLink(null)}
        link={editModalLink}
      />

      <QrDetailModal
        isOpen={Boolean(qrModalLink)}
        onClose={() => setQrModalLink(null)}
        link={qrModalLink}
      />

      <UpgradeModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
      />

      <DeleteModal
        isOpen={Boolean(deleteModalLink)}
        onClose={() => setDeleteModalLink(null)}
        link={deleteModalLink}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        reason={authModalReason}
      />

      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  );
}
