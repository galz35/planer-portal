import React from 'react';
import { useCountry, type CountryCode } from '../../context/CountryContext';
import { ChevronDown } from 'lucide-react';

export const CountrySelector: React.FC<{ collapsed?: boolean }> = ({ collapsed }) => {
    const { currentCountry, availableCountries, changeCountry, isMultiCountryAdmin, countryFlag, countryName } = useCountry();

    if (collapsed) {
        return (
            <div className="flex justify-center py-4 border-t border-slate-200/50 dark:border-slate-800">
                <button
                    title={countryName}
                    className="text-xl hover:scale-110 transition-transform cursor-pointer relative group"
                >
                    {countryFlag}
                    {isMultiCountryAdmin && (
                        <div className="absolute left-full top-0 ml-2 bg-slate-800 text-white text-xs p-2 rounded hidden group-hover:block whitespace-nowrap z-50">
                            {countryName} (Cambiar en modo expandido)
                        </div>
                    )}
                </button>
            </div>
        );
    }

    if (!isMultiCountryAdmin) {
        return (
            <div className="flex items-center gap-2 px-4 py-2 text-slate-400 text-xs border-t border-slate-700/50 mt-auto">
                <span className="text-base">{countryFlag}</span>
                <span className="font-medium text-slate-500">{countryName}</span>
            </div>
        );
    }

    return (
        <div className="relative group px-2 py-2 border-t border-slate-700/50 mt-auto">
            <div className="text-[10px] uppercase font-bold text-slate-500 px-2 mb-1 tracking-wider">Región</div>
            <button className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors text-sm w-full bg-slate-800/50 hover:bg-slate-800 px-3 py-2 rounded-md border border-transparent hover:border-slate-600">
                <span className="text-base">{countryFlag}</span>
                <span className="flex-1 text-left truncate font-medium">{countryName}</span>
                <ChevronDown size={14} className="text-slate-500 group-hover:text-slate-300 transition-colors" />
            </button>

            <div className="absolute left-2 right-2 bottom-full mb-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden hidden group-hover:block z-50 animate-fade-in-up">
                <div className="px-3 py-2 bg-slate-900/50 border-b border-slate-700 text-xs font-bold text-slate-400">
                    Cambiar País
                </div>
                <div className="max-h-60 overflow-y-auto">
                    {availableCountries.map(c => (
                        <button
                            key={c.code}
                            onClick={() => changeCountry(c.code as CountryCode)}
                            className={`w-full text-left px-3 py-2 text-sm flex items-center gap-3 hover:bg-slate-700 transition-colors ${currentCountry === c.code ? 'bg-indigo-900/50 text-indigo-300 font-medium' : 'text-slate-300'}`}
                        >
                            <span className="text-base">{c.flag}</span>
                            <span>{c.name}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
