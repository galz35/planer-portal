import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'dart:async';
import '../../common/data/user_repository.dart';
import '../../common/domain/empleado.dart';

/// ============================================
/// USER SEARCH SHEET - Buscar y seleccionar persona
/// ============================================
/// Patrón igual a React CreateTaskModal:
/// 1. Al abrir → Muestra empleados de MI GERENCIA (jerarquía)
/// 2. Al escribir ≥ 2 chars → Busca en TODOS los empleados (cross-area)
/// 3. Muestra nombre, cargo, área y carnet para identificación clara
class UserSearchSheet extends StatefulWidget {
  final Function(dynamic) onSelected;
  final bool multiSelect;
  final Set<String> initialSelection;
  final String? title;

  const UserSearchSheet({
    super.key,
    required this.onSelected,
    this.multiSelect = false,
    this.initialSelection = const {},
    this.title,
  });

  static Future<dynamic> show(
    BuildContext context, {
    bool multiSelect = false,
    Set<String> initialSelection = const {},
    String? title,
  }) {
    return showModalBottomSheet<dynamic>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.8,
        minChildSize: 0.5,
        maxChildSize: 0.9,
        builder: (context, scrollController) => UserSearchSheet(
          onSelected: (e) => Navigator.pop(context, e),
          multiSelect: multiSelect,
          initialSelection: initialSelection,
          title: title,
        ),
      ),
    );
  }

  @override
  State<UserSearchSheet> createState() => _UserSearchSheetState();
}

class _UserSearchSheetState extends State<UserSearchSheet> {
  final _repo = UserRepository();
  final _searchCtrl = TextEditingController();
  Timer? _debounce;

  List<Empleado> _gerenciaUsers = []; // Mi jerarquía/gerencia
  List<Empleado> _displayResults = []; // Lo que se muestra en pantalla
  bool _loading = false;
  bool _isSearchingAll = false; // true = buscando en todo el sistema
  String _headerLabel = 'Mi Equipo';
  final Set<String> _selectedIds = {};

  @override
  void initState() {
    super.initState();
    _selectedIds.addAll(widget.initialSelection);
    _loadMyTeam();
  }

  /// Paso 1: Cargar empleados de MI gerencia (jerarquía)
  /// Esto es lo que ves por defecto, igual que React.
  void _loadMyTeam() async {
    setState(() => _loading = true);

    List<Empleado> team = [];

    try {
      if (!mounted) return;

      // El usuario solicitó VER A TODOS DE INMEDIATO, no solo a su gerencia
      team = await _repo.getAllEmployees();
    } catch (e) {
      debugPrint('⚠️ Error loading team: $e');
    }

    // Agregar recientes al inicio (sin duplicados)
    try {
      final recents = await _repo.getRecents();
      final teamIds = team.map((e) => e.idUsuario).toSet();
      final uniqueRecents =
          recents.where((r) => !teamIds.contains(r.idUsuario)).toList();
      team = [...uniqueRecents, ...team];
    } catch (_) {}

    if (mounted && _searchCtrl.text.isEmpty) {
      final teamSize = team.length;
      setState(() {
        _gerenciaUsers = team;
        _displayResults = team;
        _isSearchingAll = false;
        _headerLabel = team.isEmpty ? 'Sin empleados' : 'Todos ($teamSize)';
        _loading = false;
      });
    }
  }

