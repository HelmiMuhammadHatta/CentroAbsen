import express from 'express';
import { env } from './config/env.config';
import cors from 'cors';
import helmet from 'helmet';
import pino from 'pino-http';
import cookieParser from 'cookie-parser';
import { AttendanceService } from './services/attendance.service';
import { ReportController } from './controllers/report.controller';
import { initAttendanceJob } from './jobs/attendance.job';
import { initPhotoRetentionJob } from './jobs/photo_retention.job';
import fs from 'fs';
import path from 'path';
import { AuthController } from './controllers/auth.controller';
import { EmployeeController } from './controllers/employee.controller';
import { MeController } from './controllers/me.controller';
import { AttendanceController } from './controllers/attendance.controller';
import { DepartmentController } from './controllers/department.controller';
import { WorkLocationController } from './controllers/work_location.controller';
import { LeaveTypeController } from './controllers/leave_type.controller';
import { HolidayController } from './controllers/holiday.controller';
import { LeaveController } from './controllers/leave.controller';
import { FinanceController } from './controllers/finance.controller';
import { ApprovalController } from './controllers/approval.controller';
import { NotificationController } from './controllers/notification.controller';
import { AttachmentController } from './controllers/attachment.controller';
import { requireAuth, requirePermission, requireCsrf } from './middlewares/auth.middleware';
import { userRateLimit, ipRateLimit } from './middlewares/rateLimit.middleware';
import multer from 'multer';

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: env.WEB_URL,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(ipRateLimit(env.RATE_LIMIT_MAX_REQUESTS, env.RATE_LIMIT_WINDOW_MS));
app.use(requireCsrf);
app.use(pino({
  logger: require('pino')({ level: env.LOG_LEVEL })
}));

app.get('/health', (req: express.Request, res: express.Response) => {
  res.json({ status: 'OK' });
});

app.get('/api/v1/time', (req: express.Request, res: express.Response) => {
  const now = new Date();
  res.json({
    utc: now.toISOString(),
    wib: now.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
  });
});

// Auth Routes
app.post('/api/v1/auth/login', AuthController.login);
app.post('/api/v1/auth/refresh-token', AuthController.refresh);
app.post('/api/v1/auth/logout', AuthController.logout);
app.post('/api/v1/auth/forgot-password', AuthController.forgotPassword);
app.post('/api/v1/auth/reset-password', AuthController.resetPassword);
app.post('/api/v1/auth/change-password', requireAuth, AuthController.changePassword);
app.get('/api/v1/auth/me', requireAuth, MeController.getMe);

// Employee Routes
app.get('/api/v1/employees', requireAuth, EmployeeController.list);
app.get('/api/v1/employees/:id', requireAuth, EmployeeController.get);
app.get('/api/v1/employees/:id/effective-shift', requireAuth, EmployeeController.getEffectiveShift || ((req, res) => res.json({})));
app.post('/api/v1/employees', requireAuth, requirePermission('employee.create'), EmployeeController.create);
app.put('/api/v1/employees/:id', requireAuth, requirePermission('employee.update'), EmployeeController.update);

// Master Data Routes
app.get('/api/v1/departments', requireAuth, requirePermission('department.read'), DepartmentController.list);
app.get('/api/v1/departments/:id', requireAuth, requirePermission('department.read'), DepartmentController.get);
app.post('/api/v1/departments', requireAuth, requirePermission('department.create'), DepartmentController.create);
app.put('/api/v1/departments/:id', requireAuth, requirePermission('department.update'), DepartmentController.update);
app.delete('/api/v1/departments/:id', requireAuth, requirePermission('department.delete'), DepartmentController.delete);

app.get('/api/v1/work-locations', requireAuth, requirePermission('work_location.read'), WorkLocationController.list);
app.get('/api/v1/work-locations/:id', requireAuth, requirePermission('work_location.read'), WorkLocationController.get);
app.post('/api/v1/work-locations', requireAuth, requirePermission('work_location.create'), WorkLocationController.create);
app.put('/api/v1/work-locations/:id', requireAuth, requirePermission('work_location.update'), WorkLocationController.update);

