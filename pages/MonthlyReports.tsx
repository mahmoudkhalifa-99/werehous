
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { GlassCard, GlassButton } from '../components/NeumorphicUI';
import { SalesByItemReport } from '../components/SalesByItemReport';
import { SalesCustomerSplitReport } from '../components/SalesCustomerSplitReport';
import { SalesTransportReport } from '../components/SalesTransportReport';
import { LoadingEfficiencyReport } from '../components/LoadingEfficiencyReport';
import { UnloadingEfficiencyReport } from '../components/UnloadingEfficiencyReport';
import { BestCustomersReport } from '../components/BestCustomersReport';
import { ArrowRightLeft, ArrowRight, BarChartHorizontal, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getIcon } from '../utils/icons';
import { ButtonConfig } from '../types';

export const MonthlyReports: React.FC = () => {
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
    const label = settings.language === 'ar' 
       ? (btn.labelAr || t(btn.labelKey))
       : (btn.labelEn || t(btn.labelKey));
    
    return (
      <button 
          onClick={() => handleAction(btn.action)}
          className={`${btn.color} text-white p-5 rounded-2xl shadow-xl hover:brightness-110 active:scale-95 transition-all flex flex-col items-center justify-center gap-3 w-full min-h-[140px] group border-4 border-white/20 font-cairo`}
      >
          <div className="bg-white/10 p-2.5 rounded-xl group-hover:scale-110 transition-transform shadow-inner shrink-0">
             <Icon size={28}/>
          </div>
          <span className="truncate w-full text-center text-base font-black leading-tight">{label}</span>
      </button>
    );
  };

  const buttons = uiConfig.monthly_reports?.buttons.filter(b => {
      if (!b.isVisible) return false;
      if (user?.permissions?.screens?.[b.id] === 'hidden') return false;
      return true;
  }) || [];

  const currentButton = uiConfig.monthly_reports?.buttons.find(b => b.action === `view:${activeView}`);
  const pageTitle = activeView === 'menu' 
      ? 'التقارير الشهرية' 
      : (settings.language === 'ar' ? (currentButton?.labelAr || t(currentButton?.labelKey || '')) : (currentButton?.labelEn || t(currentButton?.labelKey || '')));

  return (
    <div className="p-4 space-y-4" dir="rtl">
      <div className="bg-gradient-to-l from-slate-50 via-indigo-50/50 to-slate-50 border-y-4 border-indigo-800 shadow-premium px-10 py-4 flex items-center justify-between relative overflow-hidden h-28 animate-fade-in mb-6 rounded-[2rem]">
          <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-indigo-100/20 to-transparent pointer-events-none"></div>
          
          <div className="relative group shrink-0">
              <button 
                  onClick={handleBack}
                  className="flex items-center gap-2.5 bg-[#1e293b] hover:bg-black text-white px-6 py-2.5 rounded-xl font-black shadow-2xl transition-all active:scale-95 group relative z-10 border border-slate-700/50 text-sm"
              >
                  <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                  <span>{activeView === 'menu' ? t('backToMain') : 'رجوع'}</span>
              </button>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center relative">
              <div className="relative">
                  <h1 className="text-4xl font-black text-indigo-900 font-cairo leading-tight drop-shadow-sm tracking-tight">
                      {pageTitle}
                  </h1>
                  <div className="mt-1 h-2 w-[140%] -mx-[20%] bg-gradient-to-r from-transparent via-indigo-600/60 via-indigo-600 to-indigo-600/60 to-transparent rounded-full shadow-[0_0_15px_rgba(79,70,229,0.4)] opacity-90"></div>
              </div>
          </div>

          <div className="hidden md:flex p-3 bg-white border border-indigo-100 text-indigo-800 rounded-xl shadow-xl shrink-0 group hover:rotate-6 transition-transform">
              <BarChartHorizontal size={32} strokeWidth={2.5}/>
          </div>
      </div>

      {activeView === 'menu' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 pt-2 animate-fade-in">
            {buttons.map(btn => <ActionBtn key={btn.id} btn={btn} />)}
        </div>
      )}

      {activeView !== 'menu' && (
        <GlassCard className="min-h-[500px] p-6 animate-fade-in shadow-premium border-slate-100 rounded-[2.5rem]">
            {activeView === 'sales_by_item' && <SalesByItemReport />}
            {activeView === 'sales_customer_split' && <SalesCustomerSplitReport />}
            {activeView === 'transport_report' && <SalesTransportReport />}
            {activeView === 'loading_efficiency' && <LoadingEfficiencyReport />}
            {activeView === 'unloading_efficiency' && <UnloadingEfficiencyReport />}
            {activeView === 'best_customers' && <BestCustomersReport />}
        </GlassCard>
      )}
    </div>
  );
};
