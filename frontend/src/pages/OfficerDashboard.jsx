import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getOfficerRequests } from "../services/requestService";
import { StatusBadge, PriorityBadge } from "../components/ui/Badge";
import PageHeader from "../components/ui/PageHeader";
import StatCard from "../components/ui/StatCard";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { Icon } from "../components/ui/Icons";

const formatDate = (val) => {
  if (!val) return "Recently";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return "Recently";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

export default function OfficerDashboard() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getOfficerRequests();
      setRequests(Array.isArray(data) ? data : []);
    } catch {
      setError("Unable to load department queue. Please check your department assignment.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const stats = useMemo(() => {
    const total = requests.length;
    const unassigned = requests.filter((item) => !item.assigned_officer_id).length;
    const assignedToMe = requests.filter((item) => item.assigned_officer_id === user?.id).length;
    const inProgress = requests.filter((item) => item.status === "IN_PROGRESS").length;
    const resolved = requests.filter((item) => ["RESOLVED", "CLOSED"].includes(item.status)).length;
    return { total, unassigned, assignedToMe, inProgress, resolved };
  }, [requests, user?.id]);

  const myAssignedRequests = useMemo(() => {
    return requests
      .filter((item) => item.assigned_officer_id === user?.id)
      .slice(0, 5);
  }, [requests, user?.id]);

  const departmentQueuePreview = useMemo(() => {
    return requests
      .filter((item) => !item.assigned_officer_id)
      .slice(0, 5);
  }, [requests]);

  const departmentName = user?.department_name || "Assigned Department";

  return (
    <div className="cg-officer-dashboard">
      <PageHeader
        eyebrow={`${departmentName} • Officer Workspace`}
        title={`Welcome back, ${user?.name || "Officer"}`}
        description="Monitor department service queues, claim unassigned requests, and update community resolutions."
        actions={
          <Link to="/officer/requests" className="cg-btn cg-btn-primary cg-btn-md">
            <Icon name="requests" size={17} />
            <span>Open Department Queue</span>
          </Link>
        }
      />

      {loading ? (
        <div className="cg-stat-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="cg-skeleton" style={{ height: "115px" }} />
          ))}
        </div>
      ) : error ? (
        <Card className="cg-empty-state">
          <div className="cg-empty-icon" style={{ background: "#FEEBEB", color: "var(--cg-error)" }}>
            <Icon name="alert-triangle" size={24} />
          </div>
          <h3 className="cg-empty-title">Queue Unavailable</h3>
          <p className="cg-empty-description">{error}</p>
          <Button variant="primary" onClick={loadData}>
            Try again
          </Button>
        </Card>
      ) : (
        <>
          {/* Metrics Grid */}
          <div className="cg-stat-grid">
            <StatCard
              label="Department Total"
              value={stats.total}
              subtext={`Requests for ${departmentName}`}
              icon="departments"
              accent="primary"
              to="/officer/requests"
            />
            <StatCard
              label="Unassigned"
              value={stats.unassigned}
              subtext="Needs officer claim"
              icon="alert"
              accent="warning"
              to="/officer/requests"
            />
            <StatCard
              label="Assigned to Me"
              value={stats.assignedToMe}
              subtext="Your current work"
              icon="user"
              accent="coral"
              to="/officer/requests"
            />
            <StatCard
              label="In Progress"
              value={stats.inProgress}
              subtext="Actively being resolved"
              icon="clock"
              accent="primary"
              to="/officer/requests"
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1.4fr", gap: "24px", marginBottom: "32px" }}>
            {/* My Assigned Work */}
            <Card
              title="My Assigned Work"
              subtitle="Requests currently assigned directly to you"
              action={
                <Link to="/officer/requests" className="cg-back-link" style={{ margin: 0 }}>
                  <span>Queue</span>
                  <Icon name="arrow-right" size={13} />
                </Link>
              }
            >
              {myAssignedRequests.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--cg-text-secondary)" }}>
                  <Icon name="check-circle" size={30} style={{ color: "var(--cg-primary-green)", margin: "0 auto 8px" }} />
                  <p style={{ fontWeight: 600, color: "var(--cg-text-main)" }}>No assigned requests</p>
                  <p style={{ fontSize: "13px", marginTop: "4px" }}>
                    You currently have no tasks assigned to you. Claim an open issue from the department queue.
                  </p>
                  <Link to="/officer/requests" className="cg-btn cg-btn-secondary cg-btn-sm" style={{ marginTop: "14px" }}>
                    Browse Unassigned Queue
                  </Link>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {myAssignedRequests.map((item) => (
                    <Link
                      key={item.id}
                      to={`/officer/requests/${item.id}`}
                      style={{
                        padding: "14px",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--cg-border)",
                        background: "#FAFCFA",
                        display: "block",
                        transition: "all 0.15s ease",
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
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <span className="cg-table-id">REQ-{String(item.id).padStart(3, "0")}</span>
                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                          <PriorityBadge priority={item.priority} />
                          <StatusBadge status={item.status} />
                        </div>
                      </div>
                      <h4 style={{ fontSize: "14px", fontWeight: 600, color: "var(--cg-text-main)", marginBottom: "4px" }}>
                        {item.title}
                      </h4>
                      <div style={{ fontSize: "12px", color: "var(--cg-text-secondary)", display: "flex", gap: "12px" }}>
                        <span>⌖ {item.location || "Location pending"}</span>
                        <span>• Updated {formatDate(item.updated_at || item.created_at)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </Card>

            {/* Department Queue (Unassigned) */}
            <Card
              title="Awaiting Assignment"
              subtitle="Incoming department requests ready to be claimed"
              action={
                <Link to="/officer/requests" className="cg-back-link" style={{ margin: 0 }}>
                  <span>View all</span>
                  <Icon name="arrow-right" size={13} />
                </Link>
              }
            >
              {departmentQueuePreview.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--cg-text-secondary)" }}>
                  <Icon name="check" size={30} style={{ color: "var(--cg-success)", margin: "0 auto 8px" }} />
                  <p style={{ fontWeight: 600, color: "var(--cg-text-main)" }}>Department queue is clear!</p>
                  <p style={{ fontSize: "13px", marginTop: "4px" }}>
                    There are no unassigned requests waiting in {departmentName}.
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {departmentQueuePreview.map((item) => (
                    <Link
                      key={item.id}
                      to={`/officer/requests/${item.id}`}
                      style={{
                        padding: "14px",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--cg-border)",
                        background: "#FFFDF9",
                        display: "block",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "var(--cg-coral)";
                        e.currentTarget.style.transform = "translateY(-1px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "var(--cg-border)";
                        e.currentTarget.style.transform = "none";
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <span className="cg-table-id">REQ-{String(item.id).padStart(3, "0")}</span>
                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                          <PriorityBadge priority={item.priority} />
                          <span className="cg-badge" style={{ background: "#FEF7E6", color: "#B7791F" }}>
                            Unclaimed
                          </span>
                        </div>
                      </div>
                      <h4 style={{ fontSize: "14px", fontWeight: 600, color: "var(--cg-text-main)", marginBottom: "4px" }}>
                        {item.title}
                      </h4>
                      <div style={{ fontSize: "12px", color: "var(--cg-text-secondary)", display: "flex", gap: "12px" }}>
                        <span>{item.category || "AI Classification pending"}</span>
                        <span>• {formatDate(item.created_at)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
