const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// 보안 미들웨어
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      scriptSrcAttr: ["'unsafe-inline'"], // inline event handlers (onclick, oninput 등)
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: [
        "'self'",
        "data:",
        "https:",
        "http:",
        "blob:"
      ],
      connectSrc: [
        "'self'",
        "http://localhost:3000",
        "https://ymqnpsiephgvdzzizsns.supabase.co",
        "https://accounts.google.com",
        "https://fleecat-production.up.railway.app"
      ], // API 호출용
      fontSrc: ["'self'", "data:", "https:"], // 웹폰트용
    }
  }
}));

// CORS 설정
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:3000',
  'http://localhost:5173',  // Vite 프론트엔드
  'https://fleecat-production.up.railway.app'
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// 로깅
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Body 파싱
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 정적 파일 제공 (관리자 페이지용)
app.use(express.static(path.join(__dirname, '../public')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Fleecat API is running' });
});

// OAuth 콜백 페이지 라우트
app.get('/auth/callback', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/auth/callback.html'));
});

// API 라우트
app.use('/api/v1', routes);

// 404 핸들러
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// 에러 핸들러
app.use(errorHandler);

module.exports = app;
