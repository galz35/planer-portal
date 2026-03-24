require('dotenv').config();
const { ejecutarQuery, NVarChar } = require('./dist/src/db/base.repo');
const fs = require('fs');
const path = require('path');

async function consultarProyectosYesenia() {
    const emailYesenia = 'yesenia.manzanarez@claro.com.ni';

    // Consulta para sacar los proyectos donde ella es asignada o creadora
    const sql = `
        SELECT 
            p.idProyecto, 
            p.nombre as ProyectoNombre, 
            p.estado,
            COALESCE(u_crea.nombre, p.creadorCarnet) as Creador,
            (
                SELECT STRING_AGG(ui.nombre, ', ') 
                FROM p_ProyectoColaboradores pin
                JOIN p_Usuarios ui ON pin.idUsuario = ui.idUsuario
                WHERE pin.idProyecto = p.idProyecto
            ) as Asignados
        FROM p_Proyectos p
        LEFT JOIN p_Usuarios u_crea ON p.creadorCarnet = u_crea.carnet
        WHERE 
            -- Ella es creadora
            p.creadorCarnet = (SELECT carnet FROM p_Usuarios WHERE correo = @email)
            OR
            -- Ella es colaborador
            EXISTS (
                SELECT 1 FROM p_ProyectoColaboradores pi2 
                JOIN p_Usuarios u_pi ON pi2.idUsuario = u_pi.idUsuario
                WHERE pi2.idProyecto = p.idProyecto AND u_pi.correo = @email
            )
            OR
            -- Tareas en proyectos (fallback si es que está asignada a tareas de un proyecto)
            p.idProyecto IN (SELECT idProyecto FROM p_Tareas t JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea JOIN p_Usuarios uta ON ta.carnet = uta.carnet WHERE uta.correo = @email AND t.idProyecto IS NOT NULL)
    `;

    const proys = await ejecutarQuery(sql, { email: { valor: emailYesenia, tipo: NVarChar } });

    // Deduplicate array by idProyecto
    const uniqueProys = Array.from(new Map(proys.map(item => [item.idProyecto, item])).values());

    let txtContent = "=== PROYECTOS DONDE PARTICIPA YESENIA MANZANAREZ ===\n\n";
    uniqueProys.forEach(p => {
        txtContent += `ID Proyecto: ${p.idProyecto}\n`;
        txtContent += `Nombre Proyecto: ${p.ProyectoNombre}\n`;
        txtContent += `Estado: ${p.estado}\n`;
        txtContent += `Creador Original: ${p.Creador}\n`;
        txtContent += `Colaboradores del Proyecto:\n  -> ${p.Asignados || 'Sin colaboradores en tabla p_ProyectoColaboradores'}\n`;
        txtContent += `----------------------------------------------------------\n`;
    });

    const filePath = path.dirname(__dirname) + '/docs/yesenia_proyectos.txt';
    fs.mkdirSync(path.dirname(__dirname) + '/docs', { recursive: true });
    fs.writeFileSync(filePath, txtContent);
    console.log(`Archivo generado: ${filePath}`);
}

consultarProyectosYesenia().catch(console.error);
