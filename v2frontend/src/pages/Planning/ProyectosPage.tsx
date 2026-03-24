// ProyectosPage.tsx
// ✅ “Proyecto” como celda principal (Nombre arriba + metadata abajo)
// ✅ Quité columnas viejas: Gerencia/Subgerencia/Área/Estado/Cronograma/Progreso (ya no van en thead)
// ✅ Pero agregué: Estado + Progreso dentro del bloque “Proyecto” (con iconos y badges)
// ✅ Acciones quedan igual (columna Acción)
// ✅ Paginación real: selector 5/10/12/20/50 + números + primera/última
// ✅ Expanded row se queda (detalle) y ahí muestro campos completos también
// NOTA: Mantengo tu lógica de API + fallback intacta
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    LayoutGrid,
    Search,
    Plus,
    X,
    Lock,
    CheckCircle,
    GitPullRequest,
    ChevronDown,
    MoreHorizontal,
    AlertCircle,
    Download,
    ChevronRight,
    Users,
    ListChecks
} from 'lucide-react';
import Swal from 'sweetalert2';

import { clarityService } from '../../services/clarity.service';
import { planningService } from '../../services/planning.service';
import type { Proyecto } from '../../types/modelos';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { GestionColaboradoresModal } from '../../components/proyectos/GestionColaboradoresModal';

import { PaginationBar } from './components/PaginationBar';
import { ProjectModal } from './components/ProjectModal';
import { ProjectCloneModal } from './components/ProjectCloneModal';
import { ProjectContextMenu } from './components/ProjectContextMenu';
import { ProgresoBadge, AtrasoBadge, calculateDelay } from './components/ProjectIndicators';

