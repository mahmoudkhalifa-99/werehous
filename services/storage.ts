
import { Product, Sale, Purchase, StockMovement, AppSettings, SystemUser, UiConfig, PurchaseRequest, SequenceConfig, Role, Expense, ButtonConfig, ScreenConfig } from '../types';
import { db as firestore } from '../firebase';
import { doc, setDoc, deleteDoc, collection, getDocs, query, where, limit, getDocsFromCache, getDocsFromServer } from 'firebase/firestore';

// إصدار الواجهة لضمان تنظيف البيانات القديمة
const UI_VERSION = "2026.02.18.v7_PURCHASE_FIX";

const DEFAULT_UI_CONFIG: UiConfig = {
  sidebar: { 
    id: 'sidebar', 
    name: 'القائمة الجانبية', 
    buttons: [
      { id: 'sb_home', labelKey: 'الرئيسية', labelAr: 'الرئيسية', icon: 'LayoutGrid', color: 'bg-slate-700', action: 'navigate:/', isVisible: true },
      { id: 'sb_sales', labelKey: 'المبيعات', labelAr: 'المبيعات واللوجستيات', icon: 'TrendingUp', color: 'bg-blue-600', action: 'navigate:/sales', isVisible: true },
      { id: 'sb_purchases', labelKey: 'المشتريات', labelAr: 'إدارة المشتريات', icon: 'ShoppingCart', color: 'bg-indigo-600', action: 'navigate:/purchases', isVisible: true },
      { id: 'sb_finished', labelKey: 'المنتج التام', labelAr: 'مخزن المنتج التام', icon: 'PackageCheck', color: 'bg-cyan-600', action: 'navigate:/warehouse/finished', isVisible: true },
      { id: 'sb_raw', labelKey: 'المواد الخام', labelAr: 'مخزن المواد الخام', icon: 'Factory', color: 'bg-amber-600', action: 'navigate:/warehouse/raw', isVisible: true },
      { id: 'sb_general', labelKey: 'المخازن العامة', labelAr: 'المخازن العامة والخدمية', icon: 'Warehouse', color: 'bg-teal-600', action: 'navigate:/warehouse/general', isVisible: true },
      { id: 'sb_expenses', labelKey: 'المصروفات', labelAr: 'المصروفات', icon: 'CreditCard', color: 'bg-rose-600', action: 'navigate:/expenses', isVisible: true },
      { id: 'sb_settings', labelKey: 'الإعدادات', labelAr: 'الإعدادات', icon: 'Settings', color: 'bg-slate-800', action: 'navigate:/settings', isVisible: true }
    ] 
  },
  main: { 
    id: 'main', 
    name: 'الشاشة الرئيسية', 
    buttons: [
      { id: 'm_sales', labelKey: 'المبيعات واللوجستيات', labelAr: 'المبيعات واللوجستيات', icon: 'TrendingUp', color: 'bg-blue-600', action: 'navigate:/sales', isVisible: true },
      { id: 'm_purchases', labelKey: 'إدارة المشتريات', labelAr: 'إدارة المشتريات', icon: 'ShoppingCart', color: 'bg-indigo-600', action: 'navigate:/purchases', isVisible: true },
      { id: 'm_finished', labelKey: 'مخزن المنتج التام', labelAr: 'مخزن المنتج التام', icon: 'PackageCheck', color: 'bg-cyan-600', action: 'navigate:/warehouse/finished', isVisible: true },
      { id: 'm_raw', labelKey: 'مخزن المواد الخام', labelAr: 'مخزن المواد الخام', icon: 'Factory', color: 'bg-amber-600', action: 'navigate:/warehouse/raw', isVisible: true },
      { id: 'm_general', labelKey: 'المخازن العامة والخدمية', labelAr: 'المخازن العامة والخدمية', icon: 'Warehouse', color: 'bg-teal-600', action: 'navigate:/warehouse/general', isVisible: true },
      { id: 'm_monthly_reports', labelKey: 'التقارير المجمعة', labelAr: 'التقارير المجمعة', icon: 'ClipboardList', color: 'bg-violet-600', action: 'navigate:/monthly-reports', isVisible: true },
      { id: 'm_expenses', labelKey: 'إدارة المصروفات', labelAr: 'إدارة المصروفات', icon: 'CreditCard', color: 'bg-rose-600', action: 'navigate:/expenses', isVisible: true },
      { id: 'm_settings', labelKey: 'إعدادات النظام', labelAr: 'إعدادات النظام', icon: 'Settings', color: 'bg-slate-800', action: 'navigate:/settings', isVisible: true }
    ] 
  },
  sales: { 
    id: 'sales', 
    name: 'المبيعات', 
    buttons: [
      { id: 'sale_pulse', labelKey: 'نبض اللوجستيات الذكي', labelAr: 'نبض اللوجستيات الذكي', icon: 'Activity', color: 'bg-[#1e293b]', action: 'view:logistics_pulse', isVisible: true },
      { id: 'sale_list', labelKey: 'عرض الفواتير', labelAr: 'عرض الفواتير', icon: 'List', color: 'bg-indigo-500', action: 'view:list', isVisible: true },
      { id: 'sale_search', labelKey: 'تعديل فاتورة مبيعات', labelAr: 'تعديل فاتورة مبيعات', icon: 'FilePen', color: 'bg-blue-600', action: 'view:invoice_search', isVisible: true },
      { id: 'sale_add', labelKey: 'فاتورة مبيعات جديدة', labelAr: 'فاتورة مبيعات جديدة', icon: 'Plus', color: 'bg-emerald-500', action: 'view:add', isVisible: true },
      { id: 'sale_item_with', labelKey: 'مسحوبات الأصناف', labelAr: 'مسحوبات الأصناف', icon: 'Package', color: 'bg-rose-600', action: 'view:item_withdrawals', isVisible: true },
      { id: 'sale_cust_with', labelKey: 'مسحوبات العملاء', labelAr: 'مسحوبات العملاء', icon: 'UserCircle2', color: 'bg-orange-600', action: 'view:client_withdrawals', isVisible: true },
      { id: 'sale_daily', labelKey: 'المبيعات اليومية (تام)', labelAr: 'المبيعات اليومية (تام)', icon: 'Calendar', color: 'bg-teal-600', action: 'view:daily_sales', isVisible: true },
      { id: 'sale_reports', labelKey: 'لوحة التقارير الذكية', labelAr: 'لوحة التقارير الذكية', icon: 'BarChart3', color: 'bg-violet-600', action: 'view:reports', isVisible: true }
    ] 
  },
  monthly_reports: { 
    id: 'monthly_reports', 
    name: 'التقارير', 
    buttons: [
      { id: 'rep_items', labelKey: 'إجمالي الأصناف', labelAr: 'إجمالي الأصناف', icon: 'Package', color: 'bg-blue-600', action: 'view:sales_by_item', isVisible: true },
      { id: 'rep_clients', labelKey: 'مبيعات العملاء', labelAr: 'مبيعات العملاء', icon: 'Users', color: 'bg-indigo-600', action: 'view:sales_customer_split', isVisible: true },
      { id: 'rep_transport', labelKey: 'طرق النقل', labelAr: 'طرق النقل', icon: 'Truck', color: 'bg-emerald-600', action: 'view:transport_report', isVisible: true },
      { id: 'rep_eff_load', labelKey: 'كفاءة التحميل', labelAr: 'كفاءة التحميل', icon: 'Timer', color: 'bg-violet-600', action: 'view:loading_efficiency', isVisible: true },
      { id: 'rep_eff_unload', labelKey: 'كفاءة التعتيق', labelAr: 'كفاءة التعتيق', icon: 'Gauge', color: 'bg-rose-600', action: 'view:unloading_efficiency', isVisible: true },
      { id: 'rep_best', labelKey: 'أفضل العملاء', labelAr: 'أفضل العملاء', icon: 'Trophy', color: 'bg-amber-600', action: 'view:best_customers', isVisible: true }
    ] 
  },
  purchases: { 
    id: 'purchases', 
    name: 'المشتريات', 
    buttons: [
      { id: 'pur_add', labelKey: 'طلب شراء جديد', labelAr: 'طلب شراء جديد', icon: 'PlusCircle', color: 'bg-indigo-600', action: 'view:add', isVisible: true },
      { id: 'pur_list', labelKey: 'سجل أوامر الشراء', labelAr: 'سجل أوامر الشراء', icon: 'ClipboardList', color: 'bg-blue-600', action: 'view:list', isVisible: true },
      { id: 'pur_receive', labelKey: 'استلام توريدات', labelAr: 'استلام توريدات', icon: 'Download', color: 'bg-emerald-600', action: 'view:receive', isVisible: true },
      { id: 'pur_return', labelKey: 'مرتجع مشتريات', labelAr: 'مرتجع مشتريات', icon: 'Undo2', color: 'bg-rose-600', action: 'view:return', isVisible: true },
      { id: 'pur_reports', labelKey: 'تقارير المشتريات', labelAr: 'تقارير المشتريات', icon: 'BarChart3', color: 'bg-violet-600', action: 'view:reports', isVisible: true }
    ] 
  },
  finished: { 
    id: 'finished', 
    name: 'مخزن التام', 
    buttons: [
      { id: 'fin_in', labelKey: 'استلام انتاج', labelAr: 'استلام انتاج', icon: 'Download', color: 'bg-emerald-600', action: 'view:production_receipt', isVisible: true },
      { id: 'fin_sale', labelKey: 'المبيعات اليومية', labelAr: 'المبيعات اليومية', icon: 'Calendar', color: 'bg-teal-600', action: 'view:daily_sales', isVisible: true },
      { id: 'fin_period', labelKey: 'التقرير عن مدة', labelAr: 'التقرير عن مدة', icon: 'CalendarDays', color: 'bg-indigo-600', action: 'view:period_report', isVisible: true },
      { id: 'fin_bal', labelKey: 'شاشة الارصدة النهائية', labelAr: 'شاشة الارصدة النهائية', icon: 'Package', color: 'bg-blue-600', action: 'view:balances', isVisible: true },
      { id: 'fin_stocktaking', labelKey: 'جرد (رصيد افتتاحي)', labelAr: 'جرد (رصيد افتتاحي)', icon: 'ClipboardCheck', color: 'bg-violet-600', action: 'view:stocktaking', isVisible: true },
      { id: 'fin_return', labelKey: 'المرتجعات', labelAr: 'المرتجعات', icon: 'Undo2', color: 'bg-rose-600', action: 'view:returns', isVisible: true },
      { id: 'fin_unfinished', labelKey: 'منتج غير تام', labelAr: 'منتج غير تام', icon: 'RefreshCw', color: 'bg-amber-600', action: 'view:unfinished', isVisible: true },
      { id: 'fin_adj', labelKey: 'التسويات', labelAr: 'التسويات', icon: 'Scale', color: 'bg-pink-600', action: 'view:settlements', isVisible: true }
    ] 
  },
  raw: { 
    id: 'raw', 
    name: 'مخزن الخامات', 
    buttons: [
      { id: 'raw_daily_in', labelKey: 'بيان إجمالي الوارد اليومي', labelAr: 'بيان إجمالي الوارد اليومي', icon: 'FileText', color: 'bg-white text-emerald-700 border shadow', action: 'view:raw_in_daily', isVisible: true },
      { id: 'raw_sale', labelKey: 'إذن مبيعات خامات', labelAr: 'إذن مبيعات خامات', icon: 'ShoppingCart', color: 'bg-white text-blue-700 border shadow', action: 'view:raw_sale', isVisible: true },
      { id: 'raw_in', labelKey: 'وارد خامات (مشتريات)', labelAr: 'وارد خامات (مشتريات)', icon: 'Download', color: 'bg-white text-emerald-600 border shadow', action: 'view:raw_in', isVisible: true },
      { id: 'raw_pur', labelKey: 'المشتريات', labelAr: 'المشتريات', icon: 'Truck', color: 'bg-white text-indigo-700 border shadow', action: 'navigate:/purchases', isVisible: true },
      { id: 'raw_control', labelKey: 'صرف الكنترول', labelAr: 'صرف الكنترول', icon: 'Gauge', color: 'bg-white text-violet-700 border shadow', action: 'view:control_out', isVisible: true },
      { id: 'raw_silo', labelKey: 'تحويلات الصوامع', labelAr: 'تحويلات الصوامع', icon: 'ArrowRightLeft', color: 'bg-white text-blue-600 border shadow', action: 'view:silo_trans', isVisible: true },
      { id: 'raw_period', labelKey: 'التقرير عن مدة (خامات)', labelAr: 'التقرير عن مدة (خامات)', icon: 'Calendar', color: 'bg-white text-teal-700 border shadow', action: 'view:period_report', isVisible: true },
      { id: 'raw_all_rep', labelKey: 'التقارير اليومية المجمعة', labelAr: 'التقارير اليومية المجمعة', icon: 'ClipboardList', color: 'bg-white text-indigo-800 border shadow', action: 'view:daily_reports', isVisible: true },
      { id: 'raw_wh_out', labelKey: 'صرف المخازن', labelAr: 'صرف المخازن', icon: 'LogOut', color: 'bg-white text-rose-700 border shadow', action: 'view:wh_out', isVisible: true },
      { id: 'raw_short', labelKey: 'محاضر العجز', labelAr: 'محاضر العجز', icon: 'AlertTriangle', color: 'bg-white text-red-600 border shadow', action: 'view:shortage', isVisible: true },
      { id: 'raw_wh_trans', labelKey: 'تحويلات المخازن', labelAr: 'تحويلات المخازن', icon: 'RefreshCcw', color: 'bg-white text-blue-500 border shadow', action: 'view:wh_transfer', isVisible: true },
      { id: 'raw_wh_adj', labelKey: 'تسويات المخازن', labelAr: 'تسويات المخازن', icon: 'Scale', color: 'bg-white text-pink-600 border shadow', action: 'view:wh_adj', isVisible: true },
      { id: 'raw_silo_adj', labelKey: 'تسويات الصوامع', labelAr: 'تسويات الصوامع', icon: 'Scale', color: 'bg-white text-orange-600 border shadow', action: 'view:silo_adj', isVisible: true },
      { id: 'raw_return', labelKey: 'مرتجع اصناف', labelAr: 'مرتجع اصناف', icon: 'RotateCcw', color: 'bg-white text-red-700 border shadow', action: 'view:raw_return', isVisible: true },
      { id: 'raw_bal', labelKey: 'شاشة الأرصدة المجمعة', labelAr: 'شاشة الأرصدة المجمعة', icon: 'LayoutGrid', color: 'bg-white text-blue-900 border shadow', action: 'view:balances', isVisible: true }
    ] 
  },
  general: { 
    id: 'general', 
    name: 'المخازن العامة', 
    buttons: [
      { id: 'gen_parts', labelKey: 'قطع الغيار', labelAr: 'قطع الغيار والمهمات', icon: 'Wrench', color: 'bg-indigo-600', action: 'view:parts', isVisible: true },
      { id: 'gen_cat', labelKey: 'الإعاشة', labelAr: 'الإعاشة والتموين', icon: 'Utensils', color: 'bg-emerald-600', action: 'view:catering', isVisible: true },
      { id: 'gen_cust', labelKey: 'العهد', labelAr: 'إدارة عهد الموظفين', icon: 'UserCheck', color: 'bg-teal-600', action: 'view:custody', isVisible: true }
    ] 
  },
  reports: { 
    id: 'reports', 
    name: 'تقارير النظام', 
    buttons: [
      { id: 'rep_inv', labelKey: 'inventory', labelAr: 'جرد المخازن', icon: 'Package', color: 'bg-blue-600', action: 'view:inventory', isVisible: true },
      { id: 'rep_move', labelKey: 'movementReport', labelAr: 'حركة المخزون', icon: 'ArrowRightLeft', color: 'bg-indigo-600', action: 'view:movement', isVisible: true },
      { id: 'rep_act', labelKey: 'activityLog', labelAr: 'سجل النشاطات', icon: 'Activity', color: 'bg-teal-600', action: 'view:activity', isVisible: true },
      { id: 'rep_trans', labelKey: 'transport_report', labelAr: 'تقرير النقل', icon: 'Truck', color: 'bg-rose-600', action: 'view:transport_report', isVisible: true }
    ] 
  },
  settings: { id: 'settings', name: 'الإعدادات', buttons: [] },
  parts_warehouse: { 
    id: 'parts_warehouse', 
    name: 'قطع الغيار', 
    buttons: [
      { id: 'p_bal', labelKey: 'أرصدة الأصناف', labelAr: 'أرصدة الأصناف', icon: 'Package', color: 'bg-blue-600', action: 'view:balances', isVisible: true },
      { id: 'p_pur', labelKey: 'المشتريات', labelAr: 'المشتريات', icon: 'ShoppingCart', color: 'bg-violet-500', action: 'navigate:/purchases', isVisible: true },
      { id: 'p_in', labelKey: 'الإضافة', labelAr: 'الإضافة', icon: 'Download', color: 'bg-emerald-600', action: 'view:add', isVisible: true },
      { id: 'p_out', labelKey: 'الصرف', labelAr: 'الصرف', icon: 'Upload', color: 'bg-orange-600', action: 'view:issue', isVisible: true },
      { id: 'p_rep', labelKey: 'التقارير والتحليلات', labelAr: 'التقارير والتحليلات', icon: 'Activity', color: 'bg-indigo-600', action: 'view:reports', isVisible: true },
      { id: 'p_trans_in', labelKey: 'تحويلات إضافة', labelAr: 'تحويلات إضافة', icon: 'ArrowDownLeft', color: 'bg-blue-500', action: 'view:transfer_in', isVisible: true },
      { id: 'p_trans_out', labelKey: 'تحويلات خصم', labelAr: 'تحويلات خصم', icon: 'ArrowUpRight', color: 'bg-orange-800', action: 'view:transfer_out', isVisible: true },
      { id: 'p_period', labelKey: 'التقرير عن مدة', labelAr: 'التقرير عن مدة', icon: 'Calendar', color: 'bg-teal-600', action: 'view:movement', isVisible: true },
      { id: 'p_return', labelKey: 'المرتجع', labelAr: 'المرتجع', icon: 'Undo2', color: 'bg-rose-600', action: 'view:returns', isVisible: true },
      { id: 'p_adj_minus', labelKey: 'التسوية بالخصم', labelAr: 'التسوية بالخصم', icon: 'MinusCircle', color: 'bg-red-500', action: 'view:adj_out', isVisible: true },
      { id: 'p_adj_plus', labelKey: 'التسوية بالاضافة', labelAr: 'التسوية بالاضافة', icon: 'PlusCircle', color: 'bg-green-700', action: 'view:adj_in', isVisible: true }
    ] 
  },
  catering_warehouse: { 
    id: 'catering_warehouse', 
    name: 'الإعاشة', 
    buttons: [
      { id: 'c_bal', labelKey: 'أرصدة الإعاشة', labelAr: 'أرصدة الإعاشة', icon: 'Package', color: 'bg-blue-600', action: 'view:balances', isVisible: true },
      { id: 'c_pur', labelKey: 'المشتريات', labelAr: 'المشتريات', icon: 'ShoppingCart', color: 'bg-violet-500', action: 'navigate:/purchases', isVisible: true },
      { id: 'c_in', labelKey: 'وارد إعاشة', labelAr: 'وارد إعاشة', icon: 'Download', color: 'bg-emerald-600', action: 'view:add', isVisible: true },
      { id: 'c_out', labelKey: 'منصرف إعاشة', labelAr: 'منصرف إعاشة', icon: 'Upload', color: 'bg-orange-600', action: 'view:issue', isVisible: true },
      { id: 'c_trans_to', labelKey: 'تحويلات (إلى)', labelAr: 'تحويلات (إلى)', icon: 'ArrowUpRight', color: 'bg-violet-600', action: 'view:transfer_out', isVisible: true },
      { id: 'c_trans_from', labelKey: 'تحويلات (من)', labelAr: 'تحويلات (من)', icon: 'ArrowDownLeft', color: 'bg-indigo-600', action: 'view:transfer_in', isVisible: true },
      { id: 'c_return', labelKey: 'مرتجع إعاشة', labelAr: 'مرتجع إعاشة', icon: 'Undo2', color: 'bg-rose-600', action: 'view:return', isVisible: true },
      { id: 'c_period', labelKey: 'التقرير عن مدة', labelAr: 'التقرير عن مدة', icon: 'Calendar', color: 'bg-teal-600', action: 'view:movement', isVisible: true },
      { id: 'c_adj_plus', labelKey: 'تسويات (+)', labelAr: 'تسويات (+)', icon: 'PlusCircle', color: 'bg-emerald-700', action: 'view:adj_in', isVisible: true },
      { id: 'c_adj_minus', labelKey: 'تسويات (-)', labelAr: 'تسويات (-)', icon: 'MinusCircle', color: 'bg-rose-700', action: 'view:adj_out', isVisible: true }
    ] 
  }
};

