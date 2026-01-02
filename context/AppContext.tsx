import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, CartItem, AppSettings, SystemUser, UiConfig, ButtonConfig, CustomReportConfig, AppNotification } from '../types';
import { dbService } from '../services/storage';

// Dictionary for basic translations
const TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    // General
    welcome: 'Welcome',
    mainScreen: 'Main Screen',
    dashboard: 'Dashboard',
    settings: 'Settings',
    loginTitle: 'Login',
    username: 'Username',
    password: 'Password',
    loginBtn: 'Login',
    rememberMe: 'Remember Me',
    logout: 'Logout',
    backToMain: 'Back to Main',
    search: 'Search',
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    remove: 'Remove',
    print: 'Print',
    exportExcel: 'Export Excel',
    importExcel: 'Import Excel',
    actions: 'Actions',
    noData: 'No Data',
    date: 'Date',
    quantity: 'Quantity',
    total: 'Total',
    notes: 'Notes',
    status: 'Status',
    from: 'From',
    to: 'To',
    filter: 'Filter',
    
    // Warehouses
    finishedWarehouse: 'Finished Warehouse',
    rawWarehouse: 'Raw Warehouse',
    generalWarehouses: 'General Warehouses',
    partsWarehouse: 'Spare Parts',
    cateringWarehouse: 'Catering Warehouse',
    finishedWarehouseDesc: 'Manage finished goods, production receipts, and sales.',
    rawWarehouseDesc: 'Manage raw materials, stock levels, and consumption.',
    generalWarehouseDesc: 'Manage spare parts, equipment, and catering supplies.',
    warehouse: 'Warehouse',
    warehouseBalances: 'Final Balances Screen',

    // Items
    itemsBalances: 'Items Balances',
    items: 'Items',
    addProduct: 'Add Product',
    code: 'Code',
    item: 'Item',
    unit: 'Unit',
    currentBalance: 'Current Balance',
    minLimit: 'Min Limit',
    searchItem: 'Search Item...',
    filterAll: 'All',
    filterLow: 'Low Stock',
    filterOut: 'Out of Stock',
    cost: 'Cost',
    price: 'Price',
    stockValue: 'Stock Value',

    // Sales & Purchases
    sales: 'Sales',
    purchases: 'Purchases',
    invoice: 'Invoice',
    cashierName: 'Cashier',
    paymentMethod: 'Payment Method',
    supplier: 'Supplier',
    customer: 'Customer',
    orderNumber: 'Order #',
    department: 'Department',
    
    // Dashboard
    netProfit: 'Net Profit',
    totalSales: 'Total Sales',
    totalPurchases: 'Total Purchases',
    topMovingItems: 'Top Moving Items',
    topSuppliers: 'Top Suppliers',
    purchasesVsSales: 'Purchases vs Sales',

    // Reports
    reports: 'Reports',
    purchasesReport: 'Purchases Report',
    salesReport: 'Sales Report',
    inventoryReport: 'Inventory Report',
    movementReport: 'Movement Report',
    custodyReport: 'Custody Report',
    activityLog: 'Activity Log',
    transactionCount: 'Transaction Count',
    totalCollected: 'Total Collected',
    totalMovements: 'Total Movements',
    systemReports: 'System Reports',
    reportSystemSubtitle: 'Comprehensive reports for inventory, sales, and movements',
    reportBuilder: 'Report Builder',

    // Detailed Finished Table Headers
    openingBulk: 'Opening Bulk',
    openingPacked: 'Opening Packed',
    prodBulk: 'Production Bulk',
    receivedPacked: 'Received Packed',
    adjInPacked: 'Adj In (Packed)',
    adjInBulk: 'Adj In (Bulk)',
    returnClientPacked: 'Returns (Packed)',
    returnClientBulk: 'Returns (Bulk)',
    transferPacked: 'Transfers (Packed)',
    transferBulk: 'Transfers (Bulk)',
    salesFarmPacked: 'Farm Sales (Packed)',
    salesFarmBulk: 'Farm Sales (Bulk)',
    salesClientPacked: 'Client Sales (Packed)',
    salesClientBulk: 'Client Sales (Bulk)',
    outletTransfers: 'Outlet Transfers',
    unfinishedPacked: 'Unfinished (Packed)',
    unfinishedBulk: 'Unfinished (Bulk)',
    adjOutPacked: 'Adj Out (Packed)',
    adjOutBulk: 'Adj Out (Bulk)',
    totalBalance: 'Total Balance',
    packedBalance: 'Packed Balance',
    openingCount: 'Daily Count',
    sackWeight: 'Sack Weight',
    emptySacks: 'Empty Sacks',
    siloRemains: 'Silo Remains',
    diff: 'Difference',

    // Action Presets (Settings)
    productionReceipt: 'Production Receipt',
    issueVoucher: 'Issue Voucher',
    purchaseRequest: 'Purchase Request',
    viewIssueVouchers: 'View Issues',
    settlements: 'Settlements',
    daily_sales: 'Daily Sales',
    stocktaking: 'Stocktaking',
    returns: 'Returns',
    unfinishedProduct: 'Unfinished Product',
    salesInvoice: 'Edit Sales Invoice',
    newSale: 'New Sales Invoice',
    viewInvoices: 'View Invoices',
    salesReturn: 'Sales Return',
    salesReports: 'Sales Reports',
    client_withdrawals: 'Client Withdrawals',
    item_withdrawals: 'Item Withdrawals',
    addPurchaseOrder: 'Add Purchase Order',
    viewPurchaseOrders: 'View Purchases',
    receivePurchases: 'Receive Purchases',
    purchaseReports: 'Purchase Reports',
    employeeCustody: 'Employee Custody',
    sparePartsAndSupplies: 'Spare Parts & Supplies',
    
    // Buttons & UI
    buttonLabel: 'Button Label Key',
    buttonLabelAr: 'Label (Arabic)',
    buttonLabelEn: 'Label (English)',
  },
  ar: {
    // عام
    welcome: 'مرحباً',
    mainScreen: 'الشاشة الرئيسية',
    dashboard: 'لوحة المعلومات',
    settings: 'الإعدادات',
    loginTitle: 'تسجيل الدخول',
    username: 'اسم المستخدم',
    password: 'كلمة المرور',
    loginBtn: 'دخول',
    rememberMe: 'تذكرني',
    logout: 'تسجيل خروج',
    backToMain: 'الرجوع للقائمة',
    search: 'بحث',
    save: 'حفظ',
    cancel: 'إلغاء',
    edit: 'تعديل',
    remove: 'حذف',
    print: 'طباعة',
    exportExcel: 'تصدير Excel',
    importExcel: 'استيراد Excel',
    actions: 'إجراءات',
    noData: 'لا توجد بيانات',
    date: 'التاريخ',
    quantity: 'الكمية',
    total: 'الإجمالي',
    notes: 'ملاحظات',
    status: 'الحالة',
    from: 'من',
    to: 'إلى',
    filter: 'تصفية',

    // المخازن
    finishedWarehouse: 'مخزن المنتج التام',
    rawWarehouse: 'مخزن الخامات',
    generalWarehouses: 'المخازن العامة',
    partsWarehouse: 'قطع الغيار',
    cateringWarehouse: 'مخزن الإعاشة',
    finishedWarehouseDesc: 'إدارة المنتج التام، استلامات الإنتاج، والمبيعات',
    rawWarehouseDesc: 'إدارة الخامات، الأرصدة، والاستهلاك',
    generalWarehouseDesc: 'إدارة قطع الغيار، المهمات، والإعاشة',
    warehouse: 'المخزن',
    warehouseBalances: 'شاشة الارصدة النهائية',

    // الأصناف
    itemsBalances: 'أرصدة الأصناف',
    items: 'الأصناف',
    addProduct: 'إضافة صنف',
    code: 'الكود',
    item: 'الصنف',
    unit: 'الوحدة',
    currentBalance: 'الرصيد الحالي',
    minLimit: 'حد أدنى',
    searchItem: 'بحث عن صنف...',
    filterAll: 'الكل',
    filterLow: 'رصيد منخفض',
    filterOut: 'نفذ الرصيد',
    cost: 'التكلفة',
    price: 'السعر',
    stockValue: 'قيمة المخزون',

    // المبيعات والمشتريات
    sales: 'المبيعات',
    purchases: 'المشتريات',
    invoice: 'فاتورة',
    cashierName: 'محرر الفاتورة',
    paymentMethod: 'طريقة الدفع',
    supplier: 'المورد',
    customer: 'العميل',
    orderNumber: 'رقم الطلب',
    department: 'القسم',

    // التقارير
    reports: 'التقارير',
    purchasesReport: 'تقرير المشتريات',
    salesReport: 'تقرير المبيعات',
    inventoryReport: 'تقرير الجرد',
    movementReport: 'تقرير الحركة',
    custodyReport: 'تقرير العهدة',
    activityLog: 'سجل النشاطات',
    transactionCount: 'عدد العمليات',
    totalCollected: 'إجمالي التحصيل',
    totalMovements: 'إجمالي الحركات',
    systemReports: 'تقارير النظام',
    reportSystemSubtitle: 'تقارير شاملة للمخزون والمبيعات والحركات',
    reportBuilder: 'منشئ التقارير',

    // رؤوس جدول المنتج التام التفصيلي
    openingBulk: 'رصيد اول صب',
    openingPacked: 'رصيد أول معبأ',
    prodBulk: 'الانتاج صب',
    receivedPacked: 'الاستلامات معبأ',
    adjInPacked: 'تسوية بالإضافة معبأ',
    adjInBulk: 'تسوية بالإضافة صب',
    returnClientPacked: 'مرتجعات عملاء معبأ',
    returnClientBulk: 'مرتجعات عملاء صب',
    transferPacked: 'التحويلات معبأ',
    transferBulk: 'التحويلات صب',
    salesFarmPacked: 'مبيعات مزارع معبأ',
    salesFarmBulk: 'مبيعات مزارع صب',
    salesClientPacked: 'مبيعات عملاء معبأ',
    salesClientBulk: 'مبيعات عملاء صب',
    outletTransfers: 'تحويلات منافذ',
    unfinishedPacked: 'منتج غير تام معبأ',
    unfinishedBulk: 'منتج غير تام صب',
    adjOutPacked: 'تسوية بالعجز معبأ',
    adjOutBulk: 'تسوية بالعجز صب',
    totalBalance: 'الرصيد (صب + معبأ)',
    packedBalance: 'رصيد المعبأ فقط',
    openingCount: 'جرد اول اليوم',
    sackWeight: 'وزن الشكارة',
    emptySacks: 'الشكاير الفارغة',
    siloRemains: 'متبقى داخل الصوامع صب',
    diff: 'الفرق',

    // إعدادات الأزرار (Action Presets)
    productionReceipt: 'استلام انتاج',
    issueVoucher: 'إذن صرف',
    purchaseRequest: 'طلب شراء',
    viewIssueVouchers: 'عرض أذون الصرف',
    settlements: 'التسويات',
    daily_sales: 'المبيعات اليومية',
    stocktaking: 'جرد (رصيد افتتاحي)',
    returns: 'المرتجعات',
    unfinishedProduct: 'منتج غير تام',
    salesInvoice: 'تعديل فاتورة مبيعات',
    newSale: 'فاتورة مبيعات جديدة',
    viewInvoices: 'عرض الفواتير',
    salesReturn: 'مرتجع مبيعات',
    salesReports: 'تقارير المبيعات',
    client_withdrawals: 'مسحوبات العملاء',
    item_withdrawals: 'مسحوبات الأصناف',
    addPurchaseOrder: 'إضافة طلب شراء',
    viewPurchaseOrders: 'عرض طلبات الشراء',
    receivePurchases: 'استلام مشتريات',
    purchaseReports: 'تقارير المشتريات',
    employeeCustody: 'عهد الموظفين',
    sparePartsAndSupplies: 'قطع الغيار والمهمات',
    
    // UI
    buttonLabel: 'مفتاح النص',
    buttonLabelAr: 'النص (عربي)',
    buttonLabelEn: 'النص (انجليزي)',
  }
};

