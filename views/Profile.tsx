import React from 'react';
import { useTranslation } from 'react-i18next';
import GradientSection from '../components/GradientSection';
import { useAuth } from '../hooks/useAuth';
import { Role } from '../types';
import { Link } from 'react-router-dom';

const roleLabelKeys: Record<Role, string> = {
  [Role.ADMIN]: 'users.admin',
  [Role.EDITOR]: 'users.editor',
  [Role.VIEWER]: 'users.viewer',
};

const Profile: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  if (!user) {
    return null;
  }

  const roleLabel = t(roleLabelKeys[user.role] ?? 'users.viewer');

  return (
    <div className="space-y-6">
      <GradientSection
        eyebrow={t('profile.eyebrow')}
        title={t('profile.title')}
        description={t('profile.description')}
        actions={
          <span className="rounded-full border border-brand-primary/40 px-3 py-1 text-xs font-semibold text-brand-primary">
            {roleLabel}
          </span>
        }
        className="overflow-visible bg-gradient-to-br from-brand-surface via-brand-background to-brand-background border border-brand-border/40 text-brand-dark shadow-lg"
        titleClassName="text-brand-dark"
      >
        <p className="text-sm text-brand-muted sm:max-w-xl">{t('profile.heroNote')}</p>
      </GradientSection>

      <section className="rounded-3xl border border-brand-border/40 bg-white/90 p-6 shadow-brand-soft">
        <div className="flex flex-col gap-1">
          <p className="text-xs uppercase tracking-[0.4em] text-brand-muted">
            {t('profile.detailsLabel')}
          </p>
          <h2 className="text-2xl font-semibold text-brand-dark">{user.name}</h2>
          <p className="text-sm text-brand-muted">{t('profile.detailsSubtitle')}</p>
        </div>

        <dl className="mt-6 grid gap-6 sm:grid-cols-2">
          <div className="space-y-1 rounded-2xl border border-brand-border/40 bg-white/80 p-4 shadow-sm">
            <dt className="text-xs uppercase tracking-[0.35em] text-brand-muted">
              {t('profile.fields.name')}
            </dt>
            <dd className="text-base font-semibold text-brand-dark">{user.name}</dd>
          </div>

          <div className="space-y-1 rounded-2xl border border-brand-border/40 bg-white/80 p-4 shadow-sm">
            <dt className="text-xs uppercase tracking-[0.35em] text-brand-muted">
              {t('profile.fields.email')}
            </dt>
            <dd className="text-base font-semibold text-brand-dark">{user.email}</dd>
          </div>

          <div className="space-y-1 rounded-2xl border border-brand-border/40 bg-white/80 p-4 shadow-sm">
            <dt className="text-xs uppercase tracking-[0.35em] text-brand-muted">
              {t('profile.fields.role')}
            </dt>
            <dd className="text-base font-semibold text-brand-dark">
              {roleLabel}
            </dd>
          </div>

          <div className="space-y-1 rounded-2xl border border-brand-border/40 bg-white/80 p-4 shadow-sm">
            <dt className="text-xs uppercase tracking-[0.35em] text-brand-muted">
              {t('profile.fields.clientId')}
            </dt>
            <dd className="text-base font-semibold text-brand-dark">{user.clientId}</dd>
          </div>
        </dl>
      </section>
      <section className="rounded-3xl border border-dashed border-brand-border/40 bg-white/80 p-6 text-brand-dark shadow-brand-soft">
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.4em] text-brand-muted">
            {t('profile.changePassword.ctaTitle')}
          </p>
          <p className="text-base font-semibold text-brand-dark">
            {t('profile.changePassword.ctaDescription')}
          </p>
          <p className="text-sm text-brand-muted">{t('profile.changePassword.ctaNote')}</p>
        </div>
        <Link
          to="/change-password"
          className="mt-4 inline-flex items-center justify-center rounded-2xl border border-brand-primary/60 bg-brand-primary px-4 py-3 text-sm font-semibold text-white transition hover:border-brand-primary hover:bg-brand-primary-hover"
        >
          {t('profile.changePassword.ctaButton')}
        </Link>
      </section>
    </div>
  );
};

export default Profile;
