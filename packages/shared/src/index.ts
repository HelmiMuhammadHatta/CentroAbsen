import { z } from "zod";

export enum Role {
  Employee = "Employee",
  Manager = "Manager",
  Executive = "Executive",
  Finance = "Finance",
  HrAdmin = "HrAdmin",
}

export enum WorkArrangement {
  Office = "Office",
  Hybrid = "Hybrid",
  Flexible = "Flexible",
}

export enum AttendanceType {
  CheckIn = "CheckIn",
  CheckOut = "CheckOut",
}

export enum WorkMode {
  Office = "Office",
  Home = "Home",
  Anywhere = "Anywhere",
}

export enum RequestStatus {
  Pending = "Pending",
  Approved = "Approved",
  Rejected = "Rejected",
  Skipped = "Skipped",
}

export enum FinanceRequestKind {
  Reimbursement = "Reimbursement",
  Purchase = "Purchase",
}

export enum Gender {
  Male = "Male",
  Female = "Female",
}

export const PERMISSIONS = {
  EMPLOYEE_READ: "employee.read",
  EMPLOYEE_CREATE: "employee.create",
  EMPLOYEE_UPDATE: "employee.update",
  EMPLOYEE_DELETE: "employee.delete",
  LEAVE_READ: "leave.read",
  LEAVE_CREATE: "leave.create",
  LEAVE_APPROVE: "leave.approve",
  FINANCE_READ: "finance.read",
  FINANCE_CREATE: "finance.create",
  FINANCE_APPROVE: "finance.approve",
  FINANCE_APPROVE_MANAGER: "finance.approve.manager",
  FINANCE_APPROVE_EXECUTIVE: "finance.approve.executive",
  FINANCE_DISBURSE: "finance.disburse",
  FINANCE_REASSIGN: "finance.reassign",
  ATTENDANCE_READ: "attendance.read",
  ATTENDANCE_CREATE: "attendance.create",
  ATTENDANCE_REPORT: "attendance.report",
} as const;

export const DEFAULT_BUSINESS_CONFIG = {
  WORK_START: "08:00",
  WORK_END: "17:00",
  LATE_TOLERANCE_MINUTES: 15,
  DEFAULT_OFFICE_RADIUS_METERS: 100,
  DEFAULT_LEAVE_QUOTA_DAYS: 12,
  DEFAULT_GPS_ACCURACY_THRESHOLD_METERS: 50,
  MAX_DEVICE_TIME_SKEW_SECONDS: 300,
  CEO_APPROVAL_THRESHOLD_IDR: 5000000,
  PHOTO_RETENTION_MONTHS: 3,
} as const;

export const UI_MESSAGES = {
  UNAUTHORIZED: "Akses tidak diizinkan",
  SERVER_ERROR: "Terjadi kesalahan pada server",
  NOT_FOUND: "Data tidak ditemukan",
  SUCCESS: "Berhasil memproses permintaan",
  INVALID_INPUT: "Data masukan tidak valid",
  // Frontend Toast Messages
  TOAST_SUCCESS_TITLE: "Berhasil",
  TOAST_ERROR_TITLE: "Terjadi Kesalahan",
  LOGIN_SUCCESS: "Selamat datang kembali!",
  CLOCK_IN_SUCCESS: "Selamat bekerja!",
  CLOCK_OUT_SUCCESS: "Terima kasih atas kerja keras Anda hari ini!",
  LEAVE_SUBMIT_SUCCESS: "Pengajuan cuti berhasil dibuat.",
  FINANCE_SUBMIT_SUCCESS: "Pengajuan keuangan berhasil dibuat.",
  APPROVAL_SUCCESS: "Persetujuan telah diproses.",
  PASSWORD_RESET_SUCCESS: "Kata sandi Anda telah berhasil direset. Silakan login dengan kata sandi baru.",
  PASSWORD_CHANGE_SUCCESS: "Kata sandi berhasil diubah."
} as const;

export const UserSchema = z.object({
  id: z.string().uuid(),
  nik: z.string(),
  full_name: z.string(),
  email: z.string().email(),
  role: z.nativeEnum(Role),
});
