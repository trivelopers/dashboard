import React from 'react';
import { useTranslation } from 'react-i18next';

const Integrations: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-brand-border/60 bg-white/90 p-6 shadow-brand-soft">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-primary">
              {t('navigation.integrations')}
            </p>
            <h1 className="text-3xl font-semibold text-brand-dark">{t('integrations.title')}</h1>
            <p className="mt-2 max-w-2xl text-sm text-brand-muted">{t('integrations.description')}</p>
          </div>
          <button
            className="rounded-full border border-brand-primary/50 bg-brand-primary/10 px-5 py-2 text-sm font-semibold text-brand-primary transition hover:border-brand-primary hover:bg-brand-primary/20"
            type="button"
          >
            {t('integrations.cta')}
          </button>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-brand-border/60 bg-white/90 p-6 shadow-brand-soft">
        <div>
          <h2 className="text-lg font-semibold text-brand-dark">{t('integrations.statusTitle')}</h2>
          <p className="text-sm text-brand-muted">{t('integrations.statusDescription')}</p>
        </div>
        <div className="rounded-2xl border border-dashed border-brand-border/40 bg-brand-surface/80 p-4">
          <p className="text-sm text-brand-muted">{t('integrations.comingSoon')}</p>
        </div>
      </section>
    </div>
  );
};

export default Integrations;
