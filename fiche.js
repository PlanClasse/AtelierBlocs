'use strict';
/* ═══════════════ Atelier blocs · fiche d'exercices (v1.17.0) ═══════════════
   Chaque élément « programme » peut être un exercice (it.exo, it.niveau, it.consigne) avec ses propres trous (it.tr).
   Barre d'outils sur l'élément sélectionné, tiroir de réglages à onglets (épinglable), plan de la fiche à gauche,
   remise en ordre (rangs ou repères « G - A - D »), sujets A / B, export groupé. */
let SUJET = 'A', SEL_IT = null, SEL_TROU = null, EXP_TAG = false, TIROIR_TAB = 'exo';
const seedOf = it => (it.seed || 7) + (SUJET==='B' ? 104729 : 0);
const aPlat = it => it.mode==='line' || it.mode==='lines';
const lettreN = d => LETTRES[d % 26] + (d >= 26 ? Math.floor(d / 26) : '');
function ordreDe(it){ // 'cases' (rangs), 'reperes' (lettres) ou 'aucun'
  if (!(aPlat(it) || it.mode==='algotext')) return 'aucun';
  if (it.ordre) return it.ordre;
  if (it.mode==='algotext') return it.shuffle ? 'cases' : 'aucun';
  return it.num===false ? 'aucun' : 'cases'; }
const MODES = [['assemble','Assemblé'],['line','À plat, en ligne'],['lines','À plat, en liste'],['algo','Algorigramme'],['algotext','Algorithme'],['relier','Relier'],['grille','Quadrillage'],['cadre','Cadre à remplir']];
const modeNom = m => ({assemble:'Programme assemblé', line:'Instructions à plat (ligne)', lines:'Instructions à plat (liste)', algo:'Algorigramme', algotext:'Algorithme', relier:'Relier', grille:'Quadrillage', cadre:'Cadre à remplir'})[m] || m;
const scOf = it => it && S.scripts.find(s => s.id===it.sid);

/* ---------- Trous propres à un élément : it.tr = {id du bloc: trous} ----------
   Sans it.tr, ce sont les trous du programme (b.tr, réglés dans la zone de travail). */
function avecTr(it, sc, fn){
  if (!it || !it.tr || !sc) return fn();
  const saved = []; walk(sc.list, b => { saved.push([b, b.tr]); const t = it.tr[b.id]; if (t) b.tr = t; else delete b.tr; });
  try { return fn(); } finally { for (const [b, t] of saved){ if (t) b.tr = t; else delete b.tr; } } }
async function avecTrA(it, sc, fn){
  if (!it || !it.tr || !sc) return fn();
  const saved = []; walk(sc.list, b => { saved.push([b, b.tr]); const t = it.tr[b.id]; if (t) b.tr = t; else delete b.tr; });
  try { return await fn(); } finally { for (const [b, t] of saved){ if (t) b.tr = t; else delete b.tr; } } }
// le bloc vu par l'élément : lire et écrire b.tr agit sur it.tr
const trB = (it, b) => !it || !it.tr ? b : new Proxy(b, {
  get:(t, k) => k==='tr' ? it.tr[b.id] : t[k],
  set:(t, k, v) => { if (k==='tr') it.tr[b.id] = v; else t[k] = v; return true; },
  deleteProperty:(t, k) => { if (k==='tr') delete it.tr[b.id]; else delete t[k]; return true; } });
const perso = it => { if (it && it.exo && it.exo!=='libre') it.niveau = 'perso'; };

/* ---------- Remise en ordre ---------- */
function ordreInfo(it, sc){
  const hid = new Set(it.hide || []), disp = instrOf(it, sc).filter(b => !hid.has(b.id)), prog = explode(sc.list).filter(b => !hid.has(b.id));
  const rep = new Map(disp.map((b, d) => [b.id, lettreN(d)])), rang = new Map(prog.map((b, n) => [b.id, n + 1]));
  return {rep, rang, rep0: prog.map(b => rep.get(b.id))}; }
function algoTexteLignes(it, sc){
  const L = algoLines(sc), idx = L.map((_, j) => j);
  if (it.shuffle){ const r = rng(seedOf(it)); for (let j = idx.length - 1; j > 0; j--){ const m = Math.floor(r() * (j + 1)); [idx[j], idx[m]] = [idx[m], idx[j]]; } }
  const out = idx.map((j, d) => ({lvl: it.shuffle ? 0 : L[j].lvl, parts: L[j].parts, rang: j + 1, rep: lettreN(d)}));
  return {out, rep0: L.map((_, j) => lettreN(idx.indexOf(j)))}; }
function repOffset(it, sc){
  if (ordreDe(it)!=='reperes') return 0;
  if (aPlat(it)) return ordreInfo(it, sc).rep0.length;
  if (it.mode==='algotext') return algoLines(sc).length;
  return 0; }
const prefHTML = (kind, t, px) => kind==='reperes' ? `<span class="rcase" style="width:${px}px;height:${px}px;font-size:${Math.round(px*0.55)}px">${t}</span>`
  : `<span class="ncase" style="width:${px}px;height:${px}px;font-size:${Math.round(px*0.55)}px">${CORR ? t : ''}</span>`;
function ordreHTML(rep0){
  if (!rep0 || !rep0.length) return '';
  return `<div class="ordre-rep"><b>Ordre des repères :</b> ` + (CORR ? `<span class="rep-ans">${rep0.join(' - ')}</span>` : rep0.map(() => '<span class="slot"></span>').join(' - ')) + '</div>'; }
function ordreDocx(rep0, children, D){
  if (!rep0 || !rep0.length) return;
  children.push(new D.Paragraph({spacing:{before:100, after:120}, children:[new D.TextRun({text:'Ordre des repères :  ', bold:true}),
    CORR ? new D.TextRun({text:rep0.join(' - '), bold:true, color:'1D4ED8'}) : new D.TextRun({text:rep0.map(() => '______').join(' - ')})]})); }
