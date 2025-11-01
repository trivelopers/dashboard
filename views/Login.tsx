
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import nodaiLogo from '../nodai-definitivo.png';

// Fix: Use yup.object({...}) instead of yup.object().shape({...}) to ensure correct type inference.
const schema = yup.object({
  email: yup.string().email('Must be a valid email').required('Email is required'),
  password: yup.string().required('Password is required'),
});

type FormData = yup.InferType<typeof schema>;

const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: yupResolver(schema)
  });

  const from = location.state?.from?.pathname || '/';

  const onSubmit = async (data: FormData) => {
    setError(null);
    try {
      await login(data);
      navigate(from, { replace: true });
    } catch (err: any) {
      // Mostrar el mensaje específico del backend
      setError(err.message || 'Failed to login. Please check your credentials.');
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark sm:bg-brand-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-none sm:rounded-3xl bg-brand-dark sm:bg-brand-dark/90 p-8 sm:p-10 shadow-none sm:shadow-brand-soft sm:border sm:border-white/15">
        <div className="text-center mb-10">
          <img
            src={nodaiLogo}
            alt="nodai"
            className="mx-auto mt-2 mb-6 max-h-20 w-auto object-contain drop-shadow-lg"
          />
          <p className="text-sm text-white/70">{t('auth.signInToManage')}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-white/80 tracking-wide">
              {t('auth.email')}
            </label>
            <div className="mt-2">
              <input
                id="email"
                type="email"
                {...register('email')}
                className={`w-full rounded-xl border px-4 py-3 text-white placeholder-white/50 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-brand-primary/60 ${
                  errors.email ? 'border-brand-warm/80 bg-brand-dark/60' : 'border-white/15 bg-white/10 focus:border-brand-primary'
                }`}
              />
              {errors.email && <p className="mt-2 text-sm text-brand-warm">{errors.email.message}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-white/80 tracking-wide">
              {t('auth.password')}
            </label>
            <div className="mt-2">
              <input
                id="password"
                type="password"
                {...register('password')}
                className={`w-full rounded-xl border px-4 py-3 text-white placeholder-white/50 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-brand-primary/60 ${
                  errors.password ? 'border-brand-warm/80 bg-brand-dark/60' : 'border-white/15 bg-white/10 focus:border-brand-primary'
                }`}
              />
              {errors.password && <p className="mt-2 text-sm text-brand-warm">{errors.password.message}</p>}
            </div>
          </div>

          {error && <p className="text-sm text-brand-warm text-center">{error}</p>}

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center rounded-xl border border-brand-primary/30 bg-brand-primary py-3 px-4 text-sm font-semibold text-brand-dark shadow-brand-soft transition hover:bg-brand-primary-hover focus:outline-none focus:ring-2 focus:ring-brand-primary/60 focus:ring-offset-2 focus:ring-offset-brand-dark disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/10 disabled:text-white/60"
            >
              {isSubmitting ? t('auth.signingIn') : t('auth.login')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
