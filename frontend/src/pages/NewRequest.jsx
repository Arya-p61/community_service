import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createRequest } from "../services/requestService";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function NewRequest() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: "", description: "", location: "", latitude: "", longitude: "" });
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => () => imagePreview && URL.revokeObjectURL(imagePreview), [imagePreview]);

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const selectImage = (event) => {
    const selected = event.target.files?.[0] || null;
    if (!selected) return;
    if (!IMAGE_TYPES.includes(selected.type)) return setError("Choose a JPG, PNG, or WEBP image.");
    if (selected.size > MAX_IMAGE_SIZE) return setError("Image must be 5 MB or smaller.");
    setError("");
    setImage(selected);
    setImagePreview(URL.createObjectURL(selected));
  };

  const useLocation = () => {
    if (!navigator.geolocation) {
      setError("Location capture is not supported by this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setForm((current) => ({ ...current, latitude: coords.latitude.toFixed(6), longitude: coords.longitude.toFixed(6) })),
      () => setError("We could not access your location. You can enter coordinates manually."),
    );
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!form.title.trim() || !form.description.trim()) return setError("Title and description are required.");
    const body = new FormData();
    Object.entries(form).forEach(([key, value]) => value !== "" && body.append(key, value));
    if (image) body.append("image", image);
    setBusy(true);
    try {
      const request = await createRequest(body);
      navigate(`/citizen/requests/${request.id}`);
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "Unable to submit this request. Please check the form.");
    } finally {
      setBusy(false);
    }
  };

  return <div className="request-form-page">
    <Link className="back-link" to="/citizen/requests">&larr; Back to my requests</Link>
    <div className="page-heading compact-heading"><div><p className="eyebrow">Make a difference</p><h1>Report a community issue</h1><p>Give your local service team enough detail to understand what is happening.</p></div></div>
    <form className="request-form" onSubmit={submit}>
      <div className="request-form-main">
        <Field label="Issue title" value={form.title} onChange={set("title")} placeholder="Broken streetlight" required maxLength={200} />
        <label className="field"><span>Describe the issue</span><textarea value={form.description} onChange={set("description")} placeholder="What happened, and how is it affecting the community?" rows="6" required /></label>
        <Field label="Location" value={form.location} onChange={set("location")} placeholder="College Main Gate" />
        <div className="coordinates-heading"><span className="field-heading">Coordinates <small>optional</small></span><button type="button" className="location-button" onClick={useLocation}>&#8981; Use current location</button></div>
        <div className="form-grid"><Field label="Latitude" type="number" value={form.latitude} onChange={set("latitude")} placeholder="9.12345" step="any" /><Field label="Longitude" type="number" value={form.longitude} onChange={set("longitude")} placeholder="76.12345" step="any" /></div>
      </div>
      <aside className="request-form-aside">
        <label className="upload-box"><span className="upload-icon">&uarr;</span><strong>Attach a photo</strong><span>{image ? image.name : "JPG, PNG, or WEBP - up to 5 MB"}</span><input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={selectImage} />{imagePreview && <img src={imagePreview} alt="Selected evidence preview" style={{ width: "100%", maxHeight: 180, objectFit: "cover", borderRadius: 8 }} />}</label>
        {error && <p className="form-error">{error}</p>}
        <button className="button button-primary button-wide" disabled={busy}>{busy ? <><span className="spinner spinner-light" />Submitting...</> : "Submit request"}</button>
        <p className="form-caption">Your request will be visible to the service team responsible for your community.</p>
      </aside>
    </form>
  </div>;
}

function Field({ label, type = "text", value, onChange, placeholder, required, maxLength, step }) {
  return <label className="field"><span>{label}{required && <small> required</small>}</span><input type={type} value={value} onChange={onChange} placeholder={placeholder} required={required} maxLength={maxLength} step={step} /></label>;
}
