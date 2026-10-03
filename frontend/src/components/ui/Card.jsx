export default function Card({ children, className = "", ...props }) {
  return <div className={['ui-card', className].filter(Boolean).join(' ')} {...props}>{children}</div>;
}
