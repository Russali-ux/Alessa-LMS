import express from 'express';
import cors from 'cors';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Database connection
const { Pool } = pg;
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'AlessaLMS',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'XBOX2025',
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Main endpoint to get all relational data flat
app.get('/api/data', async (req, res) => {
  try {
    const ifasResult = await pool.query('SELECT * FROM ifa ORDER BY created_at ASC');
    const indicationsResult = await pool.query('SELECT * FROM indication');
    const ifaIndResult = await pool.query('SELECT * FROM ifa_indication');
    const strategiesResult = await pool.query('SELECT * FROM search_strategy');

    // Adapt fields to match the frontend mapping logic that previously relied on JSON
    const mappedStrategies = strategiesResult.rows.map(s => ({
      ...s,
      strategy_name: s.strategy_category, // The UI looks for strategy_name
      strategy_category: s.strategy_category
    }));

    res.json({
      ifas: ifasResult.rows,
      indications: indicationsResult.rows,
      ifaIndications: ifaIndResult.rows,
      strategies: mappedStrategies
    });

  } catch (error) {
    console.error('Error fetching data from DB:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Upsert IFA endpoint
app.post('/api/ifas', async (req, res) => {
  const { ifa, indications, strategies, monitoring } = req.body;
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. IFA Upsert
    let ifaId = ifa.id;
    if (!ifaId || ifaId.startsWith('IFA_NEW')) {
      ifaId = crypto.randomUUID();
      await client.query(`
        INSERT INTO ifa (id, ifa_name, atc_code, atc4_name, atc5_name, monitoring_level, active)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [ifaId, ifa.ifa_name, ifa.atc_code, ifa.atc4_name, ifa.atc5_name, ifa.monitoring_level, ifa.status === 'Activo']);
    } else {
      await client.query(`
        UPDATE ifa 
        SET ifa_name = $2, atc_code = $3, atc4_name = $4, atc5_name = $5, monitoring_level = $6, active = $7
        WHERE id = $1
      `, [ifaId, ifa.ifa_name, ifa.atc_code, ifa.atc4_name, ifa.atc5_name, ifa.monitoring_level, ifa.status === 'Activo']);
    }

    // 2. Clear old relationships and strategies (clean slate for this IFA)
    await client.query('DELETE FROM search_strategy WHERE ifa_id = $1', [ifaId]);
    await client.query('DELETE FROM ifa_indication WHERE ifa_id = $1', [ifaId]);
    await client.query('DELETE FROM ifa_monitoring WHERE ifa_id = $1', [ifaId]);

    const bDate = monitoring?.baseline_date ? monitoring.baseline_date : null;
    const nDate = monitoring?.next_execution_date ? monitoring.next_execution_date : null;

    await client.query(`
      INSERT INTO ifa_monitoring (id, ifa_id, default_frequency, baseline_date, next_execution_date, active)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [crypto.randomUUID(), ifaId, monitoring?.default_frequency || "Mensual", bDate, nDate, true]);

    // 3. Upsert Indications
    for (const ind of indications) {
      if (!ind.meddra_term && !ind.free_text) continue;
      
      let indId;
      const existInd = await client.query('SELECT id FROM indication WHERE meddra_term = $1 OR (free_text = $2 AND free_text IS NOT NULL)', [ind.meddra_term, ind.free_text]);
      if (existInd.rows.length > 0) {
        indId = existInd.rows[0].id;
      } else {
        indId = crypto.randomUUID();
        await client.query(`
          INSERT INTO indication (id, meddra_code, meddra_term, cie10_code, cie10_name, free_text)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [indId, ind.meddra_code, ind.meddra_term, ind.cie10_code, ind.cie10_name, ind.free_text]);
      }
      
      // Link IFA to Indication
      await client.query(`
        INSERT INTO ifa_indication (id, ifa_id, indication_id)
        VALUES ($1, $2, $3)
        ON CONFLICT DO NOTHING
      `, [crypto.randomUUID(), ifaId, indId]);
    }

    // 4. Insert Strategies
    for (const strat of strategies) {
      if (!strat.categories || strat.categories.length === 0) continue;
      const categoriesStr = strat.categories.join(', '); // Comma separated as requested
      
      await client.query(`
        INSERT INTO search_strategy (id, ifa_id, strategy_category, query_text, inherits_frequency, frequency_override, override_reason, human_filter, lookback_months, active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        crypto.randomUUID(), 
        ifaId, 
        categoriesStr, 
        strat.strategy_name, 
        strat.inherits_frequency, 
        strat.frequency_override, 
        strat.override_reason, 
        strat.human_filter, 
        strat.lookback_months, 
        true
      ]);
    }

    await client.query('COMMIT');
    res.json({ success: true, ifaId });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en upsert:', error);
    res.status(500).json({ error: 'Error interno de base de datos' });
  } finally {
    client.release();
  }
});

app.listen(port, () => {
  console.log(`✅ Servidor Backend corriendo en http://localhost:${port}`);
  console.log(`🔗 Conectado a base de datos PostgreSQL: ${process.env.DB_NAME}`);
});
