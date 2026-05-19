// js/views/cuenta.js — Vista cuenta UbiPet 2.0
import { supabase } from '../supabase.js'
import { state, showToast, toggleTheme } from '../utils.js'

export async function renderCuenta(container) {
  const user = state.user
  container.innerHTML = `
    <style>
      .cuenta-section{background:var(--surface);border-radius:var(--r-lg);border:1px solid var(--border);overflow:hidden;margin-bottom:12px}
      .cuenta-row{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:1px solid var(--border);gap:12px}
      .cuenta-row:last-child{border-bottom:none}
      .cuenta-label{font-size:14px;font-weight:600;color:var(--ink)}
      .cuenta-sub{font-size:12px;color:var(--ink-muted);margin-top:2px}
      .cuenta-val{font-size:14px;color:var(--ink-muted)}
      .theme-btns{display:flex;gap:6px}
      .theme-btn{padding:7px 14px;border-radius:var(--r);border:1.5px solid var(--border-strong);background:transparent;font-family:'Sora',sans-serif;font-size:13px;font-weight:600;color:var(--ink-muted);cursor:pointer;transition:all 0.15s}
      .theme-btn.active{border-color:var(--clay);color:var(--clay);background:var(--clay-bg)}
    </style>

    <div style="padding:0 0 20px">
      <h2 style="font-family:'Fraunces',serif;font-size:24px;color:var(--ink);margin-bottom:4px">Mi cuenta</h2>
      <p class="text-muted">${user?.email || ''}</p>
    </div>

    <!-- CUENTA -->
    <div class="cuenta-section">
      <div class="sec-title" style="padding:16px 20px 4px;font-size:11px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:var(--ink-muted)">Cuenta</div>
      <div class="cuenta-row">
        <div><div class="cuenta-label">Email</div></div>
        <div class="cuenta-val">${user?.email || '—'}</div>
      </div>
      <div class="cuenta-row" style="cursor:pointer" onclick="window._cambiarContrasena()">
        <div><div class="cuenta-label">🔑 Cambiar contraseña</div></div>
        <span style="color:var(--ink-muted);font-size:12px">›</span>
      </div>
    </div>

    <!-- APARIENCIA -->
    <div class="cuenta-section">
      <div class="sec-title" style="padding:16px 20px 4px;font-size:11px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:var(--ink-muted)">Apariencia</div>
      <div class="cuenta-row">
        <div><div class="cuenta-label">Tema</div></div>
        <div class="theme-btns">
          <button class="theme-btn ${!localStorage.getItem('ubipet_theme') || localStorage.getItem('ubipet_theme')==='light' ? 'active' : ''}" onclick="window._setTema('light')">☀️ Claro</button>
          <button class="theme-btn ${localStorage.getItem('ubipet_theme')==='dark' ? 'active' : ''}" onclick="window._setTema('dark')">🌙 Oscuro</button>
        </div>
      </div>
    </div>

    <!-- NOTIFICACIONES -->
    <div class="cuenta-section">
      <div class="sec-title" style="padding:16px 20px 4px;font-size:11px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:var(--ink-muted)">Notificaciones</div>
      <div class="cuenta-row">
        <div>
          <div class="cuenta-label">🔔 Alertas de escaneo</div>
          <div class="cuenta-sub">Recibe una notificación cuando escaneen la placa de tu mascota</div>
        </div>
        <button id="btnActivarPush" class="btn-primary btn-sm" style="flex-shrink:0">Activar</button>
      </div>
      <div id="pushStatus" style="padding:0 20px 14px;font-size:13px;color:var(--ink-muted);display:none"></div>
    </div>

    <!-- LEGAL -->
    <div class="cuenta-section">
      <div class="cuenta-row" style="cursor:pointer" onclick="window.open('/privacidad.html','_blank')">
        <div class="cuenta-label">📄 Política de privacidad</div>
        <span style="color:var(--ink-muted);font-size:12px">›</span>
      </div>
      <div class="cuenta-row" style="cursor:pointer" onclick="window.open('/terminos.html','_blank')">
        <div class="cuenta-label">📋 Términos de uso</div>
        <span style="color:var(--ink-muted);font-size:12px">›</span>
      </div>
    </div>

    <!-- CERRAR SESIÓN -->
    <div style="text-align:center;padding:8px 0 24px">
      <button onclick="doLogout()" style="background:none;border:none;color:var(--error);font-size:14px;font-weight:600;cursor:pointer;font-family:'Sora',sans-serif;padding:12px">↩ Cerrar sesión</button>
    </div>

    <!-- MODAL CAMBIAR CONTRASEÑA -->
    <div id="modalPass" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:400;align-items:center;justify-content:center;backdrop-filter:blur(4px)">
      <div style="background:var(--surface);border-radius:var(--r-xl);padding:28px;width:min(380px,90vw);box-shadow:var(--shadow-lg)">
        <h3 style="font-family:'Fraunces',serif;font-size:20px;color:var(--ink);margin-bottom:20px">🔑 Cambiar contraseña</h3>
        <div id="alertPass" class="alert" style="margin:0 0 14px"></div>
        <div class="field"><label>Nueva contraseña</label><input type="password" id="passNueva" placeholder="Mínimo 6 caracteres" autocomplete="new-password"></div>
        <div class="field" style="margin-bottom:20px"><label>Repetir nueva contraseña</label><input type="password" id="passRepetir" placeholder="Repite la nueva contraseña" autocomplete="new-password"></div>
        <div style="display:flex;gap:10px">
          <button class="btn-ghost" style="flex:1" onclick="document.getElementById('modalPass').style.display='none'">Cancelar</button>
          <button class="btn-primary" style="flex:1" id="btnGuardarPass">Guardar →</button>
        </div>
      </div>
    </div>
  `

  // Push
  verificarEstadoPush()
  document.getElementById('btnActivarPush').addEventListener('click', activarPush)

  // Cambiar contraseña
  document.getElementById('btnGuardarPass').addEventListener('click', cambiarContrasena)
}

