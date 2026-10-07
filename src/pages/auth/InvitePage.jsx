import { useEffect, useState } from "react";
import { Alert, Button, Logo } from "../../ui";
import { api } from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import { Link, useRouter } from "../../lib/router";
import { useAuth } from "../../state/auth";
import { useToast } from "../../state/toast";

export default function InvitePage({ token }) {
  const { t } = useI18n();
  const toast = useToast();
  const { navigate } = useRouter();
  const { user, loading, switchWorkspace, refreshMe } = useAuth();
  const [state, setState] = useState({ status: "idle", error: "" });

  const accept = async () => {
    setState({ status: "busy", error: "" });
    try {
      const { workspace } = await api.team.accept(token);
      await refreshMe();
      switchWorkspace(workspace.id);
      toast.success(t("“{n}” çalışma alanına katıldınız", "You joined “{n}”", { n: workspace.name }));
      navigate("/app");
    } catch (e) { setState({ status: "error", error: e.message }); }
  };

  useEffect(() => { document.title = "Loss"; }, []);
  return (
    <main className="auth-main" style={{ minHeight: "100dvh" }}>
      <div className="auth-card stack" style={{ textAlign: "center", alignItems: "center", gap: 16 }}>
        <Logo size={32} />
        <h1>{t("Çalışma alanına davet edildiniz", "You've been invited to a workspace")}</h1>
        {loading ? <p className="muted">…</p> : !user ? (
          <>
            <p className="muted">{t("Daveti kabul etmek için, davetin gönderildiği e-posta adresiyle giriş yapın veya kaydolun.", "Sign in or sign up with the email address the invite was sent to.")}</p>
            <div className="row"><Link className="btn btn-primary btn-lg" to={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}>{t("Giriş yap", "Sign in")}</Link><Link className="btn btn-secondary btn-lg" to={`/register?next=${encodeURIComponent(`/invite/${token}`)}`}>{t("Kaydol", "Sign up")}</Link></div>
          </>
        ) : (
          <>
            <p className="muted">{t("Giriş yapılan hesap:", "Signed in as:")} <strong>{user.email}</strong></p>
            {state.status === "error" && <Alert tone="danger">{state.error}</Alert>}
            <Button variant="primary" size="lg" loading={state.status === "busy"} onClick={accept}>{t("Daveti kabul et", "Accept invite")}</Button>
          </>
        )}
      </div>
    </main>
  );
}
