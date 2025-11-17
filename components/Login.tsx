import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import Button from './ui/Button';
import { AppLogoFull } from '../utils/icons';

interface LoginProps {
  onLogin: (username: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const { t, users } = useAppContext();
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(u => u.username === username);

    if (user && user.pin === pin) {
      onLogin(username);
    } else {
      setError('Invalid username or PIN.');
    }
  };

  return (
    <div className="min-h-screen bg-light flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 space-y-6">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <AppLogoFull />
          </div>
          <p className="mt-2 text-slate-600">{t('loginTitle')}</p>
        </div>
        <form className="space-y-6" onSubmit={handleLogin}>
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-slate-700">
              {t('username')}
            </label>
            <select
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm
                         focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            >
              <option value="">Select User</option>
              <option value="Owner">{t('owner')}</option>
              <option value="Seller">{t('seller')}</option>
            </select>
          </div>
          <div>
            <label htmlFor="pin" className="block text-sm font-medium text-slate-700">
              {t('pin')}
            </label>
            <input
              id="pin"
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm
                         focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              placeholder="****"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div>
            <Button type="submit" className="w-full" disabled={!username || !pin}>
              {t('login')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
