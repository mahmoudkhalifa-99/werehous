
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, CartItem, AppSettings, SystemUser, UiConfig, ButtonConfig, AppNotification } from '../types';
import { dbService } from '../services/storage';

interface AppContextProps {
  products: Product[];
  refreshProducts: () => void;
  deleteProduct: (id: string) => void;
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
  addButton: (screenId: keyof UiConfig, btn: ButtonConfig) => void;
  updateButtonFull: (screenId: keyof UiConfig, index: number, btn: ButtonConfig) => void;
  removeButton: (screenId: keyof UiConfig, buttonId: string) => void;
  reorderButtons: (screenId: keyof UiConfig, buttons: ButtonConfig[]) => void;
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
    // 1. تهيئة النظام والتحقق من الإصدار
    dbService.init();
    
    // 2. تحميل البيانات المحلية فوراً لسرعة الاستجابة
    const localUi = dbService.getUiConfig();
    const localSettings = dbService.getSettings();
    const localProducts = dbService.getProducts();
    
    setUiConfig(localUi);
    setSettingsState(localSettings);
    setProducts(localProducts);
    
    // 3. المزامنة السحابية الذكية
    if (user) {
        dbService.syncFromCloud().then(success => {
            if (success) {
                // إعادة قراءة البيانات بعد المزامنة وتطبيق "الترميم" التلقائي
                const freshUi = dbService.getUiConfig();
                // حماية إضافية: لا نقوم بتحديث الواجهة إذا كانت البيانات السحابية فارغة بشكل مريب
                if (freshUi && freshUi.main && freshUi.main.buttons.length > 0) {
                   setUiConfig(freshUi);
                }
                setSettingsState(dbService.getSettings());
                setProducts(dbService.getProducts());
            }
        });
    }
  }, [user]);

  const refreshProducts = () => setProducts(dbService.getProducts());

  const login = async (u: string, p: string, remember: boolean = false) => {
    const foundUser = await dbService.login(u, p);
    if (foundUser) {
      setUser(foundUser);
      if (remember) localStorage.setItem('glasspos_currentUser', JSON.stringify(foundUser));
      else sessionStorage.setItem('glasspos_currentUser', JSON.stringify(foundUser));
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem('glasspos_currentUser');
    sessionStorage.removeItem('glasspos_currentUser');
    setUser(null);
    setCart([]);
  };

  const updateSettings = (newSettings: AppSettings) => {
    dbService.saveSettings(newSettings);
    setSettingsState(newSettings);
  };

  const saveUiConfig = () => dbService.saveUiConfig(uiConfig);

  const deleteProduct = (id: string) => {
    dbService.deleteProduct(id);
    refreshProducts();
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      return [...prev, { ...product, quantity: 1, discount: 0 }];
    });
  };

  const updateCartQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) return { ...item, quantity: Math.max(0, item.quantity + delta) };
      return item;
    }).filter(item => item.quantity > 0));
  };

  const t = (key: string, defaultVal: string = '') => key;

  const addNotification = (message: string, type: AppNotification['type'] = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [{ id, message, type, timestamp: new Date() }, ...prev].slice(0, 5));
  };

  const removeNotification = (id: string) => setNotifications(prev => prev.filter(n => n.id !== id));

  const syncAllData = async () => {
      const ok = await dbService.syncFromCloud();
      if (ok) {
          refreshProducts();
          setSettingsState(dbService.getSettings());
          const freshUi = dbService.getUiConfig();
          if (freshUi && freshUi.main && freshUi.main.buttons.length > 0) {
             setUiConfig(freshUi);
          }
          addNotification('تمت المزامنة بنجاح واستقرار الواجهة', 'success');
      } else {
          addNotification('فشلت المزامنة: يرجى التحقق من القواعد السحابية', 'error');
      }
  };

  const addButton = (screenId: keyof UiConfig, btn: ButtonConfig) => {
      setUiConfig(prev => {
          const next = { ...prev };
          next[screenId].buttons = [...next[screenId].buttons, btn];
          return next;
      });
  };

  const updateButtonFull = (screenId: keyof UiConfig, index: number, btn: ButtonConfig) => {
      setUiConfig(prev => {
          const next = { ...prev };
          next[screenId].buttons[index] = btn;
          return next;
      });
  };

  const removeButton = (screenId: keyof UiConfig, buttonId: string) => {
      setUiConfig(prev => {
          const next = { ...prev };
          next[screenId].buttons = next[screenId].buttons.filter(b => b.id !== buttonId);
          return next;
      });
  };

  const reorderButtons = (screenId: keyof UiConfig, buttons: ButtonConfig[]) => {
      setUiConfig(prev => {
          const next = { ...prev };
          next[screenId].buttons = buttons;
          return next;
      });
  };

  return (
    <AppContext.Provider value={{
      products, refreshProducts, deleteProduct, cart, addToCart, updateCartQuantity, 
      clearCart: () => setCart([]), user, login, logout, settings, updateSettings,
      uiConfig, setUiConfig, saveUiConfig, isSidebarOpen, toggleSidebar: () => setIsSidebarOpen(!isSidebarOpen),
      t, notifications, addNotification, removeNotification, syncAllData,
      addButton, updateButtonFull, removeButton, reorderButtons
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
