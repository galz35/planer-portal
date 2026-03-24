import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:provider/provider.dart';
import '../../auth/presentation/auth_controller.dart';
import 'package:intl/intl.dart';

import '../data/tasks_repository.dart';
import '../../common/domain/empleado.dart';
import '../../common/presentation/user_search_sheet.dart';
import '../../projects/presentation/project_search_sheet.dart';

/// ============================================
/// QUICK CREATE TASK SHEET - Crear Tarea Rápida
/// ============================================
/// Equivalente a QuickTaskModal de React.
/// Ahora incluye todos los campos: Tipo, Prioridad, Esfuerzo, Descripción.
class QuickCreateTaskSheet extends StatefulWidget {
  final Map<String, dynamic>? preSelectedProject;

  const QuickCreateTaskSheet({super.key, this.preSelectedProject});

  static Future<void> show(BuildContext context,
      {VoidCallback? onCreated,
      Map<String, dynamic>? preSelectedProject}) async {
    final result = await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) =>
          QuickCreateTaskSheet(preSelectedProject: preSelectedProject),
    );

    if (result == true && onCreated != null) {
      onCreated();
    }
  }

  @override
  State<QuickCreateTaskSheet> createState() => _QuickCreateTaskSheetState();
}

class _QuickCreateTaskSheetState extends State<QuickCreateTaskSheet> {
  final _titleCtrl = TextEditingController();
  final _descCtrl = TextEditingController();

  DateTime _selectedDate = DateTime.now();
  String _tipo = 'Administrativa';
  String _prioridad = 'Media';
  String _esfuerzo = 'M';
  Empleado? _responsable;
  Map<String, dynamic>? _proyecto;

  bool _isSaving = false;
  bool _showAdvanced = false;

