import { Navigate, Route, Routes } from 'react-router';
import { ProtectedRoute } from './contexts/AuthContext';
import { RootLayout } from './layouts/RootLayout';
import { Budget } from './pages/Budget';
import { Categories } from './pages/Categories';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { Recurring } from './pages/Recurring';
import { Register } from './pages/Register';
import { Transactions } from './pages/Transactions';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        element={
          <ProtectedRoute>
            <RootLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="categories" element={<Categories />} />
        <Route path="recurring" element={<Recurring />} />
        <Route path="budget" element={<Budget />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
