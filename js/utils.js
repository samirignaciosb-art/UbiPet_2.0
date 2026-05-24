// js/auth.js — Autenticación UbiPet 2.0

import { supabase } from './supabase.js'
import { state, showToast, initTheme } from './utils.js'

// ── RENDER AUTH ──
function renderAuth() {
  const el = document.getElementById('auth-content')
  if (!el) return
  el.innerHTML = `
<div class="auth-tabs">
  <button class="auth-tab active" id="tab-login" onclick="authTab('login')">Entrar</button>
  <button class="auth-tab" id="tab-register" onclick="authTab('register')">Crear cuenta</button>
</div>

<!-- LOGIN -->
<div class="auth-panel active" id="panel-login">
  <div class="field">
    <label>Email</label>
    <input id="login-email" type="email" placeholder="tu@email.com" autocomplete="email">
  </div>
  <div class="field">
    <label>Contraseña</label>
    <input id="login-pass" type="password" placeholder="••••••••" autocomplete="current-password">
  </div>
  <label class="check-row">
    <input id="login-remember" type="checkbox"> Mantener sesión
  </label>
  <button class="btn-primary btn-auth" onclick="doLogin()">Entrar →</button>
  <button class="btn-ghost" onclick="showForgot()">¿Olvidaste tu contraseña?</button>
  <div class="divider">o</div>
  <button id="btn-google" onclick="doLoginGoogle()" style="width:100%;padding:13px 20px;background:var(--surface);border:1.5px solid var(--border-strong);border-radius:var(--r);font-family:'Sora',sans-serif;font-size:14px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;color:var(--ink)">
    <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
    Continuar con Google
  </button>
</div>

<!-- REGISTRO -->
<div class="auth-panel" id="panel-register">
  <div class="field">
    <label>Email</label>
    <input id="reg-email" type="email" placeholder="tu@email.com" autocomplete="email">
  </div>
  <div class="field">
    <label>Contraseña</label>
    <input id="reg-pass" type="password" placeholder="Mínimo 6 caracteres" autocomplete="new-password">
  </div>
  <div class="field">
    <label>Código de placa UbiPet</label>
    <input id="reg-placa" type="text" placeholder="Ej: UBI-K7X2M9" style="text-transform:uppercase">
  </div>
  <button class="btn-primary btn-auth" onclick="doRegister()">Crear cuenta →</button>
</div>
`
}

// ── TAB SWITCH ──
window.authTab = function(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'))
  document.querySelectorAll('.auth-panel').forEach(p => p.classList.remove('active'))
  document.getElementById('tab-' + tab)?.classList.add('active')
  document.getElementById('panel-' + tab)?.classList.add('active')
}

// ── LOGIN ──
window.doLogin = async function() {
  const email = document.getElementById('login-email')?.value.trim()
  const pass  = document.getElementById('login-pass')?.value
  const remember = document.getElementById('login-remember')?.checked
  if (!email || !pass) { showToast('Completa todos los campos', 'err'); return }
  setLoadingAuth(true)
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass })
    if (error) throw error
    if (remember) localStorage.setItem('ubipet_persist', '1')
    else localStorage.removeItem('ubipet_persist')
    setLoadingAuth(false)
    await boot(data.user)
  } catch (e) {
    showToast(authError(e.message), 'err')
    setLoadingAuth(false)
  }
}

// ── REGISTRO ──
window.doRegister = async function() {
  const email = document.getElementById('reg-email')?.value.trim()
  const pass  = document.getElementById('reg-pass')?.value
  const placa = document.getElementById('reg-placa')?.value.trim().toUpperCase()
  if (!email || !pass) { showToast('Completa email y contraseña', 'err'); return }
  if (pass.length < 6) { showToast('Contraseña mínimo 6 caracteres', 'err'); return }
  if (!placa) { showToast('Ingresa el código de tu placa', 'err'); return }
  setLoadingAuth(true)
  try {
    const { data: placaData, error: placaErr } = await supabase
      .from('placas').select('id,estado').eq('codigo', placa).maybeSingle()
    if (placaErr || !placaData) { showToast('Código de placa no válido', 'err'); return }
    if (placaData.estado === 'activa') { showToast('Esa placa ya está en uso', 'err'); return }
    const { data, error } = await supabase.auth.signUp({ email, password: pass })
    if (error) throw error
    sessionStorage.setItem('placa_pendiente', placa)
    showToast('¡Cuenta creada! Revisa tu email para confirmar.', 'ok', 5000)
  } catch (e) {
    showToast(authError(e.message), 'err')
  } finally {
    setLoadingAuth(false)
  }
}

