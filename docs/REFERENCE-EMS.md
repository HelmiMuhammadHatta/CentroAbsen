# Analisis Proyek Referensi EMS-Portal

Sumber Referensi: https://github.com/HelmiMuhammadHatta/EMS-Portal (Clone Lokal)

## 1. Stack, Versi, dan Struktur Solusi
**Backend**: ASP.NET Core 8 Web API, Entity Framework Core (PostgreSQL), Serilog, FluentValidation, JWT Authentication, xUnit.
**Frontend**: React 18, Vite, TypeScript, TanStack Query (React Query v5), Tailwind CSS, React Hook Form + Zod, Recharts, Zustand.
**Tools**: Docker & Docker Compose (PostgreSQL 15-alpine, backend, frontend). CI via GitHub Actions (`ci.yml`).

**Struktur Clean Architecture**:
- `EMS.Domain`: Entitas inti (Employee, LeaveRequest, dll.), Enums, Interface standar.
- `EMS.Application`: Use cases, DTOs, Business Logic (Service), FluentValidation.
- `EMS.Infrastructure`: DbContext (`EmsDbContext`), Migrations, Repositories, DataSeeder, interceptor Audit Trail.
- `EMS.API`: Controllers, Setup Middleware, JWT Config, Dynamic Policy Provider untuk RBAC.
- `EMS.Tests`: Unit test (xUnit) untuk servis (AuthService, LeaveService).
- `ems-frontend`: SPA React.

## 2. Model Data (Domain Entities)
- **Primary Keys**: GUID (`gen_random_uuid()` di PostgreSQL).
- **Core Entities**: 
  - `User` (1:1 dengan `Employee`).
  - `Employee` (relasi `DepartmentId`, `PositionId`, self-referencing `ManagerId`).
  - `Role` dan `Permission` (Many-to-Many via `RolePermission`).
  - `LeaveType`, `LeaveBalance`, `LeaveRequest` (melacak status persetujuan & sisa cuti).
  - `Attendance` (mencatat `ClockIn`, `ClockOut`, status kehadiran).
  - `WorkShift`, `ShiftSchedule`, `ShiftRotationGroup`, `ShiftRotationPattern`.
  - `AuditLog` (Mencatat perubahan tabel, nilai lama, nilai baru).
  - Relasi `DeleteBehavior` yang ekstensif (SetNull untuk Manager/Department, Cascade untuk yang relevan).

## 3. RBAC Berbasis Permission
- **Katalog Permission**: Default disisipkan melalui `DataSeeder.cs` (`employee.read`, `employee.write`, `employee.delete`, `leave.read`, `leave.write`, `leave.approve`, `attendance.read`, `attendance.write`, `department.read`, `position.read`, dll).
- **Pemetaan Default Role**: `Admin`, `Manager`, `Staff`. Admin di-seed dengan seluruh permission.
- **Backend Authorization**: 
  - Token JWT menyimpan array permission dalam *claim* `permissions`.
  - Menggunakan `DynamicPolicyProvider` dan `PermissionHandler` (mengimplementasi `IAuthorizationHandler`) sehingga dapat menggunakan atribut dinamis `[Authorize(Policy = "employee.read")]` di setiap controller.
- **Frontend Authorization**:
  - `useAuthStore` (Zustand) menyimpan array `permissions` dari payload JWT.
  - Hook `useAuth` mengekspor fungsi `hasPermission(string)` untuk merender menu atau action button secara kondisional (Guard Route & UI logic).

## 4. Alur Autentikasi End-to-End
- **Login**: Menerima email/password, memverifikasi bcrypt hash, menerbitkan `accessToken` (JWT) dan `refreshToken`.
- **Penyimpanan Frontend**: Token dan array *permissions* disimpan di localStorage oleh Zustand middleware (`auth-storage`).
- **Interceptor (axios.ts)**: 
  - Request: Menyematkan `Bearer <token>`.
  - Response (401): Jika kadaluarsa, memanggil `/Auth/refresh-token` menggunakan *refreshToken*. Jika berhasil, decode ulang JWT base64 (payload) ke Zustand store dan ulang request. Jika gagal, redirect ke halaman login.

## 5. Modul Karyawan (Employee)
- **Hierarki & Circular Reference**: Pada `EmployeeService.cs`, saat memperbarui Manager, ada metode `CheckCircularReferenceAsync` yang menelusuri ke atas menggunakan loop untuk memastikan manajer yang dipilih bukan karyawan itu sendiri atau sub-ordinatnya.
- **Audit Trail**: Menggunakan *override* `SaveChangesAsync()` pada `EmsDbContext`. Memeriksa `ChangeTracker`, membandingkan `OriginalValues` dan `CurrentValues`, lalu mencatatnya ke entitas `AuditLog` dalam format JSON string (`OldValue` & `NewValue`).
- **Dokumen Karyawan**: Entitas `EmployeeDocument` menyimpan URL atau path fisik untuk lampiran (seperti KTP, Kontrak).

## 6. Modul Cuti (Leave Management)
- **Filter Berbasis Gender**: Entitas `LeaveType` memiliki properti `EligibleGender` (opsional). Pada saat inisialisasi saldo (`DataSeeder`), saldo (LeaveBalance) untuk "Cuti Melahirkan" hanya diberikan kepada perempuan, dan "Cuti Ayah" hanya untuk laki-laki.
- **State Machine**: Status persetujuan cuti (`Pending`, `Approved`, `Rejected`).
- **Approval Workflow**: Cuti di-approve oleh Manager, tercatat di `LeaveRequest.ApprovedBy`. Dapat menyisipkan alasan penolakan.

## 7. Modul Absensi (Attendance & Shift)
- **Geofencing**: Menggunakan algoritma *Haversine* untuk memastikan kordinat clock-in/out berada dalam `RadiusMeters` dari `OfficeLocation`.
- **Shift Rotasi (Info)**: Mendukung rotasi shift kompleks (Grup, Pattern mingguan) dan override jadwal manual.

## 8. Dashboard
- Meringkas `Active Employees`, `Pending Leaves`, `Departments` dari data agregasi.
- Menggunakan `Recharts` di frontend untuk menampilkan diagram batang/garis (misal tren absensi).

## 9. Frontend
- **Routing**: React Router DOM v6.
- **State Management**: TanStack Query (fetching, caching, mutation) dan Zustand (auth).
- **Form**: `react-hook-form` divalidasi dengan `zod`.
- **Komponen Visual**: Berbasis Radix UI dan Tailwind CSS. Menampilkan *Toasts* (menggunakan Sonner). Layout memiliki sidebar navigasi yang difilter oleh status `hasPermission`.

## 10. CI/CD & Testing
- Memiliki `.github/workflows/ci.yml` untuk build dan run test.
- `EMS.Tests` berisi xUnit tests untuk fungsionalitas Service (AuthService, LeaveService).
- Dockerfiles siap untuk deployment ke environment production (Alpine base image).
