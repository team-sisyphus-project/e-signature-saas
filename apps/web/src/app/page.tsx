'use client';
import { useState } from 'react';
import { Button, Input, Modal, Toast } from '@/components/primitives';
import { mockDocuments } from '@/lib/mock-data';
import { t } from '@/lib/i18n';

const statusLabels = t.status;
export default function HomePage() {
  const [newDocumentOpen, setNewDocumentOpen] = useState(false);
  const [notice, setNotice] = useState(false);
  return <div className="app-shell">
    <aside className="sidebar" aria-label="주요 메뉴">
      <div className="brand"><span className="brand-mark">◈</span>{t.brand}</div>
      <div className="workspace"><span className="workspace-avatar">A</span><span>Acme 조직</span><span aria-hidden="true">⌄</span></div>
      <nav className="nav"><a href="#documents" aria-current="page">▤ &nbsp;{t.navigation.documents}</a><a href="#templates">▱ &nbsp;{t.navigation.templates}</a><a href="#members">♙ &nbsp;{t.navigation.members}</a><a href="#settings">⚙ &nbsp;{t.navigation.settings}</a></nav>
      <p className="sidebar-footer">Acme 조직 · 3명 사용 중</p>
    </aside>
    <div className="main"><header className="topbar"><button className="icon-button" aria-label={t.accessibility.notifications}>♧</button><button className="icon-button" aria-label={t.accessibility.theme}>☼</button><span className="avatar" aria-label="민서 김">MK</span></header>
      <main className="content" id="documents"><section className="hero"><div><p className="eyebrow">{t.dashboard.eyebrow}</p><h1>{t.dashboard.title}</h1><p>{t.dashboard.description}</p></div><Button onClick={() => setNewDocumentOpen(true)}>＋ {t.dashboard.newDocument}</Button></section>
      <section aria-labelledby="recent-heading"><div className="section-heading"><h2 id="recent-heading">{t.dashboard.recent}</h2><button className="text-link" onClick={() => setNotice(true)}>{t.dashboard.viewAll} →</button></div><div className="document-list">{mockDocuments.map((doc) => <article className="document-card" key={doc.id}><div><h3 className="doc-title">{doc.title}</h3><div className="doc-meta"><span>{doc.type}</span><span>·</span><span>{t.document.owner} {doc.owner}</span><span>·</span><span>{doc.updated}</span><span className={`status status-${doc.status}`}>{statusLabels[doc.status]}</span></div><div className="progress" aria-label={`진행률 ${doc.progress}%`}><span style={{ width: `${doc.progress}%` }} /></div></div><Button variant="secondary">{t.document.open}</Button></article>)}</div></section></main>
    </div>
    {newDocumentOpen && <Modal title={t.dashboard.newDocument} onClose={() => setNewDocumentOpen(false)}><p>새 계약 문서의 이름을 입력하세요.</p><Input placeholder="예: 2026 파트너십 계약" autoFocus /><div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-6)' }}><Button variant="secondary" onClick={() => setNewDocumentOpen(false)}>취소</Button><Button onClick={() => { setNewDocumentOpen(false); setNotice(true); }}>문서 만들기</Button></div></Modal>}
    {notice && <Toast message="목 데이터 화면입니다. 다음 단계에서 연결할 수 있어요." />}
  </div>;
}
