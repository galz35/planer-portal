-- ============================================================
-- SEED DE DATOS: MÓDULO MARCAJE WEB
-- ============================================================

-- Configuración inicial para el carnet 500708 (Testing)
IF NOT EXISTS (SELECT 1 FROM marcaje_config_usuario WHERE carnet = '500708')
BEGIN
    INSERT INTO marcaje_config_usuario (carnet, permitir_movil, permitir_escritorio, gps_background, activo)
    VALUES ('500708', 1, 1, 1, 1);
END

-- Zonas de Marcaje de Prueba (Geocercas base Managua)
IF NOT EXISTS (SELECT 1 FROM marcaje_sites WHERE nombre = 'Oficina Central Claro (Managua)')
BEGIN
    INSERT INTO marcaje_sites (nombre, lat, long, radio_metros, accuracy_max)
    VALUES ('Oficina Central Claro (Managua)', 12.1328, -86.2504, 300, 150);
END

-- Ejemplos de IPs Permitidas (VPNs de Claro o rangos internos)
IF NOT EXISTS (SELECT 1 FROM marcaje_ip_whitelist WHERE nombre = 'Rango LocalHost')
BEGIN
    INSERT INTO marcaje_ip_whitelist (nombre, cidr) VALUES ('Rango LocalHost', '127.0.0.1/32');
    INSERT INTO marcaje_ip_whitelist (nombre, cidr) VALUES ('Red Interna VPN', '10.0.0.0/8');
END

PRINT '✅ Seeds Marcaje Web creados.';
