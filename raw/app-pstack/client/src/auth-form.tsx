import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  LoginInputSchema,
  RegisterInputSchema,
  firstIssue,
} from "@plank/shared";
import type { LoginInput, RegisterInput } from "@plank/shared";
import { ApiError } from "./api.ts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AuthFormProps = {
  mode: "login" | "register";
  onSubmit: (input: LoginInput | RegisterInput) => Promise<void>;
};

export function AuthForm({ mode, onSubmit }: AuthFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const register = mode === "register";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const raw = {
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      name: String(form.get("name") ?? ""),
    };
    const parsed = register ? RegisterInputSchema.safeParse(raw) : LoginInputSchema.safeParse(raw);
    if (!parsed.success) {
      setError(firstIssue(parsed.error));
      return;
    }
    setPending(true);
    setError(null);
    try {
      await onSubmit(parsed.data);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not reach Plank.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-xl bg-card p-5 ring-1 ring-border">
      <div>
        <h1 className="font-heading text-2xl text-foreground">
          {register ? "Create your account" : "Sign in"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {register ? "Use the email your teammates already know." : "Pick up the boards you belong to."}
        </p>
      </div>
      {register ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" autoComplete="name" />
        </div>
      ) : null}
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={register ? "new-password" : "current-password"}
        />
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Working…" : register ? "Create account" : "Sign in"}
      </Button>
      <p className="text-sm text-muted-foreground">
        {register ? (
          <>
            Already have an account? <Link to="/login" className="text-foreground underline">Sign in</Link>
          </>
        ) : (
          <>
            New here? <Link to="/register" className="text-foreground underline">Create an account</Link>
          </>
        )}
      </p>
    </form>
  );
}
