import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getMyRequests } from "../services/requestService";
import { StatusBadge } from "../components/ui/Badge";
import PageHeader from "../components/ui/PageHeader";
import StatCard from "../components/ui/StatCard";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { Icon } from "../components/ui/Icons";

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
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date);
};

export default function Dashboard() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getMyRequests();
      setRequests(Array.isArray(data) ? data : []);
    } catch {
      setError("We couldn't load your community activity. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "citizen") {
      loadData();
    } else {
      setLoading(false);
    }
  }, [user?.role]);

  const stats = useMemo(() => {
    const total = requests.length;
    const active = requests.filter((r) => !["RESOLVED", "CLOSED"].includes(r.status)).length;
    const resolved = requests.filter((r) => r.status === "RESOLVED").length;
    const closed = requests.filter((r) => r.status === "CLOSED").length;
    return { total, active, resolved, closed };
  }, [requests]);

  const activeRequests = useMemo(() => {
    return [...requests]
      .filter((r) => !["RESOLVED", "CLOSED"].includes(r.status))
      .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
      .slice(0, 4);
  }, [requests]);

  const recentTimeline = useMemo(() => {
    return [...requests]
      .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
      .slice(0, 5);
  }, [requests]);

  const firstName = user?.name ? user.name.split(" ")[0] : "Friend";

  return (
    <div className="cg-dashboard-page">
      <PageHeader
        eyebrow="Citizen Workspace"
        title={`${getGreeting()}, ${firstName}.`}
        description="Here is the live status of the community issues and civic improvements you've raised."
        actions={
          <Link to="/citizen/requests/new" className="cg-btn cg-btn-primary cg-btn-md">
            <Icon name="plus" size={17} />
            <span>Report an Issue</span>
          </Link>
        }
      />

      {loading ? (
        <DashboardSkeleton />
      ) : error ? (
        <Card className="cg-empty-state">
          <div className="cg-empty-icon" style={{ background: "#FEEBEB", color: "var(--cg-error)" }}>
            <Icon name="alert-triangle" size={24} />
          </div>
          <h3 className="cg-empty-title">Unable to Load Activity</h3>
          <p className="cg-empty-description">{error}</p>
          <Button variant="primary" onClick={loadData}>
            Try again
          </Button>
        </Card>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="cg-stat-grid">
            <StatCard
              label="Total Requests"
              value={stats.total}
              subtext="Issues submitted by you"
              icon="requests"
              accent="primary"
              to="/citizen/requests"
            />
            <StatCard
              label="Active Underway"
              value={stats.active}
              subtext="In review or active work"
              icon="clock"
              accent="coral"
              to="/citizen/requests"
            />
            <StatCard
              label="Resolved"
              value={stats.resolved}
              subtext="Completed by officers"
              icon="check-circle"
              accent="success"
              to="/citizen/requests"
            />
            <StatCard
              label="Closed"
              value={stats.closed}
              subtext="Archived resolutions"
              icon="shield"
              accent="muted"
              to="/citizen/requests"
            />
          </div>

          {requests.length === 0 ? (
            <div className="cg-empty-state" style={{ margin: "20px 0 32px" }}>
              <div className="cg-empty-icon">
                <Icon name="pin" size={28} />
              </div>
              <h2 className="cg-empty-title">No service requests yet</h2>
              <p className="cg-empty-description">
                You haven't reported any community issues yet. When you notice a pothole, broken streetlight, or illegal dumping on your street, report it here to notify local service teams.
              </p>
              <Link to="/citizen/requests/new" className="cg-btn cg-btn-primary cg-btn-lg">
                <Icon name="plus" size={18} />
                <span>Report your first community issue</span>
              </Link>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: "24px", marginBottom: "32px" }}>
              {/* Active Requests List */}
              <Card
                title="Active Requests"
                subtitle="Community issues currently being handled"
                action={
                  <Link to="/citizen/requests" className="cg-back-link" style={{ margin: 0 }}>
                    <span>View all ({requests.length})</span>
                    <Icon name="arrow-right" size={13} />
                  </Link>
                }
              >
                {activeRequests.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--cg-text-secondary)" }}>
                    <Icon name="check-circle" size={32} style={{ color: "var(--cg-success)", margin: "0 auto 10px" }} />
                    <p style={{ fontWeight: 600, color: "var(--cg-text-main)" }}>All current requests resolved!</p>
                    <p style={{ fontSize: "13px", marginTop: "4px" }}>
                      You have no pending or in-progress requests right now.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {activeRequests.map((request) => (
                      <Link
                        key={request.id}
                        to={`/citizen/requests/${request.id}`}
                        style={{
                          display: "block",
                          padding: "16px",
                          borderRadius: "var(--radius-md)",
                          border: "1px solid var(--cg-border)",
                          background: "#FAFCFA",
                          transition: "all 0.16s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = "var(--cg-primary-green)";
                          e.currentTarget.style.transform = "translateY(-1px)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "var(--cg-border)";
                          e.currentTarget.style.transform = "none";
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                          <span className="cg-table-id">REQ-{String(request.id).padStart(3, "0")}</span>
                          <StatusBadge status={request.status} />
                        </div>
                        <h4 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "6px", color: "var(--cg-text-main)" }}>
                          {request.title}
                        </h4>
                        <div style={{ display: "flex", alignItems: "center", gap: "14px", fontSize: "12px", color: "var(--cg-text-secondary)" }}>
                          {request.location && (
                            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <Icon name="location" size={13} />
                              <span>{request.location}</span>
                            </span>
                          )}
                          {request.department_name && (
                            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <Icon name="departments" size={13} />
                              <span>{request.department_name}</span>
                            </span>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </Card>

              {/* Sidebar Quick Cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {/* Account Summary Card */}
                <Card title="Account Overview" eyebrow="Civic Profile">
                  <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "18px" }}>
                    <div className="cg-user-avatar" style={{ width: "48px", height: "48px", fontSize: "18px" }}>
                      {user?.name?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                    <div>
                      <h4 style={{ fontSize: "15px", fontWeight: 600 }}>{user?.name}</h4>
                      <p className="cg-text-muted" style={{ fontSize: "13px" }}>{user?.email}</p>
                    </div>
                  </div>

                  <div style={{ borderTop: "1px solid var(--cg-border-light)", paddingTop: "14px", display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span className="cg-text-muted">Account role</span>
                      <strong style={{ textTransform: "capitalize" }}>{user?.role || "Citizen"}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span className="cg-text-muted">Phone contact</span>
                      <strong>{user?.phone || "Not specified"}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span className="cg-text-muted">Resolved requests</span>
                      <strong style={{ color: "var(--cg-success)" }}>{stats.resolved}</strong>
                    </div>
                  </div>

                  <Link
                    to="/profile"
                    className="cg-btn cg-btn-outline cg-btn-sm"
                    style={{ width: "100%", marginTop: "18px" }}
                  >
                    View Account Details
                  </Link>
                </Card>

                {/* Quick Assistance */}
                <Card title="Civic Quick Links" eyebrow="Actions">
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <Link
                      to="/citizen/requests/new"
                      className="cg-btn cg-btn-secondary cg-btn-md"
                      style={{ justifyContent: "flex-start" }}
                    >
                      <Icon name="plus" size={16} />
                      <span>Report a New Issue</span>
                    </Link>
                    <Link
                      to="/citizen/requests"
                      className="cg-btn cg-btn-outline cg-btn-md"
                      style={{ justifyContent: "flex-start" }}
                    >
                      <Icon name="requests" size={16} />
                      <span>Browse All Requests</span>
                    </Link>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* Recent Activity Feed */}
          {requests.length > 0 && (
            <Card
              title="Recent Civic Activity"
              subtitle="Latest timeline updates across your requests"
            >
              <div style={{ display: "flex", flexDirection: "column" }}>
                {recentTimeline.map((item, index) => (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "14px",
                      padding: "14px 0",
                      borderBottom: index < recentTimeline.length - 1 ? "1px solid var(--cg-border-light)" : "none",
                    }}
                  >
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        background: "var(--cg-soft-green)",
                        color: "var(--cg-primary-green)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        marginTop: "2px",
                      }}
                    >
                      <Icon name="clock" size={15} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" }}>
                        <Link
                          to={`/citizen/requests/${item.id}`}
                          style={{ fontWeight: 600, fontSize: "14px", color: "var(--cg-text-main)" }}
                        >
                          {item.title}
                        </Link>
                        <span style={{ fontSize: "12px", color: "var(--cg-text-muted)" }}>
                          {formatDate(item.updated_at || item.created_at)}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
                        <StatusBadge status={item.status} />
                        {item.location && (
                          <span style={{ fontSize: "12px", color: "var(--cg-text-secondary)" }}>
                            • {item.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div>
      <div className="cg-stat-grid">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="cg-skeleton" style={{ height: "115px" }} />
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: "24px" }}>
        <div className="cg-skeleton" style={{ height: "340px" }} />
        <div className="cg-skeleton" style={{ height: "340px" }} />
      </div>
    </div>
  );
}