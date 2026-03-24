import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../core/network/api_client.dart';
import '../../../core/theme/app_theme.dart';
import '../../home/presentation/home_shell.dart';

class TeamTrackingScreen extends StatefulWidget {
  const TeamTrackingScreen({super.key});

  @override
  State<TeamTrackingScreen> createState() => _TeamTrackingScreenState();
}

class _TeamTrackingScreenState extends State<TeamTrackingScreen> {
  bool _loading = true;
  String? _error;
  List<dynamic> _members = [];
  DateTime _currentDate = DateTime.now();

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  Future<void> _fetchData() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final dateStr = DateFormat('yyyy-MM-dd').format(_currentDate);
      final response = await ApiClient.dio.get(
        'equipo/inform',
        queryParameters: {'fecha': dateStr},
      );

      final data = response.data;
      if (data is Map && data.containsKey('miembros')) {
        _members = data['miembros'] as List<dynamic>;
      } else if (data is List) {
        _members = data;
      } else {
        _members = [];
      }
    } catch (e) {
      _error = 'Error cargando seguimiento: $e';
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: MomentusAppBar(
        title: 'Seguimiento Agenda',
        subtitle: DateFormat('EEEE d MMMM', 'es_ES').format(_currentDate),
        actions: [
          IconButton(
            icon: const Icon(Icons.calendar_today_rounded),
            onPressed: () async {
              final picked = await showDatePicker(
                context: context,
                initialDate: _currentDate,
                firstDate: DateTime(2020),
                lastDate: DateTime(2030),
              );
              if (picked != null) {
                setState(() => _currentDate = picked);
                _fetchData();
              }
            },
          ),
        ],
      ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: MomentusTheme.primary))
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.error_outline,
                          size: 48, color: Colors.grey),
                      const SizedBox(height: 16),
                      Text(_error!, style: const TextStyle(color: Colors.grey)),
                      ElevatedButton(
                        onPressed: _fetchData,
                        child: const Text('Reintentar'),
                      )
                    ],
                  ),
                )
              : _members.isEmpty
                  ? const Center(
                      child: Text(
                          "No se encontró información del equipo para esta fecha."))
                  : ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: _members.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 12),
                      itemBuilder: (context, index) {
                        final member = _members[index];
                        return _buildMemberCard(member);
                      },
                    ),
    );
  }

  Widget _buildMemberCard(dynamic member) {
    final m = member as Map<String, dynamic>;
    final nombre = m['nombre'] ?? m['nombreCompleto'] ?? 'Miembro';
    final checkin = m['checkin'];
    final animo = checkin?['estadoAnimo'];
    final tareas = m['tareas'] as List? ?? [];

    // Tareas principales (Focus)
    final focusTasks = tareas
        .where((t) => t['tipo'] == 'Entrego' || t['prioridad'] == 'Alta')
        .toList();
    if (focusTasks.isEmpty && tareas.isNotEmpty) {
      // Fallback: take first task
      focusTasks.add(tareas.first);
    }

    // Checkin status
    final hasCheckin = checkin != null;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          // Header: Name & Status
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                CircleAvatar(
                  backgroundColor: MomentusTheme.primary.withValues(alpha: 0.1),
                  child: Text(
                    nombre.isNotEmpty ? nombre[0].toUpperCase() : '?',
                    style: const TextStyle(
                        color: MomentusTheme.primary,
                        fontWeight: FontWeight.bold),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        nombre,
                        style: const TextStyle(
                          fontFamily: 'Inter',
                          fontWeight: FontWeight.w700,
                          fontSize: 15,
                          color: Color(0xFF1E293B),
                        ),
                      ),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          Icon(
                            hasCheckin ? Icons.check_circle : Icons.schedule,
                            size: 14,
                            color: hasCheckin
                                ? const Color(0xFF10B981)
                                : const Color(0xFF94A3B8),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            hasCheckin
                                ? 'Plan confirmado'
                                : 'Pendiente de plan',
                            style: TextStyle(
                              fontSize: 12,
                              color: hasCheckin
                                  ? const Color(0xFF10B981)
                                  : const Color(0xFF94A3B8),
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                if (animo != null)
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(_getEmojiForMood(animo),
                        style: const TextStyle(fontSize: 16)),
                  ),
              ],
            ),
          ),

          if (hasCheckin && focusTasks.isNotEmpty) ...[
            const Divider(height: 1, indent: 16, endIndent: 16),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'FOCO DEL DÍA',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF94A3B8),
                      letterSpacing: 1.0,
                    ),
                  ),
                  const SizedBox(height: 8),
                  ...focusTasks.map((t) => Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Padding(
                              padding: EdgeInsets.only(top: 2),
                              child: Icon(Icons.adjust_rounded,
                                  size: 14, color: MomentusTheme.primary),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                t['titulo'] ?? 'Sin título',
                                style: const TextStyle(
                                  fontSize: 13,
                                  color: Color(0xFF334155),
                                  fontWeight: FontWeight.w500,
                                ),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      )),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  String _getEmojiForMood(String mood) {
    switch (mood.toLowerCase()) {
      case 'feliz':
        return '😄';
      case 'bien':
        return '🙂';
      case 'normal':
        return '😐';
      case 'cansado':
        return '😫';
      case 'triste':
        return '😢';
      case 'enojado':
        return '😠';
      default:
        return '😐';
    }
  }
}
