
import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { dbService } from '../services/storage';
import { Search, Printer, Filter, FileDown, FileUp, FileText, Settings, ArrowRightLeft } from 'lucide-react';
import { printService } from '../services/printing';
import * as XLSX from 'xlsx';
// Fix: Added GlassCard to imports
import { PrintSettingsModal } from './PrintSettingsModal';
import { GlassCard } from './NeumorphicUI';
import { WarehouseType } from '../types';

const forceEnNumsStyle = {
    fontFamily: 'Inter, sans-serif',
    fontVariantNumeric: 'lining-nums',
    direction: 'ltr' as const
};

interface Props {
    warehouse?: WarehouseType;
}

export const ItemWithdrawalsReport: React.FC<Props> = ({ warehouse }) => {
    const { settings, products } = useApp();
    const [selectedItemName, setSelectedItemName] = useState('');
    const [dateFilter, setDateFilter] = useState({
        start: new Date().toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    const [showPrintModal, setShowPrintModal] = useState(false);

    const PRINT_CONTEXT = warehouse ? `withdrawals_${warehouse}` : 'sales_item_withdrawals';

    // جلب البيانات من المبيعات والحركات
    const sales = dbService.getSales();
    const movements = dbService.getMovements();

    // استخراج الأصناف المتاحة للفلترة بناءً على المخزن
    const itemOptions = useMemo(() => {
        const filtered = warehouse ? products.filter(p => p.warehouse === warehouse) : products;
        return filtered.map(p => ({ name: p.name, code: p.barcode, id: p.id }));
    }, [products, warehouse]);

    // تجميع وتصفية البيانات (ذكاء صناعي للتقرير)
    const reportData = useMemo(() => {
        if (!selectedItemName) return [];

        const start = new Date(dateFilter.start); start.setHours(0,0,0,0);
        const end = new Date(dateFilter.end); end.setHours(23,59,59,999);

        let combinedData: any[] = [];

        // 1. معالجة المبيعات (خاصة بالمنتج التام أو الخامات المباعة)
        sales.forEach(sale => {
            const d = new Date(sale.date);
            if (d >= start && d <= end) {
                sale.items
                    .filter(item => item.name === selectedItemName)
                    .forEach(item => {
                        combinedData.push({
                            id: sale.id,
                            date: sale.date,
                            recipient: sale.customer || 'عميل نقدي',
                            type: 'بيع',
                            itemCode: item.barcode,
                            qtyBulk: item.quantityBulk || 0,
                            qtyPacked: item.quantityPacked || 0,
                            total: item.quantity,
                            notes: sale.notes || '-'
                        });
                    });
            }
        });

        // 2. معالجة حركات الصرف (خامات، قطع غيار، إعاشة، صرف تام)
        movements.forEach(m => {
            const d = new Date(m.date);
            // نفترض أن المسحوبات هي النوع out أو transfer صادر
            if (d >= start && d <= end && (m.type === 'out' || m.type === 'transfer')) {
                if (warehouse && m.warehouse !== warehouse) return;

                m.items
                    .filter(item => item.productName === selectedItemName)
                    .forEach(item => {
                        combinedData.push({
                            id: m.refNumber || m.id,
                            date: m.date,
                            recipient: m.reason || m.customFields?.recipientName || 'جهة داخلية',
                            type: m.type === 'transfer' ? 'تحويل' : 'صرف مخزني',
                            itemCode: item.productCode || '-',
                            qtyBulk: item.quantityBulk || 0,
                            qtyPacked: item.quantityPacked || 0,
                            total: item.quantity,
                            notes: item.notes || m.reason || '-'
                        });
                    });
            }
        });

        return combinedData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [sales, movements, selectedItemName, dateFilter, warehouse]);

    const totalQty = reportData.reduce((sum, row) => sum + row.total, 0);
    const selectedItemDetails = itemOptions.find(i => i.name === selectedItemName);
    const itemCode = selectedItemDetails ? selectedItemDetails.code : '-';

    const handlePrint = () => {
        if (!selectedItemName) return;
        const config = settings.printConfigs[PRINT_CONTEXT] || settings.printConfigs['default'];
        
        const html = `
            <!DOCTYPE html>
            <html dir="rtl">
            <head>
                <style>${printService.getStyles(settings, config)}</style>
            </head>
            <body>
                <div style="text-align:center; border: 2px solid #000; padding: 15px; background: #f8fafc; margin-bottom: 20px;">
                    <h1 style="margin:0; color:#1e3a8a;">تقرير مسحوبات صنف: ${selectedItemName}</h1>
                    <p style="font-weight:bold;">الفترة من ${dateFilter.start} إلى ${dateFilter.end}</p>
                    <div style="display:flex; justify-content: space-around; margin-top:10px; font-size:1.2em;">
                        <span>كود الصنف: <b>${itemCode}</b></span>
                        <span>إجمالي المسحوبات: <b style="color:#c026d3;">${totalQty.toFixed(3)}</b></span>
                    </div>
                </div>
                <table border="1" style="width:100%; border-collapse:collapse; text-align:center;">
                    <thead style="background:#1e293b; color:#fff;">
                        <tr>
                            <th>التاريخ</th>
                            <th>رقم السند</th>
                            <th>الجهة المستلمة</th>
                            <th>النوع</th>
                            <th>الكمية صب</th>
                            <th>الكمية معبأ</th>
                            <th>الإجمالي</th>
                            <th>ملاحظات</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${reportData.map(row => `
                            <tr>
                                <td style="font-family:Inter;">${new Date(row.date).toLocaleDateString('en-GB')}</td>
                                <td>${row.id}</td>
                                <td style="text-align:right; padding-right:10px;">${row.recipient}</td>
                                <td>${row.type}</td>
                                <td>${row.qtyBulk || '-'}</td>
                                <td>${row.qtyPacked || '-'}</td>
                                <td style="font-weight:bold;">${row.total.toFixed(3)}</td>
                                <td style="font-size:0.8em;">${row.notes}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </body>
            </html>
        `;
        printService.printWindow(html);
    };

    return (
        <div className="space-y-6 animate-fade-in font-cairo" dir="rtl">
            {showPrintModal && <PrintSettingsModal isOpen={showPrintModal} onClose={() => setShowPrintModal(false)} context={PRINT_CONTEXT} />}
            
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl flex flex-col xl:flex-row items-end gap-4 no-print">
                <div className="flex-1 w-full relative">
                    <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">اختر الصنف المراد متابعته</label>
                    <div className="relative">
                        <select 
                            className="w-full p-3.5 pr-10 border-2 border-slate-50 bg-slate-50 rounded-2xl outline-none focus:bg-white focus:border-blue-500 font-bold shadow-inner transition-all appearance-none"
                            value={selectedItemName}
                            onChange={e => setSelectedItemName(e.target.value)}
                        >
                            <option value="">-- حدد صنف من مخزن ${warehouse || 'الكل'} --</option>
                            {itemOptions.map(i => <option key={i.id} value={i.name}>{i.name} (كود: ${i.code})</option>)}
                        </select>
                        <Search className="absolute left-4 top-3.5 text-slate-300" size={20}/>
                    </div>
                </div>

                <div className="flex gap-3">
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black text-slate-400 pr-1">من تاريخ</label>
                        <input type="date" value={dateFilter.start} onChange={e => setDateFilter({...dateFilter, start: e.target.value})} className="p-3 border-2 border-slate-50 bg-slate-50 rounded-xl font-bold h-12" style={forceEnNumsStyle}/>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black text-slate-400 pr-1">إلى تاريخ</label>
                        <input type="date" value={dateFilter.end} onChange={e => setDateFilter({...dateFilter, end: e.target.value})} className="p-3 border-2 border-slate-50 bg-slate-50 rounded-xl font-bold h-12" style={forceEnNumsStyle}/>
                    </div>
                </div>
                
                <div className="flex gap-2">
                    <button onClick={() => setShowPrintModal(true)} className="p-3 bg-slate-50 text-slate-400 border border-slate-200 rounded-2xl hover:text-indigo-600 transition-all shadow-sm"><Settings size={22}/></button>
                    <button onClick={handlePrint} disabled={!selectedItemName} className="bg-indigo-600 text-white px-10 py-3 h-12 rounded-2xl font-black shadow-lg hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center gap-2 border-b-4 border-indigo-900 active:scale-95">
                        <Printer size={20}/> عرض التقرير للطباعة
                    </button>
                </div>
            </div>

            {selectedItemName && (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <GlassCard className="p-6 border-r-8 border-indigo-600 shadow-lg">
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">اسم الصنف الحالي</p>
                            <h3 className="text-xl font-black text-slate-800">{selectedItemName}</h3>
                        </GlassCard>
                        <GlassCard className="p-6 border-r-8 border-blue-500 shadow-lg">
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">كود الصنف</p>
                            <h3 className="text-xl font-black text-blue-600 font-mono" style={forceEnNumsStyle}>{itemCode}</h3>
                        </GlassCard>
                        <GlassCard className="p-6 border-r-8 border-emerald-500 shadow-lg">
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">إجمالي المسحوبات في الفترة</p>
                            <h3 className="text-3xl font-black text-emerald-600" style={forceEnNumsStyle}>{totalQty.toFixed(3)} <span className="text-sm">طن/عدد</span></h3>
                        </GlassCard>
                    </div>

                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-center border-collapse">
                                <thead className="bg-[#0f172a] text-white h-14">
                                    <tr className="text-[11px] font-black uppercase tracking-widest">
                                        <th className="p-3 border-l border-slate-800">التاريخ</th>
                                        <th className="p-3 border-l border-slate-800">رقم السند</th>
                                        <th className="p-3 border-l border-slate-800 text-right pr-6">الجهة المستلمة</th>
                                        <th className="p-3 border-l border-slate-800">نوع الحركة</th>
                                        <th className="p-3 border-l border-slate-800">كمية صب</th>
                                        <th className="p-3 border-l border-slate-800">كمية معبأ</th>
                                        <th className="p-3 border-l border-slate-800 bg-blue-900/50">الإجمالي</th>
                                        <th className="p-3">ملاحظات</th>
                                    </tr>
                                </thead>
                                <tbody className="text-[13px] font-bold text-slate-700">
                                    {reportData.map((row, idx) => (
                                        <tr key={`${row.id}-${idx}`} className="border-b hover:bg-indigo-50/50 transition-colors h-14">
                                            <td className="p-3 border-l" style={forceEnNumsStyle}>{new Date(row.date).toLocaleDateString('en-GB')}</td>
                                            <td className="p-3 border-l font-mono text-indigo-600">{row.id}</td>
                                            <td className="p-3 border-l text-right pr-6 font-black text-slate-900">{row.recipient}</td>
                                            <td className="p-3 border-l text-[10px]">
                                                <span className={`px-3 py-1 rounded-full text-white font-black ${row.type === 'بيع' ? 'bg-emerald-500' : row.type === 'تحويل' ? 'bg-blue-500' : 'bg-orange-500'}`}>
                                                    {row.type}
                                                </span>
                                            </td>
                                            <td className="p-3 border-l" style={forceEnNumsStyle}>{row.qtyBulk > 0 ? row.qtyBulk.toFixed(3) : '-'}</td>
                                            <td className="p-3 border-l" style={forceEnNumsStyle}>{row.qtyPacked > 0 ? row.qtyPacked.toFixed(3) : '-'}</td>
                                            <td className="p-3 border-l text-lg font-black text-blue-800 bg-blue-50/30" style={forceEnNumsStyle}>{row.total.toFixed(3)}</td>
                                            <td className="p-3 text-xs text-slate-400 italic truncate max-w-xs">{row.notes}</td>
                                        </tr>
                                    ))}
                                    {reportData.length === 0 && (
                                        <tr><td colSpan={8} className="p-20 text-slate-300 italic font-black text-xl">لا توجد مسحوبات مسجلة لهذا الصنف في الفترة المختارة</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
