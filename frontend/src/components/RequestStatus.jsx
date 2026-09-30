const labels = { SUBMITTED: "Submitted", PENDING: "Pending", IN_PROGRESS: "In progress", RESOLVED: "Resolved", CLOSED: "Closed" };

export default function RequestStatus({ status }) {
  return <span className={`request-status status-${status.toLowerCase()}`}><span className="status-dot" />{labels[status] || status}</span>;
}

export { labels };