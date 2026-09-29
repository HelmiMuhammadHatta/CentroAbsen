# Pemetaan Penyelarasan CentroAbsen terhadap Referensi EMS-Portal

Dokumen ini memetakan bagaimana CentroAbsen akan diselaraskan dengan referensi EMS-Portal berdasarkan instruksi **TAHAP R2**, sambil mempertahankan fitur khas CentroAbsen.

## 1. Pemetaan Entitas (Database Schema)

| Model Referensi (EMS) | Saat Ini di CentroAbsen | Status Refactor | Catatan / Keputusan |
| :--- | :--- | :--- | :--- |
| **User & Employee** | `User` (digabung) | **Diubah** | Tetap digabung di `User` (1 login). Tambah kolom `department_id`, `position_id`, `gender` (untuk filter cuti). |
| **Role & Permission** | Enum `Role` | **Ditambah & Diubah** | Hapus enum `Role`. Buat entitas `Role`, `Permission`, dan `RolePermission` (M:N). Seed default roles (termasuk CEO/Executive). |
| **Department** | `Division` | **Diganti** | Rename model `Division` menjadi `Department`. |
| **Position** | Belum ada | **Ditambah** | Buat model `Position` (id, name, level, department_id). Relasikan dengan `User`. |
| **Manager Hierarchy** | `User.manager_id` | **Diubah (Validasi)** | Tetap di `User.manager_id`. Tambah fungsi/validasi CTE atau iteratif pencegah *circular reference* saat update. |
| **EmployeeDocument** | Belum ada | **Ditambah** | Model baru (KTP, Ijazah, Kontrak) khusus akses HR/Admin. Menyimpan URL/path `FileStorage`. |
| **AuditLog** | `AuditLog` (dasar) | **Diubah** | Perkaya dengan field `old_values`, `new_values` (JSON), `action_type`. Integrasikan via Prisma Middleware/Extension agar otomatis. |
| **LeaveType** | `LeaveType` | **Diubah** | Tambah kolom `eligible_gender` (opsional) untuk batasan gender (mis. Cuti Melahirkan). |
| **LeaveRequest** | `LeaveRequest` | **Tetap** | Tetap pakai. Alur persetujuan mengacu pada *permission* approver. |
| **FinanceRequest** | `FinanceRequest` | **Khas CentroAbsen** | Tetap dipertahankan dengan alur persetujuan berjenjang: Atasan -> CEO -> Keuangan. |
| **Attendance** | `Attendance` | **Khas CentroAbsen** | Tetap pakai fitur foto, GPS, dan `work_mode` (Kantor/WFH/WFA). Shift rotasi ditunda, pakai jadwal statis terpusat di fase 1. |

## 2. Pemetaan RBAC dan Permission
Kita menggunakan struktur *resource.action* mengikuti konvensi referensi.
- **Roles Default**: `Employee`, `Manager`, `Finance`, `Executive` (CEO), `HrAdmin`.
- **Katalog Permission Utama**:
  - **Employee**: `employee.read.self`, `employee.read.team`, `employee.read.all`, `employee.write`, `employee.delete`.
  - **Department & Position**: `department.read`, `department.write`, `position.read`, `position.write`.
  - **Attendance**: `attendance.checkin`, `attendance.read.self`, `attendance.read.team`, `attendance.read.all`.
  - **Leave**: `leave.request`, `leave.read.self`, `leave.read.team`, `leave.read.all`, `leave.approve.manager`, `leave.approve.hr`.
  - **Finance (Khas)**: `finance.request`, `finance.approve.manager`, `finance.approve.executive` (CEO), `finance.disburse` (Keuangan).
  - **Admin & Dokumen**: `document.read`, `document.write`, `audit.read`, `role.manage`, `settings.manage`.

## 3. Alur Autentikasi dan Keamanan
- **Referensi**: Token JWT dan *refresh token* disimpan di `localStorage` frontend (rentan XSS).
- **CentroAbsen**: Token akan disimpan secara aman di **HttpOnly Cookies** (dengan `SameSite=Lax/Strict` dan CSRF token terpisah). Endpoint `/me` akan mengembalikan profil beserta array `roles` dan `permissions` saat ini untuk guard frontend.
- Backend memvalidasi via Express Middleware atau Zod berdasar permission, tidak di-hardcode ke role. (e.g. `requirePermission('finance.approve.executive')`).

## 4. Pemetaan Layar Frontend (Route & Layout)
- **Struktur**: Mengadopsi tata letak EMS-Portal (Sidebar navigasi dinamis, Topbar sapaan/profil).
- **Daftar Halaman**:
  - `/dashboard`: Ringkasan analitik berdasar level akses (statistik perusahaan vs pribadi).
  - `/employees`: Daftar karyawan, CRUD posisi & departemen, manajemen dokumen (hanya HR/Admin).
  - `/attendance`: Rekap kehadiran, tombol clock-in (khas), riwayat.
  - `/leaves`: Pengajuan cuti, inbox persetujuan manajer/HR.
  - `/finance`: Pengajuan reimbursement, inbox persetujuan berlapis (Manajer, CEO, Keuangan).
  - `/settings`: Manajemen role, permission, pengaturan hari libur, dll.

## 5. Daftar Konflik & Keputusan Default
1. **Konflik Enum Role (Lama) vs Tabel Role (Baru)**: Prisma saat ini memakai `enum Role`. **Keputusan**: Migrasi akan menghapus kolom enum role lama di `User`, membuat tabel `Role` dan `RolePermission`, lalu mengisi (seeding) role default kepada user berdasarkan nama peran lamanya tanpa kehilangan data log masuk.
2. **Hierarki Keuangan dan CEO**: Referensi tidak memiliki alur keuangan berlapis. **Keputusan**: Kotak masuk persetujuan akan menjadi satu halaman `/approvals` yang terpadu, dirender sesuai *permission* (jika punya `leave.approve.manager`, muncul tab cuti; jika punya `finance.approve.executive`, muncul tab keuangan CEO).
3. **Keterbatasan Prisma & Circular Reference**: Prisma sulit mengeksekusi rekursif mendalam. **Keputusan**: Pengecekan *circular reference* akan menggunakan kueri raw SQL CTE rekursif (MariaDB 11.4 mendukung CTE) atau iterasi aman maksimum N=10 kedalaman pada Node.js saat *update* manager.
4. **Shift Rotasi**: **Keputusan**: Ditunda sepenuhnya (Fase 2). Jam kerja statis (08.00 - 17.00).
5. **Autentikasi (JWT Size)**: Jika permission sangat banyak, JWT bisa besar. **Keputusan**: JWT (dalam cookie) hanya menyimpan `userId` dan *session ID*. Validasi *permission* dilakukan dengan me-lookup session/role di database atau Redis/memcache (Fase 1: *in-memory* atau hit cepat di backend).

---

> **PENTING**: Implementasi (refactor Prisma, Backend, Frontend) akan **DITAHAN/BERHENTI** di sini. Harap review tabel pemetaan dan keputusan di atas. Berikan izin "LANJUTKAN" jika Anda setuju dengan skema di atas, atau berikan revisi sebelum kueri besar dijalankan.
