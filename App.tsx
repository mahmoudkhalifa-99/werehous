
import React from 'react';
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
import { DynamicReportPage } from './pages/DynamicReportPage';
import { MonthlyReports } from './pages/MonthlyReports';
import { LogOut, Menu } from 'lucide-react';
import { getIcon } from './utils/icons';
import { AiAssistant } from './components/AiAssistant';
import { ToastContainer } from './components/NeumorphicUI';

// Helper to check if a specific screen ID is hidden for the current user
const isScreenHidden = (permissions: any, screenId: string) => {
    if (!permissions || !permissions.screens) return false;
    return permissions.screens[screenId] === 'hidden';
};

// Map navigation paths to screen IDs for permission checking
const PATH_TO_SCREEN_ID: Record<string, string> = {
    '/warehouse/finished': 'finished',
    '/warehouse/raw': 'raw',
    '/warehouse/general': 'general',
    '/purchases': 'purchases',
    '/sales': 'sales',
    '/reports': 'reports',
    '/monthly-reports': 'monthly_reports',
    '/settings': 'settings'
};

// Sidebar Component
const Sidebar = () => {
  const { pathname } = useLocation();
  const { logout, user, settings, t, uiConfig, isSidebarOpen, toggleSidebar } = useApp();

  const sidebarButtons = uiConfig.sidebar?.buttons || [];

  return (
    <div className={`
        h-screen bg-white/40 backdrop-blur-xl border-r border-white/50 flex flex-col p-4 shadow-xl z-50 transition-all duration-300
        ${isSidebarOpen ? 'w-64' : 'w-20'}
    `}>
      <div className={`h-16 flex items-center ${isSidebarOpen ? 'justify-between' : 'justify-center'} mb-8`}>
        {isSidebarOpen && (
          <div className="flex items-center animate-fade-in">
             <div className="w-10 h-10 bg-gradient-to-tr from-blue-400 to-purple-500 rounded-xl shadow-lg flex items-center justify-center text-white font-bold text-xl">
               G
             </div>
             <span className="ml-3 font-bold text-xl text-gray-700 tracking-tight">المخازن</span>
          </div>
        )}
        <button onClick={toggleSidebar} className="p-2 rounded-lg hover:bg-white/50 text-gray-600 transition-colors">
            <Menu size={20} />
        </button>
      </div>

      <nav className="flex-1 flex flex-col gap-2 overflow-y-auto overflow-x-hidden">
        {sidebarButtons.filter(btn => btn.isVisible).map(btn => {
          if (btn.roles && user && !btn.roles.includes(user.role)) return null;

          const path = btn.action.startsWith('navigate:') ? btn.action.split(':')[1] : '/';
          const screenId = PATH_TO_SCREEN_ID[path];
          if (screenId && isScreenHidden(user?.permissions, screenId)) return null;
          if (user?.permissions?.screens?.[btn.id] === 'hidden') return null;

          const label = settings.language === 'ar' 
             ? (btn.labelAr || t(btn.labelKey))
             : (btn.labelEn || t(btn.labelKey));

          const isActive = pathname === path;
          const colorClass = isActive 
             ? 'text-blue-600' 
             : (btn.color?.includes('bg-') ? 'text-gray-500' : btn.color) || 'text-gray-500';

          const Icon = getIcon(btn.icon);

          return (
            <Link to={path} key={btn.id} title={!isSidebarOpen ? label : ''}>
              <div className={`
                flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-300 group
                ${isActive 
                  ? 'bg-white shadow-neu-flat' 
                  : 'hover:bg-white/50'}
                 ${colorClass}
                 ${!isSidebarOpen ? 'justify-center' : ''}
              `}>
                <div className={`${isActive ? 'scale-110' : 'group-hover:scale-110'} transition-transform min-w-[20px]`}>
                  <Icon size={20} />
                </div>
                {isSidebarOpen && (
                  <span className="font-medium text-sm whitespace-nowrap overflow-hidden animate-fade-in">{label}</span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-6 border-t border-gray-200/50">
        {isSidebarOpen && (
            <div className="flex items-center gap-3 px-2 mb-4 animate-fade-in">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold">
                    {user?.name.charAt(0)}
                </div>
                <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-bold text-gray-700 truncate">{user?.name}</p>
                    <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
                </div>
            </div>
        )}
        <button 
          onClick={logout}
          className={`w-full flex items-center ${isSidebarOpen ? 'justify-start gap-4' : 'justify-center'} px-3 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-colors`}
          title={t('logout')}
        >
          <LogOut size={20} />
          {isSidebarOpen && <span className="font-medium text-sm animate-fade-in">{t('logout')}</span>}
        </button>
      </div>
    </div>
  );
};

// Layout Wrapper
const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, settings, notifications, removeNotification } = useApp();
  
  // Guard removed to bypass login screen (Removed: if (!user) return <Navigate to="/login" />;)

  return (
    <div className={`flex h-screen overflow-hidden bg-[#eef2f6] text-gray-800 ${settings.language === 'ar' ? 'font-cairo' : 'font-sans'}`} dir={settings.language === 'ar' ? 'rtl' : 'ltr'}>
      <Sidebar />
      <main className="flex-1 overflow-y-auto overflow-x-hidden relative">
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-white/40 to-transparent" />
        <div className="relative z-10 min-h-full">
           {children}
        </div>
        <AiAssistant />
        <ToastContainer notifications={notifications} onRemove={removeNotification} />
      </main>
    </div>
  );
};

// Routes
const AppRoutes = () => {
  return (
    <Routes>
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
      <Route path="/items" element={<Layout><ItemsPage /></Layout>} />
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
