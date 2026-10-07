import { useI18n } from "../../lib/i18n";
import { Link } from "../../lib/router";
import { Page } from "./Layout";

export default function NotFound() {
  const { t } = useI18n();
  return (
    <Page narrow>
      <div className="empty" style={{ padding: "96px 0" }}>
        <h1 style={{ fontSize: 56 }}>404</h1>
        <h2>{t("Sayfa bulunamadı", "Page not found")}</h2>
        <p>{t("Aradığınız sayfa taşınmış ya da hiç var olmamış olabilir.", "The page may have moved or never existed.")}</p>
        <Link to="/" className="btn btn-primary">{t("Ana sayfaya dön", "Back home")}</Link>
      </div>
    </Page>
  );
}
