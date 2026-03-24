class DashboardKpiResponse {
  final ResumenKPIS resumen;
  final List<ProyectoKPI> proyectos;

  DashboardKpiResponse({required this.resumen, required this.proyectos});

  factory DashboardKpiResponse.fromJson(Map<String, dynamic> json) {
    // Soporte para formato de analítica (/planning/stats)
    if (json.containsKey('projectsStats')) {
      final proyectos = (json['projectsStats'] as List? ?? [])
          .map((e) => ProyectoKPI.fromJson(e))
          .toList();

      int total = 0;
      int hechas = 0;
      int pendientes = 0;
      int bloqueadas = 0;

      for (var p in proyectos) {
        total += p.total;
        hechas += p.hechas;
      }

      // Los pendientes y bloqueados suelen ser globales en el formato de stats
      pendientes = (json['globalPendientes'] ?? json['pendientes'] ?? 0) as int;
      bloqueadas = (json['globalBloqueadas'] ?? json['bloqueadas'] ?? 0) as int;

      return DashboardKpiResponse(
        resumen: ResumenKPIS(
          total: total,
          hechas: hechas,
          pendientes: (json['globalPendientes'] ?? pendientes) as int,
          bloqueadas: (json['globalBloqueadas'] ?? bloqueadas) as int,
          promedioAvance: (json['globalCompletion'] as num? ?? 0).toDouble(),
        ),
        proyectos: proyectos,
      );
    }

    // Formato estándar (/kpis/dashboard)
    return DashboardKpiResponse(
      resumen: ResumenKPIS.fromJson(json['resumen'] ?? {}),
      proyectos: (json['proyectos'] as List? ?? [])
          .map((e) => ProyectoKPI.fromJson(e))
          .toList(),
    );
  }
}

class ResumenKPIS {
  final int total;
  final int hechas;
  final int pendientes;
  final int bloqueadas;
  final double promedioAvance;

  ResumenKPIS({
    this.total = 0,
    this.hechas = 0,
    this.pendientes = 0,
    this.bloqueadas = 0,
    this.promedioAvance = 0.0,
  });

  factory ResumenKPIS.fromJson(Map<String, dynamic> json) {
    return ResumenKPIS(
      total: json['total'] ?? json['totalTareas'] ?? 0,
      hechas:
          json['hechas'] ?? json['tareasHechas'] ?? json['completadas'] ?? 0,
      pendientes: json['pendientes'] ??
          json['tareasPendientes'] ??
          json['enProceso'] ??
          0,
      bloqueadas: json['bloqueadas'] ?? json['tareasBloqueadas'] ?? 0,
      promedioAvance:
          (json['promedioAvance'] ?? json['avancePromedio'] ?? 0) is num
              ? ((json['promedioAvance'] ?? json['avancePromedio'] ?? 0) as num)
                  .toDouble()
              : 0.0,
    );
  }
}

class ProyectoKPI {
  final String proyecto;
  final String area;
  final int total;
  final int hechas;

  ProyectoKPI({
    required this.proyecto,
    required this.area,
    this.total = 0,
    this.hechas = 0,
  });

  int get avancePercent => total > 0 ? ((hechas / total) * 100).round() : 0;

  factory ProyectoKPI.fromJson(Map<String, dynamic> json) {
    return ProyectoKPI(
      proyecto: (json['proyecto'] ?? json['nombre'] ?? 'Sin nombre').toString(),
      area: (json['area'] ?? 'General').toString(),
      total: (json['total'] ?? json['totalTasks'] ?? 0) as int,
      hechas: (json['hechas'] ?? 0) as int,
    );
  }
}
