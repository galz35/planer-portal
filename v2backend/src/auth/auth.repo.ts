/**
 * Auth Repository - Queries de autenticación usando MSSQL directo
 * Replica EXACTAMENTE la lógica de TypeORM del AuthService
 */
import { crearRequest, NVarChar, Int, Bit } from '../db/base.repo';
import { UsuarioDb, CredencialesDb, RolDb } from '../db/tipos';

/**
 * Obtiene un usuario por correo o carnet (activo)
 * Replica: this.userRepo.findOne({ where: [{ correo, activo: true }, { carnet, activo: true }], relations: ['rol'] })
 */
export async function obtenerUsuarioPorIdentificador(
  identificador: string,
): Promise<(UsuarioDb & { rol?: RolDb }) | null> {
  const request = await crearRequest();
  request.input('identificador', NVarChar, identificador);

  const result = await request.query<
    UsuarioDb & {
      rolNombre?: string;
      rolDescripcion?: string;
      esSistema?: boolean;
      reglas?: string;
      defaultMenu?: string;
    }
  >(`
        SELECT 
            u.*,
            r.nombre as rolNombre,
            r.descripcion as rolDescripcion,
            r.esSistema,
            r.reglas,
            r.defaultMenu
        FROM p_Usuarios u
        LEFT JOIN p_Roles r ON u.idRol = r.idRol
        WHERE (u.correo = @identificador OR u.carnet = @identificador)
          AND u.activo = 1
    `);

  if (result.recordset.length === 0) return null;

  const row = result.recordset[0];

  // Mapear rol si existe
  const usuario: UsuarioDb & { rol?: RolDb } = { ...row };
  if (row.idRol) {
    usuario.rol = {
      idRol: row.idRol,
      nombre: row.rolNombre || '',
      descripcion: row.rolDescripcion || null,
      esSistema: row.esSistema || false,
      reglas: row.reglas || '[]',
      defaultMenu: row.defaultMenu || null,
    };
  }

  return usuario;
}

/**
 * Obtiene credenciales por idUsuario
 * Replica: this.credsRepo.findOne({ where: { idUsuario } })
 */
export async function obtenerCredenciales(
  idUsuario: number,
): Promise<CredencialesDb | null> {
  const request = await crearRequest();
  request.input('idUsuario', Int, idUsuario);

  const result = await request.query<CredencialesDb>(`
        SELECT * FROM p_UsuariosCredenciales WHERE idUsuario = @idUsuario
    `);

  return result.recordset[0] || null;
}

/**
 * Actualiza el último login
 * Replica: this.credsRepo.save(creds) después de creds.ultimoLogin = new Date()
 */
export async function actualizarUltimoLogin(idUsuario: number): Promise<void> {
  const request = await crearRequest();
  request.input('idUsuario', Int, idUsuario);

  await request.query(`
        UPDATE p_UsuariosCredenciales 
        SET ultimoLogin = GETDATE() 
        WHERE idUsuario = @idUsuario
    `);
}

/**
 * Actualiza el refresh token hash
 * Replica: this.credsRepo.update({ idUsuario }, { refreshTokenHash: hashedRt })
 */
export async function actualizarRefreshToken(
  idUsuario: number,
  refreshTokenHash: string,
): Promise<void> {
  const request = await crearRequest();
  request.input('idUsuario', Int, idUsuario);
  request.input('refreshTokenHash', NVarChar, refreshTokenHash);

  await request.query(`
        UPDATE p_UsuariosCredenciales 
        SET refreshTokenHash = @refreshTokenHash 
        WHERE idUsuario = @idUsuario
    `);
}

/**
 * Cuenta subordinados de un jefe
 * Replica: this.userRepo.count({ where: { jefeCarnet: carnet, activo: true } })
 */
export async function contarSubordinados(carnetJefe: string): Promise<number> {
  const request = await crearRequest();
  request.input('carnetJefe', NVarChar, carnetJefe);

  const result = await request.query<{ cnt: number }>(`
        SELECT COUNT(*) as cnt FROM p_Usuarios 
        WHERE jefeCarnet = @carnetJefe AND activo = 1
    `);

  return result.recordset[0]?.cnt ?? 0;
}

