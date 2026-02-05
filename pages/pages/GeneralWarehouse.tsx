
import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { GlassCard } from '../components/NeumorphicUI';
import { 
  Package,
  ChevronLeft,
  Utensils,
  ClipboardCheck,
  Warehouse,
  Settings,
  UserCheck
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getIcon } from '../utils/icons';
// Fix: Changed IssueVoucherForm to StockEntryForm as it is the correct exported member from WarehouseActions.tsx
import { StockEntryForm, StocktakingForm } from '../components/WarehouseActions';
import { ButtonConfig } from '../types';
import { PartsMegaTable } from '../components/PartsMegaTable';
import { PartsReports } from '../components/PartsReports'; 
import { PartsLedger } from '../components/PartsLedger';
import { CustodyManager } from '../components/CustodyManager';
import { WarehousePeriodReport } from '../components/WarehousePeriodReport';
import { CateringLedger } from '../components/CateringLedger';
import { CateringMegaTable } from '../components/CateringMegaTable';
import { ItemWithdrawalsReport } from '../components/ItemWithdrawalsReport';

export const GeneralWarehouse: React.FC = () => {
  const { t, uiConfig, settings, user } = useApp();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeSection, setActiveSection] = useState<'main' | 'parts' | 'catering' | 'custody'>('main');
  const [partsView, setPartsView] = useState('menu');
  const [cateringView, setCateringView] = useState('menu');

  useEffect(() => {
      const section = searchParams.get('section');
      if (section === 'parts' || section === 'catering' || section === 'custody') {
          setActiveSection(section as any);
      } else {
          setActiveSection('main');
      }
  }, [searchParams]);

  // فلترة أزرار قطع الغيار
  const allowedPartsButtons = useMemo(() => {
      return uiConfig.parts_warehouse.buttons.filter(btn => {
          if (!btn.isVisible) return false;
          if (user?.role === 'admin') return true;
          // في حال كان المستخدم مخصص بصلاحية feature معينة
          const featureKey = btn.action.split(':')[1];
          const level = user?.permissions?.features?.[featureKey];
          return level === 'available' || level === 'edit';
      });
  }, [uiConfig.parts_warehouse.buttons, user]);

  // فلترة أزرار الإعاشة
  const allowedCateringButtons = useMemo(() => {
      return uiConfig.catering_warehouse.buttons.filter(btn => {
          if (!btn.isVisible) return false;
          if (user?.role === 'admin') return true;
          return true; // حالياً لا توجد قيود features مفصلة للاعاشة في كائن المستخدم المقدم
      });
  }, [uiConfig.catering_warehouse.buttons, user]);

  const handleAction = (action: string) => {
    if (action.startsWith('navigate:')) {
      navigate(action.split(':')[1]);
    } else if (action.startsWith('view:')) {
      const view = action.split(':')[1];
      if (activeSection === 'parts') setPartsView(view);
      else if (activeSection === 'catering') setCateringView(view);
      else setSearchParams({ section: view });
    }
  };

  const handleBack = () => {
    if (activeSection === 'main') {
      navigate('/');
    } else if (activeSection === 'parts' && partsView !== 'menu') {
        setPartsView('menu');
    } else if (activeSection === 'catering' && cateringView !== 'menu') {
        cateringView === 'menu' ? setSearchParams({}) : setCateringView('menu');
    } else {
        setSearchParams({});
    }
  };

  const SelectionCard: React.FC<{ btn: ButtonConfig }> = ({ btn }) => {
    const Icon = getIcon(btn.icon);
    const label = settings.language === 'ar' ? (btn.labelAr || t(btn.labelKey)) : (btn.labelEn || t(btn.labelKey));
    return (
      <GlassCard 
          className="cursor-pointer hover:scale-[1.02] transition-all duration-300 flex flex-col items-center justify-center p-6 gap-5 border border-white/20 group min-h-[180px] shadow-lg bg-white rounded-3xl"
          onClick={() => handleAction(btn.action)}
      >
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white group-hover:rotate-6 transition-all shadow-xl ${btn.color}`}>
              <Icon size={32} />
          </div>
          <h3 className="text-lg font-black text-slate-800 font-cairo text-center leading-tight">{label}</h3>
      </GlassCard>
    );
  };

  const ActionBtn: React.FC<{ btn: ButtonConfig }> = ({ btn }) => {
    const Icon = getIcon(btn.icon);
    const label = settings.language === 'ar' ? (btn.labelAr || t(btn.labelKey)) : (btn.labelEn || t(btn.labelKey));
    return (
      <button 
          onClick={() => handleAction(btn.action)}
          className={`${btn.color} text-white p-5 rounded-2xl shadow-xl hover:brightness-110 active:scale-95 transition-all flex flex-col items-center justify-center gap-3 w-full min-h-[140px] group border-4 border-white/20 font-cairo`}
      >
          <div className="bg-white/10 p-2.5 rounded-xl group-hover:scale-110 transition-transform shadow-inner shrink-0">
             <Icon size={28}/>
          </div>
          <span className="text-base font-black w-full text-center leading-tight">{label}</span>
      </button>
    );
  };

  const currentPartsBtn = uiConfig.parts_warehouse.buttons.find((b) => b.action === `view:${partsView}`);
  const partsTitle = partsView === 'menu' ? 'مخزن قطع الغيار والمهمات' : (settings.language === 'ar' ? (currentPartsBtn?.labelAr || t(currentPartsBtn?.labelKey || '')) : (currentPartsBtn?.labelEn || t(currentPartsBtn?.labelKey || '')));

  const currentCateringBtn = uiConfig.catering_warehouse.buttons.find((b) => b.action === `view:${cateringView}`);
  const cateringTitle = cateringView === 'menu' ? 'مخزن الإعاشة التموينية' : (settings.language === 'ar' ? (currentCateringBtn?.labelAr || t(currentCateringBtn?.labelKey || '')) : (currentCateringBtn?.labelEn || t(currentCateringBtn?.labelKey || '')));

  const activeTitle = activeSection === 'custody' ? 'إدارة عهدة الموظفين' : activeSection === 'parts' ? partsTitle : activeSection === 'catering' ? cateringTitle : t('generalWarehouses');

  const isAdmin = user?.role === 'admin';

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header Section */}
      <div className={`bg-white border-y-4 rounded-3xl shadow-premium px-8 py-3 flex items-center justify-between relative overflow-hidden h-24 animate-fade-in ${activeSection === 'parts' ? 'border-indigo-600' : activeSection === 'catering' ? 'border-emerald-600' : 'border-teal-600'}`}>
          <div className="relative group shrink-0">
             <button onClick={handleBack} className="flex items-center gap-2 bg-[#1e293b] hover:bg-black text-white px-6 py-2.5 rounded-xl font-black shadow-xl transition-all active:scale-95 group relative z-10 text-sm">
                <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                <span>{activeSection === 'main' ? t('backToMain') : 'رجوع'}</span>
             </button>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center">
              <h1 className={`text-3xl font-black font-cairo leading-tight drop-shadow-sm ${activeSection === 'parts' ? 'text-indigo-800' : activeSection === 'catering' ? 'text-emerald-800' : 'text-teal-800'}`}>
                {activeTitle}
              </h1>
          </div>
          <div className={`hidden md:flex p-3 rounded-2xl shrink-0 ${activeSection === 'parts' ? 'bg-indigo-50 text-indigo-600' : activeSection === 'catering' ? 'bg-emerald-50 text-emerald-600' : 'bg-teal-50 text-teal-600'}`}>
              {activeSection === 'parts' ? <Settings size={28}/> : activeSection === 'catering' ? <Utensils size={28}/> : <Warehouse size={28}/>}
          </div>
      </div>

      {activeSection === 'main' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 animate-fade-in px-4">
              {uiConfig.general.buttons.filter(b => b.isVisible).map(btn => {
                  const permissionKey = btn.id.startsWith('gen_') ? btn.id.replace('gen_', 'g_') : btn.id;
                  if (user?.role !== 'admin' && user?.permissions?.screens?.[permissionKey] === 'hidden') return null;
                  return <SelectionCard key={btn.id} btn={btn} />;
              })}
          </div>
      )}

      {activeSection === 'parts' && (
          <div className="space-y-6">
             {partsView === 'menu' ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5 animate-fade-in pt-2">
                    {allowedPartsButtons.map((btn) => <ActionBtn key={btn.id} btn={btn} />)}
                    {isAdmin && (
                        <button onClick={() => setPartsView('stocktaking')} className="bg-violet-600 text-white p-5 rounded-2xl shadow-xl hover:brightness-110 active:scale-95 transition-all flex flex-col items-center justify-center gap-3 w-full min-h-[140px] group border-4 border-white/20 font-cairo">
                            <div className="bg-white/10 p-2.5 rounded-xl group-hover:scale-110 transition-transform shadow-inner shrink-0"><ClipboardCheck size={28}/></div>
                            <span className="text-base font-black w-full text-center">جرد البداية (ثابت)</span>
                        </button>
                    )}
                </div>
             ) : (
                <div className="animate-fade-in">
                    {partsView === 'stocktaking' ? <div className="p-6 bg-white rounded-[2.5rem] shadow-premium"><StocktakingForm warehouse="parts" /></div> : 
                     partsView === 'balances' ? <PartsLedger /> :
                     partsView === 'reports' ? <PartsReports /> :
                     partsView === 'add' ? <PartsMegaTable view="in" title="أذون إضافة قطع الغيار" /> :
                     partsView === 'issue' ? <StockEntryForm warehouse="parts" mode="out" label="صرف قطع غيار" onSuccess={() => setPartsView('menu')} /> :
                     partsView === 'transfer_in' ? <StockEntryForm warehouse="parts" mode="in" label="تحويلات إضافة" onSuccess={() => setPartsView('menu')} /> :
                     partsView === 'transfer_out' ? <StockEntryForm warehouse="parts" mode="out" label="تحويلات خصم" onSuccess={() => setPartsView('menu')} /> :
                     partsView === 'adj_in' ? <StockEntryForm warehouse="parts" mode="adjustment" label="التسوية بالاضافة" onSuccess={() => setPartsView('menu')} /> :
                     partsView === 'adj_out' ? <StockEntryForm warehouse="parts" mode="adjustment" label="التسوية بالخصم" onSuccess={() => setPartsView('menu')} /> :
                     partsView === 'movement' ? <WarehousePeriodReport warehouse="parts" /> :
                     partsView === 'item_withdrawals' ? <div className="p-8 bg-white rounded-[3rem] shadow-premium"><ItemWithdrawalsReport warehouse="parts" /></div> :
                     partsView === 'returns' ? <StockEntryForm warehouse="parts" mode="return" label="مرتجع قطع غيار" onSuccess={() => setPartsView('menu')} /> : null}
                </div>
             )}
          </div>
      )}

      {activeSection === 'catering' && (
          <div className="space-y-6">
             {cateringView === 'menu' ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5 animate-fade-in pt-2">
                    {allowedCateringButtons.map((btn) => <ActionBtn key={btn.id} btn={btn} />)}
                    {isAdmin && (
                        <button onClick={() => setCateringView('stocktaking')} className="bg-violet-600 text-white p-5 rounded-2xl shadow-xl hover:brightness-110 active:scale-95 transition-all flex flex-col items-center justify-center gap-3 w-full min-h-[140px] group border-4 border-white/20 font-cairo">
                            <div className="bg-white/10 p-2.5 rounded-xl group-hover:scale-110 transition-transform shadow-inner shrink-0"><ClipboardCheck size={28}/></div>
                            <span className="text-base font-black w-full text-center">جرد البداية (ثابت)</span>
                        </button>
                    )}
                </div>
             ) : (
                <div className="animate-fade-in">
                    {cateringView === 'stocktaking' ? <div className="p-6 bg-white rounded-[2.5rem] shadow-premium"><StocktakingForm warehouse="catering" /></div> :
                     cateringView === 'balances' ? <CateringLedger /> :
                     cateringView === 'add' ? <CateringMegaTable view="in" title="وارد إعاشة" /> :
                     cateringView === 'issue' ? <CateringMegaTable view="out" title="منصرف إعاشة" /> :
                     cateringView === 'transfer_in' ? <CateringMegaTable view="transfer_in" title="تحويلات واردة" /> :
                     cateringView === 'transfer_out' ? <CateringMegaTable view="transfer_out" title="تحويلات صادرة" /> :
                     cateringView === 'adj_in' ? <CateringMegaTable view="adj_in" title="تسويات بالزيادة" /> :
                     cateringView === 'adj_out' ? <CateringMegaTable view="adj_out" title="تسويات بالعجز" /> :
                     cateringView === 'returns' ? <CateringMegaTable view="return" title="مرتجع إعاشة" /> :
                     cateringView === 'item_withdrawals' ? <div className="p-8 bg-white rounded-[3rem] shadow-premium"><ItemWithdrawalsReport warehouse="catering" /></div> :
                     cateringView === 'movement' ? <WarehousePeriodReport warehouse="catering" /> : null}
                </div>
             )}
          </div>
      )}

      {activeSection === 'custody' && <CustodyManager />}
    </div>
  );
};
