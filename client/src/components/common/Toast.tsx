import React, { createContext, useContext, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';
interface Toast { id: string; type: ToastType; message: string; }

interface ToastContextValue {
  toast: (type: ToastType, message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const icons = { success: CheckCircle, error: XCircle, info: Info };
const styles = {
  success: 'border-green-500/30 bg-green-500/10 text-green-400',
  error:   'border-red-500/30 bg-red-500/10 text-red-400',
  info:    'border-blue-500/30 bg-blue-500/10 text-blue-400',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = (id: string) => setToasts(t => t.filter(x => x.id !== id));

  const toast = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, type, message }]);
    setTimeout(() => dismiss(id), 4000);
  }, []);

  const success = useCallback((m: string) => toast('success', m), [toast]);
  const error = useCallback((m: string) => toast('error', m), [toast]);
  const info = useCallback((m: string) => toast('info', m), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, info }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 max-w-sm w-full">
        <AnimatePresence>
          {toasts.map(t => {
            const Icon = icons[t.type];
            return (
              <motion.div key={t.id}
                initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 60 }}
                className={`flex items-start gap-3 p-3.5 rounded-xl border glass ${styles[t.type]}`}
              >
                <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-slate-200 flex-1">{t.message}</p>
                <button onClick={() => dismiss(t.id)} className="text-slate-500 hover:text-slate-300">
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