const PREF_CACHE = new Map();
async function prefPNG(kind, t){
  const k = kind + '|' + (kind==='cases' && !CORR ? '' : t); if (PREF_CACHE.has(k)) return PREF_CACHE.get(k);
  const txt = kind==='cases' ? (CORR ? `<text x="13" y="18" text-anchor="middle" style="font:700 14px Arial,sans-serif;fill:#1D4ED8">${t}</text>` : '') : `<text x="13" y="18.5" text-anchor="middle" style="font:800 15px Arial,sans-serif;fill:#111">${t}</text>`;
  const box = kind==='cases' ? '<rect x="1.5" y="1.5" width="23" height="23" fill="#fff" stroke="#111" stroke-width="2"/>' : '<rect x="1.5" y="1.5" width="23" height="23" rx="6" fill="#fff" stroke="#111" stroke-width="2.4"/>';
  const doc = {w:26, h:26, svg:`<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26">${box}${txt}</svg>`};
  const data = new Uint8Array(await (await toPNG(doc, 3)).arrayBuffer()); PREF_CACHE.set(k, data); return data; }
async function prefixPNG(it, sc, id, info){
  const o = ordreDe(it); if (o==='aucun') return null;
  return prefPNG(o, o==='reperes' ? info.rep.get(id) : info.rang.get(id)); }
// cadre ligné où l'élève écrit le programme
function cadreDoc(it, sc){
  const n = it.lignes || Math.max(4, errLignes(sc.list).filter(e => e.b).length + 1), W = 700, H = n * 34 + 18;
  let s = `<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="6" fill="#fff" stroke="#111" stroke-width="1.6"/>`;
  for (let i = 1; i <= n; i++) s += `<line x1="18" y1="${i * 34 + 4}" x2="${W - 18}" y2="${i * 34 + 4}" stroke="#94A3B8" stroke-width="1" stroke-dasharray="2 4"/>`;
  return {w:W, h:H, svg:`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${s}</svg>`}; }

/* ---------- Numéro et consigne ---------- */
function numExo(it){ let n = 0; for (const x of S.doc){ if (x.t==='prog' && x.consigne && x.numEx!==false) n++; if (x===it) return n; } return 0; }
const refItem = it => ({id:it.id + '_ref', t:'prog', sid:it.sid, mode:it.avec, scale:it.scale, bw:it.bw, algoStyle:it.algoStyle, trous:false, tr:{}, shuffle:false, ordre:'aucun', hide:[], err:false});

/* ---------- Élément « programme » dans la page ---------- */
function ficheProg(it, i, box, tools){
  const sc = scOf(it);
  const lab = document.createElement('div'); lab.className = 'ilabel';
  if (!sc){ lab.textContent = 'Programme supprimé'; box.append(tools, lab); box.insertAdjacentHTML('beforeend', '<p class="muted">Ce programme a été supprimé de la zone de travail.</p>'); return; }
  const ex = typeof EXOS!=='undefined' && it.exo ? EXOS.find(e => e.id===it.exo) : null;
  lab.textContent = (ex ? ex.court + (it.niveau && it.exo!=='libre' ? ' · ' + (NIVEAUX[it.niveau] || it.niveau) : '') + ' · ' : '') + progLabel(sc).replace(/^Programme (\d+) : .*/, 'Programme $1') + ' · ' + modeNom(it.mode);
  box.append(tools, lab);
  if (it.id===SEL_IT) box.append(barreExo(it, i, sc));
  if (it.consigne){ const c = document.createElement('div'); c.className = 'consigne';
    const n = it.numEx!==false ? numExo(it) : 0;
    c.innerHTML = (n ? `<b>Exercice ${n} :</b> ` : '') + `<span class="ctxt" contenteditable="true" spellcheck="true"></span>`;
    const t = c.querySelector('.ctxt'); t.textContent = it.consigne;
    t.oninput = () => { it.consigne = t.textContent; it.consigneManuelle = true; save(); };
    box.append(c); }
  if (it.avec) avecTr(refItem(it), sc, () => ficheCoeur(refItem(it), sc, box, true));
  avecTr(it, sc, () => ficheCoeur(it, sc, box, false)); }