app.get('/api/v1/leave-types', requireAuth, LeaveTypeController.list);
app.get('/api/v1/leave-types/:id', requireAuth, LeaveTypeController.get);
app.post('/api/v1/leave-types', requireAuth, requirePermission('leave_type.create'), LeaveTypeController.create);
app.put('/api/v1/leave-types/:id', requireAuth, requirePermission('leave_type.update'), LeaveTypeController.update);

app.get('/api/v1/holidays', requireAuth, requirePermission('holiday.read'), HolidayController.list);
app.post('/api/v1/holidays', requireAuth, requirePermission('holiday.create'), HolidayController.create);
app.delete('/api/v1/holidays/:id', requireAuth, requirePermission('holiday.delete'), HolidayController.delete);

// Attendance Routes
app.post('/api/v1/attendances/submit', requireAuth, userRateLimit(10, 60 * 1000), upload.single('photo'), AttendanceController.submit);
app.post('/api/v1/attendances/check-in', requireAuth, userRateLimit(10, 60 * 1000), upload.single('photo'), (req, res, next) => { req.body.type = 'CheckIn'; next(); }, AttendanceController.submit);
app.post('/api/v1/attendances/check-out', requireAuth, userRateLimit(10, 60 * 1000), upload.single('photo'), (req, res, next) => { req.body.type = 'CheckOut'; next(); }, AttendanceController.submit);
app.get('/api/v1/attendances/today', requireAuth, AttendanceController.getToday);
app.get('/api/v1/attendances', requireAuth, AttendanceController.list);
app.get('/api/v1/attendances/history', requireAuth, AttendanceController.list);
app.get('/api/v1/attendances/summary/:employeeId', requireAuth, AttendanceController.getSummary);
app.get('/api/v1/attendances/:id/photo', requireAuth, AttendanceController.getPhoto);
app.get('/api/v1/attendances/:id', requireAuth, AttendanceController.getDetail);

// Leave Routes
app.get('/api/v1/leaves/calculate-work-days', requireAuth, LeaveController.calculateWorkDays);
app.post('/api/v1/leaves/submit', requireAuth, requireCsrf, upload.array('attachments', 5), LeaveController.submit);
app.get('/api/v1/leaves', requireAuth, LeaveController.list);
app.post('/api/v1/leaves/:id/cancel', requireAuth, requireCsrf, LeaveController.cancel);

// Finance Routes (Tahap 6: Pemohon -> Atasan -> CEO -> Keuangan)
app.post('/api/v1/finance-requests', requireAuth, requireCsrf, upload.array('attachments', 5), FinanceController.submit);
app.post('/api/v1/finances/submit', requireAuth, requireCsrf, upload.array('attachments', 5), FinanceController.submit);
app.get('/api/v1/finance-requests', requireAuth, FinanceController.list);
app.get('/api/v1/finances', requireAuth, FinanceController.list);

app.get('/api/v1/finance-requests/ceo-queue', requireAuth, requirePermission('finance.approve.executive'), FinanceController.ceoQueue);
app.get('/api/v1/finance-requests/ceo-summary', requireAuth, requirePermission('finance.approve.executive'), FinanceController.ceoSummary);
app.get('/api/v1/finance-requests/finance-queue', requireAuth, requirePermission('finance.disburse'), FinanceController.financeQueue);
app.get('/api/v1/finance-requests/finance-summary', requireAuth, requirePermission('finance.disburse'), FinanceController.financeSummary);
app.get('/api/v1/finances/summary', requireAuth, requirePermission('finance.disburse'), FinanceController.financeSummary);

app.get('/api/v1/finance-requests/:id', requireAuth, FinanceController.getDetail);
app.get('/api/v1/finances/:id', requireAuth, FinanceController.getDetail);
app.post('/api/v1/finance-requests/:id/approve', requireAuth, requireCsrf, FinanceController.approve);
app.post('/api/v1/finance-requests/:id/reject', requireAuth, requireCsrf, FinanceController.reject);
app.post('/api/v1/finance-requests/:id/disburse', requireAuth, requireCsrf, upload.single('proof'), FinanceController.disburse);
app.post('/api/v1/finance-requests/:id/cancel', requireAuth, requireCsrf, FinanceController.cancel);
app.post('/api/v1/finances/:id/cancel', requireAuth, requireCsrf, FinanceController.cancel);
app.post('/api/v1/finance-requests/:id/reassign', requireAuth, requirePermission('employee.delete'), FinanceController.reassign);

