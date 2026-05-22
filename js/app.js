// js/app.js — Orquestador principal UbiPet 2.0
import { initAuth, doLogout } from './auth.js'
import { initTheme, initNetwork, showToast, state } from './utils.js'

// ── RUTAS ──
const VIEWS = {
  perfil:    () => import('./views/perfil.js').then(m => m.renderPerfil),
  rescate:   () => import('./views/rescate.js').then(m => m.renderRescate),
  comunidad: () => import('./views/comunidad.js').then(m => m.renderComunidad),
  cuenta:    () => import('./views/cuenta.js').then(m => m.renderCuenta),
  admin:     () => import('./views/admin.js').then(m => m.renderAdmin),
}

// ── ROUTER ──
window.navigate = async function(view, params = {}) {
  const c = document.getElementById('main-content')
  if (!c) return

  // Cleanup si la vista anterior dejó algo
  if (c._cleanup) { c._cleanup(); c._cleanup = null }

  // Loader mientras carga la vista
  c.innerHTML = `<div class="view-loader">🐾</div>`

  const loader = VIEWS[view]
  if (!loader) { c.innerHTML = `<div class="view-empty">Vista no encontrada</div>`; return }

  try {
    const render = await loader()
    await render(c, params)
  } catch (err) {
    console.error('Error al cargar vista:', err)
    c.innerHTML = `<div class="view-empty">Error al cargar</div>`
  }
}

// ── MENÚ ──
window.toggleMenu = function() {
  document.getElementById('side-menu')?.classList.toggle('open')
  document.getElementById('menu-overlay')?.classList.toggle('open')
}

window.closeMenu = function() {
  document.getElementById('side-menu')?.classList.remove('open')
  document.getElementById('menu-overlay')?.classList.remove('open')
}

// ── LAUNCH APP (se llama desde auth.js tras login exitoso) ──
export function launchApp(user) {
  state.user = user

  document.getElementById('auth-screen')?.classList.add('hidden')
  document.getElementById('app')?.classList.remove('hidden')
  document.getElementById('menu-user-email').textContent = user.email || ''

  // Mostrar botón admin si corresponde
  if (state.isAdmin) {
    document.getElementById('menu-admin').style.display = 'flex'
  }

  initNetwork()

  // ── ONESIGNAL: vincular este dispositivo al dueño ──
  setTimeout(() => {
    window.initOneSignalUser?.(user.id)
  }, 1500)

  navigate('perfil')
}

// ── LOGOUT ──
window.doLogout = doLogout

// ── BOOT ──
document.addEventListener('DOMContentLoaded', () => {
  initTheme()
  initAuth()
  // Esperar CSS antes de mostrar
  if (document.body.classList.contains('css-ready')) {
    document.body.classList.add('ready')
  } else {
    document.querySelector('link[rel=stylesheet]').addEventListener('load', () => document.body.classList.add('ready'))
    setTimeout(() => document.body.classList.add('ready'), 500) // fallback
  }
})

// ── LOGIN EVENT ──
window.addEventListener('ubipet:login', e => launchApp(e.detail))
