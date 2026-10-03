import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import RequestStatus from "../components/RequestStatus";
import { addOfficerNote, claimOfficerRequest, getOfficerHistory, getOfficerNotes, getOfficerRequest, unclaimOfficerRequest, updateRequestStatus } from "../services/requestService";
import "../components/Workflow.css";

const mediaUrl = (url) => url?.startsWith("http") ? url : `${(import.meta.env.VITE_API_URL || "http://localhost:8000/api").replace(/\/api\/?$/, "")}${url}`;
const dateLabel = (date) => new Date(date).toLocaleString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export default function OfficerRequestDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [notes, setNotes] = useState([]);
  const [history, setHistory] = useState([]);
  const [note, setNote] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [statusAction, setStatusAction] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const [item, requestNotes, requestHistory] = await Promise.all([getOfficerRequest(id), getOfficerNotes(id), getOfficerHistory(id)]);
      setRequest(item); setNotes(requestNotes); setHistory(requestHistory); setError("");
    } catch (loadError) {
      setError(loadError.response?.data?.detail || "This request is not available in your department.");
    }
  };
  useEffect(() => { load(); }, [id]);

  const run = async (action) => {
    setBusy(true); setError("");
    try { await action(); await load(); } catch (actionError) { setError(actionError.response?.data?.detail || "The workflow action could not be completed."); } finally { setBusy(false); }
  };
  const claim = () => run(() => claimOfficerRequest(id));
  const startWork = () => run(() => updateRequestStatus(id, "IN_PROGRESS", "Work started by officer."));
  const unclaim = () => { if (window.confirm("Unclaim this request? It will return to the department queue.")) run(() => unclaimOfficerRequest(id)); };
  const addNote = async (event) => {
    event.preventDefault();
    if (!note.trim()) return;
    await run(async () => { await addOfficerNote(id, note.trim()); setNote(""); });
  };
  const changeStatus = async (event) => {
    event.preventDefault();
    if (!statusNote.trim()) return;
    await run(async () => { await updateRequestStatus(id, statusAction, statusNote.trim()); setStatusAction(""); setStatusNote(""); });
  };
  const showNoteForm = () => document.getElementById("internal-note-form")?.scrollIntoView({ behavior: "smooth", block: "center" });

  if (!request && !error) return <div className="request-feedback">Loading request...</div>;
  if (!request) return <div className="request-feedback request-feedback-error"><strong>{error}</strong><Link className="button button-primary" to="/officer/requests">Back to queue</Link></div>;
  const assignedToYou = request.assigned_officer_id === user?.id;
  const assigned = Boolean(request.assigned_officer_id);
  const canModify = assignedToYou;

  return <div className="workflow-page"><Link className="back-link" to="/officer/requests">&larr; Back to queue</Link>{error && <p className="form-error">{error}</p>}
    <div className="detail-header"><div><span className="request-id">REQ-{String(request.id).padStart(3, "0")}</span><h1>{request.title}</h1><div className="detail-location">{request.location || "Location not provided"}</div></div><RequestStatus status={request.status} /></div>
    <div className="workflow-card"><h2>Citizen request</h2><p className="detail-description">{request.description}</p>{request.image && <img className="request-image" src={mediaUrl(request.image)} alt="Request evidence" />}<div className="workflow-detail-grid"><div><span>Latitude</span><strong>{request.latitude ?? "Not provided"}</strong></div><div><span>Longitude</span><strong>{request.longitude ?? "Not provided"}</strong></div><div><span>Created</span><strong>{dateLabel(request.created_at)}</strong></div><div><span>Updated</span><strong>{dateLabel(request.updated_at)}</strong></div></div></div>
    <div className="workflow-card"><h2>AI analysis</h2><div className="workflow-detail-grid"><div><span>Category</span><strong>{request.category || "Awaiting classification"}</strong></div><div><span>Priority</span><strong>{request.priority || "-"}</strong></div><div><span>Confidence</span><strong>{request.confidence == null ? "-" : `${Math.round(request.confidence * 100)}%`}</strong></div></div><p>{request.ai_summary || "No completed AI summary yet."}</p>{request.suggested_action && <p className="workflow-muted">Suggested action: {request.suggested_action}</p>}</div>
    <div className="workflow-card"><h2>Routing</h2><p>Department: <strong>{request.department_name || "Unassigned"}</strong></p><p>Assigned officer: <strong>{request.assigned_officer_name || "Unassigned"}</strong></p></div>
    <div className="workflow-card"><h2>Workflow</h2><p>Current status: <RequestStatus status={request.status} /></p><div className="workflow-actions">{request.status === "CLOSED" ? <strong className="workflow-muted">Request closed</strong> : !assigned ? <button className="button button-primary" disabled={busy} onClick={claim}>Claim request</button> : canModify ? <><strong className="workflow-assigned">Assigned to you</strong>{request.status === "PENDING" && <button className="button button-primary" disabled={busy} onClick={startWork}>Start work</button>}<button className="button button-ghost" disabled={busy} onClick={showNoteForm}>Add note</button>{request.status === "IN_PROGRESS" && <button className="button button-primary" disabled={busy} onClick={() => setStatusAction("RESOLVED")}>Mark as resolved</button>}{request.status === "RESOLVED" && <button className="button button-primary" disabled={busy} onClick={() => setStatusAction("CLOSED")}>Close request</button>}{request.status !== "RESOLVED" && <button className="button button-ghost" disabled={busy} onClick={unclaim}>Unclaim</button>}</> : <span className="workflow-muted">Assigned to {request.assigned_officer_name || "another officer"}</span>}</div>{statusAction && <form className="workflow-form" onSubmit={changeStatus}><label>{statusAction === "RESOLVED" ? "Resolution note" : "Closure note"}<textarea value={statusNote} onChange={(event) => setStatusNote(event.target.value)} rows="3" placeholder="Describe the completed work" required /></label><div className="workflow-actions"><button className="button button-primary" disabled={busy || !statusNote.trim()}>{statusAction === "RESOLVED" ? "Resolve request" : "Close request"}</button><button type="button" className="button button-ghost" onClick={() => setStatusAction("")}>Cancel</button></div></form>}</div>
    <div className="workflow-card"><h2>Status history</h2>{history.length === 0 ? <p className="workflow-muted">No status history yet.</p> : <div className="workflow-timeline">{history.map((item) => <div className="workflow-timeline-item" key={item.id}><strong>{item.new_status}</strong><span>{dateLabel(item.created_at)}</span><p>{item.note || `${item.old_status} to ${item.new_status}`}</p></div>)}</div>}</div>
    <div className="workflow-card"><h2>Internal notes</h2>{notes.length === 0 ? <p className="workflow-muted">No internal notes yet.</p> : notes.map((item) => <div className="workflow-note" key={item.id}><span>{item.note}</span><small>{dateLabel(item.created_at)}</small></div>)}{canModify && request.status !== "CLOSED" && <form id="internal-note-form" className="workflow-form" onSubmit={addNote}><label>Add internal note<textarea value={note} onChange={(event) => setNote(event.target.value)} rows="3" placeholder="Inspection details for the department" required /></label><button className="button button-primary" disabled={busy || !note.trim()}>Add note</button></form>}</div>
  </div>;
}
