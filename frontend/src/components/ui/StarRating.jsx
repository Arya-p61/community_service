import { useState } from "react";
import { Icon } from "./Icons";

const RATING_LABELS = {
  1: "Very poor",
  2: "Poor",
  3: "Fair",
  4: "Good",
  5: "Excellent",
};

export default function StarRating({
  value = 0,
  onChange = null, // if null, read-only
  size = 24,
  showLabel = true,
  className = "",
}) {
  const [hoverVal, setHoverVal] = useState(0);
  const isInteractive = Boolean(onChange);
  const activeRating = hoverVal || value || 0;

  return (
    <div
      className={`cg-star-rating-wrap ${className}`}
      style={{ display: "inline-flex", alignItems: "center", gap: "10px" }}
    >
      <div
        className="cg-stars"
        role={isInteractive ? "radiogroup" : undefined}
        aria-label={isInteractive ? "Rate from 1 to 5 stars" : `Rating: ${value} of 5 stars`}
        style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= activeRating;

          if (!isInteractive) {
            return (
              <span
                key={star}
                style={{
                  color: isFilled ? "#E57B61" : "#DCE4D9",
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                <Icon name={isFilled ? "star-filled" : "star"} size={size} />
              </span>
            );
          }

          return (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={value === star}
              aria-label={`${star} star${star > 1 ? "s" : ""} — ${RATING_LABELS[star]}`}
              onClick={() => onChange(star)}
              onMouseEnter={() => setHoverVal(star)}
              onMouseLeave={() => setHoverVal(0)}
              onFocus={() => setHoverVal(star)}
              onBlur={() => setHoverVal(0)}
              style={{
                background: "none",
                border: "none",
                padding: "2px",
                cursor: "pointer",
                color: isFilled ? "#E57B61" : "#DCE4D9",
                display: "inline-flex",
                alignItems: "center",
                transition: "transform 0.15s ease, color 0.15s ease",
                transform: hoverVal === star ? "scale(1.15)" : "scale(1)",
              }}
            >
              <Icon name={isFilled ? "star-filled" : "star"} size={size} />
            </button>
          );
        })}
      </div>

      {showLabel && activeRating > 0 && (
        <span
          className="cg-rating-desc"
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: activeRating >= 4 ? "var(--cg-primary-green)" : activeRating >= 3 ? "var(--cg-warning)" : "var(--cg-error)",
          }}
        >
          {RATING_LABELS[activeRating]}
        </span>
      )}
    </div>
  );
}

export { RATING_LABELS };