window._setTema = function(tema) {
  document.documentElement.setAttribute('data-theme', tema)
  localStorage.setItem('ubipet_theme', tema)
  document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'))
  document.querySelectorAll('.theme-btn').forEach(b => {
    if (b.textContent.includes(tema === 'light' ? '☀️' : '🌙')) b.classList.add('active')
  })
}

window._cambiarContrasena = function() {
  document.getElementById('modalPass').style.display = 'flex'
  setTimeout(() => document.getElementById('passNueva')?.focus(), 100)
}

async function cambiarContrasena() {
  const nueva = document.getElementById('passNueva')?.value
  const repetir = document.getElementById('passRepetir')?.value
  const alertEl = document.getElementById('alertPass')
  const showA = (msg, type='err') => { alertEl.textContent = msg; alertEl.className = `alert alert-${type} show` }
  if (!nueva || nueva.length < 6) return showA('Mínimo 6 caracteres')
  if (nueva !== repetir) return showA('Las contraseñas no coinciden')
  const btn = document.getElementById('btnGuardarPass')
  btn.disabled = true; btn.textContent = 'Guardando...'
  const { error } = await supabase.auth.updateUser({ password: nueva })
  btn.disabled = false; btn.textContent = 'Guardar →'
  if (error) return showA(error.message)
  showA('✅ Contraseña actualizada', 'ok')
  setTimeout(() => { document.getElementById('modalPass').style.display = 'none' }, 1500)
}

async function verificarEstadoPush() {
  const btn = document.getElementById('btnActivarPush')
  const status = document.getElementById('pushStatus')
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    btn.textContent = 'No disponible'; btn.disabled = true; return
  }
  if (Notification.permission === 'denied') {
    btn.textContent = 'Bloqueadas'; btn.disabled = true
    status.style.display = 'block'
    status.textContent = 'Las notificaciones están bloqueadas. Actívalas desde la configuración de tu navegador.'
    return
  }
  // Verificar si hay subscription real activa
  if (Notification.permission === 'granted') {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub) {
      btn.textContent = '✅ Activadas'; btn.disabled = true
      btn.style.background = 'var(--sage)'; status.style.display = 'block'
      status.textContent = 'Recibirás una notificación cuando escaneen la placa de tu mascota.'
      // Mostrar botón desactivar
      if (!document.getElementById('btnDesactivarPush')) {
        const btnDes = document.createElement('button')
        btnDes.id = 'btnDesactivarPush'
        btnDes.textContent = 'Desactivar'
        btnDes.style.cssText = 'margin-top:8px;background:none;border:none;color:var(--error);font-size:13px;font-weight:600;cursor:pointer;font-family:Sora,sans-serif;padding:4px 0;display:block'
        btnDes.addEventListener('click', desactivarPush)
        btn.parentNode.insertBefore(btnDes, btn.nextSibling)
      }
      return
    }
  }
  // Si no hay subscription, permitir activar
  btn.textContent = 'Activar'; btn.disabled = false
  btn.style.background = ''
}

async function activarPush() {
  const btn = document.getElementById('btnActivarPush')
  btn.disabled = true; btn.textContent = '⏳ Activando...'
  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      showToast('Permiso denegado', 'warn'); btn.disabled = false; btn.textContent = 'Activar'; return
    }
    const reg = await navigator.serviceWorker.ready
    const VAPID_KEY = 'BMAm5YGv7HElgfqxDhS8mw58mBM5CplRgnEym9uzMiPaQRrlYdyoqU58GVoLAwCYIAH2h_HsZyekSEoQEHgBO7M'
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_KEY)
    })
    await supabase.from('push_subscriptions').upsert({
      user_id: state.user.id,
      subscription: sub.toJSON()
    }, { onConflict: 'user_id' })
    showToast('✅ Notificaciones activadas')
    verificarEstadoPush()
  } catch(e) {
    showToast('Error al activar: ' + e.message, 'err')
    btn.disabled = false; btn.textContent = 'Activar'
  }
}

async function desactivarPush() {
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub) await sub.unsubscribe()
    // Eliminar de Supabase
    await supabase.from('push_subscriptions').delete().eq('user_id', state.user.id)
    document.getElementById('btnDesactivarPush')?.remove()
    showToast('Notificaciones desactivadas')
    await verificarEstadoPush()
  } catch(e) {
    showToast('Error al desactivar: ' + e.message, 'err')
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}
