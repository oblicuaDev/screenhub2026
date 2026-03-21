require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 4000;

// Ensure uploads dir exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(uploadsDir));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/screens', require('./routes/screens'));
app.use('/api/screens/:screenId/content', require('./routes/content'));
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/superadmin', require('./routes/superadmin'));
app.use('/api/webhooks', require('./routes/webhooks'));
app.use('/api/plans', (req, res, next) => {
  const ctrl = require('./controllers/plansController');
  ctrl.list(req, res, next);
});

// Public player route (no auth required)
app.use('/api/play', require('./routes/player'));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// Scheduled job: unpublish screens for expired trials/subscriptions
// Runs once at startup and every hour
async function unpublishExpiredScreens() {
  try {
    const db = require('./db');
    const { rowCount } = await db.query(`
      UPDATE screens SET status = 'draft'
      WHERE status = 'published'
        AND deleted_at IS NULL
        AND organization_id IN (
          SELECT o.id FROM organizations o
          WHERE o.is_active = true
            AND o.deleted_at IS NULL
            AND o.trial_ends_at < NOW()
            AND NOT EXISTS (
              SELECT 1 FROM subscriptions s
              WHERE s.organization_id = o.id
                AND s.status = 'active'
                AND s.deleted_at IS NULL
            )
        )
    `);
    if (rowCount > 0) {
      console.log(`[Scheduler] Unpublished ${rowCount} screen(s) for expired trial/subscription`);
    }
  } catch (err) {
    console.error('[Scheduler] Error in unpublishExpiredScreens:', err.message);
  }
}

setInterval(unpublishExpiredScreens, 60 * 60 * 1000); // Every hour
setTimeout(unpublishExpiredScreens, 5000); // 5s after startup

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  const clientBuild = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientBuild));
  // All non-API routes serve the React app
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(clientBuild, 'index.html'));
    }
  });
}

app.listen(PORT, () => {
  console.log(`ScreenHub server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});
