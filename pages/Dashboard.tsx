// Added useMemo to the imports from 'react'
import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { GlassCard, GlassButton } from '../components/NeumorphicUI';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
// Added Check to the imports from 'lucide-react'
import { Package, TrendingUp, ShoppingCart, DollarSign, Flame, Calculator, ArrowRightLeft, Sparkles, Loader2, X, Users, Clock, Calendar, AlertTriangle, ShieldAlert, Check } from 'lucide-react';
import { dbService } from '../services/storage';
import { useNavigate } from 'react-router-dom';
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from 'framer-motion';
import { SystemUser, Product } from '../types';

const StatCard: React.FC<{ title: string; value: string; subValue: string; icon: React.ReactNode; color: string }> = ({ title, value, subValue, icon, color }) => (
  <GlassCard className={`flex flex-col items-center justify-center p-6 gap-2 relative overflow-hidden group ${color} text-white border-none shadow-lg h-40`}>
    <div className="bg-white/20 p-3 rounded-full mb-1">
        {icon}
    </div>
    <h3 className="text-xl font-bold font-cairo text-center">{title}</h3>
    <h2 className="text-3xl font-bold">{value}</h2>
    <p className="text-white/80 text-sm">{subValue}</p>
    
    <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full group-hover:scale-110 transition-transform duration-500" />
    <div className="absolute -left-6 -top-6 w-20 h-20 bg-white/10 rounded-full group-hover:scale-110 transition-transform duration-500" />
  </GlassCard>
);

