
import React, { useState, useEffect } from 'react';
import { motion, HTMLMotionProps, AnimatePresence } from 'framer-motion';
import { AlertCircle, X, Check, Info, AlertTriangle, Bell } from 'lucide-react';

interface Props extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  style?: React.CSSProperties;
}

export const GlassCard: React.FC<Props> = ({ children, className = '', onClick, ...props }) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className={`bg-white/60 backdrop-blur-lg rounded-xl shadow-neu-flat border border-white/40 p-4 ${className} ${onClick ? 'cursor-pointer' : ''}`}
    onClick={onClick}
    {...props}
  >
    {children}
  </motion.div>
);

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'danger' | 'default';
}

export const GlassButton: React.FC<ButtonProps> = ({ children, className = '', variant = 'default', ...props }) => {
  const baseStyle = "px-4 py-2 rounded-lg font-bold transition-all duration-300 transform active:scale-95 flex items-center justify-center gap-2 text-[14px]";
  
  const variants = {
    default: "bg-gray-100 text-gray-700 shadow-neu-flat hover:bg-gray-50 active:shadow-neu-pressed",
    primary: "bg-blue-500 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-600 active:shadow-inner",
    danger: "bg-red-500 text-white shadow-lg shadow-red-500/30 hover:bg-red-600 active:shadow-inner"
  };

  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const GlassInput: React.FC<InputProps> = ({ label, className = '', ...props }) => (
  <div className="flex flex-col gap-1 w-full text-right">
    {label && <label className="text-gray-600 text-[11px] font-bold ml-1">{label}</label>}
    <input 
      className={`bg-gray-100/50 rounded-lg px-3 py-2 outline-none border border-transparent focus:border-blue-400 focus:bg-white transition-all shadow-inner text-sm ${className}`}
      {...props} 
    />
  </div>
);

// --- Toast Component Updated with Auto-Dismiss Logic ---
export const Toast: React.FC<{ 
  message: string, 
  type: 'success' | 'error' | 'info' | 'warning', 
  onClose: () => void 
}> = ({ message, type, onClose }) => {
  
  // الإغلاق التلقائي بعد 5 ثوانٍ
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);

    return () => clearTimeout(timer); // تنظيف التوقيت عند إلغاء المكون
  }, [onClose]);

  const iconMap = {
    success: <Check size={16} className="text-emerald-500" />,
    error: <X size={16} className="text-rose-500" />,
    info: <Info size={16} className="text-blue-500" />,
    warning: <AlertTriangle size={16} className="text-amber-500" />
  };

  const bgMap = {
    success: 'bg-emerald-50 border-emerald-100',
    error: 'bg-rose-50 border-rose-100',
    info: 'bg-blue-50 border-blue-100',
    warning: 'bg-amber-50 border-amber-100'
  };

  return (
    <motion.div
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 100, opacity: 0 }}
      className={`flex items-center gap-2 p-3 rounded-lg border shadow-lg ${bgMap[type]} min-w-[250px] pointer-events-auto`}
    >
      <div className="bg-white p-1 rounded-full shadow-sm">
        {iconMap[type]}
      </div>
      <p className="flex-1 text-xs font-bold text-gray-800">{message}</p>
      <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
        <X size={14} />
      </button>
    </motion.div>
  );
};

export const ToastContainer: React.FC<{ 
  notifications: { id: string, message: string, type: any }[],
  onRemove: (id: string) => void 
}> = ({ notifications, onRemove }) => (
  <div className="fixed bottom-4 left-4 z-[10000] flex flex-col gap-2 pointer-events-none">
    <AnimatePresence mode="popLayout">
      {notifications.map(n => (
        <Toast key={n.id} message={n.message} type={n.type} onClose={() => onRemove(n.id)} />
      ))}
    </AnimatePresence>
  </div>
);

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
  isOpen, onClose, onConfirm, title, message, confirmText = 'حذف', cancelText = 'إلغاء' 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 backdrop-blur-md p-4 animate-fade-in">
        <motion.div 
           initial={{ scale: 0.9, opacity: 0 }}
           animate={{ scale: 1, opacity: 1 }}
           className="bg-white p-5 rounded-xl shadow-2xl max-w-sm w-full border border-gray-100"
        >
            <div className="flex items-center gap-2 mb-3 text-red-500">
                <AlertCircle size={22} />
                <h3 className="text-lg font-bold text-gray-800">{title}</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed font-medium">{message}</p>
            <div className="flex justify-end gap-2">
                <button 
                  onClick={onClose} 
                  className="px-4 py-2 rounded-lg text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  {cancelText}
                </button>
                <button 
                  onClick={() => { onConfirm(); onClose(); }} 
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-200 transition-colors"
                >
                  {confirmText}
                </button>
            </div>
        </motion.div>
    </div>
  );
};

interface InputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (value: string) => void;
  title: string;
  placeholder?: string;
}

export const InputModal: React.FC<InputModalProps> = ({ 
  isOpen, onClose, onSave, title, placeholder 
}) => {
  const [value, setValue] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    if (value.trim()) {
      onSave(value.trim());
      setValue('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
        <motion.div 
           initial={{ scale: 0.9, opacity: 0 }}
           animate={{ scale: 1, opacity: 1 }}
           className="bg-white p-5 rounded-xl shadow-2xl max-w-md w-full border border-gray-100"
        >
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-bold text-gray-800 font-cairo">{title}</h3>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
            </div>
            
            <GlassInput 
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
              autoFocus
              className="mb-4"
            />

            <div className="flex justify-end gap-2">
                <button 
                  onClick={onClose} 
                  className="px-4 py-2 rounded-lg text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  إلغاء
                </button>
                <button 
                  onClick={handleSave} 
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200 transition-colors flex items-center gap-1.5"
                >
                  <Check size={16} /> حفظ
                </button>
            </div>
        </motion.div>
    </div>
  );
};
