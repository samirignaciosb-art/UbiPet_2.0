// js/pwa.js — Service Worker + OneSignal Web Push
// OneSignal maneja el permiso y la subscription del browser.
// Vinculamos el user_id de Supabase como External ID para poder
// enviar notificaciones solo al dueño cuando escanean su placa.

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
    // No mostrar el prompt automático — lo hacemos tras el login
    // para no asustar al usuario antes de que sepa para qué sirve
    autoResubscribe: true,
    notifyButton: { enable: false },
    promptOptions: {
      slidedown: {
        enabled: false,
      }
    }
  })

  console.log('✅ OneSignal inicializado')
})

// ── 3. Vincular user_id tras login ──
// auth.js dispara 'ubipet:login' con el user como detail
window.addEventListener('ubipet:login', async (e) => {
  const user = e.detail
  if (!user?.id) return

  OneSignalDeferred.push(async function(OneSignal) {
    try {
      // Pedir permiso de notificaciones (solo aparece si no se ha dado antes)
      await OneSignal.Notifications.requestPermission()

      const granted = OneSignal.Notifications.permission
      if (!granted) {
        console.log('OneSignal: permiso no concedido')
        return
      }

      // Vincular el user_id de Supabase como External ID de OneSignal
      // Esto permite enviar notificaciones solo a este usuario específico
     await OneSignal.login(userId)
        console.log('✅ OneSignal: External ID vinculado:', user.id)
      } else {
        console.log('✅ OneSignal: External ID ya estaba vinculado')
      }

    } catch (err) {
      console.warn('OneSignal error:', err)
    }
  })
})

// ── 4. Desvincular al hacer logout ──
window.addEventListener('ubipet:logout', async () => {
  OneSignalDeferred.push(async function(OneSignal) {
    try {
      await OneSignal.logout()
      console.log('✅ OneSignal: sesión cerrada')
    } catch (err) {
      console.warn('OneSignal logout error:', err)
    }
  })
})
