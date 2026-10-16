import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { expect, it, vi } from "vitest";
import { AuthForm } from "./auth-form.tsx";

it("rejects a short password before creating an account", async () => {
  const user = userEvent.setup();
  const onSubmit = vi.fn();
  render(
    <MemoryRouter>
      <AuthForm mode="register" onSubmit={onSubmit} />
    </MemoryRouter>,
  );

  await user.type(screen.getByLabelText("Name"), "Ada Lovelace");
  await user.type(screen.getByLabelText("Email"), "Ada@Example.com");
  await user.type(screen.getByLabelText("Password"), "short");
  await user.click(screen.getByRole("button", { name: "Create account" }));

  expect(screen.getByRole("alert").textContent).toBe("Password must be at least 8 characters.");
  expect(onSubmit).not.toHaveBeenCalled();
});

it("sends the lowercased email when the form is valid", async () => {
  const user = userEvent.setup();
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  render(
    <MemoryRouter>
      <AuthForm mode="login" onSubmit={onSubmit} />
    </MemoryRouter>,
  );

  await user.type(screen.getByLabelText("Email"), "Ada@Example.com");
  await user.type(screen.getByLabelText("Password"), "correct horse");
  await user.click(screen.getByRole("button", { name: "Sign in" }));

  expect(onSubmit).toHaveBeenCalledWith({
    email: "ada@example.com",
    password: "correct horse",
  });
});
