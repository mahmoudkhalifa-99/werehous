
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { GlassCard, GlassButton, GlassInput, InputModal } from '../components/NeumorphicUI';
import { dbService } from '../services/storage';
import { Sale, ButtonConfig, CartItem, Product, AppSettings, WarehouseType, Client } from '../types';
import { Printer, ArrowRightLeft, ArrowRight, X, Plus, Save, Trash2, Search, MapPin, Settings, Undo2, FileBarChart, CalendarCheck, Table, Users, Package, Truck, Trophy, UserCheck, FileText, ClipboardList, Activity, Timer, ShoppingBag, Clock, Calendar, CheckCircle2, SearchCode, UserCog, HardHat, ChevronLeft, User as UserIcon, LayoutGrid, Factory, Settings as SettingsIcon, Utensils, PackageCheck, Hash, Lock, Unlock, Edit3, Loader2, Check, ShieldAlert, AlertTriangle, Scale, ShoppingCart, Cylinder, History, Zap, BarChart4, TrendingUp as TrendUpIcon } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getIcon } from '../utils/icons';
import { printService } from '../services/printing';
import { DailySalesTable } from '../components/DailySalesTable';
import { PrintSettingsModal } from './PrintSettingsModal';
import { ClientWithdrawalsReport } from '../components/ClientWithdrawalsReport';
import { ItemWithdrawalsReport } from '../components/ItemWithdrawalsReport';
import { SalesByItemReport } from '../components/SalesByItemReport';
import { SalesCustomerSplitReport } from '../components/SalesCustomerSplitReport';
import { SalesTransportReport } from '../components/SalesTransportReport';
import { BestCustomersReport } from '../components/BestCustomersReport';
import { SalesByNameReport } from '../components/SalesByNameReport';
import { SalesDetailedReport } from '../components/SalesDetailedReport';
import { DailyStockMovementReport } from '../components/DailyStockMovementReport';
import { LoadingEfficiencyReport } from '../components/LoadingEfficiencyReport';
import { TableToolbar } from '../components/TableToolbar';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    PieChart, Pie, Cell, AreaChart, Area, Legend, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';

type SalesViewMode = 'menu' | 'list' | 'reports' | 'add' | 'invoice_search' | 'return' | 'client_withdrawals' | 'item_withdrawals' | 'daily_sales' | 'sales_by_item' | 'sales_customer_split' | 'transport_report' | 'best_customers' | 'sales_by_name' | 'sales_detailed' | 'stock_movement_report' | 'petrology_report' | 'loading_efficiency' | 'petrology_sales' | 'petrology_detailed' | 'petrology_daily_sales' | 'logistics_pulse';

const forceEnNumsStyle = {
    fontFamily: 'Inter, sans-serif',
    fontVariantNumeric: 'lining-nums',
    direction: 'ltr' as const,
    fontSize: '12px'
};

const DEFAULT_TABLE_STYLES = {
    fontFamily: 'Calibri, sans-serif',
    fontSize: 13,
    isBold: true,
    isItalic: false,
    isUnderline: false,
    textAlign: 'center' as 'right' | 'center' | 'left',
    verticalAlign: 'middle' as 'top' | 'middle' | 'bottom',
    decimals: 3
};

const REPORT_LABELS: Record<string, string> = {
    'reports': 'لوحة التقارير اليومية',
    'sales_by_item': 'إجمالي المبيعات بالأصناف',
    'sales_customer_split': 'مبيعات العملاء',
    'transport_report': 'طريقة نقل المبيعات',
    'loading_efficiency': 'كفاءة التحميل',
    'best_customers': 'العملاء الأفضل',
    'sales_by_name': 'مبيعات المنتج التام',
    'sales_detailed': 'بيان مبيعات المنتج التام',
    'daily_sales': 'المبيعات اليومية (تام)',
    'stock_movement_report': 'التقرير اليومي للمنتج التام',
    'petrology_sales': 'مبيعات بيوتولوجى',
    'petrology_detailed': 'بيان مبيعات بيوتولوجى',
    'petrology_daily_sales': 'المبيعات اليومية (بيوتولوجى)',
    'petrology_report': 'التقرير اليومي بيوتولوجى',
    'client_withdrawals': 'مسحوبات العملاء',
    'item_withdrawals': 'مسحوبات الأصناف',
    'logistics_pulse': 'نبض اللوجستيات الذكي'
};

/**
 * Logistics Full Fantasy Dashboard
 * لوحة فنية خيالية كاملة لإدارة النبض اللوجستي - نسخة مطورة ببيانات أكثر
 */
