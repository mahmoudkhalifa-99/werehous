import React, { useState, useMemo, useRef, useEffect, useLayoutEffect } from 'react';
import { useApp } from '../context/AppContext';
import { dbService } from '../services/storage';
import { 
    Search, Trash2, RotateCcw, Eye, EyeOff, FileUp, FileDown, Printer, Settings
} from 'lucide-react';
import { printService } from '../services/printing';
import { StockMovement, Sale } from '../types';
import { ConfirmModal } from './NeumorphicUI';
import { PrintSettingsModal } from './PrintSettingsModal';
import { ReportActionsBar } from './ReportActionsBar';
import { TableToolbar } from './TableToolbar';
import * as XLSX from 'xlsx';

const forceEnNumsStyle = {
    fontVariantNumeric: 'lining-nums',
    direction: 'ltr' as const,
    fontSize: '12px'
};

const DEFAULT_STYLES = {
    fontFamily: 'Calibri, sans-serif',
    fontSize: 12,
    isBold: true,
    isItalic: false,
    isUnderline: false,
    textAlign: 'center' as 'right' | 'center' | 'left',
    verticalAlign: 'middle' as 'top' | 'middle' | 'bottom',
    decimals: 2
};

export const PeriodFinishedReport: React.FC = () => {
  const { products, settings, refreshProducts, user, t, deleteProduct } = useApp();
  const [dateFilter, setDateFilter] = useState({ 
      start: new Date().toISOString().split('T')[0], 
      end: new Date().toISOString().split('T')[0] 
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [hideZeroRows, setHideZeroRows] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [tableStyles, setTableStyles] = useState(() => {
      const saved = localStorage.getItem('glasspos_period_styles');
      return saved ? { ...DEFAULT_STYLES, ...JSON.parse(saved) } : DEFAULT_STYLES;
  });

  useEffect(() => {
      localStorage.setItem('glasspos_period_styles', JSON.stringify(tableStyles));
  }, [tableStyles]);

  const [frozenCols] = useState(3);
  const tableRef = useRef<HTMLTableElement>(null);
  const [colWidths, setColWidths] = useState<number[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [sales, setSales] = useState<Sale[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);

  useEffect(() => {
      setSales(dbService.getSales());
      setMovements(dbService.getMovements());
  }, [products]); 

  const isViewOnly = user?.permissions?.screens?.['finished'] === 'view';
  const isAdmin = user?.role === 'admin';

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

  const formatEng = (val: number) => {
    if (!val && val !== 0) return ""; 
    if (Math.abs(val) < 0.00001 && val !== 0) return "";
    return val.toLocaleString('en-US', { 
        minimumFractionDigits: tableStyles.decimals, 
        maximumFractionDigits: tableStyles.decimals 
    });
  };

  const reportData = useMemo(() => {
    // تعديل هنا: شمول فئات المنتج التام حتى لو لم يكن المخزن "finished"
    const finishedProducts = products.filter(p => 
        p.warehouse === 'finished' || 
        p.category === 'أعلاف' || 
        p.category === 'بيوتولوجى'
    );

    let data = finishedProducts.map(product => {
        const row = {
            product,
            openingBulk: 0, openingPacked: 0,
            prodBulk: 0, receivedPacked: 0, 
            adjInPacked: 0, adjInBulk: 0,   
            returnClientPacked: 0, returnClientBulk: 0, 
            transferPacked: 0, transferBulk: 0, 
            salesFarmPacked: 0, salesFarmBulk: 0, 
            salesClientPacked: 0, salesClientBulk: 0, 
            outletTransfers: 0, 
            unfinishedPacked: 0, unfinishedBulk: 0, 
            adjOutPacked: 0, adjOutBulk: 0, 
            totalBalance: 0, packedBalance: 0,
            openingCount: 0, emptySacks: 0, siloRemains: 0, diff: 0, sackWeight: 0
        };

        const startDate = new Date(dateFilter.start); startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(dateFilter.end); endDate.setHours(23, 59, 59, 999);
        const isBulkItem = (product.unit?.toLowerCase() === 'ton' || product.unit?.toLowerCase() === 'طن' || product.unit?.includes('صب'));
        row.sackWeight = product.sackWeight || (isBulkItem ? 0 : (product.name.includes('25') ? 25 : 50));
        const getImpact = (q: number, qB: number, qP: number, t: string, n: string) => {
            if (n.includes('شكاير')) return { bulk: 0, packed: 0 };
            let b = qB, p = qP; if (b === 0 && p === 0) { if (isBulkItem) b = q; else p = q; }
            let mult = (t === 'out' || t === 'sale' || (t === 'adjustment' && (n.includes('عجز') || n.includes('خصم')))) ? -1 : 1;
            return { bulk: b * mult, packed: p * mult };
        };
        const categorize = (qty: number, isBulk: boolean, type: string, notes: string = '', salesType: string = '') => {
            const absQty = Math.abs(qty); const n = notes.toLowerCase(); const sType = (salesType || '').toLowerCase();
            if (n.includes('جرد')) { row.openingCount += qty; return; }
            if (n.includes('غير تام')) { if (isBulk) row.unfinishedBulk += absQty; else row.unfinishedPacked += absQty; return; }
            if (type === 'sale' && qty < 0) { if (isBulk) row.returnClientBulk += absQty; else row.returnClientPacked += absQty; return; }
            if (type === 'in' && n.includes('مرتجع')) { if (isBulk) row.returnClientBulk += absQty; else row.returnClientPacked += absQty; return; }
            if (type === 'in') { if (n.includes('تسوية') || n.includes('إضافة')) { if (isBulk) row.adjInBulk += absQty; else row.adjInPacked += absQty; } else { if (isBulk) row.prodBulk += absQty; else row.receivedPacked += absQty; } return; }
            if (type === 'sale' && qty > 0) { if (sType.includes('مزارع')) { if (isBulk) row.salesFarmBulk += absQty; else row.salesFarmPacked += absQty; } else if (sType.includes('منافذ')) { row.outletTransfers += absQty; } else { if (isBulk) row.salesClientBulk += absQty; else row.salesClientPacked += absQty; } return; }
            if (type === 'out' || (type === 'adjustment' && qty < 0)) { if (n.includes('تسوية') || n.includes('عجز')) { if (isBulk) row.adjOutBulk += absQty; else row.adjOutPacked += absQty; } else { if (isBulk) row.transferBulk += absQty; else row.transferPacked += absQty; } return; }
        };

        let historicalChangeBulk = 0; let historicalChangePacked = 0;
        movements.forEach(m => {
            const mDate = new Date(m.date); const item = m.items.find(i => i.productId === product.id);
            if (item) {
                const impact = getImpact(Number(item.quantity), Number(item.quantityBulk || 0), Number(item.quantityPacked || 0), m.type, (m.reason || '') + (item.notes || ''));
                if (mDate < startDate) { historicalChangeBulk += impact.bulk; historicalChangePacked += impact.packed; }
                if (mDate >= startDate && mDate <= endDate) {
                    const qB = Number(item.quantityBulk || 0), qP = Number(item.quantityPacked || 0), notes = (m.reason || '') + (item.notes || '');
                    if (qB !== 0) categorize(m.type === 'out' ? -Math.abs(qB) : Math.abs(qB), true, m.type, notes);
                    if (qP !== 0) categorize(m.type === 'out' ? -Math.abs(qP) : Math.abs(qP), false, m.type, notes);
                    if (qB === 0 && qP === 0) categorize(m.type === 'out' ? -Number(item.quantity) : Number(item.quantity), isBulkItem, m.type, notes);
                }
            }
        });
        sales.forEach(s => {
            const sDate = new Date(s.date); const item = s.items.find(i => i.id === product.id);
            if (item) {
                const impact = getImpact(item.quantity, item.quantityBulk || 0, item.quantityPacked || 0, 'sale', '');
                if (sDate < startDate) { historicalChangeBulk += impact.bulk; historicalChangePacked += impact.packed; }
                if (sDate >= startDate && sDate <= endDate) {
                    const qB = Number(item.quantityBulk || 0), qP = Number(item.quantityPacked || 0);
                    if (qB !== 0) categorize(item.quantity < 0 ? -Math.abs(qB) : Math.abs(qB), true, 'sale', '', item.salesType);
                    if (qP !== 0) categorize(item.quantity < 0 ? -Math.abs(qP) : Math.abs(qP), false, 'sale', '', item.salesType);
                    if (qB === 0 && qP === 0) categorize(item.quantity, isBulkItem, 'sale', '', item.salesType);
                }
            }
        });
        row.openingBulk = (product.stockBulk || 0) + historicalChangeBulk;
        row.openingPacked = (product.stockPacked || 0) + historicalChangePacked;
        const periodIn = row.prodBulk + row.receivedPacked + row.adjInPacked + row.adjInBulk + row.returnClientPacked + row.returnClientBulk;
        const periodOut = row.transferPacked + row.transferBulk + row.salesFarmPacked + row.salesFarmBulk + row.salesClientPacked + row.salesClientBulk + row.outletTransfers + row.unfinishedPacked + row.unfinishedBulk + row.adjOutPacked + row.adjOutBulk;
        row.totalBalance = (row.openingBulk + row.openingPacked) + periodIn - periodOut;
        row.packedBalance = row.openingPacked + row.receivedPacked + row.adjInPacked + row.returnClientPacked - (row.transferPacked + row.salesFarmPacked + row.salesClientPacked + row.outletTransfers + row.unfinishedPacked + row.adjOutPacked);
        row.siloRemains = row.totalBalance - row.openingCount;
        row.diff = row.packedBalance - row.openingCount;
        return row;
    });

    if (hideZeroRows) {
        data = data.filter(row => Math.abs(row.totalBalance) > 0.001 || Math.abs(row.openingBulk) > 0.001 || Math.abs(row.openingPacked) > 0.001 || Math.abs(row.prodBulk) > 0.001);
    }

    return data.filter(row => row.product.name.toLowerCase().includes(searchTerm.toLowerCase()) || row.product.barcode.includes(searchTerm));
  }, [products, sales, movements, dateFilter, searchTerm, hideZeroRows]);

  const handleExport = () => {
    const headers = ['الصنف', 'أول صب', 'أول معبأ', 'إنتاج صب', 'الرصيد الكلي'];
    const data = reportData.map(row => [row.product.name, row.openingBulk, row.openingPacked, row.prodBulk, row.totalBalance]);
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    XLSX.utils.book_append_sheet(wb, ws, "PeriodReport");
    XLSX.writeFile(wb, `period_report_${dateFilter.end}.xlsx`);
  };

  const totals = useMemo(() => {
    const t = { openingBulk: 0, openingPacked: 0, prodBulk: 0, receivedPacked: 0, adjInPacked: 0, adjInBulk: 0, returnClientPacked: 0, returnClientBulk: 0, transferPacked: 0, transferBulk: 0, salesFarmPacked: 0, salesFarmBulk: 0, salesClientPacked: 0, salesClientBulk: 0, outletTransfers: 0, unfinishedPacked: 0, unfinishedBulk: 0, adjOutPacked: 0, adjOutBulk: 0, totalBalance: 0, packedBalance: 0, openingCount: 0, emptySacks: 0, siloRemains: 0, diff: 0 };
    reportData.forEach(r => { Object.keys(t).forEach(k => (t as any)[k] += (r as any)[k]); });
    return t;
  }, [reportData]);

  useLayoutEffect(() => {
    const measure = () => { if (tableRef.current) { const ths = tableRef.current.querySelectorAll('thead th'); setColWidths(Array.from(ths).map(th => (th as HTMLElement).getBoundingClientRect().width)); } };
    const timer = setTimeout(measure, 100);
    window.addEventListener('resize', measure);
    return () => { window.removeEventListener('resize', measure); clearTimeout(timer); };
  }, [reportData, tableStyles]);

  const getSticky = (cIdx: number, rIdx: number, bg: string = '#fff') => {
    const isC = cIdx < frozenCols;
    if (!isC) return {};
    const s: React.CSSProperties = { position: 'sticky', right: `${colWidths.slice(0, cIdx).reduce((a, b) => a + b, 0)}px`, zIndex: 10, backgroundColor: bg };
    return s;
  };

  const handleImportTrigger = () => fileInputRef.current?.click();

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    alert("الاستيراد قيد التطوير لهذا التقرير.");
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const headers = [ t('code'), t('item'), t('unit'), 'رصيد أول صب (نهاية مسبقة)', 'رصيد أول معبأ (نهاية مسبقة)', 'إنتاج صب', 'استلامات معبأ', 'تسوية(+) معبأ', 'تسوية(+) صب', 'مرتجع معبأ', 'مرتجع صب', 'تحويل معبأ', 'تحويل صب', 'مزارع معبأ', 'مزارع صب', 'عملاء معبأ', 'عملاء صب', 'منافذ', 'غير تام معبأ', 'غير تام صب', 'تسوية(-) معبأ', 'تسوية(-) صب', 'الرصيد الكلي', 'رصيد المعبأ', 'جرد اليوم', 'وزن الشكارة', 'الشكاير', 'متبقى صوامع', 'الفرق' ];

  return (
    <div className="space-y-4 animate-fade-in" dir="rtl">
        {showPrintModal && <PrintSettingsModal isOpen={showPrintModal} onClose={() => setShowPrintModal(false)} context="finished" />}
        
        <TableToolbar styles={tableStyles} setStyles={setTableStyles} onReset={() => setTableStyles(DEFAULT_STYLES)} />

        <div className="bg-[#f3f4f6] p-2 rounded-xl border border-gray-300 shadow-sm flex flex-col gap-2 no-print select-none">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-2">
                <div className="flex gap-2 items-center">
                    <ReportActionsBar 
                        onPrint={() => printService.printWindow(tableRef.current?.parentElement?.innerHTML || '')}
                        onExport={handleExport}
                        onImport={handleImportTrigger}
                        onSettings={() => setShowPrintModal(true)}
                    />
                    <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".xlsx,.xls" />
                    <button 
                        onClick={() => setHideZeroRows(!hideZeroRows)}
                        className={`px-4 h-[42px] rounded-lg font-bold border transition-all flex items-center gap-2 text-sm ${hideZeroRows ? 'bg-orange-100 border-orange-200 text-orange-700' : 'bg-white border-gray-200 text-gray-600'}`}
                    >
                        {hideZeroRows ? <EyeOff size={18}/> : <Eye size={18}/>}
                        <span className="hidden md:inline">{hideZeroRows ? 'إظهار الصفري' : 'إخفاء الصفري'}</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 flex gap-2 pt-1">
                <input className="flex-1 px-3 py-1 border rounded text-sm outline-none font-bold" placeholder="بحث..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                <input type="date" value={dateFilter.start} onChange={e => setDateFilter({...dateFilter, start: e.target.value})} className="px-2 border rounded text-xs font-bold" style={forceEnNumsStyle}/>
                <input type="date" value={dateFilter.end} onChange={e => setDateFilter({...dateFilter, end: e.target.value})} className="px-2 border rounded text-xs font-bold" style={forceEnNumsStyle}/>
            </div>
        </div>

        <div className="relative w-full overflow-hidden rounded-xl shadow-xl border border-gray-300 bg-white">
            <div className="overflow-auto max-h-[75vh]">
                <table className="w-full text-center min-w-[3500px] border-collapse" ref={tableRef}>
                    <thead className="bg-[#1f2937] text-white font-cairo sticky top-0 z-40">
                        <tr>
                            {headers.map((h, i) => (
                                <th key={i} className="p-3 border border-gray-600 whitespace-nowrap" style={{...getSticky(i, 0, '#1f2937'), ...getCellStyle()}}>{h}</th>
                            ))}
                            <th className="p-3 border border-gray-600 bg-gray-800 z-50" style={getCellStyle()}>إجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="text-gray-700">
                        {reportData.map((row, idx) => (
                            <tr key={row.product.id} className="border-b hover:bg-blue-50 transition-colors bg-white h-12">
                                <td className="p-2 border bg-gray-50" style={{...getSticky(0, idx+1, '#f9fafb'), ...getCellStyle(true)}}>{row.product.barcode}</td>
                                <td className="p-2 border text-right min-w-[200px] bg-white" style={{...getSticky(1, idx+1, '#fff'), ...getCellStyle()}}>{row.product.name}</td>
                                <td className="p-2 border bg-white" style={{...getSticky(2, idx+1, '#fff'), ...getCellStyle()}}>{row.product.unit}</td>
                                <td className="p-2 border bg-yellow-50 text-blue-900 font-bold" style={getCellStyle(true)}>{formatEng(row.openingBulk)}</td>
                                <td className="p-2 border bg-yellow-50 text-blue-900 font-bold" style={getCellStyle(true)}>{formatEng(row.openingPacked)}</td>
                                <td className="p-2 border text-green-700" style={getCellStyle(true)}>{formatEng(row.prodBulk)}</td>
                                <td className="p-2 border text-green-700" style={getCellStyle(true)}>{formatEng(row.receivedPacked)}</td>
                                <td className="p-2 border text-green-600" style={getCellStyle(true)}>{formatEng(row.adjInPacked)}</td>
                                <td className="p-2 border text-green-600" style={getCellStyle(true)}>{formatEng(row.adjInBulk)}</td>
                                <td className="p-2 border text-red-500" style={getCellStyle(true)}>{formatEng(row.returnClientPacked)}</td>
                                <td className="p-2 border text-red-500" style={getCellStyle(true)}>{formatEng(row.returnClientBulk)}</td>
                                <td className="p-2 border text-orange-600" style={getCellStyle(true)}>{formatEng(row.transferPacked)}</td>
                                <td className="p-2 border text-orange-600" style={getCellStyle(true)}>{formatEng(row.transferBulk)}</td>
                                <td className="p-2 border text-blue-600" style={getCellStyle(true)}>{formatEng(row.salesFarmPacked)}</td>
                                <td className="p-2 border text-blue-600" style={getCellStyle(true)}>{formatEng(row.salesFarmBulk)}</td>
                                <td className="p-2 border text-purple-600" style={getCellStyle(true)}>{formatEng(row.salesClientPacked)}</td>
                                <td className="p-2 border text-purple-600" style={getCellStyle(true)}>{formatEng(row.salesClientBulk)}</td>
                                <td className="p-2 border text-indigo-800" style={getCellStyle(true)}>{formatEng(row.outletTransfers)}</td>
                                <td className="p-2 border bg-gray-100" style={getCellStyle(true)}>{formatEng(row.unfinishedPacked)}</td>
                                <td className="p-2 border bg-gray-100" style={getCellStyle(true)}>{formatEng(row.unfinishedBulk)}</td>
                                <td className="p-2 border text-red-600" style={getCellStyle(true)}>{formatEng(row.adjOutPacked)}</td>
                                <td className="p-2 border text-red-600" style={getCellStyle(true)}>{formatEng(row.adjOutBulk)}</td>
                                <td className="p-2 border bg-blue-100 text-blue-900 shadow-inner font-black" style={getCellStyle(true)}>{formatEng(row.totalBalance)}</td>
                                <td className="p-2 border bg-indigo-100 text-indigo-900 shadow-inner font-black" style={getCellStyle(true)}>{formatEng(row.packedBalance)}</td>
                                <td className="p-2 border bg-orange-50" style={getCellStyle(true)}>{formatEng(row.openingCount)}</td>
                                <td className="p-2 border bg-white" style={getCellStyle()}>{row.sackWeight}</td>
                                <td className="p-2 border bg-white" style={getCellStyle(true)}>{formatEng(row.emptySacks)}</td>
                                <td className="p-2 border text-gray-800" style={getCellStyle(true)}>{formatEng(row.siloRemains)}</td>
                                <td className="p-2 border text-red-700" style={getCellStyle(true)}>{formatEng(row.diff)}</td>
                                <td className="p-2 border bg-white text-center">
                                    {!isViewOnly && isAdmin && <button onClick={() => setDeleteId(row.product.id)} className="text-red-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors"><Trash2 size={18}/></button>}
                                </td>
                            </tr>
                        ))}
                        {reportData.length === 0 && (
                            <tr><td colSpan={30} className="p-10 text-center text-gray-400">لا توجد أصناف مطابقة للبحث أو رصيدها غير صفري</td></tr>
                        )}
                        <tr className="bg-[#1f2937] text-yellow-300 shadow-inner sticky bottom-0 z-30 font-bold">
                            <td colSpan={3} className="p-3" style={{...getSticky(0, reportData.length+1, '#1f2937'), ...getCellStyle()}}>إجمالي الفترة المختارة</td>
                            <td className="p-2 border border-gray-600" style={getCellStyle(true)}>{formatEng(totals.openingBulk)}</td>
                            <td className="p-2 border border-gray-600" style={getCellStyle(true)}>{formatEng(totals.openingPacked)}</td>
                            <td className="p-2 border border-gray-600" style={getCellStyle(true)}>{formatEng(totals.prodBulk)}</td>
                            <td className="p-2 border border-gray-600" style={getCellStyle(true)}>{formatEng(totals.receivedPacked)}</td>
                            <td className="p-2 border border-gray-600" style={getCellStyle(true)}>{formatEng(totals.adjInPacked)}</td>
                            <td className="p-2 border border-gray-600" style={getCellStyle(true)}>{formatEng(totals.adjInBulk)}</td>
                            <td className="p-2 border border-gray-600" style={getCellStyle(true)}>{formatEng(totals.returnClientPacked)}</td>
                            <td className="p-2 border border-gray-600" style={getCellStyle(true)}>{formatEng(totals.returnClientBulk)}</td>
                            <td className="p-2 border border-gray-600" style={getCellStyle(true)}>{formatEng(totals.transferPacked)}</td>
                            <td className="p-2 border border-gray-600" style={getCellStyle(true)}>{formatEng(totals.transferBulk)}</td>
                            <td className="p-2 border border-gray-600" style={getCellStyle(true)}>{formatEng(totals.salesFarmPacked)}</td>
                            <td className="p-2 border border-gray-600" style={getCellStyle(true)}>{formatEng(totals.salesFarmBulk)}</td>
                            <td className="p-2 border border-gray-600" style={getCellStyle(true)}>{formatEng(totals.salesClientPacked)}</td>
                            <td className="p-2 border border-gray-600" style={getCellStyle(true)}>{formatEng(totals.salesClientBulk)}</td>
                            <td className="p-2 border border-gray-600" style={getCellStyle(true)}>{formatEng(totals.outletTransfers)}</td>
                            <td className="p-2 border border-gray-600" style={getCellStyle(true)}>{formatEng(totals.unfinishedPacked)}</td>
                            <td className="p-2 border border-gray-600" style={getCellStyle(true)}>{formatEng(totals.unfinishedBulk)}</td>
                            <td className="p-2 border border-gray-600" style={getCellStyle(true)}>{formatEng(totals.adjOutPacked)}</td>
                            <td className="p-2 border border-gray-600" style={getCellStyle(true)}>{formatEng(totals.adjOutBulk)}</td>
                            <td className="p-2 border border-gray-600 bg-blue-800 text-white" style={getCellStyle(true)}>{formatEng(totals.totalBalance)}</td>
                            <td className="p-2 border border-gray-600 bg-indigo-800 text-white" style={getCellStyle(true)}>{formatEng(totals.packedBalance)}</td>
                            <td className="p-2 border border-gray-600" style={getCellStyle(true)}>{formatEng(totals.openingCount)}</td>
                            <td className="p-2 border border-gray-600">-</td>
                            <td className="p-2 border border-gray-600" style={getCellStyle(true)}>{formatEng(totals.emptySacks)}</td>
                            <td className="p-2 border border-gray-600" style={getCellStyle(true)}>{formatEng(totals.siloRemains)}</td>
                            <td className="p-2 border border-gray-600" style={getCellStyle(true)}>{formatEng(totals.diff)}</td>
                            <td className="p-2 border border-gray-600"></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => { if(deleteId) { deleteProduct(deleteId); refreshProducts(); setDeleteId(null); } }} title="حذف صنف" message="هل تريد حذف الصنف نهائياً؟" confirmText="حذف" cancelText="إلغاء" />
    </div>
  );
};