// Auth Sessions
app.get('/api/v1/auth/sessions', requireAuth, AuthController.listSessions);
app.delete('/api/v1/auth/sessions/:id', requireAuth, requireCsrf, AuthController.revokeSession);

// Attendance Flags & Monthly Summary
app.post('/api/v1/attendances/flags/:flagId/review', requireAuth, requirePermission('attendance.flag.review'), AttendanceController.reviewFlag);
app.get('/api/v1/attendances/monthly-summary', requireAuth, (req, res) => {
  const { userId, month, year } = req.query;
  const uid = (userId as string) || (req as any).user.id;
  AttendanceService.getMonthlySummary(uid, Number(month || new Date().getMonth() + 1), Number(year || new Date().getFullYear()))
    .then(data => res.json({ data }))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Approvals Inbox
app.get('/api/v1/approvals/inbox', requireAuth, ApprovalController.inbox);
app.get('/api/v1/approvals/inbox/count', requireAuth, ApprovalController.inboxCount);
app.get('/api/v1/approvals/queue', requireAuth, ApprovalController.listQueue);
app.post('/api/v1/approvals/act', requireAuth, requireCsrf, ApprovalController.act);

// Reports
app.get('/api/v1/reports/attendance', requireAuth, ReportController.exportAttendance);
app.get('/api/v1/reports/finance', requireAuth, ReportController.exportFinance);

// Notifications
app.get('/api/v1/notifications', requireAuth, NotificationController.list);
app.get('/api/v1/notifications/unread-count', requireAuth, NotificationController.getUnreadCount);
app.post('/api/v1/notifications/read-all', requireAuth, requireCsrf, NotificationController.markAllAsRead);
app.post('/api/v1/notifications/:id/read', requireAuth, requireCsrf, NotificationController.markAsRead);

// Attachments
app.get('/api/v1/attachments/:id', requireAuth, AttachmentController.download);

// Stub routes to prevent 404 on dashboard
app.get('/api/v1/daily-reports', requireAuth, (req, res) => res.json({ data: [] }));

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.log) req.log.error(err);
  else console.error(err);
  res.status(err.status || 500).json({
    error: err.message || 'Terjadi kesalahan pada server'
  });
});

const IS_DEV = env.NODE_ENV === 'development';
if (IS_DEV || env.ENABLE_DOCS) {
  import('swagger-ui-express').then((swaggerUi) => {
    const openApiPath = path.resolve(process.cwd(), '../../docs/openapi.json');
    let swaggerDocument: any = { info: { description: '' } };
    try {
      if (fs.existsSync(openApiPath)) {
        swaggerDocument = JSON.parse(fs.readFileSync(openApiPath, 'utf-8'));
      }
      if (IS_DEV) {
        swaggerDocument.info.description += '\n\n### Daftar Akun Development (Seed)\n\n| Peran | NIK | Password |\n|-------|-----|----------|\n| Karyawan | KRY-001 | password123 |\n| Atasan | SPV-001 | password123 |\n| CEO | CEO-001 | password123 |\n| Keuangan | FIN-001 | password123 |\n| HR/Admin | HRD-001 | password123 |\n\n> Gunakan akun KRY-001 untuk absen dan mengajukan klaim, lalu login berurutan sebagai Atasan, CEO, dan Keuangan untuk menyetujui dan mencairkan klaim.';
      }
    } catch (err) {
      console.error('Gagal membaca openapi.json', err);
    }

    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
      swaggerOptions: {
        requestInterceptor: (req: any) => {
          req.credentials = 'include';
          // Sisipkan CSRF header otomatis jika cookie XSRF-TOKEN ada (jika backend menggunakan csurf)
          if (typeof document !== 'undefined') {
            const match = document.cookie.match(/(?:^|;)\s*XSRF-TOKEN=([^;]*)/);
            if (match && match[1]) {
              req.headers['X-CSRF-Token'] = decodeURIComponent(match[1]);
            }
          }
          return req;
        }
      }
    }));
  }).catch((err) => {
    console.error('Gagal meload swagger-ui-express', err);
  });
}

const PORT = env.PORT;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  initAttendanceJob();
  initPhotoRetentionJob();
});