interface AppContextProps {
  products: Product[];
  refreshProducts: () => void;
  deleteProduct: (id: string) => void;
  cart: CartItem[];
  addToCart: (product: Product) => void;
  updateCartQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  user: SystemUser | null;
  login: (u: string, p: string, remember?: boolean) => boolean;
  logout: () => void;
  settings: AppSettings;
  updateSettings: (newSettings: AppSettings) => void;
  uiConfig: UiConfig;
  setUiConfig: React.Dispatch<React.SetStateAction<UiConfig>>;
  saveUiConfig: () => void;
  addButton: (screenId: keyof UiConfig, btn: ButtonConfig) => void;
  removeButton: (screenId: keyof UiConfig, buttonId: string) => void;
  updateButtonFull: (screenId: keyof UiConfig, index: number, btn: ButtonConfig) => void;
  reorderButtons: (screenId: keyof UiConfig, buttons: ButtonConfig[]) => void;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  t: (key: string, defaultVal?: string) => string;
  addCustomReport: (report: CustomReportConfig, targetScreen: keyof UiConfig) => void;
  deleteCustomReport: (reportId: string) => void;
  updateCurrentUser: (user: SystemUser) => void;
  notifications: AppNotification[];
  addNotification: (message: string, type?: AppNotification['type']) => void;
  removeNotification: (id: string) => void;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SystemUser | null>(() => {
    const saved = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
    if (saved) return JSON.parse(saved);
    // تسجيل دخول تلقائي كمدير نظام (Auto-login for easy access)
    return { id: 'admin', username: 'admin', name: 'مدير النظام', role: 'admin' };
  });
  
