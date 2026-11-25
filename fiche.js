'use strict';
/* ═══════════════ Atelier blocs · fiche d'exercices (v1.16.0) ═══════════════
   Panneau de réglages à droite de la page (élément sélectionné), trous en un clic dans l'aperçu,
   remise en ordre (rangs dans des cases ou repères en lettres « G - A - D »), sujets A / B, export groupé. */
let SUJET = 'A', SEL_IT = null, SEL_TROU = null, EXP_TAG = false;
const seedOf = it => (it.seed || 7) + (SUJET==='B' ? 104729 : 0);
const aPlat = it => it.mode==='line' || it.mode==='lines';
const lettreN = d => LETTRES[d % 26] + (d >= 26 ? Math.floor(d / 26) : '');
// remise en ordre : 'cases' (rangs), 'reperes' (lettres) ou 'aucun'
function ordreDe(it){
  if (!(aPlat(it) || it.mode==='algotext')) return 'aucun';
  if (it.ordre) return it.ordre;
  if (it.mode==='algotext') return it.shuffle ? 'cases' : 'aucun';
  return it.num===false ? 'aucun' : 'cases'; }
const MODES = [['assemble','Assemblé'],['line','À plat, en ligne'],['lines','À plat, en liste'],['algo','Algorigramme'],['algotext','Algorithme'],['relier','Relier'],['grille','Quadrillage']];
const modeNom = m => ({assemble:'Programme assemblé', line:'Instructions à plat (ligne)', lines:'Instructions à plat (liste)', algo:'Algorigramme', algotext:'Algorithme', relier:'Relier', grille:'Quadrillage'})[m] || m;

/* ---------- Remise en ordre ---------- */
// instructions à plat : repère (lettre) dans l'ordre d'affichage, rang dans l'ordre du programme
function ordreInfo(it, sc){
  const hid = new Set(it.hide || []), disp = instrOf(it, sc).filter(b => !hid.has(b.id)), prog = explode(sc.list).filter(b => !hid.has(b.id));
  const rep = new Map(disp.map((b, d) => [b.id, lettreN(d)])), rang = new Map(prog.map((b, n) => [b.id, n + 1]));
  return {rep, rang, rep0: prog.map(b => rep.get(b.id))}; }
// algorithme : lignes éventuellement mélangées, sans retrait quand elles le sont
function algoTexteLignes(it, sc){
  const L = algoLines(sc), idx = L.map((_, j) => j);
  if (it.shuffle){ const r = rng(seedOf(it)); for (let j = idx.length - 1; j > 0; j--){ const m = Math.floor(r() * (j + 1)); [idx[j], idx[m]] = [idx[m], idx[j]]; } }
  const out = idx.map((j, d) => ({lvl: it.shuffle ? 0 : L[j].lvl, parts: L[j].parts, rang: j + 1, rep: lettreN(d)}));
  return {out, rep0: L.map((_, j) => lettreN(idx.indexOf(j)))}; }
// nombre de repères (les lettres des trous viennent après)
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
// petites images (case vide, case avec son rang au corrigé, repère) pour le .docx
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

