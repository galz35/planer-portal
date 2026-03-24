require('dotenv').config();
const { ejecutarQuery, NVarChar } = require('./dist/src/db/base.repo');
const fs = require('fs');
const path = require('path');

async function generateCsvReport() {
    const sql = `
        SELECT 
            u.nombre as Colaborador,
            u.carnet as Carnet,
            u.correo as Email,
            t.nombre as Tarea,
            p.nombre as Proyecto,
            COALESCE(crea.nombre, t.creadorCarnet, 'Sistema') as Creador,
            t.fechaObjetivo as FechaLimite,
            DATEDIFF(day, t.fechaObjetivo, GETDATE()) as DiasAtraso,
            u.jefeNombre as Jefe
        FROM p_Tareas t
        INNER JOIN p_TareaAsignados ta ON ta.idTarea = t.idTarea
        INNER JOIN p_Usuarios u ON ta.carnet = u.carnet
        LEFT JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
        LEFT JOIN p_Usuarios crea ON t.creadorCarnet = crea.carnet
        WHERE t.activo = 1
          AND t.estado NOT IN ('Hecha', 'Descartada', 'Eliminada')
          AND (t.fechaObjetivo < CAST(GETDATE() as DATE) 
               OR (t.fechaObjetivo IS NULL AND t.fechaCreacion < CAST(GETDATE() as DATE)))
          AND (t.idProyecto IS NULL OR p.estado = 'Activo')
          AND u.activo = 1
        ORDER BY u.nombre, t.fechaObjetivo ASC
    `;

    const tasks = await ejecutarQuery(sql, {});

    // Generar CSV
    let csvContent = "\ufeff"; // BOM for Excel UTF-8
    csvContent += "Colaborador,Carnet,Email,Tarea,Proyecto,Creador,Fecha Limite,Dias Atraso,Jefe\n";

    tasks.forEach(t => {
        const row = [
            `"${t.Colaborador}"`,
            `"${t.Carnet}"`,
            `"${t.Email}"`,
            `"${t.Tarea.replace(/"/g, '""')}"`,
            `"${(t.Proyecto || 'General').replace(/"/g, '""')}"`,
            `"${t.Creador}"`,
            `"${t.FechaLimite ? new Date(t.FechaLimite).toLocaleDateString() : 'N/A'}"`,
            `"${t.DiasAtraso}"`,
            `"${t.Jefe || 'N/A'}"`
        ];
        csvContent += row.join(",") + "\n";
    });

    const filePath = path.join(__dirname, 'reporte_tareas_atrasadas.csv');
    fs.writeFileSync(filePath, csvContent);
    console.log(`Reporte generado exitosamente en: ${filePath}`);
}

generateCsvReport().catch(console.error);
