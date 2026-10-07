import { useQueryState } from "../../lib/router";
import { useI18n } from "../../lib/i18n";
import { useLinks } from "../../state/links";
import { usePlan } from "../../state/plan";
import { EmptyState, Button } from "../../ui";
import { BarChart3, Plus } from "../../ui/icons";
import { Insights, RangePicker, RetentionNote } from "./Insights";
import { useEditor } from "./AppShell";

export default function AnalyticsPage() {
  const { t } = useI18n();
  const { plan } = usePlan();
  const { links, loading } = useLinks();
  const editor = useEditor();
  const [daysParam, setDaysParam] = useQueryState("days", "30");
  const days = Number(daysParam) || 30;
  const setDays = (d) => setDaysParam(String(d));
  const max = plan?.analyticsDays || 30;

  return (
    <>
      <div className="page-head">
        <div><h1>{t("Analizler", "Analytics")}</h1><p>{t("Çalışma alanınızdaki tüm bağlantıların toplu performansı. Çerezsiz; IP adresleri saklanmaz.", "Combined performance of every link in this workspace. Cookieless; IP addresses are never stored.")}</p></div>
        <div className="page-actions"><RangePicker days={Math.min(days, max)} setDays={setDays} max={max} /></div>
      </div>
      <RetentionNote max={max} />
      <div style={{ height: 12 }} />
      {!loading && links.length === 0 ? (
        <div className="card"><EmptyState icon={BarChart3} title={t("Henüz analiz edilecek veri yok", "Nothing to analyse yet")} action={<Button variant="primary" icon={Plus} onClick={() => editor.openNew()}>{t("Bağlantı oluştur", "Create link")}</Button>}>{t("İlk bağlantınızı oluşturup paylaştığınızda tıklamalar burada görünür.", "Clicks show up here after you create and share your first link.")}</EmptyState></div>
      ) : (
        <Insights params={{ scope: "workspace", days: Math.min(days, max) }} showTopLinks />
      )}
    </>
  );
}