/* ---------- Élément « programme » dans la page ---------- */
function ficheProg(it, i, box, tools){
  const sc = S.scripts.find(s => s.id===it.sid);
  const lab = document.createElement('div'); lab.className = 'ilabel';
  if (!sc){ lab.textContent = 'Programme supprimé'; box.append(tools, lab); box.insertAdjacentHTML('beforeend', '<p class="muted">Ce programme a été supprimé de la zone de travail.</p>'); return; }
  lab.textContent = progLabel(sc).replace(/^Programme (\d+) : .*/, 'Programme $1') + ' · ' + modeNom(it.mode) + (errOn(it, sc) ? ' · 🐞 trouver l\'erreur' : ''); box.append(tools, lab);
  const k = (it.mode==='algo' ? 0.75 : PXK) * (it.scale||1), o = ordreDe(it);
  if (it.mode==='algotext'){
    let rep0 = null; const tv = document.createElement('div'); tv.className = 'algotxt';
    tv.innerHTML = avecTrousAlgo(sc, it, () => { const r = algoTexteLignes(it, sc); rep0 = r.rep0;
      return r.out.map(l => `<div class="al" style="padding-left:${l.lvl*2}em">${o!=='aucun' ? prefHTML(o, o==='reperes' ? l.rep : l.rang, 20) : ''}${l.parts.map(p => { const h = EXO_ALG ? tokHTML(p[0]) : aesc(p[0]); return p[1] ? '<b>' + h + '</b>' : h; }).join('')}</div>`).join(''); });
    box.append(tv);
    if (o==='reperes') box.insertAdjacentHTML('beforeend', ordreHTML(rep0));
    if (EXO_LAST) box.insertAdjacentHTML('beforeend', exoHTML(it, sc, EXO_LAST));
    if (errOn(it, sc)) box.insertAdjacentHTML('beforeend', errHTML(it, sc));
    return; }
  if (it.mode==='relier'){ const v = document.createElement('div'); v.innerHTML = relierHTML(it, sc);
    v.onclick = e => { const g = e.target.closest('.rel-g[data-bid]'); if (!g) return; SEL_IT = it.id; it.hide = [...new Set([...(it.hide || []), g.dataset.bid])]; save(); drawDoc(); };
    box.append(v); requestAnimationFrame(() => relLignes(box));
    if (errOn(it, sc)) box.insertAdjacentHTML('beforeend', errHTML(it, sc)); return; }
  if (it.mode==='grille'){ const d = grilleSVG(it, sc);
    if (d.err) box.insertAdjacentHTML('beforeend', `<p class="gerr">Quadrillage impossible : ${esc(d.err)}. Voir le panneau de réglages.</p>`);
    else { const w = Math.min(d.w, 718), h = d.h * (w / d.w); box.insertAdjacentHTML('beforeend', '<div class="pview">' + d.svg.replace('<svg ', `<svg style="width:${w}px;height:${h}px" `) + '</div>'); }
    if (errOn(it, sc)) box.insertAdjacentHTML('beforeend', errHTML(it, sc)); return; }
  const view = document.createElement('div'); view.className = 'pview ' + it.mode;
  const imgs = itemImages(it), hid = new Set(it.hide||[]), info = aPlat(it) ? ordreInfo(it, sc) : null, px = Math.round(22*(it.scale||1));
  for (const im of imgs){ const w = Math.min(im.doc.w*k, 718), h = im.doc.h * (w/im.doc.w);
    const sp = document.createElement('span'); sp.className = 'pimg' + (im.id && hid.has(im.id) ? ' off' : '');
    const pre = im.id && !hid.has(im.id) && o!=='aucun' ? prefHTML(o, o==='reperes' ? info.rep.get(im.id) : info.rang.get(im.id), px) : '';
    if (pre) sp.classList.add('num');
    sp.innerHTML = pre + im.doc.svg.replace('<svg ', `<svg style="width:${w}px;height:${h}px" `);
    view.append(sp); }
  if (it.mode==='assemble' || aPlat(it)) view.onclick = e => ficheClic(e, it, sc);
  box.append(view);
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
  const ref = locate(g.dataset.bid, [sc.list]); if (!ref) return; const b = blockAt(ref);
  const kEl = e.target.closest('[data-k]'), k = kEl ? kEl.dataset.k : null, spec = k ? specDe(b, k) : null, hid = new Set(it.hide||[]);
  SEL_IT = it.id;
  if (hid.has(b.id)){ it.hide = (it.hide||[]).filter(x => x!==b.id); save(); drawDoc(); return; }
  if (spec){ SEL_TROU = b.id + '|' + k; fichePanel(); return; }   // trou existant : on le montre dans le panneau
  if (k && !(b.tr && b.tr.ligne) && partiesDe(b).some(p => p.key===k)){ setTrou(b, k, true); SEL_TROU = b.id + '|' + k; save(); drawDoc(); return; }
  const P = partiesDe(b), items = [];
  for (const p of P){ if (p.key==='ligne') continue; const on = !!specDe(b, p.key);
    items.push([(on ? '✓ ' : '') + 'Trou : ' + (p.key==='nom' ? 'nom de l\'instruction' : p.label.toLowerCase() + ' « ' + p.ans + ' »'), () => { setTrou(b, p.key, !on); SEL_TROU = on ? null : b.id + '|' + p.key; save(); drawDoc(); }]); }
  items.push([(b.tr && b.tr.ligne ? '✓ ' : '') + 'Trou : ligne entière à écrire', () => { const on = !!(b.tr && b.tr.ligne); setTrou(b, 'ligne', !on); SEL_TROU = on ? null : b.id + '|ligne'; save(); drawDoc(); }]);
  if (aTrous(b)) items.push(['Retirer les trous de cette instruction', () => { delete b.tr; save(); drawDoc(); }]);
  items.push(['Réglages détaillés…', () => trouDialog(b, k)]);
  if (aPlat(it)) items.push(['🙈 Cacher cette instruction (absente du document)', () => { it.hide = [...new Set([...(it.hide||[]), b.id])]; save(); drawDoc(); }]);
  menu(e.clientX, e.clientY, items); }

