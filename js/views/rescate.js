// js/views/rescate.js — Vista rescate UbiPet 2.0

import { supabase } from '../supabase.js'

const ONESIGNAL_APP_ID  = '1b8b8929-1708-4c8e-a15a-87ed2d6a212a'
const ONESIGNAL_API_KEY = 'atc3qsvokejcfqetrco34ckhh'

export async function renderRescate(container, params = {}) {
  const perfilId = params.id || new URLSearchParams(window.location.search).get('id')

  container.innerHTML = `
<style>
.r-cover{height:160px;position:relative;overflow:hidden}
.r-cover.perdida{background:linear-gradient(135deg,#C0392B,#7D1F15)}
.r-cover.ok{background:linear-gradient(135deg,var(--clay),var(--clay-d))}
.r-cover-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:blur(10px) brightness(0.65);transform:scale(1.12)}
.perdida-pill{position:absolute;top:12px;left:14px;z-index:2;background:rgba(255,255,255,0.18);border:1px solid rgba(255,255,255,0.3);border-radius:999px;padding:4px 10px;display:flex;align-items:center;gap:5px;display:none}
.perdida-dot{width:6px;height:6px;border-radius:50%;background:#FF3B30;flex-shrink:0}
.perdida-pill span{font-size:11px;font-weight:700;color:white;letter-spacing:0.05em}
.r-avatar{width:96px;height:96px;border-radius:50%;border:3px solid var(--surface);overflow:hidden;background:var(--surface-2);display:flex;align-items:center;justify-content:center;font-size:40px;cursor:pointer;transition:transform 0.2s;z-index:2}
.r-avatar:hover{transform:scale(1.04)}
.r-avatar img{width:100%;height:100%;object-fit:cover;display:block}
.r-body{padding:60px 20px 18px}
.r-name{font-family:'Fraunces',serif;font-size:22px;font-weight:700;color:var(--ink);letter-spacing:-0.3px;margin-bottom:3px}
.r-meta{font-size:13px;color:var(--ink-muted);line-height:1.5}
.r-desc{font-size:14px;color:var(--ink-soft);line-height:1.6;margin-top:10px}
.r-card{background:var(--surface);border-radius:var(--r-lg);border:1px solid var(--border);overflow:hidden;margin-bottom:12px}
.r-card-hdr{padding:14px 20px 0;font-size:11px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:var(--ink-muted)}
.r-banner{background:var(--error-bg);border-bottom:0.5px solid rgba(192,57,43,0.12);padding:12px 20px;display:flex;align-items:flex-start;gap:10px}
.r-banner-title{font-size:13px;font-weight:600;color:var(--error);margin-bottom:2px}
.r-banner-sub{font-size:12px;color:var(--ink-muted);line-height:1.4}
.que-hacer{padding:0 20px;background:#FFFBF0;border-bottom:0.5px solid #F0E6C0;overflow:hidden}
.qh-toggle{display:flex;align-items:center;justify-content:space-between;padding:12px 0;cursor:pointer;user-select:none}
.qh-label{font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#92700A}
.qh-arrow{font-size:12px;color:#92700A;transition:transform 0.2s}
.qh-arrow.open{transform:rotate(180deg)}
.qh-body{padding-bottom:14px;display:none}
.qh-body.open{display:block}
.paso{display:flex;gap:10px;align-items:flex-start;font-size:13px;color:#5C4A1E;line-height:1.5;margin-bottom:8px}
.dueno-row{display:flex;align-items:center;gap:12px;padding:16px 20px 14px}
.dueno-av{width:44px;height:44px;border-radius:50%;flex-shrink:0;background:var(--clay-bg);border:1.5px solid var(--clay-l);display:flex;align-items:center;justify-content:center;font-size:20px}
.dueno-name{font-size:15px;font-weight:600;color:var(--ink)}
.dueno-tel{font-size:13px;color:var(--ink-muted);margin-top:1px}
.r-btns{padding:0 16px 16px;display:flex;flex-direction:column;gap:8px}
.btn-wsp{width:100%;padding:14px 20px;background:#25D366;color:white;border:none;border-radius:var(--r);font-family:'Sora',sans-serif;font-size:15px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:all 0.15s}
.btn-wsp:hover{background:#1ebe5a;transform:translateY(-1px)}
.btn-call{width:100%;padding:13px 20px;background:var(--surface-2);color:var(--ink);border:1.5px solid var(--border-strong);border-radius:var(--r);font-family:'Sora',sans-serif;font-size:15px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:all 0.15s}
.btn-call:hover{background:var(--surface);transform:translateY(-1px)}
.r-tags{display:flex;flex-wrap:wrap;gap:6px}
.r-tag{padding:5px 11px;border-radius:var(--r-full);font-size:12px;font-weight:500}
.r-tag-v{background:var(--sage-bg);color:var(--sage-d)}
.r-tag-a{background:var(--warning-bg);color:var(--warning)}
.r-tag-r{background:var(--clay-bg);color:var(--clay-d)}
.r-tag-n{background:var(--surface-2);color:var(--ink-muted)}
.foto-lb{display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.88);align-items:center;justify-content:center}
.foto-lb.open{display:flex}
.foto-lb img{max-width:92vw;max-height:92vh;border-radius:50%;object-fit:cover;width:min(85vw,85vh);height:min(85vw,85vh);box-shadow:0 0 60px rgba(0,0,0,0.5)}
.foto-lb-close{position:absolute;top:20px;right:20px;background:rgba(255,255,255,0.15);border:none;color:white;font-size:24px;cursor:pointer;border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center}
</style>

<div id="r-loading" class="flex-center" style="min-height:300px"><div class="spinner"></div></div>

<div id="r-notfound" style="display:none" class="empty-state">
  <div class="empty-icon">🔍</div>
  <div class="empty-title">Perfil no encontrado</div>
  <div class="empty-sub">Este código QR no está vinculado a ninguna mascota.</div>
</div>

<div id="r-content" style="display:none">
  <div style="max-width:480px;margin:0 auto;padding:0 0 48px;animation:fadeUp 0.35s var(--ease) both">

    <!-- HERO -->
    <div class="r-card">
      <div class="r-cover" id="rCover">
        <div class="perdida-pill" id="rPerdidaPill"><div class="perdida-dot"></div><span>🚨 MASCOTA PERDIDA</span></div>
        <div style="position:absolute;bottom:-48px;left:20px;z-index:2">
          <div class="r-avatar" id="rAvatar">🐾</div>
        </div>
      </div>
      <div class="r-body">
        <div class="r-name" id="rNombre"></div>
        <div class="r-meta" id="rMeta"></div>
        <div id="rDesc"></div>
      </div>
    </div>

    <!-- URGENTE -->
    <div id="rUrgente" class="r-card" style="display:none">
      <div class="r-banner">
        <span style="font-size:16px;flex-shrink:0">🚨</span>
        <div>
          <div class="r-banner-title">Esta mascota está reportada como perdida</div>
          <div class="r-banner-sub">Su dueño la está buscando. Por favor contáctalo de inmediato.</div>
        </div>
      </div>
      <div class="que-hacer">
        <div class="qh-toggle" id="qhToggle">
          <span class="qh-label">¿Qué hago si la encontré?</span>
          <span class="qh-arrow" id="qhArrow">▼</span>
        </div>
        <div class="qh-body" id="qhBody">
          <div class="paso"><span>1️⃣</span><span>Mantén a la mascota en un lugar seguro y tranquila.</span></div>
          <div class="paso"><span>2️⃣</span><span>Toca el botón verde de abajo para enviar tu ubicación GPS por WhatsApp al dueño.</span></div>
          <div class="paso"><span>3️⃣</span><span>Si no tiene WhatsApp, llama directo con el botón de teléfono.</span></div>
          <div class="paso"><span>4️⃣</span><span>No la dejes sola hasta que llegue el dueño.</span></div>
        </div>
      </div>
    </div>

    <!-- CONTACTO -->
    <div class="r-card">
      <div class="r-card-hdr">Contactar al dueño</div>
      <div class="dueno-row">
        <div class="dueno-av">👤</div>
        <div>
          <div class="dueno-name" id="rDuenoNombre"></div>
          <div class="dueno-tel" id="rDuenoTel"></div>
        </div>
      </div>
      <div class="r-btns">
        <button class="btn-wsp" id="btnWsp">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.118 1.532 5.845L.057 23.928l6.266-1.641A11.944 11.944 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.784 9.784 0 01-5.012-1.374l-.36-.214-3.722.976.993-3.624-.235-.372A9.789 9.789 0 012.182 12C2.182 6.58 6.58 2.182 12 2.182S21.818 6.58 21.818 12 17.42 21.818 12 21.818z"/></svg>
          📍 Enviar mi ubicación por WhatsApp
        </button>
        <button class="btn-call" id="btnLlamar">📞 Llamar al dueño</button>
      </div>
    </div>

    <!-- DIRECCIÓN -->
    <div class="r-card" id="rDireccion" style="display:none">
      <div class="r-card-hdr">Dirección del dueño</div>
      <div style="padding:14px 20px">
        <div style="font-size:14px;color:var(--ink-soft)" id="rDireccionTxt"></div>
        <a id="btnMapa" href="#" target="_blank" style="display:inline-flex;align-items:center;gap:6px;margin-top:10px;color:var(--clay);font-size:14px;font-weight:600">🗺️ Abrir en Maps</a>
      </div>
    </div>

    <!-- SALUD -->
    <div class="r-card" id="rSalud" style="display:none">
      <div class="r-card-hdr">Información médica</div>
      <div style="padding:14px 20px" id="rSaludContenido"></div>
    </div>

    <!-- CLÍNICA -->
    <div class="r-card" id="rClinica" style="display:none">
      <div class="r-card-hdr">Veterinaria de confianza</div>
      <div style="padding:14px 20px">
        <div style="font-size:15px;font-weight:600;color:var(--ink)" id="rClinicaNombre"></div>
        <div style="margin-top:6px" id="rClinicaTel"></div>
      </div>
    </div>

    <!-- FOOTER -->
    <div style="text-align:center;padding:16px 0;color:var(--ink-muted);font-size:13px">
      🐾 Protegido por <strong style="color:var(--clay)">UbiPet</strong>
    </div>

  </div>
</div>

<!-- LIGHTBOX -->
<div class="foto-lb" id="fotoLb" onclick="this.classList.remove('open')">
  <button class="foto-lb-close" onclick="document.getElementById('fotoLb').classList.remove('open')">✕</button>
  <img id="fotoLbImg" src="" alt="">
</div>
`

  if (!perfilId) {
    document.getElementById('r-loading').style.display = 'none'
    document.getElementById('r-notfound').style.display = 'block'
    return
  }

  try {
    const { data, error } = await supabase.rpc('get_perfil_rescate', { p_id: perfilId })
    document.getElementById('r-loading').style.display = 'none'

    if (error || !data) {
      document.getElementById('r-notfound').style.display = 'block'
      return
    }

    registrarEscaneo(data, perfilId)
    renderRescateData(data)

  } catch(e) {
    document.getElementById('r-loading').style.display = 'none'
    document.getElementById('r-notfound').style.display = 'block'
  }
}

