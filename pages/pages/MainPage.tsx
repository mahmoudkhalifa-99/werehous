
import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { GlassCard } from '../components/NeumorphicUI';
import { useNavigate } from 'react-router-dom';
import { getIcon, getRoleLabel } from '../utils/icons';
import { UserCircle2, Sparkles, Clock as ClockIcon, ShieldAlert, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

interface DigitalClockProps { 
    format: '12h' | '24h' | 'date-only'; 
    language: 'ar' | 'en'; 
    size?: 'sm' | 'md' | 'lg' | 'xl';
    textColor?: string;
    showTime?: boolean;
    showDate?: boolean;
    showSeconds?: boolean;
    scale?: number;
}

const DigitalClock: React.FC<DigitalClockProps> = ({ 
    format, 
    language, 
    size = 'md', 
    textColor = 'white', 
    showTime = true, 
    showDate = true,
    showSeconds = true,
    scale = 1
}) => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const hours24 = time.getHours();
    const isPM = hours24 >= 12;
    let displayHours = hours24;
    if (format === '12h') displayHours = hours24 % 12 || 12;

    const hours = displayHours.toString().padStart(2, '0');
    const minutes = time.getMinutes().toString().padStart(2, '0');
    const seconds = time.getSeconds().toString().padStart(2, '0');
    
    const locale = language === 'ar' ? 'ar-EG' : 'en-GB';
    const dateStr = time.toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
        .replace(/[٠١٢٣٤٥٦٧٨٩]/g, d => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)]);

    return (
        <div className="flex flex-col items-center gap-0.5" style={{ transform: `scale(${scale * 0.8})` }}>
             {showTime && (
                 <div className="flex items-baseline gap-1 font-bold tracking-tighter drop-shadow-2xl text-2xl md:text-3xl" dir="ltr" style={{ color: textColor, fontFamily: 'Inter, sans-serif' }}>
                     <span>{hours}</span>
                     <span className="animate-pulse opacity-50">:</span>
                     <span>{minutes}</span>
                     {showSeconds && (
                        <span className="text-[12px] opacity-60 ml-1 font-black">{seconds}</span>
                     )}
                     {format === '12h' && (
                        <span className="text-[10px] ml-1 opacity-80 uppercase">
                            {isPM ? (language === 'ar' ? 'م' : 'PM') : (language === 'ar' ? 'ص' : 'AM')}
                        </span>
                     )}
                 </div>
             )}
             {showDate && (
                 <div className="font-cairo font-black bg-white/10 px-3 py-0.5 rounded-full backdrop-blur-md border border-white/10 shadow-sm text-[10px] md:text-[11px] whitespace-nowrap" style={{ color: textColor }}>
                     {dateStr}
                 </div>
             )}
        </div>
    );
};