const DEFAULT_SETTINGS: AppSettings = {
  currency: 'جنية', taxRate: 14, language: 'ar', autoBackup: false, lowStockAlert: true, printerType: 'a4', autoPrint: false, showClock: true, loginScreenLogo: '',
  loginScreenTitle: 'نظام إدارة المخازن المتطور', globalAppTitle: 'نظام إدارة مخازن الدقهلية', globalFooterText: 'جميع الحقوق محفوظة © ٢٠٢٦', globalFooterVisible: true,
  printConfigs: { default: { companyName: 'إدارة المخازن', address: 'الموقع الرئيسي', phone: '0123456789', email: 'info@company.com', logo: '', logoLeft: '', showLogo: true, showCompanyInfo: true, watermark: { enabled: false, type: 'text', opacity: 0.1, rotation: -45, fontSize: 60, color: '#000000' } } },
  sequences: { invoice: 1, purchaseOrder: 1, issueVoucher: 1, receiveVoucher: 1, purchaseRequest: 1 },
  mainScreenSettings: { title: 'المخازن', logoRight: '', logoLeft: '', alignment: 'center', showClock: true, clockFormat: '12h', headerBackground: 'linear-gradient(to left, #1e3a8a, #1d4ed8)', headerTextColor: '#ffffff', titleFontSizePx: 33, titleFontWeight: 'bold', titleFontStyle: 'normal', titleBackgroundColor: 'transparent', titlePadding: 0, titleBorderRadius: 0, clockSize: 'sm', titleFontSize: 'lg', showTime: true, showDate: true, clockLayout: 'row', clockVerticalAlign: 'center', clockPosition: 'default', headerHeight: 130, logoRightWidth: 60, logoLeftWidth: 60 },
  loadingEfficiencyConfig: { overallTargetMin: 29, targets: [ { id: '1', label: 'سايلو', targetMin: 60 }, { id: '2', label: 'جرار', targetMin: 95 }, { id: '3', label: 'وهبي', targetMin: 65 }, { id: '4', label: 'جامبو', targetMin: 25 }, { id: '5', label: 'دبابة', targetMin: 15 } ] }, unloadingEfficiencyConfig: { overallTargetMin: 45, targets: [ { id: '1', label: 'سايلو', targetMin: 120 }, { id: '2', label: 'جرار', targetMin: 180 }, { id: '3', label: 'وهبي', targetMin: 90 }, { id: '4', label: 'جامبو', targetMin: 45 }, { id: '5', label: 'دبابة', targetMin: 30 } ] },
  storekeepers: [], storekeepersRaw: [], storekeepersParts: [], storekeepersFinished: [], clients: [], vendors: [], salesTypes: ['عادي', 'مزارع', 'منافذ', 'هدايا وعينات'], executionEntities: [], transportMethods: ['وصال مقاول', 'استلام مصنع'], suppliers: [], customers: [], weighmasters: [], inspectors: [], units: ['طن', 'كجم', 'عدد', 'شكارة'], categories: ['أعلاف', 'بيوتولوجى', 'خامات اساسية', 'قطع غيار', 'إعاشة تموينية'], shifts: ['الأولى', 'الثانية', 'الثالثة'], paymentMethods: ['نقدي', 'آجل', 'شيك'], carTypes: ['دبابة', 'جامبو', 'وهبي', 'جرار', 'سايلو'], returnReasons: ['عطب', 'خطأ تحميل', 'زيادة كمية'], departments: ['الإنتاج', 'المخازن', 'الصيانة', 'الجودة', 'الإدارة'], loadingOfficers: [], confirmationOfficers: [], housingOfficers: [], customReports: [], customFields: [], expenseCategories: ['نثريات', 'صيانة', 'كهرباء والمياه', 'رواتب', 'أخرى']
};

