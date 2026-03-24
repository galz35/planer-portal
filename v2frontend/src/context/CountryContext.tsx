import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

export type CountryCode = 'NI' | 'HN' | 'SV' | 'CR' | 'GT' | 'PA';

const COUNTRIES: { code: CountryCode; name: string; flag: string }[] = [
    { code: 'NI', name: 'Nicaragua', flag: '🇳🇮' },
    { code: 'HN', name: 'Honduras', flag: '🇭🇳' },
    { code: 'SV', name: 'El Salvador', flag: '🇸🇻' },
    { code: 'CR', name: 'Costa Rica', flag: '🇨🇷' },
    { code: 'GT', name: 'Guatemala', flag: '🇬🇹' },
    { code: 'PA', name: 'Panamá', flag: '🇵🇦' },
];

interface CountryContextType {
    currentCountry: CountryCode;
    changeCountry: (code: CountryCode) => void;
    availableCountries: typeof COUNTRIES;
    isMultiCountryAdmin: boolean;
    countryName: string;
    countryFlag: string;
}

const CountryContext = createContext<CountryContextType | undefined>(undefined);

export const CountryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [currentCountry, setCurrentCountry] = useState<CountryCode>('NI');

    // SuperAdmins pueden cambiar de pais
    const isMultiCountryAdmin = user?.rolGlobal === 'SuperAdmin' || user?.rolGlobal === 'RegionalAdmin';

    useEffect(() => {
        if (user?.pais) {
            // Usuario normal: forzar su pais
            if (!isMultiCountryAdmin) {
                setCurrentCountry(user.pais as CountryCode);
            } else {
                // Admin: recuperar selección previa o usar su pais por defecto
                const saved = localStorage.getItem('clarity_selected_country');
                if (saved && COUNTRIES.some(c => c.code === saved)) {
                    setCurrentCountry(saved as CountryCode);
                } else {
                    setCurrentCountry((user.pais as CountryCode) || 'NI');
                }
            }
        }
    }, [user, isMultiCountryAdmin]);

    const changeCountry = (code: CountryCode) => {
        if (!isMultiCountryAdmin) return;
        setCurrentCountry(code);
        localStorage.setItem('clarity_selected_country', code);
        // Opcional: Recargar página para limpiar cache de SWR/ReactQuery si se usa
        window.location.reload();
    };

    const countryInfo = COUNTRIES.find(c => c.code === currentCountry) || COUNTRIES[0];

    return (
        <CountryContext.Provider value={{
            currentCountry,
            changeCountry,
            availableCountries: COUNTRIES,
            isMultiCountryAdmin,
            countryName: countryInfo.name,
            countryFlag: countryInfo.flag
        }}>
            {children}
        </CountryContext.Provider>
    );
};

export const useCountry = () => {
    const context = useContext(CountryContext);
    if (!context) throw new Error('useCountry must be used within a CountryProvider');
    return context;
};
