
import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { GlassCard, GlassButton } from '../components/NeumorphicUI';
import { ProductTable } from '../components/ProductTable';
import { 
  ArrowRight,
  ArrowRightLeft,
  PlusCircle,
  Package,
  CalendarDays,
  ChevronRight,
  Upload,
  Download,
  LayoutGrid,
  ChevronLeft,
  Utensils,
  History
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getIcon } from '../utils/icons';
import { IssueVoucherForm, StockEntryForm, SpecificMovementHistory } from '../components/WarehouseActions';
import { ButtonConfig, UiConfig } from '../types';
import { PartsMegaTable } from '../components/PartsMegaTable';
import { PartsReports } from '../components/PartsReports'; 
import { PartsLedger } from '../components/PartsLedger';
import { CustodyManager } from '../components/CustodyManager';
import { WarehousePeriodReport } from '../components/WarehousePeriodReport';
import { CateringLedger } from '../components/CateringLedger';
import { CateringMegaTable } from '../components/CateringMegaTable';
import { CateringReports } from '../components/CateringReports';

export const GeneralWarehouse: React.FC = () => {
  const { t, uiConfig, settings, user } = useApp();
  const navigate = useNavigate();
  const [searchParams, setSearchTermParams] = useSearchParams();
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

  const handleAction = (action: string) => {
    if (action.startsWith('navigate:')) {
      navigate(action.split(':')[1]);
    } else if (action.startsWith('view:')) {
      const view = action.split(':')[1];
      if (activeSection === 'parts') setPartsView(view);
      else if (activeSection === 'catering') setCateringView(view);
      else setSearchTermParams({ section: view });
    }
  };

  const handleBack = () => {
    if (activeSection === 'main') {
      navigate('/');
    } else if (activeSection === 'parts' && partsView !== 'menu') {
        setPartsView('menu');
    } else if (activeSection === 'catering' && cateringView !== 'menu') {
        setCateringView('menu');
    } else {
        setSearchTermParams({});
    }
  };

  const SelectionCard: React.FC<{ btn: ButtonConfig }> = ({ btn }) => {
    const Icon = getIcon(btn.icon);
    const label = settings.language === 'ar' 
       ? (btn.labelAr || t(btn.labelKey))
       : (btn.labelEn || t(btn.labelKey));

    return (
      <GlassCard 
          className="cursor-pointer hover:scale-105 transition-transform duration-300 flex flex-col items-center justify-center p-6 gap-6 border-4 border-white/20 hover:border-blue-400 group min-h-[180px] shadow-2xl bg-white rounded-[2.5rem]"
          onClick={() => handleAction(btn.action)}
      >
          <div className={`w-16 h-16 rounded-3xl flex items-center justify-center text-white group-hover:brightness-110 transition-all shadow-inner ${btn.color}`}>
              <Icon size={40} />
          </div>
          <h3 className="text-[18px] font-black text-blue-900 font-cairo text-center leading-tight">{label}</h3>
      </GlassCard>
    );
  };

  const ActionBtn: React.FC<{ btn: ButtonConfig }> = ({ btn }) => {
    const Icon = getIcon(btn.icon);
    const label = settings.language === 'ar' 
       ? (btn.labelAr || t(btn.labelKey))
       : (btn.labelEn || t(btn.labelKey));
    
    return (
      <button 
          onClick={() => handleAction(btn.action)}
          className={`${btn.color} text-white px-4 py-4 rounded-3xl shadow-xl hover:brightness-110 active:scale-95 transition-all flex flex-col items-center justify-center gap-2 w-full min-h-[120px] group border-4 border-white/20 font-cairo`}
      >
          <div className="bg-white/10 p-2.5 rounded-xl group-hover:scale-110 transition-transform shadow-inner shrink-0">
             <Icon size={24}/>
          </div>
          <span className="text-[18px] font-black w-full text-center leading-tight">{label}</span>
      </button>
    );
  };

  const filteredButtons = uiConfig.general.buttons.filter(b => {
      if (!b.isVisible) return false;
      if (user?.permissions?.screens?.[b.id] === 'hidden') return false;
      return true;
  });

  const partsButtons = uiConfig.parts_warehouse.buttons.filter((b) => {
      if (!b.isVisible) return false;
      if (user?.permissions?.screens?.[b.id] === 'hidden') return false;
      return true;
  }) || [];

  const cateringButtons = uiConfig.catering_warehouse?.buttons.filter((b) => {
      if (!b.isVisible) return false;
      if (user?.permissions?.screens?.[b.id] === 'hidden') return false;
      return true;
  }) || [];

  const currentPartsBtn = uiConfig.parts_warehouse.buttons.find((b) => b.action === `view:${partsView}`);
  const partsTitle = partsView === 'menu' ? 'مخزن قطع الغيار والمهمات' : (settings.language === 'ar' ? (currentPartsBtn?.labelAr || t(currentPartsBtn?.labelKey || '')) : (currentPartsBtn?.labelEn || t(currentPartsBtn?.labelKey || '')));

  const currentCateringBtn = uiConfig.catering_warehouse.buttons.find((b) => b.action === `view:${cateringView}`);
  const cateringTitle = cateringView === 'menu' ? 'مخزن الإعاشة (المواد التموينية)' : (settings.language === 'ar' ? (currentCateringBtn?.labelAr || t(currentCateringBtn?.labelKey || '')) : (currentCateringBtn?.labelEn || t(currentCateringBtn?.labelKey || '')));

  const activeTitle = activeSection === 'custody' ? 'إدارة عهدة الموظفين' : activeSection === 'parts' ? partsTitle : activeSection === 'catering' ? cateringTitle : t('generalWarehouses');
  const themeColor = activeSection === 'parts' ? 'indigo' : activeSection === 'catering' ? 'emerald' : 'teal';

  return (
    <div className="p-6 space-y-6" dir="rtl">
      
      <div className={`bg-white border-y-4 rounded-[2rem] shadow-premium px-8 py-4 flex items-center justify-between relative overflow-hidden h-28 animate-fade-in ${activeSection === 'parts' ? 'border-indigo-600' : activeSection === 'catering' ? 'border-emerald-600' : 'border-teal-600'}`}>
          <div className="absolute top-0 right-0 w-24 h-full bg-gradient-to-l from-slate-50/50 to-transparent pointer-events-none"></div>
          
          <div className="relative group shrink-0">
             <button 
                onClick={handleBack}
                className="flex items-center gap-3 bg-[#2d3748] hover:bg-black text-white px-8 py-3 rounded-2xl font-black shadow-xl transition-all active:scale-95 group relative z-10"
             >
                <ChevronLeft size={22} className="group-hover:-translate-x-1 transition-transform" />
                <span>{activeSection === 'main' ? t('backToMain') : 'رجوع'}</span>
             </button>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center relative">
              <div className="relative">
                  <h1 className={`text-4xl font-black font-cairo leading-tight drop-shadow-sm ${activeSection === 'parts' ? 'text-indigo-800' : activeSection === 'catering' ? 'text-emerald-800' : 'text-teal-800'}`}>
                    {activeTitle}
                  </h1>
                  <div className={`mt-1 h-1.5 w-3/4 mx-auto bg-gradient-to-r from-transparent via-current to-transparent rounded-full shadow-sm opacity-30`}></div>
              </div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">{activeSection === 'main' ? t('generalWarehouseDesc') : 'النظام المتكامل لإدارة المخازن العامة'}</p>
          </div>

          <div className={`hidden md:flex p-3 rounded-2xl shrink-0 ${activeSection === 'parts' ? 'bg-indigo-50 text-indigo-600' : activeSection === 'catering' ? 'bg-emerald-50 text-emerald-600' : 'bg-teal-50 text-teal-600'}`}>
              {activeSection === 'parts' ? <Package size={32}/> : activeSection === 'catering' ? <Utensils size={32}/> : <ArrowRightLeft size={32}/>}
          </div>
      </div>

      {activeSection === 'main' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 animate-fade-in px-4">
              {filteredButtons.map(btn => (
                 <SelectionCard key={btn.id} btn={btn} />
              ))}
          </div>
      )}

      {activeSection === 'parts' && (
          <div className="space-y-6">
             {partsView === 'menu' ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 animate-fade-in pt-4">
                    {partsButtons.map((btn) => <ActionBtn key={btn.id} btn={btn} />)}
                </div>
             ) : (
                <div className="space-y-8 animate-fade-in">
                    {partsView === 'issue' ? (
                        <IssueVoucherForm warehouse="parts" title="صرف قطع غيار" onSuccess={() => setPartsView('menu')} />
                    ) : (
                        <div className="min-h-[500px]">
                            {partsView === 'balances' && <PartsLedger />}
                            {partsView === 'reports' && <PartsReports />}
                            {partsView === 'add' && <PartsMegaTable view="in" title="أذون إضافة (وارد) قطع الغيار والمهمات" />}
                            {partsView === 'transfer_in' && <IssueVoucherForm warehouse="parts" title="تحويلات إضافة" onSuccess={() => setPartsView('menu')} />}
                            {partsView === 'transfer_out' && <IssueVoucherForm warehouse="parts" title="تحويلات خصم" onSuccess={() => setPartsView('menu')} />}
                            {partsView === 'adj_in' && <IssueVoucherForm warehouse="parts" title="التسوية بالاضافة" onSuccess={() => setPartsView('menu')} />}
                            {partsView === 'adj_out' && <IssueVoucherForm warehouse="parts" title="التسوية بالخصم" onSuccess={() => setPartsView('menu')} />}
                            {partsView === 'movement' && <WarehousePeriodReport warehouse="parts" />}
                            {partsView === 'returns' && (
                                <div className="space-y-6">
                                    <IssueVoucherForm warehouse="parts" title="مرتجع قطع غيار" onSuccess={() => setPartsView('menu')} />
                                </div>
                            )}
                        </div>
                    )}
                </div>
             )}
          </div>
      )}

      {activeSection === 'catering' && (
          <div className="space-y-6">
             {cateringView === 'menu' ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 animate-fade-in pt-4">
                    {cateringButtons.map((btn) => <ActionBtn key={btn.id} btn={btn} />)}
                </div>
             ) : (
                <div className="space-y-8 animate-fade-in">
                    <div className="min-h-[500px]">
                        {cateringView === 'balances' && <CateringLedger />}
                        {cateringView === 'add' && <CateringMegaTable view="in" title="وارد إعاشة (توريدات تموينية)" />}
                        {cateringView === 'issue' && <CateringMegaTable view="out" title="منصرف إعاشة (صرف يومي)" />}
                        {cateringView === 'transfer_in' && <CateringMegaTable view="transfer_in" title="تحويلات واردة لمخزن الإعاشة" />}
                        {cateringView === 'transfer_out' && <CateringMegaTable view="transfer_out" title="تحويلات صادرة من مخزن الإعاشة" />}
                        {cateringView === 'adj_in' && <CateringMegaTable view="adj_in" title="تسويات إعاشة (إضافة بالزيادة)" />}
                        {cateringView === 'adj_out' && <CateringMegaTable view="adj_out" title="تسويات إعاشة (خصم بالعجز)" />}
                        {cateringView === 'returns' && <CateringMegaTable view="return" title="مرتجع إعاشة" />}
                        {cateringView === 'movement' && <WarehousePeriodReport warehouse="catering" />}
                    </div>
                </div>
             )}
          </div>
      )}

      {activeSection === 'custody' && (
          <CustodyManager />
      )}
    </div>
  );
};
