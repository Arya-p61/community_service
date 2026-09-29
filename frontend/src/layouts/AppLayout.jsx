import { Link, Outlet, useNavigate } from "react-router-dom";
import Brand from "../components/Brand";
import { useAuth } from "../context/AuthContext";

export default function AppLayout() {
  const { user, logout } = useAuth(); const navigate = useNavigate();
  const signOut = () => { logout(); navigate("/login"); };
  return <div className="app-shell"><header className="topbar"><Brand /><div className="topbar-right"><span className="user-chip"><span className="avatar">{user.name?.charAt(0)}</span><span className="user-name">{user.name}</span></span><button className="button button-ghost" onClick={signOut}>Sign out</button></div></header><main className="page-wrap"><Outlet /></main></div>;
}