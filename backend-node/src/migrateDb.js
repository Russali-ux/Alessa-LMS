import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';
import crypto from 'crypto';

// Setup __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { Client } = pg;

// Connection config
const client = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function migrate() {
  try {
    console.log('🔗 Conectando a PostgreSQL...');
    await client.connect();
    console.log('✅ Conectado exitosamente.\n');

    // ==========================================
    // 1. DDL: Creación de tablas
    // ==========================================
    console.log('🛠️ Recreando tablas en la base de datos...');
    await client.query(`
      DROP TABLE IF EXISTS knowledge_base_entry CASCADE;
      DROP TABLE IF EXISTS article_screening CASCADE;
      DROP TABLE IF EXISTS search_execution_article CASCADE;
      DROP TABLE IF EXISTS article CASCADE;
      DROP TABLE IF EXISTS search_execution CASCADE;
      DROP TABLE IF EXISTS search_strategy CASCADE;
      DROP TABLE IF EXISTS ifa_monitoring CASCADE;
      DROP TABLE IF EXISTS ifa_indication CASCADE;
      DROP TABLE IF EXISTS indication CASCADE;
      DROP TABLE IF EXISTS ifa CASCADE;

      CREATE TABLE ifa (
          id UUID PRIMARY KEY,
          ifa_name VARCHAR(255) NOT NULL,
          atc_code VARCHAR(20),
          atc4_name VARCHAR(255),
          atc5_name VARCHAR(255),
          monitoring_level VARCHAR(10),
          active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE ifa_monitoring (
          id UUID PRIMARY KEY,
          ifa_id UUID NOT NULL,
          default_frequency VARCHAR(20),
          baseline_date DATE,
          next_execution_date DATE,
          active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

          CONSTRAINT fk_ifa_monitoring_ifa
              FOREIGN KEY (ifa_id)
              REFERENCES ifa(id)
              ON DELETE CASCADE
      );

      CREATE TABLE indication (
          id UUID PRIMARY KEY,
          meddra_code VARCHAR(50),
          meddra_term VARCHAR(500) NOT NULL,
          cie10_code VARCHAR(50),
          cie10_name VARCHAR(500),
          free_text TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE ifa_indication (
          id UUID PRIMARY KEY,
          ifa_id UUID NOT NULL,
          indication_id UUID NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

          CONSTRAINT fk_ifa_indication_ifa
              FOREIGN KEY (ifa_id)
              REFERENCES ifa(id)
              ON DELETE CASCADE,

          CONSTRAINT fk_ifa_indication_indication
              FOREIGN KEY (indication_id)
              REFERENCES indication(id)
              ON DELETE CASCADE,

          CONSTRAINT uq_ifa_indication
              UNIQUE (ifa_id, indication_id)
      );

      CREATE TABLE search_strategy (
          id UUID PRIMARY KEY,
          ifa_id UUID NOT NULL,
          strategy_category VARCHAR(100),
          query_text TEXT,
          inherits_frequency BOOLEAN DEFAULT TRUE,
          frequency_override VARCHAR(20),
          override_reason TEXT,
          human_filter BOOLEAN DEFAULT FALSE,
          lookback_months INTEGER DEFAULT 12,
          active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

          CONSTRAINT fk_search_strategy_ifa
              FOREIGN KEY (ifa_id)
              REFERENCES ifa(id)
              ON DELETE CASCADE
      );

      CREATE TABLE search_execution (
          id UUID PRIMARY KEY,
          strategy_id UUID NOT NULL,
          provider VARCHAR(50),
          execution_type VARCHAR(20),
          execution_date TIMESTAMP,
          start_date_used DATE,
          end_date_used DATE,
          articles_retrieved INTEGER,
          new_articles INTEGER,
          duplicate_articles INTEGER,
          query_executed TEXT,
          snapshot_json JSONB,
          status VARCHAR(20),
          execution_time_seconds NUMERIC,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

          CONSTRAINT fk_search_execution_strategy
              FOREIGN KEY (strategy_id)
              REFERENCES search_strategy(id)
              ON DELETE CASCADE
      );

      CREATE TABLE article (
          id UUID PRIMARY KEY,
          pmid VARCHAR(20) UNIQUE,
          doi VARCHAR(500) UNIQUE,
          url TEXT,
          raw_json JSONB,
          title TEXT,
          abstract TEXT,
          journal VARCHAR(1000),
          publication_year INTEGER,
          publication_date DATE,
          entrez_date DATE,
          create_date DATE,
          language VARCHAR(50),
          country VARCHAR(100),
          authors_json JSONB,
          mesh_terms_json JSONB,
          publication_types_json JSONB,
          keywords_json JSONB,
          source_database VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE search_execution_article (
          id UUID PRIMARY KEY,
          execution_id UUID NOT NULL,
          external_id VARCHAR(100),
          article_id UUID,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

          CONSTRAINT fk_search_exec_art_exec
              FOREIGN KEY (execution_id)
              REFERENCES search_execution(id)
              ON DELETE CASCADE,

          CONSTRAINT fk_search_exec_art_article
              FOREIGN KEY (article_id)
              REFERENCES article(id)
              ON DELETE SET NULL
      );

      CREATE TABLE article_screening (
          id UUID PRIMARY KEY,
          article_id UUID NOT NULL,
          strategy_id UUID NOT NULL,
          decision VARCHAR(20),
          decision_date TIMESTAMP,
          reviewer VARCHAR(255),
          reason TEXT,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

          CONSTRAINT fk_screening_article
              FOREIGN KEY (article_id)
              REFERENCES article(id)
              ON DELETE CASCADE,

          CONSTRAINT fk_screening_strategy
              FOREIGN KEY (strategy_id)
              REFERENCES search_strategy(id)
              ON DELETE CASCADE
      );

      CREATE TABLE knowledge_base_entry (
          id UUID PRIMARY KEY,
          article_id UUID NOT NULL,
          strategy_id UUID NOT NULL,
          ifa_id UUID NOT NULL,
          entry_status VARCHAR(20),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

          CONSTRAINT fk_kbe_article
              FOREIGN KEY (article_id)
              REFERENCES article(id)
              ON DELETE CASCADE,

          CONSTRAINT fk_kbe_strategy
              FOREIGN KEY (strategy_id)
              REFERENCES search_strategy(id)
              ON DELETE CASCADE,

          CONSTRAINT fk_kbe_ifa
              FOREIGN KEY (ifa_id)
              REFERENCES ifa(id)
              ON DELETE CASCADE
      );
    `);
    console.log('✅ Tablas creadas.\n');

    // ==========================================
    // 2. Lectura de JSON y Mapeos
    // ==========================================
    console.log('📂 Leyendo archivos JSON...');
    const dataPath = path.resolve(__dirname, '../../src/Data/Data_test');
    
    const ifasRaw = JSON.parse(fs.readFileSync(path.join(dataPath, 'IFA.json'), 'utf8'));
    const indicationsRaw = JSON.parse(fs.readFileSync(path.join(dataPath, 'Indicacion.json'), 'utf8'));
    const ifaIndicationsRaw = JSON.parse(fs.readFileSync(path.join(dataPath, 'ifa_indicacion.json'), 'utf8'));
    const strategiesRaw = JSON.parse(fs.readFileSync(path.join(dataPath, 'search_strategies.json'), 'utf8'));

    // Mapas para traducir IDs de strings a UUIDs nativos
    const ifaIdMap = {};
    const indIdMap = {};

    // ==========================================
    // 3. Inserción en IFA
    // ==========================================
    console.log('📥 Insertando IFAs...');
    let ifaCount = 0;
    for (const item of ifasRaw) {
      const originalId = item.id;
      const newUuid = crypto.randomUUID();
      ifaIdMap[originalId] = newUuid; // Guardar mapeo

      await client.query(`
        INSERT INTO ifa (id, ifa_name, atc_code, atc4_name, atc5_name, monitoring_level, active)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        newUuid,
        item.ifa_name || item.IFA_Name,
        item.atc_code,
        item.atc4_name || item.ATC4_Name,
        item.atc5_name,
        item.monitoring_level || 'A',
        item.active !== false
      ]);
      
      // Default monitoring insertion
      await client.query(`
        INSERT INTO ifa_monitoring (id, ifa_id, default_frequency, active)
        VALUES ($1, $2, $3, $4)
      `, [
        crypto.randomUUID(),
        newUuid,
        "Mensual", // Defaulting to Monthly for seeded data
        true
      ]);
      
      ifaCount++;
    }
    console.log(`✅ ${ifaCount} IFAs insertados.\n`);

    // ==========================================
    // 4. Inserción en INDICATION
    // ==========================================
    console.log('📥 Insertando Indicaciones...');
    let indCount = 0;
    for (const item of indicationsRaw) {
      const originalId = item.id;
      const newUuid = crypto.randomUUID();
      indIdMap[originalId] = newUuid;

      await client.query(`
        INSERT INTO indication (id, meddra_code, meddra_term, cie10_code, cie10_name, free_text)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        newUuid,
        item.meddra_code,
        item.meddra_term || item.Indicacion_MEDDRA,
        item.cie10_code,
        item.cie10_name,
        item.free_text
      ]);
      indCount++;
    }
    console.log(`✅ ${indCount} Indicaciones insertadas.\n`);

    // ==========================================
    // 5. Inserción en IFA_INDICATION
    // ==========================================
    console.log('📥 Insertando Relaciones IFA_Indication...');
    let relCount = 0;
    for (const item of ifaIndicationsRaw) {
      const ifaUuid = ifaIdMap[item.ifa_id];
      const indUuid = indIdMap[item.indication_id || item.ind_id]; // Fallbacks depending on JSON key
      
      if (ifaUuid && indUuid) {
        // Evitar duplicados (UNIQUE constraint)
        try {
          await client.query(`
            INSERT INTO ifa_indication (id, ifa_id, indication_id)
            VALUES ($1, $2, $3)
            ON CONFLICT (ifa_id, indication_id) DO NOTHING
          `, [
            crypto.randomUUID(),
            ifaUuid,
            indUuid
          ]);
          relCount++;
        } catch (err) {
          console.warn(`⚠️ Error insertando relación: ${err.message}`);
        }
      } else {
        console.warn(`⚠️ Relación huérfana ignorada: IFA ${item.ifa_id} / IND ${item.indication_id}`);
      }
    }
    console.log(`✅ ${relCount} Relaciones insertadas.\n`);

    // ==========================================
    // 6. Inserción en SEARCH_STRATEGY
    // ==========================================
    console.log('📥 Insertando Estrategias de Búsqueda...');
    let stratCount = 0;
    for (const item of strategiesRaw) {
      const ifaUuid = ifaIdMap[item.ifa_id];
      
      if (ifaUuid) {
        // Transformar data: strategy_name -> strategy_category.
        // query_text = null por ahora
        await client.query(`
          INSERT INTO search_strategy (id, ifa_id, strategy_category, query_text, inherits_frequency, frequency_override, override_reason, human_filter, lookback_months, active)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          crypto.randomUUID(),
          ifaUuid,
          item.strategy_category || item.strategy_name || item.category, // Guardamos la categoría real
          null, // Query PICO a construir posteriormente
          true, // inherits_frequency por defecto
          null, // frequency_override
          null, // override_reason
          true, // Default human_filter
          12,   // Default lookback_months
          item.active !== false
        ]);
        stratCount++;
      }
    }
    console.log(`✅ ${stratCount} Estrategias insertadas.\n`);

    console.log('🎉 Migración completada exitosamente.');

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
  } finally {
    await client.end();
  }
}

migrate();
