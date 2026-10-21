import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { StatusBadge, PriorityBadge } from "../components/ui/Badge";
import RequestStatusTimeline from "../components/RequestStatusTimeline";
import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Modal from "../components/ui/Modal";
import StarRating from "../components/ui/StarRating";
import { Icon } from "../components/ui/Icons";
import RequestLocationPreview from "../components/map/RequestLocationPreview";
import LocationPickerMap from "../components/map/LocationPickerMap";
import {
  classifyRequest,
  deleteRequest,
  getClassification,
  getRequestById,
  getRequestFeedback,
  getRequestStatusHistory,
  submitRequestFeedback,
  updateRequest,
  updateRequestFeedback,
} from "../services/requestService";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const formatDate = (date) => {
  if (!date) return "Not specified";
  return new Date(date).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const mediaUrl = (url) => {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  const base = (import.meta.env.VITE_API_URL || "http://localhost:8000/api").replace(/\/api\/?$/, "");
  return `${base}${url}`;
};

export default function RequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [request, setRequest] = useState(null);
  const [form, setForm] = useState({});
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [classification, setClassification] = useState(null);
  const [history, setHistory] = useState([]);

  // Feedback state
  const [feedback, setFeedback] = useState(null);
  const [feedbackLoading, setFeedbackLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");
  const [feedbackSuccess, setFeedbackSuccess] = useState("");
  const [editFeedbackModal, setEditFeedbackModal] = useState(false);

  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [aiLoading, setAiLoading] = useState(true);
  const [aiError, setAiError] = useState("");
  const [aiBusy, setAiBusy] = useState(false);

  const [editing, setEditing] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [imageModalOpen, setImageModalOpen] = useState(false);

  const loadData = async () => {
    try {
      const data = await getRequestById(id);
      setRequest(data);
      setForm(data);

      try {
        const aiData = await getClassification(id);
        setClassification(aiData);
      } catch (err) {
        if (err.response?.status !== 404) {
          setAiError("Unable to load the AI classification.");
        }
      } finally {
        setAiLoading(false);
      }

      try {
        const histData = await getRequestStatusHistory(id);
        setHistory(Array.isArray(histData) ? histData : []);
      } catch {
        setHistoryError("Could not retrieve status history.");
      } finally {
        setHistoryLoading(false);
      }

      // Check feedback
      try {
        const fbData = await getRequestFeedback(id);
        setFeedback(fbData);
        setRating(fbData.rating);
        setComment(fbData.comment || "");
      } catch {
        setFeedback(null);
      } finally {
        setFeedbackLoading(false);
      }
    } catch {
      setError("This service request could not be found or is not accessible.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const editable = request && ["SUBMITTED", "PENDING"].includes(request.status);
  const isEligibleForFeedback = request && ["RESOLVED", "CLOSED"].includes(request.status);

  const handleBeginEdit = () => {
    setImage(null);
    setImagePreview(request.image ? mediaUrl(request.image) : "");
    setEditing(true);
  };

  const handleSelectImage = (event) => {
    const file = event.target.files?.[0] || null;
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) return setError("File must be JPG, PNG, or WEBP.");
    if (file.size > MAX_IMAGE_SIZE) return setError("Image must be 5 MB or smaller.");
    setError("");
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSaveEdit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");

    if (form.latitude !== "" && form.latitude !== null && form.latitude !== undefined) {
      const latNum = parseFloat(form.latitude);
      if (isNaN(latNum) || latNum < -90 || latNum > 90) {
        setBusy(false);
        return setError("Latitude must be a valid number between -90 and 90 degrees.");
      }
    }

    if (form.longitude !== "" && form.longitude !== null && form.longitude !== undefined) {
      const lngNum = parseFloat(form.longitude);
      if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
        setBusy(false);
        return setError("Longitude must be a valid number between -180 and 180 degrees.");
      }
    }

    const payload = new FormData();
    ["title", "description", "location", "latitude", "longitude"].forEach((k) => {
      if (form[k] !== undefined && form[k] !== null && form[k] !== "") payload.append(k, form[k]);
    });
    if (image) payload.append("image", image);

    try {
      const updated = await updateRequest(id, payload);
      setRequest(updated);
      setForm(updated);
      setEditing(false);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to update service request.");
    } finally {
      setBusy(false);
    }
  };

  const handleCancelRequest = async () => {
    setBusy(true);
    try {
      await deleteRequest(id);
      navigate("/citizen/requests");
    } catch (err) {
      setError(err.response?.data?.detail || "This request could not be cancelled.");
      setCancelModalOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const handleRunAiClassification = async () => {
    setAiBusy(true);
    setAiError("");
    try {
      const result = await classifyRequest(id);
      setClassification(result);
    } catch (err) {
      setAiError(err.response?.data?.detail || "AI analysis failed. Please try again.");
    } finally {
      setAiBusy(false);
    }
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    setFeedbackError("");
    setFeedbackSuccess("");

    if (!rating || rating < 1 || rating > 5) {
      return setFeedbackError("Please select a star rating from 1 to 5.");
    }

    setFeedbackBusy(true);
    try {
      const created = await submitRequestFeedback(id, {
        rating,
        comment: comment.trim() || undefined,
      });
      setFeedback(created);
      setFeedbackSuccess("Thank you! Your feedback has been recorded.");
    } catch (err) {
      setFeedbackError(err.response?.data?.detail || "Could not submit feedback. Please try again.");
    } finally {
      setFeedbackBusy(false);
    }
  };

  const handleUpdateFeedback = async (e) => {
    e.preventDefault();
    setFeedbackError("");
    setFeedbackBusy(true);

    try {
      const updated = await updateRequestFeedback(id, {
        rating,
        comment: comment.trim() || "",
      });
      setFeedback(updated);
      setEditFeedbackModal(false);
      setFeedbackSuccess("Your feedback has been updated.");
    } catch (err) {
      setFeedbackError(err.response?.data?.detail || "Could not update feedback.");
    } finally {
      setFeedbackBusy(false);
    }
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
        <Link to="/citizen/requests" className="cg-btn cg-btn-primary">
          Back to My Requests
        </Link>
      </div>
    );
  }

  return (
    <div className="cg-request-detail-page">
      <PageHeader
        backTo="/citizen/requests"
        backLabel="Back to My Requests"
        eyebrow={`Request REQ-${String(request.id).padStart(3, "0")}`}
        title={request.title}
        description={request.location ? `Location: ${request.location}` : "Community service request"}
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <StatusBadge status={request.status} />
            {editable && (
              <>
                <Button
                  variant="outline"
                  size="md"
                  icon={<Icon name="edit" size={15} />}
                  onClick={handleBeginEdit}
                >
                  Edit
                </Button>
                <Button
                  variant="danger"
                  size="md"
                  icon={<Icon name="trash" size={15} />}
                  onClick={() => setCancelModalOpen(true)}
                >
                  Cancel Request
                </Button>
              </>
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

      {/* Main Details Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: "28px", alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Issue Overview Card */}
          <Card title="Issue Overview" subtitle="Submitted details and evidence">
            <p style={{ fontSize: "15px", lineHeight: "1.7", color: "var(--cg-text-main)", whiteSpace: "pre-wrap", marginBottom: "24px" }}>
              {request.description}
            </p>

            {request.image && (
              <div style={{ marginBottom: "24px" }}>
                <span className="cg-field-label" style={{ marginBottom: "8px" }}>Photo Evidence</span>
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
                  title="Click to view full size"
                >
                  <img
                    src={mediaUrl(request.image)}
                    alt="Submitted community issue evidence"
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

            {/* Metadata Table */}
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
                <span className="cg-text-muted" style={{ display: "block", marginBottom: "3px" }}>Location Address</span>
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
                <span className="cg-text-muted" style={{ display: "block", marginBottom: "3px" }}>Date Submitted</span>
                <strong>{formatDate(request.created_at)}</strong>
              </div>
              <div>
                <span className="cg-text-muted" style={{ display: "block", marginBottom: "3px" }}>Last Activity</span>
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

          {/* Status Progression and History */}
          <RequestStatusTimeline
            history={history}
            currentStatus={request.status}
            loading={historyLoading}
            error={historyError}
          />

          {/* Module 7: Citizen Feedback & Rating Section */}
          {isEligibleForFeedback && (
            <Card
              title={feedback ? "Your Community Feedback" : "How was your experience?"}
              eyebrow="Citizen Evaluation"
              subtitle={
                feedback
                  ? "Your rating helps municipal teams evaluate resolution quality"
                  : "Help improve local services by rating the speed and quality of this resolution"
              }
            >
              {feedbackSuccess && (
                <div className="cg-form-success" style={{ marginBottom: "16px" }}>
                  <Icon name="check-circle" size={16} />
                  <span>{feedbackSuccess}</span>
                </div>
              )}

              {feedbackError && (
                <div className="cg-form-error" style={{ marginBottom: "16px" }}>
                  <Icon name="alert-triangle" size={16} />
                  <span>{feedbackError}</span>
                </div>
              )}

              {feedbackLoading ? (
                <div style={{ padding: "16px 0", color: "var(--cg-text-secondary)", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span className="cg-spinner cg-spinner-sm" />
                  <span>Checking feedback status...</span>
                </div>
              ) : feedback ? (
                /* Display Submitted Feedback */
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
                    <div>
                      <StarRating value={feedback.rating} showLabel size={22} />
                      <span className="cg-text-muted" style={{ display: "block", fontSize: "12px", marginTop: "4px" }}>
                        Submitted on {formatDate(feedback.created_at)}
                      </span>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Icon name="edit" size={13} />}
                      onClick={() => {
                        setRating(feedback.rating);
                        setComment(feedback.comment || "");
                        setFeedbackError("");
                        setEditFeedbackModal(true);
                      }}
                    >
                      Update Feedback
                    </Button>
                  </div>

                  {feedback.comment && (
                    <div
                      style={{
                        padding: "14px 16px",
                        background: "#F8FAF7",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--cg-border)",
                        fontSize: "14px",
                        lineHeight: "1.6",
                        color: "var(--cg-text-main)",
                        marginTop: "4px",
                      }}
                    >
                      "{feedback.comment}"
                    </div>
                  )}
                </div>
              ) : (
                /* Interactive Feedback Submission Form */
                <form onSubmit={handleSubmitFeedback} className="cg-form-stack">
                  <div className="cg-form-field">
                    <label className="cg-field-label">
                      Rating <span className="cg-field-required">*</span>
                    </label>
                    <StarRating
                      value={rating}
                      onChange={(r) => setRating(r)}
                      size={28}
                      showLabel
                    />
                  </div>

                  <div className="cg-form-field">
                    <label className="cg-field-label" htmlFor="feedback-comment">
                      Additional Comments <span className="cg-field-hint">Optional (Max 1000 characters)</span>
                    </label>
                    <textarea
                      id="feedback-comment"
                      className="cg-textarea"
                      rows={3}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Share your thoughts on the timeliness, communication, or quality of the fix..."
                      maxLength={1000}
                    />
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      loading={feedbackBusy}
                      disabled={!rating}
                      icon={<Icon name="check" size={15} />}
                    >
                      Submit Feedback
                    </Button>
                  </div>
                </form>
              )}
            </Card>
          )}
        </div>

        {/* Sidebar: Department Routing & AI Intelligence */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Department Assignment */}
          <Card title="Department Routing" eyebrow="Operational Assignment">
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", fontSize: "14px" }}>
              <div>
                <span className="cg-text-muted" style={{ fontSize: "12px", display: "block", marginBottom: "3px" }}>
                  Assigned Department
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Icon name="departments" size={17} style={{ color: "var(--cg-primary-green)" }} />
                  <strong>{request.department_name || "Routing in progress"}</strong>
                </div>
              </div>

              <div style={{ borderTop: "1px solid var(--cg-border-light)", paddingTop: "12px" }}>
                <span className="cg-text-muted" style={{ fontSize: "12px", display: "block", marginBottom: "3px" }}>
                  Assigned Officer
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Icon name="user" size={17} style={{ color: "var(--cg-text-secondary)" }} />
                  <span>{request.assigned_officer_name || "Awaiting officer claim"}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* AI Classification Card */}
          <Card
            title="Intelligent Classification"
            eyebrow="AI Assistant"
            action={
              <Button
                variant="outline"
                size="sm"
                loading={aiBusy}
                onClick={handleRunAiClassification}
                icon={<Icon name="sparkles" size={14} />}
              >
                {classification ? "Re-evaluate" : "Analyze"}
              </Button>
            }
          >
            {aiLoading ? (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--cg-text-secondary)", fontSize: "13px" }}>
                <span className="cg-spinner cg-spinner-sm" />
                <span>Checking AI analysis...</span>
              </div>
            ) : aiError ? (
              <div className="cg-form-error" style={{ fontSize: "13px" }}>
                <span>{aiError}</span>
              </div>
            ) : !classification || classification.processing_status === "PENDING" ? (
              <div style={{ textAlign: "center", padding: "16px 0", color: "var(--cg-text-secondary)" }}>
                <span className="cg-spinner" style={{ marginBottom: "8px" }} />
                <p style={{ fontSize: "13px" }}>AI classification is processing in the background...</p>
              </div>
            ) : classification.processing_status === "FAILED" ? (
              <div style={{ textAlign: "center", padding: "12px 0" }}>
                <p className="cg-text-muted" style={{ fontSize: "13px", marginBottom: "10px" }}>
                  AI automated evaluation did not complete.
                </p>
                <Button variant="secondary" size="sm" onClick={handleRunAiClassification}>
                  Retry AI Analysis
                </Button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px", fontSize: "13px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div style={{ background: "#F8FAF7", padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--cg-border)" }}>
                    <span className="cg-text-muted" style={{ fontSize: "11px", textTransform: "uppercase", fontWeight: 700 }}>
                      Category
                    </span>
                    <strong style={{ display: "block", marginTop: "2px", color: "var(--cg-text-main)" }}>
                      {classification.category || "General"}
                    </strong>
                  </div>

                  <div style={{ background: "#F8FAF7", padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--cg-border)" }}>
                    <span className="cg-text-muted" style={{ fontSize: "11px", textTransform: "uppercase", fontWeight: 700 }}>
                      Priority
                    </span>
                    <div style={{ marginTop: "2px" }}>
                      <PriorityBadge priority={classification.priority} />
                    </div>
                  </div>
                </div>

                {classification.summary && (
                  <div>
                    <span className="cg-text-muted" style={{ fontSize: "11px", textTransform: "uppercase", fontWeight: 700 }}>
                      AI Summary
                    </span>
                    <p style={{ marginTop: "3px", color: "var(--cg-text-main)", lineHeight: "1.5" }}>
                      {classification.summary}
                    </p>
                  </div>
                )}

                {classification.suggested_action && (
                  <div>
                    <span className="cg-text-muted" style={{ fontSize: "11px", textTransform: "uppercase", fontWeight: 700 }}>
                      Recommended Action
                    </span>
                    <p style={{ marginTop: "3px", color: "var(--cg-text-main)", lineHeight: "1.5" }}>
                      {classification.suggested_action}
                    </p>
                  </div>
                )}

                {classification.confidence != null && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--cg-border-light)", paddingTop: "8px" }}>
                    <span className="cg-text-muted">Classification Confidence</span>
                    <strong>{Math.round(classification.confidence * 100)}%</strong>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Edit Feedback Modal */}
      <Modal
        open={editFeedbackModal}
        onClose={() => setEditFeedbackModal(false)}
        title="Update Resolution Feedback"
        subtitle={`REQ-${String(request.id).padStart(3, "0")} — ${request.title}`}
      >
        <form onSubmit={handleUpdateFeedback} className="cg-form-stack">
          {feedbackError && (
            <div className="cg-form-error">
              <Icon name="alert-triangle" size={16} />
              <span>{feedbackError}</span>
            </div>
          )}

          <div className="cg-form-field">
            <label className="cg-field-label">Your Rating</label>
            <StarRating
              value={rating}
              onChange={(r) => setRating(r)}
              size={28}
              showLabel
            />
          </div>

          <div className="cg-form-field">
            <label className="cg-field-label" htmlFor="edit-fb-comment">
              Comments (optional)
            </label>
            <textarea
              id="edit-fb-comment"
              className="cg-textarea"
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Update your comments..."
              maxLength={1000}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
            <Button variant="ghost" onClick={() => setEditFeedbackModal(false)} disabled={feedbackBusy}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={feedbackBusy} disabled={!rating}>
              Save Feedback
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Request Modal */}
      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        title="Edit Service Request"
        subtitle="You can adjust details while the request is in Submitted or Pending status"
      >
        <form className="cg-form-stack" onSubmit={handleSaveEdit}>
          <div className="cg-form-field">
            <label className="cg-field-label" htmlFor="edit-title">Issue Title</label>
            <input
              id="edit-title"
              type="text"
              className="cg-input"
              value={form.title || ""}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>

          <div className="cg-form-field">
            <label className="cg-field-label" htmlFor="edit-desc">Description</label>
            <textarea
              id="edit-desc"
              className="cg-textarea"
              rows={4}
              value={form.description || ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
            />
          </div>

          <div className="cg-form-field">
            <label className="cg-field-label" htmlFor="edit-location">Street Address / Landmark</label>
            <input
              id="edit-location"
              type="text"
              className="cg-input"
              value={form.location || ""}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </div>

          <div style={{ marginTop: "8px", marginBottom: "8px" }}>
            <LocationPickerMap
              latitude={form.latitude}
              longitude={form.longitude}
              onLocationChange={(lat, lng) => setForm((prev) => ({ ...prev, latitude: lat, longitude: lng }))}
              onAddressDetected={(detected) => {
                if (!form.location) setForm((prev) => ({ ...prev, location: detected }));
              }}
              addressValue={form.location}
            />
          </div>

          <div className="cg-form-row">
            <div className="cg-form-field">
              <label className="cg-field-label" htmlFor="edit-lat">Latitude</label>
              <input
                id="edit-lat"
                type="number"
                step="any"
                className="cg-input"
                value={form.latitude || ""}
                onChange={(e) => setForm({ ...form, latitude: e.target.value })}
              />
            </div>
            <div className="cg-form-field">
              <label className="cg-field-label" htmlFor="edit-lng">Longitude</label>
              <input
                id="edit-lng"
                type="number"
                step="any"
                className="cg-input"
                value={form.longitude || ""}
                onChange={(e) => setForm({ ...form, longitude: e.target.value })}
              />
            </div>
          </div>

          <div className="cg-form-field">
            <label className="cg-field-label">Replace Evidence Photo (optional)</label>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              onChange={handleSelectImage}
            />
            {imagePreview && (
              <img
                src={imagePreview}
                alt="Evidence preview"
                style={{ width: "100%", maxHeight: "180px", objectFit: "cover", borderRadius: "8px", marginTop: "8px" }}
              />
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
            <Button variant="ghost" onClick={() => setEditing(false)}>
              Discard
            </Button>
            <Button type="submit" variant="primary" loading={busy}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Cancel Request Confirmation Modal */}
      <Modal
        open={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Cancel This Service Request?"
        subtitle="This action will permanently withdraw this submission from municipal review."
      >
        <p style={{ fontSize: "14px", color: "var(--cg-text-secondary)", lineHeight: "1.6", marginBottom: "20px" }}>
          Are you sure you want to cancel <strong>"{request.title}"</strong>? This will remove the issue from the department queue.
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <Button variant="ghost" onClick={() => setCancelModalOpen(false)} disabled={busy}>
            Keep Request
          </Button>
          <Button variant="danger" loading={busy} onClick={handleCancelRequest}>
            Yes, Cancel Request
          </Button>
        </div>
      </Modal>

      {/* Photo Preview Modal */}
      <Modal
        open={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        title="Attached Evidence Photo"
        subtitle={`REQ-${String(request.id).padStart(3, "0")} — ${request.title}`}
        maxWidth="720px"
      >
        {request.image && (
          <img
            src={mediaUrl(request.image)}
            alt="Full size evidence"
            style={{ width: "100%", maxHeight: "75vh", objectFit: "contain", borderRadius: "8px" }}
          />
        )}
      </Modal>
    </div>
  );
}
