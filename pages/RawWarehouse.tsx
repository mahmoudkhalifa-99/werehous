
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { GlassCard } from '../components/NeumorphicUI';
import { RawBalancesTable } from '../components/RawBalancesTable';
import { RawPeriodReport } from '../components/RawPeriodReport';
import { RawMegaTable } from '../components/RawMegaTable';
import { DailyRawReports } from '../components/DailyRawReports';
import { Factory, ChevronLeft, CalendarCheck, FileSpreadsheet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getIcon } from '../utils/icons';
import { ButtonConfig } from '../types';

export const RawWarehouse: React.FC = () => {
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
          className="group bg-white p-6 rounded-[2rem] shadow-premium hover:shadow-2xl transition-all duration-500 border border-slate-100 flex flex-col items-center justify-center gap-4 text-center min-h-[160px] active:scale-95"
      >
          <div className={`p-5 rounded-3xl ${btn.color} text-white shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
              <Icon size={36} />
          </div>
          <span className="text-lg font-black text-slate-800 group-hover:text-amber-600 transition-colors leading-tight font-cairo">{label}</span>
      </button>
    );
  };

  // الآن نقرأ كافة الأزرار من uiConfig لكي تظهر في شاشة التخصيص
  const buttons = uiConfig.raw.buttons.filter(b => b.isVisible && user?.permissions?.screens?.[b.id] !== 'hidden');
  
  const viewTitles: Record<string, string> = {
      'raw_in': 'وارد خامات (مشتريات)',
      'raw_sale': 'إذن مبيعات خامات',
      'silo_trans': 'تحويلات الصوامع',
      'control_out': 'صرف الكنترول',
      'shortage': 'محاضر العجز',
      'wh_adj': 'تسويات المخازن',
      'silo_adj': 'تسويات الصوامع',
      'wh_out': 'صرف المخازن',
      'wh_transfer': 'تحويلات المخازن',
      'raw_return': 'مرتجع اصناف',
      'balances': 'ارصدة الخامات والاضافات والتعبئة',
      'period_report': 'التقرير عن مدة (خامات)',
      'daily_reports': 'التقارير اليومية (خامات)',
      'raw_in_daily': 'بيان إجمالي الوارد اليومي (تفصيلي)'
  };

  const currentTitle = viewTitles[activeView] || 'مخزن الخامات';

  return (
    <div className="p-4 space-y-4" dir="rtl">
      <div className="bg-gradient-to-l from-slate-50 via-amber-50/50 to-slate-50 border-y-4 border-amber-600 shadow-premium px-10 py-6 flex items-center justify-between relative overflow-hidden h-32 animate-fade-in mb-8 rounded-[2rem]">
          <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-amber-100/20 to-transparent pointer-events-none"></div>
          
          <div className="relative group shrink-0">
              <button 
                  onClick={handleBack}
                  className="flex items-center gap-3 bg-[#1e293b] hover:bg-black text-white px-8 py-3.5 rounded-2xl font-black shadow-2xl transition-all active:scale-95 group relative z-10 border border-slate-700/50"
              >
                  <ChevronLeft size={22} className="group-hover:-translate-x-1 transition-transform" />
                  <span>{activeView === 'menu' ? 'الرجوع للقائمة' : 'رجوع'}</span>
              </button>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center relative">
              <div className="relative">
                  <h1 className="text-5xl font-black text-amber-900 font-cairo leading-tight drop-shadow-sm tracking-tight">
                      {currentTitle}
                  </h1>
                  <div className="mt-2 h-2.5 w-[140%] -mx-[20%] bg-gradient-to-r from-transparent via-amber-600/60 via-amber-600 to-amber-600/60 to-transparent rounded-full shadow-[0_0_15px_rgba(217,119,6,0.4)] opacity-90"></div>
              </div>
              <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.3em] mt-3 opacity-80">إدارة المواد الخام والمدخلات الإنتاجية</p>
          </div>

          <div className="hidden md:flex p-4 bg-white border border-amber-100 text-amber-600 rounded-[1.5rem] shadow-xl shrink-0 group hover:rotate-6 transition-transform">
              <Factory size={38} strokeWidth={2.5}/>
          </div>
      </div>

      {activeView === 'menu' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-6 pt-4 animate-fade-in">
            {buttons.map(btn => <ActionBtn key={btn.id} btn={btn} />)}
        </div>
      )}

      {activeView !== 'menu' && (
        <div className="animate-fade-in">
            {activeView === 'balances' ? (
                <div className="p-4 md:p-8 bg-white rounded-[2.5rem] shadow-premium border border-slate-100">
                    <RawBalancesTable />
                </div>
            ) : activeView === 'period_report' ? (
                <div className="p-4 md:p-8 bg-white rounded-[2.5rem] shadow-premium border border-slate-100">
                    <RawPeriodReport />
                </div>
            ) : activeView === 'daily_reports' ? (
                <DailyRawReports />
            ) : (
                <RawMegaTable view={activeView as any} onSuccess={handleBack} title={currentTitle} />
            )}
        </div>
      )}
    </div>
  );
};