function ficheCoeur(it, sc, box, ref){
  const k = (it.mode==='algo' ? 0.75 : PXK) * (it.scale||1), o = ordreDe(it);
  if (it.mode==='algotext'){
    let rep0 = null; const tv = document.createElement('div'); tv.className = 'algotxt';
    tv.innerHTML = avecTrousAlgo(sc, it, () => { const r = algoTexteLignes(it, sc); rep0 = r.rep0;
      return r.out.map(l => `<div class="al" style="padding-left:${l.lvl*2}em">${o!=='aucun' ? prefHTML(o, o==='reperes' ? l.rep : l.rang, 20) : ''}${l.parts.map(p => { const h = EXO_ALG ? tokHTML(p[0]) : aesc(p[0]); return p[1] ? '<b>' + h + '</b>' : h; }).join('')}</div>`).join(''); });
    box.append(tv); if (ref) return;
    if (o==='reperes') box.insertAdjacentHTML('beforeend', ordreHTML(rep0));
    if (EXO_LAST) box.insertAdjacentHTML('beforeend', exoHTML(it, sc, EXO_LAST));
    if (errOn(it, sc)) box.insertAdjacentHTML('beforeend', errHTML(it, sc));
    return; }
  if (it.mode==='relier'){ const v = document.createElement('div'); v.innerHTML = relierHTML(it, sc);
    if (!ref) v.onclick = e => { const g = e.target.closest('.rel-g[data-bid]'); if (!g) return; SEL_IT = it.id; it.hide = [...new Set([...(it.hide || []), g.dataset.bid])]; perso(it); save(); drawDoc(); };
    box.append(v); requestAnimationFrame(() => relLignes(box));
    if (!ref && errOn(it, sc)) box.insertAdjacentHTML('beforeend', errHTML(it, sc)); return; }
  if (it.mode==='grille'){ const d = grilleSVG(it, sc);
    if (d.err) box.insertAdjacentHTML('beforeend', `<p class="gerr">Quadrillage impossible : ${esc(d.err)}. Voir les réglages.</p>`);
    else { const w = Math.min(d.w, 718), h = d.h * (w / d.w); box.insertAdjacentHTML('beforeend', '<div class="pview">' + d.svg.replace('<svg ', `<svg style="width:${w}px;height:${h}px" `) + '</div>'); }
    if (!ref && errOn(it, sc)) box.insertAdjacentHTML('beforeend', errHTML(it, sc)); return; }
  const view = document.createElement('div'); view.className = 'pview ' + it.mode;
  const imgs = itemImages(it) || [], hid = new Set(it.hide||[]), info = aPlat(it) ? ordreInfo(it, sc) : null, px = Math.round(22*(it.scale||1));
  for (const im of imgs){ const kk = im.raw ? 1 : k, w = Math.min(im.doc.w*kk, 718), h = im.doc.h * (w/im.doc.w);
    const sp = document.createElement('span'); sp.className = 'pimg' + (im.id && hid.has(im.id) ? ' off' : '');
    const pre = im.id && !hid.has(im.id) && o!=='aucun' ? prefHTML(o, o==='reperes' ? info.rep.get(im.id) : info.rang.get(im.id), px) : '';
    if (pre) sp.classList.add('num');
    sp.innerHTML = pre + im.doc.svg.replace('<svg ', `<svg style="width:${w}px;height:${h}px" `);
    view.append(sp); }
  if (!ref && (it.mode==='assemble' || aPlat(it))) view.onclick = e => ficheClic(e, it, sc);
  box.append(view); if (ref) return;
  if (aPlat(it) && o==='reperes') box.insertAdjacentHTML('beforeend', ordreHTML(info.rep0));
  if (it.trous!==false && progATrous(sc)) box.insertAdjacentHTML('beforeend', exoHTML(it, sc, it.mode==='algo' ? EXO_LAST : null));
  if (errOn(it, sc)) box.insertAdjacentHTML('beforeend', errHTML(it, sc)); }

/* ---------- Clic dans l'aperçu : trou en un clic, ou petit menu ---------- */
const SPEC0 = key => ({rep:'libre', props:[], pos:'auto', pts: key==='ligne' ? 2 : 1});
function setTrou(b, key, on){
  const tr = b.tr ? JSON.parse(JSON.stringify(b.tr)) : {};
  if (on){ if (key==='ligne') b.tr = {ligne: tr.ligne || SPEC0('ligne')}; else { const p = tr.ligne ? {} : (tr.p || {}); p[key] = p[key] || SPEC0(key); b.tr = {p}; } }
  else { if (key==='ligne') delete tr.ligne; else if (tr.p) delete tr.p[key]; if (aTrous(tr)) b.tr = tr; else delete b.tr; } }
function ficheClic(e, it, sc){
  const g = e.target.closest('[data-bid]'); if (!g) return;
  const ref = locate(g.dataset.bid, [sc.list]); if (!ref) return; const b = trB(it, blockAt(ref));
  const kEl = e.target.closest('[data-k]'), k = kEl ? kEl.dataset.k : null, spec = k ? specDe(b, k) : null, hid = new Set(it.hide||[]);
  SEL_IT = it.id;
  const fait = () => { perso(it); save(); drawDoc(); };
  if (hid.has(b.id)){ it.hide = (it.hide||[]).filter(x => x!==b.id); fait(); return; }
  if (spec){ SEL_TROU = b.id + '|' + k; TIROIR_TAB = 'trous'; tiroir(true); fichePanel(); return; }
  if (k && !(b.tr && b.tr.ligne) && partiesDe(b).some(p => p.key===k)){ setTrou(b, k, true); SEL_TROU = b.id + '|' + k; TIROIR_TAB = 'trous'; fait(); return; }
  const P = partiesDe(b), items = [];
  for (const p of P){ if (p.key==='ligne') continue; const on = !!specDe(b, p.key);
    items.push([(on ? '✓ ' : '') + 'Trou : ' + (p.key==='nom' ? 'nom de l\'instruction' : p.label.toLowerCase() + ' « ' + p.ans + ' »'), () => { setTrou(b, p.key, !on); SEL_TROU = on ? null : b.id + '|' + p.key; fait(); }]); }
  items.push([(b.tr && b.tr.ligne ? '✓ ' : '') + 'Trou : ligne entière à écrire', () => { const on = !!(b.tr && b.tr.ligne); setTrou(b, 'ligne', !on); SEL_TROU = on ? null : b.id + '|ligne'; fait(); }]);
  if (aTrous(b)) items.push(['Retirer les trous de cette instruction', () => { delete b.tr; fait(); }]);
  items.push(['Réglages détaillés…', () => { perso(it); trouDialog(b, k); }]);
  if (aPlat(it)) items.push(['🙈 Cacher cette instruction (absente du document)', () => { it.hide = [...new Set([...(it.hide||[]), b.id])]; fait(); }]);
  menu(e.clientX, e.clientY, items); }

