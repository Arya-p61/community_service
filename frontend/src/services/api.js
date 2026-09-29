import axios from "axios";

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000/api" });
let isRefreshing = false;
let waitingRequests = [];

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use((response) => response, async (error) => {
  const original = error.config;
  if (error.response?.status !== 401 || original._retry || original.url.includes("token/refresh")) return Promise.reject(error);
  const refresh = localStorage.getItem("refresh_token");
  if (!refresh) return Promise.reject(error);
  if (isRefreshing) return new Promise((resolve, reject) => waitingRequests.push({ resolve, reject })).then((token) => { original.headers.Authorization = `Bearer ${token}`; return api(original); });
  original._retry = true;
  isRefreshing = true;
  try {
    const response = await axios.post(`${api.defaults.baseURL}/auth/token/refresh/`, { refresh });
    localStorage.setItem("access_token", response.data.access);
    waitingRequests.forEach(({ resolve }) => resolve(response.data.access));
    waitingRequests = [];
    original.headers.Authorization = `Bearer ${response.data.access}`;
    return api(original);
  } catch (refreshError) {
    waitingRequests.forEach(({ reject }) => reject(refreshError));
    waitingRequests = [];
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    return Promise.reject(refreshError);
  } finally { isRefreshing = false; }
});

export default api;