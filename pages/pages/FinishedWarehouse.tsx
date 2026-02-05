
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { dbService } from '../services/storage';
import { Product, StockMovement, Sale, Purchase, ButtonConfig, PermissionLevel } from '../types';
import { 
    Search, Plus, Save, X, Trash2, Calendar, Hash, Truck, 
    Package, PlusCircle, UserCog, Clock, ClipboardList,
    Download, RefreshCw, Scale, Undo2, Loader, ArrowLeft,
    CheckCircle2, Printer, FileText, ShoppingBag, ArrowRight,
    MinusCircle, LayoutGrid, PackageCheck, ListFilter, Warehouse,
    ShoppingCart, UserPlus, ExternalLink, Calculator, UserCheck,
    History, ClipboardCheck, FileDown, FileUp, ChevronLeft, PackageCheck as FinIcon
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getIcon } from '../utils/icons';
import { DetailedFinishedTable } from '../components/DetailedFinishedTable';
import { PeriodFinishedReport } from '../components/PeriodFinishedReport';
import { DailySalesTable } from '../components/DailySalesTable';
import { GlassCard } from '../components/NeumorphicUI';
import { StockEntryForm, StocktakingForm } from '../components/WarehouseActions';
import { ItemWithdrawalsReport } from '../components/ItemWithdrawalsReport';

export const FinishedWarehouse: React.FC = () => {
  const { t, uiConfig, settings, user, can } = useApp();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeView, setActiveView] = useState('menu');

  useEffect(() => {
    const view = searchParams.get('view');
    if (view) setActiveView(view);
    else setActiveView('menu');
  }, [searchParams]);

  const allowedButtons = useMemo(() => {
    return uiConfig.finished.buttons.filter(btn => {
        if (!btn.isVisible) return false;
        return can('features', btn.id, 'available');
    });
  }, [uiConfig.finished.buttons, user, can]);

  const handleAction = (action: string) => {
    if (action.startsWith('navigate:')) {
      navigate(action.split(':')[1]);
    } else if (action.startsWith('view:')) {
      setSearchParams({ view: action.split(':')[1] });
    }
  };

  const handleBack = () => {
    if (activeView === 'menu') {
      navigate('/');
    } else {
      setSearchParams({});
    }
  };

  const viewTitles: Record<string, string> = {
      'returns': 'إدارة المرتجعات',
      'period_report': 'تقرير الحركة عن مدة',
      'balances': 'أرصدة المنتج التام النهائية',
      'production_receipt': 'استلام إنتاج جديد',
      'settlements': 'تسويات العجز والزيادة',
      'unfinished': 'منتج غير تام / تحت التشغيل',
      'daily_sales': 'سجل المبيعات اليومية',
      'stocktaking': 'جرد البداية (رصيد افتتاحي)',
      'item_withdrawals': 'مسحوبات أصناف التام'
  };

  const currentTitle = viewTitles[activeView] || 'مخزن المنتج التام';

  return (
    <div className="p-4 space-y-4 font-cairo min-h-screen" dir="rtl">
      {/* Premium Header Bar */}
      <div className="bg-white rounded-2xl shadow-premium px-6 py-3 flex items-center justify-between border-b-4 border-cyan-600 animate-fade-in relative overflow-hidden h-20">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-50 rounded-full -mr-12 -mt-12 opacity-40"></div>
          
          <button onClick={handleBack} className="flex items-center gap-2 bg-[#1e293b] hover:bg-black text-white px-5 py-2 rounded-xl font-black shadow-lg transition-all active:scale-95 group relative z-10 border border-slate-700/50 text-xs">
              <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
              <span>{activeView === 'menu' ? t('backToMain') : 'الرجوع للقائمة'}</span>
          </button>

          <div className="flex-1 text-center relative z-10">
              <h1 className="text-xl md:text-2xl font-black text-cyan-900 leading-tight drop-shadow-sm">{currentTitle}</h1>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-0.5">قسم الرقابة المخزنية والمنتج النهائي</p>
          </div>

          <div className="hidden md:flex p-2 bg-white border border-cyan-100 text-cyan-600 rounded-xl shadow-md shrink-0 group hover:rotate-3 transition-transform relative z-10">
              <FinIcon size={24} strokeWidth={2.5}/>
          </div>
      </div>

      {/* Main Grid Buttons */}
      {activeView === 'menu' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 animate-fade-in px-2">
            {allowedButtons.map(btn => {
                const Icon = getIcon(btn.icon);
                const hasEdit = can('features', btn.id, 'edit');
                return (
                    <button 
                        key={btn.id}
                        onClick={() => handleAction(btn.action)}
                        className={`
                            ${btn.color} text-white p-5 rounded-2xl shadow-xl flex flex-col items-center justify-center gap-3 min-h-[140px] group hover:scale-[1.02] transition-all border-2 border-white/20 relative active:scale-95 overflow-hidden
                        `}
                    >
                        <div className="absolute top-0 right-0 w-20 h-full bg-white/5 skew-x-12 translate-x-full group-hover:translate-x-[-150%] transition-transform duration-1000"></div>
                        <div className="bg-white/20 p-3 rounded-xl group-hover:scale-105 shadow-inner border border-white/10 transition-transform">
                            <Icon size={32} />
                        </div>
                        <span className="text-sm font-black leading-tight text-center">{settings.language === 'ar' ? (btn.labelAr || t(btn.labelKey)) : (btn.labelEn || t(btn.labelKey))}</span>
                        {!hasEdit && <span className="absolute bottom-2 bg-black/20 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest">عرض فقط</span>}
                    </button>
                );
            })}
        </div>
      )}

      {/* View Containers */}
      {activeView !== 'menu' && (
        <div className="min-h-[500px] animate-fade-in">
            {activeView === 'balances' && <div className="p-6 bg-white rounded-2xl shadow-premium border border-slate-50"><DetailedFinishedTable /></div>}
            {activeView === 'period_report' && <PeriodFinishedReport />}
            {activeView === 'production_receipt' && <StockEntryForm warehouse="finished" mode="in" label="استلام انتاج" onSuccess={() => {}} />}
            {activeView === 'returns' && <StockEntryForm warehouse="finished" mode="return" label="المرتجعات" onSuccess={() => {}} />}
            {activeView === 'settlements' && <StockEntryForm warehouse="finished" mode="adjustment" label="التسويات" onSuccess={() => {}} />}
            {activeView === 'unfinished' && <StockEntryForm warehouse="finished" mode="unfinished" label="منتج غير تام" onSuccess={() => {}} />}
            {activeView === 'daily_sales' && <DailySalesTable />}
            {activeView === 'stocktaking' && <div className="p-6 bg-white rounded-2xl shadow-premium"><StocktakingForm warehouse="finished" /></div>}
            {activeView === 'item_withdrawals' && <div className="p-6 bg-white rounded-2xl shadow-premium"><ItemWithdrawalsReport warehouse="finished" /></div>}
        </div>
      )}
    </div>
  );
};
