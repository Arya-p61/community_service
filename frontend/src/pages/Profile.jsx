import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/ui/PageHeader";
import Card from "../components/ui/Card";
import { RoleBadge } from "../components/ui/Badge";
import { Icon } from "../components/ui/Icons";

const formatDate = (date) => {
  if (!date) return "Member";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "Member";
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

export default function Profile() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="cg-empty-state">
        <span className="cg-spinner" />
        <p>Loading profile details...</p>
      </div>
    );
  }

  const role = user.role || "citizen";

  return (
    <div className="cg-profile-page">
      <PageHeader
        eyebrow="Account Settings"
        title="Civic Profile & Identity"
        description="Review your registered credentials, account status, and system permissions."
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.8fr", gap: "28px", alignItems: "start" }}>
        {/* Left: Identity Card */}
        <Card>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "12px 0 8px" }}>
            <div
              className="cg-user-avatar"
              style={{
                width: "80px",
                height: "80px",
                fontSize: "32px",
                marginBottom: "16px",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              {user.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <h3 style={{ fontSize: "20px", fontWeight: 700, color: "var(--cg-text-main)", marginBottom: "4px" }}>
              {user.name}
            </h3>
            <p className="cg-text-muted" style={{ fontSize: "14px", marginBottom: "12px" }}>
              {user.email}
            </p>
            <div>
              <RoleBadge role={user.role} />
            </div>

            <div
              style={{
                width: "100%",
                borderTop: "1px solid var(--cg-border-light)",
                marginTop: "20px",
                paddingTop: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                fontSize: "13px",
                textAlign: "left",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="cg-text-muted">Account Status</span>
                <span style={{ color: "var(--cg-success)", fontWeight: 600, display: "flex", alignItems: "center", gap: "5px" }}>
                  <Icon name="check-circle" size={13} />
                  <span>{user.is_active ? "Active & Verified" : "Inactive"}</span>
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="cg-text-muted">Registered On</span>
                <strong>{formatDate(user.created_at)}</strong>
              </div>
              {user.department_name && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="cg-text-muted">Department</span>
                  <strong>{user.department_name}</strong>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Right: Detailed Fields & Administrative Guidance */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <Card title="Personal Details" subtitle="Verified information on file with the service system">
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="cg-form-row">
                <div className="cg-form-field">
                  <label className="cg-field-label">Full Name</label>
                  <input
                    type="text"
                    className="cg-input"
                    value={user.name || ""}
                    readOnly
                    disabled
                  />
                </div>
                <div className="cg-form-field">
                  <label className="cg-field-label">Primary Phone</label>
                  <input
                    type="text"
                    className="cg-input"
                    value={user.phone || "Not specified"}
                    readOnly
                    disabled
                  />
                </div>
              </div>

              <div className="cg-form-row">
                <div className="cg-form-field">
                  <label className="cg-field-label">Registered Email</label>
                  <input
                    type="email"
                    className="cg-input"
                    value={user.email || ""}
                    readOnly
                    disabled
                  />
                </div>
                <div className="cg-form-field">
                  <label className="cg-field-label">System Role</label>
                  <input
                    type="text"
                    className="cg-input"
                    value={role.charAt(0).toUpperCase() + role.slice(1)}
                    readOnly
                    disabled
                  />
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: "24px",
                padding: "16px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "#F9FBF8",
                border: "1px solid var(--cg-border)",
                display: "flex",
                gap: "12px",
                alignItems: "flex-start",
              }}
            >
              <div style={{ color: "var(--cg-primary-green)", marginTop: "2px" }}>
                <Icon name="shield" size={18} />
              </div>
              <div>
                <strong style={{ fontSize: "13px", color: "var(--cg-text-main)", display: "block", marginBottom: "4px" }}>
                  Account Updates & Security
                </strong>
                <p style={{ fontSize: "13px", color: "var(--cg-text-secondary)", lineHeight: "1.55" }}>
                  To maintain data integrity and audit compliance across municipal operations, email address updates, password changes, and role assignments are managed via municipal administration.
                </p>
              </div>
            </div>
          </Card>

          {/* Quick Workspace Nav Card */}
          <Card title="Quick Navigation" eyebrow="Role Links">
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <Link to={`/${role}/dashboard`} className="cg-btn cg-btn-primary">
                <Icon name="dashboard" size={16} />
                <span>Go to {role.charAt(0).toUpperCase() + role.slice(1)} Dashboard</span>
              </Link>
              {role === "citizen" && (
                <Link to="/citizen/requests" className="cg-btn cg-btn-outline">
                  <Icon name="requests" size={16} />
                  <span>My Requests</span>
                </Link>
              )}
              {role === "officer" && (
                <Link to="/officer/requests" className="cg-btn cg-btn-outline">
                  <Icon name="requests" size={16} />
                  <span>Department Queue</span>
                </Link>
              )}
              {role === "admin" && (
                <Link to="/admin/requests" className="cg-btn cg-btn-outline">
                  <Icon name="requests" size={16} />
                  <span>All Requests</span>
                </Link>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}