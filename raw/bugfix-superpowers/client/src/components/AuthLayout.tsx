import type { ReactNode } from 'react';
import { Mark } from './Mark';

const preview = [
  { label: 'To do', cards: ['Sketch the brief', 'Ask for the files'] },
  { label: 'Doing', cards: ['Draft the landing page'] },
  { label: 'Done', cards: ['Name the owners'] },
];

export function AuthLayout({
  title,
  subtitle,
  footer,
  children,
}: {
  title: string;
  subtitle: string;
  footer: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-svh lg:grid-cols-[1.05fr_0.95fr]">
      <section className="auth-panel hidden flex-col justify-between px-10 py-10 text-[#f6f1e7] lg:flex">
        <Mark className="text-[#f6f1e7]" />
        <div className="max-w-md">
          <p className="font-serif text-4xl leading-tight tracking-tight">
            Three columns. Names on the work.
          </p>
          <p className="mt-4 text-base leading-relaxed text-[#f6f1e7]/80">
            Quay is a shared dock for the tasks your team is actually doing. Drag a card from To do
            to Doing to Done, put a name on it, and give it a date you can see from across the room.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-2" aria-hidden="true">
            {preview.map((column) => (
              <div key={column.label} className="rounded-xl bg-black/15 p-2">
                <p className="px-1 text-[11px] tracking-wide text-[#f6f1e7]/70 uppercase">
                  {column.label}
                </p>
                <div className="mt-2 grid gap-2">
                  {column.cards.map((card) => (
                    <div key={card} className="rounded-lg bg-[#fffdf8] px-2 py-2 text-xs text-[#1c1915]">
                      {card}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-sm text-[#f6f1e7]/70">A board for one stream of work. Then another.</p>
      </section>
      <section className="flex flex-col justify-center px-5 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-sm">
          <Mark className="mb-8 lg:hidden" />
          <h1 className="font-serif text-4xl tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <p className="mt-6 text-sm text-muted-foreground">{footer}</p>
        </div>
      </section>
    </div>
  );
}
