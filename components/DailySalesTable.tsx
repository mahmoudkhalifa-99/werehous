
import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { dbService } from '../services/storage';
import { Search, Printer, Settings, Calendar, FileUp, FileDown, Table as TableIcon, ZoomIn, ChevronDown } from 'lucide-react';
import { printService } from '../services/printing';
import { PrintSettingsModal } from './PrintSettingsModal';
import * as XLSX from 'xlsx';

const forceEnNumsStyle = {
    fontFamily: 'Inter, sans-serif',
    fontVariantNumeric: 'lining-nums',
    direction: 'ltr' as const,
    fontSize: '12px'
};

interface Props {
    filterCategory?: string;
}

export const DailySalesTable: React.FC<Props> = ({ filterCategory }) => {
  const { settings } = useApp();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [pageScale, setPageScale] = useState(100);
  
  const PRINT_CONTEXT = filterCategory === 'بيوتولوجى' ? 'sales_petrology_daily' : 'sales_daily_table';
  const sales = dbService.getSales();

  const columns = [
      "م", 
      "الشهر", 
      "وقت التسجيل", 
      "رقم الفاتورة", 
      "رقم الدفتري",
      "تاريخ الفاتورة",
      "الوردية",
      "كود العميل", 
      "اسم العميل", 
      "عنوان العميل",
      "رقم أمر البيع", 
      "إجمالي كمية أمر البيع",
      "كمية الصنف بأمر البيع",
      "تاريخ وصول الأمر",
      "وقت وصول الأمر",
      "رقم التذكرة", 
      "طريقة النقل", 
      "مقاول النقل",
      "اسم السائق",
      "نوع السيارة", 
      "رقم السيارة", 
      "وقت الدخول", 
      "وقت الخروج",
      "مدة التحميل", 
      "مسؤول التحميل", 
      "تأكيد الخروج",
      "كود الصنف", 
      "اسم الصنف", 
      "كمية صب محملة", 
      "كمية معبأ محملة", 
      "الإجمالي المحمل فعلياً",
      "الفرق (Variance)",
      "نوع المبيعات", 
      "تاريخ الإنتاج", 
      "طريقة الدفع",
      "الملاحظات"
  ];

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
              if (targetCat === 'أعلاف') return itemCat === 'أعلاف' || (itemCat !== 'بيوتولوجى' && itemCat !== 'خامات');
              return itemCat === targetCat;
          });

          return filteredItems.map(item => ({
              month: monthStr,
              regTime: regTime,
              invoiceId: sale.id,
              manualInvoiceNo: sale.manualInvoiceNo || '-',
              date: sale.date.split('T')[0],
              shift: sale.shift || '-',
              customerCode: sale.customerCode || '-',
              customerName: sale.customer || 'نقدي',
              customerAddress: sale.customerAddress || '-',
              orderNo: sale.salesOrderNumber || '-',
              orderTotalQty: sale.salesOrderQuantity || 0,
              itemSoQty: item.soQuantity || 0,
              arrivalDate: sale.arrivalDate || '-',
              arrivalTime: sale.arrivalTime || '-',
              ticketNo: sale.ticketNumber || '-',
              transport: sale.transportMethod || '-',
              contractor: sale.contractorName || '-',
              driver: sale.driverName || '-',
              carType: sale.carType || '-',
              carNo: sale.carNumber || '-',
              entrance: sale.entranceTime || '-',
              exit: sale.exitTime || '-',
              duration: sale.loadingDuration || '-',
              loader: sale.loadingOfficer || '-',
              confirmer: sale.confirmationOfficer || '-',
              itemCode: item.barcode || '-',
              itemName: item.name,
              bulkQty: item.quantityBulk || 0,
              packedQty: item.quantityPacked || 0,
              totalLoaded: item.quantity || 0,
              itemVariance: item.itemVariance || 0,
              salesType: item.salesType || '-',
              prodDate: item.productionDate || '-',
              payment: sale.paymentMethod || 'نقدي',
              note: sale.notes || '-'
          }));
      })
      .filter(row => 
          row.customerName.includes(searchTerm) || 
          row.itemName.includes(searchTerm) || 
          row.invoiceId.includes(searchTerm) ||
          row.manualInvoiceNo.includes(searchTerm) ||
          row.carNo.includes(searchTerm)
      );
  }, [sales, selectedDate, searchTerm, filterCategory]);

  const totalActualLoaded = filteredData.reduce((sum, row) => sum + row.totalLoaded, 0);

  const handlePrint = () => {
      const config = settings.printConfigs[PRINT_CONTEXT] || settings.printConfigs['default'];
      const htmlContent = document.getElementById('daily-sales-print-area')?.innerHTML || '';
      const title = filterCategory === 'بيوتولوجى' ? 'المبيعات اليومية - بيوتولوجى' : 'المبيعات اليومية الشاملة';
      printService.printHtmlContent(config.reportTitle || title, htmlContent, PRINT_CONTEXT, settings, `التاريخ: ${selectedDate}`);
  };

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(filteredData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SalesData");
    XLSX.writeFile(wb, `Daily_Sales_${selectedDate}.xlsx`);
  };

  return (
      <div className="space-y-4 animate-fade-in font-cairo" dir="rtl">
          {showPrintModal && <PrintSettingsModal isOpen={showPrintModal} onClose={() => setShowPrintModal(false)} context={PRINT_CONTEXT} />}
          
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-wrap items-center justify-between gap-4 no-print">
              <div className="flex items-center gap-3">
                  <button onClick={handlePrint} className="bg-[#1e293b] text-white px-6 py-2.5 rounded-xl font-black flex items-center gap-2 shadow-lg hover:bg-black transition-all active:scale-95">
                      <Printer size={18}/> طباعة التقرير
                  </button>
                  <button onClick={handleExport} className="bg-green-600 text-white px-6 py-2.5 rounded-xl font-black flex items-center gap-2 shadow-lg hover:bg-green-700 transition-all active:scale-95">
                      <FileDown size={18}/> تصدير Excel
                  </button>
                  <button onClick={() => setShowPrintModal(true)} className="bg-blue-600 text-white p-2.5 rounded-xl shadow-lg hover:bg-blue-700 transition-all">
                      <Settings size={20}/>
                  </button>

                  {/* Scale Control */}
                  <div className="relative group">
                    <button className="px-4 py-2.5 rounded-xl font-black border bg-white border-slate-200 text-slate-700 transition-all flex items-center gap-2 text-xs hover:bg-slate-50 shadow-sm">
                        <ZoomIn size={18}/>
                        <span>حجم العرض: {pageScale}%</span>
                        <ChevronDown size={14}/>
                    </button>
                    <div className="absolute top-full right-0 mt-2 bg-white border rounded-xl shadow-2xl z-[500] hidden group-hover:block p-2 w-32 animate-fade-in">
                        {[100, 90, 80, 70, 60, 50].map(s => (
                            <button key={s} onClick={() => setPageScale(s)} className={`w-full text-center p-2 rounded-lg font-bold text-xs hover:bg-blue-50 mb-1 last:mb-0 ${pageScale === s ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>{s}%</button>
                        ))}
                    </div>
                </div>

                  <div className="bg-blue-50 border border-blue-100 px-6 py-2 rounded-2xl text-center min-w-[2000px] shadow-inner">
                      <p className="text-[10px] text-blue-500 font-black mb-1 uppercase">إجمالي المحمل اليوم</p>
                      <p className="text-blue-900 font-black text-xl" style={forceEnNumsStyle}>
                          {(totalActualLoaded || 0).toLocaleString(undefined, { minimumFractionDigits: 3 })} <span className="text-xs">طن</span>
                      </p>
                  </div>
              </div>

              <div className="flex items-center gap-4">
                  <div className="relative group">
                    <input 
                        className="w-64 pr-10 pl-4 py-2.5 border-2 border-slate-100 rounded-xl text-sm font-bold bg-slate-50 outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner" 
                        placeholder="بحث في الأسماء، السيارات، الفواتير..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                    />
                    <Search className="absolute right-3 top-3 text-slate-300" size={18}/>
                  </div>
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
              </div>
          </div>

          <div id="daily-sales-print-area" className="bg-white rounded-[2rem] shadow-premium border-2 border-slate-200 overflow-hidden">
              <div 
                className="overflow-x-auto max-h-[75vh] origin-top-right transition-all duration-300"
                style={{ zoom: pageScale / 100 }}
              >
                  <table className="w-max min-w-full text-center whitespace-nowrap border-collapse">
                      <thead className="sticky top-0 z-20">
                          <tr className="bg-[#0f172a] text-yellow-400 h-14 shadow-lg border-b border-slate-700">
                              {columns.map((col, i) => (
                                  <th key={i} className={`px-4 py-2 border-l border-slate-700 font-black text-[10px] uppercase tracking-tighter ${col === 'م' ? 'w-[25px] min-w-[25px] max-w-[25px] !px-0' : ''}`}>
                                      {col}
                                  </th>
                              ))}
                          </tr>
                      </thead>
                      <tbody className="text-gray-700 text-[12px] font-bold">
                          {filteredData.map((row, idx) => (
                              <tr key={idx} className={`border-b border-slate-100 hover:bg-blue-50 transition-colors h-12 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                                  <td className="p-0 border-l border-slate-100 bg-slate-100/30 w-[25px] min-w-[25px] max-w-[25px] text-center font-black" style={{verticalAlign: 'middle'}}>{idx + 1}</td>
                                  <td className="px-4 border-l border-slate-100">{row.month}</td>
                                  <td className="px-4 border-l border-slate-100" style={forceEnNumsStyle}>{row.regTime}</td>
                                  <td className="px-4 border-l border-slate-100 text-blue-700 font-black font-mono">{row.invoiceId}</td>
                                  <td className="px-4 border-l border-slate-100 text-amber-700 font-black font-mono">{row.manualInvoiceNo}</td>
                                  <td className="px-4 border-l border-slate-100" style={forceEnNumsStyle}>{row.date}</td>
                                  <td className="px-4 border-l border-slate-100 text-indigo-600 font-black">{row.shift}</td>
                                  <td className="px-4 border-l border-slate-100 font-mono text-gray-400" style={forceEnNumsStyle}>{row.customerCode}</td>
                                  <td className="px-6 border-l border-slate-100 text-right font-black text-slate-900">{row.customerName}</td>
                                  <td className="px-4 border-l border-slate-100 text-xs text-slate-400 max-w-xs truncate">{row.customerAddress}</td>
                                  <td className="px-4 border-l border-slate-100 font-mono text-blue-600" style={forceEnNumsStyle}>{row.orderNo}</td>
                                  <td className="px-4 border-l border-slate-100 bg-blue-50/50 font-black text-blue-800" style={forceEnNumsStyle}>{(row.orderTotalQty || 0).toFixed(3)}</td>
                                  <td className="px-4 border-l border-slate-100 bg-orange-50/50 text-orange-800 font-black" style={forceEnNumsStyle}>{(row.itemSoQty || 0).toFixed(3)}</td>
                                  <td className="px-4 border-l border-slate-100" style={forceEnNumsStyle}>{row.arrivalDate}</td>
                                  <td className="px-4 border-l border-slate-100" style={forceEnNumsStyle}>{row.arrivalTime}</td>
                                  <td className="px-4 border-l border-slate-100 font-mono" style={forceEnNumsStyle}>{row.ticketNo}</td>
                                  <td className="px-4 border-l border-slate-100 text-xs">{row.transport}</td>
                                  <td className="px-4 border-l border-slate-100 text-xs">{row.contractor}</td>
                                  <td className="px-4 border-l border-slate-100 font-black">{row.driver}</td>
                                  <td className="px-4 border-l border-slate-100">{row.carType}</td>
                                  <td className="px-4 border-l border-slate-100 font-mono font-black" style={forceEnNumsStyle}>{row.carNo}</td>
                                  <td className="px-4 border-l border-slate-100" style={forceEnNumsStyle}>{row.entrance}</td>
                                  <td className="px-4 border-l border-slate-100" style={forceEnNumsStyle}>{row.exit}</td>
                                  <td className="px-4 border-l border-slate-100 bg-blue-50 text-blue-800 font-black" style={forceEnNumsStyle}>{row.duration}</td>
                                  <td className="px-4 border-l border-slate-100 text-xs text-slate-500">{row.loader}</td>
                                  <td className="px-4 border-l border-slate-100 text-xs text-slate-500">{row.confirmer}</td>
                                  <td className="px-4 border-l border-slate-100 font-mono text-slate-400" style={forceEnNumsStyle}>{row.itemCode}</td>
                                  <td className="px-6 border-l border-slate-100 text-right font-black text-indigo-900">{row.itemName}</td>
                                  <td className="px-4 border-l border-slate-100 text-blue-600 bg-blue-50/10" style={forceEnNumsStyle}>{(row.bulkQty || 0).toFixed(3)}</td>
                                  <td className="px-4 border-l border-slate-100 text-indigo-600 bg-indigo-50/10" style={forceEnNumsStyle}>{(row.packedQty || 0).toFixed(3)}</td>
                                  <td className="px-6 border-l border-slate-100 bg-emerald-50 text-emerald-800 text-lg font-black" style={forceEnNumsStyle}>{(row.totalLoaded || 0).toFixed(3)}</td>
                                  <td className={`px-4 border-l border-slate-100 font-black ${(row.itemVariance || 0) !== 0 ? 'text-red-600 bg-red-50' : 'text-gray-300'}`} style={forceEnNumsStyle}>{(row.itemVariance || 0).toFixed(3)}</td>
                                  <td className="px-4 border-l border-slate-100"><span className="bg-slate-100 px-2 py-0.5 rounded text-[10px]">{row.salesType}</span></td>
                                  <td className="px-4 border-l border-slate-100" style={forceEnNumsStyle}>{row.prodDate}</td>
                                  <td className="px-4 border-l border-slate-100 text-xs">{row.payment}</td>
                                  <td className="px-6 text-right text-[10px] text-slate-400 italic max-w-xs truncate">{row.note}</td>
                              </tr>
                          ))}
                          {filteredData.length === 0 && (
                              <tr><td colSpan={columns.length} className="p-40 text-center text-slate-300 font-black text-2xl italic flex flex-col items-center gap-4"><TableIcon size={64} className="opacity-20"/><p>لا توجد بيانات مسجلة للفواتير في هذا التاريخ</p></td></tr>
                          )}
                      </tbody>
                      {filteredData.length > 0 && (
                          <tfoot className="sticky bottom-0 z-20 bg-slate-900 text-white font-black h-16 shadow-[0_-5px_15px_rgba(0,0,0,0.2)]">
                              <tr>
                                  <td colSpan={30} className="p-4 text-left pr-10 text-xl border-l border-slate-700">إجمالي الكميات المحملة المعروضة:</td>
                                  <td className="p-4 bg-emerald-600 text-2xl border-l border-slate-700" style={forceEnNumsStyle}>{(totalActualLoaded || 0).toFixed(3)}</td>
                                  <td colSpan={5}></td>
                              </tr>
                          </tfoot>
                      )}
                  </table>
              </div>
          </div>
      </div>
  );
};
