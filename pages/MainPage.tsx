import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { GlassCard } from '../components/NeumorphicUI';
import { useNavigate } from 'react-router-dom';
import { getIcon } from '../utils/icons';
import { UserCircle2 } from 'lucide-react';

interface DigitalClockProps { 
    format: '12h' | '24h' | 'date-only'; 
    language: 'ar' | 'en'; 
    user?: any;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    textColor?: string;
    showTime?: boolean;
    showDate?: boolean;
    layout?: 'row' | 'column';
}

const DigitalClock: React.FC<DigitalClockProps> = ({ 
    format, 
    language, 
    user, 
    size = 'sm', 
    textColor = 'white', 
    showTime = true, 
    showDate = true,
    layout = 'column'
}) => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const hours24 = time.getHours();
    const isPM = hours24 >= 12;
    
    let displayHours = hours24;
    if (format === '12h') {
        displayHours = hours24 % 12 || 12;
    }

    const hours = displayHours.toString().padStart(2, '0');
    const minutes = time.getMinutes().toString().padStart(2, '0');
    const seconds = time.getSeconds().toString().padStart(2, '0');
    
    const locale = language === 'ar' ? 'ar-EG' : 'en-GB';
    const dateStr = time.toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
        .replace(/[٠١٢٣٤٥٦٧٨٩]/g, d => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)]);

    const sizeMap = {
        sm: { main: 'text-[34px]', sub: 'text-[18px]' },
        md: { main: 'text-[38px]', sub: 'text-[20px]' },
        lg: { main: 'text-[44px]', sub: 'text-[22px]' },
        xl: { main: 'text-[52px]', sub: 'text-[26px]' }
    };
    const currentSize = sizeMap[size];

    return (
        <div className={`flex flex-col items-center justify-center gap-0`} style={{ fontVariantNumeric: 'lining-nums' }}>
             {showTime && (
                 <div 
                    className={`flex items-baseline gap-1 font-bold font-sans tracking-widest drop-shadow-md leading-none ${currentSize.main}`} 
                    dir="ltr"
                    style={{ color: textColor, fontFamily: 'Inter, sans-serif' }}
                 >
                     <span>{hours}</span>
                     <span className="animate-pulse">:</span>
                     <span>{minutes}</span>
                     <div className="flex flex-col text-sm ml-1">
                         <span style={{ color: textColor, opacity: 0.8 }} className="mb-0 text-[12px]">{seconds}</span>
                         {format === '12h' && <span style={{ color: textColor, opacity: 0.8 }} className="font-cairo font-bold text-[10px]">{isPM ? (language === 'ar' ? 'م' : 'PM') : (language === 'ar' ? 'ص' : 'AM')}</span>}
                     </div>
                 </div>
             )}
             
             {showDate && (
                 <div 
                    className={`font-cairo font-bold bg-white/10 px-3 py-0.5 rounded-full backdrop-blur-sm border border-white/20 leading-snug mt-1 ${currentSize.sub}`}
                    style={{ color: textColor, fontFamily: 'Inter, Cairo, sans-serif' }}
                 >
                     {dateStr}
                 </div>
             )}

             {user && (
                 <div className={`mt-1 flex items-center gap-2 bg-black/20 px-3 py-0.5 rounded-lg backdrop-blur-md border border-white/10 text-[16px] font-bold font-cairo leading-snug`} style={{ color: textColor, opacity: 0.9 }}>
                     <UserCircle2 size={16} />
                     <span>{user.name}</span>
                 </div>
             )}
        </div>
    );
};

