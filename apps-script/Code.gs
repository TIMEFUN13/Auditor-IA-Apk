/**
 * Partículas C175 · servidor de sincronización del aprendizaje (gratis, Google Apps Script)
 * ------------------------------------------------------------------------------------------
 * Guarda en una hoja de cálculo los ejemplos que cada tablet confirma (con persona) y los
 * reparte a las demás. Las tablets trabajan sin internet y sincronizan cuando hay señal.
 *
 * Instalación: vea LEEME.md en esta misma carpeta.
 *   1) Ejecute una vez la función «configurar»: crea la clave, la hoja y el análisis diario,
 *      y muestra la clave en el registro de ejecución.
 *   2) Implementar → Nueva implementación → Aplicación web
 *      Ejecutar como: Yo · Quién tiene acceso: Cualquier usuario.
 *   3) Copie la URL …/exec en la app: Ajustes → Sincronizar el aprendizaje.
 */
const HOJA = 'ejemplos';
const COLS = ['id', 'recibido', 'sitio', 'clase', 'origen', 'fecha', 'variables', 'miniatura', 'version'];
const LOTE = 400;

function libro_() {
  const p = PropertiesService.getScriptProperties();
  let id = p.getProperty('HOJA_ID'), ss = null;
  if (id) { try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; } }
  if (!ss) {
    ss = SpreadsheetApp.create('Partículas C175 · ejemplos de aprendizaje');
    p.setProperty('HOJA_ID', ss.getId());
  }
  let sh = ss.getSheetByName(HOJA);
  if (!sh) { sh = ss.insertSheet(HOJA); sh.appendRow(COLS); sh.setFrozenRows(1); }
  return sh;
}

function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function doPost(e) {
  let req;
  try { req = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'JSON inválido' }); }
  const clave = PropertiesService.getScriptProperties().getProperty('CLAVE');
  if (!clave) return json_({ ok: false, error: 'Falta la propiedad CLAVE en el script' });
  if (req.key !== clave) return json_({ ok: false, error: 'Clave incorrecta' });
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = libro_();
    if (req.action === 'push') return json_(push_(sh, req));
    if (req.action === 'pull') return json_(pull_(sh, req));
    return json_({ ok: false, error: 'Acción desconocida' });
  } finally { lock.releaseLock(); }
}

function push_(sh, req) {
  const ex = (req.examples || []).slice(0, 200);
  const last = sh.getLastRow();
  const ids = new Set(last > 1 ? sh.getRange(2, 1, last - 1, 1).getValues().map((r) => String(r[0])) : []);
  const rows = [];
  ex.forEach((x) => {
    if (!x || !x.id || ids.has(String(x.id)) || !x.label || !x.f) return;
    const thumb = String(x.thumb || '');
    rows.push([String(x.id), new Date(), String(x.site || req.site || '').slice(0, 60), String(x.label).slice(0, 30), String(x.src || '').slice(0, 120),
      String(x.at || ''), JSON.stringify(x.f).slice(0, 4000), thumb.length < 45000 ? thumb : '', String(req.app || '')]);
    ids.add(String(x.id));
  });
  if (rows.length) sh.getRange(sh.getLastRow() + 1, 1, rows.length, COLS.length).setValues(rows);
  return { ok: true, added: rows.length };
}

function pull_(sh, req) {
  const since = Math.max(0, Number(req.since) || 0), last = sh.getLastRow(), total = Math.max(0, last - 1);
  if (since >= total) return { ok: true, examples: [], next: total, more: false };
  const n = Math.min(LOTE, total - since);
  const vals = sh.getRange(2 + since, 1, n, COLS.length).getValues();
  const examples = [];
  vals.forEach((r) => {
    if (String(r[2]) === String(req.site || '') && req.site) return; // lo propio ya lo tiene
    let f = null; try { f = JSON.parse(r[6]); } catch (e) { return; }
    examples.push({ id: String(r[0]), site: String(r[2]), label: String(r[3]), src: String(r[4]), at: String(r[5]), f: f, thumb: String(r[7] || '') });
  });
  return { ok: true, examples: examples, next: since + n, more: since + n < total };
}

