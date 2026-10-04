import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./services/queryClient";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastProvider } from "./context/ToastContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { homePathFor } from "./lib/constants";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import SplashScreen from "./components/ui/SplashScreen";
import AppLayout from "./components/layout/AppLayout";
import Login from "./pages/auth/Login";
import Dashboard from "./pages/admin/Dashboard";
import StaffList from "./pages/admin/StaffList";
import StaffDetail from "./pages/admin/StaffDetail";
import ClientList from "./pages/admin/ClientList";
import ClientDetail from "./pages/admin/ClientDetail";
import Works from "./pages/admin/Works";
import WorkDetail from "./pages/admin/WorkDetail";
import Activity from "./pages/admin/Activity";
import Settings from "./pages/admin/Settings";
import StaffDashboard from "./pages/staff/StaffDashboard";
import MyWorks from "./pages/staff/MyWorks";
import StaffWorkDetail from "./pages/staff/StaffWorkDetail";
import Profile from "./pages/shared/Profile";
import Calendar from "./pages/shared/Calendar";
import Notifications from "./pages/shared/Notifications";

function RootRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? homePathFor(user.role) : "/login"} replace />;
}

function AppShell() {
  const { loading } = useAuth();
  return (
    <>
      <SplashScreen show={loading} />
      {!loading && (
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]}><AppLayout role="admin" /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="staff" element={<StaffList />} />
            <Route path="staff/:id" element={<StaffDetail />} />
            <Route path="clients" element={<ClientList />} />
            <Route path="clients/:id" element={<ClientDetail />} />
            <Route path="works" element={<Works />} />
            <Route path="works/:id" element={<WorkDetail />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="activity" element={<Activity />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          <Route path="/staff" element={<ProtectedRoute allowedRoles={["staff"]}><AppLayout role="staff" /></ProtectedRoute>}>
            <Route index element={<StaffDashboard />} />
            <Route path="works" element={<MyWorks />} />
            <Route path="works/:id" element={<StaffWorkDetail />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="profile" element={<Profile />} />
          </Route>

          <Route path="*" element={<RootRedirect />} />
        </Routes>
      )}
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <BrowserRouter>
              <AppShell />
            </BrowserRouter>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
