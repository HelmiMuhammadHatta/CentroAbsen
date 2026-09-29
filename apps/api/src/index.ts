import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pino from 'pino-http';
import { initAttendanceJob } from './jobs/attendance.job';

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.WEB_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(pino({
  logger: require('pino')({ level: process.env.LOG_LEVEL || 'info' })
}));

app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

app.get('/api/v1/time', (req, res) => {
  const now = new Date();
  res.json({
    utc: now.toISOString(),
    wib: now.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
  });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  req.log.error(err);
  res.status(err.status || 500).json({
    error: err.message || 'Terjadi kesalahan pada server'
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  initAttendanceJob();
});
