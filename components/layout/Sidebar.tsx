
import React from 'react';
import { CustomersIcon, DashboardIcon, ReportsIcon, SalesIcon, LogoutIcon, ProductsIcon, SettingsIcon, AppLogoIcon, SuppliersIcon, PurchasesIcon } from '../../utils/icons';
import { useAppContext } from '../../contexts/AppContext';
import type { Page } from '../../types';

interface SidebarProps {
  page: Page;
  setPage: (page: Page) => void;
  onLogout: () => void;
  user: string | null;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const NavLink: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
      isActive
        ? 'bg-primary-100 text-primary-700 font-bold'
        : 'text-slate-600 hover:bg-slate-100 hover:text-dark'
    }`}
  >
    <span className="mr-3">{icon}</span>
    {label}
  </button>
);

const Sidebar: React.FC<SidebarProps> = ({ page, setPage, user, onLogout, isOpen, setIsOpen }) => {
  const { t } = useAppContext();

  const handleNavigation = (p: Page) => {
    setPage(p);
    if(window.innerWidth < 1024) { // Close sidebar on mobile after navigation
      setIsOpen(false);
    }
  }

  return (
    <>
    <div className={`fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsOpen(false)}></div>
    <aside className={`fixed top-0 left-0 h-full bg-white w-64 shadow-lg z-40 transform transition-transform lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex flex-col h-full">
        <div className="p-4 border-b flex items-center gap-3">
          <AppLogoIcon className="h-9 w-9" />
          <h2 className="text-xl font-bold text-primary">{t('appName')}</h2>
        </div>
        <nav className="flex-grow p-4 space-y-2">
          <NavLink icon={<DashboardIcon />} label={t('dashboard')} isActive={page === 'dashboard'} onClick={() => handleNavigation('dashboard')} />
          <NavLink icon={<SalesIcon />} label={t('sales')} isActive={page === 'sales'} onClick={() => handleNavigation('sales')} />
          <NavLink icon={<PurchasesIcon />} label={t('purchases')} isActive={page === 'purchases'} onClick={() => handleNavigation('purchases')} />
          <NavLink icon={<ProductsIcon />} label={t('products')} isActive={page === 'products'} onClick={() => handleNavigation('products')} />
          <NavLink icon={<CustomersIcon />} label={t('customers')} isActive={page === 'customers'} onClick={() => handleNavigation('customers')} />
          <NavLink icon={<SuppliersIcon />} label={t('suppliers')} isActive={page === 'suppliers'} onClick={() => handleNavigation('suppliers')} />
          <NavLink icon={<ReportsIcon />} label={t('reports')} isActive={page === 'reports'} onClick={() => handleNavigation('reports')} />
          {user === 'Owner' && (
            <NavLink icon={<SettingsIcon />} label={t('settings')} isActive={page === 'settings'} onClick={() => handleNavigation('settings')} />
          )}
        </nav>
        <div className="p-4 border-t mt-auto">
           <div className="flex sm:hidden items-center space-x-2 p-2 mb-2">
              <span className="text-slate-600 text-sm">{t('welcome')}, <span className="font-bold">{user}</span></span>
            </div>
          <button onClick={onLogout} className="w-full flex items-center px-4 py-3 text-left text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <LogoutIcon className="mr-3" />
            {t('logout')}
          </button>
        </div>
      </div>
    </aside>
    </>
  );
};

export default Sidebar;
