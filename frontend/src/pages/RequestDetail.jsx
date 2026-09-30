import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import RequestStatus from "../components/RequestStatus";
import "../components/AIClassification.css";
import { classifyRequest, deleteRequest, getClassification, getRequestById, updateRequest } from "../services/requestService";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const dateLabel = (date) => new Date(date).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
const mediaUrl = (url) => url?.startsWith("http") ? url : `${(import.meta.env.VITE_API_URL || "http://localhost:8000/api").replace(/\/api\/?$/, "")}${url}`;

export default function RequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [form, setForm] = useState({});
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [classification, setClassification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [error, setError] = useState("");
  const [aiError, setAiError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const data = await getRequestById(id);
        if (!active) return;
        setRequest(data);
        setForm(data);
        try {
          const result = await getClassification(id);
          if (active) setClassification(result);
        } catch (classificationError) {
          if (active && classificationError.response?.status !== 404) setAiError("Unable to load the AI analysis.");
        }
      } catch {
        if (active) setError("This request could not be found or is not available to your account.");
      } finally {
        if (active) { setLoading(false); setAiLoading(false); }
      }
    }
    load();
    return () => { active = false; };
  }, [id]);

  const editable = request && ["SUBMITTED", "PENDING"].includes(request.status);
  const beginEdit = () => { setImage(null); setImagePreview(request.image ? mediaUrl(request.image) : ""); setEditing(true); };
  const selectImage = (event) => {
    const selected = event.target.files?.[0] || null;
    if (!selected) return;
    if (!IMAGE_TYPES.includes(selected.type)) return setError("Choose a JPG, PNG, or WEBP image.");
    if (selected.size > MAX_IMAGE_SIZE) return setError("Image must be 5 MB or smaller.");
    setError(""); setImage(selected); setImagePreview(URL.createObjectURL(selected));
  };
  const save = async (event) => {
    event.preventDefault(); setBusy(true); setError("");
    const body = new FormData();
    ["title", "description", "location", "latitude", "longitude"].forEach((key) => body.append(key, form[key] ?? ""));
    if (image) body.append("image", image);
    try { const data = await updateRequest(id, body); setRequest(data); setForm(data); setEditing(false); } catch (saveError) { setError(saveError.response?.data?.detail || "Unable to save your changes."); } finally { setBusy(false); }
  };
  const cancel = async () => {
    if (!window.confirm("Cancel this service request?")) return;
    setBusy(true); try { await deleteRequest(id); navigate("/citizen/requests"); } catch (cancelError) { setError(cancelError.response?.data?.detail || "This request can no longer be cancelled."); } finally { setBusy(false); }
  };
  const analyze = async () => {
    setAiBusy(true); setAiError("");
    try { setClassification(await classifyRequest(id)); } catch (classificationError) { setAiError(classificationError.response?.data?.detail || "AI analysis could not be completed."); } finally { setAiBusy(false); }
  };

  if (loading) return <div className="request-feedback"><span className="spinner" />Loading request...</div>;
  if (error && !request) return <div className="request-feedback request-feedback-error"><strong>{error}</strong><Link className="button button-primary" to="/citizen/requests">Back to requests</Link></div>;
  return <div className="request-detail-page"><Link className="back-link" to="/citizen/requests">&larr; Back to my requests</Link>{error && <p className="form-error detail-error">{error}</p>}
    <div className="detail-header"><div><span className="request-id">REQ-{String(request.id).padStart(3, "0")}</span><h1>{request.title}</h1><div className="detail-location">&#8981; {request.location || "Location not provided"}</div></div><RequestStatus status={request.status} /></div>
    <div className="detail-layout"><article className="detail-card">{editing ? <form className="form-stack" onSubmit={save}><Field label="Issue title" value={form.title} onChange={(value) => setForm({ ...form, title: value })} /><label className="field"><span>Description</span><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows="6" required /></label><Field label="Location" value={form.location || ""} onChange={(value) => setForm({ ...form, location: value })} /><div className="form-grid"><Field label="Latitude" value={form.latitude || ""} onChange={(value) => setForm({ ...form, latitude: value })} /><Field label="Longitude" value={form.longitude || ""} onChange={(value) => setForm({ ...form, longitude: value })} /></div><label className="field"><span>Replace image</span><input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={selectImage} /></label>{imagePreview && <img src={imagePreview} alt="Request evidence preview" style={{ width: "100%", maxHeight: 260, objectFit: "cover", borderRadius: 8 }} />}<div className="detail-actions"><button className="button button-primary" disabled={busy}>Save changes</button><button type="button" className="button button-ghost" onClick={() => setEditing(false)}>Discard</button></div></form> : <><p className="detail-description">{request.description}</p>{request.image && <img className="request-image" src={mediaUrl(request.image)} alt="Attached evidence" />}<div className="detail-meta"><div><span>Location</span><strong>{request.location || "Not provided"}</strong></div><div><span>Coordinates</span><strong>{request.latitude != null && request.longitude != null ? `${request.latitude}, ${request.longitude}` : "Not provided"}</strong></div><div><span>Submitted</span><strong>{dateLabel(request.created_at)}</strong></div><div><span>Last updated</span><strong>{dateLabel(request.updated_at)}</strong></div></div>{editable && <div className="detail-actions"><button className="button button-primary" onClick={beginEdit}>Edit request</button><button className="button button-danger" onClick={cancel} disabled={busy}>Cancel request</button></div>}</>}</article></div>
    <AIClassification classification={classification} loading={aiLoading} busy={aiBusy} error={aiError} onAnalyze={analyze} />
  </div>;
}

function AIClassification({ classification, loading, busy, error, onAnalyze }) {
  if (loading) return <section className="ai-panel"><p className="ai-kicker">AI analysis</p><p className="ai-panel-message">Checking classification status...</p></section>;
  const status = classification?.processing_status;
  return <section className="ai-panel"><div className="ai-panel-heading"><div><p className="ai-kicker">AI analysis</p><h2>Intelligent classification</h2></div><button className="button button-primary" onClick={onAnalyze} disabled={busy}>{busy ? "Analyzing..." : status === "COMPLETED" ? "Re-analyze" : status === "FAILED" ? "Retry analysis" : "Analyze with AI"}</button></div>
    {error && <p className="form-error">{error}</p>}
    {status === "PENDING" && <p className="ai-panel-message">AI analysis in progress...</p>}
    {status === "FAILED" && !error && <p className="ai-panel-message">AI analysis could not be completed. You can retry the analysis.</p>}
    {status === "COMPLETED" && <><div className="ai-result-grid"><div><span>Category</span><strong>{classification.category}</strong></div><div><span>Priority</span><strong className={`ai-priority ai-priority-${classification.priority.toLowerCase()}`}>{classification.priority}</strong></div><div><span>Department</span><strong>{classification.department}</strong></div></div><div className="ai-copy"><span className="ai-copy-label">Summary</span><p>{classification.summary}</p></div><div className="ai-copy"><span className="ai-copy-label">Suggested action</span><p>{classification.suggested_action}</p></div><div className="ai-copy"><span className="ai-copy-label">Confidence</span><p>{Math.round(classification.confidence * 100)}%</p></div></>}
  </section>;
}

function Field({ label, value, onChange }) { return <label className="field"><span>{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} /></label>; }
