import { createContext, useContext, useState, type ReactNode } from 'react';

interface UIContextType {
    isSidebarCollapsed: boolean;
    toggleSidebar: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider = ({ children }: { children: ReactNode }) => {
    const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);

    const toggleSidebar = () => setSidebarCollapsed(prev => !prev);

    return (
        <UIContext.Provider value={{ isSidebarCollapsed, toggleSidebar }}>
            {children}
        </UIContext.Provider>
    );
};

export const useUI = () => {
    const context = useContext(UIContext);
    if (!context) {
        throw new Error('useUI must be used within a UIProvider');
    }
    return context;
};