/**
 * Obtiene usuario por ID con rol
 * Replica: this.userRepo.findOne({ where: { idUsuario }, relations: ['rol'] })
 */
export async function obtenerUsuarioPorId(
  idUsuario: number,
): Promise<(UsuarioDb & { rol?: RolDb }) | null> {
  const request = await crearRequest();
  request.input('idUsuario', Int, idUsuario);

  const result = await request.query<
    UsuarioDb & {
      rolNombre?: string;
      rolDescripcion?: string;
      esSistema?: boolean;
      reglas?: string;
      defaultMenu?: string;
    }
  >(`
        SELECT 
            u.*,
            r.nombre as rolNombre,
            r.descripcion as rolDescripcion,
            r.esSistema,
            r.reglas,
            r.defaultMenu
        FROM p_Usuarios u
        LEFT JOIN p_Roles r ON u.idRol = r.idRol
        WHERE u.idUsuario = @idUsuario
    `);

  if (result.recordset.length === 0) return null;

  const row = result.recordset[0];
  const usuario: UsuarioDb & { rol?: RolDb } = { ...row };

  if (row.idRol) {
    usuario.rol = {
      idRol: row.idRol,
      nombre: row.rolNombre || '',
      descripcion: row.rolDescripcion || null,
      esSistema: row.esSistema || false,
      reglas: row.reglas || '[]',
      defaultMenu: row.defaultMenu || null,
    };
  }

  return usuario;
}

/**
 * Obtiene config de usuario
 * Replica: this.configRepo.findOne({ where: { idUsuario } })
 */
export async function obtenerConfigUsuario(
  idUsuario: number,
): Promise<{ customMenu?: string } | null> {
  const request = await crearRequest();
  request.input('idUsuario', Int, idUsuario);

  const result = await request.query<{ customMenu: string | null }>(`
        SELECT menuPersonalizado as customMenu FROM p_UsuariosConfig WHERE idUsuario = @idUsuario
    `);

  return result.recordset[0] || null;
}

/**
 * Obtiene múltiples usuarios por IDs con sus roles
 */
export async function obtenerUsuariosPorIds(
  ids: number[],
): Promise<(UsuarioDb & { rol?: RolDb })[]> {
  if (ids.length === 0) return [];

  const request = await crearRequest();
  // Use IDs directly in query since they are numbers
  const idsStr = ids.map((id) => Math.floor(id)).join(',');

  const result = await request.query<
    UsuarioDb & {
      rolNombre?: string;
      rolDescripcion?: string;
      esSistema?: boolean;
      reglas?: string;
      defaultMenu?: string;
    }
  >(`
        SELECT 
            u.*,
            r.nombre as rolNombre,
            r.descripcion as rolDescripcion,
            r.esSistema,
            r.reglas,
            r.defaultMenu
        FROM p_Usuarios u
        LEFT JOIN p_Roles r ON u.idRol = r.idRol
        WHERE u.idUsuario IN (${idsStr})
    `);

  return result.recordset.map((row) => {
    const usuario: UsuarioDb & { rol?: RolDb } = { ...row };
    if (row.idRol) {
      usuario.rol = {
        idRol: row.idRol,
        nombre: row.rolNombre || '',
        descripcion: row.rolDescripcion || null,
        esSistema: row.esSistema || false,
        reglas: row.reglas || '[]',
        defaultMenu: row.defaultMenu || null,
      };
    }
    return usuario;
  });
}

/**
 * Actualiza el password hash de un usuario
 */
export async function actualizarPassword(
  idUsuario: number,
  passwordHash: string,
): Promise<void> {
  const request = await crearRequest();
  request.input('idUsuario', Int, idUsuario);
  request.input('passwordHash', NVarChar, passwordHash);

  await request.query(`
        UPDATE p_UsuariosCredenciales 
        SET passwordHash = @passwordHash,
            fechaActualizacion = GETDATE()
        WHERE idUsuario = @idUsuario
    `);
}