export const MainPage: React.FC = () => {
  const { t, user, uiConfig, settings, can, syncAllData } = useApp();
  const navigate = useNavigate();
  const mainConfig = settings.mainScreenSettings;

  const allowedButtons = useMemo(() => {
      return uiConfig.main.buttons.filter(btn => {
          if (!btn.isVisible) return false;
          return can('screens', btn.id, 'available');
      });
  }, [uiConfig.main.buttons, user, can]);

  return (
    <div className="p-3 md:p-4 max-w-[1400px] mx-auto font-cairo">
      {/* Premium Multi-Zone Header - Fully Custom from Identity Settings */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 relative overflow-hidden shadow-premium bg-gradient-to-r from-[#1e3a8a] via-[#1e3a8a] to-[#2e2b7a]"
        style={{ 
            height: `${Math.min(mainConfig.headerHeight || 200, 140)}px`,
            borderRadius: `1.5rem`
        }}
      >
        {/* Subtle Background Animation */}
        <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
            <Sparkles size={400} className="absolute -top-20 -left-20" />
        </div>

        <div className="absolute inset-0 flex items-center px-8 z-10">
            {/* Left Zone - Logo */}
            <div className="w-1/4 flex justify-start">
                {mainConfig.logoLeft && (
                    <motion.div 
                        whileHover={{ scale: 1.05 }} 
                        className="bg-white/10 p-2 rounded-xl border border-white/20 backdrop-blur-md shadow-lg overflow-hidden" 
                        style={{ 
                            width: `${Math.min(mainConfig.logoLeftWidth || 110, 70)}px`, 
                            height: `${Math.min(mainConfig.logoLeftWidth || 110, 70)}px`,
                        }}
                    >
                        <img src={mainConfig.logoLeft} className="w-full h-full object-contain" alt="" />
                    </motion.div>
                )}
            </div>

            {/* Middle Zone - Main Title with Glow Line */}
            <div className="flex-1 text-center flex flex-col items-center">
                <div className="relative">
                    <h1 
                        className="font-black text-white drop-shadow-md leading-tight mb-1" 
                        style={{ 
                            fontSize: `${Math.min(mainConfig.titleFontSizePx || 54, 32)}px`,
                            color: mainConfig.headerTextColor || '#FFFFFF'
                        }}
                    >
                        {mainConfig.title}
                    </h1>
                    {/* Decorative Glowing Line */}
                    <div className="h-1 w-[110%] -mx-[5%] bg-gradient-to-r from-transparent via-[#facc15] to-transparent rounded-full shadow-[0_0_15px_rgba(250,204,21,0.5)]"></div>
                </div>
            </div>

            {/* Right Zone - Digital Clock & Date */}
            <div className="w-1/4 flex justify-end">
                <motion.div 
                    initial={{ x: 20, opacity: 0 }} 
                    animate={{ x: 0, opacity: 1 }} 
                    transition={{ delay: 0.3 }}
                >
                    <DigitalClock 
                        format={mainConfig.clockFormat} 
                        language={settings.language} 
                        textColor={mainConfig.headerTextColor} 
                        showTime={mainConfig.showTime} 
                        showDate={mainConfig.showDate} 
                        showSeconds={mainConfig.showSeconds} 
                        scale={(mainConfig.clockScale || 1) * 0.9} 
                    />
                </motion.div>
            </div>
        </div>
      </motion.div>
      
      {/* Navigation Matrix */}
      {allowedButtons.length > 0 ? (
        <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.05 } } }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 shadow-sm" dir="rtl">
            {allowedButtons.map((btn) => {
            const Icon = getIcon(btn.icon);
            return (
                <motion.div key={btn.id} variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }} whileHover={{ y: -4, scale: 1.01 }} onClick={() => btn.action.startsWith('navigate:') && navigate(btn.action.split(':')[1])} className="cursor-pointer group">
                <GlassCard 
                    className="h-full flex flex-col items-center text-center p-5 gap-4 border-white/40 shadow-lg group-hover:shadow-indigo-500/10 rounded-2xl bg-white/95 transition-transform"
                >
                    <div className={`p-4 rounded-xl ${btn.color} text-white shadow-lg transform group-hover:rotate-3 transition-all duration-300 relative`}>
                        <div className="absolute inset-0 bg-white/20 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <Icon size={28} strokeWidth={2.5} className="relative z-10" />
                    </div>
                    <div>
                        <h3 className="text-base font-black text-slate-800 group-hover:text-indigo-600 transition-colors leading-tight">{btn.labelAr || t(btn.labelKey)}</h3>
                    </div>
                </GlassCard>
                </motion.div>
            );
            })}
        </motion.div>
      ) : (
          <div className="flex flex-col items-center justify-center p-12 text-center animate-fade-in">
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-4 shadow-inner"><ShieldAlert size={32}/></div>
              <h2 className="text-lg font-black text-slate-800 mb-1">عذراً، لم يتم تفعيل أزرار وصول لك بعد</h2>
              <p className="text-xs text-slate-400 font-bold mb-6">يرجى التواصل مع مدير النظام لتحديد صلاحيات الأزرار الخاصة بك.</p>
              <button onClick={() => syncAllData()} className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-xl font-black shadow-lg hover:bg-blue-700 transition-all active:scale-95 text-xs">
                  <RefreshCw size={16} /> تحديث الصلاحيات الآن
              </button>
          </div>
      )}

      {user && (
          <div className="fixed bottom-6 right-6 flex items-center gap-2.5 bg-white/90 backdrop-blur-xl px-4 py-2 rounded-xl border border-white shadow-2xl no-print z-50">
              <div className="w-7 h-7 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-lg flex items-center justify-center text-white shadow-xl transform -rotate-3"><UserCircle2 size={16} /></div>
              <div className="flex flex-col leading-none">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">المستخدم</span>
                <span className="text-xs font-black text-slate-800">{user.name}</span>
                <span className="text-[9px] font-bold text-blue-500">{getRoleLabel(user.role)}</span>
              </div>
          </div>
      )}
    </div>
  );
};
