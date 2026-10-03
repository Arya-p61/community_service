import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAdminOfficers, getAdminRequests, getDepartments } from "../services/requestService";
import "../components/Workflow.css";

export default function AdminDashboard() {
  const [data, setData] = useState({ requests: [], officers: [], departments: [] });
  const [error, setError] = useState("");
  useEffect(() => { Promise.all([getAdminRequests(), getAdminOfficers(), getDepartments(true)]).then(([requests, officers, departments]) => setData({ requests, officers, departments })).catch(() => setError("Unable to load the administration overview.")); }, []);
  const { requests, officers, departments } = data;
  const stats = {
    total: requests.length,
    open: requests.filter((item) => !["RESOLVED", "CLOSED"].includes(item.status)).length,
    unassigned: requests.filter((item) => !item.assigned_officer_id).length,
    resolved: requests.filter((item) => ["RESOLVED", "CLOSED"].includes(item.status)).length,
  };
  return <div className="workflow-page"><div className="page-heading"><div><p className="eyebrow">Administration</p><h1>Operations overview</h1><p>Manage routing, officers, and every service request from one place.</p></div><Link className="button button-primary" to="/admin/requests">Review requests</Link></div>{error && <p className="form-error">{error}</p>}<div className="workflow-grid"><Stat label="All requests" value={stats.total} /><Stat label="Open requests" value={stats.open} /><Stat label="Unassigned" value={stats.unassigned} /><Stat label="Resolved" value={stats.resolved} /></div><div className="workflow-admin-links"><Link className="workflow-card" to="/admin/requests"><strong>Request management</strong><span>Assign departments, officers, and statuses.</span></Link><Link className="workflow-card" to="/admin/departments"><strong>Departments</strong><span>{departments.length} controlled routing destinations.</span></Link><Link className="workflow-card" to="/admin/officers"><strong>Officers</strong><span>{officers.length} officer accounts in the system.</span></Link></div></div>;
}

function Stat({ label, value }) { return <div className="workflow-stat"><span>{label}</span><strong>{value}</strong></div>; }
