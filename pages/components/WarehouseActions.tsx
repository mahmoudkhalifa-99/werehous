
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { dbService } from '../services/storage';
import { StockMovement, WarehouseType, Product, AppSettings } from '../types';
import { 
    Save, X, Trash2, History as HistoryIcon, Hash, UserCog, 
    Calendar, Clock, Package, PlusCircle, Plus, ChevronDown, Scale, 
    MinusCircle, PlusCircle as PlusIcon, Search, FileText, UserCheck, MessageSquare,
    AlertCircle, FileDown, FileUp, Palette, ArrowDownLeft, ArrowUpRight
} from 'lucide-react';
import { InputModal, GlassCard, ConfirmModal } from './NeumorphicUI';
import * as XLSX from 'xlsx';

const forceEnNumsStyle = {
    fontFamily: 'Inter, sans-serif',
    fontVariantNumeric: 'lining-nums',
    direction: 'ltr' as const,
    fontSize: '15px',
    fontWeight: '800',
    textAlign: 'center' as const
};

const inputClasses = "w-full px-4 py-2.5 border-2 border-slate-100 rounded-2xl text-[14px] font-bold outline-none focus:border-blue-500 bg-white transition-all shadow-inner h-11";
const labelClasses = "text-[11px] font-black text-slate-500 mb-1 flex items-center gap-1.5 pr-2 uppercase tracking-wide";

const Field: React.FC<{ label: string, icon?: React.ReactNode, children: React.ReactNode }> = ({ label, icon, children }) => (
    <div className="flex flex-col gap-1 w-full">
        <label className={labelClasses}>{icon} {label}</label>
        {children}
    </div>
);

