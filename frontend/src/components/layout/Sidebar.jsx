import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import CommonGroundLogo from "../branding/CommonGroundLogo";
import { Icon } from "../ui/Icons";

const NAV = {
  citizen: [
    { to: "/citizen/dashboard", label: "Dashboard", icon: "dashboard" },
    { to: "/citizen/requests", label: "My Requests", icon: "requests" },
    { to: "/citizen/requests/new", label: "Report an Issue", icon: "plus" },
    { to: "/profile", label: "Profile", icon: "profile" },
  ],
  officer: [
    { to: "/officer/dashboard", label: "Dashboard", icon: "dashboard" },
    { to: "/officer/requests", label: "Department Queue", icon: "requests" },
    { to: "/profile", label: "Profile", icon: "profile" },
  ],
  admin: [
    { to: "/admin/dashboard", label: "Dashboard", icon: "dashboard" },
    { to: "/admin/requests", label: "All Requests", icon: "requests" },
    { to: "/admin/departments", label: "Departments", icon: "departments" },
    { to: "/admin/officers", label: "Officers", icon: "officers" },
    { to: "/profile", label: "Profile", icon: "profile" },
  ],
};

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const items = NAV[user?.role] || [];

  return (
    <aside className={`cg-sidebar ${open ? "is-open" : ""}`} aria-label="Sidebar Navigation">
      <div className="cg-sidebar-header">
        <CommonGroundLogo compact={false} />
        <button
          className="cg-sidebar-close"
          onClick={onClose}
          aria-label="Close navigation menu"
        >
          <Icon name="close" size={20} />
        </button>
      </div>

      <div className="cg-sidebar-role-indicator">
        <span className="cg-role-dot" />
        <span className="cg-role-label">
          {user?.role ? `${user.role.charAt(0).toUpperCase() + user.role.slice(1)} Portal` : "Civic Portal"}
        </span>
        {user?.department_name && (
          <span className="cg-role-dept" title={user.department_name}>
            {user.department_name}
          </span>
        )}
      </div>

      <nav className="cg-sidebar-nav" aria-label="Main Navigation">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `cg-nav-link ${isActive ? "is-active" : ""}`
            }
            onClick={onClose}
            end={item.to === "/profile" ? true : undefined}
          >
            <span className="cg-nav-icon">
              <Icon name={item.icon} size={19} />
            </span>
            <span className="cg-nav-text">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="cg-sidebar-footer">
        <NavLink
          to="/profile"
          className="cg-user-snippet"
          onClick={onClose}
          title="View profile settings"
        >
          <div className="cg-user-avatar">
            {user?.name?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div className="cg-user-info">
            <span className="cg-user-name">{user?.name || "Civic Member"}</span>
            <span className="cg-user-role">{user?.email || user?.role || "Citizen"}</span>
          </div>
        </NavLink>

        <button
          className="cg-signout-btn"
          onClick={() => {
            logout();
            onClose?.();
          }}
          aria-label="Sign out of CommonGround"
        >
          <Icon name="logout" size={17} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
