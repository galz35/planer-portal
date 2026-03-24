import React from 'react';

interface Props {
    title?: string;
    subtitle?: string;
    className?: string;
    children?: React.ReactNode;
}

export const TopBar: React.FC<Props> = ({ title = 'Clarity', subtitle, className = '', children }) => {
    return (
        <header className={`sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center shadow-sm ${className}`}>
            <div>
                <h1 className="text-lg font-bold text-clarity-primary leading-tight">{title}</h1>
                {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
            </div>
            <div className="flex items-center gap-2">
                {children}
                {/* Placeholder for Profile/Notifications if needed */}
                <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 font-bold text-xs">
                    GL
                </div>
            </div>
        </header>
    );
};
