import { Navigate, Route, Routes } from 'react-router-dom';
import { BoardPage } from './board/BoardPage';
import { AuthPage } from './auth/AuthPage';
import { SessionProvider, useSession } from './auth/session';
import { BoardsPage } from './boards/BoardsPage';

export function App() {
  return (
    <SessionProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/boards/:boardId" element={<BoardRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SessionProvider>
  );
}

function Home() {
  const { user, ready, setUser } = useSession();
  if (!ready) return <p className="loading screen-loading">Loading…</p>;
  if (!user) return <AuthPage onAuthenticated={setUser} />;
  return <BoardsPage />;
}

function BoardRoute() {
  const { user, ready } = useSession();
  if (!ready) return <p className="loading screen-loading">Loading…</p>;
  if (!user) return <Navigate to="/" replace />;
  return <BoardPage />;
}