export const ProyectosPage: React.FC = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { user } = useAuth();

    // =========================
    // LISTA + CARGA
    // =========================
    const [searchParams, setSearchParams] = useSearchParams();
    const [projects, setProjects] = useState<Proyecto[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Clone Logic
    const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
    const [projectToClone, setProjectToClone] = useState<Proyecto | null>(null);
    const [cloneName, setCloneName] = useState('');

    // Modal Colaboradores
    const [showColaboradoresModal, setShowColaboradoresModal] = useState(false);
    const [colaboradoresProject, setColaboradoresProject] = useState<Proyecto | null>(null);

    // Init from URL
    const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');

    // =========================
    // PAGINACIÓN
    // =========================
    const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
    const [lastPage, setLastPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [limit, setLimit] = useState<number>(12);

    // Cuando la API devuelve TODO (sin paginar), paginamos localmente
    const [modoLocalPaging, setModoLocalPaging] = useState(false);
    const [listaCompleta, setListaCompleta] = useState<Proyecto[] | null>(null);

    // =========================
    // FILTROS
    // =========================
    const [filters, setFilters] = useState({
        estado: searchParams.get('estado') || '',
        gerencia: searchParams.get('gerencia') || '',
        subgerencia: searchParams.get('subgerencia') || '',
        area: searchParams.get('area') || '',
        tipo: searchParams.get('tipo') || '',
        fechaInicio: searchParams.get('fechaInicio') || '',
        fechaFin: searchParams.get('fechaFin') || '', // Added fechaFin
        minProgreso: searchParams.get('minProgreso') || '',
        soloConAtraso: searchParams.get('soloConAtraso') || '',
    });

    // Sync URL - Persistir filtros y paginación para permitir "Regresar" sin perder estado
    useEffect(() => {
        const p: any = {};
        if (page > 1) p.page = page.toString();
        if (searchTerm) p.q = searchTerm;

        // Agregar filtros si tienen valor
        Object.entries(filters).forEach(([key, value]) => {
            if (value) p[key] = value;
        });

        setSearchParams(p, { replace: true });
    }, [page, searchTerm, filters]);

    // =========================
    // ROW EXPAND
    // =========================
    const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
    const toggleRow = (id: number) => setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));

    // =========================
    // MENÚ ACCIONES (DROPDOWN GLOBAL)
    // =========================
    const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
    const [menuPos, setMenuPos] = useState<{ top: number, right: number } | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const toggleMenu = (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        // Usaremos fixed positioning, por lo que usaremos rect.bottom
        setMenuPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
        setActiveMenuId(activeMenuId === id ? null : id);
    };

    const closeMenu = () => setActiveMenuId(null);

    useEffect(() => {
        const onDocClick = (e: MouseEvent) => {
            if (menuRef.current && menuRef.current.contains(e.target as Node)) {
                return;
            }
            setActiveMenuId(null);
        };
        if (activeMenuId) {
            document.addEventListener('mousedown', onDocClick);
        }
        return () => document.removeEventListener('mousedown', onDocClick);
    }, [activeMenuId]);

    // =========================
    // MODAL
    // =========================
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<Proyecto | null>(null);
    const [isUserSelectorOpen, setIsUserSelectorOpen] = useState(false);
    const [formData, setFormData] = useState<Partial<Proyecto> & { responsableNombre?: string; modoVisibilidad?: string }>({
        nombre: '',
        descripcion: '',
        fechaInicio: '',
        fechaFin: '',
        area: '',
        subgerencia: '',
        gerencia: '',
        tipo: 'administrativo',
        responsableCarnet: '',
        responsableNombre: '',
        modoVisibilidad: 'JERARQUIA'
    });

    // Estructura org (para selects)
    const [orgStructure, setOrgStructure] = useState<{ gerencia: string; subgerencia: string; area: string }[]>([]);

    useEffect(() => {
        clarityService
            .getEstructuraUsuarios()
            .then(res => setOrgStructure(res || []))
            .catch(console.error);
    }, []);

    const uniqueGerencias = useMemo(() => {
        return [...new Set(orgStructure.map(x => x.gerencia).filter(Boolean))].sort();
    }, [orgStructure]);

    const filterUniqueSubgerencias = useMemo(() => {
        if (!filters.gerencia) return [];
        return [...new Set(orgStructure.filter(x => x.gerencia === filters.gerencia).map(x => x.subgerencia).filter(Boolean))].sort();
    }, [orgStructure, filters.gerencia]);

    const filterUniqueAreas = useMemo(() => {
        if (!filters.gerencia) return [];
        let filtered = orgStructure.filter(x => x.gerencia === filters.gerencia);
        if (filters.subgerencia) filtered = filtered.filter(x => x.subgerencia === filters.subgerencia);
        return [...new Set(filtered.map(x => x.area).filter(Boolean))].sort();
    }, [orgStructure, filters.gerencia, filters.subgerencia]);

    const formUniqueSubgerencias = useMemo(() => {
        if (!formData.gerencia) return [];
        return [...new Set(orgStructure.filter(x => x.gerencia === formData.gerencia).map(x => x.subgerencia).filter(Boolean))].sort();
    }, [orgStructure, formData.gerencia]);

    const formUniqueAreas = useMemo(() => {
        if (!formData.subgerencia) return [];
        return [...new Set(orgStructure.filter(x => x.gerencia === formData.gerencia && x.subgerencia === formData.subgerencia).map(x => x.area).filter(Boolean))].sort();
    }, [orgStructure, formData.gerencia, formData.subgerencia]);

    // =========================
    // HELPERS UI (Estado / Progreso) - WOW EDITION
    // =========================
    const badgeEstado = (estado?: string) => {
        const e = (estado || '').toLowerCase();

        if (e.includes('borrador')) return 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm shadow-amber-100/50';
        if (e.includes('activo') || e.includes('enejecucion') || e.includes('encurso')) return 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm shadow-indigo-100/50';
        if (e.includes('deten')) return 'bg-rose-50 text-rose-700 border-rose-200 shadow-sm shadow-rose-100/50';
        if (e.includes('termin') || e.includes('final')) return 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm shadow-emerald-100/50';
        if (e.includes('confirm')) return 'bg-slate-100 text-slate-700 border-slate-200';

        return 'bg-slate-100 text-slate-600 border-slate-200';
    };

    const iconoEstado = (estado?: string) => {
        const e = (estado || '').toLowerCase();

        if (e.includes('borrador')) return <CheckCircle size={14} className="text-amber-600" />;
        if (e.includes('activo') || e.includes('enejecucion') || e.includes('encurso')) return <GitPullRequest size={14} className="text-indigo-600" />;
        if (e.includes('deten')) return <X size={14} className="text-rose-600" />;
        if (e.includes('termin') || e.includes('final')) return <CheckCircle size={14} className="text-emerald-600" />;
        if (e.includes('confirm')) return <Lock size={14} className="text-slate-600" />;

        return <GitPullRequest size={14} className="text-slate-500" />;
    };



    // =========================
    // CARGA DE PROYECTOS (SOLUCIÓN A “PAGINACIÓN NO FUNCIONA”)
    // - Si la API NO pagina (devuelve array completo), activamos modoLocalPaging
    // - Guardamos listaCompleta y hacemos slice por page/limit
    // =========================
    const aplicarPaginacionLocal = (source: Proyecto[], p: number, lim: number) => {
        setListaCompleta(source);
        setModoLocalPaging(true);

        // FILTRADO LOCAL TIPO DATATABLE
        let filtered = [...source];

        if (searchTerm) {
            const tokens = searchTerm.toLowerCase().split(/\s+/).filter(Boolean);
            filtered = filtered.filter(x => {
                const searchTarget = `${x.nombre} ${x.creadorNombre || ''} ${(x as any).creadorCarnet || ''}`.toLowerCase();
                return tokens.every(token => searchTarget.includes(token));
            });
        }
        if (filters.estado) {
            filtered = filtered.filter(x => (x.estado || '').toLowerCase().includes(filters.estado.toLowerCase()));
        }
        if (filters.gerencia) {
            filtered = filtered.filter(x => x.gerencia === filters.gerencia);
        }
        if (filters.subgerencia) {
            filtered = filtered.filter(x => x.subgerencia === filters.subgerencia);
        }
        if (filters.area) {
            filtered = filtered.filter(x => x.area === filters.area);
        }
        if (filters.tipo) {
            filtered = filtered.filter(x => x.tipo === filters.tipo);
        }
        if (filters.fechaInicio) {
            filtered = filtered.filter(x => (x as any).fechaInicio && (x as any).fechaInicio >= filters.fechaInicio);
        }
        if (filters.fechaFin) {
            filtered = filtered.filter(x => (x as any).fechaFin && (x as any).fechaFin <= filters.fechaFin);
        }
        if (filters.minProgreso) {
            const min = Number(filters.minProgreso);
            filtered = filtered.filter(x => Number((x as any).progreso ?? (x as any).porcentaje ?? 0) >= min);
        }
        if (filters.soloConAtraso === 'true') {
            filtered = filtered.filter(x => calculateDelay(x) > 0);
        }

        // Default Sort by Fecha Inicio (Ascending - Oldest first to track timeline)
        filtered.sort((a, b) => {
            const dateA = (a as any).fechaInicio ? new Date((a as any).fechaInicio).getTime() : 0;
            const dateB = (b as any).fechaInicio ? new Date((b as any).fechaInicio).getTime() : 0;
            return dateA - dateB;
            // Note: If user requested descending, swap a and b.
            // Currently requested: "ordenarlo la informacion por fecha" -> usually implies chronological
        });

        const totalItems = filtered.length;
        const lp = Math.max(1, Math.ceil(totalItems / lim));
        const safePage = Math.min(Math.max(1, p), lp);

        const ini = (safePage - 1) * lim;
        const fin = ini + lim;

        setTotal(totalItems);
        setLastPage(lp);
        setPage(safePage);
        setProjects(filtered.slice(ini, fin));
    };

    const loadProjects = async (p?: number) => {
        setLoading(true);

        const currentPage = p || page;

        try {
            console.log('[Frontend] Requesting projects with:', {
                page: currentPage,
                limit,
                nombre: searchTerm,
                ...filters,
            });

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { fechaInicio: _unused1, minProgreso: _unused2, soloConAtraso: _unused3, ...apiFilters } = filters as any;

            // 1) Intento normal (API paginada) - Fetch everything for fast local filtering
            // IMPORTANT: We fetch WITHOUT searchTerm to have the FULL list in listaCompleta for local filtering
            const result: any = await clarityService.getProyectos({
                page: 1,
                limit: 2000,
                ...apiFilters,
            });

            // Helper to normalize porcentaje -> progreso and filter active only
            const normalizeProjects = (list: Proyecto[]): Proyecto[] => {
                return list.map(x => {
                    // FIX CRÍTICO: Los SPs devuelven 'porcentaje' pero el frontend usa 'progreso'
                    if ((x as any).porcentaje !== undefined && (x as any).progreso === undefined) {
                        (x as any).progreso = (x as any).porcentaje;
                    }
                    return x;
                });
            };

            const filterActive = (list: Proyecto[]) => {
                return normalizeProjects(list).filter(x => {
                    const s = (x.estado || '').toLowerCase();
                    // Ocultamos permanentemente los proyectos eliminados o cancelados a solicitud del usuario.
                    return s !== 'eliminado' && s !== 'cancelado';
                });
            };

            // CASO A: API devuelve { items, total, lastPage } (paginado real)
            if (result && Array.isArray(result.items)) {
                let items = result.items as Proyecto[];
                // Filter out deleted/cancelled
                items = filterActive(items);

                const lp = Number(result.lastPage ?? 1);

                // Guardar siempre en listaCompleta para permitir filtrado local posterior
                setListaCompleta(items);

                // Si la API ignora limit o si hay filtros que solo manejamos localmente
                const useLocal = items.length > limit || filters.fechaInicio || filters.minProgreso || filters.soloConAtraso;

                if (useLocal) {
                    aplicarPaginacionLocal(items, currentPage, limit);
                } else {
                    setModoLocalPaging(false);
                    setProjects(items);
                    setTotal(items.length); // Use actual filtered length
                    setLastPage(Math.max(1, lp));
                    if (p) setPage(p);
                }

                setLoading(false);
                return;
            }

            // CASO B: API devuelve array directo (sin wrapper)
            if (Array.isArray(result)) {
                const filtered = filterActive(result as Proyecto[]);
                aplicarPaginacionLocal(filtered, currentPage, limit);
                setLoading(false);
                return;
            }

            // 2) Fallback: planningService.getMyProjects (también paginación local)
            const myProjects: any[] = await planningService.getMyProjects();
            if (myProjects && myProjects.length > 0) {
                const mapped: Proyecto[] = myProjects.map(x => ({
                    idProyecto: x.id,
                    nombre: x.nombre,
                    tipo: x.tipo,
                    gerencia: x.gerencia,
                    subgerencia: x.subgerencia,
                    area: x.area,
                    estado: x.estado,
                    fechaInicio: x.fechaInicio,
                    fechaFin: x.fechaFin,
                    progreso: x.progress,
                    descripcion: x.descripcion,
                })) as any;

                const filtered = filterActive(mapped);
                aplicarPaginacionLocal(filtered, currentPage, limit);
                setLoading(false);
                return;
            }

            // Nada
            setProjects([]);
            setTotal(0);
            setLastPage(1);
            setPage(1);
        } catch (error) {
            console.error(error);
            showToast('Error cargando proyectos', 'error');
        } finally {
            setLoading(false);
        }
    };

    // React only to limit or hard reloads
    useEffect(() => {
        loadProjects(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [limit]);

    // React to SEARCH and FILTERS locally if possible, or reload
    useEffect(() => {
        if (listaCompleta) {
            aplicarPaginacionLocal(listaCompleta, 1, limit);
        } else {
            loadProjects(1);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchTerm, filters]);

    // =========================
    // HANDLERS PAGINACIÓN
    // =========================
    const handlePageChange = (newPage: number) => {
        const safePage = Math.min(Math.max(1, newPage), lastPage);

        // Si estamos en local paging, aplicamos filtros de nuevo y cortamos
        if (modoLocalPaging && listaCompleta) {
            aplicarPaginacionLocal(listaCompleta, safePage, limit);
            return;
        }

        setPage(safePage);
        loadProjects(safePage);
    };

    const handleLimitChange = (newLimit: number) => {
        setLimit(newLimit);

        // Si local paging, recalcular inmediatamente
        if (modoLocalPaging && listaCompleta) {
            aplicarPaginacionLocal(listaCompleta, 1, newLimit);
            return;
        }

        // En paginación real, el useEffect dispara recarga
    };

    // PaginationBar is now a separate component

    const handleExportExcel = () => {
        if (!projects || projects.length === 0) {
            showToast('No hay datos para exportar', 'warning');
            return;
        }

        const tableContent = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head>
                <meta charset="utf-8">
                <style>
                    table { border-collapse: collapse; width: 100%; }
                    th { background-color: #4f46e5; color: white; border: 1px solid #ddd; padding: 8px; font-weight: bold; text-align: center; }
                    td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                </style>
            </head>
            <body>
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Proyecto</th>
                            <th>Creador</th>
                            <th>Responsable</th>
                            <th>Descripción</th>
                            <th>Gerencia</th>
                            <th>Subgerencia</th>
                            <th>Área</th>
                            <th>Tipo</th>
                            <th>Estado</th>
                            <th>Progreso</th>
                            <th>Inicio</th>
                            <th>Fin</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${projects.map(p => `
                            <tr>
                                <td>${p.idProyecto}</td>
                                <td>${p.nombre}</td>
                                <td>${p.creadorNombre || (p as any).creadorCarnet || 'N/A'}</td>
                                <td>${p.responsableNombre || p.responsableCarnet || 'N/A'}</td>
                                <td>${(p.descripcion || '').replace(/(\r\n|\n|\r)/gm, ' ')}</td>
                                <td>${p.gerencia || ''}</td>
                                <td>${p.subgerencia || ''}</td>
                                <td>${p.area || ''}</td>
                                <td>${p.tipo || 'administrativo'}</td>
                                <td>${p.estado || ''}</td>
                                <td>${(p.progreso || 0)}%</td>
                                <td>${(p as any).fechaInicio ? format(new Date((p as any).fechaInicio), 'yyyy-MM-dd') : ''}</td>
                                <td>${(p as any).fechaFin ? format(new Date((p as any).fechaFin), 'yyyy-MM-dd') : ''}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </body>
            </html>
        `;

        const blob = new Blob([tableContent], { type: 'application/vnd.ms-excel' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Proyectos_${format(new Date(), 'yyyyMMdd_HHmm')}.xls`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Archivo Excel generado', 'success');
    };

    // =========================
    // MODAL: CRUD
    // =========================
    const openModal = (p?: Proyecto) => {
        if (p) {
            setEditingProject(p);
            setFormData({
                nombre: p.nombre,
                descripcion: p.descripcion || '',
                gerencia: p.gerencia || '',
                subgerencia: p.subgerencia || '',
                area: p.area || '',
                fechaInicio: p.fechaInicio ? format(new Date(p.fechaInicio), 'yyyy-MM-dd') : '',
                fechaFin: p.fechaFin ? format(new Date(p.fechaFin), 'yyyy-MM-dd') : '',
                tipo: p.tipo || 'administrativo',
                responsableCarnet: p.responsableCarnet || '',
                responsableNombre: p.responsableNombre || '',
                modoVisibilidad: (p as any).modoVisibilidad || 'JERARQUIA'
            });
        } else {
            setEditingProject(null);
            // Auto-detectar gerencia/subgerencia/area del usuario logueado
            const userGerencia = (user as any)?.gerencia || '';
            const userSubgerencia = (user as any)?.subgerencia || '';
            const userArea = (user as any)?.area || (user as any)?.departamento || '';
            setFormData({
                nombre: '',
                descripcion: '',
                gerencia: userGerencia,
                subgerencia: userSubgerencia,
                area: userArea,
                fechaInicio: '',
                fechaFin: '',
                tipo: 'administrativo',
                responsableCarnet: '',
                responsableNombre: '',
                modoVisibilidad: 'JERARQUIA'
            });
        }
        setIsModalOpen(true);
    };

    const handleCreateOrUpdate = async () => {
        // Validación básica
        if (!formData.nombre?.trim()) {
            showToast('El nombre del proyecto es obligatorio', 'warning');
            return;
        }

        setSaving(true);

        const payload: any = {
            nombre: formData.nombre,
            descripcion: formData.descripcion,
            fechaInicio: (formData as any).fechaInicio || undefined,
            fechaFin: (formData as any).fechaFin || undefined,
            area: formData.area || undefined,
            subgerencia: formData.subgerencia || undefined,
            gerencia: formData.gerencia || undefined,
            tipo: formData.tipo || 'administrativo',
            responsableCarnet: formData.responsableCarnet || undefined,
            modoVisibilidad: (formData as any).modoVisibilidad || 'JERARQUIA',
        };

        try {
            if (editingProject) {
                const targetId = editingProject.idProyecto || (editingProject as any).id;
                if (!targetId) throw new Error('No se pudo determinar el ID del proyecto');
                await clarityService.updateProyecto(targetId, payload);
                showToast('Proyecto actualizado', 'success');
            } else {
                // Crear proyecto (nombre es obligatorio)
                const newProj: any = await clarityService.postProyecto(
                    formData.nombre,
                    undefined,
                    formData.descripcion,
                    formData.tipo
                );
                // Actualizar inmediatamente con el resto de datos (responsable, fechas, etc.)
                await clarityService.updateProyecto(newProj.idProyecto, payload);
                showToast('Proyecto creado', 'success');
            }

            setIsModalOpen(false);
            loadProjects(1);
        } catch (error) {
            console.error(error);
            showToast('Error guardando proyecto', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (p: Proyecto) => {
        const result = await Swal.fire({
            title: '¿Eliminar Proyecto?',
            text: `Se eliminará "${p.nombre}" y todas sus tareas asociadas. Nota: Solo se permite eliminar proyectos creados el día de hoy para evitar pérdida accidental de datos históricos.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e11d48',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Sí, eliminar todo',
            cancelButtonText: 'Cancelar',
            reverseButtons: true,
            customClass: {
                popup: 'rounded-2xl border border-rose-200 shadow-2xl overflow-hidden',
                title: 'text-rose-600 font-black',
                confirmButton: 'bg-rose-600 hover:bg-rose-700 font-bold px-8 pb-3 pt-3 rounded-xl border-0 ring-0 outline-none',
                cancelButton: 'bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold px-8 pb-3 pt-3 rounded-xl border-0 ring-0 outline-none'
            }
        });

        if (!result.isConfirmed) return;

        // SEGUNDO AVISO DE SEGURIDAD (Confirmación crítica)
        const secondResult = await Swal.fire({
            title: '¿Confirmación Crítica?',
            text: 'Esta acción NO se puede deshacer. ¿Seguro que desea proceder con el borrado definitivo?',
            icon: 'error',
            showCancelButton: true,
            confirmButtonColor: '#e11d48',
            confirmButtonText: 'Sí, estoy TOTALMENTE seguro',
            cancelButtonText: 'No, cancelar',
            reverseButtons: true,
            customClass: {
                popup: 'rounded-2xl border-4 border-rose-600 shadow-2xl scale-110'
            }
        });

        if (!secondResult.isConfirmed) return;

        try {
            await clarityService.deleteProyecto(p.idProyecto);

            // Si es local paging, borrar de listaCompleta para que la UI se ajuste bien
            if (modoLocalPaging && listaCompleta) {
                const nueva = listaCompleta.filter(x => x.idProyecto !== p.idProyecto);
                // @ts-ignore
                aplicarPaginacionLocal(nueva, page, limit);
            } else {
                loadProjects(page);
            }

            Swal.fire({
                title: 'Eliminado con éxito',
                text: 'El proyecto se ha purgado del sistema.',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            });
        } catch (error: any) {
            console.error('[Delete] Error:', error);
            const msg = error.response?.data?.message || 'No se pudo eliminar el proyecto. Verifique que no tenga tareas de días anteriores o pida asistencia.';

            Swal.fire({
                title: 'No se pudo eliminar',
                text: msg,
                icon: 'warning'
            });
        }
    };

    const handleCloneClick = (p: Proyecto) => {
        setProjectToClone(p);
        setCloneName(`Copia de ${p.nombre}`);
        setIsCloneModalOpen(true);
    };

    const submitClone = async () => {
        if (!projectToClone || !cloneName.trim()) return;
        setSaving(true); // Use saving state for clone operation
        try {
            await clarityService.cloneProyecto(projectToClone.idProyecto, cloneName);
            setIsCloneModalOpen(false);
            setProjectToClone(null);
            setCloneName('');
            showToast('Proyecto clonado con éxito', 'success');
            loadProjects(1); // Reload projects from the first page
        } catch (error) {
            console.error('Error clonando proyecto:', error);
            showToast('Error al clonar el proyecto.', 'error');
        } finally {
            setSaving(false);
        }
    };

    // =========================
    // UI
    // =========================
    return (
        <div className="h-full bg-slate-50 p-4 lg:p-6 pb-6 font-sans overflow-auto">
            <div className="w-full mx-auto">
                {/* HEADER */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-6 p-8 bg-white rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-40 -mr-20 -mt-20 group-hover:opacity-75 transition-opacity duration-700" />

                    <div className="relative">
                        <h1 className="text-3xl font-black text-slate-900 flex items-center gap-4 tracking-tight">
                            <div className="p-3 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-200/50">
                                <LayoutGrid className="w-7 h-7 text-white" />
                            </div>
                            Portafolio de Proyectos
                        </h1>
                        <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.2em] ml-[68px] mt-1.5 opacity-80 flex items-center gap-2">
                            Control y Seguimiento Estratégico
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-200" />
                            <span className="text-indigo-600">Corporativo</span>
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-4 w-full lg:w-auto relative">
                        <button
                            onClick={handleExportExcel}
                            className="px-5 py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-2xl text-[11px] font-black tracking-wider flex items-center gap-2.5 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
                            title="Exportar a CSV/Excel"
                        >
                            <Download size={18} className="text-emerald-500" /> EXPORTAR DATOS
                        </button>

                        <button
                            onClick={() => openModal()}
                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-[11px] font-black tracking-wider flex items-center gap-2.5 transition-all shadow-lg shadow-indigo-200 hover:shadow-indigo-300/50 hover:-translate-y-0.5 active:translate-y-0"
                        >
                            <Plus size={20} className="text-white" /> NUEVO PROYECTO
                        </button>
                    </div>
                </div>

                {/* VIEWPORT CONTROLLER: MOBILE vs DESKTOP */}
                <div className="space-y-6">

                    <PaginationBar page={page} lastPage={lastPage} total={total} limit={limit} visibleCount={projects.length} loading={loading} isTop onPageChange={handlePageChange} onLimitChange={handleLimitChange} />

                    {/* MOBILE VIEW (Search & Cards) */}
                    <div className="md:hidden space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar proyecto..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-3.5 border border-slate-200 rounded-2xl bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-slate-700"
                            />
                        </div>

                        {/* Active Filters Summary (Mobile) */}
                        {(searchTerm || Object.values(filters).some(v => v !== '')) && (
                            <div className="flex items-center justify-between bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100">
                                <span className="text-[10px] font-black text-indigo-600 uppercase">Filtros Activos</span>
                                <button
                                    onClick={() => {
                                        setSearchTerm('');
                                        setFilters({ estado: '', gerencia: '', subgerencia: '', area: '', tipo: '', fechaInicio: '', fechaFin: '', minProgreso: '', soloConAtraso: '' });
                                    }}
                                    className="text-[10px] font-black text-rose-600 uppercase hover:underline"
                                >
                                    Limpiar Todo
                                </button>
                            </div>
                        )}

                        <div className="grid grid-cols-1 gap-4">
                            {loading ? (
                                <div className="py-20 text-center bg-white rounded-2xl border border-slate-100">
                                    <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                                    <p className="mt-3 text-slate-400 font-bold text-xs uppercase tracking-widest">Cargando portafolio...</p>
                                </div>
                            ) : projects.length === 0 ? (
                                <div className="p-10 text-center bg-white rounded-3xl border border-slate-100 shadow-sm">
                                    <GitPullRequest size={40} className="mx-auto text-slate-200 mb-4" />
                                    <p className="text-slate-400 italic font-medium">No hay proyectos que coincidan.</p>
                                </div>
                            ) : (
                                projects.map(p => (
                                    <div
                                        key={p.idProyecto}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                navigate(`/app/planning/plan-trabajo?projectId=${p.idProyecto}`);
                                            }
                                        }}
                                        onClick={() => navigate(`/app/planning/plan-trabajo?projectId=${p.idProyecto}`)}
                                        className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm active:scale-[0.98] transition-all relative group cursor-pointer"
                                    >
                                        <div className="flex justify-between items-start gap-4 mb-4">
                                            <div className="flex gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center shrink-0 border border-slate-100 group-active:bg-indigo-50 group-active:text-indigo-500 transition-colors">
                                                    <GitPullRequest size={24} />
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="font-black text-slate-900 leading-tight mb-1 break-words">{p.nombre}</h3>
                                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-bold text-slate-400 uppercase">
                                                        <span>{p.gerencia || 'Global'}</span>
                                                        <span className="text-slate-200">•</span>
                                                        <span>{p.area || 'N/A'}</span>
                                                    </div>
                                                    {(p.responsableNombre || p.responsableCarnet) && (
                                                        <div className="mt-1 text-[9px] font-black text-emerald-600 uppercase flex items-center gap-1 truncate max-w-[180px]">
                                                            <Users size={11} className="shrink-0" />
                                                            <span className="truncate">{p.responsableNombre || p.responsableCarnet}</span>
                                                        </div>
                                                    )}
                                                    {p.totalTareas !== undefined && (
                                                        <div className="mt-1 flex items-center gap-1 text-[9px] font-black text-indigo-500 uppercase">
                                                            <ListChecks size={11} className="shrink-0" />
                                                            {p.tareasCompletadas || 0} / {p.totalTareas || 0} TAREAS
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="relative">
                                                <button
                                                    onClick={(e) => toggleMenu(e, p.idProyecto)}
                                                    className={`p-2 -mr-2 rounded-xl transition-all ${activeMenuId === p.idProyecto ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                                                >
                                                    <MoreHorizontal size={20} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-50">
                                            <div className="space-y-1">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Estado</p>
                                                <span className={`inline-flex px-2 py-0.5 rounded-lg text-[9px] font-black border ${badgeEstado(p.estado)}`}>
                                                    {p.estado}
                                                </span>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Progreso</p>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${p.progreso || 0}%` }} />
                                                    </div>
                                                    <span className="text-[10px] font-black text-slate-700">{Math.round(p.progreso || 0)}%</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Delay indicator inline if exists */}
                                        {calculateDelay(p) > 0 && (
                                            <div className="mt-3 bg-rose-50 border border-rose-100 px-3 py-1.5 rounded-lg flex items-center justify-between">
                                                <span className="text-[9px] font-black text-rose-600 uppercase flex items-center gap-1.5">
                                                    <AlertCircle size={10} />
                                                    Atraso Crítico
                                                </span>
                                                <span className="text-[10px] font-black text-rose-600">{calculateDelay(p)}%</span>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* DESKTOP TABLE VIEW */}
                    <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="w-full">
                            <table className="w-full text-left border-collapse table-fixed">
                                <thead className="bg-slate-50 text-slate-500 font-black border-b border-slate-200 text-[10px] uppercase tracking-wider shadow-sm">
                                    <tr>
                                        <th className="px-2 py-3 w-[40px] text-center"></th>
                                        <th className="px-2 py-3">Proyecto</th>
                                        <th className="px-2 py-3 hidden xl:table-cell w-[110px]">Inicio</th>
                                        <th className="px-2 py-3 hidden xl:table-cell w-[110px]">Fin</th>
                                        <th className="px-2 py-3 hidden lg:table-cell w-[85px] text-center">Progreso</th>
                                        <th className="px-2 py-3 hidden lg:table-cell w-[90px] text-center">Atraso</th>
                                        <th className="px-2 py-3 text-right w-[50px]">Acción</th>
                                    </tr>
                                    {/* FILTROS POR COLUMNA (Datatable style) */}
                                    <tr className="bg-white border-b border-slate-100">
                                        <th className="px-2 py-1"></th>
                                        <th className="px-2 py-2">
                                            <div className="flex flex-col gap-1.5">
                                                <div className="relative">
                                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                                    <input
                                                        type="text"
                                                        placeholder="Buscar proyecto..."
                                                        value={searchTerm}
                                                        onChange={e => setSearchTerm(e.target.value)}
                                                        className="w-full pl-8 pr-2 py-1.5 text-xs font-bold border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                                    />
                                                </div>
                                                {/* ROW 2: TIPO, ESTADO, GERENCIA */}
                                                <div className="flex gap-1.5">
                                                    <select
                                                        className="w-1/4 h-7 px-1.5 bg-slate-50 border border-slate-200 rounded-md text-[10px] font-black text-slate-600 outline-none"
                                                        value={filters.tipo}
                                                        onChange={e => setFilters({ ...filters, tipo: e.target.value })}
                                                    >
                                                        <option value="">TIPO</option>
                                                        <option value="administrativo">ADMIN</option>
                                                        <option value="Logistica">LOGISTICA</option>
                                                        <option value="AMX">AMX</option>
                                                        <option value="CENAM">CENAM</option>
                                                        <option value="Estrategico">ESTRAT.</option>
                                                    </select>
                                                    <select
                                                        className="w-1/4 h-7 px-1.5 bg-slate-50 border border-slate-200 rounded-md text-[10px] font-black text-slate-600 outline-none"
                                                        value={filters.estado}
                                                        onChange={e => setFilters({ ...filters, estado: e.target.value })}
                                                    >
                                                        <option value="">ESTADO</option>
                                                        <option value="Activo">ACTIVO</option>
                                                        <option value="Terminado">HECHO</option>
                                                        <option value="Borrador">BORRADOR</option>
                                                        <option value="Detenido">PAUSA</option>
                                                        <option value="Cancelado">CANCELADO</option>
                                                    </select>
                                                    <select
                                                        className="w-2/4 h-7 px-1.5 bg-slate-50 border border-slate-200 rounded-md text-[10px] font-black text-slate-600 outline-none truncate"
                                                        value={filters.gerencia}
                                                        onChange={e => setFilters({ ...filters, gerencia: e.target.value, subgerencia: '', area: '' })}
                                                    >
                                                        <option value="">GERENCIA (TODA)</option>
                                                        {uniqueGerencias.map(g => (
                                                            <option key={g} value={g}>{g}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                {/* ROW 3: SUBGERENCIA, AREA */}
                                                <div className="flex gap-1.5">
                                                    <select
                                                        className="w-1/2 h-7 px-1.5 bg-slate-50 border border-slate-200 rounded-md text-[10px] font-black text-slate-600 outline-none disabled:opacity-50 truncate"
                                                        value={filters.subgerencia}
                                                        onChange={e => setFilters({ ...filters, subgerencia: e.target.value, area: '' })}
                                                        disabled={!filters.gerencia}
                                                    >
                                                        <option value="">SUBGERENCIA</option>
                                                        {filterUniqueSubgerencias.map(s => (
                                                            <option key={s} value={s}>{s}</option>
                                                        ))}
                                                    </select>
                                                    <select
                                                        className="w-1/2 h-7 px-1.5 bg-slate-50 border border-slate-200 rounded-md text-[10px] font-black text-slate-600 outline-none disabled:opacity-50 truncate"
                                                        value={filters.area}
                                                        onChange={e => setFilters({ ...filters, area: e.target.value })}
                                                        disabled={!filters.subgerencia}
                                                    >
                                                        <option value="">ÁREA</option>
                                                        {filterUniqueAreas.map(a => (
                                                            <option key={a} value={a}>{a}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        </th>
                                        <th className="px-2 py-2 hidden xl:table-cell align-bottom">
                                            <input
                                                type="date"
                                                className="w-full h-7 px-1 bg-slate-50 border border-slate-200 rounded-md text-[10px] uppercase font-black text-slate-600 outline-none"
                                                value={filters.fechaInicio}
                                                onChange={e => setFilters({ ...filters, fechaInicio: e.target.value })}
                                            />
                                        </th>
                                        <th className="px-2 py-2 hidden xl:table-cell align-bottom">
                                            <input
                                                type="date"
                                                className="w-full h-7 px-1 bg-slate-50 border border-slate-200 rounded-md text-[10px] uppercase font-black text-slate-600 outline-none"
                                                value={filters.fechaFin}
                                                onChange={e => setFilters({ ...filters, fechaFin: e.target.value })}
                                            />
                                        </th>

                                        <th className="px-2 py-2 hidden lg:table-cell text-center align-bottom">
                                            <input
                                                type="number"
                                                placeholder="%"
                                                className="w-full h-7 px-1 bg-slate-50 border border-slate-200 rounded-md text-[10px] font-black text-slate-600 outline-none text-center"
                                                value={filters.minProgreso}
                                                onChange={e => setFilters({ ...filters, minProgreso: e.target.value })}
                                            />
                                        </th>
                                        <th className="px-2 py-2 hidden lg:table-cell align-bottom">
                                            <select
                                                className="w-full h-7 px-1 bg-slate-50 border border-slate-200 rounded-md text-[10px] font-black text-slate-600 outline-none"
                                                value={filters.soloConAtraso}
                                                onChange={e => setFilters({ ...filters, soloConAtraso: e.target.value })}
                                            >
                                                <option value="">TODOS</option>
                                                <option value="true">SÍ</option>
                                            </select>
                                        </th>
                                        <th className="px-2 py-2 text-right align-bottom">
                                            <button
                                                onClick={() => {
                                                    setSearchTerm('');
                                                    setFilters({ estado: '', gerencia: '', subgerencia: '', area: '', tipo: '', fechaInicio: '', fechaFin: '', minProgreso: '', soloConAtraso: '' });
                                                }}
                                                className="p-1 px-2 text-[8px] font-black bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-md transition-colors"
                                                title="Limpiar"
                                            >
                                                RESET
                                            </button>
                                        </th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-slate-100">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-20 text-center">
                                                <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                                                <p className="mt-3 text-slate-400 font-bold text-sm uppercase tracking-widest">Sincronizando...</p>
                                            </td>
                                        </tr>
                                    ) : projects.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-20 text-center text-slate-400 italic font-medium">
                                                No se encontraron proyectos bajo estos criterios.
                                            </td>
                                        </tr>
                                    ) : (
                                        projects.map(p => (
                                            <React.Fragment key={p.idProyecto}>
                                                <tr
                                                    role="button"
                                                    tabIndex={0}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                            e.preventDefault();
                                                            navigate(`/app/planning/plan-trabajo?projectId=${p.idProyecto}`);
                                                        }
                                                    }}
                                                    className="group cursor-pointer transition-colors hover:bg-indigo-50/40 focus:outline-none focus:bg-indigo-50/60"
                                                    onClick={() => navigate(`/app/planning/plan-trabajo?projectId=${p.idProyecto}`)}
                                                >
                                                    {/* EXPAND */}
                                                    <td
                                                        className="px-2 py-3 align-top"
                                                        onClick={e => {
                                                            e.stopPropagation();
                                                            toggleRow(p.idProyecto);
                                                        }}
                                                    >
                                                        <button
                                                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-indigo-100 hover:text-indigo-700 transition-all"
                                                            title="Ver detalle"
                                                        >
                                                            {expandedRows[p.idProyecto] ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                                        </button>
                                                    </td>

                                                    {/* PROYECTO */}
                                                    <td className="px-2 py-3">
                                                        <div className="flex items-start gap-4">
                                                            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 group-hover:bg-white group-hover:shadow-sm transition-all">
                                                                <GitPullRequest size={22} />
                                                            </div>

                                                            <div className="min-w-0 flex-1 overflow-hidden">
                                                                {/* NOMBRE */}
                                                                <div className="flex items-center gap-1.5 min-w-0">
                                                                    <div className="font-black text-slate-900 truncate group-hover:text-indigo-700 transition-colors text-xs leading-tight" title={p.nombre}>
                                                                        {p.nombre}
                                                                    </div>
                                                                    {(p.enllavado || p.estado === 'Confirmado' || p.estado === 'EnEjecucion') && (
                                                                        <Lock size={14} className="text-amber-500 shrink-0" />
                                                                    )}
                                                                </div>

                                                                {/* TIPO + ESTADO badges inline */}
                                                                <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                                                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black border ${badgeEstado(p.estado)}`}>
                                                                        {iconoEstado(p.estado)}
                                                                        {(p.estado || 'N/A').toUpperCase()}
                                                                    </span>
                                                                    {p.tipo && (
                                                                        <span className="inline-flex px-1.5 py-0.5 rounded text-[8px] font-black bg-indigo-50 text-indigo-600 border border-indigo-100 uppercase">
                                                                            {p.tipo}
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                <div className="xl:hidden text-[10px] text-slate-500 mt-0.5 uppercase">
                                                                    {(p as any).fechaInicio ? format(new Date((p as any).fechaInicio), 'dd MMM yyyy', { locale: es }) : '-'}
                                                                </div>

                                                                {/* Árbol Jerárquico bajo el proyecto (3 filas) */}
                                                                <div className="mt-2 flex flex-col gap-0.5 hidden md:flex">
                                                                    <span className="text-[10px] font-bold text-slate-700">{p.gerencia || 'Global'}</span>
                                                                    <span className="text-[10px] font-bold text-slate-500 pl-2 border-l-2 border-slate-200">{p.subgerencia || 'General'}</span>
                                                                    <span className="text-[10px] font-bold text-slate-400 pl-4 border-l-2 border-slate-200">{p.area || 'N/A'}</span>
                                                                </div>

                                                                {/* RESPONSABLE */}
                                                                {(p.responsableNombre || p.responsableCarnet) && (
                                                                    <div className="mt-1.5 text-[10px] font-black text-emerald-600 uppercase tracking-wide flex items-center gap-1 truncate">
                                                                        <Users size={12} />
                                                                        {(p.responsableNombre || p.responsableCarnet || '').toUpperCase()}
                                                                    </div>
                                                                )}

                                                                {/* CREADOR */}
                                                                {(p.creadorNombre || (p as any).creadorCarnet) && (
                                                                    <div className="mt-0.5 text-[9px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1 truncate">
                                                                        Creado por: {(p.creadorNombre || (p as any).creadorCarnet || '').toUpperCase()}
                                                                    </div>
                                                                )}

                                                                {/* CONTEO DE TAREAS */}
                                                                {p.totalTareas !== undefined && (
                                                                    <div className="mt-1.5 flex items-center gap-1.5 text-[10px] font-black text-indigo-500 uppercase tracking-wider">
                                                                        <ListChecks size={12} className="text-indigo-400" />
                                                                        <span>{p.tareasCompletadas || 0} / {p.totalTareas || 0} Tareas</span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* SUB-INFO PARA MÓVILES O PANTALLAS PEQUEÑAS */}
                                                            <div className="mt-1.5 flex md:hidden flex-wrap items-center gap-1 text-[9px] font-bold text-slate-400 uppercase">
                                                                <span className="break-words">{p.gerencia || 'Global'}</span>
                                                                <span className="text-slate-200">/</span>
                                                                <span className="break-words">{p.subgerencia || 'General'}</span>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* FECHA INICIO */}
                                                    <td className="px-2 py-3 hidden xl:table-cell">
                                                        <span className="text-[10px] font-bold text-slate-700">
                                                            {(p as any).fechaInicio ? format(new Date((p as any).fechaInicio), 'dd/MM/yy', { locale: es }) : 'N/A'}
                                                        </span>
                                                    </td>

                                                    {/* FECHA FIN */}
                                                    <td className="px-2 py-3 hidden xl:table-cell">
                                                        <span className="text-[10px] font-bold text-slate-700">
                                                            {(p as any).fechaFin ? format(new Date((p as any).fechaFin), 'dd/MM/yy', { locale: es }) : 'N/A'}
                                                        </span>
                                                    </td>

                                                    <td className="px-2 py-3 hidden lg:table-cell text-center">
                                                        <ProgresoBadge proyecto={p} />
                                                    </td>

                                                    <td className="px-2 py-3 hidden lg:table-cell text-center">
                                                        <AtrasoBadge proyecto={p} />
                                                    </td>

                                                    {/* ACCIÓN (dropdown global fixed) */}
                                                    <td className="px-2 py-3 text-right align-top">
                                                        <div className="relative inline-block">
                                                            <button
                                                                onClick={(e) => toggleMenu(e, p.idProyecto)}
                                                                className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border transition-all shadow-sm ${activeMenuId === p.idProyecto ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                                                title="Acciones"
                                                            >
                                                                <MoreHorizontal size={18} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>

                                                {/* EXPANDED: SOLO DESCRIPCIÓN */}
                                                {
                                                    expandedRows[p.idProyecto] && (
                                                        <tr className="bg-slate-50/60">
                                                            <td colSpan={7} className="px-4 pb-4">
                                                                <div className="ml-[68px] mt-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                                                                    <p className="text-xs font-black text-slate-400 uppercase mb-2">Descripción</p>
                                                                    <p className="text-sm md:text-base text-slate-700 leading-relaxed">
                                                                        {(p as any).descripcion || 'Sin descripción detallada.'}
                                                                    </p>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )
                                                }
                                            </React.Fragment>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <PaginationBar page={page} lastPage={lastPage} total={total} limit={limit} visibleCount={projects.length} loading={loading} onPageChange={handlePageChange} onLimitChange={handleLimitChange} />
                </div>
            </div>

            {/* MODAL CLONAR */}
            <ProjectCloneModal
                isOpen={isCloneModalOpen}
                project={projectToClone}
                cloneName={cloneName}
                saving={saving}
                onCloneNameChange={setCloneName}
                onClose={() => setIsCloneModalOpen(false)}
                onSubmit={submitClone}
            />

            {/* MODAL CREAR/EDITAR */}
            <ProjectModal
                isOpen={isModalOpen}
                editingProject={editingProject}
                formData={formData as any}
                saving={saving}
                isUserSelectorOpen={isUserSelectorOpen}
                uniqueGerencias={uniqueGerencias}
                formUniqueSubgerencias={formUniqueSubgerencias}
                formUniqueAreas={formUniqueAreas}
                onFormDataChange={setFormData as any}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleCreateOrUpdate}
                onUserSelectorOpen={() => setIsUserSelectorOpen(true)}
                onUserSelectorClose={() => setIsUserSelectorOpen(false)}
                onUserSelect={(u) => {
                    const name = u.nombre || u.nombreCompleto || '';
                    setFormData(prev => ({ ...prev, responsableCarnet: u.carnet || '', responsableNombre: name }));
                    setIsUserSelectorOpen(false);
                }}
            />

            {/* MENU CONTEXTUAL */}
            <ProjectContextMenu
                menuRef={menuRef}
                activeMenuId={activeMenuId}
                menuPos={menuPos}
                projects={projects}
                onNavigatePlan={(p) => navigate(`/app/planning/plan-trabajo?projectId=${p.idProyecto}`)}
                onEdit={(p) => openModal(p)}
                onHistory={(p) => navigate(`/app/planning/proyectos/${p.idProyecto}/historial`)}
                onClone={handleCloneClick}
                onCollaborators={(p) => { setColaboradoresProject(p); setShowColaboradoresModal(true); }}
                onDelete={handleDelete}
                onClose={closeMenu}
            />

            {/* Modal Colaboradores */}
            {showColaboradoresModal && colaboradoresProject && (
                <GestionColaboradoresModal
                    idProyecto={colaboradoresProject.idProyecto}
                    proyectoNombre={colaboradoresProject.nombre}
                    modoVisibilidad={(colaboradoresProject as any).modoVisibilidad || 'JERARQUIA'}
                    onClose={() => {
                        setShowColaboradoresModal(false);
                        setColaboradoresProject(null);
                    }}
                />
            )}
        </div>
    );
};


/*
CÓMO ENTENDÍ TU PEDIDO (resumen real)
- Querías: “Proyecto” como celda principal con el nombre arriba y debajo ver “cómo se mira” el resto.
- Luego pediste: quitar columnas viejas (ya no quieres thead con Gerencia/Subgerencia/Área/Estado).
- Pero sí querías mostrar Estado + Progreso ahí mismo dentro de la celda Proyecto con icono/badge.
- Y que la columna Acción quedara igual (botones a la derecha).
Eso fue lo que apliqué.
*/