// ── LOGOUT ──
export async function doLogout() {
  // Desconectar OneSignal
  try {
    if (window.OneSignalDeferred) {
      window.OneSignalDeferred.push(async function(OneSignal) {
        await OneSignal.logout()
      })
    }
  } catch(e) {}

  state.user = null
  state.mascotas = []
  state.mascotaActual = null
  state.isAdmin = false
  sessionStorage.clear()
  localStorage.removeItem('ubipet_persist')
  await supabase.auth.signOut()
  document.getElementById('app')?.classList.add('hidden')
  document.getElementById('auth-screen')?.classList.remove('hidden')
  renderAuth()
}

// ── BOOT (tras login exitoso) ──
async function boot(user) {
  // Verificar si es admin
  const { data: adminData } = await supabase
    .from('admins').select('rol,activo').eq('email', user.email).maybeSingle()
  state.isAdmin = !!(adminData?.activo)

  // Disparar evento para el resto de la app
  window.dispatchEvent(new CustomEvent('ubipet:login', { detail: user }))

  // FIX: Inicializar OneSignal directamente aquí en lugar de esperar el evento
  // Esto evita el problema de timing donde pwa.js aún no había registrado el listener
  iniciarOneSignal(user.id)
}

// ── ONESIGNAL: vincular user_id ──
// Se llama directo desde boot() para evitar race conditions con defer
function iniciarOneSignal(userId) {
  if (!window.OneSignalDeferred) {
    // SDK aún no cargó — reintentar en 2s
    setTimeout(() => iniciarOneSignal(userId), 2000)
    return
  }

  window.OneSignalDeferred.push(async function(OneSignal) {
    try {
      // Pedir permiso
      await OneSignal.Notifications.requestPermission()
      const granted = OneSignal.Notifications.permission
      if (!granted) return

      // Vincular user_id como External ID
      const currentExtId = await OneSignal.User.getExternalId()
      if (currentExtId !== userId) {
        await OneSignal.login(userId)
        console.log('✅ OneSignal vinculado:', userId)
      }
    } catch(e) {
      console.warn('OneSignal error:', e)
    }
  })
}

// ── INIT AUTH ──
export async function initAuth() {
  renderAuth()

  if (localStorage.getItem('ubipet_persist')) {
    const { data } = await supabase.auth.getSession()
    if (data?.session?.user) {
      await boot(data.session.user)
      return
    }
  }

  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user?.app_metadata?.provider === 'google') {
      await boot(session.user)
    }
  })
}

// ── GOOGLE OAUTH ──
window.doLoginGoogle = async function() {
  const btn = document.getElementById('btn-google')
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner spinner-sm"></span> Conectando...' }
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin }
  })
  if (error) {
    showToast(error.message, 'err')
    if (btn) { btn.disabled = false; btn.innerHTML = googleBtnHTML() }
  }
}

supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' && session?.user?.app_metadata?.provider === 'google') {
    await boot(session.user)
  }
})

function googleBtnHTML() {
  return `<svg width="18" height="18" viewBox="0 0 48 48" style="flex-shrink:0">
<path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
<path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
<path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
<path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
</svg> Continuar con Google`
}

// ── FORGOT PASSWORD ──
window.showForgot = function() {
  const email = document.getElementById('login-email')?.value.trim()
  const dest = email || prompt('Ingresa tu email:')
  if (!dest) return
  supabase.auth.resetPasswordForEmail(dest, {
    redirectTo: 'https://app.ubipet.shop/reset-password.html'
  }).then(() => showToast('Email de recuperación enviado ✓', 'ok', 4000))
    .catch(() => showToast('Error al enviar email', 'err'))
}

// ── HELPERS ──
function setLoadingAuth(v) {
  document.querySelectorAll('.btn-auth').forEach(b => {
    if (!b.dataset.orig) b.dataset.orig = b.textContent
    b.disabled = v
    b.textContent = v ? 'Cargando...' : b.dataset.orig
  })
}

function authError(msg = '') {
  if (msg.includes('Invalid login')) return 'Email o contraseña incorrectos'
  if (msg.includes('Email not confirmed')) return 'Confirma tu email antes de entrar'
  if (msg.includes('already registered')) return 'Ese email ya tiene una cuenta'
  if (msg.includes('weak')) return 'Contraseña muy débil'
  return 'Error de conexión'
}
