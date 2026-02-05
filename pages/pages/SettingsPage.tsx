import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { GlassCard, GlassInput, GlassButton, ConfirmModal } from '../components/NeumorphicUI';
import { dbService } from '../services/storage';
import { SystemUser as User, Role, UiConfig, ButtonConfig, AppSettings, UserPermissions, PermissionLevel, ScreenConfig, MainScreenSettings } from '../types';
import { 
    Layout, Settings, Users, Database, Save, Trash2, Plus, Edit2, Check, X, Shield, 
    Upload, Download, Monitor, Printer, Type, Clock, TrendingUp, ShoppingCart, 
    Factory, CheckCircle, Tag, Hash, Globe, Phone, MapPin, Mail, FileDown, 
    FileUp, Lock, ShieldCheck, ChevronLeft, UserCog, Settings2, Share2, 
    Zap, PackageCheck, BarChart3, Palette, Image as ImageIcon, RefreshCw, UserPlus,
    ClipboardCheck, MoveUp, MoveDown, Eye, EyeOff, Maximize, MousePointer2, Smartphone, AlignCenter, AlertTriangle, Bomb
} from 'lucide-react';
import { getIcon, getRoleLabel, iconNames } from '../utils/icons';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const forceEnNumsStyle = {
    fontFamily: 'Inter, sans-serif',
    fontVariantNumeric: 'lining-nums',
    direction: 'ltr' as const,
    fontWeight: '700'
};

const SYSTEM_ROLES = [
    { id: 'admin', label: 'مدير نظام' },
    { id: 'system_supervisor', label: 'مشرف نظام' },
    { id: 'planning_officer', label: 'مسؤول تخطيط' },
    { id: 'head_general', label: 'رئيس قسم المخازن العامه' },
    { id: 'head_raw', label: 'رئيس قسم الخامات' },
    { id: 'head_finished', label: 'رئيس قسم المنتج التام' },
    { id: 'supervisor_general', label: 'مشرف المخازن العامه' },
    { id: 'supervisor_raw', label: 'مشرف الخامات' },
    { id: 'supervisor_finished', label: 'مشرف المنتج التام' },
    { id: 'storekeeper_general', label: 'امين مخزن المخازن العامه' },
    { id: 'storekeeper_raw', label: 'امين مخزن الخامات' },
    { id: 'storekeeper_finished', label: 'امين مخزن المنتج التام' },
    { id: 'cashier', label: 'مسؤول مبيعات' }
];

const Label = ({ children }: any) => (
    <label className="text-[11px] font-black text-slate-400 mb-1.5 block pr-1 uppercase tracking-tight">{children}</label>
);

const Slider = ({ label, value, min, max, step = 1, unit = '', onChange }: any) => (
    <div className="space-y-2">
        <div className="flex justify-between items-center">
            <label className="text-[11px] font-black text-slate-500">{label}</label>
            <span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded-lg text-slate-600" style={forceEnNumsStyle}>{value}{unit}</span>
        </div>
        <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
    </div>
);

