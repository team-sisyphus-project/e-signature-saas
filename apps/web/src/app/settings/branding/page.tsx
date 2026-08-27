'use client';

import { BrandingForm } from '@/components/branding-form';
import { useTranslation } from '@/components/locale-provider';

/**
 * Settings → Branding. Heading + intro, then the branding form that assembles
 * the logo · favicon uploaders and the brand-color picker with a save/cancel
 * action bar. The form loads the current branding on mount and, on save,
 * persists the changes and re-applies them service-wide immediately (header
 * logo · browser-tab favicon · brand color) for every end user.
 *
 * A client component because its heading reads the browser copy catalog, which
 * resolves against the reader's locale on the client.
 */
export default function BrandingSettingsPage() {
  const t = useTranslation();

  return (
    <section aria-labelledby="branding-heading" className="flex flex-col gap-lg">
      <div className="flex flex-col gap-2xs">
        <h2 id="branding-heading" className="text-lg font-bold text-foreground">
          {t('settings.brandingTitle')}
        </h2>
        <p className="text-base text-foreground-subtle">{t('settings.brandingDescription')}</p>
      </div>

      <BrandingForm />
    </section>
  );
}
