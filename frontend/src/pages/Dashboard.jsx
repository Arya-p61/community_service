import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import RequestStatus from "../components/RequestStatus";
import { useAuth } from "../context/AuthContext";
import { getMyRequests } from "../services/requestService";

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

const formatDate = (value) => {
  if (!value) return "Recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
};

const formatMonthYear = (value) => {
  if (!value) return "Recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" }).format(date);
};

export default function Dashboard() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    if (user?.role !== "citizen") {
      setRequests([]);
      setLoading(false);
      return () => {
        active = false;
      };
    }

    const fetchRequests = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getMyRequests();
        if (active) setRequests(Array.isArray(data) ? data : []);
      } catch {
        if (active) setError("We couldn't load your activity.");
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchRequests();
    return () => {
      active = false;
    };
  }, [user?.role]);

  const stats = useMemo(() => {
    const total = requests.length;
    const active = requests.filter((request) => !["RESOLVED", "CLOSED"].includes(request.status)).length;
    const resolved = requests.filter((request) => request.status === "RESOLVED").length;
    const closed = requests.filter((request) => request.status === "CLOSED").length;
    return { total, active, resolved, closed };
  }, [requests]);

  const activeRequests = useMemo(() => {
    return [...requests]
      .filter((request) => !["RESOLVED", "CLOSED"].includes(request.status))
      .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
      .slice(0, 3);
  }, [requests]);

  const recentActivity = useMemo(() => {
    return [...requests]
      .map((request) => {
        const timestamp = request.updated_at || request.created_at;
        const actionMap = {
          SUBMITTED: "Request submitted",
          PENDING: "Request is pending",
          IN_PROGRESS: "Status changed to In progress",
          RESOLVED: "Request resolved",
          CLOSED: "Request closed",
        };

        return {
          id: request.id,
          title: request.title,
          action: actionMap[request.status] || "Request updated",
          timestamp,
        };
      })
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 3);
  }, [requests]);

  if (!user) {
    return <div className="citizen-dashboard"><div className="panel panel-soft"><p>Loading your civic workspace…</p></div></div>;
  }

  return (
    <div className="citizen-dashboard">
      <header className="citizen-dashboard-header">
        <div>
          <p className="eyebrow">Citizen workspace</p>
          <h1>{getGreeting()}, {user.name?.split(" ")[0] || "friend"}.</h1>
          <p>Here's what's happening with your community requests.</p>
        </div>
        <Link className="button button-primary" to="/citizen/requests/new">+ Report an issue</Link>
      </header>

      {loading ? (
        <DashboardSkeleton />
      ) : error ? (
        <DashboardError onRetry={() => window.location.reload()} />
      ) : (
        <>
          <section className="stat-grid" aria-label="Request summary">
            <StatCard label="Total requests" value={stats.total} />
            <StatCard label="Active" value={stats.active} accent="coral" />
            <StatCard label="Resolved" value={stats.resolved} accent="green" />
            <StatCard label="Closed" value={stats.closed} accent="muted" />
          </section>

          {requests.length === 0 ? (
            <section className="panel empty-state-panel">
              <div className="empty-icon">✦</div>
              <h2>Start making a difference</h2>
              <p>You haven't reported a community issue yet. When you submit one, you'll be able to track its progress here.</p>
              <Link className="button button-primary" to="/citizen/requests/new">+ Report an issue</Link>
            </section>
          ) : (
            <div className="overview-grid">
              <section className="panel">
                <div className="panel-header">
                  <div>
                    <p className="eyebrow">Active requests</p>
                    <h2>What's moving now</h2>
                  </div>
                  <Link className="text-link" to="/citizen/requests">View all requests →</Link>
                </div>

                <div className="active-request-list">
                  {activeRequests.map((request) => (
                    <Link className="request-mini-card" to={`/citizen/requests/${request.id}`} key={request.id}>
                      <div className="mini-header">
                        <span className="request-id">REQ-{String(request.id).padStart(3, "0")}</span>
                        <RequestStatus status={request.status} />
                      </div>

                      <h3>{request.title}</h3>

                      <div className="mini-meta">
                        <span>{request.department_name || "Department pending"}</span>
                        <span>{request.location || "Location pending"}</span>
                      </div>

                      <div className="mini-footer">
                        <span>Updated {formatDate(request.updated_at || request.created_at)}</span>
                        <span>View request →</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>

              <aside className="sidebar-stack">
                <div className="panel account-card">
                  <p className="eyebrow">Your account</p>
                  <div className="account-avatar">{user.name?.charAt(0)?.toUpperCase() || "U"}</div>
                  <h3>{user.name}</h3>
                  <p>{(user.role || "citizen").charAt(0).toUpperCase() + (user.role || "citizen").slice(1)}</p>

                  <div className="account-meta-list">
                    <div>
                      <span>Member since</span>
                      <strong>{formatMonthYear(user.created_at)}</strong>
                    </div>
                    <div>
                      <span>Notifications</span>
                      <strong>{requests.length > 0 ? "Live" : "None yet"}</strong>
                    </div>
                  </div>

                  <Link className="text-link" to="/profile">View profile</Link>
                </div>

                <div className="panel quick-card">
                  <p className="eyebrow">Quick actions</p>
                  <Link className="secondary-action" to="/citizen/requests">View all requests</Link>
                  <Link className="secondary-action" to="/citizen/requests/new">Create a new request</Link>
                  <Link className="secondary-action" to="/profile">Profile</Link>
                </div>
              </aside>
            </div>
          )}

          <section className="panel recent-activity-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Recent activity</p>
                <h2>Latest updates</h2>
              </div>
            </div>

            {recentActivity.length === 0 ? (
              <p className="panel-empty-copy">Your request activity will show up here as updates arrive.</p>
            ) : (
              <ul className="activity-list">
                {recentActivity.map((item) => (
                  <li key={`${item.id}-${item.action}`}>
                    <span className="activity-bullet">✓</span>
                    <div>
                      <strong>{item.action}</strong>
                      <p>{item.title}</p>
                    </div>
                    <time>{formatDate(item.timestamp)}</time>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, accent = "default" }) {
  return (
    <div className={`stat-card stat-card-${accent}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="dashboard-skeleton" aria-busy="true">
      <div className="stat-grid">
        {[...Array(4)].map((_, index) => (
          <div className="stat-card skeleton-block" key={index} />
        ))}
      </div>
      <div className="panel skeleton-panel" />
      <div className="panel skeleton-panel small" />
    </div>
  );
}

function DashboardError({ onRetry }) {
  return (
    <div className="panel panel-error">
      <h2>We couldn't load your activity.</h2>
      <p>Please try again.</p>
      <button className="button button-primary" type="button" onClick={onRetry}>Try again</button>
    </div>
  );
}