import { useState } from "react";
import { Link } from "react-router-dom";
import Brand from "../components/Brand";
import Button from "../components/ui/Button";
import { Icon } from "../components/ui/Icons";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="cg-auth-layout">
      <aside className="cg-auth-aside">
        <div>
          <Brand variant="light" />
        </div>

        <div className="cg-aside-quote">
          <span className="cg-eyebrow" style={{ color: "#FDE68A" }}>Account Security</span>
          <h2>Recovering access to your civic profile.</h2>
          <p>
            Your account credentials safeguard your community contributions and service requests. If you run into issues, local administrators are on hand to help.
          </p>
        </div>

        <div className="cg-aside-footer">
          <Icon name="shield" size={16} />
          <span>Encrypted credential recovery</span>
        </div>
      </aside>

      <main className="cg-auth-panel">
        <div className="cg-auth-card">
          <div className="mobile-only" style={{ marginBottom: "24px" }}>
            <Brand />
          </div>

          <div className="cg-auth-header">
            <span className="cg-eyebrow">Account Recovery</span>
            <h1 className="cg-auth-title">Reset your password</h1>
            <p className="cg-auth-subtitle">
              Enter the email associated with your CommonGround account.
            </p>
          </div>

          {submitted ? (
            <div className="cg-card" style={{ padding: "24px", textAlign: "center" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  background: "var(--cg-soft-green)",
                  color: "var(--cg-primary-green)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                }}
              >
                <Icon name="check" size={24} />
              </div>
              <h3 style={{ marginBottom: "8px" }}>Reset Request Submitted</h3>
              <p className="cg-text-muted" style={{ fontSize: "14px", lineHeight: "1.6" }}>
                Password reset functionality is routed through your municipal service administrator. If an account matches <strong>{email}</strong>, instructions will be provided.
              </p>
              <Link
                to="/login"
                className="cg-btn cg-btn-primary"
                style={{ marginTop: "20px", display: "inline-flex" }}
              >
                Return to Sign in
              </Link>
            </div>
          ) : (
            <form className="cg-form-stack" onSubmit={handleSubmit}>
              <div className="cg-form-field">
                <label className="cg-field-label" htmlFor="forgot-email">
                  Email address <span className="cg-field-required">*</span>
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  className="cg-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                style={{ width: "100%", marginTop: "6px" }}
              >
                Request Password Reset
              </Button>

              <div className="cg-auth-links" style={{ justifyContent: "center" }}>
                <Link to="/login" className="cg-back-link" style={{ marginBottom: 0 }}>
                  <Icon name="arrow-left" size={14} />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}