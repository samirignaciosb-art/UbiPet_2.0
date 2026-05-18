// js/views/comunidad.js — Vista comunidad UbiPet 2.0
import { supabase } from '../supabase.js'
import { state, showToast } from '../utils.js'

const MAPBOX_TOKEN = 'pk.eyJ1IjoidWJpcGV0IiwiYSI6ImNtcGJrZnZ2MDA4Y2syd3E0aXNhNmRkNGcifQ.O-7PpD3CVp_OpgZzhMcYNQ'

const TIPOS = {
  perdida:     { emoji: '🐕', label: 'Mascota perdida',   color: '#FF3B30' },
  encontrada:  { emoji: '🐾', label: 'Mascota encontrada', color: '#34C759' },
  peligro:     { emoji: '⚠️', label: 'Zona peligrosa',    color: '#FF9500' },
  parque:      { emoji: '🌿', label: 'Parque recomendado', color: '#30B0C7' },
  atropello:   { emoji: '🚗', label: 'Atropello',          color: '#FF2D55' },
  veneno:      { emoji: '💊', label: 'Cebo envenenado',    color: '#AF52DE' },
  veterinaria: { emoji: '🏥', label: 'Veterinaria abierta', color: '#5AC8FA' },
  bebedero:    { emoji: '🚿', label: 'Bebedero/aguatero',  color: '#007AFF' },
}

let map = null
let reportes = []
let markers = []
let userLat = -33.4569, userLng = -70.6483 // Santiago por defecto

