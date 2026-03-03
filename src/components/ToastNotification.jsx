import { useState, createContext, useContext } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext();

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'info', duration = 3000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    if (duration > 0) {
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
    }
  };

  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, onClose }) {
  const icons = { success: CheckCircle, error: AlertCircle, info: Info };
  const colors = { success: 'bg-emerald-500', error: 'bg-rose-500', info: 'bg-blue-500' };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map(toast => {
        const Icon = icons[toast.type];
        return (
          <div key={toast.id} className={`${colors[toast.type]} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px]`}>
            <Icon size={20} />
            <p className="flex-1 text-sm">{toast.message}</p>
            <button onClick={() => onClose(toast.id)} className="hover:bg-white/20 rounded p-1">
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
