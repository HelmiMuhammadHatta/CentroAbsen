# Celah dan Kelemahan pada Referensi EMS-Portal

Berdasarkan analisis repositori referensi EMS-Portal, ditemukan beberapa celah, kelemahan arsitektur, dan praktik keamanan yang sebaiknya tidak ditiru mentah-mentah saat membangun CentroAbsen:

## 1. Keamanan Autentikasi (JWT)
- **Token di Local Storage**: Aplikasi React EMS-Portal menyimpan token akses (JWT) dan *refresh token* di `localStorage` menggunakan `zustand/middleware` (`auth-storage`). Praktik ini rentan terhadap serangan Cross-Site Scripting (XSS). Disarankan CentroAbsen menggunakan *HttpOnly Cookies* untuk menyimpan kredensial sesi.
- **Kredensial Default Hardcoded**: Kredensial *Admin* (`admin@ems.local` / `Admin123!`) di-*seed* secara statis di dalam file `DataSeeder.cs` secara plain text pada instansiasi objek sebelum akhirnya dikirim (jika ini sistem sungguhan, kredensial ini sangat rentan). Sebaiknya menggunakan *environment variable* untuk kredensial default admin.

## 2. Validasi Circular Reference (Hierarki Karyawan)
- **Masalah Performa (N+1 Query)**: Validasi *circular reference* pada `EmployeeService.cs` (`CheckCircularReferenceAsync`) dilakukan dengan kueri berulang menggunakan loop `while` ke database (`FirstOrDefaultAsync`) untuk menelusuri ke atas dari *ManagerId*. Jika kedalaman hierarki sangat besar, ini akan memicu kueri database yang berlebihan (N+1 issue) secara skuensial. Disarankan menggunakan Common Table Expression (CTE) rekursif atau satu kueri *join* di sisi database (Prisma/MariaDB).

## 3. Penanganan RBAC (Role-Based Access Control)
- **Keamanan Payload JWT (Terlalu Gemuk)**: Menyimpan *seluruh* daftar permission dalam klaim `permissions` di dalam token JWT dapat memperbesar ukuran token (mencapai kilobyte), memperberat setiap HTTP request, dan memiliki risiko token truncation jika permission sangat banyak. Pada sistem skala besar, disarankan JWT hanya menyimpan `RoleID` atau kumpulan ID ringkas, lalu backend melakukan caching (seperti Redis) untuk mencocokkan permission di *middleware*.

## 4. Kelemahan Audit Trail
- **Deteksi Perubahan yang Kaku**: Implementasi Audit Trail pada *override* `SaveChangesAsync()` menangkap seluruh nilai *CurrentValues* dan membandingkannya dengan *OriginalValues* lalu menyimpannya sebagai JSON `OldValue` dan `NewValue`. Format ini rentan terhadap masalah *lazy loading* jika navigasi atau *shadow properties* ikut terseret ke dalam JSON.
- **Ukuran Tabel Audit**: Tidak adanya mekanisme retensi (auto-purge data audit lama) bisa menyebabkan pembengkakan pada ukuran database.

## 5. Kekurangan Validasi Domain
- Tidak ditemukan validasi idempotency pada request kritis (seperti clock-in/out dan apply cuti). Jika terjadi masalah jaringan, user berpotensi melakukan klik dua kali (double submit) yang akan memicu redudansi data di backend jika jedanya sepersekian milidetik.
- Tidak terlihat mekanisme proteksi *Rate Limiting* di level controller API untuk endpoint login atau absensi.

*(Dokumen ini bersifat referensi pencatatan celah dari repositori rujukan, dan dapat dijadikan panduan mitigasi saat implementasi)*