export async function renderComunidad(container) {
  container.innerHTML = `
    <style>
      /* MAPA */
      #mapaWrap { position:relative; height:calc(100vh - 120px); min-height:380px; border-radius:var(--r-xl); overflow:hidden; margin-bottom:12px; box-shadow:var(--shadow); }
      #mapa { width:100%; height:100%; }

      /* CONTROLES SOBRE EL MAPA */
      .mapa-top { position:absolute; top:12px; left:12px; right:12px; z-index:10; display:flex; gap:8px; align-items:flex-start; }
      .filtros-scroll { display:flex; gap:6px; overflow-x:auto; flex:1; padding-bottom:2px; scrollbar-width:none; }
      .filtros-scroll::-webkit-scrollbar { display:none; }
      .filtro-btn { flex-shrink:0; padding:7px 12px; border-radius:var(--r-full); font-family:'Sora',sans-serif; font-size:12px; font-weight:600; border:none; cursor:pointer; background:rgba(255,255,255,0.92); color:var(--ink); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); box-shadow:var(--shadow-sm); transition:all 0.15s; white-space:nowrap; }
      .filtro-btn.active { background:var(--clay); color:white; }
      .btn-mi-ubicacion { flex-shrink:0; width:38px; height:38px; border-radius:50%; border:none; background:rgba(255,255,255,0.92); backdrop-filter:blur(8px); font-size:18px; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:var(--shadow-sm); transition:all 0.15s; }
      .btn-mi-ubicacion:hover { transform:scale(1.08); }

      /* FAB REPORTAR */
      .fab { position:absolute; bottom:16px; right:16px; z-index:10; width:52px; height:52px; border-radius:50%; background:var(--clay); border:none; color:white; font-size:24px; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:var(--shadow-clay); transition:all 0.2s var(--ease-spring); }
      .fab:hover { transform:scale(1.08); }
      .fab:active { transform:scale(0.95); }
      .fab-pro { background:var(--surface-2); color:var(--ink-muted); cursor:default; }

      /* MARCADORES */
      .marker-wrap { cursor:pointer; transition:transform 0.15s; }
      .marker-wrap:hover { transform:scale(1.15); }
      .marker-bubble { width:38px; height:38px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:18px; border:2.5px solid white; box-shadow:0 2px 8px rgba(0,0,0,0.25); }
      .marker-pulse { position:absolute; inset:-4px; border-radius:50%; border:2px solid; opacity:0.4; animation:markerPulse 1.5s ease-out infinite; }
      @keyframes markerPulse { 0%{transform:scale(1);opacity:0.4} 100%{transform:scale(1.6);opacity:0} }

      /* POPUP */
      .popup-card { background:var(--surface); border-radius:var(--r-lg); padding:0; overflow:hidden; width:260px; box-shadow:var(--shadow-lg); border:1px solid var(--border); }
      .popup-foto { width:100%; height:120px; object-fit:cover; display:block; }
      .popup-body { padding:12px 14px 14px; }
      .popup-tipo { font-size:11px; font-weight:700; letter-spacing:0.07em; text-transform:uppercase; margin-bottom:4px; }
      .popup-desc { font-size:13px; color:var(--ink-soft); line-height:1.5; margin-bottom:8px; }
      .popup-meta { font-size:11px; color:var(--ink-muted); display:flex; align-items:center; gap:6px; }
      .popup-mascota { display:flex; align-items:center; gap:6px; margin-bottom:6px; }
      .popup-av { width:24px; height:24px; border-radius:50%; object-fit:cover; }

      /* SHEET REPORTAR */
      .sheet-overlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.4); z-index:300; backdrop-filter:blur(2px); }
      .sheet-overlay.open { display:block; }
      .sheet-r { position:fixed; bottom:0; left:0; right:0; background:var(--surface); border-radius:24px 24px 0 0; z-index:301; transform:translateY(100%); transition:transform 0.35s var(--ease); max-height:92vh; display:flex; flex-direction:column; box-shadow:0 -4px 40px rgba(0,0,0,0.15); }
      .sheet-r.open { transform:translateY(0); }
      .sheet-handle { width:36px; height:4px; background:var(--border-strong); border-radius:2px; margin:12px auto 0; flex-shrink:0; }
      .sheet-hdr { display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:1px solid var(--border); flex-shrink:0; }
      .sheet-body { overflow-y:auto; padding:16px 20px 40px; flex:1; }

      /* TIPO SELECTOR */
      .tipo-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:20px; }
      .tipo-item { display:flex; flex-direction:column; align-items:center; gap:5px; padding:12px 6px; border-radius:var(--r); border:1.5px solid var(--border-strong); background:var(--surface-2); cursor:pointer; transition:all 0.15s; }
      .tipo-item:hover { border-color:var(--clay-l); background:var(--clay-bg); }
      .tipo-item.selected { border-color:var(--clay); background:var(--clay-bg); }
      .tipo-emoji { font-size:22px; }
      .tipo-label { font-size:10px; font-weight:600; color:var(--ink-muted); text-align:center; line-height:1.2; }
      .tipo-item.selected .tipo-label { color:var(--clay-d); }

      /* PRO OVERLAY */
      .pro-overlay { position:relative; }
      .pro-lock { position:absolute; inset:0; background:rgba(247,246,243,0.85); backdrop-filter:blur(4px); z-index:5; display:flex; flex-direction:column; align-items:center; justify-content:center; border-radius:var(--r-lg); gap:8px; padding:20px; text-align:center; }
      .pro-lock-icon { font-size:32px; }
      .pro-lock-title { font-family:'Fraunces',serif; font-size:18px; color:var(--ink); font-weight:700; }
      .pro-lock-sub { font-size:13px; color:var(--ink-muted); line-height:1.5; }

      /* FEED */
      .feed-item { display:flex; gap:12px; padding:14px 0; border-bottom:1px solid var(--border); }
      .feed-item:last-child { border-bottom:none; }
      .feed-icon { width:44px; height:44px; border-radius:50%; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:20px; border:2px solid white; box-shadow:var(--shadow-xs); }
      .feed-body { flex:1; min-width:0; }
      .feed-tipo { font-size:12px; font-weight:700; margin-bottom:2px; }
      .feed-desc { font-size:13px; color:var(--ink-soft); line-height:1.5; margin-bottom:4px; }
      .feed-meta { font-size:11px; color:var(--ink-muted); }
      .feed-foto { width:60px; height:60px; border-radius:var(--r); object-fit:cover; flex-shrink:0; cursor:pointer; }
    </style>

    <!-- MAPA -->
    <div id="mapaWrap">
      <div id="mapa"></div>
      <div class="mapa-top">
        <div class="filtros-scroll" id="filtrosScroll">
          <button class="filtro-btn active" data-tipo="todos" onclick="window._filtrar('todos')">🗺️ Todos</button>
          ${Object.entries(TIPOS).map(([k,v]) =>
            `<button class="filtro-btn" data-tipo="${k}" onclick="window._filtrar('${k}')">${v.emoji} ${v.label}</button>`
          ).join('')}
        </div>
        <button class="btn-mi-ubicacion" onclick="window._irMiUbicacion()" title="Mi ubicación">📍</button>
      </div>
      <button class="fab ${state.user?.es_pro ? '' : 'fab-pro'}" id="fabReportar" onclick="window._abrirReportar()" title="${state.user?.es_pro ? 'Reportar' : 'Función Pro'}">
        ${state.user?.es_pro ? '＋' : '🔒'}
      </button>
    </div>

    <!-- FEED -->
    <div class="card" style="padding:0">
      <div class="sec-title" style="padding:16px 20px 4px;font-size:11px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:var(--ink-muted)">Reportes recientes</div>
      <div id="feedLista" style="padding:0 20px"></div>
    </div>

    <!-- SHEET REPORTAR -->
    <div id="sheetOverlayCom" class="sheet-overlay" onclick="window._cerrarReportar()"></div>
    <div id="sheetReportar" class="sheet-r">
      <div class="sheet-handle"></div>
      <div class="sheet-hdr">
        <div style="font-family:'Fraunces',serif;font-size:18px;font-weight:700;color:var(--ink)">Nuevo reporte</div>
        <button class="icon-btn" onclick="window._cerrarReportar()">✕</button>
      </div>
      <div class="sheet-body" id="sheetBodyCom"></div>
    </div>

    <!-- LIGHTBOX -->
    <div id="lbCom" style="display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.88);align-items:center;justify-content:center" onclick="this.style.display='none'">
      <img id="lbComImg" src="" style="max-width:92vw;max-height:92vh;border-radius:var(--r-lg);object-fit:contain">
    </div>
  `

  cargarMapbox()
  await cargarReportes()
}

