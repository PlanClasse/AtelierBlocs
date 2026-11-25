'use strict';
/* ═══════════════ Atelier blocs · exercices à trous (v1.13.0) ═══════════════
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
  const map = new Map(), liste = []; let n = typeof repOffset==='function' ? repOffset(it, sc) : 0;
  walk(sc.list, b => { if (!aTrous(b)) return;
    const keys = b.tr.ligne ? ['ligne'] : partiesDe(b).map(x => x.key).filter(k => k!=='ligne' && (b.tr.p || {})[k]);
    for (const key of keys){ const L = LETTRES[n % 26] + (n >= 26 ? Math.floor(n / 26) : ''); n++; map.set(b.id + '|' + key, L); liste.push({L, b, key, s:specDe(b, key), ans:reponse(b, key)}); } });
  return {corr:CORR, lettre:(id, key) => map.get(id + '|' + key) || '?', liste}; }
function exoLignes(it, sc, found){ // [{parts:[[texte, gras, bleu]]}] ; found : lettres → réponses vues dans l'algorithme
  const c = exoCtx(sc, it), out = [];
  if (found) c.liste = c.liste.filter(t => found.has(t.L)).map(t => ({...t, ans:found.get(t.L)}));
  if (it.banque && !CORR){ const a = c.liste.filter(t => t.s.rep!=='choix').map(t => t.ans).filter(Boolean), r = rng(seedOf(it) + 5);
    for (let j = a.length - 1; j > 0; j--){ const m = Math.floor(r() * (j + 1)); [a[j], a[m]] = [a[m], a[j]]; }
    if (a.length) out.push({parts:[['Réponses à placer : ', true], [a.join('     ·     '), false]]}); }
  c.liste.forEach((t, i) => { if (t.s.rep!=='choix') return;
    const opts = [t.ans, ...(t.s.props || []).filter(x => x && x!==t.ans)], r = rng(seedOf(it) + i * 97);
    for (let j = opts.length - 1; j > 0; j--){ const m = Math.floor(r() * (j + 1)); [opts[j], opts[m]] = [opts[m], opts[j]]; }
    const parts = [[t.L + ' : ', true]]; opts.forEach(o => parts.push([(CORR && o===t.ans ? '☑ ' : '☐ ') + o + '      ', CORR && o===t.ans, CORR && o===t.ans]));
    out.push({parts}); });
  if (CORR && c.liste.length){ const tot = c.liste.reduce((s, t) => s + (+t.s.pts || 0), 0);
    out.push({parts:[['Barème : ', true], [c.liste.map(t => t.L + ' ' + (+t.s.pts || 0) + ' pt' + ((+t.s.pts || 0) > 1 ? 's' : '')).join(' · ') + '  —  total : ' + tot + ' pt' + (tot > 1 ? 's' : ''), false, true]]}); }
  return out; }
function exoHTML(it, sc, found){
  const l = exoLignes(it, sc, found); if (!l.length) return '';
  return '<div class="exo-props">' + l.map(x => '<div>' + x.parts.map(([t, b, bl]) => `<span style="${b ? 'font-weight:700;' : ''}${bl ? 'color:#1D4ED8;' : ''}white-space:pre-wrap">${esc(t)}</span>`).join('') + '</div>').join('') + '</div>'; }
function exoDocx(it, sc, children, D, found){
  for (const x of exoLignes(it, sc, found)) children.push(new D.Paragraph({spacing:{after:60}, children: x.parts.map(([t, b, bl]) => new D.TextRun({text:t, bold:!!b, color: bl ? '1D4ED8' : undefined}))})); }

/* ---------- Trous dans l'algorithme et l'algorigramme (v1.13.0) ----------
   Mêmes lettres que dans le programme. Pendant le rendu d'un élément de fiche, EXO_ALG est actif :
   exoT(b, F) calcule le texte F() puis, pour chaque trou, retrouve la partie concernée en comparant avec le texte obtenu
   quand la valeur est neutralisée (diff préfixe / suffixe). La partie est remplacée par un jeton \u0001n\u0002. */