/* ---------- Barre d'outils de l'élément sélectionné ---------- */
function barreExo(it, i, sc){
  const bar = document.createElement('div'); bar.className = 'ibar';
  const ex = it.exo ? EXOS.find(e => e.id===it.exo) : null;
  const bt = (html, title, fn, cls) => { const b = document.createElement('button'); b.innerHTML = html; b.title = title; if (cls) b.className = cls; b.onclick = e => { e.stopPropagation(); fn(e); }; bar.append(b); return b; };
  bt((ex ? ex.court : 'Élément libre') + ' ▾', 'Changer le type d\'exercice', e => { const r = e.currentTarget.getBoundingClientRect();
    menu(r.left, r.bottom + 4, EXOS.map(x => [(x.id===it.exo ? '✓ ' : '') + x.nom, () => { changerExo(it, x.id, it.niveau && it.niveau!=='perso' ? it.niveau : 'moyen'); }])); });
  bt(esc(progLabel(errRef(sc) || sc).replace(/ : .*/, '')) + ' ▾', 'Changer de programme', e => { const r = e.currentTarget.getBoundingClientRect();
    menu(r.left, r.bottom + 4, S.scripts.filter(s => !s.orig && s.list.length && !['rep', 'bool'].includes((DEF[s.list[0].type] || {}).sh)).map(s => [progLabel(s), () => changerProg(it, s.id)])); });
  if (ex && ex.niv){ const seg = document.createElement('span'); seg.className = 'ibar-seg';
    for (const n of ['facile', 'moyen', 'difficile']){ const b = document.createElement('button'); b.textContent = NIVEAUX[n]; b.className = it.niveau===n ? 'on' : ''; b.title = ex.niv[n];
      b.onclick = e => { e.stopPropagation(); changerExo(it, it.exo, n); }; seg.append(b); }
    if (it.niveau==='perso'){ const b = document.createElement('button'); b.textContent = 'Perso'; b.className = 'on'; b.title = 'Réglé à la main'; seg.append(b); }
    bar.append(seg); }
  const sp = document.createElement('span'); sp.style.flex = '1'; bar.append(sp);
  bt('⚙ Réglages', 'Ouvrir les réglages', () => { tiroir(true); fichePanel(); });
  bt('↑', 'Monter', () => { if (i){ [S.doc[i-1], S.doc[i]] = [S.doc[i], S.doc[i-1]]; save(); drawDoc(); } }, 'ic');
  bt('↓', 'Descendre', () => { if (i < S.doc.length-1){ [S.doc[i+1], S.doc[i]] = [S.doc[i], S.doc[i+1]]; save(); drawDoc(); } }, 'ic');
  bt('⧉', 'Dupliquer', () => { const n = JSON.parse(JSON.stringify(it)); n.id = nid(); S.doc.splice(i + 1, 0, n); SEL_IT = n.id; save(); drawDoc(); }, 'ic');
  bt('🗑', 'Retirer de la fiche', () => { S.doc.splice(i, 1); SEL_IT = null; save(); drawDoc(); }, 'ic');
  return bar; }

/* ---------- Tiroir de réglages ---------- */
const tiroirEpingle = () => { try { const v = localStorage.getItem('atelier-tiroir'); return v ? v==='1' : innerWidth >= 1280; } catch(_){ return innerWidth >= 1280; } };
function tiroir(ouvrir){
  const P = $('#dpanel'); if (!P) return;
  if (ouvrir!==undefined) P.classList.toggle('open', ouvrir);
  const pin = tiroirEpingle(); document.body.classList.toggle('tiroir-pin', pin);
  if (pin) P.classList.add('open');
  const h = document.getElementById('hdr'); if (h) P.style.top = Math.max(0, h.getBoundingClientRect().bottom) + 'px'; }
const chips = (list, cur, attr) => `<div class="chips">${list.map(([v, l, t]) => `<button data-${attr}="${v}"${v===cur ? ' class="on"' : ''}${t ? ` title="${esc(t)}"` : ''}>${l}</button>`).join('')}</div>`;
function ficheSel(id){ // sans tout redessiner : le clic en cours doit arriver à son élément
  if (SEL_IT===id) return; SEL_IT = id; SEL_TROU = null;
  document.querySelectorAll('#page .item').forEach(x => x.classList.toggle('sel', x.dataset.id===id));
  document.querySelectorAll('#page .ibar').forEach(x => x.remove());
  const i = S.doc.findIndex(x => x.id===id), it = S.doc[i], box = id && document.querySelector(`#page .item[data-id="${id}"]`);
  if (it && it.t==='prog' && box && scOf(it)) box.append(barreExo(it, i, scOf(it)));
  fichePanel(); drawPlan(); }
function fichePanel(){
  const P = $('#dpanel'); if (!P) return; tiroir();
  const head = `<div class="dp-top"><button class="dp-pin${tiroirEpingle() ? ' on' : ''}" title="Épingler le tiroir à côté de la page">📌</button><span style="flex:1"></span><button class="dp-x" aria-label="Fermer les réglages">×</button></div>`;
  const i = S.doc.findIndex(x => x.id===SEL_IT), it = S.doc[i], sc = scOf(it);
  let h;
  if (!it || it.t!=='prog') h = panelFiche(it);
  else if (!sc) h = '<h3>Programme supprimé</h3><p class="hint">Ce programme n\'existe plus dans la zone de travail. Retirez l\'élément avec 🗑.</p>';
  else h = avecTr(it, sc, () => panelProg(it, i, sc));
  P.innerHTML = head + '<div class="dp-body">' + h + '</div>';
  P.querySelector('.dp-pin').onclick = () => { try { localStorage.setItem('atelier-tiroir', tiroirEpingle() ? '0' : '1'); } catch(_){} tiroir(); fichePanel(); drawPlan(); };
  P.querySelector('.dp-x').onclick = () => { try { localStorage.setItem('atelier-tiroir', '0'); } catch(_){} P.classList.remove('open'); tiroir(); };
  if (!it || it.t!=='prog'){ bindFiche(P); return; }
  if (sc) bindProg(P, it, i, sc); }
