
import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { dbService } from '../services/storage';
import { GlassCard, GlassInput, GlassButton, ConfirmModal } from '../components/NeumorphicUI';
import { 
    CreditCard, Plus, Trash2, Search, Calendar, 
    ChevronLeft, DollarSign, Wallet, Activity,
    Save, X, FileText, User, Tag, History as HistoryIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Expense } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

const forceEnNumsStyle = {
    fontFamily: 'Inter, sans-serif',
    fontVariantNumeric: 'lining-nums',
    direction: 'ltr' as const,
    fontSize: '12px'
};

export const Expenses: React.FC = () => {
    const { settings, t, user, addNotification } = useApp();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const [form, setForm] = useState<Partial<Expense>>({
        date: new Date().toISOString().split('T')[0],
        category: settings.expenseCategories?.[0] || 'أخرى',
        amount: 0,
        payee: '',
        description: ''
    });

    const expenses = dbService.getExpenses();

    const filteredExpenses = useMemo(() => {
        return expenses.filter(e => 
            e.payee.toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.category.toLowerCase().includes(searchTerm.toLowerCase())
        ).reverse();
    }, [expenses, searchTerm]);

    const totalAmount = useMemo(() => 
        filteredExpenses.reduce((sum, e) => sum + e.amount, 0),
    [filteredExpenses]);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.amount || form.amount <= 0 || !form.payee) {
            return alert('يرجى إكمال البيانات الأساسية');
        }

        const newExpense: Expense = {
            id: Date.now().toString(),
            date: form.date || new Date().toISOString().split('T')[0],
            category: form.category || 'أخرى',
            amount: Number(form.amount),
            payee: form.payee,
            description: form.description,
            user: user?.name || 'Admin'
        };

        dbService.saveExpense(newExpense);
        addNotification('تم تسجيل المصروف بنجاح', 'success');
        setShowAddForm(false);
        setForm({
            date: new Date().toISOString().split('T')[0],
            category: settings.expenseCategories?.[0] || 'أخرى',
            amount: 0,
            payee: '',
            description: ''
        });
    };

    const handleDelete = () => {
        if (deleteId) {
            dbService.deleteExpense(deleteId);
            addNotification('تم حذف المصروف', 'warning');
            setDeleteId(null);
        }
    };

    return (
        <div className="p-4 space-y-4 font-cairo" dir="rtl">
            <ConfirmModal 
                isOpen={!!deleteId} 
                onClose={() => setDeleteId(null)} 
                onConfirm={handleDelete} 
                title="حذف مصروف" 
                message="هل أنت متأكد من حذف هذا السجل المالي؟" 
                confirmText="حذف" 
                cancelText="إلغاء" 
            />

            {/* Header */}
            <div className="bg-gradient-to-l from-rose-50 via-white to-rose-50 border-y-4 border-rose-600 shadow-premium px-6 py-3 flex items-center justify-between h-20 animate-fade-in mb-4 rounded-2xl">
                 <button onClick={() => navigate('/')} className="flex items-center gap-2 bg-[#1e293b] hover:bg-black text-white px-5 py-2 rounded-xl font-black transition-all active:scale-95 group border border-slate-700/50 text-xs">
                    <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" /> 
                    <span>رجوع</span>
                 </button>
                 <div className="text-center">
                    <h1 className="text-2xl font-black text-rose-900 leading-tight drop-shadow-sm">{t('expenses')}</h1>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">إدارة المصروفات التشغيلية والنثريات</p>
                 </div>
                 <div className="p-2.5 bg-white border border-rose-100 text-rose-600 rounded-xl shadow-md shrink-0"><CreditCard size={24}/></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                
                {/* Left: Summary & Stats */}
                <div className="lg:col-span-4 space-y-4">
                    <GlassCard className="bg-rose-600 text-white p-6 rounded-2xl border-none shadow-xl flex flex-col items-center justify-center gap-2 text-center h-32">
                        <div className="p-2 bg-white/20 rounded-full shadow-inner"><Wallet size={32}/></div>
                        <div>
                            <p className="text-[10px] font-bold opacity-80 mb-0.5">إجمالي المصروفات</p>
                            <h2 className="text-2xl font-black" style={forceEnNumsStyle}>{totalAmount.toLocaleString()} <span className="text-sm">{settings.currency}</span></h2>
                        </div>
                    </GlassCard>

                    <GlassCard className="p-4 rounded-xl border-none shadow-lg">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-black text-slate-800 text-sm">أدوات التحكم</h3>
                            <Activity className="text-rose-500" size={16}/>
                        </div>
                        <button 
                            onClick={() => setShowAddForm(true)}
                            className="w-full bg-emerald-600 text-white py-2.5 rounded-xl font-black text-sm shadow-md hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 active:scale-95 mb-3"
                        >
                            <Plus size={18}/> تسجيل مصروف
                        </button>
                        <div className="relative">
                            <input 
                                className="w-full pr-9 pl-3 py-2 rounded-xl border-2 border-slate-100 outline-none focus:border-rose-400 font-bold text-xs bg-slate-50 shadow-inner"
                                placeholder="بحث سريع..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                            <Search className="absolute right-2.5 top-2.5 text-slate-300" size={16}/>
                        </div>
                    </GlassCard>
                </div>

                {/* Right: Table */}
                <div className="lg:col-span-8">
                    <GlassCard className="p-0 rounded-2xl border-none shadow-xl overflow-hidden min-h-[400px] flex flex-col bg-white">
                        <div className="bg-slate-900 p-4 text-white flex justify-between items-center">
                            <h3 className="font-black text-xs flex items-center gap-2"><HistoryIcon size={16} className="text-rose-400"/> سجل الحركات المالية</h3>
                            <span className="bg-rose-600 px-3 py-0.5 rounded-full text-[10px] font-black">{filteredExpenses.length} سجل</span>
                        </div>
                        <div className="flex-1 overflow-x-auto">
                            <table className="w-full text-center border-collapse text-xs">
                                <thead className="bg-slate-50 text-slate-400 text-[9px] font-black uppercase tracking-widest border-b h-10">
                                    <tr>
                                        <th className="p-3">التاريخ</th>
                                        <th className="p-3">الفئة</th>
                                        <th className="p-3 text-right">المستلم</th>
                                        <th className="p-3">المبلغ</th>
                                        <th className="p-3">حذف</th>
                                    </tr>
                                </thead>
                                <tbody className="text-xs font-bold text-slate-700">
                                    {filteredExpenses.map((exp) => (
                                        <tr key={exp.id} className="border-b border-slate-50 hover:bg-rose-50/20 h-11 transition-colors">
                                            <td className="p-3 font-mono text-slate-400" style={forceEnNumsStyle}>{exp.date}</td>
                                            <td className="p-3">
                                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[9px] font-black border border-slate-200">{exp.category}</span>
                                            </td>
                                            <td className="p-3 text-right font-black text-slate-900 truncate max-w-[120px]">{exp.payee}</td>
                                            <td className="p-3 text-rose-600 font-black text-sm" style={forceEnNumsStyle}>{exp.amount.toLocaleString()}</td>
                                            <td className="p-3">
                                                <button onClick={() => setDeleteId(exp.id)} className="text-slate-300 hover:text-rose-600 transition-colors"><Trash2 size={16}/></button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredExpenses.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-12 text-slate-200 font-black italic text-xl">لا توجد سجلات</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </GlassCard>
                </div>
            </div>

            {/* Add Expense Modal */}
            <AnimatePresence>
                {showAddForm && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border-t-4 border-rose-600">
                            <form onSubmit={handleSave} className="p-6 space-y-4">
                                <div className="text-center mb-4">
                                    <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mx-auto mb-2 shadow-inner">
                                        <Plus size={24} />
                                    </div>
                                    <h3 className="font-black text-lg text-slate-800">مصروف جديد</h3>
                                </div>
                                
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-[9px] font-black text-slate-400 mb-0.5 block mr-1 uppercase">المبلغ</label>
                                        <div className="relative">
                                            <input 
                                                type="number" 
                                                step="any" 
                                                required
                                                className="w-full p-3 rounded-xl border-none bg-slate-50 shadow-inner font-black text-xl text-center text-rose-600 outline-none focus:ring-2 focus:ring-rose-100"
                                                value={form.amount || ''}
                                                onChange={e => setForm({...form, amount: Number(e.target.value)})}
                                                autoFocus
                                                style={forceEnNumsStyle}
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[9px] font-black text-slate-400 mb-0.5 block mr-1 uppercase">التاريخ</label>
                                            <input type="date" className="w-full p-2.5 rounded-lg bg-slate-50 border-none font-bold text-[11px] outline-none" value={form.date} onChange={e => setForm({...form, date: e.target.value})} style={forceEnNumsStyle}/>
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black text-slate-400 mb-0.5 block mr-1 uppercase">الفئة</label>
                                            <select className="w-full p-2.5 rounded-lg bg-slate-50 border-none font-bold text-[11px] outline-none" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                                                {settings.expenseCategories?.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[9px] font-black text-slate-400 mb-0.5 block mr-1 uppercase">المستلم</label>
                                        <input className="w-full p-2.5 rounded-lg bg-slate-50 border-none font-bold text-xs outline-none shadow-inner" value={form.payee} onChange={e => setForm({...form, payee: e.target.value})} placeholder="الجهة المستلمة..."/>
                                    </div>

                                    <div>
                                        <label className="text-[9px] font-black text-slate-400 mb-0.5 block mr-1 uppercase">البيان</label>
                                        <textarea className="w-full p-2.5 rounded-lg bg-slate-50 border-none font-bold text-xs outline-none shadow-inner h-16 resize-none" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="ملاحظات..."/>
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <button type="button" onClick={() => setShowAddForm(false)} className="flex-1 py-2.5 bg-slate-100 rounded-xl text-slate-500 font-black text-xs hover:bg-slate-200 transition-all">إلغاء</button>
                                    <button type="submit" className="flex-[2] py-2.5 bg-rose-600 rounded-xl text-white font-black shadow-lg text-xs hover:bg-rose-700 transition-all active:scale-95">حفظ السجل</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
