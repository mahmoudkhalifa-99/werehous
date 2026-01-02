import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { dbService } from '../services/storage';
import { Product, StockMovement } from '../types';
import { 
    Search, Plus, Save, X, Trash2, Calendar, Hash, Truck, 
    Settings, Printer, FileDown, FileUp, Clock, User, 
    Scale, Timer, FileText, ChevronLeft, 
    PlusCircle, ClipboardList, UserCheck, UserCog, 
    ArrowDownLeft, ArrowUpRight, EyeOff, Eye, Building2, MapPin,
    Phone, Gavel, ClipboardSignature, ArrowRightLeft,
    PlusSquare, MinusSquare, Warehouse, RefreshCw, Database,
    AlertTriangle, ShieldAlert, FileWarning, LogOut, Gauge, Undo2,
    RotateCcw, ClipboardPaste, Send, Edit2, Check, History, Package,
    ShieldCheck, Activity, ShoppingCart, Download, FileSpreadsheet
} from 'lucide-react';
import { printService } from '../services/printing';
import * as XLSX from 'xlsx';

const forceEnNumsStyle = {
    fontFamily: 'Inter, sans-serif',
    fontVariantNumeric: 'lining-nums',
    direction: 'ltr' as const
};

const inputClasses = "w-full p-2 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-blue-500 bg-white transition-all shadow-sm";
const labelClasses = "text-[10px] font-black text-slate-400 flex items-center gap-1 mb-1 whitespace-nowrap pr-2 uppercase tracking-tighter";

function smartNormalize(text: any) {
    if (!text) return '';
    return text.toString().trim().toLowerCase()
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .replace(/[\u064B-\u0652]/g, '')
        .replace(/\s+/g, ' '); 
}

const DEFAULT_STYLES = {
    fontFamily: 'Calibri, sans-serif',
    fontSize: 13,
    isBold: true,
    textAlign: 'center' as 'right' | 'center' | 'left',
    verticalAlign: 'middle' as 'top' | 'middle' | 'bottom',
    decimals: 3,
    rowHeight: 45,
    columnWidth: 150
};

const TabItem: React.FC<{ active: boolean, onClick: () => void, icon: React.ReactNode, label: string, color: string }> = ({ active, onClick, icon, label, color }) => {
    const colorClasses: Record<string, string> = {
        emerald: active ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-lg scale-105' : 'border-slate-100 bg-white text-slate-400 hover:bg-slate-50',
        rose: active ? 'border-rose-500 bg-rose-50 text-rose-700 shadow-lg scale-105' : 'border-slate-100 bg-white text-slate-400 hover:bg-slate-50',
        indigo: active ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-lg scale-105' : 'border-slate-100 bg-white text-slate-400 hover:bg-slate-50',
        amber: active ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-lg scale-105' : 'border-slate-100 bg-white text-slate-400 hover:bg-slate-50',
        slate: active ? 'border-slate-500 bg-slate-100 text-slate-800 shadow-lg scale-105' : 'border-slate-100 bg-white text-slate-400 hover:bg-slate-50'
    };

    return (
        <button onClick={onClick} className={`p-6 rounded-[2rem] border-2 transition-all flex flex-col items-center justify-center gap-3 group h-36 ${colorClasses[color]}`}>
            <div className={`transition-transform group-hover:scale-110 ${active ? 'text-current' : 'opacity-40'}`}>{icon}</div>
            <span className="font-black text-sm tracking-tight">{label}</span>
        </button>
    );
};

const Field: React.FC<{ label: string, icon?: React.ReactNode, children: React.ReactNode, isBlue?: boolean }> = ({ label, icon, children, isBlue }) => (
    <div className="flex flex-col gap-0.5">
        <label className={`${labelClasses} ${isBlue ? 'text-blue-500' : ''}`}>{icon} {label}</label>
        {children}
    </div>
);

interface Props {
    view: 'raw_in' | 'raw_sale' | 'silo_trans' | 'control_out' | 'shortage' | 'wh_adj' | 'silo_adj' | 'wh_out' | 'wh_transfer' | 'raw_return' | 'raw_ledger' | 'raw_in_daily';
    onSuccess: () => void;
    title: string;
}

const INITIAL_FORM_STATE = {
    date: new Date().toISOString().split('T')[0],
    supplyOrderNo: '',
    policyNo: '',
    carType: 'دبابة',
    storekeeper: 'System Admin',
    supplier: '',
    supplierCode: 'آلي..',
    transportCompany: '',
    carNumber: '',
    driverName: '',
    driverPhone: '',
    arrivalTime: '',
    entryTime: '',
    exitTime: '',
    shift: 'الأولى',
    inspector: '',
    weighmasterName: '',
    inspectionReportNo: '',
    procedure: '',
    policyWeight: '',
    scaleWeight: '',
    cardId: '',
    itemStatus: 'تحت الفحص',
    notes: '',
    targetWarehouse: '',
    recipientName: '',
    expiryDate: '',
    fattening: '',
    fish: '',
    duck: '',
    pets: ''
};

