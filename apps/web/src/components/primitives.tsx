'use client';

import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { children, className = '', variant = 'primary', loading = false, disabled, ...props },
  ref,
) {
  return <button ref={ref} className={`primitive-button button-${variant} ${className}`.trim()} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
    {loading ? <span className="button-spinner" aria-hidden="true" /> : null}{children}
  </button>;
});
Button.displayName = 'Button';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> { error?: boolean; }

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className = '', error = false, 'aria-invalid': ariaInvalid, ...props }, ref,
) {
  return <input ref={ref} className={`primitive-input ${className}`.trim()} aria-invalid={error || ariaInvalid || undefined} {...props} />;
});
Input.displayName = 'Input';

export interface ModalProps { title: string; children: ReactNode; onClose: () => void; closeLabel?: string; }

export function Modal({ title, children, onClose, closeLabel = 'Close' }: ModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    triggerRef.current = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])');
      if (!focusable.length) return;
      const first = focusable[0]!; const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); triggerRef.current?.focus(); };
  }, [onClose]);

  return <div className="modal-backdrop" onMouseDown={(event) => event.currentTarget === event.target && onClose()}>
    <section ref={dialogRef} className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
      <button className="modal-close" type="button" aria-label={closeLabel} onClick={onClose}>×</button>
      <h2 id={titleId}>{title}</h2>{children}
    </section>
  </div>;
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="empty-state" role="status"><span className="empty-icon" aria-hidden="true">＋</span><h3>{title}</h3><p>{description}</p>{action ? <div className="empty-action">{action}</div> : null}</div>;
}

export function Loading({ label = 'Loading' }: { label?: string }) {
  return <div className="loading" role="status" aria-live="polite" aria-label={label}><span /><span /><span /></div>;
}

export function Toast({ message, onClose, closeLabel = 'Dismiss notification', type = 'status' }: { message: string; onClose?: () => void; closeLabel?: string; type?: 'status' | 'error' }) {
  const [visible, setVisible] = useState(true);
  const dismiss = () => { setVisible(false); onClose?.(); };
  if (!visible) return null;
  return <div className={`toast toast-${type}`} role={type === 'error' ? 'alert' : 'status'} aria-live={type === 'error' ? 'assertive' : 'polite'}><span>{message}</span><button type="button" aria-label={closeLabel} onClick={dismiss}>×</button></div>;
}
