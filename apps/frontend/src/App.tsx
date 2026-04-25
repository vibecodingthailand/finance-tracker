import { Navigate, Route, Routes } from 'react-router';
import { RootLayout } from './layouts/RootLayout';
import { Dashboard } from './pages/Dashboard';
import { Transactions } from './pages/Transactions';

export function App() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="transactions" element={<Transactions />} />
      </Route>
    </Routes>
  );
}
