import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAdminOfficers, getAdminRequests, getDepartments } from "../services/requestService";
import PageHeader from "../components/ui/PageHeader";
import StatCard from "../components/ui/StatCard";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { Icon } from "../components/ui/Icons";

export default function AdminDashboard() {
  const [data, setData] = useState({ requests: [], officers: [], departments: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [requests, officers, departments] = await Promise.all([
        getAdminRequests(),
        getAdminOfficers(),
        getDepartments(true),
      ]);
      setData({
        requests: Array.isArray(requests) ? requests : [],
        officers: Array.isArray(officers) ? officers : [],
        departments: Array.isArray(departments) ? departments : [],
      });
    } catch {
      setError("Unable to load administration overview. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const { requests, officers, departments } = data;

  const stats = {
    total: requests.length,
    open: requests.filter((item) => ["SUBMITTED", "PENDING"].includes(item.status)).length,
    inProgress: requests.filter((item) => item.status === "IN_PROGRESS").length,
    resolved: requests.filter((item) => ["RESOLVED", "CLOSED"].includes(item.status)).length,
    unassigned: requests.filter((item) => !item.assigned_officer_id).length,
    totalDepartments: departments.length,
    activeOfficers: officers.filter((o) => o.is_active).length,
  };

  return (
    <div className="cg-admin-dashboard">
      <PageHeader
        eyebrow="System Administration"
        title="Operations Overview"
        description="Comprehensive management of municipal departments, officers, and civic request workflows across the city."
        actions={
          <div style={{ display: "flex", gap: "10px" }}>
            <Link to="/admin/requests" className="cg-btn cg-btn-primary cg-btn-md">
              <Icon name="requests" size={16} />
              <span>Manage Requests</span>
            </Link>
          </div>
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
          <h3 className="cg-empty-title">Overview Unavailable</h3>
          <p className="cg-empty-description">{error}</p>
          <Button variant="primary" onClick={loadData}>
            Try again
          </Button>
        </Card>
      ) : (
        <>
          {/* Main Stat Grid */}
          <div className="cg-stat-grid">
            <StatCard
              label="All Service Requests"
              value={stats.total}
              subtext="Platform-wide submissions"
              icon="requests"
              accent="primary"
              to="/admin/requests"
            />
            <StatCard
              label="Open Submissions"
              value={stats.open}
              subtext="Submitted or pending routing"
              icon="clock"
              accent="warning"
              to="/admin/requests"
            />
            <StatCard
              label="Unassigned"
              value={stats.unassigned}
              subtext="Awaiting officer assignment"
              icon="alert"
              accent="coral"
              to="/admin/requests"
            />
            <StatCard
              label="Resolved / Closed"
              value={stats.resolved}
              subtext="Completed civic cases"
              icon="check-circle"
              accent="success"
              to="/admin/requests"
            />
          </div>

          {/* Quick Management Section Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px", marginBottom: "32px" }}>
            <Link to="/admin/requests" style={{ textDecoration: "none" }}>
              <Card
                title="Service Requests"
                eyebrow="Workflow Operations"
                className="cg-stat-link"
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "var(--radius-md)",
                      background: "var(--cg-soft-green)",
                      color: "var(--cg-primary-green)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon name="requests" size={20} />
                  </div>
                  <div>
                    <strong style={{ fontSize: "20px", color: "var(--cg-text-main)" }}>
                      {stats.total}
                    </strong>
                    <span className="cg-text-muted" style={{ display: "block", fontSize: "12px" }}>
                      Total requests logged
                    </span>
                  </div>
                </div>
                <p style={{ fontSize: "13px", color: "var(--cg-text-secondary)", lineHeight: "1.5" }}>
                  Oversee department routing, override officer assignments, and update statuses.
                </p>
                <div style={{ marginTop: "14px", display: "flex", alignItems: "center", gap: "5px", color: "var(--cg-primary-green)", fontSize: "13px", fontWeight: 600 }}>
                  <span>Open requests console</span>
                  <Icon name="arrow-right" size={14} />
                </div>
              </Card>
            </Link>

            <Link to="/admin/departments" style={{ textDecoration: "none" }}>
              <Card
                title="Departments"
                eyebrow="Routing Units"
                className="cg-stat-link"
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "var(--radius-md)",
                      background: "#EEF4FF",
                      color: "#2B6CB0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon name="departments" size={20} />
                  </div>
                  <div>
                    <strong style={{ fontSize: "20px", color: "var(--cg-text-main)" }}>
                      {stats.totalDepartments}
                    </strong>
                    <span className="cg-text-muted" style={{ display: "block", fontSize: "12px" }}>
                      Configured departments
                    </span>
                  </div>
                </div>
                <p style={{ fontSize: "13px", color: "var(--cg-text-secondary)", lineHeight: "1.5" }}>
                  Create and manage municipal departments and service codes.
                </p>
                <div style={{ marginTop: "14px", display: "flex", alignItems: "center", gap: "5px", color: "var(--cg-primary-green)", fontSize: "13px", fontWeight: 600 }}>
                  <span>Manage departments</span>
                  <Icon name="arrow-right" size={14} />
                </div>
              </Card>
            </Link>

            <Link to="/admin/officers" style={{ textDecoration: "none" }}>
              <Card
                title="Officers"
                eyebrow="Staff Directory"
                className="cg-stat-link"
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "var(--radius-md)",
                      background: "#FEF7E6",
                      color: "#B7791F",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon name="officers" size={20} />
                  </div>
                  <div>
                    <strong style={{ fontSize: "20px", color: "var(--cg-text-main)" }}>
                      {stats.activeOfficers}
                    </strong>
                    <span className="cg-text-muted" style={{ display: "block", fontSize: "12px" }}>
                      Active officer accounts
                    </span>
                  </div>
                </div>
                <p style={{ fontSize: "13px", color: "var(--cg-text-secondary)", lineHeight: "1.5" }}>
                  Provision officer profiles and assign staff to departments.
                </p>
                <div style={{ marginTop: "14px", display: "flex", alignItems: "center", gap: "5px", color: "var(--cg-primary-green)", fontSize: "13px", fontWeight: 600 }}>
                  <span>Manage officer roster</span>
                  <Icon name="arrow-right" size={14} />
                </div>
              </Card>
            </Link>

            <Link to="/admin/feedback" style={{ textDecoration: "none" }}>
              <Card
                title="Feedback Analytics"
                eyebrow="Citizen Ratings"
                className="cg-stat-link"
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "var(--radius-md)",
                      background: "#FFF0F0",
                      color: "#E57B61",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon name="star" size={20} />
                  </div>
                  <div>
                    <strong style={{ fontSize: "20px", color: "var(--cg-text-main)" }}>
                      {stats.resolved}
                    </strong>
                    <span className="cg-text-muted" style={{ display: "block", fontSize: "12px" }}>
                      Eligible for feedback
                    </span>
                  </div>
                </div>
                <p style={{ fontSize: "13px", color: "var(--cg-text-secondary)", lineHeight: "1.5" }}>
                  Review citizen ratings and track department service quality over time.
                </p>
                <div style={{ marginTop: "14px", display: "flex", alignItems: "center", gap: "5px", color: "var(--cg-primary-green)", fontSize: "13px", fontWeight: 600 }}>
                  <span>View feedback analytics</span>
                  <Icon name="arrow-right" size={14} />
                </div>
              </Card>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
