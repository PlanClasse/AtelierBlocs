'use strict';
/* ═══════════════ Atelier blocs · « Trouver l'erreur » (v1.15.0) ═══════════════
   Une copie du programme (sc.orig = id de l'original) est modifiée dans la zone de travail.
   Les différences avec l'original sont repérées automatiquement (valeur changée, instruction en trop,
   oubliée ou déplacée), affichées sur la copie pendant qu'on la modifie, et données dans le corrigé. */
const errRef = sc => sc && sc.orig ? S.scripts.find(s => s.id===sc.orig) || null : null;
function errLignes(list){ // instructions empilées, avec leur profondeur (les blocs ronds font partie de la ligne)
  const out = [];
  const rec = (l, d) => { for (const b of l){ if (!DEF[b.type]) continue; out.push({b, key:b.type + '|' + d, txt:repLigne(b)});
    if (b.body) rec(b.body, d + 1); if (b.body2){ out.push({b:null, key:'sinon|' + d, txt:''}); rec(b.body2, d + 1); } } };
  rec(list, 0); return out; }
function errDiff(sc){
  const ref = errRef(sc); if (!ref) return null;
  const A = errLignes(ref.list), B = errLignes(sc.list), n = A.length, m = B.length;
  const sc2 = (i, j) => A[i].key===B[j].key ? (A[i].txt===B[j].txt ? 3 : 2) : -1;
  const T = Array.from({length:n + 1}, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--){ const s = sc2(i, j); T[i][j] = Math.max(T[i+1][j], T[i][j+1], s > 0 ? T[i+1][j+1] + s : -1); }
  const E = [], avant = j => { for (let k = j - 1; k >= 0; k--) if (B[k].b) return B[k].b; return null; };
  let i = 0, j = 0;
  const manque = (i, j) => { if (!A[i].b) return; let p = null; for (let k = i - 1; k >= 0; k--) if (A[k].b){ p = A[k].txt; break; }
    const an = avant(j); E.push({kind:'manque', b: an || (B.find(x => x.b) || {}).b, where: an ? 'apres' : 'avant', pos: j - 0.5, bonne:A[i].txt, prev:p}); };
  const trop = j => { if (B[j].b) E.push({kind:'trop', b:B[j].b, pos:j, fausse:B[j].txt}); };
  while (i < n && j < m){ const s = sc2(i, j);
    if (s > 0 && T[i][j]===T[i+1][j+1] + s){ if (s===2 && B[j].b) E.push({kind:'val', b:B[j].b, pos:j, bonne:A[i].txt, fausse:B[j].txt}); i++; j++; }
    else if (T[i+1][j] >= T[i][j+1]){ manque(i, j); i++; }
    else { trop(j); j++; } }
  for (; i < n; i++) manque(i, j);
  for (; j < m; j++) trop(j);
  // instruction déplacée : en trop à un endroit, oubliée à un autre, même texte
  for (const t of E.filter(e => e.kind==='trop')){ const k = E.find(e => e.kind==='manque' && e.bonne===t.fausse); if (!k) continue;
    E.splice(E.indexOf(k), 1); t.kind = 'place'; t.bonne = k.prev ? 'à placer après « ' + k.prev + ' »' : 'à placer au début'; }
  E.sort((a, b) => a.pos - b.pos); E.forEach((e, k) => e.n = k + 1);
  return E.filter(e => e.b); }
function errTexte(e){
  if (e.kind==='val') return '« ' + e.fausse + ' » au lieu de « ' + e.bonne + ' »';
  if (e.kind==='trop') return '« ' + e.fausse + ' » : instruction en trop';
  if (e.kind==='place') return '« ' + e.fausse + ' » mal placée : ' + e.bonne;
  return 'il manque « ' + e.bonne + ' »' + (e.prev ? ' après « ' + e.prev + ' »' : ' au début'); }
