import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/70 px-6 py-14 text-center">
      <h1 className="font-serif text-3xl tracking-tight">That page is not on the board</h1>
      <p className="mt-2 text-sm text-muted-foreground">The link does not match a Quay page.</p>
      <Link to="/" className="mt-6 inline-block text-sm font-medium text-tide underline-offset-4 hover:underline">
        Back to boards
      </Link>
    </div>
  );
}
