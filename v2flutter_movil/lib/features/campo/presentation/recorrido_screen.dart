import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:image_picker/image_picker.dart';

import '../domain/cliente_model.dart';
import 'campo_controller.dart';

/// Pantalla EN RECORRIDO: mapa con polyline, siguiente parada, KPIs, progreso.
class RecorridoScreen extends StatelessWidget {
  const RecorridoScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<CampoController>(
      builder: (context, ctrl, _) {
        final center = ctrl.miPosicion != null
            ? LatLng(ctrl.miPosicion!.latitude, ctrl.miPosicion!.longitude)
            : const LatLng(12.1364, -86.2514);

        return Scaffold(
          body: Column(
            children: [
              // Header verde - stats live
              _buildHeader(ctrl),
              // Banner visita activa
              if (ctrl.enVisita) _buildVisitaBanner(context, ctrl),
              // Mapa con polyline
              Expanded(
                flex: 5,
                child: Stack(
                  children: [
                    FlutterMap(
                      options: MapOptions(
                        initialCenter: center,
                        initialZoom: 15,
                      ),
                      children: [
                        TileLayer(
                          urlTemplate:
                              'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                          userAgentPackageName: 'com.planneref.app',
                        ),
                        // Polyline de la ruta real
                        if (ctrl.puntosPolyline.isNotEmpty)
                          PolylineLayer(
                            polylines: [
                              Polyline(
                                points: ctrl.puntosPolyline
                                    .map((p) => LatLng(p.lat, p.lon))
                                    .toList(),
                                strokeWidth: 4,
                                color: Colors.red.shade700,
                              ),
                            ],
                          ),
                        // Markers
                        MarkerLayer(
                          markers: [
                            // Mi ubicación
                            if (ctrl.miPosicion != null)
                              Marker(
                                point: LatLng(ctrl.miPosicion!.latitude,
                                    ctrl.miPosicion!.longitude),
                                width: 28,
                                height: 28,
                                child: Container(
                                  decoration: BoxDecoration(
                                    color: Colors.blue,
                                    shape: BoxShape.circle,
                                    border: Border.all(
                                        color: Colors.white, width: 3),
                                    boxShadow: [
                                      BoxShadow(
                                        color:
                                            Colors.blue.withValues(alpha: 0.3),
                                        blurRadius: 8,
                                        spreadRadius: 2,
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            // Paradas
                            ...ctrl.rutaDia.map((p) {
                              if (p.clienteLat == null ||
                                  p.clienteLon == null) {
                                return Marker(
                                  point: center,
                                  child: const SizedBox.shrink(),
                                );
                              }
                              return Marker(
                                point: LatLng(p.clienteLat!, p.clienteLon!),
                                width: 36,
                                height: 36,
                                child: GestureDetector(
                                  onTap: () {
                                    final cliente =
                                        ctrl.getCliente(p.clienteId);
                                    if (cliente != null) {
                                      _mostrarAcciones(context, ctrl, cliente);
                                    }
                                  },
                                  child: Icon(
                                    Icons.location_on,
                                    color: p.visitado
                                        ? Colors.green
                                        : Colors.red.shade700,
                                    size: 36,
                                  ),
                                ),
                              );
                            }),
                          ],
                        ),
                      ],
                    ),
                    // FAB buscar
                    Positioned(
                      right: 12,
                      bottom: 12,
                      child: FloatingActionButton.small(
                        heroTag: 'search_fab',
                        onPressed: () => _mostrarBusqueda(context, ctrl),
                        backgroundColor: Colors.white,
                        child: const Icon(Icons.add, color: Colors.black87),
                      ),
                    ),
                  ],
                ),
              ),
              // KPIs bar
              _buildKpisBar(ctrl),
              // Siguiente parada
              Expanded(
                flex: 4,
                child: _buildProgreso(context, ctrl),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildHeader(CampoController ctrl) {
    return Container(
      padding: EdgeInsets.only(
        top: MediaQuery.of(NavigatorState().context).padding.top > 0 ? 48 : 36,
        left: 16,
        right: 16,
        bottom: 12,
      ),
      decoration: BoxDecoration(
        color: Colors.green.shade700,
      ),
      child: SafeArea(
        bottom: false,
        child: Row(
          children: [
            const Icon(Icons.radio_button_checked,
                color: Colors.white, size: 20),
            const SizedBox(width: 8),
            const Text(
              'EN RECORRIDO',
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 16,
              ),
            ),
            const Spacer(),
            Text(
              ctrl.recorrido.kmFormateado,
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 16,
              ),
            ),
            const Text(' km  ',
                style: TextStyle(color: Colors.white70, fontSize: 13)),
            Text(
              ctrl.recorrido.duracionFormateada,
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 16,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildVisitaBanner(BuildContext context, CampoController ctrl) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      color: Colors.orange.shade700,
      child: Row(
        children: [
          const Icon(Icons.store, color: Colors.white, size: 20),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              'EN VISITA: ${ctrl.visitaActiva?.clienteNombre ?? ""}',
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w600,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
          TextButton(
            onPressed: () => _mostrarCheckout(context, ctrl),
            style: TextButton.styleFrom(
              backgroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8)),
            ),
            child: const Text(
              '✅ TERMINAR',
              style: TextStyle(
                color: Colors.orange,
                fontWeight: FontWeight.bold,
                fontSize: 13,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildKpisBar(CampoController ctrl) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
      color: Colors.grey.shade100,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          Text(
            '📍 ${ctrl.visitasCompletadas}/${ctrl.totalParadas} visitas',
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
          ),
          Text(
            '🛣️ ${ctrl.recorrido.kmFormateado} km',
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
          ),
          Text(
            '⏱️ ${ctrl.recorrido.duracionFormateada}',
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
          ),
        ],
      ),
    );
  }

  Widget _buildProgreso(BuildContext context, CampoController ctrl) {
    return ListView(
      padding: const EdgeInsets.all(12),
      children: [
        // Siguiente parada destacada
        if (ctrl.siguienteParada != null && !ctrl.enVisita) ...[
          _buildSiguienteParada(context, ctrl),
          const SizedBox(height: 12),
        ],
        // Lista de progreso
        ...ctrl.rutaDia.map((p) => _buildProgresoItem(context, ctrl, p)),
        const SizedBox(height: 12),
        // Botón detener
        SizedBox(
          width: double.infinity,
          height: 48,
          child: ElevatedButton.icon(
            onPressed: () => _confirmarDetener(context, ctrl),
            icon: const Icon(Icons.stop, color: Colors.white),
            label: const Text(
              'DETENER RECORRIDO',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.grey.shade700,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildSiguienteParada(BuildContext context, CampoController ctrl) {
    final sig = ctrl.siguienteParada!;
    final cliente = ctrl.getCliente(sig.clienteId);
    final dist = cliente != null ? ctrl.distanciaACliente(cliente) : null;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.red.shade50,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.red.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.navigation, color: Colors.red.shade700, size: 18),
              const SizedBox(width: 6),
              const Text(
                'SIGUIENTE PARADA',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: Colors.grey,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            sig.clienteNombre ?? 'Cliente',
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
          ),
          if (dist != null)
            Text(
              '📍 ${(dist / 1000).toStringAsFixed(1)} km de distancia',
              style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
            ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () {
                    if (sig.clienteLat != null && sig.clienteLon != null) {
                      _abrirNavegacion(sig.clienteLat!, sig.clienteLon!);
                    }
                  },
                  icon: const Icon(Icons.navigation, size: 18),
                  label: const Text('Navegar'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () {
                    if (cliente != null) ctrl.checkin(cliente);
                  },
                  icon: const Icon(Icons.location_on,
                      color: Colors.white, size: 18),
                  label: const Text('Llegué',
                      style: TextStyle(color: Colors.white)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.red.shade700,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildProgresoItem(
      BuildContext context, CampoController ctrl, dynamic parada) {
    final p = parada as dynamic;
    IconData icon;
    Color color;

    if (p.visitado) {
      icon = Icons.check_circle;
      color = Colors.green;
    } else if (ctrl.siguienteParada?.clienteId == p.clienteId) {
      icon = Icons.radio_button_checked;
      color = Colors.orange;
    } else {
      icon = Icons.radio_button_unchecked;
      color = Colors.grey;
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              p.clienteNombre ?? 'Cliente',
              style: TextStyle(
                color: p.visitado ? Colors.grey : Colors.black87,
                decoration: p.visitado ? TextDecoration.lineThrough : null,
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _mostrarAcciones(
      BuildContext context, CampoController ctrl, ClienteModel cliente) {
    final dentro = ctrl.dentroGeocerca(cliente);

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(cliente.nombre,
                style:
                    const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            if (dentro != null)
              Chip(
                avatar: Icon(
                  dentro ? Icons.check_circle : Icons.warning,
                  size: 16,
                  color: dentro ? Colors.green : Colors.orange,
                ),
                label: Text(dentro ? 'Dentro del área' : 'Fuera del área'),
              ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () {
                  ctrl.checkin(cliente);
                  Navigator.pop(ctx);
                },
                icon: const Icon(Icons.location_on, color: Colors.white),
                label: const Text('REGISTRAR VISITA',
                    style: TextStyle(
                        color: Colors.white, fontWeight: FontWeight.bold)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.red.shade700,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _mostrarCheckout(BuildContext context, CampoController ctrl) {
    final obsCtrl = TextEditingController();
    String? localFotoPath;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) {
          return Padding(
            padding: EdgeInsets.only(
              left: 20,
              right: 20,
              top: 20,
              bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text('Terminar Visita',
                    style:
                        TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                TextField(
                  controller: obsCtrl,
                  maxLines: 3,
                  decoration: InputDecoration(
                    hintText: 'Observación (opcional)',
                    border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                ),
                const SizedBox(height: 16),

                // Botón para tomar foto
                if (localFotoPath == null)
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: () async {
                        final picker = ImagePicker();
                        final picked = await picker.pickImage(
                          source: ImageSource.camera,
                          maxWidth: 800,
                          imageQuality: 70,
                        );
                        if (picked != null) {
                          setModalState(() {
                            localFotoPath = picked.path;
                          });
                        }
                      },
                      icon: const Icon(Icons.camera_alt),
                      label: const Text('TOMAR FOTO (Opcional)'),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  )
                else
                  Stack(
                    alignment: Alignment.topRight,
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: Image.file(
                          File(localFotoPath!),
                          height: 120,
                          width: double.infinity,
                          fit: BoxFit.cover,
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.cancel, color: Colors.white),
                        onPressed: () {
                          setModalState(() {
                            localFotoPath = null;
                          });
                        },
                      ),
                    ],
                  ),

                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () {
                      ctrl.checkout(
                        observacion: obsCtrl.text.isEmpty ? null : obsCtrl.text,
                        fotoPath: localFotoPath,
                      );
                      Navigator.pop(ctx);
                    },
                    icon: const Icon(Icons.check, color: Colors.white),
                    label: const Text('TERMINAR VISITA',
                        style: TextStyle(
                            color: Colors.white, fontWeight: FontWeight.bold)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green.shade700,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  void _confirmarDetener(BuildContext context, CampoController ctrl) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('¿Detener recorrido?'),
        content: Text(
            'Has recorrido ${ctrl.recorrido.kmFormateado} km y completado ${ctrl.visitasCompletadas}/${ctrl.totalParadas} visitas.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () {
              ctrl.detenerRecorrido();
              Navigator.pop(ctx);
            },
            style:
                ElevatedButton.styleFrom(backgroundColor: Colors.red.shade700),
            child: const Text('Detener', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _mostrarBusqueda(BuildContext context, CampoController ctrl) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => _BusquedaEnRecorrido(ctrl: ctrl),
    );
  }

  Future<void> _abrirNavegacion(double lat, double lon) async {
    final waze =
        Uri.parse('https://waze.com/ul?ll=$lat,$lon&navigate=yes&zoom=17');
    final google = Uri.parse(
        'https://www.google.com/maps/dir/?api=1&destination=$lat,$lon');

    if (await canLaunchUrl(waze)) {
      await launchUrl(waze, mode: LaunchMode.externalApplication);
    } else {
      await launchUrl(google, mode: LaunchMode.externalApplication);
    }
  }
}

/// Widget para buscar y agregar paradas durante el recorrido.
class _BusquedaEnRecorrido extends StatefulWidget {
  final CampoController ctrl;
  const _BusquedaEnRecorrido({required this.ctrl});

  @override
  State<_BusquedaEnRecorrido> createState() => _BusquedaEnRecorridoState();
}

class _BusquedaEnRecorridoState extends State<_BusquedaEnRecorrido> {
  final _search = TextEditingController();

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.6,
      minChildSize: 0.3,
      maxChildSize: 0.9,
      expand: false,
      builder: (ctx, scrollCtrl) => Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              controller: _search,
              autofocus: true,
              decoration: InputDecoration(
                hintText: 'Buscar cliente para agregar...',
                prefixIcon: const Icon(Icons.search),
                border:
                    OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
              onChanged: (q) {
                widget.ctrl.buscarClientes(q);
                setState(() {});
              },
            ),
          ),
          Expanded(
            child: Consumer<CampoController>(
              builder: (context, ctrl, _) {
                if (ctrl.resultadosBusqueda.isEmpty) {
                  return const Center(
                      child: Text('Escribe para buscar clientes'));
                }
                return ListView.builder(
                  controller: scrollCtrl,
                  itemCount: ctrl.resultadosBusqueda.length,
                  itemBuilder: (context, i) {
                    final c = ctrl.resultadosBusqueda[i];
                    return ListTile(
                      leading: const Icon(Icons.store),
                      title: Text(c.nombre),
                      subtitle: Text(c.direccion ?? ''),
                      trailing: IconButton(
                        icon: const Icon(Icons.add_circle, color: Colors.red),
                        onPressed: () {
                          ctrl.agregarParada(c);
                          Navigator.pop(context);
                        },
                      ),
                    );
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
