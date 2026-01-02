
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { GlassCard, GlassButton, GlassInput, InputModal, ConfirmModal } from '../components/NeumorphicUI';
import { dbService } from '../services/storage';
import { Purchase, ButtonConfig, PurchaseItem, Product, WarehouseType, AppSettings, StockMovement } from '../types';
import { 
    Plus, ArrowRightLeft, FileText, Trash2, Save, Printer, X, Search, Truck, 
    ShoppingCart, BarChart3, List, Edit2, Settings, Warehouse, ChevronLeft, UserCog, Building2, Layers, Hash, Calendar, Briefcase, Tag, Clock, ClipboardList, User as UserIcon, Download,
    CheckCircle2, AlertTriangle, ClipboardCheck, UserCheck, Scale, MapPin, ClipboardSignature, Undo2, RotateCcw
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getIcon } from '../utils/icons';
import { printService } from '../services/printing';
import { StockEntryForm } from '../components/WarehouseActions';
import { PrintSettingsModal } from '../components/PrintSettingsModal';
import { PurchaseItemsReport } from '../components/PurchaseItemsReport';

const forceEnNumsStyle = {
    fontFamily: 'Inter, sans-serif',
    fontVariantNumeric: 'lining-nums',
    direction: 'ltr' as const
};

const AddPurchaseView: React.FC<{ 
    filterWh?: WarehouseType, 
    editingPurchase: Purchase | null, 
    onBack: () => void,
    onSaveSuccess: () => void
}> = ({ filterWh, editingPurchase, onBack, onSaveSuccess }) => {
    const { settings, products, user, updateSettings, t } = useApp();
    const [cart, setOrderCart] = useState<PurchaseItem[]>(editingPurchase?.items || []);
    const [searchTerm, setSearchTerm] = useState('');
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    
    const [inputModal, setInputModal] = useState<{isOpen: boolean, type: 'storekeeper' | 'supplier' | 'subwarehouse' | null, setter?: (v: string) => void}>({ isOpen: false, type: null });

    const [formData, setFormData] = useState<Partial<Purchase>>(editingPurchase || {
        orderNumber: '', 
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        supplier: '', 
        warehouse: filterWh || 'parts',
        warehouseName: filterWh === 'catering' ? 'مخزن الإعاشة الرئيسي' : (filterWh === 'raw' ? 'مخزن الخامات' : ''), 
        department: '',
        section: '',
        storekeeper: '',
        status: 'pending',
        requestType: 'عادي',
        requester: '', 
        requestFor: '',
        supplyOrderNumber: '',
        compositeCode: '',
        jdeCode: '',
        deliveryDays: 0,
        requiredDeliveryDate: '',
        notes: ''
    });

    useEffect(() => {
        if (!editingPurchase) {
            const nextId = dbService.peekNextId('purchaseOrder');
            setFormData(prev => ({ ...prev, orderNumber: nextId }));
        }
    }, [editingPurchase]);

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                 p.barcode.includes(searchTerm) || 
                                 (p.jdeCode || '').includes(searchTerm);
            
            // 1. إذا كان هناك فلتر مفروض من الشاشة السابقة (إعاشة / قطع غيار)
            if (filterWh) {
                return matchesSearch && p.warehouse === filterWh;
            }

            // 2. إذا لم يوجد فلتر رابط، نعتمد على اختيار المستخدم للمخزن من القائمة
            if (formData.warehouseName) {
                const matchesWh = p.warehouse === formData.warehouse || 
                                 p.category === formData.warehouseName || 
                                 p.customFields?.warehouseName === formData.warehouseName;
                return matchesSearch && matchesWh;
            }

            // 3. افتراضياً، إذا لم يتم تحديد أي شيء، نظهر أصناف المخزن الافتراضي المختار في formData
            return matchesSearch && p.warehouse === formData.warehouse;
        });
    }, [products, searchTerm, formData.warehouse, formData.warehouseName, filterWh]);

    const storekeeperList = useMemo(() => {
        if (formData.warehouse === 'raw') return settings.storekeepersRaw || [];
        if (formData.warehouse === 'parts') return settings.storekeepersParts || [];
        if (formData.warehouse === 'finished') return settings.storekeepersFinished || [];
        if (formData.warehouse === 'catering') return settings.storekeepersFinished || []; // Use finished/general as fallback
        return settings.storekeepers || [];
    }, [formData.warehouse, settings]);

    const addToCart = (p: Product) => {
        if (cart.some(item => item.productId === p.id)) return;
        setOrderCart([...cart, { 
            productId: p.id, productName: p.name, productCode: p.barcode, 
            jdeCode: p.jdeCode || p.jdeCodePacked || p.jdeCodeBulk || '',
            quantity: 1, receivedQuantity: 0, unitCost: p.cost, totalCost: p.cost, unit: p.unit || 'عدد' 
        }]);
    };

    const updateItem = (idx: number, field: keyof PurchaseItem, value: any) => {
        const newCart = [...cart];
        const item = { ...newCart[idx], [field]: value };
        if (field === 'quantity' || field === 'unitCost') {
            item.totalCost = (Number(item.quantity) || 0) * (Number(item.unitCost) || 0);
        }
        newCart[idx] = item;
        setOrderCart(newCart);
    };

    const handleSave = () => {
        if (!formData.supplier) return alert('يرجى اختيار المورد / جهة التنفيذ');
        if (!formData.storekeeper) return alert('يرجى اختيار أمين المخزن');
        if (!formData.warehouseName) return alert('يرجى اختيار المخزن التابع');
        if (cart.length === 0) return alert('قائمة الأصناف فارغة');

        const realId = editingPurchase ? formData.orderNumber! : dbService.getNextId('purchaseOrder');

        const finalPurchase: Purchase = {
            ...formData as Purchase,
            id: editingPurchase?.id || Date.now().toString(),
            orderNumber: realId,
            items: cart,
            total: cart.reduce((sum, i) => sum + i.totalCost, 0),
            status: 'pending',
            createdAt: formData.createdAt || new Date().toISOString()
        };

        dbService.savePurchase(finalPurchase);
        alert('تم حفظ طلب الشراء بنجاح بالرقم: ' + finalPurchase.orderNumber);
        onSaveSuccess();
    };

    const handleAddNewOption = (type: 'storekeeper' | 'supplier' | 'subwarehouse', setter: (v: string) => void) => {
        setInputModal({ isOpen: true, type, setter });
    };

    const saveNewOption = (newVal: string) => {
        const type = inputModal.type;
        if (!type) return;
        
        let settingsKey: keyof AppSettings = 'storekeepers';
        if (type === 'supplier') settingsKey = 'suppliers';
        if (type === 'subwarehouse') settingsKey = 'partsSubWarehouses';
        if (type === 'storekeeper') {
            if (formData.warehouse === 'raw') settingsKey = 'storekeepersRaw';
            else if (formData.warehouse === 'parts') settingsKey = 'storekeepersParts';
            else if (formData.warehouse === 'finished') settingsKey = 'storekeepersFinished';
        }

        const currentList = settings[settingsKey] || [];
        if (!Array.isArray(currentList)) return;
        if (!currentList.includes(newVal)) {
            updateSettings({ ...settings, [settingsKey]: [...currentList, newVal] });
            if (inputModal.setter) inputModal.setter(newVal);
        }
    };

    const attemptBack = () => {
        if (cart.length > 0) {
            setShowExitConfirm(true);
        } else {
            onBack();
        }
    };

    const inputClasses = "w-full px-2 py-1.5 border-2 border-slate-200 rounded-xl text-[12px] font-black outline-none focus:ring-2 focus:ring-purple-500 h-9 transition-all bg-white text-gray-900 shadow-sm";
    const selectClasses = "w-full px-1 py-1.5 border-2 border-slate-200 rounded-xl text-[12px] font-bold outline-none focus:ring-2 focus:ring-purple-500 h-9 transition-all bg-white text-gray-900 shadow-sm cursor-pointer";
    const labelClasses = "text-[10px] font-black text-slate-500 mb-0.5 block flex items-center gap-1 uppercase";

    return (
        <div className="flex flex-col xl:flex-row gap-4 animate-fade-in pb-20" dir="rtl">
            <InputModal 
                isOpen={inputModal.isOpen} 
                onClose={() => setInputModal({ isOpen: false, type: null })} 
                onSave={saveNewOption} 
                title={inputModal.type === 'storekeeper' ? "إضافة أمين مخزن" : inputModal.type === 'supplier' ? "إضافة مورد" : "إضافة مخزن تابع"} 
            />

            <ConfirmModal 
                isOpen={showExitConfirm}
                onClose={() => setShowExitConfirm(false)}
                onConfirm={onBack}
                title="تأكيد الخروج"
                message="لديك أصناف في السلة لم يتم حفظها بعد، هل تريد الخروج وإلغاء هذا الطلب؟"
                confirmText="نعم، اخرج"
                cancelText="بقائي هنا"
            />

            <div className="flex-1 space-y-4">
                <div className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-md grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="md:col-span-4 border-b pb-1 mb-1 flex justify-between items-center text-purple-800 font-black">
                        <span className="flex items-center gap-2"><Building2 size={16}/> البيانات الإدارية والتنظيمية لطلب الشراء</span>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400">نظام إدارة التوريدات الذكي</span>
                            <button onClick={attemptBack} className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-colors"><X size={18}/></button>
                        </div>
                    </div>
                    
                    <div className="md:col-span-1">
                        <label className={`${labelClasses} text-purple-700`}><Hash size={10}/> رقم طلب الشراء</label>
                        <input className={`${inputClasses} bg-purple-50 border-purple-200 text-purple-900 font-mono text-center`} value={formData.orderNumber} readOnly />
                    </div>
                    <div className="md:col-span-1">
                        <label className={labelClasses}><Calendar size={10}/> تاريخ الطلب</label>
                        <input type="date" className={inputClasses} value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} style={forceEnNumsStyle} />
                    </div>
                    <div className="md:col-span-1">
                        <label className={labelClasses}><Building2 size={10}/> الإدارة الطالبة</label>
                        <select className={selectClasses} value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})}>
                            <option value="">-- اختر الإدارة --</option>
                            {settings.departments?.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>
                    <div className="md:col-span-1">
                        <label className={labelClasses}><Layers size={10}/> القسم التابع له</label>
                        <input className={inputClasses} value={formData.section} onChange={e => setFormData({...formData, section: e.target.value})} placeholder="الصيانة / الانتاج..." />
                    </div>
                    
                    <div className="md:col-span-1">
                        <label className={`${labelClasses} text-indigo-700`}><Truck size={10}/> جهة التنفيذ</label>
                        <div className="flex gap-1">
                            <select className={`${selectClasses} flex-1`} value={formData.supplier} onChange={e => setFormData({...formData, supplier: e.target.value})}>
                                <option value="">-- اختر المورد --</option>
                                {settings.suppliers?.map(s => <option key={s} value={s}>{s}</option>)}
                                {settings.executionEntities?.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <button onClick={() => handleAddNewOption('supplier', (v) => setFormData({...formData, supplier: v}))} className="bg-indigo-600 text-white p-1 rounded-lg hover:bg-indigo-700 h-9 w-9 flex items-center justify-center shadow-sm"><Plus size={14}/></button>
                        </div>
                    </div>
                    <div className="md:col-span-1">
                        <label className={labelClasses}><Warehouse size={10}/> المخزن التابع</label>
                        <div className="flex gap-1">
                            <select className={`${selectClasses} flex-1`} value={formData.warehouseName} onChange={e => {
                                const val = e.target.value;
                                let whType: WarehouseType = 'parts';
                                if (val.includes('خامات')) whType = 'raw';
                                if (val.includes('أعلاف') || val.includes('تام') || val.includes('بيوتولوجى')) whType = 'finished';
                                if (val.includes('إعاشة') || val.includes('الاعاشة')) whType = 'catering';
                                setFormData({...formData, warehouseName: val, warehouse: whType, storekeeper: ''});
                            }}>
                                <option value="">-- اختر المخزن --</option>
                                {settings.partsSubWarehouses?.map(w => <option key={w} value={w}>{w}</option>)}
                                <option value="المخزن الرئيسي">المخزن الرئيسي</option>
                                <option value="مخزن الخامات">مخزن الخامات</option>
                                <option value="مخزن الإعاشة الرئيسي">مخزن الإعاشة الرئيسي</option>
                            </select>
                            <button onClick={() => handleAddNewOption('subwarehouse', (v) => {
                                setFormData({...formData, warehouseName: v});
                            })} className="bg-emerald-600 text-white p-1 rounded-lg hover:bg-emerald-700 h-9 w-9 flex items-center justify-center shadow-sm"><Plus size={14}/></button>
                        </div>
                    </div>
                    <div className="md:col-span-1">
                        <label className={labelClasses}><UserCog size={10}/> أمين المخزن</label>
                        <div className="flex gap-1">
                            <select className={`${selectClasses} flex-1`} value={formData.storekeeper} onChange={e => setFormData({...formData, storekeeper: e.target.value})}>
                                <option value="">-- اختر --</option>
                                {storekeeperList.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <button onClick={() => handleAddNewOption('storekeeper', (v) => setFormData({...formData, storekeeper: v}))} className="bg-purple-600 text-white p-1 rounded-lg hover:bg-purple-700 h-9 w-9 flex items-center justify-center shadow-sm"><Plus size={14}/></button>
                        </div>
                    </div>
                    <div className="md:col-span-1">
                        <label className={`${labelClasses} text-blue-700`}><Tag size={10}/> الطلب لأجل</label>
                        <input className={`${inputClasses} border-blue-200 bg-blue-50/10`} value={formData.requestFor} onChange={e => setFormData({...formData, requestFor: e.target.value})} placeholder="الغرض من الشراء..." />
                    </div>

                    <div className="md:col-span-1">
                        <label className={labelClasses}><UserIcon size={10}/> الشخص الطالب</label>
                        <input className={inputClasses} value={formData.requester} onChange={e => setFormData({...formData, requester: e.target.value})} placeholder="ادخل اسم الطالب..." />
                    </div>
                    <div className="md:col-span-1">
                        <label className={labelClasses}><Hash size={10}/> رقم JDE</label>
                        <input className={inputClasses} value={formData.jdeCode} onChange={e => setFormData({...formData, jdeCode: e.target.value})} placeholder="رقم السيستم..." />
                    </div>
                    <div className="md:col-span-1">
                        <label className={labelClasses}><Clock size={10}/> مدة التوريد (يوم)</label>
                        <input type="number" className={inputClasses} value={formData.deliveryDays || ''} onChange={e => setFormData({...formData, deliveryDays: Number(e.target.value)})} />
                    </div>
                    <div className="md:col-span-1">
                        <label className={labelClasses}><Tag size={10}/> نوع الطلب</label>
                        <select className={selectClasses} value={formData.requestType} onChange={e => setFormData({...formData, requestType: e.target.value})}>
                            <option value="عادي">عادي</option>
                            <option value="عاجل">عاجل</option>
                            <option value="عهدة">عهدة</option>
                        </select>
                    </div>
                </div>

                <div className="bg-[#1e293b] rounded-[2rem] border-4 border-slate-700 overflow-hidden shadow-2xl">
                    <div className="bg-[#1e1b4b] p-4 text-white font-black flex justify-between items-center h-12 shadow-lg">
                        <span className="text-sm flex items-center gap-2"><ShoppingCart size={16}/> بنود وأصناف الطلب الحالي</span>
                        <span className="bg-indigo-600 px-3 py-0.5 rounded-full text-[10px] font-bold border border-indigo-400">{cart.length} صنف</span>
                    </div>
                    <table className="w-full text-center text-[12px] border-collapse bg-white">
                        <thead className="bg-slate-100 text-slate-500 font-black h-10 border-b">
                            <tr>
                                <th className="p-2 w-10">م</th>
                                <th className="p-2 w-28">كود الصنف</th>
                                <th className="p-2 text-right pr-6">بيان الصنف</th>
                                <th className="p-2 w-24 text-blue-700">الكمية</th>
                                <th className="p-2 w-16">الوحدة</th>
                                <th className="p-2 w-28">تكلفة الوحدة</th>
                                <th className="p-2 w-28 bg-slate-200">الإجمالي</th>
                                <th className="p-2 w-12">حذف</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-800 font-bold">
                            {cart.map((item, idx) => (
                                <tr key={idx} className="border-b hover:bg-slate-50 transition-colors h-12">
                                    <td className="p-2 text-gray-400" style={forceEnNumsStyle}>{idx + 1}</td>
                                    <td className="p-2 font-mono text-xs text-indigo-600 font-bold" style={forceEnNumsStyle}>{item.productCode}</td>
                                    <td className="p-2 text-right pr-6 font-black text-slate-900">{item.productName}</td>
                                    <td className="p-2"><input type="number" className="w-20 p-1.5 border-2 border-blue-100 rounded-lg text-center font-black text-blue-800 focus:border-blue-500 outline-none text-[12px]" value={item.quantity} onChange={e => updateItem(idx, 'quantity', Number(e.target.value))} style={forceEnNumsStyle} /></td>
                                    <td className="p-2 text-slate-500">{item.unit}</td>
                                    <td className="p-2"><input type="number" className="w-20 p-1.5 border-2 border-slate-100 rounded-lg text-center font-bold text-gray-700 text-[12px]" value={item.unitCost} onChange={e => updateItem(idx, 'unitCost', Number(e.target.value))} style={forceEnNumsStyle} /></td>
                                    <td className="p-2 bg-slate-50 font-black text-purple-700" style={forceEnNumsStyle}>{(item.totalCost || 0).toLocaleString()}</td>
                                    <td className="p-2"><button onClick={() => setOrderCart(cart.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={18}/></button></td>
                                </tr>
                            ))}
                            {cart.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="p-16 text-center text-slate-300 font-bold italic">لا توجد أصناف مضافة. اختر من القائمة الجانبية...</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex gap-4 no-print pt-4">
                    <button onClick={handleSave} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-5 rounded-3xl font-black shadow-2xl flex items-center justify-center gap-3 text-xl transition-all active:scale-95 border-b-8 border-purple-800"><Save size={28}/> حفظ وترحيل طلب الشراء</button>
                    <button onClick={attemptBack} className="px-12 bg-white text-slate-400 border border-slate-200 rounded-3xl font-black hover:bg-slate-50 transition-all text-xl">إلغاء</button>
                </div>
            </div>

            <div className="w-80 bg-white rounded-[3rem] border border-slate-200 shadow-xl flex flex-col h-[850px] shrink-0 sticky top-4 no-print overflow-hidden">
                <div className="p-6 border-b bg-slate-50/50 space-y-4">
                    <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest flex items-center gap-2"><List size={14}/> قائمة الأصناف المتاحة</h3>
                    <div className="relative">
                        <input className="w-full p-3 pr-10 rounded-2xl border-2 border-slate-200 outline-none focus:border-purple-500 font-bold text-[12px] bg-white" placeholder="ابحث عن صنف..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
                        <Search className="absolute right-3 top-3 text-slate-400" size={18}/>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white">
                    {filteredProducts.map(p => (
                        <div key={p.id} onClick={() => addToCart(p)} className="p-4 bg-white border-2 border-slate-50 rounded-2xl hover:bg-purple-50 hover:border-purple-200 cursor-pointer transition-all shadow-sm group">
                            <h4 className="font-black text-slate-800 text-[12px] leading-tight mb-2 group-hover:text-purple-700 transition-colors">{p.name}</h4>
                            <div className="flex justify-between items-center text-[10px] font-black text-indigo-700">
                                <span className="bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">كود: {p.barcode}</span>
                                <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-lg border border-emerald-100">رصيد: {p.stock}</span>
                            </div>
                            {p.category && <p className="text-[9px] text-slate-400 mt-1 font-bold">التصنيف: {p.category}</p>}
                        </div>
                    ))}
                    {filteredProducts.length === 0 && (
                        <div className="text-center py-10 text-slate-300 font-bold italic text-[12px]">لا توجد نتائج مطابقة</div>
                    )}
                </div>
            </div>
        </div>
    );
};

const PurchaseListView: React.FC<{ filterWh?: WarehouseType, onEdit: (p: Purchase) => void, onBack: () => void }> = ({ filterWh, onEdit, onBack }) => {
    const { settings } = useApp();
    const [searchTerm, setSearchTerm] = useState('');
    const purchases = dbService.getPurchases().filter(p => !filterWh || p.warehouse === filterWh).reverse();

    const filtered = purchases.filter(p => 
        p.orderNumber.includes(searchTerm) || 
        p.supplier.includes(searchTerm) ||
        p.items.some(i => i.productName.includes(searchTerm))
    );

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center gap-4 bg-white p-4 rounded-xl border">
                <div className="relative flex-1">
                    <input className="w-full pl-10 pr-4 py-2 border rounded-lg" placeholder="Search POs..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={18}/>
                </div>
            </div>
            <div className="bg-white rounded-xl border overflow-hidden">
                <table className="w-full text-center">
                    <thead className="bg-gray-800 text-white">
                        <tr>
                            <th className="p-3">Date</th>
                            <th className="p-3">Order #</th>
                            <th className="p-3">Supplier</th>
                            <th className="p-3">Items</th>
                            <th className="p-3">Total</th>
                            <th className="p-3">Status</th>
                            <th className="p-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(p => (
                            <tr key={p.id} className="border-b">
                                <td className="p-3">{new Date(p.date).toLocaleDateString()}</td>
                                <td className="p-3 font-bold">{p.orderNumber}</td>
                                <td className="p-3">{p.supplier}</td>
                                <td className="p-3">{p.items.length}</td>
                                <td className="p-3">{p.total.toLocaleString()}</td>
                                <td className="p-3">
                                    <span className={`px-2 py-1 rounded text-xs text-white ${p.status === 'received' ? 'bg-green-500' : 'bg-blue-500'}`}>{p.status}</span>
                                </td>
                                <td className="p-3 flex justify-center gap-2">
                                    <button onClick={() => onEdit(p)} className="p-2 text-blue-500 hover:bg-blue-50 rounded"><Edit2 size={16}/></button>
                                    <button onClick={() => printService.printWindow(printService.generatePurchaseOrderHtml(p, settings))} className="p-2 text-gray-500 hover:bg-gray-50 rounded"><Printer size={16}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const ReceivePurchaseView: React.FC<{ filterWh?: WarehouseType, onBack: () => void }> = ({ filterWh, onBack }) => {
    const { settings, refreshProducts, updateSettings } = useApp();
    const [search, setSearch] = useState('');
    const [purchase, setPurchase] = useState<Purchase | null>(null);
    const [receiveData, setReceiveData] = useState<Record<string, number>>({});
    
    const [inspectData, setInspectData] = useState({
        reportNo: '',
        inspector: '',
        supplierName: '',
        systemAddNo: '',
        housingOfficer: '',
        receiveDate: new Date().toISOString().split('T')[0]
    });

    const [inputModal, setInputModal] = useState<{isOpen: boolean, type: 'inspector' | 'housing' | null}>({ isOpen: false, type: null });

    const handleSearch = () => {
        const found = dbService.getPurchases().find(p => p.orderNumber === search && p.status === 'pending');
        if (found) {
            setPurchase(JSON.parse(JSON.stringify(found)));
            setInspectData(prev => ({ ...prev, supplierName: found.supplier }));
            // Initialize receive quantities
            const initRec: Record<string, number> = {};
            found.items.forEach(i => {
                const rem = i.quantity - (i.receivedQuantity || 0);
                initRec[i.productId] = rem > 0 ? rem : 0;
            });
            setReceiveData(initRec);
        } else {
            alert('طلب الشراء غير موجود أو تم استلامه بالكامل.');
        }
    };

    const handleReceive = () => {
        if (!purchase) return;
        if (!inspectData.reportNo || !inspectData.inspector) return alert('يرجى إكمال بيانات الفحص');

        const movementItems = purchase.items.map(i => {
            const currentRec = Number(receiveData[i.productId]) || 0;
            // Update the purchase record quantities
            i.receivedQuantity = (i.receivedQuantity || 0) + currentRec;
            
            return {
                productId: i.productId,
                productName: i.productName,
                productCode: i.productCode,
                quantity: currentRec,
                unit: i.unit,
                currentBalance: 0,
                notes: `استلام طلب شراء: ${purchase.orderNumber}`,
                inspectionReportNo: inspectData.reportNo,
                inspectingOfficer: inspectData.inspector,
                housingOfficer: inspectData.housingOfficer,
                systemAddNo: inspectData.systemAddNo,
                purchaseOrderNo: purchase.orderNumber,
                supplierName: inspectData.supplierName
            };
        }).filter(item => item.quantity > 0);

        if (movementItems.length === 0) return alert('يرجى إدخال كميات للاستلام');

        const isFullyReceived = purchase.items.every(i => (i.receivedQuantity || 0) >= i.quantity);
        purchase.status = isFullyReceived ? 'received' : 'pending';
        purchase.receivedDate = new Date().toISOString();
        
        dbService.savePurchase(purchase);

        const movement: StockMovement = {
            id: Date.now().toString(),
            date: new Date(inspectData.receiveDate).toISOString(),
            type: 'in',
            warehouse: purchase.warehouse,
            refNumber: dbService.getNextId('receiveVoucher'),
            user: settings.storekeepers?.includes(inspectData.inspector) ? inspectData.inspector : 'نظام المشتريات',
            reason: inspectData.supplierName,
            items: movementItems,
            customFields: {
                inspectionReportNo: inspectData.reportNo,
                inspectingOfficer: inspectData.inspector,
                housingOfficer: inspectData.housingOfficer,
                systemAddNo: inspectData.systemAddNo,
                supplierName: inspectData.supplierName,
                purchaseOrderNo: purchase.orderNumber
            }
        };
        
        dbService.saveMovement(movement);
        refreshProducts();
        alert('تم توريد الكميات للمخازن بنجاح.');
        onBack();
    };

    const inputClasses = "w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-sm font-black outline-none focus:ring-2 focus:ring-blue-500 h-10 transition-all bg-white shadow-sm";
    const labelClasses = "text-[11px] font-black text-slate-500 mb-1 block uppercase";

    return (
        <div className="space-y-6 animate-fade-in">
            <InputModal 
                isOpen={inputModal.isOpen} 
                onClose={() => setInputModal({ isOpen: false, type: null })} 
                onSave={(v) => {
                    const settingsKey = inputModal.type === 'inspector' ? 'inspectors' : 'housingOfficers';
                    const current = (settings as any)[settingsKey] || [];
                    if (!current.includes(v)) {
                        updateSettings({ ...settings, [settingsKey]: [...current, v] });
                        setInspectData({ ...inspectData, [inputModal.type === 'inspector' ? 'inspector' : 'housingOfficer']: v });
                    }
                }} 
                title={inputModal.type === 'inspector' ? "إضافة قائم بالفحص جديد" : "إضافة قائم بالتسكين جديد"} 
            />

            {!purchase ? (
                <div className="max-w-xl mx-auto space-y-4 py-12">
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner"><Search size={40}/></div>
                        <h2 className="text-2xl font-black text-slate-800 font-cairo">بدء استلام مشتريات</h2>
                    </div>
                    <div className="flex gap-2 p-2 bg-white rounded-2xl shadow-xl border border-blue-50">
                        <input className="flex-1 p-4 text-xl font-bold text-center outline-none bg-transparent" placeholder="PO-000001" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} style={forceEnNumsStyle}/>
                        <button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700 text-white px-8 rounded-xl font-black text-lg transition-all shadow-lg">بحث</button>
                    </div>
                </div>
            ) : (
                <div className="space-y-6 max-w-7xl mx-auto">
                    <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-xl grid grid-cols-1 md:grid-cols-4 gap-4 relative">
                        <button onClick={() => setPurchase(null)} className="absolute top-4 left-4 p-2 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-full transition-all"><X size={20}/></button>
                        
                        <div className="md:col-span-4 border-b pb-2 mb-2 flex items-center gap-3">
                            <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg"><ClipboardCheck size={24}/></div>
                            <h3 className="text-xl font-black text-slate-800">بيانات التوريد والفحص لطلب: {purchase.orderNumber}</h3>
                        </div>

                        <div><label className={labelClasses}>اسم المورد</label><input className={inputClasses} value={inspectData.supplierName} onChange={e => setInspectData({...inspectData, supplierName: e.target.value})} /></div>
                        <div><label className={labelClasses}>رقم محضر الفحص</label><input className={inputClasses} value={inspectData.reportNo} onChange={e => setInspectData({...inspectData, reportNo: e.target.value})} /></div>
                        <div>
                            <label className={labelClasses}>القائم بالفحص</label>
                            <div className="flex gap-1">
                                <select className={`${inputClasses} flex-1`} value={inspectData.inspector} onChange={e => setInspectData({...inspectData, inspector: e.target.value})}>
                                    <option value="">-- اختر --</option>
                                    {settings.inspectors?.map(i => <option key={i} value={i}>{i}</option>)}
                                </select>
                                <button onClick={() => setInputModal({ isOpen: true, type: 'inspector' })} className="bg-blue-600 text-white p-2 rounded-xl"><Plus size={18}/></button>
                            </div>
                        </div>
                        <div><label className={labelClasses}>رقم الإضافة سيستم</label><input className={`${inputClasses} border-indigo-200`} value={inspectData.systemAddNo} onChange={e => setInspectData({...inspectData, systemAddNo: e.target.value})} /></div>
                        <div className="md:col-span-2">
                            <label className={labelClasses}>القائم بالتسكين</label>
                            <div className="flex gap-1">
                                <select className={`${inputClasses} flex-1`} value={inspectData.housingOfficer} onChange={e => setInspectData({...inspectData, housingOfficer: e.target.value})}>
                                    <option value="">-- اختر --</option>
                                    {settings.housingOfficers?.map(h => <option key={h} value={h}>{h}</option>)}
                                </select>
                                <button onClick={() => setInputModal({ isOpen: true, type: 'housing' })} className="bg-indigo-600 text-white p-2 rounded-xl"><Plus size={18}/></button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#1e293b] rounded-[2.5rem] border-4 border-slate-700 overflow-hidden shadow-2xl">
                        <table className="w-full text-center text-sm border-collapse bg-white">
                            <thead className="bg-slate-100 font-black h-12 border-b">
                                <tr><th>م</th><th>كود JDE</th><th>الصنف</th><th>الكمية بطلب الشراء</th><th>المستلم سابقاً</th><th>الوارد حالياً</th><th>المتبقي</th></tr>
                            </thead>
                            <tbody className="font-bold">
                                {purchase.items.map((item, idx) => {
                                    const rem = Math.max(0, item.quantity - (item.receivedQuantity || 0) - (Number(receiveData[item.productId]) || 0));
                                    return (
                                        <tr key={idx} className="border-b h-16">
                                            <td>{idx + 1}</td>
                                            <td className="font-mono text-xs">{item.jdeCode}</td>
                                            <td className="text-right pr-6 font-black">{item.productName}</td>
                                            <td style={forceEnNumsStyle}>{item.quantity}</td>
                                            <td style={forceEnNumsStyle}>{item.receivedQuantity || 0}</td>
                                            <td><input type="number" className="w-24 p-2 border-2 border-amber-200 rounded-xl text-center" value={receiveData[item.productId] ?? ''} onChange={e => setReceiveData({...receiveData, [item.productId]: Number(e.target.value)})} style={forceEnNumsStyle}/></td>
                                            <td className="text-rose-600" style={forceEnNumsStyle}>{rem}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button onClick={handleReceive} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-6 rounded-3xl font-black shadow-2xl flex items-center justify-center gap-4 text-2xl transition-all border-b-8 border-emerald-900"><Save size={32}/> تأكيد استلام البضاعة وتحديث المخزون</button>
                        <button onClick={onBack} className="px-12 bg-white text-slate-400 border border-slate-200 rounded-3xl font-black hover:bg-slate-50 transition-all text-xl">إلغاء</button>
                    </div>
                </div>
            )}
        </div>
    );
};

const PurchaseReturnView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { products, refreshProducts, user } = useApp();
    const [search, setSearch] = useState('');
    const [purchase, setPurchase] = useState<Purchase | null>(null);
    const [returnData, setReturnData] = useState<Record<string, number>>({});
    const [reason, setReason] = useState('بضاعة تالفة / غير مطابقة');

    const handleSearch = () => {
        const found = dbService.getPurchases().find(p => p.orderNumber === search && p.status === 'received');
        if (found) {
            setPurchase(JSON.parse(JSON.stringify(found)));
            const initRet: Record<string, number> = {};
            found.items.forEach(i => initRet[i.productId] = 0);
            setReturnData(initRet);
        } else {
            alert('طلب الشراء غير موجود أو لم يتم استلامه بعد.');
        }
    };

    const handleReturn = () => {
        if (!purchase) return;
        const movementItems = purchase.items.map(i => {
            const retQty = Number(returnData[i.productId]) || 0;
            return {
                productId: i.productId, productName: i.productName, productCode: i.productCode, quantity: retQty, unit: i.unit, notes: `مرتجع مشتريات: ${purchase.orderNumber} - ${reason}`
            };
        }).filter(item => item.quantity > 0);

        if (movementItems.length === 0) return alert('يرجى إدخل كميات للمرتجع');

        const movement: StockMovement = {
            id: Date.now().toString(), date: new Date().toISOString(), type: 'out', warehouse: purchase.warehouse, refNumber: 'RET-' + Date.now().toString().slice(-6), user: user?.name || 'Admin', reason: `مرتجع للمورد: ${purchase.supplier}`, items: movementItems
        };
        
        dbService.saveMovement(movement);
        refreshProducts();
        alert('تم خصم المرتجعات من المخزن بنجاح.');
        onBack();
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {!purchase ? (
                <div className="max-w-xl mx-auto space-y-4 py-12">
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4"><Undo2 size={40}/></div>
                        <h2 className="text-2xl font-black text-slate-800">مرتجع مشتريات لمورد</h2>
                    </div>
                    <div className="flex gap-2 p-2 bg-white rounded-2xl shadow-xl border border-rose-50">
                        <input className="flex-1 p-4 text-xl font-bold text-center outline-none bg-transparent" placeholder="PO-000001" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} style={forceEnNumsStyle}/>
                        <button onClick={handleSearch} className="bg-rose-600 hover:bg-rose-700 text-white px-8 rounded-xl font-black text-lg transition-all shadow-lg">بحث</button>
                    </div>
                </div>
            ) : (
                <div className="space-y-6 max-w-7xl mx-auto">
                    <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-xl relative">
                        <button onClick={() => setPurchase(null)} className="absolute top-4 left-4 p-2 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-full transition-all"><X size={20}/></button>
                        <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3"><Undo2 size={24} className="text-rose-600"/> مرتجع من طلب شراء رقم: {purchase.orderNumber}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div><label className="text-xs font-black text-slate-400 mb-1 block uppercase">المورد</label><input className="w-full p-3 bg-slate-50 rounded-xl font-black" value={purchase.supplier} readOnly /></div>
                            <div className="md:col-span-2"><label className="text-xs font-black text-slate-400 mb-1 block uppercase">سبب الارتجاع</label><input className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold" value={reason} onChange={e => setReason(e.target.value)} /></div>
                        </div>
                    </div>
                    <div className="bg-[#1e293b] rounded-[2.5rem] border-4 border-slate-700 overflow-hidden shadow-2xl">
                        <table className="w-full text-center text-sm border-collapse bg-white">
                            <thead className="bg-slate-100 font-black h-12 border-b">
                                <tr><th>م</th><th>الصنف</th><th>الكمية المستلمة فعلياً</th><th>كمية المرتجع</th><th>المتبقي بالمخزن</th></tr>
                            </thead>
                            <tbody className="font-bold">
                                {purchase.items.map((item, idx) => (
                                    <tr key={idx} className="border-b h-16">
                                        <td>{idx + 1}</td>
                                        <td className="text-right pr-6 font-black">{item.productName}</td>
                                        <td style={forceEnNumsStyle}>{item.receivedQuantity || 0}</td>
                                        <td><input type="number" className="w-24 p-2 border-2 border-rose-200 rounded-xl text-center text-rose-700" value={returnData[item.productId] ?? ''} onChange={e => setReturnData({...returnData, [item.productId]: Number(e.target.value)})} style={forceEnNumsStyle}/></td>
                                        <td className="text-slate-400" style={forceEnNumsStyle}>{Math.max(0, (item.receivedQuantity || 0) - (returnData[item.productId] || 0))}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex gap-4 pt-4">
                        <button onClick={handleReturn} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-6 rounded-3xl font-black shadow-2xl flex items-center justify-center gap-4 text-2xl transition-all border-b-8 border-rose-900"><RotateCcw size={32}/> تأكيد المرتجع وخصم المخزون</button>
                        <button onClick={onBack} className="px-12 bg-white text-slate-400 border border-slate-200 rounded-3xl font-black hover:bg-slate-50 transition-all text-xl">إلغاء</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export const Purchases: React.FC = () => {
    const { settings, t, uiConfig, user } = useApp();
    const [viewMode, setViewMode] = useState<'menu' | 'add' | 'list' | 'receive' | 'reports' | 'return'>('menu');
    const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
    const [searchParams] = useSearchParams();
    const filterWh = searchParams.get('wh') as WarehouseType | undefined;
    const navigate = useNavigate();

    const handleAction = (action: string) => {
        if (action.startsWith('view:')) setViewMode(action.split(':')[1] as any);
        else if (action.startsWith('navigate:')) navigate(action.split(':')[1]);
    };

    const handleBack = () => {
        if (viewMode !== 'menu') {
            if (viewMode === 'add' && editingPurchase) setViewMode('list');
            else setViewMode('menu');
            setEditingPurchase(null);
        } else {
            if (filterWh === 'raw') navigate('/warehouse/raw');
            else if (filterWh === 'parts') navigate('/warehouse/general?section=parts');
            else if (filterWh === 'catering') navigate('/warehouse/general?section=catering');
            else navigate('/');
        }
    };

    const EXTRA_LABELS: Record<string, string> = { 'return': 'مرتجع مشتريات' };
    const currentButton = uiConfig.purchases.buttons.find(b => b.action === `view:${viewMode}`);
    const viewTitle = viewMode === 'menu' ? t('purchases') : (EXTRA_LABELS[viewMode] || (settings.language === 'ar' ? (currentButton?.labelAr || t(currentButton?.labelKey || '')) : (currentButton?.labelEn || t(currentButton?.labelKey || ''))));

    return (
        <div className="p-4 space-y-4" dir="rtl">
            <div className="bg-gradient-to-l from-slate-50 via-blue-50/30 to-slate-50 border-y-4 border-blue-600 shadow-premium px-10 py-6 flex items-center justify-between relative overflow-hidden h-32 animate-fade-in mb-8 rounded-[2rem]">
                 <button onClick={handleBack} className="flex items-center gap-3 bg-[#1e293b] hover:bg-black text-white px-8 py-3.5 rounded-2xl font-black transition-all active:scale-95 group border border-slate-700/50 relative z-10">
                    <ChevronLeft size={22} className="group-hover:-translate-x-1 transition-transform" /> 
                    <span>{viewMode === 'menu' ? t('backToMain') : 'رجوع'}</span>
                 </button>
                 <div className="flex-1 flex flex-col items-center justify-center">
                    <h1 className="text-5xl font-black text-blue-900 font-cairo leading-tight drop-shadow-sm">{viewTitle}</h1>
                    <div className="mt-2 h-2 w-3/4 bg-gradient-to-r from-transparent via-blue-600 to-transparent rounded-full opacity-30"></div>
                 </div>
                 <div className="p-4 bg-white border border-blue-100 text-blue-600 rounded-[1.5rem] shadow-xl shrink-0">
                    <ShoppingCart size={38} strokeWidth={2.5}/>
                 </div>
            </div>

            {viewMode === 'menu' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                    {uiConfig.purchases.buttons.filter(b => b.isVisible).map(btn => {
                        const Icon = getIcon(btn.icon);
                        return (
                            <button key={btn.id} onClick={() => handleAction(btn.action)} className={`${btn.color} text-white p-6 rounded-[2.5rem] shadow-xl flex flex-col items-center justify-center gap-4 min-h-[160px] group hover:scale-105 transition-all border-4 border-white/20`}>
                                <div className="bg-white/20 p-4 rounded-3xl group-hover:scale-110 shadow-inner"><Icon size={36}/></div>
                                <span className="font-black text-xl">{settings.language === 'ar' ? (btn.labelAr || t(btn.labelKey)) : (btn.labelEn || t(btn.labelKey))}</span>
                            </button>
                        );
                    })}
                    {/* زر المرتجع الإضافي */}
                    <button onClick={() => setViewMode('return')} className="bg-rose-600 text-white p-6 rounded-[2.5rem] shadow-xl flex flex-col items-center justify-center gap-4 min-h-[160px] group hover:scale-105 transition-all border-4 border-white/20">
                        <div className="bg-white/20 p-4 rounded-3xl group-hover:scale-110 shadow-inner"><Undo2 size={36}/></div>
                        <span className="font-black text-xl">مرتجع مشتريات</span>
                    </button>
                </div>
            )}

            {viewMode !== 'menu' && (
                <GlassCard className="min-h-[500px] p-6 shadow-premium rounded-[3rem]">
                    {viewMode === 'add' && <AddPurchaseView filterWh={filterWh} editingPurchase={editingPurchase} onBack={handleBack} onSaveSuccess={() => { setViewMode('list'); setEditingPurchase(null); }} />}
                    {viewMode === 'list' && <PurchaseListView filterWh={filterWh} onEdit={(p) => { setEditingPurchase(p); setViewMode('add'); }} onBack={handleBack} />}
                    {viewMode === 'receive' && <ReceivePurchaseView filterWh={filterWh} onBack={handleBack} />}
                    {viewMode === 'return' && <PurchaseReturnView onBack={handleBack} />}
                    {viewMode === 'reports' && <PurchaseItemsReport />}
                </GlassCard>
            )}
        </div>
    );
};
