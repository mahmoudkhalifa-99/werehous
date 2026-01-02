
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { dbService } from '../services/storage';
import { SystemUser, Role, UiConfig, ButtonConfig, CustomField, CustomFieldTarget, AppSettings, PrintConfig, SequenceConfig, MainScreenSettings, Client, Vendor } from '../types';
import { 
    Layout, FilePlus, FileText, Settings, ListPlus, Package, Users, Building2, 
    Warehouse, Briefcase, Truck, HeartHandshake, Database, Save, ArrowLeft, 
    Trash2, Plus, Edit2, Check, X, Shield, Upload, Download, ArrowRightLeft,
    Monitor, Printer, ChevronDown, ChevronUp, AlertCircle, Type, Clock,
    TrendingUp, ShoppingCart, Factory, Circle, CheckCircle, Tag, Hash, Globe, Phone, MapPin, Mail, FileDown, FileUp, Lock, ShieldCheck, ChevronLeft,
    Scale, UserCheck, UserCog
} from 'lucide-react';
// Fix: Import missing UI components
import { GlassCard, GlassInput } from '../components/NeumorphicUI';
import { ReportBuilder } from '../components/ReportBuilder';
import { ProductTable } from '../components/ProductTable';
import { getIcon, iconNames } from '../utils/icons';
import { useNavigate } from 'react-router-dom';
import { PrintSettingsModal } from '../components/PrintSettingsModal';
import * as XLSX from 'xlsx';

// Define Hierarchy for Custom Field Targets
interface TargetContext {
    id: string;
    label: string;
    icon: any;
    slots: { id: CustomFieldTarget; label: string }[];
}

const CONTEXT_HIERARCHY: TargetContext[] = [
    { 
        id: 'sales', 
        label: 'إدارة المبيعات', 
        icon: TrendingUp,
        slots: [
            { id: 'sales_header', label: 'فاتورة مبيعات - البيانات الأساسية' },
            { id: 'sales_logistics', label: 'فاتورة مبيعات - بيانات النقل واللوجستيات' },
            { id: 'sales_item', label: 'فاتورة مبيعات - جدول الأصناف' },
            { id: 'sales_return', label: 'مرتجع مبيعات' },
            { id: 'sales_daily', label: 'المبيعات اليومية' },
            { id: 'sales_report_client', label: 'مسحوبات العملاء' },
            { id: 'sales_report_item', label: 'مسحوبات الأصناف' },
            { id: 'sales_report_general', label: 'تقارير المبيعات' }
        ]
    },
    { 
        id: 'purchases', 
        label: 'إدارة المشتريات', 
        icon: ShoppingCart,
        slots: [
            { id: 'purchase_header', label: 'أمر شراء - البيانات الأساسية' },
            { id: 'purchase_item', label: 'أمر شراء - جدول الأصناف' },
            { id: 'purchase_receive', label: 'استلام مشتريات (إضافة للمخزن)' }
        ]
    },
    { 
        id: 'finished', 
        label: 'مخزن المنتج التام', 
        icon: Package,
        slots: [
            { id: 'finished_production', label: 'استلام إنتاج (إضافة)' },
            { id: 'finished_issue', label: 'إذن صرف (تحويل/صرف)' },
            { id: 'finished_return', label: 'مرتجعات للمخزن' },
            { id: 'finished_stocktaking', label: 'جرد المخزن' },
            { id: 'finished_settlement', label: 'التسويات (المنتج التام)' }
        ]
    },
    { 
        id: 'raw', 
        label: 'مخزن الخامات', 
        icon: Factory,
        slots: [
            { id: 'raw_receive', label: 'استلام خامات (وارد)' },
            { id: 'raw_issue', label: 'صرف خامات للتشغيل (منصرف)' },
            { id: 'raw_settlement', label: 'التسويات (الخامات)' }
        ]
    },
    { 
        id: 'general', 
        label: 'المخازن العامة', 
        icon: Warehouse,
        slots: [
            { id: 'general_custody', label: 'عهدة الموظفين' },
            { id: 'general_parts', label: 'قطع الغيار والمهمات' },
            { id: 'general_catering', label: 'مخزن الإعاشة' }
        ]
    },
    { 
        id: 'entities', 
        label: 'البيانات الأساسية', 
        icon: Database,
        slots: [
            { id: 'product_main', label: 'بطاقة الصنف' },
            { id: 'customer_main', label: 'بيانات العميل' },
            { id: 'supplier_main', label: 'بيانات المورد' }
        ]
    },
];

// System Lists Definition
const SYSTEM_LISTS: { key: keyof AppSettings, label: string, icon: any }[] = [
    { key: 'customers', label: 'العملاء', icon: HeartHandshake },
    { key: 'suppliers', label: 'الموردين', icon: Truck },
    { key: 'partsSubWarehouses', label: 'المخزن التابع له', icon: Warehouse },
    { key: 'storekeepersRaw', label: 'أمناء مخازن الخامات', icon: UserCog },
    { key: 'storekeepersParts', label: 'أمناء مخازن قطع الغيار', icon: UserCog },
    { key: 'storekeepersFinished', label: 'أمناء مخازن المنتج التام', icon: UserCog },
    { key: 'rawTransportCompanies', label: 'شركات النقل للخامات', icon: Truck },
    { key: 'executionEntities', label: 'جهة التنفيذ', icon: ShieldCheck },
    { key: 'weighmasters', label: 'الوزان', icon: Scale },
    { key: 'inspectors', label: 'القائم بالفحص خامات', icon: UserCheck },
    { key: 'departments', label: 'الأقسام', icon: Building2 },
    { key: 'loadingOfficers', label: 'مسؤولي التحميل', icon: Users },
    { key: 'confirmationOfficers', label: 'مسؤولي تأكيد الخروج', icon: CheckCircle },
    { key: 'transportMethods', label: 'طرق النقل', icon: Truck },
    { key: 'carTypes', label: 'أنواع السيارات', icon: Truck },
    { key: 'shifts', label: 'الورديات', icon: Clock },
    { key: 'returnReasons', label: 'أسباب الارتجاع', icon: AlertCircle },
    { key: 'units', label: 'وحدات القياس', icon: Settings },
    { key: 'categories', label: 'تصنيفات الأصناف', icon: Tag },
    { key: 'salesTypes', label: 'أنواع البيع', icon: TrendingUp },
];

