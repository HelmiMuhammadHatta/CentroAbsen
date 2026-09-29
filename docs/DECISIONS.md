# Keputusan Arsitektur dan Bisnis (ADR)

## Mitigasi Mock Location pada PWA
**Konteks**: PWA tidak memiliki akses langsung ke native API perangkat secara mendalam sehingga tidak bisa mendeteksi penggunaan *mock location* secara andal.
**Keputusan**: Kami tidak memblokir di sisi aplikasi terkait mock location secara mutlak.
**Mitigasi**:
1. Menggunakan foto langsung (*live camera*).
2. Mencocokkan waktu *client* dengan waktu *server*. Jika selisih > 2 menit, diberikan *flag* `jam_perangkat_tidak_sinkron`.
3. Memastikan akurasi GPS di bawah 100 meter. Jika akurasi antara 50-100 meter, diberi *flag* `akurasi_rendah`.
4. Mengandalkan tinjauan manual oleh HR jika *flag-flag* di atas bermunculan.
## Keputusan HRIS Terpadu  
Mengadopsi arsitektur 'satu login, satu aplikasi' untuk semua peran. Hak approval hanya bersifat tambahan (capabilities) dari peran reguler Karyawan, sehingga tidak perlu antarmuka atau domain yang terpisah. 
