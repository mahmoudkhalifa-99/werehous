
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { dbService } from '../services/storage';
import { 
    Search, Edit2, Check, X, Settings, Trash2, RotateCcw, Rows, Columns, Eye, EyeOff, FileUp, FileDown, Printer, Plus, Save, Filter
} from 'lucide-react';
import { printService } from '../services/printing';
import { StockMovement, Product, Sale } from '../types';
import { ConfirmModal, GlassInput, GlassCard } from './NeumorphicUI';
import { PrintSettingsModal } from './PrintSettingsModal';
import { ReportActionsBar } from './ReportActionsBar';
import { TableToolbar } from './TableToolbar';
import * as XLSX from 'xlsx';

const forceEnNumsStyle = {
    fontVariantNumeric: 'lining-nums',
    direction: 'ltr' as const,
    fontSize: '14px',
    fontWeight: '700',
    textAlign: 'center' as const 
};

const DEFAULT_STYLES = {
    fontFamily: 'Calibri, sans-serif',
    fontSize: 12,
    isBold: true,
    isItalic: false,
    isUnderline: false,
    textAlign: 'center' as 'right' | 'center' | 'left',
    verticalAlign: 'middle' as 'top' | 'middle' | 'bottom',
    decimals: 2,
    rowHeight: 44,
    columnWidth: 95
};

const INITIAL_COLUMN_WIDTHS: Record<number, number> = {
    0: 90, 1: 90, 2: 90, 3: 350, 4: 70, 5: 100, 6: 100, 24: 120, 25: 120,
};

interface Props {
    filterCategory?: string;
}

