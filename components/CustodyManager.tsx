
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { dbService } from '../services/storage';
import { GlassCard, GlassInput, GlassButton } from './NeumorphicUI';
import { 
    UserCheck, Hammer, History, Search, Printer, 
    Plus, PlusCircle, X, Save, ClipboardList, 
    ShieldCheck, Package, Tag, User, RotateCcw, FileText,
    UserCog, FileDown, Upload, Trash2,
    Calendar, Hash, Info, FileUp, Settings, Activity, Gauge,
    LayoutList, ArrowRightLeft, CheckCircle2, AlertCircle,
    ArrowUpRight, ArrowDownLeft, Clock
} from 'lucide-react';
import { StockMovement, Product } from '../types';
import { printService } from '../services/printing';
import { PrintSettingsModal } from './PrintSettingsModal';
import { ReportActionsBar } from './ReportActionsBar';
import * as XLSX from 'xlsx';

const forceEnNumsStyle = {
    fontFamily: 'Inter, sans-serif',
    fontVariantNumeric: 'lining-nums',
    direction: 'ltr' as const
};

const normalizeArabic = (text: string) => {
    return (text || '').toString().trim().toLowerCase()
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .replace(/[\u064B-\u0652]/g, ''); 
};

const CustodyDashboard: React.FC<{ stats: any, onNavigate: (v: any) => void }> = ({ stats, onNavigate }) => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
            <GlassCard className="col-span-1 lg:col-span-3 bg-gradient-to-r from-indigo-600 to-blue-700 text-white p-8 flex flex-col md:flex-row items-center justify-between gap-6 border-none shadow-xl rounded-[2.5rem]">
                <div className="flex items-center gap-6">
                    <div className="p-4 bg-white/20 rounded-3xl backdrop-blur-md">
                        <UserCheck size={48} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black mb-1">نظام إدارة العهد الفنية</h2>
                        <p className="text-indigo-100 font-bold">تتبع وصرف المرتجعات للعدد والأدوات وقطع الغيار طرف الفنيين</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <button onClick={() => onNavigate('issue')} className="bg-white text-indigo-700 px-8 py-3 rounded-2xl font-black shadow-lg hover:scale-105 transition-all">صرف عهدة جديدة</button>
                    <button onClick={() => onNavigate('return')} className="bg-indigo-50 text-white border border-indigo-400 px-8 py-3 rounded-2xl font-black shadow-lg hover:scale-105 transition-all">ارتجاع عهدة</button>
                </div>
            </GlassCard>

            <div className="grid grid-cols-1 md:grid-cols-3 col-span-1 lg:col-span-3 gap-6">
                <StatCard 
                    title="صافي العهد المسلمة" 
                    value={stats.inPossession} 
                    icon={<Package className="text-indigo-600"/>} 
                    sub="إجمالي عدد القطع المتواجدة مع الفنيين حالياً"
                    color="border-indigo-500"
                />
                <StatCard 
                    title="عدد الفنيين النشطين" 
                    value={stats.uniqueEmployees} 
                    icon={<User className="text-emerald-600"/>} 
                    sub="فني قام باستلام/إرجاع عهدة"
                    color="border-emerald-500"
                />
                <StatCard 
                    title="إجمالي الحركات" 
                    value={stats.totalOps} 
                    icon={<Activity className="text-blue-600"/>} 
                    sub="عمليات صرف وارتجاع مسجلة"
                    color="border-blue-500"
                />
            </div>
        </div>
    );
};

const StatCard: React.FC<{ title: string, value: number, icon: React.ReactNode, sub: string, color: string }> = ({ title, value, icon, sub, color }) => (
    <GlassCard className={`p-6 border-r-8 ${color} shadow-lg`}>
        <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-slate-50 rounded-2xl shadow-inner">{icon}</div>
        </div>
        <h4 className="text-slate-400 text-xs font-black mb-1 uppercase tracking-wider">{title}</h4>
        <h2 className="text-4xl font-black text-slate-900 mb-2" style={forceEnNumsStyle}>{value}</h2>
        <p className="text-[10px] text-slate-400 font-bold leading-tight">{sub}</p>
    </GlassCard>
);

