import { renderCompletionEmail } from './completion-email.template';
import { SERVER_TRANSLATIONS } from '../i18n/server-translations';

/** The ko-locale catalog copy the template renders (asserted by reference,
 * so this spec stays free of hard-coded localized literals). */
const KO = SERVER_TRANSLATIONS.ko.completionEmail;

describe('renderCompletionEmail', () => {
  const base = {
    contractTitle: 'Employment Agreement',
    senderName: 'Acme Inc.',
    locale: 'ko' as const,
  } as const;

  it('renders the confirmed subject with the contract title', () => {
    const { subject } = renderCompletionEmail({ ...base, recipientRole: 'SIGNER' });
    expect(subject).toBe(KO.subject.replace('{title}', base.contractTitle));
  });

  it('renders every template-owned string in English for English recipients', () => {
    const rendered = renderCompletionEmail({
      contractTitle: 'Employment Agreement',
      senderName: 'Toss',
      locale: 'en',
      recipientRole: 'SENDER',
      dashboardUrl: 'https://app.esign.kr/dashboard',
    });

    expect(rendered.subject).toBe('[Employment Agreement] Contract completed');
    expect(rendered.html).toContain('<html lang="en">');
    for (const out of [rendered.subject, rendered.html, rendered.text]) {
      expect(out).not.toMatch(/[\u3131-\uD79D]/);
    }
  });

  it('includes headline, body, and both attachment notices (confirmed copy)', () => {
    const { html, text } = renderCompletionEmail({ ...base, recipientRole: 'SIGNER' });
    for (const out of [html, text]) {
      expect(out).toContain(KO.headline);
      expect(out).toContain(KO.bodyAllDone.replace('{title}', base.contractTitle));
      expect(out).toContain(KO.bodyAttachments);
      expect(out).toContain(KO.finalContract);
      expect(out).toContain(KO.finalContractNote);
      expect(out).toContain(KO.auditCertificate);
      expect(out).toContain(KO.auditCertificateNote);
      expect(out).toContain(KO.footer);
    }
  });

  it('omits the dashboard line and CTA for signer recipients', () => {
    const { html, text } = renderCompletionEmail({
      ...base,
      recipientRole: 'SIGNER',
      dashboardUrl: 'https://app.esign.kr/dashboard',
    });
    expect(html).not.toContain(KO.bodySenderExtra);
    expect(html).not.toContain(KO.ctaLabel);
    expect(text).not.toContain(KO.ctaLabel);
  });

  it('adds the dashboard line and CTA for sender recipients with a dashboard URL', () => {
    const url = 'https://app.esign.kr/dashboard';
    const { html, text } = renderCompletionEmail({
      ...base,
      recipientRole: 'SENDER',
      dashboardUrl: url,
    });
    expect(html).toContain(KO.bodySenderExtra);
    expect(html).toContain(KO.ctaLabel);
    expect(html).toContain(`href="${url}"`);
    expect(text).toContain(`${KO.ctaLabel}: ${url}`);
  });

  it('keeps the sender dashboard line even without a CTA URL but drops the button', () => {
    const { html } = renderCompletionEmail({ ...base, recipientRole: 'SENDER' });
    expect(html).toContain(KO.bodySenderExtra);
    expect(html).not.toContain(KO.ctaLabel);
  });

  it('applies a valid brand color to the accent bar and falls back to Toss blue otherwise', () => {
    const branded = renderCompletionEmail({ ...base, recipientRole: 'SIGNER', brandColor: '#e94560' });
    expect(branded.html).toContain('#e94560');

    const fallback = renderCompletionEmail({ ...base, recipientRole: 'SIGNER', brandColor: 'not-a-color' });
    expect(fallback.html).toContain('#1c64f2');
  });

  it('renders a brand logo when provided, else a monogram', () => {
    const withLogo = renderCompletionEmail({
      ...base,
      recipientRole: 'SIGNER',
      brandLogoUrl: 'https://cdn.esign.kr/logo.png',
    });
    expect(withLogo.html).toContain('<img src="https://cdn.esign.kr/logo.png"');

    const withMonogram = renderCompletionEmail({ ...base, recipientRole: 'SIGNER' });
    // First grapheme of the sender name, uppercased.
    expect(withMonogram.html).toContain('>A<');
  });

  it('uses the default service name in the footer when none is given', () => {
    const { html } = renderCompletionEmail({ ...base, recipientRole: 'SIGNER' });
    expect(html).toContain(KO.serviceName);
  });

  it('escapes HTML-significant characters in dynamic copy', () => {
    const { html } = renderCompletionEmail({
      contractTitle: '<b>Contract</b> & annex',
      senderName: 'A & B',
      locale: 'ko',
      recipientRole: 'SIGNER',
    });
    expect(html).toContain('&lt;b&gt;Contract&lt;/b&gt; &amp; annex');
    expect(html).not.toContain('<b>Contract</b> & annex');
  });
});
