import 'package:flutter/material.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_utils.dart';
import '../../../core/theme/app_theme.dart';
import '../../common/data/offline_resource_service.dart';

/// Pantalla de bloqueos del equipo
/// Muestra bloqueos activos reportados por miembros del equipo
class TeamBlockersScreen extends StatefulWidget {
  const TeamBlockersScreen({super.key});

  @override
  State<TeamBlockersScreen> createState() => _TeamBlockersScreenState();
}

class _TeamBlockersScreenState extends State<TeamBlockersScreen> {
  final _offlineService = const OfflineResourceService();
  late Future<OfflineListResult> _blockersFuture;
  bool _fromCache = false;
  String _filter = 'Activos'; // Activos, Resueltos, Todos

  @override
  void initState() {
    super.initState();
    _blockersFuture = _fetchBlockers();
  }

  Future<OfflineListResult> _fetchBlockers() async {
    return _offlineService.loadList(
      cacheKey: 'team_blockers',
      remote: () async {
        final response = await ApiClient.dio.get('equipo/bloqueos');
        return unwrapApiList(response.data);
      },
    );
  }

  Future<void> _refresh() async {
    setState(() {
      _blockersFuture = _fetchBlockers();
    });
  }

  List<dynamic> _applyFilter(List<dynamic> blockers) {
    if (_filter == 'Todos') return blockers;

    return blockers.where((b) {
      final estado = (b['estado'] ?? b['activo']?.toString() ?? 'activo')
          .toString()
          .toLowerCase();
      if (_filter == 'Activos') {
        return estado.contains('activ') || estado == 'true' || estado == '1';
      } else {
        return estado.contains('resuelt') || estado == 'false' || estado == '0';
      }
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Bloqueos del Equipo'),
        actions: [
          if (_fromCache)
            Padding(
              padding: const EdgeInsets.only(right: 12),
              child: Chip(
                label: const Text('Offline', style: TextStyle(fontSize: 11)),
                backgroundColor: MomentusTheme.warning.withValues(alpha: 0.2),
                side: BorderSide.none,
                padding: EdgeInsets.zero,
              ),
            ),
        ],
      ),
      body: Column(
        children: [
          // Filtros
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              children: [
                _filterChip('Activos', Icons.warning_amber_rounded,
                    MomentusTheme.error),
                const SizedBox(width: 8),
                _filterChip('Resueltos', Icons.check_circle_outline,
                    MomentusTheme.success),
                const SizedBox(width: 8),
                _filterChip('Todos', Icons.list, MomentusTheme.slate500),
              ],
            ),
          ),

          // Lista de bloqueos
          Expanded(
            child: RefreshIndicator(
              onRefresh: _refresh,
              child: FutureBuilder<OfflineListResult>(
                future: _blockersFuture,
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Center(child: CircularProgressIndicator());
                  }

                  if (snapshot.hasError) {
                    return _buildEmptyState(
                      icon: Icons.cloud_off,
                      message: 'Error al cargar bloqueos',
                      subtitle: 'Verifica tu conexión e intenta de nuevo',
                    );
                  }

                  final result = snapshot.data!;
                  final blockers = _applyFilter(result.items);

                  // Actualizar estado de caché
                  WidgetsBinding.instance.addPostFrameCallback((_) {
                    if (mounted && _fromCache != result.fromCache) {
                      setState(() => _fromCache = result.fromCache);
                    }
                  });

                  if (blockers.isEmpty) {
                    return _buildEmptyState(
                      icon: _filter == 'Activos'
                          ? Icons.celebration
                          : Icons.search_off,
                      message: _filter == 'Activos'
                          ? '¡Sin bloqueos activos!'
                          : 'No hay bloqueos',
                      subtitle: _filter == 'Activos'
                          ? 'El equipo está trabajando sin impedimentos'
                          : 'Prueba cambiando el filtro',
                    );
                  }

                  return ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: blockers.length,
                    itemBuilder: (context, index) =>
                        _buildBlockerCard(blockers[index]),
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _filterChip(String label, IconData icon, Color color) {
    final isSelected = _filter == label;

    return FilterChip(
      selected: isSelected,
      label: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: isSelected ? Colors.white : color),
          const SizedBox(width: 4),
          Text(label),
        ],
      ),
      onSelected: (_) => setState(() => _filter = label),
      selectedColor: color,
      checkmarkColor: Colors.white,
      labelStyle: TextStyle(
        color: isSelected ? Colors.white : MomentusTheme.slate700,
        fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
      ),
    );
  }

  Widget _buildEmptyState({
    required IconData icon,
    required String message,
    required String subtitle,
  }) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 64, color: MomentusTheme.slate300),
            const SizedBox(height: 16),
            Text(
              message,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: MomentusTheme.slate600,
                  ),
            ),
            const SizedBox(height: 8),
            Text(
              subtitle,
              style: const TextStyle(color: MomentusTheme.slate400),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBlockerCard(Map<String, dynamic> blocker) {
    final titulo = blocker['titulo']?.toString() ??
        blocker['descripcion']?.toString() ??
        'Sin descripción';
    final usuario = blocker['usuarioNombre']?.toString() ??
        blocker['usuario']?.toString() ??
        'Usuario';
    final fecha = blocker['fechaCreacion']?.toString() ??
        blocker['fecha']?.toString() ??
        '-';
    final estado = blocker['estado']?.toString() ??
        (blocker['activo'] == true ? 'Activo' : 'Resuelto');

    final isActive = estado.toLowerCase().contains('activ') ||
        blocker['activo'] == true ||
        blocker['activo'] == 1;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(MomentusTheme.radiusLg),
        border: Border.all(
          color: isActive
              ? MomentusTheme.error.withValues(alpha: 0.3)
              : MomentusTheme.slate200,
          width: isActive ? 2 : 1,
        ),
        boxShadow: MomentusTheme.cardShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: isActive
                      ? MomentusTheme.error.withValues(alpha: 0.1)
                      : MomentusTheme.success.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  isActive ? Icons.warning_amber_rounded : Icons.check_circle,
                  color: isActive ? MomentusTheme.error : MomentusTheme.success,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      usuario,
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                      ),
                    ),
                    Text(
                      _formatDate(fecha),
                      style: const TextStyle(
                        fontSize: 12,
                        color: MomentusTheme.slate400,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: isActive
                      ? MomentusTheme.error.withValues(alpha: 0.1)
                      : MomentusTheme.success.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  isActive ? 'Activo' : 'Resuelto',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color:
                        isActive ? MomentusTheme.error : MomentusTheme.success,
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 12),

          // Descripción
          Text(
            titulo,
            style: const TextStyle(
              color: MomentusTheme.slate700,
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }

  String _formatDate(String dateStr) {
    if (dateStr == '-' || dateStr.isEmpty) return '-';
    try {
      final date = DateTime.parse(dateStr);
      final now = DateTime.now();
      final diff = now.difference(date);

      if (diff.inDays == 0) {
        return 'Hoy ${date.hour}:${date.minute.toString().padLeft(2, '0')}';
      } else if (diff.inDays == 1) {
        return 'Ayer';
      } else if (diff.inDays < 7) {
        return 'Hace ${diff.inDays} días';
      } else {
        return '${date.day}/${date.month}/${date.year}';
      }
    } catch (_) {
      return dateStr.length > 10 ? dateStr.substring(0, 10) : dateStr;
    }
  }
}
