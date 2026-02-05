
import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { GlassCard } from '../components/NeumorphicUI';
import { useNavigate } from 'react-router-dom';
import { getIcon, getRoleLabel } from '../utils/icons';
import { UserCircle2, Sparkles, Clock as ClockIcon } from 'lucide-react';
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
    size = 'sm', 
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

    const sizeMap = {
        sm: { main: 'text-[28px]', sub: 'text-[11px]' },
        md: { main: 'text-[32px]', sub: 'text-[13px]' },
        lg: { main: 'text-[38px]', sub: 'text-[15px]' },
        xl: { main: 'text-[44px]', sub: 'text-[18px]' }
    };
    const currentSize = sizeMap[size];

    return (
        <div className="flex flex-col items-start leading-none" style={{ transform: `scale(${scale})` }}>
             {showTime && (
                 <div className={`flex items-baseline gap-0.5 font-bold tracking-tighter drop-shadow-lg ${currentSize.main}`} dir="ltr" style={{ color: textColor, fontFamily: 'Inter, sans-serif' }}>
                     <span>{hours}</span><span className="animate-pulse opacity-50">:</span><span>{minutes}</span>
                     <div className="flex flex-col text-[8px] ml-1 opacity-80 font-black uppercase">
                         {showSeconds && <span className="mb-[-2px]">{seconds}</span>}
                         {format === '12h' && <span>{isPM ? (language === 'ar' ? 'م' : 'PM') : (language === 'ar' ? 'ص' : 'AM')}</span>}
                     </div>
                 </div>
             )}
             {showDate && (
                 <div className={`font-cairo font-black bg-white/10 px-3 py-0.5 rounded-full backdrop-blur-md border border-white/10 mt-1 shadow-sm ${currentSize.sub}`} style={{ color: textColor }}>
                     {dateStr}
                 </div>
             )}
        </div>
    );
};

export const MainPage: React.FC = () => {
  const { t, user, uiConfig, settings } = useApp();
  const navigate = useNavigate();
  const mainConfig = settings.mainScreenSettings;

  const allowedButtons = useMemo(() => {
      if (!user) return [];
      return uiConfig.main.buttons.filter(btn => {
          if (!btn.isVisible) return false;
          if (user.role === 'admin') return true;
          const permissionKey = btn.id.startsWith('m_') ? btn.id.replace('m_', 'sb_') : btn.id;
          const level = user.permissions?.screens?.[permissionKey];
          return level === 'available' || level === 'edit';
      });
  }, [uiConfig.main.buttons, user]);

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
      {/* Premium Multi-Zone Header - Compact Version */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 rounded-3xl shadow-xl relative overflow-hidden h-32 md:h-36"
        style={{ 
            background: mainConfig.headerBackground || 'linear-gradient(135deg, #1e3a8a 0%, #312e81 100%)',
        }}
      >
        <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
            <Sparkles size={400} className="absolute -top-20 -left-20" />
        </div>

        <div className="absolute inset-0 flex items-center px-8 z-10">
            <div className="w-1/3 flex justify-start">
                <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
                    <DigitalClock 
                        format={mainConfig.clockFormat} 
                        language={settings.language} 
                        size="sm" 
                        textColor="white" 
                        showSeconds={true}
                        scale={mainConfig.clockScale || 1}
                    />
                </motion.div>
            </div>

            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center flex flex-col items-center pointer-events-none min-w-[300px]">
                <h1 className="font-cairo font-black text-white drop-shadow-md leading-tight mb-1" style={{ fontSize: `${(mainConfig.titleFontSizePx || 32) * 0.8}px` }}>
                    {mainConfig.title}
                </h1>
                <div className="h-1 w-48 bg-gradient-to-r from-transparent via-yellow-400 to-transparent rounded-full shadow-lg"></div>
            </div>

            <div className="w-1/3 flex justify-end items-center gap-4">
                {mainConfig.logoLeft && (
                    <motion.div whileHover={{ scale: 1.05 }} className="bg-white/10 p-1 rounded-2xl border border-white/20 backdrop-blur-md shadow-lg overflow-hidden" style={{ width: (mainConfig.logoLeftWidth || 70) * 0.8, height: (mainConfig.logoLeftWidth || 70) * 0.8 }}>
                        <img src={mainConfig.logoLeft} className="w-full h-full object-contain" alt="" />
                    </motion.div>
                )}
                {mainConfig.logoRight && (
                    <motion.div whileHover={{ scale: 1.05 }} className="bg-white/10 p-1 rounded-2xl border border-white/20 backdrop-blur-md shadow-lg overflow-hidden" style={{ width: (mainConfig.logoRightWidth || 70) * 0.8, height: (mainConfig.logoRightWidth || 70) * 0.8 }}>
                        <img src={mainConfig.logoRight} className="w-full h-full object-contain" alt="" />
                    </motion.div>
                )}
            </div>
        </div>
      </motion.div>
      
      {/* Navigation Matrix - Smaller Cards */}
      <motion.div 
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.03 } } }}
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" 
        dir="rtl"
      >
        {allowedButtons.map((btn) => {
          const Icon = getIcon(btn.icon);
          return (
            <motion.div 
              key={btn.id}
              variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
              whileHover={{ y: -4, scale: 1.01 }}
              onClick={() => btn.action.startsWith('navigate:') && navigate(btn.action.split(':')[1])}
              className="cursor-pointer group"
            >
              <GlassCard className="h-full flex flex-col items-center text-center p-5 gap-3 border-white/40 shadow-lg group-hover:shadow-indigo-500/10 rounded-3xl bg-white/90">
                <div className={`p-4 rounded-2xl ${btn.color} text-white shadow-lg transform group-hover:rotate-3 transition-all duration-300 relative`}>
                    <div className="absolute inset-0 bg-white/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <Icon size={32} strokeWidth={2.5} className="relative z-10" />
                </div>
                <div>
                   <h3 className="text-lg font-black font-cairo text-slate-800 group-hover:text-indigo-600 transition-colors leading-tight">
                     {btn.labelAr || t(btn.labelKey)}
                   </h3>
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </motion.div>

      {user && (
          <div className="fixed bottom-6 right-6 flex items-center gap-3 bg-white/90 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white shadow-xl no-print z-50">
              <div className="w-8 h-8 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-lg flex items-center justify-center text-white shadow-md transform -rotate-2"><UserCircle2 size={20} /></div>
              <div className="flex flex-col leading-none">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">مستخدم النظام</span>
                <span className="text-sm font-black text-slate-800">{user.name}</span>
                <span className="text-[9px] font-bold text-blue-500">{getRoleLabel(user.role)}</span>
              </div>
          </div>
      )}
    </div>
  );
};
