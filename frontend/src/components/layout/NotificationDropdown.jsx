import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getMyRequests, getOfficerRequests, getAdminRequests } from "../../services/requestService";
import { StatusBadge } from "../ui/Badge";
import { Icon } from "../ui/Icons";

export default function NotificationDropdown() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [readIds, setReadIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(`cg_read_notifs_${user?.id}`) || "[]");
    } catch {
      return [];
    }
  });

  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!user) return;
    let active = true;

    async function loadNotifications() {
      setLoading(true);
      try {
        let data = [];
        if (user.role === "citizen") {
          data = await getMyRequests();
        } else if (user.role === "officer") {
          data = await getOfficerRequests();
        } else if (user.role === "admin") {
          data = await getAdminRequests();
        }
        if (active && Array.isArray(data)) {
          // Sort by updated_at or created_at desc
          const sorted = [...data]
            .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
            .slice(0, 6);
          setItems(sorted);
        }
      } catch {
        // graceful fallback if network fails
      } finally {
        if (active) setLoading(false);
      }
    }

    loadNotifications();
  }, [user]);

  const unreadCount = items.filter((item) => !readIds.includes(item.id)).length;

  const markAllRead = () => {
    const allIds = items.map((i) => i.id);
    setReadIds(allIds);
    try {
      localStorage.setItem(`cg_read_notifs_${user?.id}`, JSON.stringify(allIds));
    } catch {
      // storage quota or private mode
    }
  };

  const markItemRead = (id) => {
    if (!readIds.includes(id)) {
      const next = [...readIds, id];
      setReadIds(next);
      try {
        localStorage.setItem(`cg_read_notifs_${user?.id}`, JSON.stringify(next));
      } catch {
        // ignore
      }
    }
    setOpen(false);
  };

  const getItemLink = (item) => {
    if (user?.role === "officer") return `/officer/requests/${item.id}`;
    if (user?.role === "admin") return `/admin/requests`;
    return `/citizen/requests/${item.id}`;
  };

  const formatTime = (ts) => {
    if (!ts) return "";
    const date = new Date(ts);
    if (Number.isNaN(date.getTime())) return "";
    const diffHours = (Date.now() - date.getTime()) / (1000 * 60 * 60);
    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${Math.floor(diffHours)}h ago`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  return (
    <div className="cg-notification-menu" ref={ref}>
      <button
        className="cg-icon-btn cg-notification-btn"
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ""}`}
        onClick={() => setOpen((prev) => !prev)}
      >
        <Icon name="bell" size={18} />
        {unreadCount > 0 && <span className="cg-notification-badge">{unreadCount}</span>}
      </button>

      {open && (
        <div className="cg-notification-popover" role="dialog" aria-label="Notifications panel">
          <div className="cg-notification-header">
            <div>
              <h4 className="cg-notification-title">Notifications</h4>
              <p className="cg-notification-subtitle">Recent activity on community requests</p>
            </div>
            {unreadCount > 0 && (
              <button className="cg-text-btn-sm" onClick={markAllRead}>
                Mark all read
              </button>
            )}
          </div>

          <div className="cg-notification-body">
            {loading ? (
              <div className="cg-notification-empty">
                <span className="cg-spinner cg-spinner-sm" />
                <p>Checking latest activity...</p>
              </div>
            ) : items.length === 0 ? (
              <div className="cg-notification-empty">
                <Icon name="bell" size={24} className="cg-text-muted" />
                <p>No recent activity found.</p>
              </div>
            ) : (
              <ul className="cg-notification-list">
                {items.map((item) => {
                  const isUnread = !readIds.includes(item.id);
                  return (
                    <li
                      key={item.id}
                      className={`cg-notification-item ${isUnread ? "is-unread" : ""}`}
                    >
                      <Link
                        to={getItemLink(item)}
                        onClick={() => markItemRead(item.id)}
                        className="cg-notification-link"
                      >
                        <div className="cg-notification-item-top">
                          <span className="cg-request-id-sm">REQ-{String(item.id).padStart(3, "0")}</span>
                          <span className="cg-notification-time">
                            {formatTime(item.updated_at || item.created_at)}
                          </span>
                        </div>
                        <p className="cg-notification-item-title">{item.title}</p>
                        <div className="cg-notification-item-footer">
                          <StatusBadge status={item.status} />
                          {item.department_name && (
                            <span className="cg-notification-dept">{item.department_name}</span>
                          )}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
