import { Button } from '@/components/ui/button';

export function StatusBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rust/30 bg-rust/10 px-4 py-3 text-sm text-rust"
    >
      <p>{message}</p>
      {onRetry ? (
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

export function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-live="polite">
      <p className="sm:col-span-2 xl:col-span-3 text-sm text-muted-foreground">{label}</p>
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="h-40 animate-pulse rounded-2xl bg-card/80 ring-1 ring-border" />
      ))}
    </div>
  );
}

export function SessionCheck() {
  return (
    <div className="grid min-h-svh place-items-center px-6 text-sm text-muted-foreground">
      Checking your session…
    </div>
  );
}
