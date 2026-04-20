import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { AuthProvider, ProtectedRoute } from "./contexts/AuthContext";
import AppLayout from "./layouts/AppLayout";
import Categories from "./pages/Categories";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Recurring from "./pages/Recurring";
import Register from "./pages/Register";
import Transactions from "./pages/Transactions";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="categories" element={<Categories />} />
            <Route path="recurring" element={<Recurring />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
