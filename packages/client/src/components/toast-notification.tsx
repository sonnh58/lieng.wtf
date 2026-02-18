import { useState, useEffect, useCallback } from 'react';

interface Toast {
  id: number;
  message: string;
  type: 'error' | 'info' | 'success';
}

let toastId = 0;
const listeners: Array<(toast: Toast) => void> = [];

export function showToast(message: string, type: Toast['type'] = 'error') {
  const toast: Toast = { id: ++toastId, message, type };
  listeners.forEach((fn) => fn(toast));
}

const STYLES: Record<Toast['type'], string> = {
  error: 'bg-[--color-accent] text-white',
  info: 'bg-[--color-primary] text-white',
  success: 'bg-[--color-success] text-white',
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Toast) => {
    setToasts((prev) => [...prev.slice(-4), toast]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== toast.id)), 3000);
  }, []);

  useEffect(() => {
    listeners.push(addToast);
    return () => {
      const idx = listeners.indexOf(addToast);
      if (idx >= 0) listeners.splice(idx, 1);
    };
  }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 safe-bottom">
      {toasts.map((t) => (
        <div key={t.id} className={`px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium animate-slide-up ${STYLES[t.type]}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
