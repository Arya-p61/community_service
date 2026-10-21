import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createRequest } from "../services/requestService";
import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { Icon } from "../components/ui/Icons";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function NewRequest() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    latitude: "",
    longitude: "",
  });
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const setField = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
  };

  const handleImageSelect = (event) => {
    const file = event.target.files?.[0] || null;
    if (!file) return;

    if (!IMAGE_TYPES.includes(file.type)) {
      setError("Supported file types are JPG, PNG, and WEBP.");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setError("Image size must be 5 MB or smaller.");
      return;
    }

    setError("");
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImage(null);
    setImagePreview("");
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Location capture is not supported by your browser.");
      return;
    }
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setForm((prev) => ({
          ...prev,
          latitude: coords.latitude.toFixed(6),
          longitude: coords.longitude.toFixed(6),
        }));
        setLocating(false);
      },
      (err) => {
        setError(`Unable to retrieve GPS coordinates: ${err.message}. You can enter them manually.`);
        setLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.title.trim()) {
      return setError("Please provide a title for the issue.");
    }
    if (!form.description.trim()) {
      return setError("Please provide a description of the issue.");
    }

    const payload = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      if (value !== "" && value !== null) {
        payload.append(key, value);
      }
    });
    if (image) {
      payload.append("image", image);
    }

    setBusy(true);
    try {
      const created = await createRequest(payload);
      navigate(`/citizen/requests/${created.id}`);
    } catch (err) {
      setError(
        err.response?.data?.detail || "Unable to submit your service request. Please check the form."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cg-new-request-page">
      <PageHeader
        backTo="/citizen/requests"
        backLabel="Back to My Requests"
        eyebrow="Civic Contribution"
        title="Report a Community Issue"
        description="Provide enough detail so municipal teams and AI classification can route and prioritize the issue accurately."
      />

      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: "28px", alignItems: "start" }}>
          {/* Main Form Fields */}
          <Card title="Issue Information" subtitle="Describe the issue and where it is located">
            {error && (
              <div className="cg-form-error" style={{ marginBottom: "20px" }}>
                <Icon name="alert-triangle" size={16} />
                <span>{error}</span>
              </div>
            )}

            <div className="cg-form-stack">
              <div className="cg-form-field">
                <label className="cg-field-label" htmlFor="issue-title">
                  Issue Title <span className="cg-field-required">*</span>
                  <span className="cg-field-hint">{form.title.length}/200 characters</span>
                </label>
                <input
                  id="issue-title"
                  type="text"
                  className="cg-input"
                  value={form.title}
                  onChange={setField("title")}
                  placeholder="e.g. Deep pothole on 4th Main Road, Streetlight not working"
                  maxLength={200}
                  required
                />
              </div>

              <div className="cg-form-field">
                <label className="cg-field-label" htmlFor="issue-description">
                  Description <span className="cg-field-required">*</span>
                  <span className="cg-field-hint">Explain the issue, impact and hazards</span>
                </label>
                <textarea
                  id="issue-description"
                  className="cg-textarea"
                  rows={5}
                  value={form.description}
                  onChange={setField("description")}
                  placeholder="What happened? When did you notice it? Is there an immediate hazard to pedestrians or traffic?"
                  required
                />
              </div>

              <div className="cg-form-field">
                <label className="cg-field-label" htmlFor="issue-location">
                  Street Address / Landmark
                  <span className="cg-field-hint">e.g. Near Community Center, Sector 4</span>
                </label>
                <div className="cg-input-with-icon">
                  <span className="cg-input-icon-left">
                    <Icon name="location" size={16} />
                  </span>
                  <input
                    id="issue-location"
                    type="text"
                    className="cg-input"
                    value={form.location}
                    onChange={setField("location")}
                    placeholder="Enter street address or notable landmark"
                  />
                </div>
              </div>

              {/* Coordinates */}
              <div style={{ borderTop: "1px solid var(--cg-border-light)", paddingTop: "18px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                  <div>
                    <h4 style={{ fontSize: "14px", fontWeight: 600 }}>GPS Coordinates <span style={{ fontWeight: 400, color: "var(--cg-text-muted)" }}>(Optional)</span></h4>
                    <p style={{ fontSize: "12px", color: "var(--cg-text-secondary)" }}>Helps field inspection teams locate the exact spot</p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleGetCurrentLocation}
                    loading={locating}
                    icon={<Icon name="target" size={14} />}
                  >
                    Use GPS Location
                  </Button>
                </div>

                <div className="cg-form-row">
                  <div className="cg-form-field">
                    <label className="cg-field-label" htmlFor="latitude">Latitude</label>
                    <input
                      id="latitude"
                      type="number"
                      step="any"
                      className="cg-input"
                      value={form.latitude}
                      onChange={setField("latitude")}
                      placeholder="e.g. 12.971598"
                    />
                  </div>
                  <div className="cg-form-field">
                    <label className="cg-field-label" htmlFor="longitude">Longitude</label>
                    <input
                      id="longitude"
                      type="number"
                      step="any"
                      className="cg-input"
                      value={form.longitude}
                      onChange={setField("longitude")}
                      placeholder="e.g. 77.594562"
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Sidebar: Photo Evidence & Submission Guidance */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <Card title="Photo Evidence" subtitle="Attach photographic proof (Max 5 MB)">
              {imagePreview ? (
                <div style={{ position: "relative", borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--cg-border)" }}>
                  <img
                    src={imagePreview}
                    alt="Uploaded issue evidence"
                    style={{ width: "100%", maxHeight: "220px", objectFit: "cover", display: "block" }}
                  />
                  <div
                    style={{
                      padding: "10px 14px",
                      background: "rgba(255, 255, 255, 0.95)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: "12px",
                    }}
                  >
                    <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "160px" }}>
                      {image.name}
                    </span>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="cg-text-btn-sm"
                      style={{ color: "var(--cg-error)" }}
                    >
                      Remove photo
                    </button>
                  </div>
                </div>
              ) : (
                <label
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "32px 18px",
                    borderRadius: "var(--radius-md)",
                    border: "2px dashed var(--cg-border)",
                    backgroundColor: "#F9FBF8",
                    cursor: "pointer",
                    textAlign: "center",
                    transition: "all 0.16s ease",
                  }}
                  onDragOver={(e) => e.preventDefault()}
                >
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                    style={{ display: "none" }}
                    onChange={handleImageSelect}
                  />
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "50%",
                      background: "var(--cg-soft-green)",
                      color: "var(--cg-primary-green)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: "10px",
                    }}
                  >
                    <Icon name="camera" size={22} />
                  </div>
                  <strong style={{ fontSize: "14px", color: "var(--cg-text-main)", marginBottom: "4px" }}>
                    Click to select photo
                  </strong>
                  <span style={{ fontSize: "12px", color: "var(--cg-text-secondary)" }}>
                    JPG, PNG, or WEBP up to 5 MB
                  </span>
                </label>
              )}
            </Card>

            <Card eyebrow="Automatic Processing" title="AI Classification">
              <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <div style={{ color: "var(--cg-coral)", marginTop: "2px" }}>
                  <Icon name="sparkles" size={18} />
                </div>
                <p style={{ fontSize: "13px", color: "var(--cg-text-secondary)", lineHeight: "1.55" }}>
                  After submission, CommonGround's AI assistant evaluates the issue severity, assigns an urgency priority, and routes the request to the correct department.
                </p>
              </div>
            </Card>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={busy}
              style={{ width: "100%" }}
            >
              Submit Community Request
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
