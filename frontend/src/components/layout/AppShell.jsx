import { useEffect, useState } from "react";
import AppHeader from "./AppHeader";
import Sidebar from "./Sidebar";

export default function AppShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => { if (window.innerWidth > 900) setSidebarOpen(false); };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="app-shell-layout">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="app-shell-main">
        <AppHeader onMenuClick={() => setSidebarOpen(true)} />
        <main className="app-content">{children}</main>
      </div>
      {sidebarOpen && <button className="sidebar-backdrop" aria-label="Close menu" onClick={() => setSidebarOpen(false)} />}
    </div>
  );
}
