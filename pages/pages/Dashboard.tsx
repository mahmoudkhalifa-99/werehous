
import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { GlassCard, GlassButton } from '../components/NeumorphicUI';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Package, TrendingUp, ShoppingCart, DollarSign, Flame, Calculator, ArrowRightLeft, Sparkles, Loader2, X, Users, Clock, Calendar, AlertTriangle, ShieldAlert, Check, Activity, Zap } from 'lucide-react';
import { dbService } from '../services/storage';
import { useNavigate } from 'react-router-dom';
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from 'framer-motion';
import { SystemUser, Product } from '../types';

const StatCard: React.FC<{ title: string; value: string; subValue: string; icon: React.ReactNode; color: string }> = ({ title, value, subValue, icon, color }) => (
  <GlassCard className={`flex flex-col items-center justify-center p-4 gap-1 relative overflow-hidden group ${color} text-white border-none shadow-lg h-28`}>
    <div className="bg-white/20 p-2 rounded-full mb-0.5">
        {React.cloneElement(icon as React.ReactElement, { size: 18 })}
    </div>
    <h3 className="text-sm font-bold font-cairo text-center">{title}</h3>
    <h2 className="text-xl font-bold">{value}</h2>
    <p className="text-white/80 text-[10px]">{subValue}</p>
    
    <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-white/10 rounded-full group-hover:scale-110 transition-transform duration-500" />
    <div className="absolute -left-6 -top-6 w-12 h-12 bg-white/10 rounded-full group-hover:scale-110 transition-transform duration-500" />
  </GlassCard>
);

