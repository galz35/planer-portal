import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../domain/cliente_model.dart';
import '../domain/parada_ruta_model.dart';
import '../data/campo_local_db.dart';
import '../data/campo_api.dart';
import 'campo_controller.dart';
import 'recorrido_screen.dart';
import 'registrar_cliente_screen.dart';

/// Pantalla principal: "Mi Ruta de Hoy"
/// Tabs: Lista (planificar) / Mapa (visualizar).
class CampoScreen extends StatefulWidget {
  const CampoScreen({super.key});

  @override
  State<CampoScreen> createState() => _CampoScreenState();
}

class _CampoScreenState extends State<CampoScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<CampoController>().init();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<CampoController>(
      builder: (context, ctrl, _) {
        // Si el recorrido está activo, ir directo a RecorridoScreen
        if (ctrl.enRecorrido) {
          return const RecorridoScreen();
        }

        return Scaffold(
          appBar: AppBar(
            title: const Text('Mi Ruta de Hoy'),
            elevation: 0,
            bottom: TabBar(
              controller: _tabController,
              tabs: const [
                Tab(icon: Icon(Icons.list_alt), text: 'Lista'),
                Tab(icon: Icon(Icons.map), text: 'Mapa'),
              ],
            ),
          ),
          floatingActionButton: FloatingActionButton(
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const RegistrarClienteScreen()),
            ),
            backgroundColor: Theme.of(context).colorScheme.primary,
            child: const Icon(Icons.add, color: Colors.white),
          ),
          body: ctrl.cargando
              ? const Center(child: CircularProgressIndicator())
              : Column(
                  children: [
                    // Buscador
                    _buildBuscador(ctrl),
                    // Tabs
                    Expanded(
                      child: TabBarView(
                        controller: _tabController,
                        children: [
                          _buildListaTab(ctrl),
                          _buildMapaTab(ctrl),
                        ],
                      ),
                    ),
                    // Footer con estimaciones y botón iniciar
                    _buildFooter(ctrl),
                  ],
                ),
        );
      },
    );
  }

  Widget _buildBuscador(CampoController ctrl) {
    return Padding(
      padding: const EdgeInsets.all(12),
      child: TextField(
        controller: _searchController,
        decoration: InputDecoration(
          hintText: 'Buscar cliente...',
          prefixIcon: const Icon(Icons.search),
          suffixIcon: _searchController.text.isNotEmpty
              ? IconButton(
                  icon: const Icon(Icons.clear),
                  onPressed: () {
                    _searchController.clear();
                    ctrl.buscarClientes('');
                  },
                )
              : null,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          filled: true,
          fillColor: Colors.grey.shade100,
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        ),
        onChanged: (q) => ctrl.buscarClientes(q),
      ),
    );
  }

  Widget _buildListaTab(CampoController ctrl) {
    // Si hay resultados de búsqueda, mostrar esos
    if (ctrl.resultadosBusqueda.isNotEmpty) {
      return _buildResultadosBusqueda(ctrl);
    }

    // Si la ruta está vacía
    if (ctrl.rutaDia.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.route, size: 64, color: Colors.grey.shade400),
            const SizedBox(height: 16),
            Text(
              'Tu ruta está vacía',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: Colors.grey.shade600,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Busca clientes o toca pins en el mapa\npara agregar paradas',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey.shade500),
            ),
          ],
        ),
      );
    }

    // Mostrar la ruta planificada
    return ReorderableListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      itemCount: ctrl.rutaDia.length,
      onReorder: (oldIndex, newIndex) {
        ctrl.reordenarRuta(oldIndex, newIndex);
      },
      itemBuilder: (context, index) {
        final parada = ctrl.rutaDia[index];
        return _buildParadaCard(ctrl, parada, index);
      },
    );
  }

  Widget _buildResultadosBusqueda(CampoController ctrl) {
    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      itemCount: ctrl.resultadosBusqueda.length,
      itemBuilder: (context, index) {
        final cliente = ctrl.resultadosBusqueda[index];
        final dist = ctrl.distanciaACliente(cliente);
        final yaEnRuta = ctrl.rutaDia.any((p) => p.clienteId == cliente.id);

        return Card(
          margin: const EdgeInsets.only(bottom: 8),
          child: ListTile(
            leading: CircleAvatar(
              backgroundColor:
                  yaEnRuta ? Colors.green.shade100 : Colors.red.shade100,
              child: Icon(
                yaEnRuta ? Icons.check : Icons.store,
                color: yaEnRuta ? Colors.green : Colors.red.shade700,
              ),
            ),
            title: Text(
              cliente.nombre,
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
            subtitle: Text(
              dist != null
                  ? '📍 ${(dist / 1000).toStringAsFixed(1)} km${cliente.direccion != null ? ' │ ${cliente.direccion}' : ''}'
                  : cliente.direccion ?? '',
            ),
            trailing: yaEnRuta
                ? const Icon(Icons.check_circle, color: Colors.green)
                : IconButton(
                    icon: const Icon(Icons.add_circle, color: Colors.red),
                    onPressed: () => ctrl.agregarParada(cliente),
                  ),
          ),
        );
      },
    );
  }

  Widget _buildParadaCard(
      CampoController ctrl, ParadaRutaModel parada, int index) {
    final dist = parada.clienteLat != null && ctrl.miPosicion != null
        ? ctrl.distanciaACliente(ClienteModel(
            id: parada.clienteId,
            nombre: parada.clienteNombre ?? '',
            lat: parada.clienteLat!,
            lon: parada.clienteLon!,
          ))
        : null;

    return Card(
      key: ValueKey(parada.clienteId),
      margin: const EdgeInsets.only(bottom: 8),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            // Número de orden
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: parada.visitado ? Colors.green : Colors.red.shade700,
                shape: BoxShape.circle,
              ),
              child: Center(
                child: parada.visitado
                    ? const Icon(Icons.check, color: Colors.white, size: 18)
                    : Text(
                        '${index + 1}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
              ),
            ),
            const SizedBox(width: 12),
            // Info del cliente
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    parada.clienteNombre ?? 'Cliente ${parada.clienteId}',
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 15,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      if (dist != null) ...[
                        Icon(Icons.location_on,
                            size: 14, color: Colors.grey.shade600),
                        Text(
                          ' ${(dist / 1000).toStringAsFixed(1)} km',
                          style: TextStyle(
                            color: Colors.grey.shade600,
                            fontSize: 13,
                          ),
                        ),
                      ],
                      if (parada.clienteDireccion != null) ...[
                        if (dist != null)
                          Text(' │ ',
                              style: TextStyle(color: Colors.grey.shade400)),
                        Flexible(
                          child: Text(
                            parada.clienteDireccion!,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              color: Colors.grey.shade600,
                              fontSize: 13,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
            // Quitar
            if (!parada.visitado)
              IconButton(
                icon: const Icon(Icons.close, size: 20),
                color: Colors.grey,
                onPressed: () => ctrl.quitarParada(parada.clienteId),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildMapaTab(CampoController ctrl) {
    final center = ctrl.miPosicion != null
        ? LatLng(ctrl.miPosicion!.latitude, ctrl.miPosicion!.longitude)
        : const LatLng(12.1364, -86.2514); // Managua default

    return FlutterMap(
      options: MapOptions(
        initialCenter: center,
        initialZoom: 13,
        onTap: (_, __) {},
      ),
      children: [
        TileLayer(
          urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          userAgentPackageName: 'com.planneref.app',
        ),
        // Pins de todos los clientes
        MarkerLayer(
          markers: [
            // Mi ubicación
            if (ctrl.miPosicion != null)
              Marker(
                point: LatLng(
                    ctrl.miPosicion!.latitude, ctrl.miPosicion!.longitude),
                width: 24,
                height: 24,
                child: Container(
                  decoration: BoxDecoration(
                    color: Colors.blue,
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 3),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.blue.withValues(alpha: 0.3),
                        blurRadius: 8,
                        spreadRadius: 2,
                      ),
                    ],
                  ),
                ),
              ),
            // Clientes
            ...ctrl.clientes.map((c) {
              final yaEnRuta = ctrl.rutaDia.any((p) => p.clienteId == c.id);
              return Marker(
                point: LatLng(c.lat, c.lon),
                width: 36,
                height: 36,
                child: GestureDetector(
                  onTap: () => _mostrarClienteSheet(c, ctrl),
                  child: Icon(
                    Icons.location_on,
                    color:
                        yaEnRuta ? Colors.amber.shade700 : Colors.red.shade700,
                    size: 36,
                  ),
                ),
              );
            }),
          ],
        ),
      ],
    );
  }

  Widget _buildFooter(CampoController ctrl) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 8,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Botones optimizar + agregar
          if (ctrl.rutaDia.isNotEmpty) ...[
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: ctrl.rutaDia.length > 1
                        ? () => ctrl.optimizarRuta()
                        : null,
                    icon: const Icon(Icons.route, size: 18),
                    label: const Text('Optimizar'),
                    style: OutlinedButton.styleFrom(
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () {
                      _searchController.clear();
                      _tabController.animateTo(0);
                      FocusScope.of(context).requestFocus(FocusNode());
                    },
                    icon: const Icon(Icons.add, size: 18),
                    label: const Text('Agregar'),
                    style: OutlinedButton.styleFrom(
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            // Estimaciones
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  '📍 ${ctrl.rutaDia.length} paradas',
                  style: TextStyle(color: Colors.grey.shade700, fontSize: 13),
                ),
                Text('  │  ', style: TextStyle(color: Colors.grey.shade400)),
                Text(
                  '🛣️ ${ctrl.distanciaTotal.toStringAsFixed(1)} km',
                  style: TextStyle(color: Colors.grey.shade700, fontSize: 13),
                ),
                Text('  │  ', style: TextStyle(color: Colors.grey.shade400)),
                Text(
                  '⏱️ ~${ctrl.tiempoEstimado.inMinutes} min',
                  style: TextStyle(color: Colors.grey.shade700, fontSize: 13),
                ),
              ],
            ),
            const SizedBox(height: 12),
          ],
          // Botón iniciar
          SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton.icon(
              onPressed: ctrl.rutaDia.isNotEmpty
                  ? () async {
                      final ok = await ctrl.iniciarRecorrido();
                      if (!ok && ctrl.error != null && mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text(ctrl.error!)),
                        );
                      }
                    }
                  : null,
              icon: const Icon(Icons.play_arrow, color: Colors.white),
              label: Text(
                ctrl.rutaDia.isEmpty
                    ? 'Agrega paradas para iniciar'
                    : 'INICIAR RECORRIDO',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red.shade700,
                disabledBackgroundColor: Colors.grey.shade300,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
                elevation: 2,
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _mostrarClienteSheet(ClienteModel cliente, CampoController ctrl) {
    final dist = ctrl.distanciaACliente(cliente);
    final dentro = ctrl.dentroGeocerca(cliente);
    final yaEnRuta = ctrl.rutaDia.any((p) => p.clienteId == cliente.id);

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              cliente.nombre,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            if (cliente.direccion != null) ...[
              const SizedBox(height: 4),
              Text(
                '📍 ${cliente.direccion}',
                style: TextStyle(color: Colors.grey.shade600),
              ),
            ],
            if (cliente.telefono != null || cliente.contacto != null) ...[
              const SizedBox(height: 4),
              Text(
                '${cliente.telefono != null ? '📞 ${cliente.telefono}' : ''}'
                '${cliente.contacto != null ? '  │  👤 ${cliente.contacto}' : ''}',
                style: TextStyle(color: Colors.grey.shade600),
              ),
            ],
            const SizedBox(height: 12),
            // Distancia y geocerca
            Row(
              children: [
                if (dist != null)
                  Chip(
                    avatar: const Icon(Icons.location_on, size: 16),
                    label: Text('${(dist / 1000).toStringAsFixed(1)} km'),
                    materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                const SizedBox(width: 8),
                if (dentro != null)
                  Chip(
                    avatar: Icon(
                      dentro ? Icons.check_circle : Icons.warning,
                      size: 16,
                      color: dentro ? Colors.green : Colors.orange,
                    ),
                    label: Text(dentro ? 'Dentro del área' : 'Fuera del área'),
                    materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
              ],
            ),
            if (cliente.ultimaVisita != null) ...[
              const SizedBox(height: 8),
              Text(
                'Última visita: ${cliente.ultimaVisita}',
                style: TextStyle(color: Colors.grey.shade500, fontSize: 13),
              ),
            ],

            _HistorialVisitasWidget(clienteId: cliente.id),

            const SizedBox(height: 16),
            // Botones
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: yaEnRuta
                    ? null
                    : () {
                        ctrl.agregarParada(cliente);
                        Navigator.pop(ctx);
                      },
                icon: Icon(
                  yaEnRuta ? Icons.check : Icons.add_circle,
                  color: Colors.white,
                ),
                label: Text(
                  yaEnRuta ? 'Ya en tu ruta' : 'AGREGAR A MI RUTA',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: yaEnRuta ? Colors.grey : Colors.red.shade700,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                if (cliente.lat != 0 && cliente.lon != 0)
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => _abrirNavegacion(
                          cliente.lat, cliente.lon, cliente.nombre),
                      icon: const Icon(Icons.navigation, size: 18),
                      label: const Text('Navegar'),
                    ),
                  ),
                if (cliente.telefono != null) ...[
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () =>
                          launchUrl(Uri.parse('tel:${cliente.telefono}')),
                      icon: const Icon(Icons.phone, size: 18),
                      label: const Text('Llamar'),
                    ),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _abrirNavegacion(double lat, double lon, String nombre) async {
    // Intentar Waze primero, luego Google Maps
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

class _HistorialVisitasWidget extends StatefulWidget {
  final int clienteId;
  const _HistorialVisitasWidget({required this.clienteId});

  @override
  State<_HistorialVisitasWidget> createState() =>
      _HistorialVisitasWidgetState();
}

class _HistorialVisitasWidgetState extends State<_HistorialVisitasWidget> {
  bool _loading = true;
  List<Map<String, dynamic>> _visitas = [];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      // 1. Intentar DB local
      final local = await CampoLocalDb.obtenerVisitasCliente(widget.clienteId);
      if (mounted) {
        setState(() {
          _visitas = local.cast<Map<String, dynamic>>();
          _loading = local.isEmpty;
        });
      }

      // 2. Intentar API
      try {
        final remoto = await CampoApi.obtenerVisitasCliente(widget.clienteId);
        if (mounted && remoto.isNotEmpty) {
          setState(() {
            _visitas = remoto.cast<Map<String, dynamic>>();
            _loading = false;
          });
        }
      } catch (_) {
        // Fallback a local si hay error de red
        if (mounted) setState(() => _loading = false);
      }
    } catch (e) {
      if (mounted) setState(() => _loading = false);
    }
  }

  String _formatFecha(String? fechaObj) {
    if (fechaObj == null) return '';
    try {
      final date = DateTime.parse(fechaObj);
      return '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year} ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return '';
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 8),
        child: SizedBox(
            height: 20,
            width: 20,
            child: CircularProgressIndicator(strokeWidth: 2)),
      );
    }

    if (_visitas.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 12),
        const Text(
          'Últimas visitas',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
        ),
        const SizedBox(height: 8),
        ..._visitas.take(5).map((v) {
          final inicioStr =
              v['checkin_time']?.toString() ?? v['fecha_inicio']?.toString();
          final finStr =
              v['checkout_time']?.toString() ?? v['fecha_fin']?.toString();
          final obs = v['observacion']?.toString() ??
              v['razon']?.toString() ??
              'Sin observación';

          String duracionTxt = '';
          if (inicioStr != null && finStr != null) {
            final i = DateTime.tryParse(inicioStr);
            final f = DateTime.tryParse(finStr);
            if (i != null && f != null) {
              final diff = f.difference(i).inMinutes;
              duracionTxt = ' • $diff min';
            }
          }

          return Padding(
            padding: const EdgeInsets.only(bottom: 6.0),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.history, size: 16, color: Colors.grey.shade400),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${_formatFecha(inicioStr)}$duracionTxt',
                        style: const TextStyle(
                            fontSize: 12, fontWeight: FontWeight.w600),
                      ),
                      Text(
                        obs,
                        style: TextStyle(
                            fontSize: 11, color: Colors.grey.shade600),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          );
        }),
      ],
    );
  }
}
