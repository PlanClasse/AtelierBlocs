'use strict';
/* ═══════════════ Atelier blocs · exercices à trous (v1.12.0) ═══════════════
   Un trou se règle par instruction (clic droit sur un bloc, ou clic sur une instruction dans la fiche) :
   le nom de l'instruction, une ou plusieurs valeurs / menus, ou la ligne entière.
   Réponse à écrire (lettre en étiquette dans le coin) ou au choix (lettre entourée au centre, propositions sous le programme).
   Le corrigé (case « Corrigé » de la fiche) remplit les trous en bleu et donne le barème.
   Données : b.tr = {ligne: spec} ou {p: {nom: spec, k0: spec, …}} ; spec = {rep:'libre'|'choix', ans, props:[…], pos:'auto'|'coin'|'centre', pts} */
let CORR = false;
const LETTRES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const aTrous = b => !!(b && b.tr && (b.tr.ligne || Object.keys(b.tr.p || {}).length));
const progATrous = sc => { let r = false; walk(sc.list, b => { if (aTrous(b)) r = true; }); return r; };

/* ---------- Parties d'une instruction et réponses par défaut ---------- */
function partieTexte(b, p){
  if (typeof p==='string') return p;
  const ch = b.in && b.in[p.k]; if (ch) return valText(ch).replace(/^\((.*)\)$/, '$1');
  if (p.t==='col') return colName(b.f[p.k]);
  if (p.t==='c5') return '5 couleurs';
  if (p.t==='ico') return '';
  if (p.t==='pname' || p.t==='pparam') return p.v;
  return String(b.f[p.k] ?? '');
}
const ligne0 = b => (DEF[b.type] ? DEF[b.type].rows[0] : []);
const repNom = b => ligne0(b).map(p => typeof p==='string' ? p : (p.t==='ico' ? '' : '…')).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
const repLigne = b => ligne0(b).map(p => partieTexte(b, p)).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
function partiesDe(b){
  const row = ligne0(b), out = [];
  if (row.some(p => typeof p==='string' || p.t==='pname')) out.push({key:'nom', label:'Nom de l\'instruction', ans:repNom(b)});
  for (const p of row) if (typeof p==='object' && p.k && !['ico','vname','pname','pparam','edit'].includes(p.t))
    out.push({key:p.k, label:(p.t==='b' ? 'Condition' : ['dd','var','list','msg','col','c5'].includes(p.t) ? 'Menu' : 'Valeur'), ans:partieTexte(b, p) || '…'});
  out.push({key:'ligne', label:'Ligne entière à écrire', ans:repLigne(b)});
  return out; }
const specDe = (b, key) => !b.tr ? null : key==='ligne' ? b.tr.ligne : (b.tr.p || {})[key];
const reponse = (b, key) => { const s = specDe(b, key); if (s && s.ans) return s.ans; const pt = partiesDe(b).find(x => x.key===key); return pt ? pt.ans : ''; };
const posDe = s => s.pos && s.pos!=='auto' ? s.pos : (s.rep==='choix' ? 'centre' : 'coin');

/* ---------- Ligne de bloc avec trous (appelée par lay) ---------- */
function exoRow(row, b){
  if (b.tr.ligne) return [{t:'trou', key:'ligne'}];
  const P = b.tr.p || {}, out = [];
  if (P.nom) out.push({t:'trou', key:'nom'});
  for (const p of row){
    if (typeof p==='string' || p.t==='pname'){ if (!P.nom) out.push(p); continue; }
    if (p.t==='ico' && P.nom) continue;
    out.push(p.k && P[p.k] ? {t:'trou', key:p.k} : p); }
  return out; }
function trouSize(p, b, o){
  const corr = o.exo && o.exo.corr, a = corr ? reponse(b, p.key) : '';
  if (p.key==='ligne') return {w:Math.max(330, tw(repLigne(b)) + 70, corr ? tw(a) + 60 : 0), h:44};
  if (p.key==='nom') return {w:Math.max(150, corr ? tw(a) + 44 : 0), h:30};
  return {w:Math.max(84, corr ? tw(a) + 40 : 0), h:30}; }
