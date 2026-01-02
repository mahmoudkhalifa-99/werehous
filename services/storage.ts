
import { Product, Sale, Purchase, StockMovement, AppSettings, SystemUser, UiConfig, PurchaseRequest, SequenceConfig, Role } from '../types';

const DEFAULT_SETTINGS: AppSettings = {
  currency: 'جنية',
  taxRate: 14,
  language: 'ar',
  autoBackup: false,
  lowStockAlert: true,
  printerType: 'a4',
  autoPrint: false,
  showClock: true,
  loginScreenLogo: '',
  printConfigs: {
    default: {
      companyName: 'إدارة المخازن',
      address: 'الموقع الرئيسي',
      phone: '0123456789',
      email: 'info@company.com',
      logo: '',
      logoLeft: '',
      showLogo: true,
      showCompanyInfo: true,
      watermark: {
        enabled: false,
        type: 'text',
        opacity: 0.1,
        rotation: -45,
        fontSize: 60,
        color: '#000000'
      }
    }
  },
  sequences: {
    invoice: 1,
    purchaseOrder: 1,
    issueVoucher: 1,
    receiveVoucher: 1,
    purchaseRequest: 1
  },
  mainScreenSettings: {
    title: 'المخازن',
    logoRight: '',
    logoLeft: '',
    alignment: 'center',
    showClock: true,
    clockFormat: '12h',
    headerBackground: 'linear-gradient(to left, #1e3a8a, #1d4ed8)',
    headerTextColor: '#ffffff',
    clockSize: 'sm',
    titleFontSize: 'lg',
    showTime: true,
    showDate: true,
    clockLayout: 'row',
    clockVerticalAlign: 'center',
    clockPosition: 'default',
    headerHeight: 130,
    logoRightWidth: 60,
    logoLeftWidth: 60
  },
  loadingEfficiencyConfig: {
      overallTargetMin: 29,
      targets: [
          { id: '1', label: 'سايلو', targetMin: 60 },
          { id: '2', label: 'جرار', targetMin: 95 },
          { id: '3', label: 'وهبي', targetMin: 65 },
          { id: '4', label: 'جامبو', targetMin: 25 },
          { id: '5', label: 'دبابة', targetMin: 15 }
      ]
  },
  // إضافة إعدادات كفاءة التعتيق (تفريغ الخامات)
  unloadingEfficiencyConfig: {
      overallTargetMin: 45,
      targets: [
          { id: '1', label: 'سايلو', targetMin: 120 },
          { id: '2', label: 'جرار', targetMin: 180 },
          { id: '3', label: 'وهبي', targetMin: 90 },
          { id: '4', label: 'جامبو', targetMin: 45 },
          { id: '5', label: 'دبابة', targetMin: 30 }
      ]
  },
  storekeepers: [],
  storekeepersRaw: [],
  storekeepersParts: [],
  storekeepersFinished: [],
  clients: [],
  vendors: [],
  salesTypes: ['عادي', 'مزارع', 'منافذ', 'هدايا وعينات'],
  executionEntities: [],
  transportMethods: ['وصال مقاول', 'نقل داخلي', 'استلام عميل'],
  suppliers: [],
  customers: [],
  weighmasters: [],
  inspectors: [],
  units: ['طن', 'كجم', 'شكارة', 'قطعة', 'متر'],
  categories: ['أعلاف', 'بيوتولوجى', 'قطع الغيار والمهمات', 'زيوت وفلاتر'],
  shifts: ['الأولى', 'الثانية', 'الثالثة'],
  paymentMethods: ['نقدي', 'آجل'],
  carTypes: ['دبابة', 'جامبو', 'وهبي', 'جرار', 'سايلو'],
  returnReasons: [],
  departments: [],
  loadingOfficers: [],
  confirmationOfficers: [],
  housingOfficers: [], 
  customReports: [],
  customFields: [],
  rawToleranceRate: 0.002,
  rawTransportCompanies: [],
  partsIssueTypes: ['صرف عادي', 'عُمرة صيانة', 'صيانة دورية', 'حادث سيارة', 'مستهلكات إنتاج'],
  partsSubWarehouses: ['قطع الغيار الرئيسية', 'مخزن الزيوت والفلاتر', 'مخزن الإطارات', 'مخزن المهمات العامة'],
  partsOldPartsStatuses: ['لم يتم الاستلام', 'تم الاستلام والكهين', 'تم الاستلام للإصلاح']
};

