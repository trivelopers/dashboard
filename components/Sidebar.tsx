import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { Role } from '../types';
import LanguageSelector from './LanguageSelector';

import { 
    HomeIcon, ChartBarIcon, ChatBubbleLeftRightIcon, UsersIcon, 
    Cog6ToothIcon, ArrowLeftOnRectangleIcon, UserCircleIcon 
} from '@heroicons/react/24/solid';

const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };
  
  const navItems = [
    { to: '/dashboard', label: t('navigation.dashboard'), icon: HomeIcon, roles: [Role.ADMIN, Role.EDITOR, Role.VIEWER] },
    { to: '/contacts', label: t('navigation.contacts'), icon: ChartBarIcon, roles: [Role.ADMIN, Role.EDITOR, Role.VIEWER] },
    { to: '/prompt', label: t('navigation.prompt'), icon: Cog6ToothIcon, roles: [Role.ADMIN, Role.EDITOR] },
    { to: '/users', label: t('navigation.users'), icon: UsersIcon, roles: [Role.ADMIN] },
  ];

  if (!user) return null;

  return (
    <div className="flex flex-col w-64 bg-gray-800 text-gray-100 h-full">
      <div className="flex items-center justify-center h-20 border-b border-gray-700">
         <ChatBubbleLeftRightIcon className="h-8 w-8 text-blue-400 mr-3" />
        <h1 className="text-2xl font-bold">Tingo</h1>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-2">
        {navItems.map(item => (
          user.role && item.roles.includes(user.role) && (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center px-4 py-2.5 text-sm font-medium rounded-md transition-colors duration-200 ${
                  isActive ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`
              }
            >
              <item.icon className="h-5 w-5 mr-3" />
              {item.label}
            </NavLink>
          )
        ))}
      </nav>
      <div className="border-t border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <LanguageSelector />
        </div>
        <div className="flex items-center mb-4">
            <UserCircleIcon className="h-10 w-10 text-gray-400 mr-3"/>
            <div>
                <p className="font-semibold text-white">{user.name}</p>
                <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">{user.role}</span>
            </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center w-full px-4 py-2.5 text-sm font-medium rounded-md text-gray-300 hover:bg-red-600 hover:text-white transition-colors duration-200"
        >
          <ArrowLeftOnRectangleIcon className="h-5 w-5 mr-3" />
          {t('navigation.logout')}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;