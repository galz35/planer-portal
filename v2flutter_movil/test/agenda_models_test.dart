import 'package:flutter_test/flutter_test.dart';

// ============================================================
// TESTS: Modelo AgendaResponse parsing
// ============================================================
// Valida que el modelo deserializa correctamente desde JSON,
// incluyendo casos edge como campos faltantes, listas vacías, etc.

// Replica del modelo
class AgendaResponse {
  final List<dynamic> bloqueosActivos;
  final List<dynamic> bloqueosMeCulpan;
  final List<Map<String, dynamic>> tareasSugeridas;
  final List<Map<String, dynamic>> backlog;

  AgendaResponse({
    this.bloqueosActivos = const [],
    this.bloqueosMeCulpan = const [],
    this.tareasSugeridas = const [],
    this.backlog = const [],
  });

  factory AgendaResponse.fromJson(Map<String, dynamic> json) {
    return AgendaResponse(
      bloqueosActivos: (json['bloqueosActivos'] as List?) ?? [],
      bloqueosMeCulpan: (json['bloqueosMeCulpan'] as List?) ?? [],
      tareasSugeridas: ((json['tareasSugeridas'] as List?) ?? [])
          .map((e) => e as Map<String, dynamic>)
          .toList(),
      backlog: ((json['backlog'] as List?) ?? [])
          .map((e) => e as Map<String, dynamic>)
          .toList(),
    );
  }
}

void main() {
  group('AgendaResponse.fromJson', () {
    test('parses complete valid JSON', () {
      final json = {
        'bloqueosActivos': [
          {'id': 1, 'tipo': 'RECURSO'}
        ],
        'bloqueosMeCulpan': [],
        'tareasSugeridas': [
          {
            'idTarea': 101,
            'titulo': 'Test Task',
            'estado': 'Pendiente',
            'prioridad': 'Alta',
          }
        ],
        'backlog': [
          {
            'idTarea': 201,
            'titulo': 'Backlog Task',
          }
        ],
      };

      final result = AgendaResponse.fromJson(json);

      expect(result.bloqueosActivos.length, 1);
      expect(result.bloqueosMeCulpan.length, 0);
      expect(result.tareasSugeridas.length, 1);
      expect(result.tareasSugeridas[0]['titulo'], 'Test Task');
      expect(result.backlog.length, 1);
    });

    test('handles empty JSON gracefully', () {
      final json = <String, dynamic>{};
      final result = AgendaResponse.fromJson(json);

      expect(result.bloqueosActivos, isEmpty);
      expect(result.bloqueosMeCulpan, isEmpty);
      expect(result.tareasSugeridas, isEmpty);
      expect(result.backlog, isEmpty);
    });

    test('handles null fields gracefully', () {
      final json = {
        'bloqueosActivos': null,
        'tareasSugeridas': null,
        'backlog': null,
      };
      final result = AgendaResponse.fromJson(json);

      expect(result.bloqueosActivos, isEmpty);
      expect(result.tareasSugeridas, isEmpty);
      expect(result.backlog, isEmpty);
    });

    test('handles partial JSON (only tareas)', () {
      final json = {
        'tareasSugeridas': [
          {'idTarea': 1, 'titulo': 'Solo tarea'},
        ],
      };
      final result = AgendaResponse.fromJson(json);

      expect(result.tareasSugeridas.length, 1);
      expect(result.bloqueosActivos, isEmpty);
    });
  });

  group('Task priority sorting', () {
    test('sorts tasks by priority: Alta > Media > Baja', () {
      final tasks = [
        {'titulo': 'Task C', 'prioridad': 'Baja'},
        {'titulo': 'Task A', 'prioridad': 'Alta'},
        {'titulo': 'Task B', 'prioridad': 'Media'},
      ];

      const priorityOrder = {'Alta': 0, 'Media': 1, 'Baja': 2};
      tasks.sort((a, b) => (priorityOrder[a['prioridad']] ?? 99)
          .compareTo(priorityOrder[b['prioridad']] ?? 99));

      expect(tasks[0]['titulo'], 'Task A');
      expect(tasks[1]['titulo'], 'Task B');
      expect(tasks[2]['titulo'], 'Task C');
    });

    test('handles unknown priority gracefully', () {
      final tasks = [
        {'titulo': 'Task X', 'prioridad': 'Urgente'},
        {'titulo': 'Task A', 'prioridad': 'Alta'},
      ];

      const priorityOrder = {'Alta': 0, 'Media': 1, 'Baja': 2};
      tasks.sort((a, b) => (priorityOrder[a['prioridad']] ?? 99)
          .compareTo(priorityOrder[b['prioridad']] ?? 99));

      expect(tasks[0]['titulo'], 'Task A');
      expect(tasks[1]['titulo'], 'Task X'); // Unknown goes last
    });
  });

  group('Offline data envelope unwrapping', () {
    test('unwraps success envelope { success: true, data: {...} }', () {
      final rawResponse = {
        'success': true,
        'data': {
          'tareasSugeridas': [
            {'idTarea': 1, 'titulo': 'Test'}
          ],
        },
      };

      Map<String, dynamic> data;
      if (rawResponse.containsKey('data') &&
          rawResponse['data'] is Map<String, dynamic>) {
        data = rawResponse['data'] as Map<String, dynamic>;
      } else {
        data = rawResponse;
      }

      final result = AgendaResponse.fromJson(data);
      expect(result.tareasSugeridas.length, 1);
    });

    test('handles flat response without envelope', () {
      final rawResponse = {
        'tareasSugeridas': [
          {'idTarea': 1, 'titulo': 'Direct'}
        ],
      };

      Map<String, dynamic> data;
      if (rawResponse.containsKey('data') &&
          rawResponse['data'] is Map<String, dynamic>) {
        data = rawResponse['data'] as Map<String, dynamic>;
      } else {
        data = rawResponse;
      }

      final result = AgendaResponse.fromJson(data);
      expect(result.tareasSugeridas.length, 1);
      expect(result.tareasSugeridas[0]['titulo'], 'Direct');
    });
  });
}
