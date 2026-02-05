import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, Link, useNavigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { MainPage } from './pages/MainPage';
import { Pos } from './pages/Pos';
import { FinishedWarehouse } from './pages/FinishedWarehouse';
import { RawWarehouse } from './pages/RawWarehouse';
import { GeneralWarehouse } from './pages/GeneralWarehouse';
import { Purchases } from './pages/Purchases';
import { Sales } from './pages/Sales';
import { Reports } from './pages/Reports';
import { ItemsPage } from './pages/ItemsPage';
import { SettingsPage } from './pages/SettingsPage';
import { ListManagement } from './pages/ListManagement';
import { DynamicReportPage } from './pages/DynamicReportPage';
import { MonthlyReports } from './pages/MonthlyReports';
import { Expenses } from './pages/Expenses';
import { Login } from './pages/Login';
import { LogOut, Menu, X, Info, ShieldCheck, Box, User as UserIcon } from 'lucide-react';
import { getIcon } from './utils/icons';
import { AiAssistant } from './components/AiAssistant';
import { ToastContainer } from './components/NeumorphicUI';

// Layout Wrapper
const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, settings, notifications, removeNotification, logout } = useApp();
  const location = useLocation();
  
  useEffect(() => {
    if (settings.globalAppTitle) {
      document.title = settings.globalAppTitle;
    }
  }, [settings.globalAppTitle]);

  if (!user && location.pathname !== '/login') {
    return <Navigate to="/login" replace />;
  }

  const handleLogoutClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    logout();
  };

  const isLoginPage = location.pathname === '/login';

  return (
    <div className={`flex flex-col h-screen overflow-hidden bg-[#f4f7fa] text-gray-800 ${settings.language === 'ar' ? 'font-cairo' : 'font-sans'}`} dir={settings.language === 'ar' ? 'rtl' : 'ltr'}>
      
      {/* Top Professional Header (White Bar) */}
      {user && !isLoginPage && (
        <header className="h-16 bg-white shadow-[0_2px_15px_rgba(0,0,0,0.03)] border-b border-slate-100 flex items-center justify-between px-8 z-[100] no-print">
          {/* Right Side: System Info & Profile */}
          <div className="flex items-center gap-4">
            <div className="bg-[#4361ee] p-2 rounded-xl text-white shadow-lg shadow-indigo-100">
              <Box size={24} />
            </div>
            <div className="flex flex-col items-start leading-none">
              <h1 className="text-sm font-black text-slate-800 mb-1">نظام إدارة مخازن الدقهلية</h1>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-400">المستخدم:</span>
                <span className="text-[11px] font-black text-blue-600">{user.name}</span>
              </div>
            </div>
          </div>

          {/* Left Side: Logout & Admin Badge */}
          <div className="flex items-center gap-6">
            {/* Admin Badge */}
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">ADMIN</span>
            </div>

            {/* Logout Button */}
            <button 
              onClick={handleLogoutClick}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all font-black text-xs border border-rose-100 shadow-sm active:scale-95 group"
            >
              <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </header>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden relative z-10 pt-4">
        <div className="relative z-20 min-h-full">
           {children}
        </div>
      </main>

      <AiAssistant />
      <ToastContainer notifications={notifications} onRemove={removeNotification} />
      
      {/* Global Footer */}
      {settings.globalFooterVisible && !isLoginPage && (
        <footer className="bg-white border-t border-slate-100 py-1.5 px-6 flex justify-between items-center text-[10px] font-bold text-slate-400 no-print z-40 shrink-0 relative">
            <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                <span className="uppercase tracking-widest">System Online</span>
            </div>
            <div className="text-center flex-1 mx-4 truncate">
                {settings.globalFooterText}
            </div>
            <div className="flex items-center gap-4">
                <span className="font-mono" dir="ltr">{new Date().getFullYear()} © warehouse-Erp</span>
            </div>
        </footer>
      )}
    </div>
  );
};

// Routes
const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/view/login" element={<Login />} />
      <Route path="/" element={<Layout><MainPage /></Layout>} />
      <Route path="/warehouse/finished" element={<Layout><FinishedWarehouse /></Layout>} />
      <Route path="/warehouse/raw" element={<Layout><RawWarehouse /></Layout>} />
      <Route path="/warehouse/general" element={<Layout><GeneralWarehouse /></Layout>} />
      <Route path="/purchases" element={<Layout><Purchases /></Layout>} />
      <Route path="/sales" element={<Layout><Sales /></Layout>} />
      <Route path="/pos" element={<Layout><Pos /></Layout>} />
      <Route path="/reports" element={<Layout><Reports /></Layout>} />
      <Route path="/monthly-reports" element={<Layout><MonthlyReports /></Layout>} />
      <Route path="/settings" element={<Layout><SettingsPage /></Layout>} />
      <Route path="/settings/lists" element={<Layout><ListManagement /></Layout>} />
      <Route path="/items" element={<Layout><ItemsPage /></Layout>} />
      <Route path="/expenses" element={<Layout><Expenses /></Layout>} />
      <Route path="/report/:reportId" element={<Layout><DynamicReportPage /></Layout>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AppProvider>
  );
};

export default App;