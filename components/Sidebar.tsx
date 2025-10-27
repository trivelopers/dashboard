import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { Role } from '../types';
import LanguageSelector from './LanguageSelector';

import { 
    ChartPieIcon, PhoneIcon, ChatBubbleLeftRightIcon, UserGroupIcon, 
    ArrowLeftOnRectangleIcon, UserCircleIcon 
} from '@heroicons/react/24/solid';

const NeuralChipIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    {...props}
  >
    <rect x="6" y="6" width="12" height="12" rx="2" />
    <path d="M9 9.5h6M9 14.5h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M10.5 8v2.5M13.5 8v2.5M10.5 13.5V16M13.5 13.5V16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <circle cx="9" cy="11.5" r="1" fill="currentColor" />
    <circle cx="15" cy="11.5" r="1" fill="currentColor" />
    <circle cx="12" cy="13" r="1" fill="currentColor" />
    <path d="M12 4V2M16 4l.5-1.5M8 4 7.5 2.5M6 8H4M6 12H3.5M6 16H4M18 8h2M18 12h2.5M18 16h2M12 20v2M16 20l.5 1.5M8 20 7.5 21.5" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
  </svg>
);

const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };
  
  const navItems = [
    { to: '/dashboard', label: t('navigation.dashboard'), icon: ChartPieIcon, roles: [Role.ADMIN, Role.EDITOR, Role.VIEWER] },
    { to: '/contacts', label: t('navigation.contacts'), icon: PhoneIcon, roles: [Role.ADMIN, Role.EDITOR, Role.VIEWER] },
    { to: '/prompt', label: t('navigation.prompt'), icon: NeuralChipIcon, roles: [Role.ADMIN, Role.EDITOR] },
    { to: '/users', label: t('navigation.users'), icon: UserGroupIcon, roles: [Role.ADMIN] },
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
