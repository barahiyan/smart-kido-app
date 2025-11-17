import React from 'react';
import { useAppContext } from '../../contexts/AppContext';
import type { Language } from '../../types';
import { AppLogoIcon } from '../../utils/icons';

interface HeaderProps {
  user: string | null;
  onLogout: () => void;
  toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout, toggleSidebar }) => {
  const { language, setLanguage, t } = useAppContext();

  const handleLanguageChange = () => {
    const newLang: Language = language === 'en' ? 'sw' : 'en';
    setLanguage(newLang);
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
             <button onClick={toggleSidebar} className="lg:hidden mr-4 p-2 rounded-md text-slate-500 hover:bg-slate-100">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
             </button>
             <div className="flex items-center gap-2">
                <AppLogoIcon className="h-8 w-8" />
                <h1 className="text-xl font-bold text-primary">{t('appName')}</h1>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className={`font-semibold ${language === 'en' ? 'text-primary' : 'text-slate-400'}`}>EN</span>
              <label htmlFor="language-toggle" className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" id="language-toggle" className="sr-only peer" checked={language === 'sw'} onChange={handleLanguageChange} />
                <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-primary-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
              <span className={`font-semibold ${language === 'sw' ? 'text-primary' : 'text-slate-400'}`}>SW</span>
            </div>
            <div className="hidden sm:flex items-center space-x-2">
              <span className="text-slate-600">{t('welcome')}, <span className="font-bold">{user}</span></span>
              <button onClick={onLogout} title={t('logout')} className="p-2 rounded-full text-slate-500 hover:bg-slate-100 hover:text-red-500 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
