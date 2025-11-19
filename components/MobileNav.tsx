import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeftOnRectangleIcon,
  Bars3Icon,
  UserCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/solid';
import LanguageSelector from './LanguageSelector';
import nodaiLogo from '../nodai-centrado.png';
import { navItems } from './navItems';
import { Role } from '../types';

const roleLabelKeys: Record<Role, string> = {
  [Role.ADMIN]: 'users.admin',
  [Role.EDITOR]: 'users.editor',
  [Role.VIEWER]: 'users.viewer',
};

const MobileNav: React.FC = () => {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  if (!user) return null;

  const toggleMenu = () => setIsMenuOpen((prev) => !prev);

  const handleNavigate = () => setIsMenuOpen(false);

  const handleLogout = async () => {
    setIsMenuOpen(false);
    await logout();
    navigate('/login');
  };

  return (
    <div className="md:hidden sticky top-0 z-40 bg-brand-dark text-[#E5E7EB] shadow-brand-soft">
      <div className="flex items-center justify-between px-4 py-3">
        <img src={nodaiLogo} alt="nodai" className="h-16 w-auto" />
        <div className="flex items-center gap-3">
          <LanguageSelector />
          <button
            type="button"
            onClick={toggleMenu}
            className="p-2 rounded-md bg-white/10 hover:bg-white/20 transition"
            aria-label={isMenuOpen ? t('navigation.closeMenu') : t('navigation.openMenu')}
          >
            {isMenuOpen ? (
              <XMarkIcon className="h-6 w-6 text-white" />
            ) : (
              <Bars3Icon className="h-6 w-6 text-white" />
            )}
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div className="border-t border-white/10">
          <div className="px-4 py-4 border-b border-white/10">
            <NavLink
              to="/profile"
              onClick={handleNavigate}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-2xl border px-3 py-3 text-sm font-medium transition ${
                  isActive
                    ? 'border-brand-primary/40 bg-white/10 text-white'
                    : 'border-transparent text-[#E5E7EB] hover:border-white/20 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <UserCircleIcon className="h-8 w-8 text-brand-primary" />
              <div className="flex flex-col leading-tight">
                <span>{user.name}</span>
                <span className="text-xs text-[#BBD6E5]">
                  {t(roleLabelKeys[user.role] ?? 'users.viewer')}
                </span>
              </div>
            </NavLink>
            <p className="mt-2 text-xs font-medium uppercase tracking-[0.4em] text-[#BBD6E5]">
              {t('profile.viewDetails')}
            </p>
          </div>
          <nav className="flex flex-col">
            {navItems.map((item) => {
              if (!user.role || !item.roles.includes(user.role)) {
                return null;
              }
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={handleNavigate}
                  className={({ isActive }) =>
                    `flex items-center px-4 py-3 text-base font-medium transition-colors ${
                      isActive
                        ? 'bg-white/10 text-white'
                        : 'text-[#E5E7EB] hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <item.icon className="h-5 w-5 mr-3 text-brand-primary" />
                  {t(item.labelKey)}
                </NavLink>
              );
            })}
          </nav>
          <div className="border-t border-white/10 px-4 py-4">
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-3 text-base font-medium rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              <ArrowLeftOnRectangleIcon className="h-5 w-5 mr-3 text-brand-primary" />
              {t('navigation.logout')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileNav;
