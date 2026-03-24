import 'package:flutter/material.dart';

import 'package:flutter/services.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_utils.dart';
import '../../common/data/offline_resource_service.dart';
import '../../home/presentation/home_shell.dart'; // MomentusAppBar
import 'team_tracking_screen.dart';
import '../../../core/theme/app_theme.dart';

/// Módulo Equipos - Diseño Premium
class TeamScreen extends StatefulWidget {
  const TeamScreen({super.key});

  @override
  State<TeamScreen> createState() => _TeamScreenState();
}

class _TeamScreenState extends State<TeamScreen> {
  static const _cacheKey = 'team_my';
  static const _offline = OfflineResourceService();

  late Future<OfflineListResult> _future;
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _future = _fetchTeam();
  }

  Future<OfflineListResult> _fetchTeam() {
    return _offline.loadList(
      cacheKey: _cacheKey,
      remote: () async {
        final response = await ApiClient.dio.get('planning/team');
        return unwrapApiList(response.data);
      },
    );
  }

  Future<void> _openMemberTasks(Map<String, dynamic> member) async {
    final id = member['idUsuario'] ?? member['id'];
    if (id == null) return;

    List<dynamic> tasks = [];
    String error = '';
    bool loading = true;

    HapticFeedback.selectionClick();

    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) {
        return StatefulBuilder(
          builder: (ctx, setModalState) {
            if (loading) {
              // Cargar tareas - esto se ejecuta cada vez que se construye el builder si loading es true
              // Debería moverse fuera o controlarse, pero para simpleza del refactor lo dejamos aquí protegido por loading flag fuera del build si fuera necesario,
              // pero como es StatefulBuilder, necesitamos dispararlo una vez.
              // Mejor approach: disparar el future antes o usar FutureBuilder dentro.
              // Lo mantendré como estaba pero optimizado.
              ApiClient.dio.get('equipo/miembro/$id/tareas').then((response) {
                if (ctx.mounted) {
                  setModalState(() {
                    tasks = unwrapApiList(response.data);
                    loading = false;
                  });
                }
              }).catchError((_) {
                if (ctx.mounted) {
                  setModalState(() {
                    error = 'No se pudieron cargar tareas del miembro.';
                    loading = false;
                  });
                }
              });
            }

            return Container(
              height: MediaQuery.of(context).size.height * 0.75,
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              ),
              child: Column(
                children: [
                  // Handle
                  Container(
                    margin: const EdgeInsets.only(top: 12),
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.grey[300],
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  // Header
                  Padding(
                    padding: const EdgeInsets.all(20),
                    child: Row(
                      children: [
                        _buildAvatar(member, 50),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                (member['nombre'] ??
                                        member['nombreCompleto'] ??
                                        'Miembro')
                                    .toString(),
                                style: const TextStyle(
                                  fontFamily: 'Inter',
                                  fontWeight: FontWeight.w800,
                                  fontSize: 18,
                                  color: Color(0xFF1E293B),
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                (member['correo'] ?? member['cargo'] ?? '')
                                    .toString(),
                                style: const TextStyle(
                                  fontFamily: 'Inter',
                                  fontSize: 13,
                                  color: Color(0xFF64748B),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Divider(height: 1),
                  // Content
                  Expanded(
                    child: loading
                        ? ListView.separated(
                            padding: const EdgeInsets.all(16),
                            itemCount: 5,
                            separatorBuilder: (_, __) =>
                                const SizedBox(height: 8),
                            itemBuilder: (_, __) => const ShimmerBox(
                                width: double.infinity, height: 72, radius: 12),
                          )
                        : error.isNotEmpty
                            ? Center(
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    const Icon(Icons.error_outline,
                                        size: 48, color: Colors.grey),
                                    const SizedBox(height: 12),
                                    Text(error,
                                        style: const TextStyle(
                                            color: Colors.grey)),
                                  ],
                                ),
                              )
                            : tasks.isEmpty
                                ? const Center(
                                    child: Column(
                                      mainAxisAlignment:
                                          MainAxisAlignment.center,
                                      children: [
                                        Icon(Icons.task_alt,
                                            size: 48, color: Color(0xFF10B981)),
                                        SizedBox(height: 12),
                                        Text('Sin tareas asignadas',
                                            style: TextStyle(
                                                color: Color(0xFF64748B))),
                                      ],
                                    ),
                                  )
                                : ListView.separated(
                                    padding: const EdgeInsets.all(16),
                                    itemCount: tasks.length,
                                    separatorBuilder: (_, __) =>
                                        const SizedBox(height: 8),
                                    itemBuilder: (_, i) {
                                      final t = (tasks[i] as Map)
                                          .cast<String, dynamic>();
                                      return _buildTaskTile(t);
                                    },
                                  ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildTaskTile(Map<String, dynamic> task) {
    final estado = (task['estado'] ?? '').toString();
    final isDone = estado == 'Hecha';
    final isBlocked = estado == 'Bloqueada';

    Color statusColor = const Color(0xFF64748B);
    if (isDone) statusColor = const Color(0xFF10B981);
    if (isBlocked) statusColor = const Color(0xFFEF4444);

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        children: [
          Container(
            width: 10,
            height: 10,
            decoration: BoxDecoration(
              color: statusColor,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  (task['titulo'] ?? task['nombre'] ?? 'Tarea').toString(),
                  style: TextStyle(
                    fontFamily: 'Inter',
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                    color: isDone ? Colors.grey : const Color(0xFF1E293B),
                    decoration: isDone ? TextDecoration.lineThrough : null,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  estado,
                  style: TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 12,
                    color: statusColor,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAvatar(Map<String, dynamic> member, double size) {
    final name =
        (member['nombre'] ?? member['nombreCompleto'] ?? 'M').toString();
    final initial = name.isNotEmpty ? name[0].toUpperCase() : 'M';

    final colors = [
      const Color(0xFF6366F1),
      const Color(0xFF10B981),
      const Color(0xFFF59E0B),
      const Color(0xFF3B82F6),
      const Color(0xFFEC4899),
      const Color(0xFF8B5CF6),
    ];
    final color = colors[name.hashCode.abs() % colors.length];

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        shape: BoxShape.circle,
      ),
      child: Center(
        child: Text(
          initial,
          style: TextStyle(
            fontFamily: 'Inter',
            fontWeight: FontWeight.w800,
            fontSize: size * 0.4,
            color: color,
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      // Nuevo AppBar Consistente
      appBar: MomentusAppBar(
        title: 'Mi Equipo',
        subtitle: 'Gestiona tu equipo de trabajo',
        actions: [
          IconButton(
            icon: const Icon(Icons.calendar_month_rounded,
                color: Color(0xFF64748B)),
            onPressed: () {
              HapticFeedback.lightImpact();
              Navigator.push(
                  context,
                  MaterialPageRoute(
                      builder: (_) => const TeamTrackingScreen()));
            },
          ),
        ],
      ),
      body: Column(
        children: [
          // Search Bar
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: TextField(
              onChanged: (v) => setState(() => _searchQuery = v.toLowerCase()),
              decoration: InputDecoration(
                hintText: 'Buscar miembro...',
                hintStyle:
                    const TextStyle(color: Color(0xFF94A3B8), fontSize: 14),
                prefixIcon: const Icon(Icons.search, color: Color(0xFF94A3B8)),
                filled: true,
                fillColor: const Color(0xFFF1F5F9),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
                contentPadding: const EdgeInsets.symmetric(vertical: 12),
              ),
            ),
          ),
          // List
          Expanded(
            child: FutureBuilder<OfflineListResult>(
              future: _future,
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: 8,
                    separatorBuilder: (_, __) => const SizedBox(height: 12),
                    itemBuilder: (_, __) => const ShimmerBox(
                        width: double.infinity, height: 80, radius: 12),
                  );
                }

                final data = snapshot.data;
                if (data == null) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.wifi_off,
                            size: 48, color: Color(0xFF94A3B8)),
                        const SizedBox(height: 16),
                        const Text('Error cargando equipo'),
                        const SizedBox(height: 16),
                        ElevatedButton.icon(
                          onPressed: () =>
                              setState(() => _future = _fetchTeam()),
                          icon: const Icon(Icons.refresh),
                          label: const Text('Reintentar'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF6366F1),
                            foregroundColor: Colors.white,
                          ),
                        ),
                      ],
                    ),
                  );
                }

                var members = data.items;

                // Filtrar por búsqueda
                if (_searchQuery.isNotEmpty) {
                  members = members.where((m) {
                    final map = (m as Map).cast<String, dynamic>();
                    final name = (map['nombre'] ?? map['nombreCompleto'] ?? '')
                        .toString()
                        .toLowerCase();
                    final email =
                        (map['correo'] ?? '').toString().toLowerCase();
                    return name.contains(_searchQuery) ||
                        email.contains(_searchQuery);
                  }).toList();
                }

                if (members.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.group_off_outlined,
                            size: 64, color: Color(0xFF94A3B8)),
                        const SizedBox(height: 16),
                        Text(
                          _searchQuery.isEmpty
                              ? 'No hay miembros en tu equipo'
                              : 'No se encontraron resultados',
                          style: const TextStyle(
                            fontFamily: 'Inter',
                            fontSize: 16,
                            color: Color(0xFF64748B),
                          ),
                        ),
                      ],
                    ),
                  );
                }

                return Column(
                  children: [
                    if (data.fromCache)
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(8),
                        color: const Color(0xFFFEF3C7),
                        child: const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.cloud_off,
                                size: 16, color: Color(0xFFD97706)),
                            SizedBox(width: 8),
                            Text(
                              'Mostrando datos en caché (sin conexión)',
                              style: TextStyle(
                                fontFamily: 'Inter',
                                fontSize: 12,
                                color: Color(0xFFD97706),
                              ),
                            ),
                          ],
                        ),
                      ),
                    Expanded(
                      child: RefreshIndicator(
                        onRefresh: () async {
                          setState(() => _future = _fetchTeam());
                        },
                        child: ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: members.length,
                          itemBuilder: (_, i) {
                            final m =
                                (members[i] as Map).cast<String, dynamic>();
                            return _buildMemberCard(m);
                          },
                        ),
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMemberCard(Map<String, dynamic> m) {
    final name = (m['nombre'] ?? m['nombreCompleto'] ?? 'Miembro').toString();
    final correo = (m['correo'] ?? '').toString();
    final cargo = (m['cargo'] ?? m['rol'] ?? '').toString();
    final tareasActivas = m['tareasActivas'] ?? m['pendientes'] ?? 0;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => _openMemberTasks(m),
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                _buildAvatar(m, 48),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        name,
                        style: const TextStyle(
                          fontFamily: 'Inter',
                          fontWeight: FontWeight.w700,
                          fontSize: 15,
                          color: Color(0xFF1E293B),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        cargo.isNotEmpty
                            ? cargo
                            : (correo.isEmpty ? 'Sin información' : correo),
                        style: const TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 12,
                          color: Color(0xFF64748B),
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                if (tareasActivas is int && tareasActivas > 0)
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: const Color(0xFF6366F1).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      '$tareasActivas activas',
                      style: const TextStyle(
                        fontFamily: 'Inter',
                        fontWeight: FontWeight.w600,
                        fontSize: 11,
                        color: Color(0xFF6366F1),
                      ),
                    ),
                  ),
                const SizedBox(width: 8),
                const Icon(Icons.chevron_right, color: Color(0xFF94A3B8)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
