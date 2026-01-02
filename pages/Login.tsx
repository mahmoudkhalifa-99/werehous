
import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { GlassCard, GlassInput, GlassButton } from '../components/NeumorphicUI';
import { Lock, User } from 'lucide-react';
import { motion } from 'framer-motion';

export const Login: React.FC = () => {
  const { login, t, settings } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');

  // Effect to load saved credentials if they exist
  useEffect(() => {
    const savedCreds = localStorage.getItem('glasspos_credentials');
    if (savedCreds) {
        try {
            const { u, p } = JSON.parse(savedCreds);
            if (u && p) {
                setUsername(u);
                setPassword(p);
                setRememberMe(true);
            }
        } catch (e) {
            localStorage.removeItem('glasspos_credentials');
        }
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Attempt login
    if (login(username, password, rememberMe)) {
      // If successful and rememberMe is checked, save credentials separately
      if (rememberMe) {
          localStorage.setItem('glasspos_credentials', JSON.stringify({ u: username, p: password }));
      } else {
          localStorage.removeItem('glasspos_credentials');
      }
    } else {
      setError('Invalid credentials (Try admin/123)');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <GlassCard className="flex flex-col gap-6 items-center py-12">
          {settings.loginScreenLogo ? (
             <div className="w-32 h-32 rounded-full overflow-hidden shadow-lg shadow-blue-500/20 mb-4 bg-white border-4 border-white">
                 <img src={settings.loginScreenLogo} alt="Logo" className="w-full h-full object-cover" />
             </div>
          ) : (
             <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/40 mb-4">
                <Lock className="text-white w-8 h-8" />
             </div>
          )}
          
          <h1 className="text-2xl font-bold text-gray-700">{t('loginTitle')}</h1>
          
          <form onSubmit={handleLogin} className="w-full flex flex-col gap-4">
            <div className="relative">
              <User className="absolute top-9 left-3 w-5 h-5 text-gray-400 z-10" />
              <GlassInput 
                label={t('username')}
                value={username} 
                onChange={e => setUsername(e.target.value)}
                className="pl-10"
                placeholder="username"
              />
            </div>
            
            <div className="relative">
              <Lock className="absolute top-9 left-3 w-5 h-5 text-gray-400 z-10" />
              <GlassInput 
                label={t('password')}
                type="password"
                value={password} 
                onChange={e => setPassword(e.target.value)}
                className="pl-10"
                placeholder="password"
              />
            </div>

            <div className="flex items-center gap-2 px-2 dir-rtl">
                <input
                    type="checkbox"
                    id="remember"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 accent-blue-600 cursor-pointer"
                />
                <label htmlFor="remember" className="text-sm text-gray-600 cursor-pointer select-none font-bold">
                    {t('rememberMe')}
                </label>
            </div>

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            
            <GlassButton type="submit" variant="primary" className="mt-2 w-full">
              {t('loginBtn')}
            </GlassButton>
          </form>
          
        </GlassCard>
      </motion.div>
    </div>
  );
};
