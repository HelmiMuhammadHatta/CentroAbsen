import { format, formatDistanceToNow, differenceInMinutes } from 'date-fns';
import { id } from 'date-fns/locale';

export function formatIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatDate(date: string | Date, includeTime = false): string {
  const d = new Date(date);
  if (includeTime) {
    return format(d, "EEEE, dd MMMM yyyy HH:mm", { locale: id }) + ' WIB';
  }
  return format(d, "EEEE, dd MMMM yyyy", { locale: id });
}

export function formatTime(date: string | Date): string {
  return format(new Date(date), "HH:mm", { locale: id }) + ' WIB';
}

export function formatDistanceMeters(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDurationMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} menit`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} jam ${m} menit` : `${h} jam`;
}

export function formatRelativeTime(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: id });
}