const LogisticsPulseDashboard: React.FC = () => {
    const { settings } = useApp();
    const sales = dbService.getSales();
    const today = new Date().toISOString().split('T')[0];
    
    const todaySales = useMemo(() => sales.filter(s => s.date.startsWith(today)), [sales, today]);
    
    // إحصائيات عامة
    const stats = useMemo(() => {
        const totalLoaded = todaySales.reduce((sum, s) => sum + s.total, 0);
        const totalCars = todaySales.length;
        const totalInvoices = todaySales.length;
        const totalVariance = todaySales.reduce((sum, s) => sum + (s.variance || 0), 0);
        return { totalLoaded, totalCars, totalInvoices, totalVariance };
    }, [todaySales]);

    // بيانات الرادار (توزيع الشاحنات)
    const fleetRadarData = useMemo(() => {
        const types: Record<string, number> = {};
        todaySales.forEach(s => {
            const t = s.carType || 'أخرى';
            types[t] = (types[t] || 0) + 1;
        });
        return Object.entries(types).map(([name, value]) => ({ name, value }));
    }, [todaySales]);

    // بيانات كبار العملاء اليوم
    const topClientsToday = useMemo(() => {
        const clients: Record<string, number> = {};
        todaySales.forEach(s => {
            const name = s.customer || 'نقدي';
            clients[name] = (clients[name] || 0) + s.total;
        });
        return Object.entries(clients)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, value]) => ({ name, value }));
    }, [todaySales]);

    // بيانات النبض الساعي
    const hourlyPulseData = useMemo(() => {
        const hours: Record<string, number> = {};
        for(let i=7; i<23; i++) hours[`${i}:00`] = 0; // ساعات العمل من 7 صباحاً لـ 11 مساءً
        
        todaySales.forEach(s => {
            const h = new Date(s.date).getHours();
            if (hours[`${h}:00`] !== undefined) {
                hours[`${h}:00`] += s.total;
            }
        });
        return Object.entries(hours).map(([hour, value]) => ({ hour, value }));
    }, [todaySales]);

    // بيانات الورديات
    const shiftData = useMemo(() => {
        const shifts: Record<string, number> = { 'الأولى': 0, 'الثانية': 0, 'الثالثة': 0 };
        todaySales.forEach(s => {
            const shift = s.shift || 'الأولى';
            shifts[shift] = (shifts[shift] || 0) + s.total;
        });
        return Object.entries(shifts).map(([name, value]) => ({ name, value }));
    }, [todaySales]);

    const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];

    return (
        <div className="space-y-6 animate-fade-in font-cairo overflow-hidden pb-10" dir="rtl">
            {/* KPI Live Ribbon */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 no-print">
                <StatCardFantasy label="إجمالي المحمل اليوم" value={stats.totalLoaded.toFixed(1)} unit="طن" icon={<Cylinder size={24}/>} color="indigo" />
                <StatCardFantasy label="أسطول الشاحنات" value={stats.totalCars} unit="سيارة" icon={<Truck size={24}/>} color="emerald" />
                <StatCardFantasy label="فواتير مسجلة" value={stats.totalInvoices} unit="فاتورة" icon={<FileText size={24}/>} color="cyan" />
                <StatCardFantasy label="إجمالي الفروقات" value={stats.totalVariance.toFixed(2)} unit="طن" icon={<Scale size={24}/>} color="rose" />
            </div>

            {/* Middle Section: Main Analytics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* 1. النبض الساعي (High Detail Area Chart) */}
                <GlassCard className="lg:col-span-8 h-[450px] flex flex-col p-6 bg-slate-900 border-white/5 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50"></div>
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className="text-white font-black text-xl flex items-center gap-2">
                                <Activity size={24} className="text-indigo-400 animate-pulse"/> نبض التحميل الساعي (طن/ساعة)
                            </h3>
                            <p className="text-[10px] text-slate-500 font-bold">مراقبة كثافة التحميل خلال ساعات العمل</p>
                        </div>
                        <div className="bg-indigo-500/10 text-indigo-400 px-4 py-1 rounded-full text-xs font-black border border-indigo-500/20">LIVE PULSE</div>
                    </div>
                    <div className="flex-1 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={hourlyPulseData}>
                                <defs>
                                    <linearGradient id="colorPulseDetail" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11, fontWeight: 'bold'}} />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} />
                                <Tooltip 
                                    contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '15px', color: '#fff' }}
                                    cursor={{ stroke: '#6366f1', strokeWidth: 2, strokeDasharray: '5 5' }}
                                />
                                <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={5} fillOpacity={1} fill="url(#colorPulseDetail)" name="الحمولة المنفذة" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </GlassCard>

                {/* 2. توزيع الأسطول (Radar Chart) */}
                <GlassCard className="lg:col-span-4 h-[450px] flex flex-col p-6 bg-slate-900 border-white/5 group">
                    <h3 className="text-white font-black text-lg flex items-center gap-2 mb-6">
                        <LayoutGrid size={22} className="text-emerald-400"/> رادار توزيع الأسطول
                    </h3>
                    <div className="flex-1 w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={fleetRadarData}>
                                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                                <PolarAngleAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 'bold' }} />
                                <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                                <Radar name="عدد السيارات" dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.5} />
                                <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '10px' }} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </GlassCard>

                {/* 3. كبار العملاء اليوم (Bar Chart) */}
                <GlassCard className="lg:col-span-6 h-[400px] flex flex-col p-6 bg-slate-900 border-white/5">
                    <h3 className="text-white font-black text-lg flex items-center gap-2 mb-8">
                        <Zap size={22} className="text-yellow-400"/> أكثر العملاء سحباً اليوم (بالطن)
                    </h3>
                    <div className="flex-1 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topClientsToday} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.1}/>
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} />
                                <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '10px' }} />
                                <Bar dataKey="value" fill="#f59e0b" radius={[0, 10, 10, 0]} barSize={25} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </GlassCard>

                {/* 4. تحليل الورديات (Donut Chart) */}
                <GlassCard className="lg:col-span-6 h-[400px] flex flex-col p-6 bg-slate-900 border-white/5">
                    <h3 className="text-white font-black text-lg flex items-center gap-2 mb-8">
                        <BarChart4 size={22} className="text-cyan-400"/> توزيع الحمولة حسب الوردية
                    </h3>
                    <div className="flex-1 w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={shiftData} 
                                    innerRadius={70} 
                                    outerRadius={100} 
                                    paddingAngle={15} 
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {shiftData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '10px' }} />
                                <Legend verticalAlign="bottom" height={36}/>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </GlassCard>

                {/* 5. سجل نشاط التحميل السريع المصمم بعناية */}
                <div className="lg:col-span-12">
                    <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100">
                        <div className="bg-slate-900 p-6 flex justify-between items-center">
                            <h3 className="font-black text-white text-xl flex items-center gap-3">
                                <History className="text-indigo-400" size={26} /> سجل تتبع حركة الأسطول اللحظي
                            </h3>
                            <div className="flex gap-4">
                                <div className="flex items-center gap-2 text-xs text-slate-400 font-bold uppercase"><div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div> مراقبة حية</div>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-center border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b h-14">
                                        <th className="p-4">وقت التسجيل</th>
                                        <th className="p-4">رقم الفاتورة</th>
                                        <th className="p-4 text-right">العميل</th>
                                        <th className="p-4">رقم السيارة</th>
                                        <th className="p-4">نوع الوردية</th>
                                        <th className="p-4">الحمولة (طن)</th>
                                        <th className="p-4">مدة التحميل</th>
                                        <th className="p-4">الحالة التشغيلية</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm font-bold text-slate-700">
                                    {todaySales.slice(-8).reverse().map((sale, idx) => (
                                        <tr key={idx} className="border-b border-slate-50 hover:bg-indigo-50/30 h-16 transition-colors group">
                                            <td className="p-4 font-mono text-slate-400" style={forceEnNumsStyle}>{new Date(sale.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit'})}</td>
                                            <td className="p-4 text-indigo-600 font-mono text-xs">{sale.id}</td>
                                            <td className="p-4 text-right font-black text-slate-900">{sale.customer}</td>
                                            <td className="p-4 font-mono bg-slate-50 group-hover:bg-indigo-100/50 transition-colors">{sale.carNumber}</td>
                                            <td className="p-4">
                                                <span className="bg-slate-100 px-3 py-1 rounded-lg text-[10px] font-black text-slate-600 border border-slate-200">{sale.shift}</span>
                                            </td>
                                            <td className="p-4 font-black text-indigo-700 text-lg" style={forceEnNumsStyle}>{sale.total.toFixed(3)}</td>
                                            <td className="p-4">
                                                <div className="flex items-center justify-center gap-2 text-blue-600">
                                                    <Timer size={14}/>
                                                    <span style={forceEnNumsStyle}>{sale.loadingDuration}</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                                                    <span className="text-[11px] font-black text-emerald-600">مكتملة بالنجاح</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {todaySales.length === 0 && <tr><td colSpan={8} className="p-20 text-slate-300 font-black italic text-xl">لا توجد حركات مسجلة لليوم حتى الآن.. النظام في انتظار أول شحنة</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

const StatCardFantasy = ({ label, value, unit, icon, color }: any) => {
    const colorThemes: any = {
        indigo: 'from-indigo-600 to-blue-700 shadow-indigo-200',
        emerald: 'from-emerald-500 to-teal-600 shadow-emerald-200',
        rose: 'from-rose-500 to-pink-600 shadow-rose-200',
        cyan: 'from-cyan-500 to-blue-500 shadow-cyan-200'
    };
    return (
        <motion.div 
            whileHover={{ y: -5, scale: 1.02 }}
            className={`relative overflow-hidden bg-gradient-to-br ${colorThemes[color]} p-6 rounded-[2.5rem] shadow-xl text-white group border border-white/20`}
        >
            <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full group-hover:scale-125 transition-transform duration-700"></div>
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md border border-white/30 shadow-inner">
                        {icon}
                    </div>
                    <TrendUpIcon size={16} className="text-white/40" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/70 mb-1">{label}</p>
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black drop-shadow-lg" style={forceEnNumsStyle}>{value}</span>
                    <span className="text-xs font-bold opacity-60 uppercase">{unit}</span>
                </div>
            </div>
        </motion.div>
    );
};

const SalesReportsDashboard: React.FC<{ onNavigate: (view: SalesViewMode) => void }> = ({ onNavigate }) => {
    return (
        <div className="space-y-10 animate-fade-in font-cairo" dir="rtl">
            {/* تقارير قطاع المنتج التام */}
            <div className="space-y-4">
                <div className="flex items-center gap-3 border-r-4 border-blue-600 pr-4">
                    <Package size={24} className="text-blue-600"/>
                    <h2 className="text-xl font-black text-slate-800">تقارير قطاع المنتج التام (الأعلاف)</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <ReportCard 
                        label="مبيعات المنتج التام" 
                        icon={FileText} 
                        color="bg-blue-600" 
                        onClick={() => onNavigate('sales_by_name')}
                        desc="جدول تجميعي مقسم (صب/معبأ)"
                    />
                    <ReportCard 
                        label="البيان اليومي (تام)" 
                        icon={ClipboardList} 
                        color="bg-indigo-600" 
                        onClick={() => onNavigate('sales_detailed')}
                        desc="سجل فواتير مبيعات الأعلاف"
                    />
                    <ReportCard 
                        label="المبيعات اليومية (تام)" 
                        icon={Table} 
                        color="bg-slate-700" 
                        onClick={() => onNavigate('daily_sales')}
                        desc="جدول المبيعات اليومي الشامل"
                    />
                    <ReportCard 
                        label="تقرير الحركة (تام)" 
                        icon={Activity} 
                        color="bg-emerald-600" 
                        onClick={() => onNavigate('stock_movement_report')}
                        desc="بداية + إنتاج + مبيعات = نهاية"
                    />
                </div>
            </div>

            {/* تقارير قطاع بيوتولوجى */}
            <div className="space-y-4">
                <div className="flex items-center gap-3 border-r-4 border-amber-500 pr-4">
                    <ShoppingBag size={24} className="text-amber-500"/>
                    <h2 className="text-xl font-black text-slate-800">تقارير قطاع بيوتولوجى</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <ReportCard 
                        label="مبيعات بيوتولوجى" 
                        icon={FileText} 
                        color="bg-amber-600" 
                        onClick={() => onNavigate('petrology_sales')}
                        desc="جدول تجميعي لمبيعات بيوتولوجى"
                    />
                    <ReportCard 
                        label="البيان اليومي (بيوتولوجى)" 
                        icon={ClipboardList} 
                        color="bg-orange-600" 
                        onClick={() => onNavigate('petrology_detailed')}
                        desc="سجل فواتير قطاع بيوتولوجى"
                    />
                    <ReportCard 
                        label="المبيعات اليومية (بيوتولوجى)" 
                        icon={Table} 
                        color="bg-slate-600" 
                        onClick={() => onNavigate('petrology_daily_sales')}
                        desc="جدول مبيعات بيوتولوجى اليومي"
                    />
                    <ReportCard 
                        label="تقرير الحركة (بيوتولوجى)" 
                        icon={Activity} 
                        color="bg-yellow-600" 
                        onClick={() => onNavigate('petrology_report')}
                        desc="متابعة أرصدة وحركات بيوتولوجى"
                    />
                </div>
            </div>
        </div>
    );
};

const ReportCard = ({ label, icon: Icon, color, onClick, desc }: any) => (
    <button
        onClick={onClick}
        className="group relative overflow-hidden bg-white border border-gray-100 p-5 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 text-right flex flex-col justify-between min-h-[140px] hover:-translate-y-1"
    >
        <div className={`absolute top-0 left-0 w-1.5 h-full ${color}`}></div>
        <div className="flex justify-between items-start mb-2">
            <div className={`p-3 rounded-2xl ${color} text-white shadow-md group-hover:scale-110 transition-transform`}>
                <Icon size={24} />
            </div>
        </div>
        <div>
            <h3 className="text-md font-black text-gray-800 font-cairo group-hover:text-blue-600 transition-colors leading-tight">{label}</h3>
            {desc && <p className="text-[10px] text-gray-400 mt-1 font-bold">{desc}</p>}
        </div>
    </button>
);

const AddSaleView: React.FC<{ 
    startMode: 'new' | 'search'; 
    isReturn: boolean; 
    onBack: () => void 
}> = ({ startMode, isReturn, onBack }) => {
    const { products, settings, user, updateSettings, t, refreshProducts } = useApp();
    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [customerSearch, setCustomerSearch] = useState('');
    const [customerCodeSearch, setCustomerCodeSearch] = useState('');
    const [showCustomerResults, setShowCustomerResults] = useState(false);
    const [showCodeResults, setShowCodeResults] = useState(false);
    const [selectedWarehouse, setSelectedWarehouse] = useState<WarehouseType | 'all'>('all');
    const [isLoaded, setIsLoaded] = useState(startMode === 'new');
    const [searchIdInput, setSearchIdInput] = useState('');
    const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);
    
    // إعدادات تنسيق الجدول والطباعة
    const [tableStyles, setTableStyles] = useState(() => {
        const saved = localStorage.getItem('glasspos_invoice_editor_styles');
        return saved ? JSON.parse(saved) : DEFAULT_TABLE_STYLES;
    });

    useEffect(() => {
        localStorage.setItem('glasspos_invoice_editor_styles', JSON.stringify(tableStyles));
    }, [tableStyles]);

    const [inputModal, setInputModal] = useState<{
        isOpen: boolean;
        type: 'customer' | 'loadingOfficer' | 'confirmationOfficer' | 'transportMethod' | 'carType' | 'shift' | null;
        setter?: (val: string) => void;
    }>({ isOpen: false, type: null });

    const customerResultsRef = useRef<HTMLDivElement>(null);
    const codeResultsRef = useRef<HTMLDivElement>(null);
    
    const INITIAL_FORM_DATA: Partial<Sale> = {
        id: startMode === 'new' ? dbService.getNextId('invoice') : '',
        date: new Date().toISOString().split('T')[0],
        customer: '',
        customerCode: '',
        customerAddress: '',
        shift: 'الأولى',
        salesOrderNumber: '',
        salesOrderQuantity: 0,
        ticketNumber: '',
        transportMethod: 'وصال مقاول',
        contractorName: '',
        carType: 'دبابة',
        carNumber: '',
        arrivalDate: new Date().toISOString().split('T')[0],
        arrivalTime: '',
        entranceTime: '',
        exitTime: '',
        loadingDuration: 'تلقائي',
        driverName: '',
        loadingOfficer: '',
        confirmationOfficer: '',
        paymentMethod: 'cash',
        notes: '',
        isClosed: false
    };

    const [formData, setFormData] = useState<Partial<Sale>>(INITIAL_FORM_DATA);

    const isAdmin = user?.role === 'admin';
    const isLocked = !!formData.isClosed && !isAdmin;

    const totalCurrentVariance = useMemo(() => {
        return cart.reduce((sum, item) => sum + (item.itemVariance || 0), 0);
    }, [cart]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (customerResultsRef.current && !customerResultsRef.current.contains(event.target as Node)) {
                setShowCustomerResults(false);
            }
            if (codeResultsRef.current && !codeResultsRef.current.contains(event.target as Node)) {
                setShowCodeResults(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const resetForNextInvoice = () => {
        setCart([]); 
        setCustomerSearch(''); 
        setCustomerCodeSearch(''); 
        setSearchIdInput('');
        setSearchTerm('');
        setFormData(INITIAL_FORM_DATA);
        if (startMode === 'search') setIsLoaded(false);
    };

    const handleSearchInvoice = () => {
        const term = searchIdInput.trim();
        if (!term) return;
        const allSales = dbService.getSales();
        
        const normalize = (id: any) => String(id).replace('INV-', '').replace(/^0+/, '').trim();
        const normTerm = normalize(term);

        const found = allSales.find(s => 
            normalize(s.id) === normTerm || 
            s.salesOrderNumber === term || 
            String(s.id).includes(term)
        );
        
        if (found) {
            if (found.isClosed && !isAdmin) {
                alert('تم التعديل من قبل وغير مسموح بالتعديل الان');
                resetForNextInvoice();
                return;
            }

            setFormData({ ...found, date: found.date.split('T')[0], arrivalDate: found.arrivalDate ? found.arrivalDate.split('T')[0] : new Date().toISOString().split('T')[0] });
            setCart(found.items); 
            setCustomerSearch(found.customer || ''); 
            setCustomerCodeSearch(found.customerCode || '');
            setIsLoaded(true);
        } else {
            alert('الفاتورة غير موجودة، يرجى التأكد من الرقم.');
            setIsLoaded(false);
        }
    };

    const handleSave = (shouldPrint: boolean = false, isEditingUpdate: boolean = false, extraData: Partial<Sale> = {}) => {
        if (cart.length === 0) return alert('السلة فارغة');
        if (!formData.customer) return alert('يرجى اختيار العميل');
        
        const dbSales = dbService.getSales();
        const dbInvoice = dbSales.find(s => s.id === formData.id);
        
        if (dbInvoice?.isClosed && !isAdmin && !extraData.isClosed) {
            alert('تم التعديل من قبل وغير مسموح بالتعديل الان');
            resetForNextInvoice();
            onBack();
            return;
        }

        const isClosingNow = extraData.isClosed === true;

        const finalSale: Sale = {
            ...formData as Sale,
            ...extraData,
            date: new Date(formData.date!).toISOString(),
            createdAt: formData.createdAt || new Date().toISOString(),
            cashierId: user?.id || 'cashier', 
            cashierName: user?.name || 'محمود غالى',
            items: cart.map(item => isReturn ? { ...item, quantity: -Math.abs(item.quantity) } : item),
            subtotal: 0, tax: 0, total: cart.reduce((s, i) => s + i.quantity, 0), variance: totalCurrentVariance, paymentMethod: (formData.paymentMethod as any) || 'cash'
        };
        
        try {
            dbService.saveSale(finalSale); 
            updateSettings(dbService.getSettings()); 
            refreshProducts();
            
            if (shouldPrint) printService.printInvoice(finalSale, settings, tableStyles);
            
            if (isClosingNow) {
                alert('تم إغلاق الفاتورة نهائياً بنجاح.');
                resetForNextInvoice();
                onBack(); 
                return;
            }

            if (isEditingUpdate || startMode === 'search') {
                setFormData(prev => ({ ...prev, ...extraData }));
                alert('تم حفظ التعديلات بنجاح');
            } else {
                alert('تم حفظ الفاتورة بنجاح');
                resetForNextInvoice();
            }
            setIsSaveConfirmOpen(false);
        } catch (error: any) {
            alert(error.message);
        }
    };

    const filteredClientsByName = useMemo(() => {
        if (!customerSearch) return [];
        return (settings.clients || []).filter(c => 
            String(c.name || '').toLowerCase().includes(customerSearch.toLowerCase())
        ).slice(0, 8);
    }, [customerSearch, settings.clients]);

    const filteredClientsByCode = useMemo(() => {
        if (!customerCodeSearch) return [];
        return (settings.clients || []).filter(c => 
            String(c.code || '').toLowerCase().includes(customerCodeSearch.toLowerCase())
        ).slice(0, 8);
    }, [customerCodeSearch, settings.clients]);

    const handleSelectClient = (client: Client) => {
        if (isLocked) return;
        setFormData(prev => ({ ...prev, customer: client.name, customerCode: String(client.code), customerAddress: client.address }));
        setCustomerSearch(client.name);
        setCustomerCodeSearch(String(client.code));
        setShowCustomerResults(false);
        setShowCodeResults(false);
    };

    const handleCodeInputChange = (code: string) => {
        if (isLocked) return;
        setCustomerCodeSearch(code);
        setFormData(prev => ({ ...prev, customerCode: code }));
        setShowCodeResults(true);
        const exactMatch = settings.clients?.find(c => String(c.code).toLowerCase() === code.toLowerCase());
        if (exactMatch) {
            setFormData(prev => ({ ...prev, customer: exactMatch.name, customerAddress: exactMatch.address || prev.customerAddress }));
            setCustomerSearch(exactMatch.name);
        }
    };

    const handleNameInputChange = (name: string) => {
        if (isLocked) return;
        setCustomerSearch(name);
        setFormData(prev => ({ ...prev, customer: name }));
        setShowCustomerResults(true);
        const exactMatch = settings.clients?.find(c => c.name.toLowerCase() === name.toLowerCase());
        if (exactMatch) {
            setFormData(prev => ({ ...prev, customerCode: String(exactMatch.code), customerAddress: exactMatch.address || prev.customerAddress }));
            setCustomerCodeSearch(String(exactMatch.code));
        }
    };

    useEffect(() => {
        if (formData.entranceTime && formData.exitTime) {
            const start = formData.entranceTime.split(':').map(Number);
            const end = formData.exitTime.split(':').map(Number);
            let diff = (end[0] * 60 + end[1]) - (start[0] * 60 + start[1]);
            if (diff < 0) diff += 24 * 60;
            const hrs = Math.floor(diff / 60).toString().padStart(2, '0');
            const mins = (diff % 60).toString().padStart(2, '0');
            setFormData(prev => ({ ...prev, loadingDuration: `${hrs}:${mins}` }));
        }
    }, [formData.entranceTime, formData.exitTime]);

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.barcode.includes(searchTerm);
            let matchesWarehouse = selectedWarehouse === 'all' || (selectedWarehouse === 'finished' ? (p.warehouse === 'finished' || p.category === 'أعلاف' || p.category === 'بيوتولوجى') : p.warehouse === selectedWarehouse);
            return matchesSearch && matchesWarehouse;
        });
    }, [products, searchTerm, selectedWarehouse]);

    const addToCart = (p: Product) => {
        if (isLocked) return;
        const existing = cart.find(item => item.id === p.id);
        if (existing) {
            setCart(cart.map(item => item.id === p.id ? { ...item, quantity: item.quantity + 1 } : item));
        } else {
            setCart([...cart, { ...p, quantity: 0, discount: 0, productionDate: new Date().toISOString().split('T')[0], salesType: settings.salesTypes?.[0] || 'عادي', quantityBulk: 0, quantityPacked: 0, soQuantity: 0, itemVariance: 0 }]);
        }
    };

    const updateCartItem = (idx: number, field: string, value: any) => {
        if (isLocked) return;
        const newCart = [...cart];
        const item = { ...newCart[idx], [field]: value };
        
        if (field === 'quantityBulk' || field === 'quantityPacked') {
            item.quantity = (item.quantityBulk || 0) + (item.quantityPacked || 0);
        }
        
        item.itemVariance = (item.soQuantity || 0) - item.quantity;
        
        newCart[idx] = item;
        setCart(newCart);
    };

    const calculateDaysDiff = (prodDate?: string) => {
        if (!prodDate || !formData.date) return 0;
        const start = new Date(prodDate);
        const end = new Date(formData.date);
        const diff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        return diff;
    };

    const openAddOptionModal = (type: any, setter: (val: string) => void) => { if (isLocked) return; setInputModal({ isOpen: true, type, setter }); };

    const saveNewOption = (newVal: string) => {
        const type = inputModal.type; if (!type) return;
        const keyMap: Record<string, keyof AppSettings> = { customer: 'clients', loadingOfficer: 'loadingOfficers', confirmationOfficer: 'confirmationOfficers', transportMethod: 'transportMethods', carType: 'carTypes', shift: 'shifts' };
        const settingsKey = keyMap[type];
        if (settingsKey) {
            if (settingsKey === 'clients') {
                const newClient: Client = { id: Date.now().toString(), code: `C-${Date.now()}`, name: newVal, phone: '', address: '' };
                updateSettings({ ...settings, clients: [...(settings.clients || []), newClient] });
                handleSelectClient(newClient);
            } else {
                const currentList = (settings[settingsKey] as string[]) || [];
                if (!currentList.includes(newVal)) { 
                    updateSettings({ ...settings, [settingsKey]: [...currentList, newVal] }); 
                    if (inputModal.setter) inputModal.setter(newVal); 
                }
            }
        }
    };

    const getCellStyle = (isNumeric: boolean = false): React.CSSProperties => ({
        fontFamily: isNumeric ? 'Inter, sans-serif' : tableStyles.fontFamily,
        fontSize: isNumeric ? '12px' : `${tableStyles.fontSize}px`,
        fontWeight: tableStyles.isBold ? 'bold' : 'normal',
        fontStyle: tableStyles.isItalic ? 'italic' : 'normal',
        textDecoration: tableStyles.isUnderline ? 'underline' : 'none',
        textAlign: tableStyles.textAlign,
        verticalAlign: tableStyles.verticalAlign,
        ...(isNumeric ? forceEnNumsStyle : {})
    });

    const compactInputClasses = "w-full px-2 py-1.5 border-2 border-slate-200 rounded-xl text-[13px] font-black outline-none focus:ring-2 focus:ring-blue-500 h-9 transition-all bg-white text-gray-900 font-cairo shadow-sm";
    const labelClasses = "text-[11px] font-black text-slate-600 mb-1 block pr-1";

    return (
        <div className={`flex gap-4 animate-fade-in pb-20 ${isLocked ? 'grayscale-[0.4]' : ''}`} dir="rtl">
            <div className="flex-1 space-y-4">
                {startMode === 'search' && !isLoaded && (
                    <div className="flex flex-col items-center justify-center py-20 bg-blue-50/50 rounded-2xl border-2 border-dashed border-blue-200 animate-fade-in">
                        <div className="bg-white p-4 rounded-full shadow-lg text-blue-600 mb-6"><SearchCode size={64}/></div>
                        <h3 className="text-xl font-bold text-blue-900 mb-2">تعديل فاتورة سابقة</h3>
                        <p className="text-gray-500 mb-8">يرجى إدخل رقم الفاتورة أو رقم أمر البيع للبحث والبدء في التعديل</p>
                        <div className="flex w-full max-md:hidden gap-2 p-2 bg-white rounded-2xl shadow-xl border border-blue-100">
                            <input className="flex-1 p-4 text-xl font-bold text-center outline-none font-sans" placeholder="INV-000001" value={searchIdInput} onChange={e => setSearchIdInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearchInvoice()} autoFocus style={forceEnNumsStyle} />
                            <button onClick={handleSearchInvoice} className="bg-blue-600 hover:bg-blue-700 text-white px-8 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95"><Search size={20}/> بحث</button>
                        </div>
                    </div>
                )}

                {isLoaded && (
                    <div className="space-y-4">
                        {formData.isClosed && (
                            <div className="bg-gradient-to-r from-red-600 to-red-800 border-b-8 border-red-900 text-white p-4 rounded-2xl flex items-center justify-center gap-5 font-black animate-bounce-in shadow-2xl mb-4 ring-4 ring-red-200">
                                <ShieldAlert size={32} className="animate-pulse text-yellow-300"/> 
                                <div className="text-right">
                                    <h4 className="text-xl uppercase tracking-tighter">هذه الفاتورة مقفلة</h4>
                                    <p className="text-[10px] opacity-90 font-bold">تم التعديل من قبل وغير مسموح بالتعديل الان (وضع القراءة فقط للمديرين)</p>
                                </div>
                                {isAdmin && (
                                    <button onClick={() => { if(window.confirm('فك القفل كمدير؟')) { setFormData({...formData, isClosed: false}); } }} className="mr-auto bg-white text-red-700 px-4 py-2 rounded-xl text-xs font-black shadow-xl hover:bg-gray-100 transition-all transform active:scale-95 flex items-center gap-2 border-2 border-red-900"><Unlock size={18}/> فك القفل الإداري</button>
                                )}
                            </div>
                        )}
                        
                        <div className={`bg-white p-4 rounded-[2rem] border border-slate-200 shadow-md grid grid-cols-2 md:grid-cols-6 gap-3 transition-opacity ${isLocked ? 'opacity-60 pointer-events-none' : ''}`}>
                            <div className="flex flex-col"><label className={labelClasses}>التاريخ</label><input disabled={isLocked} type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className={compactInputClasses} style={forceEnNumsStyle}/></div>
                            <div className="flex flex-col"><label className={`${labelClasses} text-blue-700`}>رقم الفاتورة</label><input value={formData.id} readOnly className={`${compactInputClasses} text-center text-blue-900 bg-blue-50/50 border-blue-100 font-mono`} style={forceEnNumsStyle}/></div>
                            <div className="flex flex-col relative" ref={codeResultsRef}><label className={`${labelClasses} text-blue-700`}>كود العميل</label><div className="flex gap-1.5"><input disabled={isLocked} value={customerCodeSearch} onChange={e => handleCodeInputChange(e.target.value)} onFocus={() => !isLocked && setShowCodeResults(true)} className={`${compactInputClasses} text-center`} placeholder="C-XXXX" style={forceEnNumsStyle}/><button disabled={isLocked} onClick={() => openAddOptionModal('customer', (v) => handleCodeInputChange(v))} className="bg-blue-600 text-white w-9 h-9 rounded-xl hover:bg-blue-700 transition-all shadow-md flex items-center justify-center shrink-0"><Plus size={16}/></button></div>{showCodeResults && filteredClientsByCode.length > 0 && (<div className="absolute top-full left-0 right-0 z-[1000] bg-white border border-gray-200 rounded-xl shadow-2xl mt-1 max-h-60 overflow-y-auto">{filteredClientsByCode.map(c => (<div key={c.id} onClick={() => handleSelectClient(c)} className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-0"><span className="text-[11px] font-black text-blue-700">{String(c.code)}</span> - <span className="font-bold text-gray-800 text-xs">{c.name}</span></div>))}</div>)}</div>
                            <div className="flex flex-col relative" ref={customerResultsRef}><label className={labelClasses}>اسم العميل</label><input disabled={isLocked} className={`${compactInputClasses}`} placeholder="ابحث عن عميل..." value={customerSearch} onChange={e => handleNameInputChange(e.target.value)} onFocus={() => !isLocked && setShowCustomerResults(true)}/>{showCustomerResults && filteredClientsByName.length > 0 && (<div className="absolute top-full left-0 right-0 z-[1000] bg-white border border-gray-200 rounded-xl shadow-2xl mt-1 max-h-60 overflow-y-auto">{filteredClientsByName.map(c => (<div key={c.id} onClick={() => handleSelectClient(c)} className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-0"><span className="font-bold text-gray-800 text-xs">{c.name}</span></div>))}</div>)}</div>
                            <div className="flex flex-col"><label className={labelClasses}>عنوان العميل</label><input disabled={isLocked} value={formData.customerAddress} onChange={e => setFormData({...formData, customerAddress: e.target.value})} className={compactInputClasses}/></div>
                            <div className="flex flex-col"><label className={labelClasses}>الوردية</label><div className="flex gap-1.5"><select disabled={isLocked} value={formData.shift} onChange={e => setFormData({...formData, shift: e.target.value})} className={`${compactInputClasses}`}>{settings.shifts?.map(s => <option key={s} value={s}>{s}</option>)}</select><button disabled={isLocked} onClick={() => openAddOptionModal('shift', (v) => setFormData({...formData, shift: v}))} className="bg-blue-600 text-white w-9 h-9 rounded-xl hover:bg-blue-700 transition-all shadow-md flex items-center justify-center shrink-0"><Plus size={16}/></button></div></div>
                        </div>

                        <div className={`bg-white p-4 rounded-[2rem] border-2 border-indigo-50 shadow-md grid grid-cols-2 md:grid-cols-6 gap-3 transition-opacity items-end ${isLocked ? 'opacity-60 pointer-events-none' : ''}`}>
                            <div className="flex flex-col"><label className={labelClasses}>رقم أمر البيع</label><input disabled={isLocked} value={formData.salesOrderNumber} onChange={e => setFormData({...formData, salesOrderNumber: e.target.value})} className={`${compactInputClasses} font-mono`} style={forceEnNumsStyle}/></div>
                            <div className="flex flex-col"><label className={`${labelClasses} text-indigo-700`}>وقت وصول الأمر</label><input disabled={isLocked} type="time" value={formData.arrivalTime} onChange={e => setFormData({...formData, arrivalTime: e.target.value})} className={`${compactInputClasses} bg-indigo-50/20 border-indigo-100`} style={forceEnNumsStyle}/></div>
                            <div className="flex flex-col"><label className={labelClasses}>رقم التذكرة</label><input disabled={isLocked} value={formData.ticketNumber} onChange={e => setFormData({...formData, ticketNumber: e.target.value})} className={`${compactInputClasses} font-mono`} style={forceEnNumsStyle}/></div>
                            <div className="flex flex-col"><label className={`${labelClasses} text-indigo-700`}>طريقة النقل</label>
                                <select disabled={isLocked} value={formData.transportMethod} onChange={e => setFormData({...formData, transportMethod: e.target.value})} className={`${compactInputClasses} bg-indigo-50/20 border-indigo-100`}>
                                    <option value="وصال مقاول">وصال مقاول</option>
                                    {settings.transportMethods?.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                            <div className="flex flex-col"><label className={`${labelClasses} text-indigo-700`}>مقاول النقل</label><input disabled={isLocked} value={formData.contractorName} onChange={e => setFormData({...formData, contractorName: e.target.value})} className={`${compactInputClasses} bg-indigo-50/10`}/></div>
                            <div className="flex flex-col"><label className={labelClasses}>اسم السائق</label><input disabled={isLocked} value={formData.driverName} onChange={e => setFormData({...formData, driverName: e.target.value})} className={compactInputClasses} placeholder="اسم السائق..."/></div>
                        </div>

                        <div className={`bg-white p-4 rounded-[2rem] border border-slate-200 shadow-md grid grid-cols-2 md:grid-cols-7 gap-3 transition-opacity ${isLocked ? 'opacity-60 pointer-events-none' : ''}`}>
                            <div className="flex flex-col"><label className={labelClasses}>نوع السيارة</label><select disabled={isLocked} value={formData.carType} onChange={e => setFormData({...formData, carType: e.target.value})} className={`${compactInputClasses}`}><option value="دبابة">دبابة</option>{settings.carTypes?.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                            <div className="flex flex-col"><label className={labelClasses}>رقم السيارة</label><input disabled={isLocked} value={formData.carNumber} onChange={e => setFormData({...formData, carNumber: e.target.value})} className={compactInputClasses} style={forceEnNumsStyle}/></div>
                            <div className="flex flex-col"><label className={labelClasses}>وقت الدخول</label><input disabled={isLocked} type="time" value={formData.entranceTime} onChange={e => setFormData({...formData, entranceTime: e.target.value})} className={compactInputClasses} style={forceEnNumsStyle}/></div>
                            <div className="flex flex-col"><label className={labelClasses}>وقت الخروج</label><input disabled={isLocked} type="time" value={formData.exitTime} onChange={e => setFormData({...formData, exitTime: e.target.value})} className={compactInputClasses} style={forceEnNumsStyle}/></div>
                            <div className="flex flex-col"><label className={`${labelClasses} text-blue-700`}>مدة التحميل</label><input value={formData.loadingDuration} readOnly className={`${compactInputClasses} text-center font-black bg-blue-50 text-blue-800 border-blue-200`} style={forceEnNumsStyle}/></div>
                            <div className="flex flex-col"><label className={`${labelClasses} text-blue-700`}>مسؤول التحميل</label><div className="flex gap-1.5"><select disabled={isLocked} value={formData.loadingOfficer} onChange={e => setFormData({...formData, loadingOfficer: e.target.value})} className={`${compactInputClasses}`}>
                                <option value="">-- اختر --</option>
                                {settings.loadingOfficers?.map(o => <option key={o} value={o}>{o}</option>)}
                            </select><button disabled={isLocked} onClick={() => openAddOptionModal('loadingOfficer', (v) => setFormData({...formData, loadingOfficer: v}))} className="bg-blue-600 text-white w-9 h-9 rounded-xl shadow-md flex items-center justify-center shrink-0"><Plus size={16}/></button></div></div>
                            <div className="flex flex-col"><label className={`${labelClasses} text-blue-700`}>تأكيد الخروج</label><div className="flex gap-1.5"><select disabled={isLocked} value={formData.confirmationOfficer} onChange={e => setFormData({...formData, confirmationOfficer: e.target.value})} className={`${compactInputClasses}`}>
                                <option value="">-- اختر --</option>
                                {settings.confirmationOfficers?.map(o => <option key={o} value={o}>{o}</option>)}
                            </select><button disabled={isLocked} onClick={() => openAddOptionModal('confirmationOfficer', (v) => setFormData({...formData, confirmationOfficer: v}))} className="bg-blue-600 text-white w-9 h-9 rounded-xl shadow-md flex items-center justify-center shrink-0"><Plus size={16}/></button></div></div>
                        </div>

                        {/* شريط تنسيق جدول الفاتورة (للطباعة والعرض) */}
                        <div className="no-print">
                            <TableToolbar styles={tableStyles} setStyles={setTableStyles} onReset={() => setTableStyles(DEFAULT_TABLE_STYLES)} />
                        </div>

                        <div className="bg-[#1f2937] rounded-[1.5rem] overflow-hidden shadow-xl border-2 border-slate-700">
                            <table className="w-full text-white text-center text-xs border-collapse">
                                <thead className="bg-[#1e293b] font-black h-12 shadow-md">
                                    <tr className="border-b border-gray-700">
                                        <th className="p-3 border-l border-gray-700" style={getCellStyle()}>الصنف</th>
                                        <th className="p-3 border-l border-gray-700 bg-[#7c2d12] text-yellow-100" style={getCellStyle()}>الكمية بأمر البيع</th>
                                        <th className="p-3 border-l border-gray-700" style={getCellStyle()}>صب</th>
                                        <th className="p-3 border-l border-gray-700" style={getCellStyle()}>معبأ</th>
                                        <th className="p-3 border-l border-gray-700 bg-blue-900/50" style={getCellStyle()}>الكمية المحملة</th>
                                        <th className="p-3 border-l border-gray-700 bg-red-900/30" style={getCellStyle()}>الفرق</th>
                                        <th className="p-3 border-l border-gray-700" style={getCellStyle()}>نوع المبيعات</th>
                                        <th className="p-3 border-l border-gray-700" style={getCellStyle()}>ت. إنتاج</th>
                                        <th className="p-3 border-l border-gray-700" style={getCellStyle()}>الفرق (أيام)</th>
                                        <th className="p-3" style={getCellStyle()}>حذف</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white text-gray-800 font-bold">
                                    {cart.map((item, idx) => (
                                        <tr key={idx} className={`border-b border-gray-100 hover:bg-slate-50 transition-colors ${isLocked ? 'bg-gray-50' : ''}`}>
                                            <td className="p-3 text-right pr-6 border-l border-gray-100 font-black text-gray-900" style={getCellStyle()}>{item.name}</td>
                                            <td className="p-2 border-l border-gray-100 bg-orange-50/10" style={getCellStyle()}>
                                                <input disabled={isLocked} type="number" step="any" value={item.soQuantity || ''} onChange={e => updateCartItem(idx, 'soQuantity', Number(e.target.value))} className="w-24 p-2 border border-orange-100 rounded-lg text-center font-black text-orange-800 focus:border-orange-500 outline-none" style={forceEnNumsStyle}/>
                                            </td>
                                            <td className="p-2 border-l border-gray-100" style={getCellStyle()}>
                                                <input disabled={isLocked} type="number" step="any" value={item.quantityBulk || ''} onChange={e => updateCartItem(idx, 'quantityBulk', Number(e.target.value))} className="w-24 p-2 border border-slate-100 rounded-lg text-center focus:border-indigo-400 outline-none font-black" style={forceEnNumsStyle}/>
                                            </td>
                                            <td className="p-2 border-l border-gray-100" style={getCellStyle()}>
                                                <input disabled={isLocked} type="number" step="any" value={item.quantityPacked || ''} onChange={e => updateCartItem(idx, 'quantityPacked', Number(e.target.value))} className="w-24 p-2 border border-slate-100 rounded-lg text-center focus:border-indigo-400 outline-none font-black" style={forceEnNumsStyle}/>
                                            </td>
                                            <td className="p-3 border-l border-gray-100 text-blue-800 text-lg font-black bg-blue-50/30" style={getCellStyle(true)}>
                                                {item.quantity.toFixed(3)}
                                            </td>
                                            <td className={`p-3 border-l border-gray-100 font-black text-lg ${(item.itemVariance || 0) !== 0 ? 'text-red-700 bg-red-50/20' : 'text-green-700'}`} style={getCellStyle(true)}>
                                                {(item.itemVariance || 0).toFixed(3)}
                                            </td>
                                            <td className="p-2 border-l border-gray-100 min-w-[130px]" style={getCellStyle()}>
                                                <select disabled={isLocked} value={item.salesType} onChange={e => updateCartItem(idx, 'salesType', e.target.value)} className="w-full p-2 border border-slate-100 rounded-lg bg-slate-50 text-[11px] font-black font-cairo">
                                                    {settings.salesTypes?.map(st => <option key={st} value={st}>{st}</option>)}
                                                </select>
                                            </td>
                                            <td className="p-2 border-l border-gray-100" style={getCellStyle()}>
                                                <input disabled={isLocked} type="date" value={item.productionDate} onChange={e => updateCartItem(idx, 'productionDate', e.target.value)} className="p-2 border border-slate-100 rounded-lg text-[11px] font-black" style={forceEnNumsStyle}/>
                                            </td>
                                            <td className="p-3 border-l border-gray-100 text-orange-700 font-black" style={getCellStyle(true)}>
                                                {calculateDaysDiff(item.productionDate)}
                                            </td>
                                            <td className="p-3">
                                                <button disabled={isLocked} onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="text-red-500 hover:bg-red-50 p-2 rounded-full transition-all active:scale-90"><Trash2 size={18}/></button>
                                            </td>
                                        </tr>
                                    ))}
                                    {cart.length === 0 && (<tr><td colSpan={10} className="p-16 text-gray-300 italic font-black text-lg">استخدم قائمة الأصناف الجانبية لإضافة المنتجات...</td></tr>)}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex flex-col md:flex-row justify-between items-end mt-6 no-print gap-6">
                            <div className="flex gap-4 items-center w-full md:w-auto">
                                <div className="bg-blue-600 text-white px-8 py-4 rounded-[2rem] shadow-xl border-b-4 border-blue-900 text-center flex-1 md:flex-none min-w-[180px]">
                                    <p className="text-[11px] font-black opacity-90 uppercase tracking-widest mb-0.5">المحمل الفعلي</p>
                                    <p className="text-3xl font-black" style={forceEnNumsStyle}>
                                        {cart.reduce((s,i) => s + i.quantity, 0).toFixed(3)} 
                                        <span className="text-sm font-bold mr-1">طن</span>
                                    </p>
                                </div>
                                
                                <div className="bg-rose-600 text-white px-8 py-4 rounded-[2rem] shadow-xl border-b-4 border-rose-900 text-center flex-1 md:flex-none min-w-[150px]">
                                    <p className="text-[11px] font-black opacity-90 uppercase tracking-widest mb-0.5">إجمالي الفرق</p>
                                    <p className="text-2xl font-black" style={forceEnNumsStyle}>
                                        {totalCurrentVariance.toFixed(3)}
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3 mb-1 w-full md:w-auto">
                                <button onClick={() => handleSave(true, startMode === 'search')} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-2xl font-black shadow-lg transition-all active:scale-95 flex items-center gap-2 border-b-4 border-blue-800 text-lg flex-1">
                                    <Printer size={24}/> طباعة
                                </button>
                                
                                {isLoaded && startMode === 'search' ? (
                                    <button 
                                        disabled={isLocked} 
                                        onClick={() => setIsSaveConfirmOpen(true)} 
                                        className={`bg-[#5b21b6] text-white px-8 py-3.5 rounded-2xl font-black shadow-lg transition-all active:scale-95 flex items-center gap-2 border-b-4 border-[#4c1d95] text-lg flex-1 ${isLocked ? 'opacity-30' : 'hover:bg-[#4c1d95]'}`}
                                    >
                                        <Save size={24}/> حفظ التعديل
                                    </button>
                                ) : (
                                    <button disabled={isLocked} onClick={() => handleSave()} className={`bg-green-600 text-white px-8 py-3.5 rounded-2xl font-black shadow-lg transition-all active:scale-95 flex items-center gap-2 border-b-4 border-green-800 text-lg flex-1 ${isLocked ? 'opacity-30' : 'hover:bg-green-700'}`}>
                                        <Save size={24}/> حفظ الفاتورة
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {isLoaded && (
                <div className="w-80 shrink-0 bg-white rounded-[2rem] border border-gray-200 shadow-xl overflow-hidden flex flex-col h-[750px] no-print sticky top-4">
                    <div className="p-6 border-b space-y-4 bg-slate-50/50">
                        <div className="relative">
                            <input disabled={isLocked} className="w-full p-3 pr-10 border-2 border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm font-bold shadow-inner" placeholder="بحث عن صنف..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
                            <Search className="absolute right-3 top-3.5 text-gray-400" size={18}/>
                        </div>
                        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
                            <WarehouseTab active={selectedWarehouse === 'all'} onClick={() => setSelectedWarehouse('all')} icon={<LayoutGrid size={14}/>} label="الكل" />
                            <WarehouseTab active={selectedWarehouse === 'finished'} onClick={() => setSelectedWarehouse('finished'} icon={<PackageCheck size={14}/>} label="تام" />
                            <WarehouseTab active={selectedWarehouse === 'raw'} onClick={() => setSelectedWarehouse('raw')} icon={<Factory size={14}/>} label="خامات" />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {filteredProducts.map(p => (
                            <div key={p.id} onClick={() => addToCart(p)} className={`p-4 border border-slate-100 rounded-2xl transition-all group ${isLocked ? 'opacity-30 cursor-not-allowed bg-gray-50' : 'hover:bg-blue-50 hover:border-blue-200 cursor-pointer shadow-sm'}`}>
                                <div className="flex justify-between items-start">
                                    <h4 className="font-black text-gray-800 text-xs group-hover:text-blue-700 flex-1 leading-tight">{p.name}</h4>
                                    <span className="text-[9px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-lg uppercase font-black border border-indigo-100">{p.warehouse === 'finished' ? 'تام' : 'خام'}</span>
                                </div>
                                <div className="flex justify-between mt-3 text-[10px] font-black border-t border-slate-50 pt-2">
                                    <span className="text-gray-400 font-mono">كود: {p.barcode}</span>
                                    <span className="text-blue-600">رصيد: {p.stock}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <AnimatePresence>
                {isSaveConfirmOpen && (
                    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 backdrop-blur-md p-4" dir="rtl">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-[2.5rem] shadow-2xl w-full max-md overflow-hidden border-t-8 border-indigo-600"
                        >
                            <div className="p-8 text-center space-y-4">
                                <div className="mx-auto w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center shadow-inner border-2 border-indigo-100">
                                    <Save size={32} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800 mb-1 font-cairo">خيارات الحفظ المتاحة</h3>
                                    <p className="text-slate-500 font-bold text-xs leading-relaxed">
                                        يرجى اختيار الإجراء المناسب. خيار "إغلاق الفاتورة" سيقوم بقفلها نهائياً.
                                    </p>
                                </div>
                                
                                <div className="grid grid-cols-1 gap-3 pt-4">
                                    <button 
                                        onClick={() => {
                                            handleSave(false, true, { isClosed: false });
                                            setIsSaveConfirmOpen(false);
                                        }}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-2xl font-black text-lg shadow-lg flex items-center justify-center gap-3 transition-all transform active:scale-95 group border-b-4 border-blue-800"
                                    >
                                        <Edit3 size={24} className="group-hover:rotate-12 transition-transform" />
                                        تكملة التعديل (حفظ وبقاء)
                                    </button>
                                    
                                    <button 
                                        onClick={() => {
                                            handleSave(false, true, { isClosed: true });
                                            setIsSaveConfirmOpen(false);
                                        }}
                                        className="w-full bg-slate-800 hover:bg-black text-white p-4 rounded-2xl font-black text-lg shadow-lg flex items-center justify-center gap-3 transition-all transform active:scale-95 group border-b-4 border-black"
                                    >
                                        <Lock size={24} className="text-yellow-400 group-hover:scale-110 transition-transform" />
                                        إغلاق الفاتورة نهائياً
                                    </button>
                                    
                                    <button 
                                        onClick={() => setIsSaveConfirmOpen(false)}
                                        className="w-full bg-gray-100 hover:bg-gray-200 text-slate-600 p-3 rounded-xl font-black text-sm transition-all active:scale-95"
                                    >
                                        إلغاء
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <InputModal isOpen={inputModal.isOpen} onClose={() => setInputModal({ isOpen: false, type: null })} onSave={saveNewOption} title="إضافة خيار جديد" />
        </div>
    );
};

const WarehouseTab: React.FC<{ active: boolean, onClick: () => void, icon: React.ReactNode, label: string }> = ({ active, onClick, icon, label }) => (
    <button onClick={onClick} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-black transition-all border-2 shrink-0 ${active ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-gray-500 border-slate-50 hover:border-blue-100 hover:text-blue-600'}`}>{icon}<span>{label}</span></button>
);

export const Sales: React.FC = () => {
    const { settings, t, uiConfig, user } = useApp();
    const [viewMode, setViewMode] = useState<SalesViewMode>('menu');
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    useEffect(() => {
        const view = searchParams.get('view');
        if (view) setViewMode(view as SalesViewMode);
        else setViewMode('menu');
    }, [searchParams]);

    const handleAction = (action: string) => {
        if (action.startsWith('navigate:')) navigate(action.split(':')[1]);
        else if (action.startsWith('view:')) setSearchParams({ view: action.split(':')[1] });
    };

    const handleBack = () => {
        if (viewMode === 'menu') {
            navigate('/');
        } else if (viewMode === 'reports' || viewMode === 'logistics_pulse') {
            setSearchParams({});
        } else {
            // منطق الرجوع المحسن:
            // استثناء الشاشات التي يجب أن تعود للقائمة الرئيسية مباشرة
            const goesToReportsDashboard = [
                'sales_by_name', 'petrology_sales', 'stock_movement_report', 
                'petrology_report', 'sales_detailed', 'petrology_detailed', 
                'petrology_daily_sales', 'sales_by_item', 
                'sales_customer_split', 'transport_report', 'best_customers', 
                'loading_efficiency'
            ].includes(viewMode);

            if (goesToReportsDashboard) {
                setSearchParams({ view: 'reports' });
            } else {
                // يعود للقائمة الرئيسية (Menu) لـ daily_sales و client_withdrawals و item_withdrawals
                setSearchParams({});
            }
        }
    };

    const ActionButton: React.FC<{ btn: ButtonConfig }> = ({ btn }) => {
        const Icon = getIcon(btn.icon);
        const label = settings.language === 'ar' ? (btn.labelAr || t(btn.labelKey)) : (btn.labelEn || t(btn.labelKey));
        return (
            <button onClick={() => handleAction(btn.action)} className={`${btn.color} text-white px-6 py-6 rounded-[2rem] shadow-2xl hover:brightness-110 active:scale-95 transition-all flex flex-col items-center justify-center gap-4 font-cairo font-black text-[18px] w-full min-h-[160px] group border-4 border-white/20`}>
                <div className="bg-white/10 p-3 rounded-2xl group-hover:scale-110 transition-transform shadow-inner shrink-0"><Icon size={32} /></div>
                <span className="truncate w-full text-center leading-tight">{label}</span>
            </button>
        );
    };

    const currentButton = uiConfig.sales.buttons.find(b => b.action === `view:${viewMode}`);
    const viewTitle = viewMode === 'menu' ? t('sales') : (REPORT_LABELS[viewMode] || (settings.language === 'ar' ? (currentButton?.labelAr || t(currentButton?.labelKey || '')) : (currentButton?.labelEn || t(currentButton?.labelKey || ''))));

    return (
        <div className="p-4 space-y-4" dir="rtl">
            <div className="bg-gradient-to-l from-slate-50 via-blue-50/30 to-slate-50 border-y-4 border-blue-600 shadow-premium px-10 py-6 flex items-center justify-between relative overflow-hidden h-32 animate-fade-in mb-8 rounded-[2rem]">
                <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-blue-100/20 to-transparent pointer-events-none"></div>
                
                <div className="relative group shrink-0">
                    <button onClick={handleBack} className="flex items-center gap-3 bg-[#1e293b] hover:bg-black text-white px-8 py-3.5 rounded-2xl font-black shadow-2xl transition-all active:scale-95 group relative z-10 border border-slate-700/50">
                        <ChevronLeft size={22} className="group-hover:-translate-x-1 transition-transform" />
                        <span>{viewMode === 'menu' ? t('backToMain') : 'رجوع'}</span>
                    </button>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center relative">
                    <div className="relative">
                        <h1 className="text-5xl font-black text-blue-900 font-cairo leading-tight drop-shadow-sm tracking-tight">{viewTitle}</h1>
                        <div className="mt-2 h-2.5 w-[140%] -mx-[20%] bg-gradient-to-r from-transparent via-blue-600/60 via-blue-600 to-blue-600/60 to-transparent rounded-full opacity-90"></div>
                    </div>
                    <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.3em] mt-3 opacity-80">نظام إدارة المبيعات واللوجستيات</p>
                </div>

                <div className="hidden md:flex p-4 bg-white border border-blue-100 text-blue-600 rounded-[1.5rem] shadow-xl shrink-0 group hover:rotate-6 transition-transform">
                    <ShoppingCart size={38} strokeWidth={2.5}/>
                </div>
            </div>

            {viewMode === 'menu' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-4" dir="rtl">
                    {uiConfig.sales.buttons.filter(b => b.isVisible && user?.permissions?.screens?.[b.id] !== 'hidden').map(btn => (
                        <ActionButton key={btn.id} btn={btn} />
                    ))}
                </div>
            )}

            {viewMode !== 'menu' && (
                <GlassCard className="min-h-[500px] p-6 overflow-x-auto shadow-premium border-slate-100 rounded-[2.5rem]">
                    {viewMode === 'logistics_pulse' && <LogisticsPulseDashboard />}
                    {viewMode === 'list' && <DailySalesTable />}
                    {viewMode === 'add' && <AddSaleView startMode="new" isReturn={false} onBack={handleBack} />}
                    {viewMode === 'invoice_search' && <AddSaleView startMode="search" isReturn={false} onBack={handleBack} />}
                    {viewMode === 'return' && <AddSaleView startMode="new" isReturn={true} onBack={handleBack} />}
                    {viewMode === 'reports' && <SalesReportsDashboard onNavigate={(v) => setSearchParams({ view: v })} />}
                    {viewMode === 'client_withdrawals' && <ClientWithdrawalsReport />}
                    {viewMode === 'item_withdrawals' && <ItemWithdrawalsReport />}
                    {viewMode === 'daily_sales' && <DailySalesTable />}
                    {viewMode === 'petrology_daily_sales' && <DailySalesTable filterCategory="بيوتولوجى" />}
                    {viewMode === 'sales_by_item' && <SalesByItemReport />}
                    {viewMode === 'sales_customer_split' && <SalesCustomerSplitReport />}
                    {viewMode === 'transport_report' && <SalesTransportReport />}
                    {viewMode === 'best_customers' && <BestCustomersReport />}
                    {viewMode === 'sales_by_name' && <SalesByNameReport filterCategory="أعلاف" title="مبيعات المنتج التام" />}
                    {viewMode === 'petrology_sales' && <SalesByNameReport filterCategory="بيوتولوجى" title="مبيعات بيوتولوجى" />}
                    {viewMode === 'sales_detailed' && <SalesDetailedReport filterCategory="أعلاف" />}
                    {viewMode === 'petrology_detailed' && <SalesDetailedReport filterCategory="بيوتولوجى" />}
                    {viewMode === 'stock_movement_report' && <DailyStockMovementReport filterCategory="أعلاف" title="التقرير اليومي للمنتج التام" />}
                    {viewMode === 'petrology_report' && <DailyStockMovementReport filterCategory="بيوتولوجى" title="التقرير اليومي بيوتولوجى" />}
                    {viewMode === 'loading_efficiency' && <LoadingEfficiencyReport />}
                </GlassCard>
            )}
        </div>
    );
};