export const Dashboard: React.FC = () => {
  const { settings, t, addNotification } = useApp();
  const navigate = useNavigate();
  const sales = dbService.getSales() || [];
  const purchases = dbService.getPurchases() || [];
  const products = dbService.getProducts() || [];
  const users = dbService.getUsers() || [];

  // AI State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  
  // User History Modal State
  const [selectedUserForHistory, setSelectedUserForHistory] = useState<SystemUser | null>(null);
  const [userHistory, setUserHistory] = useState<any[]>([]);

  // 1. Calculate Top Stats
  const stockValue = products.reduce((sum, p) => sum + (p.stock * p.cost), 0);
  const totalSalesVal = sales.reduce((sum, s) => sum + s.total, 0);
  const totalPurchasesVal = purchases.reduce((sum, p) => sum + p.total, 0);
  const netProfit = totalSalesVal - totalPurchasesVal; 
  const margin = totalSalesVal > 0 ? ((netProfit / totalSalesVal) * 100).toFixed(1) : "0";

  // 2. Critical Inventory Alerts
  const lowStockItems = useMemo(() => products.filter(p => p.stock > 0 && p.stock <= (p.minStock || 10)), [products]);
  const outOfStockItems = useMemo(() => products.filter(p => p.stock <= 0), [products]);

  // 3. Top Moving Items
  const itemCounts: Record<string, number> = {};
  sales.forEach(s => s.items?.forEach(i => {
    if (i && i.name) {
      itemCounts[i.name] = (itemCounts[i.name] || 0) + i.quantity;
    }
  }));
  const topItems = Object.entries(itemCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  // 4. Chart Data
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
              As a business expert analyst, provide a "Strategic Health Briefing" for this GlassPOS system (Lang: ${settings.language}):
              - Financials: Stock Value ${stockValue}, Sales ${totalSalesVal}, Purchases ${totalPurchasesVal}, Net Profit ${netProfit} (Margin ${margin}%).
              - Inventory Health: ${lowStockItems.length} items are low stock, ${outOfStockItems.length} items are out of stock.
              - Market Demand: Top items are ${topItems.map(i => i[0]).join(', ')}.
              - Recent Trend: ${JSON.stringify(chartData)}

              Focus on: 
              1. One "Win" (what's going well).
              2. One "Risk" (what needs attention).
              3. One actionable "Smart Tip" for inventory optimization.
              Keep it concise, professional, and use bullet points.
          `;

          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: prompt
          });

          setAiInsight(response.text || 'Analysis complete.');
          addNotification('AI Briefing generated', 'success');
      } catch (error) {
          console.error(error);
          setAiInsight('Service currently unavailable. Please verify API key.');
          addNotification('AI Analysis failed', 'error');
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

  const handleUserClick = (user: SystemUser) => {
      setSelectedUserForHistory(user);
      const history = dbService.getUserHistory(user.id);
      setUserHistory(history);
  };

  return (
    <div className="p-6 space-y-6">
      
      {/* Header */}
      <GlassCard className="py-4 px-6 bg-white border-r-4 border-blue-900 shadow-sm flex flex-col items-center justify-center relative">
        <div className="absolute right-6 top-1/2 -translate-y-1/2">
            <GlassButton className="text-sm bg-slate-700 text-white hover:bg-slate-800" onClick={() => navigate('/')}>
                <span className="flex items-center gap-2 font-bold font-cairo">
                    <ArrowRightLeft size={16} className="rotate-180"/> {t('backToMain')}
                </span>
            </GlassButton>
        </div>
        <div className="text-center w-full flex flex-col items-center">
            <h1 className="text-[36px] font-bold text-blue-900 font-cairo flex items-center justify-center gap-2 leading-tight">
                {t('dashboard')} 
                <TrendingUp size={36} />
            </h1>
            <p className="text-gray-500 text-sm">نظرة استراتيجية ذكية على أداء النظام</p>
        </div>
        <div className="absolute left-6 top-1/2 -translate-y-1/2">
            <button 
                onClick={handleAiAnalysis}
                disabled={isAnalyzing}
                className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-4 py-2.5 rounded-xl font-black shadow-lg hover:shadow-indigo-500/30 transition-all active:scale-95 disabled:opacity-70"
            >
                {isAnalyzing ? <Loader2 size={18} className="animate-spin"/> : <Sparkles size={18} />}
                <span>Briefing AI</span>
            </button>
        </div>
      </GlassCard>

      {/* AI Insight Panel */}
      <AnimatePresence>
          {aiInsight && (
              <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
              >
                  <div className="bg-gradient-to-r from-violet-50 to-indigo-50 p-6 rounded-2xl border border-indigo-100 relative shadow-inner">
                      <button onClick={() => setAiInsight(null)} className="absolute top-4 right-4 text-indigo-400 hover:text-indigo-600"><X size={20}/></button>
                      <div className="flex gap-4">
                          <div className="bg-white p-3 rounded-full h-fit shadow-sm text-indigo-600">
                              <Sparkles size={24} />
                          </div>
                          <div className="flex-1">
                              <h3 className="text-lg font-bold text-indigo-900 mb-2">Smart Strategy Insights</h3>
                              <div className="prose prose-sm text-indigo-800 whitespace-pre-wrap font-medium leading-relaxed font-cairo">
                                  {aiInsight}
                              </div>
                          </div>
                      </div>
                  </div>
              </motion.div>
          )}
      </AnimatePresence>

      {/* Top Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" dir="rtl">
          <StatCard 
            title={t('stockValue')} 
            value={`${stockValue.toLocaleString()} ${settings.currency}`} 
            subValue={`${products.length} صنف مسجل`}
            icon={<Package size={24} />} 
            color="bg-cyan-400"
          />
          <StatCard 
            title={t('netProfit')} 
            value={`${netProfit.toLocaleString()} ${settings.currency}`} 
            subValue={`هامش ربح تقديري: ${margin}%`}
            icon={<TrendingUp size={24} />} 
            color="bg-pink-400"
          />
          <StatCard 
            title={t('totalSales')} 
            value={`${totalSalesVal.toLocaleString()} ${settings.currency}`} 
            subValue={`${sales.length} عملية بيع منفذة`}
            icon={<DollarSign size={24} />} 
            color="bg-emerald-400"
          />
          <StatCard 
            title={t('totalPurchases')} 
            value={`${totalPurchasesVal.toLocaleString()} ${settings.currency}`} 
            subValue={`${purchases.length} أمر شراء بضاعة`}
            icon={<ShoppingCart size={24} />} 
            color="bg-indigo-500"
          />
      </div>

      {/* Main Grid: Analysis & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" dir="rtl">
          
          {/* Smart Alerts & Team */}
          <div className="lg:col-span-3 space-y-6">
              {/* Critical Inventory Alerts */}
              <GlassCard className="flex flex-col p-4 bg-white border-l-4 border-rose-500 shadow-sm">
                  <h3 className="text-gray-700 font-bold font-cairo mb-4 flex items-center gap-2">
                      <AlertTriangle className="text-rose-500" size={20} /> تنبيهات المخزون
                  </h3>
                  <div className="space-y-3">
                      {outOfStockItems.length > 0 && (
                          <div className="bg-rose-50 p-3 rounded-xl flex items-center justify-between">
                              <span className="text-xs font-bold text-rose-700">أصناف نفدت</span>
                              <span className="bg-rose-600 text-white px-2 py-0.5 rounded-full text-xs font-black">{outOfStockItems.length}</span>
                          </div>
                      )}
                      {lowStockItems.length > 0 && (
                          <div className="bg-amber-50 p-3 rounded-xl flex items-center justify-between">
                              <span className="text-xs font-bold text-amber-700">تحت حد الطلب</span>
                              <span className="bg-amber-500 text-white px-2 py-0.5 rounded-full text-xs font-black">{lowStockItems.length}</span>
                          </div>
                      )}
                      {lowStockItems.length === 0 && outOfStockItems.length === 0 && (
                          <div className="py-6 text-center text-gray-400">
                             <Check className="mx-auto mb-1 text-emerald-500" size={24}/>
                             <p className="text-[10px] font-bold">المخزون في حالة آمنة</p>
                          </div>
                      )}
                  </div>
              </GlassCard>

              {/* Active Team */}
              <GlassCard className="flex-1 flex flex-col p-4 bg-gradient-to-br from-white to-blue-50 border border-blue-100">
                  <h3 className="text-gray-700 font-bold font-cairo mb-4 flex items-center gap-2 border-b border-blue-100 pb-2">
                      <Users className="text-blue-600" size={20} /> فريق العمل الميداني
                  </h3>
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[300px]">
                      {users.map((u) => {
                          const status = getUserStatus(u.lastActive);
                          return (
                              <div 
                                  key={u.id} 
                                  onClick={() => handleUserClick(u)}
                                  className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm hover:shadow-md cursor-pointer transition-all group"
                              >
                                  <div className="relative">
                                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                                          {u.name.charAt(0)}
                                      </div>
                                      <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                                          status === 'online' ? 'bg-green-500' : status === 'away' ? 'bg-yellow-500' : 'bg-gray-400'
                                      }`} title={status}></span>
                                  </div>
                                  <div className="flex-1 overflow-hidden">
                                      <h4 className="font-bold text-sm text-gray-800 truncate">{u.name}</h4>
                                      <p className="text-[10px] text-gray-400 capitalize">{u.role}</p>
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              </GlassCard>
          </div>

          {/* Charts (Remaining Space) */}
          <GlassCard className="lg:col-span-6 flex flex-col h-[460px]">
              <h3 className="text-gray-700 font-bold font-cairo mb-4 flex items-center gap-2">
                  <TrendingUp className="text-green-600" size={18} /> {t('purchasesVsSales')}
              </h3>
              <div className="flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <defs>
                              <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                              </linearGradient>
                          </defs>
                          <XAxis dataKey="name" />
                          <YAxis />
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <Tooltip contentStyle={{borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                          <Area type="monotone" dataKey="sales" stroke="#10b981" fillOpacity={1} fill="url(#colorSales)" name={t('sales')} />
                          <Area type="monotone" dataKey="purchases" stroke="#6366f1" fillOpacity={1} fill="url(#colorPurchases)" name={t('purchases')} />
                      </AreaChart>
                  </ResponsiveContainer>
              </div>
          </GlassCard>

          {/* Top Moving Items */}
          <div className="lg:col-span-3">
              <GlassCard className="h-full flex flex-col overflow-hidden">
                  <h3 className="text-gray-700 font-bold font-cairo mb-4 flex items-center gap-2 border-b pb-2">
                      <Flame className="text-orange-500" size={18} /> {t('topMovingItems')}
                  </h3>
                  <div className="flex-1 overflow-y-auto space-y-3">
                      {topItems.length > 0 ? topItems.map(([name, count], idx) => (
                          <div key={idx} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-transparent hover:border-orange-100 transition-all">
                              <span className="text-xs font-bold text-gray-700 truncate w-2/3">{name}</span>
                              <span className="text-xs font-black bg-orange-100 text-orange-600 px-3 py-1 rounded-full">{count}</span>
                          </div>
                      )) : (
                          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                              {t('noData')}
                          </div>
                      )}
                  </div>
              </GlassCard>
          </div>
      </div>

      {/* User History Modal */}
      <AnimatePresence>
          {selectedUserForHistory && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in" dir="rtl">
                  <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden"
                  >
                      <div className="bg-blue-600 p-4 text-white flex justify-between items-center shrink-0">
                          <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg">
                                  {selectedUserForHistory.name.charAt(0)}
                              </div>
                              <div>
                                  <h3 className="font-bold text-lg">{selectedUserForHistory.name}</h3>
                                  <p className="text-xs text-blue-100 opacity-80">سجل النشاطات (آخر 30 يوم)</p>
                              </div>
                          </div>
                          <button onClick={() => setSelectedUserForHistory(null)} className="hover:bg-white/20 p-2 rounded-full transition-colors"><X size={20}/></button>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4">
                          {userHistory.length === 0 ? (
                              <div className="text-center text-gray-400 py-10 flex flex-col items-center gap-2">
                                  <Clock size={40} className="opacity-20"/>
                                  <p>لا يوجد نشاط مسجل</p>
                              </div>
                          ) : (
                              userHistory.map((item, idx) => (
                                  <div key={idx} className="flex gap-4 relative">
                                      {idx !== userHistory.length - 1 && <div className="absolute top-8 right-[19px] w-0.5 h-full bg-gray-200 -z-0"></div>}
                                      
                                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 border-4 border-white shadow-sm ${
                                          item.type === 'بيع' ? 'bg-green-100 text-green-600' : 
                                          item.type === 'شراء' ? 'bg-blue-100 text-blue-600' : 
                                          'bg-orange-100 text-orange-600'
                                      }`}>
                                          {item.type === 'بيع' ? <DollarSign size={18}/> : item.type === 'شراء' ? <ShoppingCart size={18}/> : <Package size={18}/>}
                                      </div>
                                      
                                      <div className="flex-1 bg-white p-3 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                          <div className="flex justify-between items-start mb-1">
                                              <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                                                  item.type === 'بيع' ? 'bg-green-50 text-green-700' : 
                                                  item.type === 'شراء' ? 'bg-blue-50 text-blue-700' : 
                                                  'bg-orange-50 text-orange-700'
                                              }`}>{item.type}</span>
                                              <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                                  <Calendar size={10}/> {new Date(item.date).toLocaleDateString('en-GB')} {new Date(item.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                              </span>
                                          </div>
                                          <p className="text-sm font-bold text-gray-800">{item.details}</p>
                                          <p className="text-xs text-gray-400 mt-1 font-mono">{item.id}</p>
                                      </div>
                                  </div>
                              ))
                          )}
                      </div>
                  </motion.div>
              </div>
          )}
      </AnimatePresence>
    </div>
  );
};