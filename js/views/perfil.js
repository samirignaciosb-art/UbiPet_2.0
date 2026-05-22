// js/views/perfil.js — Vista perfil UbiPet 2.0
import { supabase } from '../supabase.js'
import { state, showToast } from '../utils.js'

let mascotas = [], mascotaActual = null, modoNueva = false
let croppedBlob = null, cropImg = null
let cropOffX = 0, cropOffY = 0, cropScale = 1, cropDragging = false
let cropLastX = 0, cropLastY = 0, lastTouch = null, lastDist = null
let autoSaveTimers = {}
let vacunas = [], alergias = [], remedios = []

export async function renderPerfil(container) {
  container.innerHTML = buildShell()
  setupCrop()
  setupFotoInput()
  await cargarMascotas(state.user)
  renderMascotasGrid()
}

function buildShell() {
  return `
    <div id="loadingPerfil" class="flex-center" style="min-height:200px"><div class="spinner"></div></div>
    <div id="vistaLista" style="display:none"></div>
    <div id="vistaDetalle" style="display:none"></div>
    <div id="vistaEscaneos" style="display:none"></div>
    <div id="sheetOverlay" class="sheet-overlay" onclick="cerrarSheet()"></div>
    <div id="sheet" class="sheet">
      <div class="sheet-handle"></div>
      <div class="sheet-hdr">
        <div class="sheet-title" id="sheetTitle">Editar</div>
        <div style="display:flex;align-items:center;gap:12px">
          <span class="sheet-saved" id="sheetSaved">Guardado ✓</span>
          <button class="icon-btn" onclick="cerrarSheet()">✕</button>
        </div>
      </div>
      <div class="sheet-body" id="sheetBody"></div>
    </div>
    <div class="foto-modal" id="fotoModal" onclick="cerrarFotoModal()">
      <button class="foto-modal-close">✕</button>
      <img id="fotoModalImg" src="" alt="">
    </div>
    <div class="crop-overlay" id="cropOverlay">
      <div class="crop-modal">
        <h4>✂️ Recortar foto</h4>
        <div class="crop-canvas-wrap"><canvas id="cropCanvas"></canvas><div class="crop-guide"></div></div>
        <div class="crop-zoom"><span>🔍</span><input type="range" id="cropZoom" min="1" max="4" step="0.01" value="1"><span>🔎</span></div>
        <div class="crop-btns">
          <button class="btn-ghost btn-sm" id="cropCancelar">Cancelar</button>
          <button class="btn-primary btn-sm" id="cropConfirmar">✓ Usar esta foto</button>
        </div>
      </div>
    </div>
    <input type="file" id="fotoInput" accept="image/*" style="display:none">
    <style>
      .sheet-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:300;backdrop-filter:blur(2px)}
      .sheet-overlay.open{display:block}
      .sheet{position:fixed;bottom:0;left:0;right:0;background:var(--surface);border-radius:24px 24px 0 0;z-index:301;transform:translateY(100%);transition:transform 0.35s var(--ease);max-height:90vh;display:flex;flex-direction:column;box-shadow:0 -4px 40px rgba(0,0,0,0.15)}
      .sheet.open{transform:translateY(0)}
      .sheet-handle{width:36px;height:4px;background:var(--border-strong);border-radius:2px;margin:12px auto 0}
      .sheet-hdr{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--border);flex-shrink:0}
      .sheet-title{font-family:'Fraunces',serif;font-size:18px;font-weight:700;color:var(--ink)}
      .sheet-saved{font-size:12px;color:var(--sage);font-weight:600;opacity:0;transition:opacity 0.2s}
      .sheet-saved.show{opacity:1}
      .sheet-body{overflow-y:auto;padding:16px 20px 32px;flex:1}
      .form-row{display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border);gap:12px}
      .form-row:last-child{border-bottom:none}
      .form-lbl{font-size:14px;color:var(--ink-muted);flex-shrink:0;min-width:90px}
      .form-inp{flex:1;border:none;background:transparent;font-family:'Sora',sans-serif;font-size:14px;color:var(--ink);outline:none;text-align:right;padding:2px 0;min-width:0}
      .form-inp:focus{color:var(--clay)}
      textarea.form-inp{text-align:left;resize:none;min-height:60px;border:1.5px solid var(--border-strong);border-radius:var(--r);padding:10px;background:var(--surface-2);width:100%;margin-top:4px}
      .hero-cover{height:120px;position:relative;overflow:hidden;background:linear-gradient(135deg,var(--clay),var(--clay-d));cursor:pointer;border-radius:var(--r-lg) var(--r-lg) 0 0}
      .hero-av-wrap{position:absolute;bottom:-36px;left:20px}
      .hero-av{width:72px;height:72px;border-radius:50%;border:3px solid var(--surface);overflow:hidden;background:var(--clay-bg);display:flex;align-items:center;justify-content:center;font-size:28px;cursor:pointer;position:relative}
      .hero-av img{width:100%;height:100%;object-fit:cover;display:block;position:absolute;inset:0}
      .hero-body{padding:46px 20px 20px}
      .hero-name{font-family:'Fraunces',serif;font-size:22px;font-weight:700;color:var(--ink);margin-bottom:4px}
      .hero-meta{font-size:13px;color:var(--ink-muted)}
      .hero-actions{display:flex;gap:8px;margin-top:14px;flex-wrap:wrap;align-items:center}
      .placa-badge{display:inline-flex;align-items:center;gap:6px;background:var(--sage-bg);border:1px solid var(--sage-l);border-radius:var(--r-full);padding:5px 12px;font-size:13px;font-weight:700;color:var(--sage-d);letter-spacing:0.06em;margin-top:8px}
      .placa-sin{display:inline-flex;align-items:center;gap:6px;background:var(--clay-bg);border:1.5px dashed var(--clay-l);border-radius:var(--r-full);padding:5px 12px;font-size:13px;font-weight:600;color:var(--clay-d);margin-top:8px;cursor:pointer}
      .resumen-row{display:flex;justify-content:space-between;align-items:center;padding:12px 20px;border-bottom:1px solid var(--border);cursor:pointer;transition:background 0.1s;gap:12px}
      .resumen-row:last-child{border-bottom:none}
      .resumen-row:hover{background:var(--surface-2)}
      .resumen-label{font-size:14px;color:var(--ink-muted);flex-shrink:0}
      .resumen-val{font-size:14px;font-weight:500;color:var(--ink);text-align:right;display:flex;align-items:center;gap:6px;min-width:0;overflow:hidden}
      .resumen-val-text{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .resumen-arrow{font-size:12px;color:var(--ink-muted);flex-shrink:0}
      .resumen-pill{font-size:12px;font-weight:600;color:var(--sage-d);background:var(--sage-bg);padding:3px 9px;border-radius:var(--r-full);flex-shrink:0}
      .resumen-pill.warn{color:#92400E;background:#FEF3C7}
      .sec-title{padding:16px 20px 4px;font-size:11px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:var(--ink-muted)}
      .mascota-card{background:var(--surface);border-radius:var(--r-lg);border:1px solid var(--border);overflow:hidden;cursor:pointer;transition:transform 0.15s,box-shadow 0.15s;box-shadow:var(--shadow-sm);margin-bottom:12px}
      .mascota-card:hover{transform:translateY(-2px);box-shadow:var(--shadow)}
      .mc-cover{height:80px;background:linear-gradient(135deg,var(--clay),var(--clay-d));position:relative;overflow:hidden}
      .mc-body{padding:10px 16px 14px;display:flex;align-items:center;gap:12px}
      .mc-av{width:52px;height:52px;border-radius:50%;border:2.5px solid var(--surface);overflow:hidden;background:var(--clay-bg);flex-shrink:0;margin-top:-26px;display:flex;align-items:center;justify-content:center;font-size:22px;position:relative}
      .mc-av img{width:100%;height:100%;object-fit:cover;position:absolute;inset:0}
      .mc-info{flex:1;min-width:0;padding-top:4px}
      .mc-name{font-family:'Fraunces',serif;font-size:16px;font-weight:700;color:var(--ink)}
      .mc-meta{font-size:12px;color:var(--ink-muted);margin-top:2px}
      .mc-actions{display:flex;gap:8px;align-items:center;margin-top:8px}
      .chip{padding:6px 14px;border-radius:var(--r-full);font-family:'Sora',sans-serif;font-size:13px;font-weight:600;cursor:pointer;border:none;transition:all 0.15s;display:inline-flex;align-items:center;gap:5px}
      .chip-sage{background:var(--sage-bg);color:var(--sage-d);border:1px solid var(--sage-l)}
      .chip-clay{background:var(--clay-bg);color:var(--clay-d);border:1px solid var(--clay-l)}
      .chip-err{background:var(--error-bg);color:var(--error);border:1px solid rgba(192,57,43,0.2)}
      .chip-muted{background:var(--surface-2);color:var(--ink-muted);border:1px solid var(--border)}
      .toggle-sw{width:44px;height:24px;border-radius:12px;border:none;background:var(--border-strong);cursor:pointer;position:relative;transition:background 0.2s;flex-shrink:0}
      .toggle-sw::after{content:'';position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:transform 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.2)}
      .toggle-sw.on{background:var(--sage)}
      .toggle-sw.on::after{transform:translateX(20px)}
      .tags-wrap{padding:14px 0;border-bottom:1px solid var(--border)}
      .tags-wrap:last-child{border-bottom:none}
      .tags-lbl{font-size:13px;font-weight:600;color:var(--ink-muted);margin-bottom:10px}
      .tags-list{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}
      .tag-item{display:inline-flex;align-items:center;gap:4px;padding:5px 10px;border-radius:var(--r-full);font-size:13px;font-weight:500}
      .tag-a{background:var(--warning-bg);color:var(--warning)}
      .tag-r{background:var(--clay-bg);color:var(--clay-d)}
      .tag-del{background:none;border:none;cursor:pointer;font-size:11px;color:inherit;opacity:0.6;padding:0 0 0 2px}
      .tags-add{display:flex;gap:8px;margin-top:4px}
      .tags-add input{flex:1;padding:8px 12px;border:1.5px solid var(--border-strong);border-radius:var(--r);font-family:'Sora',sans-serif;font-size:14px;background:var(--surface-2);color:var(--ink);outline:none}
      .tags-add input:focus{border-color:var(--clay)}
      .tags-add-btn{padding:8px 14px;background:var(--clay);color:#fff;border:none;border-radius:var(--r);font-family:'Sora',sans-serif;font-size:14px;font-weight:600;cursor:pointer}
      .vacuna-item{display:flex;gap:8px;align-items:center;margin-bottom:8px}
      .vacuna-item input{padding:8px 10px;border:1.5px solid var(--border-strong);border-radius:var(--r);font-family:'Sora',sans-serif;font-size:13px;background:var(--surface-2);color:var(--ink);outline:none;flex:1}
      .vacuna-item input[type=date]{flex:0 0 130px}
      .vacuna-del{background:none;border:none;cursor:pointer;color:var(--error);font-size:16px;padding:4px;flex-shrink:0}
      .compl-items{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:0 0 8px}
      .compl-item{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--ink-muted)}
      .priv-row{display:flex;align-items:center;gap:12px;padding:14px 0;border-bottom:1px solid var(--border)}
      .priv-row:last-child{border-bottom:none}
      .priv-info{flex:1}
      .priv-label{font-size:14px;font-weight:600;color:var(--ink)}
      .priv-sub{font-size:12px;color:var(--ink-muted);margin-top:2px}
      .priv-status{font-size:12px;font-weight:600;flex-shrink:0}
      .empty-state{text-align:center;padding:48px 24px}
      .empty-icon{font-size:48px;margin-bottom:12px}
      .empty-title{font-family:'Fraunces',serif;font-size:22px;font-weight:700;color:var(--ink);margin-bottom:8px}
      .empty-sub{font-size:14px;color:var(--ink-muted);line-height:1.6;margin-bottom:20px}
      .foto-modal{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:500;align-items:center;justify-content:center}
      .foto-modal.open{display:flex}
      .foto-modal img{max-width:90vw;max-height:90vh;border-radius:var(--r-lg);object-fit:contain}
      .foto-modal-close{position:absolute;top:20px;right:20px;background:rgba(255,255,255,0.15);border:none;color:#fff;width:36px;height:36px;border-radius:50%;cursor:pointer;font-size:16px}
      .crop-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:600;align-items:center;justify-content:center}
      .crop-overlay.active{display:flex}
      .crop-modal{background:var(--surface);border-radius:var(--r-xl);padding:24px;width:min(340px,90vw);display:flex;flex-direction:column;gap:16px}
      .crop-modal h4{font-family:'Fraunces',serif;font-size:18px;color:var(--ink);text-align:center}
      .crop-canvas-wrap{position:relative;width:280px;height:280px;margin:0 auto;border-radius:50%;overflow:hidden;background:#000}
      .crop-canvas-wrap canvas{display:block;touch-action:none}
      .crop-guide{position:absolute;inset:0;border-radius:50%;border:2px solid rgba(255,255,255,0.6);pointer-events:none}
      .crop-zoom{display:flex;align-items:center;gap:10px}
      .crop-zoom input{flex:1;accent-color:var(--clay)}
      .crop-btns{display:flex;gap:10px}
      .crop-btns button{flex:1}
      .escaneo-item{display:flex;gap:14px;align-items:flex-start;padding:14px 20px;border-bottom:1px solid var(--border)}
      .escaneo-item:last-child{border-bottom:none}
      .escaneo-icon{width:40px;height:40px;border-radius:50%;flex-shrink:0;background:var(--clay-bg);border:1px solid var(--clay-l);display:flex;align-items:center;justify-content:center;font-size:18px}
    </style>
  `
}

