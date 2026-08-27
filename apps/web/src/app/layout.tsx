import type { Metadata, Viewport } from 'next';
import './globals.css';
import { brandStyle } from '@/lib/branding';
import { fetchBrandingServer } from '@/lib/web-branding';
import { BrandingProvider } from '@/components/branding-provider';
import { LocaleProvider } from '@/components/locale-provider';
import { WebTranslationDiagnostics } from '@/components/web-translation-diagnostics';
import { DEFAULT_LOCALE } from '@/lib/locale';
import { translateWeb } from '@/lib/web-translations';

/**
 * Document metadata and the initial `lang` are emitted before any locale can be
 * resolved: the user preference lives in the client session and the browser's
 * `Accept-Language` is not read during static rendering. They therefore ship in
 * the default locale, and `LocaleProvider` corrects `documentElement.lang` on
 * mount once the real locale is known. Reading the strings from the catalog
 * rather than inlining them keeps the tab title on the same rename path as the
 * wordmark it repeats.
 */
export const metadata: Metadata = {
  title: translateWeb(DEFAULT_LOCALE, 'common.product'),
  description: translateWeb(DEFAULT_LOCALE, 'common.productTagline'),
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

/**
 * Root layout also mounts the global branding runtime. Branding is fetched on
 * the server so the initial paint already carries the saved brand color (inline
 * `--brand-*` vars on `<html>`) and favicon (a `<link rel="icon">` in <head>) —
 * no flash of the defaults. The client `BrandingProvider` takes the same value
 * as its seed and keeps everything live (and exposes `refresh()` for saves).
 */
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const branding = await fetchBrandingServer();

  return (
    <html lang={DEFAULT_LOCALE} style={brandStyle(branding.brandColor)}>
      <head>
        {branding.faviconUrl ? (
          <link rel="icon" href={branding.faviconUrl} data-branding="" />
        ) : null}
      </head>
      <body>
        <LocaleProvider>
          <BrandingProvider initial={branding}>{children}</BrandingProvider>
          <WebTranslationDiagnostics />
        </LocaleProvider>
      </body>
    </html>
  );
}