// ── MAPBOX ──
function cargarMapbox() {
  if (window.mapboxgl) { initMapa(); return }
  const css = document.createElement('link')
  css.rel = 'stylesheet'
  css.href = 'https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css'
  document.head.appendChild(css)
  const script = document.createElement('script')
  script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.js'
  script.onload = initMapa
  document.head.appendChild(script)
}

function initMapa() {
  mapboxgl.accessToken = MAPBOX_TOKEN
  map = new mapboxgl.Map({
    container: 'mapa',
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [userLng, userLat],
    zoom: 13,
    attributionControl: false
  })
  map.addControl(new mapboxgl.AttributionControl({ compact: true }))

  // Obtener ubicación real
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      userLat = pos.coords.latitude
      userLng = pos.coords.longitude
      map.flyTo({ center: [userLng, userLat], zoom: 14, duration: 1000 })
      // Punto de usuario
      new mapboxgl.Marker({ color: '#D08C61' })
        .setLngLat([userLng, userLat])
        .addTo(map)
    }, () => {}, { timeout: 8000 })
  }

  map.on('load', () => renderMarcadores())
}

// ── MARCADORES ──
function renderMarcadores(filtro = 'todos') {
  markers.forEach(m => m.remove())
  markers = []
  const lista = filtro === 'todos' ? reportes : reportes.filter(r => r.tipo === filtro)
  lista.forEach(r => {
    const tipo = TIPOS[r.tipo] || TIPOS.peligro
    const el = document.createElement('div')
    el.className = 'marker-wrap'
    el.style.position = 'relative'
    el.innerHTML = `
      <div class="marker-pulse" style="border-color:${tipo.color}"></div>
      <div class="marker-bubble" style="background:${tipo.color}">${tipo.emoji}</div>
    `
    el.addEventListener('click', () => mostrarPopup(r))
    const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
      .setLngLat([r.lng, r.lat])
      .addTo(map)
    markers.push(marker)
  })
}

