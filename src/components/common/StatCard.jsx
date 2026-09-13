import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

export function StatCard({
  title,
  value,
  change,
  trend = "neutral",
  icon: Icon,
  note,
}) {
  return (
    <div className="stat-card">
      <div className="stat-card-header">
        <span className="stat-card-title">{title}</span>
        {Icon && (
          <div className="stat-icon-wrap">
            <Icon size={18} />
          </div>
        )}
      </div>

      <div className="stat-card-value">{value}</div>

      <div className="stat-card-footer">
        {change && (
          <span className={`trend-badge trend-${trend}`}>
            {trend === "up" && <ArrowUpRight size={13} />}
            {trend === "down" && <ArrowDownRight size={13} />}
            {trend === "neutral" && <Minus size={13} />}
            {change}
          </span>
        )}
        <span>{note}</span>
      </div>
    </div>
  );
}
