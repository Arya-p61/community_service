import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./layouts/AppLayout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import RequestList from "./pages/RequestList";
import NewRequest from "./pages/NewRequest";
import RequestDetail from "./pages/RequestDetail";
import OfficerDashboard from "./pages/OfficerDashboard";
import OfficerRequests from "./pages/OfficerRequests";
import OfficerRequestDetail from "./pages/OfficerRequestDetail";
import AdminDepartments from "./pages/AdminDepartments";
import AdminOfficers from "./pages/AdminOfficers";

function Home() { const { user } = useAuth(); return <Navigate to={user ? `/${user.role}/dashboard` : "/login"} replace />; }
export default function App() { return <Routes><Route path="/" element={<Home />} /><Route path="/login" element={<Login />} /><Route path="/register" element={<Register />} /><Route path="/forgot-password" element={<ForgotPassword />} /><Route element={<ProtectedRoute />}><Route element={<AppLayout />}><Route path="/profile" element={<Profile />} /></Route></Route><Route element={<ProtectedRoute roles={["citizen"]} />}><Route element={<AppLayout />}><Route path="/citizen/dashboard" element={<Dashboard />} /><Route path="/citizen/requests" element={<RequestList />} /><Route path="/citizen/requests/new" element={<NewRequest />} /><Route path="/citizen/requests/:id" element={<RequestDetail />} /></Route></Route><Route element={<ProtectedRoute roles={["officer"]} />}><Route element={<AppLayout />}><Route path="/officer/dashboard" element={<OfficerDashboard />} /><Route path="/officer/requests" element={<OfficerRequests />} /><Route path="/officer/requests/:id" element={<OfficerRequestDetail />} /></Route></Route><Route element={<ProtectedRoute roles={["admin"]} />}><Route element={<AppLayout />}><Route path="/admin/dashboard" element={<Dashboard />} /><Route path="/admin/departments" element={<AdminDepartments />} /><Route path="/admin/officers" element={<AdminOfficers />} /></Route></Route><Route path="*" element={<Home />} /></Routes>; }