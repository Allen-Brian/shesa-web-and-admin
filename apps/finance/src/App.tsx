import { Routes, Route } from 'react-router-dom';

import { DashboardPage } from './routes/dashboard';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
    </Routes>
  );
}
