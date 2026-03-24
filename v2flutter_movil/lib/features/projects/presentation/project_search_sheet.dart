
import 'package:flutter/material.dart';
import '../../projects/data/projects_repository.dart';

class ProjectSearchSheet extends StatefulWidget {
  final Function(Map<String, dynamic>) onSelected;

  const ProjectSearchSheet({super.key, required this.onSelected});

  static Future<Map<String, dynamic>?> show(BuildContext context) {
    return showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.8,
        minChildSize: 0.5,
        maxChildSize: 0.9,
        builder: (context, scrollController) => ProjectSearchSheet(
          onSelected: (p) => Navigator.pop(context, p),
        ),
      ),
    );
  }

  @override
  State<ProjectSearchSheet> createState() => _ProjectSearchSheetState();
}

class _ProjectSearchSheetState extends State<ProjectSearchSheet> {
  final _repo = ProjectsRepository();
  final _searchCtrl = TextEditingController();
  List<Map<String, dynamic>> _results = [];
  bool _loading = false;

  void _onSearch(String query) async {
    if (query.isEmpty) {
       // Cargar por defecto los primeros
       _search('');
       return;
    }

    setState(() => _loading = true);
    final results = await _repo.search(query);
    if (mounted) {
      setState(() {
        _results = results;
        _loading = false;
      });
    }
  }

  Future<void> _search(String query) async {
    setState(() => _loading = true);
    final results = await _repo.search(query);
    if (mounted) {
      setState(() {
        _results = results;
        _loading = false;
      });
    }
  }

  @override
  void initState() {
    super.initState();
    _search(''); // Cargar iniciales
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
              decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(2)),
            ),
          ),
          
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              controller: _searchCtrl,
              autofocus: true,
              onChanged: _onSearch,
              decoration: InputDecoration(
                hintText: 'Buscar proyecto...',
                prefixIcon: const Icon(Icons.search),
                filled: true,
                fillColor: Colors.grey[100],
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              ),
            ),
          ),

          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _results.isEmpty 
                    ? const Center(child: Text('No se encontraron proyectos'))
                    : ListView.builder(
                        itemCount: _results.length,
                        itemBuilder: (context, index) {
                          final project = _results[index];
                          return ListTile(
                            leading: Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: Colors.purple[50],
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Icon(Icons.folder, color: Colors.purple),
                            ),
                            title: Text(project['nombre'] ?? 'Sin nombre'),
                            subtitle: Text(project['tipo'] ?? 'General'),
                            onTap: () {
                              widget.onSelected(project);
                            },
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}
