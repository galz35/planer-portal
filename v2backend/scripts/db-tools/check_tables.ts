import { ejecutarQuery } from '../../src/db/base.repo';

async function listTables() {
    try {
        const tables = await ejecutarQuery<{ name: string }>("SELECT name FROM sys.tables ORDER BY name");
        console.log('Tables found:', tables.map(t => t.name));

        const agenda = tables.find(t => t.name.toLowerCase() === 'p_agenda');
        if (agenda) {
            const columns = await ejecutarQuery(`
                SELECT COLUMN_NAME, DATA_TYPE 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = '${agenda.name}'
            `);
            console.log('p_Agenda columns:', columns);
        } else {
            console.log('p_Agenda table NOT found.');
        }

    } catch (e) {
        console.error(e);
    }
}

listTables();
