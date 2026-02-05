
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { dbService } from '../services/storage';
import { 
    Search, Printer, Settings, ShoppingCart, Truck, Clock, ClipboardList,
    Calendar, FileSpreadsheet
} from 'lucide-react';
import { printService } from '../services/printing';
import { TableToolbar } from './TableToolbar';
import { PrintSettingsModal } from './PrintSettingsModal';
import { GlassCard } from './NeumorphicUI';
import * as XLSX from 'xlsx';

const forceEnNumsStyle = {
    fontFamily: 'Inter, sans-serif',
    fontVariantNumeric: 'lining-nums',
    direction: 'ltr' as const
};

const DEFAULT_STYLES = {
    fontFamily: 'Calibri, sans-serif', fontSize: 13, isBold: true, decimals: 2, rowHeight: 45, columnWidth: 140
};

export const PurchaseItemsReport: React.FC = () => {
    const { settings, products } = useApp();
    const [dateFilter, setDateFilter] = useState({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSupplier, setSelectedSupplier] = useState('all');
    const [selectedWarehouse, setSelectedWarehouse] = useState('all');
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [tableStyles, setTableStyles] = useState(DEFAULT_STYLES);

    const purchases = dbService.getPurchases();

    const reportData = useMemo(() => {
        const start = new Date(dateFilter.start); start.setHours(0,0,0,0);
        const end = new Date(dateFilter.end); end.setHours(23,59,59,999);
        return purchases
            .filter(p => {
                const d = new Date(p.date);
                return d >= start && d <= end && (selectedSupplier === 'all' || p.supplier === selectedSupplier) && (selectedWarehouse === 'all' || p.warehouse === selectedWarehouse);
            })
            .flatMap(p => p.items.map(item => ({
                ...item, orderNumber: p.orderNumber, date: p.date, supplier: p.supplier, status: p.status, remaining: Math.max(0, item.quantity - (item.receivedQuantity || 0))
            })))
            .filter(row => row.productName.toLowerCase().includes(searchTerm.toLowerCase()) || row.orderNumber.includes(searchTerm) || row.supplier.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [purchases, dateFilter, searchTerm, selectedSupplier, selectedWarehouse]);

    const handleExport = () => {
        const ws = XLSX.utils.json_to_sheet(reportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Purchases");
        XLSX.writeFile(wb, `Purchases_Report_${dateFilter.end}.xlsx`);
    };

    const handlePrint = () => {
        printService.printWindow(document.getElementById('purchase-print-area')?.innerHTML || '');
    };

    return (
        <div className="space-y-6 animate-fade-in font-cairo" dir="rtl">
            {showPrintModal && <PrintSettingsModal isOpen={showPrintModal} onClose={() => setShowPrintModal(false)} context="purchases" />}
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-xl flex flex-col xl:flex-row items-end gap-6 no-print">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 flex-1 w-full items-end">
                    <div className="flex flex-col gap-1"><label className="text-xs font-black text-slate-400">من</label><input type="date" value={dateFilter.start} onChange={e => setDateFilter({...dateFilter, start: e.target.value})} className="w-full p-2.5 border rounded-xl font-bold" style={forceEnNumsStyle}/></div>
                    <div className="flex flex-col gap-1"><label className="text-xs font-black text-slate-400">إلى</label><input type="date" value={dateFilter.end} onChange={e => setDateFilter({...dateFilter, end: e.target.value})} className="w-full p-2.5 border rounded-xl font-bold" style={forceEnNumsStyle}/></div>
                    <div className="flex-1"><label className="text-xs font-black text-slate-400">بحث</label><input className="w-full p-2.5 rounded-xl border font-bold" placeholder="رقم الطلب أو الصنف..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleExport} className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-xs flex items-center gap-2 shadow-lg"><FileSpreadsheet size={20}/> تصدير Excel</button>
                    <button onClick={handlePrint} className="bg-slate-800 text-white px-6 py-3 rounded-2xl font-black text-xs flex items-center gap-2 shadow-lg"><Printer size={20}/> طباعة</button>
                    <button onClick={() => setShowPrintModal(true)} className="p-3 bg-slate-100 rounded-2xl text-slate-400"><Settings size={22}/></button>
                </div>
            </div>
            <div id="purchase-print-area" className="flex-1 bg-white rounded-[2.5rem] border-2 border-slate-200 shadow-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-center border-collapse">
                        <thead className="bg-[#0f172a] text-white h-14">
                            <tr className="text-[11px] uppercase">
                                <th>تاريخ الطلب</th><th>رقم الطلب</th><th>المورد</th><th>الصنف</th><th>المطلوب</th><th>المستلم</th><th>المتبقي</th><th>الحالة</th>
                            </tr>
                        </thead>
                        <tbody className="text-[13px] font-bold">
                            {reportData.map((row, idx) => (
                                <tr key={idx} className="border-b h-12 hover:bg-slate-50 transition-colors">
                                    <td style={forceEnNumsStyle}>{row.date}</td><td className="font-mono text-indigo-700">{row.orderNumber}</td><td>{row.supplier}</td><td className="text-right pr-6">{row.productName}</td><td>{row.quantity}</td><td>{row.receivedQuantity || 0}</td><td className="text-rose-600">{row.remaining}</td><td>{row.status === 'received' ? 'مستلم' : 'معلق'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
