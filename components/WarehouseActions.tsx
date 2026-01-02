import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { GlassButton, GlassInput, InputModal, GlassCard, ConfirmModal } from './NeumorphicUI';
import { dbService } from '../services/storage';
import { StockMovement, WarehouseType, Product, AppSettings } from '../types';
import { 
    Save, Search, CheckCircle, X, Plus, Trash2, Edit2,
    History, Hash, UserCog, Building2, Layers, 
    Warehouse, Truck, Calendar, Clock, Package, 
    ChevronLeft, User as UserIcon, Settings2, Wrench, 
    Timer, Gauge, ClipboardCheck, Tag, Briefcase, 
    Activity, RotateCcw, AlertCircle, MapPin, 
    ArrowRightLeft, FileText, Printer, FileDown, CheckCircle2,
    PlusCircle, FileUp, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Type, ChevronDown, RotateCcw as ResetIcon,
    ArrowUpRight, ArrowDownLeft, ClipboardSignature, ShoppingCart
} from 'lucide-react';

const forceEnNumsStyle = {
    fontFamily: 'Inter, sans-serif',
    fontVariantNumeric: 'lining-nums',
    direction: 'ltr' as const,
    fontSize: '12px',
    fontWeight: '700'
};

const inputClasses = "w-full px-2 py-1 border border-slate-300 rounded-md text-[13px] bg-white outline-none focus:border-blue-500 font-bold shadow-sm h-9 transition-all";
const labelClasses = "text-[11px] font-black text-slate-600 mb-0.5 flex items-center gap-1 uppercase pr-1 tracking-tight";

// Excel-style Ribbon
const ExcelRibbon = () => (
    <div className="bg-[#f3f4f6] border border-slate-300 rounded-t-xl p-1 flex items-center gap-1 overflow-x-auto no-print shadow-sm" dir="ltr">
        <div className="flex items-center gap-1 border-r border-slate-300 pr-2 mr-1">
            <div className="bg-white border border-slate-300 rounded px-2 py-0.5 flex items-center gap-2 text-[10px] font-bold w-24 justify-between">Calibri <ChevronDown size={10}/></div>
            <div className="bg-white border border-slate-300 rounded px-2 py-0.5 flex items-center gap-2 text-[10px] font-bold w-10 justify-between">12 <ChevronDown size={10}/></div>
        </div>
        <div className="flex items-center gap-0.5 border-r border-slate-300 pr-2 mr-1">
            <button className="p-1 hover:bg-slate-200 rounded border border-slate-300 bg-white shadow-sm"><Bold size={12}/></button>
            <button className="p-1 hover:bg-slate-200 rounded border border-slate-300 bg-white shadow-sm"><Italic size={12}/></button>
            <button className="p-1 hover:bg-slate-200 rounded border border-slate-300 bg-white shadow-sm"><Underline size={12}/></button>
        </div>
        <button className="ml-auto text-red-500 hover:rotate-180 transition-transform p-1"><ResetIcon size={16}/></button>
    </div>
);