// ── POPUP ──
let popupActivo = null
function mostrarPopup(r) {
  if (popupActivo) { popupActivo.remove(); popupActivo = null }
  const tipo = TIPOS[r.tipo] || TIPOS.peligro
  const hace = tiempoRelativo(r.created_at)
  const pf = r.perfiles
  const html = `
    <div class="popup-card">
      ${r.foto_url ? `<img class="popup-foto" src="${r.foto_url}" alt="" onclick="window._lbCom('${r.foto_url}')">` : ''}
      <div class="popup-body">
        <div class="popup-tipo" style="color:${tipo.color}">${tipo.emoji} ${tipo.label}</div>
        ${pf ? `<div class="popup-mascota">
          ${pf.foto_url ? `<img class="popup-av" src="${pf.foto_url}" alt="">` : `<span style="font-size:16px">${pf.especie==='gato'?'🐱':'🐶'}</span>`}
          <span style="font-size:12px;font-weight:600;color:var(--ink)">${pf.nombre_mascota||'—'}</span>
        </div>` : ''}
        ${r.descripcion ? `<div class="popup-desc">${r.descripcion}</div>` : ''}
        <div class="popup-meta">🕐 ${hace}</div>
      </div>
    </div>
  `
  popupActivo = new mapboxgl.Popup({ closeButton: true, maxWidth: '280px', offset: 20 })
    .setLngLat([r.lng, r.lat])
    .setHTML(html)
    .addTo(map)
}

// ── CARGAR REPORTES ──
async function cargarReportes() {
  const { data, error } = await supabase
    .from('comunidad_reportes')
    .select('*, perfiles!comunidad_reportes_perfil_id_fkey(nombre_mascota,especie,foto_url)')
    .eq('activo', true)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) { console.error(error); return }
  reportes = data || []
  if (map) renderMarcadores()
  renderFeed()
}

// ── FEED ──
function renderFeed() {
  const el = document.getElementById('feedLista')
  if (!el) return
  if (!reportes.length) {
    el.innerHTML = `<div style="padding:20px 0;text-align:center;color:var(--ink-muted);font-size:14px">Aún no hay reportes en tu zona.</div>`
    return
  }
  el.innerHTML = reportes.slice(0, 20).map(r => {
    const tipo = TIPOS[r.tipo] || TIPOS.peligro
    const hace = tiempoRelativo(r.created_at)
    const pf = r.perfiles
    return `
      <div class="feed-item" onclick="map&&map.flyTo({center:[${r.lng},${r.lat}],zoom:15});mostrarPopup_${r.id}()">
        <div class="feed-icon" style="background:${tipo.color}">${tipo.emoji}</div>
        <div class="feed-body">
          <div class="feed-tipo" style="color:${tipo.color}">${tipo.label}</div>
          ${pf ? `<div style="font-size:12px;color:var(--ink-muted);margin-bottom:2px">${pf.especie==='gato'?'🐱':'🐶'} ${pf.nombre_mascota||''}</div>` : ''}
          ${r.descripcion ? `<div class="feed-desc">${r.descripcion.slice(0,80)}${r.descripcion.length>80?'...':''}</div>` : ''}
          <div class="feed-meta">🕐 ${hace}</div>
        </div>
        ${r.foto_url ? `<img class="feed-foto" src="${r.foto_url}" alt="" onclick="event.stopPropagation();window._lbCom('${r.foto_url}')">` : ''}
      </div>`
  }).join('')

  // Registrar clicks del feed para volar al mapa
  reportes.slice(0, 20).forEach(r => {
    window[`mostrarPopup_${r.id}`] = () => {
      if (map) { map.flyTo({ center: [r.lng, r.lat], zoom: 15, duration: 800 }); setTimeout(() => mostrarPopup(r), 600) }
    }
  })
}

// ── FILTRAR ──
window._filtrar = function(tipo) {
  document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'))
  document.querySelector(`[data-tipo="${tipo}"]`)?.classList.add('active')
  renderMarcadores(tipo)
}

window._irMiUbicacion = function() {
  if (map) map.flyTo({ center: [userLng, userLat], zoom: 15, duration: 800 })
}

// ── REPORTAR ──
let tipoSeleccionado = null
let fotoBlob = null