function trouSVG(it, p, cy, b, o){
  const s = specDe(b, p.key) || {}, L = o.exo ? o.exo.lettre(b.id, p.key) : '?', x = it.x, y = cy - it.h/2, w = it.w, h = it.h, corr = o.exo && o.exo.corr;
  let g = `<g data-k="${p.key}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="#fff" stroke="#111" stroke-width="2.4"/>`;
  if (p.key==='ligne' && !corr) g += `<line x1="${x+26}" y1="${y+h-10}" x2="${x+w-12}" y2="${y+h-10}" stroke="#6B7280" stroke-width="1.2" stroke-dasharray="2 3"/>`;
  if (corr || posDe(s)==='coin') g += `<rect x="${x+1.2}" y="${y+1.2}" width="19" height="17" fill="#111"/><text x="${x+10.7}" y="${y+14}" text-anchor="middle" style="fill:#fff;font-size:13px;font-weight:800">${L}</text>`;
  else g += `<circle cx="${x+w/2}" cy="${cy}" r="11" fill="#fff" stroke="#111" stroke-width="1.8"/><text x="${x+w/2}" y="${cy+4.5}" text-anchor="middle" style="fill:#111;font-size:13px;font-weight:800">${L}</text>`;
  if (corr) g += `<text x="${p.key==='ligne' ? x+28 : x+w/2+8}" y="${cy+4.5}" ${p.key==='ligne' ? '' : 'text-anchor="middle"'} style="fill:#1D4ED8;font-style:italic;font-weight:700;font-size:13px">${esc(reponse(b, p.key))}</text>`;
  return g + '</g>'; }

/* ---------- Lettres, propositions, barème d'un élément de fiche ---------- */
function exoCtx(sc, it){
  const map = new Map(), liste = []; let n = 0;
  walk(sc.list, b => { if (!aTrous(b)) return;
    const keys = b.tr.ligne ? ['ligne'] : partiesDe(b).map(x => x.key).filter(k => k!=='ligne' && (b.tr.p || {})[k]);
    for (const key of keys){ const L = LETTRES[n % 26] + (n >= 26 ? Math.floor(n / 26) : ''); n++; map.set(b.id + '|' + key, L); liste.push({L, b, key, s:specDe(b, key), ans:reponse(b, key)}); } });
  return {corr:CORR, lettre:(id, key) => map.get(id + '|' + key) || '?', liste}; }
function exoLignes(it, sc){ // [{parts:[[texte, gras, bleu]]}]
  const c = exoCtx(sc, it), out = [];
  c.liste.forEach((t, i) => { if (t.s.rep!=='choix') return;
    const opts = [t.ans, ...(t.s.props || []).filter(x => x && x!==t.ans)], r = rng((it.seed || 7) + i * 97);
    for (let j = opts.length - 1; j > 0; j--){ const m = Math.floor(r() * (j + 1)); [opts[j], opts[m]] = [opts[m], opts[j]]; }
    const parts = [[t.L + ' : ', true]]; opts.forEach(o => parts.push([(CORR && o===t.ans ? '☑ ' : '☐ ') + o + '      ', CORR && o===t.ans, CORR && o===t.ans]));
    out.push({parts}); });
  if (CORR && c.liste.length){ const tot = c.liste.reduce((s, t) => s + (+t.s.pts || 0), 0);
    out.push({parts:[['Barème : ', true], [c.liste.map(t => t.L + ' ' + (+t.s.pts || 0) + ' pt' + ((+t.s.pts || 0) > 1 ? 's' : '')).join(' · ') + '  —  total : ' + tot + ' pt' + (tot > 1 ? 's' : ''), false, true]]}); }
  return out; }
function exoHTML(it, sc){
  const l = exoLignes(it, sc); if (!l.length) return '';
  return '<div class="exo-props">' + l.map(x => '<div>' + x.parts.map(([t, b, bl]) => `<span style="${b ? 'font-weight:700;' : ''}${bl ? 'color:#1D4ED8;' : ''}white-space:pre-wrap">${esc(t)}</span>`).join('') + '</div>').join('') + '</div>'; }
function exoDocx(it, sc, children, D){
  for (const x of exoLignes(it, sc)) children.push(new D.Paragraph({spacing:{after:60}, children: x.parts.map(([t, b, bl]) => new D.TextRun({text:t, bold:!!b, color: bl ? '1D4ED8' : undefined}))})); }