const InterfaceSettings: React.FC = () => {
    const { settings, updateSettings, addNotification } = useApp();
    const [config, setConfig] = useState<MainScreenSettings>(settings.mainScreenSettings);
    const [appTitle, setAppTitle] = useState(settings.globalAppTitle || '');
    const [footerText, setFooterText] = useState(settings.globalFooterText || '');
    const [footerVisible, setFooterVisible] = useState(!!settings.globalFooterVisible);
    const [loginTitle, setLoginTitle] = useState(settings.loginScreenTitle || '');
    const [loginLogo, setLoginLogo] = useState(settings.loginScreenLogo || '');

    const handleSave = () => {
        updateSettings({ 
            ...settings, 
            mainScreenSettings: config,
            globalAppTitle: appTitle,
            globalFooterText: footerText,
            globalFooterVisible: footerVisible,
            loginScreenTitle: loginTitle,
            loginScreenLogo: loginLogo
        });
        addNotification('تم تحديث تصميم الواجهة بنجاح', 'success');
    };

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'logoLeft' | 'logoRight' | 'loginLogo') => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (evt) => {
                const result = evt.target?.result as string;
                if (target === 'loginLogo') setLoginLogo(result);
                else setConfig({ ...config, [target]: result });
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in font-cairo pb-20">
            <GlassCard className="p-8 space-y-6 rounded-[2.5rem] border-none shadow-xl bg-white relative overflow-hidden">
                <div className="flex items-center gap-3 border-b pb-4 mb-2">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Monitor size={20}/></div>
                    <h3 className="text-xl font-black text-slate-800">الهوية البصرية واسم البرنامج</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <GlassInput label="اسم البرنامج الظاهري (App Name)" value={appTitle} onChange={e => setAppTitle(e.target.value)} />
                    <GlassInput label="نص تذييل الصفحة (Footer Text)" value={footerText} onChange={e => setFooterText(e.target.value)} />
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3">
                        <input type="checkbox" checked={footerVisible} onChange={e => setFooterVisible(e.target.checked)} className="w-5 h-5 accent-blue-600 rounded" id="foot-vis" />
                        <label htmlFor="foot-vis" className="font-black text-sm text-slate-600 cursor-pointer">إظهار تذييل الصفحة في كافة الواجهات</label>
                    </div>
                    <div className="bg-emerald-500 text-white px-4 py-1.5 rounded-xl text-[10px] font-black shadow-lg">سيستم متاح أونلاين</div>
                </div>
            </GlassCard>

            <GlassCard className="p-8 space-y-6 rounded-[2.5rem] border-none shadow-xl bg-white">
                <div className="flex items-center gap-3 border-b pb-4 mb-2">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Lock size={20}/></div>
                    <h3 className="text-xl font-black text-slate-800">هوية شاشة تسجيل الدخول (الواجهة الخارجية)</h3>
                </div>
                <GlassInput label="عنوان الترحيب في شاشة الدخول" value={loginTitle} onChange={e => setLoginTitle(e.target.value)} placeholder="مثال: مرحباً بك في نظام الدقهلية" />
                <div className="flex gap-6 items-center">
                    <div className="flex-1">
                        <label className="cursor-pointer bg-blue-600 text-white w-full py-5 rounded-2xl font-black text-lg shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-3 border-b-8 border-blue-900 active:scale-95">
                            <Upload size={24}/> رفع شعار شاشة الدخول
                            <input type="file" hidden accept="image/*" onChange={e => handleUpload(e, 'loginLogo')} />
                        </label>
                        <p className="text-[10px] text-slate-400 font-bold mt-2 text-center">* ينصح باستخدام صورة شفافة PNG، المقاس المثالي المفضل هو المربع 512x512 بكسل كحد أقصى.</p>
                    </div>
                    <div className="w-32 h-32 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex items-center justify-center overflow-hidden shrink-0">
                        {loginLogo ? <img src={loginLogo} className="w-full h-full object-contain" /> : <div className="flex flex-col items-center gap-2 text-slate-300"><ImageIcon size={32}/><span className="text-[9px] font-black">المعاينة هنا</span></div>}
                    </div>
                </div>
            </GlassCard>

            <GlassCard className="p-8 space-y-8 rounded-[2.5rem] border-none shadow-xl bg-white">
                <div className="flex items-center gap-3 border-b pb-4">
                    <div className="p-2 bg-violet-50 text-violet-600 rounded-xl"><Type size={20}/></div>
                    <h3 className="text-xl font-black text-slate-800">تنسيق العنوان الرئيسي</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Slider label="حجم الخط (بكسل)" value={config.titleFontSizePx || 48} min={20} max={100} unit="px" onChange={(v:any) => setConfig({...config, titleFontSizePx: v})} />
                    <Slider label="المسافة البادئة (Padding)" value={config.titlePadding || 0} min={0} max={50} unit="px" onChange={(v:any) => setConfig({...config, titlePadding: v})} />
                    <Slider label="استدارة الزوايا (Radius)" value={config.titleBorderRadius || 0} min={0} max={100} unit="px" onChange={(v:any) => setConfig({...config, titleBorderRadius: v})} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
                    <div className="space-y-4">
                        <Label>نمط الخط</Label>
                        <div className="flex bg-slate-100 p-1 rounded-2xl border">
                            {['normal', 'bold', 'black'].map(w => (
                                <button key={w} onClick={() => setConfig({...config, titleFontWeight: w as any})} className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${config.titleFontWeight === w ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>{w === 'normal' ? 'عادي' : w === 'bold' ? 'عريض' : 'ثقيل'}</button>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>خلفية العنوان</Label>
                            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border">
                                <input type="color" value={config.titleBackgroundColor || '#ffffff'} onChange={e => setConfig({...config, titleBackgroundColor: e.target.value})} className="w-8 h-8 rounded border-none cursor-pointer" />
                                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">{config.titleBackgroundColor || '#FFFFFF'}</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>لون نص العنوان</Label>
                            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border">
                                <input type="color" value={config.headerTextColor || '#ffffff'} onChange={e => setConfig({...config, headerTextColor: e.target.value})} className="w-8 h-8 rounded border-none cursor-pointer" />
                                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">{config.headerTextColor || '#FFFFFF'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </GlassCard>

            <GlassCard className="p-8 space-y-6 rounded-[2.5rem] border-none shadow-xl bg-white">
                <div className="flex items-center gap-3 border-b pb-4">
                    <div className="p-2 bg-amber-50 text-amber-600 rounded-xl"><Clock size={20}/></div>
                    <h3 className="text-xl font-black text-slate-800">إعدادات الساعة المتقدمة</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex flex-col gap-2 p-3 bg-slate-50 rounded-2xl border">
                        <Label>محتوى الساعة</Label>
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer"><input type="checkbox" checked={config.showTime} onChange={e => setConfig({...config, showTime: e.target.checked})} className="accent-blue-600" /> إظهار الوقت</label>
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer"><input type="checkbox" checked={config.showDate} onChange={e => setConfig({...config, showDate: e.target.checked})} className="accent-blue-600" /> إظهار التاريخ</label>
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer"><input type="checkbox" checked={config.showSeconds} onChange={e => setConfig({...config, showSeconds: e.target.checked})} className="accent-blue-600" /> إظهار الثواني</label>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 p-3 bg-slate-50 rounded-2xl border">
                        <Label>نظام عرض الوقت</Label>
                        <select className="w-full p-2 bg-white border rounded-xl text-xs font-black outline-none" value={config.clockFormat} onChange={e => setConfig({...config, clockFormat: e.target.value as any})}>
                            <option value="12h">نظام 12 ساعة (ص/م)</option>
                            <option value="24h">نظام 24 ساعة (عسكري)</option>
                            <option value="date-only">عرض التاريخ فقط</option>
                        </select>
                    </div>
                    <div className="col-span-2">
                        <Slider label="حجم الساعة (Scale)" value={config.clockScale || 1} min={0.5} max={1.5} step={0.1} unit="x" onChange={(v:any) => setConfig({...config, clockScale: v})} />
                    </div>
                </div>
            </GlassCard>

            <div className="lg:col-span-2 flex justify-center pt-8">
                <button onClick={handleSave} className="w-full max-w-2xl bg-blue-600 text-white py-6 rounded-3xl font-black text-2xl shadow-2xl hover:bg-blue-700 transition-all flex items-center justify-center gap-4 border-b-8 border-blue-900 active:scale-95">
                    <Save size={32}/> حفظ وتطبيق كافة إعدادات الهوية
                </button>
            </div>
        </div>
    );
};

const BackupSettings: React.FC = () => {
    const { syncAllData, addNotification, refreshProducts, user } = useApp();
    const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [resetWord, setResetWord] = useState('');

    const handleExport = () => {
        const data = dbService.exportSystemData();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        addNotification('تم تصدير نسخة احتياطية بنجاح', 'success');
    };

    const handleResetSystem = async () => {
        if (resetWord !== 'مسح') {
            alert('يرجى كتابة كلمة "مسح" للتأكيد');
            return;
        }
        setIsResetting(true);
        try {
            await dbService.resetInventoryData();
            addNotification('تمت إعادة تهيئة النظام بالكامل بنجاح. جاري إعادة تحميل الصفحة...', 'success');
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } catch (e) {
            addNotification('فشل إعادة التهيئة، يرجى المحاولة لاحقاً', 'error');
        } finally {
            setIsResetting(false);
        }
    };

    return (
        <div className="space-y-12 animate-fade-in font-cairo">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <GlassCard className="p-10 flex flex-col items-center gap-6 text-center bg-emerald-50 border-emerald-200">
                    <div className="p-6 bg-white rounded-full shadow-lg text-emerald-600"><Download size={48}/></div>
                    <h3 className="text-2xl font-black text-emerald-900">تصدير قاعدة البيانات</h3>
                    <p className="text-sm text-emerald-600 font-bold">قم بتحميل نسخة JSON كاملة من كافة البيانات (أرصدة، فواتير، مستخدمين) للآمان.</p>
                    <button onClick={handleExport} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black shadow-xl hover:bg-emerald-700 transition-all active:scale-95 border-b-4 border-emerald-900">تصدير الآن</button>
                </GlassCard>

                <GlassCard className="p-10 flex flex-col items-center gap-6 text-center bg-blue-50 border-blue-200">
                    <div className="p-6 bg-white rounded-full shadow-lg text-blue-600"><RefreshCw size={48}/></div>
                    <h3 className="text-2xl font-black text-blue-900">مزامنة السحابة</h3>
                    <p className="text-sm text-blue-600 font-bold">تحديث البيانات محلياً من السحابة لضمان التوافق بين كافة الأجهزة.</p>
                    <button onClick={() => syncAllData()} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-xl hover:bg-blue-700 transition-all active:scale-95 border-b-4 border-blue-900">مزامنة حية الآن</button>
                </GlassCard>
            </div>

            {user?.role === 'admin' && (
                <div className="pt-10 border-t-2 border-dashed border-rose-200">
                    <div className="flex items-center gap-3 mb-6 px-4">
                        <AlertTriangle className="text-rose-600" size={32} />
                        <div>
                            <h3 className="text-2xl font-black text-rose-900">منطقة الخطر (إجراءات إدارية)</h3>
                            <p className="text-sm text-rose-400 font-bold">تنبيه: العمليات في هذا القسم غير قابلة للتراجع وتؤدي لفقدان البيانات.</p>
                        </div>
                    </div>
                    
                    <GlassCard className="p-10 bg-rose-50 border-rose-200 flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="flex-1 text-right">
                            <h4 className="text-xl font-black text-rose-800 mb-2">إعادة تهيئة المخازن بالكامل (Reset)</h4>
                            <p className="text-sm text-rose-600 font-medium leading-relaxed">
                                سيقوم هذا الإجراء بمسح كافة الأصناف، الفواتير، حركات المخزن، وطلبات الشراء، وموازين الحسابات المخصصة. 
                                سيعود النظام لحالته الأولى (صفر بيانات) مع تصفير كافة مسلسلات الفواتير.
                            </p>
                        </div>
                        <button 
                            onClick={() => {
                                setResetWord('');
                                setIsResetConfirmOpen(true);
                            }}
                            className="bg-rose-600 text-white px-10 py-5 rounded-2xl font-black text-lg shadow-2xl hover:bg-rose-700 transition-all active:scale-95 border-b-8 border-rose-900 flex items-center gap-3"
                        >
                            <Bomb size={24}/> إعادة تهيئة النظام
                        </button>
                    </GlassCard>
                </div>
            )}

            <AnimatePresence>
                {isResetConfirmOpen && (
                    <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                        <motion.div initial={{scale: 0.9, opacity: 0}} animate={{scale: 1, opacity: 1}} exit={{scale: 0.9, opacity: 0}} className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 border-t-8 border-rose-600">
                            <div className="text-center space-y-4">
                                <div className="p-5 bg-rose-50 text-rose-600 rounded-full w-fit mx-auto shadow-inner"><AlertTriangle size={64}/></div>
                                <h2 className="text-2xl font-black text-slate-800">تأكيد المسح الشامل</h2>
                                <p className="text-sm text-slate-500 font-bold leading-relaxed">سيتم مسح كافة الأصناف والمعاملات والروابط الحسابية من هذا المتصفح ومن السحابة. لا يمكن التراجع عن هذا العمل.</p>
                                
                                <div className="mt-8 space-y-4">
                                    <label className="text-xs font-black text-rose-700 uppercase tracking-widest">اكتب كلمة "مسح" لتأكيد العملية:</label>
                                    <input 
                                        className="w-full p-4 rounded-xl bg-slate-50 border-2 border-rose-100 text-center font-black text-xl text-rose-900 outline-none focus:border-rose-500 transition-all"
                                        placeholder="..."
                                        value={resetWord}
                                        onChange={e => setResetWord(e.target.value)}
                                        autoFocus
                                    />
                                    <div className="flex gap-4 pt-4">
                                        <button onClick={() => setIsResetConfirmOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl hover:bg-slate-200">تراجع</button>
                                        <button 
                                            disabled={resetWord !== 'مسح' || isResetting}
                                            onClick={handleResetSystem}
                                            className={`flex-[2] py-4 rounded-2xl font-black text-white shadow-xl transition-all ${resetWord === 'مسح' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-slate-200 cursor-not-allowed text-slate-400'}`}
                                        >
                                            {isResetting ? "جاري المسح..." : "نعم، مسح شامل"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

const UiCustomizer: React.FC = () => {
    const { uiConfig, updateScreenButtons, saveUiConfig, addNotification, t } = useApp();
    const [selectedScreenId, setSelectedScreenId] = useState<keyof UiConfig>('main');
    const [editingButton, setEditingButton] = useState<ButtonConfig | null>(null);

    const screenOptions = (Object.entries(uiConfig) as [keyof UiConfig, ScreenConfig][]).filter(([k]) => k !== 'settings' && k !== 'sidebar');
    const currentButtons = uiConfig[selectedScreenId].buttons;

    const handleMove = (index: number, direction: 'up' | 'down') => {
        const newButtons = [...currentButtons];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newButtons.length) return;
        [newButtons[index], newButtons[targetIndex]] = [newButtons[targetIndex], newButtons[index]];
        updateScreenButtons(selectedScreenId, newButtons);
    };

    const toggleVisibility = (index: number) => {
        const newButtons = [...currentButtons];
        newButtons[index].isVisible = !newButtons[index].isVisible;
        updateScreenButtons(selectedScreenId, newButtons);
    };

    const handleSaveButtonUpdate = (updated: ButtonConfig) => {
        const newButtons = currentButtons.map(b => b.id === updated.id ? updated : b);
        updateScreenButtons(selectedScreenId, newButtons);
        setEditingButton(null);
    };

    const handleAddButton = () => {
        const newBtn: ButtonConfig = {
            id: `btn-${Date.now()}`,
            labelAr: 'زر جديد',
            labelEn: 'New Button',
            labelKey: 'new_button',
            icon: 'CirclePlus',
            color: 'bg-slate-700',
            action: 'navigate:/',
            isVisible: true,
            scale: 1
        };
        updateScreenButtons(selectedScreenId, [...currentButtons, newBtn]);
    };

    const handleDeleteButton = (id: string) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا الزر نهائياً؟')) return;
        updateScreenButtons(selectedScreenId, currentButtons.filter(b => b.id !== id));
    };

    return (
        <div className="flex flex-col lg:flex-row gap-8 animate-fade-in font-cairo h-[calc(100vh-180px)]">
            <div className="w-full lg:w-72 flex flex-col gap-3 shrink-0">
                <div className="p-4 bg-[#1e293b] text-white rounded-3xl font-black text-center shadow-lg border-b-4 border-black">خريطة واجهات النظام</div>
                <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {screenOptions.map(([id, conf]) => (
                        <button key={id} onClick={() => setSelectedScreenId(id as keyof UiConfig)} className={`w-full text-right p-4 rounded-2xl font-black text-sm transition-all border-2 ${selectedScreenId === id ? 'bg-blue-600 text-white border-blue-400 shadow-xl' : 'bg-white text-slate-500 border-slate-50 hover:bg-slate-50'}`}>{conf.name}</button>
                    ))}
                </div>
            </div>

            <div className="flex-1 flex flex-col gap-6 overflow-hidden">
                <div className="bg-white p-5 rounded-[2.5rem] border border-slate-100 shadow-xl flex items-center justify-between no-print shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Layout size={24}/></div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800">تخصيص الواجهة: {uiConfig[selectedScreenId].name}</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">تعديل الأزرار والمسميات والارتباطات لهذه الشاشة</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={handleAddButton} className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 shadow-lg active:scale-95 transition-all"><Plus size={18}/> إضافة زر</button>
                        <button onClick={saveUiConfig} className="bg-blue-600 text-white px-8 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 shadow-lg hover:bg-blue-700 active:scale-95 transition-all border-b-4 border-blue-900"><Save size={18}/> حفظ التعديلات</button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar pb-10">
                    {currentButtons.map((btn, idx) => {
                        const Icon = getIcon(btn.icon);
                        return (
                            <motion.div key={btn.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`bg-white p-4 rounded-[2rem] border-2 shadow-md flex items-center justify-between group transition-all ${btn.isVisible ? 'border-slate-50' : 'border-slate-100 opacity-60 bg-slate-50'}`}>
                                <div className="flex items-center gap-6">
                                    <div className={`p-4 rounded-2xl text-white shadow-xl group-hover:rotate-6 transition-transform ${btn.color}`} style={{ transform: `scale(${btn.scale || 1})` }}><Icon size={24}/></div>
                                    <div><h4 className="font-black text-slate-800 text-md">{btn.labelAr}</h4><p className="text-[10px] text-slate-400 font-mono">{btn.action}</p></div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex flex-col gap-1 ml-4 border-l pl-4">
                                        <button onClick={() => handleMove(idx, 'up')} className="p-1 hover:bg-blue-50 text-slate-300 hover:text-blue-600 disabled:opacity-20" disabled={idx === 0}><MoveUp size={20}/></button>
                                        <button onClick={() => handleMove(idx, 'down')} className="p-1 hover:bg-blue-50 text-slate-300 hover:text-blue-600 disabled:opacity-20" disabled={idx === currentButtons.length - 1}><MoveDown size={20}/></button>
                                    </div>
                                    <button onClick={() => setEditingButton(btn)} className="bg-blue-50 text-blue-600 p-3 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"><Edit2 size={20}/></button>
                                    <button onClick={() => toggleVisibility(idx)} className={`p-3 rounded-xl transition-all shadow-sm ${btn.isVisible ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white' : 'bg-slate-200 text-slate-500 hover:bg-emerald-500 hover:text-white'}`}>{btn.isVisible ? <Eye size={20}/> : <EyeOff size={20}/>}</button>
                                    <button onClick={() => handleDeleteButton(btn.id)} className="bg-rose-50 text-rose-600 p-3 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm"><Trash2 size={20}/></button>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {editingButton && (
                <EditButtonModal isOpen={!!editingButton} onClose={() => setEditingButton(null)} button={editingButton} onSave={handleSaveButtonUpdate} />
            )}
        </div>
    );
};

const EditButtonModal: React.FC<{ isOpen: boolean, onClose: () => void, button: ButtonConfig, onSave: (updated: ButtonConfig) => void }> = ({ isOpen, onClose, button, onSave }) => {
    const [localBtn, setLocalBtn] = useState<ButtonConfig>({ ...button, scale: button.scale || 1 });
    const [iconSearch, setIconSearch] = useState('');
    useEffect(() => { setLocalBtn({ ...button, scale: button.scale || 1 }); }, [button, isOpen]);
    if (!isOpen) return null;
    const filteredIcons = iconNames.filter(name => name.toLowerCase().includes(iconSearch.toLowerCase())).slice(0, 50);
    return (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 font-cairo" dir="rtl">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-8 border-b bg-slate-50 flex justify-between items-center">
                    <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3"><Edit2 className="text-blue-600"/> تعديل خصائص الزر</h3>
                    <button onClick={onClose} className="p-2 hover:bg-red-50 text-slate-400 rounded-full"><X/></button>
                </div>
                <div className="p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <GlassInput label="المسمى بالعربية" value={localBtn.labelAr} onChange={e => setLocalBtn({...localBtn, labelAr: e.target.value})} />
                        <GlassInput label="المسمى بالإنجليزية" value={localBtn.labelEn} onChange={e => setLocalBtn({...localBtn, labelEn: e.target.value})} />
                        <div className="flex flex-col gap-1.5"><label className="text-[11px] font-black text-slate-500 mr-1 uppercase">لون الزر</label><select className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold" value={localBtn.color} onChange={e => setLocalBtn({...localBtn, color: e.target.value})}><option value="bg-blue-600">أزرق</option><option value="bg-indigo-600">كحلي</option><option value="bg-emerald-600">أخضر</option><option value="bg-rose-600">أحمر</option><option value="bg-amber-600">برتقالي</option><option value="bg-violet-600">بنفسجي</option><option value="bg-cyan-600">سماوي</option><option value="bg-slate-800">أسود</option></select></div>
                        <div className="flex flex-col gap-1.5"><label className="text-[11px] font-black text-slate-500 mr-1 uppercase">الحالة</label><div className="flex gap-2"><button onClick={() => setLocalBtn({...localBtn, isVisible: true})} className={`flex-1 py-2 rounded-xl font-bold border-2 transition-all ${localBtn.isVisible ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white text-slate-400'}`}>ظاهر</button><button onClick={() => setLocalBtn({...localBtn, isVisible: false})} className={`flex-1 py-2 rounded-xl font-bold border-2 transition-all ${!localBtn.isVisible ? 'bg-rose-50 border-rose-500 text-rose-700' : 'bg-white text-slate-400'}`}>مخفي</button></div></div>
                    </div>
                </div>
                <div className="p-8 bg-slate-50 border-t flex gap-4"><button onClick={onClose} className="flex-1 py-4 bg-white text-slate-400 font-black rounded-2xl border">إلغاء</button><button onClick={() => onSave(localBtn)} className="flex-[2] py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2 border-b-8 border-blue-900"><Save size={24}/> حفظ</button></div>
            </motion.div>
        </div>
    );
};

const SystemSettings: React.FC = () => {
    const { settings, updateSettings, addNotification } = useApp();
    const [local, setLocal] = useState(settings);
    const handleSave = () => { updateSettings(local); addNotification('تم حفظ إعدادات النظام', 'success'); };
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in font-cairo">
            <GlassCard className="p-8 space-y-6"><h3 className="text-xl font-black text-slate-800 flex items-center gap-2 border-b pb-4"><Settings2 className="text-amber-600"/> الثوابت والضرايب</h3><div className="grid grid-cols-2 gap-4"><GlassInput label="العملة الرسمية" value={local.currency} onChange={e => setLocal({...local, currency: e.target.value})} /><GlassInput label="نسبة الضريبة (%)" type="number" value={local.taxRate.toString()} onChange={e => setLocal({...local, taxRate: Number(e.target.value)})} /></div></GlassCard>
            <GlassCard className="p-8 space-y-6"><h3 className="text-xl font-black text-slate-800 flex items-center gap-2 border-b pb-4"><Hash className="text-indigo-600"/> أرقام المسلسلات</h3><div className="grid grid-cols-2 gap-4"><GlassInput label="مسلسل المبيعات" type="number" value={local.sequences.invoice.toString()} onChange={e => setLocal({...local, sequences: {...local.sequences, invoice: Number(e.target.value)}})} /><GlassInput label="مسلسل المشتريات" type="number" value={local.sequences.purchaseOrder.toString()} onChange={e => setLocal({...local, sequences: {...local.sequences, purchaseOrder: Number(e.target.value)}})} /></div></GlassCard>
            <button onClick={handleSave} className="md:col-span-2 bg-slate-800 text-white py-5 rounded-3xl font-black text-xl shadow-2xl flex items-center justify-center gap-3 border-b-8 border-black active:scale-95 transition-all"><Save/> حفظ إعدادات النظام</button>
        </div>
    );
};

const TabBtn: React.FC<{ active: boolean, onClick: () => void, icon: React.ReactNode, label: string }> = ({ active, onClick, icon, label }) => (
    <button onClick={onClick} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm transition-all whitespace-nowrap ${active ? 'bg-indigo-600 text-white shadow-lg scale-105' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>
        {icon} <span>{label}</span>
    </button>
);

const UserPermissionsModal: React.FC<{ isOpen: boolean, onClose: () => void, user: User, onSave: (updatedUser: User) => void }> = ({ isOpen, onClose, user, onSave }) => {
    const { uiConfig } = useApp();
    const [activeTab, setActiveTab] = useState<string>('screens');
    const [formData, setFormData] = useState<User>({ ...user });
    useEffect(() => { setFormData({ ...user, permissions: user.permissions || { screens: {}, features: {}, actions: { canImport: false, canExport: false, canDelete: false, canEditSettings: false, canManageCloudLists: false } } }); }, [user, isOpen]);
    if (!isOpen) return null;
    const updatePerm = (cat: 'screens' | 'features', key: string, level: PermissionLevel) => { setFormData(prev => ({ ...prev, permissions: { ...prev.permissions!, [cat]: { ...prev.permissions?.[cat], [key]: level } } })); };
    const toggleAction = (key: keyof UserPermissions['actions']) => { setFormData(prev => ({ ...prev, permissions: { ...prev.permissions!, actions: { ...prev.permissions?.actions, [key]: !prev.permissions?.actions[key] } } })); };
    const sections = (Object.entries(uiConfig) as [keyof UiConfig, ScreenConfig][]).filter(([k]) => k !== 'settings');
    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 font-cairo" dir="rtl">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-6xl rounded-[3rem] shadow-2xl flex flex-col h-[90vh] overflow-hidden">
                <div className="p-6 border-b bg-white flex justify-between items-center shrink-0"><div className="flex items-center gap-4"><div className="p-4 bg-blue-600 text-white rounded-3xl shadow-xl shadow-blue-100"><ShieldCheck size={32}/></div><div><h2 className="text-2xl font-black text-slate-800">إدارة صلاحيات: {formData.name}</h2></div></div><button onClick={onClose} className="p-2 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-xl transition-all"><X size={32}/></button></div>
                <div className="flex border-b bg-slate-50 shrink-0 overflow-x-auto custom-scrollbar"><TabBtn active={activeTab === 'screens'} onClick={() => setActiveTab('screens')} icon={<Monitor size={18}/>} label="الأقسام الرئيسية" />{sections.map(([id, conf]) => (<TabBtn key={id} active={activeTab === id} onClick={() => setActiveTab(id)} icon={<Zap size={18}/>} label={`أزرار ${conf.name}`} />))}<TabBtn active={activeTab === 'actions'} onClick={() => setActiveTab('actions')} icon={<Shield size={18}/>} label="إجراءات النظام" /></div>
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {activeTab === 'screens' && (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{uiConfig.sidebar.buttons.map(btn => (<PermissionItem key={btn.id} btn={btn} level={formData.permissions?.screens?.[btn.id] || 'hidden'} onChange={l => updatePerm('screens', btn.id, l)} />))}</div>)}
                    {sections.map(([id, conf]) => activeTab === id && (<div key={id} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{conf.buttons.map(btn => (<PermissionItem key={btn.id} btn={btn} level={formData.permissions?.features?.[btn.id] || 'hidden'} onChange={l => updatePerm('features', btn.id, l)} />))}</div>))}
                    {activeTab === 'actions' && (<div className="grid grid-cols-1 md:grid-cols-2 gap-4"><ActionToggle label="تصدير التقارير" checked={!!formData.permissions?.actions?.canExport} onChange={() => toggleAction('canExport')} icon={FileUp} /><ActionToggle label="استيراد البيانات" checked={!!formData.permissions?.actions?.canImport} onChange={() => toggleAction('canImport')} icon={FileDown} /><ActionToggle label="حذف السجلات" checked={!!formData.permissions?.actions?.canDelete} onChange={() => toggleAction('canDelete')} icon={Trash2} /></div>)}
                </div>
                <div className="p-6 border-t bg-slate-50 flex justify-between items-center shrink-0"><button onClick={onClose} className="px-10 py-3 bg-white text-slate-500 rounded-xl font-black border">إلغاء</button><button onClick={() => onSave(formData)} className="px-16 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-2xl hover:bg-blue-700 flex items-center gap-3 active:scale-95 transition-all"><Save size={24}/> حفظ الصلاحيات</button></div>
            </motion.div>
        </div>
    );
};

const PermissionItem = ({ btn, level, onChange }: any) => {
    const Icon = getIcon(btn.icon);
    return (
        <div className={`p-4 rounded-2xl border-2 transition-all flex flex-col gap-3 ${level === 'hidden' ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-blue-50 shadow-md'}`}>
            <div className="flex items-center gap-3"><div className={`p-2 rounded-xl ${level === 'hidden' ? 'bg-slate-200 text-slate-400' : 'bg-blue-600 text-white shadow-lg shadow-blue-100'}`}><Icon size={18}/></div><span className="font-black text-xs text-slate-800 truncate block">{btn.labelAr}</span></div>
            <select className="w-full p-2 bg-slate-50 rounded-lg text-[10px] font-black outline-none border border-slate-200 focus:border-blue-400" value={level} onChange={(e) => onChange(e.target.value as PermissionLevel)}><option value="edit">تحكم كامل</option><option value="available">عرض فقط</option><option value="hidden">مخفي تماماً</option></select>
        </div>
    );
};

const ActionToggle = ({ label, checked, onChange, icon: Icon }: any) => (
    <label className={`flex items-center justify-between p-6 rounded-2xl border-2 cursor-pointer transition-all ${checked ? 'bg-indigo-50 border-indigo-200 shadow-md' : 'bg-white border-slate-100 hover:bg-slate-50'}`}>
        <div className="flex items-center gap-5"><div className={`p-3 rounded-2xl shadow-lg transition-colors ${checked ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}><Icon size={24}/></div><span className={`font-black text-sm ${checked ? 'text-indigo-900' : 'text-slate-400'}`}>{label}</span></div>
        <div className={`w-14 h-7 rounded-full relative transition-all ${checked ? 'bg-indigo-600' : 'bg-slate-200'}`}><div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-lg transition-all duration-300 ${checked ? 'left-1' : 'left-8'}`} /><input type="checkbox" className="hidden" checked={checked} onChange={onChange} /></div>
    </label>
);

const AddUserModal: React.FC<{ isOpen: boolean, onClose: () => void, onSave: (newUser: User) => void }> = ({ isOpen, onClose, onSave }) => {
    const [formData, setFormData] = useState<Partial<User>>({ username: '', password: '', name: '', role: 'cashier', permissions: { screens: {}, features: {}, actions: { canImport: false, canExport: false, canDelete: false, canEditSettings: false, canManageCloudLists: false } } });
    if (!isOpen) return null;
    const handleSave = (e: React.FormEvent) => { e.preventDefault(); if (!formData.username || !formData.password || !formData.name) return alert('يرجى إكمال البيانات'); onSave({ ...formData, id: `U-${Date.now()}`, lastActive: null } as User); };
    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 font-cairo" dir="rtl">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden">
                <div className="p-8 border-b bg-slate-50 flex justify-between items-center"><h3>إضافة مستخدم جديد</h3><button onClick={onClose}><X/></button></div>
                <form onSubmit={handleSave} className="p-8 space-y-4"><GlassInput label="الاسم الكامل" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /><GlassInput label="اسم المستخدم" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value.trim().toLowerCase()})} /><GlassInput label="كلمة المرور" type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} /><select className="w-full p-3 bg-slate-50 border-2 rounded-xl" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>{SYSTEM_ROLES.map(role => (<option key={role.id} value={role.id}>{role.label}</option>))}</select><button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black">حفظ المستخدم</button></form>
            </motion.div>
        </div>
    );
};

const EditUserModal: React.FC<{ isOpen: boolean, onClose: () => void, user: User, onSave: (updated: User) => void }> = ({ isOpen, onClose, user, onSave }) => {
    const [formData, setFormData] = useState<User>({ ...user });
    useEffect(() => { setFormData({ ...user }); }, [user, isOpen]);
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 font-cairo" dir="rtl">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden">
                <div className="p-8 border-b bg-slate-50 flex justify-between items-center"><h3>تعديل بيانات المستخدم</h3><button onClick={onClose}><X/></button></div>
                <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="p-8 space-y-4"><GlassInput label="الاسم الكامل" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /><GlassInput label="اسم المستخدم" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value.trim().toLowerCase()})} /><select className="w-full p-3 bg-slate-50 border-2 rounded-xl" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>{SYSTEM_ROLES.map(role => (<option key={role.id} value={role.id}>{role.label}</option>))}</select><button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black">حفظ التعديلات</button></form>
            </motion.div>
        </div>
    );
};

export const SettingsPage: React.FC = () => {
    const { t, user: currentUser, addNotification, deleteUser, syncAllData } = useApp(); 
    const navigate = useNavigate();
    const [currentView, setCurrentView] = useState<'menu' | 'interface' | 'buttons' | 'system' | 'users' | 'backup'>('menu');
    const [users, setUsers] = useState<User[]>(dbService.getUsers());
    const [isPermModalOpen, setIsPermModalOpen] = useState(false);
    const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
    const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [userToDeleteId, setUserToDeleteId] = useState<string | null>(null);

    const refreshUsers = () => setUsers(dbService.getUsers());

    const handleUpdateUserPermissions = (updated: User) => {
        dbService.saveUser(updated);
        refreshUsers();
        setIsPermModalOpen(false);
        addNotification(`تم تحديث صلاحيات ${updated.name} بنجاح`, 'success');
        if (updated.id === currentUser?.id) syncAllData();
    };

    const handleUpdateUserInfo = (updated: User) => {
        dbService.saveUser(updated);
        refreshUsers();
        setIsEditUserModalOpen(false);
        addNotification(`تم تحديث بيانات ${updated.name} بنجاح`, 'success');
        if (updated.id === currentUser?.id) syncAllData();
    };

    const handleCreateUser = (newUser: User) => {
        dbService.saveUser(newUser);
        refreshUsers();
        setIsAddUserModalOpen(false);
        addNotification(`تم إنشاء حساب الموظف ${newUser.name} بنجاح`, 'success');
    };

    const renderHeader = (title: string, subtitle: string) => (
        <div className="bg-gradient-to-l from-slate-50 via-slate-100 to-slate-50 border-y-4 border-slate-800 shadow-premium px-10 py-6 flex items-center justify-between relative overflow-hidden h-32 animate-fade-in mb-8 rounded-[2rem]">
            <button onClick={() => currentView === 'menu' ? navigate('/') : setCurrentView('menu')} className="flex items-center gap-3 bg-[#1e293b] hover:bg-black text-white px-8 py-3.5 rounded-2xl font-black shadow-2xl transition-all active:scale-95 group border border-slate-700/50 relative z-10">
                <ChevronLeft size={22} className="group-hover:-translate-x-1 transition-transform" />
                <span>{currentView === 'menu' ? t('backToMain') : 'رجوع للقائمة'}</span>
            </button>
            <div className="flex-1 flex flex-col items-center justify-center relative">
                <h1 className="text-4xl font-black text-slate-900 font-cairo leading-tight drop-shadow-sm">{title}</h1>
                <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.3em] mt-2">{subtitle}</p>
            </div>
            <div className="hidden md:flex p-4 bg-white border border-slate-200 text-slate-700 rounded-[1.5rem] shadow-xl shrink-0"><Settings size={38}/></div>
        </div>
    );

    return (
        <div className="p-6 space-y-6" dir="rtl">
            {currentView === 'menu' && renderHeader(t('settings'), 'إعدادات النظام وإدارة البيانات والسحابة')}
            {currentView === 'users' && renderHeader('إدارة المستخدمين والصلاحيات', 'التحكم في وصول الموظفين لكافة أزرار البرنامج')}
            {currentView === 'interface' && renderHeader('تخصيص الواجهة والهوية', 'التحكم في العناوين، الشعارات، والألوان')}
            {currentView === 'buttons' && renderHeader('تخصيص الأزرار', 'إعادة ترتيب وتعديل أزرار الوصول السريع')}
            {currentView === 'system' && renderHeader('إعدادات النظام الأساسية', 'التحكم في الضريبة، العملة، والمسلسلات')}
            {currentView === 'backup' && renderHeader('النسخ الاحتياطي والمزامنة', 'حماية بياناتك ومزامنتها مع السحابة')}

            {currentView === 'menu' && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 animate-fade-in pt-8">
                    <SettingsMenuButton color="bg-blue-600" icon={Users} label="إدارة المستخدمين" onClick={() => setCurrentView('users')} />
                    <SettingsMenuButton color="bg-indigo-600" icon={Palette} label="تخصيص الهوية" onClick={() => setCurrentView('interface')} />
                    <SettingsMenuButton color="bg-violet-600" icon={Layout} label="تخصيص الأزرار" onClick={() => setCurrentView('buttons')} />
                    <SettingsMenuButton color="bg-amber-600" icon={Settings2} label="إدارة القوائم" onClick={() => navigate('/settings/lists')} />
                    <SettingsMenuButton color="bg-emerald-600" icon={Database} label="النسخ الاحتياطي" onClick={() => setCurrentView('backup')} />
                </div>
            )}

            {currentView === 'users' && (
                <GlassCard className="rounded-[3rem] p-10 shadow-2xl bg-white border-none">
                    <div className="flex justify-between items-center mb-8 pb-6 border-b border-slate-100">
                        <h3 className="text-2xl font-black text-slate-800">قائمة مستخدمي البرنامج</h3>
                        <button onClick={() => setIsAddUserModalOpen(true)} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2 active:scale-95"><UserPlus size={20}/> مستخدم جديد</button>
                    </div>
                    <div className="overflow-x-auto rounded-3xl border border-slate-100">
                        <table className="w-full text-center border-collapse">
                            <thead className="bg-[#1e293b] text-white h-14 text-xs font-black uppercase"><tr><th>الموظف</th><th>اسم المستخدم</th><th>الصلاحية</th><th>آخر نشاط</th><th>التحكم</th></tr></thead>
                            <tbody className="font-bold text-slate-700">{users.map(u => (
                                <tr key={u.id} className="border-b h-16 hover:bg-slate-50 transition-colors"><td className="p-4 font-black text-slate-900">{u.name}</td><td className="p-4 font-mono text-slate-400">{u.username}</td><td className="p-4"><span className="bg-blue-50 text-blue-600 px-4 py-1 rounded-full text-[10px] font-black">{getRoleLabel(u.role)}</span></td><td className="p-4 text-[11px] text-slate-300 font-mono" style={forceEnNumsStyle}>{u.lastActive || '-'}</td><td className="p-4"><div className="flex items-center justify-center gap-2"><button onClick={() => { setSelectedUser(u); setIsEditUserModalOpen(true); }} className="bg-slate-50 text-slate-500 p-2 rounded-xl hover:bg-blue-600 hover:text-white shadow-sm border border-slate-100" title="تعديل"><Edit2 size={16}/></button><button onClick={() => { setSelectedUser(u); setIsPermModalOpen(true); }} className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl hover:bg-indigo-600 hover:text-white font-black text-xs flex items-center gap-2"><ShieldCheck size={14}/> الصلاحيات</button>{u.username !== 'admin' && u.id !== currentUser?.id && (<button onClick={() => setUserToDeleteId(u.id)} className="bg-rose-50 text-rose-600 p-2 rounded-xl hover:bg-rose-600 hover:text-white shadow-sm"><Trash2 size={16}/></button>)}</div></td></tr>
                            ))}</tbody>
                        </table>
                    </div>
                </GlassCard>
            )}

            {currentView === 'interface' && <InterfaceSettings />}
            {currentView === 'buttons' && <UiCustomizer />}
            {currentView === 'system' && <SystemSettings />}
            {currentView === 'backup' && <BackupSettings />}

            {isPermModalOpen && selectedUser && <UserPermissionsModal isOpen={isPermModalOpen} onClose={() => setIsPermModalOpen(false)} user={selectedUser} onSave={handleUpdateUserPermissions} />}
            {isEditUserModalOpen && selectedUser && <EditUserModal isOpen={isEditUserModalOpen} onClose={() => setIsEditUserModalOpen(false)} user={selectedUser} onSave={handleUpdateUserInfo} />}
            <AddUserModal isOpen={isAddUserModalOpen} onClose={() => setIsAddUserModalOpen(false)} onSave={handleCreateUser} />
            <ConfirmModal isOpen={!!userToDeleteId} onClose={() => setUserToDeleteId(null)} onConfirm={() => { if(userToDeleteId) { deleteUser(userToDeleteId); refreshUsers(); setUserToDeleteId(null); }}} title="حذف حساب موظف" message="هل أنت متأكد من حذف هذا الحساب نهائياً؟" confirmText="نعم، حذف" cancelText="إلغاء" />
        </div>
    );
};

const SettingsMenuButton = ({ color, icon: Icon, label, onClick }: any) => (
    <button onClick={onClick} className={`${color} text-white p-8 rounded-[2.5rem] shadow-xl hover:scale-105 active:scale-95 transition-all flex flex-col items-center justify-center gap-4 min-h-[200px] group border-4 border-white/20`}>
        <div className="p-5 bg-white/20 rounded-3xl group-hover:rotate-12 transition-transform shadow-inner border border-white/10"><Icon size={48}/></div>
        <span className="font-black text-xl leading-tight text-center">{label}</span>
    </button>
);