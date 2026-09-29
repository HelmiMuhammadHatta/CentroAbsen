# CentroAbsen — Prompt 9B (Revisi): Satu Aplikasi HRIS

Prompt ini **menggantikan Prompt 9B lama** di `centroabsen-prompt-lanjutan.md`. Urutan yang disarankan:

1. Prompt 8B (verifikasi nyata)
2. Prompt 9A (alur approval keuangan di backend)
3. **Prompt 9B revisi ini** (menggantikan 9B lama)
4. Prompt 10 (Swagger/OpenAPI)

## Apa yang diperbaiki

Halaman awal saat ini (localhost:3000) berisi pilihan "UI Absensi Kamera (Karyawan)" dan "UI Approval Panel (Atasan/Keuangan)" berikut komponen statis, karena backend/Docker belum menyala. Itu bukan aplikasi yang utuh. Yang kamu inginkan:

- **Satu aplikasi, satu login.** Approval adalah bagian dari aplikasi HRIS yang sama dengan absensi.
- Siapa pun yang punya tugas approval (Atasan, CEO, Keuangan, HR) cukup login lewat aplikasi absensi, lalu menu persetujuan muncul sesuai hak aksesnya.
- Setiap pengguna tetap seorang karyawan yang bisa absen dan mengajukan cuti/dana; hak approval hanya **menambah** menu, bukan menggantinya.

## Catatan menjalankan di Windows

Docker Desktop harus menyala agar `docker compose up` berjalan. Prompt di bawah juga meminta mode alternatif tanpa Docker (MariaDB terpasang langsung di Windows) supaya pengembangan tidak berhenti di layar statis.

---

