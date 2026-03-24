import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'dart:math';

import '../../../core/network/api_client.dart';

import '../../home/presentation/home_shell.dart';

// ============================================================
// SEGUIMIENTO DE AGENDA - Team Agenda Compliance
// Replica AgendaCompliancePage.tsx de React
// Endpoint: GET /reports/agenda-compliance?fecha=
// ============================================================

class AgendaComplianceScreen extends StatefulWidget {
  const AgendaComplianceScreen({super.key});

  @override
  State<AgendaComplianceScreen> createState() => _AgendaComplianceScreenState();
}

class _AgendaComplianceScreenState extends State<AgendaComplianceScreen> {
  DateTime _date = DateTime.now();
  bool _loading = true;
  String? _error;

  List<Map<String, dynamic>> _items = [];
  Map<String, dynamic> _resumenAnimo = {
    'feliz': 0,
    'neutral': 0,
    'triste': 0,
    'promedio': 0,
  };

  // Tab: 'compliant' or 'missing'
  String _activeTab = 'compliant';
  Set<String> _expandedAreas = {};

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final response = await ApiClient.dio.get(
        'reports/agenda-compliance',
        queryParameters: {'fecha': _date.toIso8601String()},
      );

      final rawData = response.data;
      Map<String, dynamic> data;
      if (rawData is Map<String, dynamic> &&
          rawData.containsKey('data') &&
          rawData['data'] is Map<String, dynamic>) {
        data = rawData['data'] as Map<String, dynamic>;
      } else if (rawData is Map<String, dynamic>) {
        data = rawData;
      } else {
        data = {};
      }

      final List<dynamic> miembros = data['miembros'] ?? [];

      // Filter out test users
      final cleanItems = miembros
          .where((m) {
            final name =
                (m['usuario']?['nombre'] ?? '').toString().toLowerCase();
            return !name.contains('test') && !name.contains('prueba');
          })
          .map((m) => m as Map<String, dynamic>)
          .toList();

      final areas = cleanItems
          .map((i) => (i['usuario']?['area'] ?? 'Sin Subgerencia').toString())
          .toSet();

