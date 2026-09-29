import { redirect } from 'next/navigation';

export default function Home() {
  // Dalam aplikasi nyata, periksa cookie auth di sini
  // Redirect ke /absen (Beranda Karyawan) secara default sebagai shell tunggal
  redirect('/absen');
}
