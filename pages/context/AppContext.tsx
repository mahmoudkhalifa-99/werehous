
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, CartItem, AppSettings, SystemUser, UiConfig, ButtonConfig, AppNotification, PermissionLevel, Role, ScreenConfig, CustomReportConfig } from '../types';
import { dbService } from '../services/storage';

interface AppContextProps {
  products: Product[];
  refreshProducts: () => void;
  deleteProduct: (id: string) => void;
  deleteUser: (id: string) => void;
  cart: CartItem[];
  addToCart: (product: Product) => void;
  updateCartQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  user: SystemUser | null;
  login: (u: string, p: string, remember?: boolean) => Promise<boolean>;
  logout: () => void;
  settings: AppSettings;
  updateSettings: (newSettings: AppSettings) => void;
  uiConfig: UiConfig;
  setUiConfig: React.Dispatch<React.SetStateAction<UiConfig>>;
  saveUiConfig: () => void;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  t: (key: string, defaultVal?: string) => string;
  addNotification: (message: string, type?: AppNotification['type']) => void;
  removeNotification: (id: string) => void;
  syncAllData: () => Promise<void>;
  notifications: AppNotification[];
  updateScreenButtons: (screenId: keyof UiConfig, buttons: ButtonConfig[]) => void;
  can: (type: 'screens' | 'features' | 'actions', key: string, requiredLevel?: PermissionLevel | 'boolean') => boolean;
  addCustomReport: (report: CustomReportConfig, target: keyof UiConfig) => void;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SystemUser | null>(() => {
    const saved = localStorage.getItem('glasspos_currentUser') || sessionStorage.getItem('glasspos_currentUser');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [settings, setSettingsState] = useState<AppSettings>(() => dbService.getSettings());
  const [uiConfig, setUiConfig] = useState<UiConfig>(() => dbService.getUiConfig());
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    const startup = async () => {
        await dbService.init();
        refreshLocalData();
        if (user) await syncAllData();
    };
    startup();
  }, []);

  const refreshLocalData = () => {
    setUiConfig(dbService.getUiConfig());
    setSettingsState(dbService.getSettings());
    setProducts(dbService.getProducts());
  };

  const can = (type: 'screens' | 'features' | 'actions', key: string, requiredLevel: PermissionLevel | 'boolean' = 'available'): boolean => {
    if (!user) return false;
    const role = user.role?.toLowerCase() || '';
    if (role === 'admin' || role === 'system_supervisor') return true;
    if (type === 'screens') {
        const baseKey = key.replace('m_', '').replace('sb_', '');
        const level = user.permissions?.screens?.[`sb_${baseKey}`] || user.permissions?.screens?.[`m_${baseKey}`];
        if (level && level !== 'hidden') return requiredLevel === 'edit' ? level === 'edit' : true;
    } else if (type === 'features') {
        const level = user.permissions?.features?.[key];
        if (level && level !== 'hidden') return requiredLevel === 'edit' ? level === 'edit' : true;
    } else if (type === 'actions') {
        return !!(user.permissions?.actions as any)?.[key];
    }
    if (key === 'sb_home' || key === 'm_home' || key === 'm_dashboard') return true;
    return false;
  };

  const login = async (u: string, p: string, remember: boolean = false) => {
    const foundUser = await dbService.login(u, p);
    if (foundUser) {
      setUser(foundUser);
      if (remember) localStorage.setItem('glasspos_currentUser', JSON.stringify(foundUser));
      else sessionStorage.setItem('glasspos_currentUser', JSON.stringify(foundUser));
      
      // مزامنة فورية بعد الدخول
      await syncAllData();
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem('glasspos_currentUser');
    sessionStorage.removeItem('glasspos_currentUser');
    setUser(null);
  };

  const syncAllData = async () => {
    const result = await dbService.syncFromCloud();
    if (result.success) {
        refreshLocalData();
        // تحديث بيانات المستخدم الحالي في الـ state لضمان سريان تحديثات الصلاحيات فوراً
        const currentUsers = dbService.getUsers();
        const updatedMe = currentUsers.find(u => u.id === user?.id);
        if (updatedMe) {
            setUser(updatedMe);
            localStorage.setItem('glasspos_currentUser', JSON.stringify(updatedMe));
        }
        addNotification('تم تحديث البيانات والصلاحيات حياً من السحابة', 'success');
    } else if (result.error === 'unavailable') {
        refreshLocalData();
        addNotification('تعذر الاتصال بالسحابة. تعمل الآن في وضع "بدون إنترنت"', 'warning');
    }
  };

  const updateSettings = (newSettings: AppSettings) => {
    dbService.saveSettings(newSettings);
    setSettingsState(newSettings);
  };

  const saveUiConfig = () => {
      dbService.saveUiConfig(uiConfig);
      addNotification('تم حفظ وتطبيق توزيع الأزرار السحابي الجديد', 'success');
  };

  const updateScreenButtons = (screenId: keyof UiConfig, buttons: ButtonConfig[]) => {
      setUiConfig(prev => ({
          ...prev,
          [screenId]: { ...prev[screenId], buttons }
      }));
  };

  const addNotification = (message: string, type: AppNotification['type'] = 'info') => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, message, type, timestamp: new Date() }]);
  };

  const refreshProducts = () => setProducts(dbService.getProducts());

  const addCustomReport = (report: CustomReportConfig, target: keyof UiConfig) => {
    const newSettings = { ...settings };
    if (!newSettings.customReports) newSettings.customReports = [];
    newSettings.customReports.push(report);
    updateSettings(newSettings);
    
    const newUiConfig = { ...uiConfig };
    if (newUiConfig[target]) {
        newUiConfig[target].buttons.push({
            id: report.id,
            labelKey: report.title,
            labelAr: report.title,
            icon: 'FileText',
            color: 'bg-blue-600',
            action: `navigate:/report/${report.id}`,
            isVisible: true
        });
        setUiConfig(newUiConfig);
        dbService.saveUiConfig(newUiConfig);
    }
  };

  return (
    <AppContext.Provider value={{
      products, refreshProducts, deleteProduct: (id) => { dbService.deleteProduct(id); refreshProducts(); },
      deleteUser: (id) => { dbService.deleteUser(id); syncAllData(); },
      cart, addToCart: (p) => {}, updateCartQuantity: (id, d) => {}, clearCart: () => {},
      user, login, logout, settings, updateSettings,
      uiConfig, setUiConfig, saveUiConfig,
      isSidebarOpen, toggleSidebar: () => setIsSidebarOpen(!isSidebarOpen),
      t: (k) => k, notifications, addNotification, 
      removeNotification: (id) => setNotifications(prev => prev.filter(n => n.id !== id)),
      syncAllData, 
      updateScreenButtons,
      can,
      addCustomReport
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
