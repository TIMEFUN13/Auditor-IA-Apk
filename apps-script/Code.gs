/**
 * Partículas C175 · servidor de sincronización del aprendizaje (gratis, Google Apps Script)
 * ------------------------------------------------------------------------------------------
 * Guarda en una hoja de cálculo los ejemplos que cada tablet confirma (con persona) y los
 * reparte a las demás. Las tablets trabajan sin internet y sincronizan cuando hay señal.
 *
 * Instalación: vea LEEME.md en esta misma carpeta.
 *   1) Propiedad del script «CLAVE» = una clave larga que solo conozcan sus tablets.
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
