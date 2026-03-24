-- ============================================================
-- SEED DE DATOS: MÓDULO VISITA A CLIENTE
-- ============================================================

-- Clientes de prueba reales (Managua)
IF NOT EXISTS (SELECT 1 FROM vc_clientes WHERE codigo = 'CLI-001')
BEGIN
    INSERT INTO vc_clientes (codigo, nombre, direccion, telefono, contacto, lat, long, radio_metros, zona)
    VALUES 
    ('CLI-001', 'Supermercado La Colonia (Galerías)', 'Galerías Santo Domingo', '2222-1111', 'Gerente', 12.1065, -86.2510, 150, 'Managua Sur'),
    ('CLI-002', 'Plaza Inter', 'Plaza Inter Managua', '2222-2222', 'Administración', 12.1455, -86.2750, 200, 'Managua Centro'),
    ('CLI-003', 'Metrocentro', 'Costado sur Metrocentro', '2222-3333', 'Operaciones', 12.1278, -86.2576, 200, 'Managua Centro'),
    ('CLI-004', 'Multicentro Las Américas', 'Villa San Jacinto', '2222-4444', 'Ventas', 12.1460, -86.2230, 200, 'Managua Este');
END

-- Config de Meta para carnet 500708
IF NOT EXISTS (SELECT 1 FROM vc_metas WHERE carnet = '500708')
BEGIN
    INSERT INTO vc_metas (carnet, periodo, meta_visitas, meta_km, costo_km, vigente_desde, activo)
    VALUES ('500708', 'DIARIO', 5, 20.00, 0.15, GETDATE(), 1);
END

PRINT '✅ Seeds Visita a Cliente creados.';
