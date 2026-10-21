import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { StatusBadge, PriorityBadge } from "../components/ui/Badge";
import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Modal from "../components/ui/Modal";
import { Icon } from "../components/ui/Icons";
import RequestLocationPreview from "../components/map/RequestLocationPreview";
import {
  addOfficerNote,
  claimOfficerRequest,
  getOfficerHistory,
  getOfficerNotes,
  getOfficerRequest,
  unclaimOfficerRequest,
  updateRequestStatus,
} from "../services/requestService";

const mediaUrl = (url) => {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  const base = (import.meta.env.VITE_API_URL || "http://localhost:8000/api").replace(/\/api\/?$/, "");
  return `${base}${url}`;
};

const formatDate = (date) => {
  if (!date) return "Not specified";
  return new Date(date).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function OfficerRequestDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [request, setRequest] = useState(null);
  const [notes, setNotes] = useState([]);
  const [history, setHistory] = useState([]);

  const [newNote, setNewNote] = useState("");
  const [statusAction, setStatusAction] = useState(""); // "RESOLVED" or "CLOSED"
  const [statusNote, setStatusNote] = useState("");

  const [unclaimModalOpen, setUnclaimModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadData = async () => {
    try {
      const [item, requestNotes, requestHistory] = await Promise.all([
        getOfficerRequest(id),
        getOfficerNotes(id),
        getOfficerHistory(id),
      ]);
      setRequest(item);
      setNotes(Array.isArray(requestNotes) ? requestNotes : []);
      setHistory(Array.isArray(requestHistory) ? requestHistory : []);
      setError("");
    } catch (err) {
      setError(
        err.response?.data?.detail || "This service request is not accessible in your department."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const runAction = async (actionFn) => {
    setBusy(true);
    setError("");
    try {
      await actionFn();
      await loadData();
    } catch (err) {
      setError(err.response?.data?.detail || "The workflow action could not be completed.");
    } finally {
      setBusy(false);
    }
  };

  const handleClaim = () => {
    runAction(() => claimOfficerRequest(id));
  };

  const handleStartWork = () => {
    runAction(() => updateRequestStatus(id, "IN_PROGRESS", "Work started by officer."));
  };

  const handleUnclaim = () => {
    runAction(async () => {
      await unclaimOfficerRequest(id);
      setUnclaimModalOpen(false);
    });
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    await runAction(async () => {
      await addOfficerNote(id, newNote.trim());
      setNewNote("");
    });
  };

  const handleStatusTransition = async (e) => {
    e.preventDefault();
    if (!statusNote.trim()) return;
    await runAction(async () => {
      await updateRequestStatus(id, statusAction, statusNote.trim());
      setStatusModalOpen(false);
      setStatusAction("");
      setStatusNote("");
    });
  };

  const openStatusModal = (action) => {
    setStatusAction(action);
    setStatusNote("");
    setStatusModalOpen(true);
  };

  if (loading) {
    return (
      <div style={{ padding: "40px 0" }}>
        <div className="cg-skeleton" style={{ height: "40px", width: "240px", marginBottom: "20px" }} />
        <div className="cg-skeleton" style={{ height: "260px", marginBottom: "20px" }} />
        <div className="cg-skeleton" style={{ height: "180px" }} />
      </div>
    );
  }

  if (error && !request) {
    return (
      <div className="cg-empty-state">
        <div className="cg-empty-icon" style={{ background: "#FEEBEB", color: "var(--cg-error)" }}>
          <Icon name="alert-triangle" size={26} />
        </div>
        <h3 className="cg-empty-title">Request Not Found</h3>
        <p className="cg-empty-description">{error}</p>
        <Link to="/officer/requests" className="cg-btn cg-btn-primary">
          Back to Department Queue
        </Link>
      </div>
    );
  }

  const assignedToMe = request.assigned_officer_id === user?.id;
  const isUnassigned = !request.assigned_officer_id;
  const assignedToOther = request.assigned_officer_id && !assignedToMe;
  const isAdmin = user?.role === "admin";

  return (
    <div className="cg-officer-detail-page">
      <PageHeader
        backTo={isAdmin ? "/admin/requests" : "/officer/requests"}
        backLabel={isAdmin ? "Back to All Requests" : "Back to Department Queue"}
        eyebrow={`REQ-${String(request.id).padStart(3, "0")} • ${request.department_name || "Department"}`}
        title={request.title}
        description={request.location ? `Location: ${request.location}` : "Department workflow record"}
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <StatusBadge status={request.status} />

            {/* Workflow Action Bar */}
            {request.status === "CLOSED" ? (
              <span className="cg-badge" style={{ background: "#EDF2F0", color: "#4A5A53" }}>
                Request Closed
              </span>
            ) : isUnassigned ? (
              <Button
                variant="primary"
                size="md"
                loading={busy}
                onClick={handleClaim}
                icon={<Icon name="check" size={15} />}
              >
                Claim This Request
              </Button>
            ) : assignedToMe ? (
              <>
                {request.status === "PENDING" && (
                  <Button
                    variant="primary"
                    size="md"
                    loading={busy}
                    onClick={handleStartWork}
                  >
                    Start Work
                  </Button>
                )}
                {request.status === "IN_PROGRESS" && (
                  <Button
                    variant="primary"
                    size="md"
                    loading={busy}
                    onClick={() => openStatusModal("RESOLVED")}
                    icon={<Icon name="check-circle" size={15} />}
                  >
                    Mark as Resolved
                  </Button>
                )}
                {request.status === "RESOLVED" && (
                  <Button
                    variant="primary"
                    size="md"
                    loading={busy}
                    onClick={() => openStatusModal("CLOSED")}
                    icon={<Icon name="shield" size={15} />}
                  >
                    Close Request
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="md"
                  loading={busy}
                  onClick={() => setUnclaimModalOpen(true)}
                >
                  Unclaim
                </Button>
              </>
            ) : (
              <span className="cg-badge" style={{ background: "#F5F7F4", color: "var(--cg-text-secondary)" }}>
                Assigned to {request.assigned_officer_name || "another officer"}
              </span>
            )}
          </div>
        }
      />

      {error && (
        <div className="cg-form-error" style={{ marginBottom: "20px" }}>
          <Icon name="alert-triangle" size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Main 2-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: "28px", alignItems: "start" }}>
        {/* Left column: Request content, Evidence, Internal Notes */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Citizen Submission Card */}
          <Card title="Citizen Report" subtitle="Submitted community issue details">
            <p style={{ fontSize: "15px", lineHeight: "1.7", color: "var(--cg-text-main)", whiteSpace: "pre-wrap", marginBottom: "20px" }}>
              {request.description}
            </p>

            {request.image && (
              <div style={{ marginBottom: "24px" }}>
                <span className="cg-field-label" style={{ marginBottom: "8px" }}>Submitted Photo Evidence</span>
                <div
                  style={{
                    position: "relative",
                    borderRadius: "var(--radius-md)",
                    overflow: "hidden",
                    border: "1px solid var(--cg-border)",
                    cursor: "pointer",
                    maxWidth: "520px",
                  }}
                  onClick={() => setImageModalOpen(true)}
                  title="Click to view full photo"
                >
                  <img
                    src={mediaUrl(request.image)}
                    alt="Submitted issue evidence"
                    style={{ width: "100%", maxHeight: "320px", objectFit: "cover", display: "block" }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      bottom: "10px",
                      right: "10px",
                      background: "rgba(0, 0, 0, 0.7)",
                      color: "#FFFFFF",
                      borderRadius: "var(--radius-sm)",
                      padding: "4px 8px",
                      fontSize: "11px",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Icon name="search" size={12} />
                    <span>Expand</span>
                  </div>
                </div>
              </div>
            )}

            <div
              style={{
                borderTop: "1px solid var(--cg-border-light)",
                paddingTop: "18px",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "14px 20px",
                fontSize: "13px",
              }}
            >
              <div>
                <span className="cg-text-muted" style={{ display: "block", marginBottom: "3px" }}>Location</span>
                <strong>{request.location || "Not specified"}</strong>
              </div>
              <div>
                <span className="cg-text-muted" style={{ display: "block", marginBottom: "3px" }}>GPS Coordinates</span>
                <strong>
                  {request.latitude != null && request.longitude != null
                    ? `${request.latitude}, ${request.longitude}`
                    : "Not specified"}
                </strong>
              </div>
              <div>
                <span className="cg-text-muted" style={{ display: "block", marginBottom: "3px" }}>Submitted At</span>
                <strong>{formatDate(request.created_at)}</strong>
              </div>
              <div>
                <span className="cg-text-muted" style={{ display: "block", marginBottom: "3px" }}>Last Update</span>
                <strong>{formatDate(request.updated_at || request.created_at)}</strong>
              </div>
            </div>

            {request.latitude != null && request.longitude != null && (
              <div style={{ marginTop: "18px", paddingTop: "18px", borderTop: "1px solid var(--cg-border-light)" }}>
                <span className="cg-text-muted" style={{ display: "block", marginBottom: "8px", fontSize: "12px", fontWeight: 600, textTransform: "uppercase" }}>
                  Issue Geographic Pin
                </span>
                <RequestLocationPreview
                  latitude={request.latitude}
                  longitude={request.longitude}
                  location={request.location}
                  status={request.status}
                  title={request.title}
                />
              </div>
            )}
          </Card>

          {/* Internal Notes (Officer Only) */}
          <Card
            title="Internal Department Notes"
            subtitle="Confidential operational notes visible only to departmental staff"
            eyebrow="Staff Only"
          >
            {notes.length === 0 ? (
              <p className="cg-text-muted" style={{ fontSize: "13px", padding: "12px 0" }}>
                No internal notes recorded yet for this request.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
                {notes.map((n) => (
                  <div
                    key={n.id}
                    style={{
                      padding: "12px 14px",
                      background: "#F8FAF7",
                      border: "1px solid var(--cg-border)",
                      borderRadius: "var(--radius-md)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px", fontSize: "11px" }}>
                      <span style={{ fontWeight: 700, color: "var(--cg-primary-green)" }}>Department Officer</span>
                      <span className="cg-text-muted">{formatDate(n.created_at)}</span>
                    </div>
                    <p style={{ fontSize: "13px", color: "var(--cg-text-main)", lineHeight: "1.5" }}>
                      {n.note}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {assignedToMe && request.status !== "CLOSED" && (
              <form onSubmit={handleAddNote} style={{ borderTop: "1px solid var(--cg-border-light)", paddingTop: "16px" }}>
                <div className="cg-form-field">
                  <label className="cg-field-label" htmlFor="officer-note-input">
                    Add Internal Note
                  </label>
                  <textarea
                    id="officer-note-input"
                    className="cg-textarea"
                    rows={3}
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Enter inspection findings, work orders, contractor details, or internal memos..."
                    required
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
                  <Button type="submit" variant="primary" size="sm" loading={busy} disabled={!newNote.trim()}>
                    Save Internal Note
                  </Button>
                </div>
              </form>
            )}
          </Card>

          {/* Status History Timeline */}
          <Card title="Status Transition History" subtitle="Audit log of state changes">
            {history.length === 0 ? (
              <p className="cg-text-muted" style={{ fontSize: "13px" }}>No history recorded.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px", paddingLeft: "12px", borderLeft: "2px solid var(--cg-border)" }}>
                {history.map((item) => (
                  <div key={item.id} style={{ position: "relative", paddingLeft: "16px" }}>
                    <div
                      style={{
                        position: "absolute",
                        left: "-21px",
                        top: "4px",
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        backgroundColor: "var(--cg-primary-green)",
                        border: "2px solid var(--cg-white)",
                      }}
                    />
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <StatusBadge status={item.new_status} />
                      <span style={{ fontSize: "12px", color: "var(--cg-text-muted)" }}>
                        {formatDate(item.created_at)}
                      </span>
                    </div>
                    {item.note && (
                      <p style={{ fontSize: "13px", color: "var(--cg-text-secondary)", marginTop: "4px" }}>
                        {item.note}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right column: Routing & AI Intelligence */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Assignment Status Card */}
          <Card title="Assignment & Routing" eyebrow="Workflow Status">
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", fontSize: "14px" }}>
              <div>
                <span className="cg-text-muted" style={{ fontSize: "12px", display: "block", marginBottom: "3px" }}>
                  Department
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Icon name="departments" size={17} style={{ color: "var(--cg-primary-green)" }} />
                  <strong>{request.department_name || "Unassigned"}</strong>
                </div>
              </div>

              <div style={{ borderTop: "1px solid var(--cg-border-light)", paddingTop: "12px" }}>
                <span className="cg-text-muted" style={{ fontSize: "12px", display: "block", marginBottom: "3px" }}>
                  Assigned Officer
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Icon name="user" size={17} style={{ color: "var(--cg-text-secondary)" }} />
                  <strong>
                    {request.assigned_officer_name ? (
                      assignedToMe ? (
                        <span style={{ color: "var(--cg-primary-green)" }}>{request.assigned_officer_name} (You)</span>
                      ) : (
                        request.assigned_officer_name
                      )
                    ) : (
                      <span style={{ color: "var(--cg-warning)" }}>Unassigned</span>
                    )}
                  </strong>
                </div>
              </div>
            </div>
          </Card>

          {/* AI Intelligence Card */}
          <Card title="AI Classification Insights" eyebrow="Automated Intelligence">
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", fontSize: "13px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div style={{ background: "#F8FAF7", padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--cg-border)" }}>
                  <span className="cg-text-muted" style={{ fontSize: "11px", textTransform: "uppercase", fontWeight: 700 }}>
                    AI Category
                  </span>
                  <strong style={{ display: "block", marginTop: "2px", color: "var(--cg-text-main)" }}>
                    {request.category || "Pending"}
                  </strong>
                </div>

                <div style={{ background: "#F8FAF7", padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--cg-border)" }}>
                  <span className="cg-text-muted" style={{ fontSize: "11px", textTransform: "uppercase", fontWeight: 700 }}>
                    AI Urgency
                  </span>
                  <div style={{ marginTop: "2px" }}>
                    <PriorityBadge priority={request.priority} />
                  </div>
                </div>
              </div>

              {request.ai_summary && (
                <div>
                  <span className="cg-text-muted" style={{ fontSize: "11px", textTransform: "uppercase", fontWeight: 700 }}>
                    AI Summary
                  </span>
                  <p style={{ marginTop: "3px", color: "var(--cg-text-main)", lineHeight: "1.5" }}>
                    {request.ai_summary}
                  </p>
                </div>
              )}

              {request.suggested_action && (
                <div>
                  <span className="cg-text-muted" style={{ fontSize: "11px", textTransform: "uppercase", fontWeight: 700 }}>
                    Suggested Resolution Action
                  </span>
                  <p style={{ marginTop: "3px", color: "var(--cg-text-main)", lineHeight: "1.5" }}>
                    {request.suggested_action}
                  </p>
                </div>
              )}

              {request.confidence != null && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--cg-border-light)", paddingTop: "8px" }}>
                  <span className="cg-text-muted">Model Confidence</span>
                  <strong>{Math.round(request.confidence * 100)}%</strong>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Unclaim Confirmation Modal */}
      <Modal
        open={unclaimModalOpen}
        onClose={() => setUnclaimModalOpen(false)}
        title="Unclaim Service Request?"
        subtitle="This request will be returned to the general unassigned department queue."
      >
        <p style={{ fontSize: "14px", color: "var(--cg-text-secondary)", lineHeight: "1.6", marginBottom: "20px" }}>
          Are you sure you want to release your assignment for <strong>"{request.title}"</strong>? Any active work should be noted before returning it to the queue.
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <Button variant="ghost" onClick={() => setUnclaimModalOpen(false)} disabled={busy}>
            Keep Assignment
          </Button>
          <Button variant="danger" loading={busy} onClick={handleUnclaim}>
            Yes, Unclaim Request
          </Button>
        </div>
      </Modal>

      {/* Status Transition Modal (Resolved / Closed) */}
      <Modal
        open={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title={statusAction === "RESOLVED" ? "Mark Request as Resolved" : "Close Service Request"}
        subtitle="Please provide a mandatory resolution note detailing the actions taken."
      >
        <form onSubmit={handleStatusTransition} className="cg-form-stack">
          <div className="cg-form-field">
            <label className="cg-field-label" htmlFor="status-note-field">
              {statusAction === "RESOLVED" ? "Resolution Note" : "Closure Note"} <span className="cg-field-required">*</span>
            </label>
            <textarea
              id="status-note-field"
              className="cg-textarea"
              rows={4}
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              placeholder={
                statusAction === "RESOLVED"
                  ? "Describe the completed repairs, field visit findings, or corrective actions taken..."
                  : "State the reason for closing and archiving this resolved service request..."
              }
              required
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
            <Button variant="ghost" onClick={() => setStatusModalOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={busy}
              disabled={!statusNote.trim()}
            >
              Confirm {statusAction === "RESOLVED" ? "Resolution" : "Closure"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Evidence Fullscreen Modal */}
      <Modal
        open={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        title="Citizen Submitted Evidence"
        subtitle={`REQ-${String(request.id).padStart(3, "0")} — ${request.title}`}
        maxWidth="720px"
      >
        {request.image && (
          <img
            src={mediaUrl(request.image)}
            alt="Submitted evidence"
            style={{ width: "100%", maxHeight: "75vh", objectFit: "contain", borderRadius: "8px" }}
          />
        )}
      </Modal>
    </div>
  );
}