const COLOR_OPTIONS = [
  { label: 'Blue (Standard)', value: 'bg-blue-600' },
  { label: 'Dark Blue (Navy)', value: 'bg-blue-900' },
  { label: 'Green (Success)', value: 'bg-green-600' },
  { label: 'Red (Danger)', value: 'bg-red-500' },
  { label: 'Orange (Warning)', value: 'bg-amber-500' },
  { label: 'Purple (Primary)', value: 'bg-purple-700' },
  { label: 'Cyan (Info)', value: 'bg-cyan-500' },
  { label: 'Gray (Neutral)', value: 'bg-gray-600' },
  { label: 'Indigo', value: 'bg-indigo-600' },
  { label: 'Teal', value: 'bg-teal-500' },
  { label: 'Light Blue (Card)', value: 'bg-blue-50' },
  { label: 'Transparent (Text Only)', value: 'text-gray-500' },
];

// --- Sub Component: ButtonRow (For Interface Customizer) ---
const ButtonRow: React.FC<{
  button: ButtonConfig;
  index: number;
  onSave: (index: number, btn: ButtonConfig) => void;
  onDelete: () => void;
  onMove: (index: number, direction: 'up' | 'down') => void;
}> = ({ button, index, onSave, onDelete, onMove }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localBtn, setLocalBtn] = useState<ButtonConfig>(button);

  useEffect(() => { setLocalBtn(button); }, [button]);

  const Icon = getIcon(localBtn.icon);

  if (isEditing) {
    return (
      <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-200 flex flex-col md:flex-row items-start gap-4 animate-fade-in shadow-inner">
         <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
            <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-500">Label Key / Text</label>
                <input className="p-2 rounded border text-sm" value={localBtn.labelKey} onChange={(e) => setLocalBtn({...localBtn, labelKey: e.target.value})} />
            </div>
            <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-500">Arabic Label</label>
                <input className="p-2 rounded border text-sm" value={localBtn.labelAr || ''} onChange={(e) => setLocalBtn({...localBtn, labelAr: e.target.value})} placeholder="عربي" />
            </div>
            <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-500">Color</label>
                <select className="p-2 rounded border text-sm" value={localBtn.color} onChange={(e) => setLocalBtn({...localBtn, color: e.target.value})}>
                    {COLOR_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
            </div>
         </div>
         <div className="flex gap-2 mt-4 md:mt-0">
             <button onClick={() => { onSave(index, localBtn); setIsEditing(false); }} className="bg-green-500 text-white p-2 rounded hover:bg-green-600"><Check size={16}/></button>
             <button onClick={() => { setLocalBtn(button); setIsEditing(false); }} className="bg-gray-400 text-white p-2 rounded hover:bg-gray-500"><X size={16}/></button>
         </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-3 rounded-xl border border-gray-200 flex items-center gap-3 hover:shadow-sm">
        <div className="flex flex-col gap-1">
            <button onClick={() => onMove(index, 'up')} className="text-gray-400 hover:text-blue-600"><ChevronUp size={14}/></button>
            <button onClick={() => onMove(index, 'down')} className="text-gray-400 hover:text-blue-600"><ChevronDown size={14}/></button>
        </div>
        <div className={`p-2 rounded-lg ${localBtn.color.includes('bg-') ? localBtn.color : 'bg-gray-200'} text-white`}>
            <Icon size={20} />
        </div>
        <div className="flex-1">
            <h4 className="font-bold text-sm text-gray-800">{localBtn.labelAr || localBtn.labelKey}</h4>
            <p className="text-[10px] text-gray-400 font-mono">{localBtn.action}</p>
        </div>
        <div className="flex gap-2">
            <button onClick={() => setIsEditing(true)} className="text-blue-600 hover:bg-blue-50 p-2 rounded"><Edit2 size={16}/></button>
            <button onClick={onDelete} className="text-red-500 hover:bg-red-50 p-2 rounded"><Trash2 size={16}/></button>
        </div>
    </div>
  );
};

// --- Sub-View Components ---

const SystemSettingsView: React.FC = () => {
    const { settings, updateSettings } = useApp();

    const updateCompanyInfo = (field: keyof PrintConfig, value: string) => {
        const newPrintConfigs = { ...settings.printConfigs };
        if (!newPrintConfigs['default']) {
            newPrintConfigs['default'] = { 
                companyName: 'My Company', address: '', phone: '', email: '', 
                logo: '', logoLeft: '', showLogo: true, showCompanyInfo: true,
                watermark: {
                    enabled: false,
                    type: 'text',
                    opacity: 0.1,
                    rotation: -45,
                    fontSize: 60,
                    color: '#000000'
                }
            };
        }
        newPrintConfigs['default'] = { ...newPrintConfigs['default'], [field]: value };
        updateSettings({ ...settings, printConfigs: newPrintConfigs });
    };

    const updateSequence = (field: keyof SequenceConfig, value: number) => {
        updateSettings({ ...settings, sequences: { ...settings.sequences, [field]: value } });
    };

    const updateMainScreen = (field: keyof MainScreenSettings, value: any) => {
        const current = settings.mainScreenSettings || {
            title: 'برنامج إدارة المخازن المتطور',
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
        } as MainScreenSettings;
        updateSettings({ ...settings, mainScreenSettings: { ...current, [field]: value } });
    };

    return (
        <div className="space-y-6 animate-fade-in" dir="rtl">
            <GlassCard>
                <h3 className="font-bold text-lg border-b pb-2 mb-4 text-gray-800 flex items-center gap-2">
                    <Settings size={20} className="text-blue-600"/> إعدادات النظام العامة
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <GlassInput label="العملة (Currency)" value={settings.currency} onChange={e => updateSettings({...settings, currency: e.target.value})} />
                    <GlassInput label="نسبة الضريبة (%)" type="number" value={settings.taxRate || ''} onChange={e => updateSettings({...settings, taxRate: Number(e.target.value)})} />
                    
                    <div className="flex flex-col gap-2 w-full">
                        <label className="text-gray-600 text-sm font-medium ml-1">اللغة (Language)</label>
                        <div className="flex gap-2">
                            <button onClick={() => updateSettings({...settings, language: 'ar'})} className={`flex-1 py-2 rounded-xl border font-bold flex items-center justify-center gap-2 transition-all ${settings.language === 'ar' ? 'bg-green-600 text-white border-green-600 shadow-md' : 'bg-white text-gray-600'}`}>
                                <Globe size={16}/> العربية
                            </button>
                            <button onClick={() => updateSettings({...settings, language: 'en'})} className={`flex-1 py-2 rounded-xl border font-bold flex items-center justify-center gap-2 transition-all ${settings.language === 'en' ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-gray-600'}`}>
                                <Globe size={16}/> English
                            </button>
                        </div>
                    </div>

                    <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        <label className="flex items-center gap-3 cursor-pointer bg-gray-50 p-3 rounded-xl border border-gray-200 hover:bg-white transition-colors">
                            <input type="checkbox" checked={settings.lowStockAlert} onChange={e => updateSettings({...settings, lowStockAlert: e.target.checked})} className="w-5 h-5 accent-orange-500"/>
                            <span className="font-bold text-gray-700">تفعيل تنبيهات المخزون المنخفض</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer bg-gray-50 p-3 rounded-xl border border-gray-200 hover:bg-white transition-colors">
                            <input type="checkbox" checked={settings.autoBackup} onChange={e => updateSettings({...settings, autoBackup: e.target.checked})} className="w-5 h-5 accent-blue-500"/>
                            <span className="font-bold text-gray-700">نسخ احتياطي تلقائي للبيانات محلياً</span>
                        </label>
                    </div>
                </div>
            </GlassCard>

            <GlassCard>
                <h3 className="font-bold text-lg border-b pb-2 mb-4 text-gray-800 flex items-center gap-2">
                    <Lock size={20} className="text-rose-600"/> تخصيص شاشة الدخول
                </h3>
                <div className="flex flex-col md:flex-row gap-6 items-center">
                    <div className="w-full md:w-1/3">
                        <div className="h-32 bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden mb-2 relative group">
                            {settings.loginScreenLogo ? (
                                <>
                                    <img src={settings.loginScreenLogo} className="h-full w-full object-contain" alt="Login Logo" />
                                    <button 
                                        onClick={() => updateSettings({...settings, loginScreenLogo: ''})}
                                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="حذف الصورة"
                                    >
                                        <X size={14}/>
                                    </button>
                                </>
                            ) : (
                                <div className="text-gray-400 text-center">
                                    <Lock size={32} className="mx-auto mb-2 opacity-50"/>
                                    <span className="text-xs">الأيقونة الافتراضية</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex-1">
                        <label className="block text-sm font-bold text-gray-700 mb-2">صورة القفل / اللوجو</label>
                        <p className="text-xs text-gray-500 mb-4">يمكنك تغيير أيقونة القفل في شاشة تسجيل الدخول بصورة شعار شركتك.</p>
                        <label className="cursor-pointer bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-50 inline-flex items-center gap-2 shadow-sm transition-all">
                            <Upload size={16}/> رفع صورة
                            <input type="file" accept="image/*" className="hidden" />
                        </label>
                    </div>
                </div>
            </GlassCard>

            <GlassCard>
                <h3 className="font-bold text-lg border-b pb-2 mb-4 text-gray-800 flex items-center gap-2">
                    <Building2 size={20} className="text-purple-600"/> بيانات الشركة (للطباعة)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <GlassInput label="اسم الشركة / المؤسسة" value={settings.printConfigs.default?.companyName || ''} onChange={e => updateCompanyInfo('companyName', e.target.value)} />
                    <GlassInput label="العنوان" value={settings.printConfigs.default?.address || ''} onChange={e => updateCompanyInfo('address', e.target.value)} />
                    <GlassInput label="رقم الهاتف" value={settings.printConfigs.default?.phone || ''} onChange={e => updateCompanyInfo('phone', e.target.value)} />
                    <GlassInput label="البريد الإلكتروني / الموقع" value={settings.printConfigs.default?.email || ''} onChange={e => updateCompanyInfo('email', e.target.value)} />
                </div>
            </GlassCard>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <GlassCard>
                    <h3 className="font-bold text-lg border-b pb-2 mb-4 text-gray-800 flex items-center gap-2">
                        <Printer size={20} className="text-teal-600"/> إعدادات الطباعة
                    </h3>
                    <div className="space-y-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-gray-600 text-sm font-medium">نوع الطابعة الافتراضي</label>
                            <div className="flex gap-2 bg-gray-50 p-1 rounded-xl border border-gray-200">
                                <button onClick={() => updateSettings({...settings, printerType: 'a4'})} className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${settings.printerType === 'a4' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>A4 (Standard)</button>
                                <button onClick={() => updateSettings({...settings, printerType: 'thermal'})} className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${settings.printerType === 'thermal' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>Thermal (80mm)</button>
                            </div>
                        </div>
                        <label className="flex items-center gap-3 cursor-pointer bg-gray-50 p-3 rounded-xl border border-gray-200 hover:bg-white transition-colors">
                            <input type="checkbox" checked={settings.autoPrint} onChange={e => updateSettings({...settings, autoPrint: e.target.checked})} className="w-5 h-5 accent-teal-500"/>
                            <span className="font-bold text-gray-700">طباعة تلقائية للفواتير بعد الحفظ</span>
                        </label>
                    </div>
                </GlassCard>

                <GlassCard>
                    <h3 className="font-bold text-lg border-b pb-2 mb-4 text-gray-800 flex items-center gap-2">
                        <Hash size={20} className="text-indigo-600"/> تسلسل الأرقام (Sequences)
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <GlassInput label="رقم الفاتورة التالي" type="number" value={settings.sequences.invoice || ''} onChange={e => updateSequence('invoice', Number(e.target.value))} />
                        <GlassInput label="رقم أمر الشراء التالي" type="number" value={settings.sequences.purchaseOrder || ''} onChange={e => updateSequence('purchaseOrder', Number(e.target.value))} />
                        <GlassInput label="رقم إذن الصرف التالي" type="number" value={settings.sequences.issueVoucher || ''} onChange={e => updateSequence('issueVoucher', Number(e.target.value))} />
                        <GlassInput label="رقم إذن الاستلام التالي" type="number" value={settings.sequences.receiveVoucher || ''} onChange={e => updateSequence('receiveVoucher', Number(e.target.value))} />
                    </div>
                </GlassCard>
            </div>

            <GlassCard>
                <h3 className="font-bold text-lg border-b pb-2 mb-4 text-gray-800 flex items-center gap-2">
                    <Monitor size={20} className="text-orange-600"/> تخصيص الشاشة الرئيسية
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <GlassInput label="عنوان النظام (Title)" value={settings.mainScreenSettings?.title || 'الشاشة الرئيسية'} onChange={e => updateMainScreen('title', e.target.value)} />
                    <div className="flex flex-col gap-2">
                        <label className="text-gray-600 text-sm font-medium">عرض الساعة</label>
                        <label className="flex items-center gap-3 cursor-pointer bg-gray-50 p-3 rounded-xl border border-gray-200 hover:bg-white transition-colors">
                            <input type="checkbox" checked={settings.mainScreenSettings?.showClock !== false} onChange={e => updateMainScreen('showClock', e.target.checked)} className="w-5 h-5 accent-orange-500"/>
                            <span className="font-bold text-gray-700">إظهار الساعة الرقمية</span>
                        </label>
                    </div>
                </div>
            </GlassCard>
        </div>
    );
};

const UserManagement: React.FC = () => {
    const { user: currentUser } = useApp();
    const [users, setUsers] = useState<SystemUser[]>(dbService.getUsers());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
    const [form, setForm] = useState<Partial<SystemUser>>({ role: 'cashier' });

    const refresh = () => setUsers(dbService.getUsers());

    const handleSave = () => {
        if (!form.username || !form.name || !form.password) return alert('Please fill required fields');
        const newUser: SystemUser = {
            id: editingUser ? editingUser.id : Date.now().toString(),
            username: form.username,
            name: form.name,
            password: form.password,
            role: form.role as Role || 'cashier',
            permissions: form.permissions || { screens: {}, actions: { canImport: false, canExport: false } },
            lastActive: editingUser?.lastActive
        };
        dbService.saveUser(newUser);
        refresh();
        setIsModalOpen(false);
    };

    const handleDelete = (id: string) => {
        if (currentUser?.id === id) return alert("Cannot delete yourself");
        if (confirm("Delete user?")) {
            dbService.deleteUser(id);
            refresh();
        }
    };

    const openModal = (u?: SystemUser) => {
        setEditingUser(u || null);
        setForm(u ? { ...u } : { role: 'cashier', permissions: { screens: {}, actions: { canImport: false, canExport: false } } });
        setIsModalOpen(true);
    };

    return (
        <GlassCard>
            <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h3 className="font-bold text-gray-800 flex items-center gap-2"><Users size={20} className="text-blue-600"/> إدارة المستخدمين</h3>
                <button onClick={() => openModal()} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"><Plus size={16}/> إضافة مستخدم</button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-center">
                    <thead className="bg-gray-100 text-gray-700 font-bold">
                        <tr><th className="p-3">الاسم</th><th className="p-3">اسم المستخدم</th><th className="p-3">الصلاحية</th><th className="p-3">آخر ظهور</th><th className="p-3">إجراءات</th></tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u.id} className="border-b hover:bg-gray-50">
                                <td className="p-3 font-bold">{u.name}</td>
                                <td className="p-3 text-gray-600">{u.username}</td>
                                <td className="p-3"><span className={`px-2 py-1 rounded text-xs text-white ${u.role === 'admin' ? 'bg-purple-500' : 'bg-blue-500'}`}>{u.role}</span></td>
                                <td className="p-3 text-xs text-gray-400">{u.lastActive ? new Date(u.lastActive).toLocaleString() : '-'}</td>
                                <td className="p-3 flex justify-center gap-2">
                                    <button onClick={() => openModal(u)} className="text-blue-600 hover:bg-blue-50 p-2 rounded"><Edit2 size={16}/></button>
                                    <button onClick={() => handleDelete(u.id)} className="text-red-500 hover:bg-red-50 p-2 rounded"><Trash2 size={16}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl">
                        <h3 className="font-bold text-lg mb-4">{editingUser ? 'تعديل مستخدم' : 'إضافة مستخدم'}</h3>
                        <div className="space-y-3">
                            <GlassInput label="الاسم الكامل" value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} />
                            <GlassInput label="اسم المستخدم للدخول" value={form.username || ''} onChange={e => setForm({...form, username: e.target.value})} />
                            <GlassInput label="كلمة المرور" type="password" value={form.password || ''} onChange={e => setForm({...form, password: e.target.value})} />
                            <div>
                                <label className="text-sm font-bold text-gray-500 block mb-1">الصلاحية</label>
                                <select className="w-full p-2 border rounded-lg bg-gray-50 outline-none" value={form.role} onChange={e => setForm({...form, role: e.target.value as Role})}>
                                    <option value="cashier">كاشير / مستخدم</option>
                                    <option value="admin">مدير نظام</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded-lg text-gray-700 font-bold">إلغاء</button>
                            <button onClick={handleSave} className="px-4 py-2 bg-blue-600 rounded-lg text-white font-bold">حفظ</button>
                        </div>
                    </div>
                </div>
            )}
        </GlassCard>
    );
};

const InterfaceCustomizerView: React.FC<{
    selectedScreenId: keyof UiConfig;
    setSelectedScreenId: (id: keyof UiConfig) => void;
}> = ({ selectedScreenId, setSelectedScreenId }) => {
    const { uiConfig, saveUiConfig, addButton, updateButtonFull, removeButton, reorderButtons } = useApp();
    const [interfaceSaved, setInterfaceSaved] = useState(false);

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)]">
            <div className="w-full lg:w-64 bg-white rounded-xl shadow-md overflow-hidden flex flex-col border border-gray-200 shrink-0">
                <div className="p-4 bg-gray-800 text-white font-bold text-center">الشاشات</div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {Object.keys(uiConfig).map((key) => (
                        <button key={key} onClick={() => setSelectedScreenId(key as keyof UiConfig)} className={`w-full text-right p-3 rounded-lg font-cairo font-bold transition-all ${selectedScreenId === key ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-gray-100 text-gray-600'}`}>{uiConfig[key as keyof UiConfig].name}</button>
                    ))}
                </div>
            </div>
            <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200 shrink-0">
                    <h2 className="text-xl font-bold text-gray-800 font-cairo">تخصيص: {uiConfig[selectedScreenId].name}</h2>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => { saveUiConfig(); setInterfaceSaved(true); setTimeout(() => setInterfaceSaved(false), 2000); }}
                            className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-md transition-all duration-300 ${interfaceSaved ? 'bg-green-50 text-white' : 'bg-green-600 text-white hover:bg-green-700'}`}
                        >
                            {interfaceSaved ? <Check size={18}/> : <Save size={18}/>} 
                            {interfaceSaved ? 'تم الحفظ!' : 'حفظ التغييرات'}
                        </button>
                        <button 
                            onClick={() => addButton(selectedScreenId, { id: Date.now().toString(), labelKey: 'New Button', icon: 'Circle', color: 'bg-gray-500', action: '', isVisible: true })} 
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2 shadow-md"
                        >
                            <Plus size={18}/> زر جديد
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto space-y-3 pr-2 pb-20">
                    {uiConfig[selectedScreenId].buttons.map((btn, idx) => (
                        <ButtonRow 
                            key={btn.id} 
                            button={btn} 
                            index={idx} 
                            onSave={(i, b) => updateButtonFull(selectedScreenId, i, b)} 
                            onDelete={() => { if(confirm('حذف الزر؟')) removeButton(selectedScreenId, btn.id); }} 
                            onMove={(i, dir) => {
                                const buttons = [...uiConfig[selectedScreenId].buttons];
                                if (dir === 'up' && i > 0) [buttons[i], buttons[i-1]] = [buttons[i-1], buttons[i]];
                                else if (dir === 'down' && i < buttons.length-1) [buttons[i], buttons[i+1]] = [buttons[i+1], buttons[i]];
                                reorderButtons(selectedScreenId, buttons);
                            }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

const BackupView: React.FC = () => {
    const fileRef = useRef<HTMLInputElement>(null);
    
    const handleExport = () => {
        const data = dbService.exportSystemData();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `glasspos_backup_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            if (evt.target?.result && typeof evt.target.result === 'string') {
                if (dbService.importSystemData(evt.target.result)) {
                    alert('تم استعادة النسخة الاحتياطية بنجاح! سيتم إعادة تحميل الصفحة.');
                    window.location.reload();
                } else {
                    alert('فشل في استعادة البيانات. الملف قد يكون تالفاً.');
                }
            }
        };
        // Fixed: Use readAsText for JSON files to ensure dbService.importSystemData receives correct data
        reader.readAsText(file); 
    };

    return (
        <GlassCard className="flex flex-col items-center justify-center gap-8 py-12">
            <Database size={64} className="text-gray-300"/>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-lg">
                <button onClick={handleExport} className="flex flex-col items-center gap-3 p-6 bg-blue-50 border border-blue-200 rounded-2xl hover:bg-blue-100 transition-all group">
                    <div className="p-4 bg-blue-600 text-white rounded-full shadow-lg group-hover:scale-110 transition-transform"><Download size={32}/></div>
                    <h3 className="font-bold text-blue-900">تصدير نسخة احتياطية</h3>
                </button>
                <button onClick={() => fileRef.current?.click()} className="flex flex-col items-center gap-3 p-6 bg-green-50 border border-green-200 rounded-2xl hover:bg-green-100 transition-all group">
                    <div className="p-4 bg-green-600 text-white rounded-full shadow-lg group-hover:scale-110 transition-transform"><Upload size={32}/></div>
                    <h3 className="font-bold text-green-900">استعادة نسخة احتياطية</h3>
                </button>
                <input type="file" ref={fileRef} className="hidden" accept=".json" onChange={handleImport} />
            </div>
        </GlassCard>
    );
};

