import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../projects/data/projects_repository.dart';

class CreateProjectSheet extends StatefulWidget {
  final VoidCallback? onCreated;
  final Map<String, dynamic>? project;

  const CreateProjectSheet({super.key, this.onCreated, this.project});

  static Future<void> show(BuildContext context,
      {VoidCallback? onCreated, Map<String, dynamic>? project}) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.9,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        builder: (context, scrollController) => CreateProjectSheet(
          onCreated: onCreated,
          project: project,
        ),
      ),
    );
  }

  @override
  State<CreateProjectSheet> createState() => _CreateProjectSheetState();
}

class _CreateProjectSheetState extends State<CreateProjectSheet> {
  final _nameCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _repo = ProjectsRepository();

  final _tipos = [
    'Administrativo',
    'Logistica',
    'Estrategico',
    'AMX',
    'CENAM',
    'Otros'
  ];
  String _tipo = 'Administrativo';

  // Color Selection
  Color _selectedColor = Colors.blue;
  final List<Color> _colors = [
    Colors.blue,
    Colors.red,
    Colors.orange,
    Colors.amber,
    Colors.green,
    Colors.teal,
    Colors.cyan,
    Colors.indigo,
    Colors.purple,
    Colors.pink,
    const Color(0xFF64748B), // Slate
  ];

  // Icon Selection
  String _selectedIconKey = 'folder';
  final Map<String, IconData> _icons = {
    'folder': Icons.folder_rounded,
    'star': Icons.star_rounded,
    'rocket': Icons.rocket_launch_rounded,
    'flag': Icons.flag_rounded,
    'work': Icons.work_rounded,
    'laptop': Icons.laptop_mac_rounded,
    'code': Icons.code_rounded,
    'design': Icons.design_services_rounded,
    'group': Icons.groups_rounded,
    'chart': Icons.pie_chart_rounded,
  };

  DateTime? _startDate;
  DateTime? _endDate;

  bool _saving = false;