window._abrirReportar = function() {
  if (!state.user?.es_pro) {
    // Mostrar modal Pro
    mostrarModalPro()
    return
  }
  tipoSeleccionado = null; fotoBlob = null
  const mascotas = state.mascotas || []
  document.getElementById('sheetBodyCom').innerHTML = `
    <div id="alertReporte" class="alert" style="margin:0 0 14px"></div>

    <div style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--ink-muted);margin-bottom:10px">Tipo de reporte</div>
    <div class="tipo-grid">
      ${Object.entries(TIPOS).map(([k,v]) => `
        <div class="tipo-item" data-tipo="${k}" onclick="window._selTipo('${k}')">
          <span class="tipo-emoji">${v.emoji}</span>
          <span class="tipo-label">${v.label}</span>
        </div>`).join('')}
    </div>

    <div style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--ink-muted);margin-bottom:10px">Descripción <span style="font-weight:400;color:var(--ink-muted)">(opcional)</span></div>
    <textarea id="repDesc" placeholder="Describe brevemente lo que viste..." style="width:100%;padding:12px 14px;border:1.5px solid var(--border-strong);border-radius:var(--r);font-family:'Sora',sans-serif;font-size:14px;background:var(--surface-2);color:var(--ink);outline:none;resize:none;min-height:80px;margin-bottom:16px" maxlength="200"></textarea>

    ${mascotas.length ? `
    <div style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--ink-muted);margin-bottom:10px">Mascota que reporta</div>
    <select id="repMascota" style="width:100%;padding:12px 14px;border:1.5px solid var(--border-strong);border-radius:var(--r);font-family:'Sora',sans-serif;font-size:14px;background:var(--surface-2);color:var(--ink);outline:none;margin-bottom:16px">
      <option value="">Sin mascota específica</option>
      ${mascotas.map(m => `<option value="${m.id}">${m.especie==='gato'?'🐱':'🐶'} ${m.nombre_mascota}</option>`).join('')}
    </select>` : ''}

    <div style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--ink-muted);margin-bottom:10px">Foto <span style="font-weight:400;color:var(--ink-muted)">(opcional)</span></div>
    <div id="fotoPreview" style="margin-bottom:16px">
      <button onclick="document.getElementById('repFotoInput').click()" style="width:100%;padding:12px;border:1.5px dashed var(--border-strong);border-radius:var(--r);background:var(--surface-2);color:var(--ink-muted);font-family:'Sora',sans-serif;font-size:14px;cursor:pointer">📷 Agregar foto</button>
    </div>
    <input type="file" id="repFotoInput" accept="image/*" style="display:none">

    <div style="font-size:12px;color:var(--ink-muted);margin-bottom:16px;line-height:1.5">📍 Se usará tu ubicación GPS actual para ubicar el reporte en el mapa.</div>

    <button class="btn-primary" id="btnPublicar">Publicar reporte →</button>
  `
  document.getElementById('sheetOverlayCom').classList.add('open')
  document.getElementById('sheetReportar').classList.add('open')
  document.getElementById('btnPublicar').addEventListener('click', publicarReporte)
  document.getElementById('repFotoInput').addEventListener('change', function() {
    if (!this.files[0]) return
    fotoBlob = this.files[0]
    const url = URL.createObjectURL(fotoBlob)
    document.getElementById('fotoPreview').innerHTML = `
      <div style="position:relative;display:inline-block">
        <img src="${url}" style="width:100%;height:120px;object-fit:cover;border-radius:var(--r)">
        <button onclick="window._quitarFoto()" style="position:absolute;top:6px;right:6px;background:rgba(0,0,0,0.5);border:none;color:white;width:24px;height:24px;border-radius:50%;cursor:pointer;font-size:14px">✕</button>
      </div>`
  })
}

window._quitarFoto = () => {
  fotoBlob = null
  document.getElementById('fotoPreview').innerHTML = `<button onclick="document.getElementById('repFotoInput').click()" style="width:100%;padding:12px;border:1.5px dashed var(--border-strong);border-radius:var(--r);background:var(--surface-2);color:var(--ink-muted);font-family:'Sora',sans-serif;font-size:14px;cursor:pointer">📷 Agregar foto</button>`
}

window._selTipo = function(tipo) {
  tipoSeleccionado = tipo
  document.querySelectorAll('.tipo-item').forEach(el => el.classList.remove('selected'))
  document.querySelector(`[data-tipo="${tipo}"]`)?.classList.add('selected')
}

window._cerrarReportar = function() {
  document.getElementById('sheetOverlayCom')?.classList.remove('open')
  document.getElementById('sheetReportar')?.classList.remove('open')
}

