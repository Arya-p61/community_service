import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import CommonGroundLogo from "../branding/CommonGroundLogo";
import NotificationDropdown from "./NotificationDropdown";
import { Icon } from "../ui/Icons";
import { RoleBadge } from "../ui/Badge";

const ROUTE_TITLES = {
  "/citizen/dashboard": "Citizen Dashboard",
  "/citizen/requests": "My Service Requests",
  "/citizen/requests/new": "Report an Issue",
  "/officer/dashboard": "Officer Workspace",
  "/officer/requests": "Department Request Queue",
  "/admin/dashboard": "Administration Overview",
  "/admin/requests": "Request Management",
  "/admin/departments": "Departments Management",
  "/admin/officers": "Officers Directory",
  "/profile": "Account Settings",
};

export default function AppHeader({ onMenuClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setAccountMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = () => {
    setAccountMenuOpen(false);
    logout();
    navigate("/login");
  };

  const getPageTitle = () => {
    const path = location.pathname;
    if (ROUTE_TITLES[path]) return ROUTE_TITLES[path];
    if (path.startsWith("/citizen/requests/")) return "Request Details";
    if (path.startsWith("/officer/requests/")) return "Officer Review";
    return "CommonGround";
  };

  return (
    <header className="cg-app-header">
      <div className="cg-header-left">
        <button
          className="cg-icon-btn cg-menu-btn mobile-only"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
        >
          <Icon name="menu" size={20} />
        </button>
        <div className="mobile-brand">
          <CommonGroundLogo compact />
        </div>
        <div className="cg-header-title-wrap desktop-only">
          <span className="cg-header-kicker">CommonGround Civic System</span>
          <h2 className="cg-header-title">{getPageTitle()}</h2>
        </div>
      </div>

      <div className="cg-header-right">
        <NotificationDropdown />

        <div className="cg-account-menu-wrap" ref={menuRef}>
          <button
            className="cg-account-trigger"
            onClick={() => setAccountMenuOpen((prev) => !prev)}
            aria-expanded={accountMenuOpen}
            aria-label="User account menu"
          >
            <div className="cg-avatar-circle">
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="cg-account-details desktop-only">
              <span className="cg-account-name">{user?.name || "User"}</span>
              <span className="cg-account-sub">
                {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "Citizen"}
              </span>
            </div>
            <Icon name="chevron-down" size={14} className="cg-account-chevron desktop-only" />
          </button>

          {accountMenuOpen && (
            <div className="cg-account-dropdown" role="menu">
              <div className="cg-dropdown-user-header">
                <strong>{user?.name}</strong>
                <span className="cg-text-muted">{user?.email}</span>
                <div style={{ marginTop: "6px" }}>
                  <RoleBadge role={user?.role} />
                </div>
              </div>
              <div className="cg-dropdown-divider" />
              <Link
                to="/profile"
                className="cg-dropdown-item"
                role="menuitem"
                onClick={() => setAccountMenuOpen(false)}
              >
                <Icon name="profile" size={16} />
                <span>Account Profile</span>
              </Link>
              <button
                className="cg-dropdown-item cg-dropdown-danger"
                role="menuitem"
                onClick={handleSignOut}
              >
                <Icon name="logout" size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
