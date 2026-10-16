import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import { AppShell } from './components/AppShell';
import { SessionCheck } from './components/Status';
import { BoardPage } from './pages/BoardPage';
import { BoardsPage } from './pages/BoardsPage';
import { LoginPage } from './pages/LoginPage';
import { NotFound } from './pages/NotFound';
import { RegisterPage } from './pages/RegisterPage';

function RequireAuth() {
  const { user, ready } = useAuth();
  if (!ready) return <SessionCheck />;
  if (!user) return <Navigate to="/login" replace />;
  return <AppShell />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<RequireAuth />}>
        <Route path="/" element={<BoardsPage />} />
        <Route path="/boards/:boardId" element={<BoardPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