```
Baca AGENTS.md, docs/PRD.md, docs/UI-SPEC.md, dan docs/DECISIONS.md. Kerjakan TAHAP 9B (REVISI, menggantikan 9B lama): satukan seluruh fungsi menjadi SATU aplikasi HRIS bernama CentroAbsen dengan satu login, satu shell, dan menu yang menyesuaikan hak akses. Backend alur baru pengajuan keuangan (Karyawan -> Atasan -> CEO -> Keuangan/pencairan) dari Tahap 9A sudah tersedia. Fase 1 tetap tanpa payroll, slip gaji, pajak, BPJS, lembur, fingerprint, dan shift.

MASALAH YANG DIPERBAIKI
Root aplikasi (localhost:3000) saat ini menampilkan halaman "Pilih modul antarmuka" dengan dua tombol terpisah (UI Absensi Kamera dan UI Approval Panel) dan komponen statis. Ini salah. Hapus halaman itu dan semua layar/komponen statis atau data palsu di frontend. Aplikasi harus selalu memakai API sungguhan.

1. LINGKUNGAN DAN PENGHAPUSAN MOCK
- "/" mengarahkan ke /login bila belum masuk, atau ke Beranda bila sudah masuk. Tidak ada halaman pemilih modul.
- Jika backend tidak terjangkau, tampilkan error state yang jelas ("Server tidak dapat dihubungi, coba lagi") dengan tombol coba lagi, BUKAN data palsu atau layar statis.
- Pastikan pengembangan bisa berjalan dengan dua cara, dan dokumentasikan keduanya di README (termasuk untuk Windows): (a) docker compose up; (b) tanpa Docker: MariaDB terpasang lokal, DATABASE_URL di .env, lalu pnpm dev untuk api dan web, disertai skrip migrate dan seed. Sediakan .env.example yang lengkap.

2. MODEL AKSES: SEMUA ORANG ADALAH KARYAWAN, HAK APPROVAL BERSIFAT TAMBAHAN
- Endpoint GET /api/v1/me mengembalikan daftar kemampuan (permissions) pengguna, misalnya: isManager (punya bawahan langsung atau berperan Atasan), canApprove dan jenis approval yang bisa dilakukan (cuti, keuangan), canDisburse (pencairan, peran Keuangan), isExecutive (CEO), isHr (HR/Admin).
- Frontend menentukan menu dan route guard dari kemampuan ini. Backend tetap sumber kebenaran: setiap endpoint memeriksa hak akses dan mengembalikan 403 bila tidak berhak.
- Semua peran (Atasan, CEO, Keuangan, HR) tetap bisa absen, melihat riwayat, dan mengajukan cuti/pengajuan keuangan sendiri.

3. SATU SHELL DENGAN MENU BERDASARKAN KEMAMPUAN
- Mobile: bottom navigation tetap 4 menu (Beranda, Riwayat, Pengajuan, Profil). Untuk approver, ikon Pengajuan menampilkan badge jumlah yang perlu tindakan, dan halaman Pengajuan memiliki segmented control "Pengajuan Saya" | "Perlu Persetujuan (n)" yang hanya muncul bagi approver.
- Desktop: SATU sidebar dengan grup menu yang hanya tampil jika berhak:
  - Saya: Beranda, Riwayat, Pengajuan, Profil (semua orang)
  - Persetujuan (dengan badge): Atasan, CEO, Keuangan, HR sesuai kemampuan
  - Tim: khusus Atasan (ringkasan kehadiran bawahan)
  - Pencairan: khusus Keuangan
  - Ringkasan Keuangan: khusus CEO
  - Administrasi HR: HR/Admin (Ringkasan, Absensi, Karyawan, Lokasi Kerja, Cuti, Laporan, Pengaturan)
- Beranda: tombol absen tetap tindakan utama (satu tombol saja). Untuk approver, di bawahnya tampil bagian "Perlu tindakan Anda" (maksimal 5 item dengan tautan "Lihat semua") yang mengarah ke Persetujuan.
- Setelah login: arahkan ke halaman tujuan semula (returnTo) bila ada, jika tidak ke Beranda. Notifikasi in-app menautkan langsung ke detail persetujuan; bila pengguna belum login, ia diarahkan ke login lalu kembali ke halaman itu.
- Pengguna tanpa hak yang membuka URL terlarang melihat halaman 403 yang ramah ("Anda tidak memiliki akses ke halaman ini") tanpa membocorkan data.

4. KOTAK MASUK PERSETUJUAN TERPADU
Backend:
- GET /api/v1/approvals/inbox: gabungan SEMUA tugas approval milik pengguna (cuti, pengajuan keuangan tahap Atasan/CEO, dan pencairan Keuangan) dengan filter tipe/status/anggota/tanggal dan pagination. Gunakan ulang logika endpoint per-modul yang sudah ada.
- GET /api/v1/approvals/inbox/count: jumlah yang perlu tindakan untuk badge (ringan, aman dipanggil saat aplikasi mendapat fokus).
- GET riwayat keputusan pengguna (yang sudah disetujui/ditolak/dicairkan olehnya).
Frontend:
- Satu halaman Persetujuan dengan tab "Perlu tindakan" dan "Riwayat keputusan", filter tipe (Semua, Cuti, Keuangan), detail di side panel pada desktop dan halaman detail pada mobile, berisi konteks lengkap: data pengajuan, lampiran (preview gambar/PDF), timeline, saldo cuti dan ringkasan absensi untuk cuti, riwayat pengajuan pemohon untuk keuangan.
- Aksi mengikuti langkah: Atasan/CEO -> "Setujui" dan "Tolak"; Keuangan pada langkah pencairan -> "Cairkan" (drawer form) dan "Tolak". Semua dengan dialog konfirmasi; alasan wajib saat menolak; tanpa bulk approval. Setelah bertindak, tampilkan toast dan perbarui daftar serta badge.

5. PENGAJUAN OLEH KARYAWAN (alur keuangan empat langkah)
- Timeline: Diajukan -> Atasan -> CEO -> Pencairan. Pratinjau timeline pada form mengikuti aturan server (langkah CEO tidak tampil bila nominal di bawah ambang).
- Badge status dengan label: "Menunggu Atasan", "Menunggu CEO", "Menunggu Pencairan", "Sudah Dicairkan", "Ditolak", "Dibatalkan"; status tetap terbaca lewat teks, bukan hanya warna.
- Detail pengajuan yang sudah dicairkan menampilkan tanggal pencairan, metode, dan nomor referensi. Tombol Batalkan hanya saat "Menunggu Atasan".
- Alur cuti tidak berubah (Diajukan -> Atasan -> HR bila diperlukan).

6. HALAMAN KHUSUS PERAN (semuanya berada di dalam shell yang sama)
- Tim (Atasan): ringkasan hadir, terlambat, tidak hadir, belum absen keluar bagi bawahan, dengan daftar anggota.
- Ringkasan Keuangan (CEO): jumlah dan nominal menunggu keputusan, disetujui bulan ini, ringkasan per kategori (sederhana, bukan dashboard penuh widget).
- Pencairan (Keuangan): tiga tab "Menunggu Pencairan", "Dicairkan", "Ditolak" dengan ringkasan nominal (menunggu pencairan, dicairkan bulan ini, ditolak bulan ini). Form "Cairkan" berisi tanggal (default hari ini, tidak boleh di masa depan), metode (Transfer, Tunai, Lainnya), nomor referensi, catatan, dan bukti transfer opsional; tampilkan ringkasan nominal dan konfirmasi sebelum kirim karena tindakan ini final. Tampilkan penanda "Diajukan oleh CEO" bila ada.
- Administrasi HR: seperti spesifikasi sebelumnya; Pengaturan ditambah: pilih CEO aktif, ambang nominal persetujuan CEO (0 = semua pengajuan wajib CEO, sertakan teks bantuan), dan penugasan ulang approver Atasan/CEO. Manajemen karyawan menambah pilihan peran "CEO".

7. DOKUMEN
- Perbarui docs/UI-SPEC.md: hapus pemisahan "UI Approval Panel"; gambarkan satu aplikasi HRIS dengan modul Absensi, Cuti, dan Pengajuan Dana, serta matriks menu per kemampuan.
- Perbarui docs/DECISIONS.md dengan keputusan "satu login, hak approval bersifat tambahan". Payroll dan modul HR lain tetap di luar scope.

8. TEST DAN SELESAI
- Unit test pemetaan kemampuan menjadi menu/route guard; test API untuk /me, inbox, count, dan pembatasan akses lintas peran.
- Playwright: (a) Karyawan biasa login, tidak melihat menu Persetujuan, dan URL /persetujuan menampilkan 403; (b) Atasan login lalu absen masuk, membuka Persetujuan, dan menyetujui cuti bawahan dari akun yang sama; (c) alur penuh pengajuan keuangan: karyawan mengajukan, atasan setuju, CEO setuju, Keuangan mencairkan, karyawan melihat "Sudah Dicairkan"; (d) penolakan oleh CEO dengan alasan yang terlihat pemohon; (e) deep link ke detail persetujuan saat belum login diarahkan ke login lalu kembali ke halaman itu.
- Jalankan lint, typecheck, seluruh test, dan buka aplikasi sungguhan di browser. Selesai bila: "/" menuju login, tidak ada halaman pemilih modul atau data statis, semua alur di atas berjalan dengan data dari API. Laporkan hasil test yang SEBENARNYA dan tandai jujur bagian yang belum teruji.
```
