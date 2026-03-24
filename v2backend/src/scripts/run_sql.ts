import * as sql from 'mssql';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const config: sql.config = {
  server: process.env.MSSQL_HOST || '',
  port: parseInt(process.env.MSSQL_PORT || '1433'),
  user: process.env.MSSQL_USER || '',
  password: process.env.MSSQL_PASSWORD || '',
  database: process.env.MSSQL_DATABASE || '',
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

async function run() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: ts-node run_sql.ts <file_path>');
    process.exit(1);
  }

  const script = fs.readFileSync(path.resolve(filePath), 'utf8');

  // Split script by GO if exists, or just run it
  const parts = script.split(/^\s*GO\s*$/im);

  try {
    const pool = await sql.connect(config);
    console.log('Connected to SQL Server');

    for (const part of parts) {
      if (!part.trim()) continue;
      const result = await pool.request().query(part);
      if (result.recordset) {
        console.table(result.recordset);
      }
    }

    console.log('SQL Script executed successfully');
    await pool.close();
  } catch (err) {
    console.error('Error executing SQL Script:', err);
    process.exit(1);
  }
}

run();
