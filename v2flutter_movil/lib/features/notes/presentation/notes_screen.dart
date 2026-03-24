import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../tasks/data/local/local_database.dart';
import '../../home/presentation/home_shell.dart';

/// Pantalla de Notas - Diseño Premium
/// Notas personales almacenadas localmente en SQLite
class NotesScreen extends StatefulWidget {
  const NotesScreen({super.key});

  @override
  State<NotesScreen> createState() => _NotesScreenState();
}

class _NotesScreenState extends State<NotesScreen> {
  List<Map<String, Object?>> notes = [];
  bool _loading = true;

  // Colores para las notas (estilo sticky notes)
  static const _noteColors = [
    Color(0xFFFEF3C7), // Amber 100
    Color(0xFFDCFCE7), // Green 100
    Color(0xFFE0E7FF), // Indigo 100
    Color(0xFFFCE7F3), // Pink 100
    Color(0xFFE0F2FE), // Sky 100
    Color(0xFFF3E8FF), // Purple 100
  ];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final db = await LocalDatabase.instance.database;
    final rows = await db.query('notes', orderBy: 'fecha_actualizacion DESC');
    if (!mounted) return;
    setState(() {
      notes = rows;
      _loading = false;
    });
  }

  Future<void> _createOrEdit({Map<String, Object?>? note}) async {
    final titleCtrl =
        TextEditingController(text: (note?['titulo'] ?? '').toString());
    final contentCtrl =
        TextEditingController(text: (note?['contenido'] ?? '').toString());
    final isNew = note == null;

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          padding: EdgeInsets.fromLTRB(
              20, 20, 20, MediaQuery.of(ctx).viewInsets.bottom + 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Handle
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 20),
                  decoration: BoxDecoration(
                    color: Colors.grey[300],
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              // Title
              Text(
                isNew ? 'Nueva Nota' : 'Editar Nota',
                style: const TextStyle(
                  fontFamily: 'Inter',
                  fontWeight: FontWeight.w800,
                  fontSize: 20,
                  color: Color(0xFF1E293B),
                ),
              ),
              const SizedBox(height: 20),
              // Title Field
              TextField(
                controller: titleCtrl,
                style: const TextStyle(
                    fontFamily: 'Inter', fontWeight: FontWeight.w600),
                decoration: InputDecoration(
                  labelText: 'Título',
                  labelStyle: const TextStyle(color: Color(0xFF64748B)),
                  filled: true,
                  fillColor: const Color(0xFFF8FAFC),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none,
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide:
                        const BorderSide(color: Color(0xFF6366F1), width: 2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              // Content Field
              TextField(
                controller: contentCtrl,
                maxLines: 6,
                style: const TextStyle(fontFamily: 'Inter'),
                decoration: InputDecoration(
                  labelText: 'Contenido',
                  alignLabelWithHint: true,
                  labelStyle: const TextStyle(color: Color(0xFF64748B)),
                  filled: true,
                  fillColor: const Color(0xFFF8FAFC),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none,
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide:
                        const BorderSide(color: Color(0xFF6366F1), width: 2),
                  ),
                ),
              ),
              const SizedBox(height: 24),
              // Actions
              Row(
                children: [
                  if (!isNew)
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () async {
                          Navigator.pop(ctx);
                          await _delete((note['id'] as int?) ?? 0);
                        },
                        icon: const Icon(Icons.delete_outline,
                            color: Color(0xFFEF4444)),
                        label: const Text('Eliminar',
                            style: TextStyle(color: Color(0xFFEF4444))),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: Color(0xFFEF4444)),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                      ),
                    ),
                  if (!isNew) const SizedBox(width: 12),
                  Expanded(
                    flex: isNew ? 1 : 2,
                    child: ElevatedButton.icon(
                      onPressed: () async {
                        final db = await LocalDatabase.instance.database;
                        final data = {
                          'titulo': titleCtrl.text.trim().isEmpty
                              ? 'Sin título'
                              : titleCtrl.text.trim(),
                          'contenido': contentCtrl.text.trim(),
                          'fecha_actualizacion':
                              DateTime.now().toIso8601String(),
                        };

                        if (isNew) {
                          await db.insert('notes', data);
                        } else {
                          await db.update('notes', data,
                              where: 'id = ?', whereArgs: [note['id']]);
                        }

                        if (ctx.mounted) Navigator.pop(ctx);
                        await _load();
                      },
                      icon: const Icon(Icons.save_outlined),
                      label: const Text('Guardar'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF6366F1),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _delete(int id) async {
    final db = await LocalDatabase.instance.database;
    await db.delete('notes', where: 'id = ?', whereArgs: [id]);
    await _load();
  }

  String _formatDate(String? dateStr) {
    if (dateStr == null || dateStr.isEmpty) return '';
    try {
      final date = DateTime.parse(dateStr);
      return DateFormat('dd MMM, HH:mm', 'es').format(date);
    } catch (_) {
      return '';
    }
  }

  Color _getNoteColor(int index) {
    return _noteColors[index % _noteColors.length];
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.menu_rounded, color: Color(0xFF1E293B)),
          onPressed: () => HomeShell.scaffoldKey.currentState?.openDrawer(),
        ),
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Mis Notas',
              style: TextStyle(
                fontFamily: 'Inter',
                fontWeight: FontWeight.w900,
                fontSize: 20,
                color: Color(0xFF0F172A),
              ),
            ),
            Text(
              'Notas y recordatorios personales',
              style: TextStyle(
                fontFamily: 'Inter',
                fontSize: 11,
                fontWeight: FontWeight.w500,
                color: Color(0xFF64748B),
              ),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _createOrEdit(),
        backgroundColor: const Color(0xFF6366F1),
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text(
          'Nueva nota',
          style: TextStyle(
            fontFamily: 'Inter',
            fontWeight: FontWeight.w600,
            color: Colors.white,
          ),
        ),
      ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: Color(0xFF6366F1)))
          : notes.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.note_alt_outlined,
                          size: 72, color: Colors.grey[300]),
                      const SizedBox(height: 16),
                      const Text(
                        'No tienes notas',
                        style: TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF64748B),
                        ),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Crea una nueva nota para empezar',
                        style: TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 13,
                          color: Color(0xFF94A3B8),
                        ),
                      ),
                    ],
                  ),
                )
              : GridView.builder(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                    childAspectRatio: 0.85,
                  ),
                  itemCount: notes.length,
                  itemBuilder: (_, i) {
                    final note = notes[i];
                    final color = _getNoteColor(i);

                    return _buildNoteCard(note, color);
                  },
                ),
    );
  }

  Widget _buildNoteCard(Map<String, Object?> note, Color bgColor) {
    final title = (note['titulo'] ?? 'Sin título').toString();
    final content = (note['contenido'] ?? '').toString();
    final dateStr = (note['fecha_actualizacion'] ?? '').toString();

    return Material(
      color: bgColor,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: () => _createOrEdit(note: note),
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.black.withAlpha(5)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Title
              Text(
                title,
                style: const TextStyle(
                  fontFamily: 'Inter',
                  fontWeight: FontWeight.w700,
                  fontSize: 15,
                  color: Color(0xFF1E293B),
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 8),
              // Content
              Expanded(
                child: Text(
                  content.isEmpty ? 'Sin contenido' : content,
                  style: TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 13,
                    color: content.isEmpty
                        ? const Color(0xFF94A3B8)
                        : const Color(0xFF475569),
                  ),
                  maxLines: 5,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              // Date
              const SizedBox(height: 8),
              Text(
                _formatDate(dateStr),
                style: const TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 10,
                  fontWeight: FontWeight.w500,
                  color: Color(0xFF64748B),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
