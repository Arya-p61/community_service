import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getMyRequests } from "../services/requestService";
import { StatusBadge } from "../components/ui/Badge";
import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { Icon } from "../components/ui/Icons";
import RequestsMapView from "../components/map/RequestsMapView";

const formatDate = (date) =>
  new Date(date).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export default function RequestList() {
  const [requests, setRequests] = useState([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [viewMode, setViewMode] = useState("list"); // 'list' | 'map'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRequests = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getMyRequests();
      setRequests(Array.isArray(data) ? data : []);
    } catch {
      setError("Unable to load your requests. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      const matchesStatus = status === "ALL" || r.status === status;
      const term = query.toLowerCase().trim();
      const textToSearch = `${r.title || ""} ${r.description || ""} ${r.location || ""} ${r.department_name || ""}`.toLowerCase();
      const matchesQuery = !term || textToSearch.includes(term);
      return matchesStatus && matchesQuery;
    });
  }, [requests, query, status]);

  return (
    <div className="cg-requests-page">
      <PageHeader
        eyebrow="Citizen Activity"
        title="My Service Requests"
        description="Track all community issues and civic improvements you have submitted."
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div className="cg-view-toggle">
              <button
                type="button"
                className={`cg-view-toggle-btn ${viewMode === "list" ? "active" : ""}`}
                onClick={() => setViewMode("list")}
                title="Table List View"
              >
                <Icon name="requests" size={14} />
                <span>List</span>
              </button>
              <button
                type="button"
                className={`cg-view-toggle-btn ${viewMode === "map" ? "active" : ""}`}
                onClick={() => setViewMode("map")}
                title="Interactive Map View"
              >
                <Icon name="location" size={14} />
                <span>Map</span>
              </button>
            </div>

            <Link to="/citizen/requests/new" className="cg-btn cg-btn-primary cg-btn-md">
              <Icon name="plus" size={17} />
              <span>Report an Issue</span>
            </Link>
          </div>
        }
      />

      {/* Toolbar: Search and Status Filter */}
      <div className="cg-toolbar">
        <div className="cg-toolbar-search">
          <div className="cg-input-with-icon">
            <span className="cg-input-icon-left">
              <Icon name="search" size={16} />
            </span>
            <input
              type="text"
              className="cg-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title, location, description..."
            />
            {query && (
              <button
                type="button"
                className="cg-input-icon-right-btn"
                onClick={() => setQuery("")}
                aria-label="Clear search"
              >
                <Icon name="close" size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="cg-toolbar-filter">
          <select
            className="cg-select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filter by status"
          >
            <option value="ALL">All Statuses ({requests.length})</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="PENDING">Pending Review</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="cg-table-card">
          <div style={{ padding: "32px", display: "flex", flexDirection: "column", gap: "16px" }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="cg-skeleton" style={{ height: "54px" }} />
            ))}
          </div>
        </div>
      ) : error ? (
        <Card className="cg-empty-state">
          <div className="cg-empty-icon" style={{ background: "#FEEBEB", color: "var(--cg-error)" }}>
            <Icon name="alert-triangle" size={24} />
          </div>
          <h3 className="cg-empty-title">Could not load requests</h3>
          <p className="cg-empty-description">{error}</p>
          <Button variant="primary" onClick={loadRequests}>
            Try again
          </Button>
        </Card>
      ) : requests.length === 0 ? (
        <div className="cg-empty-state">
          <div className="cg-empty-icon">
            <Icon name="requests" size={28} />
          </div>
          <h3 className="cg-empty-title">Nothing reported yet</h3>
          <p className="cg-empty-description">
            You haven't submitted any service requests yet. When you notice an issue in your community, report it here so the relevant municipal department can take action.
          </p>
          <Link to="/citizen/requests/new" className="cg-btn cg-btn-primary cg-btn-lg">
            <Icon name="plus" size={17} />
            <span>Report your first issue</span>
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="cg-empty-state">
          <div className="cg-empty-icon">
            <Icon name="filter" size={26} />
          </div>
          <h3 className="cg-empty-title">No matching requests</h3>
          <p className="cg-empty-description">
            We couldn't find any service requests matching your search or status filter. Try clearing filters to see all requests.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setQuery("");
              setStatus("ALL");
            }}
          >
            Clear all filters
          </Button>
        </div>
      ) : viewMode === "map" ? (
        <RequestsMapView
          requests={filtered}
          detailBasePath="/citizen/requests"
          role="citizen"
          emptyMessage="None of your matching requests have GPS coordinates. Switch to List view to inspect all requests."
        />
      ) : (
        <div className="cg-table-card">
          <div className="cg-table-responsive">
            <table className="cg-table">
              <thead>
                <tr>
                  <th style={{ width: "110px" }}>ID</th>
                  <th>Request Title</th>
                  <th>Location</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <span className="cg-table-id">REQ-{String(r.id).padStart(3, "0")}</span>
                    </td>
                    <td>
                      <Link to={`/citizen/requests/${r.id}`} className="cg-table-title">
                        {r.title}
                      </Link>
                      <p
                        className="cg-text-muted"
                        style={{
                          fontSize: "12px",
                          display: "-webkit-box",
                          WebkitLineClamp: 1,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          maxWidth: "320px",
                        }}
                      >
                        {r.description}
                      </p>
                    </td>
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", color: "var(--cg-text-secondary)" }}>
                        <Icon name="location" size={13} />
                        <span>{r.location || "Not specified"}</span>
                      </span>
                    </td>
                    <td>
                      <span style={{ color: "var(--cg-text-secondary)" }}>
                        {r.department_name || "Awaiting routing"}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={r.status} />
                    </td>
                    <td>
                      <span style={{ color: "var(--cg-text-secondary)", fontSize: "12px" }}>
                        {formatDate(r.created_at)}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <Link
                        to={`/citizen/requests/${r.id}`}
                        className="cg-btn cg-btn-outline cg-btn-sm"
                      >
                        <span>Details</span>
                        <Icon name="chevron-right" size={13} />
                      </Link>
                    </td>
                  </tr>
                ))}
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
            <span>
              Showing {filtered.length} of {requests.length} requests
            </span>
            {status !== "ALL" && (
              <span>Filter: <strong>{status}</strong></span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}