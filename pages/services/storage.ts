
import { Product, Sale, Purchase, StockMovement, AppSettings, SystemUser, UserPermissions, UiConfig, PurchaseRequest, SequenceConfig, Role, Expense, ButtonConfig, ScreenConfig } from '../types';
import { db as firestore } from '../firebase';
import { doc, setDoc, deleteDoc, collection, getDocs, query, where, limit, getDoc, FirebaseError, writeBatch } from 'firebase/firestore';

// إصدار الواجهة لضمان تنظيف البيانات القديمة
const UI_VERSION = "2026.02.18.v13_SANI_FIX";

/**
 * دالة لتطهير البيانات قبل إرسالها لـ Firestore
 * تحول القيم undefined إلى null لأن Firestore لا يدعم undefined
 */
const sanitizeData = (data: any): any => {
    if (data === null || data === undefined) return null;
    if (Array.isArray(data)) return data.map(sanitizeData);
    if (typeof data === 'object') {
        const cleaned: any = {};
        Object.keys(data).forEach(key => {
            cleaned[key] = sanitizeData(data[key]);
        });
        return cleaned;
    }
    return data;
};

const DEFAULT_PERMISSIONS: UserPermissions = {
    screens: {
        sb_home: 'edit',
        sb_purchases: 'edit',
        sb_sales: 'edit',
        sb_finished: 'edit',
        sb_raw: 'edit',
        sb_general: 'edit',
        sb_monthly_reports: 'edit',
        sb_expenses: 'edit',
        m_dashboard: 'edit'
    },
    features: {},
    actions: {
        canImport: true,
        canExport: true,
        canDelete: true,
        canEditSettings: true,
        canManageCloudLists: true
    }
};

const DEFAULT_USERS: SystemUser[] = [
    {
        id: 'U-ADMIN-1',
        username: 'mostafa.elabd@dakahlia.net',
        name: 'مصطفى العبد',
        password: '123456',
        role: 'admin',
        permissions: DEFAULT_PERMISSIONS
    },
    {
        id: 'U-ADMIN-2',
        username: 'abdelhady.saleh@dakahlia.net',
        name: 'عبد الهادي صالح',
        password: '123456',
        role: 'admin',
        permissions: DEFAULT_PERMISSIONS
    },
    {
        id: 'U-ADMIN-3',
        username: 'ahmed.hamdan@dakahlia.net',
        name: 'أحمد حمدان',
        password: '123456',
        role: 'admin',
        permissions: DEFAULT_PERMISSIONS
    },
    {
        id: 'U-ADMIN-4',
        username: 'sadat.planning.officer@dakahlia.net',
        name: 'محمود خليفة ',
        password: '123456',
        role: 'admin',
        permissions: DEFAULT_PERMISSIONS
    },
    {
        id: 'U-HEAD-FIN',
        username: 'mahmoud.ghaly@dakahlia.net',
        name: 'محمود غالي',
        password: '123456',
        role: 'head_finished',
        permissions: DEFAULT_PERMISSIONS
    },
    {
        id: 'U-PLANNING-1',
        username: 'eslam@erp.net',
        name: 'إسلام',
        password: '123456',
        role: 'planning_officer',
        permissions: DEFAULT_PERMISSIONS
    },
    {
        id: 'U-HEAD-RAW',
        username: 'ahmed.kamal@erp.net',
        name: 'أحمد كمال',
        password: '123456',
        role: 'head_raw',
        permissions: DEFAULT_PERMISSIONS
    }
];

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
      { id: 'fin_with', labelKey: 'مسحوبات الأصناف', labelAr: 'مسحوبات الأصناف', icon: 'Package', color: 'bg-indigo-500', action: 'view:item_withdrawals', isVisible: true },
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
      { id: 'raw_with', labelKey: 'مسحوبات الأصناف', labelAr: 'مسحوبات الأصناف', icon: 'Package', color: 'bg-white text-indigo-700 border shadow', action: 'view:item_withdrawals', isVisible: true },
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
      { id: 'p_with', labelKey: 'مسحوبات الأصناف', labelAr: 'مسحوبات الأصناف', icon: 'Package', color: 'bg-indigo-600', action: 'view:item_withdrawals', isVisible: true },
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
      { id: 'c_with', labelKey: 'مسحوبات الأصناف', labelAr: 'مسحوبات الأصناف', icon: 'Package', color: 'bg-indigo-600', action: 'view:item_withdrawals', isVisible: true },
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
    currency: 'EGP',
    taxRate: 14,
    language: 'ar',
    autoBackup: true,
    lowStockAlert: true,
    printerType: 'a4',
    autoPrint: false,
    showClock: true,
    loginScreenLogo: '',
    printConfigs: {
        default: {
            companyName: 'شركة الدقهلية', address: '', phone: '', email: '', logo: '', logoLeft: '', showLogo: true, showCompanyInfo: true, fontSize: 12
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
        title: 'نظام إدارة مخازن الدقهلية',
        logoRight: '',
        logoLeft: '',
        alignment: 'center',
        showClock: true,
        clockFormat: '24h',
        headerBackground: 'linear-gradient(135deg, #1e3a8a 0%, #312e81 100%)',
        headerTextColor: '#ffffff',
        clockSize: 'md',
        titleFontSize: 'lg',
        showTime: true,
        showDate: true,
        clockLayout: 'column',
        clockVerticalAlign: 'center',
        clockPosition: 'default',
        headerHeight: 200,
        logoRightWidth: 100,
        logoLeftWidth: 100
    },
    loadingEfficiencyConfig: null,
    unloadingEfficiencyConfig: null,
    storekeepers: [], storekeepersRaw: [], storekeepersFinished: [], storekeepersParts: [],
    clients: [], vendors: [], customFields: [], salesTypes: ['عادي', 'مزارع', 'منافذ', 'هدايا'],
    executionEntities: [], transportMethods: ['وصال مقاول', 'استلام عميل'],
    suppliers: [], customers: [], weighmasters: [], inspectors: [],
    units: ['طن', 'كجم', 'عدد', 'شكارة'], categories: ['أعلاف', 'بيوتولوجى', 'خامات', 'قطع غيار'],
    shifts: ['الأولى', 'الثانية', 'الثالثة'], paymentMethods: ['cash', 'card', 'آجل'],
    carTypes: ['دبابة', 'جامبو', 'جرار', 'وهبي', 'سايلو'], returnReasons: [],
    departments: [], loadingOfficers: [], confirmationOfficers: [], housingOfficers: [],
    customReports: [], expenseCategories: ['نثريات', 'صيانة', 'كهرباء', 'مياه']
};

