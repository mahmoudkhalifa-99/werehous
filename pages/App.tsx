import React, { useEffect, useMemo, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
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
import { LogOut, Menu, X, Box, LayoutGrid } from 'lucide-react';
import { getIcon } from './utils/icons';
import { AiAssistant } from './components/AiAssistant';
import { ToastContainer } from './components/NeumorphicUI';
import SplashScreen from './components/SplashScreen';

// Sidebar Navigation Component
const Sidebar: React.FC = () => {
  const { uiConfig, t, can, isSidebarOpen, toggleSidebar } = useApp();
  const location = useLocation();

  const allowedLinks = useMemo(() => {
    return uiConfig.sidebar.buttons.filter(btn => {
      if (!btn.isVisible) return false;
      return can('screens', btn.id, 'available');
    });
  }, [uiConfig.sidebar.buttons, can]);

  if (!isSidebarOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-60 bg-slate-900 text-white z-[200] shadow-2xl animate-fade-in flex flex-col no-print font-cairo">
      <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg">
            <LayoutGrid size={18} />
          </div>
          <span className="font-black text-base">قائمة النظام</span>
        </div>
        <button onClick={toggleSidebar} className="p-1.5 hover:bg-slate-800 rounded-full transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1 py-4">
        {allowedLinks.map((btn) => {
          const Icon = getIcon(btn.icon);
          const isActive =
            location.pathname ===
            (btn.action.startsWith('navigate:') ? btn.action.split(':')[1] : '');

          return (
            <Link
              key={btn.id}
              to={btn.action.startsWith('navigate:') ? btn.action.split(':')[1] : '#'}
              onClick={() => toggleSidebar()}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-black text-xs group ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xl translate-x-[-4px]'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div
                className={`${
                  isActive
                    ? 'text-white'
                    : 'text-slate-500 group-hover:text-blue-400'
                } transition-colors`}
              >
                <Icon size={18} />
              </div>
              <span>{btn.labelAr || t(btn.labelKey)}</span>
            </Link>
          );
        })}
      </div>

      <div className="p-4 bg-slate-950 text-[9px] text-slate-600 font-bold border-t border-slate-800">
        نظام إدارة مخازن الدقهلية v2.0
      </div>
    </div>
  );
};

// Layout Wrapper
const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, settings, notifications, removeNotification, logout, toggleSidebar, isSidebarOpen } = useApp();
  const location = useLocation();

  useEffect(() => {
    if (settings.globalAppTitle) {
      document.title = settings.globalAppTitle;
    }
  }, [settings.globalAppTitle]);

  if (!user && location.pathname !== '/login') {
    return <Navigate to="/login" replace />;
  }

  const isLoginPage = location.pathname === '/login';

  return (
    <div
      className={`flex flex-col h-screen overflow-hidden bg-[#f4f7fa] text-gray-800 ${
        settings.language === 'ar' ? 'font-cairo' : 'font-sans'
      }`}
      dir={settings.language === 'ar' ? 'rtl' : 'ltr'}
    >
      {user && !isLoginPage && (
        <header className="h-12 bg-white shadow-sm border-b border-slate-100 flex items-center justify-between px-4 z-[100] no-print">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSidebar}
              className="p-1.5 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-lg transition-all border border-slate-200"
            >
              <Menu size={20} />
            </button>

            <div className="flex items-center gap-3">
              <div className="bg-[#4361ee] p-1.5 rounded-lg text-white shadow-md">
                <Box size={18} />
              </div>
              <div className="flex flex-col items-start leading-none">
                <h1 className="text-xs font-black text-slate-800 mb-0.5">
                  نظام الدقهلية
                </h1>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-bold text-slate-400">
                    المستخدم:
                  </span>
                  <span className="text-[9px] font-black text-blue-600">
                    {user.name}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all font-black text-[10px]"
          >
            <LogOut size={14} />
            خروج
          </button>
        </header>
      )}

      <Sidebar />
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150] no-print"
          onClick={toggleSidebar}
        />
      )}

      <main className="flex-1 overflow-y-auto overflow-x-hidden relative z-10 pt-2">
        {children}
      </main>

      <AiAssistant />
      <ToastContainer notifications={notifications} onRemove={removeNotification} />
    </div>
  );
};

// Routes
const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
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

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2200);
    return () => clearTimeout(timer);
  }, []);

  if (loading) return <SplashScreen />;

  return (
    <AppProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AppProvider>
  );
};

export default App;
 