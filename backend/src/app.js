// Tạo Express app (tách khỏi server.js để test bằng supertest không cần mở cổng).
const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const routes = require('./routes');
const { khongTimThay, xuLyLoi } = require('./middlewares/xu-ly-loi');

function taoApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json({ limit: '100kb' }));
  app.use('/api', routes);
  app.use(khongTimThay);
  app.use(xuLyLoi);
  return app;
}

module.exports = { taoApp };
