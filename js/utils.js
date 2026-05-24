// js/utils.js — Estado global + helpers UbiPet 2.0

// ── ESTADO GLOBAL ──
export const state = {
  user:        null,   // objeto auth de Supabase
  mascotas:    [],     // array de perfiles
  mascotaActual: null, // perfil activo
  isOnline:    navigator.onLine,
}

// ── SUPABASE CLIENT ──
// Se importa desde supabase.js para centralizar la config
export { supabase } from './supabase.js'

// ── TOAST ──
export function showToast(msg, type = 'ok', dur = 2800) {
  const t = document.getElementById('toast')
  const i = document.getElementById('toast-icon')
  const m = document.getElementById('toast-msg')
  if (!t) return
  i.textContent = type === 'ok' ? '✓' : type === 'err' ? '✕' : '⚠'
  m.textContent = msg
  t.className = `toast show ${type}`
  clearTimeout(t._timer)
  t._timer = setTimeout(() => t.classList.remove('show'), dur)
}

// ── THEME ──
export function initTheme() {
  const saved = localStorage.getItem('ubipet_theme') || 'light'
  applyTheme(saved)
}

export function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme')
  applyTheme(current === 'dark' ? 'light' : 'dark')
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('ubipet_theme', theme)
  const meta = document.getElementById('theme-meta')
  if (meta) meta.content = theme === 'dark' ? '#1a1a1a' : '#ffffff'
}

// ── NETWORK ──
export function initNetwork() {
  const update = online => {
    state.isOnline = online
    if (online)  showToast('✓ Conexión restaurada')
    if (!online) showToast('Sin conexión', 'warn')
  }
  window.addEventListener('online',  () => update(true))
  window.addEventListener('offline', () => update(false))
}

// ── HELPERS ──
export function formatFecha(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function calcEdad(fechaNacimiento) {
  if (!fechaNacimiento) return null
  const hoy   = new Date()
  const nac   = new Date(fechaNacimiento + 'T00:00:00')
  const años  = hoy.getFullYear() - nac.getFullYear()
  const meses = hoy.getMonth() - nac.getMonth()
  if (años === 0) return `${meses < 0 ? 0 : meses} meses`
  if (meses < 0)  return `${años - 1} años`
  return `${años} año${años !== 1 ? 's' : ''}`
}

export function slugify(str) {
  return str.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]/g, '')
}
