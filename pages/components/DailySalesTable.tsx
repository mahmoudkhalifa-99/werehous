import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { dbService } from '../services/storage';
import { Search, Printer, Settings, Calendar, ZoomIn, ChevronDown, FileSpreadsheet, Palette, X, Activity } from 'lucide-react';
import { printService } from '../services/printing';
import { PrintSettingsModal } from './PrintSettingsModal';
import * as XLSX from 'xlsx';

const forceEnNumsStyle = {
    fontFamily: 'Inter, sans-serif',
    fontVariantNumeric: 'lining-nums',
    direction: 'ltr' as const,
    fontSize: '13px',
    fontWeight: '700'
};

interface Props {
    filterCategory?: string;
}

export const DailySalesTable: React.FC<Props> = ({ filterCategory }) => {
  const { settings, products, refreshProducts } = useApp();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [pageScale, setPageScale] = useState(90);
  
  const PRINT_CONTEXT = filterCategory === 'بيوتولوجى' ? 'sales_petrology_daily' : 'sales_daily_table';
  const sales = dbService.getSales();

  const handleUpdateColor = (productId: string, color: string) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;
    const updated = { 
        ...prod, 
        customFields: { ...prod.customFields, rowColor: color } 
    };
    dbService.saveProduct(updated);
    refreshProducts();
  };

  const ColorPicker = ({ productId }: { productId: string }) => (
    <div className="flex items-center gap-1 justify-center no-print">
        <button onClick={() => handleUpdateColor(productId, '#ffff00')} className="w-3.5 h-3.5 rounded-full bg-[#ffff00] border border-black/20 hover:scale-125 transition-transform" title="أصفر"></button>
        <button onClick={() => handleUpdateColor(productId, '#90ee90')} className="w-3.5 h-3.5 rounded-full bg-[#90ee90] border border-black/20 hover:scale-125 transition-transform" title="أخضر"></button>
        <button onClick={() => handleUpdateColor(productId, '#ffcccb')} className="w-3.5 h-3.5 rounded-full bg-[#ffcccb] border border-black/20 hover:scale-125 transition-transform" title="أحمر"></button>
        <button onClick={() => handleUpdateColor(productId, '#add8e6')} className="w-3.5 h-3.5 rounded-full bg-[#add8e6] border border-black/20 hover:scale-125 transition-transform" title="أزرق"></button>
        <button onClick={() => handleUpdateColor(productId, '')} className="w-3.5 h-3.5 rounded-full bg-white border border-black/20 hover:scale-125 transition-transform flex items-center justify-center" title="مسح اللون"><X size={8} className="text-slate-400"/></button>
    </div>
  );

  const filteredData = useMemo(() => {
      return sales
      .filter(sale => sale.date.startsWith(selectedDate))
      .flatMap(sale => {
          const dateObj = new Date(sale.date);
          const monthStr = dateObj.toLocaleString('ar-EG', { month: 'long' });
          const regTime = dateObj.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' });
          
          const filteredItems = sale.items.filter(item => {
              if (!filterCategory) return true;
              const itemCat = (item.category || '').trim();
              const targetCat = filterCategory.trim();
              if (targetCat === 'بيوتولوجى') return itemCat === 'بيوتولوجى';
              return itemCat === targetCat || (targetCat === 'أعلاف' && (itemCat === 'أعلاف' || !itemCat));
          });

          return filteredItems.map(item => {
              const prodObj = products.find(p => p.id === item.id);
              return {
                month: monthStr,
                regTime,
                invoiceId: sale.id,
                manualInvoiceNo: sale.manualInvoiceNo || '-',
                date: sale.date.split('T')[0],
                shift: sale.shift || '-',
                customerCode: sale.customerCode || '-',
                customerName: sale.customer || 'نقدي',
                customerAddress: sale.customerAddress || '-',
                salesOrderNumber: sale.salesOrderNumber || '-',
                totalSoQty: sale.salesOrderQuantity || 0,
                itemSoQty: item.soQuantity || 0,
                arrivalDate: sale.arrivalDate || '-',
                arrivalTime: sale.arrivalTime || '-',
                ticketNumber: sale.ticketNumber || '-',
                transportMethod: sale.transportMethod || '-',
                contractorName: sale.contractorName || '-',
                driverName: sale.driverName || '-',
                carType: sale.carType || '-',
                carNo: sale.carNumber || '-',
                entranceTime: sale.entranceTime || '-',
                exitTime: sale.exitTime || '-',
                duration: sale.loadingDuration || '-',
                loader: sale.loadingOfficer || '-',
                confirmer: sale.confirmationOfficer || '-',
                itemCode: item.barcode || '-',
                itemName: item.name,
                bulkQty: item.quantityBulk || 0,
                packedQty: item.quantityPacked || 0,
                totalLoaded: item.quantity || 0,
                variance: item.itemVariance || 0,
                salesType: item.salesType || '-',
                productionDate: item.productionDate || '-',
                paymentMethod: sale.paymentMethod || '-',
                notes: sale.notes || '-',
                rowColor: prodObj?.customFields?.rowColor,
                productId: item.id
              };
          });
      })
      .filter(row => 
          row.customerName.includes(searchTerm) || 
          row.itemName.includes(searchTerm) || 
          row.invoiceId.includes(searchTerm) || 
          row.carNo.includes(searchTerm)
      );
  }, [sales, selectedDate, searchTerm, filterCategory, products]);

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(filteredData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DailySalesDetailed");
    XLSX.writeFile(wb, `Sales_Detailed_Report_${selectedDate}.xlsx`);
  };

  const handlePrint = () => {
      const htmlContent = document.getElementById('daily-sales-print-area')?.innerHTML || '';
      printService.printHtmlContent('تقرير المبيعات اليومي التفصيلي', htmlContent, PRINT_CONTEXT, settings, `التاريخ: ${selectedDate}`);
  };

  const headers = [
      "م", "الشهر", "وقت التسجيل", "رقم الفاتورة", "رقم الدفتري", "تاريخ الفاتورة", "الوردية", "كود العميل", "اسم العميل", "عنوان العميل",
      "رقم أمر البيع", "إجمالي كمية أمر البيع", "كمية الصنف بأمر البيع", "تاريخ وصول الأمر", "وقت وصول الأمر", "رقم التذكرة", "طريقة النقل", "مقاول النقل", "اسم السائق",
      "نوع السيارة", "رقم السيارة", "وقت الدخول", "وقت الخروج", "مدة التحميل", "مسؤول التحميل", "تأكيد الخروج", "كود الصنف", "اسم الصنف",
      "كمية صب محملة", "كمية معبأ محملة", "الإجمالي المحمل فعلياً", "الفرق (Variance)", "نوع المبيعات", "تاريخ الإنتاج", "طريقة الدفع", "الملاحظات"
  ];

  return (
      <div className="space-y-6 animate-fade-in font-cairo" dir="rtl">
          {showPrintModal && <PrintSettingsModal isOpen={showPrintModal} onClose={() => setShowPrintModal(false)} context={PRINT_CONTEXT} />}
          
          <div className="bg-white p-6 rounded-[2rem] shadow-premium border border-slate-100 flex flex-wrap items-center justify-between gap-4 no-print">
              <div className="flex items-center gap-4">
                  <div className="flex items-center bg-slate-50 border-2 border-slate-100 rounded-2xl p-1 shadow-inner">
                      <Calendar size={18} className="mx-3 text-slate-400"/>
                      <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="bg-transparent p-2 outline-none font-black text-sm text-slate-700" style={forceEnNumsStyle}/>
                  </div>
                  <div className="relative w-72">
                      <input className="w-full pr-10 pl-4 py-3 border-2 border-slate-50 rounded-2xl text-sm font-bold bg-slate-50 shadow-inner" placeholder="بحث شامل..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                      <Search className="absolute right-3 top-3.5 text-slate-300" size={18}/>
                  </div>
              </div>
              <div className="flex items-center gap-3">
                  <div className="relative group">
                      <button className="px-6 h-12 rounded-xl font-black border-2 border-slate-100 bg-white text-slate-700 transition-all flex items-center gap-2 text-sm hover:border-indigo-200 shadow-sm">
                          <ZoomIn size={20}/> {pageScale}%
                          <ChevronDown size={14}/>
                      </button>
                      <div className="absolute top-full right-0 mt-2 bg-white border rounded-xl shadow-2xl z-[500] hidden group-hover:block p-2 w-32 animate-fade-in">
                          {[100, 90, 80, 70, 60, 50].map(s => (
                              <button key={s} onClick={() => setPageScale(s)} className={`w-full text-center p-2 rounded-lg font-bold text-xs hover:bg-blue-50 mb-1 last:mb-0 ${pageScale === s ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>{s}%</button>
                          ))}
                      </div>
                  </div>
                  <button onClick={() => setShowPrintModal(true)} className="p-3 bg-slate-100 text-slate-500 rounded-2xl border border-slate-200 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"><Settings size={22}/></button>
                  <button onClick={handleExport} className="bg-[#10b981] text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 shadow-lg hover:bg-emerald-600 transition-all"><FileSpreadsheet size={20}/> تصدير Excel</button>
                  <button onClick={handlePrint} className="bg-[#1e293b] text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 shadow-lg hover:bg-black transition-all"><Printer size={20}/> طباعة</button>
              </div>
          </div>

          <div id="daily-sales-print-area" className="bg-white rounded-[2.5rem] shadow-premium border-2 border-slate-800 overflow-hidden relative">
              <div className="overflow-x-auto max-h-[75vh]" style={{ zoom: pageScale / 100 }}>
                  <table className="w-max min-w-full text-center whitespace-nowrap border-collapse">
                      <thead className="sticky top-0 z-40 shadow-lg">
                          <tr className="bg-[#0f172a] text-yellow-400 h-14 font-black text-[10px] uppercase tracking-tighter">
                              <th className="px-2 border-l border-slate-700 w-12">م</th>
                              <th className="px-2 border-l border-slate-700 w-16 no-print"><Palette size={16} className="mx-auto"/></th>
                              {headers.slice(1).map((h, i) => (
                                  <th key={i} className="px-4 border-l border-slate-700">{h}</th>
                              ))}
                          </tr>
                      </thead>
                      <tbody className="text-gray-700 text-[12px] font-bold">
                          {filteredData.map((row, idx) => (
                              <tr key={idx} className={`border-b border-slate-100 h-12 transition-all hover:brightness-95`} style={{ backgroundColor: row.rowColor || (idx % 2 === 0 ? 'white' : '#f8fafc') }}>
                                  <td className="p-2 border-l" style={forceEnNumsStyle}>{idx + 1}</td>
                                  <td className="p-2 border-l no-print"><ColorPicker productId={row.productId} /></td>
                                  <td className="px-4 border-l">{row.month}</td>
                                  <td className="px-4 border-l" style={forceEnNumsStyle}>{row.regTime}</td>
                                  <td className="px-4 border-l font-mono text-indigo-700">{row.invoiceId.slice(-6)}</td>
                                  <td className="px-4 border-l font-mono text-amber-700">{row.manualInvoiceNo}</td>
                                  <td className="px-4 border-l" style={forceEnNumsStyle}>{row.date}</td>
                                  <td className="px-4 border-l">{row.shift}</td>
                                  <td className="px-4 border-l font-mono" style={forceEnNumsStyle}>{row.customerCode}</td>
                                  <td className="px-8 border-l text-right pr-6 font-black text-slate-900">{row.customerName}</td>
                                  <td className="px-4 border-l text-xs text-slate-400">{row.customerAddress}</td>
                                  <td className="px-4 border-l font-mono" style={forceEnNumsStyle}>{row.salesOrderNumber}</td>
                                  <td className="px-4 border-l" style={forceEnNumsStyle}>{row.totalSoQty.toFixed(3)}</td>
                                  <td className="px-4 border-l" style={forceEnNumsStyle}>{row.itemSoQty.toFixed(3)}</td>
                                  <td className="px-4 border-l" style={forceEnNumsStyle}>{row.arrivalDate}</td>
                                  <td className="px-4 border-l" style={forceEnNumsStyle}>{row.arrivalTime}</td>
                                  <td className="px-4 border-l font-mono" style={forceEnNumsStyle}>{row.ticketNumber}</td>
                                  <td className="px-4 border-l">{row.transportMethod}</td>
                                  <td className="px-4 border-l">{row.contractorName}</td>
                                  <td className="px-4 border-l">{row.driverName}</td>
                                  <td className="px-4 border-l font-mono">{row.carType}</td>
                                  <td className="px-4 border-l font-mono font-black" style={forceEnNumsStyle}>{row.carNo}</td>
                                  <td className="px-4 border-l" style={forceEnNumsStyle}>{row.entranceTime}</td>
                                  <td className="px-4 border-l" style={forceEnNumsStyle}>{row.exitTime}</td>
                                  <td className="px-4 border-l text-blue-700 font-black" style={forceEnNumsStyle}>{row.duration}</td>
                                  <td className="px-4 border-l text-xs text-slate-500">{row.loader}</td>
                                  <td className="px-4 border-l text-xs text-slate-500">{row.confirmer}</td>
                                  <td className="px-4 border-l font-mono text-[11px]">{row.itemCode}</td>
                                  <td className="px-6 border-l text-right pr-6 font-black text-indigo-900">{row.itemName}</td>
                                  <td className="px-4 border-l" style={forceEnNumsStyle}>{row.bulkQty > 0 ? row.bulkQty.toFixed(3) : '-'}</td>
                                  <td className="px-4 border-l" style={forceEnNumsStyle}>{row.packedQty > 0 ? row.packedQty.toFixed(3) : '-'}</td>
                                  <td className="px-6 border-l bg-emerald-50 text-emerald-800 text-lg font-black" style={forceEnNumsStyle}>{row.totalLoaded.toFixed(3)}</td>
                                  <td className={`px-4 border-l font-black ${row.variance !== 0 ? 'text-red-600 bg-red-50' : 'text-emerald-600'}`} style={forceEnNumsStyle}>{row.variance.toFixed(3)}</td>
                                  <td className="px-4 border-l"><span className="bg-slate-100 px-2 py-0.5 rounded text-[10px]">{row.salesType}</span></td>
                                  <td className="px-4 border-l" style={forceEnNumsStyle}>{row.productionDate}</td>
                                  <td className="px-4 border-l">{row.paymentMethod}</td>
                                  <td className="px-8 border-l text-right text-[10px] italic text-slate-400 max-w-xs truncate">{row.notes}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      </div>
  );
};