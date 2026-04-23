const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { sequelize } = require('./models');

const authRoutes      = require('./routes/auth.routes');
const userRoutes      = require('./routes/user.routes');
const questionRoutes  = require('./routes/question.routes');
const examRoutes      = require('./routes/exam.routes');
const resultRoutes    = require('./routes/result.routes');
const aiRoutes        = require('./routes/ai.routes');
const schoolRoutes    = require('./routes/school.routes');
const { errorHandler } = require('./middleware/error.middleware');

const app = express();

// ── Security middleware ────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));

// ── Rate limiting ──────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 5000 : 100,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api', limiter);

// Stricter limiter for login attempts (brute-force protection)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 100 : 20,
  message: { error: 'Too many login attempts. Please wait 15 minutes and try again.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/login', loginLimiter);

// ── Body parsing ───────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

// ── Static uploads ─────────────────────────────────────────────
app.use('/uploads', express.static('uploads'));

// ── Routes ─────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/users',     userRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/exams',     examRoutes);
app.use('/api/results',   resultRoutes);
app.use('/api/ai',        aiRoutes);
app.use('/api/schools',   schoolRoutes);

// ── Landing + health check ─────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    name: 'StackJunior CBT API',
    status: 'running',
    docs: '/api/health',
  });
});
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Error handler ──────────────────────────────────────────────
app.use(errorHandler);

// ── Database + Start ───────────────────────────────────────────
const PORT = process.env.PORT || 5000;

sequelize
  .authenticate()
  .then(async () => {
    // Idempotent column migrations for existing tables
    const addColumnIfMissing = async (table, column, ddl) => {
      const [rows] = await sequelize.query(
        `SHOW COLUMNS FROM \`${table}\` LIKE '${column}'`
      );
      if (!rows.length) {
        await sequelize.query(`ALTER TABLE \`${table}\` ${ddl}`);
        console.log(`Added '${column}' column to ${table}`);
      }
    };
    await addColumnIfMissing('users', 'username',
      "ADD COLUMN `username` VARCHAR(255) NULL UNIQUE AFTER `name`");
    await addColumnIfMissing('users', 'classId',
      "ADD COLUMN `classId` CHAR(36) BINARY NULL AFTER `school`");
    await addColumnIfMissing('exams', 'classId',
      "ADD COLUMN `classId` CHAR(36) BINARY NULL AFTER `school`");
  })
  .then(() => sequelize.sync())
  .then(() => {
    console.log('Connected to MySQL and synced models');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MySQL connection error:', err);
    process.exit(1);
  });

module.exports = app;