function panelProg(it, i, sc){
  const ex = it.exo ? EXOS.find(e => e.id===it.exo) : null, liste = exoCtx(sc, it).liste;
  const tabs = [['exo', 'Exercice'], ['pres', 'Présentation'], ['trous', 'Trous' + (liste.length ? ' (' + liste.length + ')' : '')], ['plus', 'Plus']];
  let h = `<h3>${ex ? esc(ex.nom) : 'Élément libre'}</h3><p class="sub">${esc(progLabel(errRef(sc) || sc))}${it.consigne && it.numEx!==false ? ' · Exercice ' + numExo(it) : ''}</p>
    <div class="dp-tabs">${tabs.map(([v, l]) => `<button data-tab="${v}"${TIROIR_TAB===v ? ' class="on"' : ''}>${l}</button>`).join('')}</div>`;
  if (TIROIR_TAB==='exo') h += ongletExo(it, sc, ex);
  else if (TIROIR_TAB==='pres') h += ongletPres(it, sc);
  else if (TIROIR_TAB==='trous') h += ongletTrous(it, sc, liste);
  else h += panelErr(it, sc) + `<div class="ps"><div class="pt">Ajouter le même programme</div><div class="chips">${MODES.filter(m => m[0]!==it.mode && m[0]!=='cadre').map(([v, l]) => `<button data-dup="${v}">+ ${l}</button>`).join('')}</div></div>`;
  return h; }
function ongletExo(it, sc, ex){
  let h = `<div class="ps"><div class="pt">Ce que fait l'élève</div>${chips(EXOS.map(e => [e.id, e.court, e.desc]), it.exo || 'libre', 'exo')}</div>`;
  if (ex && ex.niv){ const n = it.niveau || 'moyen';
    h += `<div class="ps"><div class="pt">Niveau</div><div class="seg3">${['facile', 'moyen', 'difficile'].map(v => `<button data-niv="${v}"${n===v ? ' class="on"' : ''}>${NIVEAUX[v]}</button>`).join('')}${n==='perso' ? '<button class="on" disabled>Perso</button>' : ''}</div>
      <p class="hint">${n==='perso' ? 'Réglé à la main. Cliquez sur un niveau pour revenir à ses réglages (vos changements sont alors remplacés).' : esc(ex.niv[n])}</p>
      ${it.exo==='traduire' ? `<div class="prow">Traduire en ${chips([['algotext', 'Algorithme'], ['algo', 'Algorigramme']], it.mode==='algo' ? 'algo' : 'algotext', 'cible')}</div>` : ''}</div>`; }
  h += `<div class="ps"><div class="pt">Consigne</div><textarea class="pcons" rows="3" placeholder="Pas de consigne : l'élément n'est pas numéroté">${esc(it.consigne || '')}</textarea>
    <div class="prow"><label><input type="checkbox" class="pnum"${it.numEx!==false ? ' checked' : ''}> Numéroter « Exercice ${numExo(it) || 'n'} »</label></div></div>`;
  if (['completer', 'traduire'].includes(it.exo)) h += `<div class="ps"><div class="pt">Aide</div><div class="prow"><label><input type="checkbox" class="pbanq"${it.banque ? ' checked' : ''}> Banque de réponses (les bonnes réponses, mélangées)</label></div></div>`;
  h += `<div class="ps"><div class="pt">Montrer aussi, au-dessus</div><select class="pavec">${[['', 'Rien'], ['assemble', 'Le programme assemblé'], ['algotext', 'L\'algorithme'], ['algo', 'L\'algorigramme']].map(([v, l]) => `<option value="${v}"${(it.avec || '')===v ? ' selected' : ''}>${l}</option>`).join('')}</select></div>`;
  return h; }