export const dbService = {
  init: async () => {
    if (!localStorage.getItem('glasspos_settings')) {
      localStorage.setItem('glasspos_settings', JSON.stringify(DEFAULT_SETTINGS));
    }
    if (!localStorage.getItem('glasspos_ui_config') || localStorage.getItem('glasspos_ui_version') !== UI_VERSION) {
      localStorage.setItem('glasspos_ui_config', JSON.stringify(DEFAULT_UI_CONFIG));
      localStorage.setItem('glasspos_ui_version', UI_VERSION);
    }
    // Seed admin if none exist (local only, login will sync cloud)
    if (!localStorage.getItem('glasspos_users') || JSON.parse(localStorage.getItem('glasspos_users') || '[]').length === 0) {
        localStorage.setItem('glasspos_users', JSON.stringify(DEFAULT_USERS));
    }
  },

  getSettings: (): AppSettings => {
    const saved = localStorage.getItem('glasspos_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  },

  saveSettings: async (settings: AppSettings) => {
    localStorage.setItem('glasspos_settings', JSON.stringify(settings));
    try {
        await setDoc(doc(firestore, 'settings', 'app'), sanitizeData(settings));
    } catch (e) {
        console.warn("Could not save settings to cloud, saved locally.", e);
    }
  },

  getUiConfig: (): UiConfig => {
    const saved = localStorage.getItem('glasspos_ui_config');
    return saved ? JSON.parse(saved) : DEFAULT_UI_CONFIG;
  },

  saveUiConfig: async (config: UiConfig) => {
    localStorage.setItem('glasspos_ui_config', JSON.stringify(config));
    try {
        await setDoc(doc(firestore, 'uiConfig', 'current'), sanitizeData(config));
    } catch (e) {
        console.warn("Could not save UI config to cloud, saved locally.", e);
    }
  },

  getProducts: (): Product[] => {
    const data = localStorage.getItem('glasspos_products');
    return data ? JSON.parse(data) : [];
  },
  
  saveProduct: async (p: Product) => {
    const products = dbService.getProducts();
    const idx = products.findIndex(item => item.id === p.id);
    if (idx >= 0) products[idx] = p; else products.push(p);
    localStorage.setItem('glasspos_products', JSON.stringify(products));
    try {
        await setDoc(doc(firestore, 'products', p.id), sanitizeData(p));
    } catch (e) {
        console.warn("Cloud update failed for product, saved locally.", e);
    }
  },
  
  /**
   * دالة حفظ الأصناف المجمعة (Smart Merge)
   */
  saveProducts: async (newProducts: Product[]) => {
    const existing = dbService.getProducts();
    const productMap = new Map(existing.map(p => [p.id, p]));
    
    // دمج الأصناف الجديدة
    newProducts.forEach(p => {
        productMap.set(p.id, p);
    });

    const finalProducts = Array.from(productMap.values());
    localStorage.setItem('glasspos_products', JSON.stringify(finalProducts));

    // مزامنة السحابة باستخدام مطهر البيانات (sanitizeData)
    try {
        const batch = writeBatch(firestore);
        newProducts.forEach(p => {
            const ref = doc(firestore, 'products', p.id);
            // تطهير البيانات لمنع خطأ undefined
            batch.set(ref, sanitizeData(p));
        });
        await batch.commit();
    } catch (e: any) {
        console.error("Cloud batch update failed:", e.message);
        throw e;
    }
  },
  
  deleteProduct: async (id: string) => {
    const products = dbService.getProducts().filter(p => p.id !== id);
    localStorage.setItem('glasspos_products', JSON.stringify(products));
    try {
        await deleteDoc(doc(firestore, 'products', id));
    } catch (e) {}
  },

  getSales: (): Sale[] => JSON.parse(localStorage.getItem('glasspos_sales') || '[]'),
  
  saveSale: async (s: Sale) => {
    const sales = dbService.getSales();
    const idx = sales.findIndex(item => item.id === s.id);
    if (idx >= 0) sales[idx] = s; else sales.push(s);
    localStorage.setItem('glasspos_sales', JSON.stringify(sales));
    try {
        await setDoc(doc(firestore, 'sales', s.id), sanitizeData(s));
    } catch (e) {}
    
    // Update stock locally and in cloud
    const products = dbService.getProducts();
    for (const item of s.items) {
      const p = products.find(prod => prod.id === item.id);
      if (p) {
        p.stock -= item.quantity;
        if (item.quantityBulk) p.stockBulk = (p.stockBulk || 0) - item.quantityBulk;
        if (item.quantityPacked) p.stockPacked = (p.stockPacked || 0) - item.quantityPacked;
        try {
            await setDoc(doc(firestore, 'products', p.id), sanitizeData(p));
        } catch (e) {}
      }
    }
    localStorage.setItem('glasspos_products', JSON.stringify(products));
  },

  getPurchases: (): Purchase[] => JSON.parse(localStorage.getItem('glasspos_purchases') || '[]'),
  
  savePurchase: async (p: Purchase) => {
    const purchases = dbService.getPurchases();
    const idx = purchases.findIndex(item => item.id === p.id);
    if (idx >= 0) purchases[idx] = p; else purchases.push(p);
    localStorage.setItem('glasspos_purchases', JSON.stringify(purchases));
    try {
        await setDoc(doc(firestore, 'purchases', p.id), sanitizeData(p));
    } catch (e) {}
  },

  getMovements: (): StockMovement[] => JSON.parse(localStorage.getItem('glasspos_movements') || '[]'),
  
  saveMovement: async (m: StockMovement) => {
    const movements = dbService.getMovements();
    movements.push(m);
    localStorage.setItem('glasspos_movements', JSON.stringify(movements));
    try {
        await setDoc(doc(firestore, 'movements', m.id), sanitizeData(m));
    } catch (e) {}
    
    // Update stock locally and in cloud
    const products = dbService.getProducts();
    for (const item of m.items) {
      const p = products.find(prod => prod.id === item.productId);
      if (p) {
        const factor = (m.type === 'in' || m.type === 'return' || (m.type === 'adjustment' && !m.reason?.includes('خصم') && !m.reason?.includes('عجز'))) ? 1 : -1;
        p.stock += (item.quantity * factor);
        if (item.quantityBulk) p.stockBulk = (p.stockBulk || 0) + (item.quantityBulk * factor);
        if (item.quantityPacked) p.stockPacked = (p.stockPacked || 0) + (item.quantityPacked * factor);
        item.currentBalance = p.stock;
        try {
            await setDoc(doc(firestore, 'products', p.id), sanitizeData(p));
        } catch (e) {}
      }
    }
    localStorage.setItem('glasspos_products', JSON.stringify(products));
  },
  
  deleteMovement: async (id: string) => {
    const movements = dbService.getMovements().filter(m => m.id !== id);
    localStorage.setItem('glasspos_movements', JSON.stringify(movements));
    try {
        await deleteDoc(doc(firestore, 'movements', id));
    } catch (e) {}
  },

  getExpenses: (): Expense[] => JSON.parse(localStorage.getItem('glasspos_expenses') || '[]'),
  
  saveExpense: async (e: Expense) => {
    const expenses = dbService.getExpenses();
    const idx = expenses.findIndex(item => item.id === e.id);
    if (idx >= 0) expenses[idx] = e; else expenses.push(e);
    localStorage.setItem('glasspos_expenses', JSON.stringify(expenses));
    try {
        await setDoc(doc(firestore, 'expenses', e.id), sanitizeData(e));
    } catch (err) {}
  },
  
  deleteExpense: async (id: string) => {
    const expenses = dbService.getExpenses().filter(e => e.id !== id);
    localStorage.setItem('glasspos_expenses', JSON.stringify(expenses));
    try {
        await deleteDoc(doc(firestore, 'expenses', id));
    } catch (e) {}
  },

  getUsers: (): SystemUser[] => JSON.parse(localStorage.getItem('glasspos_users') || '[]'),
  
  saveUser: async (u: SystemUser) => {
    const users = dbService.getUsers();
    const idx = users.findIndex(item => item.id === u.id);
    if (idx >= 0) users[idx] = u; else users.push(u);
    localStorage.setItem('glasspos_users', JSON.stringify(users));
    try {
        await setDoc(doc(firestore, 'users', u.id), sanitizeData(u));
    } catch (e) {}
  },
  
  deleteUser: async (id: string) => {
    const users = dbService.getUsers().filter(u => u.id !== id);
    localStorage.setItem('glasspos_users', JSON.stringify(users));
    try {
        await deleteDoc(doc(firestore, 'users', id));
    } catch (e) {}
  },

  getRequests: (): PurchaseRequest[] => JSON.parse(localStorage.getItem('glasspos_requests') || '[]'),
  
  saveRequest: async (r: PurchaseRequest) => {
    const requests = dbService.getRequests();
    const idx = requests.findIndex(item => item.id === r.id);
    if (idx >= 0) requests[idx] = r; else requests.push(r);
    localStorage.setItem('glasspos_requests', JSON.stringify(requests));
    try {
        await setDoc(doc(firestore, 'requests', r.id), sanitizeData(r));
    } catch (e) {}
  },

  login: async (u: string, p: string): Promise<SystemUser | null> => {
    try {
        const q = query(collection(firestore, 'users'), where('username', '==', u.toLowerCase()), where('password', '==', p), limit(1));
        const cloudSnap = await getDocs(q);
        if (!cloudSnap.empty) {
            const user = cloudSnap.docs[0].data() as SystemUser;
            user.lastActive = new Date().toLocaleString();
            await dbService.saveUser(user);
            return user;
        }
    } catch (e: any) {
        if (e.code === 'unavailable') {
            console.warn("Firestore unavailable for login, checking local storage.");
        } else {
            console.error("Cloud login error:", e);
        }
    }

    const users = dbService.getUsers();
    const user = users.find(user => user.username.toLowerCase() === u.toLowerCase() && user.password === p);
    if (user) {
      user.lastActive = new Date().toLocaleString();
      await dbService.saveUser(user);
      return user;
    }
    return null;
  },

  syncFromCloud: async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const collections = ['products', 'sales', 'purchases', 'movements', 'expenses', 'users', 'requests'];
      for (const coll of collections) {
        const snapshot = await getDocs(collection(firestore, coll));
        const data = snapshot.docs.map(doc => doc.data());
        if (data.length > 0) {
            localStorage.setItem(`glasspos_${coll}`, JSON.stringify(data));
        }
      }
      
      const appSettingsDoc = await getDoc(doc(firestore, 'settings', 'app'));
      if (appSettingsDoc.exists()) {
          localStorage.setItem('glasspos_settings', JSON.stringify(appSettingsDoc.data()));
      }

      const uiConfigDoc = await getDoc(doc(firestore, 'uiConfig', 'current'));
      if (uiConfigDoc.exists()) {
          localStorage.setItem('glasspos_ui_config', JSON.stringify(uiConfigDoc.data()));
      }

      return { success: true };
    } catch (e: any) {
      if (e.code === 'unavailable') {
          return { success: false, error: 'unavailable' };
      }
      console.error("Firebase Sync Error:", e);
      return { success: false, error: e.message };
    }
  },

  getNextId: (type: keyof SequenceConfig): string => {
    const settings = dbService.getSettings();
    const current = settings.sequences[type];
    settings.sequences[type] = current + 1;
    dbService.saveSettings(settings);
    const prefix = type === 'invoice' ? 'INV-' : type === 'purchaseOrder' ? 'PO-' : type === 'issueVoucher' ? 'ISS-' : type === 'receiveVoucher' ? 'REC-' : 'PR-';
    return `${prefix}${current.toString().padStart(6, '0')}`;
  },

  peekNextId: (type: keyof SequenceConfig): string => {
    const settings = dbService.getSettings();
    const current = settings.sequences[type];
    const prefix = type === 'invoice' ? 'INV-' : type === 'purchaseOrder' ? 'PO-' : type === 'issueVoucher' ? 'ISS-' : type === 'receiveVoucher' ? 'REC-' : 'PR-';
    return `${prefix}${current.toString().padStart(6, '0')}`;
  },

  exportSystemData: () => {
    const data = {
      products: dbService.getProducts(),
      sales: dbService.getSales(),
      purchases: dbService.getPurchases(),
      movements: dbService.getMovements(),
      expenses: dbService.getExpenses(),
      users: dbService.getUsers(),
      requests: dbService.getRequests(),
      settings: dbService.getSettings(),
      uiConfig: dbService.getUiConfig()
    };
    return JSON.stringify(data, null, 2);
  },

  saveLinkages: (cat: string, l: any) => localStorage.setItem(`glasspos_mizan_logic_v16_${cat}`, JSON.stringify(l)),

  /**
   * إعادة تهيئة النظام بالكامل (العودة للصفر)
   * تم تحسينها لمسح كافة الروابط والموازين والحسابات
   */
  resetInventoryData: async () => {
    const collectionsToReset = ['products', 'sales', 'purchases', 'movements', 'expenses', 'requests'];
    
    // 1. مسح التخزين المحلي للبيانات
    collectionsToReset.forEach(coll => {
      localStorage.removeItem(`glasspos_${coll}`);
    });

    // 2. مسح روابط الميزان والحسابات المخصصة
    const categories = ['أعلاف', 'بيوتولوجى', 'خامات', 'قطع غيار'];
    categories.forEach(cat => {
      localStorage.removeItem(`glasspos_mizan_logic_v16_${cat}`);
    });

    // 3. تصفير المسلسلات في الإعدادات
    const settings = dbService.getSettings();
    settings.sequences = {
      invoice: 1,
      purchaseOrder: 1,
      issueVoucher: 1,
      receiveVoucher: 1,
      purchaseRequest: 1
    };
    await dbService.saveSettings(settings);

    // 4. محاولة مسح السحابة (إذا كان الاتصال متاحاً)
    try {
        for (const coll of collectionsToReset) {
            const snap = await getDocs(collection(firestore, coll));
            if (snap.empty) continue;
            
            const batch = writeBatch(firestore);
            snap.docs.forEach(d => batch.delete(d.ref));
            await batch.commit();
        }
    } catch (e) {
        console.warn("Cloud partial reset failed. Local reset complete.", e);
    }
  }
};
