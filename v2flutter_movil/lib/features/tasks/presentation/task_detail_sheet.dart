import 'package:flutter/material.dart';

import '../../../core/network/api_client.dart';

import '../../../core/theme/app_theme.dart';
import '../../common/presentation/user_search_sheet.dart';
import '../../common/domain/empleado.dart';

/// ============================================
/// TASK DETAIL SHEET - Modal de Detalle de Tarea (V2)
/// ============================================
/// Rediseñado para paridad visual con React TaskDetailModalV2.
class TaskDetailSheet extends StatefulWidget {
  final Map<String, dynamic> task;
  final VoidCallback? onUpdated;
  final ScrollController? scrollController;

  const TaskDetailSheet({
    super.key,
    required this.task,
    this.onUpdated,
    this.scrollController,
  });

  static Future<bool?> show(BuildContext context, Map<String, dynamic> task,
      {VoidCallback? onUpdated}) {
    return showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.95,
        minChildSize: 0.6,
        maxChildSize: 0.98,
        builder: (context, scrollController) => TaskDetailSheet(
          task: task,
          onUpdated: onUpdated,
          scrollController: scrollController,
        ),
      ),
    );
  }

  @override
  State<TaskDetailSheet> createState() => _TaskDetailSheetState();
}

class _TaskDetailSheetState extends State<TaskDetailSheet> {
  // Datos
  late Map<String, dynamic> _taskData;
  bool _isLoadingFull = true;
  bool _saving = false;
  bool _hasChanges = false;

  // Controllers
  late TextEditingController _tituloCtrl;
  late TextEditingController _descripcionCtrl;
  late TextEditingController _comentarioCtrl;
  late TextEditingController _evidenciaCtrl;

  // State vars
  String _estado = 'Pendiente';
  String _prioridad = 'Media';
  int _progreso = 0;
  DateTime? _fechaObjetivo;
  DateTime? _fechaInicio;

  // Asignación

  String? _assignedId;
  String _assignedName = 'Sin asignar';

  // ── Recordatorio ──
  Map<String, dynamic>? _existingReminder;
  DateTime? _reminderDate;
  TimeOfDay? _reminderTime;
  String _reminderNota = '';
  late TextEditingController _reminderNotaCtrl;
  bool _savingReminder = false;

  // ── Subtareas ──
  List<dynamic> _subtareas = [];
  final _newSubtaskCtrl = TextEditingController();
  bool _addingSubtask = false;

  @override
  void initState() {
    super.initState();
    _taskData = Map.from(widget.task); // Copia local inicial

    // Init vars from initial props
    _initForm();

    // Fetch full details
    _loadFullTask();
    _loadReminder();
  }

  void _initForm() {
    // Compatibilidad: titulo/nombre, progreso/porcentaje
    final titulo = _taskData['titulo']?.toString() ??
        _taskData['nombre']?.toString() ??
        '';
    final progreso = (_taskData['progreso'] ?? _taskData['porcentaje'] ?? 0);

    _tituloCtrl = TextEditingController(text: titulo);
    _descripcionCtrl =
        TextEditingController(text: _taskData['descripcion']?.toString() ?? '');
    _evidenciaCtrl = TextEditingController(
        text: _taskData['linkEvidencia']?.toString() ?? '');
    _comentarioCtrl =
        TextEditingController(); // Nuevo comentario siempre vacío al inicio
    _reminderNotaCtrl = TextEditingController();

    _estado = _taskData['estado']?.toString() ?? 'Pendiente';
    _prioridad = _taskData['prioridad']?.toString() ?? 'Media';
    _progreso = (progreso is num) ? progreso.toInt() : 0;

    _assignedId = _taskData['idResponsable']?.toString() ??
        _taskData['usuarioId']?.toString() ??
        _taskData['asignadoId']?.toString();
    _assignedName = _taskData['responsableNombre']?.toString() ??
        _taskData['asignadoNombre']?.toString() ??
        _taskData['nombreCompleto']?.toString() ??
        'Sin asignar';

    debugPrint(
        '📝 TaskDetailSheet initForm: titulo="$titulo", estado=$_estado, progreso=$_progreso');
  }