  @override
  void initState() {
    super.initState();
    if (widget.preSelectedProject != null) {
      _proyecto = widget.preSelectedProject;
    }
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _descCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Usamos DraggableScrollableSheet para manejar mejor el teclado y pantallas pequeñas
    return DraggableScrollableSheet(
      initialChildSize: 0.9,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      builder: (context, scrollController) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Column(
            children: [
              // Drag Handle (Fijo en el tope)
              const SizedBox(height: 12),
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 12),

              // Contenido Scrollable
              Expanded(
                child: ListView(
                  controller: scrollController,
                  padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
                  children: [
                    // Header con icono
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: const Color(0xFFECFDF5),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(CupertinoIcons.add_circled_solid,
                              color: Color(0xFF059669), size: 24),
                        ),
                        const SizedBox(width: 12),
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Nueva Tarea',
                                style: TextStyle(
                                  fontFamily: 'Inter',
                                  fontSize: 20,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF0F172A),
                                ),
                              ),
                              Text(
                                'Crea una tarea rápidamente',
                                style: TextStyle(
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

                    const SizedBox(height: 24),

                    // Input Título
                    _buildLabel('Título *'),
                    TextField(
                      controller: _titleCtrl,
                      autofocus: true,
                      textCapitalization: TextCapitalization.sentences,
                      style: const TextStyle(
                          fontFamily: 'Inter', fontWeight: FontWeight.w500),
                      decoration: _inputDecoration('¿Qué hay que hacer?'),
                    ),

                    const SizedBox(height: 16),

                    // Fecha y Tipo en Row
                    Row(
                      children: [
                        // Selector Fecha
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _buildLabel('Fecha'),
                              InkWell(
                                onTap: _pickDate,
                                borderRadius: BorderRadius.circular(12),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 14, vertical: 14),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFF8FAFC),
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(
                                        color: const Color(0xFFE2E8F0)),
                                  ),
                                  child: Row(
                                    children: [
                                      const Icon(CupertinoIcons.calendar,
                                          size: 18, color: Color(0xFF64748B)),
                                      const SizedBox(width: 8),
                                      Text(
                                        _formatDate(_selectedDate),
                                        style: const TextStyle(
                                          fontFamily: 'Inter',
                                          fontWeight: FontWeight.w600,
                                          color: Color(0xFF0F172A),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 12),

                        // Selector Tipo
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _buildLabel('Tipo'),
                              Container(
                                padding:
                                    const EdgeInsets.symmetric(horizontal: 12),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF8FAFC),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                      color: const Color(0xFFE2E8F0)),
                                ),
                                child: DropdownButtonHideUnderline(
                                  child: DropdownButton<String>(
                                    value: _tipo,
                                    isExpanded: true,
                                    icon: const Icon(
                                        CupertinoIcons.chevron_down,
                                        size: 16),
                                    style: const TextStyle(
                                        fontFamily: 'Inter',
                                        fontWeight: FontWeight.w600,
                                        color: Color(0xFF0F172A),
                                        fontSize: 14),
                                    items: const [
                                      DropdownMenuItem(
                                          value: 'Administrativa',
                                          child: Text('Administrativa')),
                                      DropdownMenuItem(
                                          value: 'Logistica',
                                          child: Text('Logística')),
                                      DropdownMenuItem(
                                          value: 'Estrategica',
                                          child: Text('Estratégica')),
                                      DropdownMenuItem(
                                          value: 'AMX', child: Text('AMX')),
                                      DropdownMenuItem(
                                          value: 'Otros', child: Text('Otros')),
                                    ],
                                    onChanged: (v) =>
                                        setState(() => _tipo = v!),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 16),

                    // Prioridad y Esfuerzo
                    Row(
                      children: [
                        // Prioridad
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _buildLabel('Prioridad'),
                              // Usar AnimatedContainer para feedback visual
                              _buildChipRow(
                                options: ['Alta', 'Media', 'Baja'],
                                selected: _prioridad,
                                colors: [
                                  const Color(0xFFEF4444),
                                  const Color(0xFFF59E0B),
                                  const Color(0xFF10B981)
                                ],
                                onSelected: (v) =>
                                    setState(() => _prioridad = v),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 12),

                        // Esfuerzo
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _buildLabel('Esfuerzo'),
                              _buildChipRow(
                                options: ['S', 'M', 'L'],
                                selected: _esfuerzo,
                                labels: ['Pequeño', 'Mediano', 'Grande'],
                                onSelected: (v) =>
                                    setState(() => _esfuerzo = v),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),

                    // Toggle para mostrar descripción
                    const SizedBox(height: 16),
                    InkWell(
                      onTap: () =>
                          setState(() => _showAdvanced = !_showAdvanced),
                      child: Row(
                        children: [
                          Icon(
                            _showAdvanced
                                ? CupertinoIcons.chevron_up
                                : CupertinoIcons.chevron_down,
                            size: 16,
                            color: const Color(0xFF64748B),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            _showAdvanced
                                ? 'Ocultar descripción'
                                : 'Agregar descripción (opcional)',
                            style: const TextStyle(
                              fontFamily: 'Inter',
                              fontSize: 13,
                              color: Color(0xFF64748B),
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 16),

                    // Proyecto
                    _buildLabel('Proyecto (Opcional)'),
                    InkWell(
                      onTap: () async {
                        final selected =
                            await showModalBottomSheet<Map<String, dynamic>>(
                          context: context,
                          isScrollControlled: true,
                          backgroundColor: Colors.transparent,
                          builder: (context) => ProjectSearchSheet(
                              onSelected: (p) => Navigator.pop(context, p)),
                        );

                        if (selected != null) {
                          setState(() => _proyecto = selected);
                        }
                      },
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 14),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Row(
                          children: [
                            Icon(CupertinoIcons.folder,
                                size: 18,
                                color: _proyecto != null
                                    ? Colors.purple
                                    : const Color(0xFF64748B)),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                _proyecto != null
                                    ? (_proyecto!['nombre'] ??
                                        'Proyecto sin nombre')
                                    : 'Asignar a proyecto',
                                style: TextStyle(
                                  fontFamily: 'Inter',
                                  fontWeight: _proyecto != null
                                      ? FontWeight.w600
                                      : FontWeight.normal,
                                  color: _proyecto != null
                                      ? const Color(0xFF0F172A)
                                      : const Color(0xFF94A3B8),
                                ),
                              ),
                            ),
                            if (_proyecto != null)
                              InkWell(
                                onTap: () => setState(() => _proyecto = null),
                                child: const Icon(
                                    CupertinoIcons.xmark_circle_fill,
                                    size: 18,
                                    color: Color(0xFF64748B)),
                              ),
                          ],
                        ),
                      ),
                    ),

                    const SizedBox(height: 16),

                    // Responsable
                    _buildLabel('Asignar a'),
                    InkWell(
                      onTap: () async {
                        final selected = await UserSearchSheet.show(context);
                        if (selected != null) {
                          setState(() => _responsable = selected);
                        }
                      },
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 14),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Row(
                          children: [
                            Icon(CupertinoIcons.person_2,
                                size: 18,
                                color: _responsable != null
                                    ? const Color(0xFF0F172A)
                                    : const Color(0xFF64748B)),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                _responsable?.nombreCompleto ??
                                    'Asignar a mí (Automático)',
                                style: TextStyle(
                                  fontFamily: 'Inter',
                                  fontWeight: _responsable != null
                                      ? FontWeight.w600
                                      : FontWeight.normal,
                                  color: _responsable != null
                                      ? const Color(0xFF0F172A)
                                      : const Color(0xFF94A3B8),
                                ),
                              ),
                            ),
                            if (_responsable != null)
                              InkWell(
                                onTap: () =>
                                    setState(() => _responsable = null),
                                child: const Icon(
                                    CupertinoIcons.xmark_circle_fill,
                                    size: 18,
                                    color: Color(0xFF64748B)),
                              ),
                          ],
                        ),
                      ),
                    ),

                    const SizedBox(height: 16),

                    // Descripción (expandible)
                    if (_showAdvanced) ...[
                      const SizedBox(height: 12),
                      TextField(
                        controller: _descCtrl,
                        maxLines: 3,
                        textCapitalization: TextCapitalization.sentences,
                        style: const TextStyle(fontFamily: 'Inter'),
                        decoration: _inputDecoration('Detalles adicionales...'),
                      ),
                    ],

                    const SizedBox(height: 24),

                    // Botones
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () => Navigator.pop(context),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: const Color(0xFF64748B),
                              side: const BorderSide(color: Color(0xFFE2E8F0)),
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12)),
                            ),
                            child: const Text('Cancelar',
                                style: TextStyle(
                                    fontFamily: 'Inter',
                                    fontWeight: FontWeight.w600)),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          flex: 2,
                          child: ElevatedButton(
                            onPressed: _isSaving ? null : _saveTask,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF0F172A),
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12)),
                              elevation: 0,
                            ),
                            child: _isSaving
                                ? const SizedBox(
                                    width: 20,
                                    height: 20,
                                    child: CircularProgressIndicator(
                                        color: Colors.white, strokeWidth: 2))
                                : const Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(CupertinoIcons.checkmark_alt,
                                          size: 18),
                                      SizedBox(width: 8),
                                      Text('Crear Tarea',
                                          style: TextStyle(
                                              fontFamily: 'Inter',
                                              fontWeight: FontWeight.bold)),
                                    ],
                                  ),
                          ),
                        ),
                      ],
                    ),

                    // Espacio para el teclado
                    SizedBox(height: MediaQuery.of(context).viewInsets.bottom),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildLabel(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Text(
        text,
        style: const TextStyle(
          fontFamily: 'Inter',
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: Color(0xFF64748B),
        ),
      ),
    );
  }

  InputDecoration _inputDecoration(String hint) {
    return InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(color: Color(0xFF94A3B8)),
      filled: true,
      fillColor: const Color(0xFFF8FAFC),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFF059669), width: 2),
      ),
      contentPadding: const EdgeInsets.all(14),
    );
  }

  Widget _buildChipRow({
    required List<String> options,
    required String selected,
    List<String>? labels,
    List<Color>? colors,
    required Function(String) onSelected,
  }) {
    return Row(
      children: List.generate(options.length, (i) {
        final opt = options[i];
        final isSelected = selected == opt;
        final color = colors != null ? colors[i] : const Color(0xFF0F172A);

        return Expanded(
          child: Padding(
            padding: EdgeInsets.only(right: i < options.length - 1 ? 6 : 0),
            child: InkWell(
              onTap: () => onSelected(opt),
              borderRadius: BorderRadius.circular(8),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(vertical: 10),
                decoration: BoxDecoration(
                  color: isSelected
                      ? color.withValues(alpha: 0.1)
                      : const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: isSelected ? color : const Color(0xFFE2E8F0),
                    width: isSelected ? 2 : 1,
                  ),
                ),
                child: Center(
                  child: Text(
                    labels != null ? labels[i] : opt,
                    style: TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 11,
                      fontWeight:
                          isSelected ? FontWeight.bold : FontWeight.w500,
                      color: isSelected ? color : const Color(0xFF64748B),
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
              ),
            ),
          ),
        );
      }),
    );
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final tomorrow = now.add(const Duration(days: 1));

    if (date.year == now.year &&
        date.month == now.month &&
        date.day == now.day) {
      return 'Hoy';
    } else if (date.year == tomorrow.year &&
        date.month == tomorrow.month &&
        date.day == tomorrow.day) {
      return 'Mañana';
    }
    return DateFormat('d MMM', 'es').format(date);
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      locale: const Locale('es'),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: Color(0xFF059669),
              onPrimary: Colors.white,
              onSurface: Color(0xFF0F172A),
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      setState(() => _selectedDate = picked);
    }
  }

  void _saveTask() async {
    final title = _titleCtrl.text.trim();
    if (title.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('El título es obligatorio'),
          backgroundColor: Color(0xFFF59E0B),
        ),
      );
      return;
    }

    setState(() => _isSaving = true);

    try {
      final repo = TasksRepository();

      await repo.createTaskFull(
        title: title,
        date: _selectedDate,
        tipo: _tipo,
        prioridad: _prioridad,
        esfuerzo: _esfuerzo,
        descripcion:
            _descCtrl.text.trim().isNotEmpty ? _descCtrl.text.trim() : null,
        assignedToUserId: _responsable?.idUsuario ??
            context.read<AuthController>().user?.id, // Auto-asignar a mí
        projectId: _proyecto != null
            ? (_proyecto!['idProyecto'] ?? _proyecto!['id'])
            : null,
      );

      if (mounted) {
        setState(() => _isSaving = false);
        Navigator.pop(context, true);

        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Row(
              children: [
                Icon(Icons.check_circle, color: Colors.white, size: 20),
                SizedBox(width: 8),
                Text('Tarea creada exitosamente'),
              ],
            ),
            backgroundColor: Color(0xFF10B981),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.all(Radius.circular(8))),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSaving = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error al crear tarea: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }
}