const ReportsManageView: React.FC = () => {
    const { settings, deleteCustomReport } = useApp();
    const navigate = useNavigate();
    const customReports = settings.customReports || [];
    
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-teal-50 p-4 rounded-xl border border-teal-100">
                <h3 className="font-bold text-teal-800">التقارير المخصصة ({customReports.length})</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {customReports.map(rep => (
                    <div key={rep.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex justify-between items-start">
                        <div>
                            <h4 className="font-bold text-gray-800">{rep.title}</h4>
                            <p className="text-xs text-gray-500 mt-1">Source: {rep.dataSource}</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => navigate(`/report/${rep.id}`)} className="p-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"><ArrowRightLeft size={16}/></button>
                            <button onClick={() => { if(confirm('حذف التقرير؟')) deleteCustomReport(rep.id); }} className="p-2 bg-red-50 text-red-600 rounded hover:bg-red-100"><Trash2 size={16}/></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const CustomFieldsManager: React.FC<{ initialList?: keyof AppSettings }> = ({ initialList }) => {
    const { settings, updateSettings } = useApp();
    const [selectedSystemList, setSelectedSystemList] = useState<keyof AppSettings | null>(initialList || 'departments');
    const [editingField, setEditingField] = useState<CustomField | null>(null);
    const [newOption, setNewOption] = useState('');
    const [structuredForm, setStructuredForm] = useState({ code: '', name: '', phone: '', address: '' });
    const fileRef = useRef<HTMLInputElement>(null);
    const isDetailedList = selectedSystemList === 'customers' || selectedSystemList === 'suppliers';
    const [fieldForm, setFieldForm] = useState<Partial<CustomField>>({});
    const [expandedContexts, setExpandedContexts] = useState<string[]>([]);
    const customFields = settings.customFields || [];

    const getDetailedListData = () => {
        if (selectedSystemList === 'customers') return settings.clients || [];
        if (selectedSystemList === 'suppliers') return settings.vendors || [];
        return [];
    };

    const handleSystemListAdd = () => {
        if (!selectedSystemList) return;
        if (isDetailedList) {
            if (!structuredForm.name.trim()) return alert('يرجى إدخال الاسم على الأقل.');
            const updatedSettings = { ...settings };
            const newItem = { id: Date.now().toString(), code: structuredForm.code || (selectedSystemList === 'customers' ? `C-${Date.now()}` : `V-${Date.now()}`), name: structuredForm.name.trim(), phone: structuredForm.phone, address: structuredForm.address };
            if (selectedSystemList === 'customers') { updatedSettings.clients = [...(settings.clients || []), newItem]; if (!(settings.customers || []).includes(newItem.name)) updatedSettings.customers = [...(settings.customers || []), newItem.name]; } 
            else { updatedSettings.vendors = [...(settings.vendors || []), newItem]; if (!(settings.suppliers || []).includes(newItem.name)) updatedSettings.suppliers = [...(settings.suppliers || []), newItem.name]; }
            updateSettings(updatedSettings); setStructuredForm({ code: '', name: '', phone: '', address: '' }); return;
        }
        if (!newOption.trim()) return;
        const currentList = (settings[selectedSystemList] as string[]) || [];
        if (!currentList.includes(newOption.trim())) { updateSettings({ ...settings, [selectedSystemList]: [...currentList, newOption.trim()] }); setNewOption(''); }
    };

    const handleSystemListRemove = (itemIdentifier: any) => {
        if (!selectedSystemList) return;
        if (isDetailedList) {
            const updatedSettings = { ...settings };
            if (selectedSystemList === 'customers') { 
                updatedSettings.clients = (settings.clients || []).filter(c => c.id !== itemIdentifier.id); 
                // تحديث مصفوفة الأسماء البسيطة أيضاً لضمان المزامنة
                updatedSettings.customers = updatedSettings.clients.map(c => c.name);
            } else { 
                updatedSettings.vendors = (settings.vendors || []).filter(v => v.id !== itemIdentifier.id); 
                updatedSettings.suppliers = updatedSettings.vendors.map(v => v.name);
            }
            updateSettings(updatedSettings);
        } else {
            const currentList = (settings[selectedSystemList] as string[]) || [];
            updateSettings({ ...settings, [selectedSystemList]: currentList.filter(i => i !== itemIdentifier) });
        }
    };

    const handleExportList = () => {
        if (!selectedSystemList) return;
        const listName = SYSTEM_LISTS.find(s => s.key === selectedSystemList)?.label || selectedSystemList;
        const wb = XLSX.utils.book_new();
        let ws;
        if (isDetailedList) {
            const data = selectedSystemList === 'customers' ? (settings.clients || []) : (settings.vendors || []);
            ws = XLSX.utils.aoa_to_sheet([['كود', 'الاسم', 'الهاتف', 'العنوان'], ...data.map((d: any) => [d.code, d.name, d.phone, d.address])]);
        } else {
            const listData = (settings[selectedSystemList] as string[]) || [];
            ws = XLSX.utils.aoa_to_sheet([['القيمة'], ...listData.map(item => [item])]);
        }
        XLSX.utils.book_append_sheet(wb, ws, "List");
        XLSX.writeFile(wb, `${listName}_export.xlsx`);
    };

    const handleImportList = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!selectedSystemList) return;
        const file = e.target.files?.[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const workbook = XLSX.read(evt.target?.result, { type: 'array' });
                const ws = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1 });
                if (!jsonData || jsonData.length < 1) return alert('الملف فارغ أو غير صالح');

                const updatedSettings = { ...settings };
                let addedCount = 0;

                if (isDetailedList) {
                    const currentItems = selectedSystemList === 'customers' ? [...(settings.clients || [])] : [...(settings.vendors || [])];
                    const rows = jsonData.slice(1);
                    
                    rows.forEach((row: any) => {
                        const code = String(row[0] || '').trim();
                        const name = String(row[1] || row[0] || '').trim();
                        if (!name) return;

                        // منع التكرار بناءً على الكود أو الاسم
                        if (!currentItems.some(item => (code && item.code === code) || (item.name === name))) {
                            currentItems.push({
                                id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                                code: code || (selectedSystemList === 'customers' ? `C-${Date.now()}` : `V-${Date.now()}`),
                                name: name,
                                phone: row[2] ? String(row[2]) : '',
                                address: row[3] ? String(row[3]) : ''
                            });
                            addedCount++;
                        }
                    });

                    if (selectedSystemList === 'customers') {
                        updatedSettings.clients = currentItems;
                        updatedSettings.customers = currentItems.map(c => c.name);
                    } else {
                        updatedSettings.vendors = currentItems;
                        updatedSettings.suppliers = currentItems.map(v => v.name);
                    }
                } else {
                    const currentList = [...((settings[selectedSystemList] as string[]) || [])];
                    const rows = jsonData.slice(1);
                    rows.forEach((row: any) => {
                        const val = String(row[0] || '').trim();
                        if (val && !currentList.includes(val)) {
                            currentList.push(val);
                            addedCount++;
                        }
                    });
                    (updatedSettings as any)[selectedSystemList] = currentList;
                }

                updateSettings(updatedSettings);
                alert(`تم استيراد ${addedCount} بند جديد بنجاح إلى القائمة الحالية.`);
            } catch (err) {
                alert('حدث خطأ أثناء قراءة الملف. تأكد من صحة التنسيق.');
            }
            if (e.target) e.target.value = '';
        };
        reader.readAsArrayBuffer(file);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-200px)]">
            <GlassCard className="lg:col-span-3 flex flex-col p-4 overflow-hidden border-l border-gray-200">
                <div className="flex justify-between items-center mb-4 pb-2 border-b">
                    <h3 className="font-bold text-gray-700">القوائم</h3>
                    <button onClick={() => { setSelectedSystemList(null); setEditingField(null); setFieldForm({ label: '', options: [], targets: [], isRequired: false }); }} className="bg-rose-100 text-rose-600 p-1.5 rounded-lg hover:bg-rose-200"><Plus size={18}/></button>
                </div>
                <div className="overflow-y-auto flex-1 space-y-4 pr-1">
                    <div>
                        <h5 className="text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-wider">قوائم النظام</h5>
                        <div className="space-y-1">
                            {SYSTEM_LISTS.map(sys => (
                                <button key={sys.key} onClick={() => { setSelectedSystemList(sys.key); setEditingField(null); setFieldForm({}); setNewOption(''); }} className={`w-full text-right p-2.5 rounded-lg text-sm font-bold flex items-center gap-3 transition-all ${selectedSystemList === sys.key ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}><sys.icon size={16} /> {sys.label}</button>
                            ))}
                        </div>
                    </div>
                </div>
            </GlassCard>
            <GlassCard className="lg:col-span-9 flex flex-col p-6 bg-white relative">
                {selectedSystemList && (
                    <div className="animate-fade-in flex flex-col h-full">
                        <div className="flex items-center gap-3 border-b pb-4 mb-4">
                            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">{React.createElement(SYSTEM_LISTS.find(s => s.key === selectedSystemList)?.icon || Circle, { size: 24 })}</div>
                            <div className="flex-1"><h3 className="text-lg font-bold text-gray-800">{SYSTEM_LISTS.find(s => s.key === selectedSystemList)?.label || selectedSystemList}</h3></div>
                            <div className="flex gap-2"><button onClick={handleExportList} className="flex items-center gap-2 bg-white text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-50"><FileUp size={16}/> تصدير</button><button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 bg-white text-green-600 border border-green-200 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-50"><FileDown size={16}/> استيراد دمج</button><input type="file" ref={fileRef} onChange={handleImportList} accept=".xlsx, .xls, .csv" className="hidden" /></div>
                        </div>
                        {isDetailedList ? (
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-4 bg-gray-50 p-3 rounded-xl border border-gray-200">
                                <div className="flex flex-col gap-1"><label className="text-[10px] font-bold text-gray-500">الكود</label><input className="p-2 rounded border text-sm" value={structuredForm.code} onChange={e => setStructuredForm({...structuredForm, code: e.target.value})} /></div>
                                <div className="flex flex-col gap-1 md:col-span-2"><label className="text-[10px] font-bold text-gray-500">الاسم</label><input className="p-2 rounded border text-sm" value={structuredForm.name} onChange={e => setStructuredForm({...structuredForm, name: e.target.value})} /></div>
                                <div className="flex flex-col gap-1"><label className="text-[10px] font-bold text-gray-500">الهاتف</label><input className="p-2 rounded border text-sm" value={structuredForm.phone} onChange={e => setStructuredForm({...structuredForm, phone: e.target.value})} /></div>
                                <div className="flex flex-col gap-1"><label className="text-[10px] font-bold text-gray-500">العنوان</label><input className="p-2 rounded border text-sm" value={structuredForm.address} onChange={e => setStructuredForm({...structuredForm, address: e.target.value})} /></div>
                                <button onClick={handleSystemListAdd} className="bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 md:col-span-5 py-2 mt-1">إضافة للبند</button>
                            </div>
                        ) : (
                            <div className="flex gap-2 mb-4"><input className="flex-1 p-3 rounded-xl border border-gray-300 outline-none focus:border-blue-500 font-cairo" placeholder="أدخل خيار جديد..." value={newOption} onChange={e => setNewOption(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSystemListAdd()}/><button onClick={handleSystemListAdd} className="bg-blue-600 text-white px-6 rounded-xl font-bold hover:bg-blue-700">إضافة</button></div>
                        )}
                        <div className="flex-1 overflow-y-auto bg-gray-50 rounded-xl border border-gray-200 p-2 space-y-1">
                            {isDetailedList ? (getDetailedListData().map((item: any) => (<div key={item.id} className="grid grid-cols-12 gap-2 bg-white p-2 border-b border-gray-100 text-sm items-center hover:bg-blue-50"><div className="col-span-2 font-mono text-xs text-gray-500">{item.code}</div><div className="col-span-4 font-bold text-gray-800">{item.name}</div><div className="col-span-2 text-gray-600">{item.phone || '-'}</div><div className="col-span-3 text-gray-600 text-xs truncate">{item.address || '-'}</div><div className="col-span-1 flex justify-center"><button onClick={() => handleSystemListRemove(item)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={14}/></button></div></div>))) : (((settings[selectedSystemList] as string[]) || []).map((item, idx) => (<div key={idx} className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-100 shadow-sm"><span className="font-bold text-gray-700">{item}</span><button onClick={() => handleSystemListRemove(item)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={16}/></button></div>)))}
                        </div>
                    </div>
                )}
            </GlassCard>
        </div>
    );
};

export const SettingsPage: React.FC = () => {
    const { t } = useApp(); const navigate = useNavigate();
    const [currentView, setCurrentView] = useState<'menu' | 'interface' | 'system' | 'custom_fields' | 'users' | 'products_manager' | 'reports_manage' | 'backup'>('menu');
    const [selectedScreenId, setSelectedScreenId] = useState<keyof UiConfig>('main');

    const renderHeader = (title: string, subtitle: string) => (
        <div className="bg-gradient-to-l from-slate-50 via-slate-100 to-slate-50 border-y-4 border-slate-800 shadow-premium px-10 py-6 flex items-center justify-between relative overflow-hidden h-32 animate-fade-in mb-8 rounded-[2rem]">
            <div className="relative group shrink-0"><button onClick={() => currentView === 'menu' ? navigate('/') : setCurrentView('menu')} className="flex items-center gap-3 bg-[#1e293b] hover:bg-black text-white px-8 py-3.5 rounded-2xl font-black shadow-2xl transition-all active:scale-95 group relative z-10 border border-slate-700/50"><ChevronLeft size={22} className="group-hover:-translate-x-1 transition-transform" /><span>{currentView === 'menu' ? t('backToMain') : 'رجوع'}</span></button></div>
            <div className="flex-1 flex flex-col items-center justify-center relative"><div className="relative"><h1 className="text-5xl font-black text-slate-900 font-cairo leading-tight drop-shadow-sm tracking-tight">{title}</h1><div className="mt-2 h-2.5 w-[140%] -mx-[20%] bg-gradient-to-r from-transparent via-slate-600/60 via-slate-600 to-slate-600/60 to-transparent rounded-full opacity-90"></div></div><p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.3em] mt-3 opacity-80">{subtitle}</p></div>
            <div className="hidden md:flex p-4 bg-white border border-slate-200 text-slate-700 rounded-[1.5rem] shadow-xl shrink-0 group hover:rotate-6 transition-transform"><Settings size={38} strokeWidth={2.5}/></div>
        </div>
    );

    return (
        <div className="p-6 space-y-6" dir="rtl">
            {currentView === 'menu' && renderHeader(t('settings'), 'إعدادات النظام وإدارة البيانات')}
            {currentView === 'interface' && renderHeader('تخصيص الواجهة', 'تعديل الأزرار والقوائم')}
            {currentView === 'users' && renderHeader('إدارة المستخدمين', 'إضافة وتعديل صلاحيات المستخدمين')}
            {currentView === 'system' && renderHeader('إعدادات النظام', 'العملة، الضرائب، والنسخ الاحتياطي')}
            {currentView === 'reports_manage' && renderHeader('إدارة التقارير', 'التقارير المخصصة والنماذج')}
            {currentView === 'backup' && renderHeader('النسخ الاحتياطي', 'تصدير واستيراد قاعدة البيانات')}
            {currentView === 'products_manager' && renderHeader('إدارة الأصناف', 'قاعدة بيانات المنتجات والأسعار')}
            {currentView === 'custom_fields' && renderHeader('إدارة القوائم', 'System Lists & Custom Fields')}

            {currentView === 'menu' && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 animate-fade-in">
                    <button className="h-24 bg-indigo-600 text-white rounded-xl flex flex-col items-center justify-center gap-2 text-sm font-bold shadow-md hover:scale-105 transition-all" onClick={() => { setSelectedScreenId('main'); setCurrentView('interface'); }}><Layout size={28} /> تخصيص الواجهة</button>
                    <button className="h-24 bg-rose-600 text-white rounded-xl flex flex-col items-center justify-center gap-2 text-sm font-bold shadow-md hover:scale-105 transition-all" onClick={() => setCurrentView('custom_fields')}><ListPlus size={28} /> إدارة القوائم (Lists)</button>
                    <button className="h-24 bg-blue-600 text-white rounded-xl flex flex-col items-center justify-center gap-2 text-sm font-bold shadow-md hover:scale-105 transition-all" onClick={() => setCurrentView('users')}><Users size={28} /> المستخدمين</button>
                    <button className="h-24 bg-gray-700 text-white rounded-xl flex flex-col items-center justify-center gap-2 text-sm font-bold shadow-md hover:scale-105 transition-all" onClick={() => setCurrentView('backup')}><Database size={28} /> النسخ الاحتياطي</button>
                </div>
            )}

            {currentView === 'system' && <SystemSettingsView />}
            {currentView === 'users' && <UserManagement />}
            {currentView === 'reports_manage' && <ReportsManageView />}
            {currentView === 'backup' && <BackupView />}
            {currentView === 'custom_fields' && <CustomFieldsManager />}
            {currentView === 'interface' && <InterfaceCustomizerView selectedScreenId={selectedScreenId} setSelectedScreenId={setSelectedScreenId} />}
            {currentView === 'products_manager' && <GlassCard className="min-h-[500px] p-4"><ProductTable warehouse="all" /></GlassCard>}
        </div>
    );
};
