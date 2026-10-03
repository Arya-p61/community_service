import { Link } from "react-router-dom";

export default function CommonGroundLogo({ compact = false }) {
  return (
    <Link className="brand" to="/" aria-label="CommonGround home">
      <span className="brand-mark" aria-hidden="true">+</span>
      <span className="brand-text">
        <span>Common</span>
        <span className="brand-light">Ground</span>
      </span>
      {!compact && <span className="brand-tag">Civic services</span>}
    </Link>
  );
}