// المكون العام لسجل الحركات
const ActionHistoryTable: React.FC<{ 
    warehouse: WarehouseType, 
    mode: string, 
    title: string,
    refreshTrigger?: number 
}> = ({ warehouse, mode, title, refreshTrigger: externalTrigger = 0 }) => {
    const { refreshProducts } = useApp();
    const [localRefreshTrigger, setLocalRefreshTrigger] = useState(0);
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean, id: string }>({ isOpen: false, id: '' });

    const movements = useMemo(() => {
        return dbService.getMovements()
            .filter(m => m.warehouse === warehouse)
            .filter(m => {
                if (mode === 'transfer_in') return m.type === 'transfer' && m.reason?.includes('إضافة');
                if (mode === 'transfer_out') return m.type === 'transfer' && m.reason?.includes('خصم');
                if (mode === 'adj_in') return m.type === 'adjustment' && !m.reason?.includes('خصم') && !m.reason?.includes('عجز');
                if (mode === 'adj_out') return m.type === 'adjustment' && (m.reason?.includes('خصم') || m.reason?.includes('عجز'));
                if (mode === 'return') return m.type === 'return' || (m.type === 'in' && m.reason?.includes('مرتجع'));
                if (mode === 'in') return m.type === 'in' && !m.reason?.includes('مرتجع');
                if (mode === 'out') return m.type === 'out';
                if (mode === 'adjustment') return m.type === 'adjustment';
                if (mode === 'unfinished') return m.customFields?.entryMode === 'unfinished';
                return true;
            })
            .reverse();
    }, [warehouse, mode, localRefreshTrigger, externalTrigger]);

    const isFinishedWarehouse = warehouse === 'finished';
    const isSpecialLayout = !isFinishedWarehouse && (mode.startsWith('transfer') || mode.startsWith('adj') || mode === 'return');

    const handleDelete = () => {
        if (!deleteModal.id) return;
        dbService.deleteMovement(deleteModal.id);
        refreshProducts();
        setLocalRefreshTrigger(p => p + 1);
        setDeleteModal({ isOpen: false, id: '' });
        alert('تم حذف المستند بنجاح وتحديث الأرصدة.');
    };

    return (
        <div className="mt-8 space-y-3 animate-fade-in no-print">
            <ConfirmModal 
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, id: '' })}
                onConfirm={handleDelete}
                title="حذف مستند"
                message="هل أنت متأكد من حذف هذا المستند نهائياً؟ سيتم التراجع عن تأثير الكميات في المخزن."
                confirmText="حذف"
                cancelText="إلغاء"
            />

            <div className="flex items-center gap-2 px-2 text-slate-800">
                <History size={18} className="text-blue-600"/>
                <h3 className="text-[14px] font-black font-cairo">
                    {isFinishedWarehouse ? `السجل التاريخي لعمليات (${title})` : `سجل الحركات التاريخي لـ (${title})`}
                </h3>
            </div>
            <div className="bg-white rounded-xl shadow-premium border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto max-h-[500px]">
                    <table className="w-full text-center border-collapse min-w-[2000px]">
                        <thead className="sticky top-0 z-10 bg-slate-900 text-white">
                            {isFinishedWarehouse ? (
                                <tr className="h-11 text-[11px] font-black uppercase">
                                    <th className="p-2 border-l border-slate-700 w-12">م</th>
                                    <th className="p-2 border-l border-slate-700">التاريخ</th>
                                    <th className="p-2 border-l border-slate-700">كود الصنف</th>
                                    <th className="p-2 border-l border-slate-700 text-right pr-4">اسم الصنف</th>
                                    <th className="p-2 border-l border-slate-700">تاريخ الإنتاج</th>
                                    <th className="p-2 border-l border-slate-700">الوحدة</th>
                                    <th className="p-2 border-l border-slate-700">الكمية</th>
                                    <th className="p-2 border-l border-slate-700">البيان / السبب</th>
                                    <th className="p-2 border-l border-slate-700">المستخدم</th>
                                    <th className="p-2 w-24">الإجراءات</th>
                                </tr>
                            ) : isSpecialLayout ? (
                                <tr className="h-11 text-[11px] font-black uppercase">
                                    <th className="p-2 border-l border-slate-700 w-12">م</th>
                                    <th className="p-2 border-l border-slate-700">التاريخ</th>
                                    <th className="p-2 border-l border-slate-700">رقم الإذن</th>
                                    <th className="p-2 border-l border-slate-700">كود الصنف</th>
                                    <th className="p-2 border-l border-slate-700 text-right pr-4">اسم الصنف</th>
                                    <th className="p-2 border-l border-slate-700">الوحدة</th>
                                    <th className="p-2 border-l border-slate-700">{mode === 'return' ? 'كمية المرتجع' : (mode.includes('in') ? 'الكمية (إضافة)' : 'الكمية (خصم)')}</th>
                                    <th className="p-2 border-l border-slate-700">المخزن التابع</th>
                                    <th className="p-2 border-l border-slate-700">المجموعة السلعية</th>
                                    <th className="p-2 border-l border-slate-700">{(mode.startsWith('adj') || mode === 'return') ? 'سبب الحركة / المورد' : 'المخزن المحول له'}</th>
                                    <th className="p-2 border-l border-slate-700">أمين المخزن</th>
                                    <th className="p-2 border-l border-slate-700">القائم بالتسكين / المستلم</th>
                                    <th className="p-2 border-l border-slate-700">الرصيد الحالي</th>
                                    <th className="p-2">ملاحظات</th>
                                </tr>
                            ) : (
                                <tr className="h-11 text-[11px] font-black uppercase">
                                    <th className="p-2 border-l border-slate-700 w-12">م</th>
                                    <th className="p-2 border-l border-slate-700">التاريخ</th>
                                    <th className="p-2 border-l border-slate-700">رقم الإذن</th>
                                    <th className="p-2 border-l border-slate-700">الإدارة</th>
                                    <th className="p-2 border-l border-slate-700">القسم</th>
                                    <th className="p-2 border-l border-slate-700">كود الموظف</th>
                                    <th className="p-2 border-l border-slate-700">المستلم/المورد</th>
                                    <th className="p-2 border-l border-slate-700">أمر الشغل</th>
                                    <th className="p-2 border-l border-slate-700">كود المعدة</th>
                                    <th className="p-2 border-l border-slate-700">الوردية</th>
                                    <th className="p-2 border-l border-slate-700">الحالة</th>
                                    <th className="p-2 border-l border-slate-700">كود الصنف</th>
                                    <th className="p-2 border-l border-slate-700 text-right pr-4">اسم الصنف</th>
                                    <th className="p-2 border-l border-slate-700">الكمية</th>
                                    <th className="p-2 border-l border-slate-700">الوحدة</th>
                                    <th className="p-2 border-l border-slate-700">العداد</th>
                                    <th className="p-2 border-l border-slate-700">الرصيد اللحظي</th>
                                    <th className="p-2 border-l border-slate-700">أمين المخزن</th>
                                    <th className="p-2">المدة/الفرق</th>
                                </tr>
                            )}
                        </thead>
                        <tbody className="text-[12px] font-bold text-slate-700">
                            {movements.flatMap((m, mIdx) => m.items.map((item, iIdx) => (
                                <tr key={`${m.id}-${iIdx}`} className="border-b hover:bg-blue-50 h-10 transition-colors">
                                    {isFinishedWarehouse ? (
                                        <>
                                            <td className="p-2 border-l" style={forceEnNumsStyle}>{mIdx + 1}</td>
                                            <td className="p-2 border-l" style={forceEnNumsStyle}>{new Date(m.date).toLocaleDateString('en-GB')}</td>
                                            <td className="p-2 border-l font-mono text-[10px] text-slate-400">{item.productCode}</td>
                                            <td className="p-2 border-l text-right pr-4 font-black text-slate-900">{item.productName}</td>
                                            <td className="p-2 border-l font-bold text-indigo-600" style={forceEnNumsStyle}>{item.productionDate || '-'}</td>
                                            <td className="p-2 border-l text-slate-400">{item.unit}</td>
                                            <td className="p-2 border-l text-blue-800 font-black text-sm" style={forceEnNumsStyle}>{item.quantity}</td>
                                            <td className="p-2 border-l text-right pr-4">{m.reason || m.customFields?.notes || '-'}</td>
                                            <td className="p-2 border-l">{m.user}</td>
                                            <td className="p-2 flex justify-center gap-1">
                                                <button onClick={() => alert('خاصية التعديل ستكون متاحة قريباً')} className="p-1.5 text-blue-500 hover:bg-blue-100 rounded transition-colors" title="تعديل"><Edit2 size={14}/></button>
                                                <button onClick={() => setDeleteModal({ isOpen: true, id: m.id })} className="p-1.5 text-red-500 hover:bg-red-100 rounded transition-colors" title="حذف"><Trash2 size={14}/></button>
                                            </td>
                                        </>
                                    ) : isSpecialLayout ? (
                                        <>
                                            <td className="p-2 border-l" style={forceEnNumsStyle}>{mIdx + 1}</td>
                                            <td className="p-2 border-l" style={forceEnNumsStyle}>{new Date(m.date).toLocaleDateString('en-GB')}</td>
                                            <td className="p-2 border-l font-mono text-blue-700">{m.refNumber}</td>
                                            <td className="p-2 border-l font-mono text-[10px] text-slate-400">{item.productCode}</td>
                                            <td className="p-2 border-l text-right pr-4 font-black text-slate-900">{item.productName}</td>
                                            <td className="p-2 border-l text-slate-400">{item.unit}</td>
                                            <td className="p-2 border-l text-blue-800 font-black text-sm" style={forceEnNumsStyle}>{item.quantity}</td>
                                            <td className="p-2 border-l">{m.customFields?.subWarehouse || '-'}</td>
                                            <td className="p-2 border-l">{m.customFields?.goodsGroup || '-'}</td>
                                            <td className="p-2 border-l font-black text-indigo-700">{m.reason || '-'}</td>
                                            <td className="p-2 border-l">{m.user || '-'}</td>
                                            <td className="p-2 border-l">{m.customFields?.housingOfficer || m.customFields?.recipientName || '-'}</td>
                                            <td className="p-2 border-l bg-slate-50 font-black" style={forceEnNumsStyle}>{item.currentBalance?.toFixed(2)}</td>
                                            <td className="p-2 text-[10px] text-slate-400 italic truncate max-w-[150px]">{item.notes || '-'}</td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="p-2 border-l" style={forceEnNumsStyle}>{mIdx + 1}</td>
                                            <td className="p-2 border-l" style={forceEnNumsStyle}>{new Date(m.date).toLocaleDateString('en-GB')}</td>
                                            <td className="p-2 border-l font-mono text-blue-700">{m.refNumber}</td>
                                            <td className="p-2 border-l">{m.customFields?.department || '-'}</td>
                                            <td className="p-2 border-l">{m.customFields?.['section'] || '-'}</td>
                                            <td className="p-2 border-l font-mono text-[10px]">{m.customFields?.employeeCode || '-'}</td>
                                            <td className="p-2 border-l text-right pr-4">{m.reason}</td>
                                            <td className="p-2 border-l font-mono text-[10px] text-purple-700">{m.customFields?.workOrderNo || '-'}</td>
                                            <td className="p-2 border-l font-mono text-[10px] text-indigo-700">{m.customFields?.equipmentCode || '-'}</td>
                                            <td className="p-2 border-l">{m.customFields?.shift || '-'}</td>
                                            <td className="p-2 border-l text-[10px]">{m.customFields?.issueStatus || '-'}</td>
                                            <td className="p-2 border-l font-mono text-[10px] text-slate-400">{item.productCode}</td>
                                            <td className="p-2 border-l text-right pr-4 font-black text-slate-900">{item.productName}</td>
                                            <td className="p-2 border-l text-blue-800 font-black text-sm" style={forceEnNumsStyle}>{item.quantity}</td>
                                            <td className="p-2 border-l text-slate-400">{item.unit}</td>
                                            <td className="p-2 border-l" style={forceEnNumsStyle}>{m.customFields?.meterReading || '-'}</td>
                                            <td className="p-2 border-l bg-slate-50 font-black" style={forceEnNumsStyle}>{item.currentBalance?.toFixed(2)}</td>
                                            <td className="p-2 border-l">{m.user}</td>
                                            <td className="p-2 text-[10px] font-mono">{m.customFields?.timeDiff || '-'}</td>
                                        </>
                                    )}
                                </tr>
                            )))}
                            {movements.length === 0 && (
                                <tr><td colSpan={isFinishedWarehouse ? 10 : (isSpecialLayout ? 14 : 19)} className="p-16 text-center text-slate-300 font-bold italic text-lg">لا توجد سجلات محفوظة حالياً</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// Form Component
export const StockEntryForm: React.FC<{ 
    warehouse: WarehouseType, 
    mode: 'in' | 'out' | 'adjustment' | 'return' | 'unfinished' | 'transfer_in' | 'transfer_out' | 'adj_in' | 'adj_out', 
    label: string, 
    onSuccess: () => void 
}> = ({ warehouse, mode, label, onSuccess }) => {
    const { products, refreshProducts, user, settings, updateSettings } = useApp();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [draftItems, setDraftItems] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(true);
    const [qtyValue, setQtyValue] = useState<string>('');
    const [qtyBulk, setQtyBulk] = useState<string>('');
    const [qtyPacked, setQtyPacked] = useState<string>('');
    const [productionDate, setProductionDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

    // Check if we should use the simple "Production Receipt" style layout
    const isFinishedWarehouse = warehouse === 'finished';
    
    const isTransfer = mode === 'transfer_in' || mode === 'transfer_out';
    const isSettlement = mode === 'adj_in' || mode === 'adj_out' || (isFinishedWarehouse && mode === 'adjustment');
    const isReturn = mode === 'return';
    const isSpecialLayout = !isFinishedWarehouse && (isTransfer || isSettlement || isReturn);

    const voucherType = (mode === 'in' || mode === 'return' || mode === 'transfer_in' || mode === 'adj_in') ? 'receiveVoucher' : 'issueVoucher';

    const [header, setHeader] = useState({
        date: new Date().toISOString().split('T')[0],
        refNumber: dbService.peekNextId(voucherType),
        subWarehouse: warehouse === 'parts' ? 'قطع الغيار الرئيسية' : (warehouse === 'raw' ? 'مخزن الخامات' : 'المخزن الرئيسي'),
        goodsGroup: 'قطع غيار ومهمات',
        storekeeper: user?.name || '',
        settlementReason: '',
        housingOfficer: '',
        recipientName: '',
        receiverWarehouse: '',
        supplierName: '',
        notes: '',
        department: '',
        section: '',
        employeeCode: '',
        workOrderNo: '',
        equipmentCode: '',
        meterReading: '',
        shift: 'الأولى',
        issueStatus: mode.includes('in') ? 'توريد عادي' : 'صرف عادي',
        oldPartsStatus: 'لم يتم الاستلام',
        entryTime: '',
        exitTime: '',
        paperVoucher: ''
    });

    const [inputModal, setInputModal] = useState<{isOpen: boolean, listKey: keyof AppSettings | null, title: string}>({
        isOpen: false,
        listKey: null,
        title: ''
    });

    const timeDiff = useMemo(() => {
        if (!header.entryTime || !header.exitTime) return '00:00';
        const [h1, m1] = header.entryTime.split(':').map(Number);
        const [h2, m2] = header.exitTime.split(':').map(Number);
        let diffMinutes = (h2 * 60 + m2) - (h1 * 60 + m1);
        if (diffMinutes < 0) diffMinutes += 24 * 60; 
        const h = Math.floor(diffMinutes / 60).toString().padStart(2, '0');
        const m = (diffMinutes % 60).toString().padStart(2, '0');
        return `${h}:${m}`;
    }, [header.entryTime, header.exitTime]);

    const filteredProducts = useMemo(() => {
        const term = (searchTerm || '').toString().trim().toLowerCase()
            .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/[\u064B-\u0652]/g, ''); 
        if (!term || selectedProduct) return [];
        return products.filter(p => {
            const matchesWh = p.warehouse === warehouse;
            const pName = (p.name || '').toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/[\u064B-\u0652]/g, '');
            return matchesWh && (pName.includes(term) || p.barcode.includes(term));
        }).slice(0, 50);
    }, [products, searchTerm, selectedProduct, warehouse]);

    const handleAddItemToList = (key: keyof AppSettings, value: string) => {
        const currentList = (settings[key] as string[]) || [];
        if (value && !currentList.includes(value)) {
            updateSettings({ ...settings, [key]: [...currentList, value] });
            setHeader(prev => ({ ...prev, [getFieldNameFromKey(key)]: value }));
        }
    };

    const getFieldNameFromKey = (key: keyof AppSettings): string => {
        const map: Record<string, string> = {
            partsSubWarehouses: 'subWarehouse',
            departments: 'department',
            storekeepersParts: 'storekeeper',
            storekeepersRaw: 'storekeeper',
            storekeepersFinished: 'storekeeper',
            shifts: 'shift',
            partsIssueTypes: 'issueStatus',
            partsOldPartsStatuses: 'oldPartsStatus'
        };
        return map[key] || '';
    };

    const handleAddToDraft = () => {
        if (!selectedProduct) return alert('يرجى اختيار صنف أولاً');
        
        let finalQty = 0;
        let bQty = 0;
        let pQty = 0;

        if (isFinishedWarehouse) {
            bQty = Number(qtyBulk) || 0;
            pQty = Number(qtyPacked) || 0;
            finalQty = bQty + pQty;
            if (finalQty <= 0) return alert('يرجى إدخل كمية صحيحة (صب أو معبأ)');
        } else {
            finalQty = Number(qtyValue);
            if (!qtyValue || finalQty <= 0) return alert('يرجى إدخال كمية صحيحة');
        }

        const newItem = {
            productId: selectedProduct.id,
            productName: selectedProduct.name,
            productCode: selectedProduct.barcode,
            quantity: finalQty,
            quantityBulk: bQty,
            quantityPacked: pQty,
            productionDate: isFinishedWarehouse ? productionDate : undefined,
            unit: selectedProduct.unit || 'عدد',
            currentBalance: selectedProduct.stock || 0,
            notes: header.notes,
            ...header
        };

        setDraftItems(prev => [...prev, newItem]);
        setSelectedProduct(null);
        setSearchTerm('');
        setQtyValue('');
        setQtyBulk('');
        setQtyPacked('');
    };

    const handleFinalSubmit = () => {
        if (draftItems.length === 0) return alert('يرجى إضافة أصناف للجدول أولاً');
        const realRefNumber = dbService.getNextId(voucherType);

        let moveType: any = 'out';
        if (mode === 'in' || mode === 'return' || mode === 'transfer_in' || mode === 'adj_in') moveType = (mode === 'return' ? 'return' : (mode === 'adj_in' ? 'adjustment' : 'in'));
        if (mode === 'adjustment' || mode === 'adj_out') moveType = 'adjustment';
        if (isTransfer) moveType = 'transfer';

        const movement: StockMovement = {
            id: Date.now().toString(),
            date: new Date(header.date).toISOString(),
            type: moveType,
            warehouse: warehouse,
            refNumber: realRefNumber,
            user: header.storekeeper || user?.name || 'admin',
            reason: isSpecialLayout ? (isReturn ? `مرتجع من: ${header.supplierName}` : (isSettlement ? `تسوية: ${header.settlementReason}` : `تحويل: ${header.receiverWarehouse}`)) : (isFinishedWarehouse ? (header.notes || label) : (header.recipientName || label)),
            items: draftItems.map(item => ({ ...item, currentBalance: 0 })),
            customFields: { ...header, refNumber: realRefNumber, timeDiff, entryMode: mode }
        };

        dbService.saveMovement(movement);
        refreshProducts();
        setDraftItems([]);
        setHistoryRefreshKey(prev => prev + 1); // Trigger history table refresh
        alert(`تم ترحيل مستند ${label} بنجاح رقم: ${realRefNumber}`);
        onSuccess();
    };

    const renderDropdown = (label: string, field: keyof typeof header, listKey: keyof AppSettings, icon: React.ReactNode) => (
        <div className="flex flex-col gap-0.5">
            <label className={labelClasses}>{icon} {label}</label>
            <div className="flex gap-0.5">
                <select className={`${inputClasses} flex-1 appearance-none bg-no-repeat bg-left pl-6`} style={{backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'currentColor\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")', backgroundSize: '12px'}} value={header[field] as string} onChange={e => setHeader({...header, [field]: e.target.value})}>
                    <option value="">-- اختر --</option>
                    {(settings[listKey] as string[])?.map(item => <option key={item} value={item}>{item}</option>)}
                </select>
                <button onClick={() => setInputModal({ isOpen: true, listKey, title: `إضافة ${label} جديد` })} className="bg-blue-600 text-white w-9 h-9 rounded-md flex items-center justify-center hover:bg-blue-700 shadow-sm transition-colors shrink-0"><Plus size={16}/></button>
            </div>
        </div>
    );

    const storekeeperListKey = warehouse === 'parts' ? 'storekeepersParts' : (warehouse === 'raw' ? 'storekeepersRaw' : 'storekeepersFinished');
    
    // Theme colors for Finished Warehouse
    const getThemeColor = () => {
        if (mode === 'adjustment' || mode.startsWith('adj')) return 'bg-orange-500';
        if (mode === 'return') return 'bg-red-600';
        if (mode === 'unfinished') return 'bg-amber-600';
        return mode.includes('out') ? 'bg-[#f4511e]' : 'bg-[#059669]';
    };
    
    const themeColor = getThemeColor();

    if (isFinishedWarehouse) {
        return (
            <div className="space-y-0 animate-fade-in" dir="rtl">
                <ExcelRibbon />
                <InputModal 
                    isOpen={inputModal.isOpen} 
                    onClose={() => setInputModal({ isOpen: false, listKey: null, title: '' })} 
                    onSave={(val) => inputModal.listKey && handleAddItemToList(inputModal.listKey, val)}
                    title={inputModal.title}
                />

                {isOpen ? (
                    <div className="bg-[#f3f4f6]/70 border-x border-b border-slate-300 shadow-2xl no-print relative overflow-visible rounded-b-xl mb-4">
                        <div className={`${themeColor} px-4 py-2.5 text-white flex justify-between items-center shadow-lg relative z-[200]`}>
                            <div className="flex items-center gap-3">
                                <div className="p-1 bg-white/20 rounded-lg">
                                    <PlusCircle size={20} className="text-white"/>
                                </div>
                                <h3 className="text-[15px] font-black font-cairo tracking-tight">نافذة إدخال: {label}</h3>
                            </div>
                            <span className="bg-black/20 px-3 py-1 rounded-full text-[11px] font-bold">قسم المنتج التام</span>
                            <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 px-3 py-1 rounded-lg transition-all flex items-center gap-2 text-[12px] font-bold border border-white/30">
                                إخفاء حقول الإدخال <X size={16}/>
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                <Field label="التاريخ" icon={<Calendar size={13}/>}>
                                    <input type="date" value={header.date} onChange={e => setHeader({...header, date: e.target.value})} className={inputClasses} style={forceEnNumsStyle}/>
                                </Field>
                                <Field label="رقم الإذن" icon={<Hash size={13}/>}>
                                    <input value={header.refNumber} readOnly className={`${inputClasses} text-center font-mono bg-slate-100 text-slate-600 border-dashed cursor-not-allowed`} />
                                </Field>
                                {renderDropdown("الوردية", "shift", "shifts", <Clock size={13}/>)}
                                {renderDropdown("أمين المخزن", "storekeeper", storekeeperListKey as any, <UserCog size={13}/>)}
                                <Field label="البيان / ملاحظة" icon={<FileText size={13}/>}>
                                    <input className={inputClasses} value={header.notes} onChange={e => setHeader({...header, notes: e.target.value})} placeholder="أدخل تفاصيل إضافية..." />
                                </Field>
                            </div>

                            <div className="bg-[#0f172a] rounded-[3rem] p-4 flex flex-col md:flex-row items-center gap-4 shadow-2xl border-b-4 border-slate-900 relative z-[300]">
                                <div className="flex-1 relative w-full">
                                    <label className="text-[10px] font-black text-slate-400 mb-1 block mr-2">البحث عن الصنف (كود أو اسم)</label>
                                    <div className="relative">
                                        <input 
                                            className={`w-full p-2.5 pr-10 rounded-xl border border-slate-700 bg-slate-900 text-white outline-none font-bold text-sm focus:ring-2 focus:ring-blue-500 transition-all ${selectedProduct ? 'border-blue-500 ring-2 ring-blue-500/20' : ''}`} 
                                            placeholder="ابحث هنا..." 
                                            value={searchTerm} 
                                            onChange={e => { setSearchTerm(e.target.value); if(selectedProduct) setSelectedProduct(null); }} 
                                        />
                                        <Search className="absolute right-3 top-2.5 text-slate-500" size={18}/>
                                        {searchTerm && !selectedProduct && (
                                            <div className="absolute top-full left-0 right-0 z-[1000] bg-white border border-blue-400 rounded-2xl shadow-2xl mt-2 max-h-72 overflow-y-auto p-2">
                                                {filteredProducts.map(p => (
                                                    <div 
                                                        key={p.id} 
                                                        onMouseDown={(e) => { e.preventDefault(); setSelectedProduct(p); setSearchTerm(p.name); }} 
                                                        className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-0 flex justify-between items-center rounded-xl transition-all"
                                                    >
                                                        <div className="flex flex-col">
                                                            <span className="font-black text-slate-800">{p.name}</span>
                                                            <span className="text-[11px] text-slate-400 font-mono">{p.barcode}</span>
                                                        </div>
                                                        <span className="bg-blue-100 text-blue-800 px-3 py-1.5 rounded-lg text-[11px] font-black">رصيد: {p.stock}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="w-full md:w-32">
                                    <label className="text-[10px] font-black text-slate-400 mb-1 block text-center">الكمية (صب)</label>
                                    <input type="number" className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-900 text-white text-center font-black outline-none focus:ring-2 focus:ring-blue-500" value={qtyBulk} onChange={e => setQtyBulk(e.target.value)} placeholder="0.000" style={forceEnNumsStyle}/>
                                </div>

                                <div className="w-full md:w-32">
                                    <label className="text-[10px] font-black text-slate-400 mb-1 block text-center">الكمية (معبأ)</label>
                                    <input type="number" className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-900 text-white text-center font-black outline-none focus:ring-2 focus:ring-blue-500" value={qtyPacked} onChange={e => setQtyPacked(e.target.value)} placeholder="0.000" style={forceEnNumsStyle}/>
                                </div>

                                <div className="w-full md:w-40">
                                    <label className="text-[10px] font-black text-slate-400 mb-1 block text-center">تاريخ الإنتاج</label>
                                    <input type="date" className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-900 text-white text-center font-black outline-none focus:ring-2 focus:ring-blue-500" value={productionDate} onChange={e => setProductionDate(e.target.value)} style={forceEnNumsStyle}/>
                                </div>

                                <button 
                                    onClick={handleAddToDraft} 
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-2xl shadow-xl flex items-center justify-center transition-all active:scale-95 shrink-0"
                                    style={{ marginTop: '16px' }}
                                >
                                    <Plus size={32} strokeWidth={3}/>
                                </button>
                            </div>

                            {draftItems.length > 0 && (
                                <div className="space-y-4 pt-4 animate-fade-in">
                                    <div className="bg-[#111827] rounded-[2rem] border border-slate-800 overflow-hidden shadow-2xl">
                                        <table className="w-full text-center text-[13px] border-collapse">
                                            <thead className="bg-[#111827] text-slate-300 h-12 font-black uppercase tracking-tighter">
                                                <tr>
                                                    <th className="p-3 border-l border-slate-700 text-right pr-8 text-white">الصنف المضاف</th>
                                                    <th className="p-3 border-l border-slate-700">الكمية</th>
                                                    <th className="p-3 border-l border-slate-700">صب</th>
                                                    <th className="p-3 border-l border-slate-700">معبأ</th>
                                                    <th className="p-3 border-l border-slate-700">الوحدة</th>
                                                    <th className="p-3">حذف</th>
                                                </tr>
                                            </thead>
                                            <tbody className="font-bold bg-white text-slate-800">
                                                {draftItems.map((item, idx) => (
                                                    <tr key={idx} className="border-b h-12 hover:bg-slate-50 transition-colors">
                                                        <td className="p-3 border-l text-right pr-8 font-black text-slate-900">{item.productName}</td>
                                                        <td className="p-3 border-l text-blue-700 font-black text-[16px]" style={forceEnNumsStyle}>{item.quantity}</td>
                                                        <td className="p-3 border-l text-gray-500" style={forceEnNumsStyle}>{item.quantityBulk}</td>
                                                        <td className="p-3 border-l text-gray-500" style={forceEnNumsStyle}>{item.quantityPacked}</td>
                                                        <td className="p-3 border-l text-slate-400 font-medium">{item.unit}</td>
                                                        <td className="p-3">
                                                            <button onClick={() => setDraftItems(prev => prev.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 p-2"><Trash2 size={18}/></button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <button onClick={handleFinalSubmit} className={`w-full py-5 ${themeColor} hover:brightness-110 text-white rounded-3xl font-black text-2xl shadow-2xl flex items-center justify-center gap-4 transition-all active:scale-[0.98] border-b-8 border-black/20 mt-4`}>
                                        <Save size={32}/> ترحيل وحفظ مستند الـ {label} نهائياً
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="p-4 no-print animate-fade-in">
                        <button 
                            onClick={() => setIsOpen(true)} 
                            className={`${themeColor} text-white px-10 py-3 rounded-2xl font-black shadow-lg hover:brightness-110 transition-all flex items-center gap-3 border-b-4 border-black/20`}
                        >
                            <PlusCircle size={22}/> فتح نافذة إدخال بيانات {label}
                        </button>
                    </div>
                )}

                <ActionHistoryTable warehouse={warehouse} mode={mode} title={label} refreshTrigger={historyRefreshKey} />
            </div>
        );
    }

    return (
        <div className="space-y-0 animate-fade-in" dir="rtl">
            <ExcelRibbon />
            <InputModal 
                isOpen={inputModal.isOpen} 
                onClose={() => setInputModal({ isOpen: false, listKey: null, title: '' })} 
                onSave={(val) => inputModal.listKey && handleAddItemToList(inputModal.listKey, val)}
                title={inputModal.title}
            />

            {isOpen ? (
                <div className="bg-[#f3f4f6]/70 border-x border-b border-slate-300 shadow-2xl no-print relative overflow-visible rounded-b-xl mb-4">
                    <div className={`${themeColor} px-4 py-2.5 text-white flex justify-between items-center shadow-lg relative z-[200]`}>
                        <div className="flex items-center gap-3">
                            <div className="p-1 bg-white/20 rounded-lg">
                                <PlusCircle size={20} className="text-white"/>
                            </div>
                            <h3 className="text-[15px] font-black font-cairo tracking-tight">نافذة إدخال بيانات {label}</h3>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 px-3 py-1 rounded-lg transition-all flex items-center gap-2 text-[12px] font-bold border border-white/30">
                            إخفاء حقول الإدخال <X size={16}/>
                        </button>
                    </div>

                    <div className="p-4 space-y-5">
                        {isSpecialLayout ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-x-4 gap-y-3">
                                <Field label="التاريخ" icon={<Calendar size={13}/>}>
                                    <input type="date" value={header.date} onChange={e => setHeader({...header, date: e.target.value})} className={inputClasses} style={forceEnNumsStyle}/>
                                </Field>
                                <Field label="رقم الإذن" icon={<Hash size={13}/>}>
                                    <input value={header.refNumber} readOnly className={`${inputClasses} text-center font-mono bg-slate-100 text-slate-600 border-dashed cursor-not-allowed`} />
                                </Field>
                                {renderDropdown("المخزن التابع", "subWarehouse", "partsSubWarehouses", <Warehouse size={13}/>)}
                                <Field label="المجموعة السلعية" icon={<Tag size={13}/>}>
                                    <input className={inputClasses} value={header.goodsGroup} onChange={e => setHeader({...header, goodsGroup: e.target.value})} placeholder="قطع غيار / مهمات..." />
                                </Field>
                                
                                {isReturn ? (
                                    <Field label="المورد / الجهة المرتجع لها" icon={<Truck size={13}/>}>
                                        <input value={header.supplierName} onChange={e => setHeader({...header, supplierName: e.target.value})} className={inputClasses} placeholder="اسم المورد..."/>
                                    </Field>
                                ) : isSettlement ? (
                                    <Field label="سبب التسوية" icon={<AlertCircle size={13}/>}>
                                        <input value={header.settlementReason} onChange={e => setHeader({...header, settlementReason: e.target.value})} className={inputClasses} placeholder="عجز / زيادة / جرد..."/>
                                    </Field>
                                ) : (
                                    <Field label="المخزن المحول له" icon={<Warehouse size={13}/>}>
                                        <input value={header.receiverWarehouse} onChange={e => setHeader({...header, receiverWarehouse: e.target.value})} className={inputClasses} placeholder="المخزن الوجهة..."/>
                                    </Field>
                                )}

                                {renderDropdown("أمين المخزن", "storekeeper", storekeeperListKey as any, <UserCog size={13}/>)}
                                
                                <Field label="القائم بالتسكين / المستلم" icon={<UserIcon size={13}/>}>
                                    <input value={header.housingOfficer} onChange={e => setHeader({...header, housingOfficer: e.target.value})} className={inputClasses} placeholder="اسم الموظف..."/>
                                </Field>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-2 md:grid-cols-6 gap-x-4 gap-y-3">
                                    <Field label="التاريخ" icon={<Calendar size={13}/>}>
                                        <input type="date" value={header.date} onChange={e => setHeader({...header, date: e.target.value})} className={inputClasses} style={forceEnNumsStyle}/>
                                    </Field>
                                    <Field label="رقم الإذن" icon={<Hash size={13}/>}>
                                        <input value={header.refNumber} readOnly className={`${inputClasses} text-center font-mono bg-slate-100 text-slate-600 border-dashed cursor-not-allowed`} />
                                    </Field>
                                    {renderDropdown("المخزن التابع", "subWarehouse", "partsSubWarehouses", <Warehouse size={13}/>)}
                                    {renderDropdown("الإدارة", "department", "departments", <Building2 size={13}/>)}
                                    <Field label="القسم" icon={<Layers size={13}/>}>
                                        <div className="flex gap-0.5">
                                            <select className={inputClasses} value={header.section} onChange={e => setHeader({...header, section: e.target.value})}>
                                                <option value="">-- اختر --</option>
                                                <option value="الصيانة">الصيانة</option>
                                                <option value="الإنتاج">الإنتاج</option>
                                            </select>
                                        </div>
                                    </Field>
                                    {renderDropdown("أمين المخزن", "storekeeper", storekeeperListKey as any, <UserCog size={13}/>)}
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-7 gap-x-4 gap-y-3">
                                    {renderDropdown(mode.includes('in') ? "حالة التوريد" : "حالة الصرف", "issueStatus", "partsIssueTypes", <Tag size={13}/>)}
                                    {renderDropdown("موقف القطع", "oldPartsStatus", "partsOldPartsStatuses", <RotateCcw size={13}/>)}
                                    <Field label="العداد / النسبة" icon={<Gauge size={13}/>}>
                                        <input className={inputClasses} value={header.meterReading} onChange={e => setHeader({...header, meterReading: e.target.value})} placeholder="0.00" style={forceEnNumsStyle}/>
                                    </Field>
                                    {renderDropdown("الوردية", "shift", "shifts", <Clock size={13}/>)}
                                    <Field label="الدخول" icon={<ArrowDownLeft size={13}/>}>
                                        <input type="time" className={inputClasses} value={header.entryTime} onChange={e => setHeader({...header, entryTime: e.target.value})} style={forceEnNumsStyle}/>
                                    </Field>
                                    <Field label="الخروج" icon={<ArrowUpRight size={13}/>}>
                                        {/* Fix: spread was using formHeader instead of header. */}
                                        <input type="time" className={inputClasses} value={header.exitTime} onChange={e => setHeader({...header, exitTime: e.target.value})} style={forceEnNumsStyle}/>
                                    </Field>
                                    <Field label="الفرق" icon={<Timer size={13}/>}>
                                        <input className={`${inputClasses} bg-blue-50 text-blue-900 text-center border-blue-200 font-black ring-2 ring-blue-100`} value={timeDiff} readOnly style={forceEnNumsStyle}/>
                                    </Field>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-x-4 gap-y-3">
                                    <Field label="الإذن الورقي" icon={<FileText size={13}/>}>
                                        <input className={inputClasses} value={header.paperVoucher} onChange={e => setHeader({...header, paperVoucher: e.target.value})} placeholder="رقم الإذن الورقي..." style={forceEnNumsStyle}/>
                                    </Field>
                                    <Field label="أمر الشغل" icon={<Briefcase size={13}/>}>
                                        <input className={inputClasses} value={header.workOrderNo} onChange={e => setHeader({...header, workOrderNo: e.target.value})} placeholder="WO..." style={forceEnNumsStyle}/>
                                    </Field>
                                    <Field label="كود المعدة" icon={<Wrench size={13}/>}>
                                        <input className={inputClasses} value={header.equipmentCode} onChange={e => setHeader({...header, equipmentCode: e.target.value})} placeholder="كود المعدة..." style={forceEnNumsStyle}/>
                                    </Field>
                                    <Field label="كود الموظف" icon={<Hash size={13}/>}>
                                        <div className="flex gap-2">
                                            <input className={`${inputClasses} flex-1`} value={header.employeeCode} onChange={e => setHeader({...header, employeeCode: e.target.value})} placeholder="الكود..." style={forceEnNumsStyle}/>
                                        </div>
                                    </Field>
                                    <Field label="المستلم / المورد" icon={<UserIcon size={13}/>}>
                                        <input value={header.recipientName} onChange={e => setHeader({...header, recipientName: e.target.value})} className={inputClasses} placeholder="اسم المستلم الفعلي..."/>
                                    </Field>
                                </div>
                            </>
                        )}

                        <div className="pt-4 border-t border-slate-300 mt-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <div className="h-4 w-1 bg-blue-600 rounded-full"></div>
                                <label className="text-[12px] font-black text-blue-700 block uppercase tracking-wide">إضافة صنف للسلة</label>
                            </div>
                            <div className="flex gap-3 items-center relative z-[300]">
                                <div className="relative flex-1">
                                    <input 
                                        className={`w-full p-3 pr-11 rounded-xl border border-slate-300 outline-none font-bold text-sm focus:ring-4 focus:ring-blue-500/10 transition-all ${selectedProduct ? 'bg-blue-50 border-blue-500 shadow-blue-100 shadow-md' : 'bg-white shadow-inner'}`} 
                                        placeholder="ابحث بكود الصنف أو الاسم..." 
                                        value={searchTerm} 
                                        onChange={e => { setSearchTerm(e.target.value); if(selectedProduct) setSelectedProduct(null); }} 
                                    />
                                    <Search className="absolute right-4 top-3 text-gray-400" size={18}/>
                                    
                                    {searchTerm && !selectedProduct && (
                                        <div className="absolute top-full left-0 right-0 z-[1000] bg-white border border-blue-400 rounded-2xl shadow-2xl mt-2 max-h-72 overflow-y-auto p-2">
                                            {filteredProducts.map(p => (
                                                <div 
                                                    key={p.id} 
                                                    onMouseDown={(e) => { e.preventDefault(); setSelectedProduct(p); setSearchTerm(p.name); }} 
                                                    className="p-3.5 hover:bg-blue-50 cursor-pointer border-b last:border-0 flex justify-between items-center rounded-xl transition-all"
                                                >
                                                    <div className="flex flex-col">
                                                        <span className="font-black text-slate-800">{p.name}</span>
                                                        <span className="text-[11px] text-slate-400 font-mono">{p.barcode}</span>
                                                    </div>
                                                    <span className="bg-blue-100 text-blue-800 px-3 py-1.5 rounded-lg text-[11px] font-black">رصيد: {p.stock}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="w-28">
                                    <input type="number" className="w-full p-3 rounded-xl border border-slate-300 outline-none text-center font-black text-blue-900 shadow-inner h-11 text-lg" value={qtyValue} onChange={e => setQtyValue(e.target.value)} placeholder="0" style={forceEnNumsStyle}/>
                                </div>

                                <button 
                                    onClick={handleAddToDraft} 
                                    className="bg-blue-600 hover:bg-blue-800 text-white px-8 h-11 rounded-xl shadow-xl flex items-center justify-center gap-3 font-black text-[15px] border-b-4 border-blue-900"
                                >
                                    <Plus size={22} strokeWidth={3}/> إضافة للجدول
                                </button>
                            </div>
                        </div>

                        {draftItems.length > 0 && (
                            <div className="space-y-4 pt-4 animate-fade-in">
                                <div className="bg-[#111827] rounded-[2rem] border border-slate-800 overflow-hidden shadow-2xl">
                                    <table className="w-full text-center text-[13px] border-collapse">
                                        <thead className="bg-[#111827] text-slate-300 h-12 font-black uppercase tracking-tighter">
                                            <tr>
                                                <th className="p-3 border-l border-slate-700 text-right pr-8 text-white">الصنف المضاف</th>
                                                <th className="p-3 border-l border-slate-700">الكمية</th>
                                                <th className="p-3 border-l border-slate-700">الوحدة</th>
                                                <th className="p-3">حذف</th>
                                            </tr>
                                        </thead>
                                        <tbody className="font-bold bg-white text-slate-800">
                                            {draftItems.map((item, idx) => (
                                                <tr key={idx} className="border-b h-12 hover:bg-slate-50 transition-colors">
                                                    <td className="p-3 border-l text-right pr-8 font-black text-slate-900">{item.productName}</td>
                                                    <td className="p-3 border-l text-blue-700 font-black text-[16px]" style={forceEnNumsStyle}>{item.quantity}</td>
                                                    <td className="p-3 border-l text-slate-400 font-medium">{item.unit}</td>
                                                    <td className="p-3">
                                                        <button onClick={() => setDraftItems(prev => prev.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 p-2"><Trash2 size={18}/></button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <button onClick={handleFinalSubmit} className={`w-full py-5 ${themeColor} hover:brightness-110 text-white rounded-3xl font-black text-2xl shadow-2xl flex items-center justify-center gap-4 transition-all active:scale-[0.98] border-b-8 border-black/20 mt-4`}>
                                    <Save size={32}/> ترحيل وحفظ مستند الـ {label} نهائياً
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="p-4 no-print animate-fade-in">
                    <button 
                        onClick={() => setIsOpen(true)} 
                        className={`${themeColor} text-white px-10 py-3 rounded-2xl font-black shadow-lg hover:brightness-110 transition-all flex items-center gap-3 border-b-4 border-black/20`}
                    >
                        <PlusCircle size={22}/> فتح نافذة إدخال بيانات {label} لـ {warehouse}
                    </button>
                </div>
            )}

            <ActionHistoryTable warehouse={warehouse} mode={mode} title={label} refreshTrigger={historyRefreshKey} />
        </div>
    );
};

export const IssueVoucherForm: React.FC<{ warehouse: WarehouseType, title: string, onSuccess: () => void }> = ({ warehouse, title, onSuccess }) => {
    let mode: any = 'out';
    if (title.includes('إضافة') && !title.includes('التسوية')) mode = 'transfer_in';
    else if (title.includes('خصم') && !title.includes('التسوية')) mode = 'transfer_out';
    else if (title.includes('التسوية بالاضافة')) mode = 'adj_in';
    else if (title.includes('التسوية بالخصم')) mode = 'adj_out';
    else if (title.includes('مرتجع')) mode = 'return';
    return <StockEntryForm warehouse={warehouse} mode={mode} label={title} onSuccess={onSuccess} />;
};

export const StocktakingForm: React.FC<{ warehouse: WarehouseType }> = ({ warehouse }) => {
    const { products, refreshProducts } = useApp();
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [itemSearch, setItemSearch] = useState('');
    const [newStock, setNewStock] = useState<string>('');
    const [newStockBulk, setNewStockBulk] = useState<string>('');
    const [newStockPacked, setNewStockPacked] = useState<string>('');
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const filtered = useMemo(() => {
        const term = itemSearch.toLowerCase();
        if (!term || selectedProduct) return [];
        return products.filter(p => p.warehouse === warehouse && (p.name.toLowerCase().includes(term) || p.barcode.includes(term)));
    }, [products, itemSearch, warehouse, selectedProduct]);

    const handleSave = () => {
        if (!selectedProduct) return;
        
        const updated = { ...selectedProduct };
        if (warehouse === 'finished') {
            updated.initialStockBulk = Number(newStockBulk) || 0;
            updated.initialStockPacked = Number(newStockPacked) || 0;
            updated.stock = updated.initialStockBulk + updated.initialStockPacked;
        } else {
            updated.stock = Number(newStock) || 0;
        }

        const movement: StockMovement = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            type: 'adjustment',
            warehouse: warehouse,
            user: 'Admin',
            reason: 'جرد رصيد افتتاحي',
            items: [{
                productId: selectedProduct.id,
                productName: selectedProduct.name,
                productCode: selectedProduct.barcode, // Added to ensure Code is saved
                unit: selectedProduct.unit || 'عدد', // Added to ensure Unit is saved
                quantity: updated.stock,
                notes: 'Stocktaking / جرد افتتاحي'
            }]
        };

        dbService.saveProduct(updated);
        dbService.saveMovement(movement);
        refreshProducts();
        setRefreshTrigger(prev => prev + 1); // Trigger history table refresh
        alert('تم تحديث الرصيد بنجاح');
        setSelectedProduct(null);
        setItemSearch('');
    };

    return (
        <div className="space-y-6">
            <GlassCard className="p-8 max-w-2xl mx-auto bg-white rounded-3xl shadow-xl border-t-4 border-purple-600">
                <h3 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2"><ClipboardCheck className="text-purple-600"/> جرد الأرصدة (رصيد افتتاحي)</h3>
                <div className="space-y-6">
                    <div className="relative">
                        <label className="text-sm font-bold text-slate-500 block mb-2">بحث عن صنف للجرد</label>
                        <input className="w-full p-3 rounded-xl border border-slate-200 outline-none font-bold" value={itemSearch} onChange={e => setItemSearch(e.target.value)} placeholder="اسم أو كود الصنف..."/>
                        {filtered.length > 0 && (
                            <div className="absolute top-full left-0 right-0 z-50 bg-white border border-slate-200 rounded-xl shadow-2xl mt-1 max-h-60 overflow-y-auto">
                                {filtered.map(p => (
                                    <div key={p.id} onClick={() => { setSelectedProduct(p); setItemSearch(p.name); setNewStock(String(p.stock)); setNewStockBulk(String(p.initialStockBulk || 0)); setNewStockPacked(String(p.initialStockPacked || 0)); }} className="p-3 hover:bg-purple-50 cursor-pointer border-b font-bold">{p.name} - {p.barcode}</div>
                                ))}
                            </div>
                        )}
                    </div>

                    {selectedProduct && (
                        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 animate-fade-in space-y-4">
                            <div className="font-black text-purple-800 text-lg mb-4">{selectedProduct.name}</div>
                            {warehouse === 'finished' ? (
                                <div className="grid grid-cols-2 gap-4">
                                    <GlassInput label="رصيد صب جديد" type="number" value={newStockBulk} onChange={e => setNewStockBulk(e.target.value)}/>
                                    <GlassInput label="رصيد معبأ جديد" type="number" value={newStockPacked} onChange={e => setNewStockPacked(e.target.value)}/>
                                </div>
                            ) : (
                                <GlassInput label="الرصيد الجديد" type="number" value={newStock} onChange={e => setNewStock(e.target.value)}/>
                            )}
                            <button onClick={handleSave} className="w-full bg-purple-600 text-white py-4 rounded-xl font-black text-lg shadow-lg hover:bg-purple-700 transition-all flex items-center justify-center gap-2"><Save size={20}/> حفظ الجرد</button>
                        </div>
                    )}
                </div>
            </GlassCard>
            <ActionHistoryTable warehouse={warehouse} mode="adjustment" title="جرد الأرصدة" refreshTrigger={refreshTrigger} />
        </div>
    );
};

export const SpecificMovementHistory: React.FC<{ warehouse: WarehouseType, filterReason?: string, title: string }> = ({ warehouse, filterReason, title }) => {
    return <ActionHistoryTable warehouse={warehouse} mode={filterReason?.includes('مرتجع') ? 'return' : 'all'} title={title} />;
};

const Field: React.FC<{ label: string, icon: React.ReactNode, children: React.ReactNode }> = ({ label, icon, children }) => (
    <div className="flex flex-col gap-1">
        <label className={labelClasses}>{icon} {label}</label>
        {children}
    </div>
);
