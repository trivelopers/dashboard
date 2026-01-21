
import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';

const Layout: React.FC = () => {
  const location = useLocation();
  const isChatPage = location.pathname.includes('/chats/');

  return (
    <div className="flex h-screen bg-brand-background">
      <div className="hidden md:flex md:flex-shrink-0 h-full">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <MobileNav />
        <main
          className={`flex-1 overflow-x-hidden overflow-y-auto bg-brand-background ${isChatPage ? '' : 'p-4 md:p-8'
            }`}
        >
          <div
            className={
              isChatPage
                ? 'h-full'
                : 'container mx-auto flex h-full flex-col'
            }
          >
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
