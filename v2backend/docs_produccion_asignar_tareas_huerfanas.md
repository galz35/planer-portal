# Documentación: Asignación de Tareas Huérfanas de Proyectos

## Objetivo
Debido a creaciones manuales de tareas o fallos durante la migración de datos, es posible que ciertas tareas (Hitos/Entregables/Operativas) asociadas a un proyecto específico se encuentren sin un asignado (`idAsignado` o `asignadoCarnet` son `NULL`).
Esto provoca que las tareas no aparezcan en la agenda de ninguna persona o que se visualicen incorrectamente en las vistas del Proyecto (causando métricas desfasadas o tareas "invisibles" en Mi Día).

## Procedimiento para Entornos de Producción
Al desplegar a la base de datos de producción, si se detecta este problema, se ejecutará un script en Node.js para buscar iterativamente:
1. Toda tarea huérfana (`idAsignado IS NULL` y `asignadoCarnet IS NULL`) que pertenezca a un proyecto (`idProyecto IS NOT NULL`).
2. Se revisa el proyecto padre.
3. **Rescate Primario:** Se intenta asignar la tarea al **Responsable** del proyecto.
4. **Rescate Secundario:** Si el proyecto no tiene reponsable, se asigna al **Creador** del proyecto.

## Uso del Script (`reparar_tareas_huerfanas.js`)
Para ejecutar la reparación, en el backend ejecutar:
```bash
cd v2backend
node reparar_tareas_huerfanas.js
```
El script generará un log por terminal mostrando cuántas tareas se visualizaron y qué acción se tomó para cada una. Funciona conectándose independientemente a la base de datos indicada en sus variables locales, valiéndose de las variables exportadas por el `.env` u orgánicas de despliegue.
