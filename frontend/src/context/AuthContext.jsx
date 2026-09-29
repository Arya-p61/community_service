import { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";

const AuthContext = createContext(null);
const getStoredUser = () => { try { return JSON.parse(localStorage.getItem("user")); } catch { return null; } };

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser);
  const [loading, setLoading] = useState(Boolean(localStorage.getItem("access_token")));

  useEffect(() => {
    if (!localStorage.getItem("access_token")) { setLoading(false); return; }
    api.get("/auth/me/").then(({ data }) => { setUser(data); localStorage.setItem("user", JSON.stringify(data)); }).catch(() => logout()).finally(() => setLoading(false));
  }, []);

  const saveSession = (data) => { localStorage.setItem("access_token", data.access); localStorage.setItem("refresh_token", data.refresh); localStorage.setItem("user", JSON.stringify(data.user)); setUser(data.user); };
  const login = async (credentials) => { const { data } = await api.post("/auth/login/", credentials); saveSession(data); return data.user; };
  const register = async (payload) => (await api.post("/auth/register/", payload)).data;
  const logout = () => { localStorage.removeItem("access_token"); localStorage.removeItem("refresh_token"); localStorage.removeItem("user"); setUser(null); };
  const updateProfile = async (payload) => { const { data } = await api.patch("/auth/profile/", payload); setUser((current) => ({ ...current, ...data })); localStorage.setItem("user", JSON.stringify({ ...user, ...data })); return data; };
  return <AuthContext.Provider value={{ user, isAuthenticated: Boolean(user), loading, login, register, logout, updateProfile }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);