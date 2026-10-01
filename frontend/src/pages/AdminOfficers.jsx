import { useEffect, useState } from "react";
import { getAdminOfficers, getDepartments, updateOfficer } from "../services/requestService";
import "../components/Workflow.css";

export default function AdminOfficers() {
  const [officers, setOfficers] = useState([]); const [departments, setDepartments] = useState([]); const [error, setError] = useState("");
  const load = () => Promise.all([getAdminOfficers(), getDepartments()]).then(([staff, units]) => { setOfficers(staff); setDepartments(units); }).catch(() => setError("Unable to load officer management data.")); useEffect(() => { load(); }, []);
  const changeDepartment = (id, department_id) => updateOfficer(id, { department_id: Number(department_id) }).then(load).catch((changeError) => setError(changeError.response?.data?.detail || "Unable to update officer."));
  const toggle = (officer) => updateOfficer(officer.id, { is_active: !officer.is_active }).then(load).catch(() => setError("Unable to update officer status."));
  return <div className="workflow-page"><div className="page-heading"><div><p className="eyebrow">Administration</p><h1>Officers</h1><p>Assign active officers to controlled departments.</p></div></div>{error && <p className="form-error">{error}</p>}<div className="workflow-card"><table className="workflow-table"><thead><tr><th>Officer</th><th>Department</th><th>Status</th><th>Action</th></tr></thead><tbody>{officers.map((officer) => <tr key={officer.id}><td>{officer.name}<br /><span className="workflow-muted">{officer.email}</span></td><td><select value={officer.department_id || ""} onChange={(event) => changeDepartment(officer.id, event.target.value)}><option value="" disabled>Select department</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></td><td>{officer.is_active ? "Active" : "Inactive"}</td><td><button className="button button-ghost" onClick={() => toggle(officer)}>{officer.is_active ? "Deactivate" : "Activate"}</button></td></tr>)}</tbody></table></div></div>;
}
