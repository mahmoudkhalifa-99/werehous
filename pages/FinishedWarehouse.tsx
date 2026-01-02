
import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { dbService } from '../services/storage';
import { Product, StockMovement, Sale, Purchase, ButtonConfig } from '../types';
import { 
    Search, Plus, Save, X, Trash2, Calendar, Hash, Truck, 
    Package, PlusCircle, UserCog, Clock, ClipboardList,
    Download, RefreshCw, Scale, Undo2, Loader, ArrowLeft,
    CheckCircle2, Printer, FileText, ShoppingBag, ArrowRight,
    MinusCircle, LayoutGrid, PackageCheck, ListFilter, Warehouse,
    ShoppingCart, UserPlus, ExternalLink, Calculator, UserCheck,
    History, ClipboardCheck, FileDown, FileUp, ChevronLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getIcon } from '../utils/icons';
import { DetailedFinishedTable } from '../components/DetailedFinishedTable';
import { PeriodFinishedReport } from '../components/PeriodFinishedReport';
import { DailySalesTable } from '../components/DailySalesTable';
import { PrintSettingsModal } from '../components/PrintSettingsModal';
import { GlassCard } from '../components/NeumorphicUI';
import { StockEntryForm, StocktakingForm } from '../components/WarehouseActions';

export const FinishedWarehouse: React.FC = () => {
  const { t, uiConfig, settings, user } = useApp();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState('menu');

  const handleAction = (action: string) => {
    if (action.startsWith('navigate:')) {
      navigate(action.split(':')[1]);
    } else if (action.startsWith('view:')) {
      setActiveView(action.split(':')[1]);
    }
  };

  const handleBack = () => {
    if (activeView === 'menu') {
      navigate('/');
    } else {
      setActiveView('menu');
    }
  };

  const ActionBtn: React.FC<{ btn: ButtonConfig }> = ({ btn }) => {
    const Icon = getIcon(btn.icon);
    const label = settings.language === 'ar' ? (btn.labelAr || t(btn.labelKey)) : (btn.labelEn || t(btn.labelKey));
    return (
      <button 
          key={btn.id}
          onClick={() => handleAction(btn.action)}
          className="group bg-white p-6 rounded-[2rem] shadow-premium hover:shadow-2xl transition-all duration-500 border border-slate-100 flex flex-col items-center justify-center gap-4 text-center min-h-[160px]"
      >
          <div className={`p-5 rounded-3xl ${btn.color} text-white shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
              <Icon size={36} />
          </div>
          <span className="text-lg font-black text-slate-800 group-hover:text-cyan-600 transition-colors leading-tight">{label}</span>
      </button>
    );
  };

  const buttons = uiConfig.finished.buttons.filter(b => b.isVisible && user?.permissions?.screens?.[b.id] !== 'hidden');
  
  const viewTitles: Record<string, string> = {
      'returns': 'المرتجعات',
      'period_report': 'التقرير عن مدة',
      'balances': 'شاشة الارصدة النهائية',
      'production_receipt': 'استلام انتاج',
      'settlements': 'التسويات',
      'unfinished': 'منتج غير تام',
      'daily_sales': 'المبيعات اليومية',
      'stocktaking': 'جرد (رصيد افتتاحي)'
  };

  const currentTitle = viewTitles[activeView] || t('finishedWarehouse');

  return (
    <div className="p-4 space-y-4" dir="rtl">
      <div className="bg-gradient-to-l from-slate-50 via-cyan-50/50 to-slate-50 border-y-4 border-cyan-600 shadow-premium px-10 py-6 flex items-center justify-between relative overflow-hidden h-32 animate-fade-in mb-8 rounded-[2rem]">
          <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-cyan-100/20 to-transparent pointer-events-none"></div>
          
          <div className="relative group shrink-0">
              <button 
                  onClick={handleBack}
                  className="flex items-center gap-3 bg-[#1e293b] hover:bg-black text-white px-8 py-3.5 rounded-2xl font-black shadow-2xl transition-all active:scale-95 group relative z-10 border border-slate-700/50"
              >
                  <ChevronLeft size={22} className="group-hover:-translate-x-1 transition-transform" />
                  <span>{activeView === 'menu' ? t('backToMain') : 'الرجوع للقائمة'}</span>
              </button>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center relative">
              <div className="relative">
                  <h1 className="text-5xl font-black text-cyan-900 font-cairo leading-tight drop-shadow-sm tracking-tight">
                      {currentTitle}
                  </h1>
                  <div className="mt-2 h-2.5 w-[140%] -mx-[20%] bg-gradient-to-r from-transparent via-cyan-600/60 via-cyan-600 to-cyan-600/60 to-transparent rounded-full shadow-[0_0_15px_rgba(8,145,178,0.4)] opacity-90"></div>
              </div>
              <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.3em] mt-3 opacity-80">قسم الرقابة المخزنية والمنتج النهائي</p>
          </div>

          <div className="hidden md:flex p-4 bg-white border border-cyan-100 text-cyan-600 rounded-[1.5rem] shadow-xl shrink-0 group hover:rotate-6 transition-transform">
              <PackageCheck size={38} strokeWidth={2.5}/>
          </div>
      </div>

      {activeView === 'menu' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-4 animate-fade-in">
            {buttons.map(btn => <ActionBtn key={btn.id} btn={btn} />)}
        </div>
      )}

      {activeView !== 'menu' && (
        <div className="min-h-[500px] animate-fade-in">
            {activeView === 'balances' && <div className="p-6 bg-white rounded-[2.5rem] shadow-premium border-slate-100"><DetailedFinishedTable /></div>}
            {activeView === 'period_report' && <div className="p-6 bg-white rounded-[2.5rem] shadow-premium border-slate-100"><PeriodFinishedReport /></div>}
            {activeView === 'production_receipt' && <StockEntryForm warehouse="finished" mode="in" label="استلام انتاج" onSuccess={() => {}} />}
            {activeView === 'returns' && <StockEntryForm warehouse="finished" mode="return" label="المرتجعات" onSuccess={() => {}} />}
            {activeView === 'settlements' && <StockEntryForm warehouse="finished" mode="adjustment" label="التسويات" onSuccess={() => {}} />}
            {activeView === 'unfinished' && <StockEntryForm warehouse="finished" mode="unfinished" label="منتج غير تام" onSuccess={() => {}} />}
            {activeView === 'daily_sales' && <div className="p-6 bg-white rounded-[2.5rem] shadow-premium border-slate-100"><DailySalesTable /></div>}
            {activeView === 'stocktaking' && <StocktakingForm warehouse="finished" />}
        </div>
      )}
    </div>
  );
};
