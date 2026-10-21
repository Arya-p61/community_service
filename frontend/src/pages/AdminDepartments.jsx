import { useEffect, useState } from "react";
import {
  createDepartment,
  getDepartments,
  updateDepartment,
} from "../services/requestService";
import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Modal from "../components/ui/Modal";
import { Icon } from "../components/ui/Icons";

const emptyForm = { name: "", code: "", description: "" };

export default function AdminDepartments() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deactivateModal, setDeactivateModal] = useState({ open: false, dept: null });

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getDepartments(true);
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setError("Unable to load departments list. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);

    try {
      await createDepartment({
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        description: form.description.trim() || undefined,
      });
      setForm(emptyForm);
      setCreateModalOpen(false);
      setMessage("New municipal department registered successfully.");
      await loadData();
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to create department.");
    } finally {
      setBusy(false);
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editing) return;
    setError("");
    setMessage("");
    setBusy(true);

    try {
      await updateDepartment(editing.id, {
        name: editing.name.trim(),
        code: editing.code.trim().toUpperCase(),
        description: editing.description?.trim() || "",
        is_active: editing.is_active,
      });
      setEditing(null);
      setMessage("Department updated successfully.");
      await loadData();
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to update department.");
    } finally {
      setBusy(false);
    }
  };

  const handleToggleActive = async (dept) => {
    setBusy(true);
    setError("");
    try {
      await updateDepartment(dept.id, { is_active: !dept.is_active });
      setMessage(
        `Department ${dept.name} ${!dept.is_active ? "activated" : "deactivated"} successfully.`
      );
      setDeactivateModal({ open: false, dept: null });
      await loadData();
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to change department active status.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cg-admin-departments-page">
      <PageHeader
        eyebrow="Municipal Organization"
        title="Departments Management"
        description="Establish and maintain controlled service routing units that handle citizen requests."
        actions={
          <Button
            variant="primary"
            size="md"
            icon={<Icon name="plus" size={16} />}
            onClick={() => {
              setError("");
              setMessage("");
              setCreateModalOpen(true);
            }}
          >
            Create Department
          </Button>
        }
      />

      {error && (
        <div className="cg-form-error" style={{ marginBottom: "20px" }}>
          <Icon name="alert-triangle" size={16} />
          <span>{error}</span>
        </div>
      )}

      {message && (
        <div className="cg-form-success" style={{ marginBottom: "20px" }}>
          <Icon name="check-circle" size={16} />
          <span>{message}</span>
        </div>
      )}

      {loading ? (
        <div className="cg-table-card">
          <div style={{ padding: "32px", display: "flex", flexDirection: "column", gap: "16px" }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="cg-skeleton" style={{ height: "54px" }} />
            ))}
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="cg-empty-state">
          <div className="cg-empty-icon">
            <Icon name="departments" size={28} />
          </div>
          <h3 className="cg-empty-title">No departments established</h3>
          <p className="cg-empty-description">
            Create your first department (e.g. Roads & Infrastructure, Sanitation, Public Works) to begin routing community service requests.
          </p>
          <Button variant="primary" onClick={() => setCreateModalOpen(true)}>
            Create Department
          </Button>
        </div>
      ) : (
        <div className="cg-table-card">
          <div className="cg-table-responsive">
            <table className="cg-table">
              <thead>
                <tr>
                  <th style={{ width: "90px" }}>Code</th>
                  <th>Department Name</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((dept) => (
                  <tr key={dept.id}>
                    <td>
                      <span
                        className="cg-badge"
                        style={{
                          backgroundColor: "#EEF4FF",
                          color: "#2C5282",
                          border: "1px solid #C3DAFE",
                          fontFamily: "monospace",
                          fontWeight: 700,
                        }}
                      >
                        {dept.code}
                      </span>
                    </td>
                    <td>
                      <strong style={{ fontSize: "14px", color: "var(--cg-text-main)" }}>
                        {dept.name}
                      </strong>
                    </td>
                    <td>
                      <span style={{ fontSize: "13px", color: "var(--cg-text-secondary)" }}>
                        {dept.description || "—"}
                      </span>
                    </td>
                    <td>
                      {dept.is_active ? (
                        <span
                          className="cg-badge"
                          style={{
                            backgroundColor: "#E6F4EA",
                            color: "#2F855A",
                            border: "1px solid #BCE5C8",
                          }}
                        >
                          <span className="cg-badge-dot" style={{ backgroundColor: "#38A169" }} />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span
                          className="cg-badge"
                          style={{
                            backgroundColor: "#F5F7F4",
                            color: "#8E9C96",
                            border: "1px solid #DCE4D9",
                          }}
                        >
                          <span className="cg-badge-dot" style={{ backgroundColor: "#A0AEC0" }} />
                          <span>Inactive</span>
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "8px" }}>
                        <Button
                          variant="outline"
                          size="sm"
                          icon={<Icon name="edit" size={13} />}
                          onClick={() => setEditing(dept)}
                        >
                          Edit
                        </Button>
                        {dept.is_active ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            style={{ color: "var(--cg-error)" }}
                            onClick={() => setDeactivateModal({ open: true, dept })}
                          >
                            Deactivate
                          </Button>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleToggleActive(dept)}
                          >
                            Activate
                          </Button>
                        )}
                      </div>
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
            <span>Total: {items.length} departments</span>
            <span>Active: {items.filter((d) => d.is_active).length}</span>
          </div>
        </div>
      )}

      {/* Create Department Modal */}
      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create Municipal Department"
        subtitle="Establish a new destination for citizen requests and officer assignment"
      >
        <form onSubmit={handleCreate} className="cg-form-stack">
          <div className="cg-form-row">
            <div className="cg-form-field">
              <label className="cg-field-label" htmlFor="dept-name">
                Department Name <span className="cg-field-required">*</span>
              </label>
              <input
                id="dept-name"
                type="text"
                className="cg-input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Sanitation & Waste"
                required
              />
            </div>
            <div className="cg-form-field">
              <label className="cg-field-label" htmlFor="dept-code">
                Routing Code <span className="cg-field-required">*</span>
              </label>
              <input
                id="dept-code"
                type="text"
                className="cg-input"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="e.g. SAN"
                maxLength={10}
                required
              />
            </div>
          </div>

          <div className="cg-form-field">
            <label className="cg-field-label" htmlFor="dept-desc">
              Description / Responsibilities
            </label>
            <textarea
              id="dept-desc"
              className="cg-textarea"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Primary areas of civic maintenance and field response handled by this unit..."
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
            <Button variant="ghost" onClick={() => setCreateModalOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={busy}>
              Create Department
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Department Modal */}
      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Edit Department"
        subtitle={`Update details for ${editing?.name}`}
      >
        {editing && (
          <form onSubmit={handleSaveEdit} className="cg-form-stack">
            <div className="cg-form-row">
              <div className="cg-form-field">
                <label className="cg-field-label" htmlFor="edit-dept-name">
                  Department Name <span className="cg-field-required">*</span>
                </label>
                <input
                  id="edit-dept-name"
                  type="text"
                  className="cg-input"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  required
                />
              </div>
              <div className="cg-form-field">
                <label className="cg-field-label" htmlFor="edit-dept-code">
                  Routing Code <span className="cg-field-required">*</span>
                </label>
                <input
                  id="edit-dept-code"
                  type="text"
                  className="cg-input"
                  value={editing.code}
                  onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase() })}
                  maxLength={10}
                  required
                />
              </div>
            </div>

            <div className="cg-form-field">
              <label className="cg-field-label" htmlFor="edit-dept-desc">
                Description / Responsibilities
              </label>
              <textarea
                id="edit-dept-desc"
                className="cg-textarea"
                rows={3}
                value={editing.description || ""}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
              <Button variant="ghost" onClick={() => setEditing(null)} disabled={busy}>
                Discard
              </Button>
              <Button type="submit" variant="primary" loading={busy}>
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Deactivate Confirmation Modal */}
      <Modal
        open={deactivateModal.open}
        onClose={() => setDeactivateModal({ open: false, dept: null })}
        title="Deactivate Department?"
        subtitle={`Deactivate ${deactivateModal.dept?.name}`}
      >
        <p style={{ fontSize: "14px", color: "var(--cg-text-secondary)", lineHeight: "1.6", marginBottom: "20px" }}>
          Deactivating <strong>"{deactivateModal.dept?.name}"</strong> will prevent citizens and admins from assigning new service requests to this department. Existing requests remain archived.
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <Button
            variant="ghost"
            onClick={() => setDeactivateModal({ open: false, dept: null })}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={busy}
            onClick={() => handleToggleActive(deactivateModal.dept)}
          >
            Yes, Deactivate
          </Button>
        </div>
      </Modal>
    </div>
  );
}