export const CustodyManager: React.FC = () => {
    const { settings, products, user, refreshProducts } = useApp();
    const [view, setView] = useState<'dashboard' | 'issue' | 'return' | 'history' | 'technician_report' | 'ledger' | 'import'>('dashboard');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTech, setSelectedTech] = useState<string>('');
    
    const movements = dbService.getMovements().filter(m => m.warehouse === 'parts');
    
    const custodyRecords = useMemo(() => {
        return movements
            .flatMap(m => m.items.map((item, idx) => {
                const productDef = products.find(p => p.id === item.productId);
                return {
                    ...m,
                    ...item,
                    moveId: m.id,
                    itemIdx: idx,
                    category: productDef?.category || '-',
                    employeeName: m.reason || 'غير محدد',
                    employeeCode: m.customFields?.employeeCode || '-',
                    storekeeper: m.user || '-',
                    status: m.type === 'out' ? 'صرف' : m.type === 'in' ? 'ارتجاع' : 'تسوية',
                    displayDate: new Date(m.date).toLocaleDateString('en-GB'),
                    itemCondition: item.oldPartsStatus || 'جديد',
                    conditionPercent: item.meterReading || '100',
                    unit: item.unit || productDef?.unit || 'عدد'
                };
            }))
            .filter(row => row.employeeName !== 'جرد يومي')
            .filter(row => 
                normalizeArabic(row.employeeName).includes(normalizeArabic(searchTerm)) || 
                normalizeArabic(row.employeeCode).includes(normalizeArabic(searchTerm)) ||
                normalizeArabic(row.productName).includes(normalizeArabic(searchTerm)) ||
                normalizeArabic(row.category).includes(normalizeArabic(searchTerm))
            )
            .reverse();
    }, [movements, searchTerm, products]);

    const aggregatedLedger = useMemo(() => {
        const ledgerMap: Record<string, any> = {};

        // معالجة البيانات من الأقدم للأحدث لبناء دورة الحياة
        [...custodyRecords].reverse().forEach(record => {
            const key = `${record.employeeName}_${record.productId}`;
            if (!ledgerMap[key]) {
                ledgerMap[key] = {
                    employeeName: record.employeeName,
                    employeeCode: record.employeeCode,
                    productId: record.productId,
                    productName: record.productName,
                    category: record.category,
                    unit: record.unit || 'عدد',
                    issuedQty: 0,
                    returnedQty: 0,
                    firstIssueDate: '-',
                    firstIssueCondition: '-',
                    lastReturnDate: '-',
                    lastReturnCondition: '-',
                    history: [] // لتخزين تتبع دورة الحياة
                };
            }
            
            const entry = ledgerMap[key];
            if (record.type === 'out') {
                entry.issuedQty += record.quantity;
                if (entry.firstIssueDate === '-') {
                    entry.firstIssueDate = record.displayDate;
                    entry.firstIssueCondition = `${record.itemCondition} (${record.conditionPercent}%)`;
                }
            } else if (record.type === 'in') {
                entry.returnedQty += record.quantity;
                entry.lastReturnDate = record.displayDate;
                entry.lastReturnCondition = `${record.itemCondition} (${record.conditionPercent}%)`;
            }
            
            entry.history.push({
                type: record.status,
                date: record.displayDate,
                condition: record.itemCondition,
                percent: record.conditionPercent,
                qty: record.quantity
            });
        });

        return Object.values(ledgerMap)
            .map((entry: any) => ({
                ...entry,
                netBalance: entry.issuedQty - entry.returnedQty
            }))
            .filter(row => 
                normalizeArabic(row.employeeName).includes(normalizeArabic(searchTerm)) || 
                normalizeArabic(row.employeeCode).includes(normalizeArabic(searchTerm)) ||
                normalizeArabic(row.productName).includes(normalizeArabic(searchTerm))
            )
            .sort((a, b) => b.netBalance - a.netBalance);
    }, [custodyRecords, searchTerm]);

    const stats = useMemo(() => {
        const outQty = custodyRecords.filter(r => r.type === 'out').reduce((sum, r) => sum + r.quantity, 0);
        const inQty = custodyRecords.filter(r => r.type === 'in').reduce((sum, r) => sum + r.quantity, 0);
        const uniqueEmployees = new Set(custodyRecords.map(r => r.employeeName)).size;
        return { inPossession: outQty - inQty, totalOps: movements.length, uniqueEmployees };
    }, [custodyRecords, movements]);

    const technicianCustody = useMemo(() => {
        if (!selectedTech) return [];
        return aggregatedLedger.filter(row => row.employeeName === selectedTech && row.netBalance > 0);
    }, [aggregatedLedger, selectedTech]);

    return (
        <div className="space-y-6 animate-fade-in font-cairo" dir="rtl">
            <div className="flex flex-wrap gap-2 no-print bg-white p-2 rounded-2xl shadow-sm border border-slate-100 overflow-x-auto">
                <TabBtn active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={<ClipboardList size={18}/>} label="لوحة التحكم"/>
                <TabBtn active={view === 'issue'} onClick={() => setView('issue')} icon={<PlusCircle size={18}/>} label="صرف عهدة"/>
                <TabBtn active={view === 'return'} onClick={() => setView('return')} icon={<RotateCcw size={18}/>} label="ارتجاع عهدة"/>
                <TabBtn active={view === 'ledger'} onClick={() => setView('ledger')} icon={<LayoutList size={18}/>} label="تقارير عهد الفنيين"/>
                <TabBtn active={view === 'technician_report'} onClick={() => setView('technician_report')} icon={<UserCheck size={18}/>} label="جرد عهدة فني"/>
                <TabBtn active={view === 'history'} onClick={() => setView('history')} icon={<History size={18}/>} label="سجل الحركات"/>
                <TabBtn active={view === 'import'} onClick={() => setView('import')} icon={<FileDown size={18}/>} label="استيراد شامل للعهد"/>
            </div>

            {view === 'dashboard' && <CustodyDashboard stats={stats} onNavigate={setView} />}
            {view === 'issue' && <CustodyForm mode="out" title="صرف عهدة فني (متعدد)" onBack={() => setView('dashboard')} />}
            {view === 'return' && <CustodyForm mode="in" title="إرجاع عهدة للمخزن (متعدد)" onBack={() => setView('dashboard')} />}
            {view === 'history' && <CustodyHistoryTable records={custodyRecords} searchTerm={searchTerm} setSearchTerm={setSearchTerm} />}
            {view === 'ledger' && <TechnicianLedgerTable records={aggregatedLedger} searchTerm={searchTerm} setSearchTerm={setSearchTerm} />}
            {view === 'technician_report' && (
                <TechnicianReport 
                    selectedTech={selectedTech} 
                    setSelectedTech={setSelectedTech} 
                    custodyItems={technicianCustody}
                    allTechs={Array.from(new Set(custodyRecords.map(r => r.employeeName)))}
                    allRecords={custodyRecords}
                    aggregatedData={aggregatedLedger}
                />
            )}
            {view === 'import' && <CustodyImport onBack={() => setView('dashboard')} />}
        </div>
    );
};

