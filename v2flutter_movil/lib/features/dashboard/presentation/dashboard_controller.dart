import 'dart:developer';
import 'package:flutter/material.dart';
import '../../dashboard/data/dashboard_repository.dart';
import '../../dashboard/data/dashboard_models.dart';

class DashboardController extends ChangeNotifier {
  final DashboardRepository _repository = DashboardRepository();

  bool loading = false;
  String? error;
  DashboardKpiResponse? data;

  int _selectedMonth = DateTime.now().month;
  int _selectedYear = DateTime.now().year;

  int get selectedMonth => _selectedMonth;
  int get selectedYear => _selectedYear;

  void changePeriod(int month, int year) {
    _selectedMonth = month;
    _selectedYear = year;
    loadKPIs();
  }

  void nextMonth() {
    if (_selectedMonth == 12) {
      _selectedMonth = 1;
      _selectedYear++;
    } else {
      _selectedMonth++;
    }
    loadKPIs();
  }

  void prevMonth() {
    if (_selectedMonth == 1) {
      _selectedMonth = 12;
      _selectedYear--;
    } else {
      _selectedMonth--;
    }
    loadKPIs();
  }

  Future<void> loadKPIs() async {
    loading = true;
    error = null;
    notifyListeners();

    try {
      log('📊 [Dashboard] Cargando KPIs para $_selectedMonth/$_selectedYear...',
          name: 'Dashboard');
      data =
          await _repository.getKPIs(mes: _selectedMonth, anio: _selectedYear);

      log('📊 [Dashboard] Respuesta recibida:', name: 'Dashboard');
      log('   - Total: ${data?.resumen.total}', name: 'Dashboard');
      log('   - Hechas: ${data?.resumen.hechas}', name: 'Dashboard');
    } catch (e, stack) {
      log('❌ [Dashboard] Error cargando KPIs: $e',
          name: 'Dashboard', error: e, stackTrace: stack);
      error = e.toString();
      data = null;
    } finally {
      loading = false;
      notifyListeners();
    }
  }
}
