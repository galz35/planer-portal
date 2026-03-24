import React, { useEffect } from 'react';
import { CheckCircle2, XCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
    message: string;
    type: ToastType;
    onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const bgColors = {
        success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
        error: 'bg-rose-50 border-rose-200 text-rose-800',
        info: 'bg-indigo-50 border-indigo-200 text-indigo-800',
        warning: 'bg-amber-50 border-amber-200 text-amber-800'
    };

    const icons = {
        success: <CheckCircle2 size={20} className="text-emerald-500" />,
        error: <XCircle size={20} className="text-rose-500" />,
        info: <CheckCircle2 size={20} className="text-indigo-500" />,
        warning: <CheckCircle2 size={20} className="text-amber-500" />
    };

    return (
        <div className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg shadow-black/5 animate-fade-in-up min-w-[300px] max-w-[90vw] ${bgColors[type]}`}>
            {icons[type]}
            <p className="flex-1 text-sm font-medium">{message}</p>
            <button onClick={onClose} className="p-1 hover:bg-black/5 rounded-full transition-colors">
                <X size={16} />
            </button>
        </div>
    );
};