/** Panel rápido: abra la URL …/exec en el navegador para ver cuántos ejemplos hay por sitio y clase. */
function doGet() {
  const sh = libro_(), last = sh.getLastRow();
  const vals = last > 1 ? sh.getRange(2, 3, last - 1, 2).getValues() : [];
  const t = {};
  vals.forEach((r) => { const s = r[0] || '(sin sitio)'; t[s] = t[s] || {}; t[s][r[1]] = (t[s][r[1]] || 0) + 1; });
  const clases = Array.from(new Set(vals.map((r) => r[1]))).sort();
  let html = '<meta name="viewport" content="width=device-width"><style>body{font:14px system-ui;padding:16px}td,th{padding:4px 8px;border-bottom:1px solid #ddd;text-align:right}th:first-child,td:first-child{text-align:left}</style>';
  html += '<h2>Partículas C175 · aprendizaje compartido</h2><p>' + vals.length + ' ejemplos confirmados por personas.</p><table><tr><th>Sitio</th>' + clases.map((c) => '<th>' + c + '</th>').join('') + '</tr>';
  Object.keys(t).sort().forEach((s) => { html += '<tr><td>' + s + '</td>' + clases.map((c) => '<td>' + (t[s][c] || 0) + '</td>').join('') + '</tr>'; });
  html += '</table>';
  return HtmlService.createHtmlOutput(html).setTitle('Partículas C175 · aprendizaje');
}

/* ======================= configuración en un solo paso ======================= */
/** Ejecútela una vez desde el editor: crea la clave, la hoja y el análisis diario. */
function configurar() {
  const p = PropertiesService.getScriptProperties();
  let clave = p.getProperty('CLAVE');
  if (!clave) { clave = Utilities.getUuid().replace(/-/g, '').slice(0, 24); p.setProperty('CLAVE', clave); }
  const sh = libro_();
  ScriptApp.getProjectTriggers().filter((t) => t.getHandlerFunction() === 'analisisDiario').forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('analisisDiario').timeBased().everyDays(1).atHour(6).create();
  Logger.log('CLAVE para las tablets: ' + clave);
  Logger.log('Hoja de cálculo: ' + sh.getParent().getUrl());
  Logger.log('Análisis diario programado a las 6:00. Ahora: Implementar → Nueva implementación → Aplicación web.');
  return clave;
}

/* =================== análisis diario de toda la biblioteca ===================
 * 1) Cuántos ejemplos nuevos llegaron y de qué sitios.
 * 2) Consistencia entre sitios: para cada ejemplo busca el más parecido de OTRO sitio
 *    (firma óptica normalizada). Si sus clases discrepan mucho en un sitio, ese sitio
 *    está etiquetando distinto (criterio, cámara o luz) → se avisa por correo.
 * 3) Abrasivas cuyo vecino más parecido de otro sitio es blanda: el error caro. */
