import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const NAV = {
  citizen: [
    { to: "/citizen/dashboard", label: "Dashboard" },
    { to: "/citizen/requests", label: "My Requests" },
    { to: "/citizen/requests/new", label: "Report an Issue" },
    { to: "/profile", label: "Profile" },
  ],
  officer: [
    { to: "/officer/dashboard", label: "Dashboard" },
    { to: "/officer/requests", label: "Department Queue" },
    { to: "/profile", label: "Profile" },
  ],
  admin: [
    { to: "/admin/dashboard", label: "Dashboard" },
    { to: "/admin/requests", label: "All Requests" },
    { to: "/admin/departments", label: "Departments" },
    { to: "/admin/officers", label: "Officers" },
    { to: "/profile", label: "Profile" },
  ],
};

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const items = NAV[user?.role] || [];

  return (
    <aside className={`app-sidebar ${open ? "is-open" : ""}`}>
      <div className="sidebar-header">
        <div className="brand brand-sidebar"><span className="brand-mark">+</span><span>Common<span className="brand-light">Ground</span></span></div>
        <button className="sidebar-close" onClick={onClose} aria-label="Close navigation">×</button>
      </div>
      <nav className="sidebar-nav" aria-label="Main navigation">
        {items.map((item) => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-item ${isActive ? "is-active" : ""}`} onClick={onClose} end={item.to === "/profile" ? false : undefined}>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <button className="nav-item signout" onClick={() => { logout(); onClose?.(); }}>Sign out</button>
      </div>
    </aside>
  );
}
