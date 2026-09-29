import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get('centroabsen_auth');
  
  if (!token) {
    redirect('/login');
  }

  // Jika sudah login (memiliki cookie), arahkan ke UI Absensi (Beranda Karyawan)
  redirect('/absen');
}
