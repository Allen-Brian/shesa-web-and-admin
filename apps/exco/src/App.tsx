import { Routes, Route } from 'react-router-dom';

import { AuthGuard } from './components/AuthGuard';
import { DashboardPage } from './routes/dashboard';

export function App() {
  return (
    <AuthGuard>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
      </Routes>
    </AuthGuard>
  );
}
