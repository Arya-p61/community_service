import { useEffect } from "react";
import { Icon } from "./Icons";

export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = "520px",
}) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="cg-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="cg-modal-container"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cg-modal-header">
          <div>
            {title && <h3 className="cg-modal-title">{title}</h3>}
            {subtitle && <p className="cg-modal-subtitle">{subtitle}</p>}
          </div>
          <button
            className="cg-modal-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="cg-modal-content">{children}</div>
      </div>
    </div>
  );
}