  Future<void> _loadFullTask() async {
    try {
      final id = _taskData['idTarea'] ?? _taskData['id'];
      if (id == null) {
        debugPrint('⚠️ TaskDetailSheet: No se encontró ID de tarea');
        setState(() => _isLoadingFull = false);
        return;
      }

      debugPrint('📋 Cargando tarea completa: $id');
      final response = await ApiClient.dio.get('tareas/$id');

      if (mounted && response.data != null) {
        dynamic data = response.data;

        // Unwrap respuesta del backend
        if (data is Map && data.containsKey('data')) {
          data = data['data'];
        }

        debugPrint('✅ Tarea cargada: ${data['titulo'] ?? data['nombre']}');

        setState(() {
          // Merge de datos
          if (data is Map<String, dynamic>) {
            _taskData = {..._taskData, ...data};
          }
          _isLoadingFull = false;

          // Actualizar datos de asignación (priorizar responsable del SP)
          if (data['idResponsable'] != null ||
              data['usuarioId'] != null ||
              data['asignadoId'] != null) {
            _assignedId = (data['idResponsable'] ??
                    data['usuarioId'] ??
                    data['asignadoId'])
                .toString();
          }
          if (data['responsableNombre'] != null) {
            _assignedName = data['responsableNombre'].toString();
          } else if (data['asignadoNombre'] != null) {
            _assignedName = data['asignadoNombre'].toString();
          }

          // Refresh controllers if user hasn't edited yet
          if (!_hasChanges) {
            _descripcionCtrl.text = data['descripcion']?.toString() ?? '';
            _evidenciaCtrl.text = data['linkEvidencia']?.toString() ?? '';
            // También refrescar título si viene más completo
            if (data['titulo'] != null || data['nombre'] != null) {
              _tituloCtrl.text =
                  (data['titulo'] ?? data['nombre'])?.toString() ??
                      _tituloCtrl.text;
            }
            // Fechas
            if (data['fechaObjetivo'] != null) {
              _fechaObjetivo =
                  DateTime.tryParse(data['fechaObjetivo'].toString());
            }
            if (data['fechaInicioPlanificada'] != null) {
              _fechaInicio =
                  DateTime.tryParse(data['fechaInicioPlanificada'].toString());
            }
            // Estado y progreso
            if (data['estado'] != null) {
              _estado = data['estado'].toString();
            }
            if (data['progreso'] != null || data['porcentaje'] != null) {
              final raw = data['progreso'] ?? data['porcentaje'] ?? 0;
              _progreso = (raw is num) ? raw.toInt() : 0;
            }
            // Subtareas
            if (data['subtareas'] is List) {
              _subtareas = data['subtareas'] as List;
            }
          }
        });
      } else {
        debugPrint('⚠️ Respuesta vacía para tarea $id');
        setState(() => _isLoadingFull = false);
      }
    } catch (e) {
      debugPrint('❌ Error loading full task: $e');
      if (mounted) {
        setState(() => _isLoadingFull = false);
        // Mostrar error pero no cerrar el modal
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
                'Error cargando detalles: ${e.toString().substring(0, e.toString().length.clamp(0, 50))}'),
            backgroundColor: Colors.orange,
          ),
        );
      }
    }
  }

  @override
  void dispose() {
    _tituloCtrl.dispose();
    _descripcionCtrl.dispose();
    _comentarioCtrl.dispose();
    _evidenciaCtrl.dispose();
    _newSubtaskCtrl.dispose();
    _reminderNotaCtrl.dispose();
    super.dispose();
  }

  // ══════════════════════════════════════════════
  //  RECORDATORIO
  // ══════════════════════════════════════════════

  Future<void> _loadReminder() async {
    try {
      final response = await ApiClient.dio.get('recordatorios');
      final data = response.data;
      final List all = (data is Map && data.containsKey('data'))
          ? (data['data'] as List? ?? [])
          : (data is List ? data : []);

      final taskId = _taskData['idTarea'] ?? _taskData['id'];
      final mine = all.cast<Map<String, dynamic>>().where(
            (r) => r['idTarea'] == taskId && r['enviado'] != true,
          );

      if (mine.isNotEmpty && mounted) {
        final r = mine.first;
        final dt =
            DateTime.tryParse(r['fechaHoraRecordatorio']?.toString() ?? '');
        setState(() {
          _existingReminder = r;
          if (dt != null) {
            _reminderDate = dt;
            _reminderTime = TimeOfDay(hour: dt.hour, minute: dt.minute);
          }
          _reminderNota = r['nota']?.toString() ?? '';
          _reminderNotaCtrl.text = _reminderNota;
        });
      }
    } catch (_) {
      // Silencioso — recordatorios no son críticos
    }
  }

  Future<void> _saveReminder() async {
    if (_reminderDate == null || _reminderTime == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Selecciona fecha y hora'),
            backgroundColor: Colors.orange),
      );
      return;
    }
    setState(() => _savingReminder = true);
    try {
      final taskId = _taskData['idTarea'] ?? _taskData['id'];
      final dt = DateTime(
        _reminderDate!.year,
        _reminderDate!.month,
        _reminderDate!.day,
        _reminderTime!.hour,
        _reminderTime!.minute,
      );
      await ApiClient.dio.post('tareas/$taskId/recordatorio', data: {
        'fechaHora': dt.toIso8601String(),
        'nota': _reminderNota.isNotEmpty ? _reminderNota : null,
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('⏰ Recordatorio programado'),
              backgroundColor: Color(0xFF10B981)),
        );
        await _loadReminder();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _savingReminder = false);
    }
  }

  Future<void> _deleteReminder() async {
    if (_existingReminder == null) return;
    setState(() => _savingReminder = true);
    try {
      final id = _existingReminder!['idRecordatorio'];
      await ApiClient.dio.delete('recordatorios/$id');
      if (mounted) {
        setState(() {
          _existingReminder = null;
          _reminderDate = null;
          _reminderTime = null;
          _reminderNota = '';
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('Recordatorio eliminado'),
              backgroundColor: Color(0xFF10B981)),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('Error al eliminar'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _savingReminder = false);
    }
  }

  void _setQuickReminder(int minutesFromNow, String label) {
    final target = DateTime.now().add(Duration(minutes: minutesFromNow));
    setState(() {
      _reminderDate = target;
      _reminderTime = TimeOfDay(hour: target.hour, minute: target.minute);
      _reminderNota = label;
    });
  }

  // ══════════════════════════════════════════════
  //  SUBTAREAS
  // ══════════════════════════════════════════════

  Future<void> _toggleSubtask(int subtaskId, String currentStatus) async {
    try {
      final newStatus = currentStatus == 'Hecha' ? 'Pendiente' : 'Hecha';
      final progreso = newStatus == 'Hecha' ? 100 : 0;
      await ApiClient.dio.patch('tareas/$subtaskId', data: {
        'estado': newStatus,
        'progreso': progreso,
      });
      // Recargar la tarea para actualizar subtareas
      await _loadFullTask();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> _addSubtask() async {
    final title = _newSubtaskCtrl.text.trim();
    if (title.isEmpty || _addingSubtask) return;
    setState(() => _addingSubtask = true);
    try {
      final parentId = _taskData['idTarea'] ?? _taskData['id'];
      await ApiClient.dio.post('tareas', data: {
        'titulo': title,
        'idTareaPadre': parentId,
        'idProyecto': _taskData['idProyecto'],
        'tipo': 'Operativa',
        'prioridad': 'Media',
        'esfuerzo': 'S',
        'comportamiento': 'SIMPLE',
      });
      _newSubtaskCtrl.clear();
      await _loadFullTask();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _addingSubtask = false);
    }
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      final id = _taskData['idTarea'] ?? _taskData['id'];
      final payload = <String, dynamic>{
        'titulo': _tituloCtrl.text.trim(),
        'descripcion': _descripcionCtrl.text.trim(),
        'linkEvidencia': _evidenciaCtrl.text.trim(),
        'estado': _estado,
        'prioridad': _prioridad,
        'progreso': _progreso,
        'fechaObjetivo': _fechaObjetivo?.toIso8601String(),
        'fechaInicioPlanificada': _fechaInicio?.toIso8601String(),
        if (_assignedId != null) 'idResponsable': _assignedId,
      };

      if (_comentarioCtrl.text.trim().isNotEmpty) {
        payload['comentario'] = _comentarioCtrl.text.trim();
      }

      await ApiClient.dio.patch('tareas/$id', data: payload);

      if (mounted) {
        widget.onUpdated?.call();
        Navigator.pop(context, true);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('Guardado correctamente'),
              backgroundColor: Color(0xFF10B981)),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _saving = false);
        ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red));
      }
    }
  }

  Future<void> _pickDate(bool isStart) async {
    final initial = isStart ? _fechaInicio : _fechaObjetivo;
    final picked = await showDatePicker(
      context: context,
      initialDate: initial ?? DateTime.now(),
      firstDate: DateTime(2024),
      lastDate: DateTime(2030),
    );
    if (picked != null) {
      setState(() {
        if (isStart) {
          _fechaInicio = picked;
        } else {
          _fechaObjetivo = picked;
        }
        _hasChanges = true;
      });
    }
  }

  Future<void> _cloneTask() async {
    setState(() => _saving = true);
    try {
      final id = _taskData['idTarea'] ?? _taskData['id'];
      await ApiClient.dio.post('tareas/$id/clonar');
      if (mounted) {
        widget.onUpdated?.call();
        Navigator.pop(context, true);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('Tarea clonada con éxito'),
              backgroundColor: Color(0xFF6366F1)),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _saving = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text('Error al clonar: $e'), backgroundColor: Colors.red));
      }
    }
  }

  Future<void> _deleteTask() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('¿Eliminar Tarea?'),
        content: const Text('Esta acción no se puede deshacer.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancelar')),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Eliminar'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() => _saving = true);
    try {
      final id = _taskData['idTarea'] ?? _taskData['id'];
      await ApiClient.dio.delete('tareas/$id');
      if (mounted) {
        widget.onUpdated?.call();
        Navigator.pop(context, true);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('Tarea eliminada'),
              backgroundColor: Color(0xFFEF4444)),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _saving = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text('Error al eliminar: $e'),
            backgroundColor: Colors.red));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    // Paridad visual: Background blanco, bordes redondeados, estilo limpio.
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          // Header Drag
          const SizedBox(height: 12),
          Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2))),

          // Header Title & Actions
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Checkbox gigante o Estado visual
                // React Header tiene Título editable grande.
                Expanded(
                  child: TextField(
                    controller: _tituloCtrl,
                    onChanged: (_) => _hasChanges = true,
                    style: const TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF0F172A),
                    ),
                    maxLines: null,
                    decoration: const InputDecoration.collapsed(
                        hintText: 'Título de la tarea'),
                  ),
                ),
                const SizedBox(width: 12),
                PopupMenuButton<String>(
                  icon: const Icon(Icons.more_vert, color: Color(0xFF64748B)),
                  onSelected: (val) {
                    if (val == 'clone') _cloneTask();
                    if (val == 'delete') _deleteTask();
                  },
                  itemBuilder: (context) => [
                    const PopupMenuItem(
                      value: 'clone',
                      child: Row(
                        children: [
                          Icon(Icons.copy, size: 18),
                          SizedBox(width: 8),
                          Text('Clonar Tarea'),
                        ],
                      ),
                    ),
                    const PopupMenuItem(
                      value: 'delete',
                      child: Row(
                        children: [
                          Icon(Icons.delete_outline,
                              size: 18, color: Colors.red),
                          SizedBox(width: 8),
                          Text('Eliminar Tarea',
                              style: TextStyle(color: Colors.red)),
                        ],
                      ),
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.close, color: Color(0xFF64748B)),
                  onPressed: () => Navigator.pop(context),
                  visualDensity: VisualDensity.compact,
                )
              ],
            ),
          ),

          const Divider(height: 1),

          // Scrollable Content
          Expanded(
            child: ListView(
              controller: widget.scrollController,
              padding: const EdgeInsets.all(20),
              children: [
                if (_isLoadingFull)
                  const Padding(
                      padding: EdgeInsets.only(bottom: 20),
                      child: LinearProgressIndicator(minHeight: 2)),

                // 1. Panel Planificación (Grisáceo)
                _buildSectionHeader('PLANIFICACIÓN Y FECHAS'),
                Container(
                  decoration: _panelDecoration(),
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: _buildDateInput(
                                'Inicio', _fechaInicio, () => _pickDate(true)),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: _buildDateInput('Objetivo', _fechaObjetivo,
                                () => _pickDate(false)),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      const Divider(height: 1),
                      const SizedBox(height: 16),
                      _buildPrioritySelector(),
                    ],
                  ),
                ),

                const SizedBox(height: 24),

                // Asignación
                _buildSectionHeader('RESPONSABLE'),
                _buildAssigneeSelector(),

                const SizedBox(height: 12),
                _buildCollaboratorsSection(),

                const SizedBox(height: 12),
                _buildBlockersSection(),

                const SizedBox(height: 24),

                // 2. Panel Ejecución
                _buildSectionHeader('EJECUCIÓN'),
                Container(
                  decoration: _panelDecoration(),
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      _buildStatusSelector(),
                      const SizedBox(height: 20),
                      _buildProgressSlider(),
                      const SizedBox(height: 20),
                      const Divider(height: 1),
                      const SizedBox(height: 20),

                      // Descripción
                      const Align(
                          alignment: Alignment.centerLeft,
                          child: Text('Descripción',
                              style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF64748B)))),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _descripcionCtrl,
                        onChanged: (_) => _hasChanges = true,
                        maxLines: 4,
                        style: const TextStyle(
                            fontSize: 14,
                            fontFamily: 'Inter',
                            color: Color(0xFF334155)),
                        decoration: _cleanInputDeco('Añadir detalles...'),
                      ),

                      const SizedBox(height: 16),
                      // Evidencia
                      const Align(
                          alignment: Alignment.centerLeft,
                          child: Text('Link Evidencia',
                              style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF64748B)))),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _evidenciaCtrl,
                        onChanged: (_) => _hasChanges = true,
                        style: const TextStyle(
                            fontSize: 14,
                            fontFamily: 'Inter',
                            color: Color(0xFF2563EB)),
                        decoration: _cleanInputDeco('https://...'),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 24),

                // 3. Subtareas
                if (_subtareas.isNotEmpty || !_isLoadingFull) ...[
                  _buildSectionHeader('SUBTAREAS / CHECKLIST'),
                  _buildSubtasksPanel(),
                  const SizedBox(height: 24),
                ],

                // 4. Recordatorio (no mostrar si tarea completada)
                if (_estado != 'Hecha' && _estado != 'Descartada') ...[
                  _buildSectionHeader('RECORDATORIO'),
                  _buildReminderPanel(),
                  const SizedBox(height: 24),
                ],

                // 5. Comentarios / Bitácora
                _buildSectionHeader('BITÁCORA / COMENTARIOS'),
                Container(
                  decoration: _panelDecoration(),
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      if (_taskData['comentarios'] != null &&
                          _taskData['comentarios'] is List &&
                          (_taskData['comentarios'] as List).isNotEmpty)
                        ...(_taskData['comentarios'] as List)
                            .map((c) => _buildCommentItem(c)),
                      TextField(
                        controller: _comentarioCtrl,
                        onChanged: (_) => _hasChanges = true,
                        maxLines: 2,
                        decoration: _cleanInputDeco(
                                'Escribe un nuevo comentario o actualización...')
                            .copyWith(
                          suffixIcon: const Icon(Icons.send_rounded,
                              size: 18, color: Colors.grey),
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 40),
              ],
            ),
          ),

          // Footer Fijo (React Style: Black Button)
          Container(
            padding: EdgeInsets.fromLTRB(
                20, 16, 20, 16 + MediaQuery.of(context).padding.bottom),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 10,
                    offset: const Offset(0, -4))
              ],
              border: const Border(top: BorderSide(color: Color(0xFFF1F5F9))),
            ),
            child: SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _saving ? null : _save,
                style: ElevatedButton.styleFrom(
                  backgroundColor:
                      const Color(0xFF0F172A), // Slate 900 (Black-ish)
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16)),
                  elevation: 4,
                  shadowColor: const Color(0xFF0F172A).withValues(alpha: 0.3),
                ),
                child: _saving
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                            color: Colors.white, strokeWidth: 2))
                    : const Text('Guardar y Finalizar',
                        style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            fontFamily: 'Inter')),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12, left: 4),
      child: Text(
        title,
        style: const TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w900,
          color: Color(0xFF94A3B8), // Slate 400
          letterSpacing: 1.2,
          fontFamily: 'Inter',
        ),
      ),
    );
  }

  BoxDecoration _panelDecoration() {
    return BoxDecoration(
      color: const Color(0xFFF8FAFC), // Slate 50
      borderRadius: BorderRadius.circular(20),
      border: Border.all(color: const Color(0xFFE2E8F0)), // Slate 200
    );
  }

  InputDecoration _cleanInputDeco(String hint) {
    return InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 14),
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.all(12),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide.none, // Clean
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFF3B82F6)),
      ),
    );
  }

  Widget _buildDateInput(String label, DateTime? value, VoidCallback onTap) {
    String text = 'Seleccionar';
    if (value != null) {
      // FIX CRASH: Formato manual para evitar LocaleDataException
      text =
          "${value.day.toString().padLeft(2, '0')}/${value.month.toString().padLeft(2, '0')}/${value.year}";
    }
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label,
              style: const TextStyle(
                  fontSize: 11,
                  color: Color(0xFF64748B),
                  fontWeight: FontWeight.bold)),
          const SizedBox(height: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Row(
              children: [
                const Icon(Icons.calendar_today_rounded,
                    size: 14, color: Color(0xFF94A3B8)),
                const SizedBox(width: 8),
                Expanded(
                    child: Text(text,
                        style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF334155)))),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPrioritySelector() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        const Text('Prioridad',
            style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: Color(0xFF475569))),
        Row(
          children: ['Baja', 'Media', 'Alta'].map((p) {
            final isSelected = _prioridad == p;
            Color color;
            if (p == 'Alta') {
              color = const Color(0xFFEF4444);
            } else if (p == 'Media') {
              color = const Color(0xFFF59E0B);
            } else {
              color = const Color(
                  0xFF10B981); // Baja green or blue? Usually Green/Blue
            }

            return GestureDetector(
              onTap: () => setState(() {
                _prioridad = p;
                _hasChanges = true;
              }),
              child: Container(
                margin: const EdgeInsets.only(left: 8),
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color:
                      isSelected ? color.withValues(alpha: 0.1) : Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                      color: isSelected ? color : const Color(0xFFE2E8F0)),
                ),
                child: Text(
                  p,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: isSelected ? color : const Color(0xFF94A3B8),
                  ),
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildStatusSelector() {
    final statuses = ['Pendiente', 'EnCurso', 'Hecha', 'Bloqueada'];
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: LayoutBuilder(builder: (context, constraints) {
        final width = (constraints.maxWidth - 8) / 4;
        return Row(
          children: statuses.map((s) {
            final isSelected = _estado == s;
            // Map display names if needed (EnCurso -> En Curso)
            final display = s == 'EnCurso' ? 'En Curso' : s;

            Color activeColor;
            if (s == 'Hecha') {
              activeColor = const Color(0xFF10B981);
            } else if (s == 'Bloqueada') {
              activeColor = const Color(0xFFEF4444);
            } else if (s == 'EnCurso') {
              activeColor = const Color(0xFF3B82F6);
            } else {
              activeColor = const Color(0xFF64748B);
            }

            return GestureDetector(
              onTap: () => setState(() {
                _estado = s;
                _hasChanges = true;
                if (s == 'Hecha' && _progreso < 100) _progreso = 100;
                if (s == 'Pendiente') _progreso = 0;
              }),
              child: Container(
                width: width,
                padding: const EdgeInsets.symmetric(vertical: 8),
                decoration: BoxDecoration(
                  color: isSelected
                      ? activeColor.withValues(alpha: 0.1)
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Column(
                  children: [
                    Icon(_getStatusIcon(s),
                        size: 16,
                        color:
                            isSelected ? activeColor : const Color(0xFF94A3B8)),
                    const SizedBox(height: 4),
                    Text(
                      display,
                      style: TextStyle(
                        fontSize: 9, // Small text
                        fontWeight: FontWeight.bold,
                        color:
                            isSelected ? activeColor : const Color(0xFF94A3B8),
                      ),
                      textAlign: TextAlign.center,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            );
          }).toList(),
        );
      }),
    );
  }

  IconData _getStatusIcon(String s) {
    switch (s) {
      case 'Hecha':
        return Icons.check_circle_outline;
      case 'EnCurso':
        return Icons.timelapse;
      case 'Bloqueada':
        return Icons.block;
      default:
        return Icons.radio_button_unchecked;
    }
  }

  Widget _buildProgressSlider() {
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text('Progreso',
                style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF64748B))),
            Text('$_progreso%',
                style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF3B82F6))),
          ],
        ),
        const SizedBox(height: 8),
        SliderTheme(
          data: SliderThemeData(
            trackHeight: 6,
            activeTrackColor: const Color(0xFF3B82F6),
            inactiveTrackColor: const Color(0xFFE2E8F0),
            thumbColor: Colors.white,
            thumbShape: const RoundSliderThumbShape(
                enabledThumbRadius: 10, elevation: 2),
            overlayColor: const Color(0xFF3B82F6).withValues(alpha: 0.2),
          ),
          child: Slider(
            value: _progreso.toDouble().clamp(0.0, 100.0),
            min: 0,
            max: 100,
            divisions: 100,
            onChanged: (v) => setState(() {
              _progreso = v.toInt();
              _hasChanges = true;
              if (_progreso == 100 && _estado != 'Hecha') {
                _estado = 'Hecha';
              }
              if (_progreso < 100 && _estado == 'Hecha') {
                _estado = 'EnCurso';
              }
            }),
          ),
        ),
      ],
    );
  }

  Widget _buildCommentItem(dynamic c) {
    // c is Map: { mensaje, fecha, usuarioNombre ... }
    final msg = c['mensaje'] ?? '';
    String date = '';
    if (c['fecha'] != null) {
      try {
        final dt = DateTime.parse(c['fecha'].toString());
        date =
            "${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')} ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}";
      } catch (_) {
        date = c['fecha'].toString();
      }
    }
    final author = c['usuarioNombre'] ?? 'Usuario';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(author,
                  style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF475569))),
              Text(date,
                  style:
                      const TextStyle(fontSize: 10, color: Color(0xFF94A3B8))),
            ],
          ),
          const SizedBox(height: 4),
          Text(msg,
              style: const TextStyle(fontSize: 13, color: Color(0xFF334155))),
        ],
      ),
    );
  }

  Widget _buildAssigneeSelector() {
    return GestureDetector(
      onTap: _showAssigneeModal,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: _panelDecoration().copyWith(color: Colors.white),
        child: Row(
          children: [
            CircleAvatar(
              radius: 16,
              backgroundColor: _assignedId != null
                  ? MomentusTheme.primary
                  : Colors.grey[200],
              child: Text(
                _assignedName.isNotEmpty ? _assignedName[0].toUpperCase() : '?',
                style: TextStyle(
                    color: _assignedId != null ? Colors.white : Colors.grey,
                    fontWeight: FontWeight.bold,
                    fontSize: 14),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(_assignedName,
                      style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF1E293B))),
                  if (_assignedId == null)
                    const Text('Toque para asignar',
                        style: TextStyle(fontSize: 11, color: Colors.grey))
                ],
              ),
            ),
            const Icon(Icons.edit, size: 20, color: Color(0xFF94A3B8)),
          ],
        ),
      ),
    );
  }

  Future<void> _showAssigneeModal() async {
    final selected = await UserSearchSheet.show(context);
    if (selected != null && selected is Empleado) {
      if (mounted) {
        setState(() {
          _assignedId = selected.idUsuario.toString();
          _assignedName = selected.nombreCompleto;
          _hasChanges = true;
        });
      }
    }
  }

  // ══════════════════════════════════════════════
  //  RECORDATORIO - UI PANEL
  // ══════════════════════════════════════════════

  Widget _buildReminderPanel() {
    return Container(
      decoration: _panelDecoration(),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header con badge activo
          Row(
            children: [
              const Icon(Icons.notifications_active,
                  size: 14, color: Color(0xFFF59E0B)),
              const SizedBox(width: 6),
              const Text('Recordatorio',
                  style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF94A3B8))),
              if (_existingReminder != null) ...[
                const SizedBox(width: 8),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFF7ED),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: const Text('⏰ Activo',
                      style: TextStyle(
                          fontSize: 9,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFFF59E0B))),
                ),
              ],
            ],
          ),
          const SizedBox(height: 12),

          // Quick presets
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              _reminderPresetChip('En 30 min', 30),
              _reminderPresetChip('En 1 hora', 60),
              _reminderPresetChip('En 3 horas', 180),
              _reminderPresetChip('Mañana 8AM', -1),
            ],
          ),
          const SizedBox(height: 12),

          // Custom date + time
          Row(
            children: [
              Expanded(
                child: InkWell(
                  onTap: () async {
                    final picked = await showDatePicker(
                      context: context,
                      initialDate: _reminderDate ?? DateTime.now(),
                      firstDate: DateTime.now(),
                      lastDate: DateTime(2030),
                    );
                    if (picked != null) setState(() => _reminderDate = picked);
                  },
                  child: Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.calendar_today,
                            size: 14, color: Color(0xFF94A3B8)),
                        const SizedBox(width: 6),
                        Text(
                          _reminderDate != null
                              ? '${_reminderDate!.day.toString().padLeft(2, '0')}/${_reminderDate!.month.toString().padLeft(2, '0')}'
                              : 'Fecha',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: _reminderDate != null
                                ? const Color(0xFF334155)
                                : const Color(0xFF94A3B8),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: InkWell(
                  onTap: () async {
                    final picked = await showTimePicker(
                      context: context,
                      initialTime: _reminderTime ?? TimeOfDay.now(),
                    );
                    if (picked != null) setState(() => _reminderTime = picked);
                  },
                  child: Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.access_time,
                            size: 14, color: Color(0xFF94A3B8)),
                        const SizedBox(width: 6),
                        Text(
                          _reminderTime != null
                              ? '${_reminderTime!.hour.toString().padLeft(2, '0')}:${_reminderTime!.minute.toString().padLeft(2, '0')}'
                              : 'Hora',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: _reminderTime != null
                                ? const Color(0xFF334155)
                                : const Color(0xFF94A3B8),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              // Save button
              SizedBox(
                height: 36,
                child: ElevatedButton(
                  onPressed: (_savingReminder ||
                          _reminderDate == null ||
                          _reminderTime == null)
                      ? null
                      : _saveReminder,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFF59E0B),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10)),
                    elevation: 0,
                  ),
                  child: _savingReminder
                      ? const SizedBox(
                          width: 14,
                          height: 14,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white))
                      : Icon(
                          _existingReminder != null
                              ? Icons.update
                              : Icons.notifications_active,
                          size: 16),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),

          // Nota opcional
          TextField(
            onChanged: (v) => _reminderNota = v,
            controller: _reminderNotaCtrl,
            style: const TextStyle(fontSize: 12, color: Color(0xFF475569)),
            decoration: InputDecoration(
              hintText: 'Nota del recordatorio (opcional)...',
              hintStyle:
                  const TextStyle(fontSize: 12, color: Color(0xFFCBD5E1)),
              filled: true,
              fillColor: Colors.white,
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
              enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: Color(0xFFF1F5F9))),
              focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: Color(0xFFF59E0B))),
            ),
          ),

          // Existing reminder info
          if (_existingReminder != null) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFFFF7ED),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFFED7AA)),
              ),
              child: Row(
                children: [
                  const Text('⏰ ', style: TextStyle(fontSize: 14)),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Programado: ${_reminderDate != null ? '${_reminderDate!.day.toString().padLeft(2, '0')}/${_reminderDate!.month.toString().padLeft(2, '0')} ${_reminderTime?.hour.toString().padLeft(2, '0') ?? ''}:${_reminderTime?.minute.toString().padLeft(2, '0') ?? ''}' : ''}',
                          style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFFD97706)),
                        ),
                        if (_reminderNota.isNotEmpty)
                          Text(_reminderNota,
                              style: const TextStyle(
                                  fontSize: 10,
                                  color: Color(0xFF94A3B8),
                                  fontStyle: FontStyle.italic)),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.delete_outline,
                        size: 18, color: Color(0xFFEF4444)),
                    visualDensity: VisualDensity.compact,
                    onPressed: _savingReminder ? null : _deleteReminder,
                    tooltip: 'Eliminar recordatorio',
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _reminderPresetChip(String label, int minutes) {
    return InkWell(
      onTap: () {
        if (minutes == -1) {
          // Mañana 8AM
          final tomorrow = DateTime.now().add(const Duration(days: 1));
          setState(() {
            _reminderDate =
                DateTime(tomorrow.year, tomorrow.month, tomorrow.day, 8, 0);
            _reminderTime = const TimeOfDay(hour: 8, minute: 0);
            _reminderNota = label;
          });
        } else {
          _setQuickReminder(minutes, label);
        }
      },
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.access_time, size: 12, color: Color(0xFF94A3B8)),
            const SizedBox(width: 4),
            Text(label,
                style: const TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF64748B))),
          ],
        ),
      ),
    );
  }

  // ══════════════════════════════════════════════
  //  SUBTAREAS - UI PANEL
  // ══════════════════════════════════════════════

  Widget _buildSubtasksPanel() {
    return Container(
      decoration: _panelDecoration(),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            children: [
              const Icon(Icons.checklist, size: 16, color: Color(0xFF6366F1)),
              const SizedBox(width: 6),
              const Text('Subtareas / Checklist',
                  style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: MomentusTheme.slate400)),
              if (_subtareas.isNotEmpty) ...[
                const Spacer(),
                Text(
                  '${_subtareas.where((s) => s['estado'] == 'Hecha').length}/${_subtareas.length}',
                  style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF6366F1)),
                ),
              ],
            ],
          ),
          const SizedBox(height: 10),

          // Lista de subtareas
          if (_subtareas.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 8),
              child: Text(
                  'No hay subtareas. Agrega una para desglosar el trabajo.',
                  style: TextStyle(
                      fontSize: 12,
                      color: Color(0xFF94A3B8),
                      fontStyle: FontStyle.italic)),
            ),

          ..._subtareas.map((s) {
            final isDone = s['estado'] == 'Hecha';
            final subtaskId = s['idTarea'] ?? s['id'];
            final titulo = s['titulo']?.toString() ?? 'Sin título';
            return Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: InkWell(
                onTap: subtaskId != null
                    ? () => _toggleSubtask(subtaskId as int,
                        s['estado']?.toString() ?? 'Pendiente')
                    : null,
                borderRadius: BorderRadius.circular(8),
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  decoration: BoxDecoration(
                    color: isDone ? const Color(0xFFF0FDF4) : Colors.white,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        isDone
                            ? Icons.check_box
                            : Icons.check_box_outline_blank,
                        size: 20,
                        color: isDone
                            ? const Color(0xFF10B981)
                            : const Color(0xFFCBD5E1),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          titulo,
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                            color: isDone
                                ? const Color(0xFF94A3B8)
                                : const Color(0xFF334155),
                            decoration:
                                isDone ? TextDecoration.lineThrough : null,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          }),

          const SizedBox(height: 8),

          // Input nueva subtarea
          Row(
            children: [
              const Icon(Icons.add, size: 18, color: Color(0xFF94A3B8)),
              const SizedBox(width: 8),
              Expanded(
                child: TextField(
                  controller: _newSubtaskCtrl,
                  onSubmitted: (_) => _addSubtask(),
                  style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: Color(0xFF334155)),
                  decoration: const InputDecoration(
                    hintText: 'Agregar nueva subtarea...',
                    hintStyle:
                        TextStyle(fontSize: 13, color: Color(0xFF94A3B8)),
                    border: InputBorder.none,
                    contentPadding: EdgeInsets.zero,
                    isDense: true,
                  ),
                ),
              ),
              if (_addingSubtask)
                const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2))
              else
                TextButton(
                  onPressed: _addSubtask,
                  style: TextButton.styleFrom(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    minimumSize: Size.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                  child: const Text('Agregar',
                      style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF6366F1))),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildCollaboratorsSection() {
    final List<dynamic> asig = _taskData['asignados'] ?? [];
    final colaboradores =
        asig.where((a) => a['tipo'] == 'Colaborador').toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text('COLABORADORES',
                style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF64748B),
                    letterSpacing: 0.5)),
            TextButton(
              onPressed: _showCollaboratorPicker,
              style: TextButton.styleFrom(
                  visualDensity: VisualDensity.compact,
                  padding: EdgeInsets.zero,
                  minimumSize: const Size(0, 0)),
              child: const Text('Gestionar', style: TextStyle(fontSize: 11)),
            ),
          ],
        ),
        if (colaboradores.isEmpty)
          const Padding(
            padding: EdgeInsets.only(top: 4),
            child: Text('Sin colaboradores asignados',
                style: TextStyle(
                    fontSize: 12,
                    fontStyle: FontStyle.italic,
                    color: Color(0xFF94A3B8))),
          )
        else
          Wrap(
            spacing: 8,
            runSpacing: 4,
            children: colaboradores.map((c) {
              return Chip(
                avatar: CircleAvatar(
                  backgroundColor: const Color(0xFF6366F1),
                  child: Text(
                    (c['nombre'] ?? '?')[0].toUpperCase(),
                    style: const TextStyle(fontSize: 10, color: Colors.white),
                  ),
                ),
                label: Text(c['nombre']?.toString().split(' ')[0] ?? '?',
                    style: const TextStyle(fontSize: 11)),
                padding: EdgeInsets.zero,
                labelPadding: const EdgeInsets.only(right: 8, left: 4),
                backgroundColor: const Color(0xFFF1F5F9),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20),
                    side: BorderSide.none),
              );
            }).toList(),
          ),
      ],
    );
  }

  void _showCollaboratorPicker() async {
    final List<dynamic> asig = _taskData['asignados'] ?? [];
    final currentIds = asig
        .where((a) => a['tipo'] == 'Colaborador')
        .map((a) => a['idUsuario'].toString())
        .toSet();

    final result = await UserSearchSheet.show(context,
        title: 'Gestionar Colaboradores',
        multiSelect: true,
        initialSelection: currentIds);

    if (result != null && result is List) {
      final newIds = result
          .map((u) {
            if (u is Empleado) return u.idUsuario;
            return int.tryParse(u.toString());
          })
          .whereType<int>()
          .toList();
      _syncCollaborators(newIds);
    }
  }

  Future<void> _syncCollaborators(List<int> coasignados) async {
    setState(() => _saving = true);
    try {
      final id = _taskData['idTarea'] ?? _taskData['id'];
      await ApiClient.dio.post('tareas/$id/participantes', data: {
        'coasignados': coasignados,
      });
      await _loadFullTask();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('Colaboradores actualizados'),
              backgroundColor: Color(0xFF10B981)),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _saving = false);
        ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red));
      }
    }
  }

  Widget _buildBlockersSection() {
    final List<dynamic> bloqueos = _taskData['bloqueos'] ?? [];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text('BLOQUEOS',
                style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF64748B),
                    letterSpacing: 0.5)),
            TextButton(
              onPressed: _showAddBlockerDialog,
              style: TextButton.styleFrom(
                  visualDensity: VisualDensity.compact,
                  padding: EdgeInsets.zero,
                  minimumSize: const Size(0, 0)),
              child: const Text('Reportar',
                  style: TextStyle(fontSize: 11, color: Colors.red)),
            ),
          ],
        ),
        if (bloqueos.isEmpty)
          const Padding(
            padding: EdgeInsets.only(top: 4),
            child: Text('Sin bloqueos reportados',
                style: TextStyle(
                    fontSize: 12,
                    fontStyle: FontStyle.italic,
                    color: Color(0xFF94A3B8))),
          )
        else
          ...bloqueos.map((b) {
            final isResuelto = b['estado'] == 'Resuelto';
            return Container(
              margin: const EdgeInsets.only(top: 8),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isResuelto
                    ? const Color(0xFFF1F5F9)
                    : const Color(0xFFFEF2F2),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                    color: isResuelto
                        ? const Color(0xFFE2E8F0)
                        : const Color(0xFFFEE2E2)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(isResuelto ? '✅ Resuelto' : '🚫 Bloqueo Activo',
                          style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: isResuelto
                                  ? const Color(0xFF64748B)
                                  : Colors.red)),
                      if (!isResuelto)
                        TextButton(
                          onPressed: () => _resolverBloqueo(b['idBloqueo']),
                          style: TextButton.styleFrom(
                              visualDensity: VisualDensity.compact,
                              padding: EdgeInsets.zero,
                              minimumSize: const Size(0, 0)),
                          child: const Text('Resolver',
                              style: TextStyle(fontSize: 10)),
                        ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(b['motivo'] ?? 'Sin motivo',
                      style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: isResuelto
                              ? const Color(0xFF64748B)
                              : const Color(0xFF7F1D1D))),
                  if (b['solucion'] != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text('Solución: ${b['solucion']}',
                          style: const TextStyle(
                              fontSize: 12, color: Color(0xFF475569))),
                    ),
                  const SizedBox(height: 4),
                  Text('Por: ${b['origenNombre'] ?? 'Usuario'}',
                      style: const TextStyle(
                          fontSize: 11, color: Color(0xFF94A3B8))),
                ],
              ),
            );
          }),
      ],
    );
  }

  void _showAddBlockerDialog() {
    final motivoCtrl = TextEditingController();
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Reportar Bloqueo'),
        content: TextField(
          controller: motivoCtrl,
          decoration:
              const InputDecoration(hintText: '¿Por qué está bloqueada?'),
          maxLines: 3,
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancelar')),
          ElevatedButton(
            onPressed: () async {
              if (motivoCtrl.text.isEmpty) return;
              Navigator.pop(context);
              _addBlocker(motivoCtrl.text);
            },
            style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red, foregroundColor: Colors.white),
            child: const Text('Reportar'),
          ),
        ],
      ),
    );
  }

  Future<void> _addBlocker(String motivo) async {
    setState(() => _saving = true);
    try {
      final id = _taskData['idTarea'] ?? _taskData['id'];
      await ApiClient.dio.post('bloqueos', data: {
        'idTarea': id,
        'motivo': motivo,
        'idDestinoUsuario': null, // Opcional
      });
      await _loadFullTask();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
            content: Text('Bloqueo reportado'), backgroundColor: Colors.red));
      }
    } catch (e) {
      if (mounted) {
        setState(() => _saving = false);
        ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red));
      }
    }
  }

  Future<void> _resolverBloqueo(int idBloqueo) async {
    final solucionCtrl = TextEditingController();
    await showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Resolver Bloqueo'),
        content: TextField(
          controller: solucionCtrl,
          decoration: const InputDecoration(hintText: '¿Cómo se resolvió?'),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancelar')),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(context);
              setState(() => _saving = true);
              final messenger = ScaffoldMessenger.of(context);
              try {
                await ApiClient.dio
                    .patch('bloqueos/$idBloqueo/resolver', data: {
                  'solucion': solucionCtrl.text,
                });
                await _loadFullTask();
              } catch (e) {
                if (mounted) {
                  setState(() => _saving = false);
                  messenger.showSnackBar(SnackBar(
                      content: Text('Error: $e'), backgroundColor: Colors.red));
                }
              }
            },
            child: const Text('Resolver'),
          ),
        ],
      ),
    );
  }
}
