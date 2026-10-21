import L from "leaflet";

/**
 * CommonGround Map Marker Icons
 * Pure SVG divIcons matching the CommonGround design system palette.
 */

const STATUS_PIN_COLORS = {
  SUBMITTED: { pin: "#3182CE", dot: "#FFFFFF" },
  PENDING: { pin: "#DD6B20", dot: "#FFFFFF" },
  IN_PROGRESS: { pin: "#2D6A52", dot: "#FFFFFF" },
  RESOLVED: { pin: "#38A169", dot: "#FFFFFF" },
  CLOSED: { pin: "#718096", dot: "#FFFFFF" },
};

export function createStatusIcon(status = "SUBMITTED", isSelected = false) {
  const norm = (status || "").toUpperCase();
  const c = STATUS_PIN_COLORS[norm] || { pin: "#2D6A52", dot: "#FFFFFF" };
  const width = isSelected ? 36 : 28;
  const height = Math.round(width * 1.28);

  const svg = `
    <div style="transform: translate(-50%, -100%); width: ${width}px; height: ${height}px; transition: transform 0.15s ease;">
      <svg width="${width}" height="${height}" viewBox="0 0 32 41" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 3px 5px rgba(0,0,0,0.3)); display: block;">
        <path d="M16 0.5C7.44 0.5 0.5 7.44 0.5 16C0.5 27.2 16 40.5 16 40.5C16 40.5 31.5 27.2 31.5 16C31.5 7.44 24.56 0.5 16 0.5Z" fill="${c.pin}" stroke="#FFFFFF" stroke-width="2.5"/>
        <circle cx="16" cy="15.5" r="5.5" fill="${c.dot}"/>
      </svg>
    </div>
  `;

  return L.divIcon({
    html: svg,
    className: "cg-map-status-icon",
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -height - 4],
  });
}

export function createPickerIcon() {
  const width = 34;
  const height = Math.round(width * 1.28);

  const svg = `
    <div style="transform: translate(-50%, -100%); width: ${width}px; height: ${height}px; animation: cg-pin-bounce 0.4s ease;">
      <svg width="${width}" height="${height}" viewBox="0 0 32 41" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 4px 8px rgba(36,84,64,0.45)); display: block;">
        <path d="M16 0.5C7.44 0.5 0.5 7.44 0.5 16C0.5 27.2 16 40.5 16 40.5C16 40.5 31.5 27.2 31.5 16C31.5 7.44 24.56 0.5 16 0.5Z" fill="#2D6A52" stroke="#FFFFFF" stroke-width="2.5"/>
        <circle cx="16" cy="15.5" r="5.5" fill="#E57B61" stroke="#FFFFFF" stroke-width="1.5"/>
      </svg>
    </div>
  `;

  return L.divIcon({
    html: svg,
    className: "cg-picker-icon",
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -height - 4],
  });
}
