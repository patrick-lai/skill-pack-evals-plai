import { Link } from 'react-router-dom';
import { api } from './api';
import { useSession } from './auth/session';

export function TopBar() {
  const { user, setUser } = useSession();

  async function signOut() {
    await api('/api/auth/logout', { method: 'POST' });
    setUser(null);
  }

  return (
    <header className="topbar">
      <Link to="/" className="brand-link">
        Boardline
      </Link>
      <div className="topbar-user">
        <span>{user?.name}</span>
        <button className="text-button" type="button" onClick={() => void signOut()}>
          Sign out
        </button>
      </div>
    </header>
  );
}