const DEFAULT_UI_CONFIG: UiConfig = {
  sidebar: {
    id: 'sidebar',
    name: 'Sidebar',
    buttons: [
      { id: 'sb1', labelKey: 'mainScreen', icon: 'Home', color: 'bg-blue-600', action: 'navigate:/', isVisible: true },
      { id: 'sb3', labelKey: 'sales', icon: 'ShoppingCart', color: 'bg-green-600', action: 'navigate:/sales', isVisible: true },
      { id: 'sb5', labelKey: 'finishedWarehouse', icon: 'PackageCheck', color: 'bg-cyan-600', action: 'navigate:/warehouse/finished', isVisible: true },
      { id: 'sb6', labelKey: 'rawWarehouse', icon: 'Factory', color: 'bg-amber-600', action: 'navigate:/warehouse/raw', isVisible: true },
      { id: 'sb7', labelKey: 'generalWarehouses', icon: 'Warehouse', color: 'bg-teal-600', action: 'navigate:/warehouse/general', isVisible: true },
      { id: 'sb10', labelKey: 'monthly_reports', labelAr: 'التقارير الشهرية', icon: 'BarChartHorizontal', color: 'bg-indigo-800', action: 'navigate:/monthly-reports', isVisible: true },
      { id: 'sb9', labelKey: 'settings', icon: 'Settings', color: 'bg-gray-600', action: 'navigate:/settings', isVisible: true },
    ]
  },
  main: {
    id: 'main',
    name: 'Main Screen',
    buttons: [
      { id: 'm2', labelKey: 'sales', icon: 'ShoppingCart', color: 'bg-green-600', action: 'navigate:/sales', isVisible: true },
      { id: 'm4', labelKey: 'finishedWarehouse', icon: 'PackageCheck', color: 'bg-cyan-600', action: 'navigate:/warehouse/finished', isVisible: true },
      { id: 'm5', labelKey: 'rawWarehouse', icon: 'Factory', color: 'bg-amber-600', action: 'navigate:/warehouse/raw', isVisible: true },
      { id: 'm6', labelKey: 'generalWarehouses', icon: 'Warehouse', color: 'bg-teal-600', action: 'navigate:/warehouse/general', isVisible: true },
      { id: 'm10', labelKey: 'monthly_reports', labelAr: 'التقارير الشهرية', icon: 'BarChartHorizontal', color: 'bg-indigo-800', action: 'navigate:/monthly-reports', isVisible: true },
      { id: 'm8', labelKey: 'settings', icon: 'Settings', color: 'bg-gray-600', action: 'navigate:/settings', isVisible: true },
    ]
  },
  sales: {
    id: 'sales',
    name: 'Sales Screen',
    buttons: [
      { id: 's1', labelKey: 'newSale', icon: 'Plus', color: 'bg-green-600', action: 'view:add', isVisible: true },
      { id: 's2', labelKey: 'salesInvoice', icon: 'FileText', color: 'bg-blue-600', action: 'view:invoice_search', isVisible: true },
      { id: 's3', labelKey: 'viewInvoices', icon: 'List', color: 'bg-indigo-500', action: 'view:list', isVisible: true },
      { id: 's4', labelKey: 'logistics_pulse', labelAr: 'نبض اللوجستيات الذكي', icon: 'Activity', color: 'bg-slate-900', action: 'view:logistics_pulse', isVisible: true },
      { id: 's5', labelKey: 'salesReports', labelAr: 'لوحة التقارير الذكية', icon: 'BarChart3', color: 'bg-purple-600', action: 'view:reports', isVisible: true },
      { id: 's6', labelKey: 'daily_sales', labelAr: 'المبيعات اليومية (تام)', icon: 'CalendarCheck', color: 'bg-teal-600', action: 'view:daily_sales', isVisible: true },
      { id: 's7', labelKey: 'client_withdrawals', labelAr: 'مسحوبات العملاء', icon: 'UserCheck', color: 'bg-orange-600', action: 'view:client_withdrawals', isVisible: true },
      { id: 's8', labelKey: 'item_withdrawals', labelAr: 'مسحوبات الأصناف', icon: 'Package', color: 'bg-pink-600', action: 'view:item_withdrawals', isVisible: true },
    ]
  },
  monthly_reports: {
    id: 'monthly_reports',
    name: 'Monthly Reports Screen',
    buttons: [
      { id: 'ms1', labelKey: 'sales_by_item', labelAr: 'إجمالي بالأصناف', icon: 'Table2', color: 'bg-cyan-600', action: 'view:sales_by_item', isVisible: true },
      { id: 'ms2', labelKey: 'sales_customer_split', labelAr: 'مبيعات العملاء', icon: 'Users', color: 'bg-amber-600', action: 'view:sales_customer_split', isVisible: true },
      { id: 'ms3', labelKey: 'transport_report', labelAr: 'طريقة نقل المبيعات', icon: 'Truck', color: 'bg-blue-800', action: 'view:transport_report', isVisible: true },
      { id: 'ms4', labelKey: 'loading_efficiency', labelAr: 'كفاءة التحميل', icon: 'Timer', color: 'bg-indigo-700', action: 'view:loading_efficiency', isVisible: true },
      { id: 'ms5', labelKey: 'best_customers', labelAr: 'العملاء الأفضل (Best)', icon: 'Trophy', color: 'bg-yellow-600', action: 'view:best_customers', isVisible: true },
      { id: 'ms6', labelKey: 'unloading_efficiency', labelAr: 'كفاءة التعتيق', icon: 'Gauge', color: 'bg-[#b91c1c]', action: 'view:unloading_efficiency', isVisible: true },
    ]
  },
  purchases: {
    id: 'purchases',
    name: 'Purchases Screen',
    buttons: [
      { id: 'p1', labelKey: 'addPurchaseOrder', icon: 'Plus', color: 'bg-green-600', action: 'view:add', isVisible: true },
      { id: 'p2', labelKey: 'viewPurchaseOrders', icon: 'List', color: 'bg-blue-600', action: 'view:list', isVisible: true },
      { id: 'p3', labelKey: 'receivePurchases', icon: 'Download', color: 'bg-indigo-600', action: 'view:receive', isVisible: true },
      { id: 'p4', labelKey: 'purchaseReports', icon: 'BarChart3', color: 'bg-purple-600', action: 'view:reports', isVisible: true },
      { id: 'p5', labelKey: 'purchaseReturn', labelAr: 'مرتجع مشتريات', icon: 'Undo2', color: 'bg-rose-600', action: 'view:return', isVisible: true },
    ]
  },
  finished: {
    id: 'finished',
    name: 'Finished Warehouse',
    buttons: [
      { id: 'f2', labelKey: 'warehouseBalances', labelAr: 'شاشة الارصدة النهائية', icon: 'Package', color: 'bg-blue-600', action: 'view:balances', isVisible: true },
      { id: 'f11', labelKey: 'periodReport', labelAr: 'التقرير عن مدة', icon: 'CalendarDays', color: 'bg-teal-700', action: 'view:period_report', isVisible: true },
      { id: 'f8', labelKey: 'daily_sales', labelAr: 'المبيعات اليومية', icon: 'Calendar', color: 'bg-teal-600', action: 'view:daily_sales', isVisible: true },
      { id: 'f1', labelKey: 'productionReceipt', labelAr: 'استلام انتاج', icon: 'Download', color: 'bg-green-600', action: 'view:production_receipt', isVisible: true },
      { id: 'f10', labelKey: 'settlements', labelAr: 'التسويات', icon: 'Scale', color: 'bg-pink-600', action: 'view:settlements', isVisible: true },
      { id: 'f9', labelKey: 'unfinishedProduct', labelAr: 'منتج غير تام', icon: 'Loader', color: 'bg-amber-600', action: 'view:unfinished', isVisible: true },
      { id: 'f5', labelKey: 'returns', labelAr: 'المرتجعات', icon: 'Undo2', color: 'bg-rose-600', action: 'view:returns', isVisible: true },
      { id: 'f7', labelKey: 'stocktaking', labelAr: 'جرد (رصيد افتتاحي)', icon: 'ClipboardCheck', color: 'bg-purple-600', action: 'view:stocktaking', isVisible: true },
    ]
  },
  raw: {
    id: 'raw',
    name: 'Raw Warehouse',
    buttons: [
      { id: 'r_pur_link', labelKey: 'purchases', labelAr: 'المشتريات', icon: 'Truck', color: 'bg-purple-600', action: 'navigate:/purchases?wh=raw', isVisible: true },
      { id: 'rw1', labelKey: 'raw_in', labelAr: 'وارد خامات (مشتريات)', icon: 'Download', color: 'bg-emerald-600', action: 'view:raw_in', isVisible: true },
      { id: 'rw2', labelKey: 'raw_sale', labelAr: 'إذن مبيعات خامات', icon: 'ShoppingCart', color: 'bg-blue-600', action: 'view:raw_sale', isVisible: true },
      { id: 'rw_daily_in_detail', labelKey: 'raw_in_daily_detail', labelAr: 'بيان إجمالي الوارد اليومي', icon: 'FileSpreadsheet', color: 'bg-[#059669]', action: 'view:raw_in_daily', isVisible: true },
      { id: 'rw_daily_reps', labelKey: 'daily_reports', labelAr: 'التقارير اليومية المجمعة', icon: 'CalendarCheck', color: 'bg-indigo-700', action: 'view:daily_reports', isVisible: true },
      { id: 'rw_period', labelKey: 'period_report', labelAr: 'التقرير عن مدة (خامات)', icon: 'CalendarDays', color: 'bg-teal-700', action: 'view:period_report', isVisible: true },
      { id: 'rw_silo_trans', labelKey: 'silo_trans', labelAr: 'تحويلات الصوامع', icon: 'ArrowRightLeft', color: 'bg-indigo-600', action: 'view:silo_trans', isVisible: true },
      { id: 'rw_ctrl_out', labelKey: 'control_out', labelAr: 'صرف الكنترول', icon: 'Gauge', color: 'bg-violet-600', action: 'view:control_out', isVisible: true },
      { id: 'rw_wh_out', labelKey: 'wh_out', labelAr: 'صرف المخازن', icon: 'LogOut', color: 'bg-orange-600', action: 'view:wh_out', isVisible: true },
      { id: 'rw_wh_transfer', labelKey: 'wh_transfer', labelAr: 'تحويلات المخازن', icon: 'ArrowRightLeft', color: 'bg-indigo-500', action: 'view:wh_transfer', isVisible: true },
      { id: 'rw_shortage', labelKey: 'shortage', labelAr: 'محاضر العجز', icon: 'FileWarning', color: 'bg-rose-600', action: 'view:shortage', isVisible: true },
      { id: 'rw_wh_adj', labelKey: 'wh_adj', labelAr: 'تسويات المخازن', icon: 'Scale', color: 'bg-pink-600', action: 'view:wh_adj', isVisible: true },
      { id: 'rw_silo_adj', labelKey: 'silo_adj', labelAr: 'تسويات الصوامع', icon: 'Settings2', color: 'bg-slate-700', action: 'view:silo_adj', isVisible: true },
      { id: 'rw_return', labelKey: 'raw_return', labelAr: 'مرتجع اصناف', icon: 'Undo2', color: 'bg-red-600', action: 'view:raw_return', isVisible: true },
      { id: 'r1_legacy', labelKey: 'balances', labelAr: 'شاشة الأرصدة المجمعة', icon: 'Factory', color: 'bg-blue-500', action: 'view:balances', isVisible: true },
    ]
  },
  general: {
    id: 'general',
    name: 'General Warehouses',
    buttons: [
      { id: 'g1', labelKey: 'partsWarehouse', labelAr: 'مخزن قطع الغيار', icon: 'Settings', color: 'bg-blue-600', action: 'view:parts', isVisible: true },
      { id: 'g2', labelKey: 'cateringWarehouse', labelAr: 'مخزن الإعاشة', icon: 'Utensils', color: 'bg-green-600', action: 'view:catering', isVisible: true },
      { id: 'g3', labelKey: 'employeeCustody', labelAr: 'عهدة الموظفين', icon: 'UserCheck', color: 'bg-orange-600', action: 'view:custody', isVisible: true },
    ]
  },
  reports: {
    id: 'reports',
    name: 'Reports Screen',
    buttons: [
      { id: 'rep1', labelKey: 'inventoryReport', icon: 'Package', color: 'bg-blue-600', action: 'view:inventory', isVisible: true },
      { id: 'rep2', labelKey: 'salesReport', icon: 'TrendingUp', color: 'bg-green-600', action: 'view:sales', isVisible: true },
      { id: 'rep3', labelKey: 'purchasesReport', icon: 'ShoppingCart', color: 'bg-purple-600', action: 'navigate:/purchases?view=reports', isVisible: true },
      { id: 'rep4', labelKey: 'movementReport', icon: 'Activity', color: 'bg-orange-600', action: 'view:movement', isVisible: true },
      { id: 'rep5', labelKey: 'activityLog', icon: 'List', color: 'bg-gray-600', action: 'view:activity', isVisible: true },
      { id: 'rep6', labelKey: 'custodyReport', icon: 'UserCheck', color: 'bg-teal-600', action: 'view:custody', isVisible: true },
    ]
  },
  settings: {
    id: 'settings',
    name: 'Settings Screen',
    buttons: []
  },
  parts_warehouse: {
    id: 'parts_warehouse',
    name: 'Spare Parts Warehouse',
    buttons: [
      { id: 'p_pur_btn', labelKey: 'purchases', labelAr: 'المشتريات', icon: 'Truck', color: 'bg-purple-600', action: 'navigate:/purchases?wh=parts', isVisible: true },
      { id: 'parts_balances', labelKey: 'warehouseBalances', labelAr: 'أرصدة الأصناف', icon: 'Package', color: 'bg-blue-600', action: 'view:balances', isVisible: true },
      { id: 'parts_reports', labelKey: 'reports', labelAr: 'التقارير والتحليلات', icon: 'BarChart3', color: 'bg-indigo-600', action: 'view:reports', isVisible: true },
      { id: 'parts2', labelKey: 'issueVoucher', labelAr: 'الصرف', icon: 'Upload', color: 'bg-orange-600', action: 'view:issue', isVisible: true },
      { id: 'parts3', labelKey: 'addStock', labelAr: 'الإضافة', icon: 'Download', color: 'bg-green-600', action: 'view:add', isVisible: true },
      { id: 'parts_trans_in', labelKey: 'transfer_in', labelAr: 'تحويلات إضافة', icon: 'ArrowDownLeft', color: 'bg-indigo-700', action: 'view:transfer_in', isVisible: true },
      { id: 'parts_trans_out', labelKey: 'transfer_out', labelAr: 'تحويلات خصم', icon: 'ArrowUpRight', color: 'bg-orange-800', action: 'view:transfer_out', isVisible: true },
      { id: 'parts6', labelKey: 'periodReport', labelAr: 'التقرير عن مدة', icon: 'CalendarDays', color: 'bg-cyan-600', action: 'view:movement', isVisible: true },
      { id: 'parts7', labelKey: 'adjOut', labelAr: 'التسوية بالخصم', icon: 'MinusCircle', color: 'bg-red-500', action: 'view:adj_out', isVisible: true },
      { id: 'parts8', labelKey: 'returns', labelAr: 'المرتجع', icon: 'Undo2', color: 'bg-red-600', action: 'view:returns', isVisible: true },
      { id: 'parts9', labelKey: 'adjIn', labelAr: 'التسوية بالاضافة', icon: 'PlusCircle', color: 'bg-green-700', action: 'view:adj_in', isVisible: true },
    ]
  },
  catering_warehouse: {
    id: 'catering_warehouse',
    name: 'Catering Warehouse',
    buttons: [
      { id: 'c_pur_btn', labelKey: 'purchases', labelAr: 'المشتريات', icon: 'Truck', color: 'bg-purple-600', action: 'navigate:/purchases?wh=catering', isVisible: true },
      { id: 'cat1', labelKey: 'mainScreen', labelAr: 'أرصدة الإعاشة', icon: 'Package', color: 'bg-blue-600', action: 'view:balances', isVisible: true },
      { id: 'cat3', labelKey: 'addStock', labelAr: 'وارد إعاشة', icon: 'Download', color: 'bg-green-600', action: 'view:add', isVisible: true },
      { id: 'cat2', labelKey: 'issueVoucher', labelAr: 'منصرف إعاشة', icon: 'Upload', color: 'bg-orange-600', action: 'view:issue', isVisible: true },
      { id: 'cat9', labelKey: 'returns', labelAr: 'مرتجع إعاشة', icon: 'Undo2', color: 'bg-rose-600', action: 'view:returns', isVisible: true },
      { id: 'cat5', labelKey: 'transfer_in', labelAr: 'تحويلات (إلى)', icon: 'ArrowDownLeft', color: 'bg-indigo-600', action: 'view:transfer_in', isVisible: true },
      { id: 'cat6', labelKey: 'transfer_out', labelAr: 'تحويلات (من)', icon: 'ArrowUpRight', color: 'bg-violet-600', action: 'view:transfer_out', isVisible: true },
      { id: 'cat7', labelKey: 'adj_in', labelAr: 'تسويات (+)', icon: 'PlusCircle', color: 'bg-emerald-600', action: 'view:adj_in', isVisible: true },
      { id: 'cat8', labelKey: 'adj_out', labelAr: 'تسويات (-)', icon: 'MinusCircle', color: 'bg-rose-600', action: 'view:adj_out', isVisible: true },
      { id: 'cat4', labelKey: 'warehouseReports', labelAr: 'التقرير عن مدة', icon: 'CalendarDays', color: 'bg-teal-700', action: 'view:movement', isVisible: true },
    ]
  }
};