/**
 * Obtiene un usuario por correo exacto
 */
export async function obtenerUsuarioPorCorreo(
  correo: string,
): Promise<UsuarioDb | null> {
  const request = await crearRequest();
  request.input('correo', NVarChar, correo);

  const result = await request.query<UsuarioDb>(`
        SELECT * FROM p_Usuarios WHERE correo = @correo AND activo = 1
    `);

  return result.recordset[0] || null;
}

/**
 * Ensures the agendaConfig column exists in p_UsuariosConfig.
 * Auto-creates it if missing (self-healing migration).
 */
async function ensureAgendaConfigColumn(): Promise<void> {
  try {
    const req = await crearRequest();
    await req.query(`
            IF NOT EXISTS (
                SELECT 1 FROM sys.columns 
                WHERE object_id = OBJECT_ID('p_UsuariosConfig') 
                AND name = 'agendaConfig'
            )
            ALTER TABLE p_UsuariosConfig ADD agendaConfig NVARCHAR(MAX) NULL
        `);
  } catch (e) {
    console.error('[AuthRepo] Error ensuring agendaConfig column:', e);
  }
}

/**
 * Obtiene config completa de usuario
 * Usa la columna 'agendaConfig' (NVARCHAR/JSON) que contiene {"showGestion":true,"showRapida":false}
 */
export async function obtenerConfigUsuarioCompleta(idUsuario: number): Promise<{
  customMenu?: string;
  agendaShowGestion: boolean;
  agendaShowRapida: boolean;
} | null> {
  // Auto-create column if missing
  await ensureAgendaConfigColumn();

  const request = await crearRequest();
  request.input('idUsuario', Int, idUsuario);

  const result = await request.query<{
    menuPersonalizado: string | null;
    agendaConfig: string | null;
  }>(`
        SELECT menuPersonalizado, agendaConfig
        FROM p_UsuariosConfig WHERE idUsuario = @idUsuario
    `);

  if (result.recordset.length === 0) {
    console.log(
      `[AuthRepo] No config row for user=${idUsuario}, returning defaults`,
    );
    return { agendaShowGestion: true, agendaShowRapida: true };
  }

  const row = result.recordset[0];

  // Parse JSON from agendaConfig column
  let showGestion = true;
  let showRapida = true;
  if (row.agendaConfig) {
    try {
      const parsed = JSON.parse(row.agendaConfig);
      showGestion = parsed.showGestion ?? true;
      showRapida = parsed.showRapida ?? true;
    } catch (e) {
      console.error('[AuthRepo] Error parsing agendaConfig JSON:', e);
    }
  }

  console.log(
    `[AuthRepo] Config for user=${idUsuario}: gestion=${showGestion}, rapida=${showRapida}, raw=${row.agendaConfig}`,
  );

  return {
    customMenu: row.menuPersonalizado || undefined,
    agendaShowGestion: showGestion,
    agendaShowRapida: showRapida,
  };
}

/**
 * Guarda o actualiza config de usuario
 * Serializa a JSON en la columna 'agendaConfig'
 */
