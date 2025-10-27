
import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const NotFound: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-brand-background text-center">
      <h1 className="text-9xl font-extrabold text-brand-primary tracking-widest">404</h1>
      <div className="bg-brand-accent text-white px-2 text-sm rounded rotate-12 absolute">
        {t('notFound.title')}
      </div>
      <p className="mt-4 text-lg text-brand-muted">{t('notFound.description')}</p>
      <Link
        to="/dashboard"
        className="mt-6 px-6 py-3 bg-brand-primary text-white font-semibold rounded-md shadow-brand-soft hover:bg-brand-primary-hover"
      >
        {t('notFound.goHome')}
      </Link>
    </div>
  );
};

export default NotFound;
