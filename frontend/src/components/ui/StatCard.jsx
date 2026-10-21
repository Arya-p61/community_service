import { Link } from "react-router-dom";
import { Icon } from "./Icons";

export default function StatCard({
  label,
  value,
  subtext,
  icon,
  accent = "default", // "default", "primary", "coral", "success", "warning", "muted"
  to,
  className = "",
}) {
  const content = (
    <div className={`cg-stat-card cg-stat-accent-${accent} ${className}`}>
      <div className="cg-stat-top">
        <span className="cg-stat-label">{label}</span>
        {icon && (
          <span className="cg-stat-icon-wrap">
            <Icon name={icon} size={18} />
          </span>
        )}
      </div>
      <div className="cg-stat-value">{value}</div>
      {subtext && <div className="cg-stat-subtext">{subtext}</div>}
      {to && (
        <div className="cg-stat-arrow">
          <span>View</span>
          <Icon name="arrow-right" size={13} />
        </div>
      )}
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="cg-stat-link">
        {content}
      </Link>
    );
  }

  return content;
}
