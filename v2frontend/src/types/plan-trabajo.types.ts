export type ViewMode = 'list' | 'board' | 'gantt' | 'roadmap' | 'integral';
export interface TeamMember { idUsuario: number; nombre: string; correo: string; carnet?: string; }
export interface Comment { id: number; idLog?: number; user: string; text: string; timestamp: string; isMine?: boolean; dateObj?: Date; }