export const RawMegaTable: React.FC<Props> = ({ view, onSuccess, title }) => {
    const { settings, products, user, refreshProducts, updateSettings } = useApp();
    const [searchTerm, setSearchTerm] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [itemSearch, setItemSearch] = useState('');
    const [draftItems, setDraftItems] = useState<any[]>([]);
    const [updateTrigger, setUpdateTrigger] = useState(0); 
    const [qty, setQty] = useState<string>('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    const [pastedItems, setParsedItems] = useState<any[]>([]);
    const [editingMoveId, setEditingMoveId] = useState<string | null>(null);
    /** Fix: Changed editForm initial state to strings to match state usage with input fields */
    const [editForm, setEditForm] = useState({ fattening: '0', fish: '0', duck: '0', pets: '0', notes: '' });

    const tableRef = useRef<HTMLTableElement>(null);
    const [tableStyles] = useState(DEFAULT_STYLES);
    const [formHeader, setFormHeader] = useState(INITIAL_FORM_STATE);

    // Fix formatVal to correctly show 0.000 and avoid dash for important sum columns
    const formatVal = (n: any) => {
        const num = parseFloat(n);
        if (isNaN(num)) return '-';
        if (num === 0) return (0).toFixed(tableStyles.decimals);
        return num.toLocaleString('en-US', { 
            minimumFractionDigits: tableStyles.decimals,
            maximumFractionDigits: tableStyles.decimals
        });
    };

    const handleExport = () => {
        if (!tableRef.current) return;
        const ws = XLSX.utils.table_to_sheet(tableRef.current);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "RawReport");
        XLSX.writeFile(wb, `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const availableWarehouses = useMemo(() => {
        const rawItems = products.filter(p => p.warehouse === 'raw');
        const whSet = new Set<string>();
        rawItems.forEach(p => {
            if (p.customFields?.warehouseName) whSet.add(p.customFields.warehouseName);
        });
        return Array.from(whSet).sort();
    }, [products]);

    const calculatedDuration = useMemo(() => {
        if (!formHeader.entryTime || !formHeader.exitTime) return '00:00';
        const [h1, m1] = formHeader.entryTime.split(':').map(Number);
        const [h2, m2] = formHeader.exitTime.split(':').map(Number);
        let diffMinutes = (h2 * 60 + m2) - (h1 * 60 + m1);
        if (diffMinutes < 0) diffMinutes += 24 * 60; 
        return `${Math.floor(diffMinutes / 60).toString().padStart(2, '0')}:${(diffMinutes % 60).toString().padStart(2, '0')}`;
    }, [formHeader.entryTime, formHeader.exitTime]);

    const [activeMoveType, setActiveMoveType] = useState<string>('out');

    const isQuickDesign = ['silo_trans', 'wh_adj', 'silo_adj', 'shortage', 'raw_return'].includes(view);
    const isControlOut = view === 'control_out';
    const isSimplifiedOut = view === 'wh_out' || view === 'wh_transfer' || view === 'raw_sale';
    const isRawIn = view === 'raw_in';
    const isRawDailyDetail = view === 'raw_in_daily';

    const currentTabs = useMemo(() => {
        if (view === 'silo_trans') return [
            { id: 'in', label: 'إضافة للصوامع', icon: <PlusCircle size={28}/>, color: 'emerald' },
            { id: 'out', label: 'خصم من الصوامع', icon: <MinusSquare size={28}/>, color: 'rose' }
        ];
        if (view === 'wh_adj') return [
            { id: 'in', label: 'تسوية إضافة (مخازن)', icon: <PlusSquare size={28}/>, color: 'emerald' },
            { id: 'out', label: 'تسوية خصم (مخازن)', icon: <MinusSquare size={28}/>, color: 'rose' }
        ];
        if (view === 'silo_adj') return [
            { id: 'in', label: 'تسوية إضافة (صوامع)', icon: <PlusSquare size={28}/>, color: 'emerald' },
            { id: 'out', label: 'تسوية خصم (صوامع)', icon: <MinusSquare size={28}/>, color: 'rose' }
        ];
        if (view === 'shortage') return [
            { id: 'allowed', label: 'عجز مسموح به', icon: <FileWarning size={28}/>, color: 'amber' },
            { id: 'disallowed', label: 'عجز غير مسموح به', icon: <ShieldAlert size={28}/>, color: 'rose' }
        ];
        if (view === 'raw_return') return [
            { id: 'in', label: 'مرتجع وارد (إضافة)', icon: <Undo2 size={28}/>, color: 'emerald' },
            { id: 'out', label: 'مرتجع صادر (خصم)', icon: <RotateCcw size={28} className="rotate-90"/>, color: 'rose' }
        ];
        return [];
    }, [view]);

    const getSafeIsoDate = (dateStr: string) => {
        if (!dateStr) return new Date().toISOString();
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
    };

    const handlePasteControl = (e: React.ClipboardEvent) => {
        const text = e.clipboardData.getData('text');
        if (!text) return;
        
        const rows = text.split(/\r?\n/).filter(row => row.trim() !== '');
        const items = rows.map(row => {
            const cols = row.split('\t');
            const dateRaw = cols[0]?.trim() || new Date().toISOString().split('T')[0];
            const itemCode = cols[1]?.trim(); 
            const jdeCode = cols[2]?.trim();  
            const name = cols[3]?.trim();
            const unit = cols[4]?.trim() || 'طن';
            const fattening = parseFloat(cols[5]) || 0;
            const fish = parseFloat(cols[6]) || 0;
            const duck = parseFloat(cols[7]) || 0;
            const pets = parseFloat(cols[8]) || 0;
            const total = fattening + fish + duck + pets;

            const product = products.find(p => 
                (itemCode && String(p.barcode) === String(itemCode)) || 
                (jdeCode && (String(p.jdeCode) === String(jdeCode) || String(p.jdeCodeBulk) === String(jdeCode) || String(p.jdeCodePacked) === String(jdeCode))) || 
                (name && smartNormalize(p.name) === smartNormalize(name))
            );
            
            const currentSiloStock = product ? (product.stockPacked ?? 0) : 0;
            const balanceAfter = currentSiloStock - total;

            return {
                date: dateRaw,
                itemCode: itemCode || product?.barcode || '-',
                jdeCode: jdeCode || product?.jdeCode || '-',
                productName: product?.name || name || 'صنف غير معروف',
                productId: product?.id,
                unit,
                fattening, fish, duck, pets,
                total,
                currentSiloStock,
                balanceAfter,
                isValid: !!product
            };
        });
        setParsedItems(items);
    };

    const handlePostBatchControl = () => {
        const validItems = pastedItems.filter(i => i.isValid);
        if (validItems.length === 0) return alert('لا توجد بيانات صالحة للترحيل. تأكد من مطابقة مسميات أو أكواد الأصناف.');

        validItems.forEach(item => {
            const nextId = dbService.getNextId('issueVoucher');
            const movement: StockMovement = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                date: getSafeIsoDate(item.date),
                type: 'out',
                warehouse: 'raw',
                refNumber: nextId,
                user: user?.name || 'Admin',
                items: [{
                    productId: item.productId,
                    productName: item.productName,
                    productCode: item.itemCode,
                    jdeCode: item.jdeCode,
                    unit: item.unit,
                    quantity: item.total,
                    quantityPacked: item.total 
                }],
                reason: 'صرف كنترول للتشغيل (Batch)',
                customFields: { 
                    viewContext: 'control_out',
                    fattening: item.fattening,
                    fish: item.fish,
                    duck: item.duck,
                    pets: item.pets,
                    shift: 'الأولى',
                    storekeeper: user?.name || 'Admin',
                    siloBalanceAtMove: item.balanceAfter 
                }
            };
            dbService.saveMovement(movement);
        });

        refreshProducts();
        setUpdateTrigger(p => p + 1);
        setParsedItems([]);
        setIsFormOpen(false);
        alert(`تم بنجاح ترحيل ${validItems.length} حركة وتحديث أرصدة الصوامع.`);
    };

    const handleQuickAddAndSave = () => {
        if (!selectedProduct) return alert('يرجى اختيار صنف أولاً');
        
        let finalQty = 0;
        let usePacked = false;
        let extraFields: any = {};

        if (isControlOut) {
            const f = parseFloat(formHeader.fattening) || 0;
            const s = parseFloat(formHeader.fish) || 0;
            const d = parseFloat(formHeader.duck) || 0;
            const p = parseFloat(formHeader.pets) || 0;
            finalQty = f + s + d + p;
            usePacked = true;
            extraFields = { fattening: f, fish: s, duck: d, pets: p, siloBalanceAtMove: (selectedProduct.stockPacked || 0) - finalQty };
        } else {
            finalQty = parseFloat(qty) || 0;
        }

        if (finalQty <= 0) return alert('يرجى إدخل كمية صحيحة');

        let sysType: any = 'adjustment';
        let customReason = title;

        if (view === 'silo_trans') {
            sysType = activeMoveType === 'in' ? 'in' : 'out';
            customReason = activeMoveType === 'in' ? 'تحويل وارد للصوامع' : 'تحويل صادر من الصوامع';
            usePacked = true;
        } else if (view === 'shortage') {
            sysType = 'adjustment';
            customReason = activeMoveType === 'allowed' ? 'عجز مسموح به' : 'عجز غير مسموح به';
        } else if (view === 'wh_adj' || view === 'silo_adj') {
            sysType = 'adjustment';
            const prefix = view === 'wh_adj' ? 'مخازن' : 'صوامع';
            customReason = `تسوية ${activeMoveType === 'in' ? 'إضافة' : 'خصم'} (${prefix})`;
            usePacked = view === 'silo_adj';
        } else if (view === 'wh_out' || view === 'wh_transfer' || view === 'raw_sale' || view === 'control_out') {
            sysType = 'out';
            customReason = view === 'wh_out' ? 'صرف مخازن خامات' : (view === 'wh_transfer' ? 'تحويلات مخازن' : (view === 'control_out' ? 'صرف كنترول تشغيل' : 'إذن مبيعات خامات'));
        } else if (view === 'raw_return') {
            sysType = activeMoveType === 'in' ? 'return' : 'out';
            customReason = activeMoveType === 'in' ? 'مرتجع وارد (إضافة)' : 'مرتجع صادر (خصم)';
        }

        const nextId = dbService.getNextId(sysType === 'out' ? 'issueVoucher' : 'receiveVoucher');

        const movement: StockMovement = {
            id: Date.now().toString(),
            date: getSafeIsoDate(formHeader.date),
            type: sysType,
            warehouse: 'raw',
            refNumber: nextId,
            user: user?.name || 'Admin',
            items: [{
                productId: selectedProduct.id,
                productName: selectedProduct.name,
                productCode: selectedProduct.barcode,
                jdeCode: selectedProduct.jdeCode || '-',
                unit: selectedProduct.unit || 'طن',
                quantity: finalQty,
                quantityBulk: usePacked ? 0 : finalQty,
                quantityPacked: usePacked ? finalQty : 0,
                notes: formHeader.notes,
                shift: formHeader.shift,
                storekeeper: formHeader.storekeeper,
                receiverWarehouse: formHeader.targetWarehouse
            }],
            reason: formHeader.recipientName || customReason,
            customFields: { ...formHeader, ...extraFields, viewContext: view, moveMode: activeMoveType, timeDiff: calculatedDuration }
        };

        dbService.saveMovement(movement);
        refreshProducts();
        setUpdateTrigger(p => p + 1);
        setQty('');
        setItemSearch('');
        setSelectedProduct(null);
        setFormHeader(prev => ({ ...prev, notes: '', recipientName: '', fattening: '', fish: '', duck: '', pets: '' }));
        setIsFormOpen(false);
        alert('تم تسجيل الحركة بنجاح.');
    };

    const handleAddToDraft = () => {
        if (!selectedProduct) return alert('يرجى اختيار صنف أولاً');
        const finalQty = parseFloat(formHeader.scaleWeight) || 0;
        if (finalQty <= 0) return alert('يرجى إدخال أوزان الميزان بشكل صحيح');

        const newItem = {
            productId: selectedProduct.id,
            productName: selectedProduct.name,
            productCode: selectedProduct.barcode,
            jdeCode: selectedProduct.jdeCode || '-',
            unit: selectedProduct.unit || 'عدد',
            quantity: finalQty,
            quantityBulk: finalQty,
            currentBalance: selectedProduct.stock,
            ...formHeader,
            duration: calculatedDuration
        };

        setDraftItems([...draftItems, newItem]);
        setSelectedProduct(null);
        setItemSearch('');
        setFormHeader(prev => ({...prev, policyWeight: '', scaleWeight: '', cardId: ''}));
    };

    const handleSaveMovementLegacy = () => {
        if (draftItems.length === 0) return alert('القائمة فارغة');
        const nextId = dbService.getNextId(view === 'raw_in' ? 'receiveVoucher' : 'issueVoucher');
        const movement: StockMovement = {
            id: Date.now().toString(),
            date: getSafeIsoDate(formHeader.date),
            type: view === 'raw_in' ? 'in' : 'out',
            warehouse: 'raw',
            refNumber: nextId,
            user: user?.name || 'Admin',
            items: draftItems,
            reason: formHeader.supplier || title,
            customFields: { ...formHeader, duration: calculatedDuration, viewContext: view }
        };
        dbService.saveMovement(movement);
        refreshProducts();
        setUpdateTrigger(p => p + 1);
        setDraftItems([]);
        setFormHeader(INITIAL_FORM_STATE);
        setIsFormOpen(false);
        alert('تم ترحيل البيانات بنجاح');
    };

    const startEditControl = (row: any) => {
        setEditingMoveId(row.moveId);
        /** Fix: Initialized editForm values as strings to match input type requirements */
        setEditForm({
            fattening: String(row.fattening || 0),
            fish: String(row.fish || 0),
            duck: String(row.duck || 0),
            pets: String(row.pets || 0),
            notes: row.notes || ''
        });
    };

    const saveEditControl = () => {
        if (!editingMoveId) return;
        const movements = dbService.getMovements();
        const idx = movements.findIndex(m => m.id === editingMoveId);
        if (idx !== -1) {
            const oldMove = movements[idx];
            dbService.deleteMovement(oldMove.id); 
            
            /** Fix: Parsed string values from editForm to numbers for calculations */
            const fat = parseFloat(editForm.fattening) || 0;
            const fish = parseFloat(editForm.fish) || 0;
            const duck = parseFloat(editForm.duck) || 0;
            const pets = parseFloat(editForm.pets) || 0;
            const newTotal = fat + fish + duck + pets;
            
            const updatedMove: StockMovement = {
                ...oldMove,
                items: oldMove.items.map((it, i) => i === 0 ? { ...it, quantity: newTotal, quantityPacked: newTotal, notes: editForm.notes } : it),
                customFields: {
                    ...oldMove.customFields,
                    fattening: fat,
                    fish: fish,
                    duck: duck,
                    pets: pets
                }
            };
            dbService.saveMovement(updatedMove);
            refreshProducts();
            setUpdateTrigger(p => p + 1);
            setEditingMoveId(null);
            alert('تم تعديل البيانات وتحديث الرصيد.');
        }
    };

    const tableData = useMemo(() => {
        const targetView = isRawDailyDetail ? 'raw_in' : view;
        const moves = dbService.getMovements().filter(m => {
            const matchesContext = m.customFields?.viewContext === targetView;
            if (isRawDailyDetail) {
                return matchesContext && m.date.startsWith(selectedDate);
            }
            return matchesContext;
        });

        const flattened = moves.flatMap(m => m.items.map((item, i) => {
            const pw = parseFloat(m.customFields?.policyWeight || '0');
            const sw = parseFloat(item.quantity?.toString() || '0');
            return { 
                ...m, ...item, ...m.customFields, moveId: m.id, itemIdx: i, 
                displayDate: new Date(m.date).toLocaleDateString('en-GB'),
                diffWeight: sw - pw
            } as any;
        })).filter((r: any) => 
            smartNormalize(r.productName).includes(smartNormalize(searchTerm)) || 
            smartNormalize(r.productCode).includes(smartNormalize(searchTerm)) ||
            smartNormalize(r.jdeCode).includes(smartNormalize(searchTerm))
        );

        if (view === 'control_out') {
            return flattened.sort((a: any, b: any) => {
                const dateA = new Date(a.date).getTime();
                const dateB = new Date(b.date).getTime();
                if (dateB !== dateA) return dateB - dateA;
                return a.productName.localeCompare(b.productName, 'ar');
            });
        }

        return flattened.reverse();
    }, [view, updateTrigger, searchTerm, isRawDailyDetail, selectedDate]);

    const getCellStyle = (isNumeric: boolean = false): React.CSSProperties => ({
        fontFamily: isNumeric ? 'Inter, sans-serif' : tableStyles.fontFamily,
        fontSize: isNumeric ? '13px' : `12px`,
        fontWeight: 'bold',
        textAlign: 'center',
        verticalAlign: 'middle',
        border: '1px solid #000',
        padding: '6px',
        ...(isNumeric ? forceEnNumsStyle : {})
    });

    if (isRawDailyDetail) {
        const detailCols = [
            "م", "اسم الصنف", "كمية البوليصة", "كمية المصنع", "الفرق", "رقم البوليصة", "المورد", "شركة النقل", 
            "اسم السائق", "رقم السيارة", "رقم محضر الفحص", "القائم بالفحص", "نتيجة الفحص", "رقم كارتة الوزن", 
            "الوردية", "أمين المخزن", "رقم الـ IT للبرنامج"
        ];

        return (
            <div className="space-y-4 font-cairo animate-fade-in" dir="rtl">
                <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-sm flex flex-wrap items-center justify-between gap-4 no-print">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-[#059669] text-white rounded-2xl shadow-lg"><FileSpreadsheet size={24}/></div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800">{title}</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">بيان تفصيلي بكافة الشاحنات الواردة لليوم المختار</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                            <Calendar size={18} className="mx-2 text-slate-500"/>
                            <input 
                                type="date" 
                                value={selectedDate} 
                                onChange={e => setSelectedDate(e.target.value)} 
                                className="p-1.5 bg-white rounded-lg font-black text-xs outline-none border border-slate-200"
                                style={forceEnNumsStyle}
                            />
                        </div>
                        <div className="relative"><input className="w-64 pr-10 pl-4 py-2 border border-slate-100 rounded-xl text-sm outline-none font-bold bg-slate-50 shadow-inner" placeholder="بحث..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /><Search className="absolute right-3 top-2.5 text-gray-300" size={18} /></div>
                        <button onClick={() => printService.printWindow(tableRef.current?.parentElement?.innerHTML || '')} className="flex items-center gap-2 px-6 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl font-black text-xs shadow-sm hover:bg-slate-50 transition-all"><Printer size={18} className="text-blue-600"/> طباعة</button>
                        <button onClick={handleExport} className="flex items-center gap-2 px-6 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl font-black text-xs shadow-sm hover:bg-slate-50 transition-all"><FileUp size={18} className="text-green-600"/> Excel</button>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-premium border-2 border-black overflow-hidden relative z-0">
                    <div className="overflow-x-auto max-h-[75vh]">
                        <table className="w-full border-collapse min-w-[2500px]" ref={tableRef}>
                            <thead className="sticky top-0 z-20 bg-[#b4c6e7] text-slate-900">
                                <tr className="h-14 font-black text-[11px] uppercase tracking-tighter">
                                    {detailCols.map((c, i) => (
                                        <th key={i} className="p-3 border border-black" style={getCellStyle()}>
                                            {c}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="text-[13px] font-bold text-slate-800">
                                {tableData.map((row: any, idx) => (
                                    <tr key={row.moveId} className={`border-b border-black h-12 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                                        <td className="p-2 border border-black" style={getCellStyle(true)}>{idx + 1}</td>
                                        <td className="p-2 border border-black text-right pr-4 font-black" style={getCellStyle()}>{row.productName}</td>
                                        <td className="p-2 border border-black bg-blue-50/20" style={getCellStyle(true)}>{formatVal(row.policyWeight)}</td>
                                        <td className="p-2 border border-black bg-emerald-50/20 text-lg" style={getCellStyle(true)}>{formatVal(row.quantity)}</td>
                                        <td className={`p-2 border border-black font-black ${row.diffWeight < 0 ? 'text-red-600' : 'text-emerald-700'}`} style={getCellStyle(true)}>{row.diffWeight.toFixed(3)}</td>
                                        <td className="p-2 border border-black font-mono text-indigo-700" style={getCellStyle(true)}>{row.policyNo}</td>
                                        <td className="p-2 border border-black" style={getCellStyle()}>{row.supplier}</td>
                                        <td className="p-2 border border-black" style={getCellStyle()}>{row.transportCompany}</td>
                                        <td className="p-2 border border-black" style={getCellStyle()}>{row.driverName}</td>
                                        <td className="p-2 border border-black font-mono" style={getCellStyle(true)}>{row.carNumber}</td>
                                        <td className="p-2 border border-black font-mono" style={getCellStyle(true)}>{row.inspectionReportNo}</td>
                                        <td className="p-2 border border-black" style={getCellStyle()}>{row.inspector}</td>
                                        <td className="p-2 border border-black" style={getCellStyle()}>{row.itemStatus}</td>
                                        <td className="p-2 border border-black font-mono" style={getCellStyle(true)}>{row.cardId}</td>
                                        <td className="p-2 border border-black" style={getCellStyle()}>{row.shift}</td>
                                        <td className="p-2 border border-black" style={getCellStyle()}>{row.storekeeper}</td>
                                        <td className="p-2 border border-black bg-slate-100 font-black" style={getCellStyle(true)}>{row.refNumber}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }

    if (isControlOut) {
        return (
            <div className="space-y-6 font-cairo animate-fade-in" dir="rtl">
                {isFormOpen && (
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-premium overflow-visible no-print animate-fade-in">
                        <div className="p-8 space-y-8">
                            <div className="flex justify-between items-center px-4">
                                <div className="flex items-center gap-4">
                                    <div className="bg-violet-50 p-4 rounded-3xl text-violet-600 shadow-sm border border-violet-100">
                                        <ClipboardPaste size={32}/>
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-black text-slate-800">صرف الكنترول (إدخال مجمع أو يدوي)</h2>
                                        <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">قم بالصرف اليدوي لصنف واحد أو لصق صفوف الإكسيل للمجمع</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsFormOpen(false)} className="bg-[#e11d48] hover:bg-[#be123c] text-white px-6 py-3 rounded-2xl font-black text-xs flex items-center gap-2 shadow-lg transition-all active:scale-95 border-b-4 border-[#9f1239]">
                                    <EyeOff size={18}/> إخفاء النافذة
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-6 px-4">
                                <Field label="التاريخ" icon={<Calendar size={14}/>}><input type="date" value={formHeader.date} onChange={e => setFormHeader({...formHeader, date: e.target.value})} className={inputClasses} style={forceEnNumsStyle}/></Field>
                                <Field label="الوردية" icon={<Clock size={14}/>}><select className={inputClasses} value={formHeader.shift} onChange={e => setFormHeader({...formHeader, shift: e.target.value})}><option value="الأولى">الأولى</option><option value="الثانية">الثانية</option><option value="الثالثة">الثالثة</option></select></Field>
                                <Field label="أمين المخزن" icon={<UserCog size={14}/>}><select className={inputClasses} value={formHeader.storekeeper} onChange={e => setFormHeader({...formHeader, storekeeper: e.target.value})}><option value="System Admin">System Admin</option>{settings.storekeepersRaw?.map(s => <option key={s} value={s}>{s}</option>)}</select></Field>
                                <Field label="ملاحظات" icon={<FileText size={14}/>}><input className={inputClasses} value={formHeader.notes} onChange={e => setFormHeader({...formHeader, notes: e.target.value})} placeholder="..."/></Field>
                            </div>

                            <div className="bg-slate-900 rounded-[2.5rem] p-6 flex flex-col lg:flex-row items-end gap-4 shadow-2xl relative z-10 mx-4">
                                <div className="flex-1 relative w-full">
                                    <label className="text-[11px] font-black text-slate-400 mb-2 block uppercase tracking-wider">البحث عن الصنف</label>
                                    <div className="relative">
                                        <input className="w-full p-3.5 pr-12 rounded-2xl border-none bg-white outline-none font-black text-md shadow-inner" placeholder="بحث صنف تشغيل..." value={itemSearch} onChange={e => { setItemSearch(e.target.value); if(selectedProduct) setSelectedProduct(null); }} />
                                        <Search className="absolute right-4 top-3.5 text-slate-300" size={24}/>
                                        {itemSearch && !selectedProduct && (
                                            <div className="absolute top-full left-0 right-0 z-[2000] bg-white border-2 border-slate-100 rounded-2xl shadow-2xl mt-2 max-h-60 overflow-y-auto p-2">
                                                {products.filter(p => p.warehouse === 'raw' || ['خامات', 'خامات اساسية', 'اضافات'].includes(p.category)).filter(p => smartNormalize(p.name).includes(smartNormalize(itemSearch)) || p.barcode.includes(itemSearch)).map(p => (
                                                    <div key={p.id} onClick={() => {setSelectedProduct(p); setItemSearch(p.name);}} className="p-4 hover:bg-slate-50 cursor-pointer border-b last:border-0 rounded-xl flex justify-between items-center transition-all group">
                                                        <div className="flex flex-col"><span className="font-black text-slate-800">{p.name}</span><span className="text-[10px] text-slate-400 font-bold">كود: {p.barcode}</span></div>
                                                        <span className="bg-violet-100 text-violet-700 px-4 py-1 rounded-full text-[11px] font-black">رصيد الصومعة: {p.stockPacked || 0}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="w-24 text-center">
                                    <label className="text-[9px] font-black text-blue-300 mb-1 block uppercase">تسمين</label>
                                    <input type="number" className="w-full p-3 rounded-xl border-none bg-white text-center font-black text-sm shadow-inner" value={formHeader.fattening} onChange={e => setFormHeader({...formHeader, fattening: e.target.value})} placeholder="0" style={forceEnNumsStyle}/>
                                </div>
                                <div className="w-24 text-center">
                                    <label className="text-[9px] font-black text-blue-300 mb-1 block uppercase">سمك</label>
                                    <input type="number" className="w-full p-3 rounded-xl border-none bg-white text-center font-black text-sm shadow-inner" value={formHeader.fish} onChange={e => setFormHeader({...formHeader, fish: e.target.value})} placeholder="0" style={forceEnNumsStyle}/>
                                </div>
                                <div className="w-24 text-center">
                                    <label className="text-[9px] font-black text-blue-300 mb-1 block uppercase">بط</label>
                                    <input type="number" className="w-full p-3 rounded-xl border-none bg-white text-center font-black text-sm shadow-inner" value={formHeader.duck} onChange={e => setFormHeader({...formHeader, duck: e.target.value})} placeholder="0" style={forceEnNumsStyle}/>
                                </div>
                                <div className="w-24 text-center">
                                    <label className="text-[9px] font-black text-blue-300 mb-1 block uppercase">أليفة</label>
                                    <input type="number" className="w-full p-3 rounded-xl border-none bg-white text-center font-black text-sm shadow-inner" value={formHeader.pets} onChange={e => setFormHeader({...formHeader, pets: e.target.value})} placeholder="0" style={forceEnNumsStyle}/>
                                </div>
                                <button onClick={handleQuickAddAndSave} className="bg-violet-600 hover:bg-violet-700 text-white p-4 rounded-2xl shadow-xl transition-all active:scale-90 border-b-4 border-violet-900 shrink-0 flex items-center gap-3 font-black text-lg h-[54px]"><Plus size={24}/> تسجيل</button>
                            </div>

                            <div className="text-center py-4 text-slate-300 font-bold border-y border-slate-100 mx-4">--- أو اللصق المجمع من إكسيل أدناه ---</div>

                            <div className="px-4">
                                <div className="bg-violet-50/50 rounded-[2rem] border-4 border-dashed border-violet-100 p-8 text-center transition-all hover:bg-violet-50 group relative">
                                    <textarea 
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                                        onPaste={handlePasteControl}
                                        placeholder="الصق هنا..."
                                    />
                                    <div className="flex flex-col items-center gap-4 pointer-events-none group-hover:scale-105 transition-transform">
                                        <div className="p-6 bg-white rounded-full shadow-xl text-violet-600">
                                            <ClipboardPaste size={48} strokeWidth={1.5} />
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-black text-violet-900 font-cairo">اضغط هنا ثم قم باللصق (Ctrl + V)</h4>
                                            <p className="text-xs text-slate-400 font-bold mt-1">الترتيب المطلوب للأعمدة: [التاريخ] [كود دريف] [كود JDE] [الاسم] [الوحدة] [تسمين] [سمك] [بط] [أليفة]</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {pastedItems.length > 0 && (
                                <div className="px-4 animate-bounce-in">
                                    <div className="bg-white rounded-3xl border-2 border-slate-100 shadow-xl overflow-hidden">
                                        <div className="bg-slate-900 px-6 py-4 text-white flex justify-between items-center font-black text-sm">
                                            <span>معاينة البيانات المحللة قبل الترحيل</span>
                                            <span className="bg-violet-600 px-4 py-1 rounded-full text-xs" style={forceEnNumsStyle}>{pastedItems.length} حركة جاهزة</span>
                                        </div>
                                        <div className="max-h-[350px] overflow-y-auto">
                                            <table className="w-full text-center border-collapse">
                                                <thead className="bg-[#002060] text-yellow-300 font-black text-[11px] h-10 border-b sticky top-0 z-10">
                                                    <tr>
                                                        <th>التاريخ</th><th>كود دريف</th><th>كود JDE</th><th>اسم الصنف</th><th>الوحدة</th><th>تسمين</th><th>سمك</th><th>بط</th><th>أليفة</th><th>الإجمالي</th><th>رصيد الصوامع بعد الخصم</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="text-xs font-bold text-slate-700">
                                                    {pastedItems.map((item, idx) => (
                                                        <tr key={idx} className={`border-b h-11 transition-colors ${item.isValid ? 'hover:bg-violet-50' : 'bg-red-50'}`}>
                                                            <td style={forceEnNumsStyle}>{item.date}</td>
                                                            <td className="font-mono text-indigo-700" style={forceEnNumsStyle}>{item.itemCode}</td>
                                                            <td className="font-mono text-slate-400" style={forceEnNumsStyle}>{item.jdeCode}</td>
                                                            <td className="text-right pr-6 font-black">{item.productName}</td>
                                                            <td>{item.unit}</td>
                                                            <td style={forceEnNumsStyle}>{item.fattening}</td>
                                                            <td style={forceEnNumsStyle}>{item.fish}</td>
                                                            <td style={forceEnNumsStyle}>{item.duck}</td>
                                                            <td style={forceEnNumsStyle}>{item.pets}</td>
                                                            <td className="text-violet-700 text-lg font-black" style={forceEnNumsStyle}>{item.total.toFixed(3)}</td>
                                                            <td className={`font-black ${item.balanceAfter < 0 ? 'text-rose-600' : 'text-emerald-600'}`} style={forceEnNumsStyle}>
                                                                {item.isValid ? item.balanceAfter.toFixed(3) : 
                                                                    <span className="text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full flex items-center gap-1 justify-center"><AlertTriangle size={12}/> خطأ تعريف</span>
                                                                }
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="p-4 bg-slate-50 border-t flex gap-4">
                                            <button onClick={handlePostBatchControl} className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-4 rounded-2xl font-black text-lg shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 border-b-4 border-violet-900">
                                                <Send size={24}/> ترحيل البيانات للسجلات وتحديث الأرصدة
                                            </button>
                                            <button onClick={() => setParsedItems([])} className="px-8 bg-white border border-slate-200 text-slate-500 rounded-2xl font-bold hover:bg-slate-50 transition-all">إلغاء الكل</button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-premium overflow-hidden mt-6 animate-fade-in">
                    <div className="bg-white p-6 border-b border-slate-50 flex flex-col md:flex-row justify-between items-center gap-4 no-print"><div className="flex items-center gap-4"><div className="p-4 bg-slate-900 text-white rounded-3xl shadow-xl"><History size={24}/></div><div><h2 className="text-xl font-black text-slate-800">سجل الكنترول التاريخي</h2><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">عرض وتعديل حركات صرف التشغيل</p></div></div><div className="flex items-center gap-3"><div className="relative"><input className="w-64 pr-10 pl-4 py-2 border border-slate-100 rounded-xl text-sm outline-none font-bold bg-slate-50 shadow-inner" placeholder="بحث سريع..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /><Search className="absolute right-3 top-2.5 text-gray-300" size={18} /></div><button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-xs shadow-sm hover:bg-slate-50 transition-all"><FileUp size={16} className="text-green-600"/> تصدير Excel</button>{!isFormOpen && ( <button onClick={() => setIsFormOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-xl font-black text-[12px] flex items-center gap-2 shadow-lg transition-all active:scale-95 border-b-4 border-emerald-800"><PlusCircle size={18}/> إظهار نافذة الإدخال</button>)}</div></div><div className="overflow-x-auto max-h-[60vh] relative z-0"><table className="w-full border-collapse min-w-[2000px]" ref={tableRef}><thead className="sticky top-0 z-20 bg-[#002060] text-yellow-300 font-black text-[11px] uppercase border-b"><tr><th className="p-4 border border-black w-12 text-center">م</th><th className="p-4 border border-black text-center">التاريخ</th><th className="p-4 border border-black text-center">كود دريف</th><th className="p-4 border border-black text-center">كود JDE</th><th className="p-4 border border-black text-right pr-6 min-w-[250px]">اسم الصنف</th><th className="p-4 border border-black text-center">الوحدة</th><th className="p-4 border border-black text-center bg-blue-900/40">تسمين</th><th className="p-4 border border-black text-center bg-emerald-900/40">سمك</th><th className="p-4 border border-black text-center bg-amber-900/40">بط</th><th className="p-4 border border-black text-center bg-rose-900/40">أليفة</th><th className="p-4 border border-black text-center bg-violet-900/40 text-white font-black">الإجمالي</th><th className="p-4 border border-black text-center bg-emerald-900/20 text-slate-900 font-black">رصيد الصوامع بعد الخصم</th><th className="p-4 border border-black text-center">إجراءات</th></tr></thead><tbody className="text-[13px] font-bold text-slate-700 bg-white">{tableData.map((row: any, idx) => {const totalQty = (Number(row.fattening || 0) + Number(row.fish || 0) + Number(row.duck || 0) + Number(row.pets || 0));return (<tr key={row.moveId} className={`border-b border-black h-14 hover:bg-violet-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}><td className="p-2 border border-black text-center" style={forceEnNumsStyle}>{idx + 1}</td><td className="p-2 border border-black text-center" style={forceEnNumsStyle}>{row.displayDate}</td><td className="p-2 border border-black text-center font-mono text-indigo-700" style={forceEnNumsStyle}>{row.productCode}</td><td className="p-2 border border-black text-center font-mono text-slate-400" style={forceEnNumsStyle}>{row.jdeCode}</td><td className="p-2 border border-black text-right pr-6 font-black text-slate-900">{row.productName}</td><td className="p-2 border border-black text-center text-slate-400 font-bold">{row.unit}</td><td className="p-2 border border-black text-center">{editingMoveId === row.moveId ? <input type="number" className="w-20 p-1 border rounded text-center" value={editForm.fattening} onChange={e => setEditForm({...editForm, fattening: e.target.value})} style={forceEnNumsStyle}/> : formatVal(row.fattening)}</td><td className="p-2 border border-black text-center">{editingMoveId === row.moveId ? <input type="number" className="w-20 p-1 border rounded text-center" value={editForm.fish} onChange={e => setEditForm({...editForm, fish: e.target.value})} style={forceEnNumsStyle}/> : formatVal(row.fish)}</td><td className="p-2 border border-black text-center">{editingMoveId === row.moveId ? <input type="number" className="w-20 p-1 border rounded text-center" value={editForm.duck} onChange={e => setEditForm({...editForm, duck: e.target.value})} style={forceEnNumsStyle}/> : formatVal(row.duck)}</td><td className="p-2 border border-black text-center">{editingMoveId === row.moveId ? <input type="number" className="w-20 p-1 border rounded text-center" value={editForm.pets} onChange={e => setEditForm({...editForm, pets: e.target.value})} style={forceEnNumsStyle}/> : formatVal(row.pets)}</td><td className="p-2 border border-black text-center text-lg font-black text-violet-800 bg-violet-50/50" style={forceEnNumsStyle}>{totalQty.toFixed(tableStyles.decimals)}</td><td className="p-2 border border-black text-center font-black text-slate-600 bg-emerald-50/10" style={forceEnNumsStyle}>{(row.siloBalanceAtMove || 0).toFixed(tableStyles.decimals)}</td><td className="p-2 border border-black text-center"><div className="flex items-center justify-center gap-2">{editingMoveId === row.moveId ? (<button onClick={saveEditControl} className="text-emerald-600 hover:bg-emerald-50 p-2 rounded-full shadow-sm border border-emerald-100 transition-all"><Check size={20}/></button>) : (<button onClick={() => startEditControl(row)} className="text-blue-500 hover:bg-blue-50 p-2 rounded-full transition-all"><Edit2 size={18}/></button>)}<button onClick={() => { if(window.confirm('حذف هذه الحركة نهائياً؟')) { dbService.deleteMovement(row.moveId); setUpdateTrigger(p => p+1); refreshProducts(); } }} className="text-red-500 hover:bg-red-50 p-2 rounded-full transition-all"><Trash2 size={18}/></button></div></td></tr>);})}</tbody></table></div></div>
            </div>
        );
    }

    if (isSimplifiedOut) {
        let headerColorClass = 'bg-orange-50';
        let iconColorClass = 'text-orange-600';
        let borderColorClass = 'border-orange-100';
        let actionBtnColorClass = 'bg-orange-600';
        let actionBtnHoverClass = 'hover:bg-orange-700';
        let actionBtnBorderClass = 'border-orange-900';
        let qtyTextColorClass = 'text-orange-600';
        let rowHoverClass = 'hover:bg-orange-50';
        let colHeaderBgClass = 'bg-orange-900/40';
        let mainHeaderBgClass = 'bg-orange-900';
        let actionIcon = <LogOut size={32}/>;

        if (view === 'wh_transfer') {
            headerColorClass = 'bg-indigo-50'; iconColorClass = 'text-indigo-600'; borderColorClass = 'border-indigo-100'; actionBtnColorClass = 'bg-indigo-600'; actionBtnHoverClass = 'hover:bg-indigo-700'; actionBtnBorderClass = 'border-indigo-900'; qtyTextColorClass = 'text-indigo-600'; rowHoverClass = 'hover:bg-indigo-50'; colHeaderBgClass = 'bg-indigo-900/40'; mainHeaderBgClass = 'bg-indigo-900'; actionIcon = <ArrowRightLeft size={32}/>;
        } else if (view === 'raw_sale') {
            headerColorClass = 'bg-blue-50'; iconColorClass = 'text-blue-600'; borderColorClass = 'border-blue-100'; actionBtnColorClass = 'bg-blue-600'; actionBtnHoverClass = 'hover:bg-blue-700'; actionBtnBorderClass = 'border-blue-900'; qtyTextColorClass = 'text-blue-600'; rowHoverClass = 'hover:bg-blue-50'; colHeaderBgClass = 'bg-indigo-900/40'; mainHeaderBgClass = 'bg-indigo-900'; actionIcon = <ShoppingCart size={32}/>;
        }

        return (
            <div className="space-y-6 font-cairo animate-fade-in" dir="rtl">
                {isFormOpen && (
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-premium overflow-visible no-print animate-fade-in">
                        <div className="p-8 space-y-8">
                            <div className="flex justify-between items-center px-4"><div className="flex items-center gap-4"><div className={`${headerColorClass} p-4 rounded-3xl ${iconColorClass} shadow-sm border ${borderColorClass}`}>{actionIcon}</div><div><h2 className="text-3xl font-black text-slate-800">{title}</h2><p className="text-sm text-slate-400 font-bold uppercase tracking-widest">نموذج إدخال مبسط للخصم المباشر من المخزون</p></div></div><button onClick={() => setIsFormOpen(false)} className="bg-[#e11d48] hover:bg-[#be123c] text-white px-6 py-3 rounded-2xl font-black text-xs flex items-center gap-2 shadow-lg transition-all active:scale-95 border-b-4 border-[#9f1239]"><EyeOff size={18}/> إخفاء النافذة</button></div>
                            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-6 px-4">
                                <Field label="التاريخ" icon={<Calendar size={14}/>}><input type="date" value={formHeader.date} onChange={e => setFormHeader({...formHeader, date: e.target.value})} className={inputClasses} style={forceEnNumsStyle}/></Field>
                                <Field label="المخزن التابع / الوجهة" icon={<Warehouse size={14}/>}><select className={inputClasses} value={formHeader.targetWarehouse} onChange={e => setFormHeader({...formHeader, targetWarehouse: e.target.value})}><option value="">-- اختر المخزن --</option>{availableWarehouses.map(wh => <option key={wh} value={wh}>{wh}</option>)}</select></Field>
                                <Field label="الوردية" icon={<Clock size={14}/>}><select className={inputClasses} value={formHeader.shift} onChange={e => setFormHeader({...formHeader, shift: e.target.value})}><option value="الأولى">الأولى</option><option value="الثانية">الثانية</option><option value="الثالثة">الثالثة</option></select></Field>
                                <Field label="أمين المخزن" icon={<UserCog size={14}/>}><select className={inputClasses} value={formHeader.storekeeper} onChange={e => setFormHeader({...formHeader, storekeeper: e.target.value})}><option value="System Admin">System Admin</option>{settings.storekeepersRaw?.map(s => <option key={s} value={s}>{s}</option>)}</select></Field>
                                <Field label="اسم المستلم / البيان" icon={<UserCheck size={14}/>}><input className={inputClasses} value={formHeader.recipientName} onChange={e => setFormHeader({...formHeader, recipientName: e.target.value})} placeholder="بيانات الطرف الآخر..."/></Field>
                                <Field label="تاريخ الصلاحية" icon={<ShieldCheck size={14}/>}><input type="date" className={inputClasses} value={formHeader.expiryDate} onChange={e => setFormHeader({...formHeader, expiryDate: e.target.value})} style={forceEnNumsStyle}/></Field>
                            </div>
                            <div className="bg-slate-900 rounded-[2.5rem] p-8 flex flex-col md:flex-row items-end gap-6 shadow-2xl relative z-10 mx-4">
                                <div className="flex-1 relative w-full"><label className="text-[11px] font-black text-slate-400 mb-2 block uppercase tracking-wider">البحث عن الصنف وإضافته</label><div className="relative"><input className="w-full p-4 pr-12 rounded-2xl border-none bg-white outline-none font-black text-md shadow-inner" placeholder="ابحث باسم الصنف أو كود دريف..." value={itemSearch} onChange={e => { setItemSearch(e.target.value); if(selectedProduct) setSelectedProduct(null); }} /><Search className="absolute right-4 top-4 text-slate-300" size={24}/>{itemSearch && !selectedProduct && (<div className="absolute top-full left-0 right-0 z-[2000] bg-white border-2 border-slate-100 rounded-2xl shadow-2xl mt-2 max-h-72 overflow-y-auto p-2">{products.filter(p => p.warehouse === 'raw' || ['خامات', 'خامات اساسية', 'اضافات', 'شكاير', 'كروت', 'مستلزمات'].includes(p.category)).filter(p => smartNormalize(p.name).includes(smartNormalize(itemSearch)) || p.barcode.includes(itemSearch)).map(p => (<div key={p.id} onClick={() => {setSelectedProduct(p); setItemSearch(p.name);}} className="p-4 hover:bg-slate-50 cursor-pointer border-b last:border-0 rounded-xl flex justify-between items-center transition-all group"><div className="flex flex-col"><span className="font-black text-slate-800">{p.name}</span><span className="text-[10px] text-slate-400 font-bold">كود: {p.barcode} | JDE: {p.jdeCode || '-'}</span></div><span className="bg-slate-100 text-slate-700 px-4 py-1 rounded-full text-[11px] font-black">رصيد: {p.stock}</span></div>))}</div>)}</div></div>
                                <div className="w-full md:w-48"><label className="text-[10px] font-black text-slate-400 mb-2 block text-center uppercase">الكمية</label><input type="number" className={`w-full p-4 rounded-2xl border-none bg-white text-center font-black text-2xl ${qtyTextColorClass} shadow-inner`} value={qty} onChange={e => setQty(e.target.value)} placeholder="0.000" style={forceEnNumsStyle}/></div>
                                <button onClick={handleQuickAddAndSave} className={`${actionBtnColorClass} ${actionBtnHoverClass} text-white p-4 rounded-2xl shadow-xl transition-all active:scale-90 border-b-4 ${actionBtnBorderClass} shrink-0 flex items-center gap-3 font-black text-xl`}><Plus size={32} strokeWidth={3}/> تسجيل الحركة</button>
                            </div>
                        </div>
                    </div>
                )}
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-premium overflow-hidden mt-6 animate-fade-in"><div className="bg-white p-6 border-b border-slate-50 flex flex-col md:flex-row justify-between items-center gap-4 no-print"><div className="flex items-center gap-4"><div className="p-4 bg-slate-900 text-white rounded-3xl shadow-xl"><History size={24}/></div><div><h2 className="text-xl font-black text-slate-800">السجل التاريخي</h2><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">عرض الحركات المسجلة مؤخراً</p></div></div><div className="flex items-center gap-3"><div className="relative"><input className="w-64 pr-10 pl-4 py-2 border border-slate-100 rounded-xl text-sm outline-none font-bold bg-slate-50 shadow-inner" placeholder="بحث سريع..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /><Search className="absolute right-3 top-2.5 text-gray-300" size={18} /></div><button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-xs shadow-sm hover:bg-slate-50 transition-all"><FileUp size={16} className="text-green-600"/> تصدير Excel</button>{!isFormOpen && ( <button onClick={() => setIsFormOpen(true)} className={`${actionBtnColorClass} ${actionBtnHoverClass} text-white px-6 py-2 rounded-xl font-black text-[12px] flex items-center gap-2 shadow-lg transition-all active:scale-95 border-b-4 border-actionBtnBorderClass`}><Plus size={18}/> إظهار نافذة الإدخال</button>)}</div></div><div className="overflow-x-auto max-h-[60vh] relative z-0"><table className="w-full border-collapse min-w-[2000px]" ref={tableRef}><thead className={`sticky top-0 z-20 ${mainHeaderBgClass} text-white font-black text-[11px] uppercase border-b`}><tr><th className="p-4 border-l border-slate-700 w-12 text-center">م</th><th className="p-4 border-l border-slate-700 text-center">التاريخ</th><th className="p-4 border-l border-slate-700 text-center">رقم الإذن</th><th className="p-4 border-l border-slate-700 text-center">كود الدرايف</th><th className="p-4 border-l border-slate-700 text-center">كود jd</th><th className="p-4 border-l border-slate-700 text-right pr-6 min-w-[250px]">اسم الصنف</th><th className="p-4 border-l border-slate-700 text-center">الوحدة</th><th className={`p-4 border-l border-slate-700 text-center ${colHeaderBgClass}`}>الكمية</th><th className="p-4 border-l border-slate-700 text-center">الوجهة</th><th className="p-4 border-l border-slate-700 text-center">الوردية</th><th className="p-4 border-l border-slate-700 text-center">أمين المخزن</th><th className="p-4 border-l border-slate-700 text-center">المستلم / البيان</th><th className="p-4 border-l border-slate-700 text-center bg-blue-900/40">الرصيد اللحظي</th><th className="p-4 text-center">إجراء</th></tr></thead><tbody className="text-[13px] font-bold text-slate-700 bg-white">{tableData.map((row: any, idx) => (<tr key={row.moveId} className={`border-b h-14 ${rowHoverClass} transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}><td className="p-2 border-l text-center" style={forceEnNumsStyle}>{idx + 1}</td><td className="p-2 border-l text-center" style={forceEnNumsStyle}>{row.displayDate}</td><td className="p-2 border-l text-center font-mono text-indigo-700" style={forceEnNumsStyle}>{row.refNumber}</td><td className="p-2 border-l text-center font-mono text-slate-400" style={forceEnNumsStyle}>{row.productCode}</td><td className="p-2 border-l text-center font-mono text-slate-400" style={forceEnNumsStyle}>{row.jdeCode}</td><td className="p-2 border-l text-right pr-6 font-black text-slate-900">{row.productName}</td><td className="p-2 border-l text-center text-slate-400 font-bold">{row.unit}</td><td className={`p-2 border-l text-center text-xl font-black ${qtyTextColorClass}`} style={forceEnNumsStyle}>{row.quantity.toFixed(3)}</td><td className="p-2 border-l text-center">{row.targetWarehouse || '-'}</td><td className="p-2 border-l text-center">{row.shift || '-'}</td><td className="p-2 border-l text-center">{row.storekeeper || row.user}</td><td className="p-2 border-l text-center">{row.recipientName || row.reason || '-'}</td><td className="p-2 border-l text-center font-black text-blue-900 bg-blue-50/20" style={forceEnNumsStyle}>{row.currentBalance?.toFixed(3)}</td><td className="p-2 text-center"><button onClick={() => { if(window.confirm('حذف هذه الحركة؟')) { dbService.deleteMovement(row.moveId); setUpdateTrigger(p => p+1); refreshProducts(); } }} className="text-red-500 hover:bg-red-50 p-2 rounded-full transition-all"><Trash2 size={18}/></button></td></tr>))}</tbody></table></div></div>
            </div>
        );
    }

    if (isQuickDesign) {
        return (
            <div className="space-y-6 font-cairo animate-fade-in" dir="rtl">
                {isFormOpen && (
                    <div className="animate-fade-in space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 no-print">
                            {currentTabs.map(tab => (
                                <TabItem key={tab.id} active={activeMoveType === tab.id} onClick={() => setActiveMoveType(tab.id)} {...tab} />
                            ))}
                        </div>

                        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-premium overflow-visible no-print animate-fade-in">
                            <div className="bg-slate-900 px-8 py-3 text-white flex justify-between items-center rounded-t-[2.5rem] shadow-lg border-b border-white/10">
                                <div className="flex items-center gap-3">
                                    <Edit2 size={20}/>
                                    <h3 className="font-black text-[14px]">نافذة تسجيل: {currentTabs.find(t => t.id === activeMoveType)?.label}</h3>
                                </div>
                                <button onClick={() => setIsFormOpen(false)} className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-1.5 rounded-xl font-black text-xs flex items-center gap-2 border-b-4 border-rose-900 transition-all active:scale-95">
                                    <EyeOff size={16}/> إخفاء النافذة
                                </button>
                            </div>

                            <div className="p-8 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-6">
                                    <Field label="التاريخ" icon={<Calendar size={14}/>}><input type="date" value={formHeader.date} onChange={e => setFormHeader({...formHeader, date: e.target.value})} className={inputClasses} style={forceEnNumsStyle}/></Field>
                                    {/** Fix: Corrected property name from supplierName to supplier */}
                                    {view === 'raw_return' && activeMoveType === 'out' && <Field label="المورد المرتجع له" icon={<Truck size={14}/>}><input className={inputClasses} value={formHeader.supplier} onChange={e => setFormHeader({...formHeader, supplier: e.target.value})} placeholder="اسم المورد..."/></Field>}
                                    <Field label="أمين المخزن" icon={<UserCog size={14}/>}><select className={inputClasses} value={formHeader.storekeeper} onChange={e => setFormHeader({...formHeader, storekeeper: e.target.value})}><option value="System Admin">System Admin</option>{settings.storekeepersRaw?.map(s => <option key={s} value={s}>{s}</option>)}</select></Field>
                                    <Field label="ملاحظات" icon={<FileText size={14}/>}><input className={inputClasses} value={formHeader.notes} onChange={e => setFormHeader({...formHeader, notes: e.target.value})} placeholder="السبب أو تفاصيل..."/></Field>
                                </div>
                                <div className="bg-slate-900 rounded-[2.5rem] p-8 flex flex-col md:flex-row items-end gap-6 shadow-2xl relative z-10">
                                    <div className="flex-1 relative w-full"><label className="text-[11px] font-black text-slate-400 mb-2 block uppercase tracking-wider">البحث عن الصنف</label><div className="relative"><input className="w-full p-4 pr-12 rounded-2xl border-none bg-white outline-none font-black text-md shadow-inner" placeholder="بحث..." value={itemSearch} onChange={e => { setItemSearch(e.target.value); if(selectedProduct) setSelectedProduct(null); }} /><Search className="absolute right-4 top-4 text-slate-300" size={24}/>{itemSearch && !selectedProduct && (<div className="absolute top-full left-0 right-0 z-[2000] bg-white border-2 border-slate-100 rounded-2xl shadow-2xl mt-2 max-h-72 overflow-y-auto p-2">{products.filter(p => p.warehouse === 'raw' || ['خامات', 'خامات اساسية', 'اضافات', 'شكاير', 'كروت', 'مستلزمات'].includes(p.category)).filter(p => smartNormalize(p.name).includes(smartNormalize(itemSearch)) || p.barcode.includes(itemSearch)).map(p => (<div key={p.id} onClick={() => {setSelectedProduct(p); setItemSearch(p.name);}} className="p-4 hover:bg-slate-50 cursor-pointer border-b last:border-0 rounded-xl flex justify-between items-center transition-all group"><div className="flex flex-col"><span className="font-black text-slate-800">{p.name}</span><span className="text-[10px] text-slate-400 font-bold">كود: {p.barcode} | JDE: {p.jdeCode || '-'}</span></div><span className="bg-slate-100 text-slate-700 px-4 py-1 rounded-full text-[11px] font-black">رصيد: {p.stock}</span></div>))}</div>)}</div></div>
                                    <div className="w-full md:w-48"><label className="text-[10px] font-black text-slate-400 mb-2 block text-center uppercase">الكمية</label><input type="number" className="w-full p-4 rounded-2xl border-none bg-white text-center font-black text-2xl text-blue-800 shadow-inner" value={qty} onChange={e => setQty(e.target.value)} placeholder="0.000" style={forceEnNumsStyle}/></div>
                                    <button onClick={handleQuickAddAndSave} className={`px-12 h-[60px] rounded-2xl shadow-xl transition-all active:scale-90 border-b-4 font-black text-xl text-white ${activeMoveType === 'in' || activeMoveType === 'allowed' ? 'bg-emerald-600 border-emerald-900' : 'bg-rose-600 border-rose-900'}`}><Plus size={32} className="inline ml-2"/> تسجيل {currentTabs.find(t => t.id === activeMoveType)?.label}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-premium overflow-hidden mt-6 animate-fade-in">
                    <div className="bg-white p-6 border-b border-slate-50 flex flex-col md:flex-row justify-between items-center gap-4 no-print">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-slate-900 text-white rounded-3xl shadow-xl"><History size={24}/></div>
                            <div>
                                <h2 className="text-xl font-black text-slate-800">سجل حركات: {title}</h2>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">عرض كافة العمليات السابقة لهذا النوع</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="relative"><input className="w-64 pr-10 pl-4 py-2 border border-slate-100 rounded-xl text-sm outline-none font-bold bg-slate-50 shadow-inner" placeholder="بحث سريع..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /><Search className="absolute right-3 top-2.5 text-gray-300" size={18} /></div>
                            <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-xs shadow-sm hover:bg-slate-50 transition-all"><FileUp size={16} className="text-green-600"/> تصدير Excel</button>
                            {!isFormOpen && (
                                <button onClick={() => setIsFormOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-xl font-black text-[12px] flex items-center gap-2 shadow-lg transition-all active:scale-95 border-b-4 border-emerald-800">
                                    <PlusCircle size={18}/> إظهار نافذة الإدخال
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="overflow-x-auto max-h-[60vh] relative z-0">
                        <table className="w-full border-collapse min-w-[1500px]" ref={tableRef}>
                            <thead className="sticky top-0 z-20 bg-[#1e293b] text-white font-black text-[11px] uppercase border-b">
                                <tr>
                                    <th className="p-4 border-l border-slate-700 w-12 text-center">م</th>
                                    <th className="p-4 border-l border-slate-700 text-center">التاريخ</th>
                                    <th className="p-4 border-l border-slate-700 text-center">رقم الإذن</th>
                                    <th className="p-4 border-l border-slate-700 text-right pr-6 min-w-[250px]">اسم الصنف</th>
                                    <th className="p-4 border-l border-slate-700 text-center">الوحدة</th>
                                    <th className="p-4 border-l border-slate-700 text-center">الكمية</th>
                                    <th className="p-4 border-l border-slate-700 text-center">نوع الحركة / السبب</th>
                                    <th className="p-4 border-l border-slate-700 text-center">أمين المخزن</th>
                                    <th className="p-4 border-l border-slate-700 text-center">الرصيد اللحظي</th>
                                    <th className="p-4 text-center">إجراء</th>
                                </tr>
                            </thead>
                            <tbody className="text-[13px] font-bold text-slate-700 bg-white">
                                {tableData.map((row: any, idx) => (
                                    <tr key={row.moveId} className={`border-b h-14 hover:bg-slate-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                                        <td className="p-2 border-l text-center" style={forceEnNumsStyle}>{idx + 1}</td>
                                        <td className="p-2 border-l text-center" style={forceEnNumsStyle}>{row.displayDate}</td>
                                        <td className="p-2 border-l text-center font-mono text-indigo-700" style={forceEnNumsStyle}>{row.refNumber}</td>
                                        <td className="p-2 border-l text-right pr-6 font-black text-slate-900">{row.productName}</td>
                                        <td className="p-2 border-l text-slate-400 font-bold">{row.unit}</td>
                                        <td className={`p-2 border-l text-center text-xl font-black ${row.type === 'in' || (row.type === 'adjustment' && (row.moveMode === 'in' || row.moveMode === 'allowed')) ? 'text-emerald-600' : 'text-rose-600'}`} style={forceEnNumsStyle}>{row.quantity.toFixed(3)}</td>
                                        <td className="p-2 border-l text-center font-bold">{row.reason}</td>
                                        <td className="p-2 border-l text-center font-bold text-slate-400">{row.storekeeper || row.user}</td>
                                        <td className="p-2 border-l text-center font-black text-blue-900 bg-blue-50/20" style={forceEnNumsStyle}>{row.currentBalance?.toFixed(3)}</td>
                                        <td className="p-2 text-center"><button onClick={() => { if(window.confirm('حذف هذه الحركة؟')) { dbService.deleteMovement(row.moveId); setUpdateTrigger(p => p+1); refreshProducts(); } }} className="text-red-500 hover:bg-red-50 p-2 rounded-full transition-all"><Trash2 size={18}/></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }

    return null;
};
