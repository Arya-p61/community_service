export default function Card({
  children,
  className = "",
  title,
  subtitle,
  eyebrow,
  action,
  footer,
  ...props
}) {
  return (
    <div className={`cg-card ${className}`} {...props}>
      {(title || eyebrow || action) && (
        <div className="cg-card-header">
          <div>
            {eyebrow && <span className="cg-eyebrow">{eyebrow}</span>}
            {title && <h3 className="cg-card-title">{title}</h3>}
            {subtitle && <p className="cg-card-subtitle">{subtitle}</p>}
          </div>
          {action && <div className="cg-card-action">{action}</div>}
        </div>
      )}
      <div className="cg-card-body">{children}</div>
      {footer && <div className="cg-card-footer">{footer}</div>}
    </div>
  );
}
