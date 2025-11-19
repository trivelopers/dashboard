import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import GradientSection from '../components/GradientSection';
import api from '../services/api';

const ChangePassword: React.FC = () => {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    if (newPassword !== confirmPassword) {
      setFormError(t('profile.changePassword.mismatch'));
      return;
    }

    if (newPassword.length < 8) {
      setFormError(t('profile.changePassword.minLength'));
      return;
    }

    setIsSubmitting(true);

    try {
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      setSuccessMessage(t('profile.changePassword.success'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      const message = error?.response?.data?.message || t('profile.changePassword.error');
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <GradientSection
        title={t('profile.changePassword.screenTitle')}
        description={t('profile.changePassword.screenDescription')}
        className="overflow-visible bg-gradient-to-br from-brand-surface via-brand-background to-white border border-brand-border/40 text-brand-dark shadow-lg"
        titleClassName="text-brand-dark"
      />

      <section className="rounded-3xl border border-brand-border/40 bg-brand-surface p-6 shadow-brand-soft">

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.35em] text-brand-muted">
              {t('profile.changePassword.current')}
            </label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                className="w-full rounded-2xl border border-brand-border/40 bg-white/90 px-4 py-3 pr-24 text-sm text-brand-dark shadow-sm transition focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrent((prev) => !prev)}
                className="absolute inset-y-0 right-3 flex items-center rounded-full border border-transparent bg-white/80 px-3 text-xs font-semibold text-brand-primary transition hover:bg-white"
              >
                {showCurrent ? t('profile.changePassword.hide') : t('profile.changePassword.show')}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.35em] text-brand-muted">
              {t('profile.changePassword.new')}
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="w-full rounded-2xl border border-brand-border/40 bg-white/90 px-4 py-3 pr-24 text-sm text-brand-dark shadow-sm transition focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25"
                minLength={8}
                required
              />
              <button
                type="button"
                onClick={() => setShowNew((prev) => !prev)}
                className="absolute inset-y-0 right-3 flex items-center rounded-full border border-transparent bg-white/80 px-3 text-xs font-semibold text-brand-primary transition hover:bg-white"
              >
                {showNew ? t('profile.changePassword.hide') : t('profile.changePassword.show')}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.35em] text-brand-muted">
              {t('profile.changePassword.confirm')}
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-2xl border border-brand-border/40 bg-white/90 px-4 py-3 pr-24 text-sm text-brand-dark shadow-sm transition focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm((prev) => !prev)}
                className="absolute inset-y-0 right-3 flex items-center rounded-full border border-transparent bg-white/80 px-3 text-xs font-semibold text-brand-primary transition hover:bg-white"
              >
                {showConfirm ? t('profile.changePassword.hide') : t('profile.changePassword.show')}
              </button>
            </div>
          </div>

          {formError && (
            <p className="text-sm font-medium text-red-500">{formError}</p>
          )}
          {successMessage && (
            <p className="text-sm font-medium text-brand-primary">{successMessage}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-2xl border border-brand-primary/60 bg-brand-primary px-4 py-3 text-sm font-semibold text-white transition hover:border-brand-primary hover:bg-brand-primary-hover disabled:opacity-60"
          >
            {isSubmitting ? t('profile.changePassword.saving') : t('profile.changePassword.button')}
          </button>
        </form>
      </section>
    </div>
  );
};

export default ChangePassword;
