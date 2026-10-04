import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { homePathFor } from "../../lib/constants";
import LoadingState from "../ui/LoadingState";

/**
 * Routing convenience only. Real enforcement is requireAuth/requireRole on the
 * API; every data request is authorised server-side regardless of this guard.
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingState fullScreen />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to={homePathFor(user.role)} replace />;
  return children;
}