const errCourt = e => e.kind==='val' ? '→ ' + e.bonne : e.kind==='trop' ? '✗ en trop' : e.kind==='place' ? '↕ ' + e.bonne : '+ manque : ' + e.bonne;
function errMarks(sc){ const E = errDiff(sc); if (!E || !E.length) return null; const M = new Map();
  for (const e of E){ if (!M.has(e.b.id)) M.set(e.b.id, []); M.get(e.b.id).push(e); } return M; }
// repères rouges sur une instruction (appelé par renderBlock quand o.errs est fourni)
function errSVG(list, b, x, y, L, o){
  const top = DEF[b.type].sh==='hat' ? HAT : 0, h0 = L.rows[0].h; let s = '';
  const badge = (cx, cy, n) => `<circle cx="${cx}" cy="${cy}" r="9.5" fill="#DC2626" stroke="#fff" stroke-width="1.5"/><text x="${cx}" y="${cy + 4}" text-anchor="middle" style="fill:#fff;font-size:11px;font-weight:800">${n}</text>`;
  const note = (tx, ty, t) => { o.box.x2 = Math.max(o.box.x2, tx + tw(t) + 12); return `<text x="${tx}" y="${ty}" style="fill:#1D4ED8;font-style:italic;font-weight:700;font-size:12.5px">${esc(t)}</text>`; };
  let ny = 0;
  for (const e of list){
    if (e.kind==='manque'){ const yy = e.where==='avant' ? y + top - 2 : y + L.h, w = Math.max(L.w, 140);
      s += `<line x1="${x - 4}" y1="${yy}" x2="${x + w}" y2="${yy}" stroke="#DC2626" stroke-width="3" stroke-dasharray="7 4"/>` + badge(x - 15, yy, e.n) + note(x + w + 10, yy + 4, errCourt(e)); }
    else { s += `<rect x="${x - 3}" y="${y + top - 3}" width="${L.w + 6}" height="${h0 + 6}" rx="7" fill="none" stroke="#DC2626" stroke-width="2.6"/>` + badge(x - 15, y + top + h0/2, e.n)
      + note(x + L.w + 12, y + top + h0/2 + 4 + ny, errCourt(e)); ny += 16; } }
  o.box.x1 = Math.min(o.box.x1, x - 27);
  o.svg += `<g style="pointer-events:none">${s}</g>`; }

/* ---------- Sous l'élément de fiche : nombre d'erreurs, lignes de réponse, corrigé ---------- */
function errLignesFiche(it, sc){ // [{parts:[[texte, gras, bleu]]}]
  const E = errDiff(sc); if (!E) return [];
  const out = [], n = E.length;
  if (CORR){ out.push({parts:[['Erreurs : ', true], [n ? '' : 'aucune', false, true]]}); E.forEach(e => out.push({parts:[[e.n + '. ', true, true], [errTexte(e), false, true]]})); return out; }
  if (it.errN!==false) out.push({parts:[['Ce programme contient ' + n + ' erreur' + (n > 1 ? 's' : '') + '.', true]]});
  if (it.errRep) for (let k = 1; k <= n; k++) out.push({parts:[['Erreur ' + k + ' : ', true], ['…'.repeat(70), false]], dots:true});
  return out; }
function errHTML(it, sc){
  const l = errLignesFiche(it, sc); if (!l.length) return '';
  return '<div class="err-z">' + l.map(x => '<div' + (x.dots ? ' class="dots"' : '') + '>' + x.parts.map(([t, b, bl]) => x.dots && !b ? '<span class="dl"></span>' : `<span style="${b ? 'font-weight:700;' : ''}${bl ? 'color:#1D4ED8;' : ''}">${esc(t)}</span>`).join('') + '</div>').join('') + '</div>'; }
function errDocx(it, sc, children, D){
  for (const x of errLignesFiche(it, sc)) children.push(new D.Paragraph({spacing:{after: x.dots ? 160 : 60}, children: x.parts.map(([t, b, bl]) => new D.TextRun({text:t, bold:!!b, color: bl ? '1D4ED8' : (x.dots && !b ? '6B7280' : undefined)}))})); }