      setState(() {
        _items = cleanItems;
        _resumenAnimo = (data['resumenAnimo'] as Map<String, dynamic>?) ??
            {'feliz': 0, 'neutral': 0, 'triste': 0, 'promedio': 0};
        _expandedAreas = areas;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Error al cargar datos: $e';
        _loading = false;
      });
    }
  }

  List<Map<String, dynamic>> get _compliantItems =>
      _items.where((i) => i['checkin'] != null).toList();

  List<Map<String, dynamic>> get _missingItems =>
      _items.where((i) => i['checkin'] == null).toList();

  int get _total => _items.length;
  int get _compliant => _compliantItems.length;
  int get _missing => _total - _compliant;
  int get _rate => _total > 0 ? ((_compliant / _total) * 100).round() : 0;

  Map<String, int> get _globalStats {
    int hechas = 0, enCurso = 0, retrasadas = 0, bloqueadas = 0;
    for (final item in _items) {
      final stats = item['estadisticas'] as Map<String, dynamic>?;
      if (stats != null) {
        hechas += (stats['hechas'] as num?)?.toInt() ?? 0;
        enCurso += (stats['enCurso'] as num?)?.toInt() ?? 0;
        retrasadas += (stats['retrasadas'] as num?)?.toInt() ?? 0;
        bloqueadas += (stats['bloqueadas'] as num?)?.toInt() ?? 0;
      }
    }
    return {
      'hechas': hechas,
      'enCurso': enCurso,
      'retrasadas': retrasadas,
      'bloqueadas': bloqueadas,
    };
  }

  Map<String, List<Map<String, dynamic>>> _groupByArea(
      List<Map<String, dynamic>> list) {
    final map = <String, List<Map<String, dynamic>>>{};
    for (final item in list) {
      final area = (item['usuario']?['area'] ?? 'Sin Subgerencia').toString();
      map.putIfAbsent(area, () => []);
      map[area]!.add(item);
    }
    return map;
  }

  bool get _isToday {
    final now = DateTime.now();
    return _date.year == now.year &&
        _date.month == now.month &&
        _date.day == now.day;
  }

  Future<void> _pickDate() async {
    HapticFeedback.lightImpact();
    final picked = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: Color(0xFF6366F1),
              onPrimary: Colors.white,
              onSurface: Color(0xFF0F172A),
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      setState(() => _date = picked);
      _loadData();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: const MomentusAppBar(
        title: 'Seguimiento',
        subtitle: 'Cumplimiento de agenda del equipo',
        showBack: true,
      ),
      body: _loading
          ? const Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  CircularProgressIndicator(
                    color: Color(0xFF6366F1),
                    strokeWidth: 3,
                  ),
                  SizedBox(height: 16),
                  Text(
                    'Cargando reporte...',
                    style: TextStyle(
                      color: Color(0xFF94A3B8),
                      fontSize: 13,
                      fontFamily: 'Inter',
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            )
          : _error != null
              ? _buildErrorState()
              : RefreshIndicator(
                  onRefresh: _loadData,
                  color: const Color(0xFF6366F1),
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      _buildDateSelector(),
                      const SizedBox(height: 16),
                      _buildComplianceRingCard(),
                      const SizedBox(height: 12),
                      _buildStatsGrid(),
                      const SizedBox(height: 12),
                      _buildMoodCard(),
                      const SizedBox(height: 16),
                      _buildTabSelector(),
                      const SizedBox(height: 12),
                      _buildGroupedList(),
                      const SizedBox(height: 24),
                    ],
                  ),
                ),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline_rounded,
                size: 48, color: Color(0xFFEF4444)),
            const SizedBox(height: 16),
            Text(
              _error!,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: Color(0xFF64748B),
                fontSize: 14,
                fontFamily: 'Inter',
              ),
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: _loadData,
              icon: const Icon(Icons.refresh_rounded, size: 18),
              label: const Text('Reintentar'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF6366F1),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── DATE SELECTOR ──
  Widget _buildDateSelector() {
    final monthNames = [
      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'octubre',
      'noviembre',
      'diciembre'
    ];
    final dayNames = [
      'lunes',
      'martes',
      'miércoles',
      'jueves',
      'viernes',
      'sábado',
      'domingo'
    ];
    final dayName = dayNames[_date.weekday - 1];
    final dateStr = '$dayName ${_date.day} de ${monthNames[_date.month - 1]}';

    return Row(
      children: [
        if (!_isToday)
          GestureDetector(
            onTap: () {
              setState(() => _date = DateTime.now());
              _loadData();
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFFEEF2FF),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Text(
                'Hoy',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF6366F1),
                  fontFamily: 'Inter',
                ),
              ),
            ),
          ),
        if (!_isToday) const SizedBox(width: 8),
        Expanded(
          child: GestureDetector(
            onTap: _pickDate,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE2E8F0)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.03),
                    blurRadius: 4,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Row(
                children: [
                  const Icon(CupertinoIcons.calendar,
                      size: 16, color: Color(0xFF94A3B8)),
                  const SizedBox(width: 8),
                  Text(
                    dateStr,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF334155),
                      fontFamily: 'Inter',
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(width: 8),
        GestureDetector(
          onTap: _loadData,
          child: Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: const Icon(CupertinoIcons.refresh,
                size: 18, color: Color(0xFF64748B)),
          ),
        ),
      ],
    );
  }

  // ── COMPLIANCE RING ──
  Widget _buildComplianceRingCard() {
    final rateColor = _rate >= 80
        ? const Color(0xFF10B981)
        : _rate >= 50
            ? const Color(0xFFF59E0B)
            : const Color(0xFFEF4444);

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          // Ring
          SizedBox(
            width: 100,
            height: 100,
            child: CustomPaint(
              painter: _ComplianceRingPainter(
                  rate: _rate.toDouble(), color: rateColor),
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      '$_rate%',
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF0F172A),
                        fontFamily: 'Inter',
                      ),
                    ),
                    const Text(
                      'CUMPLE',
                      style: TextStyle(
                        fontSize: 8,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF94A3B8),
                        letterSpacing: 1.5,
                        fontFamily: 'Inter',
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(width: 20),

          // Info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '$_compliant de $_total miembros',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF0F172A),
                    fontFamily: 'Inter',
                  ),
                ),
                const SizedBox(height: 8),
                // Progress bar
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: _total > 0 ? _compliant / _total : 0,
                    backgroundColor: const Color(0xFFF1F5F9),
                    color: rateColor,
                    minHeight: 6,
                  ),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    _miniStat(Icons.check_circle_rounded,
                        '$_compliant con agenda', const Color(0xFF10B981)),
                    const SizedBox(width: 12),
                    _miniStat(Icons.error_outline_rounded,
                        '$_missing sin agenda', const Color(0xFF94A3B8)),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _miniStat(IconData icon, String text, Color color) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 12, color: color),
        const SizedBox(width: 4),
        Flexible(
          child: Text(
            text,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w700,
              color: color,
              fontFamily: 'Inter',
            ),
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }

  // ── STATS GRID ──
  Widget _buildStatsGrid() {
    final stats = _globalStats;
    return Row(
      children: [
        _statCard('Hechas', stats['hechas']!, const Color(0xFF10B981),
            Icons.check_circle_rounded),
        const SizedBox(width: 8),
        _statCard('En Curso', stats['enCurso']!, const Color(0xFF3B82F6),
            Icons.bolt_rounded),
        const SizedBox(width: 8),
        _statCard('Atrasadas', stats['retrasadas']!, const Color(0xFFEF4444),
            Icons.warning_amber_rounded),
        const SizedBox(width: 8),
        _statCard('Bloqueadas', stats['bloqueadas']!, const Color(0xFFF59E0B),
            Icons.block_rounded),
      ],
    );
  }

  Widget _statCard(String label, int value, Color color, IconData icon) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Flexible(
                  child: Text(
                    label.toUpperCase(),
                    style: const TextStyle(
                      fontSize: 8,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF94A3B8),
                      letterSpacing: 0.5,
                      fontFamily: 'Inter',
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Icon(icon, size: 14, color: color),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              '$value',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w900,
                color: value > 0 ? color : const Color(0xFFCBD5E1),
                fontFamily: 'Inter',
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── MOOD CARD ──
  Widget _buildMoodCard() {
    final feliz = (_resumenAnimo['feliz'] as num?)?.toInt() ?? 0;
    final neutral = (_resumenAnimo['neutral'] as num?)?.toInt() ?? 0;
    final triste = (_resumenAnimo['triste'] as num?)?.toInt() ?? 0;
    final sinDato = _total - feliz - neutral - triste;
    final maxVal = [feliz, neutral, triste, sinDato].reduce(max);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.emoji_emotions_rounded,
                  size: 16, color: Color(0xFFF59E0B)),
              SizedBox(width: 6),
              Text(
                'ESTADO DE ÁNIMO',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF94A3B8),
                  letterSpacing: 1,
                  fontFamily: 'Inter',
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              _moodBar('Bien', feliz, maxVal, const Color(0xFF10B981), '😊'),
              const SizedBox(width: 8),
              _moodBar(
                  'Normal', neutral, maxVal, const Color(0xFFF59E0B), '😐'),
              const SizedBox(width: 8),
              _moodBar('Bajo', triste, maxVal, const Color(0xFFEF4444), '😔'),
              const SizedBox(width: 8),
              _moodBar('N/A', sinDato, maxVal, const Color(0xFF94A3B8), '👤'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _moodBar(
      String label, int value, int maxVal, Color color, String emoji) {
    final height = maxVal > 0 ? max(8.0, (value / maxVal) * 60.0) : 8.0;
    return Expanded(
      child: Column(
        children: [
          Container(
            height: height,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.15),
              borderRadius:
                  const BorderRadius.vertical(top: Radius.circular(6)),
            ),
            child: Center(
              child: Text(
                '$value',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                  color: color,
                  fontFamily: 'Inter',
                ),
              ),
            ),
          ),
          const SizedBox(height: 4),
          Text(emoji, style: const TextStyle(fontSize: 16)),
          Text(
            label,
            style: const TextStyle(
              fontSize: 9,
              fontWeight: FontWeight.w600,
              color: Color(0xFF94A3B8),
              fontFamily: 'Inter',
            ),
          ),
        ],
      ),
    );
  }

  // ── TAB SELECTOR ──
  Widget _buildTabSelector() {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        children: [
          _tabButton(
            'Con Agenda',
            'compliant',
            _compliant,
            Icons.shield_rounded,
            const Color(0xFF10B981),
          ),
          const SizedBox(width: 4),
          _tabButton(
            'Sin Agenda',
            'missing',
            _missing,
            Icons.error_outline_rounded,
            const Color(0xFFEF4444),
          ),
        ],
      ),
    );
  }

  Widget _tabButton(
      String label, String tab, int count, IconData icon, Color color) {
    final isActive = _activeTab == tab;
    return Expanded(
      child: GestureDetector(
        onTap: () {
          HapticFeedback.selectionClick();
          setState(() => _activeTab = tab);
        },
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: isActive ? color : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
            boxShadow: isActive
                ? [
                    BoxShadow(
                      color: color.withValues(alpha: 0.3),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ]
                : null,
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon,
                  size: 16,
                  color: isActive ? Colors.white : const Color(0xFF94A3B8)),
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: isActive ? Colors.white : const Color(0xFF94A3B8),
                  fontFamily: 'Inter',
                ),
              ),
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: isActive
                      ? Colors.white.withValues(alpha: 0.2)
                      : color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '$count',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    color: isActive ? Colors.white : color,
                    fontFamily: 'Inter',
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ── GROUPED LIST ──
  Widget _buildGroupedList() {
    final activeList =
        _activeTab == 'compliant' ? _compliantItems : _missingItems;
    final grouped = _groupByArea(activeList);

    if (grouped.isEmpty) {
      return Container(
        padding: const EdgeInsets.symmetric(vertical: 40),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: const Color(0xFFE2E8F0),
            style: BorderStyle.solid,
          ),
        ),
        child: Column(
          children: [
            Icon(
              _activeTab == 'compliant'
                  ? Icons.error_outline_rounded
                  : Icons.check_circle_rounded,
              size: 48,
              color: const Color(0xFFCBD5E1),
            ),
            const SizedBox(height: 12),
            Text(
              _activeTab == 'compliant'
                  ? 'Nadie ha registrado agenda hoy'
                  : '¡Todos tienen agenda! 🎉',
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: Color(0xFF334155),
                fontFamily: 'Inter',
              ),
            ),
            const SizedBox(height: 4),
            Text(
              _activeTab == 'compliant'
                  ? 'Puede que sea un día sin actividad laboral.'
                  : 'El equipo completo hizo su planificación.',
              style: const TextStyle(
                fontSize: 12,
                color: Color(0xFF94A3B8),
                fontFamily: 'Inter',
              ),
            ),
          ],
        ),
      );
    }

    final sortedKeys = grouped.keys.toList()..sort();
    return Column(
      children: sortedKeys.map((area) {
        final members = grouped[area]!;
        final isExpanded = _expandedAreas.contains(area);
        final areaColor = _activeTab == 'compliant'
            ? const Color(0xFF10B981)
            : const Color(0xFFEF4444);

        return Container(
          margin: const EdgeInsets.only(bottom: 8),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: Column(
            children: [
              // Area Header
              GestureDetector(
                onTap: () {
                  HapticFeedback.selectionClick();
                  setState(() {
                    if (isExpanded) {
                      _expandedAreas.remove(area);
                    } else {
                      _expandedAreas.add(area);
                    }
                  });
                },
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  child: Row(
                    children: [
                      AnimatedRotation(
                        turns: isExpanded ? 0.0 : -0.25,
                        duration: const Duration(milliseconds: 200),
                        child: const Icon(Icons.expand_more_rounded,
                            size: 20, color: Color(0xFF94A3B8)),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              area,
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w800,
                                color: Color(0xFF334155),
                                fontFamily: 'Inter',
                                letterSpacing: 0.5,
                              ),
                            ),
                            Text(
                              '${members.length} miembro${members.length > 1 ? 's' : ''}',
                              style: const TextStyle(
                                fontSize: 10,
                                color: Color(0xFF94A3B8),
                                fontFamily: 'Inter',
                              ),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: areaColor.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          '${members.length}',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            color: areaColor,
                            fontFamily: 'Inter',
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // Members List
              if (isExpanded)
                Container(
                  decoration: const BoxDecoration(
                    border: Border(top: BorderSide(color: Color(0xFFF1F5F9))),
                  ),
                  child: Column(
                    children: members.map((item) {
                      return _buildMemberRow(item);
                    }).toList(),
                  ),
                ),
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _buildMemberRow(Map<String, dynamic> item) {
    final usuario = item['usuario'] as Map<String, dynamic>? ?? {};
    final checkin = item['checkin'] as Map<String, dynamic>?;
    final stats = item['estadisticas'] as Map<String, dynamic>?;
    final nombre = (usuario['nombre'] ?? '??').toString();
    final rol = (usuario['rol'] is Map
            ? usuario['rol']['nombre']
            : usuario['rol'] ?? '')
        .toString();
    final initials = nombre.length >= 2
        ? nombre.substring(0, 2).toUpperCase()
        : nombre.toUpperCase();

    final isCompliant = _activeTab == 'compliant';
    final avatarColor =
        isCompliant ? const Color(0xFF10B981) : const Color(0xFFEF4444);
    final avatarBg =
        isCompliant ? const Color(0xFFECFDF5) : const Color(0xFFFEF2F2);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: Color(0xFFF8FAFC))),
      ),
      child: Row(
        children: [
          // Avatar
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: avatarBg,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Center(
              child: Text(
                initials,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: avatarColor,
                  fontFamily: 'Inter',
                ),
              ),
            ),
          ),
          const SizedBox(width: 10),

          // Name + Role
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  nombre,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF334155),
                    fontFamily: 'Inter',
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  rol,
                  style: const TextStyle(
                    fontSize: 10,
                    color: Color(0xFF94A3B8),
                    fontFamily: 'Inter',
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),

                // Stats badges (only for compliant)
                if (isCompliant && stats != null) ...[
                  const SizedBox(height: 4),
                  Wrap(
                    spacing: 4,
                    runSpacing: 2,
                    children: [
                      if ((stats['hechas'] ?? 0) > 0)
                        _statBadge(
                            '${stats['hechas']}✓', const Color(0xFF10B981)),
                      if ((stats['enCurso'] ?? 0) > 0)
                        _statBadge(
                            '${stats['enCurso']}⚡', const Color(0xFF3B82F6)),
                      if ((stats['retrasadas'] ?? 0) > 0)
                        _statBadge(
                            '${stats['retrasadas']}⚠', const Color(0xFFEF4444)),
                      if ((stats['bloqueadas'] ?? 0) > 0)
                        _statBadge('${stats['bloqueadas']}🚫',
                            const Color(0xFFF59E0B)),
                    ],
                  ),
                ],
              ],
            ),
          ),

          // Mood + Time / Status
          if (isCompliant && checkin != null) ...[
            if (checkin['estadoAnimo'] != null) ...[
              _moodIcon(checkin['estadoAnimo'].toString()),
              const SizedBox(width: 8),
            ],
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFFECFDF5),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.access_time_rounded,
                      size: 12, color: Color(0xFF10B981)),
                  const SizedBox(width: 4),
                  Text(
                    _formatTime(checkin['fecha']?.toString()),
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF059669),
                      fontFamily: 'Inter',
                    ),
                  ),
                ],
              ),
            ),
          ] else
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Text(
                'PENDIENTE',
                style: TextStyle(
                  fontSize: 9,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF94A3B8),
                  letterSpacing: 0.5,
                  fontFamily: 'Inter',
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _statBadge(String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 9,
          fontWeight: FontWeight.w700,
          color: color,
          fontFamily: 'Inter',
        ),
      ),
    );
  }

  Widget _moodIcon(String mood) {
    String emoji;
    if (mood == 'Tope' || mood == 'Bien') {
      emoji = '😊';
    } else if (mood == 'Bajo') {
      emoji = '😔';
    } else {
      emoji = '😐';
    }
    return Text(emoji, style: const TextStyle(fontSize: 18));
  }

  String _formatTime(String? dateStr) {
    if (dateStr == null) return '-';
    try {
      final dt = DateTime.parse(dateStr);
      return '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return '-';
    }
  }
}

// ── COMPLIANCE RING PAINTER ──
class _ComplianceRingPainter extends CustomPainter {
  final double rate;
  final Color color;

  _ComplianceRingPainter({required this.rate, required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = (size.width - 10) / 2;
    const strokeWidth = 8.0;

    // Background ring
    final bgPaint = Paint()
      ..color = const Color(0xFFF1F5F9)
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth;
    canvas.drawCircle(center, radius, bgPaint);

    // Progress ring
    final progressPaint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    final sweepAngle = (rate / 100) * 2 * pi;
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      -pi / 2, // start from top
      sweepAngle,
      false,
      progressPaint,
    );
  }

  @override
  bool shouldRepaint(covariant _ComplianceRingPainter oldDelegate) =>
      oldDelegate.rate != rate || oldDelegate.color != color;
}
