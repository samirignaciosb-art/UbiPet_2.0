// js/pwa.js — Registro SW + OneSignal login UbiPet 2.0

// ── SERVICE WORKER ──
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('✅ UbiPet SW registrado:', reg.scope))
      .catch(err => console.log('❌ SW error:', err))
  })
}

// ── ONESIGNAL: vincular dueño tras login ──
// Se llama desde app.js después de que el usuario inicia sesión.
// Usa el user_id de Supabase como external_id para que OneSignal
// sepa a quién enviar la push cuando se escanea su placa.
window.initOneSignalUser = async function(userId) {
  try {
    await window.OneSignalDeferred?.push(async (OneSignal) => {
      // Pedir permiso de notificaciones (solo aparece 1 vez)
      const permission = await OneSignal.Notifications.permission
      if (!permission) {
        await OneSignal.Notifications.requestPermission()
      }

      // Vincular este dispositivo al user_id de Supabase
      await OneSignal.login(userId)
      console.log('✅ OneSignal vinculado a user:', userId)
    })
  } catch (err) {
    console.warn('OneSignal init error (no crítico):', err)
  }
}
