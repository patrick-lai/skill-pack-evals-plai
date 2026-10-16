import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function Mark({ className, linked = false }: { className?: string; linked?: boolean }) {
  const content = (
    <>
      <svg viewBox="0 0 32 32" className="size-7 shrink-0" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="#0f6e64" />
        <rect x="6" y="19" width="20" height="3" rx="1.2" fill="#f4f0e6" />
        <rect x="8" y="14" width="3" height="8" rx="1" fill="#f4f0e6" />
        <rect x="14.5" y="10" width="3" height="12" rx="1" fill="#f4f0e6" />
        <rect x="21" y="14" width="3" height="8" rx="1" fill="#f4f0e6" />
      </svg>
      <span className="font-serif text-[1.7rem] leading-none tracking-tight">Quay</span>
    </>
  );

  if (!linked) {
    return <span className={cn('inline-flex items-center gap-2 text-tide', className)}>{content}</span>;
  }

  return (
    <Link to="/" className={cn('inline-flex items-center gap-2 text-tide', className)}>
      {content}
    </Link>
  );
}
