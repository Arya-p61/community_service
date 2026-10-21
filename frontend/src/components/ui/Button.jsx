export default function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  loading = false,
  disabled = false,
  icon = null,
  type = "button",
  ...props
}) {
  const classes = [
    "cg-btn",
    `cg-btn-${variant}`,
    `cg-btn-${size}`,
    loading ? "is-loading" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="cg-spinner cg-spinner-sm" aria-hidden="true" />
      ) : icon ? (
        <span className="cg-btn-icon" aria-hidden="true">{icon}</span>
      ) : null}
      <span>{children}</span>
    </button>
  );
}
