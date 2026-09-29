'use client';

import { useState, useEffect } from 'react';

export interface LocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  error: string | null;
  loading: boolean;
}

export function useLocation(enabled: boolean = true) {
  const [state, setState] = useState<LocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null,
    loading: enabled,
  });

  useEffect(() => {
    if (!enabled) return;

    if (!('geolocation' in navigator)) {
      setState(s => ({ ...s, error: 'Geolokasi tidak didukung di perangkat ini', loading: false }));
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setState({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          error: null,
          loading: false,
        });
      },
      (err) => {
        let msg = 'Gagal mendapatkan lokasi';
        if (err.code === err.PERMISSION_DENIED) msg = 'Izin lokasi ditolak, mohon aktifkan di pengaturan browser Anda.';
        if (err.code === err.POSITION_UNAVAILABLE) msg = 'Informasi lokasi tidak tersedia saat ini.';
        if (err.code === err.TIMEOUT) msg = 'Waktu permintaan lokasi habis.';
        
        setState(s => ({ ...s, error: msg, loading: false }));
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [enabled]);

  return state;
}
