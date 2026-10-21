import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getAdminOfficers,
  getAdminRequests,
  getDepartments,
  updateAdminAssignment,
  updateAdminStatus,
} from "../services/requestService";
import { StatusBadge, PriorityBadge } from "../components/ui/Badge";
import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Modal from "../components/ui/Modal";
import { Icon } from "../components/ui/Icons";

const STATUSES = ["SUBMITTED", "PENDING", "IN_PROGRESS", "RESOLVED", "CLOSED"];

export default function AdminRequests() {
  const [items, setItems] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [filters, setFilters] = useState({ search: "", status: "", departmentId: "" });

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Status update confirmation modal
  const [statusModal, setStatusModal] = useState({ open: false, request: null, newStatus: "", note: "" });

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [requestsData, deptsData, officersData] = await Promise.all([
        getAdminRequests(),
        getDepartments(true),
        getAdminOfficers(),
      ]);
      setItems(Array.isArray(requestsData) ? requestsData : []);
      setDepartments(Array.isArray(deptsData) ? deptsData : []);
      setOfficers(Array.isArray(officersData) ? officersData : []);
    } catch {
      setError("Unable to load administrative requests data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const visible = useMemo(() => {
    return items.filter((item) => {
      const matchesStatus = !filters.status || item.status === filters.status;
      const matchesDept = !filters.departmentId || String(item.department_id) === String(filters.departmentId);
      const term = filters.search.toLowerCase().trim();
      const textToSearch = `${item.title || ""} ${item.description || ""} ${item.department_name || ""} ${item.assigned_officer_name || ""}`.toLowerCase();
      const matchesSearch = !term || textToSearch.includes(term);
      return matchesStatus && matchesDept && matchesSearch;
    });
  }, [items, filters]);

  const handleDepartmentChange = async (item, newDeptId) => {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const parsedDept = newDeptId ? Number(newDeptId) : null;
      // If department changes, officer is reset to null
      await updateAdminAssignment(item.id, {
        department_id: parsedDept,
        assigned_officer_id: null,
      });
      setSuccess(`Request REQ-${String(item.id).padStart(3, "0")} routed to new department.`);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to update department assignment.");
    } finally {
      setBusy(false);
    }
  };

  const handleOfficerChange = async (item, newOfficerId) => {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const parsedOfficer = newOfficerId ? Number(newOfficerId) : null;
      await updateAdminAssignment(item.id, {
        department_id: item.department_id,
        assigned_officer_id: parsedOfficer,
      });
      setSuccess(`Officer assignment updated for REQ-${String(item.id).padStart(3, "0")}.`);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to assign officer.");
    } finally {
      setBusy(false);
    }
  };

  const promptStatusChange = (request, newStatus) => {
    if (newStatus === request.status) return;
    setStatusModal({
      open: true,
      request,
      newStatus,
      note: "Status updated by municipal administrator.",
    });
  };

  const confirmStatusChange = async (e) => {
    e.preventDefault();
    const { request, newStatus, note } = statusModal;
    if (!request || !newStatus) return;

    setBusy(true);
    setError("");
    try {
      await updateAdminStatus(request.id, {
        status: newStatus,
        note: note.trim() || "Status updated by municipal administrator.",
      });
      setSuccess(`Status for REQ-${String(request.id).padStart(3, "0")} changed to ${newStatus}.`);
      setStatusModal({ open: false, request: null, newStatus: "", note: "" });
      await loadData();
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to change request status.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cg-admin-requests-page">
      <PageHeader
        eyebrow="Administration Console"
        title="All Service Requests"
        description="Global governance of municipal requests: assign departments, designate officers, and override workflow states."
      />

      {error && (
        <div className="cg-form-error" style={{ marginBottom: "20px" }}>
          <Icon name="alert-triangle" size={16} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="cg-form-success" style={{ marginBottom: "20px" }}>
          <Icon name="check-circle" size={16} />
          <span>{success}</span>
        </div>
      )}

      {/* Toolbar: Search and Filter controls */}
      <div className="cg-toolbar">
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
              placeholder="Search by title, description or department..."
            />
            {filters.search && (
              <button
                type="button"
                className="cg-input-icon-right-btn"
                onClick={() => setFilters({ ...filters, search: "" })}
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
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            aria-label="Filter by status"
          >
            <option value="">All Statuses ({items.length})</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="cg-toolbar-filter">
          <select
            className="cg-select"
            value={filters.departmentId}
            onChange={(e) => setFilters({ ...filters, departmentId: e.target.value })}
            aria-label="Filter by department"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} {!d.is_active ? "(Inactive)" : ""}
              </option>
            ))}
          </select>
        </div>

        {(filters.search || filters.status || filters.departmentId) && (
          <Button
            variant="ghost"
            size="md"
            onClick={() => setFilters({ search: "", status: "", departmentId: "" })}
          >
            Reset Filters
          </Button>
        )}
      </div>

      {loading ? (
        <div className="cg-table-card">
          <div style={{ padding: "32px", display: "flex", flexDirection: "column", gap: "16px" }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="cg-skeleton" style={{ height: "54px" }} />
            ))}
          </div>
        </div>
      ) : visible.length === 0 ? (
        <div className="cg-empty-state">
          <div className="cg-empty-icon">
            <Icon name="requests" size={28} />
          </div>
          <h3 className="cg-empty-title">No requests found</h3>
          <p className="cg-empty-description">
            No service requests match your search or filter criteria.
          </p>
          {(filters.search || filters.status || filters.departmentId) && (
            <Button
              variant="outline"
              onClick={() => setFilters({ search: "", status: "", departmentId: "" })}
            >
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <div className="cg-table-card">
          <div className="cg-table-responsive">
            <table className="cg-table">
              <thead>
                <tr>
                  <th style={{ width: "95px" }}>ID</th>
                  <th>Request Title</th>
                  <th>Priority</th>
                  <th>Assigned Department</th>
                  <th>Assigned Officer</th>
                  <th>Current Status</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((item) => {
                  // Active officers for this specific request's department
                  const deptOfficers = officers.filter(
                    (o) => o.is_active && o.department_id === item.department_id
                  );

                  return (
                    <tr key={item.id}>
                      <td>
                        <span className="cg-table-id">REQ-{String(item.id).padStart(3, "0")}</span>
                      </td>
                      <td>
                        <strong style={{ fontSize: "14px", color: "var(--cg-text-main)" }}>
                          {item.title}
                        </strong>
                        <div style={{ fontSize: "12px", color: "var(--cg-text-muted)" }}>
                          ⌖ {item.location || "Location not provided"}
                        </div>
                      </td>
                      <td>
                        <PriorityBadge priority={item.priority} />
                      </td>
                      <td>
                        <select
                          className="cg-select"
                          style={{ padding: "6px 10px", fontSize: "12px", minWidth: "170px" }}
                          value={item.department_id || ""}
                          onChange={(e) => handleDepartmentChange(item, e.target.value)}
                          disabled={busy}
                        >
                          <option value="">-- Unrouted --</option>
                          {departments
                            .filter((d) => d.is_active || d.id === item.department_id)
                            .map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name} {!d.is_active ? "(Inactive)" : ""}
                              </option>
                            ))}
                        </select>
                      </td>
                      <td>
                        <select
                          className="cg-select"
                          style={{ padding: "6px 10px", fontSize: "12px", minWidth: "150px" }}
                          value={item.assigned_officer_id || ""}
                          onChange={(e) => handleOfficerChange(item, e.target.value)}
                          disabled={busy || !item.department_id}
                        >
                          <option value="">-- Unassigned --</option>
                          {deptOfficers.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <select
                            className="cg-select"
                            style={{ padding: "6px 10px", fontSize: "12px", minWidth: "135px" }}
                            value={item.status}
                            onChange={(e) => promptStatusChange(item, e.target.value)}
                            disabled={busy}
                          >
                            {STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                          <StatusBadge status={item.status} />
                        </div>
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
            <span>Showing {visible.length} of {items.length} requests</span>
            <span>All department assignments live</span>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Admin Status Change */}
      <Modal
        open={statusModal.open}
        onClose={() => setStatusModal({ open: false, request: null, newStatus: "", note: "" })}
        title="Override Request Status"
        subtitle={`Update REQ-${String(statusModal.request?.id || "").padStart(3, "0")} to ${statusModal.newStatus}`}
      >
        <form onSubmit={confirmStatusChange} className="cg-form-stack">
          <div className="cg-form-field">
            <label className="cg-field-label" htmlFor="admin-status-note">
              Administrative Audit Note <span className="cg-field-required">*</span>
            </label>
            <textarea
              id="admin-status-note"
              className="cg-textarea"
              rows={3}
              value={statusModal.note}
              onChange={(e) => setStatusModal({ ...statusModal, note: e.target.value })}
              placeholder="State the administrative reason or operational override..."
              required
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
            <Button
              variant="ghost"
              onClick={() => setStatusModal({ open: false, request: null, newStatus: "", note: "" })}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={busy}>
              Confirm Status Override
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
