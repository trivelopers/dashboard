import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import LanguageSelector from './LanguageSelector';

import { ArrowLeftOnRectangleIcon, UserCircleIcon } from '@heroicons/react/24/solid';
import nodaiLogo from '../nodai-definitivo.png';

import { navItems } from './navItems';
import api from '../services/api';

const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setCompanyName(null);
      return;
    }

    let isMounted = true;

    const fetchCompanyName = async () => {
      try {
        const { data } = await api.get<{ name?: string }>('dashboard/clients/current');
        if (isMounted) {
          setCompanyName(data?.name ?? null);
        }
      } catch (error) {
        console.error('Error fetching company name', error);
        if (isMounted) {
          setCompanyName(null);
        }
      }
    };

    fetchCompanyName();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };
  
  if (!user) return null;

  return (
    <div className="flex flex-col w-64 bg-brand-dark text-[#E5E7EB] h-full shadow-brand-soft">
      <div className="border-b border-white/10 bg-brand-dark flex flex-col items-center py-8 px-6">
      <span className="w-full text-center text-2xl font-semibold tracking-wide text-white mb-4">
          {companyName ? (
            <>
              <span className="text-brand-primary">Asistente virtual</span> de {companyName}
            </>
          ) : (
            <span className="text-brand-primary">Asistente virtual</span>
          )}
        </span>
        <img
          src={nodaiLogo}
          alt="nodai"
          className="max-h-6 w-auto object-contain"
        />
      </div>
      <nav className="flex-1 px-2 py-4 space-y-2">
        {navItems.map(item => {
          if (!user.role || !item.roles.includes(user.role)) {
            return null;
          }
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `group flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 ${
                  isActive
                    ? 'bg-white/10 text-white border-l-4 border-brand-primary shadow-brand-soft'
                    : 'text-[#E5E7EB] hover:text-white hover:bg-white/5'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={`h-5 w-5 mr-3 transition-colors duration-200 ${isActive ? 'text-brand-primary' : 'text-[#BBD6E5] group-hover:text-brand-primary group-focus:text-brand-primary'}`}
                  />
                  {item.to === '/company' ? companyName ?? t(item.labelKey) : t(item.labelKey)}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center justify-between mb-4">
          <LanguageSelector />
        </div>
        <div className="flex items-center mb-4">
            <UserCircleIcon className="h-10 w-10 text-brand-primary/70 mr-3"/>
            <div>
                <p className="font-semibold text-white">{user.name}</p>
                <span className="text-xs bg-brand-primary text-brand-dark px-2 py-0.5 rounded-full">{user.role}</span>
            </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center w-full px-4 py-2.5 text-sm font-medium rounded-lg text-[#E5E7EB] hover:bg-white/10 hover:text-brand-primary transition-colors duration-200"
        >
          <ArrowLeftOnRectangleIcon className="h-5 w-5 mr-3" />
          {t('navigation.logout')}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