/** High-Level Normalization for reliable matching */
const robustNormalize = (text: any): string => {
    if (text === null || text === undefined) return '';
    return String(text).trim().toLowerCase()
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .replace(/[\u064B-\u0652]/g, '') // Remove Arabic harakat
        .replace(/\s+/g, ''); // Remove all whitespace
};

export const dbService = {
  init: () => {
    if (!localStorage.getItem('glasspos_settings')) {
      localStorage.setItem('glasspos_settings', JSON.stringify(DEFAULT_SETTINGS));
    }
    if (!localStorage.getItem('glasspos_ui_config')) {
      localStorage.setItem('glasspos_ui_config', JSON.stringify(DEFAULT_UI_CONFIG));
    }
    if (!localStorage.getItem('glasspos_users')) {
      localStorage.setItem('glasspos_users', JSON.stringify([
        { id: 'admin', username: 'admin', password: '123', name: 'مدير النظام', role: 'admin' }
      ]));
    }
    if (!localStorage.getItem('glasspos_products')) localStorage.setItem('glasspos_products', '[]');
    if (!localStorage.getItem('glasspos_sales')) localStorage.setItem('glasspos_sales', '[]');
    if (!localStorage.getItem('glasspos_purchases')) localStorage.setItem('glasspos_purchases', '[]');
    if (!localStorage.getItem('glasspos_movements')) localStorage.setItem('glasspos_movements', '[]');
    if (!localStorage.getItem('glasspos_requests')) localStorage.setItem('glasspos_requests', '[]');
  },

  getSettings: (): AppSettings => JSON.parse(localStorage.getItem('glasspos_settings') || JSON.stringify(DEFAULT_SETTINGS)),
  saveSettings: (s: AppSettings) => localStorage.setItem('glasspos_settings', JSON.stringify(s)),

  getUiConfig: (): UiConfig => JSON.parse(localStorage.getItem('glasspos_ui_config') || JSON.stringify(DEFAULT_UI_CONFIG)),
  saveUiConfig: (c: UiConfig) => localStorage.setItem('glasspos_ui_config', JSON.stringify(c)),

  getProducts: (): Product[] => JSON.parse(localStorage.getItem('glasspos_products') || '[]'),
  saveProduct: (p: Product) => {
    const products = dbService.getProducts();
    const idx = products.findIndex(item => item.id === p.id);
    if (idx >= 0) products[idx] = p;
    else products.push(p);
    localStorage.setItem('glasspos_products', JSON.stringify(products));
  },
  saveProducts: (ps: Product[]) => localStorage.setItem('glasspos_products', JSON.stringify(ps)),

  /** Robust central upsert logic to prevent duplication and handle partial updates from Excel */
  bulkUpsertProducts: (newProducts: Product[]) => {
    const current = dbService.getProducts();
    const updated = [...current];
    let addedCount = 0;
    let updatedCount = 0;

    newProducts.forEach(np => {
        const normName = robustNormalize(np.name);
        const normBarcode = robustNormalize(np.barcode);
        
        // Find by normalized barcode or name
        const idx = updated.findIndex(p => 
            (np.barcode && robustNormalize(p.barcode) === normBarcode) || 
            (np.name && robustNormalize(p.name) === normName)
        );

        if (idx >= 0) {
            // Keep original ID and UUID-like keys
            const originalId = updated[idx].id;
            updated[idx] = { 
                ...updated[idx], 
                ...np, 
                id: originalId // Essential: do not change ID on update
            };
            updatedCount++;
        } else {
            updated.push({
                ...np,
                id: np.id || `P-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
            });
            addedCount++;
        }
    });

    localStorage.setItem('glasspos_products', JSON.stringify(updated));
    return { addedCount, updatedCount };
  },

  deleteProduct: (id: string) => {
    const products = dbService.getProducts().filter(p => p.id !== id);
    localStorage.setItem('glasspos_products', JSON.stringify(products));
  },

  getUsers: (): SystemUser[] => JSON.parse(localStorage.getItem('glasspos_users') || '[]'),
  saveUser: (u: SystemUser) => {
    const users = dbService.getUsers();
    const idx = users.findIndex(item => item.id === u.id);
    if (idx >= 0) users[idx] = u;
    else users.push(u);
    localStorage.setItem('glasspos_users', JSON.stringify(users));
  },
  deleteUser: (id: string) => {
    const users = dbService.getUsers().filter(u => u.id !== id);
    localStorage.setItem('glasspos_users', JSON.stringify(users));
  },
  login: (u: string, p: string) => {
    const users = dbService.getUsers();
    const found = users.find(user => user.username === u && user.password === p);
    if (found) {
        found.lastActive = new Date().toISOString();
        dbService.saveUser(found);
    }
    return found;
  },

  getUserHistory: (userId: string) => {
    const sales = dbService.getSales().filter(s => s.cashierId === userId);
    const purchases = dbService.getPurchases().filter(p => p.storekeeper === userId);
    const history = [
      ...sales.map(s => ({ type: 'بيع', date: s.date, details: `فاتورة مبيعات للعميل: ${s.customer || 'نقدي'}`, id: s.id })),
      ...purchases.map(p => ({ type: 'شراء', date: p.date, details: `طلب شراء من المورد: ${p.supplier}`, id: p.orderNumber }))
    ];
    return history.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  getPurchases: (): Purchase[] => JSON.parse(localStorage.getItem('glasspos_purchases') || '[]'),
  savePurchase: (p: Purchase) => {
    const purchases = dbService.getPurchases();
    const idx = purchases.findIndex(item => item.id === p.id);
    if (idx >= 0) purchases[idx] = p;
    else purchases.push(p);
    localStorage.setItem('glasspos_purchases', JSON.stringify(purchases));
  },

  peekNextId: (type: keyof SequenceConfig): string => {
    const settings = dbService.getSettings();
    const seq = settings.sequences[type];
    const prefixMap: Record<keyof SequenceConfig, string> = {
      invoice: 'INV-',
      purchaseOrder: 'PO-',
      issueVoucher: 'ISS-',
      receiveVoucher: 'REC-',
      purchaseRequest: 'REQ-'
    };
    return `${prefixMap[type]}${String(seq).padStart(6, '0')}`;
  },

  getNextId: (type: keyof SequenceConfig): string => {
    const settings = dbService.getSettings();
    const currentSeq = settings.sequences[type];
    const prefixMap: Record<keyof SequenceConfig, string> = {
      invoice: 'INV-',
      purchaseOrder: 'PO-',
      issueVoucher: 'ISS-',
      receiveVoucher: 'REC-',
      purchaseRequest: 'REQ-'
    };
    
    settings.sequences[type] = currentSeq + 1;
    dbService.saveSettings(settings);
    
    return `${prefixMap[type]}${String(currentSeq).padStart(6, '0')}`;
  },

  getMovements: (): StockMovement[] => JSON.parse(localStorage.getItem('glasspos_movements') || '[]'),
  saveMovement: (m: StockMovement) => {
    const movements = dbService.getMovements();
    movements.push(m);
    localStorage.setItem('glasspos_movements', JSON.stringify(movements));

    // Update product stock
    const products = dbService.getProducts();
    m.items.forEach(item => {
      const pIdx = products.findIndex(p => p.id === item.productId);
      if (pIdx >= 0) {
        const p = products[pIdx];
        
        let factor = 0;
        if (m.type === 'in' || m.type === 'return') factor = 1;
        else if (m.type === 'out') factor = -1;
        else if (m.type === 'adjustment') {
            factor = (m.reason?.includes('خصم') || m.reason?.includes('عجز')) ? -1 : 1;
        } else if (m.type === 'transfer') {
            const ctx = m.customFields?.viewContext || '';
            if (ctx.includes('in')) factor = 1;
            else if (ctx.includes('out')) factor = -1;
            else factor = (m.reason?.includes('وارد') || m.reason?.includes('إضافة')) ? 1 : -1;
        }

        if (item.quantityBulk !== undefined) p.stockBulk = (p.stockBulk || 0) + (item.quantityBulk * factor);
        if (item.quantityPacked !== undefined) p.stockPacked = (p.stockPacked || 0) + (item.quantityPacked * factor);
        p.stock = (p.stock || 0) + (item.quantity * factor);
        
        item.currentBalance = p.stock;
      }
    });
    dbService.saveProducts(products);
    localStorage.setItem('glasspos_movements', JSON.stringify(movements));
  },
  deleteMovement: (id: string) => {
    const movements = dbService.getMovements();
    const mIdx = movements.findIndex(m => m.id === id);
    if (mIdx === -1) return;
    const m = movements[mIdx];
    
    const products = dbService.getProducts();
    m.items.forEach(item => {
      const pIdx = products.findIndex(p => p.id === item.productId);
      if (pIdx >= 0) {
        const p = products[pIdx];
        let factor = 0;
        if (m.type === 'in' || m.type === 'return') factor = -1;
        else if (m.type === 'out') factor = 1;
        else if (m.type === 'adjustment') {
            factor = (m.reason?.includes('خصم') || m.reason?.includes('عجز')) ? 1 : -1;
        } else if (m.type === 'transfer') {
            const ctx = m.customFields?.viewContext || '';
            if (ctx.includes('in')) factor = -1;
            else if (ctx.includes('out')) factor = 1;
            else factor = (m.reason?.includes('وارد') || m.reason?.includes('إضافة')) ? -1 : 1;
        }
        
        if (item.quantityBulk !== undefined) p.stockBulk = (p.stockBulk || 0) + (item.quantityBulk * factor);
        if (item.quantityPacked !== undefined) p.stockPacked = (p.stockPacked || 0) + (item.quantityPacked * factor);
        p.stock = (p.stock || 0) + (item.quantity * factor);
      }
    });
    
    movements.splice(mIdx, 1);
    dbService.saveProducts(products);
    localStorage.setItem('glasspos_movements', JSON.stringify(movements));
  },

  getRequests: (): PurchaseRequest[] => JSON.parse(localStorage.getItem('glasspos_requests') || '[]'),

  exportSystemData: () => {
    const data: any = {};
    const keys = [
        'glasspos_settings', 'glasspos_ui_config', 'glasspos_users', 
        'glasspos_products', 'glasspos_sales', 'glasspos_purchases', 
        'glasspos_movements', 'glasspos_requests'
    ];
    keys.forEach(k => {
        data[k] = localStorage.getItem(k);
    });
    return JSON.stringify(data);
  },

  importSystemData: (jsonStr: string) => {
    try {
        const data = JSON.parse(jsonStr);
        Object.keys(data).forEach(k => {
            if (data[k]) localStorage.setItem(k, data[k]);
        });
        return true;
    } catch (e) {
        return false;
    }
  },

  getSales: (): Sale[] => JSON.parse(localStorage.getItem('glasspos_sales') || '[]'),
  saveSale: (s: Sale) => {
    const sales = dbService.getSales();
    const idx = sales.findIndex(item => item.id === s.id);
    
    const oldSale = idx >= 0 ? sales[idx] : null;
    
    if (idx >= 0) sales[idx] = s;
    else sales.push(s);
    localStorage.setItem('glasspos_sales', JSON.stringify(sales));

    const products = dbService.getProducts();
    
    if (oldSale) {
      oldSale.items.forEach(item => {
        const pIdx = products.findIndex(p => p.id === item.id);
        if (pIdx >= 0) {
          const p = products[pIdx];
          p.stockPacked = (p.stockPacked || 0) + (item.quantityPacked || 0);
          p.stockBulk = (p.stockBulk || 0) + (item.quantityBulk || 0);
          p.stock = (p.stock || 0) + item.quantity;
        }
      });
    }
    
    s.items.forEach(item => {
      const pIdx = products.findIndex(p => p.id === item.id);
      if (pIdx >= 0) {
        const p = products[pIdx];
        p.stockPacked = (p.stockPacked || 0) - (item.quantityPacked || 0);
        p.stockBulk = (p.stockBulk || 0) - (item.quantityBulk || 0);
        p.stock = (p.stock || 0) - item.quantity;
      }
    });
    
    dbService.saveProducts(products);
  },
};
