import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getOfficerRequests } from "../services/requestService";
import { StatusBadge, PriorityBadge } from "../components/ui/Badge";
import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { Icon } from "../components/ui/Icons";

const formatDate = (date) =>
  new Date(date).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export default function OfficerRequests() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    priority: "",
    assigned: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRequests = async () => {
    setLoading(true);
    setError("");
    const params = {};
    if (filters.search.trim()) params.search = filters.search.trim();
    if (filters.status) params.status = filters.status;
    if (filters.priority) params.priority = filters.priority;
    if (filters.assigned === "true") params.assigned = true;
    if (filters.assigned === "false") params.assigned = false;

    try {
      const data = await getOfficerRequests(params);
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setError("Unable to load the department request queue. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [filters.status, filters.priority, filters.assigned]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadRequests();
  };

  const clearFilters = () => {
    setFilters({ search: "", status: "", priority: "", assigned: "" });
  };

  return (
    <div className="cg-officer-queue-page">
      <PageHeader
        eyebrow={`${user?.department_name || "Department"} Operations`}
        title="Department Request Queue"
        description="Review community reports assigned to your department, claim work, and update service progress."
      />

      {/* Filter and Search Bar */}
      <form onSubmit={handleSearchSubmit} className="cg-toolbar">
        <div className="cg-toolbar-search">
          <div className="cg-input-with-icon">
            <span className="cg-input-icon-left">
              <Icon name="search" size={16} />
            </span>
            <input
              type="text"
              className="cg-input"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Search by title, location or description..."
            />
          </div>
        </div>

        <div className="cg-toolbar-filter">
          <select
            className="cg-select"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            aria-label="Filter by status"
          >
            <option value="">All Statuses</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="PENDING">Pending Review</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>

        <div className="cg-toolbar-filter">
          <select
            className="cg-select"
            value={filters.priority}
            onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
            aria-label="Filter by priority"
          >
            <option value="">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
        </div>

        <div className="cg-toolbar-filter">
          <select
            className="cg-select"
            value={filters.assigned}
            onChange={(e) => setFilters({ ...filters, assigned: e.target.value })}
            aria-label="Filter by assignment"
          >
            <option value="">All Assignments</option>
            <option value="false">Unassigned Only</option>
            <option value="true">Assigned to Me</option>
          </select>
        </div>

        <Button type="submit" variant="primary" size="md">
          Search
        </Button>

        {(filters.search || filters.status || filters.priority || filters.assigned) && (
          <Button type="button" variant="ghost" size="md" onClick={clearFilters}>
            Reset
          </Button>
        )}
      </form>

      {error && (
        <div className="cg-form-error" style={{ marginBottom: "20px" }}>
          <Icon name="alert-triangle" size={16} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="cg-table-card">
          <div style={{ padding: "32px", display: "flex", flexDirection: "column", gap: "16px" }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="cg-skeleton" style={{ height: "54px" }} />
            ))}
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="cg-empty-state">
          <div className="cg-empty-icon">
            <Icon name="requests" size={28} />
          </div>
          <h3 className="cg-empty-title">No requests found</h3>
          <p className="cg-empty-description">
            There are currently no department service requests matching your selected filters.
          </p>
          {(filters.search || filters.status || filters.priority || filters.assigned) && (
            <Button variant="outline" onClick={clearFilters}>
              Clear all filters
            </Button>
          )}
        </div>
      ) : (
        <div className="cg-table-card">
          <div className="cg-table-responsive">
            <table className="cg-table">
              <thead>
                <tr>
                  <th style={{ width: "100px" }}>ID</th>
                  <th>Request Title</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Assigned Officer</th>
                  <th>Date</th>
                  <th style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const isAssignedToMe = item.assigned_officer_id === user?.id;
                  const isUnassigned = !item.assigned_officer_id;

                  return (
                    <tr
                      key={item.id}
                      style={{
                        backgroundColor: isAssignedToMe ? "rgba(45, 106, 82, 0.03)" : undefined,
                      }}
                    >
                      <td>
                        <span className="cg-table-id">REQ-{String(item.id).padStart(3, "0")}</span>
                      </td>
                      <td>
                        <Link to={`/officer/requests/${item.id}`} className="cg-table-title">
                          {item.title}
                        </Link>
                        <div style={{ fontSize: "12px", color: "var(--cg-text-muted)" }}>
                          ⌖ {item.location || "Location not provided"}
                        </div>
                      </td>
                      <td>
                        <span style={{ color: "var(--cg-text-secondary)" }}>
                          {item.category || "Awaiting AI"}
                        </span>
                      </td>
                      <td>
                        <PriorityBadge priority={item.priority} />
                      </td>
                      <td>
                        <StatusBadge status={item.status} />
                      </td>
                      <td>
                        {isUnassigned ? (
                          <span
                            className="cg-badge"
                            style={{
                              backgroundColor: "#FEF7E6",
                              color: "#B7791F",
                              borderColor: "#FEEBC8",
                            }}
                          >
                            Unassigned
                          </span>
                        ) : isAssignedToMe ? (
                          <span
                            className="cg-badge"
                            style={{
                              backgroundColor: "var(--cg-soft-green)",
                              color: "var(--cg-primary-green)",
                              fontWeight: 700,
                            }}
                          >
                            Assigned to You
                          </span>
                        ) : (
                          <span style={{ color: "var(--cg-text-secondary)" }}>
                            {item.assigned_officer_name || "Officer"}
                          </span>
                        )}
                      </td>
                      <td>
                        <span style={{ fontSize: "12px", color: "var(--cg-text-muted)" }}>
                          {formatDate(item.created_at)}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <Link
                          to={`/officer/requests/${item.id}`}
                          className="cg-btn cg-btn-outline cg-btn-sm"
                        >
                          <span>Review</span>
                          <Icon name="chevron-right" size={13} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div
            style={{
              padding: "14px 20px",
              background: "#F8FAF7",
              borderTop: "1px solid var(--cg-border-light)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "12px",
              color: "var(--cg-text-secondary)",
            }}
          >
            <span>Showing {items.length} department requests</span>
            <span>Department: <strong>{user?.department_name || "Assigned"}</strong></span>
          </div>
        </div>
      )}
    </div>
  );
}
