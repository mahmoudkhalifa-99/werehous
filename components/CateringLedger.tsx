
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { dbService } from '../services/storage';
import { Search, Edit2, Layout, Columns, Rows, Package, AlertTriangle, FileDown, Check, X, RefreshCw, Undo2, PlusCircle, MinusCircle } from 'lucide-react';
import { TableToolbar } from './TableToolbar';
import { ReportActionsBar } from './ReportActionsBar';
import { printService } from '../services/printing';
import { PrintSettingsModal } from './PrintSettingsModal';
import { Product } from '../types';
import * as XLSX from 'xlsx';

const DEFAULT_STYLES = {
    fontFamily: 'Calibri, sans-serif',
    fontSize: 14,
    isBold: true,
    isItalic: false,
    textAlign: 'center' as 'right' | 'center' | 'left',
    verticalAlign: 'middle' as 'top' | 'middle' | 'bottom',
    decimals: 2,
    rowHeight: 45,
    columnWidth: 130
};

const forceEnNumsStyle = {
    fontFamily: 'Inter, sans-serif',
    fontVariantNumeric: 'lining-nums',
    direction: 'ltr' as const
};

export const CateringLedger: React.FC = () => {
    const { settings, refreshProducts, user, products: allProducts } = useApp();
    const [searchTerm, setSearchTerm] = useState('');
    const [hideZeroRows, setHideZeroRows] = useState(false);
    const [showPrintModal, setShowPrintModal] = useState(false);
    const tableRef = useRef<HTMLTableElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isAdmin = user?.role === 'admin';

    const [frozenCols, setFrozenCols] = useState(3);
    const [frozenRows, setFrozenRows] = useState(1);

    const [editingLimit, setEditingLimit] = useState<{ productId: string, field: 'minStock' | 'maxStock' | 'reorderPoint' | 'opening', value: string } | null>(null);

    const [columnWidths, setColumnWidths] = useState<Record<number, number>>(() => {
        const saved = localStorage.getItem('glasspos_catering_ledger_widths');
        return saved ? JSON.parse(saved) : { 
            0: 60, 1: 120, 2: 300, 3: 100, 4: 120, 5: 100, 6: 100, 7: 100, 8: 100, 9: 100, 10: 100, 11: 100, 12: 120, 13: 150, 14: 100, 15: 100 
        };
    });

    const [tableStyles, setTableStyles] = useState(() => {
        const saved = localStorage.getItem('glasspos_catering_ledger_styles');
        return saved ? { ...DEFAULT_STYLES, ...JSON.parse(saved) } : DEFAULT_STYLES;
    });

    useEffect(() => {
        localStorage.setItem('glasspos_catering_ledger_widths', JSON.stringify(columnWidths));
    }, [columnWidths]);

    useEffect(() => {
        localStorage.setItem('glasspos_catering_ledger_styles', JSON.stringify(tableStyles));
    }, [tableStyles]);

    const resizingCol = useRef<{ index: number, startX: number, startWidth: number } | null>(null);

    const onMouseMoveResizeCol = useCallback((e: MouseEvent) => {
        const current = resizingCol.current;
        if (!current) return;
        const delta = current.startX - e.pageX; 
        const newWidth = Math.max(50, current.startWidth + delta);
        setColumnWidths(prev => ({ ...prev, [current.index]: newWidth }));
    }, []);

    const onMouseUpResize = useCallback(() => {
        resizingCol.current = null;
        document.removeEventListener('mousemove', onMouseMoveResizeCol);
        document.removeEventListener('mouseup', onMouseUpResize);
        document.body.style.cursor = 'default';
    }, [onMouseMoveResizeCol]);

    const onMouseDownResizeCol = (index: number, e: React.MouseEvent) => {
        e.preventDefault();
        const th = (e.target as HTMLElement).closest('th');
        if (!th) return;
        resizingCol.current = { index, startX: e.pageX, startWidth: th.offsetWidth };
        document.addEventListener('mousemove', onMouseMoveResizeCol);
        document.addEventListener('mouseup', onMouseUpResize);
        document.body.style.cursor = 'col-resize';
    };

    const cateringItems = allProducts.filter(p => p.warehouse === 'catering');
    const movements = dbService.getMovements().filter(m => m.warehouse === 'catering');

    const ledgerData = useMemo(() => {
        let data = cateringItems.map((p, idx) => {
            const itemMovements = movements.filter(m => m.items.some(i => i.productId === p.id));
            const stats = { in: 0, returns: 0, adjIn: 0, transferIn: 0, out: 0, transferOut: 0, adjOut: 0 };

            itemMovements.forEach(m => {
                const item = m.items.find(i => i.productId === p.id);
                if (!item) return;
                const qty = Number(item.quantity);
                const reason = (m.reason || '').toLowerCase();

                if (m.type === 'in') {
                    if (reason.includes('مرتجع')) stats.returns += qty;
                    else if (reason.includes('تحويل')) stats.transferIn += qty;
                    else stats.in += qty;
                } else if (m.type === 'out') {
                    if (reason.includes('تحويل')) stats.transferOut += qty;
                    else stats.out += qty;
                } else if (m.type === 'adjustment') {
                    if (reason.includes('عجز') || reason.includes('خصم')) stats.adjOut += qty;
                    else stats.adjIn += qty;
                } else if (m.type === 'return') {
                    stats.returns += qty;
                }
            });

            // رصيد أول هنا قيمة ثابتة تمثل "جرد البداية" ولا تتغير بحساب الحركات
            const fixedOpeningBalance = p.initialStockBulk || 0;

            return {
                id: p.id, seq: idx + 1, barcode: p.barcode, name: p.name, unit: p.unit || 'عدد', 
                opening: fixedOpeningBalance, 
                inbound: stats.in, 
                returns: stats.returns,
                adjIn: stats.adjIn,
                transferIn: stats.transferIn,
                outbound: stats.out, 
                transferOut: stats.transferOut,
                adjOut: stats.adjOut,
                balance: p.stock, 
                warehouseName: p.customFields?.warehouseName || 'مخزن الإعاشة الرئيسي',
                min: p.minStock || 0, reorder: p.reorderPoint || 0, max: p.maxStock || 0,
                stand: p.customFields?.stand || '-', tile: p.customFields?.tile || '-'
            };
        });

        if (hideZeroRows) {
            data = data.filter(r => Math.abs(r.balance) > 0.001 || Math.abs(r.opening) > 0.001);
        }

        return data.filter(row => row.name.includes(searchTerm) || row.barcode.includes(searchTerm));
    }, [cateringItems, movements, searchTerm, hideZeroRows]);

    const handleSaveEdit = () => {
        if (!editingLimit) return;
        const prod = cateringItems.find(p => p.id === editingLimit.productId);
        if (prod) {
            const newValue = Number(editingLimit.value);
            const updated = { ...prod };
            if (editingLimit.field === 'opening') {
                // تحديث رصيد أول المدة الثابت
                updated.initialStockBulk = newValue;
                // إعادة حساب الرصيد الحالي بناءً على القيمة الثابتة الجديدة + كافة الحركات التاريخية
                const row = ledgerData.find(r => r.id === prod.id);
                if (row) {
                    const netIn = row.inbound + row.returns + row.adjIn + row.transferIn;
                    const netOut = row.outbound + row.transferOut + row.adjOut;
                    updated.stock = newValue + (netIn - netOut);
                }
            } else {
                (updated as any)[editingLimit.field] = newValue;
            }
            dbService.saveProduct(updated);
            refreshProducts();
        }
        setEditingLimit(null);
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
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

                const currentProducts = [...allProducts];
                let updated = 0; let added = 0;

                jsonData.forEach((row: any, index: number) => {
                    const barcode = String(row['كود الصنف'] || row.Barcode || row['الكود'] || row['كود دريف'] || '').trim();
                    const name = String(row['اسم الصنف'] || row.Name || row['الاسم'] || '').trim();
                    if (!barcode && !name) return;

                    const openingFromExcel = Number(row['رصيد أول المدة'] || row['رصيد أول'] || row.Opening || 0);
                    const unit = String(row['الوحدة'] || row.Unit || 'عدد');

                    const existingIdx = currentProducts.findIndex(p => 
                        (barcode && p.barcode === barcode) || (name && p.name === name)
                    );

                    if (existingIdx >= 0) {
                        const existingProd = currentProducts[existingIdx];
                        // حفظ رصيد أول المدة كقيمة ثابتة
                        existingProd.initialStockBulk = openingFromExcel;
                        
                        // تحديث الرصيد الحالي (الرصيد الثابت الجديد + الحركات السابقة المسجلة)
                        const itemMoves = movements.filter(m => m.items.some(i => i.productId === existingProd.id));
                        let netChange = 0;
                        itemMoves.forEach(m => {
                            const item = m.items.find(i => i.productId === existingProd.id);
                            if (item) {
                                const factor = (m.type === 'in' || m.type === 'transfer' || m.type === 'return') ? 1 : -1;
                                netChange += (Number(item.quantity) * factor);
                            }
                        });
                        existingProd.stock = openingFromExcel + netChange;
                        if (unit) existingProd.unit = unit;
                        updated++;
                    } else {
                        currentProducts.push({
                            id: `CAT-IMP-${Date.now()}-${index}`,
                            name: name || `صنف إعاشة ${barcode}`,
                            barcode: barcode || `ID-${Date.now()}-${index}`,
                            stock: openingFromExcel,
                            initialStockBulk: openingFromExcel, // الرصيد الثابت
                            warehouse: 'catering',
                            unit: unit,
                            category: 'إعاشة',
                            cost: 0, price: 0
                        });
                        added++;
                    }
                });

                dbService.saveProducts(currentProducts);
                refreshProducts();
                alert(`تم استيراد بيانات الإعاشة: تحديث ${updated} صنف | إضافة ${added} صنف جديد`);
            } catch (err) { alert('خطأ في معالجة الملف'); }
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsArrayBuffer(file);
    };

    const getCellStyle = (isNumeric: boolean = false, colIdx?: number): React.CSSProperties => ({
        fontFamily: isNumeric ? 'Inter, sans-serif' : tableStyles.fontFamily,
        fontSize: `${tableStyles.fontSize}px`,
        fontWeight: tableStyles.isBold ? 'bold' : 'normal',
        textAlign: tableStyles.textAlign,
        verticalAlign: tableStyles.verticalAlign,
        width: colIdx !== undefined && columnWidths[colIdx] ? `${columnWidths[colIdx]}px` : `${tableStyles.columnWidth}px`,
        minWidth: colIdx !== undefined && columnWidths[colIdx] ? `${columnWidths[colIdx]}px` : `${tableStyles.columnWidth}px`,
        maxWidth: colIdx !== undefined && columnWidths[colIdx] ? `${columnWidths[colIdx]}px` : `${tableStyles.columnWidth}px`,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        ...(isNumeric ? forceEnNumsStyle : {})
    });

    const formatVal = (n: number) => n === 0 ? '-' : n.toLocaleString('en-US', { minimumFractionDigits: tableStyles.decimals });

    const headers = [
        "م", "كود الصنف", "اسم الصنف", "الوحدة", "رصيد أول جرد (ثابت)", 
        "الوارد (+)", "المرتجع (+)", "تسوية (+)", "تحويل (+)", 
        "المنصرف (-)", "تحويل (-)", "تسوية (-)", 
        "الرصيد الحالي", "اسم المخزن", "الحد الأدنى", "حالة الرصيد"
    ];

    const getStickyStyle = (colIdx: number, rowIndex: number, isHeader: boolean) => {
        const isStickyCol = colIdx < frozenCols;
        const isStickyRow = rowIndex < frozenRows;
        if (!isStickyCol && !isStickyRow) return {};
        let offsetRight = 0;
        for (let i = 0; i < colIdx; i++) offsetRight += columnWidths[i] || tableStyles.columnWidth;
        return {
            position: 'sticky' as const,
            right: isStickyCol ? `${offsetRight}px` : undefined,
            top: isStickyRow ? 0 : undefined,
            zIndex: (isStickyCol && isStickyRow) ? 60 : (isStickyRow ? 50 : 40),
            backgroundColor: isHeader ? '#065f46' : (rowIndex % 2 === 0 ? '#ffffff' : '#f0fdf4'),
            borderLeft: isStickyCol ? '1px solid #d1fae5' : undefined,
            boxShadow: isStickyCol ? '2px 0 5px -2px rgba(0,0,0,0.1)' : undefined
        };
    };

    return (
        <div className="space-y-4 animate-fade-in font-cairo" dir="rtl">
            {showPrintModal && <PrintSettingsModal isOpen={showPrintModal} onClose={() => setShowPrintModal(false)} context="catering_ledger" />}
            
            <TableToolbar styles={tableStyles} setStyles={setTableStyles} onReset={() => { setTableStyles(DEFAULT_STYLES); setFrozenCols(3); setFrozenRows(1); }} />

            <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-2 no-print">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <ReportActionsBar 
                        onPrint={() => printService.printWindow(tableRef.current?.parentElement?.innerHTML || '')}
                        onExport={() => {}}
                        onImport={() => fileInputRef.current?.click()}
                        onSettings={() => setShowPrintModal(true)}
                        hideZeroRows={hideZeroRows}
                        setHideZeroRows={setHideZeroRows}
                        hideImport={false}
                    />
                    <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls" onChange={handleImport} />
                    
                    <div className="flex items-center gap-3 bg-emerald-50 p-2 rounded-xl border border-emerald-100 shadow-inner">
                        <Layout size={16} className="text-emerald-600"/>
                        <span className="text-[10px] font-black uppercase">تثبيت النوافذ:</span>
                        <div className="flex items-center gap-2 border-r pr-3">
                            <Columns size={14}/>
                            <span className="text-xs font-bold">أعمدة:</span>
                            <div className="flex bg-white border rounded overflow-hidden">
                                <button onClick={() => setFrozenCols(Math.max(0, frozenCols - 1))} className="px-2 hover:bg-gray-100">-</button>
                                <span className="px-2 font-bold text-emerald-800">{frozenCols}</span>
                                <button onClick={() => setFrozenCols(Math.min(5, frozenCols + 1))} className="px-2 hover:bg-gray-100">+</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="relative w-full">
                    <input className="w-full pr-10 pl-4 py-2 border border-emerald-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-400 font-bold bg-emerald-50/20 shadow-inner" placeholder="بحث سريع في أرصدة الإعاشة..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    <Search className="absolute right-3 top-2.5 text-emerald-300" size={18}/>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-premium border border-emerald-100 overflow-hidden">
                <div className="overflow-auto max-h-[65vh] relative">
                    <table className="w-full border-collapse min-w-[3000px]" ref={tableRef}>
                        <thead>
                            <tr className="bg-emerald-900 text-white font-bold h-12">
                                {headers.map((h, i) => (
                                    <th 
                                        key={i} 
                                        className="p-2 border border-emerald-800 relative group" 
                                        style={{...getCellStyle(false, i), ...getStickyStyle(i, 0, true)}}
                                    >
                                        {h}
                                        <div onMouseDown={(e) => onMouseDownResizeCol(i, e)} className="absolute top-0 left-0 w-1.5 h-full cursor-col-resize hover:bg-emerald-400/50 transition-colors z-50"/>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {ledgerData.map((row, idx) => (
                                <tr key={row.id} className={`h-11 border-b hover:bg-emerald-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                                    <td className="p-2 border" style={{...getCellStyle(true, 0), ...getStickyStyle(0, idx + 1, false)}}>{row.seq}</td>
                                    <td className="p-2 border font-mono text-xs" style={{...getCellStyle(true, 1), ...getStickyStyle(1, idx + 1, false)}}>{row.barcode}</td>
                                    <td className="p-2 border text-right pr-4 font-black" style={{...getCellStyle(false, 2), ...getStickyStyle(2, idx + 1, false)}}>{row.name}</td>
                                    <td className="p-2 border" style={getCellStyle(false, 3)}>{row.unit}</td>
                                    
                                    <td className={`p-2 border bg-indigo-50/30 font-bold ${isAdmin ? 'cursor-pointer hover:bg-indigo-100' : ''}`} style={getCellStyle(true, 4)} onClick={() => isAdmin && setEditingLimit({productId: row.id, field: 'opening', value: row.opening.toString()})}>
                                        {editingLimit?.productId === row.id && editingLimit.field === 'opening' ? (
                                            <input autoFocus className="w-full text-center border-none bg-transparent" value={editingLimit.value} onChange={e => setEditingLimit({...editingLimit, value: e.target.value})} onBlur={handleSaveEdit} onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}/>
                                        ) : formatVal(row.opening)}
                                    </td>

                                    <td className="p-2 border text-green-700" style={getCellStyle(true, 5)}>{formatVal(row.inbound)}</td>
                                    <td className="p-2 border text-emerald-600" style={getCellStyle(true, 6)}>{formatVal(row.returns)}</td>
                                    <td className="p-2 border text-emerald-700 bg-emerald-50/20" style={getCellStyle(true, 7)}>{formatVal(row.adjIn)}</td>
                                    <td className="p-2 border text-blue-600" style={getCellStyle(true, 8)}>{formatVal(row.transferIn)}</td>
                                    
                                    <td className="p-2 border text-orange-700" style={getCellStyle(true, 9)}>{formatVal(row.outbound)}</td>
                                    <td className="p-2 border text-blue-800" style={getCellStyle(true, 10)}>{formatVal(row.transferOut)}</td>
                                    <td className="p-2 border text-red-600 bg-red-50/20" style={getCellStyle(true, 11)}>{formatVal(row.adjOut)}</td>

                                    <td className="p-2 border bg-blue-50 font-black text-blue-900 shadow-inner" style={getCellStyle(true, 12)}>{formatVal(row.balance)}</td>
                                    
                                    <td className="p-2 border text-xs text-slate-500" style={getCellStyle(false, 13)}>{row.warehouseName}</td>
                                    
                                    <td className="p-2 border cursor-pointer hover:bg-yellow-50" style={getCellStyle(true, 14)} onClick={() => isAdmin && setEditingLimit({productId: row.id, field: 'minStock', value: row.min.toString()})}>
                                        {editingLimit?.productId === row.id && editingLimit.field === 'minStock' ? (
                                            <input autoFocus className="w-full text-center" value={editingLimit.value} onChange={e => setEditingLimit({...editingLimit, value: e.target.value})} onBlur={handleSaveEdit}/>
                                        ) : formatVal(row.min)}
                                    </td>

                                    <td className="p-2 border" style={getCellStyle(false, 15)}>
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black ${row.balance <= row.min ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                            {row.balance <= row.min ? 'منخفض جداً' : 'رصيد آمن'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {editingLimit && <div className="fixed bottom-4 left-4 bg-indigo-600 text-white p-3 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce-in z-[100] font-bold"><Edit2 size={16}/> جاري التعديل... اضغط Enter للحفظ</div>}
        </div>
    );
};
