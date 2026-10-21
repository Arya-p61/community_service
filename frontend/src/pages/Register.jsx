import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Brand from "../components/Brand";
import { useAuth } from "../context/AuthContext";
import Button from "../components/ui/Button";
import { Icon } from "../components/ui/Icons";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirm_password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const setField = (key) => (event) => {
    setForm({ ...form, [key]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (form.password.length < 8) {
      return setError("Password must be at least 8 characters long.");
    }
    if (form.password !== form.confirm_password) {
      return setError("Passwords do not match. Please verify both fields.");
    }

    setBusy(true);
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
      });
      navigate("/login", { state: { registered: true } });
    } catch (err) {
      const data = err.response?.data;
      setError(
        data?.detail ||
          data?.email?.[0] ||
          data?.password?.[0] ||
          "Could not complete registration. Please check your details."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cg-auth-layout">
      <aside className="cg-auth-aside">
        <div>
          <Brand variant="light" />
        </div>

        <div className="cg-aside-quote">
          <span className="cg-eyebrow" style={{ color: "#FDE68A" }}>Join The Commons</span>
          <h2>Your neighborhood needs your voice.</h2>
          <p>
            When residents report local issues, service teams can respond faster and deploy resources effectively. Start tracking community progress on your street.
          </p>
        </div>

        <div className="cg-aside-footer">
          <Icon name="check-circle" size={16} />
          <span>Citizen registrations are free, open & secure</span>
        </div>
      </aside>

      <main className="cg-auth-panel">
        <div className="cg-auth-card">
          <div className="mobile-only" style={{ marginBottom: "24px" }}>
            <Brand />
          </div>

          <div className="cg-auth-header">
            <span className="cg-eyebrow">Citizen Registration</span>
            <h1 className="cg-auth-title">Create your account</h1>
            <p className="cg-auth-subtitle">
              Join CommonGround to report local issues and follow resolutions.
            </p>
          </div>

          {error && (
            <div className="cg-form-error" style={{ marginBottom: "20px" }}>
              <Icon name="alert-triangle" size={16} />
              <span>{error}</span>
            </div>
          )}

          <form className="cg-form-stack" onSubmit={handleSubmit}>
            <div className="cg-form-field">
              <label className="cg-field-label" htmlFor="register-name">
                Full name <span className="cg-field-required">*</span>
              </label>
              <input
                id="register-name"
                type="text"
                className="cg-input"
                value={form.name}
                onChange={setField("name")}
                placeholder="Jane Doe"
                required
                autoComplete="name"
              />
            </div>

            <div className="cg-form-row">
              <div className="cg-form-field">
                <label className="cg-field-label" htmlFor="register-email">
                  Email address <span className="cg-field-required">*</span>
                </label>
                <input
                  id="register-email"
                  type="email"
                  className="cg-input"
                  value={form.email}
                  onChange={setField("email")}
                  placeholder="jane@example.com"
                  required
                  autoComplete="email"
                />
              </div>

              <div className="cg-form-field">
                <label className="cg-field-label" htmlFor="register-phone">
                  Phone number <span className="cg-field-required">*</span>
                </label>
                <input
                  id="register-phone"
                  type="tel"
                  className="cg-input"
                  value={form.phone}
                  onChange={setField("phone")}
                  placeholder="9876543210"
                  required
                  autoComplete="tel"
                />
              </div>
            </div>

            <div className="cg-form-row">
              <div className="cg-form-field">
                <label className="cg-field-label" htmlFor="register-password">
                  Password <span className="cg-field-required">*</span>
                </label>
                <div className="cg-input-with-icon">
                  <input
                    id="register-password"
                    type={showPassword ? "text" : "password"}
                    className="cg-input"
                    value={form.password}
                    onChange={setField("password")}
                    placeholder="Min 8 characters"
                    minLength={8}
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="cg-input-icon-right-btn"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    <Icon name={showPassword ? "eye-off" : "eye"} size={16} />
                  </button>
                </div>
              </div>

              <div className="cg-form-field">
                <label className="cg-field-label" htmlFor="register-confirm">
                  Confirm password <span className="cg-field-required">*</span>
                </label>
                <input
                  id="register-confirm"
                  type={showPassword ? "text" : "password"}
                  className="cg-input"
                  value={form.confirm_password}
                  onChange={setField("confirm_password")}
                  placeholder="Repeat password"
                  minLength={8}
                  required
                  autoComplete="new-password"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={busy}
              style={{ width: "100%", marginTop: "6px" }}
            >
              Create Citizen Account
            </Button>

            <div className="cg-auth-links" style={{ justifyContent: "center", gap: "6px" }}>
              <span>Already registered?</span>
              <Link to="/login">Sign in here</Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}