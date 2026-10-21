import { useEffect, useState } from "react";
import {
  createOfficer,
  getAdminOfficers,
  getDepartments,
  updateOfficer,
} from "../services/requestService";
import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Modal from "../components/ui/Modal";
import { Icon } from "../components/ui/Icons";

const emptyForm = { name: "", email: "", password: "", department_id: "" };

export default function AdminOfficers() {
  const [officers, setOfficers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [staffData, deptsData] = await Promise.all([
        getAdminOfficers(),
        getDepartments(false),
      ]);
      setOfficers(Array.isArray(staffData) ? staffData : []);
      setDepartments(Array.isArray(deptsData) ? deptsData : []);
    } catch {
      setError("Unable to load officer management data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateOfficer = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!form.department_id) {
      return setError("Please select an active department for this officer.");
    }
    if (form.password.length < 8) {
      return setError("Password must be at least 8 characters long.");
    }

    setBusy(true);
    try {
      await createOfficer({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        department_id: Number(form.department_id),
      });
      setForm(emptyForm);
      setCreateModalOpen(false);
      setMessage("New municipal officer account provisioned successfully.");
      await loadData();
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to create officer account.");
    } finally {
      setBusy(false);
    }
  };

  const handleDepartmentReassignment = async (officerId, newDepartmentId) => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await updateOfficer(officerId, {
        department_id: Number(newDepartmentId),
      });
      setMessage("Officer department updated successfully.");
      await loadData();
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to update officer department.");
    } finally {
      setBusy(false);
    }
  };

  const handleToggleOfficerStatus = async (officer) => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await updateOfficer(officer.id, {
        is_active: !officer.is_active,
      });
      setMessage(
        `Officer ${officer.name} ${!officer.is_active ? "activated" : "deactivated"} successfully.`
      );
      await loadData();
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to update officer status.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cg-admin-officers-page">
      <PageHeader
        eyebrow="Municipal Personnel"
        title="Officers Directory"
        description="Provision service accounts, assign field officers to active departments, and manage operational permissions."
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
            Provision Officer
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
      ) : officers.length === 0 ? (
        <div className="cg-empty-state">
          <div className="cg-empty-icon">
            <Icon name="officers" size={28} />
          </div>
          <h3 className="cg-empty-title">No officers registered</h3>
          <p className="cg-empty-description">
            Provision officer accounts to assign them to departments and route incoming citizen service requests.
          </p>
          <Button variant="primary" onClick={() => setCreateModalOpen(true)}>
            Provision First Officer
          </Button>
        </div>
      ) : (
        <div className="cg-table-card">
          <div className="cg-table-responsive">
            <table className="cg-table">
              <thead>
                <tr>
                  <th>Officer Name</th>
                  <th>Contact Email</th>
                  <th>Department Assignment</th>
                  <th>Account Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {officers.map((officer) => (
                  <tr key={officer.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div
                          className="cg-user-avatar"
                          style={{
                            width: "32px",
                            height: "32px",
                            fontSize: "13px",
                          }}
                        >
                          {officer.name.charAt(0).toUpperCase()}
                        </div>
                        <strong style={{ fontSize: "14px", color: "var(--cg-text-main)" }}>
                          {officer.name}
                        </strong>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: "13px", color: "var(--cg-text-secondary)" }}>
                        {officer.email}
                      </span>
                    </td>
                    <td>
                      <select
                        className="cg-select"
                        style={{ padding: "6px 10px", fontSize: "12px", minWidth: "170px" }}
                        value={officer.department_id || ""}
                        onChange={(e) => handleDepartmentReassignment(officer.id, e.target.value)}
                        disabled={busy}
                      >
                        <option value="" disabled>Select Department</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      {officer.is_active ? (
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
                            backgroundColor: "#FEEBEB",
                            color: "#C2413B",
                            border: "1px solid #FED7D7",
                          }}
                        >
                          <span className="cg-badge-dot" style={{ backgroundColor: "#E53E3E" }} />
                          <span>Inactive</span>
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <Button
                        variant={officer.is_active ? "ghost" : "secondary"}
                        size="sm"
                        style={officer.is_active ? { color: "var(--cg-error)" } : undefined}
                        onClick={() => handleToggleOfficerStatus(officer)}
                        disabled={busy}
                      >
                        {officer.is_active ? "Deactivate" : "Activate"}
                      </Button>
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
            <span>Total Officers: {officers.length}</span>
            <span>Active Officers: {officers.filter((o) => o.is_active).length}</span>
          </div>
        </div>
      )}

      {/* Provision Officer Modal */}
      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Provision Municipal Officer"
        subtitle="Create an authorized field officer account and assign them to a department"
      >
        <form onSubmit={handleCreateOfficer} className="cg-form-stack">
          <div className="cg-form-field">
            <label className="cg-field-label" htmlFor="officer-name">
              Full Name <span className="cg-field-required">*</span>
            </label>
            <input
              id="officer-name"
              type="text"
              className="cg-input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Officer Alex Rivera"
              required
            />
          </div>

          <div className="cg-form-row">
            <div className="cg-form-field">
              <label className="cg-field-label" htmlFor="officer-email">
                Official Email <span className="cg-field-required">*</span>
              </label>
              <input
                id="officer-email"
                type="email"
                className="cg-input"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="officer@city.gov"
                required
              />
            </div>

            <div className="cg-form-field">
              <label className="cg-field-label" htmlFor="officer-department">
                Department Assignment <span className="cg-field-required">*</span>
              </label>
              <select
                id="officer-department"
                className="cg-select"
                value={form.department_id}
                onChange={(e) => setForm({ ...form, department_id: e.target.value })}
                required
              >
                <option value="">Select Department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="cg-form-field">
            <label className="cg-field-label" htmlFor="officer-password">
              Initial Password <span className="cg-field-required">*</span>
              <span className="cg-field-hint">Minimum 8 characters</span>
            </label>
            <div className="cg-input-with-icon">
              <input
                id="officer-password"
                type={showPassword ? "text" : "password"}
                className="cg-input"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Temporary secure password"
                minLength={8}
                required
              />
              <button
                type="button"
                className="cg-input-icon-right-btn"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <Icon name={showPassword ? "eye-off" : "eye"} size={16} />
              </button>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
            <Button variant="ghost" onClick={() => setCreateModalOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={busy}>
              Provision Officer
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