export const DetailedFinishedTable: React.FC<Props> = ({ filterCategory: initialFilter }) => {
  const { products, settings, refreshProducts, user, t, deleteProduct } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [hideZeroRows, setHideZeroRows] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>(initialFilter || 'أعلاف');
  
  const PRINT_CONTEXT = activeCategory === 'بيوتولوجى' ? 'finished_petrology_balances' : 'finished_balances_screen';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tableStyles, setTableStyles] = useState(() => {
      const saved = localStorage.getItem(`glasspos_finished_${activeCategory}_styles`);
      return saved ? { ...DEFAULT_STYLES, ...JSON.parse(saved) } : DEFAULT_STYLES;
  });

  const [columnWidths, setColumnWidths] = useState<Record<number, number>>(() => {
      const saved = localStorage.getItem(`glasspos_finished_${activeCategory}_widths`);
      return saved ? JSON.parse(saved) : INITIAL_COLUMN_WIDTHS;
  });

  useEffect(() => {
      localStorage.setItem(`glasspos_finished_${activeCategory}_styles`, JSON.stringify(tableStyles));
  }, [tableStyles, activeCategory]);

  useEffect(() => {
      localStorage.setItem(`glasspos_finished_${activeCategory}_widths`, JSON.stringify(columnWidths));
  }, [columnWidths, activeCategory]);

  const [frozenCols] = useState(5);
  const [frozenRows] = useState(1);
  const tableRef = useRef<HTMLTableElement>(null);
  const [editingCell, setEditingCell] = useState<{ productId: string, type: 'bulk' | 'packed' | 'emptySacks' | 'sackWeight', currentVal: number } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [showPrintModal, setShowPrintModal] = useState(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newProductForm, setNewProductForm] = useState<Partial<Product>>({
      name: '',
      barcode: '',
      jdeCodePacked: '',
      jdeCodeBulk: '',
      category: activeCategory,
      unit: 'طن',
      initialStockBulk: 0,
      initialStockPacked: 0,
      sackWeight: 50,
      warehouse: 'finished'
  });

  const isAdmin = user?.role === 'admin';
  const isViewOnly = !isAdmin && user?.permissions?.screens?.['finished'] === 'view';

  const formatEng = (val: number) => {
    if (!val && val !== 0) return ""; 
    if (Math.abs(val) < 0.00001 && val !== 0) return "";
    return val.toLocaleString('en-US', { 
        minimumFractionDigits: tableStyles.decimals, 
        maximumFractionDigits: tableStyles.decimals 
    });
  };

  const normalizeForMatch = (text: any) => {
    if (!text) return '';
    return String(text).trim().toLowerCase()
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/[\u064B-\u0652]/g, '')
        .replace(/\s+/g, '');
  };

  const reportData = useMemo(() => {
    // تصفية صارمة: فقط المنتجات التي تتبع مخزن المنتج التام وتطابق التصنيف
    const finishedProducts = products.filter(p => {
        const itemCat = (p.category || '').trim();
        const isFinished = p.warehouse === 'finished';
        const isNotRaw = !itemCat.includes('خامات');
        
        if (activeCategory === 'بيوتولوجى') {
            return isFinished && itemCat === 'بيوتولوجى';
        }
        return isFinished && isNotRaw && (itemCat === 'أعلاف' || itemCat !== 'بيوتولوجى');
    });

    const movements = dbService.getMovements();
    const sales = dbService.getSales();

    const movementMap: Record<string, StockMovement[]> = {};
    movements.forEach(m => {
        m.items.forEach(item => {
            if (!movementMap[item.productId]) movementMap[item.productId] = [];
            movementMap[item.productId].push(m);
        });
    });

    const salesMap: Record<string, Sale[]> = {};
    sales.forEach(s => {
        s.items.forEach(item => {
            if (!salesMap[item.id]) salesMap[item.id] = [];
            salesMap[item.id].push(s);
        });
    });

    let data = finishedProducts.map(product => {
        const row = { 
            product, 
            openingBulk: product.initialStockBulk || 0, 
            openingPacked: product.initialStockPacked || 0, 
            prodBulk: 0, receivedPacked: 0, adjInPacked: 0, adjInBulk: 0, 
            returnClientPacked: 0, returnClientBulk: 0, transferPacked: 0, 
            transferBulk: 0, salesFarmPacked: 0, salesFarmBulk: 0, 
            salesClientPacked: 0, salesClientBulk: 0, outletTransfers: 0, 
            unfinishedPacked: 0, unfinishedBulk: 0, adjOutPacked: 0, 
            adjOutBulk: 0, totalBalance: 0, packedBalance: 0, 
            openingCount: 0, emptySacks: 0, siloRemains: 0, diff: 0, sackWeight: 0 
        };
        
        const isBulkItem = (product.unit?.toLowerCase() === 'ton' || product.unit?.toLowerCase() === 'طن' || product.unit?.includes('صب'));
        row.sackWeight = product.sackWeight || (isBulkItem ? 0 : (product.name.includes('25') ? 25 : 50));
        let manualEmptySacksAdj = 0;
        
        const categorizeTransaction = (qty: number, isBulk: boolean, type: string, notes: string = '', salesType: string = '') => {
            const absQty = Math.abs(qty); const n = notes.toLowerCase(); const sType = (salesType || '').toLowerCase();
            if (n.includes('جرد')) { row.openingCount += qty; return; }
            if (n.includes('غير تام')) { if (isBulk) row.unfinishedBulk += absQty; else row.unfinishedPacked += absQty; return; }
            if (n.includes('تعديل شكاير')) { manualEmptySacksAdj += (type === 'out' || qty < 0) ? -absQty : absQty; return; }
            if ((type === 'sale' && qty < 0) || (type === 'in' && n.includes('مرتجع'))) { if (isBulk) row.returnClientBulk += absQty; else row.returnClientPacked += absQty; return; }
            if (type === 'in') {
                if (n.includes('تسوية') || (n.includes('إضافة') && !n.includes('انتاج'))) { if (isBulk) row.adjInBulk += absQty; else row.adjInPacked += absQty; } 
                else { if (isBulk) row.prodBulk += absQty; else row.receivedPacked += absQty; }
                return;
            }
            if (type === 'sale' && qty > 0) {
                if (sType.includes('مزارع')) { if (isBulk) row.salesFarmBulk += absQty; else row.salesFarmPacked += absQty; } 
                else if (sType.includes('منافذ')) { row.outletTransfers += absQty; } 
                else { if (isBulk) row.salesClientBulk += absQty; else row.salesClientPacked += absQty; }
                return;
            }
            if (type === 'out' || (type === 'adjustment' && qty < 0)) {
                if (n.includes('تسوية') || n.includes('عجز')) { if (isBulk) row.adjOutBulk += absQty; else row.adjOutPacked += absQty; } 
                else { if (isBulk) row.transferBulk += absQty; else row.transferPacked += absQty; }
                return;
            }
        };

        movementMap[product.id]?.forEach(m => {
            const item = m.items.find(i => i.productId === product.id);
            if (item) {
                const qB = Number(item.quantityBulk || 0), qP = Number(item.quantityPacked || 0), n = (m.reason || '') + (item.notes || '');
                if (qB !== 0) categorizeTransaction(m.type === 'out' ? -Math.abs(qB) : Math.abs(qB), true, m.type, n);
                if (qP !== 0) categorizeTransaction(m.type === 'out' ? -Math.abs(qP) : Math.abs(qP), false, m.type, n);
                if (qB === 0 && qP === 0) categorizeTransaction(m.type === 'out' ? -Number(item.quantity) : Number(item.quantity), isBulkItem, m.type, n);
            }
        });

        salesMap[product.id]?.forEach(s => {
            const item = s.items.find(i => i.id === product.id);
            if (item) {
                const qB = Number(item.quantityBulk || 0), qP = Number(item.quantityPacked || 0);
                if (qB !== 0) categorizeTransaction(item.quantity < 0 ? -Math.abs(qB) : Math.abs(qB), true, 'sale', '', item.salesType);
                if (qP !== 0) categorizeTransaction(item.quantity < 0 ? -Math.abs(qP) : Math.abs(qP), false, 'sale', '', item.salesType);
                if (qB === 0 && qP === 0) categorizeTransaction(item.quantity, isBulkItem, 'sale', '', item.salesType);
            }
        });

        if (row.sackWeight > 0) row.emptySacks = (row.receivedPacked * row.sackWeight) + manualEmptySacksAdj;
        else row.emptySacks = manualEmptySacksAdj;
        
        row.totalBalance = (row.openingBulk + row.openingPacked) + (row.prodBulk + row.receivedPacked + row.adjInPacked + row.adjInBulk + row.returnClientPacked + row.returnClientBulk) - (row.transferPacked + row.transferBulk + row.salesFarmPacked + row.salesFarmBulk + row.salesClientPacked + row.salesClientBulk + row.outletTransfers + row.unfinishedPacked + row.unfinishedBulk + row.adjOutPacked + row.adjOutBulk);
        row.packedBalance = row.openingPacked + row.receivedPacked + row.adjInPacked + row.returnClientPacked - (row.transferPacked + row.salesFarmPacked + row.salesClientPacked + row.outletTransfers + row.unfinishedPacked + row.adjOutPacked);
        row.siloRemains = row.totalBalance - row.openingCount;
        row.diff = row.packedBalance - row.openingCount;
        return row;
    });

    if (hideZeroRows) data = data.filter(row => Math.abs(row.totalBalance) > 0.001 || Math.abs(row.openingBulk) > 0.001 || Math.abs(row.openingPacked) > 0.001);
    
    return data.filter(row => row.product.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [products, searchTerm, hideZeroRows, activeCategory]);

  const handleExport = () => {
    try {
        const headers = ["كود الصنف JDE معبأ", "كود الصنف JDE صب", "كود ثانوي", "الصنف", "الوحدة", "رصيد أول صب", "رصيد أول معبأ", "إجمالي الرصيد"];
        const rows = reportData.map(r => [
            r.product.jdeCodePacked || '', 
            r.product.jdeCodeBulk || '', 
            r.product.barcode, 
            r.product.name, 
            r.product.unit, 
            r.openingBulk, 
            r.openingPacked, 
            r.totalBalance
        ]);
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        XLSX.utils.book_append_sheet(wb, ws, "Balances");
        XLSX.writeFile(wb, `Finished_${activeCategory}_Balances_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) { alert('خطأ في تصدير البيانات'); }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
        try {
            const data = evt.target?.result;
            const workbook = XLSX.read(data, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(sheet);
            
            if (!jsonData.length) return alert('الملف فارغ أو غير صالح');

            const current = [...products];
            
            // 1. عزل كافة المنتجات التي لا تتبع القسم الحالي (خامات، وغيرها)
            const otherProducts = current.filter(p => {
                const isFinished = p.warehouse === 'finished';
                const pCat = (p.category || '').trim();
                if (activeCategory === 'بيوتولوجى') return pCat !== 'بيوتولوجى' || !isFinished;
                return pCat === 'خامات' || !isFinished || pCat === 'بيوتولوجى';
            });

            // 2. تصفية المنتجات الحالية في هذا القسم للبحث فيها فقط
            const currentSectionItems = current.filter(p => {
                const isFinished = p.warehouse === 'finished';
                const pCat = (p.category || '').trim();
                if (activeCategory === 'بيوتولوجى') return isFinished && pCat === 'بيوتولوجى';
                return isFinished && pCat !== 'بيوتولوجى' && !pCat.includes('خامات');
            });

            const newOrderedItems: Product[] = [];
            let updatedCount = 0;
            let addedCount = 0;

            jsonData.forEach((row: any) => {
                const excelCode = String(row['كود ثانوي'] || row['كود الصنف دريف'] || row['كود الصنف'] || row['كود دريف'] || row.Barcode || row['الكود'] || '').trim();
                const excelName = String(row['الصنف'] || row['اسم الصنف'] || row.Name || row['الاسم'] || '').trim();
                if (!excelCode && !excelName) return;

                const excelJdeP = String(row['كود JDE معبأ'] || row['كود الصنف JDE معبأ'] || '').trim();
                const excelJdeB = String(row['كود JDE صب'] || row['كود الصنف JDE صب'] || '').trim();
                const openingB = Number(row['رصيد أول صب'] || row['رصيد أول صب (ثابت)'] || row['رصيد صب'] || row['Opening Bulk'] || 0);
                const openingP = Number(row['رصيد أول معبأ'] || row['رصيد أول معبأ (ثابت)'] || row['رصيد معبأ'] || row['Opening Packed'] || 0);
                const unit = String(row['الوحدة'] || row.Unit || 'طن').trim();
                
                // البحث في أصناف القسم الحالي فقط لمنع تحويل صنف من "خام" إلى "تام" بالخطأ
                const existingIdx = currentSectionItems.findIndex(p => {
                    const dbBarcode = normalizeForMatch(p.barcode);
                    const dbName = normalizeForMatch(p.name);
                    const exCodeNorm = normalizeForMatch(excelCode);
                    const exNameNorm = normalizeForMatch(excelName);
                    return (excelCode && exCodeNorm === dbBarcode) || (excelName && exNameNorm === dbName);
                });

                if (existingIdx >= 0) {
                    const p = currentSectionItems[existingIdx];
                    newOrderedItems.push({
                        ...p,
                        jdeCodePacked: excelJdeP || p.jdeCodePacked,
                        jdeCodeBulk: excelJdeB || p.jdeCodeBulk,
                        initialStockBulk: openingB,
                        initialStockPacked: openingP,
                        unit: unit || p.unit,
                        category: activeCategory,
                        warehouse: 'finished'
                    });
                    updatedCount++;
                } else {
                    newOrderedItems.push({
                        id: `FIN-IMP-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                        name: excelName || `صنف جديد ${excelCode}`,
                        barcode: excelCode || `ID-${Date.now()}`,
                        jdeCodePacked: excelJdeP,
                        jdeCodeBulk: excelJdeB,
                        initialStockBulk: openingB,
                        initialStockPacked: openingP,
                        stockBulk: openingB,
                        stockPacked: openingP,
                        stock: openingB + openingP,
                        unit: unit || 'طن',
                        warehouse: 'finished',
                        category: activeCategory,
                        price: 0, cost: 0,
                        sackWeight: excelName.includes('25') ? 25 : 50
                    });
                    addedCount++;
                }
            });

            // دمج الأصناف الأخرى (الخامات وأقسام التام الأخرى) مع القائمة الجديدة المرتبة
            const finalProducts = [...otherProducts, ...newOrderedItems];
            dbService.saveProducts(finalProducts);
            refreshProducts();
            alert(`تم الاستيراد بنجاح لقطاع ${activeCategory}!\n- أصناف تم تحديثها: ${updatedCount}\n- أصناف أضيفت جديداً: ${addedCount}\n\nتم الحفاظ على الخامات وأصناف الأقسام الأخرى دون تغيير.`);
        } catch (err) { 
            alert('حدث خطأ أثناء قراءة الملف. تأكد من توافق أسماء الأعمدة.'); 
        }
        if (e.target) e.target.value = '';
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSaveNewProduct = () => {
    if (!newProductForm.name || !newProductForm.barcode) {
        alert('يرجى إكمال البيانات الأساسية (الاسم والباركود)');
        return;
    }
    
    const total = (newProductForm.initialStockBulk || 0) + (newProductForm.initialStockPacked || 0);
    const product: Product = {
        ...newProductForm as Product,
        id: `FIN-${Date.now()}`,
        stock: total,
        stockBulk: newProductForm.initialStockBulk,
        stockPacked: newProductForm.initialStockPacked,
        category: activeCategory,
        warehouse: 'finished',
        price: 0,
        cost: 0
    };

    dbService.saveProduct(product);
    refreshProducts();
    setIsAddModalOpen(false);
    setNewProductForm({
        name: '', barcode: '', jdeCodePacked: '', jdeCodeBulk: '', category: activeCategory, unit: 'طن', 
        initialStockBulk: 0, initialStockPacked: 0, sackWeight: 50, warehouse: 'finished'
    });
    alert('تم إضافة الصنف الجديد بنجاح');
  };

  const startEdit = (productId: string, type: 'bulk' | 'packed' | 'emptySacks' | 'sackWeight', currentVal: number) => { 
    setEditingCell({ productId, type, currentVal }); 
    setEditValue(currentVal === 0 ? '' : currentVal.toString()); 
  };

  const cancelEdit = () => { setEditingCell(null); setEditValue(''); };
  
  const saveEdit = () => { 
      if (!editingCell) return; const newValue = parseFloat(editValue); if (isNaN(newValue)) return; 
      const product = products.find(p => p.id === editingCell.productId); if (!product) return; 
      const updated = { ...product }; 
      if (editingCell.type === 'sackWeight') updated.sackWeight = newValue; 
      else if (editingCell.type === 'bulk') updated.initialStockBulk = newValue;
      else if (editingCell.type === 'packed') updated.initialStockPacked = newValue;
      dbService.saveProduct(updated); refreshProducts(); cancelEdit(); 
  };

  const getStickyStyle = (colIndex: number, rowIndex: number, isHeader: boolean, bgColor: string = '#ffffff') => {
      const isStickyCol = colIndex < frozenCols;
      const isStickyRow = rowIndex < frozenRows; 
      if (!isStickyCol && !isStickyRow) return {};
      const style: React.CSSProperties = { position: 'sticky' };
      if (isStickyCol) {
          let offset = 0; for(let i=0; i < colIndex; i++) offset += columnWidths[i] || tableStyles.columnWidth;
          style.right = `${offset}px`; style.zIndex = 10;
      }
      if (isStickyRow) { style.top = `${rowIndex === 0 ? 0 : 100}px`; style.zIndex = 20; }
      style.backgroundColor = bgColor; return style;
  };

  const handlePrint = () => {
      const config = settings.printConfigs[PRINT_CONTEXT] || settings.printConfigs['default'];
      const htmlContent = tableRef.current?.parentElement?.innerHTML || '';
      printService.printHtmlContent(config.reportTitle || `الأرصدة النهائية - قطاع ${activeCategory}`, htmlContent, PRINT_CONTEXT, settings);
  };

  const headers = [ 'كود الصنف JDE معبأ', 'كود الصنف JDE صب', 'كود ثانوي', t('item'), t('unit'), 'رصيد أول صب (ثابت)', 'رصيد أول معبأ (ثابت)', t('prodBulk'), t('receivedPacked'), t('adjInPacked'), t('adjInBulk'), t('returnClientPacked'), t('returnClientBulk'), t('transferPacked'), t('transferBulk'), t('salesFarmPacked'), t('salesFarmBulk'), t('salesClientPacked'), t('salesClientBulk'), t('outletTransfers'), t('unfinishedPacked'), t('unfinishedBulk'), t('adjOutPacked'), t('adjOutBulk'), t('totalBalance'), t('packedBalance'), t('openingCount'), t('sackWeight'), t('emptySacks'), t('siloRemains'), t('diff') ];

  const getCellStyle = (isNumeric: boolean = false): React.CSSProperties => ({
      fontFamily: isNumeric ? 'Inter, sans-serif' : tableStyles.fontFamily,
      fontSize: isNumeric ? '14px' : '12px',
      fontWeight: tableStyles.isBold ? 'bold' : 'normal',
      fontStyle: tableStyles.isItalic ? 'italic' : 'normal',
      textDecoration: tableStyles.isUnderline ? 'underline' : 'none',
      textAlign: 'center', 
      verticalAlign: tableStyles.verticalAlign,
      ...(isNumeric ? forceEnNumsStyle : {})
  });

  return (
    <div className="space-y-4 animate-fade-in font-cairo" dir="rtl">
        {showPrintModal && <PrintSettingsModal isOpen={showPrintModal} onClose={() => setShowPrintModal(false)} context={PRINT_CONTEXT} />}
        
        <TableToolbar styles={tableStyles} setStyles={setTableStyles} onReset={() => {setTableStyles(DEFAULT_STYLES); setColumnWidths(INITIAL_COLUMN_WIDTHS); refreshProducts();}} />

        <div className="bg-[#f3f4f6] p-3 rounded-xl border border-gray-300 shadow-sm flex flex-wrap items-center justify-between gap-4 no-print select-none">
            <div className="flex gap-2 items-center flex-1">
                <div className="flex bg-white border border-gray-300 rounded-lg p-1 shadow-sm mr-2">
                    <button onClick={() => setActiveCategory('أعلاف')} className={`px-4 py-1.5 rounded-md text-xs font-black transition-all ${activeCategory === 'أعلاف' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>الأعلاف</button>
                    <button onClick={() => setActiveCategory('بيوتولوجى')} className={`px-4 py-1.5 rounded-md text-xs font-black transition-all ${activeCategory === 'بيوتولوجى' ? 'bg-amber-50 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>البيوتولوجى</button>
                </div>

                <ReportActionsBar 
                    onPrint={handlePrint} 
                    onExport={handleExport} 
                    onImport={() => fileInputRef.current?.click()}
                    onSettings={() => setShowPrintModal(true)} 
                    hideImport={false} 
                />
                <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleImport} />
                
                <button onClick={() => setHideZeroRows(!hideZeroRows)} className={`px-4 h-[42px] rounded-lg font-bold border transition-all flex items-center gap-2 text-sm ${hideZeroRows ? 'bg-orange-100 border-orange-200 text-orange-700' : 'bg-white border-gray-200 text-gray-600'}`}>
                    {hideZeroRows ? <EyeOff size={18}/> : <Eye size={18}/>}
                    <span className="hidden md:inline">{hideZeroRows ? 'إظهار الصفري' : 'إخفاء الصفري'}</span>
                </button>

                <button 
                    onClick={() => setIsAddModalOpen(true)} 
                    className="px-6 h-[42px] rounded-lg font-black border bg-blue-600 border-blue-700 text-white transition-all flex items-center gap-2 text-xs hover:bg-blue-700 shadow-md transform active:scale-95"
                >
                    <Plus size={18}/>
                    <span>إضافة صنف ({activeCategory})</span>
                </button>
            </div>
            <div className="relative flex-1 max-md:hidden">
                <input className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-400 font-bold" placeholder={`بحث في قطاع ${activeCategory}...`} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                <Search className="absolute left-2 top-2.5 text-gray-400" size={16}/>
            </div>
        </div>
        
        <div className="relative w-full overflow-hidden rounded-xl shadow-xl border border-gray-300 bg-white">
            <div className="overflow-auto max-w-full max-h-[75vh]">
                <table className="w-full border-collapse" ref={tableRef}>
                    <thead className="bg-[#1f2937] text-white">
                        <tr>
                            {headers.map((h, i) => (
                                <th key={i} className="p-2 border border-gray-600 whitespace-nowrap px-4 py-3 shadow-sm font-black uppercase tracking-tighter text-center" style={{...getStickyStyle(i, 0, true, '#1f2937'), minWidth: columnWidths[i] || tableStyles.columnWidth, width: columnWidths[i] || tableStyles.columnWidth, fontSize: '12px'}}>
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="text-gray-700">
                        {reportData.map((row, idx) => (
                            <tr key={row.product.id} className="border-b hover:bg-blue-50 transition-colors bg-white h-11">
                                <td className="p-2 border bg-gray-50" style={{...getStickyStyle(0, idx + 1, false, '#f9fafb'), minWidth: columnWidths[0], ...getCellStyle(true)}}>{row.product.jdeCodePacked || '-'}</td>
                                <td className="p-2 border bg-gray-50" style={{...getStickyStyle(1, idx + 1, false, '#f9fafb'), minWidth: columnWidths[1], ...getCellStyle(true)}}>{row.product.jdeCodeBulk || '-'}</td>
                                <td className="p-2 border bg-gray-50" style={{...getStickyStyle(2, idx + 1, false, '#f9fafb'), minWidth: columnWidths[2], ...getCellStyle(true)}}>{row.product.barcode}</td>
                                <td className="p-2 border bg-white font-black text-indigo-900" style={{...getStickyStyle(3, idx + 1, false, '#ffffff'), minWidth: columnWidths[3], ...getCellStyle()}}>{row.product.name}</td>
                                <td className="p-2 border bg-white" style={{...getStickyStyle(4, idx + 1, false, '#ffffff'), minWidth: columnWidths[4], ...getCellStyle()}}>{row.product.unit}</td>
                                <td className="p-2 border bg-yellow-100 cursor-pointer text-blue-900 border-yellow-300 font-bold" style={{...getStickyStyle(5, idx + 1, false, '#fef9c3'), ...getCellStyle(true)}} onClick={() => !isViewOnly && startEdit(row.product.id, 'bulk', row.openingBulk)}>{formatEng(row.openingBulk)}</td>
                                <td className="p-2 border bg-yellow-100 cursor-pointer text-blue-900 border-yellow-300 font-bold" style={{...getStickyStyle(6, idx + 1, false, '#fef9c3'), ...getCellStyle(true)}} onClick={() => !isViewOnly && startEdit(row.product.id, 'packed', row.openingPacked)}>{formatEng(row.openingPacked)}</td>
                                <td className="p-1 border text-green-700" style={getCellStyle(true)}>{formatEng(row.prodBulk)}</td>
                                <td className="p-1 border text-green-700" style={getCellStyle(true)}>{formatEng(row.receivedPacked)}</td>
                                <td className="p-1 border text-green-600" style={getCellStyle(true)}>{formatEng(row.adjInPacked)}</td>
                                <td className="p-1 border text-green-600" style={getCellStyle(true)}>{formatEng(row.adjInBulk)}</td>
                                <td className="p-1 border text-red-500" style={getCellStyle(true)}>{formatEng(row.returnClientPacked)}</td>
                                <td className="p-1 border text-red-500" style={getCellStyle(true)}>{formatEng(row.returnClientBulk)}</td>
                                <td className="p-1 border text-orange-600" style={getCellStyle(true)}>{formatEng(row.transferPacked)}</td>
                                <td className="p-1 border text-orange-600" style={getCellStyle(true)}>{formatEng(row.transferBulk)}</td>
                                <td className="p-1 border text-blue-600" style={getCellStyle(true)}>{formatEng(row.salesFarmPacked)}</td>
                                <td className="p-1 border text-blue-600" style={getCellStyle(true)}>{formatEng(row.salesFarmBulk)}</td>
                                <td className="p-1 border text-purple-600" style={getCellStyle(true)}>{formatEng(row.salesClientPacked)}</td>
                                <td className="p-1 border text-purple-600" style={getCellStyle(true)}>{formatEng(row.salesClientBulk)}</td>
                                <td className="p-1 border text-indigo-800" style={getCellStyle(true)}>{formatEng(row.outletTransfers)}</td>
                                <td className="p-1 border bg-gray-100" style={getCellStyle(true)}>{formatEng(row.unfinishedPacked)}</td>
                                <td className="p-1 border bg-gray-100" style={getCellStyle(true)}>{formatEng(row.unfinishedBulk)}</td>
                                <td className="p-1 border text-red-600" style={getCellStyle(true)}>{formatEng(row.adjOutPacked)}</td>
                                <td className="p-1 border text-red-600" style={getCellStyle(true)}>{formatEng(row.adjOutBulk)}</td>
                                <td className="p-2 border bg-blue-100 text-blue-900 shadow-inner font-black" style={getCellStyle(true)}>{formatEng(row.totalBalance)}</td>
                                <td className="p-2 border bg-indigo-100 text-indigo-900 shadow-inner font-black" style={getCellStyle(true)}>{formatEng(row.packedBalance)}</td>
                                <td className="p-1 border bg-orange-50" style={getCellStyle(true)}>{formatEng(row.openingCount)}</td>
                                <td className="p-1 border bg-white cursor-pointer" style={getCellStyle()} onClick={() => !isViewOnly && startEdit(row.product.id, 'sackWeight', row.sackWeight)}>{row.sackWeight > 0 ? row.sackWeight : ''}</td>
                                <td className="p-1 border bg-white cursor-pointer" style={getCellStyle(true)} onClick={() => !isViewOnly && startEdit(row.product.id, 'emptySacks', row.emptySacks)}>{formatEng(row.emptySacks)}</td>
                                <td className="p-1 border text-gray-800" style={getCellStyle(true)}>{formatEng(row.siloRemains)}</td>
                                <td className="p-1 border text-red-700" style={getCellStyle(true)}>{formatEng(row.diff)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        {isAddModalOpen && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 font-cairo" dir="rtl">
                <GlassCard className="w-full max-w-2xl relative bg-white border-t-4 border-blue-600 p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
                    <button onClick={() => setIsAddModalOpen(false)} className="absolute top-4 left-4 text-gray-400 hover:text-red-500 transition-colors"><X size={24}/></button>
                    <h3 className="text-xl font-black mb-8 text-right text-blue-900 border-b pb-2 flex items-center gap-2">
                        <Plus size={20}/> إضافة صنف لقطاع ({activeCategory})
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <GlassInput label="اسم الصنف الكامل" value={newProductForm.name} onChange={e => setNewProductForm({...newProductForm, name: e.target.value})} placeholder="مثال: صنف بيوتولوجى 1"/>
                        </div>
                        <GlassInput label="الكود الثانوي (دريف)" value={newProductForm.barcode} onChange={e => setNewProductForm({...newProductForm, barcode: e.target.value})} placeholder="رقم الكود..." />
                        <div className="flex flex-col gap-2">
                            <label className="text-gray-600 text-sm font-bold">التصنيف</label>
                            <input className="bg-gray-200 rounded-xl px-4 py-3 border-none font-bold text-slate-500" value={activeCategory} readOnly />
                        </div>
                        <GlassInput label="كود JDE معبأ" value={newProductForm.jdeCodePacked} onChange={e => setNewProductForm({...newProductForm, jdeCodePacked: e.target.value})} />
                        <GlassInput label="كود JDE صب" value={newProductForm.jdeCodeBulk} onChange={e => setNewProductForm({...newProductForm, jdeCodeBulk: e.target.value})} />
                        <GlassInput label="رصيد أول صب (ثابت)" type="number" step="any" value={newProductForm.initialStockBulk} onChange={e => setNewProductForm({...newProductForm, initialStockBulk: Number(e.target.value)})} />
                        <GlassInput label="رصيد أول معبأ (ثابت)" type="number" step="any" value={newProductForm.initialStockPacked} onChange={e => setNewProductForm({...newProductForm, initialStockPacked: Number(e.target.value)})} />
                        <GlassInput label="وزن الشكارة (كجم)" type="number" step="any" value={newProductForm.sackWeight} onChange={e => setNewProductForm({...newProductForm, sackWeight: Number(e.target.value)})} />
                        <div className="flex flex-col gap-2">
                            <label className="text-gray-600 text-sm font-bold">الوحدة</label>
                            <select className="bg-gray-100 rounded-xl px-4 py-3 outline-none border border-transparent focus:border-blue-400 focus:bg-white transition-all shadow-inner font-bold" value={newProductForm.unit} onChange={e => setNewProductForm({...newProductForm, unit: e.target.value})}>
                                <option value="طن">طن</option>
                                <option value="كجم">كجم</option>
                                <option value="شكارة">شكارة</option>
                                <option value="عدد">عدد</option>
                            </select>
                        </div>
                    </div>

                    <div className="mt-10 flex gap-3">
                        <button onClick={handleSaveNewProduct} className="flex-1 bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2 text-lg active:scale-95 border-b-4 border-blue-900">
                            <Save size={20}/> حفظ وإضافة الصنف
                        </button>
                        <button onClick={() => setIsAddModalOpen(false)} className="px-8 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors">إلغاء</button>
                    </div>
                </GlassCard>
            </div>
        )}

        {editingCell && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" dir="rtl">
                <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-sm border-2 border-blue-50">
                    <h4 className="font-bold text-lg mb-4 text-center font-cairo">تعديل جرد البداية (الثابت)</h4>
                    <div className="space-y-4">
                        <input type="number" step="any" className="w-full p-3 border-2 rounded-xl text-center text-3xl font-black outline-none focus:border-blue-600" value={editValue} onChange={e => setEditValue(e.target.value)} autoFocus onKeyDown={e => e.key === 'Enter' && saveEdit()}/>
                        <div className="flex gap-2 font-cairo"><button onClick={saveEdit} className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold">حفظ</button><button onClick={cancelEdit} className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold">إلغاء</button></div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
