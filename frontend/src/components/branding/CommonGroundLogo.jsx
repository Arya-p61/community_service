import { Link } from "react-router-dom";

export default function CommonGroundLogo({ compact = false, variant = "default" }) {
  return (
    <Link
      className={`cg-brand ${variant === "light" ? "cg-brand-light" : ""}`}
      to="/"
      aria-label="CommonGround home"
    >
      <span className="cg-brand-mark" aria-hidden="true">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </span>
      <span className="cg-brand-text">
        <span className="cg-brand-title">
          Common<span className="cg-brand-suffix">Ground</span>
        </span>
        {!compact && <span className="cg-brand-tagline">Civic Service System</span>}
      </span>
    </Link>
  );
}