export const MainPage: React.FC = () => {
  const { t, user, uiConfig, settings } = useApp();
  const navigate = useNavigate();
  // Fix: Added missing properties logoRightWidth, logoLeftWidth, and fontFamily to default mainConfig object
  const mainConfig = settings.mainScreenSettings || { 
      title: 'الشاشة الرئيسية', 
      logoRight: '', 
      logoLeft: '', 
      alignment: 'center' as const, 
      showClock: true, 
      clockFormat: '12h' as const,
      headerBackground: 'linear-gradient(to left, #1e3a8a, #1d4ed8)',
      headerTextColor: '#ffffff',
      clockSize: 'sm' as const,
      titleFontSize: 'lg' as const,
      showTime: true,
      showDate: true,
      clockLayout: 'column' as const,
      clockVerticalAlign: 'center' as const,
      clockPosition: 'default' as const,
      headerHeight: 130,
      logoRightWidth: 60,
      logoLeftWidth: 60,
      fontFamily: 'cairo' as const
  };

  const handleAction = (action: string) => {
    if (action.startsWith('navigate:')) {
      const path = action.split(':')[1];
      navigate(path);
    }
  };

  const hasLogoRight = !!mainConfig.logoRight;
  const hasLogoLeft = !!mainConfig.logoLeft;
  const showClock = mainConfig.showClock !== false;
  const clockPos = mainConfig.clockPosition || 'default';

  let fontClass = 'font-cairo';
  if (mainConfig.fontFamily === 'inter') fontClass = 'font-sans';
  if (mainConfig.fontFamily === 'mono') fontClass = 'font-mono';
  if (mainConfig.fontFamily === 'serif') fontClass = 'font-serif';

  const titleSizeClass = {
      sm: 'text-lg',
      md: 'text-xl',
      lg: 'text-[33px] leading-tight', 
      xl: 'text-5xl'
  }[mainConfig.titleFontSize || 'lg'];

  const renderClock = () => (
      <DigitalClock 
          format={mainConfig.clockFormat} 
          language={settings.language} 
          user={user} 
          size={mainConfig.clockSize}
          textColor={mainConfig.headerTextColor}
          showTime={mainConfig.showTime}
          showDate={mainConfig.showDate}
          layout="column"
      />
  );

  return (
    <div className="p-6">
      <GlassCard 
        className={`mb-6 border-none py-2 px-4 shadow-xl relative overflow-hidden transition-all duration-500`}
        style={{ 
            background: mainConfig.headerBackground || 'linear-gradient(to left, #1e3a8a, #1d4ed8)',
            color: mainConfig.headerTextColor || '#ffffff',
            minHeight: `${mainConfig.headerHeight || 130}px`,
            display: 'flex',
            alignItems: 'center'
        }}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center z-0 pointer-events-none">
            <h1 className={`${titleSizeClass} font-bold ${fontClass} drop-shadow-md text-center px-4`}>
                {mainConfig.title || 'الشاشة الرئيسية'}
            </h1>
            {showClock && clockPos === 'under-title' && (
                <div className="mt-1 pointer-events-auto">
                    {renderClock()}
                </div>
            )}
        </div>

        <div className="relative z-10 w-full flex justify-between items-center h-full pointer-events-none">
            <div className="flex items-center gap-4 pointer-events-auto h-full">
                {hasLogoRight && (
                    <div 
                        className="bg-white/10 rounded-lg backdrop-blur-sm p-1 shadow-lg shrink-0 border border-white/20 transition-all duration-300 flex items-center justify-center overflow-hidden"
                        style={{ 
                            width: `${mainConfig.logoRightWidth || 60}px`, 
                            height: `${mainConfig.logoRightWidth || 60}px`,
                            maxHeight: '100%' 
                        }}
                    >
                        <img src={mainConfig.logoRight} alt="Right Logo" className="w-full h-full object-contain" />
                    </div>
                )}
                {showClock && clockPos === 'under-logo-right' && renderClock()}
            </div>

            <div className="flex items-center gap-4 pointer-events-auto h-full">
                {showClock && clockPos === 'default' && (
                     <div className="pl-0">
                        {renderClock()}
                     </div>
                )}
                
                {hasLogoLeft && (
                    <div 
                        className="bg-white/10 rounded-lg backdrop-blur-sm p-1 shadow-lg shrink-0 border border-white/20 transition-all duration-300 flex items-center justify-center overflow-hidden"
                        style={{ 
                            width: `${mainConfig.logoLeftWidth || 60}px`, 
                            height: `${mainConfig.logoLeftWidth || 60}px`,
                            maxHeight: '100%'
                        }}
                    >
                        <img src={mainConfig.logoLeft} alt="Left Logo" className="w-full h-full object-contain" />
                    </div>
                )}
                {showClock && clockPos === 'under-logo-left' && renderClock()}
            </div>
        </div>
      </GlassCard>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" dir="rtl">
        {uiConfig.main.buttons.map((btn) => {
          const Icon = getIcon(btn.icon);
          const label = settings.language === 'ar' 
             ? (btn.labelAr || t(btn.labelKey))
             : (btn.labelEn || t(btn.labelKey));

          return (
            <GlassCard 
              key={btn.id}
              className={`group cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-2 border-transparent hover:border-blue-300 flex flex-col items-center text-center gap-4 p-6 min-h-[180px] ${!btn.isVisible ? 'hidden' : ''}`}
              onClick={() => handleAction(btn.action)}
            >
              <div className={`p-4 rounded-2xl ${btn.color} text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                <Icon size={36} />
              </div>
              <div className="w-full">
                 <h3 className="text-[18px] font-black font-cairo text-gray-800 group-hover:text-blue-700 transition-colors leading-tight">{label}</h3>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
};