function ongletPres(it, sc){
  const blocs = ['assemble', 'line', 'lines'].includes(it.mode), o = ordreDe(it), hidN = (it.hide||[]).length;
  let h = `<div class="ps"><div class="pt">Présentation</div>${chips(MODES, it.mode, 'mode')}
    ${it.mode==='algo' || it.mode==='relier' ? `<div class="prow">Style ${chips([['classic','Classique'],['sysml','SysML']], it.algoStyle || ALG.style, 'astyle')}</div>` : ''}
    <div class="prow"><label>Taille <input type="range" class="psz" min="50" max="150" step="10" value="${Math.round((it.scale||1)*100)}"></label>${blocs || it.mode==='relier' ? `<label><input type="checkbox" class="pbw"${it.bw ? ' checked' : ''}> Noir et blanc</label>` : ''}</div>
    ${it.mode==='cadre' ? `<div class="prow"><label>Lignes <input type="number" class="plig" min="2" max="40" value="${it.lignes || ''}" placeholder="auto" style="width:60px"></label></div>` : ''}</div>`;
  h += panelRelGrille(it, sc);
  if (aPlat(it) || it.mode==='algotext') h += `<div class="ps"><div class="pt">Remettre dans l'ordre</div>
    <div class="prow"><label><input type="checkbox" class="psh"${it.shuffle ? ' checked' : ''}> Mélanger ${it.mode==='algotext' ? 'les lignes' : 'les instructions'}</label>${it.shuffle ? '<button class="sm pre-mix" title="Tirer un autre mélange">🔀 Autre mélange</button>' : ''}</div>
    <div class="prow">Repérage ${chips([['cases','Rangs (cases)','Une case vide devant chaque instruction : l\'élève écrit 1, 2, 3…'],['reperes','Repères (G - A - D)','Une lettre devant chaque instruction : l\'élève écrit la suite des lettres dans l\'ordre'],['aucun','Aucun']], o, 'ordre')}</div>
    ${aPlat(it) && hidN ? `<p class="hint">${hidN} instruction${hidN > 1 ? 's' : ''} cachée${hidN > 1 ? 's' : ''} (en pâle dans l'aperçu, clic pour la remettre). <button class="sm pre-show">Tout remettre</button></p>` : ''}</div>`;
  if (blocs) h += `<div class="ps"><div class="pt">Vider</div><div class="prow"><label><input type="checkbox" class="pbv"${it.blankV ? ' checked' : ''}> Toutes les valeurs</label><label><input type="checkbox" class="pbd"${it.blankD ? ' checked' : ''}> Tous les menus</label></div></div>`;
  return h; }
function ongletTrous(it, sc, liste){
  const blocs = ['assemble', 'line', 'lines'].includes(it.mode);
  let h = `<div class="ps"><div class="pt">Trous <span>${liste.length ? liste.length + ' · ' + liste.reduce((s, t) => s + (+t.s.pts || 0), 0) + ' pt' : ''}</span></div>`;
  if (['relier', 'grille'].includes(it.mode)) return h + '<p class="hint">Pas de trous dans cette présentation.</p></div>';
  h += blocs ? '<p class="hint">Clic sur une valeur ou un menu dans l\'aperçu : le trou est créé. Clic ailleurs sur une instruction : nom, ligne entière, cacher…</p>'
    : `<p class="hint">Ils sont repris avec la formulation de ${it.mode==='algo' ? 'l\'algorigramme' : 'l\'algorithme'}. Pour en ajouter, passez un moment en présentation « Assemblé ».</p>`;
  h += `<p class="hint">${it.tr ? 'Trous propres à cet exercice.' : 'Trous du programme (communs aux éléments qui l\'utilisent). <button class="sm pre-own">Rendre propres à cet exercice</button>'}</p>`;
  if (liste.length) h += `<div class="prow"><label><input type="checkbox" class="ptr"${it.trous!==false ? ' checked' : ''}> Afficher les trous</label></div>` + liste.map(t => carteTrou(t)).join('');
  return h + '</div>'; }
function bindProg(P, it, i, sc){
  const up = (fn, p = true) => { fn(); if (p) perso(it); save(); drawDoc(); };
  P.querySelectorAll('[data-tab]').forEach(x => x.onclick = () => { TIROIR_TAB = x.dataset.tab; fichePanel(); });
  P.querySelectorAll('[data-exo]').forEach(x => x.onclick = () => changerExo(it, x.dataset.exo, it.niveau && it.niveau!=='perso' ? it.niveau : 'moyen'));
  P.querySelectorAll('[data-niv]').forEach(x => x.onclick = () => changerExo(it, it.exo, x.dataset.niv));
  P.querySelectorAll('[data-cible]').forEach(x => x.onclick = () => { it.cible = x.dataset.cible; changerExo(it, it.exo, it.niveau==='perso' ? 'moyen' : it.niveau); });
  P.querySelectorAll('[data-mode]').forEach(x => x.onclick = () => up(() => { it.mode = x.dataset.mode; if (it.mode==='algo' && !it.algoStyle) it.algoStyle = ALG.style; }));
  P.querySelectorAll('[data-astyle]').forEach(x => x.onclick = () => up(() => it.algoStyle = x.dataset.astyle, false));
  P.querySelectorAll('[data-ordre]').forEach(x => x.onclick = () => up(() => { it.ordre = x.dataset.ordre; it.num = x.dataset.ordre==='cases'; }));
  P.querySelectorAll('[data-dup]').forEach(x => x.onclick = () => up(() => { const n = {id:nid(), t:'prog', sid:it.sid, mode:x.dataset.dup, shuffle:false, seed:it.seed || Math.floor(Math.random()*1e6), scale:1, hide:[]}; if (n.mode==='algo') n.algoStyle = ALG.style; S.doc.splice(i + 1, 0, n); SEL_IT = n.id; }, false));
  const q = s => P.querySelector(s), ck = (sel, key, p = true) => { const c = q(sel); if (c) c.onchange = () => up(() => it[key] = c.checked, p); };
  ck('.pbw', 'bw', false); ck('.psh', 'shuffle'); ck('.pbv', 'blankV'); ck('.pbd', 'blankD'); ck('.pbanq', 'banque', false); ck('.ptr', 'trous');
  if (q('.pnum')) q('.pnum').onchange = e => up(() => it.numEx = e.target.checked, false);
  if (q('.pcons')) q('.pcons').onchange = e => up(() => { it.consigne = e.target.value.trim(); it.consigneManuelle = true; }, false);
  if (q('.pavec')) q('.pavec').onchange = e => up(() => it.avec = e.target.value || undefined, false);
  if (q('.psz')) q('.psz').onchange = e => up(() => it.scale = e.target.value / 100, false);
  if (q('.plig')) q('.plig').onchange = e => up(() => it.lignes = +e.target.value || undefined, false);
  if (q('.pre-mix')) q('.pre-mix').onclick = () => up(() => it.seed = Math.floor(Math.random()*1e6), false);
  if (q('.pre-show')) q('.pre-show').onclick = () => up(() => it.hide = []);
  if (q('.pre-own')) q('.pre-own').onclick = () => up(() => { it.tr = {}; walk(sc.list, b => { if (b.tr) it.tr[b.id] = JSON.parse(JSON.stringify(b.tr)); }); }, false);
  P.querySelectorAll('.hc').forEach(c => bindCarte(c, sc, it)); bindErr(P, it, sc, i); bindRelGrille(P, it);
  if (SEL_TROU){ const c = P.querySelector(`.hc[data-t="${SEL_TROU}"]`); if (c){ c.scrollIntoView({block:'nearest'}); c.classList.add('flash'); const a = c.querySelector('.ans'); if (a) a.focus(); } SEL_TROU = null; } }
function carteTrou(t){
  const p = partiesDe(t.b).find(x => x.key===t.key) || {label:t.key}, s = t.s || {};
  return `<div class="hc" data-t="${t.b.id}|${t.key}">
    <div class="hh"><span class="hl">${t.L}</span><span class="hn" title="${esc(repLigne(t.b))}">${esc(p.label)} · ${esc(repLigne(t.b))}</span><button class="hx" title="Retirer ce trou">✕</button></div>
    <div class="prow">${chips([['libre','À écrire'],['choix','Au choix']], s.rep==='choix' ? 'choix' : 'libre', 'rep')}<label class="mini">Points <input type="number" class="pts" min="0" step="0.5" value="${s.pts ?? 1}"></label></div>
    <label class="hf">Réponse attendue<input class="ans" value="${esc(reponse(t.b, t.key))}"></label>
    ${s.rep==='choix' ? `<label class="hf">Autres propositions, séparées par « / »<input class="props" value="${esc((s.props || []).join(' / '))}" placeholder="reculer / tourner"></label>` : ''}
    <div class="prow mini">Lettre ${chips([['auto','auto'],['coin','dans le coin'],['centre','entourée']], s.pos || 'auto', 'pos')}</div></div>`; }
function bindCarte(c, sc, it){
  const [bid, key] = c.dataset.t.split('|'), ref = locate(bid, [sc.list]); if (!ref) return; const b = trB(it, blockAt(ref));
  const spec = () => specDe(b, key), maj = (fn, panel) => { const s = spec(); if (!s) return; fn(s); delete s.auto; perso(it); save(); SEL_TROU = panel ? c.dataset.t : null; drawDoc(); };
  c.querySelector('.hx').onclick = () => { setTrou(b, key, false); perso(it); save(); drawDoc(); };
  c.querySelectorAll('[data-rep]').forEach(x => x.onclick = () => maj(s => s.rep = x.dataset.rep, true));
  c.querySelectorAll('[data-pos]').forEach(x => x.onclick = () => maj(s => s.pos = x.dataset.pos));
  c.querySelector('.pts').onchange = e => maj(s => s.pts = +e.target.value || 0);
  c.querySelector('.ans').onchange = e => maj(s => { const d = (partiesDe(b).find(x => x.key===key) || {}).ans, v = e.target.value.trim(); if (!v || v===d) delete s.ans; else s.ans = v; });
  const pr = c.querySelector('.props'); if (pr) pr.onchange = e => maj(s => s.props = e.target.value.split('/').map(x => x.trim()).filter(Boolean)); }
function panelFiche(it){
  const progs = S.doc.filter(x => x.t==='prog'), mix = progs.filter(x => x.shuffle || ordreDe(x)==='reperes' || x.mode==='relier').length;
  return `<h3>${it && it.t==='text' ? 'Texte' : 'Fiche'}</h3>
    <p class="hint">${it && it.t==='text' ? 'Écrivez directement dans la page. Gras, italique, souligné : boutons au survol ou Ctrl+B / I / U.' : 'Cliquez sur un exercice de la page pour le régler ici.'}</p>
    <div class="ps"><div class="pt">Ajouter</div><div class="chips"><button data-add="exo" class="pri">＋ Exercice</button><button data-add="text">+ Texte</button><button data-add="prog">+ Programme (libre)</button><button data-add="break">+ Saut de page</button></div></div>
    <div class="ps"><div class="pt">Une fiche entière d'un coup</div><p class="hint">Dans la zone de travail, sélectionnez un programme puis « 🎯 Faire une fiche » : plusieurs exercices sur ce programme, avec leurs consignes.</p></div>
    <div class="ps"><div class="pt">Sujets A et B</div><p class="hint">${mix ? `Le sujet B change ${mix} élément${mix > 1 ? 's' : ''} : autre ordre des instructions, des repères et des propositions.` : 'Le sujet B est pour l\'instant identique au sujet A : il change l\'ordre des exercices « Remettre dans l\'ordre », « Relier » et des propositions au choix.'}</p></div>`; }
function bindFiche(P){ P.querySelectorAll('[data-add]').forEach(b => b.onclick = () => { const a = b.dataset.add; if (a==='exo') ouvrirGalerie(); else $(({text:'#aText', prog:'#aProg', break:'#aBreak'})[a]).click(); }); }

/* ---------- Plan de la fiche (à gauche) ---------- */
function planNom(it){
  if (it.t==='break') return '— saut de page —';
  if (it.t==='text'){ const d = document.createElement('div'); d.innerHTML = it.html || ''; const t = d.textContent.trim(); return t ? t.slice(0, 40) : 'Texte vide'; }
  const sc = scOf(it), ex = it.exo ? EXOS.find(e => e.id===it.exo) : null, n = it.consigne && it.numEx!==false ? numExo(it) + ' · ' : '';
  return n + (ex ? ex.court : modeNom(it.mode)) + (sc ? ' · ' + progLabel(errRef(sc) || sc).replace(/ : .*/, '').replace('Programme ', 'P') : ''); }
function drawPlan(){
  const P = $('#dplan'); if (!P) return; let drag = -1;
  P.innerHTML = '<div class="pl-t">Plan de la fiche</div>' + (S.doc.length ? '' : '<p class="hint">Vide pour l\'instant.</p>');
  S.doc.forEach((it, i) => { const d = document.createElement('div'); d.className = 'pl-i' + (it.id===SEL_IT ? ' on' : '') + (it.t==='prog' ? '' : ' txt'); d.draggable = true; d.textContent = planNom(it);
    d.onclick = () => { ficheSel(it.id); const el = document.querySelector(`#page .item[data-id="${it.id}"]`); if (el) el.scrollIntoView({block:'center', behavior:'smooth'}); };
    d.ondragstart = () => { drag = i; d.classList.add('drag'); };
    d.ondragover = e => { e.preventDefault(); d.classList.add('over'); };
    d.ondragleave = () => d.classList.remove('over');
    d.ondrop = e => { e.preventDefault(); if (drag < 0 || drag===i) return; const [x] = S.doc.splice(drag, 1); S.doc.splice(i, 0, x); save(); drawDoc(); };
    P.append(d); });
  const b = document.createElement('button'); b.className = 'pl-add'; b.textContent = '＋ Exercice'; b.onclick = () => ouvrirGalerie(); P.append(b); }

/* ---------- Barre de la fiche : sujet, élève / corrigé, export groupé ---------- */
function segOn(id, attr, v){ document.querySelectorAll(`#${id} [data-${attr}]`).forEach(b => b.classList.toggle('on', b.dataset[attr]===v)); }
function setSujet(v){ SUJET = v; segOn('sSujet', 's', v); document.body.classList.toggle('sujetB', v==='B'); drawDoc(); }
function setCorr(v){ CORR = v; segOn('sCorr', 'c', v ? '1' : '0'); document.body.classList.toggle('corrige', v); drawDoc(); }
const ficheNomFichier = () => ($('#dname').value.trim() || 'Fiche programmation') + (SUJET==='B' || EXP_TAG ? ' - sujet ' + SUJET : '') + (CORR ? ' - corrigé' : '') + '.docx';
async function exporterVersions(vs){
  const s0 = SUJET, c0 = CORR; EXP_TAG = vs.some(v => v[0]!==vs[0][0]);
  try { for (const [s, c] of vs){ SUJET = s; CORR = c; await exportDocx(); } }
  finally { SUJET = s0; CORR = c0; EXP_TAG = false; drawDoc(); } }
(() => {
  document.querySelectorAll('#sSujet [data-s]').forEach(b => b.onclick = () => setSujet(b.dataset.s));
  document.querySelectorAll('#sCorr [data-c]').forEach(b => b.onclick = () => setCorr(b.dataset.c==='1'));
  const m = $('#bDocxM'); if (m) m.onclick = e => { const r = e.currentTarget.getBoundingClientRect();
    menu(r.right - 300, r.bottom + 4, [
      ['Version affichée (sujet ' + SUJET + ', ' + (CORR ? 'corrigé' : 'élève') + ')', () => exportDocx()],
      ['Élève et corrigé du sujet ' + SUJET + ' (2 fichiers)', () => exporterVersions([[SUJET, false], [SUJET, true]])],
      ['Sujets A et B, élève et corrigé (4 fichiers)', () => exporterVersions([['A', false], ['A', true], ['B', false], ['B', true]])]]); };
  const pg = $('#page'); if (pg) pg.addEventListener('pointerdown', e => { if (e.target===pg) ficheSel(null); });
  const ex = $('#aExo'); if (ex) ex.onclick = () => ouvrirGalerie();
  const t = $('#dpTab'); if (t) t.onclick = () => { tiroir(true); fichePanel(); };
  addEventListener('resize', () => tiroir());
})();

/* ---------- Export .docx d'un élément « programme » ---------- */
async function exportProg(it, children){
  const D = window.docx, sc = scOf(it); if (!sc) return;
  if (it.consigne){ const n = it.numEx!==false ? numExo(it) : 0;
    children.push(new D.Paragraph({spacing:{before:160, after:80}, children:[...(n ? [new D.TextRun({text:'Exercice ' + n + ' : ', bold:true})] : []), new D.TextRun({text:it.consigne})]})); }
  if (it.avec){ const r = refItem(it); await avecTrA(r, sc, () => exportCoeur(r, sc, children, true)); }
  await avecTrA(it, sc, () => exportCoeur(it, sc, children, false)); }
async function exportCoeur(it, sc, children, ref){
  const D = window.docx;
  if (it.mode==='relier'){ await relierDocx(it, sc, children, D); if (!ref && errOn(it, sc)) errDocx(it, sc, children, D); return; }
  if (it.mode==='algotext'){ await ficheAlgoDocx(it, sc, children, D, ref); return; }
  const imgs = itemImages(it); if (!imgs) return;
  const info = aPlat(it) ? ordreInfo(it, sc) : null, hid = new Set(it.hide||[]), k = (it.mode==='algo' ? 0.75 : PXK) * (it.scale||1), runs = [];
  for (const im of imgs){ if (im.id && hid.has(im.id)) continue;
    const kk = im.raw || it.mode==='grille' ? 1 : k, w = Math.min(im.doc.w*kk, 718), h = im.doc.h * (w/im.doc.w);
    const img = new D.ImageRun({type:'png', data:new Uint8Array(await (await toPNG(im.doc, 3)).arrayBuffer()), transformation:{width:Math.round(w), height:Math.round(h)}});
    const pd = im.id && info ? await prefixPNG(it, sc, im.id, info) : null;
    if (pd){ const c = Math.round(18*(it.scale||1)); runs.push([new D.ImageRun({type:'png', data:pd, transformation:{width:c, height:c}}), new D.TextRun({text:'  '}), img]); }
    else runs.push([img]); }
  if (it.mode==='lines') runs.forEach(r => children.push(new D.Paragraph({spacing:{after:60}, children:r})));
  else if (it.mode==='line'){ const ch = []; runs.forEach((r, n) => { if (n) ch.push(new D.TextRun({text:'    '})); ch.push(...r); }); children.push(new D.Paragraph({spacing:{after:120}, children:ch})); }
  else children.push(new D.Paragraph({spacing:{before:60, after:120}, children:runs.flat()}));
  if (ref) return;
  if (info && ordreDe(it)==='reperes') ordreDocx(info.rep0, children, D);
  if (it.trous!==false && progATrous(sc)) exoDocx(it, sc, children, D, it.mode==='algo' ? EXO_LAST : null);
  if (errOn(it, sc)) errDocx(it, sc, children, D); }
async function ficheAlgoDocx(it, sc, children, D, ref){
  const o = ordreDe(it); let rows = [], rep0 = null;
  avecTrousAlgo(sc, it, () => { const r = algoTexteLignes(it, sc); rep0 = r.rep0; rows = r.out.map(l => ({l, runs: l.parts.flatMap(p => tokRuns(p[0], p[1], D))})); });
  const found = EXO_LAST;
  for (const {l, runs} of rows){
    const pre = o!=='aucun' ? [new D.ImageRun({type:'png', data: await prefPNG(o, o==='reperes' ? l.rep : l.rang), transformation:{width:17, height:17}}), new D.TextRun({text:'  '})] : [];
    children.push(new D.Paragraph({indent:{left:l.lvl*567}, spacing:{after:50}, children:[...pre, ...runs]})); }
  if (ref) return;
  if (o==='reperes') ordreDocx(rep0, children, D);
  if (found) exoDocx(it, sc, children, D, found);
  if (errOn(it, sc)) errDocx(it, sc, children, D); }
