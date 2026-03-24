import 'package:flutter/material.dart';
import '../services/admin_service.dart';
import 'package:intl/intl.dart';

class InactivityReportScreen extends StatefulWidget {
  const InactivityReportScreen({super.key});

  @override
  State<InactivityReportScreen> createState() => _InactivityReportScreenState();
}

class _InactivityReportScreenState extends State<InactivityReportScreen> {
  final AdminService _service = AdminService();
  DateTime _selectedDate = DateTime.now();
  List<dynamic> _users = [];
  bool _isLoading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  Future<void> _fetchData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final data = await _service.getInactiveUsers(_selectedDate);
      setState(() {
        _users = data;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
    );
    if (picked != null && picked != _selectedDate) {
      setState(() {
        _selectedDate = picked;
      });
      _fetchData();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Reporte Inactividad'),
        actions: [
          IconButton(
            icon: const Icon(Icons.calendar_today),
            onPressed: _pickDate,
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchData,
          ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_error != null) {
      return Center(child: Text('Error: $_error'));
    }
    if (_users.isEmpty) {
      return const Center(
        child: Text(
          '¡Todos activos! No hay inactividad reportada.',
          style: TextStyle(color: Colors.green, fontSize: 16),
        ),
      );
    }
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(8.0),
          child: Text(
            'Fecha: ${DateFormat('yyyy-MM-dd').format(_selectedDate)} - Total: ${_users.length}',
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
        ),
        Expanded(
          child: ListView.separated(
            itemCount: _users.length,
            separatorBuilder: (_, __) => const Divider(),
            itemBuilder: (context, index) {
              final user = _users[index];
              return ListTile(
                leading: CircleAvatar(
                  backgroundColor: Colors.red.shade100,
                  child: Text(
                    (user['nombreCompleto']?.toString().substring(0, 1) ?? '?')
                        .toUpperCase(),
                    style: TextStyle(color: Colors.red.shade800),
                  ),
                ),
                title: Text(user['nombreCompleto'] ?? 'Sin Nombre'),
                subtitle:
                    Text('${user['cargo'] ?? '-'} • ${user['area'] ?? '-'}'),
                trailing: Text(
                  user['carnet'] ?? '',
                  style: const TextStyle(color: Colors.grey),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}
