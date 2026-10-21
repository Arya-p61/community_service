import { StatusBadge, STATUS_CONFIG } from "./ui/Badge";

const labels = {
  SUBMITTED: "Submitted",
  PENDING: "Pending",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export default function RequestStatus({ status }) {
  return <StatusBadge status={status} />;
}

export { labels, STATUS_CONFIG };