  const [settings, setSettingsState] = useState<AppSettings>(dbService.getSettings());
  const [uiConfig, setUiConfig] = useState<UiConfig>(dbService.getUiConfig());
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    dbService.init();
    refreshProducts();
  }, []);

  const refreshProducts = () => {
    setProducts(dbService.getProducts());
  };

  const login = (u: string, p: string, remember: boolean = false) => {
    const foundUser = dbService.login(u, p);
    if (foundUser) {
      setUser(foundUser);
      if (remember) {
          localStorage.setItem('currentUser', JSON.stringify(foundUser));
      } else {
          sessionStorage.setItem('currentUser', JSON.stringify(foundUser));
      }
      addNotification(`Welcome back, ${foundUser.name}`, 'success');
      return true;
    }
    addNotification('Invalid credentials', 'error');
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('currentUser');
    addNotification('Logged out successfully', 'info');
  };

  const updateCurrentUser = (updatedUser: SystemUser) => {
      setUser(updatedUser);
      if (localStorage.getItem('currentUser')) {
          localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      } else {
          sessionStorage.setItem('currentUser', JSON.stringify(updatedUser));
      }
  };

  const updateSettings = (newSettings: AppSettings) => {
    dbService.saveSettings(newSettings);
    setSettingsState(newSettings);
    addNotification('Settings saved', 'success');
  };

  const saveUiConfig = () => {
    dbService.saveUiConfig(uiConfig);
    addNotification('Interface config saved', 'success');
  };

  const deleteProduct = (id: string) => {
    dbService.deleteProduct(id);
    refreshProducts();
    addNotification('Item removed', 'warning');
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1, discount: 0 }];
    });
  };

  const updateCartQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const clearCart = () => setCart([]);

  const t = (key: string, defaultVal: string = '') => {
    const lang = settings.language;
    return TRANSLATIONS[lang]?.[key] || defaultVal || key;
  };

  // Notification System
  const addNotification = (message: string, type: AppNotification['type'] = 'info') => {
    const id = Date.now().toString();
    const newNotif: AppNotification = { id, message, type, timestamp: new Date() };
    setNotifications(prev => [newNotif, ...prev].slice(0, 5));
    
    // Auto-remove after 5 seconds
    setTimeout(() => removeNotification(id), 5000);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // UI Customization Handlers
  const addButton = (screenId: keyof UiConfig, btn: ButtonConfig) => {
    setUiConfig(prev => {
        const newState = {
            ...prev,
            [screenId]: {
                ...prev[screenId],
                buttons: [...prev[screenId].buttons, btn]
            }
        };
        dbService.saveUiConfig(newState);
        return newState;
    });
    addNotification('Button added', 'success');
  };

  const removeButton = (screenId: keyof UiConfig, buttonId: string) => {
    setUiConfig(prev => {
      const screen = prev[screenId];
      if (!screen) return prev;
      
      const updatedScreen = { ...screen, buttons: screen.buttons.filter(b => String(b.id) !== String(buttonId)) };
      const newState = { ...prev, [screenId]: updatedScreen };
      dbService.saveUiConfig(newState);
      return newState;
    });
    addNotification('Button removed', 'warning');
  };

  const updateButtonFull = (screenId: keyof UiConfig, index: number, btn: ButtonConfig) => {
      setUiConfig(prev => {
          const newButtons = [...prev[screenId].buttons];
          newButtons[index] = btn;
          const updatedScreen = { ...prev[screenId], buttons: newButtons };
          const newState = { ...prev, [screenId]: updatedScreen };
          dbService.saveUiConfig(newState);
          return newState;
      });
  };

  const reorderButtons = (screenId: keyof UiConfig, buttons: ButtonConfig[]) => {
      setUiConfig(prev => {
          const updatedScreen = { ...prev[screenId], buttons };
          const newState = { ...prev, [screenId]: updatedScreen };
          dbService.saveUiConfig(newState);
          return newState;
      });
  };

  const addCustomReport = (report: CustomReportConfig, targetScreen: keyof UiConfig) => {
      const currentReports = settings.customReports || [];
      const newReports = [...currentReports, report];
      updateSettings({ ...settings, customReports: newReports });

      const newBtn: ButtonConfig = {
          id: `btn-rep-${report.id}`,
          labelKey: report.title,
          labelAr: report.title,
          labelEn: report.title,
          icon: 'FileText',
          color: 'bg-teal-600',
          action: `navigate:/report/${report.id}`,
          isVisible: true
      };
      addButton(targetScreen, newBtn);
  };

  const deleteCustomReport = (reportId: string) => {
      const newReports = (settings.customReports || []).filter(r => r.id !== reportId);
      updateSettings({ ...settings, customReports: newReports });

      const btnId = `btn-rep-${reportId}`;
      let newUiConfig = { ...uiConfig };
      let changed = false;

      (Object.keys(newUiConfig) as (keyof UiConfig)[]).forEach(screenKey => {
          if (newUiConfig[screenKey].buttons.some(b => b.id === btnId)) {
              newUiConfig = {
                  ...newUiConfig,
                  [screenKey]: {
                      ...newUiConfig[screenKey],
                      buttons: newUiConfig[screenKey].buttons.filter(b => b.id !== btnId)
                  }
              };
              changed = true;
          }
      });

      if (changed) {
          setUiConfig(newUiConfig);
          dbService.saveUiConfig(newUiConfig);
      }
      addNotification('Report deleted', 'warning');
  };

  return (
    <AppContext.Provider value={{
      products, refreshProducts, deleteProduct,
      cart, addToCart, updateCartQuantity, clearCart,
      user, login, logout,
      settings, updateSettings,
      uiConfig, setUiConfig, saveUiConfig,
      addButton, removeButton, updateButtonFull, reorderButtons,
      isSidebarOpen, toggleSidebar: () => setIsSidebarOpen(!isSidebarOpen),
      t,
      addCustomReport, deleteCustomReport,
      updateCurrentUser,
      notifications, addNotification, removeNotification
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