const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Global Crash Prevention Guards
process.on('uncaughtException', (err) => {
  console.error('[CRITICAL - Uncaught Exception Handled]:', err.message);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[CRITICAL - Unhandled Rejection Handled]:', reason);
});

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static frontend files
app.use(express.static(path.join(__dirname)));

// Optional PostgreSQL Connection
let pool = null;
const dbUrl = process.env.DATABASE_URL || (process.env.PGHOST ? `postgresql://${process.env.PGUSER || 'postgres'}:${process.env.PGPASSWORD || ''}@${process.env.PGHOST}:${process.env.PGPORT || 5432}/${process.env.PGDATABASE || 'tiket_db'}` : null);

if (dbUrl) {
  try {
    const { Pool } = require('pg');
    pool = new Pool({
      connectionString: dbUrl,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    });
    pool.on('error', (err) => {
      console.warn('[DB Pool Idle Error Handled]:', err.message);
    });
    console.log('[DB] Connecting to PostgreSQL at:', dbUrl.replace(/:[^:@]+@/, ':****@'));
  } catch (err) {
    console.warn('[DB] PostgreSQL driver not initialized:', err.message);
  }
} else {
  console.log('[DB] Running in standalone web server mode (no DATABASE_URL provided yet).');
}

// Auto-initialize DB Schema if pool is connected
async function initDb() {
  if (!pool) return;
  try {
    const client = await pool.connect();
    console.log('[DB] Connected to PostgreSQL successfully!');

    await client.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        short_name VARCHAR(100),
        code VARCHAR(20),
        category VARCHAR(150),
        email VARCHAR(255),
        password VARCHAR(255),
        phone VARCHAR(50),
        color VARCHAR(30),
        photo_url TEXT,
        approval_status VARCHAR(50) DEFAULT 'APPROVED',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS vessels (
        id VARCHAR(100) PRIMARY KEY,
        company_id VARCHAR(100),
        name VARCHAR(255) NOT NULL,
        capacity INT DEFAULT 150,
        status VARCHAR(50) DEFAULT 'Siap Operasi',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS schedules (
        id VARCHAR(100) PRIMARY KEY,
        company_id VARCHAR(100),
        vessel_id VARCHAR(100),
        origin_id VARCHAR(20),
        destination_id VARCHAR(20),
        origin_city VARCHAR(100),
        dest_city VARCHAR(100),
        depart_date DATE,
        depart_time VARCHAR(20),
        pier VARCHAR(100),
        price_economy NUMERIC DEFAULT 0,
        port_pass_fee NUMERIC DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS bookings (
        pnr VARCHAR(100) PRIMARY KEY,
        schedule_id VARCHAR(100),
        company_id VARCHAR(100),
        buyer_name VARCHAR(255),
        buyer_email VARCHAR(255),
        buyer_phone VARCHAR(50),
        total_fare NUMERIC DEFAULT 0,
        payment_status VARCHAR(50) DEFAULT 'PAID',
        payment_method VARCHAR(100) DEFAULT 'LOKET',
        booking_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS passengers (
        id SERIAL PRIMARY KEY,
        pnr VARCHAR(100) REFERENCES bookings(pnr) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        pax_type VARCHAR(50),
        gender VARCHAR(20),
        doc_type VARCHAR(50),
        doc_num VARCHAR(100),
        nationality VARCHAR(100),
        seat VARCHAR(50),
        ticket_no VARCHAR(100),
        checked_in BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS port_passes (
        id VARCHAR(100) PRIMARY KEY,
        pass_number VARCHAR(100) UNIQUE,
        passenger_name VARCHAR(255),
        fee NUMERIC DEFAULT 0,
        status VARCHAR(50) DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS cloud_store_backup (
        key_name VARCHAR(100) PRIMARY KEY,
        data_json JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    client.release();
    console.log('[DB] PostgreSQL schema initialized & ready.');
  } catch (err) {
    console.error('[DB] Schema initialization warning:', err.message);
  }
}

initDb();

// Health Check API
app.get('/api/health', async (req, res) => {
  let isDbWorking = false;
  let dbError = null;
  if (pool) {
    try {
      await pool.query('SELECT 1');
      isDbWorking = true;
    } catch (e) {
      dbError = e.message;
    }
  }

  res.json({
    status: 'ok',
    app: 'Universal Ticketing SaaS & KSOP Manifest Engine',
    uptime: process.uptime(),
    databaseConnected: isDbWorking,
    dbConfigured: Boolean(process.env.DATABASE_URL || process.env.PGHOST),
    dbError: dbError || undefined,
    timestamp: new Date().toISOString()
  });
});

// Full Cloud Sync API (Sync local Store data to PostgreSQL)
app.post('/api/sync', async (req, res) => {
  if (!pool) {
    return res.status(200).json({ message: 'Database not configured, using local browser store.', synced: false });
  }

  const { key, data } = req.body;
  if (!key || !data) {
    return res.status(400).json({ error: 'Missing key or data' });
  }

  try {
    await pool.query(`
      INSERT INTO cloud_store_backup (key_name, data_json, updated_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (key_name)
      DO UPDATE SET data_json = EXCLUDED.data_json, updated_at = CURRENT_TIMESTAMP;
    `, [key, JSON.stringify(data)]);

    res.json({ success: true, key, message: 'Data synced to PostgreSQL' });
  } catch (err) {
    console.error('[API /sync error]:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Full Cloud Restore API (Get all cloud data on load)
app.get('/api/sync', async (req, res) => {
  if (!pool) {
    return res.status(200).json({ connected: false, data: {} });
  }

  try {
    const result = await pool.query('SELECT key_name, data_json FROM cloud_store_backup');
    const store = {};
    result.rows.forEach(row => {
      store[row.key_name] = row.data_json;
    });
    res.json({ connected: true, data: store });
  } catch (err) {
    console.error('[API /api/sync all error]:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Single key restore
app.get('/api/sync/:key', async (req, res) => {
  if (!pool) {
    return res.status(404).json({ error: 'Database not connected' });
  }

  try {
    const result = await pool.query('SELECT data_json FROM cloud_store_backup WHERE key_name = $1', [req.params.key]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Key not found' });
    }
    res.json({ key: req.params.key, data: result.rows[0].data_json });
  } catch (err) {
    console.error('[API /sync/:key error]:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// =======================================================
// AUTO-DEPLOY WEBHOOK (GitHub -> Server Auto Sync)
// =======================================================
const { exec } = require('child_process');
const crypto = require('crypto');

const DEPLOY_SECRET = process.env.DEPLOY_SECRET || 'tickytech_autodeploy_key_8899';
const webhookPaths = ['/api/webhook/deploy', '/api/webhook', '/webhook/deploy', '/webhook'];

app.post(webhookPaths, (req, res) => {
  const githubEvent = req.headers['x-github-event'];
  const queryToken = req.query.token;
  const headerToken = req.headers['x-deploy-token'];
  const githubSecret = req.headers['x-hub-signature-256'];

  // Handle GitHub Ping event (sent when webhook is first created or tested)
  if (githubEvent === 'ping') {
    console.log('[Auto-Deploy] Received GitHub Ping event. Responding 200 OK.');
    var zenMsg = (req.body && req.body.zen) ? req.body.zen : 'GitHub Webhook OK';
    return res.status(200).json({
      status: 'success',
      message: 'GitHub webhook ping received successfully! TickyTech auto-deploy is active.',
      zen: zenMsg
    });
  }

  let authorized = false;
  if (queryToken === DEPLOY_SECRET || headerToken === DEPLOY_SECRET) {
    authorized = true;
  } else if (githubSecret) {
    try {
      const hmac = crypto.createHmac('sha256', DEPLOY_SECRET);
      const payload = req.rawBody || JSON.stringify(req.body);
      const digest = 'sha256=' + hmac.update(payload).digest('hex');
      if (crypto.timingSafeEqual(Buffer.from(githubSecret), Buffer.from(digest))) {
        authorized = true;
      }
    } catch (e) {
      console.warn('[Auto-Deploy] Signature check error:', e.message);
    }
  }

  if (!authorized) {
    console.warn('[Auto-Deploy] Unauthorized webhook attempt received.');
    return res.status(403).json({ error: 'Unauthorized: Invalid deploy secret token' });
  }

  // Respond immediately so GitHub receives 200 OK without timeout
  res.json({
    status: 'success',
    message: 'Auto-deploy triggered! Server is pulling latest code from GitHub...',
    timestamp: new Date().toISOString()
  });

  console.log('[Auto-Deploy] Valid push event received. Running deploy script in background...');
  // Delay slightly to ensure HTTP response finishes before PM2 reloads
  setTimeout(() => {
    exec('git reset --hard origin/main && git pull origin main && npm install --production && (pm2 restart all || pm2 start server.js --name tickytech-saas)', { cwd: __dirname }, (error, stdout, stderr) => {
      if (error) {
        console.error('[Auto-Deploy Error]:', error.message);
        return;
      }
      console.log('[Auto-Deploy stdout]:', stdout);
      if (stderr) console.warn('[Auto-Deploy stderr]:', stderr);
      console.log('[Auto-Deploy] Update complete and application reloaded successfully!');
    });
  }, 1000);
});

// Quick GET browser test trigger for auto-deploy
app.get(webhookPaths, (req, res) => {
  const token = req.query.token;
  if (token !== DEPLOY_SECRET) {
    return res.status(403).send(`
      <div style="font-family: sans-serif; padding: 2rem; color: #b91c1c;">
        <h2>Akses Ditolak (Unauthorized)</h2>
        <p>Gunakan parameter token yang valid, contoh: <code>?token=${DEPLOY_SECRET}</code></p>
      </div>
    `);
  }

  res.send(`
    <div style="font-family: sans-serif; padding: 2rem; color: #047857;">
      <h2>Auto-Deploy Sedang Berjalan! 🚀</h2>
      <p>Perintah <code>git pull</code> dan <code>pm2 restart</code> sedang dijalankan di latar belakang.</p>
    </div>
  `);

  setTimeout(() => {
    exec('git reset --hard origin/main && git pull origin main && npm install --production && (pm2 restart all || pm2 start server.js --name tickytech-saas)', { cwd: __dirname }, (error, stdout, stderr) => {
      if (error) {
        console.error('[Auto-Deploy GET Error]:', error.message);
        return;
      }
      console.log('[Auto-Deploy GET stdout]:', stdout);
      if (stderr) console.warn('[Auto-Deploy GET stderr]:', stderr);
    });
  }, 500);
});

// SPA Fallback routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`🚀 Universal Ticketing SaaS is LIVE!`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`🌐 Server listening on 0.0.0.0:${PORT}`);
  console.log(`=======================================================`);
});