  @override
  void initState() {
    super.initState();
    if (widget.project != null) {
      _nameCtrl.text = widget.project!['nombre']?.toString() ?? '';
      _descCtrl.text = widget.project!['descripcion']?.toString() ?? '';

      var t = widget.project!['tipo']?.toString();
      if (t != null && _tipos.contains(t)) {
        _tipo = t;
      }

      // Parse dates, colors, icons if available
      if (widget.project!['fechaInicio'] != null) {
        _startDate =
            DateTime.tryParse(widget.project!['fechaInicio'].toString());
      }
      if (widget.project!['fechaFin'] != null) {
        _endDate = DateTime.tryParse(widget.project!['fechaFin'].toString());
      }

      // _selectedColor = ...
    }
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _descCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickDateRange() async {
    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
      initialDateRange: _startDate != null && _endDate != null
          ? DateTimeRange(start: _startDate!, end: _endDate!)
          : null,
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: ColorScheme.light(
              primary: _selectedColor,
              onPrimary: Colors.white,
              onSurface: const Color(0xFF0F172A),
            ),
          ),
          child: child!,
        );
      },
    );

    if (picked != null) {
      setState(() {
        _startDate = picked.start;
        _endDate = picked.end;
      });
    }
  }

  Future<void> _save() async {
    if (_nameCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('El nombre es obligatorio'),
            backgroundColor: Colors.red),
      );
      return;
    }

    setState(() => _saving = true);

    try {
      final colorHex =
          '#${_selectedColor.toARGB32().toRadixString(16).padLeft(8, '0').substring(2)}'; // ARGB without A

      if (widget.project != null) {
        // Update
        final id = widget.project!['idProyecto'] ?? widget.project!['id'];
        await _repo.updateProject(id, {
          'nombre': _nameCtrl.text.trim(),
          'descripcion': _descCtrl.text.trim(),
          'tipo': _tipo,
          'color': colorHex,
          'icono': _selectedIconKey,
          'fechaInicio': _startDate?.toIso8601String(),
          'fechaFin': _endDate?.toIso8601String(),
        });
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
                content: Text('Proyecto actualizado'),
                backgroundColor: Colors.black87),
          );
        }
      } else {
        // Create
        await _repo.createProject(
          nombre: _nameCtrl.text.trim(),
          descripcion:
              _descCtrl.text.trim().isNotEmpty ? _descCtrl.text.trim() : null,
          tipo: _tipo,
          color: colorHex,
          icono: _selectedIconKey,
          fechaInicio: _startDate,
          fechaFin: _endDate,
        );
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
                content: Text('Proyecto creado con éxito!'),
                backgroundColor: Colors.green),
          );
        }
      }

      if (mounted) {
        widget.onCreated?.call();
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _saving = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isEditing = widget.project != null;

    return Container(
      padding: EdgeInsets.fromLTRB(
          24, 24, 24, MediaQuery.of(context).viewInsets.bottom + 24),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            // Handle
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                    color: Colors.grey[300],
                    borderRadius: BorderRadius.circular(2)),
              ),
            ),
            const SizedBox(height: 20),

            // Header con Icono Preview
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: _selectedColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Icon(
                    _icons[_selectedIconKey] ?? Icons.folder,
                    color: _selectedColor,
                    size: 28,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        isEditing ? 'Editar Proyecto' : 'Nuevo Proyecto',
                        style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            fontFamily: 'Inter',
                            color: Color(0xFF0F172A)),
                      ),
                      const Text(
                        'Define los detalles clave',
                        style: TextStyle(
                            fontSize: 13,
                            color: Color(0xFF64748B),
                            fontFamily: 'Inter'),
                      ),
                    ],
                  ),
                ),
              ],
            ),

            const SizedBox(height: 32),

            // Nombre
            _buildLabel('NOMBRE DEL PROYECTO *'),
            TextField(
              controller: _nameCtrl,
              textCapitalization: TextCapitalization.sentences,
              style: const TextStyle(
                  fontWeight: FontWeight.w600, fontFamily: 'Inter'),
              decoration: _inputDecoration('Ej. Lanzamiento Q3'),
            ),
            const SizedBox(height: 20),

            // Tipo y Fechas Row
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildLabel('TIPO'),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: _tipo,
                            isExpanded: true,
                            icon: const Icon(Icons.arrow_drop_down_rounded),
                            style: const TextStyle(
                                fontFamily: 'Inter',
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF0F172A)),
                            items: _tipos
                                .map((t) =>
                                    DropdownMenuItem(value: t, child: Text(t)))
                                .toList(),
                            onChanged: (val) => setState(() => _tipo = val!),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildLabel('DURACIÓN'),
                      InkWell(
                        onTap: _pickDateRange,
                        borderRadius: BorderRadius.circular(12),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              vertical: 14, horizontal: 12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                                color: _startDate != null
                                    ? _selectedColor
                                    : const Color(0xFFE2E8F0),
                                width: _startDate != null ? 1.5 : 1),
                          ),
                          child: Row(
                            children: [
                              Icon(Icons.calendar_today_rounded,
                                  size: 16,
                                  color: _startDate != null
                                      ? _selectedColor
                                      : const Color(0xFF94A3B8)),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  _startDate != null
                                      ? '${DateFormat('d MMM').format(_startDate!)} - ${DateFormat('d MMM').format(_endDate!)}'
                                      : 'Fechas',
                                  style: TextStyle(
                                      fontFamily: 'Inter',
                                      fontSize: 13,
                                      fontWeight: _startDate != null
                                          ? FontWeight.w600
                                          : FontWeight.normal,
                                      color: _startDate != null
                                          ? const Color(0xFF0F172A)
                                          : const Color(0xFF94A3B8),
                                      overflow: TextOverflow.ellipsis),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),

            const SizedBox(height: 24),

            // Apariencia (Color e Icono)
            _buildLabel('APARIENCIA'),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Colores
                  Wrap(
                    spacing: 12,
                    runSpacing: 12,
                    children: _colors
                        .map((c) => GestureDetector(
                              onTap: () => setState(() => _selectedColor = c),
                              child: Container(
                                width: 32,
                                height: 32,
                                decoration: BoxDecoration(
                                  color: c,
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                      color: _selectedColor == c
                                          ? Colors.white
                                          : Colors.transparent,
                                      width: 2),
                                  boxShadow: _selectedColor == c
                                      ? [
                                          BoxShadow(
                                              color: c.withValues(alpha: 0.4),
                                              blurRadius: 8,
                                              offset: const Offset(0, 4))
                                        ]
                                      : null,
                                ),
                                child: _selectedColor == c
                                    ? const Icon(Icons.check,
                                        color: Colors.white, size: 16)
                                    : null,
                              ),
                            ))
                        .toList(),
                  ),
                  const SizedBox(height: 16),
                  const Divider(height: 1),
                  const SizedBox(height: 16),
                  // Iconos
                  Wrap(
                    spacing: 16,
                    runSpacing: 16,
                    children: _icons.entries
                        .map((entry) => GestureDetector(
                              onTap: () =>
                                  setState(() => _selectedIconKey = entry.key),
                              child: Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: _selectedIconKey == entry.key
                                      ? _selectedColor.withValues(alpha: 0.1)
                                      : Colors.white,
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(
                                      color: _selectedIconKey == entry.key
                                          ? _selectedColor
                                          : const Color(0xFFE2E8F0)),
                                ),
                                child: Icon(
                                  entry.value,
                                  color: _selectedIconKey == entry.key
                                      ? _selectedColor
                                      : const Color(0xFF64748B),
                                  size: 20,
                                ),
                              ),
                            ))
                        .toList(),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Descripción
            _buildLabel('DESCRIPCIÓN (OPCIONAL)'),
            TextField(
              controller: _descCtrl,
              maxLines: 3,
              style: const TextStyle(fontFamily: 'Inter'),
              decoration: _inputDecoration('Detalles adicionales...'),
            ),
            const SizedBox(height: 32),

            // Botón Guardar
            ElevatedButton(
              onPressed: _saving ? null : _save,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0F172A),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                elevation: 0,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
              ),
              child: _saving
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                          color: Colors.white, strokeWidth: 2))
                  : Text(isEditing ? 'Guardar Cambios' : 'Crear Proyecto',
                      style: const TextStyle(
                          fontWeight: FontWeight.bold, fontSize: 16)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLabel(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        text,
        style: const TextStyle(
          fontFamily: 'Inter',
          fontSize: 11,
          fontWeight: FontWeight.w700,
          color: Color(0xFF64748B),
          letterSpacing: 0.5,
        ),
      ),
    );
  }

  InputDecoration _inputDecoration(String hint) {
    return InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 14),
      filled: true,
      fillColor: const Color(0xFFF8FAFC),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
      enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
      focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: _selectedColor, width: 2)),
    );
  }
}
