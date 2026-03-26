import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { Pool } from 'pg';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Initialize database schema
async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS gbs (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS subgrupamentos (
        id TEXT PRIMARY KEY,
        gb_id TEXT REFERENCES gbs(id) ON DELETE CASCADE,
        name TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS postos (
        id TEXT PRIMARY KEY,
        sub_id TEXT REFERENCES subgrupamentos(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        municipio TEXT,
        classification TEXT
      );

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        email TEXT,
        role TEXT NOT NULL,
        password TEXT,
        posto_id TEXT,
        must_change_password BOOLEAN DEFAULT FALSE,
        scope_level TEXT,
        scope_id TEXT,
        custom_permissions JSONB
      );

      CREATE TABLE IF NOT EXISTS viaturas (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        prefix TEXT NOT NULL,
        items JSONB NOT NULL,
        status TEXT NOT NULL,
        posto_id TEXT
      );

      CREATE TABLE IF NOT EXISTS inventory_checks (
        id TEXT PRIMARY KEY,
        viatura_id TEXT NOT NULL,
        date TEXT NOT NULL,
        shift_color TEXT,
        responsible_names JSONB,
        commander_name TEXT,
        entries JSONB NOT NULL,
        timestamp TEXT NOT NULL,
        justification TEXT,
        header_details JSONB,
        snapshot JSONB,
        viatura_status_at_time TEXT
      );

      CREATE TABLE IF NOT EXISTS logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        user_name TEXT NOT NULL,
        action TEXT NOT NULL,
        details TEXT,
        timestamp TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS notices (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        priority TEXT NOT NULL,
        active BOOLEAN DEFAULT TRUE,
        expiration_date TEXT,
        created_at TEXT NOT NULL,
        created_by TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS system_settings (
        id TEXT PRIMARY KEY,
        role_permissions JSONB,
        active_theme JSONB,
        header_config JSONB
      );
    `);
    console.log('Database schema initialized');
  } catch (err) {
    console.error('Error initializing database:', err);
  }
}

initDb();

// API Routes
app.get('/api/data', async (req: Request, res: Response) => {
  try {
    const type = req.query.type;
    if (type === 'ALL') {
      const [gbs, subs, postos, users, viaturas, checks, logs, notices, settings] = await Promise.all([
        pool.query('SELECT * FROM gbs'),
        pool.query('SELECT id, gb_id AS "gbId", name FROM subgrupamentos'),
        pool.query('SELECT id, sub_id AS "subId", name, municipio, classification FROM postos'),
        pool.query('SELECT id, username, name, email, role, password, posto_id AS "postoId", must_change_password AS "mustChangePassword", scope_level AS "scopeLevel", scope_id AS "scopeId", custom_permissions AS "customPermissions" FROM users'),
        pool.query('SELECT id, name, prefix, items, status, posto_id AS "postoId" FROM viaturas'),
        pool.query('SELECT id, viatura_id AS "viaturaId", date, shift_color AS "shiftColor", responsible_names AS "responsibleNames", commander_name AS "commanderName", entries, timestamp, justification, header_details AS "headerDetails", snapshot, viatura_status_at_time AS "viaturaStatusAtTime" FROM inventory_checks'),
        pool.query('SELECT id, user_id AS "userId", user_name AS "userName", action, details, timestamp FROM logs ORDER BY timestamp DESC LIMIT 1000'),
        pool.query('SELECT id, title, content, priority, active, expiration_date AS "expirationDate", created_at AS "createdAt", created_by AS "createdBy" FROM notices'),
        pool.query('SELECT role_permissions AS "rolePermissions", active_theme AS "activeTheme", header_config AS "headerConfig" FROM system_settings LIMIT 1')
      ]);

      res.json({
        gbs: gbs.rows,
        subs: subs.rows,
        postos: postos.rows,
        users: users.rows,
        viaturas: viaturas.rows,
        checks: checks.rows,
        logs: logs.rows,
        notices: notices.rows,
        settings: settings.rows[0] || {}
      });
    } else {
      res.status(400).json({ error: 'Invalid type' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/data', async (req: Request, res: Response) => {
  const { type, action, ...payload } = req.body;
  try {
    if (action === 'SAVE') {
      switch (type) {
        case 'GB':
          await pool.query('INSERT INTO gbs (id, name) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET name = $2', [payload.id, payload.name]);
          break;
        case 'SUB':
          await pool.query('INSERT INTO subgrupamentos (id, gb_id, name) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET gb_id = $2, name = $3', [payload.id, payload.gbId, payload.name]);
          break;
        case 'POSTO':
          await pool.query('INSERT INTO postos (id, sub_id, name, municipio, classification) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO UPDATE SET sub_id = $2, name = $3, municipio = $4, classification = $5', [payload.id, payload.subId, payload.name, payload.municipio, payload.classification]);
          break;
        case 'USER':
          await pool.query('INSERT INTO users (id, username, name, email, role, password, posto_id, must_change_password, scope_level, scope_id, custom_permissions) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT (id) DO UPDATE SET username = $2, name = $3, email = $4, role = $5, password = $6, posto_id = $7, must_change_password = $8, scope_level = $9, scope_id = $10, custom_permissions = $11', [payload.id, payload.username, payload.name, payload.email, payload.role, payload.password, payload.postoId, payload.mustChangePassword, payload.scopeLevel, payload.scopeId, JSON.stringify(payload.customPermissions)]);
          break;
        case 'VIATURA':
          await pool.query('INSERT INTO viaturas (id, name, prefix, items, status, posto_id) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO UPDATE SET name = $2, prefix = $3, items = $4, status = $5, posto_id = $6', [payload.id, payload.name, payload.prefix, JSON.stringify(payload.items), payload.status, payload.postoId]);
          break;
        case 'CHECK':
          await pool.query('INSERT INTO inventory_checks (id, viatura_id, date, shift_color, responsible_names, commander_name, entries, timestamp, justification, header_details, snapshot, viatura_status_at_time) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) ON CONFLICT (id) DO UPDATE SET viatura_id = $2, date = $3, shift_color = $4, responsible_names = $5, commander_name = $6, entries = $7, timestamp = $8, justification = $9, header_details = $10, snapshot = $11, viatura_status_at_time = $12', [payload.id, payload.viaturaId, payload.date, payload.shiftColor, JSON.stringify(payload.responsibleNames), payload.commanderName, JSON.stringify(payload.entries), payload.timestamp, payload.justification, JSON.stringify(payload.headerDetails), JSON.stringify(payload.snapshot), payload.viaturaStatusAtTime]);
          break;
        case 'LOG':
          await pool.query('INSERT INTO logs (id, user_id, user_name, action, details, timestamp) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING', [payload.id || `log-${Date.now()}-${Math.random()}`, payload.userId, payload.userName, payload.action, payload.details, payload.timestamp || new Date().toISOString()]);
          break;
        case 'SETTINGS':
          await pool.query('INSERT INTO system_settings (id, role_permissions, active_theme, header_config) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET role_permissions = $2, active_theme = $3, header_config = $4', ['main', JSON.stringify(payload.rolePermissions), JSON.stringify(payload.activeTheme), JSON.stringify(payload.headerConfig)]);
          break;
        case 'NOTICE':
          await pool.query('INSERT INTO notices (id, title, content, priority, active, expiration_date, created_at, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO UPDATE SET title = $2, content = $3, priority = $4, active = $5, expiration_date = $6, created_at = $7, created_by = $8', [payload.id, payload.title, payload.content, payload.priority, payload.active, payload.expirationDate, payload.createdAt, payload.createdBy]);
          break;
      }
    } else if (action === 'DELETE') {
      const tableMap: any = {
        'GB': 'gbs',
        'SUB': 'subgrupamentos',
        'POSTO': 'postos',
        'USER': 'users',
        'VIATURA': 'viaturas',
        'CHECK': 'inventory_checks',
        'NOTICE': 'notices'
      };
      if (tableMap[type]) {
        await pool.query(`DELETE FROM ${tableMap[type]} WHERE id = $1`, [payload.id]);
      }
    } else if (action === 'CLEAR_ALL') {
      await pool.query('TRUNCATE gbs, subgrupamentos, postos, users, viaturas, inventory_checks, logs, notices, system_settings CASCADE');
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();

export default app;
