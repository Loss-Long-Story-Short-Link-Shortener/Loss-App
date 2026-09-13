import { useState } from "react";
import { Link2 } from "lucide-react";
import { useAuth } from "./context/AuthContext";
import { Sidebar } from "./components/layout/Sidebar";
import { Topbar } from "./components/layout/Topbar";
import { Footer } from "./components/layout/Footer";
import { ToastContainer } from "./components/common/Toast";

// Pages
import { OverviewPage } from "./pages/OverviewPage";
import { LinksPage } from "./pages/LinksPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { QrStudioPage } from "./pages/QrStudioPage";
import { DomainsPage } from "./pages/DomainsPage";
import { BillingPage } from "./pages/BillingPage";
import { SettingsPage } from "./pages/SettingsPage";

// Modals
import { CreateLinkModal } from "./components/modals/CreateLinkModal";
import { QrDetailModal } from "./components/modals/QrDetailModal";
import { UpgradeModal } from "./components/modals/UpgradeModal";
import { DeleteModal } from "./components/modals/DeleteModal";
import { AddDomainModal } from "./components/modals/AddDomainModal";
import { AuthModal } from "./components/modals/AuthModal";
import { RedirectPage } from "./pages/RedirectPage";

export default function App() {
  const { authLoading, authModalOpen, setAuthModalOpen, authModalReason } = useAuth();

  // Slug route detection for client-side redirection
  const [redirectSlug, setRedirectSlug] = useState(() => {
    if (typeof window !== "undefined") {
      const path = window.location.pathname.replace(/^\/+/, "").split("/")[0];
      const ignored = ["", "login", "register", "admin", "api", "app"];
      if (path && !ignored.includes(path.toLowerCase())) {
        return path;
      }
    }
    return null;
  });

  // Navigation
  const [activePage, setActivePage] = useState("Overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem("loss_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("loss_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  // Modal States
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [domainModalOpen, setDomainModalOpen] = useState(false);
  const [qrModalLink, setQrModalLink] = useState(null);
  const [deleteModalLink, setDeleteModalLink] = useState(null);

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
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "var(--bg-app)",
          color: "var(--text-secondary)",
          gap: "14px",
        }}
      >
        <img
          src="/loss.png"
          alt="Long Story Short"
          style={{ width: "36px", height: "36px", objectFit: "contain" }}
        />
        <span style={{ fontSize: "12px", fontWeight: 600 }}>
          Yükleniyor...
        </span>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <Sidebar
        activePage={activePage}
        onSelectPage={setActivePage}
        onOpenCreateModal={() => setCreateModalOpen(true)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
      />

      {/* Main Content Area */}
      <div className="main-area">
        <Topbar
          onOpenMobile={() => setMobileOpen(true)}
          onOpenCreateModal={() => setCreateModalOpen(true)}
          onSelectPage={setActivePage}
        />

        <main className="page-container">
          {activePage === "Overview" && (
            <OverviewPage
              onOpenCreateModal={() => setCreateModalOpen(true)}
              onOpenQr={(link) => setQrModalLink(link)}
              onDeleteRequest={(link) => setDeleteModalLink(link)}
              onNavigate={setActivePage}
            />
          )}

          {activePage === "Links" && (
            <LinksPage
              onOpenCreateModal={() => setCreateModalOpen(true)}
              onOpenQr={(link) => setQrModalLink(link)}
              onDeleteRequest={(link) => setDeleteModalLink(link)}
            />
          )}

          {activePage === "Analytics" && <AnalyticsPage />}

          {activePage === "QRCodes" && (
            <QrStudioPage
              onOpenCreateModal={() => setCreateModalOpen(true)}
              onOpenQr={(link) => setQrModalLink(link)}
            />
          )}

          {activePage === "Domains" && (
            <DomainsPage
              onOpenAddDomainModal={() => setDomainModalOpen(true)}
              onOpenUpgradeModal={() => setUpgradeModalOpen(true)}
            />
          )}

          {activePage === "Billing" && <BillingPage />}

          {activePage === "Settings" && <SettingsPage />}
        </main>

        <Footer />
      </div>

      {/* Modals */}
      <CreateLinkModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onOpenUpgradeModal={() => {
          setCreateModalOpen(false);
          setUpgradeModalOpen(true);
        }}
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

      <AddDomainModal
        isOpen={domainModalOpen}
        onClose={() => setDomainModalOpen(false)}
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
