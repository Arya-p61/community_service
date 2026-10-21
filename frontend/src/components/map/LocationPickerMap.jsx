import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./Map.css";
import { createPickerIcon } from "./mapIcons";
import { reverseGeocode } from "../../services/reverseGeocode";
import Button from "../ui/Button";
import { Icon } from "../ui/Icons";

const DEFAULT_CENTER = [9.41205, 76.7094]; // Default community coordinates
const DEFAULT_ZOOM = 14;

// Leaflet map event listener for click-to-select
function ClickSelector({ onSelect }) {
  useMapEvents({
    click(e) {
      if (e && e.latlng) {
        onSelect(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

// Controller to smoothly fly/pan map when coordinates update via GPS or manual input
function MapViewUpdater({ target, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (target && target[0] != null && target[1] != null && !isNaN(target[0]) && !isNaN(target[1])) {
      map.setView(target, zoom || 15, { animate: true });
    }
  }, [map, target, zoom]);
  return null;
}

export default function LocationPickerMap({
  latitude,
  longitude,
  onLocationChange,
  onAddressDetected,
  addressValue,
  readOnly = false,
}) {
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState("");
  const [geocoding, setGeocoding] = useState(false);
  const [detectedAddress, setDetectedAddress] = useState("");
  const [centerTarget, setCenterTarget] = useState(null);

  const parsedLat = latitude !== "" && latitude !== null && !isNaN(Number(latitude)) ? Number(latitude) : null;
  const parsedLng = longitude !== "" && longitude !== null && !isNaN(Number(longitude)) ? Number(longitude) : null;
  const hasCoordinates = parsedLat !== null && parsedLng !== null;

  const markerPosition = useMemo(() => {
    if (hasCoordinates) {
      return [parsedLat, parsedLng];
    }
    return null;
  }, [hasCoordinates, parsedLat, parsedLng]);

  // Initial center
  const initialCenter = hasCoordinates ? [parsedLat, parsedLng] : DEFAULT_CENTER;
  const initialZoom = hasCoordinates ? 15 : DEFAULT_ZOOM;

  // Debounced reverse geocoding when coordinates change
  const geocodeTimerRef = useRef(null);
  useEffect(() => {
    if (!hasCoordinates) {
      setDetectedAddress("");
      return;
    }

    if (geocodeTimerRef.current) {
      clearTimeout(geocodeTimerRef.current);
    }

    geocodeTimerRef.current = setTimeout(async () => {
      setGeocoding(true);
      try {
        const result = await reverseGeocode(parsedLat, parsedLng);
        if (result && result.address) {
          setDetectedAddress(result.address);
          // If address field is currently empty, proactively notify parent
          if (!addressValue && onAddressDetected) {
            onAddressDetected(result.address, true);
          }
        } else {
          setDetectedAddress("");
        }
      } catch {
        setDetectedAddress("");
      } finally {
        setGeocoding(false);
      }
    }, 600);

    return () => {
      if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
    };
  }, [hasCoordinates, parsedLat, parsedLng]);

  // Handle click or drag selection
  const handleSelectCoords = (lat, lng) => {
    if (readOnly) return;
    setGeoError("");
    const formattedLat = Number(lat).toFixed(6);
    const formattedLng = Number(lng).toFixed(6);
    onLocationChange(formattedLat, formattedLng);
  };

  // Browser Geolocation on user action
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser. Please select a spot on the map.");
      return;
    }

    setLocating(true);
    setGeoError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));
        handleSelectCoords(lat, lng);
        setCenterTarget([lat, lng]);
        setLocating(false);
      },
      (err) => {
        let msg = "Unable to retrieve your location. You can select the issue location on the map.";
        if (err.code === 1) {
          msg = "Location access was denied. You can still select the issue location manually on the map.";
        } else if (err.code === 2) {
          msg = "Position unavailable. Please click on the map to set the location.";
        } else if (err.code === 3) {
          msg = "Location request timed out. Please click on the map to place a pin.";
        }
        setGeoError(msg);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  const handleClearLocation = () => {
    if (readOnly) return;
    setGeoError("");
    setDetectedAddress("");
    onLocationChange("", "");
  };

  const handleApplyDetectedAddress = () => {
    if (detectedAddress && onAddressDetected) {
      onAddressDetected(detectedAddress, false);
    }
  };

  return (
    <div className="cg-location-picker-component" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {/* Header Toolbar */}
      <div className="cg-location-picker-header">
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <h4 style={{ fontSize: "14px", fontWeight: 600, color: "var(--cg-text-main)" }}>
            Map Issue Location <span style={{ fontWeight: 400, color: "var(--cg-text-muted)" }}>(Interactive)</span>
          </h4>
          <span style={{ fontSize: "12px", color: "var(--cg-text-secondary)" }}>
            Click anywhere on the map or drag the pin to mark the issue spot
          </span>
        </div>

        {!readOnly && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleUseCurrentLocation}
            loading={locating}
            icon={<Icon name="target" size={14} />}
          >
            Use my current location
          </Button>
        )}
      </div>

      {/* Geolocation feedback / error message */}
      {geoError && (
        <div className="cg-form-error" style={{ fontSize: "12px", padding: "8px 12px" }}>
          <Icon name="alert-triangle" size={15} />
          <span>{geoError}</span>
        </div>
      )}

      {/* Selected Location Pill */}
      <div className={`cg-location-picker-indicator ${!hasCoordinates ? "cg-location-picker-empty" : ""}`}>
        <Icon name={hasCoordinates ? "check-circle" : "location"} size={16} />
        {hasCoordinates ? (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", width: "100%" }}>
            <span>
              <strong>Selected:</strong> {parsedLat.toFixed(6)}, {parsedLng.toFixed(6)}
            </span>
            {geocoding && (
              <span className="cg-text-muted" style={{ fontSize: "11px", fontStyle: "italic" }}>
                (Looking up address...)
              </span>
            )}
            {!readOnly && (
              <button
                type="button"
                className="cg-location-clear-btn"
                onClick={handleClearLocation}
                title="Remove GPS coordinates from request"
              >
                Clear pin
              </button>
            )}
          </div>
        ) : (
          <span>No map coordinates selected yet. Click the map to place a pin.</span>
        )}
      </div>

      {/* Reverse Geocoding Address Suggestion Pill */}
      {detectedAddress && (!addressValue || addressValue.trim() !== detectedAddress.trim()) && (
        <div className="cg-reverse-geocode-chip">
          <Icon name="location" size={14} />
          <span>
            Detected street address: <strong>{detectedAddress}</strong>
          </span>
          {!readOnly && (
            <button type="button" onClick={handleApplyDetectedAddress}>
              Use this address
            </button>
          )}
        </div>
      )}

      {/* Interactive Map */}
      <div className="cg-map-container-wrapper">
        <MapContainer
          center={initialCenter}
          zoom={initialZoom}
          scrollWheelZoom={false}
          className="cg-map-container"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />

          {!readOnly && <ClickSelector onSelect={handleSelectCoords} />}
          {centerTarget && <MapViewUpdater target={centerTarget} />}

          {markerPosition && (
            <Marker
              position={markerPosition}
              icon={createPickerIcon()}
              draggable={!readOnly}
              eventHandlers={{
                dragend: (e) => {
                  const marker = e.target;
                  if (marker) {
                    const pos = marker.getLatLng();
                    handleSelectCoords(pos.lat, pos.lng);
                  }
                },
              }}
            />
          )}
        </MapContainer>
      </div>
    </div>
  );
}
