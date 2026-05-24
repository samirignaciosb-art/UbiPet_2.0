// js/pwa.js — Service Worker + OneSignal Web Push

const ONESIGNAL_APP_ID = '1b8b8929-1708-4c8e-a15a-87ed2d6a212a'

// ── 1. Registrar Service Worker propio de UbiPet ──
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('✅ UbiPet SW registrado:', reg.scope))
      .catch(err => console.warn('❌ SW error:', err))
  })
}

// ── 2. Inicializar OneSignal ──
window.OneSignalDeferred = window.OneSignalDeferred || []

OneSignalDeferred.push(async function(OneSignal) {
  await OneSignal.init({
    appId: ONESIGNAL_APP_ID,
    autoResubscribe: true,
    notifyButton: { enable: false },
    promptOptions: { slidedown: { enabled: false } }
  })
  console.log('✅ OneSignal inicializado')
})

// ── 3. Suscribir tras login ──
window.addEventListener('ubipet:login', async (e) => {
  const user = e.detail
  if (!user?.id) return
  OneSignalDeferred.push(async function(OneSignal) {
    try {
      await OneSignal.Notifications.requestPermission()
      if (!OneSignal.Notifications.permission) return
      await OneSignal.login(user.id)
      console.log('✅ OneSignal vinculado:', user.id)
    } catch (err) {
      console.warn('OneSignal error:', err)
    }
  })
})

// ── 4. Desconectar al logout ──
window.addEventListener('ubipet:logout', async () => {
  OneSignalDeferred.push(async function(OneSignal) {
    try { await OneSignal.logout() } catch (e) {}
  })
})
