import React from 'react';
import { useTranslation } from 'react-i18next';

const Help: React.FC = () => {
  const { t } = useTranslation();

  const quickLinks = [
    {
      title: t('help.quickLinkOneTitle'),
      description: t('help.quickLinkOneDescription'),
    },
    {
      title: t('help.quickLinkTwoTitle'),
      description: t('help.quickLinkTwoDescription'),
    },
    {
      title: t('help.quickLinkThreeTitle'),
      description: t('help.quickLinkThreeDescription'),
    },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-brand-border/60 bg-white/90 p-6 shadow-brand-soft">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-primary">
              {t('navigation.help')}
            </p>
            <h1 className="text-3xl font-semibold text-brand-dark">{t('help.title')}</h1>
            <p className="mt-2 max-w-2xl text-sm text-brand-muted">{t('help.description')}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {quickLinks.map((link) => (
          <article
            key={link.title}
            className="flex flex-col gap-2 rounded-2xl border border-brand-border/60 bg-white/90 p-6 shadow-brand-soft"
          >
            <h2 className="text-lg font-semibold text-brand-dark">{link.title}</h2>
            <p className="text-sm text-brand-muted">{link.description}</p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-brand-border/60 bg-white/90 p-6 shadow-brand-soft">
        <h2 className="text-lg font-semibold text-brand-dark">{t('help.supportTitle')}</h2>
        <p className="mt-2 text-sm text-brand-muted">{t('help.supportDescription')}</p>
        <button
          type="button"
          className="mt-4 inline-flex items-center justify-center rounded-full border border-brand-primary/50 bg-brand-primary/10 px-4 py-2 text-sm font-semibold text-brand-primary transition hover:border-brand-primary hover:bg-brand-primary/20"
        >
          {t('help.contactSupport')}
        </button>
      </section>
    </div>
  );
};

export default Help;