let EXO_ALG = null, EXO_LAST = null;
const EXTOK = /\u0001(\d+)\u0002/g;
function avecTrousAlgo(sc, it, fn){
  if (it.trous===false || !progATrous(sc)){ EXO_LAST = null; return fn(); }
  EXO_ALG = {ctx:exoCtx(sc, it), toks:[], found:new Map(), corr:CORR};
  try { return fn(); } finally { EXO_LAST = EXO_ALG.found; EXO_ALG = null; } }
function exoTok(x, key, ans){
  const E = EXO_ALG, L = E.ctx.lettre(x.id, key); ans = String(ans).replace(EXTOK, (m, i) => E.toks[+i].ans).trim();
  E.toks.push({L, key, s:specDe(x, key) || {}, ans}); E.found.set(L, ans);
  return '\u0001' + (E.toks.length - 1) + '\u0002'; }
const tokAns = s => !EXO_ALG ? s : String(s).replace(EXTOK, (m, i) => EXO_ALG.toks[+i].ans);
function exoMut(x, k){ // neutralise une valeur (ou un bloc rond) le temps d'un calcul
  const hadIn = !!(x.in && x.in[k]), ch = hadIn ? x.in[k] : null, had = k in x.f, f = x.f[k];
  if (hadIn) delete x.in[k]; x.f[k] = '\u0007';
  return () => { if (hadIn) x.in[k] = ch; if (had) x.f[k] = f; else delete x.f[k]; }; }
function exoDiff(T, F, muts){
  const rs = muts.map(([x, k]) => exoMut(x, k)); let M;
  try { M = F(); } finally { rs.reverse().forEach(r => r()); }
  if (M===T) return null;
  let p = 0; const n = Math.min(T.length, M.length); while (p < n && T[p]===M[p]) p++;
  let s = 0; while (s < n - p && T[T.length-1-s]===M[M.length-1-s]) s++;
  return {r:[p, T.length - s], M}; }
// nom d'une instruction dans un texte : le premier morceau de mots entre les valeurs
function exoNomR(b, T, F){
  const d = exoDiff(T, F, valKeys(b).map(k => [b, k]));
  if (!d) return [0, T.length];
  const seg = d.M.split(/\u0007|…/).map(x => x.trim()).find(x => /[a-zà-ÿ]/i.test(x)); if (!seg) return null;
  const m = new RegExp('(^|[^a-zà-ÿ0-9])(' + seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')(?![a-zà-ÿ0-9])', 'i').exec(T);
  return m ? [m.index + m[1].length, m.index + m[1].length + seg.length] : null; }