/* ---------- Créer la copie à modifier ---------- */
function errCopie(sc){
  const x2 = Math.max(...S.scripts.map(s => s._box && s._box.x2 > -1e8 ? s._box.x2 : s.x + 300));   // à droite de tout, à la hauteur de l'original
  const cp = {id:nid(), x:Math.round(x2 + 90), y:sc.y, list:sc.list.map(clone), orig:sc.id};
  S.scripts.push(cp); return cp; }
function errAller(cp, msg){
  setView('prog'); selected = cp.id; S.sel = cp.id; S.px = 60 - cp.x; S.py = 70 - cp.y; draw();
  if (msg) note(msg); }
const ERR_AIDE = 'Modifiez cette copie (marquée 🐞) comme l\'élève la trouvera : changez une valeur, ajoutez, supprimez ou déplacez une instruction. Les erreurs apparaissent en rouge au fur et à mesure. Revenez ensuite à la fiche : elles sont reprises dans le corrigé.';
const errOn = (it, sc) => !!errRef(sc) && it.err!==false;

/* ---------- Panneau de la fiche ---------- */
function panelErr(it, sc){
  const ref = errRef(sc), on = errOn(it, sc), E = ref ? errDiff(sc) || [] : [];
  let h = `<div class="ps"><div class="pt">Trouver l'erreur${on ? ` <span>${E.length} erreur${E.length > 1 ? 's' : ''}</span>` : ''}</div>`;
  if (!ref) return h + `<p class="hint">L'élève reçoit une copie du programme avec des erreurs. Vous la modifiez dans la zone de travail ; les différences avec l'original sont repérées automatiquement et vont dans le corrigé.</p><div class="prow"><button class="sm err-new">🐞 Créer la version avec erreurs</button></div></div>`;
  h += `<div class="prow"><label><input type="checkbox" class="perr"${on ? ' checked' : ''}> Exercice « trouver l'erreur »</label></div><p class="hint">Copie de ${esc(progLabel(ref).replace(/ : .*/, ''))}, modifiée.</p>`;
  h += E.length ? '<ol class="err-l">' + E.map(e => `<li>${esc(errTexte(e))}</li>`).join('') + '</ol>' : '<p class="hint">Aucune différence pour l\'instant : modifiez la copie.</p>';
  if (on) h += `<div class="prow"><label><input type="checkbox" class="perrn"${it.errN!==false ? ' checked' : ''}> Annoncer le nombre d'erreurs</label><label><input type="checkbox" class="perrr"${it.errRep ? ' checked' : ''}> Lignes de réponse</label></div>`;
  return h + `<div class="prow"><button class="sm err-edit">✏️ Modifier la copie</button><button class="sm err-orig" title="Ajoute le programme juste, par exemple pour comparer">+ L'original dans la fiche</button></div></div>`; }
function bindErr(P, it, sc, i){
  const up = fn => { fn(); save(); drawDoc(); }, q = s => P.querySelector(s);
  if (q('.err-new')) q('.err-new').onclick = () => { const cp = errCopie(sc); it.sid = cp.id; it.err = true; save(); errAller(cp, ERR_AIDE); };
  if (q('.err-edit')) q('.err-edit').onclick = () => errAller(sc);
  if (q('.err-orig')) q('.err-orig').onclick = () => up(() => S.doc.splice(i + 1, 0, {id:nid(), t:'prog', sid:sc.orig, mode: it.mode, algoStyle: it.algoStyle, seed:it.seed, scale:it.scale || 1, hide:[], err:false}));
  [['.perr', 'err'], ['.perrn', 'errN'], ['.perrr', 'errRep']].forEach(([s, k]) => { const c = q(s); if (c) c.onchange = () => up(() => it[k] = c.checked); }); }