async function publicarReporte() {
  const alertEl = document.getElementById('alertReporte')
  const showA = (msg, type='err') => { alertEl.textContent=msg; alertEl.className=`alert alert-${type} show` }
  if (!tipoSeleccionado) return showA('Selecciona un tipo de reporte')

  const btn = document.getElementById('btnPublicar')
  btn.disabled = true; btn.textContent = '⏳ Publicando...'

  try {
    // Obtener ubicación
    const pos = await new Promise((res, rej) =>
      navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 8000 })
    ).catch(() => null)

    if (!pos) { showA('No pudimos obtener tu ubicación. Activa el GPS e intenta de nuevo.'); btn.disabled=false; btn.textContent='Publicar reporte →'; return }

    const lat = pos.coords.latitude, lng = pos.coords.longitude
    const desc = document.getElementById('repDesc')?.value.trim() || null
    const mascotaId = document.getElementById('repMascota')?.value || null

    let foto_url = null
    if (fotoBlob) {
      const ext = fotoBlob.type.includes('png') ? 'png' : 'jpg'
      const fname = `reportes/${state.user.id}_${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('fotos-mascotas').upload(fname, fotoBlob, { upsert: true, contentType: fotoBlob.type })
      if (!uploadErr) {
        const { data } = supabase.storage.from('fotos-mascotas').getPublicUrl(fname)
        foto_url = data.publicUrl
      }
    }

    const { error } = await supabase.from('comunidad_reportes').insert({
      user_id: state.user.id,
      perfil_id: mascotaId || null,
      tipo: tipoSeleccionado,
      lat, lng, descripcion: desc, foto_url
    })

    if (error) { showA('❌ ' + error.message); btn.disabled=false; btn.textContent='Publicar reporte →'; return }

    window._cerrarReportar()
    showToast('✅ Reporte publicado')
    await cargarReportes()
    if (map) map.flyTo({ center: [lng, lat], zoom: 14, duration: 800 })
  } catch(e) {
    showA('❌ Error: ' + e.message)
    btn.disabled = false; btn.textContent = 'Publicar reporte →'
  }
}

// ── MODAL PRO ──
function mostrarModalPro() {
  const modal = document.createElement('div')
  modal.style.cssText = 'position:fixed;inset:0;z-index:500;background:rgba(0,0,0,0.4);backdrop-filter:blur(4px);display:flex;align-items:flex-end;justify-content:center'
  modal.innerHTML = `
    <div style="background:var(--surface);border-radius:24px 24px 0 0;padding:28px 24px 40px;width:100%;max-width:480px;animation:fadeUp 0.3s var(--ease) both">
      <div style="text-align:center;margin-bottom:20px">
        <div style="font-size:40px;margin-bottom:10px">🔒</div>
        <div style="font-family:'Fraunces',serif;font-size:22px;font-weight:700;color:var(--ink);margin-bottom:8px">Función Pro</div>
        <div style="font-size:14px;color:var(--ink-muted);line-height:1.6">Publicar reportes en la comunidad es una función de UbiPet Pro. Actualiza tu plan para contribuir al mapa.</div>
      </div>
      <div style="background:var(--clay-bg);border-radius:var(--r-lg);padding:16px;margin-bottom:20px">
        <div style="font-size:13px;font-weight:600;color:var(--clay-d);margin-bottom:8px">Con Pro puedes:</div>
        <div style="font-size:13px;color:var(--ink-soft);line-height:1.8">✅ Publicar reportes en el mapa<br>✅ Agregar fotos a los reportes<br>✅ Red de mascotas amigas<br>✅ Notificaciones de alertas cercanas</div>
      </div>
      <button onclick="this.closest('[style]').remove()" style="width:100%;padding:14px;background:var(--surface-2);border:none;border-radius:var(--r);font-family:'Sora',sans-serif;font-size:15px;font-weight:600;color:var(--ink-muted);cursor:pointer">Cerrar</button>
    </div>
  `
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove() })
  document.body.appendChild(modal)
}

// ── LIGHTBOX ──
window._lbCom = function(url) {
  document.getElementById('lbComImg').src = url
  document.getElementById('lbCom').style.display = 'flex'
}

// ── HELPERS ──
function tiempoRelativo(fecha) {
  const diff = Date.now() - new Date(fecha).getTime()
  const min  = Math.floor(diff / 60000)
  const hrs  = Math.floor(diff / 3600000)
  const dias = Math.floor(diff / 86400000)
  if (min < 1)  return 'Hace un momento'
  if (min < 60) return `Hace ${min} min`
  if (hrs < 24) return `Hace ${hrs}h`
  return `Hace ${dias} día${dias!==1?'s':''}`
}
