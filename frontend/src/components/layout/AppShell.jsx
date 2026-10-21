import { useEffect, useState } from "react";
import AppHeader from "./AppHeader";
import Sidebar from "./Sidebar";

export default function AppShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 960) {
        setSidebarOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className="cg-app-shell">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="cg-app-main">
        <AppHeader onMenuClick={() => setSidebarOpen(true)} />
        <main className="cg-main-content">
          <div className="cg-page-container">{children}</div>
        </main>
      </div>
      {sidebarOpen && (
        <div
          className="cg-sidebar-backdrop"
          aria-label="Close navigation overlay"
          role="button"
          tabIndex={0}
          onClick={() => setSidebarOpen(false)}
          onKeyDown={(e) => e.key === "Enter" && setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
