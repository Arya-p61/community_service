import { Link } from "react-router-dom";
import { Icon } from "./Icons";

export default function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  backTo,
  backLabel = "Back",
  className = "",
}) {
  return (
    <div className={`cg-page-header ${className}`}>
      {backTo && (
        <Link to={backTo} className="cg-back-link">
          <Icon name="arrow-left" size={15} />
          <span>{backLabel}</span>
        </Link>
      )}
      <div className="cg-page-header-main">
        <div className="cg-page-header-text">
          {eyebrow && <span className="cg-eyebrow">{eyebrow}</span>}
          <h1 className="cg-page-title">{title}</h1>
          {description && <p className="cg-page-description">{description}</p>}
        </div>
        {actions && <div className="cg-page-header-actions">{actions}</div>}
      </div>
    </div>
  );
}
