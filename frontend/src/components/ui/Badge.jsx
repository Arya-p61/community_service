export const STATUS_CONFIG = {
  SUBMITTED: {
    label: "Submitted",
    bg: "#EEF4FF",
    color: "#2C5282",
    border: "#C3DAFE",
    dot: "#3182CE",
  },
  PENDING: {
    label: "Pending Review",
    bg: "#FEF7E6",
    color: "#B7791F",
    border: "#FEEBC8",
    dot: "#DD6B20",
  },
  IN_PROGRESS: {
    label: "In Progress",
    bg: "#E5EFE2",
    color: "#245440",
    border: "#CCE3C7",
    dot: "#2D6A52",
  },
  RESOLVED: {
    label: "Resolved",
    bg: "#E6F4EA",
    color: "#2F855A",
    border: "#BCE5C8",
    dot: "#38A169",
  },
  CLOSED: {
    label: "Closed",
    bg: "#EDF2F0",
    color: "#4A5A53",
    border: "#D1DCD6",
    dot: "#718096",
  },
};

export const PRIORITY_CONFIG = {
  Low: {
    label: "Low",
    bg: "#EBF8F1",
    color: "#276749",
    border: "#C6F0D8",
  },
  Medium: {
    label: "Medium",
    bg: "#FEF9E7",
    color: "#975A16",
    border: "#FDE68A",
  },
  High: {
    label: "High",
    bg: "#FFF0EB",
    color: "#C05621",
    border: "#FED7D7",
  },
  Critical: {
    label: "Critical",
    bg: "#FEEBEB",
    color: "#C2413B",
    border: "#FEB2B2",
  },
};

export function StatusBadge({ status, className = "" }) {
  const norm = (status || "").toUpperCase();
  const config = STATUS_CONFIG[norm] || {
    label: status || "Unknown",
    bg: "#F7F7F0",
    color: "#66766F",
    border: "#DCE4D9",
    dot: "#A0AEC0",
  };

  return (
    <span
      className={`cg-badge status-badge ${className}`}
      style={{
        backgroundColor: config.bg,
        color: config.color,
        borderColor: config.border,
      }}
    >
      <span className="cg-badge-dot" style={{ backgroundColor: config.dot }} />
      <span>{config.label}</span>
    </span>
  );
}

export function PriorityBadge({ priority, className = "" }) {
  if (!priority) return <span className="cg-text-muted">—</span>;
  const config = PRIORITY_CONFIG[priority] || {
    label: priority,
    bg: "#F7F7F0",
    color: "#66766F",
    border: "#DCE4D9",
  };

  return (
    <span
      className={`cg-badge priority-badge ${className}`}
      style={{
        backgroundColor: config.bg,
        color: config.color,
        borderColor: config.border,
      }}
    >
      {config.label}
    </span>
  );
}

export function RoleBadge({ role, className = "" }) {
  const colors = {
    citizen: { bg: "#E5EFE2", color: "#2D6A52" },
    officer: { bg: "#EBF4FF", color: "#2B6CB0" },
    admin: { bg: "#FEF3C7", color: "#92400E" },
  };
  const norm = (role || "citizen").toLowerCase();
  const theme = colors[norm] || colors.citizen;

  return (
    <span
      className={`cg-badge role-badge ${className}`}
      style={{
        backgroundColor: theme.bg,
        color: theme.color,
        borderColor: "transparent",
      }}
    >
      {norm.charAt(0).toUpperCase() + norm.slice(1)}
    </span>
  );
}
