import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./Map.css";
import { createStatusIcon } from "./mapIcons";
import { StatusBadge, PriorityBadge } from "../ui/Badge";
import { Icon } from "../ui/Icons";

const DEFAULT_CENTER = [9.41205, 76.7094];
const DEFAULT_ZOOM = 13;

// Auto-adjust map bounds to frame all current markers
function MapBoundsFitter({ items }) {
  const map = useMap();

  useEffect(() => {
    if (!items || items.length === 0) return;

    const validPoints = items
      .filter((r) => r.latitude != null && r.longitude != null && !isNaN(r.latitude) && !isNaN(r.longitude))
      .map((r) => [Number(r.latitude), Number(r.longitude)]);

    if (validPoints.length === 1) {
      map.setView(validPoints[0], 15, { animate: true });
    } else if (validPoints.length > 1) {
      try {
        map.fitBounds(validPoints, { padding: [40, 40], maxZoom: 16, animate: true });
      } catch {
        // Fallback if bounds calculation fails
      }
    }
  }, [map, items]);

  return null;
}

export default function RequestsMapView({
  requests = [],
  detailBasePath = "/citizen/requests",
  role = "citizen",
  emptyMessage = "No requests with GPS coordinates found for the current filters.",
}) {
  const [selectedId, setSelectedId] = useState(null);

  // Filter requests that have valid numerical coordinates
  const geolocatedRequests = useMemo(() => {
    return requests.filter((r) => {
      const lat = parseFloat(r.latitude);
      const lng = parseFloat(r.longitude);
      return (
        !isNaN(lat) &&
        !isNaN(lng) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180 &&
        (lat !== 0 || lng !== 0) // Avoid (0, 0) placeholder coords in middle of the ocean
      );
    });
  }, [requests]);

  const requestsWithoutCoords = requests.length - geolocatedRequests.length;

  const initialCenter = useMemo(() => {
    if (geolocatedRequests.length > 0) {
      return [Number(geolocatedRequests[0].latitude), Number(geolocatedRequests[0].longitude)];
    }
    return DEFAULT_CENTER;
  }, [geolocatedRequests]);

  return (
    <div className="cg-requests-map-view">
      {/* Map Summary Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          padding: "10px 14px",
          background: "var(--cg-white)",
          border: "1px solid var(--cg-border)",
          borderBottom: "none",
          borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
          fontSize: "12px",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Icon name="location" size={15} />
          <span>
            Showing <strong>{geolocatedRequests.length}</strong> geolocated{" "}
            {geolocatedRequests.length === 1 ? "issue" : "issues"} on map
          </span>
          {requestsWithoutCoords > 0 && (
            <span className="cg-text-muted">
              ({requestsWithoutCoords} {requestsWithoutCoords === 1 ? "request" : "requests"} without coordinates shown in list view)
            </span>
          )}
        </div>

        <span className="cg-text-muted" style={{ fontSize: "11px" }}>
          Click any pin to inspect details
        </span>
      </div>

      {/* Map Container */}
      <div
        className="cg-map-container-wrapper"
        style={{ borderRadius: "0", borderTop: "none", borderBottom: "none" }}
      >
        <MapContainer
          center={initialCenter}
          zoom={DEFAULT_ZOOM}
          scrollWheelZoom={false}
          className="cg-map-container"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />

          <MapBoundsFitter items={geolocatedRequests} />

          {geolocatedRequests.map((req) => {
            const isSelected = selectedId === req.id;
            return (
              <Marker
                key={req.id}
                position={[Number(req.latitude), Number(req.longitude)]}
                icon={createStatusIcon(req.status, isSelected)}
                eventHandlers={{
                  click: () => setSelectedId(req.id),
                }}
              >
                <Popup>
                  <div className="cg-map-popup-card">
                    <div className="cg-map-popup-header">
                      <span className="cg-map-popup-id">
                        REQ-{String(req.id).padStart(3, "0")}
                      </span>
                      <StatusBadge status={req.status} />
                    </div>

                    <h4 className="cg-map-popup-title">{req.title}</h4>

                    {req.location && (
                      <div className="cg-map-popup-location">
                        <Icon name="location" size={13} />
                        <span>{req.location}</span>
                      </div>
                    )}

                    <div className="cg-map-popup-meta">
                      {req.priority && (
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <span className="cg-text-muted" style={{ fontSize: "11px" }}>Priority:</span>
                          <PriorityBadge priority={req.priority} />
                        </div>
                      )}

                      {req.category && (
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <span className="cg-text-muted" style={{ fontSize: "11px" }}>Category:</span>
                          <span style={{ fontSize: "12px", fontWeight: 600 }}>{req.category}</span>
                        </div>
                      )}

                      {req.department_name && role !== "officer" && (
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <span className="cg-text-muted" style={{ fontSize: "11px" }}>Dept:</span>
                          <span style={{ fontSize: "12px", color: "var(--cg-deep-green)" }}>{req.department_name}</span>
                        </div>
                      )}
                    </div>

                    <Link
                      to={`${detailBasePath}/${req.id}`}
                      className="cg-map-popup-action"
                    >
                      <span>View Full Details</span>
                      <Icon name="arrow-right" size={13} />
                    </Link>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Legend Bar */}
      <div className="cg-map-legend-bar">
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <strong style={{ color: "var(--cg-text-main)" }}>Status Legend:</strong>
        </div>
        <div className="cg-map-legend-items">
          <div className="cg-map-legend-item">
            <span className="cg-map-legend-dot" style={{ backgroundColor: "#3182CE" }} />
            <span>Submitted</span>
          </div>
          <div className="cg-map-legend-item">
            <span className="cg-map-legend-dot" style={{ backgroundColor: "#DD6B20" }} />
            <span>Pending Review</span>
          </div>
          <div className="cg-map-legend-item">
            <span className="cg-map-legend-dot" style={{ backgroundColor: "#2D6A52" }} />
            <span>In Progress</span>
          </div>
          <div className="cg-map-legend-item">
            <span className="cg-map-legend-dot" style={{ backgroundColor: "#38A169" }} />
            <span>Resolved</span>
          </div>
          <div className="cg-map-legend-item">
            <span className="cg-map-legend-dot" style={{ backgroundColor: "#718096" }} />
            <span>Closed</span>
          </div>
        </div>
      </div>

      {geolocatedRequests.length === 0 && (
        <div
          style={{
            padding: "24px",
            textAlign: "center",
            background: "var(--cg-white)",
            border: "1px solid var(--cg-border)",
            borderTop: "none",
            borderRadius: "0 0 var(--radius-lg) var(--radius-lg)",
            color: "var(--cg-text-secondary)",
            fontSize: "13px",
          }}
        >
          <Icon name="location" size={24} style={{ margin: "0 auto 8px auto", display: "block", color: "var(--cg-text-muted)" }} />
          <p>{emptyMessage}</p>
        </div>
      )}
    </div>
  );
}
