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
import { IntegrationsPage } from "./pages/IntegrationsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { AuthPage } from "./pages/AuthPage";

// Modals
import { CreateLinkModal } from "./components/modals/CreateLinkModal";
import { QrDetailModal } from "./components/modals/QrDetailModal";
import { UpgradeModal } from "./components/modals/UpgradeModal";
import { DeleteModal } from "./components/modals/DeleteModal";
import { AddDomainModal } from "./components/modals/AddDomainModal";

export default function App() {
  const { user, authLoading } = useAuth();

  // Navigation
  const [activePage, setActivePage] = useState("Overview");
  const [mobileOpen, setMobileOpen] = useState(false);

  // Modal States
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [domainModalOpen, setDomainModalOpen] = useState(false);
  const [qrModalLink, setQrModalLink] = useState(null);
  const [deleteModalLink, setDeleteModalLink] = useState(null);

  // Initial Auth Loading Screen
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
        <div className="brand-mark" style={{ width: "42px", height: "42px" }}>
          <Link2 size={22} strokeWidth={2.5} />
        </div>
        <span style={{ fontSize: "13px", fontWeight: 600 }}>
          Çalışma alanı yükleniyor...
        </span>
      </div>
    );
  }

  // If unauthenticated, show AuthPage
  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <Sidebar
        activePage={activePage}
        onSelectPage={setActivePage}
        onOpenCreateModal={() => setCreateModalOpen(true)}
        onOpenUpgradeModal={() => setUpgradeModalOpen(true)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Main Area */}
      <div className="main-area">
        <Topbar
          activePage={activePage}
          onOpenMobile={() => setMobileOpen(true)}
          onOpenCreateModal={() => setCreateModalOpen(true)}
          onOpenUpgradeModal={() => setUpgradeModalOpen(true)}
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

          {activePage === "Integrations" && <IntegrationsPage />}

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

      {/* Floating Notifications */}
      <ToastContainer />
    </div>
  );
}
