
import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { GlassCard, GlassButton, GlassInput, ConfirmModal, InputModal } from '../components/NeumorphicUI';
import { dbService } from '../services/storage';
import { Product, WarehouseType } from '../types';
import { Plus, Edit2, Trash2, X, Search, FileDown, FileUp, Printer, Tag, AlertCircle, Save, Settings as SettingsIcon } from 'lucide-react';
import { printService } from '../services/printing';
import { ReportActionsBar } from './ReportActionsBar';
import * as XLSX from 'xlsx';

const unifiedNumStyle = {
    fontFamily: 'Inter, sans-serif',
    fontVariantNumeric: 'lining-nums',
    direction: 'ltr' as const,
    fontWeight: '700'
};

interface Props {
  warehouse: WarehouseType | 'all';
  hideToolbar?: boolean;
}

export const ProductTable: React.FC<Props> = ({ warehouse, hideToolbar = false }) => {
  const { products, refreshProducts, deleteProduct, t, settings, updateSettings, user, can, addNotification } = useApp();
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState<Partial<Product>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'low' | 'out' | 'over'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canImport = can('actions', 'canImport');
  const canExport = can('actions', 'canExport');
  const canDelete = can('actions', 'canDelete');
  
  const screenKey = warehouse === 'all' ? 'sb_monthly_reports' : `sb_${warehouse}`;
  const isViewOnly = !can('screens', screenKey, 'edit');

  const warehouseProducts = warehouse === 'all' ? products : products.filter(p => p.warehouse === warehouse);

  const normalizeText = (text: string) => {
      return (text || '').toString().trim().toLowerCase()
          .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/[\u064B-\u0652]/g, '');
  };

  const filteredProducts = warehouseProducts.filter(p => {
      const term = normalizeText(searchTerm);
      if (!term) return true;
      const matchesSearch = normalizeText(p.name).includes(term) || normalizeText(p.barcode).includes(term);
      let matchesFilter = true;
      if (filter === 'low') matchesFilter = p.stock > 0 && p.stock <= (p.minStock || 10);
      return matchesSearch && matchesFilter;
  });

  const exportToExcel = () => {
    if (!canExport) return alert('عذراً، ليس لديك صلاحية تصدير البيانات');
    try {
        const headers = ['كود الصنف', 'اسم الصنف', 'التصنيف', 'الوحدة', 'إجمالي الرصيد'];
        const rows = filteredProducts.map(p => [ p.barcode, p.name, p.category, p.unit, p.stock ]);
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        XLSX.utils.book_append_sheet(wb, ws, "Inventory");
        XLSX.writeFile(wb, `Stock_Report_${warehouse}_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) { alert('حدث خطأ أثناء التصدير'); }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!canImport) return alert('عذراً، ليس لديك صلاحية استيراد البيانات');
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
          try {
              const data = evt.target?.result;
              const workbook = XLSX.read(data, { type: 'array' });
              const ws = workbook.Sheets[workbook.SheetNames[0]];
              const jsonData = XLSX.utils.sheet_to_json(ws);
              
              if (jsonData.length === 0) return alert('الملف فارغ');

              const currentProducts = [...products];
              let updated = 0; let added = 0;

              jsonData.forEach((row: any) => {
                  const barcode = String(row['كود الصنف'] || row['Barcode'] || row['الكود'] || '').trim();
                  const name = String(row['اسم الصنف'] || row['Name'] || row['الاسم'] || '').trim();
                  const stock = parseFloat(row['الرصيد'] || row['Stock'] || row['الكمية'] || '0');
                  const unit = String(row['الوحدة'] || row['Unit'] || 'عدد');
                  const cat = String(row['التصنيف'] || row['Category'] || 'عام');

                  if (!barcode && !name) return;

                  const existingIdx = currentProducts.findIndex(p => p.barcode === barcode || p.name === name);
                  if (existingIdx >= 0) {
                      currentProducts[existingIdx] = { 
                          ...currentProducts[existingIdx], 
                          stock: stock, 
                          unit: unit,
                          category: cat
                      };
                      updated++;
                  } else {
                      currentProducts.push({
                          id: barcode || `ID-${Date.now()}-${Math.random()}`,
                          barcode: barcode || `ID-${Date.now()}`,
                          name: name,
                          stock: stock,
                          price: 0, cost: 0,
                          unit: unit,
                          category: cat,
                          warehouse: warehouse === 'all' ? 'raw' : warehouse as WarehouseType
                      });
                      added++;
                  }
              });

              dbService.saveProducts(currentProducts);
              refreshProducts();
              addNotification(`تم الاستيراد: تحديث ${updated} | إضافة ${added}`, 'success');
          } catch (err) {
              alert('خطأ في معالجة ملف الإكسيل. تأكد من الصيغة الصحيحة.');
          }
          if (e.target) e.target.value = '';
      };
      reader.readAsArrayBuffer(file);
  };

  const formatNum = (v: number | undefined) => (v || 0).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

  return (
    <div className="space-y-6" dir="rtl">
      <div className="bg-white/50 p-4 rounded-xl border border-white/40 shadow-sm">
          {!hideToolbar && (
              <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                  <h3 className="font-bold text-gray-700 text-lg font-cairo">إدارة الأصناف والأرصدة</h3>
                  <div className="flex flex-wrap gap-1">
                      <ReportActionsBar 
                        onNewEntry={!isViewOnly ? () => {
                            setEditingProduct(null); 
                            setProductForm({ id: Date.now().toString(), category: '', warehouse: warehouse === 'all' ? 'raw' : warehouse, stock: 0, unit: 'عدد' });
                            setIsProductModalOpen(true);
                        } : undefined}
                        newEntryLabel="إضافة صنف"
                        onImport={canImport && !isViewOnly ? () => fileInputRef.current?.click() : undefined}
                        onExport={canExport ? exportToExcel : undefined}
                        onPrint={() => printService.printProductList(warehouseProducts, warehouse, settings)}
                        hideImport={!canImport}
                      />
                      <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleImport} />
                  </div>
              </div>
          )}
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative w-full">
                <input 
                    type="text" 
                    placeholder="بحث بالاسم أو الكود..." 
                    className="w-full bg-white border border-gray-200 rounded-lg py-3 px-10 outline-none focus:ring-2 focus:ring-blue-400 font-cairo text-sm shadow-inner" 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                />
                <Search className="absolute top-3.5 right-3 text-gray-400" size={20}/>
            </div>
            <div className="flex justify-end gap-2 font-cairo text-sm">
                 <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-lg border font-bold ${filter === 'all' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white'}`}>الكل</button>
                 <button onClick={() => setFilter('low')} className={`px-4 py-2 rounded-lg border font-bold ${filter === 'low' ? 'bg-yellow-500 text-white border-yellow-500' : 'bg-white'}`}>منخفض</button>
            </div>
          </div>
      </div>

      <GlassCard className="overflow-hidden p-0 border border-gray-200 shadow-xl rounded-2xl bg-white">
         <div className="overflow-x-auto">
             <table className="w-full text-center text-gray-700 font-cairo border-collapse text-sm">
                 <thead className="bg-[#1e293b] text-white">
                     <tr className="h-12">
                         <th className="px-4 py-2 font-bold">كود دريف</th>
                         <th className="px-4 py-2 font-bold text-right">الصنف</th>
                         <th className="px-4 py-2 font-bold">التصنيف</th>
                         <th className="px-4 py-2 font-bold">{t('unit')}</th>
                         <th className="px-4 py-2 font-bold">إجمالي الرصيد</th>
                         {!isViewOnly && <th className="px-4 py-2 font-bold text-center">إجراءات</th>}
                     </tr>
                 </thead>
                 <tbody>
                     {filteredProducts.map((p, idx) => (
                         <tr key={p.id} className={`border-b border-gray-100 hover:bg-blue-50 h-12 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                             <td className="px-4 py-2 font-mono text-xs font-bold text-blue-600">{p.barcode}</td>
                             <td className="px-4 py-2 font-bold text-gray-800 text-right">{p.name}</td>
                             <td className="px-4 py-2">
                                <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-[10px] font-bold border border-blue-100">{p.category || '-'}</span>
                             </td>
                             <td className="px-4 py-2 text-gray-600">{p.unit || 'عدد'}</td>
                             <td className="px-4 py-2 font-black text-gray-900 bg-slate-50" style={unifiedNumStyle}>{formatNum(p.stock)}</td>
                             {!isViewOnly && (
                                 <td className="px-4 py-2 flex justify-center gap-2">
                                     <button onClick={() => { setEditingProduct(p); setProductForm(p); setIsProductModalOpen(true); }} className="text-blue-500 hover:bg-blue-100 p-2 rounded-lg"><Edit2 size={16}/></button>
                                     {canDelete && <button onClick={() => setDeleteId(p.id)} className="text-red-500 hover:bg-red-100 p-2 rounded-lg"><Trash2 size={16}/></button>}
                                 </td>
                             )}
                         </tr>
                     ))}
                 </tbody>
             </table>
         </div>
      </GlassCard>

      <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => { if (deleteId) { deleteProduct(deleteId); refreshProducts(); setDeleteId(null); } }} title="حذف صنف" message="هل أنت متأكد من الحذف؟" confirmText="حذف" cancelText="إلغاء"/>
    </div>
  );
};
