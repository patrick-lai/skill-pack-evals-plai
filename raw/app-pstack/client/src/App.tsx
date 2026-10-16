import type { ReactNode } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import type { LoginInput, RegisterInput } from "@plank/shared";
import { api } from "./api.ts";
import { AuthForm } from "./auth-form.tsx";
import { BoardPage } from "./board-page.tsx";
import { BoardsPage } from "./boards-page.tsx";
import { useSession } from "./session.tsx";
import type { PublicUser } from "@plank/shared";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthRoute mode="login" />} />
      <Route path="/register" element={<AuthRoute mode="register" />} />
      <Route path="/" element={<RequireUser><BoardsPage /></RequireUser>} />
      <Route path="/boards/:boardId" element={<RequireUser><BoardPage /></RequireUser>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function RequireUser({ children }: { children: ReactNode }) {
  const { user, loading } = useSession();
  if (loading) return <p className="p-6">Checking your session.</p>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AuthRoute({ mode }: { mode: "login" | "register" }) {
  const { user, loading, setUser } = useSession();
  const navigate = useNavigate();
  if (loading) return <p className="p-6">Checking your session.</p>;
  if (user) return <Navigate to="/" replace />;

  async function onSubmit(input: LoginInput | RegisterInput) {
    const path = mode === "register" ? "/api/auth/register" : "/api/auth/login";
    const data = await api<{ user: PublicUser }>(path, { body: input });
    setUser(data.user);
    navigate("/");
  }

  return (
    <main className="mx-auto grid min-h-svh max-w-5xl items-center gap-10 px-4 py-12 md:grid-cols-2">
      <div>
        <p className="font-heading text-5xl tracking-tight">Plank</p>
        <p className="mt-4 max-w-sm text-lg text-muted-foreground">
          Three lanes for the work your team is actually doing. Sign in, open a board, and drag a task when it moves.
        </p>
      </div>
      <AuthForm mode={mode} onSubmit={onSubmit} />
    </main>
  );
}