const valKeys = b => ligne0(b).filter(p => typeof p==='object' && p.k && !['ico','vname','pname','pparam','edit'].includes(p.t)).map(p => p.k);
function exoT(b, F, mode = 'line'){
  if (!EXO_ALG) return F();
  const T = F(), holes = [];
  const visit = (x, par, pk) => { if (aTrous(x)){ if (x.tr.ligne) holes.push({x, key:'ligne', par, pk}); else for (const k in (x.tr.p || {})) holes.push({x, key:k, par, pk}); }
    for (const [k, c] of Object.entries(x.in || {})) if (c) visit(c, x, k); };
  visit(b, null, null);
  if (!holes.length) return T;
  const regs = [];
  for (const h of holes){ let r = null;
    if (h.x!==b && h.key==='nom'){ const tc = valText(h.x), t2 = tc.replace(/^\((.*)\)$/, '$1'), i = T.indexOf(tc) >= 0 ? T.indexOf(tc) : T.indexOf(t2);
      if (i >= 0){ const n = exoNomR(h.x, T.indexOf(tc) >= 0 ? tc : t2, () => { const v = valText(h.x); return T.indexOf(tc) >= 0 ? v : v.replace(/^\((.*)\)$/, '$1'); }); if (n) r = [i + n[0], i + n[1]]; } }
    else if (h.x!==b && h.key==='ligne'){ const d = exoDiff(T, F, [[h.par, h.pk]]); r = d && d.r; }
    else if (h.key==='ligne'){ if (mode!=='vals') return exoTok(b, 'ligne', T); }
    else if (h.key==='nom'){ if (mode!=='line') continue; r = exoNomR(b, T, F); }
    else { const d = exoDiff(T, F, [[h.x, h.key]]); r = d && d.r;
      if (!r && h.x.alg){ const v = partieTexte(h.x, ligne0(h.x).find(p => p.k===h.key) || ''), i = v ? T.indexOf(v) : -1; if (i >= 0) r = [i, i + v.length]; } }
    if (r && r[1] > r[0]) regs.push({r, h}); }
  regs.sort((a, b) => (b.r[1] - b.r[0]) - (a.r[1] - a.r[0]));
  const keep = []; for (const g of regs) if (!keep.some(k => g.r[0] < k.r[1] && k.r[0] < g.r[1])) keep.push(g);
  keep.sort((a, b) => b.r[0] - a.r[0]);
  let s = T; for (const g of keep){ const a = s.slice(g.r[0], g.r[1]), lead = a.match(/^\s*/)[0], tail = a.match(/\s*$/)[0];
    s = s.slice(0, g.r[0]) + lead + exoTok(g.h.x, g.h.key, a) + tail + s.slice(g.r[1]); }
  return s; }
const exoCond = (b, F) => EXO_ALG ? exoT(b, F, 'cond') : F();
const exoVal = (b, F) => EXO_ALG ? exoT(b, F, 'vals') : F();
// ligne de l'algorithme pour une structure (SI, RÉPÉTER…) : ligne entière ou mot-clé à trouver
function exoCtl(b, parts){
  if (!EXO_ALG || !aTrous(b)) return parts;
  const T = t => [t, false];
  if (b.tr.ligne) return [T(exoTok(b, 'ligne', parts.map(p => p[0]).join('').replace(/\s+/g, ' ')))];
  if ((b.tr.p || {}).nom){ const last = parts.length > 1 && parts[parts.length-1][1] ? parts.length - 1 : -1, mid = parts.slice(1, last > 0 ? last : undefined);
    const ans = (parts[0][0] + (mid.length ? ' … ' : '') + (last > 0 ? parts[last][0] : '')).replace(/\s+/g, ' ').trim();
    return [T(exoTok(b, 'nom', ans)), ...(mid.length ? [T(' '), ...mid] : [])]; }
  return parts; }
const exoFin = (b, parts) => EXO_ALG && b.tr && (b.tr.ligne || (b.tr.p || {}).nom) ? [['FIN', true]] : parts;

/* rendu des jetons : largeur, SVG, HTML, docx */
const tokOf = i => EXO_ALG && EXO_ALG.toks[+i];
function tokW(t){ if (!t) return 0; if (EXO_ALG.corr) return acv.measureText(t.ans).width + 34;
  return t.key==='ligne' ? 230 : t.key==='nom' ? 112 : 62; }