/* ---------- Panneau de réglages ---------- */
function ficheSel(id){ if (SEL_IT===id) return; SEL_IT = id; SEL_TROU = null; document.querySelectorAll('#page .item').forEach(x => x.classList.toggle('sel', x.dataset.id===id)); fichePanel(); }
const chips = (list, cur, attr) => `<div class="chips">${list.map(([v, l, t]) => `<button data-${attr}="${v}"${v===cur ? ' class="on"' : ''}${t ? ` title="${esc(t)}"` : ''}>${l}</button>`).join('')}</div>`;
function fichePanel(){
  const P = $('#dpanel'); if (!P) return;
  const i = S.doc.findIndex(x => x.id===SEL_IT), it = S.doc[i];
  if (!it || it.t!=='prog'){ P.innerHTML = panelFiche(it); bindFiche(P); return; }
  const sc = S.scripts.find(s => s.id===it.sid);
  if (!sc){ P.innerHTML = '<h3>Programme supprimé</h3><p class="hint">Ce programme n\'existe plus dans la zone de travail. Retirez l\'élément avec ✕.</p>'; return; }
  const blocs = ['assemble', 'line', 'lines'].includes(it.mode), o = ordreDe(it), hidN = (it.hide||[]).length;
  const ctx = exoCtx(sc, it), liste = ctx.liste;
  let h = `<h3>${esc(progLabel(sc))}</h3><p class="sub">Élément ${i + 1} de la fiche</p>
  <div class="ps"><div class="pt">Présentation</div>${chips(MODES, it.mode, 'mode')}
    ${it.mode==='algo' ? `<div class="prow">Style ${chips([['classic','Classique'],['sysml','SysML']], it.algoStyle || ALG.style, 'astyle')}</div>` : ''}
    <div class="prow"><label>Taille <input type="range" class="psz" min="50" max="150" step="10" value="${Math.round((it.scale||1)*100)}"></label>${blocs ? `<label><input type="checkbox" class="pbw"${it.bw ? ' checked' : ''}> Noir et blanc</label>` : ''}</div></div>`;
  h += panelRelGrille(it, sc);
  if (aPlat(it) || it.mode==='algotext') h += `<div class="ps"><div class="pt">Remettre dans l'ordre</div>
    <div class="prow"><label><input type="checkbox" class="psh"${it.shuffle ? ' checked' : ''}> Mélanger ${it.mode==='algotext' ? 'les lignes' : 'les instructions'}</label>${it.shuffle ? '<button class="sm pre-mix" title="Tirer un autre mélange">🔀 Autre mélange</button>' : ''}</div>
    <div class="prow">Repérage ${chips([['cases','Rangs (cases)','Une case vide devant chaque instruction : l\'élève écrit 1, 2, 3…'],['reperes','Repères (G - A - D)','Une lettre devant chaque instruction : l\'élève écrit la suite des lettres dans l\'ordre'],['aucun','Aucun']], o, 'ordre')}</div>
    ${aPlat(it) && hidN ? `<p class="hint">${hidN} instruction${hidN > 1 ? 's' : ''} cachée${hidN > 1 ? 's' : ''} (en pâle dans l'aperçu, clic pour la remettre). <button class="sm pre-show">Tout remettre</button></p>` : ''}</div>`;
  if (!['relier', 'grille'].includes(it.mode)){ h += `<div class="ps"><div class="pt">Trous <span>${liste.length ? liste.length + ' · ' + liste.reduce((s, t) => s + (+t.s.pts || 0), 0) + ' pt' : ''}</span></div>`;
  if (blocs) h += `<p class="hint">Clic sur une valeur ou un menu dans l'aperçu : le trou est créé. Clic ailleurs sur une instruction : nom, ligne entière, cacher…</p>`;
  else h += `<p class="hint">Les trous se placent sur les blocs (présentation « Assemblé », ou clic droit dans la zone de travail) ; ils sont repris ici avec la formulation de ${it.mode==='algo' ? 'l\'algorigramme' : 'l\'algorithme'}.</p>`;
  if (liste.length) h += `<div class="prow"><label><input type="checkbox" class="ptr"${it.trous!==false ? ' checked' : ''}> Afficher les trous sur cet élément</label></div>` + liste.map(t => carteTrou(t)).join('');
  if (blocs) h += `<div class="prow"><label><input type="checkbox" class="pbv"${it.blankV ? ' checked' : ''}> Vider toutes les valeurs</label><label><input type="checkbox" class="pbd"${it.blankD ? ' checked' : ''}> Vider tous les menus</label></div>`;
  h += '</div>'; }
  h += panelErr(it, sc) + `<div class="ps"><div class="pt">Ajouter le même programme</div><div class="chips">${MODES.filter(m => m[0]!==it.mode).map(([v, l]) => `<button data-dup="${v}">+ ${l}</button>`).join('')}</div>
    <p class="hint">Par exemple le programme assemblé au-dessus de son quadrillage.</p></div>`;
  P.innerHTML = h;
  const up = (fn, all = true) => { fn(); save(); if (all) drawDoc(); else fichePanel(); };
  P.querySelectorAll('[data-mode]').forEach(x => x.onclick = () => up(() => { it.mode = x.dataset.mode; if (it.mode==='algo' && !it.algoStyle) it.algoStyle = ALG.style; }));
  P.querySelectorAll('[data-astyle]').forEach(x => x.onclick = () => up(() => it.algoStyle = x.dataset.astyle));
  P.querySelectorAll('[data-ordre]').forEach(x => x.onclick = () => up(() => { it.ordre = x.dataset.ordre; it.num = x.dataset.ordre==='cases'; }));
  P.querySelectorAll('[data-dup]').forEach(x => x.onclick = () => up(() => { const n = {id:nid(), t:'prog', sid:it.sid, mode:x.dataset.dup, shuffle:false, seed:it.seed || Math.floor(Math.random()*1e6), scale:1, hide:[]}; if (n.mode==='algo') n.algoStyle = ALG.style; S.doc.splice(i + 1, 0, n); SEL_IT = n.id; }));
  const ck = (sel, key) => { const c = P.querySelector(sel); if (c) c.onchange = () => up(() => it[key] = c.checked); };
  ck('.pbw', 'bw'); ck('.psh', 'shuffle'); ck('.pbv', 'blankV'); ck('.pbd', 'blankD');
  const tr = P.querySelector('.ptr'); if (tr) tr.onchange = () => up(() => it.trous = tr.checked);
  const sz = P.querySelector('.psz'); if (sz) sz.onchange = () => up(() => it.scale = sz.value / 100);
  const mx = P.querySelector('.pre-mix'); if (mx) mx.onclick = () => up(() => it.seed = Math.floor(Math.random()*1e6));
  const sh = P.querySelector('.pre-show'); if (sh) sh.onclick = () => up(() => it.hide = []);
  P.querySelectorAll('.hc').forEach(c => bindCarte(c, sc)); bindErr(P, it, sc, i); bindRelGrille(P, it);
  if (SEL_TROU){ const c = P.querySelector(`.hc[data-t="${SEL_TROU}"]`); if (c){ c.scrollIntoView({block:'nearest'}); c.classList.add('flash'); const a = c.querySelector('.ans'); if (a) a.focus(); } SEL_TROU = null; } }
function carteTrou(t){
  const p = partiesDe(t.b).find(x => x.key===t.key) || {label:t.key}, s = t.s || {};
  return `<div class="hc" data-t="${t.b.id}|${t.key}">
    <div class="hh"><span class="hl">${t.L}</span><span class="hn" title="${esc(repLigne(t.b))}">${esc(p.label)} · ${esc(repLigne(t.b))}</span><button class="hx" title="Retirer ce trou">✕</button></div>
    <div class="prow">${chips([['libre','À écrire'],['choix','Au choix']], s.rep==='choix' ? 'choix' : 'libre', 'rep')}<label class="mini">Points <input type="number" class="pts" min="0" step="0.5" value="${s.pts ?? 1}"></label></div>
    <label class="hf">Réponse attendue<input class="ans" value="${esc(reponse(t.b, t.key))}"></label>
    ${s.rep==='choix' ? `<label class="hf">Autres propositions, séparées par « / »<input class="props" value="${esc((s.props || []).join(' / '))}" placeholder="reculer / tourner"></label>` : ''}
    <div class="prow mini">Lettre ${chips([['auto','auto'],['coin','dans le coin'],['centre','entourée']], s.pos || 'auto', 'pos')}</div></div>`; }
function bindCarte(c, sc){
  const [bid, key] = c.dataset.t.split('|'), ref = locate(bid, [sc.list]); if (!ref) return; const b = blockAt(ref);
  const spec = () => specDe(b, key), maj = (fn, panel) => { const s = spec(); if (!s) return; fn(s); save(); SEL_TROU = panel ? c.dataset.t : null; drawDoc(); };
  c.querySelector('.hx').onclick = () => { setTrou(b, key, false); save(); drawDoc(); };
  c.querySelectorAll('[data-rep]').forEach(x => x.onclick = () => maj(s => s.rep = x.dataset.rep, true));
  c.querySelectorAll('[data-pos]').forEach(x => x.onclick = () => maj(s => s.pos = x.dataset.pos));
  c.querySelector('.pts').onchange = e => maj(s => s.pts = +e.target.value || 0);
  c.querySelector('.ans').onchange = e => maj(s => { const d = (partiesDe(b).find(x => x.key===key) || {}).ans, v = e.target.value.trim(); if (!v || v===d) delete s.ans; else s.ans = v; });
  const pr = c.querySelector('.props'); if (pr) pr.onchange = e => maj(s => s.props = e.target.value.split('/').map(x => x.trim()).filter(Boolean)); }
// rien de sélectionné (ou un texte) : aide et état de la fiche
function panelFiche(it){
  const progs = S.doc.filter(x => x.t==='prog'), mix = progs.filter(x => x.shuffle || ordreDe(x)==='reperes' || (() => { const sc = S.scripts.find(s => s.id===x.sid); return sc && exoCtx(sc, x).liste.some(t => t.s.rep==='choix'); })()).length;
  return `<h3>${it && it.t==='text' ? 'Texte' : 'Fiche'}</h3>
    <p class="hint">${it && it.t==='text' ? 'Écrivez directement dans la page. Gras, italique, souligné : boutons au survol ou Ctrl+B / I / U.' : 'Cliquez sur un élément de la page pour le régler ici.'}</p>
    <div class="ps"><div class="pt">Ajouter</div><div class="chips"><button data-add="text">+ Texte</button><button data-add="prog">+ Programmes…</button><button data-add="break">+ Saut de page</button></div></div>
    <div class="ps"><div class="pt">Exercices possibles</div><ul class="tips">
      <li><b>Remettre dans l'ordre</b> : présentation « À plat » ou « Algorithme », Mélanger, puis rangs ou repères.</li>
      <li><b>Compléter</b> : en « Assemblé », clic sur une valeur ou un menu pour faire un trou.</li>
      <li><b>Écrire une instruction</b> : clic sur l'instruction › Trou : ligne entière.</li>
      <li><b>Trouver l'erreur</b> : réglages d'un programme › « Créer la version avec erreurs », puis modifiez la copie.</li>
      <li><b>Relier</b> : présentation « Relier » (blocs, algorithme, algorigramme : deux au choix).</li>
      <li><b>Prévoir le trajet</b> : présentation « Quadrillage » (avancer / tourner de valeurs précises).</li></ul></div>
    <div class="ps"><div class="pt">Sujets A et B</div><p class="hint">${mix ? `Le sujet B change ${mix} élément${mix > 1 ? 's' : ''} : autre ordre des instructions, des repères et des propositions.` : 'Le sujet B est pour l\'instant identique au sujet A : cochez « Mélanger » sur un élément, ou faites des trous « au choix ».'}</p></div>`; }
function bindFiche(P){ P.querySelectorAll('[data-add]').forEach(b => b.onclick = () => ({text:'#aText', prog:'#aProg', break:'#aBreak'})[b.dataset.add] && $(({text:'#aText', prog:'#aProg', break:'#aBreak'})[b.dataset.add]).click()); }

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
})();
async function ficheAlgoDocx(it, sc, children, D){
  const o = ordreDe(it); let rows = [], rep0 = null;
  avecTrousAlgo(sc, it, () => { const r = algoTexteLignes(it, sc); rep0 = r.rep0; rows = r.out.map(l => ({l, runs: l.parts.flatMap(p => tokRuns(p[0], p[1], D))})); });
  const found = EXO_LAST;
  for (const {l, runs} of rows){
    const pre = o!=='aucun' ? [new D.ImageRun({type:'png', data: await prefPNG(o, o==='reperes' ? l.rep : l.rang), transformation:{width:17, height:17}}), new D.TextRun({text:'  '})] : [];
    children.push(new D.Paragraph({indent:{left:l.lvl*567}, spacing:{after:50}, children:[...pre, ...runs]})); }
  if (o==='reperes') ordreDocx(rep0, children, D);
  if (found) exoDocx(it, sc, children, D, found);
  if (errOn(it, sc)) errDocx(it, sc, children, D); }
