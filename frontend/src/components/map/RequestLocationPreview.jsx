import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./Map.css";
import { createStatusIcon } from "./mapIcons";
import { Icon } from "../ui/Icons";

export default function RequestLocationPreview({
  latitude,
  longitude,
  location,
  status = "SUBMITTED",
  title = "Issue Location",
}) {
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  if (isNaN(lat) || isNaN(lng)) {
    return null;
  }

  const position = [lat, lng];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <div className="cg-map-preview">
        <MapContainer
          center={position}
          zoom={15}
          scrollWheelZoom={false}
          style={{ width: "100%", height: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
          <Marker position={position} icon={createStatusIcon(status)}>
            <Popup>
              <div style={{ padding: "6px 8px", fontSize: "12px" }}>
                <strong>{title}</strong>
                {location && <p style={{ margin: "4px 0 0 0", color: "#66766F" }}>{location}</p>}
                <p style={{ margin: "4px 0 0 0", fontSize: "11px", color: "#8E9C96" }}>
                  {lat.toFixed(6)}, {lng.toFixed(6)}
                </p>
              </div>
            </Popup>
          </Marker>
        </MapContainer>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px", color: "var(--cg-text-secondary)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Icon name="location" size={14} />
          <span>Coordinates: <strong>{lat.toFixed(6)}, {lng.toFixed(6)}</strong></span>
        </div>
        <a
          href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--cg-primary-green)", textDecoration: "underline", fontSize: "11px" }}
        >
          Open in OpenStreetMap &rarr;
        </a>
      </div>
    </div>
  );
}
