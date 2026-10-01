import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getOfficerRequests } from "../services/requestService";
import "../components/Workflow.css";

export default function OfficerDashboard() {
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => { getOfficerRequests().then(setRequests).catch(() => setError("Unable to load your department queue.")); }, []);
  const stats = {
    total: requests.length,
    unassigned: requests.filter((item) => !item.assigned_officer_id).length,
    mine: requests.filter((item) => item.assigned_officer_id).length,
    progress: requests.filter((item) => item.status === "IN_PROGRESS").length,
    resolved: requests.filter((item) => ["RESOLVED", "CLOSED"].includes(item.status)).length,
  };
  return <div className="workflow-page"><div className="page-heading"><div><p className="eyebrow">Officer workspace</p><h1>Department queue</h1><p>Review, claim, and resolve requests assigned to your department.</p></div><Link className="button button-primary" to="/officer/requests">Open queue</Link></div>{error && <p className="form-error">{error}</p>}<div className="workflow-grid"><Stat label="Department requests" value={stats.total} /><Stat label="Unassigned" value={stats.unassigned} /><Stat label="Assigned" value={stats.mine} /><Stat label="In progress" value={stats.progress} /></div><div className="workflow-card"><h2>Resolved requests</h2><p className="workflow-muted">{stats.resolved} request{stats.resolved === 1 ? "" : "s"} resolved or closed in your department.</p></div></div>;
}
function Stat({ label, value }) { return <div className="workflow-stat"><span>{label}</span><strong>{value}</strong></div>; }
