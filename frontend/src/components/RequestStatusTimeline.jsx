const stages = ["SUBMITTED", "IN_PROGRESS", "RESOLVED", "CLOSED"];
const labels = { SUBMITTED: "Request submitted", PENDING: "Pending review", IN_PROGRESS: "Work started", RESOLVED: "Request resolved", CLOSED: "Request closed" };
const dateLabel = (value) => new Date(value).toLocaleString(undefined, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default function RequestStatusTimeline({ history, currentStatus, loading, error }) {
  const currentIndex = Math.max(stages.indexOf(currentStatus), 0);
  return <section className="workflow-card status-tracking"><div className="status-tracking-heading"><div><p className="eyebrow">Status tracking</p><h2>Request timeline</h2></div><span className="status-tracking-current">{labels[currentStatus] || currentStatus}</span></div>
    <div className="status-progress" aria-label={`Current status: ${labels[currentStatus] || currentStatus}`}>{stages.map((stage, index) => <div className={`status-progress-stage ${index < currentIndex ? "is-complete" : ""} ${stage === currentStatus || (currentStatus === "PENDING" && stage === "SUBMITTED") ? "is-current" : ""}`} key={stage}><span className="status-progress-dot" /><span>{stage.replace("_", " ")}</span>{index < stages.length - 1 && <i />}</div>)}</div>
    {currentStatus === "PENDING" && <p className="timeline-pending">Your request is pending review before work begins.</p>}
    {loading ? <p className="timeline-message">Loading status history...</p> : error ? <p className="timeline-message timeline-error">{error}</p> : history.length === 0 ? <p className="timeline-message">No status history available.</p> : <div className="status-history-list">{history.map((item) => <div className="status-history-item" key={item.id}><span className="status-history-marker" /><div><strong>{labels[item.new_status] || item.new_status}</strong><time>{dateLabel(item.created_at)}</time><p>{item.note || (item.old_status ? `${labels[item.old_status] || item.old_status} to ${labels[item.new_status] || item.new_status}` : "Request submitted by citizen")}</p></div></div>)}</div>}
  </section>;
}
