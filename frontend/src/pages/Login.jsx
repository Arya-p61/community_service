import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Brand from "../components/Brand";
import { useAuth } from "../context/AuthContext";
import Button from "../components/ui/Button";
import { Icon } from "../components/ui/Icons";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const registeredNotice = location.state?.registered;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setBusy(true);

    try {
      const user = await login(form);
      const destination = location.state?.from?.pathname || `/${user.role}/dashboard`;
      navigate(destination, { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.detail || "We couldn't sign you in. Please check your email and password."
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
          <span className="cg-eyebrow" style={{ color: "#FDE68A" }}>Civic Care in Action</span>
          <h2>A direct connection to your city services.</h2>
          <p>
            CommonGround bridges the gap between residents and municipal departments. Report issues, follow live updates, and help shape your community.
          </p>
        </div>

        <div className="cg-aside-footer">
          <Icon name="shield" size={16} />
          <span>Official municipal resolution platform</span>
        </div>
      </aside>

      <main className="cg-auth-panel">
        <div className="cg-auth-card">
          <div className="mobile-only" style={{ marginBottom: "24px" }}>
            <Brand />
          </div>

          <div className="cg-auth-header">
            <span className="cg-eyebrow">Welcome back</span>
            <h1 className="cg-auth-title">Sign in to your account</h1>
            <p className="cg-auth-subtitle">
              Enter your credentials to access your civic workspace.
            </p>
          </div>

          {registeredNotice && (
            <div className="cg-form-success" style={{ marginBottom: "20px" }}>
              <Icon name="check-circle" size={16} />
              <span>Account created successfully! Please sign in below.</span>
            </div>
          )}

          {error && (
            <div className="cg-form-error" style={{ marginBottom: "20px" }}>
              <Icon name="alert-triangle" size={16} />
              <span>{error}</span>
            </div>
          )}

          <form className="cg-form-stack" onSubmit={handleSubmit}>
            <div className="cg-form-field">
              <label className="cg-field-label" htmlFor="login-email">
                Email address <span className="cg-field-required">*</span>
              </label>
              <div className="cg-input-with-icon">
                <span className="cg-input-icon-left">
                  <Icon name="search" size={16} style={{ display: "none" }} />
                </span>
                <input
                  id="login-email"
                  type="email"
                  className="cg-input"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="name@example.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="cg-form-field">
              <div className="cg-field-label">
                <label htmlFor="login-password">
                  Password <span className="cg-field-required">*</span>
                </label>
                <Link
                  to="/forgot-password"
                  className="cg-field-hint"
                  style={{ color: "var(--cg-primary-green)", fontWeight: 500 }}
                >
                  Forgot password?
                </Link>
              </div>
              <div className="cg-input-with-icon">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  className="cg-input"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
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

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={busy}
              style={{ width: "100%", marginTop: "6px" }}
            >
              Sign in to CommonGround
            </Button>

            <div className="cg-auth-links" style={{ justifyContent: "center", gap: "6px" }}>
              <span>Don't have an account yet?</span>
              <Link to="/register">Create an account</Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}