const CustodyForm: React.FC<{ mode: 'in' | 'out', title: string, onBack: () => void }> = ({ mode, title, onBack }) => {
    const { products, refreshProducts, user, settings } = useApp();
    const [itemSearch, setItemSearch] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [draftItems, setDraftItems] = useState<any[]>([]);
    
    const [header, setHeader] = useState({
        date: new Date().toISOString().split('T')[0],
        refNumber: dbService.getNextId(mode === 'out' ? 'issueVoucher' : 'receiveVoucher'),
        employeeCode: '',
        employee: '',
        storekeeper: user?.name || '',
    });

    const [itemForm, setItemForm] = useState({
        qty: 1,
        serial: '',
        condition: 'جديد',
        percent: '100',
        notes: ''
    });

    const filteredProducts = useMemo(() => {
        const term = normalizeArabic(itemSearch);
        if (!term || selectedProduct) return [];
        return products.filter(p => 
            (p.warehouse === 'parts' || p.category === 'قطع غيار' || p.category === 'مهمات') && 
            (normalizeArabic(p.name).includes(term) || normalizeArabic(p.barcode).includes(term))
        );
    }, [products, itemSearch, selectedProduct]);

    const handleAddItem = () => {
        if (!selectedProduct) {
            alert('يرجى اختيار الصنف من القائمة المنسدلة أولاً.');
            return;
        }
        if (itemForm.qty <= 0) {
            alert('يرجى إدخال كمية صحيحة');
            return;
        }
        
        const newItem = {
            productId: selectedProduct.id,
            productName: selectedProduct.name,
            productCode: selectedProduct.barcode,
            category: selectedProduct.category,
            quantity: itemForm.qty,
            unit: selectedProduct.unit || 'عدد',
            oldPartsStatus: itemForm.condition,
            meterReading: itemForm.percent,
            notes: itemForm.serial ? `S/N: ${itemForm.serial} | ${itemForm.notes}` : itemForm.notes
        };

        setDraftItems([...draftItems, newItem]);
        setSelectedProduct(null);
        setItemSearch('');
        setItemForm({ ...itemForm, qty: 1, serial: '', notes: '' });
    };

    const handleSave = () => {
        if (!header.employee) return alert('يرجى إدخال اسم الفني');
        if (draftItems.length === 0) return alert('برجاء إضافة أصناف للجدول');

        const movement: StockMovement = {
            id: Date.now().toString(),
            date: new Date(header.date).toISOString(),
            type: mode,
            warehouse: 'parts',
            refNumber: header.refNumber,
            user: header.storekeeper,
            reason: header.employee,
            customFields: {
                employeeCode: header.employeeCode
            },
            items: draftItems
        };

        dbService.saveMovement(movement);
        refreshProducts();
        alert('تم حفظ الحركة بنجاح');
        onBack();
    };

    return (
        <GlassCard className={`max-w-7xl mx-auto bg-white p-8 border-t-8 shadow-2xl rounded-[3rem] !overflow-visible ${mode === 'out' ? 'border-indigo-600' : 'border-emerald-600'}`}>
            <div className="flex justify-between items-center mb-8 border-b pb-6">
                <div className="flex items-center gap-4">
                    <div className={`p-4 rounded-3xl ${mode === 'out' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        {mode === 'out' ? <PlusCircle size={32} /> : <RotateCcw size={32} />}
                    </div>
                    <div>
                        <h3 className="text-3xl font-black text-slate-800">{title}</h3>
                        <p className="text-slate-400 font-bold text-sm">نظام صرف وارتجاع العهد الفنية</p>
                    </div>
                </div>
                <button onClick={onBack} className="bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-500 p-3 rounded-2xl transition-all"><X size={28}/></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8 bg-slate-50/50 p-6 rounded-[2rem] border border-slate-200">
                <Field label="التاريخ" icon={<Calendar size={14}/>}>
                    <input type="date" className="w-full p-3 border-2 border-white rounded-xl font-black shadow-sm" value={header.date} onChange={e => setHeader({...header, date: e.target.value})} style={forceEnNumsStyle}/>
                </Field>
                <Field label="رقم المستند" icon={<Hash size={14}/>}>
                    <input className="w-full p-3 border-2 border-white rounded-xl font-mono text-center font-black shadow-sm" value={header.refNumber} onChange={e => setHeader({...header, refNumber: e.target.value})}/>
                </Field>
                <Field label="كود الفني" icon={<Hash size={14}/>}>
                    <input className="w-full p-3 border-2 border-white rounded-xl font-black shadow-sm" placeholder="كود..." value={header.employeeCode} onChange={e => setHeader({...header, employeeCode: e.target.value})}/>
                </Field>
                <Field label="الفني / الموظف" icon={<User size={14}/>}>
                    <input className="w-full p-3 border-2 border-white rounded-xl font-black shadow-sm" placeholder="اسم المستلم..." value={header.employee} onChange={e => setHeader({...header, employee: e.target.value})}/>
                </Field>
                <Field label="أمين المخزن" icon={<UserCog size={14}/>}>
                    <select className="w-full p-3 border-2 border-white rounded-xl font-black shadow-sm bg-white" value={header.storekeeper} onChange={e => setHeader({...header, storekeeper: e.target.value})}>
                        <option value={user?.name}>{user?.name}</option>
                        {settings.storekeepers?.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </Field>
            </div>

            <div className="relative z-[900] grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-slate-800 p-8 rounded-[2.5rem] shadow-2xl mb-6 border-b-8 border-slate-900">
                <div className="md:col-span-4 relative">
                    <label className="text-[11px] font-black text-slate-400 mb-2 block uppercase tracking-wider">البحث عن الصنف (كود أو اسم)</label>
                    <div className="relative">
                        <input 
                            className="w-full p-4 pr-12 rounded-2xl border-none bg-white shadow-lg outline-none font-black text-md focus:ring-4 focus:ring-indigo-500/20" 
                            value={itemSearch} 
                            onChange={e => { setItemSearch(e.target.value); if(selectedProduct) setSelectedProduct(null); }} 
                            placeholder="ابحث هنا..."
                        />
                        <Search className="absolute right-4 top-4 text-slate-300" size={20}/>
                    </div>
                    
                    {itemSearch.length > 0 && !selectedProduct && (
                        <div className="absolute top-full left-0 right-0 z-[2000] bg-white border-2 border-indigo-100 rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.5)] mt-2 max-h-72 overflow-y-auto p-2 animate-fade-in">
                            {filteredProducts.map(p => (
                                <div key={p.id} onClick={() => {setSelectedProduct(p); setItemSearch(p.name);}} className="p-4 hover:bg-indigo-50 cursor-pointer border-b last:border-0 flex justify-between items-center rounded-xl group transition-all">
                                    <div className="flex flex-col">
                                        <span className="font-black text-slate-800 group-hover:text-indigo-700">{p.name}</span>
                                        <span className="text-[10px] text-slate-400 font-bold">{p.category} - {p.barcode} ({p.unit || 'عدد'})</span>
                                    </div>
                                    <span className="bg-indigo-100 text-indigo-700 px-4 py-1 rounded-full text-[11px] font-black">رصيد: {p.stock}</span>
                                </div>
                            ))}
                            {filteredProducts.length === 0 && <div className="p-4 text-center text-slate-400 font-bold">لم يتم العثور على صنف</div>}
                        </div>
                    )}
                </div>

                <div className="md:col-span-2">
                    <label className="text-[11px] font-black text-slate-400 mb-2 block uppercase">الحالة</label>
                    <select className="w-full p-4 rounded-2xl border-none bg-white shadow-lg outline-none font-black text-md focus:ring-4 focus:ring-indigo-500/20" value={itemForm.condition} onChange={e => setItemForm({...itemForm, condition: e.target.value})}>
                        <option value="جديد">جديد (New)</option>
                        <option value="مستعمل">مستعمل (Used)</option>
                    </select>
                </div>

                <div className="md:col-span-2">
                    <label className="text-[11px] font-black text-slate-400 mb-2 block uppercase">النسبة المئوية %</label>
                    <div className="relative">
                        <input type="number" max="100" min="0" className="w-full p-4 pr-12 rounded-2xl border-none bg-white shadow-lg outline-none text-center font-black text-lg text-indigo-700" value={itemForm.percent} onChange={e => setItemForm({...itemForm, percent: e.target.value})}/>
                        <Gauge className="absolute right-4 top-4 text-indigo-300" size={20}/>
                    </div>
                </div>
                
                <div className="md:col-span-1">
                    <label className="text-[11px] font-black text-slate-400 mb-2 block uppercase">الكمية</label>
                    <input type="number" className="w-full p-4 rounded-2xl border-none bg-white shadow-lg outline-none text-center font-black text-lg text-indigo-700" value={itemForm.qty} onChange={e => setItemForm({...itemForm, qty: Number(e.target.value)})}/>
                </div>
                
                <div className="md:col-span-2">
                    <label className="text-[11px] font-black text-slate-400 mb-2 block uppercase">السيريال (اختياري)</label>
                    <input className="w-full p-4 rounded-2xl border-none bg-white shadow-lg outline-none font-mono text-center text-xs" value={itemForm.serial} onChange={e => setItemForm({...itemForm, serial: e.target.value})} placeholder="S/N..."/>
                </div>
                
                <div className="md:col-span-1">
                    <button onClick={handleAddItem} className="w-full h-[60px] bg-indigo-600 text-white rounded-2xl shadow-xl flex items-center justify-center hover:bg-indigo-700 active:scale-90 transition-all border-b-4 border-indigo-800">
                        <Plus size={32} strokeWidth={3}/>
                    </button>
                </div>
            </div>

            {selectedProduct && (
                <div className="bg-indigo-600 text-white p-4 rounded-2xl flex justify-between items-center shadow-xl mb-6 mx-2 animate-bounce-in border-b-4 border-indigo-800">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-white/20 rounded-xl"><Tag size={20}/></div>
                        <span className="font-black text-lg">{selectedProduct.name} <span className="opacity-60 text-xs">( النوع: {selectedProduct.category} | الوحدة: {selectedProduct.unit || 'عدد'} )</span></span>
                    </div>
                    <button onClick={() => setSelectedProduct(null)} className="p-2 hover:bg-white/20 rounded-full"><X size={20}/></button>
                </div>
            )}

            {draftItems.length > 0 && (
                <div className="mt-8 space-y-6">
                    <div className="bg-white rounded-[2rem] border-2 border-slate-100 overflow-hidden shadow-xl">
                        <table className="w-full text-center border-collapse">
                            <thead className="bg-slate-900 text-white text-[12px] font-black h-14 uppercase tracking-wider">
                                <tr>
                                    <th className="p-4 border-l border-slate-800 text-right pr-8">الصنف</th>
                                    <th className="p-4 border-l border-slate-800">حالة الصنف</th>
                                    <th className="p-4 border-l border-slate-800">النسبة</th>
                                    <th className="p-4 border-l border-slate-800">الكمية</th>
                                    <th className="p-4 border-l border-slate-800">الوحدة</th>
                                    <th className="p-4 border-l border-slate-800">ملاحظات</th>
                                    <th className="p-4">حذف</th>
                                </tr>
                            </thead>
                            <tbody className="text-slate-700 font-bold">
                                {draftItems.map((item, idx) => (
                                    <tr key={idx} className="border-b h-16 hover:bg-slate-50 transition-colors">
                                        <td className="p-4 text-right pr-8 font-black text-slate-900 text-lg">{item.productName}</td>
                                        <td className="p-4">
                                            <span className={`px-3 py-1 rounded-lg text-xs font-black ${item.oldPartsStatus === 'جديد' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                                                {item.oldPartsStatus}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col items-center">
                                                <span className="text-indigo-600 font-black" style={forceEnNumsStyle}>{item.meterReading}%</span>
                                                <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                                                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${item.meterReading}%` }}></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 font-black text-slate-900 text-xl" style={forceEnNumsStyle}>{item.quantity}</td>
                                        <td className="p-4 text-xs text-slate-500 font-bold">{item.unit}</td>
                                        <td className="p-4 text-xs text-slate-400 italic max-w-xs truncate">{item.notes}</td>
                                        <td className="p-4">
                                            <button onClick={() => setDraftItems(draftItems.filter((_, i) => i !== idx))} className="text-red-500 hover:bg-red-50 p-2.5 rounded-full transition-all active:scale-90"><Trash2 size={22}/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <button onClick={handleSave} className={`w-full py-6 rounded-3xl font-black text-xl shadow-2xl text-white transition-all transform active:scale-[0.98] flex items-center justify-center gap-4 border-b-8 ${mode === 'out' ? 'bg-indigo-600 border-indigo-900' : 'bg-emerald-600 border-emerald-900'}`}>
                        <Save size={28}/> ترحيل وحفظ المستند
                    </button>
                </div>
            )}
        </GlassCard>
    );
};

const TechnicianLedgerTable: React.FC<{ records: any[], searchTerm: string, setSearchTerm: (v: string) => void }> = ({ records, searchTerm, setSearchTerm }) => {
    const { settings } = useApp();
    const [showPrintModal, setShowPrintModal] = useState(false);

    const handlePrint = () => {
        const headers = ['كود الفني', 'الفني', 'نوع الصنف', 'الصنف', 'إجمالي المصروف', 'إجمالي المرتجع', 'الرصيد المتبقي', 'الوحدة', 'أول صرف', 'آخر ارتجاع'];
        const data = records.map(r => [r.employeeCode, r.employeeName, r.category, r.productName, r.issuedQty, r.returnedQty, r.netBalance, r.unit, r.firstIssueDate, r.lastReturnDate]);
        printService.printGenericReport('تقارير عهد الفنيين (الملخص المجمع)', headers, data, settings, 'custody_ledger');
    };

    const handleExport = () => {
        const wb = XLSX.utils.book_new();
        const exportData = records.map(r => ({ 
            'كود الفني': r.employeeCode,
            'اسم الفني': r.employeeName, 
            'نوع الصنف': r.category, 
            'اسم الصنف': r.productName, 
            'إجمالي المصروف': r.issuedQty, 
            'إجمالي المرتجع': r.returnedQty, 
            'الرصيد المتبقي': r.netBalance,
            'الوحدة': r.unit,
            'تاريخ أول صرف': r.firstIssueDate,
            'حالة أول صرف': r.firstIssueCondition,
            'تاريخ آخر ارتجاع': r.lastReturnDate,
            'حالة آخر ارتجاع': r.lastReturnCondition
        }));
        const ws = XLSX.utils.json_to_sheet(exportData);
        XLSX.utils.book_append_sheet(wb, ws, "TechCustodyReports");
        XLSX.writeFile(wb, `تقارير_عهد_الفنيين_${new Date().toISOString().slice(0,10)}.xlsx`);
    };

    return (
        <div className="space-y-4">
            {showPrintModal && <PrintSettingsModal isOpen={showPrintModal} onClose={() => setShowPrintModal(false)} context="custody_ledger" />}
            <div className="flex flex-wrap justify-between items-center bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm no-print gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg"><LayoutList size={24}/></div>
                    <div>
                        <h2 className="text-xl font-black text-slate-800">تقارير عهد الفنيين</h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">ملخص الصرف والارتجاع (تتبع دورة حياة القطعة والتواريخ)</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative w-80">
                        <input className="w-full pr-12 pl-4 py-2.5 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-indigo-50 font-bold text-sm bg-slate-50/50 shadow-inner" placeholder="بحث بكود أو اسم الفني أو الصنف..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
                        <Search className="absolute right-4 top-3 text-slate-400" size={18} />
                    </div>
                    <ReportActionsBar onPrint={handlePrint} onExport={handleExport} onSettings={() => setShowPrintModal(true)} hideImport />
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-premium overflow-hidden">
                <div className="overflow-x-auto max-h-[600px]">
                    <table className="w-full text-center border-collapse min-w-[2000px]">
                        <thead className="sticky top-0 z-10 bg-slate-900 text-white">
                            <tr className="h-14 font-black text-xs uppercase">
                                <th className="p-3 border-l border-slate-800">كود الفني</th>
                                <th className="p-3 border-l border-slate-800 text-right pr-6">اسم الفني</th>
                                <th className="p-3 border-l border-slate-800">نوع الصنف</th>
                                <th className="p-3 border-l border-slate-800 text-right pr-6">بيان الصنف</th>
                                <th className="p-3 border-l border-slate-800 bg-blue-900/30 font-black">إجمالي المصروف (+)</th>
                                <th className="p-3 border-l border-slate-800 bg-emerald-900/30 font-black">إجمالي المرتجع (-)</th>
                                <th className="p-3 border-l border-slate-800 bg-indigo-900/20 font-black">الرصيد المتبقي</th>
                                <th className="p-3 border-l border-slate-800">الوحدة</th>
                                <th className="p-3 border-l border-slate-800 bg-blue-50/5 text-blue-400">تاريخ أول صرف</th>
                                <th className="p-3 border-l border-slate-800 text-blue-300">حالة أول صرف %</th>
                                <th className="p-3 border-l border-slate-800 bg-emerald-50/5 text-emerald-400">تاريخ آخر ارتجاع</th>
                                <th className="p-3 text-emerald-300">حالة آخر ارتجاع %</th>
                            </tr>
                        </thead>
                        <tbody className="text-[13px] font-bold text-slate-700">
                            {records.map((row, idx) => (
                                <tr key={idx} className={`border-b border-slate-100 hover:bg-slate-50 h-14 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                                    <td className="p-2 border-l font-black text-indigo-600" style={forceEnNumsStyle}>{row.employeeCode}</td>
                                    <td className="p-2 border-l text-right pr-6 font-black text-slate-800">{row.employeeName}</td>
                                    <td className="p-2 border-l"><span className="bg-gray-100 px-2 py-0.5 rounded text-[10px]">{row.category}</span></td>
                                    <td className="p-2 border-l text-right pr-6 font-black text-slate-900">{row.productName}</td>
                                    <td className="p-2 border-l text-blue-700 bg-blue-50/20" style={forceEnNumsStyle}>{row.issuedQty}</td>
                                    <td className="p-2 border-l text-emerald-700 bg-emerald-50/20" style={forceEnNumsStyle}>{row.returnedQty}</td>
                                    <td className={`p-2 border-l text-lg font-black ${row.netBalance > 0 ? 'text-rose-600 bg-rose-50/30' : 'text-emerald-600 bg-emerald-50/30'}`} style={forceEnNumsStyle}>
                                        {row.netBalance === 0 ? <CheckCircle2 size={18} className="inline ml-1"/> : null}
                                        {row.netBalance}
                                    </td>
                                    <td className="p-2 border-l text-slate-400">{row.unit}</td>
                                    <td className="p-2 border-l text-blue-600/70" style={forceEnNumsStyle}>{row.firstIssueDate}</td>
                                    <td className="p-2 border-l text-xs italic text-blue-400">{row.firstIssueCondition}</td>
                                    <td className="p-2 border-l text-emerald-600/70" style={forceEnNumsStyle}>{row.lastReturnDate}</td>
                                    <td className="p-2 text-xs italic text-emerald-400">{row.lastReturnCondition}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const CustodyHistoryTable: React.FC<{ records: any[], searchTerm: string, setSearchTerm: (v: string) => void }> = ({ records, searchTerm, setSearchTerm }) => {
    const { settings } = useApp();
    const [showPrintModal, setShowPrintModal] = useState(false);
    
    const handleExport = () => {
        const wb = XLSX.utils.book_new();
        const exportData = records.map(r => ({ 
            'التاريخ': r.displayDate, 
            'رقم المستند': r.refNumber, 
            'كود الفني': r.employeeCode,
            'اسم الفني': r.employeeName, 
            'النوع': r.status, 
            'الصنف': r.productName, 
            'الحالة': r.itemCondition,
            'النسبة %': r.conditionPercent,
            'الكمية': r.quantity, 
            'الوحدة': r.unit,
            'أمين المخزن': r.storekeeper 
        }));
        const ws = XLSX.utils.json_to_sheet(exportData);
        XLSX.utils.book_append_sheet(wb, ws, "CustodyHistory");
        XLSX.writeFile(wb, `Custody_History_${new Date().toISOString().slice(0,10)}.xlsx`);
    };

    const handlePrint = () => {
        const headers = ['التاريخ', 'رقم المستند', 'كود الفني', 'الفني', 'النوع', 'الصنف', 'الوحدة', 'الحالة', '%', 'الكمية'];
        const data = records.map(r => [r.displayDate, r.refNumber, r.employeeCode, r.employeeName, r.status, r.productName, r.unit, r.itemCondition, r.conditionPercent + '%', r.quantity]);
        printService.printGenericReport('سجل حركات العهد الفنية التفصيلي', headers, data, settings, 'custody_history');
    };

    return (
        <div className="space-y-4">
            {showPrintModal && <PrintSettingsModal isOpen={showPrintModal} onClose={() => setShowPrintModal(false)} context="custody_history" />}
            <div className="flex flex-wrap justify-between items-center bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm no-print gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-800 text-white rounded-2xl shadow-lg"><History size={24}/></div>
                    <div><h2 className="text-xl font-black text-slate-800">سجل حركات العهد</h2><p className="text-[10px] text-slate-400 font-bold uppercase">كافة عمليات الصرف والارتجاع للفنيين</p></div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative w-80">
                        <input className="w-full pr-12 pl-4 py-2.5 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-slate-50 font-bold text-sm bg-slate-50/50 shadow-inner" placeholder="بحث شامل..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
                        <Search className="absolute right-4 top-3 text-slate-400" size={18} />
                    </div>
                    <ReportActionsBar onPrint={handlePrint} onExport={handleExport} onSettings={() => setShowPrintModal(true)} hideImport />
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-premium overflow-hidden">
                <div className="overflow-x-auto max-h-[600px]">
                    <table className="w-full text-center border-collapse min-w-[1900px]">
                        <thead className="sticky top-0 z-10 bg-slate-900 text-white">
                            <tr className="h-14 font-black text-xs uppercase">
                                <th className="p-3 border-l border-slate-800">التاريخ</th>
                                <th className="p-3 border-l border-slate-800">رقم الإذن</th>
                                <th className="p-3 border-l border-slate-800 text-right pr-6">اسم الفني</th>
                                <th className="p-3 border-l border-slate-800">نوع الحركة</th>
                                <th className="p-3 border-l border-slate-800 text-right pr-6">بيان الصنف</th>
                                <th className="p-3 border-l border-slate-800">الوحدة</th>
                                <th className="p-3 border-l border-slate-800">حالة الصنف</th>
                                <th className="p-3 border-l border-slate-800">النسبة</th>
                                <th className="p-3 border-l border-slate-800">الكمية</th>
                                <th className="p-3 border-l border-slate-800">أمين المخزن</th>
                                <th className="p-3">ملاحظات</th>
                            </tr>
                        </thead>
                        <tbody className="text-[13px] font-bold text-slate-700">
                            {records.map((row, idx) => (
                                <tr key={idx} className={`border-b border-slate-100 hover:bg-slate-50 h-14 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                                    <td className="p-2 border-l" style={forceEnNumsStyle}>{row.displayDate}</td>
                                    <td className="p-2 border-l font-mono text-xs">{row.refNumber}</td>
                                    <td className="p-2 border-l text-right pr-6 font-black text-slate-800">{row.employeeName} <span className="text-[10px] text-slate-400">({row.employeeCode})</span></td>
                                    <td className="p-2 border-l">
                                        <span className={`px-3 py-1 rounded-full text-[10px] ${row.status === 'صرف' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                            {row.status}
                                        </span>
                                    </td>
                                    <td className="p-2 border-l text-right pr-6 font-black text-slate-900">{row.productName}</td>
                                    <td className="p-2 border-l text-slate-400 font-bold">{row.unit}</td>
                                    <td className="p-2 border-l">
                                        <span className={`px-2 py-0.5 rounded text-[10px] ${row.itemCondition === 'جديد' ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'}`}>{row.itemCondition}</span>
                                    </td>
                                    <td className="p-2 border-l text-indigo-700" style={forceEnNumsStyle}>{row.conditionPercent}%</td>
                                    <td className="p-2 border-l bg-blue-50 text-blue-800 text-lg" style={forceEnNumsStyle}>{row.quantity}</td>
                                    <td className="p-2 border-l text-gray-500">{row.storekeeper}</td>
                                    <td className="p-2 text-right text-[10px] text-slate-400 italic truncate max-w-xs">{row.notes}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const TechnicianReport: React.FC<{ 
    selectedTech: string, 
    setSelectedTech: any, 
    custodyItems: any[], 
    allTechs: string[],
    allRecords: any[],
    aggregatedData: any[]
}> = ({ selectedTech, setSelectedTech, custodyItems, allTechs, allRecords, aggregatedData }) => {
    const { settings } = useApp();
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [activeTab, setActiveTab] = useState<'inventory' | 'lifecycle'>('inventory');

    const currentTechCode = useMemo(() => {
        if (!selectedTech) return '-';
        const record = allRecords.find(r => r.employeeName === selectedTech);
        return record?.employeeCode || '-';
    }, [selectedTech, allRecords]);

    const handleExport = () => {
        if (!selectedTech) return;
        const wb = XLSX.utils.book_new();
        const exportData = custodyItems.map(i => ({ 
            'اسم الفني': selectedTech,
            'كود الفني': currentTechCode,
            'نوع الصنف': i.category,
            'بيان العهدة': i.productName, 
            'الحالة': i.lastReturnCondition || i.firstIssueCondition,
            'الكمية المتبقية': i.netBalance, 
            'الوحدة': i.unit,
            'تاريخ أول صرف': i.firstIssueDate,
            'تاريخ آخر ارتجاع': i.lastReturnDate
        }));
        const ws = XLSX.utils.json_to_sheet(exportData);
        XLSX.utils.book_append_sheet(wb, ws, "TechCustody");
        XLSX.writeFile(wb, `Custody_${selectedTech}_${new Date().toISOString().slice(0,10)}.xlsx`);
    };

    const handlePrint = () => {
        if (!selectedTech) return;
        const headers = ['م', 'نوع الصنف', 'بيان العهدة', 'الصافي الحالي', 'الوحدة', 'أول صرف', 'آخر ارتجاع'];
        const data = custodyItems.map((item, idx) => [
            idx + 1, 
            item.category, 
            item.productName, 
            item.netBalance, 
            item.unit,
            item.firstIssueDate,
            item.lastReturnDate
        ]);
        printService.printGenericReport(`تقرير جرد عهدة الفني: ${selectedTech} (${currentTechCode})`, headers, data, settings, 'technician_custody_report');
    };

    return (
        <div className="space-y-4">
            {showPrintModal && <PrintSettingsModal isOpen={showPrintModal} onClose={() => setShowPrintModal(false)} context="technician_custody_report" />}
            
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col lg:flex-row justify-between items-center gap-6 no-print">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-indigo-600 text-white rounded-3xl shadow-lg shadow-indigo-100"><UserCheck size={28}/></div>
                    <div>
                        <h2 className="text-xl font-black text-slate-800">جرد عهدة الفنيين</h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">عرض صافي العهد المتبقية وتتبع حركة القطع</p>
                    </div>
                </div>

                <div className="flex-1 max-w-2xl flex flex-wrap items-center gap-3">
                    <div className="flex-1 min-w-[250px]">
                        <select 
                            className="w-full p-4 rounded-2xl border-2 border-indigo-50 bg-slate-50 outline-none focus:bg-white focus:border-indigo-500 font-black text-indigo-900 transition-all shadow-inner" 
                            value={selectedTech} 
                            onChange={e => setSelectedTech(e.target.value)}
                        >
                            <option value="">-- اختر الفني لعرض عهدته --</option>
                            {allTechs.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>

                    {selectedTech && (
                        <ReportActionsBar 
                            onPrint={handlePrint}
                            onExport={handleExport}
                            onSettings={() => setShowPrintModal(true)}
                            hideImport={true}
                        />
                    )}
                </div>
            </div>

            {selectedTech && (
                <div className="space-y-4 animate-fade-in">
                    <div className="flex gap-2 p-1 bg-slate-200/50 rounded-2xl w-fit">
                        <button onClick={() => setActiveTab('inventory')} className={`px-6 py-2 rounded-xl text-sm font-black transition-all ${activeTab === 'inventory' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>الجرد الحالي</button>
                        <button onClick={() => setActiveTab('lifecycle')} className={`px-6 py-2 rounded-xl text-sm font-black transition-all ${activeTab === 'lifecycle' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>تتبع دورة حياة القطع</button>
                    </div>

                    {activeTab === 'inventory' ? (
                        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-premium overflow-hidden">
                            <div className="bg-slate-900 p-5 text-white flex justify-between items-center border-b-4 border-indigo-600">
                                <div className="flex items-center gap-4">
                                    <span className="font-black text-lg">قائمة العهد الحالية: {selectedTech}</span>
                                    <span className="bg-white/20 px-4 py-1 rounded-xl text-xs font-bold border border-white/10">كود الفني: {currentTechCode}</span>
                                </div>
                                <span className="bg-indigo-600 px-6 py-1.5 rounded-full text-xs font-black shadow-lg" style={forceEnNumsStyle}>{custodyItems.length} صنف مسجل</span>
                            </div>
                            
                            <div className="overflow-x-auto">
                                <table className="w-full text-center border-collapse">
                                    <thead className="bg-slate-50 h-14">
                                        <tr className="text-[11px] font-black text-slate-500 uppercase">
                                            <th className="p-3 border-l w-16">م</th>
                                            <th className="p-3 border-l text-right pr-6">نوع الصنف</th>
                                            <th className="p-3 border-l text-right pr-6 min-w-[250px]">بيان الصنف (العهدة)</th>
                                            <th className="p-3 border-l bg-blue-50/50">الصافي الحالي</th>
                                            <th className="p-3 border-l">الوحدة</th>
                                            <th className="p-3 border-l">تاريخ الصرف</th>
                                            <th className="p-3">تاريخ الارتجاع</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-[14px] font-bold text-slate-700">
                                        {custodyItems.map((item, idx) => (
                                            <tr key={idx} className={`border-b hover:bg-indigo-50 transition-colors h-14 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                                                <td className="p-2 border-l text-slate-400" style={forceEnNumsStyle}>{idx + 1}</td>
                                                <td className="p-2 border-l text-right pr-6">
                                                    <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-lg text-[10px] font-black">{item.category}</span>
                                                </td>
                                                <td className="p-2 border-l text-right pr-6 font-black text-slate-900">{item.productName}</td>
                                                <td className="p-2 border-l bg-blue-50/30 text-blue-800 text-lg font-black" style={forceEnNumsStyle}>{item.netBalance}</td>
                                                <td className="p-2 border-l text-slate-500 font-bold">{item.unit || 'عدد'}</td>
                                                <td className="p-2 border-l text-blue-600/70 text-xs" style={forceEnNumsStyle}>{item.firstIssueDate}</td>
                                                <td className="p-2 text-emerald-600/70 text-xs" style={forceEnNumsStyle}>{item.lastReturnDate}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-premium overflow-hidden">
                             <div className="bg-slate-800 p-4 text-white font-black text-center border-b-4 border-amber-500">تتبع السجل الزمني لحركات العهدة التفصيلي</div>
                             <div className="overflow-x-auto">
                                <table className="w-full text-center border-collapse text-sm">
                                    <thead className="bg-slate-100 font-black text-slate-600 h-12 uppercase tracking-tighter">
                                        <tr>
                                            <th className="p-2 border-l">اسم الصنف</th>
                                            <th className="p-2 border-l">النوع</th>
                                            <th className="p-2 border-l">التاريخ</th>
                                            <th className="p-2 border-l">الحالة عند الحركة</th>
                                            <th className="p-2 border-l">النسبة %</th>
                                            <th className="p-2">الكمية</th>
                                        </tr>
                                    </thead>
                                    <tbody className="font-bold text-slate-700">
                                        {custodyItems.flatMap((item: any) => item.history.map((h: any, hIdx: number) => (
                                            <tr key={`${item.productId}-${hIdx}`} className="border-b hover:bg-slate-50 transition-colors">
                                                <td className="p-3 text-right pr-6 border-l font-black text-slate-900">{hIdx === 0 ? item.productName : ''}</td>
                                                <td className="p-3 border-l">
                                                    <span className={`px-4 py-1 rounded-full text-[10px] ${h.type === 'صرف' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                        {h.type === 'صرف' ? <ArrowUpRight size={12} className="inline ml-1"/> : <ArrowDownLeft size={12} className="inline ml-1"/>}
                                                        {h.type}
                                                    </span>
                                                </td>
                                                <td className="p-3 border-l text-slate-500" style={forceEnNumsStyle}>{h.date}</td>
                                                <td className="p-3 border-l">
                                                    <span className={`px-2 py-0.5 rounded text-xs ${h.condition === 'جديد' ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'}`}>{h.condition}</span>
                                                </td>
                                                <td className="p-3 border-l text-indigo-600" style={forceEnNumsStyle}>{h.percent}%</td>
                                                <td className="p-3 font-black text-lg" style={forceEnNumsStyle}>{h.qty}</td>
                                            </tr>
                                        )))}
                                    </tbody>
                                </table>
                             </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const TabBtn: React.FC<{ active: boolean, onClick: () => void, icon: React.ReactNode, label: string }> = ({ active, onClick, icon, label }) => (
    <button onClick={onClick} className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl font-black text-xs transition-all border-b-4 whitespace-nowrap ${active ? 'bg-indigo-600 text-white border-indigo-800 shadow-lg scale-105' : 'bg-transparent text-slate-500 border-transparent hover:bg-slate-50'}`}>{icon} <span>{label}</span></button>
);

const Field: React.FC<{ label: string, icon: React.ReactNode, children: React.ReactNode }> = ({ label, icon, children }) => (
    <div className="flex flex-col gap-1"><label className="text-[10px] font-black text-slate-400 flex items-center gap-1 uppercase">{icon} {label}</label>{children}</div>
);

const CustodyImport: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { products, refreshProducts, user, settings } = useApp();
    const [fileData, setFileData] = useState<any[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const workbook = XLSX.read(evt.target?.result, { type: 'array' });
                const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
                const processed = json.map((row: any, idx: number) => {
                    const barcode = String(row['كود الصنف'] || row.Barcode || row['الكود'] || '').trim();
                    const name = String(row['اسم الصنف'] || row.Name || row['الاسم'] || '').trim();
                    const qty = Number(row['الكمية'] || row.Quantity || 1);
                    const prod = products.find(p => p.barcode === barcode || p.name === name);
                    
                    const techName = row['اسم الفني'] || row.Technician || 'غير محدد';
                    const techCode = row['كود الفني'] || row['كود الموظف'] || '-';
                    const moveType = (row['نوع الحركة'] || '').includes('ارتجاع') ? 'in' : 'out';
                    const moveDate = row['التاريخ'] ? new Date(row['التاريخ']).toISOString() : new Date().toISOString();
                    const refNum = row['رقم المستند'] || row.Ref || `IMP-${Date.now()}-${idx}`;

                    return { 
                        productId: prod?.id, 
                        productName: prod?.name || name, 
                        barcode: prod?.barcode || barcode, 
                        category: prod?.category || '-', 
                        quantity: qty, 
                        isValid: !!prod,
                        condition: row['الحالة'] || 'جديد',
                        percent: row['النسبة'] || '100',
                        unit: row['الوحدة'] || prod?.unit || 'عدد',
                        techName,
                        techCode,
                        moveType,
                        moveDate,
                        refNum
                    };
                });
                setFileData(processed);
            } catch (err) {
                alert('خطأ في قراءة ملف Excel، يرجى التأكد من التنسيق');
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleFinalImport = async () => {
        if (fileData.length === 0) return alert('يرجى رفع ملف أولاً');
        setIsProcessing(true);

        try {
            const movementsGroups: Record<string, any> = {};

            fileData.filter(i => i.isValid).forEach(row => {
                const groupKey = `${row.techName}_${row.moveDate}_${row.refNum}_${row.moveType}`;
                if (!movementsGroups[groupKey]) {
                    movementsGroups[groupKey] = {
                        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                        date: row.moveDate,
                        type: row.moveType,
                        warehouse: 'parts',
                        refNumber: row.refNum,
                        user: user?.name || 'نظام الاستيراد',
                        reason: row.techName,
                        customFields: { employeeCode: row.techCode },
                        items: []
                    };
                }
                movementsGroups[groupKey].items.push({
                    productId: row.productId,
                    productName: row.productName,
                    quantity: row.quantity,
                    oldPartsStatus: row.condition,
                    meterReading: row.percent,
                    unit: row.unit,
                    notes: `استيراد شامل`
                });
            });

            Object.values(movementsGroups).forEach((movement: any) => {
                dbService.saveMovement(movement);
            });

            refreshProducts();
            alert(`تم استيراد ${Object.keys(movementsGroups).length} مستند عهدة بنجاح بنجاح`);
            onBack();
        } catch (err) {
            alert('حدث خطأ أثناء حفظ البيانات');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <GlassCard className="max-w-6xl mx-auto bg-white p-8 border-t-8 border-indigo-600 shadow-2xl rounded-[2.5rem]">
            <div className="flex justify-between items-center mb-8 border-b pb-4">
                <div>
                    <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3"><FileDown className="text-indigo-600" /> استيراد شامل للعهد من Excel</h3>
                    <p className="text-slate-400 font-bold text-xs mt-1">يمكنك رفع ملف يحتوي على فنيين متعددين وعمليات صرف وارتجاع معاً</p>
                </div>
                <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full"><X/></button>
            </div>

            {!fileData.length ? (
                <div className="flex flex-col items-center justify-center p-20 border-4 border-dashed border-slate-100 rounded-[3rem] bg-slate-50/50 hover:bg-indigo-50/30 hover:border-indigo-200 transition-all cursor-pointer group" onClick={() => fileRef.current?.click()}>
                    <div className="p-8 bg-white rounded-full shadow-xl mb-6 group-hover:scale-110 transition-transform">
                        <Upload size={64} className="text-indigo-600"/>
                    </div>
                    <h4 className="text-xl font-black text-slate-700">اختر ملف Excel للبدء</h4>
                    <p className="text-slate-400 font-bold text-sm mt-2 text-center">يجب أن يحتوي الملف على أعمدة: (اسم الفني، كود الفني، نوع الحركة، الكود، الكمية)</p>
                    <input type="file" ref={fileRef} hidden accept=".xlsx,.xls" onChange={handleFileUpload} />
                </div>
            ) : (
                <div className="space-y-6 animate-fade-in">
                    <div className="flex justify-between items-center bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                        <div className="flex items-center gap-4">
                            <CheckCircle2 className="text-emerald-600" size={24}/>
                            <span className="font-black text-indigo-900">تم تحليل {fileData.length} سطر من البيانات</span>
                        </div>
                        <button onClick={() => setFileData([])} className="text-rose-600 font-black text-xs hover:underline flex items-center gap-1"><X size={14}/> إلغاء واختيار ملف آخر</button>
                    </div>

                    <div className="overflow-hidden rounded-3xl border border-slate-200 shadow-sm max-h-[400px] overflow-y-auto">
                        <table className="w-full text-center border-collapse text-xs font-bold">
                            <thead className="bg-slate-900 text-white sticky top-0 z-10">
                                <tr className="h-10">
                                    <th className="p-2">الفني</th>
                                    <th className="p-2">التاريخ</th>
                                    <th className="p-2">النوع</th>
                                    <th className="p-2">الصنف</th>
                                    <th className="p-2">الكمية</th>
                                    <th className="p-2">الحالة</th>
                                    <th className="p-2">تأكيد الصنف</th>
                                </tr>
                            </thead>
                            <tbody>
                                {fileData.map((row, idx) => (
                                    <tr key={idx} className={`border-b h-10 ${row.isValid ? 'bg-white' : 'bg-red-50'}`}>
                                        <td className="p-2">{row.techName} <span className="text-[10px] text-slate-400">({row.techCode})</span></td>
                                        <td className="p-2" style={forceEnNumsStyle}>{new Date(row.moveDate).toLocaleDateString('en-GB')}</td>
                                        <td className="p-2">
                                            <span className={`px-2 py-0.5 rounded ${row.moveType === 'in' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                                {row.moveType === 'in' ? 'ارتجاع' : 'صرف'}
                                            </span>
                                        </td>
                                        <td className="p-2 text-right">{row.productName}</td>
                                        <td className="p-2" style={forceEnNumsStyle}>{row.quantity}</td>
                                        <td className="p-2">{row.condition}</td>
                                        <td className="p-2">
                                            {row.isValid ? 
                                                <CheckCircle2 size={16} className="text-emerald-500 mx-auto"/> : 
                                                <div className="flex items-center gap-1 text-rose-500 justify-center"><AlertCircle size={16}/> <span className="text-[9px]">غير مسجل</span></div>
                                            }
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex gap-4">
                        <button 
                            disabled={isProcessing || !fileData.some(i => i.isValid)}
                            onClick={handleFinalImport} 
                            className="flex-1 bg-indigo-600 text-white py-5 rounded-3xl font-black text-xl shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {isProcessing ? <Activity className="animate-spin"/> : <Save/>}
                            تأكيد ترحيل البيانات الصالحة إلى السجلات
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