/* ---------- Fenêtre de réglage d'une instruction ---------- */
function trouDialog(b, focus){
  const parts = partiesDe(b), tr = JSON.parse(JSON.stringify(b.tr || {}));
  const spec = key => key==='ligne' ? tr.ligne : (tr.p || {})[key];
  const rows = parts.map(p => { const s = spec(p.key) || {}; return `<tr data-key="${p.key}"${p.key===focus ? ' class="exo-focus"' : ''}>
    <td><input type="checkbox" class="on"${spec(p.key) ? ' checked' : ''}></td>
    <td><b>${esc(p.label)}</b>${p.key!=='ligne' && p.key!=='nom' ? '' : ''}</td>
    <td><select class="rep"><option value="libre"${s.rep!=='choix' ? ' selected' : ''}>à écrire</option><option value="choix"${s.rep==='choix' ? ' selected' : ''}>au choix</option></select></td>
    <td><input class="ans" value="${esc(s.ans || p.ans)}" style="width:190px"></td>
    <td><input class="props" value="${esc((s.props || []).join(' / '))}" placeholder="reculer / tourner…" style="width:200px"></td>
    <td><select class="pos"><option value="auto">auto</option><option value="coin"${s.pos==='coin' ? ' selected' : ''}>coin</option><option value="centre"${s.pos==='centre' ? ' selected' : ''}>centre</option></select></td>
    <td><input class="pts" type="number" min="0" step="0.5" value="${s.pts ?? (p.key==='ligne' ? 2 : 1)}" style="width:54px"></td></tr>`; }).join('');
  dialog(`<p style="margin:0 0 4px;font-weight:600">Trou d'exercice : ${esc(repLigne(b))}</p>
    <p class="muted" style="margin:0 0 10px">Cochez ce que l'élève doit trouver. « Au choix » : écrivez les autres propositions, séparées par « / » ; la bonne réponse y est ajoutée et le tout est mélangé.</p>
    <table class="exo-t"><thead><tr><th>Trou</th><th>Partie</th><th>Réponse</th><th>Réponse attendue</th><th>Autres propositions</th><th>Lettre</th><th>Points</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="row"><button class="del">Retirer les trous</button><span style="flex:1"></span><button class="no">Annuler</button><button class="pri ok">OK</button></div>`, (ov, close) => {
    const trs = [...ov.querySelectorAll('tbody tr')], ligneTr = trs.find(r => r.dataset.key==='ligne');
    const maj = () => { const lg = ligneTr.querySelector('.on').checked;
      trs.forEach(r => { const on = r.querySelector('.on').checked; r.classList.toggle('exo-off', !on || (lg && r!==ligneTr));
        if (r!==ligneTr) r.querySelector('.on').disabled = lg;
        r.querySelector('.props').disabled = r.querySelector('.rep').value!=='choix'; }); };
    trs.forEach(r => r.querySelectorAll('input,select').forEach(x => x.addEventListener('change', maj)));
    if (focus){ const f = trs.find(r => r.dataset.key===focus); if (f && !f.querySelector('.on').checked){ f.querySelector('.on').checked = true; } }
    maj();
    ov.querySelector('.no').onclick = close;
    ov.querySelector('.del').onclick = () => { delete b.tr; close(); draw(); };
    ov.querySelector('.ok').onclick = () => {
      const lire = r => ({rep:r.querySelector('.rep').value, ans:r.querySelector('.ans').value.trim(), props:r.querySelector('.props').value.split('/').map(x => x.trim()).filter(Boolean), pos:r.querySelector('.pos').value, pts:+r.querySelector('.pts').value || 0});
      const nt = {};
      if (ligneTr.querySelector('.on').checked) nt.ligne = lire(ligneTr);
      else { nt.p = {}; trs.forEach(r => { if (r!==ligneTr && r.querySelector('.on').checked) nt.p[r.dataset.key] = lire(r); }); }
      parts.forEach(p => { const s = p.key==='ligne' ? nt.ligne : (nt.p || {})[p.key]; if (s && s.ans===p.ans) delete s.ans; });
      if (nt.ligne || Object.keys(nt.p || {}).length) b.tr = nt; else delete b.tr;
      close(); draw(); };
  }); }

/* ---------- Case « Corrigé » de la fiche ---------- */
(() => { const c = document.getElementById('cCorr'); if (c) c.onchange = () => { CORR = c.checked; document.body.classList.toggle('corrige', CORR); drawDoc(); }; })();