function renderRescateData(data) {
  document.getElementById('r-content').style.display = 'block'
  const perdida = data.esta_perdida

  // Cover
  document.getElementById('rCover').classList.add(perdida ? 'perdida' : 'ok')
  if (perdida) document.getElementById('rPerdidaPill').style.display = 'flex'

  // Nombre y meta
  document.getElementById('rNombre').textContent = data.nombre_mascota || (perdida ? '¡Mascota perdida!' : 'Mascota encontrada')
  const meta = []
  if (data.especie) meta.push(data.especie === 'perro' ? '🐶 Perro' : '🐱 Gato')
  if (data.raza) meta.push(data.raza)
  if (data.fecha_nacimiento) {
    const años = Math.floor((new Date() - new Date(data.fecha_nacimiento)) / (1000*60*60*24*365))
    const etapa = data.especie === 'gato'
      ? (años < 1 ? 'Cachorro' : años < 10 ? 'Adulto' : 'Senior')
      : (años < 1 ? 'Cachorro' : años < 7 ? 'Adulto' : 'Senior')
    meta.push(etapa + (años >= 1 ? ' · ' + años + ' años' : ''))
  }
  if (data.peso) meta.push(data.peso + ' kg')
  document.getElementById('rMeta').textContent = meta.join(' · ')
  if (data.descripcion) document.getElementById('rDesc').innerHTML = `<div class="r-desc">${data.descripcion}</div>`

  // Foto
  const av = document.getElementById('rAvatar')
  if (data.foto_url) {
    const bgImg = document.createElement('img')
    bgImg.src = data.foto_url; bgImg.className = 'r-cover-bg'; bgImg.alt = ''
    document.getElementById('rCover').insertBefore(bgImg, document.getElementById('rCover').firstChild)
    const img = document.createElement('img')
    img.src = data.foto_url; img.alt = data.nombre_mascota || ''
    av.innerHTML = ''; av.appendChild(img)
    av.addEventListener('click', () => {
      document.getElementById('fotoLbImg').src = data.foto_url
      document.getElementById('fotoLb').classList.add('open')
    })
  } else {
    av.textContent = perdida ? '🚨' : '🐾'
  }

  // Contacto
  document.getElementById('rDuenoNombre').textContent = data.nombre_dueno || '—'
  document.getElementById('rDuenoTel').textContent = data.telefono || '—'

  // Urgente
  if (perdida) {
    document.getElementById('rUrgente').style.display = 'block'
    document.getElementById('qhToggle').addEventListener('click', () => {
      document.getElementById('qhBody').classList.toggle('open')
      document.getElementById('qhArrow').classList.toggle('open')
    })
  }

  const priv = data.privacidad || {}

  // Dirección
  if (priv.direccion === true && data.direccion_dueno) {
    document.getElementById('rDireccion').style.display = 'block'
    document.getElementById('rDireccionTxt').textContent = data.direccion_dueno
    document.getElementById('btnMapa').href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.direccion_dueno)}`
  }

  // Salud
  if (perdida && priv.salud !== false) {
    const inv = v => !v || ['no','no tiene','ninguno','ninguna','-'].includes(String(v).toLowerCase().trim())
    const vac = (Array.isArray(data.vacunas) ? data.vacunas : []).filter(v => v?.nombre && !inv(v.nombre))
    const ale = (Array.isArray(data.alergias) ? data.alergias : []).filter(v => !inv(v))
    const rem = (Array.isArray(data.remedios) ? data.remedios : []).filter(v => !inv(v))
    const alim = data.alimentacion || {}

    if (vac.length || ale.length || rem.length || alim.tipo) {
      document.getElementById('rSalud').style.display = 'block'
      let html = ''
      if (vac.length) html += `<div style="margin-bottom:14px"><div style="font-size:12px;font-weight:600;color:var(--ink-muted);margin-bottom:7px">💉 Vacunas</div><div class="r-tags">${vac.map(v=>`<span class="r-tag r-tag-v">✓ ${v.nombre}${v.fecha?' · '+new Date(v.fecha).toLocaleDateString('es-CL',{month:'short',year:'numeric'}):''}</span>`).join('')}</div></div>`
      html += `<div style="margin-bottom:14px"><div style="font-size:12px;font-weight:600;color:var(--ink-muted);margin-bottom:7px">⚠️ Alergias</div><div class="r-tags">${ale.length?ale.map(a=>`<span class="r-tag r-tag-a">⚠ ${a}</span>`).join(''):'<span class="r-tag r-tag-n">Ninguna conocida</span>'}</div></div>`
      if (rem.length) html += `<div style="margin-bottom:14px"><div style="font-size:12px;font-weight:600;color:var(--ink-muted);margin-bottom:7px">💊 Remedios</div><div class="r-tags">${rem.map(r=>`<span class="r-tag r-tag-r">💊 ${r}</span>`).join('')}</div></div>`
      if (alim.tipo) {
        const tl = {balanceado:'Balanceado / Croquetas',natural:'Natural / BARF',mixta:'Mixta',prescripcion:'Prescripción'}[alim.tipo]||alim.tipo
        html += `<div><div style="font-size:12px;font-weight:600;color:var(--ink-muted);margin-bottom:7px">🍽️ Alimentación</div><div class="r-tags"><span class="r-tag r-tag-v">${tl}</span>${alim.marca?`<span class="r-tag r-tag-n">${alim.marca}</span>`:''}</div>${alim.notas?`<div style="font-size:13px;color:var(--ink-muted);margin-top:8px;line-height:1.5">${alim.notas}</div>`:''}</div>`
      }
      document.getElementById('rSaludContenido').innerHTML = html
    }
  }

  // Clínica
  if (perdida && priv.clinica !== false && data.clinica_nombre) {
    document.getElementById('rClinica').style.display = 'block'
    document.getElementById('rClinicaNombre').textContent = data.clinica_nombre
    if (data.clinica_telefono) document.getElementById('rClinicaTel').innerHTML = `<a href="tel:${data.clinica_telefono}" style="color:var(--clay);font-weight:600">📞 ${data.clinica_telefono}</a>`
  }

  // Botones
  document.getElementById('btnWsp').addEventListener('click', function() {
    this.innerHTML = '⏳ Obteniendo ubicación...'; this.disabled = true
    const btn = this
    const tel = data.telefono?.replace(/[^0-9]/g,'')

    if (!navigator.geolocation) {
      window.location.href = `https://wa.me/${tel}?text=${encodeURIComponent('🐾 ¡Encontré a '+data.nombre_mascota+'! Por favor contáctame.')}`
      return
    }

    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat = pos.coords.latitude.toFixed(6), lng = pos.coords.longitude.toFixed(6)
        const msg = `🐾 *¡Encontré a ${data.nombre_mascota}!*\n\n📍 *Mi ubicación:*\nhttps://maps.google.com/maps?q=${lat},${lng}\n\nEstoy aquí con tu mascota. ¡Avísame cuando vengas! 🙏`
        btn.disabled = false
        window.location.href = `https://wa.me/${tel}?text=${encodeURIComponent(msg)}`
      },
      () => {
        btn.disabled = false
        window.location.href = `https://wa.me/${tel}?text=${encodeURIComponent('🐾 ¡Encontré a '+data.nombre_mascota+'! No pude compartir GPS, por favor contáctame.')}`
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  })

  document.getElementById('btnLlamar').addEventListener('click', () => {
    window.location.href = `tel:${data.telefono}`
  })
}

