import { useEffect, useState } from "react";
import { getAdminFeedback, getDepartments } from "../services/requestService";
import PageHeader from "../components/ui/PageHeader";
import StatCard from "../components/ui/StatCard";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import StarRating, { RATING_LABELS } from "../components/ui/StarRating";
import { Icon } from "../components/ui/Icons";

const formatDate = (date) => {
  if (!date) return "—";
  return new Date(date).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

function RatingBar({ count, total, star }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const colors = {
    5: "var(--cg-primary-green)",
    4: "#56C27A",
    3: "var(--cg-warning)",
    2: "#F6934C",
    1: "var(--cg-error)",
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px" }}>
      <span style={{ width: "14px", textAlign: "right", color: "var(--cg-text-secondary)", fontWeight: 600 }}>
        {star}
      </span>
      <Icon name="star-filled" size={12} style={{ color: colors[star], flexShrink: 0 }} />
      <div
        style={{
          flex: 1,
          height: "8px",
          background: "var(--cg-border-light)",
          borderRadius: "99px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: colors[star],
            borderRadius: "99px",
            transition: "width 0.6s ease",
          }}
        />
      </div>
      <span style={{ width: "36px", color: "var(--cg-text-secondary)", textAlign: "right" }}>{count}</span>
      <span style={{ width: "34px", color: "var(--cg-text-muted)", textAlign: "right", fontSize: "12px" }}>
        {pct}%
      </span>
    </div>
  );
}

function MiniStars({ rating }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "2px" }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Icon
          key={s}
          name={s <= rating ? "star-filled" : "star"}
          size={13}
          style={{ color: s <= rating ? "#E57B61" : "#DCE4D9" }}
        />
      ))}
    </div>
  );
}