const GRUPO = { metal: 'ABR', mineral: 'ABR', carbon: 'ABR', oxido: 'ABR', pintura: 'NOABR', empaquetadura: 'NOABR', silicona: 'NOABR', fibra: 'FIB', artefacto: 'IGN', indet: 'IND' };
const FIRMA = ['sat', 'relL', 'spec', 'stdRel', 'q10', 'q90', 'grad', 'chromaStd', 'wbSat', 'maxRel', 'edgeSharp', 'circ'];
function vec_(f, h) {
  const v = FIRMA.map((k) => Number(f[k]) || 0);
  const hu = (Number(f.wbHue != null ? f.wbHue : f.hue) || 0) * Math.PI / 180, s = Number(f.wbSat != null ? f.wbSat : f.sat) || 0;
  v.push(s * Math.cos(hu), s * Math.sin(hu));
  return v;
}
function analisisDiario() {
  const sh = libro_(), last = sh.getLastRow();
  if (last < 3) return;
  const vals = sh.getRange(2, 1, last - 1, COLS.length).getValues();
  const ex = [];
  vals.forEach((r) => { try { ex.push({ site: String(r[2] || '(sin sitio)'), label: String(r[3]), at: r[1], v: vec_(JSON.parse(r[6])) }); } catch (e) { /* fila dañada */ } });
  const d = ex[0].v.length, mu = new Array(d).fill(0), sd = new Array(d).fill(0);
  ex.forEach((e) => e.v.forEach((x, j) => (mu[j] += x / ex.length)));
  ex.forEach((e) => e.v.forEach((x, j) => (sd[j] += (x - mu[j]) * (x - mu[j]) / ex.length)));
  for (let j = 0; j < d; j++) sd[j] = Math.max(1e-3, Math.sqrt(sd[j]));
  ex.forEach((e) => (e.z = e.v.map((x, j) => (x - mu[j]) / sd[j])));
  const sites = {}, ayer = Date.now() - 864e5;
  const muestra = ex.length > 3000 ? ex.filter((_, i) => i % Math.ceil(ex.length / 3000) === 0) : ex;
  muestra.forEach((e) => {
    const s = sites[e.site] = sites[e.site] || { n: 0, nuevos: 0, comp: 0, disc: 0, abrBlanda: 0, abr: 0 };
    let best = null, bd = Infinity;
    for (const o of ex) { if (o.site === e.site) continue; let q = 0; for (let j = 0; j < d; j++) { const t = e.z[j] - o.z[j]; q += t * t; } if (q < bd) { bd = q; best = o; } }
    if (!best) return;
    s.comp++;
    if (GRUPO[best.label] !== GRUPO[e.label]) s.disc++;
    if (GRUPO[e.label] === 'ABR') { s.abr++; if (GRUPO[best.label] === 'NOABR') s.abrBlanda++; }
  });
  ex.forEach((e) => { const s = sites[e.site]; if (!s) return; s.n++; if (e.at && new Date(e.at).getTime() > ayer) s.nuevos++; });
  const filas = Object.keys(sites).sort().map((k) => { const s = sites[k]; return [k, s.n, s.nuevos, s.comp ? s.disc / s.comp : 0, s.abr ? s.abrBlanda / s.abr : 0]; });
  // guarda el historial en otra pestaña (para gráficos en Sheets o Looker Studio)
  const ss = sh.getParent(); let hs = ss.getSheetByName('analisis');
  if (!hs) { hs = ss.insertSheet('analisis'); hs.appendRow(['fecha', 'sitio', 'ejemplos', 'nuevos 24 h', 'discrepancia con otros sitios', 'abrasivas parecidas a blandas']); hs.setFrozenRows(1); }
  const hoy = new Date();
  if (filas.length) hs.getRange(hs.getLastRow() + 1, 1, filas.length, 6).setValues(filas.map((f) => [hoy].concat(f)));
  // aviso por correo solo si algo merece atención
  const alerta = filas.filter((f) => f[1] >= 20 && (f[3] > 0.3 || f[4] > 0.1));
  const nuevos = filas.reduce((a, f) => a + f[2], 0);
  if (alerta.length || nuevos) {
    const pct = (x) => Math.round(x * 100) + ' %';
    let txt = 'Partículas C175 · análisis diario del aprendizaje\n\nEjemplos totales: ' + ex.length + ' · nuevos en 24 h: ' + nuevos + '\n\n';
    txt += filas.map((f) => '- ' + f[0] + ': ' + f[1] + ' ejemplos (' + f[2] + ' nuevos), discrepancia ' + pct(f[3]) + ', abrasivas parecidas a blandas ' + pct(f[4])).join('\n');
    if (alerta.length) txt += '\n\nATENCIÓN: ' + alerta.map((f) => f[0]).join(', ') + ' etiqueta distinto que los demás sitios (criterio, cámara o iluminación). Revise sus ejemplos en la hoja antes de que influyan en el resto.';
    txt += '\n\nHoja: ' + ss.getUrl();
    MailApp.sendEmail(Session.getEffectiveUser().getEmail(), 'Partículas C175 · análisis diario' + (alerta.length ? ' · revisar' : ''), txt);
  }
}
