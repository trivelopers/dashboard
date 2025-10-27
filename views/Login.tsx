
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/solid';

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
    <div className="min-h-screen bg-brand-background flex items-center justify-center">
      <div className="max-w-md w-full bg-brand-surface rounded-xl shadow-brand-soft p-8 m-4 border border-brand-border/60">
        <div className="text-center mb-8">
            <ChatBubbleLeftRightIcon className="h-12 w-12 text-brand-primary mx-auto mb-3" />
            <h2 className="text-3xl font-bold text-brand-dark">{t('auth.adminPanel')}</h2>
            <p className="text-brand-muted">{t('auth.signInToManage')}</p>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-brand-dark">{t('auth.email')}</label>
            <div className="mt-1">
              <input
                id="email"
                type="email"
                {...register('email')}
                className={`w-full px-3 py-2 border ${errors.email ? 'border-red-500' : 'border-brand-border'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary`}
              />
              {errors.email && <p className="mt-2 text-sm text-red-600">{errors.email.message}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-brand-dark">{t('auth.password')}</label>
            <div className="mt-1">
              <input
                id="password"
                type="password"
                {...register('password')}
                className={`w-full px-3 py-2 border ${errors.password ? 'border-red-500' : 'border-brand-border'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary`}
              />
              {errors.password && <p className="mt-2 text-sm text-red-600">{errors.password.message}</p>}
            </div>
          </div>
          
          {error && <p className="text-sm text-red-600 text-center">{error}</p>}

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-semibold text-white bg-brand-primary hover:bg-brand-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary/50 disabled:bg-brand-disabled disabled:text-white disabled:cursor-not-allowed"
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
