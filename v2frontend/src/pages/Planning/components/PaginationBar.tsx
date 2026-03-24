import React, { useMemo } from 'react';
import { ChevronsLeft, ChevronsRight } from 'lucide-react';

const LIMITES = [5, 10, 12, 20, 50];

interface PaginationBarProps {
    page: number;
    lastPage: number;
    total: number;
    limit: number;
    visibleCount: number;
    loading: boolean;
    isTop?: boolean;
    onPageChange: (newPage: number) => void;
    onLimitChange: (newLimit: number) => void;
}

export const PaginationBar: React.FC<PaginationBarProps> = ({
    page, lastPage, total, limit, visibleCount, loading, isTop = false,
    onPageChange, onLimitChange
}) => {
    const pages = useMemo(() => {
        const lp = Math.max(1, lastPage);
        const p = Math.min(Math.max(1, page), lp);
        const out: Array<number | '...'> = [];
        const windowSize = 1;

        out.push(1);
        if (p - windowSize > 2) out.push('...');
        for (let i = Math.max(2, p - windowSize); i <= Math.min(lp - 1, p + windowSize); i++) out.push(i);
        if (p + windowSize < lp - 1) out.push('...');
        if (lp > 1) out.push(lp);

        return out.filter((v, idx) => out.indexOf(v) === idx);
    }, [page, lastPage]);

    if (loading || total === 0) return null;

    return (
        <div className={`${isTop ? 'mb-6' : 'mt-6'} px-6 py-3 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-4 transition-all`}>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full lg:w-auto text-center sm:text-left">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                    Mostrando <span className="text-slate-900 font-black">{visibleCount}</span> de{' '}
                    <span className="text-indigo-600 font-black">{total}</span>
                </p>

                <div className="flex items-center justify-center sm:justify-start gap-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase">Filas</span>
                    <select
                        value={limit}
                        onChange={e => onLimitChange(Number(e.target.value))}
                        className="h-8 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-700 outline-none shadow-sm focus:bg-white transition-all"
                    >
                        {LIMITES.map(x => (
                            <option key={x} value={x}>{x}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="flex items-center gap-1.5">
                <button
                    onClick={() => onPageChange(1)}
                    disabled={page === 1}
                    className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-all shadow-sm"
                    title="Primera"
                >
                    <ChevronsLeft size={16} />
                </button>

                <button
                    onClick={() => onPageChange(page - 1)}
                    disabled={page === 1}
                    className="px-4 h-10 bg-white border border-slate-200 rounded-xl text-[11px] font-black text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-all shadow-sm uppercase"
                >
                    Anterior
                </button>

                <div className="hidden sm:flex items-center gap-1.5">
                    {pages.map((x, idx) =>
                        x === '...' ? (
                            <div key={`dots-${idx}-${page}`} className="px-2 text-slate-400 font-black">
                                ...
                            </div>
                        ) : (
                            <button
                                key={`page-${x}`}
                                onClick={() => onPageChange(x)}
                                className={`min-w-[40px] h-10 px-3 rounded-xl text-[11px] font-black border transition-all shadow-sm ${x === page
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-100'
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                    }`}
                            >
                                {x}
                            </button>
                        )
                    )}
                </div>

                <div className="sm:hidden h-10 flex items-center px-4 bg-indigo-600 text-white text-[11px] font-black rounded-xl shadow-md">
                    {page} / {lastPage}
                </div>

                <button
                    onClick={() => onPageChange(page + 1)}
                    disabled={page === lastPage}
                    className="px-4 h-10 bg-white border border-slate-200 rounded-xl text-[11px] font-black text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-all shadow-sm uppercase"
                >
                    Siguiente
                </button>

                <button
                    onClick={() => onPageChange(lastPage)}
                    disabled={page === lastPage}
                    className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-all shadow-sm"
                    title="Última"
                >
                    <ChevronsRight size={16} />
                </button>
            </div>
        </div>
    );
};
