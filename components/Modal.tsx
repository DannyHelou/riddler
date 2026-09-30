'use client';
import { useEffect, useRef } from 'react';

/** Pixel dialog: notched frame, focus moves in and returns on close, Esc closes. */
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    box.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && box.current) {
        const f = box.current.querySelectorAll<HTMLElement>('button, a[href], input, [tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(8,10,20,0.75)] p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        className="panel fade-in max-h-[90dvh] w-full max-w-[520px] overflow-y-auto p-5 outline-none md:p-7"
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 id="modal-title" className="eyebrow m-0 font-normal">{title}</h2>
          <button type="button" onClick={onClose} className="link-button text-[20px] text-haze" style={{ textDecoration: 'none', minHeight: 32 }} aria-label="Close">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