const ActionHistoryTable: React.FC<{ 
    warehouse: WarehouseType, 
    mode: string, 
    title: string 
}> = ({ warehouse, mode, title }) => {
    const movements = dbService.getMovements()
        .filter(m => m.warehouse === warehouse)
        .filter(m => m.customFields?.entryMode === mode || (mode === 'in' && m.type === 'in' && !m.customFields?.entryMode))
        .reverse();

    return (
        <div className="mt-8 space-y-3 animate-fade-in no-print">
            <div className="flex items-center gap-2 px-2 text-slate-800">
                <HistoryIcon size={20} className="text-emerald-600"/>
                <h3 className="text-[16px] font-black font-cairo">سجل الحركات التاريخي لـ ({title})</h3>
            </div>
            <div className="bg-white rounded-[2rem] shadow-premium border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto max-h-[500px]">
                    <table className="w-full text-center border-collapse min-w-[1200px]">
                        <thead className="sticky top-0 z-10 bg-slate-900 text-white">
                            <tr className="h-12 text-[12px] font-black uppercase">
                                <th className="p-2 border-l border-slate-700 w-12">م</th>
                                <th className="p-2 border-l border-slate-700">التاريخ</th>
                                <th className="p-2 border-l border-slate-700">رقم الإذن</th>
                                <th className="p-2 border-l border-slate-700 text-right pr-6">اسم الصنف</th>
                                <th className="p-2 border-l border-slate-700">صب</th>
                                <th className="p-2 border-l border-slate-700">معبأ</th>
                                <th className="p-2 border-l border-slate-700">الكمية الإجمالية</th>
                                <th className="p-2 border-l border-slate-700">الوردية</th>
                                <th className="p-2 border-l border-slate-700">أمين المخزن</th>
                                <th className="p-2">الرصيد اللحظي</th>
                            </tr>
                        </thead>
                        <tbody className="text-[13px] font-bold text-slate-700">
                            {movements.flatMap((m, mIdx) => m.items.map((item, iIdx) => (
                                <tr key={`${m.id}-${iIdx}`} className="border-b hover:bg-emerald-50 h-12 transition-colors">
                                    <td className="p-2 border-l" style={forceEnNumsStyle}>{mIdx + 1}</td>
                                    <td className="p-2 border-l" style={forceEnNumsStyle}>{new Date(m.date).toLocaleDateString('en-GB')}</td>
                                    <td className="p-2 border-l font-mono text-indigo-700">{m.refNumber}</td>
                                    <td className="p-2 border-l text-right pr-6 font-black text-slate-900">{item.productName}</td>
                                    <td className="p-2 border-l" style={forceEnNumsStyle}>{item.quantityBulk || '-'}</td>
                                    <td className="p-2 border-l" style={forceEnNumsStyle}>{item.quantityPacked || '-'}</td>
                                    <td className="p-2 border-l text-emerald-800 font-black" style={forceEnNumsStyle}>{item.quantity.toFixed(3)}</td>
                                    <td className="p-2 border-l">{m.customFields?.shift || '-'}</td>
                                    <td className="p-2 border-l">{m.user}</td>
                                    <td className="p-2 bg-slate-50 font-black" style={forceEnNumsStyle}>{item.currentBalance?.toFixed(3)}</td>
                                </tr>
                            )))}
                            {movements.length === 0 && (
                                <tr><td colSpan={10} className="p-16 text-center text-slate-300 font-bold italic text-lg">لا توجد حركات مسجلة حالياً لهذه العملية</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export const StockEntryForm: React.FC<{ 
    warehouse: WarehouseType, 
    mode: 'in' | 'out' | 'adjustment' | 'return' | 'unfinished', 
    label: string, 
    onSuccess: () => void 
}> = ({ warehouse, mode, label, onSuccess }) => {
    const { products, refreshProducts, user, settings, addNotification, can } = useApp();
    const [isFormOpen, setIsFormOpen] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [draftItems, setDraftItems] = useState<any[]>([]);
    const [qtyBulk, setQtyBulk] = useState<string>('');
    const [qtyPacked, setQtyPacked] = useState<string>('');
    
    // خاص بالتسويات: إضافة (+) أو عجز (-)
    const [adjType, setAdjType] = useState<'plus' | 'minus'>('plus');

    const [formHeader, setFormHeader] = useState({
        date: new Date().toISOString().split('T')[0],
        refNumber: dbService.peekNextId(mode === 'in' ? 'receiveVoucher' : 'issueVoucher'),
        shift: 'الأولى',
        storekeeper: user?.name || '',
        notes: ''
    });

    const featureId = mode === 'in' ? 'f_prod_receipt' : mode === 'return' ? 'f_returns' : 'f_settlements';
    const hasEditPermission = can('features', featureId, 'edit');

    const handleAddToDraft = () => {
        if (!selectedProduct) return alert('يرجى اختيار صنف أولاً');
        let finalQty = (Number(qtyBulk) || 0) + (Number(qtyPacked) || 0);
        if (finalQty <= 0) return alert('يرجى إدخال كمية صحيحة');

        setDraftItems(prev => [...prev, {
            productId: selectedProduct.id, productName: selectedProduct.name, productCode: selectedProduct.barcode,
            quantity: finalQty, quantityBulk: Number(qtyBulk) || 0, quantityPacked: Number(qtyPacked) || 0,
            unit: selectedProduct.unit || 'عدد', currentBalance: selectedProduct.stock || 0
        }]);
        setSelectedProduct(null); setSearchTerm(''); setQtyBulk(''); setQtyPacked('');
    };

    const handleFinalSubmit = () => {
        if (draftItems.length === 0) return alert('السلة فارغة');
        
        const typeMapping: any = {
            'in': 'in',
            'return': 'return',
            'out': 'out',
            'unfinished': 'out',
            'adjustment': 'adjustment'
        };

        const realRef = dbService.getNextId(mode === 'in' ? 'receiveVoucher' : 'issueVoucher');
        
        // تعديل البيان تلقائياً ليعكس "عجز" أو "إضافة" لضمان ظهورها في أعمدة التقارير الصحيحة
        let finalReason = formHeader.notes || label;
        if (mode === 'adjustment') {
            finalReason = adjType === 'minus' ? `تسوية عجز: ${finalReason}` : `تسوية إضافة: ${finalReason}`;
        }

        const movement: StockMovement = {
            id: Date.now().toString(),
            date: new Date(formHeader.date).toISOString(),
            type: typeMapping[mode],
            warehouse: warehouse,
            refNumber: realRef,
            user: formHeader.storekeeper,
            reason: finalReason,
            items: draftItems,
            customFields: { ...formHeader, entryMode: mode, adjType: mode === 'adjustment' ? adjType : undefined }
        };

        dbService.saveMovement(movement);
        refreshProducts();
        setDraftItems([]);
        addNotification(`تم ترحيل مستند ${label} بنجاح برقم ${realRef}`, 'success');
    };

    // تحديد ألوان السمة حسب النوع
    const themeColor = mode === 'adjustment' && adjType === 'minus' ? 'rose' : 'emerald';
    const HeaderIcon = mode === 'adjustment' ? (adjType === 'minus' ? MinusCircle : PlusCircle) : (mode === 'out' ? MinusCircle : PlusCircle);

    return (
        <div className="space-y-6 animate-fade-in font-cairo" dir="rtl">
            {isFormOpen ? (
                <div className={`bg-white rounded-[2.5rem] shadow-2xl border-2 border-slate-100 overflow-hidden no-print`}>
                    <div className={`${themeColor === 'rose' ? 'bg-rose-600 border-rose-800' : 'bg-emerald-600 border-emerald-800'} px-8 py-4 text-white flex justify-between items-center shadow-lg border-b-4 transition-colors`}>
                        <div className="flex flex-col">
                            <h3 className="text-2xl font-black flex items-center gap-3">
                                <HeaderIcon size={28}/> {mode === 'adjustment' ? (adjType === 'plus' ? 'تسوية إضافة منتج تام (+)' : 'تسوية عجز منتج تام (-)') : `إدخال بيانات ${label}`}
                            </h3>
                            <p className="text-[10px] opacity-80 font-bold mr-9 uppercase tracking-widest">Finished Products Logistics Module</p>
                        </div>
                        <button 
                            onClick={() => setIsFormOpen(false)}
                            className="bg-white/10 hover:bg-black/20 px-6 py-2 rounded-xl font-black text-sm flex items-center gap-2 border border-white/30 transition-all active:scale-95"
                        >
                            <X size={20}/> إخفاء
                        </button>
                    </div>

                    <div className="p-8 space-y-8">
                        {/* أزرار التبديل الخاصة بالتسوية فقط */}
                        {mode === 'adjustment' && (
                            <div className="flex bg-slate-100 p-2 rounded-3xl max-w-md mx-auto shadow-inner border border-slate-200">
                                <button 
                                    onClick={() => setAdjType('plus')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-sm transition-all ${adjType === 'plus' ? 'bg-emerald-600 text-white shadow-lg scale-105' : 'text-slate-400 hover:bg-white'}`}
                                >
                                    <PlusCircle size={20}/> تسوية إضافة (+)
                                </button>
                                <button 
                                    onClick={() => setAdjType('minus')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-sm transition-all ${adjType === 'minus' ? 'bg-rose-600 text-white shadow-lg scale-105' : 'text-slate-400 hover:bg-white'}`}
                                >
                                    <MinusCircle size={20}/> تسوية عجز (-)
                                </button>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                            <Field label="التاريخ" icon={<Calendar size={13}/>}>
                                <input type="date" value={formHeader.date} onChange={e => setFormHeader({...formHeader, date: e.target.value})} className={inputClasses} style={forceEnNumsStyle}/>
                            </Field>
                            <Field label="رقم الإذن آلي" icon={<Hash size={13}/>}>
                                <input className={`${inputClasses} text-center font-mono bg-slate-50 text-indigo-600 border-indigo-100`} value={formHeader.refNumber} readOnly/>
                            </Field>
                            <Field label="الوردية" icon={<Clock size={13}/>}>
                                <select className={inputClasses} value={formHeader.shift} onChange={e => setFormHeader({...formHeader, shift: e.target.value})}>
                                    {settings.shifts?.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </Field>
                            <Field label="أمين المخزن" icon={<UserCheck size={13}/>}>
                                <select className={inputClasses} value={formHeader.storekeeper} onChange={e => setFormHeader({...formHeader, storekeeper: e.target.value})}>
                                    <option value="">-- اختر المسئول --</option>
                                    {settings.storekeepersFinished?.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </Field>
                            <Field label="بيان الحركة / ملاحظات" icon={<MessageSquare size={13}/>}>
                                <input className={inputClasses} value={formHeader.notes} onChange={e => setFormHeader({...formHeader, notes: e.target.value})} placeholder="اكتب تفاصيل إضافية هنا..."/>
                            </Field>
                        </div>

                        <div className={`${themeColor === 'rose' ? 'bg-rose-900 shadow-rose-200' : 'bg-[#0f172a] shadow-emerald-200'} p-6 rounded-[2.5rem] flex flex-col md:flex-row items-center gap-5 shadow-2xl border-b-8 border-black/40 relative z-20 transition-colors`}>
                            <div className="flex-1 relative w-full">
                                <label className={`text-[11px] font-black ${themeColor === 'rose' ? 'text-rose-200' : 'text-blue-300'} mb-2 block mr-4 uppercase tracking-widest`}>البحث عن صنف التام</label>
                                <div className="relative">
                                    <input 
                                        className={`w-full p-4 pr-12 rounded-2xl border-none outline-none font-bold text-lg transition-all ${selectedProduct ? 'bg-white text-blue-900 ring-4 ring-indigo-500/30' : 'bg-white shadow-inner'}`} 
                                        placeholder="ابحث بالاسم أو الكود..." 
                                        value={searchTerm} 
                                        onChange={e => {setSearchTerm(e.target.value); setSelectedProduct(null);}} 
                                    />
                                    <Search className={`absolute right-4 top-4 ${selectedProduct ? 'text-blue-500' : 'text-slate-300'}`} size={24}/>
                                    {searchTerm && !selectedProduct && (
                                        <div className="absolute top-full left-0 right-0 z-[1000] bg-white border border-slate-200 rounded-3xl shadow-2xl mt-3 max-h-72 overflow-y-auto p-3 animate-fade-in">
                                            {products.filter(p => p.warehouse === warehouse && p.name.includes(searchTerm)).map(p => (
                                                <div key={p.id} onClick={() => {setSelectedProduct(p); setSearchTerm(p.name);}} className="p-4 hover:bg-slate-50 cursor-pointer border-b last:border-0 rounded-2xl flex justify-between items-center group transition-all">
                                                    <div className="flex flex-col"><span className="font-black text-slate-800 group-hover:text-blue-600 transition-colors text-[15px]">{p.name}</span><span className="text-[11px] text-slate-400 font-mono">{p.barcode}</span></div>
                                                    <div className="text-left">
                                                        <span className="bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-xl text-[12px] font-black shadow-sm">رصيد: {p.stock.toFixed(3)}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="w-full md:w-36">
                                <label className={`text-[11px] font-black ${themeColor === 'rose' ? 'text-rose-200' : 'text-blue-300'} mb-1 block text-center uppercase tracking-widest`}>كمية صب</label>
                                <input type="number" className="w-full p-4 rounded-2xl bg-white text-center font-black text-indigo-900 outline-none shadow-xl h-14 text-2xl" value={qtyBulk} onChange={e => setQtyBulk(e.target.value)} style={forceEnNumsStyle} placeholder="0.000"/>
                            </div>
                            <div className="w-full md:w-36">
                                <label className={`text-[11px] font-black ${themeColor === 'rose' ? 'text-rose-200' : 'text-blue-300'} mb-1 block text-center uppercase tracking-widest`}>كمية معبأ</label>
                                <input type="number" className="w-full p-4 rounded-2xl bg-white text-center font-black text-indigo-900 outline-none shadow-xl h-14 text-2xl" value={qtyPacked} onChange={e => setQtyPacked(e.target.value)} style={forceEnNumsStyle} placeholder="0.000"/>
                            </div>
                            <button onClick={handleAddToDraft} className={`${themeColor === 'rose' ? 'bg-rose-500 hover:bg-rose-600' : 'bg-blue-600 hover:bg-blue-700'} text-white p-4 rounded-2xl shadow-2xl active:scale-95 transition-all mt-6 h-14 w-14 flex items-center justify-center border-b-4 border-black/20`}>
                                <Plus size={36} strokeWidth={4}/>
                            </button>
                        </div>

                        {draftItems.length > 0 && (
                            <div className="animate-fade-in space-y-6 pt-4">
                                <div className="bg-[#111827] rounded-[2.5rem] border border-slate-800 overflow-hidden shadow-2xl">
                                    <table className="w-full text-center border-collapse">
                                        <thead className="bg-[#1e293b] text-slate-400 h-14 font-black uppercase text-[12px]">
                                            <tr><th className="p-3 border-l border-slate-700 text-right pr-10 text-white">اسم الصنف المسجل</th><th className="p-3 border-l border-slate-700">صب</th><th className="p-3 border-l border-slate-700">معبأ</th><th className="p-3 border-l border-slate-700 bg-indigo-900/30 text-indigo-400">الإجمالي</th><th className="p-3">حذف</th></tr>
                                        </thead>
                                        <tbody className="font-bold text-slate-700 bg-white">
                                            {draftItems.map((item, idx) => (
                                                <tr key={idx} className="border-b h-16 hover:bg-slate-50 transition-colors">
                                                    <td className="p-3 border-l text-right pr-10 font-black text-slate-900 text-lg">{item.productName}</td>
                                                    <td className="p-3 border-l text-indigo-600 text-lg" style={forceEnNumsStyle}>{item.quantityBulk || '-'}</td>
                                                    <td className="p-3 border-l text-indigo-600 text-lg" style={forceEnNumsStyle}>{item.quantityPacked || '-'}</td>
                                                    <td className="p-3 border-l text-blue-800 text-2xl font-black bg-blue-50/20" style={forceEnNumsStyle}>{item.quantity.toFixed(3)}</td>
                                                    <td className="p-3"><button onClick={() => setDraftItems(draftItems.filter((_, i) => i !== idx))} className="text-red-500 hover:bg-red-50 p-3 rounded-2xl transition-all"><Trash2 size={24}/></button></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <button 
                                    onClick={handleFinalSubmit} 
                                    className={`w-full py-7 ${themeColor === 'rose' ? 'bg-rose-600 hover:bg-rose-700 border-rose-900 shadow-rose-200' : 'bg-emerald-600 hover:bg-emerald-700 border-emerald-900 shadow-emerald-200'} text-white rounded-[2rem] font-black text-3xl shadow-2xl flex items-center justify-center gap-5 transition-all active:scale-[0.98] border-b-[10px]`}
                                >
                                    <Save size={44}/> حفظ وترحيل {mode === 'adjustment' ? (adjType === 'plus' ? 'تسوية الإضافة' : 'تسوية العجز') : label} نهائياً
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="p-4 no-print animate-fade-in mb-4">
                    <button 
                        onClick={() => setIsFormOpen(true)} 
                        className={`bg-${themeColor}-700 text-white px-12 py-4 rounded-[1.5rem] font-black shadow-lg hover:brightness-110 transition-all flex items-center gap-3 border-b-4 border-${themeColor}-900 text-lg`}
                    >
                        <PlusCircle size={24}/> فتح نافذة إدخال {label}
                    </button>
                </div>
            )}
            
            <ActionHistoryTable warehouse={warehouse} mode={mode} title={label} />
        </div>
    );
};

export const StocktakingForm: React.FC<{ warehouse: WarehouseType }> = ({ warehouse }) => {
    const { products, refreshProducts, can, addNotification, settings } = useApp();
    const hasEdit = can('features', 'f_opening_stock', 'edit');
    const today = new Date().toLocaleDateString('en-GB');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const headerTitle = settings.inventoryReportTitle || `شاشة إدخال الجرد اليومي ${new Date().getFullYear()}`;
    const headerBg = settings.inventoryHeaderBg || '#002060';
    const titleColor = settings.inventoryTitleColor || '#ffff00';

    const handleUpdate = (id: string, field: string, val: any) => {
        if (!hasEdit) return alert('ليس لديك صلاحية تعديل أرصدة الجرد');
        const prod = products.find(p => p.id === id);
        if (!prod) return;
        const updated = { 
            ...prod, 
            [field]: val,
            customFields: { ...prod.customFields, [field]: val } 
        };
        dbService.saveProduct(updated);
        refreshProducts();
    };

    const warehouseItems = products.filter(p => p.warehouse === warehouse);

    const getRowBgColor = (p: Product) => {
        if (p.customFields?.rowColor) return p.customFields.rowColor;
        return '#ffffff';
    };

    const handleExport = () => {
        const data = warehouseItems.map((p, idx) => ({
            'م': idx + 1,
            'التاريخ': today,
            'كود دريف': p.barcode,
            'بيان الصنف': p.name,
            'الوحدة': p.unit || 'طن',
            'الجرد': p.initialStockBulk || 0,
            'ملاحظات': p.notes || ''
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Inventory_Daily");
        XLSX.writeFile(wb, `Inventory_${warehouse}_${today.replace(/\//g, '-')}.xlsx`);
        addNotification('تم تصدير ملف الجرد بنجاح', 'success');
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = evt.target?.result;
                const workbook = XLSX.read(data, { type: 'array' });
                const ws = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(ws);
                
                let count = 0;
                jsonData.forEach((row: any) => {
                    const code = String(row['كود دريف'] || row['الكود'] || row['Barcode'] || row['كود الصنف'] || '').trim();
                    const qty = parseFloat(row['الجرد'] || row['Quantity'] || row['الكمية'] || row['رصيد'] || 0);
                    const notes = row['ملاحظات'] || row['Notes'] || '';
                    
                    const p = warehouseItems.find(item => item.barcode === code || item.name === row['بيان الصنف'] || item.name === row['اسم الصنف']);
                    if (p) {
                        dbService.saveProduct({ ...p, initialStockBulk: qty, notes: notes });
                        count++;
                    }
                });
                refreshProducts();
                addNotification(`تم تحديث جرد ${count} صنف من ملف الإكسيل`, 'success');
            } catch (err) { 
                alert('خطأ في معالجة الملف، تأكد من صحة أسماء الأعمدة'); 
            }
            if (e.target) e.target.value = '';
        };
        reader.readAsArrayBuffer(file);
    };

    const ColorPicker = ({ p }: { p: Product }) => (
        <div className="flex items-center gap-1 justify-center no-print">
            <button onClick={() => handleUpdate(p.id, 'rowColor', '#ffff00')} className="w-4 h-4 rounded-full bg-[#ffff00] border border-black/20 hover:scale-125 transition-transform" title="أصفر"></button>
            <button onClick={() => handleUpdate(p.id, 'rowColor', '#90ee90')} className="w-4 h-4 rounded-full bg-[#90ee90] border border-black/20 hover:scale-125 transition-transform" title="أخضر"></button>
            <button onClick={() => handleUpdate(p.id, 'rowColor', '#ffcccb')} className="w-4 h-4 rounded-full bg-[#ffcccb] border border-black/20 hover:scale-125 transition-transform" title="أحمر"></button>
            <button onClick={() => handleUpdate(p.id, 'rowColor', '#add8e6')} className="w-4 h-4 rounded-full bg-[#add8e6] border border-black/20 hover:scale-125 transition-transform" title="أزرق"></button>
            <button onClick={() => handleUpdate(p.id, 'rowColor', '')} className="w-4 h-4 rounded-full bg-white border border-black/20 hover:scale-125 transition-transform" title="مسح اللون"><X size={10} className="text-gray-400"/></button>
        </div>
    );

    return (
        <div className="space-y-0 animate-fade-in font-cairo shadow-2xl rounded-xl overflow-hidden border-2 border-black">
            <div 
                className="py-5 px-8 flex items-center justify-between shadow-lg border-b-2 border-black"
                style={{ backgroundColor: headerBg }}
            >
                <div className="flex gap-3 no-print">
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2 rounded-xl font-black text-sm shadow-xl hover:bg-emerald-700 transition-all active:scale-95 border-b-4 border-emerald-900"
                    >
                        <FileDown size={18}/> استيراد Excel
                    </button>
                    <button 
                        onClick={handleExport}
                        className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-xl font-black text-sm shadow-xl hover:bg-blue-700 transition-all active:scale-95 border-b-4 border-blue-900"
                    >
                        <FileUp size={18}/> تصدير Excel
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls" onChange={handleImport} />
                </div>

                <h2 
                    className="text-3xl font-black tracking-wide flex-1 text-center"
                    style={{ color: titleColor }}
                >
                    {headerTitle}
                </h2>
                
                <div className="w-48"></div>
            </div>

            <div className="overflow-x-auto bg-white">
                <table className="w-full text-center border-collapse">
                    <thead className="bg-[#1f497d] text-white font-bold text-sm">
                        <tr className="h-12">
                            <th className="border border-black w-12">م</th>
                            <th className="border border-black w-12 no-print"><Palette size={16} className="mx-auto"/></th>
                            <th className="border border-black w-32">التاريخ</th>
                            <th className="border border-black w-24">الكود</th>
                            <th className="border border-black text-right pr-6 min-w-[300px]">بيان الصنف</th>
                            <th className="border border-black w-24">الوحدة</th>
                            <th className="border border-black w-40">الجرد</th>
                            <th className="border border-black">ملاحظات</th>
                        </tr>
                    </thead>
                    <tbody className="font-bold text-black text-[14px]">
                        {warehouseItems.map((p, idx) => (
                            <tr 
                                key={p.id} 
                                className={`border-b border-black h-11 transition-colors hover:brightness-95`}
                                style={{ backgroundColor: getRowBgColor(p) }}
                            >
                                <td className="border border-black" style={forceEnNumsStyle}>{idx + 1}</td>
                                <td className="border border-black no-print">
                                    <ColorPicker p={p} />
                                </td>
                                <td className="border border-black" style={forceEnNumsStyle}>{today}</td>
                                <td className="border border-black font-mono" style={forceEnNumsStyle}>{p.barcode}</td>
                                <td className="border border-black text-right pr-6">{p.name}</td>
                                <td className="border border-black">{p.unit || 'طن'}</td>
                                <td className="border border-black p-0">
                                    <input 
                                        type="number" 
                                        step="any"
                                        className={`w-full h-full bg-transparent text-center font-black text-lg outline-none border-none focus:ring-2 focus:ring-blue-500 disabled:opacity-80`}
                                        defaultValue={p.initialStockBulk || 0}
                                        onBlur={e => handleUpdate(p.id, 'initialStockBulk', parseFloat(e.target.value) || 0)}
                                        disabled={!hasEdit}
                                        style={forceEnNumsStyle}
                                    />
                                </td>
                                <td className="border border-black text-right px-4">
                                    <input 
                                        type="text" 
                                        className="w-full bg-transparent border-none outline-none text-xs font-bold text-slate-600"
                                        defaultValue={p.notes || ''}
                                        placeholder="-"
                                        onBlur={e => handleUpdate(p.id, 'notes', e.target.value)}
                                        disabled={!hasEdit}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {!hasEdit && (
                <div className="bg-amber-50 p-4 border-t border-amber-200 flex items-center gap-3 text-amber-800 no-print">
                    <AlertCircle size={20}/>
                    <span className="font-black text-sm">تنبيه: أنت في وضع العرض فقط. لا تملك صلاحية تعديل أرصدة الجرد.</span>
                </div>
            )}
        </div>
    );
};