export const Dashboard: React.FC = () => {
  const { settings, t, addNotification } = useApp();
  const navigate = useNavigate();
  const sales = dbService.getSales() || [];
  const purchases = dbService.getPurchases() || [];
  const products = dbService.getProducts() || [];
  const users = dbService.getUsers() || [];
  const movements = dbService.getMovements() || [];

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [selectedUserForHistory, setSelectedUserForHistory] = useState<SystemUser | null>(null);
  const [userHistory, setUserHistory] = useState<any[]>([]);

  const stockValue = products.reduce((sum, p) => sum + (p.stock * p.cost), 0);
  const totalSalesVal = sales.reduce((sum, s) => sum + s.total, 0);
  const totalPurchasesVal = purchases.reduce((sum, p) => sum + p.total, 0);
  const netProfit = totalSalesVal - totalPurchasesVal; 
  const margin = totalSalesVal > 0 ? ((netProfit / totalSalesVal) * 100).toFixed(1) : "0";

  const lowStockItems = useMemo(() => products.filter(p => p.stock > 0 && p.stock <= (p.minStock || 10)), [products]);
  const outOfStockItems = useMemo(() => products.filter(p => p.stock <= 0), [products]);

  const itemCounts: Record<string, number> = {};
  sales.forEach(s => s.items?.forEach(i => {
    if (i && i.name) {
      itemCounts[i.name] = (itemCounts[i.name] || 0) + i.quantity;
    }
  }));
  const topItems = Object.entries(itemCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return d.toISOString().slice(0, 7);
  }).reverse();

  const chartData = months.map(month => {
    const monthlySales = sales
      .filter(s => s.date && s.date.startsWith(month))
      .reduce((sum, s) => sum + s.total, 0);
    const monthlyPurchases = purchases
      .filter(p => p.date && p.date.startsWith(month))
      .reduce((sum, p) => sum + p.total, 0);
    return {
      name: month,
      sales: monthlySales,
      purchases: monthlyPurchases
    };
  });

  const handleAiAnalysis = async () => {
      setIsAnalyzing(true);
      setAiInsight(null);
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const prompt = `
              As a Dakahlya Warehouse System Analyst (Lang: ${settings.language}):
              - Financials: Stock Value ${stockValue}, Sales ${totalSalesVal}, Purchases ${totalPurchasesVal}, Net Profit ${netProfit}.
              - Inventory Health: ${lowStockItems.length} items low, ${outOfStockItems.length} out of stock.
              - Latest Movements: ${movements.length} records.
              - Market Demand: ${topItems.map(i => i[0]).join(', ')}.

              Provide a 3-point briefing:
              1. 📈 Business Momentum (Sales trend).
              2. ⚠️ Critical Risk (Low/Out stock).
              3. 💡 Optimization Tip.
              Keep it professional and concise.
          `;

          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: prompt
          });

          setAiInsight(response.text || 'No insights generated.');
      } catch (error) {
          setAiInsight('AI service temporarily busy. Please try again.');
      } finally {
          setIsAnalyzing(false);
      }
  };

  const getUserStatus = (lastActive?: string) => {
      if (!lastActive) return 'offline';
      const diff = new Date().getTime() - new Date(lastActive).getTime();
      if (diff < 5 * 60 * 1000) return 'online'; 
      if (diff < 60 * 60 * 1000) return 'away'; 
      return 'offline';
  };

  return (
    <div className="p-4 space-y-4">
      <GlassCard className="py-3 px-4 bg-white border-r-4 border-blue-900 shadow-sm flex flex-col items-center justify-center relative">
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <GlassButton className="text-xs bg-slate-700 text-white hover:bg-slate-800 py-1.5 px-3" onClick={() => navigate('/')}>
                <span className="flex items-center gap-1.5 font-bold font-cairo">
                    <ArrowRightLeft size={14} className="rotate-180"/> {t('backToMain')}
                </span>
            </GlassButton>
        </div>
        <div className="text-center w-full flex flex-col items-center">
            <h1 className="text-xl font-bold text-blue-900 font-cairo flex items-center justify-center gap-2 leading-tight">
                {t('dashboard')} 
                <Activity size={24} className="text-indigo-500" />
            </h1>
            <p className="text-gray-400 text-[10px]">نظام التحليلات الذكي - دقهلية POS</p>
        </div>
        <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <button 
                onClick={handleAiAnalysis}
                disabled={isAnalyzing}
                className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-3 py-1.5 rounded-lg font-black shadow-md hover:shadow-indigo-500/20 transition-all active:scale-95 disabled:opacity-70 text-[10px]"
            >
                {isAnalyzing ? <Loader2 size={14} className="animate-spin"/> : <Sparkles size={14} />}
                <span>AI Briefing</span>
            </button>
        </div>
      </GlassCard>

      <AnimatePresence>
          {aiInsight && (
              <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                  <div className="bg-indigo-900 text-indigo-50 p-4 rounded-2xl border border-white/10 relative shadow-xl overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles size={80}/></div>
                      <button onClick={() => setAiInsight(null)} className="absolute top-3 right-3 hover:bg-white/10 p-1 rounded-full"><X size={16}/></button>
                      <div className="flex gap-4 relative z-10">
                          <div className="bg-white/20 p-3 rounded-2xl h-fit border border-white/20"><Zap size={24} className="text-yellow-300"/></div>
                          <div className="flex-1">
                              <h3 className="text-base font-black mb-2 flex items-center gap-2">AI Strategic Briefing</h3>
                              <div className="prose prose-invert max-w-none text-indigo-100 font-bold font-cairo leading-relaxed whitespace-pre-wrap text-xs">
                                  {aiInsight}
                              </div>
                          </div>
                      </div>
                  </div>
              </motion.div>
          )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" dir="rtl">
          <StatCard title={t('stockValue')} value={`${stockValue.toLocaleString()} ${settings.currency}`} subValue={`${products.length} صنف`} icon={<Package />} color="bg-[#0ea5e9]" />
          <StatCard title={t('netProfit')} value={`${netProfit.toLocaleString()} ${settings.currency}`} subValue={`ربحية: ${margin}%`} icon={<TrendingUp />} color="bg-[#f43f5e]" />
          <StatCard title={t('totalSales')} value={`${totalSalesVal.toLocaleString()} ${settings.currency}`} subValue={`${sales.length} مبيعات`} icon={<DollarSign />} color="bg-[#10b981]" />
          <StatCard title={t('totalPurchases')} value={`${totalPurchasesVal.toLocaleString()} ${settings.currency}`} subValue={`${purchases.length} مشتريات`} icon={<ShoppingCart />} color="bg-[#6366f1]" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4" dir="rtl">
          <div className="lg:col-span-3 space-y-4">
              <GlassCard className="p-4 border-l-4 border-rose-500">
                  <h3 className="text-slate-700 font-black mb-3 flex items-center gap-2 text-xs"><AlertTriangle className="text-rose-500" size={16} /> تنبيهات عاجلة</h3>
                  <div className="space-y-2">
                      {outOfStockItems.length > 0 && <div className="bg-rose-50 p-2 rounded-lg flex justify-between items-center">
                          <span className="text-[10px] font-bold text-rose-700">أصنف منتهية</span>
                          <span className="bg-rose-600 text-white px-2 py-0.5 rounded-full text-[10px] font-black">{outOfStockItems.length}</span>
                      </div>}
                      {lowStockItems.length > 0 && <div className="bg-amber-50 p-2 rounded-lg flex justify-between items-center">
                          <span className="text-[10px] font-bold text-amber-700">تحت الطلب</span>
                          <span className="bg-amber-500 text-white px-2 py-0.5 rounded-full text-[10px] font-black">{lowStockItems.length}</span>
                      </div>}
                  </div>
              </GlassCard>
              <GlassCard className="p-4 flex-1 bg-gradient-to-br from-white to-indigo-50/30">
                  <h3 className="text-slate-700 font-black mb-3 flex items-center gap-2 border-b pb-2 text-xs"><Users className="text-indigo-600" size={16} /> الطاقم النشط</h3>
                  <div className="space-y-2 overflow-y-auto max-h-[220px] pr-1">
                      {users.map((u) => {
                          const status = getUserStatus(u.lastActive);
                          return (
                              <div key={u.id} className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-100 shadow-sm transition-all group hover:border-indigo-200">
                                  <div className="relative">
                                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-black text-xs">{u.name.charAt(0)}</div>
                                      <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${status === 'online' ? 'bg-emerald-500' : status === 'away' ? 'bg-amber-500' : 'bg-slate-400'}`}></span>
                                  </div>
                                  <div className="flex-1 truncate">
                                      <h4 className="font-black text-[10px] text-slate-800 leading-tight">{u.name}</h4>
                                      <p className="text-[8px] text-slate-400 capitalize">{u.role}</p>
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              </GlassCard>
          </div>

          <GlassCard className="lg:col-span-6 h-[400px] flex flex-col p-4">
              <h3 className="text-slate-700 font-black mb-3 flex items-center gap-2 text-xs"><Activity className="text-emerald-600" size={16} /> التدفق المالي</h3>
              <div className="flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                          <defs>
                              <linearGradient id="cSales" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                              <linearGradient id="cPurs" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 8, fontWeight: 'bold'}} />
                          <YAxis axisLine={false} tickLine={false} tick={{fontSize: 8}} />
                          <Tooltip contentStyle={{borderRadius: '0.75rem', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', fontSize: '10px'}} />
                          <Area type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={2} fill="url(#cSales)" name={t('sales')} />
                          <Area type="monotone" dataKey="purchases" stroke="#6366f1" strokeWidth={2} fill="url(#cPurs)" name={t('purchases')} />
                      </AreaChart>
                  </ResponsiveContainer>
              </div>
          </GlassCard>

          <div className="lg:col-span-3">
              <GlassCard className="h-full flex flex-col p-4">
                  <h3 className="text-slate-700 font-black mb-3 border-b pb-2 flex items-center gap-2 text-xs"><Flame className="text-orange-500" size={16} /> الرائجة</h3>
                  <div className="flex-1 space-y-2 overflow-y-auto max-h-[340px]">
                      {topItems.map(([name, count], idx) => (
                          <div key={idx} className="flex justify-between items-center bg-slate-50 p-2 rounded-xl border border-slate-100">
                              <span className="text-[10px] font-black text-slate-700 truncate w-2/3">{name}</span>
                              <span className="bg-indigo-600 text-white px-2 py-0.5 rounded-lg text-[9px] font-black">{count}</span>
                          </div>
                      ))}
                  </div>
              </GlassCard>
          </div>
      </div>
    </div>
  );
};