/**
 * وظيفة ترميم ذكية (Smart Repair)
 */
const repairUiConfig = (cloudUi: any): UiConfig => {
    const defaultUi = DEFAULT_UI_CONFIG;
    const mergedUi: any = {};

    Object.keys(defaultUi).forEach(k => {
        const key = k as keyof UiConfig;
        const defaultSection = defaultUi[key];
        const cloudSection = cloudUi?.[key];

        if (!cloudSection || !Array.isArray(cloudSection.buttons) || cloudSection.buttons.length === 0) {
            mergedUi[key] = defaultSection;
        } else {
            const repairedButtons = [...defaultSection.buttons];
            cloudSection.buttons.forEach((cb: ButtonConfig) => {
                const idx = repairedButtons.findIndex(db => db.id === cb.id);
                if (idx >= 0) {
                    repairedButtons[idx] = {
                        ...repairedButtons[idx],
                        ...cb,
                        icon: (cb.icon && cb.icon.trim() !== "") ? cb.icon : repairedButtons[idx].icon,
                        isVisible: cb.isVisible !== undefined ? cb.isVisible : true
                    };
                } else {
                    repairedButtons.push(cb);
                }
            });
            mergedUi[key] = { ...defaultSection, ...cloudSection, buttons: repairedButtons };
        }
    });
    return mergedUi as UiConfig;
};

