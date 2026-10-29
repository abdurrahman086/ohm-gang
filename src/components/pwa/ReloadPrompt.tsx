import { useEffect } from 'react';
import { registerSW } from 'virtual:pwa-register';

// Daftarkan service worker (registerType: autoUpdate — update otomatis di background).
export function ReloadPrompt() {
  useEffect(() => {
    void registerSW({ immediate: true });
  }, []);

  return null;
}