export async function guardarConfigUsuario(
  idUsuario: number,
  dto: any,
): Promise<void> {
  console.log(
    `[AuthRepo] guardarConfigUsuario user=${idUsuario} dto=`,
    JSON.stringify(dto),
  );

  // Auto-create column if missing
  await ensureAgendaConfigColumn();

  // Build the JSON config object
  const showGestion = !(
    dto.agendaShowGestion === false ||
    dto.agendaShowGestion === 0 ||
    dto.agendaShowGestion === 'false'
  );
  const showRapida = !(
    dto.agendaShowRapida === false ||
    dto.agendaShowRapida === 0 ||
    dto.agendaShowRapida === 'false'
  );
  const agendaConfigJson = JSON.stringify({ showGestion, showRapida });

  console.log(`[AuthRepo] Saving agendaConfig JSON: ${agendaConfigJson}`);

  const request = await crearRequest();
  request.input('idUsuario', Int, idUsuario);
  request.input('menuPersonalizado', NVarChar, dto.menuPersonalizado || null);
  request.input('agendaConfig', NVarChar, agendaConfigJson);

  // 1. Try UPDATE
  const updateResult = await request.query(`
        UPDATE p_UsuariosConfig 
        SET agendaConfig = @agendaConfig,
            menuPersonalizado = ISNULL(@menuPersonalizado, menuPersonalizado)
        WHERE idUsuario = @idUsuario
    `);

  // 2. If no rows affected, INSERT
  if (updateResult.rowsAffected[0] === 0) {
    console.log(`[AuthRepo] No config row for user=${idUsuario}, inserting...`);
    await request.query(`
            INSERT INTO p_UsuariosConfig (idUsuario, menuPersonalizado, agendaConfig)
            VALUES (@idUsuario, @menuPersonalizado, @agendaConfig)
        `);
  }

  // 3. Verify
  const verify = await request.query(
    `SELECT agendaConfig FROM p_UsuariosConfig WHERE idUsuario = @idUsuario`,
  );
  console.log(
    `[AuthRepo] POST-SAVE for user=${idUsuario}:`,
    verify.recordset[0],
  );
}

/**
 * Crea un nuevo usuario en la base de datos (JIT Provisioning)
 * Retorna el idUsuario generado.
 */
export async function crearUsuario(data: {
  nombre: string;
  correo: string;
  carnet: string;
  idRolGlobal?: number;
  pais?: string;
  activo?: boolean;
}): Promise<number> {
  const request = await crearRequest();
  request.input('nombre', NVarChar, data.nombre);
  request.input('correo', NVarChar, data.correo);
  request.input('carnet', NVarChar, data.carnet);
  request.input('idRolGlobal', Int, data.idRolGlobal || 3);
  request.input('pais', NVarChar, data.pais || 'NI');
  request.input('activo', Bit, data.activo !== false);

  const result = await request.query<{ id: number }>(`
        DECLARE @nuevo TABLE (idUsuario INT);
        INSERT INTO p_Usuarios (nombre, correo, carnet, idRol, activo, pais, fechaCreacion, eliminado)
        OUTPUT INSERTED.idUsuario INTO @nuevo(idUsuario)
        VALUES (@nombre, @correo, @carnet, @idRolGlobal, @activo, @pais, GETDATE(), 0);
        SELECT idUsuario as id FROM @nuevo;
    `);

  const idUsuario = result.recordset[0]?.id;

  if (idUsuario) {
    // Crear entrada básica en credenciales para permitir login normal si se activa
    const credRequest = await crearRequest();
    credRequest.input('idUsuario', Int, idUsuario);
    await credRequest.query(`
            IF NOT EXISTS (SELECT 1 FROM p_UsuariosCredenciales WHERE idUsuario = @idUsuario)
              INSERT INTO p_UsuariosCredenciales (idUsuario, passwordHash)
              VALUES (@idUsuario, '')
        `);
  }

  return idUsuario;
}

/**
 * Actualiza o inserta un usuario usando la data que viene del Portal Core (SSO / Sincronización)
 */
