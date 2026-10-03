import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import CommonGroundLogo from "../branding/CommonGroundLogo";
import { useAuth } from "../../context/AuthContext";

export default function AppHeader({ onMenuClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const signOut = () => { logout(); setMenuOpen(false); navigate("/login"); };

  return (
    <header className="app-header">
      <div className="header-left">
        <button className="icon-button mobile-only" onClick={onMenuClick} aria-label="Open navigation">☰</button>
        <CommonGroundLogo compact />
      </div>
      <div className="header-right">
        <button className="icon-button" aria-label="Notifications">🔔</button>
        <div className="account-menu">
          <button className="account-trigger" onClick={() => setMenuOpen((value) => !value)}>
            <span className="avatar">{user?.name?.charAt(0)?.toUpperCase() || "U"}</span>
            <span className="account-meta">
              <strong>{user?.name || "User"}</strong>
              <small>{user?.role || "citizen"}</small>
            </span>
          </button>
          {menuOpen && <div className="account-dropdown">
            <Link to="/profile" onClick={() => setMenuOpen(false)}>Profile</Link>
            <button onClick={signOut}>Sign out</button>
          </div>}
        </div>
      </div>
    </header>
  );
}
