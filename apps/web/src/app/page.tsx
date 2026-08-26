'use client';

import { useState } from 'react';
import { Button, Input, Modal, Toast } from '@/components/primitives';
import { mockDocuments, mockMembers } from '@/lib/mock-data';
import { t } from '@/lib/i18n';

const statusLabels = t.status;

export default function HomePage() {
  const [notice, setNotice] = useState('');
  const [newDocumentOpen, setNewDocumentOpen] = useState(false);
  const document = mockDocuments[0];
  return <div className="app-shell">
    <aside className="sidebar" aria-label={t.accessibility.mainMenu}>
      <div className="brand"><span className="brand-mark">◈</span>{t.brand}</div>
      <button className="workspace" type="button" onClick={() => setNotice(t.organization.switchNotice)} aria-label={t.organization.switchLabel}><span className="workspace-avatar">A</span><span>{t.organization.name}</span><span aria-hidden="true">⌄</span></button>
      <nav className="nav" aria-label={t.accessibility.mainMenu}><a href="#documents" aria-current="page">▤ <span>{t.navigation.documents}</span></a><a href="#templates">▱ <span>{t.navigation.templates}</span></a><a href="#members">♙ <span>{t.navigation.members}</span></a><a href="#settings">⚙ <span>{t.navigation.settings}</span></a></nav>
      <div className="plan-card"><span>{t.organization.plan}</span><strong>3 / 10 {t.organization.seats}</strong><div className="plan-meter"><span /></div><button onClick={() => setNotice(t.organization.planNotice)}>{t.organization.managePlan} →</button></div>
      <p className="sidebar-footer">{t.organization.name} · {t.organization.memberCount}</p>
    </aside>
    <div className="main"><header className="topbar"><button className="icon-button" aria-label={t.accessibility.notifications} onClick={() => setNotice(t.notifications)}>♧</button><button className="icon-button" aria-label={t.accessibility.theme} onClick={() => setNotice(t.themeNotice)}>☼</button><span className="avatar" aria-label={t.profile}>{t.profileInitials}</span></header>
      <main className="content document-viewer" id="documents"><div className="viewer-toolbar"><button className="back-link" onClick={() => setNotice(t.viewer.backNotice)}>← {t.viewer.allDocuments}</button><div className="toolbar-actions"><Button variant="ghost" onClick={() => setNotice(t.viewer.shareNotice)}>↗ {t.viewer.share}</Button><Button variant="secondary" onClick={() => setNewDocumentOpen(true)}>＋ {t.dashboard.newDocument}</Button><Button variant="secondary" onClick={() => setNotice(t.viewer.moreNotice)}>···</Button></div></div>
        <div className="viewer-heading"><div><p className="eyebrow">{t.viewer.eyebrow}</p><h1>{document.title}</h1><div className="heading-meta"><span className={`status status-${document.status}`}>{statusLabels[document.status]}</span><span>{t.document.updated} {document.updated}</span><span>{t.viewer.version} {document.version}</span></div></div><Button onClick={() => setNotice(t.viewer.reviewNotice)}>✓ {t.viewer.markReviewed}</Button></div>
        <div className="viewer-layout"><aside className="outline" aria-label={t.viewer.contents}><p className="rail-label">{t.viewer.contents}</p><nav><a href="#summary" className="active">{t.viewer.summary}</a><a href="#parties">{t.viewer.parties}</a><a href="#confidentiality">{t.viewer.confidentiality}</a><a href="#term">{t.viewer.term}</a><a href="#signatures">{t.viewer.signatures}</a></nav><button className="outline-action" onClick={() => setNotice(t.viewer.compareNotice)}>◫ {t.viewer.compare}</button></aside>
          <article className="document-paper"><p className="document-kicker">{document.type} · {t.viewer.version} {document.version}</p><h2 id="summary">{t.viewer.summary}</h2><p>{t.viewer.intro}</p><h2 id="parties">1. {t.viewer.parties}</h2><p>{t.viewer.partiesCopy}</p><h2 id="confidentiality">2. {t.viewer.confidentiality}</h2><p>{t.viewer.confidentialityCopy}</p><blockquote>{t.viewer.highlight}</blockquote><h2 id="term">3. {t.viewer.term}</h2><p>{t.viewer.termCopy}</p><h2 id="signatures">4. {t.viewer.signatures}</h2><p>{t.viewer.signaturesCopy}</p><div className="document-end">— {t.viewer.end}</div></article>
          <aside className="details-rail"><section><p className="rail-label">{t.viewer.details}</p><dl><div><dt>{t.document.owner}</dt><dd>{document.owner} · {mockMembers[0].role}</dd></div><div><dt>{t.viewer.reviewers}</dt><dd>{mockMembers[1].name} · {mockMembers[1].role}<br />{mockMembers[2].name} · {mockMembers[2].role}</dd></div><div><dt>{t.viewer.permission}</dt><dd>{t.viewer.permissionValue}</dd></div></dl></section><section className="comment-panel"><div className="rail-title"><p className="rail-label">{t.viewer.comments}</p><span>2</span></div><div className="comment"><span className="comment-avatar">JP</span><div><strong>{mockMembers[1].name}</strong><p>{t.viewer.commentOne}</p><small>{t.viewer.commentTime}</small></div></div><div className="comment"><span className="comment-avatar blue">SL</span><div><strong>{mockMembers[2].name}</strong><p>{t.viewer.commentTwo}</p><small>{t.viewer.commentTimeTwo}</small></div></div><Button variant="secondary" onClick={() => setNotice(t.viewer.commentNotice)}>{t.viewer.addComment}</Button></section></aside>
        </div>
      </main></div>
    {newDocumentOpen && <Modal title={t.dashboard.newDocument} onClose={() => setNewDocumentOpen(false)}><p>{t.dashboard.newDocumentHint}</p><Input placeholder={t.dashboard.newDocumentPlaceholder} autoFocus /><div className="modal-actions"><Button variant="secondary" onClick={() => setNewDocumentOpen(false)}>{t.actions.cancel}</Button><Button onClick={() => { setNewDocumentOpen(false); setNotice(t.dashboard.createdNotice); }}>{t.actions.create}</Button></div></Modal>}
    {notice && <Toast message={notice} onClose={() => setNotice('')} />}</div>;
}