// ── REGISTRAR ESCANEO + NOTIFICAR AL DUEÑO VÍA ONESIGNAL ──
async function registrarEscaneo(data, perfilId) {
  try {
    let lat = null, lng = null

    if (navigator.geolocation) {
      await new Promise(resolve => {
        navigator.geolocation.getCurrentPosition(
          pos => { lat = pos.coords.latitude; lng = pos.coords.longitude; resolve() },
          () => resolve(),
          { timeout: 5000 }
        )
      })
    }

    // Guardar escaneo en Supabase
    await supabase.from('escaneos').insert({ perfil_id: perfilId, lat, lng })

    // Construir mensaje según si hay ubicación o no
    const hora = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
    const title = `🐾 ¡Escanearon la placa de ${data.nombre_mascota}!`
    const body = lat
      ? `📍 Ubicación disponible · ${hora}`
      : `Alguien encontró a tu mascota · ${hora}`

    // Notificar al dueño por OneSignal usando su user_id como External ID
    await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${ONESIGNAL_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        // Filtrar SOLO al dueño por su user_id de Supabase
        include_aliases: {
          external_id: [data.user_id]
        },
        target_channel: 'push',
        headings: { es: title, en: title },
        contents: { es: body, en: body },
        url: 'https://app.ubipet.shop',
        // Ícono de la app
        chrome_web_icon: 'https://app.ubipet.shop/icon-192.png',
        // Datos extra por si quieres manejarlos en el SW
        data: {
          perfil_id: perfilId,
          lat,
          lng,
          nombre_mascota: data.nombre_mascota,
        }
      })
    })

  } catch(e) {
    console.error('Error registrar escaneo:', e)
  }
}