function tokAtw(s){ let w = 0; String(s).split(/(\u0001\d+\u0002)/).forEach((x, j) => { w += j % 2 ? tokW(tokOf(x.slice(1, -1))) + 6 : acv.measureText(x).width; }); return w; }
function tokSVG(t, x, cy){ // jeton dessiné à partir de x, centré verticalement sur cy
  const w = tokW(t), y = cy - 11, h = 22, corr = EXO_ALG.corr, coin = corr || posDe(t.s)==='coin';
  let g = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="#fff" stroke="#111" stroke-width="1.8"/>`;
  if (coin) g += `<rect x="${x+0.9}" y="${y+0.9}" width="15" height="13" fill="#111"/><text x="${x+8.4}" y="${y+11}" text-anchor="middle" style="fill:#fff;font-size:10.5px;font-weight:800;font-style:normal">${t.L}</text>`;
  else g += `<circle cx="${x+w/2}" cy="${cy}" r="8.5" fill="#fff" stroke="#111" stroke-width="1.5"/><text x="${x+w/2}" y="${cy+4}" text-anchor="middle" style="fill:#111;font-size:11px;font-weight:800;font-style:normal">${t.L}</text>`;
  if (!corr && t.key==='ligne') g += `<line x1="${x+20}" y1="${y+h-5}" x2="${x+w-8}" y2="${y+h-5}" stroke="#6B7280" stroke-width="1" stroke-dasharray="2 3"/>`;
  if (corr) g += `<text x="${x+20}" y="${cy+4.5}" style="fill:#1D4ED8;font-style:italic;font-weight:700;font-size:12.5px">${aesc(t.ans)}</text>`;
  return g; }
function tokLine(l, cx, cy, anchor, cls, central){ // une ligne de texte contenant des jetons
  const W = tokAtw(l), my = central ? cy : cy - 4; let x = anchor==='middle' ? cx - W/2 : anchor==='end' ? cx - W : cx, s = '';
  String(l).split(/(\u0001\d+\u0002)/).forEach((p, j) => {
    if (j % 2){ const t = tokOf(p.slice(1, -1)); if (t){ s += tokSVG(t, x + 3, my); x += tokW(t) + 6; } return; }
    if (!p) return;
    s += `<text x="${x}" y="${cy}" text-anchor="start" xml:space="preserve"${central ? ' dominant-baseline="central"' : ''}${cls ? ` class="${cls}"` : ''}>${aesc(p)}</text>`;
    x += acv.measureText(p).width; });
  return s; }
function tokHTML(s){
  return String(s).split(/(\u0001\d+\u0002)/).map((p, j) => { if (!(j % 2)) return aesc(p);
    const t = tokOf(p.slice(1, -1)); if (!t) return '';
    const k = t.key==='ligne' ? ' l' : t.key==='nom' ? ' n' : '';
    if (EXO_ALG.corr) return `<span class="ta k${k}"><b>${t.L}</b><i>${aesc(t.ans)}</i></span>`;
    return posDe(t.s)==='coin' ? `<span class="ta${k}"><b>${t.L}</b></span>` : `<span class="ta c${k}"><b>${t.L}</b></span>`; }).join(''); }
function tokRuns(text, bold, D){
  if (!EXO_ALG || !String(text).includes('\u0001')) return [new D.TextRun({text, bold})];
  const out = [];
  String(text).split(/(\u0001\d+\u0002)/).forEach((p, j) => {
    if (!(j % 2)){ if (p) out.push(new D.TextRun({text:p, bold})); return; }
    const t = tokOf(p.slice(1, -1)); if (!t) return;
    const dots = '…'.repeat(t.key==='ligne' ? 34 : t.key==='nom' ? 12 : 7), lab = new D.TextRun({text:' ' + t.L + ' ', bold:true, color:'FFFFFF', shading:{type:'clear', fill:'111111', color:'auto'}});
    if (EXO_ALG.corr) out.push(lab, new D.TextRun({text:' ' + t.ans + ' ', bold:true, italics:true, color:'1D4ED8'}));
    else if (posDe(t.s)==='coin') out.push(lab, new D.TextRun({text:dots, color:'6B7280'}));
    else { const half = dots.slice(0, Math.ceil(dots.length / 2)); out.push(new D.TextRun({text:half, color:'6B7280'}), new D.TextRun({text:' ' + String.fromCodePoint(0x24B6 + LETTRES.indexOf(t.L[0])) + ' ', bold:true}), new D.TextRun({text:half, color:'6B7280'})); } });
  return out; }

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
