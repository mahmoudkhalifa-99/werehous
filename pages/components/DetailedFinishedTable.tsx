
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { dbService } from '../services/storage';
import { 
    Search, X, Trash2, Eye, EyeOff, Link as LinkIcon, Calculator, 
    FunctionSquare, Calendar, GitMerge, RotateCcw, Check, ZoomIn, ChevronDown,
    FileUp, FileDown, Printer, Settings, Palette, Info, RotateCw,
    ChevronLeft, Sigma, FileSpreadsheet, AlertCircle, CheckCircle2, Plus, Save, PackagePlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { printService } from '../services/printing';
import { ConfirmModal, GlassButton, GlassInput } from './NeumorphicUI';
import { PrintSettingsModal } from './PrintSettingsModal';
import * as XLSX from 'xlsx';
import { Product } from '../types';

const forceEnNumsStyle = {
    fontVariantNumeric: 'lining-nums',
    direction: 'ltr' as const,
    fontSize: '11px',
    fontWeight: '800',
    textAlign: 'center' as const 
};

/**
 * دالة التطهير الفائقة (The Ultra Purifier)
 * تحول النص إلى "بصمة مجردة" للمطابقة المستحيلة الخطأ
 * تم التحديث: إضافة toLowerCase لضمان مطابقة حروف JDE
 */
const ultraPurify = (s: any): string => {
    if (s === null || s === undefined) return '';
    return String(s)
        .toLowerCase() // تحويل الكل لصغير لضمان مطابقة JDE
        .replace(/[\u00A0\u1680\u180e\u2000-\u200a\u202f\u205f\u3000]/g, '') // حذف المسافات المخفية
        .replace(/[\u064B-\u0652]/g, '') // حذف التشكيل
        .replace(/[أإآ]/g, 'ا') // توحيد الألف
        .replace(/[ة]/g, 'ه') // توحيد الهاء
        .replace(/[ى]/g, 'ي') // توحيد الياء
        .replace(/[^a-z0-9\u0621-\u064A]/g, '') // حذف الرموز والمسافات (بما فيها المسافات بين الحروف)
        .trim();
};

const evaluateExcelFormula = (formula: string, rowContext: Record<string, number>): number => {
    try {
        if (!formula || formula.trim() === '') return 0;
        let f = formula.trim().toUpperCase();
        if (f.startsWith('=')) f = f.substring(1);
        const sortedKeys = Object.keys(rowContext).sort((a, b) => b.length - a.length);
        for (const key of sortedKeys) {
            const regex = new RegExp(`\\b${key}\\b`, 'g');
            f = f.replace(regex, (rowContext[key] || 0).toString());
        }
        let sanitized = f.replace(/[^0-9.+\-*/() ]/g, '');
        if (!sanitized.trim()) return 0;
        const result = new Function(`return (${sanitized})`)();
        return isNaN(result) ? 0 : result;
    } catch (e) { return 0; }
};

const FORMULA_VARIABLES = [
    { key: 'G', label: 'أول صب (شكارة)', color: 'bg-orange-50 text-orange-600 border-orange-100' },
    { key: 'H', label: 'أول معبأ (شكارة)', color: 'bg-yellow-50 text-yellow-600 border-yellow-100' },
    { key: 'I', label: 'الإنتاج صب', color: 'bg-blue-50 text-blue-600 border-blue-100' },
    { key: 'J', label: 'المستلمات معبأ', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
    { key: 'K', label: 'تسوية(+) معبأ', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
    { key: 'L', label: 'تسوية(+) صب', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
    { key: 'M', label: 'مرتجع معبأ', color: 'bg-rose-50 text-rose-600 border-rose-100' },
    { key: 'N', label: 'مرتجع صب', color: 'bg-rose-50 text-rose-600 border-rose-100' },
    { key: 'P', label: 'التحويلات صب', color: 'bg-orange-50 text-orange-600 border-orange-100' },
    { key: 'D', label: 'التحويلات معبأ', color: 'bg-orange-50 text-orange-600 border-orange-100' },
    { key: 'Q', label: 'مزارع معبأ', color: 'bg-blue-50 text-blue-600 border-blue-100' },
    { key: 'S', label: 'مزارع صب', color: 'bg-blue-50 text-blue-600 border-blue-100' },
    { key: 'E', label: 'عملاء معبأ', color: 'bg-blue-50 text-blue-600 border-blue-100' },
    { key: 'T', label: 'عملاء صب', color: 'bg-blue-50 text-blue-600 border-blue-100' },
    { key: 'U', label: 'تحويلات منافذ', color: 'bg-purple-50 text-purple-600 border-purple-100' },
    { key: 'V', label: 'غير تام معبأ', color: 'bg-slate-50 text-slate-600 border-slate-100' },
    { key: 'W', label: 'غير تام صب', color: 'bg-slate-50 text-slate-600 border-slate-100' },
    { key: 'Z', label: 'عجز معبأ', color: 'bg-rose-50 text-rose-600 border-rose-100' },
    { key: 'Y', label: 'عجز صب', color: 'bg-rose-50 text-rose-600 border-rose-100' }
];

export const DetailedFinishedTable: React.FC<{ filterCategory?: string }> = ({ filterCategory: initialFilter }) => {
  const { products, refreshProducts, user, addNotification, deleteProduct } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [hideZeroRows, setHideZeroRows] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>(initialFilter || 'أعلاف');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [pageScale, setPageScale] = useState(100);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [linkingModalItem, setLinkingModalItem] = useState<any | null>(null);
  const [isManualAddOpen, setIsManualAddOpen] = useState(false);
  const tableRef = useRef<HTMLTableElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // حالة نموذج إضافة صنف يدوي
  const [manualForm, setManualForm] = useState({
      name: '',
      barcode: '',
      jdeCodePacked: '',
      jdeCodeBulk: '',
      initialStockBulk: 0,
      initialStockPacked: 0,
      sackWeight: 50
  });

  const [dateFilter, setDateFilter] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const isAdmin = user?.role === 'admin';
  const isViewOnly = !isAdmin && user?.permissions?.screens?.sb_finished === 'view';
  const PRINT_CONTEXT = activeCategory === 'بيوتولوجى' ? 'finished_petrology_balances' : 'finished_feed_balances';

  const [linkages, setLinkages] = useState<Record<string, any>>(() => {
      const saved = localStorage.getItem(`glasspos_mizan_logic_v16_${activeCategory}`);
      return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
      const saved = localStorage.getItem(`glasspos_mizan_logic_v16_${activeCategory}`);
      setLinkages(saved ? JSON.parse(saved) : {});
  }, [activeCategory, products]);

  const handleUpdateColor = (productId: string, color: string) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;
    const updated = { ...prod, customFields: { ...prod.customFields, rowColor: color } };
    dbService.saveProduct(updated);
    refreshProducts();
  };

  const formatVal = (val: any) => {
      if (val === null || val === undefined || isNaN(val) || Math.abs(Number(val)) < 0.0001) return "-";
      return Number(val).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  };

  const reportData = useMemo(() => {
    const startRange = new Date(dateFilter.start); startRange.setHours(0,0,0,0);
    const endRange = new Date(dateFilter.end); endRange.setHours(23,59,59,999);

    const finishedProducts = products.filter(p => {
        const itemCat = (p.category || '').trim();
        const isFinished = p.warehouse === 'finished';
        if (activeCategory === 'بيوتولوجى') return isFinished && itemCat === 'بيوتولوجى';
        return isFinished && (itemCat === 'أعلاف' || itemCat !== 'بيوتولوجى');
    });

    const movements = dbService.getMovements();
    const sales = dbService.getSales();

    let baseData = finishedProducts.map((product) => {
        const row: any = { 
            product, 
            G: Number(product.initialStockBulk || 0),
            H: Number(product.initialStockPacked || 0),
            I: 0, J: 0, K: 0, L: 0, M: 0, N: 0, O: 0, P: 0, Q: 0, R: 0, S: 0, T: 0, U: 0, V: 0, W: 0, X: 0, Y: 0, 
            AB: 0, 
            AC: Number(product.sackWeight || (product.name.includes('25') ? 25 : 50)),
            AD: 0, AE: 0,
            rawProduction: 0 
        };

        movements.filter(m => m.warehouse === 'finished').forEach(m => {
            const item = m.items.find(i => i.productId === product.id);
            if (!item) return;
            const mDate = new Date(m.date);
            let qB = Number(item.quantityBulk || 0);
            let qP = Number(item.quantityPacked || 0);
            if (qB === 0 && qP === 0) {
                const unit = (item.unit || product.unit || '').toLowerCase();
                if (unit.includes('صب') || unit.includes('bulk')) qB = Number(item.quantity || 0);
                else qP = Number(item.quantity || 0);
            }
            const notes = ((m.reason || '') + (item.notes || '')).toLowerCase();
            const entryMode = (m.customFields?.entryMode || '').toLowerCase();
            if (mDate < startRange) {
                const factor = (m.type === 'in' || m.type === 'return' || (m.type === 'adjustment' && !m.reason?.includes('خصم'))) ? 1 : -1;
                row.G += (qB * factor); row.H += (qP * factor);
            } 
            else if (mDate <= endRange) {
                if (notes.includes('جرد')) { row.AB += (Number(item.quantity) * (m.type === 'out' ? -1 : 1)); }
                else if (entryMode === 'unfinished') { row.W += qB; row.V += qP; }
                else if (m.type === 'return' || notes.includes('مرتجع')) { row.N += qB; row.M += qP; }
                else if (m.type === 'adjustment') { 
                    if (m.reason?.includes('عجز') || m.reason?.includes('خصم')) { row.Y += qB; row.X += qP; } 
                    else { row.L += qB; row.K += qP; } 
                }
                else if (m.type === 'in') { row.J += qP; row.rawProduction += qB; }
                else if (m.type === 'transfer' || m.type === 'out') { row.P += qB; row.O += qP; }
            }
        });

        sales.forEach(s => {
            const item = s.items.find(i => i.id === product.id);
            if (!item) return;
            const sDate = new Date(s.date);
            let qB = Number(item.quantityBulk || 0);
            let qP = Number(item.quantityPacked || 0);
            const sType = (item.salesType || '').toLowerCase();
            if (sDate < startRange) { row.G -= qB; row.H -= qP; }
            else if (sDate <= endRange) {
                if (item.quantity < 0) { row.N += Math.abs(qB); row.M += Math.abs(qP); } 
                else {
                    if (sType.includes('مزارع')) { row.R += qB; row.Q += qP; } 
                    else if (sType.includes('منافذ')) { row.U += (qB + qP); } 
                    else { row.T += qB; row.S += qP; }
                }
            }
        });
        return row;
    });

    const childProductionMap: Record<string, number> = {};
    const processedRows = baseData.map(row => {
        const link = linkages[row.product.id];
        const parentId = link?.parentId;
        const prodFormula = link?.prodFormula;
        let calculatedI = prodFormula ? evaluateExcelFormula(prodFormula, row) : row.rawProduction;
        if (parentId && parentId.trim() !== "") {
            row.isChild = true;
            childProductionMap[parentId] = (childProductionMap[parentId] || 0) + calculatedI;
        }
        return { ...row, I: calculatedI };
    });

    return processedRows.map(row => {
        const link = linkages[row.product.id];
        const totalFormula = link?.totalFormula;
        const packedFormula = link?.packedFormula;
        if (childProductionMap[row.product.id]) {
            row.isParent = true;
            row.I = row.I - childProductionMap[row.product.id];
        }
        const excelCtx: any = { ...row };
        if (totalFormula) {
            row.Z = evaluateExcelFormula(totalFormula, excelCtx);
        } else {
            row.Z = (row.G + row.H + row.I + row.J + row.K + row.L + row.M + row.N) - (row.O + row.P + row.Q + row.R + row.S + row.T + row.U + row.V + row.W + row.X + row.Y);
        }
        excelCtx.Z = row.Z;
        if (packedFormula) {
            row.AA = evaluateExcelFormula(packedFormula, excelCtx);
        } else {
            row.AA = (row.H + row.J + row.K + row.M) - (row.O + row.Q + row.S + row.U + row.V + row.X);
        }
        row.AF = row.AA - row.AB;
        return row;
    }).filter(row => !hideZeroRows || Math.abs(row.Z) > 0.001).filter(row => row.product.name.includes(searchTerm));
  }, [products, searchTerm, hideZeroRows, activeCategory, linkages, dateFilter]);

  const handleExport = () => {
    const headers = [
        "معبأ JDE", "صب JDE", "كود ثانوي", "اسم الصنف", "الوحدة", 
        "أول صب (G)", "أول معبأ (H)", "الإنتاج (I)", "رصيد المعبأ (AA)", 
        "الرصيد الكلي (Z)", "الجرد (AB)", "الفرق"
    ];
    const data = reportData.map(r => [
        r.product.jdeCodePacked || '-', r.product.jdeCodeBulk || '-', r.product.barcode || '-', 
        r.product.name, r.product.unit || 'طن',
        r.G, r.H, r.I, r.AA, r.Z, r.AB, r.AF
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Balances");
    XLSX.writeFile(wb, `Finished_Balances_${activeCategory}_${dateFilter.end}.xlsx`);
    addNotification('تم تصدير التقرير بنجاح بصيغة الإكسيل', 'success');
  };

  /**
   * دالة إضافة صنف يدوياً
   */
  const handleSaveManualAdd = async () => {
      if (!manualForm.name || !manualForm.barcode) {
          alert('الاسم والكود الثانوي مطلوبان');
          return;
      }

      const newId = manualForm.barcode || `ID-${Date.now()}`;
      const newProd: Product = {
          id: newId,
          name: manualForm.name,
          barcode: manualForm.barcode || newId,
          jdeCodePacked: manualForm.jdeCodePacked,
          jdeCodeBulk: manualForm.jdeCodeBulk,
          initialStockBulk: Number(manualForm.initialStockBulk) || 0,
          initialStockPacked: Number(manualForm.initialStockPacked) || 0,
          stock: (Number(manualForm.initialStockBulk) || 0) + (Number(manualForm.initialStockPacked) || 0),
          warehouse: 'finished',
          category: activeCategory,
          sackWeight: Number(manualForm.sackWeight) || 50,
          price: 0,
          cost: 0,
          unit: 'طن'
      };

      try {
          await dbService.saveProduct(newProd);
          refreshProducts();
          addNotification('تم إضافة الصنف الجديد بنجاح', 'success');
          setIsManualAddOpen(false);
          setManualForm({
              name: '', barcode: '', jdeCodePacked: '', jdeCodeBulk: '',
              initialStockBulk: 0, initialStockPacked: 0, sackWeight: 50
          });
      } catch (err) {
          alert('خطأ في حفظ الصنف');
      }
  };

  /**
   * محرك الاستيراد الفائق (Super Import Engine)
   * تم تعديله ليكون أكثر ذكاءً في التعرف على أعمدة JDE
   */
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
        try {
            const data = evt.target?.result;
            const workbook = XLSX.read(data, { type: 'array' });
            const ws = workbook.Sheets[workbook.SheetNames[0]];
            
            const allRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
            if (allRows.length < 1) return alert('الملف فارغ');

            let headerIdx = -1;
            const keyIndicators = ['صنف', 'jde', 'ثانوي', 'barcode', 'اسم', 'item', 'اول'];
            
            for (let i = 0; i < Math.min(allRows.length, 50); i++) {
                const rowContent = allRows[i].map(cell => ultraPurify(cell)).join('|');
                if (keyIndicators.some(indicator => rowContent.includes(ultraPurify(indicator)))) {
                    headerIdx = i;
                    break;
                }
            }

            if (headerIdx === -1) return alert('فشل العثور على عناوين الجدول. تأكد من وجود أعمدة واضحة المسميات.');

            const headerRow = allRows[headerIdx].map(h => ultraPurify(h));
            const findCol = (keywords: string[]) => headerRow.findIndex(h => keywords.some(k => h.includes(ultraPurify(k))));

            const idxName = findCol(['اسم الصنف', 'الصنف', 'الاسم', 'Name', 'Product']);
            const idxBarcode = findCol(['ثانوي', 'Barcode', 'كود دريف', 'كود ثانوي', 'Secondary']);
            
            // تحسين مطابقة الـ JDE لتشمل احتمالات أكثر
            const idxJdeP = findCol(['معباjde', 'jdeمعبا', 'jdeمعبأ', 'كودjdeمعبا', 'jdepacked', 'رقمjdeمعبا', 'jdeمعبأ']);
            const idxJdeB = findCol(['صبjde', 'jdeصب', 'كودjdeصب', 'jdebulk', 'رقمjdeصب']);
            
            const idxOpenB = findCol(['اولصب', 'رصيداولصب', 'صب(g)', 'openingbulk', 'اول(g)']);
            const idxOpenP = findCol(['اولمعبا', 'رصيداولمعبا', 'معبا(h)', 'openingpacked', 'اول(h)']);

            const updatedProducts: Product[] = [];
            const allMovements = dbService.getMovements();
            const allSales = dbService.getSales();

            const parseVal = (v: any) => {
                if (v === null || v === undefined || String(v).trim() === '' || String(v).trim() === '-') return 0;
                const n = parseFloat(String(v).replace(/,/g, '').replace(/[^\d.-]/g, ''));
                return isNaN(n) ? 0 : n;
            };

            for (let i = headerIdx + 1; i < allRows.length; i++) {
                const row = allRows[i];
                if (!row || row.length === 0) continue;
                const nameInExcel = String(row[idxName] || "").trim();
                const barcodeInExcel = idxBarcode !== -1 ? String(row[idxBarcode]).trim() : "";
                const jdeP = idxJdeP !== -1 ? String(row[idxJdeP]).trim() : "";
                const jdeB = idxJdeB !== -1 ? String(row[idxJdeB]).trim() : "";
                
                if (!nameInExcel && !barcodeInExcel && !jdeP) continue;

                // البحث عن صنف موجود
                let prod = products.find(p => {
                    if (barcodeInExcel && p.barcode === barcodeInExcel) return true;
                    if (jdeP && p.jdeCodePacked === jdeP) return true;
                    if (jdeB && p.jdeCodeBulk === jdeB) return true;
                    return nameInExcel && ultraPurify(p.name) === ultraPurify(nameInExcel);
                });

                const openB = idxOpenB !== -1 ? parseVal(row[idxOpenB]) : (prod ? (prod.initialStockBulk || 0) : 0);
                const openP = idxOpenP !== -1 ? parseVal(row[idxOpenP]) : (prod ? (prod.initialStockPacked || 0) : 0);

                if (prod) {
                    // تحديث صنف موجود - نضمن عدم وجود undefined
                    const updated: Product = { 
                        ...prod, 
                        jdeCodePacked: jdeP || prod.jdeCodePacked || "", 
                        jdeCodeBulk: jdeB || prod.jdeCodeBulk || "", 
                        initialStockBulk: openB, 
                        initialStockPacked: openP 
                    };
                    
                    const itemMoves = allMovements.filter(m => m.items.some(it => it.productId === prod.id));
                    let netMoves = 0;
                    itemMoves.forEach(m => {
                        const it = m.items.find(item => item.productId === prod.id);
                        if (it) {
                            const factor = (m.type === 'in' || m.type === 'return' || (m.type === 'adjustment' && !m.reason?.includes('خصم'))) ? 1 : -1;
                            netMoves += (Number(it.quantity) * factor);
                        }
                    });
                    let netSales = 0;
                    allSales.forEach(s => {
                        const it = s.items.find(item => item.id === prod.id);
                        if (it) netSales += Number(it.quantity);
                    });
                    updated.stock = (openB + openP) + netMoves - netSales;
                    updatedProducts.push(updated);
                } else {
                    // إضافة صنف جديد تماماً
                    const newId = barcodeInExcel || `ID-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
                    const newProd: Product = {
                        id: newId,
                        name: nameInExcel,
                        barcode: barcodeInExcel || newId,
                        jdeCodePacked: jdeP,
                        jdeCodeBulk: jdeB,
                        initialStockBulk: openB,
                        initialStockPacked: openP,
                        stock: openB + openP,
                        warehouse: 'finished',
                        category: activeCategory, 
                        price: 0,
                        cost: 0,
                        unit: 'طن'
                    };
                    updatedProducts.push(newProd);
                }
            }

            if (updatedProducts.length > 0) {
                await dbService.saveProducts(updatedProducts);
                refreshProducts();
                addNotification(`نجاح: تم معالجة ${updatedProducts.length} صنف بنجاح`, 'success');
            } else {
                alert('لم يتم العثور على بيانات صالحة للاستيراد في الملف.');
            }
        } catch (err: any) { 
            console.error("Import process error:", err);
            alert('خطأ تقني في معالجة الملف: ' + err.message); 
        }
        if (e.target) e.target.value = '';
    };
    reader.readAsArrayBuffer(file);
  };

  const saveLinkageUpdates = (itemId: string, updates: any) => {
      const nextLinkages = { ...linkages, [itemId]: { ...linkages[itemId], ...updates } };
      setLinkages(nextLinkages);
      dbService.saveLinkages(activeCategory, nextLinkages);
  };

  const handleSackWeightUpdate = (productId: string, value: string) => {
      const prod = products.find(p => p.id === productId);
      if (!prod) return;
      const weight = parseFloat(value);
      if (isNaN(weight)) return;
      const updatedProduct = { ...prod, sackWeight: weight };
      dbService.saveProduct(updatedProduct);
      refreshProducts();
  };

  return (
    <div className="space-y-4 animate-fade-in font-cairo" dir="rtl">
        {showPrintModal && <PrintSettingsModal isOpen={showPrintModal} onClose={() => setShowPrintModal(false)} context={PRINT_CONTEXT} />}
        
        <div className="bg-white/80 backdrop-blur-md p-3 rounded-2xl border border-white shadow-lg flex flex-wrap items-center justify-between gap-3 no-print">
            <div className="flex items-center gap-2">
                <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner">
                    <button onClick={() => setActiveCategory('أعلاف')} className={`px-4 py-1.5 rounded-lg text-[11px] font-black transition-all ${activeCategory === 'أعلاف' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-white'}`}>الأعلاف</button>
                    <button onClick={() => setActiveCategory('بيوتولوجى')} className={`px-4 py-1.5 rounded-lg text-[11px] font-black transition-all ${activeCategory === 'بيوتولوجى' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-500 hover:bg-white'}`}>بيوتولوجى</button>
                </div>
                
                <div className="flex items-center gap-1.5 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100 shadow-sm">
                    <Calendar size={14} className="text-indigo-600" />
                    <div className="flex items-center gap-1.5">
                        <input type="date" value={dateFilter.start} onChange={e => setDateFilter({...dateFilter, start: e.target.value})} className="bg-transparent border-none outline-none font-black text-[10px] text-indigo-900" style={forceEnNumsStyle}/>
                        <span className="text-indigo-300 font-bold">»</span>
                        <input type="date" value={dateFilter.end} onChange={e => setDateFilter({...dateFilter, end: e.target.value})} className="bg-transparent border-none outline-none font-black text-[10px] text-indigo-900" style={forceEnNumsStyle}/>
                    </div>
                </div>

                <GlassButton onClick={() => setHideZeroRows(!hideZeroRows)} className="px-4 h-9 border-slate-200">
                    {hideZeroRows ? <EyeOff size={16} className="text-orange-500" /> : <Eye size={16} className="text-blue-500" />}
                    <span className="text-[10px] font-black">{hideZeroRows ? 'إظهار الصفري' : 'إخفاء الصفري'}</span>
                </GlassButton>
            </div>

            <div className="flex items-center gap-3 flex-1 max-w-2xl">
                <div className="relative flex-1 group">
                    <input className="w-full pr-10 pl-4 py-2.5 border-2 border-slate-50 rounded-2xl text-sm font-bold bg-slate-50 shadow-inner outline-none focus:border-indigo-500" placeholder="بحث بالأرصدة..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    <Search className="absolute right-3.5 top-3.5 text-slate-300" size={16} />
                </div>
                <div className="flex gap-1.5">
                    <button onClick={() => setIsManualAddOpen(true)} className="p-2.5 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100 shadow-sm hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-1.5" title="إضافة صنف يدوي">
                        <PackagePlus size={18} />
                        <span className="text-[10px] font-black">إضافة صنف</span>
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="p-2.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100 shadow-sm hover:bg-emerald-600 hover:text-white transition-all" title="استيراد"><FileDown size={18} /></button>
                    <button onClick={handleExport} className="p-2.5 bg-blue-50 text-blue-700 rounded-lg border border-blue-100 shadow-sm hover:bg-blue-600 hover:text-white transition-all" title="تصدير Excel"><FileSpreadsheet size={18} /></button>
                    <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls" onChange={handleImport} />
                    <button onClick={() => setShowPrintModal(true)} className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-indigo-600 transition-all shadow-sm"><Settings size={18}/></button>
                    <button onClick={() => printService.printWindow(tableRef.current?.parentElement?.innerHTML || '')} className="p-2.5 bg-[#1e293b] text-white rounded-lg shadow-md hover:bg-black transition-all"><Printer size={18}/></button>
                </div>
            </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl shadow-premium border-2 border-slate-800 bg-white">
            <div className="overflow-auto max-h-[70vh] origin-top-right" style={{ zoom: pageScale / 100 }}>
                <table className="w-full border-collapse min-w-[4800px]" ref={tableRef}>
                    <thead className="sticky top-0 z-40 bg-[#0f172a] text-yellow-400 h-14 shadow-lg border-b border-slate-700">
                        <tr>
                            <th className="p-2 border border-slate-700 text-[9px] font-black uppercase">م</th>
                            <th className="p-2 border border-slate-700 w-12 no-print"><Palette size={14} className="mx-auto"/></th>
                            <th className="p-2 border border-slate-700 text-[10px]">معبأ JDE</th>
                            <th className="p-2 border border-slate-700 text-[10px]">صب JDE</th>
                            <th className="p-2 border border-slate-700 text-[10px]">كود ثانوي</th>
                            <th className="p-2 border border-slate-700 text-right pr-4 min-w-[250px] text-[10px]">اسم الصنف</th>
                            <th className="p-2 border border-slate-700 text-[10px]">الوحدة</th>
                            <th className="p-2 border border-slate-700 bg-yellow-900/20 text-yellow-100">أول صب (G)</th>
                            <th className="p-2 border border-slate-700 bg-yellow-900/40 text-yellow-100">أول معبأ (H)</th>
                            <th className="p-2 border border-slate-700 text-blue-300">الإنتاج (I)</th>
                            <th className="p-2 border border-slate-700 text-emerald-300">وارد معبأ (J)</th>
                            <th className="p-2 border border-slate-700 text-[10px]">تسوية(+) م</th>
                            <th className="p-2 border border-slate-700 text-[10px]">تسوية(+) ص</th>
                            <th className="p-2 border border-slate-700 text-[10px]">مرتجعات م</th>
                            <th className="p-2 border border-slate-700 text-[10px]">مرتجعات ص</th>
                            <th className="p-2 border border-slate-700 text-[10px]">تحويل م</th>
                            <th className="p-2 border border-slate-700 text-[10px]">تحويل ص</th>
                            <th className="p-2 border border-slate-700 text-[10px]">مزارع م</th>
                            <th className="p-2 border border-slate-700 text-[10px]">مزارع ص</th>
                            <th className="p-2 border border-slate-700 text-[10px]">عملاء م</th>
                            <th className="p-2 border border-slate-700 text-[10px]">عملاء ص</th>
                            <th className="p-2 border border-slate-700 text-[10px]">منافذ</th>
                            <th className="p-2 border border-slate-700 text-[10px]">غير م</th>
                            <th className="p-2 border border-slate-700 text-[10px]">غير ص</th>
                            <th className="p-2 border border-slate-700 text-[10px]">عجز م</th>
                            <th className="p-2 border border-slate-700 text-[10px]">عجز ص</th>
                            <th className="p-2 border border-slate-700 bg-indigo-800 text-white font-black text-sm">الرصيد النهائي (Z)</th>
                            <th className="p-2 border border-slate-700 bg-blue-800 text-white font-black text-sm">رصيد المعبأ (AA)</th>
                            <th className="p-2 border border-slate-700 bg-slate-800 text-slate-300 text-[10px]">جرد (AB)</th>
                            <th className="p-2 border border-slate-700 text-[10px]">الشكارة (AC)</th>
                            <th className="p-2 border border-slate-700 bg-rose-900 text-white font-black text-[10px]">الفرق</th>
                            <th className="p-2 border border-slate-700 bg-red-900/20 w-12 text-[10px]">سلة</th>
                        </tr>
                    </thead>
                    <tbody className="text-slate-700 font-bold text-[11px]">
                        {reportData.map((row, idx) => (
                            <tr key={row.product.id} className={`border-b border-black h-10 hover:brightness-95 transition-all`} style={{ backgroundColor: row.product.customFields?.rowColor || (idx % 2 === 0 ? 'white' : '#f8fafc') }}>
                                <td className="p-1 border" style={forceEnNumsStyle}>{idx + 1}</td>
                                <td className="p-1 border no-print">
                                    <div className="flex items-center gap-1 justify-center">
                                        {['#ffff00', '#90ee90', '#ffcccb', '#add8e6', ''].map(c => (
                                            <button key={c} onClick={() => handleUpdateColor(row.product.id, c)} className={`w-2.5 h-2.5 rounded-full border border-black/20 ${!c ? 'bg-white flex items-center justify-center' : ''}`} style={{ backgroundColor: c }}>{!c && <X size={6} className="text-slate-400"/>}</button>
                                        ))}
                                    </div>
                                </td>
                                <td className="p-1 border font-mono text-[9px] text-slate-400" style={forceEnNumsStyle}>{row.product.jdeCodePacked || '-'}</td>
                                <td className="p-1 border font-mono text-[9px] text-slate-400" style={forceEnNumsStyle}>{row.product.jdeCodeBulk || '-'}</td>
                                <td className="p-1 border font-mono text-[9px] text-indigo-600" style={forceEnNumsStyle}>{row.product.barcode}</td>
                                <td className="p-1 border text-right pr-3 font-black text-slate-900 text-[11px]">{row.product.name}</td>
                                <td className="p-1 border text-[10px] text-slate-400">{row.product.unit || 'طن'}</td>
                                <td className="p-1 border bg-yellow-50/10" style={forceEnNumsStyle}>{formatVal(row.G)}</td>
                                <td className="p-1 border bg-yellow-50/20" style={forceEnNumsStyle}>{formatVal(row.H)}</td>
                                <td 
                                    className={`p-1 border cursor-pointer hover:bg-blue-100 ${row.isChild ? 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200 shadow-inner' : (row.isParent ? 'bg-orange-50' : 'text-blue-700')}`} 
                                    style={forceEnNumsStyle} 
                                    onClick={() => !isViewOnly && setLinkingModalItem({...row, formulaType: 'prod'})}
                                >
                                    <div className="flex items-center justify-center gap-0.5">
                                        {formatVal(row.I)}
                                        {row.isChild && <LinkIcon size={10} className="text-blue-400 animate-pulse" />}
                                    </div>
                                </td>
                                <td className="p-1 border text-emerald-700" style={forceEnNumsStyle}>{formatVal(row.J)}</td>
                                <td className="p-1 border" style={forceEnNumsStyle}>{formatVal(row.K)}</td>
                                <td className="p-1 border" style={forceEnNumsStyle}>{formatVal(row.L)}</td>
                                <td className="p-1 border text-rose-600" style={forceEnNumsStyle}>{formatVal(row.M)}</td>
                                <td className="p-1 border text-rose-600" style={forceEnNumsStyle}>{formatVal(row.N)}</td>
                                <td className="p-1 border" style={forceEnNumsStyle}>{formatVal(row.O)}</td>
                                <td className="p-1 border" style={forceEnNumsStyle}>{formatVal(row.P)}</td>
                                <td className="p-1 border text-blue-600" style={forceEnNumsStyle}>{formatVal(row.Q)}</td>
                                <td className="p-1 border text-blue-600" style={forceEnNumsStyle}>{formatVal(row.R)}</td>
                                <td className="p-1 border text-indigo-600" style={forceEnNumsStyle}>{formatVal(row.S)}</td>
                                <td className="p-1 border text-indigo-600" style={forceEnNumsStyle}>{formatVal(row.T)}</td>
                                <td className="p-1 border text-purple-700" style={forceEnNumsStyle}>{formatVal(row.U)}</td>
                                <td className="p-1 border text-slate-400" style={forceEnNumsStyle}>{formatVal(row.V)}</td>
                                <td className="p-1 border text-slate-400" style={forceEnNumsStyle}>{formatVal(row.W)}</td>
                                <td className="p-1 border text-red-600" style={forceEnNumsStyle}>{formatVal(row.X)}</td>
                                <td className="p-1 border text-red-600" style={forceEnNumsStyle}>{formatVal(row.Y)}</td>
                                <td 
                                    className="p-1 border bg-indigo-900 text-white font-black text-[13px] shadow-inner cursor-pointer hover:bg-indigo-700" 
                                    style={forceEnNumsStyle} 
                                    onClick={() => !isViewOnly && setLinkingModalItem({...row, formulaType: 'total'})}
                                >
                                    {formatVal(row.Z)}
                                </td>
                                <td 
                                    className="p-1 border bg-blue-600 text-white font-black text-[13px] cursor-pointer shadow-inner hover:bg-blue-400" 
                                    style={forceEnNumsStyle} 
                                    onClick={() => !isViewOnly && setLinkingModalItem({...row, formulaType: 'packed'})}
                                >
                                    {formatVal(row.AA)}
                                </td>
                                <td className="p-1 border bg-slate-50 text-slate-400" style={forceEnNumsStyle}>{formatVal(row.AB)}</td>
                                <td className="p-1 border bg-slate-50/10" style={forceEnNumsStyle}>
                                    <input type="number" step="0.1" defaultValue={row.AC} onBlur={(e) => handleSackWeightUpdate(row.product.id, e.target.value)} className="w-full bg-transparent text-center font-black text-slate-700 outline-none text-[11px]" style={forceEnNumsStyle} disabled={isViewOnly}/>
                                </td>
                                <td className={`p-1 border font-black text-[12px] ${Math.abs(row.AF) > 0.001 ? 'bg-rose-50/50 text-rose-600' : 'text-emerald-600'}`} style={forceEnNumsStyle}>{formatVal(row.AF)}</td>
                                <td className="p-1 border text-center"><button onClick={() => setDeleteId(row.product.id)} className="text-slate-200 hover:text-rose-600 transition-colors p-1"><Trash2 size={14} /></button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        <AnimatePresence>
            {linkingModalItem && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-cairo">
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200">
                        <div className="p-6 border-b flex justify-between items-center bg-white relative">
                            <button onClick={() => setLinkingModalItem(null)} className="p-2 hover:bg-slate-50 text-slate-300 rounded-full transition-all"><X size={24}/></button>
                            <div className="flex items-center gap-3">
                                <div className="text-right">
                                    <h3 className="text-xl font-black text-slate-800">برمجة دالة العمود</h3>
                                    <p className="text-[10px] text-slate-400 font-bold">صنف: {linkingModalItem.product.name}</p>
                                </div>
                                <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-100"><FunctionSquare size={24}/></div>
                            </div>
                        </div>

                        <div className="p-6 space-y-6 bg-slate-50/30">
                            {linkingModalItem.formulaType === 'prod' && (
                                <div className="bg-white p-5 rounded-3xl border border-blue-100 shadow-sm">
                                    <div className="flex items-center gap-2 mb-4">
                                        <GitMerge size={16} className="text-blue-600"/>
                                        <h4 className="font-black text-blue-900 text-[12px]">الربط الهيكلي (Parent/Child)</h4>
                                    </div>
                                    <select 
                                        className="w-full p-3.5 rounded-2xl border-2 border-slate-100 bg-white font-black text-xs outline-none"
                                        value={linkages[linkingModalItem.product.id]?.parentId || ""}
                                        onChange={e => saveLinkageUpdates(linkingModalItem.product.id, { parentId: e.target.value })}
                                    >
                                        <option value="">صنف أم (Independent)</option>
                                        {products.filter(p => p.warehouse === 'finished' && p.id !== linkingModalItem.product.id).map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="bg-[#0f172a] p-6 rounded-[2rem] shadow-2xl">
                                <div className="flex items-center justify-between gap-4">
                                    <button onClick={() => {
                                        const currentKey = linkingModalItem.formulaType === 'prod' ? 'prodFormula' : linkingModalItem.formulaType === 'packed' ? 'packedFormula' : 'totalFormula';
                                        saveLinkageUpdates(linkingModalItem.product.id, { [currentKey]: "" });
                                    }} className="bg-white/10 hover:bg-white/20 p-2.5 rounded-xl text-white"><RotateCcw size={20}/></button>
                                    <div className="flex-1 text-center">
                                        <span className="font-mono font-black text-2xl text-yellow-400 tracking-wider">
                                            = {linkages[linkingModalItem.product.id]?.[linkingModalItem.formulaType === 'prod' ? 'prodFormula' : linkingModalItem.formulaType === 'packed' ? 'packedFormula' : 'totalFormula'] || "0"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                                {FORMULA_VARIABLES.map(v => (
                                    <button key={v.key} onClick={() => {
                                        const currentKey = linkingModalItem.formulaType === 'prod' ? 'prodFormula' : linkingModalItem.formulaType === 'packed' ? 'packedFormula' : 'totalFormula';
                                        const currentVal = linkages[linkingModalItem.product.id]?.[currentKey] || "";
                                        saveLinkageUpdates(linkingModalItem.product.id, { [currentKey]: currentVal + v.key + " " });
                                    }} className={`p-2 rounded-xl border transition-all hover:scale-105 active:scale-95 flex flex-col items-center gap-0.5 ${v.color}`}>
                                        <span className="text-[12px] font-black">{v.key}</span>
                                        <span className="opacity-70 text-[8px] font-bold truncate w-full text-center">{v.label}</span>
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                {['(', ')', '+', '-', '*', '/'].map(op => (
                                    <button key={op} onClick={() => {
                                        const currentKey = linkingModalItem.formulaType === 'prod' ? 'prodFormula' : linkingModalItem.formulaType === 'packed' ? 'packedFormula' : 'totalFormula';
                                        const currentVal = linkages[linkingModalItem.product.id]?.[currentKey] || "";
                                        saveLinkageUpdates(linkingModalItem.product.id, { [currentKey]: currentVal + op + " " });
                                    }} className="flex-1 py-4 bg-white border border-slate-200 rounded-xl font-black text-xl text-slate-700 shadow-sm hover:bg-slate-50 transition-all">{op}</button>
                                ))}
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 border-t">
                            <button onClick={() => setLinkingModalItem(null)} className="w-full py-5 bg-[#4361ee] text-white font-black rounded-3xl shadow-xl hover:bg-[#304ed0] transition-all flex items-center justify-center gap-3 border-b-8 border-[#2e3b9e] active:scale-[0.98]">
                                <span>تأكيد وحفظ الإعدادات</span>
                                <Check size={24}/>
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>

        <AnimatePresence>
            {isManualAddOpen && (
                <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 font-cairo" dir="rtl">
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden">
                        <div className="bg-indigo-600 p-6 text-white flex justify-between items-center shadow-lg">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-white/20 rounded-2xl"><PackagePlus size={28}/></div>
                                <div>
                                    <h3 className="text-xl font-black">إضافة صنف جديد يدوياً</h3>
                                    <p className="text-[10px] text-indigo-100 font-bold uppercase tracking-widest">قسم المنتج التام - {activeCategory}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsManualAddOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition-all"><X size={24}/></button>
                        </div>

                        <div className="p-8 space-y-5 bg-slate-50/30">
                            <GlassInput label="اسم الصنف بالكامل" value={manualForm.name} onChange={e => setManualForm({...manualForm, name: e.target.value})} placeholder="مثال: علف بادئ سوبر 23%..." />
                            
                            <div className="grid grid-cols-2 gap-4">
                                <GlassInput label="الكود الثانوي (Barcode)" value={manualForm.barcode} onChange={e => setManualForm({...manualForm, barcode: e.target.value})} placeholder="رقم كود الصنف..." />
                                <div className="flex flex-col gap-1 w-full text-right">
                                    <label className="text-gray-600 text-[11px] font-bold ml-1">وزن الشكارة</label>
                                    <select className="bg-white rounded-lg px-3 py-2 border-2 border-slate-100 outline-none focus:border-blue-400 font-black text-sm" value={manualForm.sackWeight} onChange={e => setManualForm({...manualForm, sackWeight: Number(e.target.value)})}>
                                        <option value={50}>50 كجم</option>
                                        <option value={25}>25 كجم</option>
                                        <option value={10}>10 كجم</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 border-t pt-4">
                                <GlassInput label="كود JDE (معبأ)" value={manualForm.jdeCodePacked} onChange={e => setManualForm({...manualForm, jdeCodePacked: e.target.value})} />
                                <GlassInput label="كود JDE (صب)" value={manualForm.jdeCodeBulk} onChange={e => setManualForm({...manualForm, jdeCodeBulk: e.target.value})} />
                            </div>

                            <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 shadow-inner">
                                <h4 className="text-xs font-black text-indigo-900 mb-4 flex items-center gap-2"><Sigma size={14}/> أرصدة البداية (رصيد افتتاحي)</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-black text-slate-400 pr-1">رصيد أول (صب)</label>
                                        <input type="number" step="any" className="p-3 rounded-xl border-2 border-white bg-white shadow-sm font-black text-center text-indigo-700 outline-none" value={manualForm.initialStockBulk} onChange={e => setManualForm({...manualForm, initialStockBulk: Number(e.target.value)})} style={forceEnNumsStyle}/>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-black text-slate-400 pr-1">رصيد أول (معبأ)</label>
                                        <input type="number" step="any" className="p-3 rounded-xl border-2 border-white bg-white shadow-sm font-black text-center text-indigo-700 outline-none" value={manualForm.initialStockPacked} onChange={e => setManualForm({...manualForm, initialStockPacked: Number(e.target.value)})} style={forceEnNumsStyle}/>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 border-t flex gap-4">
                            <button onClick={() => setIsManualAddOpen(false)} className="flex-1 py-4 bg-white text-slate-400 font-black rounded-2xl border hover:bg-slate-50 transition-all">إلغاء</button>
                            <button onClick={handleSaveManualAdd} className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 border-b-8 border-indigo-900 active:scale-95">
                                <Save size={24}/> حفظ وترحيل الصنف
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>

        <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => { if (deleteId) { deleteProduct(deleteId); refreshProducts(); setDeleteId(null); } }} title="حذف صنف" message="هل تريد حذف الصنف نهائياً؟" confirmText="حذف" cancelText="تراجع" />
    </div>
  );
};
