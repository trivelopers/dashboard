
import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const NotFound: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100 text-center">
      <h1 className="text-9xl font-extrabold text-blue-600 tracking-widest">404</h1>
      <div className="bg-black text-white px-2 text-sm rounded rotate-12 absolute">
        {t('notFound.title')}
      </div>
      <p className="mt-4 text-lg text-gray-600">{t('notFound.description')}</p>
      <Link
        to="/dashboard"
        className="mt-6 px-6 py-3 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700"
      >
        {t('notFound.goHome')}
      </Link>
    </div>
  );
};

export default NotFound;