  /// Paso 2: Búsqueda — filtra local si es texto corto,
  /// busca en todo el sistema si >= 2 chars (como React)
  void _onSearch(String query) {
    _debounce?.cancel();

    if (query.isEmpty) {
      setState(() {
        _displayResults = _gerenciaUsers;
        _isSearchingAll = false;
        _headerLabel = _gerenciaUsers.isEmpty
            ? 'Sin empleados'
            : 'Todos (${_gerenciaUsers.length})';
      });
      return;
    }

    // Filtro local sobre mi gerencia (instantáneo)
    final q = query.toLowerCase();
    final localMatches = _gerenciaUsers.where((e) {
      return e.nombreCompleto.toLowerCase().contains(q) ||
          (e.cargo?.toLowerCase().contains(q) ?? false) ||
          (e.area?.toLowerCase().contains(q) ?? false) ||
          (e.carnet?.toLowerCase().contains(q) ?? false);
    }).toList();

    setState(() {
      _displayResults = localMatches;
      _headerLabel = 'Resultados (${localMatches.length})';
      _isSearchingAll = false;
    });

    // Si >= 2 chars, también buscar en todo el sistema (cross-area) con DEBOUNCE
    if (query.length >= 2) {
      _debounce = Timer(const Duration(milliseconds: 350), () async {
        if (!mounted) return;
        setState(() => _isSearchingAll = true);

        try {
          final apiResults = await _repo.search(query);
          if (mounted && _searchCtrl.text == query) {
            // Merge: local primero, luego API sin duplicados
            final existingIds = localMatches.map((e) => e.idUsuario).toSet();
            final fromApi = apiResults
                .where((r) => !existingIds.contains(r.idUsuario))
                .toList();
            final merged = [...localMatches, ...fromApi];

            setState(() {
              _displayResults = merged;
              _isSearchingAll = false;
              _headerLabel = fromApi.isNotEmpty
                  ? 'Local (${localMatches.length}) + Servidor (${fromApi.length})'
                  : 'Resultados (${merged.length})';
            });
          }
        } catch (e) {
          debugPrint('Error in API search: $e');
          if (mounted) {
            setState(() => _isSearchingAll = false);
          }
        }
      });
    }
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          // Handle
          Center(
            child: Container(
              margin: const EdgeInsets.only(top: 12),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2)),
            ),
          ),

          // Header
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEDE9FE),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(CupertinoIcons.person_2_fill,
                      color: Color(0xFF7C3AED), size: 20),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.title ?? 'Asignar a persona',
                        style: const TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF0F172A),
                        ),
                      ),
                      const Text(
                        'Busca por nombre para ver otras áreas',
                        style: TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 11,
                          color: Color(0xFF94A3B8),
                        ),
                      ),
                    ],
                  ),
                ),
                if (widget.multiSelect)
                  ElevatedButton(
                    onPressed: () {
                      final selectedObjects = _gerenciaUsers
                          .where((u) =>
                              _selectedIds.contains(u.idUsuario.toString()))
                          .toList();
                      // También buscar en displayResults si no están en gerenciaUsers
                      final extras = _displayResults
                          .where((u) =>
                              _selectedIds.contains(u.idUsuario.toString()))
                          .where((u) => !_gerenciaUsers
                              .any((g) => g.idUsuario == u.idUsuario))
                          .toList();

                      widget.onSelected([...selectedObjects, ...extras]);
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF7C3AED),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8)),
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      elevation: 0,
                    ),
                    child: const Text('Confirmar',
                        style: TextStyle(
                            fontSize: 12, fontWeight: FontWeight.bold)),
                  ),
              ],
            ),
          ),

          // Search field
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: TextField(
              controller: _searchCtrl,
              autofocus: true,
              onChanged: _onSearch,
              decoration: InputDecoration(
                hintText: 'Nombre, cargo, área o carnet...',
                hintStyle: const TextStyle(
                  fontFamily: 'Inter',
                  color: Color(0xFF94A3B8),
                ),
                prefixIcon: const Icon(Icons.search, color: Color(0xFF64748B)),
                suffixIcon: _isSearchingAll
                    ? const Padding(
                        padding: EdgeInsets.all(12),
                        child: SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Color(0xFF7C3AED)),
                        ),
                      )
                    : null,
                filled: true,
                fillColor: const Color(0xFFF8FAFC),
                border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide:
                        const BorderSide(color: Color(0xFF7C3AED), width: 2)),
              ),
            ),
          ),

          // Section label
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: Row(
              children: [
                Icon(
                  _searchCtrl.text.length >= 2
                      ? Icons.public
                      : Icons.people_outline,
                  size: 14,
                  color: Colors.grey[500],
                ),
                const SizedBox(width: 6),
                Text(
                  _headerLabel,
                  style: TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 12,
                    color: Colors.grey[500],
                    fontWeight: FontWeight.w600,
                  ),
                ),
                if (_searchCtrl.text.isEmpty) ...[
                  const Spacer(),
                  Text(
                    'Escribe para buscar en todo',
                    style: TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 10,
                      color: Colors.grey[400],
                      fontStyle: FontStyle.italic,
                    ),
                  ),
                ],
              ],
            ),
          ),

          // List
          Expanded(
            child: _loading
                ? const Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        CircularProgressIndicator(color: Color(0xFF7C3AED)),
                        SizedBox(height: 12),
                        Text('Cargando equipo...',
                            style: TextStyle(
                                fontFamily: 'Inter', color: Color(0xFF94A3B8))),
                      ],
                    ),
                  )
                : _displayResults.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.search_off,
                                size: 48, color: Color(0xFFCBD5E1)),
                            const SizedBox(height: 8),
                            Text(
                              _searchCtrl.text.isEmpty
                                  ? 'No se encontraron empleados en tu equipo'
                                  : 'No se encontraron resultados para "${_searchCtrl.text}"',
                              textAlign: TextAlign.center,
                              style: const TextStyle(
                                  fontFamily: 'Inter',
                                  color: Color(0xFF94A3B8)),
                            ),
                            if (_searchCtrl.text.isNotEmpty &&
                                _searchCtrl.text.length < 2)
                              const Padding(
                                padding: EdgeInsets.only(top: 4),
                                child: Text(
                                  'Escribe al menos 2 letras para buscar en todo el sistema',
                                  style: TextStyle(
                                      fontFamily: 'Inter',
                                      fontSize: 11,
                                      color: Color(0xFFBDC5D0)),
                                ),
                              ),
                          ],
                        ),
                      )
                    : ListView.separated(
                        itemCount: _displayResults.length,
                        separatorBuilder: (_, __) => Divider(
                            height: 1, indent: 60, color: Colors.grey[100]),
                        itemBuilder: (context, index) {
                          final user = _displayResults[index];
                          final idStr = user.idUsuario.toString();
                          final isSelected = _selectedIds.contains(idStr);

                          final initials = user.nombreCompleto.isNotEmpty
                              ? user.nombreCompleto[0].toUpperCase()
                              : '?';

                          // Detectar si es de mi equipo o de otra área
                          final isFromMyTeam = _gerenciaUsers
                              .any((g) => g.idUsuario == user.idUsuario);

                          final colors = [
                            const Color(0xFF7C3AED),
                            const Color(0xFF059669),
                            const Color(0xFF0284C7),
                            const Color(0xFFD97706),
                            const Color(0xFFDC2626),
                          ];
                          final color = colors[user.idUsuario % colors.length];

                          return InkWell(
                            onTap: () {
                              if (widget.multiSelect) {
                                setState(() {
                                  if (isSelected) {
                                    _selectedIds.remove(idStr);
                                  } else {
                                    _selectedIds.add(idStr);
                                  }
                                });
                              } else {
                                _repo.saveRecent(user);
                                widget.onSelected(user);
                              }
                            },
                            child: Padding(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 16, vertical: 8),
                              child: Row(
                                children: [
                                  if (widget.multiSelect)
                                    Padding(
                                      padding: const EdgeInsets.only(right: 12),
                                      child: Icon(
                                        isSelected
                                            ? Icons.check_box
                                            : Icons.check_box_outline_blank,
                                        color: isSelected
                                            ? const Color(0xFF7C3AED)
                                            : const Color(0xFFCBD5E1),
                                      ),
                                    ),
                                  CircleAvatar(
                                    radius: 20,
                                    backgroundColor:
                                        color.withValues(alpha: 0.1),
                                    child: Text(
                                      initials,
                                      style: TextStyle(
                                          color: color,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 16),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          children: [
                                            Flexible(
                                              child: Text(
                                                user.nombreCompleto,
                                                style: const TextStyle(
                                                  fontFamily: 'Inter',
                                                  fontWeight: FontWeight.w600,
                                                  color: Color(0xFF0F172A),
                                                ),
                                                overflow: TextOverflow.ellipsis,
                                              ),
                                            ),
                                            if (!isFromMyTeam &&
                                                _searchCtrl.text.isNotEmpty)
                                              Container(
                                                margin: const EdgeInsets.only(
                                                    left: 6),
                                                padding:
                                                    const EdgeInsets.symmetric(
                                                        horizontal: 6,
                                                        vertical: 1),
                                                decoration: BoxDecoration(
                                                  color:
                                                      const Color(0xFFFFF7ED),
                                                  borderRadius:
                                                      BorderRadius.circular(4),
                                                  border: Border.all(
                                                      color: const Color(
                                                          0xFFFFEDD5)),
                                                ),
                                                child: const Text(
                                                  'Otra área',
                                                  style: TextStyle(
                                                    fontFamily: 'Inter',
                                                    fontSize: 9,
                                                    fontWeight: FontWeight.w700,
                                                    color: Color(0xFFEA580C),
                                                  ),
                                                ),
                                              ),
                                          ],
                                        ),
                                        Text(
                                          '${user.cargo ?? 'Sin cargo'} • ${user.area ?? 'Sin área'}',
                                          style: const TextStyle(
                                            fontFamily: 'Inter',
                                            fontSize: 12,
                                            color: Color(0xFF94A3B8),
                                          ),
                                        ),
                                        if (user.carnet != null &&
                                            user.carnet!.isNotEmpty)
                                          Text(
                                            'Carnet: ${user.carnet}',
                                            style: const TextStyle(
                                              fontFamily: 'Inter',
                                              fontSize: 11,
                                              color: Color(0xFFBDC5D0),
                                            ),
                                          ),
                                      ],
                                    ),
                                  ),
                                  if (!widget.multiSelect)
                                    const Icon(Icons.chevron_right,
                                        color: Color(0xFFCBD5E1)),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}