/**
 * وظيفة تنظيف البيانات المتداخلة من undefined وتحويلها لـ null
 * لضمان التوافق مع Firestore في كافة المستويات (بما في ذلك كائن الصلاحيات)
 */
const sanitizeData = (data: any): any => {
  if (data === undefined) return null;
  if (Array.isArray(data)) {
    return data.map(v => sanitizeData(v));
  } else if (data !== null && typeof data === 'object') {
    const newObj: any = {};
    Object.keys(data).forEach(key => {
      newObj[key] = sanitizeData(data[key]);
    });
    return newObj;
  }
  return data;
};

export const dbService = {
  init: () => {
    if (!localStorage.getItem('glasspos_settings')) localStorage.setItem('glasspos_settings', JSON.stringify(DEFAULT_SETTINGS));
    
    const currentVersion = localStorage.getItem('glasspos_ui_version');
    if (currentVersion !== UI_VERSION) {
        localStorage.setItem('glasspos_ui_config', JSON.stringify(DEFAULT_UI_CONFIG));
        localStorage.setItem('glasspos_ui_version', UI_VERSION);
    } else {
        const savedUi = localStorage.getItem('glasspos_ui_config');
        if (savedUi) {
            try {
                const parsed = JSON.parse(savedUi);
                const repaired = repairUiConfig(parsed);
                localStorage.setItem('glasspos_ui_config', JSON.stringify(repaired));
            } catch {
                localStorage.setItem('glasspos_ui_config', JSON.stringify(DEFAULT_UI_CONFIG));
            }
        } else {
            localStorage.setItem('glasspos_ui_config', JSON.stringify(DEFAULT_UI_CONFIG));
        }
    }

    if (!localStorage.getItem('glasspos_products')) localStorage.setItem('glasspos_products', '[]');
    if (!localStorage.getItem('glasspos_sales')) localStorage.setItem('glasspos_sales', '[]');
    if (!localStorage.getItem('glasspos_purchases')) localStorage.setItem('glasspos_purchases', '[]');
    if (!localStorage.getItem('glasspos_movements')) localStorage.setItem('glasspos_movements', '[]');
    if (!localStorage.getItem('glasspos_expenses')) localStorage.setItem('glasspos_expenses', '[]');
    if (!localStorage.getItem('glasspos_purchaseRequests')) localStorage.setItem('glasspos_purchaseRequests', '[]');
    if (!localStorage.getItem('glasspos_users')) {
      localStorage.setItem('glasspos_users', JSON.stringify([
          { id: 'admin', username: 'admin', password: '123', name: 'مدير النظام', role: 'admin', permissions: { screens: {}, features: {}, actions: { canImport: true, canExport: true, canDelete: true, canEditSettings: true, canManageCloudLists: true } }, lastActive: null }
      ]));
    }
  },

  getSettings: (): AppSettings => {
    try {
        const saved = localStorage.getItem('glasspos_settings');
        return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch { return DEFAULT_SETTINGS; }
  },

  getUiConfig: (): UiConfig => {
    try {
        const saved = localStorage.getItem('glasspos_ui_config');
        if (!saved || saved === "null") return DEFAULT_UI_CONFIG;
        const parsed = JSON.parse(saved);
        return repairUiConfig(parsed);
    } catch { return DEFAULT_UI_CONFIG; }
  },

  saveSettings: (s: AppSettings) => {
      localStorage.setItem('glasspos_settings', JSON.stringify(s));
      dbService.syncToCloud('config', 'global_settings', s);
  },

  saveUiConfig: (c: UiConfig) => {
      localStorage.setItem('glasspos_ui_config', JSON.stringify(c));
      dbService.syncToCloud('config', 'ui_layout', c);
  },

  syncToCloud: async (collectionName: string, id: string, data: any) => {
    try { 
        if (!id || id.trim() === '') {
            console.warn(`Sync Warning: Skipping cloud sync for ${collectionName} due to empty ID.`);
            return;
        }

        if (data === null) {
            await deleteDoc(doc(firestore, collectionName, id));
        } else {
            // تنظيف البيانات بشكل متداخل قبل الإرسال لضمان عدم وجود undefined
            const cleanData = sanitizeData(data);
            await setDoc(doc(firestore, collectionName, id), cleanData); 
        }
    } catch (e: any) { 
        console.error(`Cloud Error (${collectionName}):`, e.message || e); 
    }
  },

  getProducts: (): Product[] => JSON.parse(localStorage.getItem('glasspos_products') || '[]'),
  saveProduct: (p: Product) => {
    const products = dbService.getProducts();
    const idx = products.findIndex(item => item.id === p.id);
    if (idx >= 0) products[idx] = p; else products.push(p);
    localStorage.setItem('glasspos_products', JSON.stringify(products));
    dbService.syncToCloud('products', p.id, p);
  },
  saveProducts: async (ps: Product[]) => {
      localStorage.setItem('glasspos_products', JSON.stringify(ps));
      const results = await Promise.allSettled(ps.map(p => dbService.syncToCloud('products', p.id, p)));
      const failed = results.filter(r => r.status === 'rejected').length;
      if (failed > 0) {
          console.error(`Bulk Sync Warning: ${failed} products failed to sync to cloud.`);
      }
  },
  bulkUpsertProducts: (ps: Product[]) => {
      const current = dbService.getProducts();
      let added = 0; let updated = 0;
      ps.forEach(newP => {
          const idx = current.findIndex(p => p.id === newP.id);
          if (idx >= 0) { current[idx] = { ...current[idx], ...newP }; updated++; }
          else { current.push(newP); added++; }
      });
      localStorage.setItem('glasspos_products', JSON.stringify(current));
      current.forEach(p => dbService.syncToCloud('products', p.id, p));
      return { addedCount: added, updatedCount: updated };
  },
  deleteProduct: (id: string) => {
    const products = dbService.getProducts().filter(p => p.id !== id);
    localStorage.setItem('glasspos_products', JSON.stringify(products));
    dbService.syncToCloud('products', id, null);
  },

  getUsers: (): SystemUser[] => {
      try {
          const saved = localStorage.getItem('glasspos_users');
          return saved ? JSON.parse(saved) : [];
      } catch { return []; }
  },
  
  login: async (u: string, p: string) => {
    const normalizedU = u.trim().toLowerCase();
    const localUsers = dbService.getUsers();
    const localMatch = localUsers.find(user => user.username.toLowerCase() === normalizedU && user.password === p);
    if (localMatch) return localMatch;

    try {
        const qUsers = query(collection(firestore, 'users'), where('username', '==', normalizedU), where('password', '==', p), limit(1));
        const snapshot = await getDocsFromServer(qUsers);
        if (!snapshot.empty) {
            return snapshot.docs[0].data() as SystemUser;
        }
    } catch (e) { console.warn("Cloud query failed."); }
    return null;
  },

  saveUser: (u: SystemUser) => {
    const users = dbService.getUsers();
    // تأمين الحقول الاختيارية لضمان عدم وجود undefined
    const userToSave = {
        ...u,
        lastActive: u.lastActive || null,
        permissions: u.permissions || { screens: {}, features: {}, actions: { canImport: true, canExport: true, canDelete: true, canEditSettings: true, canManageCloudLists: true } }
    };
    const idx = users.findIndex(item => item.id === u.id);
    if (idx >= 0) users[idx] = userToSave; else users.push(userToSave);
    localStorage.setItem('glasspos_users', JSON.stringify(users));
    dbService.syncToCloud('users', u.id, userToSave);
  },
  deleteUser: (id: string) => {
    const users = dbService.getUsers().filter(u => u.id !== id);
    localStorage.setItem('glasspos_users', JSON.stringify(users));
    dbService.syncToCloud('users', id, null);
  },

  getSales: (): Sale[] => JSON.parse(localStorage.getItem('glasspos_sales') || '[]'),
  saveSale: (s: Sale) => {
    const sales = dbService.getSales();
    sales.push(s);
    localStorage.setItem('glasspos_sales', JSON.stringify(sales));
    dbService.syncToCloud('sales', s.id, s);
  },

  getPurchases: (): Purchase[] => JSON.parse(localStorage.getItem('glasspos_purchases') || '[]'),
  savePurchase: (p: Purchase) => {
    const purchases = dbService.getPurchases();
    // Check if updating existing
    const idx = purchases.findIndex(item => item.id === p.id);
    if (idx >= 0) purchases[idx] = p; else purchases.push(p);
    localStorage.setItem('glasspos_purchases', JSON.stringify(purchases));
    dbService.syncToCloud('purchases', p.id, p);
  },

  getMovements: (): StockMovement[] => JSON.parse(localStorage.getItem('glasspos_movements') || '[]'),
  saveMovement: (m: StockMovement) => {
    const movements = dbService.getMovements();
    movements.push(m);
    localStorage.setItem('glasspos_movements', JSON.stringify(movements));
    dbService.syncToCloud('movements', m.id, m);
  },
  deleteMovement: (id: string) => {
    const movements = dbService.getMovements().filter(m => m.id !== id);
    localStorage.setItem('glasspos_movements', JSON.stringify(movements));
    dbService.syncToCloud('movements', id, null);
  },

  getExpenses: (): Expense[] => JSON.parse(localStorage.getItem('glasspos_expenses') || '[]'),
  saveExpense: (e: Expense) => {
    const expenses = dbService.getExpenses();
    expenses.push(e);
    localStorage.setItem('glasspos_expenses', JSON.stringify(expenses));
    dbService.syncToCloud('expenses', e.id, e);
  },
  deleteExpense: (id: string) => {
    const expenses = dbService.getExpenses().filter(e => e.id !== id);
    localStorage.setItem('glasspos_expenses', JSON.stringify(expenses));
    dbService.syncToCloud('expenses', id, null);
  },

  getRequests: (): PurchaseRequest[] => JSON.parse(localStorage.getItem('glasspos_purchaseRequests') || '[]'),

  saveLinkages: (category: string, linkages: any) => {
    localStorage.setItem(`glasspos_mizan_logic_v16_${category}`, JSON.stringify(linkages));
    dbService.syncToCloud('config', `linkages_${category}`, linkages);
  },

  syncFromCloud: async () => {
    try {
        const collections = ['products', 'sales', 'purchases', 'movements', 'expenses', 'users', 'purchaseRequests'];
        for (const col of collections) {
            const snapshot = await getDocs(collection(firestore, col));
            if (!snapshot.empty) {
                const data = snapshot.docs.map(d => d.data());
                const storageKey = col === 'purchaseRequests' ? 'glasspos_purchaseRequests' : `glasspos_${col}`;
                localStorage.setItem(storageKey, JSON.stringify(data));
            }
        }
        
        const settingsSnap = await getDocs(collection(firestore, 'config'));
        settingsSnap.docs.forEach(doc => {
            const docId = doc.id;
            const docData = doc.data();
            if (docId === 'global_settings') localStorage.setItem('glasspos_settings', JSON.stringify(docData));
            else if (docId.startsWith('linkages_')) {
                const cat = docId.replace('linkages_', '');
                localStorage.setItem(`glasspos_mizan_logic_v16_${cat}`, JSON.stringify(docData));
            }
            else if (docId === 'ui_layout') {
                const repaired = repairUiConfig(docData);
                localStorage.setItem('glasspos_ui_config', JSON.stringify(repaired));
            }
        });
        return true;
    } catch (e) { return false; }
  },

  exportSystemData: (): string => {
      const data: Record<string, any> = {};
      for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('glasspos_')) {
              data[key] = localStorage.getItem(key);
          }
      }
      return JSON.stringify(data);
  },

  importSystemData: (jsonStr: string): boolean => {
      try {
          const data = JSON.parse(jsonStr);
          if (typeof data !== 'object') return false;
          Object.keys(data).forEach(key => {
              if (key.startsWith('glasspos_')) localStorage.setItem(key, data[key]);
          });
          return true;
      } catch (e) { return false; }
  },

  peekNextId: (type: keyof SequenceConfig): string => {
    const s = dbService.getSettings(); const seq = s.sequences[type];
    const map: any = { invoice: 'INV-', purchaseOrder: 'PO-', issueVoucher: 'ISS-', receiveVoucher: 'REC-', purchaseRequest: 'REQ-' };
    return `${map[type]}${String(seq).padStart(6, '0')}`;
  },

  getNextId: (type: keyof SequenceConfig): string => {
    const s = dbService.getSettings(); const current = s.sequences[type];
    const map: any = { invoice: 'INV-', purchaseOrder: 'PO-', issueVoucher: 'ISS-', receiveVoucher: 'REC-', purchaseRequest: 'REQ-' };
    s.sequences[type] = current + 1; dbService.saveSettings(s);
    return `${map[type]}${String(current).padStart(6, '0')}`;
  }
};
