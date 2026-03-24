import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../domain/cliente_model.dart';
import 'campo_controller.dart';

/// Pantalla para registrar un nuevo cliente desde el campo.
class RegistrarClienteScreen extends StatefulWidget {
  const RegistrarClienteScreen({super.key});

  @override
  State<RegistrarClienteScreen> createState() => _RegistrarClienteScreenState();
}

class _RegistrarClienteScreenState extends State<RegistrarClienteScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nombreCtrl = TextEditingController();
  final _codigoCtrl = TextEditingController();
  final _direccionCtrl = TextEditingController();
  final _telefonoCtrl = TextEditingController();
  final _contactoCtrl = TextEditingController();
  int _radioGeocerca = 100;
  bool _agregarARuta = true;
  bool _guardando = false;

  @override
  void dispose() {
    _nombreCtrl.dispose();
    _codigoCtrl.dispose();
    _direccionCtrl.dispose();
    _telefonoCtrl.dispose();
    _contactoCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final ctrl = context.read<CampoController>();

    return Scaffold(
      appBar: AppBar(title: const Text('Nuevo Cliente')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextFormField(
              controller: _nombreCtrl,
              decoration: const InputDecoration(
                labelText: 'Nombre del negocio *',
                prefixIcon: Icon(Icons.store),
                border: OutlineInputBorder(),
              ),
              validator: (v) => v == null || v.isEmpty ? 'Requerido' : null,
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _codigoCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Código (opcional)',
                      border: OutlineInputBorder(),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: DropdownButtonFormField<int>(
                    initialValue: _radioGeocerca,
                    decoration: const InputDecoration(
                      labelText: 'Radio geocerca',
                      border: OutlineInputBorder(),
                    ),
                    items: const [
                      DropdownMenuItem(value: 50, child: Text('50m')),
                      DropdownMenuItem(value: 100, child: Text('100m')),
                      DropdownMenuItem(value: 200, child: Text('200m')),
                      DropdownMenuItem(value: 500, child: Text('500m')),
                    ],
                    onChanged: (v) => setState(() => _radioGeocerca = v ?? 100),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _direccionCtrl,
              decoration: const InputDecoration(
                labelText: 'Dirección',
                prefixIcon: Icon(Icons.location_on),
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _telefonoCtrl,
                    keyboardType: TextInputType.phone,
                    decoration: const InputDecoration(
                      labelText: 'Teléfono',
                      prefixIcon: Icon(Icons.phone),
                      border: OutlineInputBorder(),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextFormField(
                    controller: _contactoCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Contacto',
                      prefixIcon: Icon(Icons.person),
                      border: OutlineInputBorder(),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            // Ubicación GPS
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.blue.shade200),
              ),
              child: Row(
                children: [
                  const Icon(Icons.gps_fixed, color: Colors.blue),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          '📍 Ubicación: GPS actual',
                          style: TextStyle(fontWeight: FontWeight.w600),
                        ),
                        if (ctrl.miPosicion != null)
                          Text(
                            'Lat: ${ctrl.miPosicion!.latitude.toStringAsFixed(4)}  '
                            'Lon: ${ctrl.miPosicion!.longitude.toStringAsFixed(4)}',
                            style: TextStyle(
                                color: Colors.grey.shade600, fontSize: 13),
                          )
                        else
                          const Text('Obteniendo ubicación...',
                              style: TextStyle(color: Colors.orange)),
                      ],
                    ),
                  ),
                  const Icon(Icons.check_circle, color: Colors.green),
                ],
              ),
            ),
            const SizedBox(height: 16),
            // Checkbox agregar a ruta
            CheckboxListTile(
              value: _agregarARuta,
              onChanged: (v) => setState(() => _agregarARuta = v ?? true),
              title: const Text('Agregar a mi ruta de hoy'),
              controlAffinity: ListTileControlAffinity.leading,
              contentPadding: EdgeInsets.zero,
            ),
            const SizedBox(height: 16),
            // Botón guardar
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton.icon(
                onPressed: _guardando ? null : () => _guardar(ctrl),
                icon: _guardando
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.save, color: Colors.white),
                label: Text(
                  _agregarARuta
                      ? 'GUARDAR Y AGREGAR A MI RUTA'
                      : 'GUARDAR CLIENTE',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.red.shade700,
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

  Future<void> _guardar(CampoController ctrl) async {
    if (!_formKey.currentState!.validate()) return;
    if (ctrl.miPosicion == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Sin ubicación GPS')),
      );
      return;
    }

    setState(() => _guardando = true);

    final cliente = ClienteModel(
      id: DateTime.now().millisecondsSinceEpoch, // ID temporal
      codigo: _codigoCtrl.text.isEmpty ? null : _codigoCtrl.text,
      nombre: _nombreCtrl.text,
      direccion: _direccionCtrl.text.isEmpty ? null : _direccionCtrl.text,
      telefono: _telefonoCtrl.text.isEmpty ? null : _telefonoCtrl.text,
      contacto: _contactoCtrl.text.isEmpty ? null : _contactoCtrl.text,
      lat: ctrl.miPosicion!.latitude,
      lon: ctrl.miPosicion!.longitude,
      radioMetros: _radioGeocerca,
      sincronizado: false,
    );

    await ctrl.agregarParada(cliente);

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('${cliente.nombre} guardado'),
          backgroundColor: Colors.green,
        ),
      );
      Navigator.pop(context);
    }
  }
}
