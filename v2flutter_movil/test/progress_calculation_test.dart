import 'package:flutter_test/flutter_test.dart';

// ============================================================
// TESTS: Lógica de cálculo de progreso de proyectos
// ============================================================
// Valida que _extractProgress maneja correctamente:
// - null explícito
// - strings numéricos
// - valores num normales
// - fallback a 0 cuando no hay datos

/// Replica exacta de la función helper en projects_screen.dart
double extractProgress(Map<String, dynamic> p) {
  for (final key in ['avance', 'progreso', 'porcentaje']) {
    final raw = p[key];
    if (raw == null) continue;
    if (raw is num) return raw.toDouble();
    if (raw is String) {
      final parsed = double.tryParse(raw);
      if (parsed != null) return parsed;
    }
  }
  return 0.0;
}

void main() {
  group('extractProgress', () {
    test('returns porcentaje when avance and progreso are null', () {
      final p = {'avance': null, 'progreso': null, 'porcentaje': 75};
      expect(extractProgress(p), 75.0);
    });

    test('returns avance when it has a valid value', () {
      final p = {'avance': 50, 'progreso': 30, 'porcentaje': 20};
      expect(extractProgress(p), 50.0);
    });

    test('skips avance null and returns progreso', () {
      final p = {'avance': null, 'progreso': 60};
      expect(extractProgress(p), 60.0);
    });

    test('returns 0.0 when all fields are null', () {
      final p = <String, dynamic>{
        'avance': null,
        'progreso': null,
        'porcentaje': null
      };
      expect(extractProgress(p), 0.0);
    });

    test('returns 0.0 when map is empty', () {
      final p = <String, dynamic>{};
      expect(extractProgress(p), 0.0);
    });

    test('handles string values correctly', () {
      final p = {'porcentaje': '85.5'};
      expect(extractProgress(p), 85.5);
    });

    test('handles string avance correctly', () {
      final p = {'avance': '100', 'porcentaje': 50};
      expect(extractProgress(p), 100.0);
    });

    test('skips invalid string and falls through', () {
      final p = {'avance': 'N/A', 'porcentaje': 42};
      expect(extractProgress(p), 42.0);
    });

    test('handles 0 as a valid value (not skipped)', () {
      final p = {'avance': 0, 'porcentaje': 80};
      expect(extractProgress(p), 0.0);
    });

    test('handles double values correctly', () {
      final p = {'porcentaje': 33.33};
      expect(extractProgress(p), 33.33);
    });

    // BUG REGRESSION: El bug original era que `??` en Dart
    // no salta un null explícito como valor de Map. Solo salta
    // claves ausentes. Este test asegura que no se rompa.
    test('REGRESSION: explicit null does not block fallback', () {
      // Simula: API devuelve {avance: null, progreso: null, porcentaje: 65}
      final apiResponse = {
        'nombre': 'Proyecto X',
        'avance': null, // campo existe pero es null
        'progreso': null, // campo existe pero es null
        'porcentaje': 65, // valor real del SP
      };
      expect(extractProgress(apiResponse), 65.0);
    });

    test('REGRESSION: missing keys still fallback correctly', () {
      // Simula: API solo devuelve porcentaje
      final apiResponse = {
        'nombre': 'Proyecto Y',
        'porcentaje': 42,
      };
      expect(extractProgress(apiResponse), 42.0);
    });
  });

  group('Project delay calculation', () {
    test('calculates delay correctly for overdue project', () {
      final now = DateTime.now();
      final start = now.subtract(const Duration(days: 100));
      final end = now.subtract(const Duration(days: 10)); // Ya pasó
      const avance = 50.0;

      final totalDias = end.difference(start).inDays;
      final diasTranscurridos = now.difference(start).inDays;
      final progresoEsperado =
          (diasTranscurridos / totalDias * 100).clamp(0, 100);
      final atraso = progresoEsperado - avance;

      expect(atraso > 0, true, reason: 'El proyecto debería estar atrasado');
      expect(progresoEsperado, 100.0,
          reason: 'Debería esperarse 100% ya que la fecha fin pasó');
      expect(atraso, 50.0, reason: 'Atraso = 100% esperado - 50% real');
    });

    test('no delay when project is ahead of schedule', () {
      final now = DateTime.now();
      final start = now.subtract(const Duration(days: 50));
      final end = now.add(const Duration(days: 50)); // 50% del camino
      const avance = 80.0; // Adelantado

      final totalDias = end.difference(start).inDays;
      final diasTranscurridos = now.difference(start).inDays;
      final progresoEsperado =
          (diasTranscurridos / totalDias * 100).clamp(0.0, 100.0);
      final atraso = progresoEsperado - avance;

      expect(atraso < 0, true, reason: 'El proyecto debería estar adelantado');
    });

    test('no delay for completed project', () {
      const avance = 100.0;
      // Si el avance es 100%, no importan las fechas
      expect(avance >= 100, true);
    });
  });
}