export default function AdminFeedback() {
  const [overview, setOverview] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterRating, setFilterRating] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterLoading, setFilterLoading] = useState(false);

  const loadData = async (params = {}, isFilter = false) => {
    setError("");
    if (isFilter) {
      setFilterLoading(true);
    } else {
      setLoading(true);
    }
    try {
      const feedbackPromise = getAdminFeedback(params);
      const deptPromise = departments.length === 0 ? getDepartments(true) : Promise.resolve(departments);
      const [feedbackData, deptData] = await Promise.all([feedbackPromise, deptPromise]);
      setOverview(feedbackData);
      if (departments.length === 0) setDepartments(Array.isArray(deptData) ? deptData : []);
    } catch {
      setError("Unable to load feedback analytics. Please try again.");
    } finally {
      setLoading(false);
      setFilterLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApplyFilter = () => {
    const params = {};
    if (filterRating) params.rating = Number(filterRating);
    if (filterDept) params.department_id = Number(filterDept);
    loadData(params, true);
  };

  const handleClearFilters = () => {
    setFilterRating("");
    setFilterDept("");
    loadData({}, true);
  };

  const hasActiveFilter = filterRating !== "" || filterDept !== "";

  if (loading) {
    return (
      <div>
        <div className="cg-stat-grid" style={{ marginBottom: "28px" }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="cg-skeleton" style={{ height: "115px" }} />
          ))}
        </div>
        <div className="cg-skeleton" style={{ height: "280px", marginBottom: "24px" }} />
        <div className="cg-skeleton" style={{ height: "320px" }} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Administration"
        title="Feedback Analytics"
        description="Monitor citizen satisfaction, track department performance, and identify service quality trends."
        actions={
          <Button
            variant="outline"
            size="md"
            icon={<Icon name="refresh" size={15} />}
            onClick={() => loadData()}
          >
            Refresh
          </Button>
        }
      />

      {error ? (
        <Card>
          <div className="cg-empty-state">
            <div className="cg-empty-icon" style={{ background: "#FEEBEB", color: "var(--cg-error)" }}>
              <Icon name="alert-triangle" size={24} />
            </div>
            <h3 className="cg-empty-title">Data Unavailable</h3>
            <p className="cg-empty-description">{error}</p>
            <Button variant="primary" onClick={() => loadData()}>
              Try Again
            </Button>
          </div>
        </Card>
      ) : overview ? (
        <>
          {/* Summary Stats */}
          <div className="cg-stat-grid" style={{ marginBottom: "28px" }}>
            <StatCard
              label="Total Feedback"
              value={overview.total_feedback}
              subtext="Citizen evaluations collected"
              icon="feedback"
              accent="primary"
            />
            <StatCard
              label="Average Rating"
              value={overview.total_feedback > 0 ? `${overview.average_rating.toFixed(1)} / 5` : "—"}
              subtext={
                overview.average_rating >= 4
                  ? "Excellent overall satisfaction"
                  : overview.average_rating >= 3
                  ? "Good — room for improvement"
                  : overview.total_feedback === 0
                  ? "No feedback yet"
                  : "Needs attention"
              }
              icon="star"
              accent={
                overview.average_rating >= 4
                  ? "success"
                  : overview.average_rating >= 3
                  ? "warning"
                  : "coral"
              }
            />
            <StatCard
              label="Departments Rated"
              value={overview.department_breakdown?.filter((d) => d.count > 0).length ?? 0}
              subtext="Departments with citizen feedback"
              icon="departments"
              accent="primary"
            />
          </div>

          {/* Charts row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1.4fr",
              gap: "24px",
              marginBottom: "24px",
            }}
          >
            {/* Rating Distribution */}
            <Card title="Rating Distribution" eyebrow="Breakdown">
              {overview.total_feedback === 0 ? (
                <p className="cg-text-muted" style={{ fontSize: "13px" }}>
                  No feedback has been collected yet.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "16px",
                      padding: "14px 16px",
                      background: "var(--cg-soft-green)",
                      borderRadius: "var(--radius-md)",
                      marginBottom: "6px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "36px",
                        fontWeight: 800,
                        color: "var(--cg-primary-green)",
                        lineHeight: 1,
                      }}
                    >
                      {overview.average_rating.toFixed(1)}
                    </span>
                    <div>
                      <StarRating
                        value={Math.round(overview.average_rating)}
                        size={18}
                        showLabel={false}
                      />
                      <span className="cg-text-muted" style={{ fontSize: "12px" }}>
                        Based on {overview.total_feedback} review
                        {overview.total_feedback !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  {[5, 4, 3, 2, 1].map((star) => (
                    <RatingBar
                      key={star}
                      star={star}
                      count={overview.rating_distribution[star] ?? 0}
                      total={overview.total_feedback}
                    />
                  ))}
                </div>
              )}
            </Card>

            {/* Department Breakdown */}
            <Card title="Department Performance" eyebrow="By Department">
              {overview.department_breakdown.length === 0 ? (
                <p className="cg-text-muted" style={{ fontSize: "13px" }}>
                  No department feedback recorded.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {overview.department_breakdown.map((dept, idx) => (
                    <div
                      key={dept.department_id ?? dept.department_name}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "10px 0",
                        borderBottom:
                          idx < overview.department_breakdown.length - 1
                            ? "1px solid var(--cg-border-light)"
                            : "none",
                      }}
                    >
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "var(--radius-sm)",
                          background: "var(--cg-soft-green)",
                          color: "var(--cg-primary-green)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          fontSize: "12px",
                          fontWeight: 700,
                        }}
                      >
                        {dept.department_name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span
                          style={{
                            fontSize: "13px",
                            fontWeight: 600,
                            color: "var(--cg-text-main)",
                            display: "block",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {dept.department_name}
                        </span>
                        <MiniStars rating={Math.round(dept.average_rating)} />
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <span
                          style={{
                            fontSize: "15px",
                            fontWeight: 700,
                            color:
                              dept.average_rating >= 4
                                ? "var(--cg-primary-green)"
                                : dept.average_rating >= 3
                                ? "var(--cg-warning)"
                                : "var(--cg-error)",
                          }}
                        >
                          {dept.average_rating.toFixed(1)}
                        </span>
                        <span
                          className="cg-text-muted"
                          style={{ display: "block", fontSize: "11px" }}
                        >
                          {dept.count} review{dept.count !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Filterable Feedback Log */}
          <Card
            title="All Citizen Feedback"
            eyebrow="Review Log"
            subtitle="Filter by rating or department to surface specific feedback"
            action={
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  flexWrap: "wrap",
                }}
              >
                <select
                  id="admin-fb-filter-rating"
                  className="cg-select cg-select-sm"
                  value={filterRating}
                  onChange={(e) => setFilterRating(e.target.value)}
                  style={{ minWidth: "130px" }}
                >
                  <option value="">All Ratings</option>
                  {[5, 4, 3, 2, 1].map((r) => (
                    <option key={r} value={r}>
                      {r} star{r !== 1 ? "s" : ""} — {RATING_LABELS[r]}
                    </option>
                  ))}
                </select>

                <select
                  id="admin-fb-filter-dept"
                  className="cg-select cg-select-sm"
                  value={filterDept}
                  onChange={(e) => setFilterDept(e.target.value)}
                  style={{ minWidth: "150px" }}
                >
                  <option value="">All Departments</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>

                <Button
                  variant="primary"
                  size="sm"
                  loading={filterLoading}
                  icon={<Icon name="filter" size={13} />}
                  onClick={handleApplyFilter}
                >
                  Apply
                </Button>

                {hasActiveFilter && (
                  <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                    Clear
                  </Button>
                )}
              </div>
            }
          >
            {overview.items.length === 0 ? (
              <div className="cg-empty-state" style={{ padding: "40px 0" }}>
                <div className="cg-empty-icon">
                  <Icon name="feedback" size={24} />
                </div>
                <h3 className="cg-empty-title">No Feedback Found</h3>
                <p className="cg-empty-description">
                  {hasActiveFilter
                    ? "No feedback matches the selected filters. Try adjusting your criteria."
                    : "No citizen feedback has been submitted yet."}
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {/* Table header */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1.4fr 1fr 130px 100px",
                    gap: "12px",
                    padding: "8px 12px",
                    background: "var(--cg-bg-subtle)",
                    borderRadius: "var(--radius-sm)",
                    marginBottom: "4px",
                    fontSize: "11px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "var(--cg-text-muted)",
                  }}
                >
                  <span>Request / Comment</span>
                  <span>Department</span>
                  <span>Citizen</span>
                  <span>Rating</span>
                  <span style={{ textAlign: "right" }}>Date</span>
                </div>

                {overview.items.map((fb, idx) => (
                  <div
                    key={fb.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "2fr 1.4fr 1fr 130px 100px",
                      gap: "12px",
                      padding: "12px",
                      borderBottom:
                        idx < overview.items.length - 1
                          ? "1px solid var(--cg-border-light)"
                          : "none",
                      alignItems: "start",
                    }}
                  >
                    {/* Title + comment */}
                    <div>
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: 600,
                          color: "var(--cg-text-main)",
                          display: "block",
                          marginBottom: "2px",
                        }}
                      >
                        {fb.service_request_title || `Request #${fb.service_request_id}`}
                      </span>
                      {fb.comment && (
                        <span
                          style={{
                            fontSize: "12px",
                            color: "var(--cg-text-secondary)",
                            lineHeight: "1.4",
                            display: "block",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={fb.comment}
                        >
                          &ldquo;{fb.comment}&rdquo;
                        </span>
                      )}
                    </div>

                    {/* Department */}
                    <span
                      style={{ fontSize: "13px", color: "var(--cg-text-secondary)", paddingTop: "1px" }}
                    >
                      {fb.department_name || "—"}
                    </span>

                    {/* Citizen */}
                    <span
                      style={{ fontSize: "13px", color: "var(--cg-text-secondary)", paddingTop: "1px" }}
                    >
                      {fb.citizen_name || "—"}
                    </span>

                    {/* Rating */}
                    <div style={{ paddingTop: "1px" }}>
                      <MiniStars rating={fb.rating} />
                      <span
                        style={{
                          display: "block",
                          fontSize: "11px",
                          fontWeight: 600,
                          marginTop: "2px",
                          color:
                            fb.rating >= 4
                              ? "var(--cg-primary-green)"
                              : fb.rating >= 3
                              ? "var(--cg-warning)"
                              : "var(--cg-error)",
                        }}
                      >
                        {RATING_LABELS[fb.rating]}
                      </span>
                    </div>

                    {/* Date */}
                    <span
                      style={{
                        fontSize: "12px",
                        color: "var(--cg-text-muted)",
                        textAlign: "right",
                        paddingTop: "2px",
                      }}
                    >
                      {formatDate(fb.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      ) : null}
    </div>
  );
}
