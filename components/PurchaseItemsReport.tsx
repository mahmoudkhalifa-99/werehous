
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { dbService } from '../services/storage';
import { 
    Search, Printer, FileDown, Settings, Filter, 
    ShoppingCart, Truck, Clock, CheckCircle2, 
    Calendar, Hash, Briefcase, Eye, EyeOff
} from 'lucide-react';
import { printService } from '../services/printing';
import { TableToolbar } from './TableToolbar';
import { ReportActionsBar } from './ReportActionsBar';
import { GlassCard } from './NeumorphicUI';
import { PrintSettingsModal } from './PrintSettingsModal';
import * as XLSX from 'xlsx';

const forceEnNumsStyle = {
    fontFamily: 'Inter, sans-serif',
    fontVariantNumeric: 'lining-nums',
    direction: 'ltr' as const
};

const DEFAULT_STYLES = {
    fontFamily: 'Calibri, sans-serif',
    fontSize: 13,
    isBold: true,
    isItalic: false,
    isUnderline: false,
    textAlign: 'center' as 'right' | 'center' | 'left',
    verticalAlign: 'middle' as 'top' | 'middle' | 'bottom',
    decimals: 2,
    rowHeight: 45,
    columnWidth: 140
};

export const PurchaseItemsReport: React.FC = () => {
    const { settings, t, products } = useApp();
    const [dateFilter, setDateFilter] = useState({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSupplier, setSelectedSupplier] = useState('all');
    const [selectedWarehouse, setSelectedWarehouse] = useState('all');
    const [showPrintModal, setShowPrintModal] = useState(false);
    
    const [tableStyles, setTableStyles] = useState(() => {
        const saved = localStorage.getItem('glasspos_purchase_rep_styles');
        return saved ? { ...DEFAULT_STYLES, ...JSON.parse(saved) } : DEFAULT_STYLES;
    });

    useEffect(() => {
        localStorage.setItem('glasspos_purchase_rep_styles', JSON.stringify(tableStyles));
    }, [tableStyles]);

    const purchases = dbService.getPurchases();

    // تجهيز البيانات التفصيلية (كل صنف في سطر)
    const reportData = useMemo(() => {
        const start = new Date(dateFilter.start); start.setHours(0,0,0,0);
        const end = new Date(dateFilter.end); end.setHours(23,59,59,999);

        return purchases
            .filter(p => {
                const d = new Date(p.date);
                const matchesDate = d >= start && d <= end;
                const matchesSupplier = selectedSupplier === 'all' || p.supplier === selectedSupplier;
                const matchesWarehouse = selectedWarehouse === 'all' || p.warehouse === selectedWarehouse;
                return matchesDate && matchesSupplier && matchesWarehouse;
            })
            .flatMap(p => p.items.map(item => {
                // البحث عن كود JDE من سجل الأصناف كبديل إذا كان مفقوداً في سجل الشراء
                const productRef = products.find(prod => prod.id === item.productId);
                const jdeCode = item.jdeCode || productRef?.jdeCode || productRef?.jdeCodePacked || productRef?.jdeCodeBulk || '-';

                return {
                    ...item,
                    jdeCode: jdeCode, // استخدام الكود المحسن
                    orderNumber: p.orderNumber,
                    date: p.date,
                    supplier: p.supplier,
                    warehouse: p.warehouse,
                    status: p.status,
                    requestFor: p.requestFor || '-',
                    department: p.department || '-',
                    remaining: Math.max(0, item.quantity - (item.receivedQuantity || 0))
                };
            }))
            .filter(row => 
                row.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                row.orderNumber.includes(searchTerm) ||
                row.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
                row.jdeCode.includes(searchTerm)
            )
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [purchases, dateFilter, searchTerm, selectedSupplier, selectedWarehouse, products]);

    // الإحصائيات التحليلية
    const stats = useMemo(() => {
        const uniqueOrders = new Set(reportData.map(r => r.orderNumber));
        const totalValue = reportData.reduce((sum, r) => sum + r.totalCost, 0);
        const pendingValue = reportData.filter(r => r.status === 'pending').reduce((sum, r) => sum + r.totalCost, 0);
        
        return {
            orderCount: uniqueOrders.size,
            totalValue,
            pendingValue,
            itemCount: reportData.length
        };
    }, [reportData]);

    const handleExport = () => {
        const headers = ['التاريخ', 'رقم الطلب', 'جهة التنفيذ', 'الطلب لأجل', 'الصنف', 'كود JDE', 'الكمية المطلوبة', 'الكمية المستلمة', 'المتبقي', 'التكلفة'];
        const data = reportData.map(r => [
            new Date(r.date).toLocaleDateString('en-GB'),
            r.orderNumber,
            r.supplier,
            r.requestFor,
            r.productName,
            r.jdeCode,
            r.quantity,
            r.receivedQuantity || 0,
            r.remaining,
            r.totalCost
        ]);
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
        XLSX.utils.book_append_sheet(wb, ws, "PurchasesReport");
        XLSX.writeFile(wb, `Purchases_Report_${dateFilter.end}.xlsx`);
    };

    const handlePrint = () => {
        const config = settings.printConfigs['purchases'] || settings.printConfigs['default'];
        const html = document.getElementById('purchase-rep-table')?.innerHTML || '';
        printService.printHtmlContent('تقرير توريدات المشتريات التفصيلي', html, 'purchases', settings, `الفترة من: ${dateFilter.start} إلى: ${dateFilter.end}`);
    };

    const getCellStyle = (isNumeric: boolean = false): React.CSSProperties => ({
        fontFamily: isNumeric ? 'Inter, sans-serif' : tableStyles.fontFamily,
        fontSize: `${tableStyles.fontSize}px`,
        fontWeight: tableStyles.isBold ? 'bold' : 'normal',
        fontStyle: tableStyles.isItalic ? 'italic' : 'normal',
        textAlign: tableStyles.textAlign,
        verticalAlign: tableStyles.verticalAlign,
        ...(isNumeric ? forceEnNumsStyle : {})
    });

    const val = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: tableStyles.decimals, maximumFractionDigits: tableStyles.decimals });

    return (
        <div className="space-y-6 animate-fade-in" dir="rtl">
            {showPrintModal && <PrintSettingsModal isOpen={showPrintModal} onClose={() => setShowPrintModal(false)} context="purchases" />}

            {/* Quick Stats Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatBox label="إجمالي القيمة" value={`${stats.totalValue.toLocaleString()} ${settings.currency}`} icon={<ShoppingCart size={20}/>} color="bg-blue-600" />
                <StatBox label="قيمة الطلبات المعلقة" value={`${stats.pendingValue.toLocaleString()} ${settings.currency}`} icon={<Clock size={20}/>} color="bg-amber-500" />
                <StatBox label="عدد أوامر التوريد" value={stats.orderCount.toString()} icon={<Hash size={20}/>} color="bg-purple-600" />
                <StatBox label="إجمالي البنود" value={stats.itemCount.toString()} icon={<Truck size={20}/>} color="bg-indigo-600" />
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col xl:flex-row items-end gap-4 no-print">
                <div className="flex flex-wrap gap-3 flex-1 items-end">
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-gray-400">من تاريخ</label>
                        <input type="date" value={dateFilter.start} onChange={e => setDateFilter({...dateFilter, start: e.target.value})} className="p-2 border rounded-lg h-[40px] text-sm font-bold" style={forceEnNumsStyle}/>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-gray-400">إلى تاريخ</label>
                        <input type="date" value={dateFilter.end} onChange={e => setDateFilter({...dateFilter, end: e.target.value})} className="p-2 border rounded-lg h-[40px] text-sm font-bold" style={forceEnNumsStyle}/>
                    </div>
                    <div className="flex flex-col gap-1 min-w-[150px]">
                        <label className="text-[10px] font-bold text-gray-400">جهة التنفيذ</label>
                        <select value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)} className="p-2 border rounded-lg h-[40px] text-sm font-bold bg-gray-50">
                            <option value="all">كل جهات التنفيذ</option>
                            {settings.suppliers?.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="flex flex-col gap-1 min-w-[150px]">
                        <label className="text-[10px] font-bold text-gray-400">المخزن</label>
                        <select value={selectedWarehouse} onChange={e => setSelectedWarehouse(e.target.value)} className="p-2 border rounded-lg h-[40px] text-sm font-bold bg-gray-50">
                            <option value="all">كل المخازن</option>
                            <option value="raw">مخزن الخامات</option>
                            <option value="finished">مخزن المنتج التام</option>
                            <option value="parts">قطع الغيار</option>
                        </select>
                    </div>
                    <div className="relative flex-1 min-w-[200px]">
                        <label className="text-[10px] font-bold text-gray-400">بحث سريع</label>
                        <input className="w-full p-2 pr-9 border rounded-lg h-[40px] text-sm" placeholder="رقم الطلب أو الصنف أو JDE..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        <Search className="absolute right-3 bottom-2.5 text-gray-400" size={16}/>
                    </div>
                </div>
                <div className="flex gap-2">
                    <ReportActionsBar 
                        onPrint={handlePrint}
                        onExport={handleExport}
                        onSettings={() => setShowPrintModal(true)}
                        hideImport={true}
                    />
                </div>
            </div>

            <TableToolbar styles={tableStyles} setStyles={setTableStyles} onReset={() => setTableStyles(DEFAULT_STYLES)} />

            {/* Detailed Table */}
            <div id="purchase-rep-table" className="overflow-x-auto rounded-xl border border-gray-300 shadow-lg bg-white">
                <table className="w-full text-center whitespace-nowrap border-collapse">
                    <thead className="bg-gray-800 text-white font-cairo">
                        <tr>
                            <th className="p-3 border border-gray-600" style={getCellStyle()}>تاريخ الطلب</th>
                            <th className="p-3 border border-gray-600" style={getCellStyle()}>رقم الطلب</th>
                            <th className="p-3 border border-gray-600" style={getCellStyle()}>جهة التنفيذ</th>
                            <th className="p-3 border border-gray-600" style={getCellStyle()}>الطلب لأجل</th>
                            <th className="p-3 border border-gray-600 text-right pr-4" style={getCellStyle()}>بيان الصنف</th>
                            <th className="p-3 border border-gray-600 bg-blue-900/40 text-yellow-300" style={getCellStyle()}>كود JDE</th>
                            <th className="p-3 border border-gray-600 bg-blue-900/20 text-blue-900" style={getCellStyle()}>المطلوب</th>
                            <th className="p-3 border border-gray-600 bg-green-900/20 text-green-900" style={getCellStyle()}>المستلم</th>
                            <th className="p-3 border border-gray-600 bg-red-900/20 text-red-900" style={getCellStyle()}>المتبقي</th>
                            <th className="p-3 border border-gray-600" style={getCellStyle()}>الحالة</th>
                            <th className="p-3 border border-gray-600" style={getCellStyle()}>إجمالي القيمة</th>
                        </tr>
                    </thead>
                    <tbody className="text-gray-700">
                        {reportData.map((row, idx) => (
                            <tr key={idx} className="border-b hover:bg-blue-50 transition-colors">
                                <td className="p-2 border-r border-gray-200" style={getCellStyle(true)}>{new Date(row.date).toLocaleDateString('en-GB')}</td>
                                <td className="p-2 border-r border-gray-200 font-mono text-purple-700 font-bold" style={getCellStyle()}>{row.orderNumber}</td>
                                <td className="p-2 border-r border-gray-200 text-right pr-4 font-bold" style={getCellStyle()}>{row.supplier}</td>
                                <td className="p-2 border-r border-gray-200 text-xs text-gray-500" style={getCellStyle()}>{row.requestFor}</td>
                                <td className="p-2 border-r border-gray-200 text-right pr-4 font-black text-slate-900">{row.productName}</td>
                                <td className="p-2 border-r border-gray-200 font-mono text-xs font-black text-indigo-700 bg-indigo-50/30" style={getCellStyle()}>{row.jdeCode}</td>
                                <td className="p-2 border-r border-gray-200 font-bold text-blue-700" style={getCellStyle(true)}>{val(row.quantity)}</td>
                                <td className="p-2 border-r border-gray-200 font-bold text-green-700" style={getCellStyle(true)}>{val(row.receivedQuantity || 0)}</td>
                                <td className={`p-2 border-r border-gray-200 font-bold ${row.remaining > 0 ? 'text-red-600 bg-red-50' : 'text-gray-400'}`} style={getCellStyle(true)}>{val(row.remaining)}</td>
                                <td className="p-2 border-r border-gray-200">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${row.status === 'received' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {row.status === 'received' ? 'مستلم' : 'معلق'}
                                    </span>
                                </td>
                                <td className="p-2 font-bold" style={getCellStyle(true)}>{val(row.totalCost)}</td>
                            </tr>
                        ))}
                        {reportData.length === 0 && (
                            <tr><td colSpan={11} className="p-10 text-gray-400 font-bold italic text-center">لا توجد بيانات توريد مطابقة للبحث</td></tr>
                        )}
                    </tbody>
                    {reportData.length > 0 && (
                        <tfoot className="bg-gray-100 font-black">
                            <tr>
                                <td colSpan={6} className="p-3 text-left">إجمالي الصفحة:</td>
                                <td className="p-2 text-blue-900" style={getCellStyle(true)}>{val(reportData.reduce((s,r) => s + r.quantity, 0))}</td>
                                <td className="p-2 text-green-900" style={getCellStyle(true)}>{val(reportData.reduce((s,r) => s + (r.receivedQuantity || 0), 0))}</td>
                                <td className="p-2 text-red-900" style={getCellStyle(true)}>{val(reportData.reduce((s,r) => s + r.remaining, 0))}</td>
                                <td></td>
                                <td className="p-2 text-indigo-900" style={getCellStyle(true)}>{val(reportData.reduce((s,r) => s + r.totalCost, 0))}</td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        </div>
    );
};

const StatBox: React.FC<{ label: string, value: string, icon: React.ReactNode, color: string }> = ({ label, value, icon, color }) => (
    <GlassCard className={`p-4 flex items-center gap-4 border-none shadow-md ${color} text-white`}>
        <div className="bg-white/20 p-3 rounded-2xl shadow-inner">{icon}</div>
        <div>
            <p className="text-xs font-bold opacity-80 mb-1">{label}</p>
            <h3 className="text-xl font-black">{value}</h3>
        </div>
    </GlassCard>
);
