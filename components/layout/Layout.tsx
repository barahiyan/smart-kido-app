
import React, { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import type { Page } from '../../types';

interface LayoutProps {
  children: React.ReactNode;
  page: Page;
  setPage: (page: Page) => void;
  user: string | null;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, page, setPage, user, onLogout }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-light">
      <Sidebar
        page={page}
        setPage={setPage}
        user={user}
        onLogout={onLogout}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
        <Header user={user} onLogout={onLogout} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-light">
          <div className="w-full max-w-full mx-auto px-4 sm:px-6 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