async function cargarMascotas(user) {
  const { data, error } = await supabase
    .from('perfiles').select('*, placas!perfiles_placa_id_fkey(codigo)')
    .eq('user_id', user.id).order('created_at')
  if (error) { console.error(error); return }
  mascotas = data || []
  state.mascotas = mascotas
}

function renderMascotasGrid() {
  document.getElementById('loadingPerfil').style.display = 'none'
  mostrarVista('lista')
  const lista = document.getElementById('vistaLista')
  if (mascotas.length === 0) {
    lista.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🐾</div>
        <div class="empty-title">¡Bienvenido a UbiPet!</div>
        <div class="empty-sub">Para crear el perfil de tu mascota necesitas el código de tu placa física.</div>
        <div id="alertPlacaEmpty" class="alert"></div>
        <input type="text" id="codigoPlacaEmpty" placeholder="Ej: UBI-K7X2M9" style="width:100%;max-width:260px;padding:12px 16px;border-radius:var(--r);border:1.5px solid var(--border-strong);font-family:'Sora',sans-serif;font-size:15px;text-transform:uppercase;outline:none;text-align:center;display:block;margin:0 auto 12px;background:var(--surface-2);color:var(--ink)">
        <button id="btnActivarPlaca" class="btn-primary" style="width:auto;padding:12px 24px;margin:0 auto">🔗 Vincular placa y continuar</button>
      </div>`
    document.getElementById('btnActivarPlaca')?.addEventListener('click', () => vincularPlacaEmpty())
    document.getElementById('codigoPlacaEmpty')?.addEventListener('input', e => { e.target.value = e.target.value.toUpperCase() })
    return
  }
  lista.innerHTML = `
    <div id="mascotasGrid"></div>
    <div style="text-align:center;padding:8px 0;margin-top:4px">
      <button onclick="window._nuevaMascota()" style="background:var(--surface);border:1.5px dashed var(--clay-l);color:var(--clay);padding:12px 24px;border-radius:var(--r-lg);font-family:'Sora',sans-serif;font-size:14px;font-weight:600;cursor:pointer;width:100%">+ Agregar mascota</button>
    </div>`
  const grid = document.getElementById('mascotasGrid')
  mascotas.forEach(m => {
    const card = document.createElement('div')
    card.className = 'mascota-card'
    const coverHtml = m.foto_url ? `<img src="${m.foto_url}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:blur(6px) brightness(0.75);transform:scale(1.1)">` : ''
    const avatarHtml = m.foto_url ? `<img src="${m.foto_url}" alt="${m.nombre_mascota}">` : (m.especie === 'gato' ? '🐱' : '🐶')
    const meta = [m.especie === 'perro' ? 'Perro' : 'Gato', m.raza].filter(Boolean).join(' · ')
    card.innerHTML = `
      <div class="mc-cover" style="position:relative">${coverHtml}</div>
      <div class="mc-body">
        <div class="mc-av">${avatarHtml}</div>
        <div class="mc-info">
          <div class="mc-name">${m.nombre_mascota || '—'}</div>
          <div class="mc-meta">${meta}</div>
          <div class="mc-actions">
            <button class="chip ${m.esta_perdida ? 'chip-err' : 'chip-sage'} toggle-perdida-btn">${m.esta_perdida ? '🚨 Perdida' : '✅ En casa'}</button>
          </div>
        </div>
      </div>`
    card.addEventListener('click', e => { if (e.target.closest('.toggle-perdida-btn')) return; seleccionarMascota(m) })
    card.querySelector('.toggle-perdida-btn').addEventListener('click', async e => {
      e.stopPropagation()
      const nuevo = !m.esta_perdida
      await supabase.from('perfiles').update({ esta_perdida: nuevo }).eq('id', m.id)
      m.esta_perdida = nuevo; renderMascotasGrid()
    })
    grid.appendChild(card)
  })
}

function seleccionarMascota(m) {
  mascotaActual = m; modoNueva = false
  mostrarVista('detalle'); renderDetalle()
}

window._nuevaMascota = function() {
  mascotaActual = { especie: 'perro' }; modoNueva = true
  mostrarVista('detalle'); renderDetalle()
  const old = document.getElementById('btnCrearFloat'); if (old) old.remove()
  const wrap = document.createElement('div')
  wrap.id = 'btnCrearFloat'
  wrap.style.cssText = 'position:fixed;bottom:24px;right:20px;z-index:50'
  wrap.innerHTML = `<button class="btn-primary" style="width:auto;padding:14px 24px">💾 Crear mascota</button>`
  document.body.appendChild(wrap)
  wrap.querySelector('button').addEventListener('click', crearMascota)
}

async function crearMascota() {
  const payload = buildPayload()
  const nombre = payload.nombre_mascota, dueno = payload.nombre_dueno, tel = payload.telefono
  if (!nombre) return showToast('El nombre de la mascota es obligatorio', 'err')
  if (!dueno)  return showToast('Tu nombre es obligatorio', 'err')
  if (!tel)    return showToast('El WhatsApp es obligatorio', 'err')
  const { data, error } = await supabase.from('perfiles').insert(payload).select().single()
  if (error) return showToast('❌ ' + error.message, 'err')
mascotaActual = data; modoNueva = false
if (croppedBlob) { try { const url = await subirFoto(croppedBlob, data.id); await supabase.from('perfiles').update({ foto_url: url }).eq('id', data.id); mascotaActual.foto_url = url } catch(e) {} }

// ── Asociar placa pendiente si existe ──
const placaPendiente = sessionStorage.getItem('placa_pendiente')
if (placaPendiente) {
  sessionStorage.removeItem('placa_pendiente')
  const { data: placa } = await supabase.from('placas').select('id,estado').eq('codigo', placaPendiente).maybeSingle()
  if (placa && placa.estado !== 'activa') {
    await supabase.from('perfiles').update({ placa_id: placa.id }).eq('id', data.id)
    await supabase.from('placas').update({ estado: 'activa', perfil_id: data.id }).eq('id', placa.id)
  }
}

document.getElementById('btnCrearFloat')?.remove()
await cargarMascotas(state.user)
  const m = mascotas.find(x => x.id === data.id) || data
  seleccionarMascota(m)
  showToast('✅ ¡Mascota creada!')
}

function renderDetalle() {
  const m = mascotaActual || {}
  const placa = m.placas?.codigo
  const meta = [m.especie === 'perro' ? '🐶 Perro' : '🐱 Gato', m.raza, m.peso ? m.peso + ' kg' : null].filter(Boolean).join(' · ')
  document.getElementById('vistaDetalle').innerHTML = `
    <div class="card" style="margin-bottom:12px;overflow:hidden;padding:0">
      <div class="hero-cover" id="heroCover">
        ${m.foto_url ? `<img src="${m.foto_url}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:blur(8px) brightness(0.7);transform:scale(1.1)">` : ''}
        <div class="hero-av-wrap">
          <div class="hero-av" id="heroAvatar">
            ${m.foto_url ? `<img src="${m.foto_url}" alt="">` : `<span>${m.especie === 'gato' ? '🐱' : '🐶'}</span>`}
          </div>
        </div>
      </div>
      <div class="hero-body">
        <div class="hero-name">${modoNueva ? 'Nueva mascota' : (m.nombre_mascota || '—')}</div>
        <div class="hero-meta">${modoNueva ? 'Completa los datos desde el menú ☰' : meta}</div>
        ${!modoNueva ? `
          <div id="heroPlaca">${placa ? `<div class="placa-badge">📡 ${placa}</div>` : `<div class="placa-sin" onclick="window._sheetPlaca()">+ Vincular placa QR</div>`}</div>
          <div class="hero-actions">
            <button class="chip chip-sage" onclick="window.open('/rescate.html?id=${m.id}','_blank')">👁 Ver como rescatista</button>
            <button class="chip ${m.esta_perdida ? 'chip-err' : 'chip-muted'}" id="btnTogglePerdida">${m.esta_perdida ? '🚨 Está perdida' : '✅ En casa'}</button>
          </div>` : ''}
      </div>
    </div>
    <div id="alertDetalle" class="alert" style="margin-bottom:12px"></div>
    <div class="card" style="margin-bottom:12px;padding:0"><div class="sec-title">General</div><div id="resumenGeneralRows"></div></div>
    <div class="card" style="margin-bottom:12px;padding:0"><div class="sec-title">Salud</div><div id="resumenSaludRows"></div></div>
    <div class="card" style="margin-bottom:12px;padding:0"><div class="sec-title">Dueño</div><div id="resumenDuenoRows"></div></div>
    <div class="card" style="margin-bottom:12px">
      <div class="sec-title" style="padding:0 0 8px">Completitud del perfil</div>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
        <div style="height:6px;background:var(--surface-2);border-radius:999px;overflow:hidden;flex:1"><div id="barraCompletitud" style="height:100%;border-radius:999px;transition:width 0.4s;width:0%"></div></div>
        <span id="pctCompletitud" style="font-size:13px;font-weight:700;color:var(--clay);flex-shrink:0">0%</span>
      </div>
      <div class="compl-items" id="itemsCompletitud"></div>
    </div>
    ${!modoNueva ? `
    <div class="card" style="margin-bottom:12px"><div class="sec-title" style="padding:0 0 12px">Placa QR</div><div id="placaSection"></div></div>
    <div style="text-align:center;padding:4px 0 8px">
      <button id="btnEliminar" style="background:none;border:none;color:var(--error);font-size:14px;font-weight:600;cursor:pointer;font-family:'Sora',sans-serif;padding:12px">🗑️ Eliminar esta mascota</button>
    </div>` : ''}
    <div style="text-align:center;padding:0 0 8px">
      <button onclick="window._volverLista()" style="background:none;border:none;color:var(--ink-muted);font-size:14px;cursor:pointer;font-family:'Sora',sans-serif;padding:8px">← Mis mascotas</button>
    </div>`
  actualizarResumen(); actualizarCompletitud()
  if (!modoNueva) {
    renderPlacaSection(m)
    document.getElementById('btnTogglePerdida')?.addEventListener('click', togglePerdida)
    document.getElementById('btnEliminar')?.addEventListener('click', eliminarMascota)
  }
  document.getElementById('heroCover').addEventListener('click', () => document.getElementById('fotoInput').click())
  document.getElementById('heroAvatar').addEventListener('click', e => {
    e.stopPropagation()
    if (mascotaActual?.foto_url) { document.getElementById('fotoModalImg').src = mascotaActual.foto_url; document.getElementById('fotoModal').classList.add('open') }
    else document.getElementById('fotoInput').click()
  })
}

window._volverLista = function() { mostrarVista('lista'); renderMascotasGrid() }

function actualizarResumen() {
  const m = mascotaActual || {}, alim = m.alimentacion || {}
  document.getElementById('resumenGeneralRows').innerHTML = [
    { label: 'Nombre', val: m.nombre_mascota || '—', sheet: '_sheetGeneral' },
    { label: 'Raza', val: m.raza || '—', sheet: '_sheetGeneral' },
    { label: 'Nacimiento', val: m.fecha_nacimiento ? new Date(m.fecha_nacimiento).toLocaleDateString('es-CL',{day:'2-digit',month:'short',year:'numeric'}) : '—', sheet: '_sheetGeneral' },
    { label: 'Peso', val: m.peso ? m.peso+' kg' : '—', sheet: '_sheetGeneral' },
  ].map(r => `<div class="resumen-row" onclick="window.${r.sheet}()"><span class="resumen-label">${r.label}</span><span class="resumen-val"><span class="resumen-val-text">${r.val}</span><span class="resumen-arrow">›</span></span></div>`).join('')
  const vac = Array.isArray(m.vacunas) ? m.vacunas.filter(v=>v?.nombre) : []
  const ale = Array.isArray(m.alergias) ? m.alergias : []
  document.getElementById('resumenSaludRows').innerHTML = [
    { label:'Vacunas', val:vac.length?`${vac.length} registrada${vac.length>1?'s':''}`:'—', pill:vac.length>0, pillText:'Al día' },
    { label:'Alergias', val:ale.length?ale.join(', '):'Ninguna', warn:ale.length>0 },
    { label:'Dieta', val:{balanceado:'Balanceado',natural:'Natural/BARF',mixta:'Mixta',prescripcion:'Prescripción'}[alim.tipo]||'—' },
  ].map(r => `<div class="resumen-row" onclick="window._sheetSalud()"><span class="resumen-label">${r.label}</span><span class="resumen-val">${r.pill?`<span class="resumen-pill">${r.pillText}</span>`:r.warn?`<span class="resumen-pill warn">${r.val}</span>`:`<span class="resumen-val-text">${r.val}</span>`}<span class="resumen-arrow">›</span></span></div>`).join('')
  document.getElementById('resumenDuenoRows').innerHTML = [
    { label:'Nombre', val:m.nombre_dueno||'—' },
    { label:'WhatsApp', val:m.telefono||'—' },
    { label:'Dirección', val:m.direccion_dueno||'—' },
  ].map(r => `<div class="resumen-row" onclick="window._sheetDueno()"><span class="resumen-label">${r.label}</span><span class="resumen-val"><span class="resumen-val-text">${r.val}</span><span class="resumen-arrow">›</span></span></div>`).join('')
}

function actualizarCompletitud() {
  const m = mascotaActual || {}, alim = m.alimentacion || {}
  const checks = [
    {label:'📸 Foto',ok:!!m.foto_url},{label:'🐾 Nombre',ok:!!m.nombre_mascota},
    {label:'📅 Nacimiento',ok:!!m.fecha_nacimiento},{label:'⚖️ Peso',ok:!!m.peso},
    {label:'📝 Descripción',ok:!!m.descripcion},{label:'👤 Dueño',ok:!!m.nombre_dueno},
    {label:'📱 WhatsApp',ok:!!m.telefono},{label:'💉 Vacunas',ok:Array.isArray(m.vacunas)&&m.vacunas.some(v=>v?.nombre)},
    {label:'🍽️ Alimentación',ok:!!alim.tipo},{label:'🏥 Clínica',ok:!!m.clinica_nombre},
  ]
  const pct = Math.round(checks.filter(c=>c.ok).length/checks.length*100)
  const color = pct>=80?'var(--sage)':pct>=50?'var(--clay)':'var(--error)'
  const pctEl = document.getElementById('pctCompletitud'), barEl = document.getElementById('barraCompletitud')
  if (pctEl) { pctEl.textContent=pct+'%'; pctEl.style.color=color }
  if (barEl) { barEl.style.width=pct+'%'; barEl.style.background=color }
  const itEl = document.getElementById('itemsCompletitud')
  if (itEl) itEl.innerHTML = checks.map(c=>`<div class="compl-item" style="color:${c.ok?'var(--sage-d)':'var(--ink-muted)'}"><span>${c.ok?'✅':'○'}</span><span>${c.label}</span></div>`).join('')
}

function renderPlacaSection(m) {
  const el = document.getElementById('placaSection'); if (!el) return
  if (m.placa_id && m.placas?.codigo) {
    el.innerHTML = `<div class="placa-badge">📡 ${m.placas.codigo}</div><p style="font-size:12px;color:var(--ink-muted);margin-top:8px">Placa vinculada · El QR apunta a este perfil</p>`
  } else {
    el.innerHTML = `<div id="alertPlaca" class="alert" style="margin:0 0 10px"></div><div style="display:flex;gap:8px;align-items:center"><input type="text" id="codigoPlaca" placeholder="Ej: UBI-K7X2M9" style="flex:1;padding:10px 14px;border-radius:var(--r);border:1.5px solid var(--border-strong);background:var(--surface-2);font-family:'Sora',sans-serif;font-size:14px;text-transform:uppercase;outline:none;color:var(--ink)"><button id="btnAsociarPlaca" class="btn-primary btn-sm">Vincular</button></div>`
    document.getElementById('btnAsociarPlaca').addEventListener('click', asociarPlaca)
    document.getElementById('codigoPlaca').addEventListener('input', e=>{e.target.value=e.target.value.toUpperCase()})
    const pp = sessionStorage.getItem('placa_pendiente')
    if (pp) { document.getElementById('codigoPlaca').value=pp; sessionStorage.removeItem('placa_pendiente') }
  }
}

function abrirSheet(titulo, html) {
  document.getElementById('sheetTitle').textContent = titulo
  document.getElementById('sheetBody').innerHTML = html
  document.getElementById('sheetOverlay').classList.add('open')
  document.getElementById('sheet').classList.add('open')
  document.getElementById('sheetSaved').classList.remove('show')
  document.getElementById('sheetBody').querySelectorAll('input,select,textarea').forEach(el=>{el.addEventListener('input',autoGuardar);el.addEventListener('change',autoGuardar)})
}

window.cerrarSheet = function() {
  clearTimeout(autoSaveTimers.main)
  if (modoNueva && mascotaActual) mascotaActual = {...mascotaActual,...buildPayload()}
  else guardar()
  document.getElementById('sheetOverlay').classList.remove('open')
  document.getElementById('sheet').classList.remove('open')
}

window._sheetGeneral = function() {
  const m = mascotaActual||{}
  abrirSheet('General',`
    <div class="form-row"><span class="form-lbl">Nombre</span><input type="text" id="nombreMascota" class="form-inp" placeholder="Nombre" value="${m.nombre_mascota||''}"></div>
    <div class="form-row"><span class="form-lbl">Especie</span><select id="especie" class="form-inp" style="text-align:right"><option value="perro" ${m.especie!=='gato'?'selected':''}>🐶 Perro</option><option value="gato" ${m.especie==='gato'?'selected':''}>🐱 Gato</option></select></div>
    <div class="form-row"><span class="form-lbl">Raza</span><input type="text" id="raza" class="form-inp" placeholder="Kiltro, labrador..." value="${m.raza||''}"></div>
    <div class="form-row"><span class="form-lbl">Nacimiento</span><input type="date" id="fechaNacimiento" class="form-inp" value="${m.fecha_nacimiento||''}"></div>
    <div class="form-row"><span class="form-lbl">Peso (kg)</span><input type="number" id="peso" class="form-inp" placeholder="12.5" step="0.1" value="${m.peso||''}"></div>
    <div style="padding:12px 0"><span class="form-lbl" style="display:block;margin-bottom:8px">Descripción</span><textarea id="descripcion" class="form-inp" placeholder="Color, señas particulares...">${m.descripcion||''}</textarea></div>`)
}

window._sheetDueno = function() {
  const m = mascotaActual||{}
  abrirSheet('Dueño',`
    <div class="form-row"><span class="form-lbl">Tu nombre</span><input type="text" id="nombreDueno" class="form-inp" placeholder="Juan Pérez" value="${m.nombre_dueno||''}"></div>
    <div class="form-row"><span class="form-lbl">WhatsApp</span><input type="tel" id="telefono" class="form-inp" placeholder="+56912345678" value="${m.telefono||''}"></div>
    <div class="form-row"><span class="form-lbl">Dirección</span><input type="text" id="direccionDueno" class="form-inp" placeholder="Av. Ejemplo 1234" value="${m.direccion_dueno||''}"></div>`)
}

window._sheetSalud = function() {
  const m = mascotaActual||{}, alim = m.alimentacion||{}
  abrirSheet('Salud',`
    <div class="tags-wrap"><div class="tags-lbl">💉 Vacunas</div><div id="vacunasList" style="margin-bottom:8px"></div><button onclick="window._agregarVacuna()" class="chip chip-sage">+ Agregar vacuna</button></div>
    <div class="tags-wrap"><div class="tags-lbl">⚠️ Alergias</div><div class="tags-list" id="alergiasList"></div><div class="tags-add"><input type="text" id="alergiaNueva" placeholder="Ej: penicilina..."><button onclick="window._agregarAlergia()" class="tags-add-btn">+</button></div></div>
    <div class="tags-wrap"><div class="tags-lbl">💊 Remedios</div><div class="tags-list" id="remediosList"></div><div class="tags-add"><input type="text" id="remedioNuevo" placeholder="Ej: omeprazol..."><button onclick="window._agregarRemedio()" class="tags-add-btn">+</button></div></div>
    <div class="tags-wrap" style="border-bottom:none"><div class="tags-lbl">🍽️ Alimentación</div>
      <div class="form-row" style="padding:0;border:none;margin-bottom:6px"><span class="form-lbl">Dieta</span><select id="tipoDieta" class="form-inp" style="text-align:right"><option value="">Sin especificar</option><option value="balanceado" ${alim.tipo==='balanceado'?'selected':''}>Balanceado</option><option value="natural" ${alim.tipo==='natural'?'selected':''}>Natural/BARF</option><option value="mixta" ${alim.tipo==='mixta'?'selected':''}>Mixta</option><option value="prescripcion" ${alim.tipo==='prescripcion'?'selected':''}>Prescripción</option></select></div>
      <div class="form-row" style="padding:0;border:none;margin-bottom:6px"><span class="form-lbl">Marca</span><input type="text" id="marcaAlimento" class="form-inp" placeholder="Royal Canin..." value="${alim.marca||''}"></div>
      <div style="padding:8px 0"><span class="form-lbl" style="display:block;margin-bottom:8px">Notas</span><textarea id="notasAlimentacion" class="form-inp" style="width:100%;min-height:60px" placeholder="Porciones, horarios...">${alim.notas||''}</textarea></div>
    </div>`)
  renderVacunas(m.vacunas||[]); renderAlergias(m.alergias||[]); renderRemedios(m.remedios||[])
  document.getElementById('alergiaNueva').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();window._agregarAlergia()}})
  document.getElementById('remedioNuevo').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();window._agregarRemedio()}})
}

window._sheetClinica = function() {
  const m = mascotaActual||{}
  abrirSheet('Veterinaria',`
    <div class="form-row"><span class="form-lbl">Nombre</span><input type="text" id="clinicaNombre" class="form-inp" placeholder="Clínica veterinaria..." value="${m.clinica_nombre||''}"></div>
    <div class="form-row"><span class="form-lbl">Teléfono</span><input type="tel" id="clinicaTelefono" class="form-inp" placeholder="+56912345678" value="${m.clinica_telefono||''}"></div>`)
}

window._sheetPrivacidad = function() {
  const m = mascotaActual||{}, priv = m.privacidad||{}
  const sOn=priv.salud!==false, cOn=priv.clinica!==false, dOn=priv.direccion===true
  abrirSheet('Privacidad',`
    <div class="priv-row"><div class="priv-info"><div class="priv-label">💉 Info médica</div><div class="priv-sub">Vacunas, alergias y dieta</div></div><span class="priv-status" id="labelPrivSalud" style="color:${sOn?'var(--sage-d)':'var(--ink-muted)'}">${sOn?'Visible':'Oculto'}</span><button class="toggle-sw ${sOn?'on':''}" id="togglePrivSalud"></button></div>
    <div class="priv-row"><div class="priv-info"><div class="priv-label">🏥 Veterinaria</div><div class="priv-sub">Nombre y teléfono de la clínica</div></div><span class="priv-status" id="labelPrivClinica" style="color:${cOn?'var(--sage-d)':'var(--ink-muted)'}">${cOn?'Visible':'Oculto'}</span><button class="toggle-sw ${cOn?'on':''}" id="togglePrivClinica"></button></div>
    <div class="priv-row"><div class="priv-info"><div class="priv-label">📍 Dirección</div><div class="priv-sub">Tu dirección de domicilio</div></div><span class="priv-status" id="labelPrivDireccion" style="color:${dOn?'var(--sage-d)':'var(--ink-muted)'}">${dOn?'Visible':'Oculto'}</span><button class="toggle-sw ${dOn?'on':''}" id="togglePrivDireccion"></button></div>`)
  ;['togglePrivSalud','togglePrivClinica','togglePrivDireccion'].forEach(id=>{
    document.getElementById(id).addEventListener('click',function(){
      const on=!this.classList.contains('on'); this.classList.toggle('on',on)
      const lbl=document.getElementById(id.replace('toggle','label'))
      lbl.textContent=on?'Visible':'Oculto'; lbl.style.color=on?'var(--sage-d)':'var(--ink-muted)'; autoGuardar()
    })
  })
}

window._sheetPlaca = function() {
  abrirSheet('Vincular placa QR',`
    <p style="font-size:14px;color:var(--ink-muted);margin:0 0 16px;line-height:1.6">Ingresa el código de tu placa física para vincularla al perfil de tu mascota.</p>
    <div id="alertPlaca" class="alert" style="margin:0 0 10px"></div>
    <div style="display:flex;gap:8px;align-items:center">
      <input type="text" id="codigoPlaca" placeholder="Ej: UBI-K7X2M9" style="flex:1;padding:12px 14px;border-radius:var(--r);border:1.5px solid var(--border-strong);background:var(--surface-2);font-family:'Sora',sans-serif;font-size:14px;text-transform:uppercase;outline:none;color:var(--ink)">
      <button id="btnAsociarPlaca" class="btn-primary btn-sm">Vincular</button>
    </div>`)
  document.getElementById('btnAsociarPlaca').addEventListener('click',asociarPlaca)
  document.getElementById('codigoPlaca').addEventListener('input',e=>{e.target.value=e.target.value.toUpperCase()})
  const pp=sessionStorage.getItem('placa_pendiente'); if(pp){document.getElementById('codigoPlaca').value=pp;sessionStorage.removeItem('placa_pendiente')}
}

function autoGuardar() { clearTimeout(autoSaveTimers.main); autoSaveTimers.main=setTimeout(guardar,1200) }

async function guardar() {
  if (!mascotaActual||modoNueva) return
  const payload = buildPayload()
  const {error} = await supabase.from('perfiles').update(payload).eq('id',mascotaActual.id)
  if (!error) {
    mascotaActual={...mascotaActual,...payload}
    const badge=document.getElementById('sheetSaved'); if(badge){badge.classList.add('show');setTimeout(()=>badge.classList.remove('show'),2000)}
    actualizarResumen(); actualizarCompletitud()
  }
}

function getF(id,fallback) { const el=document.getElementById(id); return el!==null?el.value:fallback }

function buildPayload() {
  const m=mascotaActual||{}, alim=m.alimentacion||{}, priv=m.privacidad||{}
  const fn=getF('fechaNacimiento',m.fecha_nacimiento||'')
  return {
    user_id: state.user.id,
    nombre_mascota:(getF('nombreMascota',m.nombre_mascota||'')).trim()||m.nombre_mascota,
    especie:getF('especie',m.especie||'perro'),
    raza:getF('raza',m.raza||'').trim(),
    fecha_nacimiento:fn||null,
    peso:parseFloat(getF('peso',m.peso||''))||null,
    descripcion:getF('descripcion',m.descripcion||'').trim(),
    nombre_dueno:getF('nombreDueno',m.nombre_dueno||'').trim(),
    telefono:getF('telefono',m.telefono||'').trim(),
    direccion_dueno:getF('direccionDueno',m.direccion_dueno||'').trim()||null,
    esta_perdida:m.esta_perdida||false,
    clinica_nombre:getF('clinicaNombre',m.clinica_nombre||'').trim()||null,
    clinica_telefono:getF('clinicaTelefono',m.clinica_telefono||'').trim()||null,
    vacunas:document.getElementById('vacunasList')?getVacunas():(m.vacunas||[]),
    alergias:document.getElementById('alergiasList')?getAlergias():(m.alergias||[]),
    remedios:document.getElementById('remediosList')?getRemedios():(m.remedios||[]),
    alimentacion:{tipo:getF('tipoDieta',alim.tipo||'')||null,marca:getF('marcaAlimento',alim.marca||'').trim()||null,notas:getF('notasAlimentacion',alim.notas||'').trim()||null},
    privacidad:{
      salud:document.getElementById('togglePrivSalud')?document.getElementById('togglePrivSalud').classList.contains('on'):(priv.salud!==false),
      clinica:document.getElementById('togglePrivClinica')?document.getElementById('togglePrivClinica').classList.contains('on'):(priv.clinica!==false),
      direccion:document.getElementById('togglePrivDireccion')?document.getElementById('togglePrivDireccion').classList.contains('on'):(priv.direccion===true),
    },
  }
}

async function togglePerdida() {
  if (!mascotaActual) return
  const nuevo=!mascotaActual.esta_perdida
  await supabase.from('perfiles').update({esta_perdida:nuevo}).eq('id',mascotaActual.id)
  mascotaActual.esta_perdida=nuevo; const m=mascotas.find(x=>x.id===mascotaActual.id); if(m) m.esta_perdida=nuevo
  renderDetalle()
}

async function eliminarMascota() {
  if (!mascotaActual) return
  if (!confirm(`¿Seguro que quieres eliminar a ${mascotaActual.nombre_mascota}?`)) return
  if (mascotaActual.placa_id) await supabase.from('placas').update({perfil_id:null,estado:'disponible'}).eq('id',mascotaActual.placa_id)
  if (mascotaActual.foto_url) await supabase.storage.from('fotos-mascotas').remove([`${mascotaActual.id}.jpg`])
  const {error} = await supabase.from('perfiles').delete().eq('id',mascotaActual.id)
  if (error) {showToast('❌ '+error.message,'err'); return}
  mascotaActual=null; await cargarMascotas(state.user); mostrarVista('lista'); renderMascotasGrid()
}

async function asociarPlaca() {
  const codigo=document.getElementById('codigoPlaca')?.value.trim().toUpperCase(); if(!codigo) return
  const alertEl=document.getElementById('alertPlaca')
  if(alertEl){alertEl.className='alert alert-info show';alertEl.textContent='🔍 Verificando...'}
  const {data:placa,error}=await supabase.from('placas').select('id,estado,perfil_id').eq('codigo',codigo).single()
  if(error||!placa){if(alertEl){alertEl.className='alert alert-err show';alertEl.textContent='❌ Código no encontrado'};return}
  if(placa.estado==='activa'){if(alertEl){alertEl.className='alert alert-err show';alertEl.textContent='❌ Esta placa ya está en uso'};return}
  const {error:errU}=await supabase.from('perfiles').update({placa_id:placa.id}).eq('id',mascotaActual.id).eq('user_id',state.user.id)
  if(errU){if(alertEl){alertEl.className='alert alert-err show';alertEl.textContent='❌ '+errU.message};return}
  await supabase.from('placas').update({estado:'activa',perfil_id:mascotaActual.id}).eq('id',placa.id)
  if(alertEl){alertEl.className='alert alert-ok show';alertEl.textContent='✅ ¡Placa asociada!'}
  setTimeout(async()=>{await cargarMascotas(state.user);const m=mascotas.find(x=>x.id===mascotaActual.id);if(m){mascotaActual=m;renderPlacaSection(m);renderDetalle()}},800)
}

async function vincularPlacaEmpty() {
  const input=document.getElementById('codigoPlacaEmpty'), codigo=input?.value.trim().toUpperCase()
  const alertEl=document.getElementById('alertPlacaEmpty')
  const showA=(msg,type='err')=>{alertEl.textContent=msg;alertEl.className=`alert alert-${type} show`}
  if(!codigo) return showA('Ingresa el código de tu placa')
  const btn=document.getElementById('btnActivarPlaca'); btn.disabled=true; btn.textContent='⏳ Verificando...'
  const {data:placa,error}=await supabase.from('placas').select('id,estado').eq('codigo',codigo).maybeSingle()
  btn.disabled=false; btn.textContent='🔗 Vincular placa y continuar'
  if(error||!placa) return showA('❌ Código no válido')
  if(placa.estado==='activa') return showA('❌ Esta placa ya está en uso')
  sessionStorage.setItem('placa_pendiente',codigo); window._nuevaMascota()
}

function mostrarVista(vista) {
  ;['vistaLista','vistaDetalle','vistaEscaneos'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display='none'})
  const target=document.getElementById('vista'+vista.charAt(0).toUpperCase()+vista.slice(1))
  if(target) target.style.display='block'
  window.scrollTo(0,0)
}

async function subirFoto(blob,mascotaId) {
  const fn=`${mascotaId}.jpg`
  await supabase.storage.from('fotos-mascotas').remove([fn])
  const {error}=await supabase.storage.from('fotos-mascotas').upload(fn,blob,{upsert:true,contentType:'image/jpeg'})
  if(error) throw error
  const {data}=supabase.storage.from('fotos-mascotas').getPublicUrl(fn)
  return data.publicUrl+'?v='+Date.now()
}

function setupFotoInput() {
  document.getElementById('fotoInput')?.addEventListener('change',function(){
    if(!this.files[0]) return
    const reader=new FileReader(); reader.onload=e=>abrirCrop(e.target.result); reader.readAsDataURL(this.files[0])
  })
}

window.cerrarFotoModal = ()=>document.getElementById('fotoModal')?.classList.remove('open')

function abrirCrop(dataUrl) {
  cropImg=new Image(); cropImg.onload=()=>{
    cropOffX=0;cropOffY=0;cropScale=1
    const z=document.getElementById('cropZoom'); if(z) z.value=1
    dibujarCrop(); document.getElementById('cropOverlay')?.classList.add('active')
  }; cropImg.src=dataUrl
}

function dibujarCrop() {
  const canvas=document.getElementById('cropCanvas'),SIZE=280; if(!canvas) return
  canvas.width=SIZE;canvas.height=SIZE; const ctx=canvas.getContext('2d'); ctx.clearRect(0,0,SIZE,SIZE); if(!cropImg) return
  const base=Math.min(SIZE/cropImg.width,SIZE/cropImg.height)*cropScale,w=cropImg.width*base,h=cropImg.height*base
  ctx.drawImage(cropImg,cropOffX+(SIZE-w)/2,cropOffY+(SIZE-h)/2,w,h)
}

function clampOffset() {
  const canvas=document.getElementById('cropCanvas'),SIZE=canvas?.width||280
  const base=Math.min(SIZE/cropImg.width,SIZE/cropImg.height)*cropScale,w=cropImg.width*base,h=cropImg.height*base
  const maxX=Math.max(0,(w-SIZE)/2),maxY=Math.max(0,(h-SIZE)/2)
  cropOffX=Math.max(-maxX,Math.min(maxX,cropOffX)); cropOffY=Math.max(-maxY,Math.min(maxY,cropOffY))
}

function generarBlob() {
  const canvas=document.getElementById('cropCanvas'),SIZE=canvas.width
  const out=document.createElement('canvas'); out.width=400;out.height=400
  const ctx=out.getContext('2d'); ctx.beginPath();ctx.arc(200,200,200,0,Math.PI*2);ctx.clip()
  ctx.drawImage(canvas,0,0,SIZE,SIZE,0,0,400,400)
  out.toBlob(async blob=>{
    croppedBlob=blob; const url=URL.createObjectURL(blob)
    const av=document.getElementById('heroAvatar')
    if(av){let img=av.querySelector('img');if(!img){img=document.createElement('img');av.appendChild(img);img.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:cover'};img.src=url}
    document.getElementById('cropOverlay')?.classList.remove('active')
    if(!modoNueva&&mascotaActual?.id){try{const fu=await subirFoto(blob,mascotaActual.id);await supabase.from('perfiles').update({foto_url:fu}).eq('id',mascotaActual.id);mascotaActual.foto_url=fu;if(av){const img2=av.querySelector('img');if(img2)img2.src=fu};await cargarMascotas(state.user)}catch(e){console.error(e)}}
  },'image/jpeg',0.92)
}

function setupCrop() {
  setTimeout(()=>{
    const canvas=document.getElementById('cropCanvas'),zoom=document.getElementById('cropZoom'); if(!canvas||!zoom) return
    zoom.addEventListener('input',()=>{const ns=parseFloat(zoom.value),cx=canvas.width/2,cy=canvas.height/2;cropOffX=cx-(cx-cropOffX)*(ns/cropScale);cropOffY=cy-(cy-cropOffY)*(ns/cropScale);cropScale=ns;clampOffset();dibujarCrop()})
    canvas.addEventListener('wheel',e=>{e.preventDefault();cropScale=Math.max(1,Math.min(4,cropScale+(e.deltaY>0?-0.1:0.1)));zoom.value=cropScale;clampOffset();dibujarCrop()})
    canvas.addEventListener('mousedown',e=>{cropDragging=true;cropLastX=e.clientX;cropLastY=e.clientY})
    window.addEventListener('mousemove',e=>{if(!cropDragging)return;cropOffX+=e.clientX-cropLastX;cropOffY+=e.clientY-cropLastY;cropLastX=e.clientX;cropLastY=e.clientY;clampOffset();dibujarCrop()})
    window.addEventListener('mouseup',()=>{cropDragging=false})
    canvas.addEventListener('touchstart',e=>{if(e.touches.length===1){lastTouch=e.touches[0];lastDist=null}else if(e.touches.length===2){lastDist=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY)}})
    canvas.addEventListener('touchmove',e=>{e.preventDefault();if(e.touches.length===1&&lastTouch){cropOffX+=e.touches[0].clientX-lastTouch.clientX;cropOffY+=e.touches[0].clientY-lastTouch.clientY;lastTouch=e.touches[0];clampOffset();dibujarCrop()}else if(e.touches.length===2&&lastDist){const nd=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);cropScale=Math.max(1,Math.min(4,cropScale*(nd/lastDist)));zoom.value=cropScale;lastDist=nd;clampOffset();dibujarCrop()}},{passive:false})
    canvas.addEventListener('touchend',()=>{lastTouch=null;lastDist=null})
    document.getElementById('cropConfirmar')?.addEventListener('click',generarBlob)
    document.getElementById('cropCancelar')?.addEventListener('click',()=>{document.getElementById('cropOverlay')?.classList.remove('active');document.getElementById('fotoInput').value='';croppedBlob=null})
  },100)
}

function renderVacunas(data) {
  vacunas=data||[];window._vac=vacunas; const el=document.getElementById('vacunasList'); if(!el) return
  el.innerHTML=vacunas.map((v,i)=>`<div class="vacuna-item"><input type="text" placeholder="Nombre vacuna" value="${v.nombre||''}" oninput="window._vac[${i}].nombre=this.value;window._autoGuardar()"><input type="date" value="${v.fecha||''}" oninput="window._vac[${i}].fecha=this.value;window._autoGuardar()"><button class="vacuna-del" onclick="window._vac.splice(${i},1);window._renderVacunas(window._vac);window._autoGuardar()">✕</button></div>`).join('')
}
window._renderVacunas=renderVacunas
window._agregarVacuna=()=>{vacunas.push({nombre:'',fecha:''});window._vac=vacunas;renderVacunas(vacunas)}
function getVacunas(){return vacunas.filter(v=>v.nombre?.trim())}

function renderAlergias(data) {
  alergias=data||[];window._ale=alergias; const el=document.getElementById('alergiasList'); if(!el) return
  el.innerHTML=alergias.map((a,i)=>`<span class="tag-item tag-a">${a}<button class="tag-del" onclick="window._ale.splice(${i},1);window._renderAlergias(window._ale);window._autoGuardar()">✕</button></span>`).join('')
}
window._renderAlergias=renderAlergias
window._agregarAlergia=()=>{const input=document.getElementById('alergiaNueva');if(!input)return;const val=input.value.trim();if(!val)return;alergias.push(val);window._ale=alergias;renderAlergias(alergias);input.value='';autoGuardar()}
function getAlergias(){return alergias.filter(a=>a.trim())}

function renderRemedios(data) {
  remedios=data||[];window._rem=remedios; const el=document.getElementById('remediosList'); if(!el) return
  el.innerHTML=remedios.map((r,i)=>`<span class="tag-item tag-r">💊 ${r}<button class="tag-del" onclick="window._rem.splice(${i},1);window._renderRemedios(window._rem);window._autoGuardar()">✕</button></span>`).join('')
}
window._renderRemedios=renderRemedios
window._agregarRemedio=()=>{const input=document.getElementById('remedioNuevo');if(!input)return;const val=input.value.trim();if(!val)return;remedios.push(val);window._rem=remedios;renderRemedios(remedios);input.value='';autoGuardar()}
function getRemedios(){return remedios.filter(r=>r.trim())}
window._autoGuardar=autoGuardar