export async function upsertUsuarioLocal(data: {
  nombre: string;
  correo: string;
  carnet: string;
  activo: boolean;
  esInterno?: boolean;
  // Extras de Organización y Datos Personales
  cargo?: string;
  departamento?: string;
  gerencia?: string;
  subgerencia?: string;
  area?: string;
  jefeCarnet?: string;
  jefeNombre?: string;
  jefeCorreo?: string;
  telefono?: string;
  genero?: string;
  fechaIngreso?: Date;
  idOrg?: string;
  orgDepartamento?: string;
  orgGerencia?: string;
}): Promise<number> {
  const request = await crearRequest();
  request.input('nombre', NVarChar, data.nombre);
  request.input('correo', NVarChar, data.correo);
  request.input('carnet', NVarChar, data.carnet);
  request.input('activo', Bit, data.activo);
  request.input('pais', NVarChar, data.esInterno === false ? 'OT' : 'NI');
  
  // Opcionales
  request.input('cargo', NVarChar, data.cargo || null);
  request.input('departamento', NVarChar, data.departamento || null);
  request.input('gerencia', NVarChar, data.gerencia || null);
  request.input('subgerencia', NVarChar, data.subgerencia || null);
  request.input('area', NVarChar, data.area || null);
  request.input('jefeCarnet', NVarChar, data.jefeCarnet || null);
  request.input('jefeNombre', NVarChar, data.jefeNombre || null);
  request.input('jefeCorreo', NVarChar, data.jefeCorreo || null);
  request.input('telefono', NVarChar, data.telefono || null);
  request.input('genero', NVarChar, data.genero || null);
  request.input('idOrg', NVarChar, data.idOrg || null);
  request.input('orgDepartamento', NVarChar, data.orgDepartamento || null);
  request.input('orgGerencia', NVarChar, data.orgGerencia || null);

  // Parsear fecha solo si viene
  if (data.fechaIngreso) {
    request.input('fechaIngreso', require('mssql').DateTime, data.fechaIngreso);
  } else {
    request.input('fechaIngreso', require('mssql').DateTime, null);
  }

  // Si existe (por carnet), actualizamos. Si no existe, insertamos.
  const query = `
    DECLARE @idUsuario INT;
    
    SELECT @idUsuario = idUsuario FROM p_Usuarios WHERE carnet = @carnet;
    
    IF @idUsuario IS NOT NULL
    BEGIN
      UPDATE p_Usuarios
      SET nombre = @nombre, correo = @correo, activo = @activo, pais = @pais, eliminado = 0,
          cargo = ISNULL(@cargo, cargo),
          departamento = ISNULL(@departamento, departamento),
          gerencia = ISNULL(@gerencia, gerencia),
          subgerencia = ISNULL(@subgerencia, subgerencia),
          area = ISNULL(@area, area),
          jefeCarnet = ISNULL(@jefeCarnet, jefeCarnet),
          jefeNombre = ISNULL(@jefeNombre, jefeNombre),
          jefeCorreo = ISNULL(@jefeCorreo, jefeCorreo),
          telefono = ISNULL(@telefono, telefono),
          genero = ISNULL(@genero, genero),
          idOrg = ISNULL(@idOrg, idOrg),
          orgDepartamento = ISNULL(@orgDepartamento, orgDepartamento),
          orgGerencia = ISNULL(@orgGerencia, orgGerencia),
          fechaIngreso = ISNULL(@fechaIngreso, fechaIngreso)
      WHERE idUsuario = @idUsuario;
    END
    ELSE
    BEGIN
      DECLARE @nuevo TABLE (idUsuario INT);

      INSERT INTO p_Usuarios (
        nombre, correo, carnet, idRol, activo, pais, fechaCreacion, eliminado,
        cargo, departamento, gerencia, subgerencia, area, jefeCarnet, jefeNombre, jefeCorreo,
        telefono, genero, idOrg, orgDepartamento, orgGerencia, fechaIngreso
      )
      OUTPUT INSERTED.idUsuario INTO @nuevo(idUsuario)
      VALUES (
        @nombre, @correo, @carnet, 3, @activo, @pais, GETDATE(), 0,
        @cargo, @departamento, @gerencia, @subgerencia, @area, @jefeCarnet, @jefeNombre, @jefeCorreo,
        @telefono, @genero, @idOrg, @orgDepartamento, @orgGerencia, @fechaIngreso
      );

      SELECT @idUsuario = idUsuario FROM @nuevo;
    END

    IF @idUsuario IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM p_UsuariosCredenciales WHERE idUsuario = @idUsuario)
    BEGIN
      INSERT INTO p_UsuariosCredenciales (idUsuario, passwordHash)
      VALUES (@idUsuario, '');
    END
    
    SELECT @idUsuario as id;
  `;

  const result = await request.query<{ id: number }>(query);
  return result.recordset[0]?.id;
}
