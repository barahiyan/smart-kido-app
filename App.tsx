import React, { useState } from 'react';
import Login from './components/Login';
import Layout from './components/layout/Layout';
import Dashboard from './components/Dashboard';
import Customers from './components/Customers';
import Sales from './components/Sales';
import Reports from './components/Reports';
import Products from './components/Products';
import Settings from './components/Settings';
import Suppliers from './components/Suppliers';
import Purchases from './components/Purchases';
import TestConnection from './components/TestConnection'; // Hii ndio tumeongeza
import type { Page } from './types';
import useLocalStorage from './hooks/useLocalStorage';

const App: React.FC = () => {
  // Use useLocalStorage for the user state so it persists across reloads
  const [user, setUser] = useLocalStorage<string | null>('app-user', null);
  const [page, setPage] = useState<Page>('dashboard');

  const isAuthenticated = !!user;

  const handleLogin = (username: string) => {
    setUser(username);
  };

  const handleLogout = () => {
    setUser(null);
  };

  const renderPage = () => {
    switch (page) {
      case 'dashboard':
        return (
          <>
            {/* Tumeiweka hapa ili uione ukiwa Dashboard */}
            <TestConnection />
            <Dashboard />
          </>
        );
      case 'customers':
        return <Customers />;
      case 'sales':
        return <Sales />;
      case 'reports':
        return <Reports />;
      case 'products':
        return <Products />;
      case 'suppliers':
        return <Suppliers />;
      case 'purchases':
        return <Purchases />;
      case 'settings':
        // Only allow owner to access settings
        return user === 'Owner' ? <Settings user={user} /> : <Dashboard />;
      default:
        return <Dashboard />;
    }
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="bg-light min-h-screen text-dark">
      <Layout page={page} setPage={setPage} user={user} onLogout={handleLogout}>
        {renderPage()}
      </Layout>
    </div>
  );
};

export default App;