'use client';

import { useState, type ReactNode } from 'react';

export function Button({ children, variant = 'primary', ...props }: { children: ReactNode; variant?: 'primary' | 'secondary' | 'ghost'; onClick?: () => void; type?: 'button' | 'submit' }) {
  return <button className={`primitive-button button-${variant}`} {...props}>{children}</button>;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) { return <input className="primitive-input" {...props} />; }

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return <div className="modal-backdrop" role="presentation"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="modal-close" aria-label="닫기" onClick={onClose}>×</button><h2 id="modal-title">{title}</h2>{children}</section></div>;
}

export function EmptyState({ title, description }: { title: string; description: string }) { return <div className="empty-state"><span className="empty-icon">＋</span><h3>{title}</h3><p>{description}</p></div>; }
export function Loading() { return <div className="loading" role="status" aria-label="불러오는 중"><span /><span /><span /></div>; }
export function Toast({ message }: { message: string }) { const [visible, setVisible] = useState(true); return visible ? <div className="toast" role="status">{message}<button aria-label="알림 닫기" onClick={() => setVisible(false)}>×</button></div> : null; }
