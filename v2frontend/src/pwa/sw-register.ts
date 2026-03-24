import { registerSW } from 'virtual:pwa-register';


export function registerPWA() {
    const updateSW = registerSW({
        async onNeedRefresh() {
            console.log('Nueva versión detectada, actualizando...');
            updateSW(true);
            window.location.reload();
        },
        onOfflineReady() {
            console.log('App lista para trabajar offline');
        },
    });
}
