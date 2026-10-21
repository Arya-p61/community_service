import { Icon } from "./ui/Icons";
import { StatusBadge } from "./ui/Badge";

const STAGES = [
  { key: "SUBMITTED", label: "Submitted" },
  { key: "PENDING", label: "In Review" },
  { key: "IN_PROGRESS", label: "In Progress" },
  { key: "RESOLVED", label: "Resolved" },
  { key: "CLOSED", label: "Closed" },
];

const STAGE_ORDER = {
  SUBMITTED: 1,
  PENDING: 2,
  IN_PROGRESS: 3,
  RESOLVED: 4,
  CLOSED: 5,
};

const formatDate = (val) => {
  if (!val) return "";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function RequestStatusTimeline({ history = [], currentStatus, loading = false, error = "" }) {
  const currentLevel = STAGE_ORDER[currentStatus] || 1;

  return (
    <div className="cg-card" style={{ marginTop: "24px" }}>
      <div className="cg-card-header">
        <div>
          <span className="cg-eyebrow">Progression</span>
          <h3 className="cg-card-title">Status Tracking & History</h3>
        </div>
        <StatusBadge status={currentStatus} />
      </div>

      <div className="cg-card-body">
        {/* Visual Stepper */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            position: "relative",
            margin: "12px 0 32px",
          }}
        >
          {/* Stepper bar line */}
          <div
            style={{
              position: "absolute",
              top: "16px",
              left: "10%",
              right: "10%",
              height: "3px",
              backgroundColor: "var(--cg-border)",
              zIndex: 0,
            }}
          />

          {STAGES.map((stage, idx) => {
            const stageLevel = STAGE_ORDER[stage.key];
            const isCompleted = stageLevel < currentLevel;
            const isCurrent = stage.key === currentStatus;

            let dotBg = "#FFFFFF";
            let dotBorder = "var(--cg-border)";
            let dotColor = "var(--cg-text-secondary)";

            if (isCompleted) {
              dotBg = "var(--cg-primary-green)";
              dotBorder = "var(--cg-primary-green)";
              dotColor = "#FFFFFF";
            } else if (isCurrent) {
              dotBg = "var(--cg-coral)";
              dotBorder = "var(--cg-coral)";
              dotColor = "#FFFFFF";
            }

            return (
              <div
                key={stage.key}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  position: "relative",
                  zIndex: 1,
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    backgroundColor: dotBg,
                    border: `2px solid ${dotBorder}`,
                    color: dotColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: "12px",
                    marginBottom: "8px",
                    boxShadow: isCurrent ? "0 0 0 4px rgba(229, 123, 97, 0.2)" : "var(--shadow-xs)",
                    transition: "all 0.2s ease",
                  }}
                >
                  {isCompleted ? <Icon name="check" size={16} /> : idx + 1}
                </div>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: isCurrent ? 700 : 500,
                    color: isCurrent ? "var(--cg-text-main)" : "var(--cg-text-secondary)",
                  }}
                >
                  {stage.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* History Log */}
        <div style={{ borderTop: "1px solid var(--cg-border-light)", paddingTop: "20px" }}>
          <h4 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "14px", color: "var(--cg-text-main)" }}>
            Official Status Events
          </h4>

          {loading ? (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--cg-text-secondary)", padding: "16px 0" }}>
              <span className="cg-spinner cg-spinner-sm" />
              <span>Loading status events...</span>
            </div>
          ) : error ? (
            <div className="cg-form-error">{error}</div>
          ) : history.length === 0 ? (
            <p className="cg-text-muted" style={{ fontSize: "13px" }}>
              No status changes recorded yet. This request is currently {currentStatus}.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", paddingLeft: "12px", borderLeft: "2px solid var(--cg-border)" }}>
              {history.map((item) => (
                <div key={item.id} style={{ position: "relative", paddingLeft: "16px" }}>
                  <div
                    style={{
                      position: "absolute",
                      left: "-21px",
                      top: "4px",
                      width: "10px",
                      height: "10px",
                      borderRadius: "50%",
                      backgroundColor: "var(--cg-coral)",
                      border: "2px solid var(--cg-white)",
                    }}
                  />
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <StatusBadge status={item.new_status} />
                    <span style={{ fontSize: "12px", color: "var(--cg-text-muted)" }}>
                      {formatDate(item.created_at)}
                    </span>
                  </div>
                  {item.note && (
                    <p style={{ fontSize: "13px", color: "var(--cg-text-secondary)", marginTop: "6px", lineHeight: "1.5" }}>
                      {item.note}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
