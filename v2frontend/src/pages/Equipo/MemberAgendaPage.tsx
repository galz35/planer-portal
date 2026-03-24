import React from 'react';
import { NavLink, Outlet, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { MemberAgendaProvider } from '../Hoy/context/MemberAgendaContext';
import { useMiDiaContext } from '../Hoy/context/MiDiaContext';
import { List, Calendar, BookOpen, ChevronLeft, ChevronRight, ShieldAlert, ArrowLeft } from 'lucide-react';
import { clarityService } from '../../services/clarity.service';

const MemberAgendaContent: React.FC = () => {
    const { today, setToday } = useMiDiaContext();

    const handlePrevDay = () => {
        const [y, m, d] = today.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        date.setDate(date.getDate() - 1);
        const ny = date.getFullYear();
        const nm = String(date.getMonth() + 1).padStart(2, '0');
        const nd = String(date.getDate()).padStart(2, '0');
        setToday(`${ny}-${nm}-${nd}`);
    };

    const handleNextDay = () => {
        const [y, m, d] = today.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        date.setDate(date.getDate() + 1);
        const ny = date.getFullYear();
        const nm = String(date.getMonth() + 1).padStart(2, '0');
        const nd = String(date.getDate()).padStart(2, '0');
        setToday(`${ny}-${nm}-${nd}`);
    };

    const handleToday = () => {
        setToday(new Date().toISOString().split('T')[0]);
    };

    // Helper para clases de NavLink
    const linkClass = ({ isActive }: { isActive: boolean }) =>
        `px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${isActive
            ? 'bg-amber-100 text-amber-700 shadow-sm border border-amber-200'
            : 'text-slate-500 hover:text-slate-700'
        }`;

    return (
        <div className="bg-clarity-bg dark:bg-slate-900 min-h-screen flex flex-col">
            {/* Agenda Navigation Header */}
            <div className="bg-white dark:bg-slate-800 p-2 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 mb-3 flex flex-col md:flex-row justify-between items-center gap-2 shrink-0 mx-4 mt-4">

                {/* Date Controls */}
                <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900/50 p-1 rounded-lg">
                    <button onClick={handlePrevDay} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors text-slate-500">
                        <ChevronLeft size={16} />
                    </button>
                    <button onClick={handleToday} className="px-2 py-0.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded flex items-center gap-1">
                        <Calendar size={14} className="text-amber-500" />
                        {today === new Date().toISOString().split('T')[0] ? 'Hoy' : today}
                    </button>
                    <button onClick={handleNextDay} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors text-slate-500">
                        <ChevronRight size={16} />
                    </button>
                </div>

                {/* View Tabs */}
                <div className="flex bg-slate-100/50 dark:bg-slate-700/50 p-1 rounded-lg gap-1 overflow-x-auto w-full md:w-auto">
                    <NavLink to="." end className={linkClass}>
                        <List size={14} /> Lista
                    </NavLink>
                    {/* <NavLink to="matrix" className={linkClass}>
                        <LayoutGrid size={14} /> Matriz
                    </NavLink> */}
                    <NavLink to="calendario" className={linkClass}>
                        <Calendar size={14} /> Cal
                    </NavLink>
                    <NavLink to="bitacora" className={linkClass}>
                        <BookOpen size={14} /> Bitácora
                    </NavLink>
                </div>
            </div>

            <main className="px-4 w-full h-full mx-auto animate-fade-in flex-1 flex flex-col pb-24">
                <Outlet />
            </main>
        </div>
    );
};

export const MemberAgendaPage: React.FC = () => {
    const { carnet } = useParams<{ carnet: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    // Initialize from URL params if available
    const urlNombre = searchParams.get('nombre');
    const urlCarnet = searchParams.get('carnet');

    const [empNombre, setEmpNombre] = React.useState<string>(urlNombre || '...');
    const [empCarnet, setEmpCarnet] = React.useState<string>(carnet || urlCarnet || '');
    const [empId, setEmpId] = React.useState<number | null>(null);

    React.useEffect(() => {
        if (!carnet) return;
        // userId could be ID or carnet, but typical flow sends ID.
        // We try to fetch minimal info. If userId is numeric, we assume ID.
        // If your API supports getEmpleado by ID or access has a lookup, use it.
        // For now, let's try assuming userId is ID and use a service if available.
        // Actually accessService.getEmpleado expects carnet.
        // If userId is numeric ID, we need to resolve.
        // Let's assume userId passed in URL is ID (e.g. 20).
        // Best effort: clarityService often returns user details on tasks, but we need standalone.
        // Let's try accessService.getEmpleado with the userId string (if it's carnet) OR
        // if it's ID, we might need a lookup.
        // Given your backend, 'getEmpleado' endpoint usually takes carnet.
        // If userId is 20, we can't fetch by carnet directly unless we have a map.
        // Workaround: fetch 'getMyTeam' and find the user locally if possible, OR
        // call a specific endpoint if exists.

        const fetchInfo = async () => {
            try {
                // Try to match from team list since we likely came from MiEquipoPage
                const team = await clarityService.getMyTeam();
                const match = team.find((m: any) => String(m?.usuario?.carnet) === carnet || String(m?.usuario?.idUsuario) === carnet);

                if (match?.usuario) {
                    setEmpNombre(match.usuario.nombre || 'Sin Nombre');
                    setEmpCarnet(match.usuario.carnet || '');
                    setEmpId(match.usuario.idUsuario);
                } else {
                    // Fallback: Try specific endpoint if exists
                    try {
                        const user = await clarityService.getEquipoMiembro(Number(carnet));
                        if (user) {
                            setEmpNombre(user.nombre || 'Sin Nombre');
                            setEmpCarnet(user.carnet || '');
                        }
                    } catch (e2) {
                        // Ignore secondary error
                        setEmpNombre(`Usuario #${carnet}`);
                    }
                }
            } catch (e) {
                console.error("Error fetching member info", e);
                setEmpNombre(`Usuario ${carnet}`);
            }
        };
        fetchInfo();
    }, [carnet]);

    if (!carnet) return <div>Usuario no especificado</div>;

    return (
        <MemberAgendaProvider userId={String(empId || carnet)} userCarnet={empCarnet || carnet}>
            <div className="min-h-screen flex flex-col relative">
                {/* Supervisor Banner */}
                <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 sticky top-0 z-50 flex justify-between items-center shadow-sm">
                    <div className="flex items-center gap-2 text-amber-800 text-xs font-bold uppercase tracking-wide">
                        <ShieldAlert size={16} />
                        <span>Modo Supervisor: {empNombre} <span className="opacity-50">({empCarnet || carnet})</span></span>
                    </div>
                    <button onClick={() => navigate('/app/equipo')} className="flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 px-3 py-1 rounded transition-colors">
                        <ArrowLeft size={12} /> Volver al Equipo
                    </button>
                </div>

                <MemberAgendaContent />
            </div>
        </MemberAgendaProvider>
    );
};
