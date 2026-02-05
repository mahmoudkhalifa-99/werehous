
import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { GlassCard } from '../components/NeumorphicUI';
import { Lock, User, Loader2, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Login: React.FC = () => {
  const { login, t, user } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
        setError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
        return;
    }

    setIsLoading(true);

    try {
      const result = await login(email.trim(), password);
      if (result) {
        setSuccess(true);
        // التوجيه يتم تلقائياً عبر useEffect عند تغير حالة user
      }
    } catch (err: any) {
      console.error("Auth Error Details:", err.code, err.message);
      let errMsg = 'خطأ في المصادقة السحابية';
      
      switch (err.code) {
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
        case 'auth/user-not-found':
          errMsg = 'بيانات الدخول غير صحيحة. يرجى التأكد من البريد وكلمة المرور.';
          break;
        case 'auth/invalid-email':
          errMsg = 'صيغة البريد الإلكتروني غير صحيحة.';
          break;
        case 'auth/user-disabled':
          errMsg = 'تم تعطيل هذا الحساب من قبل الإدارة.';
          break;
        case 'auth/network-request-failed':
          errMsg = 'تأكد من اتصالك بالإنترنت للمزامنة مع السحابة.';
          break;
        case 'auth/too-many-requests':
          errMsg = 'تم حظر الدخول مؤقتاً بسبب محاولات خاطئة متكررة. حاول لاحقاً.';
          break;
        default:
          errMsg = `فشل الدخول: ${err.code || 'خطأ غير معروف'}`;
      }
      setError(errMsg);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f2f5] p-4 font-cairo" dir="rtl">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <GlassCard className="flex flex-col gap-6 items-center py-12 px-10 shadow-2xl rounded-[3rem] border border-white">
          
          <div className="relative mb-2">
            <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full"></div>
               <div className="w-24 h-24 bg-gradient-to-tr from-blue-600 to-indigo-700 rounded-[2.5rem] flex items-center justify-center shadow-xl relative z-10 border-4 border-white/50">
                  {isLoading ? <Loader2 className="text-white w-10 h-10 animate-spin" /> : <Lock className="text-white w-10 h-10" />}
               </div>
          </div>
          
          <div className="text-center">
            <h1 className="text-3xl font-black text-slate-800 mb-1">دخول النظام السحابي</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Cloud Enterprise Solution 2026</p>
          </div>
          
          <form onSubmit={handleLogin} className="w-full flex flex-col gap-5 mt-4">
            
            <AnimatePresence mode="wait">
                {error && (
                    <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="bg-red-50 text-red-600 p-4 rounded-2xl border border-red-100 flex items-start gap-3 text-sm font-bold shadow-sm"
                    >
                        <AlertCircle size={20} className="shrink-0 mt-0.5" />
                        <span>{error}</span>
                    </motion.div>
                )}
                {success && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-emerald-50 text-emerald-600 p-4 rounded-2xl border border-emerald-100 flex items-center gap-3 text-sm font-bold shadow-sm"
                    >
                        <CheckCircle2 size={20} className="shrink-0" />
                        <span>تم التحقق.. جاري مزامنة بياناتك</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="space-y-1">
              <label className="text-[11px] font-black text-slate-500 mr-2 uppercase tracking-wider flex items-center gap-1">
                <User size={12} /> البريد الإلكتروني
              </label>
              <input 
                type="email"
                value={email} 
                onChange={e => setEmail(e.target.value)}
                disabled={isLoading || success}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-slate-700 shadow-inner disabled:opacity-50"
                placeholder="user@dakahlia.net"
                required
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-[11px] font-black text-slate-500 mr-2 uppercase tracking-wider flex items-center gap-1">
                <Lock size={12} /> كلمة المرور
              </label>
              <input 
                type="password"
                value={password} 
                onChange={e => setPassword(e.target.value)}
                disabled={isLoading || success}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-slate-700 shadow-inner disabled:opacity-50"
                placeholder="••••••••"
                required
              />
            </div>

            <button 
              type="submit" 
              disabled={isLoading || success}
              className={`
                mt-4 w-full py-5 rounded-[1.5rem] font-black text-xl shadow-2xl transition-all flex items-center justify-center gap-3 relative overflow-hidden active:scale-95
                ${isLoading ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : success ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700 border-b-8 border-blue-900'}
              `}
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={28} />
                  <span>جاري التحقق...</span>
                </>
              ) : success ? (
                <>
                  <CheckCircle2 size={28} />
                  <span>اكتمل الدخول</span>
                </>
              ) : (
                <>
                  <span>تسجيل الدخول</span>
                  <div className="bg-white/20 p-1.5 rounded-lg">
                    <ArrowRight className="rotate-180" size={20} />
                  </div>
                </>
              )}
            </button>
          </form>
          
          <div className="mt-6 pt-6 border-t border-slate-100 w-full text-center">
             <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">© 2026 Al-Makhazen Secure Cloud Infrastructure</p>
          </div>
          
        </GlassCard>
      </motion.div>
    </div>
  );
};
