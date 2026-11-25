'use strict';
/* ═══════════════ Atelier blocs · types d'exercices, niveaux, galerie, fiche express (v1.17.0) ═══════════════
   Un exercice = un élément de fiche avec it.exo (type), it.niveau, it.consigne et ses propres trous (it.tr).
   Les niveaux règlent tout d'un coup (trous choisis par l'appli, mélange, repères…) ; un réglage changé à la main
   fait passer le niveau en « Perso ». L'appli n'écrit jamais de propositions « au choix » : seulement, au niveau
   facile, la banque des bonnes réponses mélangées. */
const NIVEAUX = {facile:'Facile', moyen:'Moyen', difficile:'Difficile', perso:'Perso'};
const EXOS = [
  {id:'completer', nom:'Compléter le programme', court:'Compléter', desc:'Des trous à la place des valeurs, des menus ou d\'instructions entières.',
    niv:{facile:'3 valeurs à trouver ; les bonnes réponses sont données en vrac sous le programme.', moyen:'4 valeurs ou menus à écrire, sans aide.', difficile:'2 instructions entières à écrire, et une condition s\'il y en a une.'}},
  {id:'ordre', nom:'Remettre dans l\'ordre', court:'Ordre', desc:'Instructions ou lignes d\'algorithme mélangées : rangs ou repères.',
    niv:{facile:'Instructions mélangées ; l\'élève écrit leur rang dans les cases.', moyen:'Instructions mélangées ; l\'élève écrit la suite des lettres (G - A - D).', difficile:'Lignes de l\'algorithme mélangées ; l\'élève écrit la suite des lettres.'}},
  {id:'erreur', nom:'Trouver l\'erreur', court:'Erreur', desc:'Une copie du programme avec des erreurs ; le corrigé est automatique.',
    niv:{facile:'1 erreur : une valeur ou un sens changé.', moyen:'2 erreurs : une valeur, deux instructions inversées.', difficile:'3 erreurs : une valeur, une inversion, une instruction oubliée.'}},
  {id:'relier', nom:'Relier', court:'Relier', desc:'Chaque bloc à sa phrase d\'algorithme ou à son symbole.',
    niv:{facile:'Blocs ↔ algorithme.', moyen:'Blocs ↔ algorigramme.', difficile:'Algorithme ↔ algorigramme.'}},
  {id:'trajet', nom:'Prévoir le trajet', court:'Trajet', desc:'L\'élève trace le chemin du robot ou du lutin sur un quadrillage.', test:'trajet',
    niv:{facile:'Quadrillage, départ et arrivée marqués.', moyen:'Quadrillage, départ seul.', difficile:'Quadrillage plus grand, départ seul.'}},
  {id:'traduire', nom:'Traduire les blocs', court:'Traduire', desc:'Écrire l\'algorithme, ou compléter l\'algorigramme, à partir du programme.',
    niv:{facile:'3 valeurs à compléter, avec la banque de réponses.', moyen:'Une ligne sur deux à écrire.', difficile:'Toutes les lignes à écrire.'}},
  {id:'programmer', nom:'Programmer depuis l\'algorithme', court:'Programmer', desc:'L\'algorithme est donné ; l\'élève retrouve ou écrit le programme.',
    niv:{facile:'Les blocs sont donnés mélangés : rangs à écrire.', moyen:'Les blocs sont donnés mélangés : suite des lettres à écrire.', difficile:'Le programme est à écrire dans un cadre.'}},
  {id:'libre', nom:'Élément libre', court:'Libre', desc:'Comme avant : toutes les présentations, tous les réglages, à combiner.'}];
function consigneDe(type, niv, cible){
  const qui = MODE==='scratch' ? 'du lutin' : 'du robot', ag = cible==='algo';
  const C = {
    completer:{facile:'Complète le programme avec les réponses de la liste.', moyen:'Complète le programme : écris dans chaque case ce qui manque.', difficile:'Complète le programme : écris dans les cadres les instructions qui manquent.'},
    ordre:{facile:'Numérote les instructions dans l\'ordre du programme.', moyen:'Remets les instructions dans l\'ordre : écris la suite de leurs lettres.', difficile:'Remets les lignes de l\'algorithme dans l\'ordre : écris la suite de leurs lettres.'},
    erreur:{all:'Ce programme contient des erreurs : entoure-les et corrige-les.'},
    relier:{facile:'Relie chaque bloc à la phrase de l\'algorithme qui le traduit.', moyen:'Relie chaque bloc au symbole de l\'algorigramme qui le traduit.', difficile:'Relie chaque ligne de l\'algorithme au symbole de l\'algorigramme qui lui correspond.'},
    trajet:{all:'Trace sur le quadrillage le trajet ' + qui + ' quand ce programme s\'exécute.'},
    traduire:{facile:'Complète ' + (ag ? 'l\'algorigramme' : 'l\'algorithme') + ' de ce programme avec les réponses de la liste.', moyen:'Complète ' + (ag ? 'l\'algorigramme' : 'l\'algorithme') + ' de ce programme : écris ce qui manque.', difficile:(ag ? 'Complète chaque case de l\'algorigramme' : 'Écris l\'algorithme') + ' de ce programme.'},
    programmer:{facile:'Voici l\'algorithme. Numérote les blocs dans l\'ordre du programme.', moyen:'Voici l\'algorithme. Remets les blocs dans l\'ordre : écris la suite de leurs lettres.', difficile:'Voici l\'algorithme. Écris le programme dans le cadre.'}}[type];
  return C ? (C.all || C[niv] || C.moyen) : ''; }

/* ---------- Trous et erreurs choisis par l'appli ---------- */
const CTRL = ['si', 'sinon', 'jusqua', 'tantque', 'attJusqua', 'toujours', 'repeter', 'compter'];
function pickTrous(sc, kind, niv){
  const L = errLignes(sc.list).map(e => e.b).filter(b => b && DEF[b.type].sh!=='hat');
  const spread = (a, k) => a.length <= k ? a : Array.from({length:k}, (_, i) => a[Math.floor((i + 0.5) * a.length / k)]);
  const tr = {}, sp = k => ({rep:'libre', props:[], pos:'auto', pts: k==='ligne' && kind==='completer' ? 2 : 1, auto:true});
  const parts = (b, labels) => partiesDe(b).filter(p => labels.includes(p.label)).map(p => [b, p.key]);
  const put = ([b, k]) => { if (k==='ligne') tr[b.id] = {ligne:sp(k)}; else { tr[b.id] = tr[b.id] && tr[b.id].p ? tr[b.id] : {p:{}}; tr[b.id].p[k] = sp(k); } };
  if (kind==='completer'){
    if (niv==='difficile'){ spread(L.filter(b => !CTRL.includes(b.type)), 2).forEach(b => put([b, 'ligne']));
      const c = L.find(b => ['si', 'sinon', 'jusqua', 'tantque', 'attJusqua'].includes(b.type)); if (c && !tr[c.id]) put([c, 'k0']); }
    else if (niv==='facile') spread(L.flatMap(b => parts(b, ['Valeur'])), 3).forEach(put);
    else { const v = L.flatMap(b => parts(b, ['Valeur'])), m = L.flatMap(b => parts(b, ['Menu'])), nv = Math.min(v.length, Math.max(2, 4 - m.length));
      [...spread(v, nv), ...spread(m, 4 - Math.min(nv, v.length))].forEach(put); } }
  else {
    if (niv==='facile') spread(L.flatMap(b => parts(b, ['Valeur'])), 3).forEach(put);
    else if (niv==='moyen') L.filter((_, i) => i % 2===1).forEach(b => put([b, 'ligne']));
    else L.forEach(b => put([b, 'ligne'])); }
  return tr; }
const FLIP = {avancer:'reculer', reculer:'avancer', gauche:'droite', droite:'gauche'};
function valMod(b, test){
  for (const p of ligne0(b)){ if (typeof p!=='object' || !p.k || (b.in && b.in[p.k])) continue;
    const v = b.f[p.k];
    if (FLIP[v]){ if (!test) b.f[p.k] = FLIP[v]; return true; }
    if (p.t==='n' && v!=='' && v!==undefined && isFinite(+v)){ if (!test){ const x = +v; b.f[p.k] = String(x===0 ? 10 : Math.abs(x) < 5 ? x + 1 : x * 2); } return true; } }
  return false; }
function genErreurs(cp, n, seed){
  const r = rng(seed + 11), pickR = a => a[Math.floor(r() * a.length)], used = new Set(), lst = [];
  const rec = l => l.forEach(b => { if (DEF[b.type] && DEF[b.type].sh!=='hat') lst.push({b, l}); if (b.body) rec(b.body); if (b.body2) rec(b.body2); }); rec(cp.list);
  const valeur = () => { const c = lst.filter(x => !used.has(x.b) && valMod(x.b, true)); if (!c.length) return false; const x = pickR(c); valMod(x.b, false); used.add(x.b); return true; };
  const inverser = () => { const c = [];
    const rec2 = l => { for (let i = 0; i + 1 < l.length; i++){ const a = l[i], b = l[i+1]; if (DEF[a.type] && DEF[b.type] && DEF[a.type].sh!=='hat' && DEF[b.type].sh!=='hat' && !used.has(a) && !used.has(b) && repLigne(a)!==repLigne(b)) c.push([l, i]); }
      l.forEach(b => { if (b.body) rec2(b.body); if (b.body2) rec2(b.body2); }); };
    rec2(cp.list); if (!c.length) return false; const [l, i] = pickR(c); used.add(l[i]); used.add(l[i+1]); [l[i], l[i+1]] = [l[i+1], l[i]]; return true; };
  const oublier = () => { const c = lst.filter(x => !used.has(x.b) && !x.b.body && x.l.length > 1 && x.l.includes(x.b)); if (!c.length) return false; const x = pickR(c); x.l.splice(x.l.indexOf(x.b), 1); used.add(x.b); return true; };
  const plan = [valeur, inverser, oublier].slice(0, n); while (plan.length < n) plan.push(valeur);
  for (const f of plan) if (!f() && !valeur()) inverser(); }
function errPreparer(it, sc0, niv, ancienne){
  const cp = ancienne && ancienne.orig===sc0.id ? ancienne : errCopie(sc0);
  cp.list = sc0.list.map(clone); genErreurs(cp, {facile:1, moyen:2, difficile:3}[niv] || 2, it.seed || 7); it.sid = cp.id; return cp; }

/* ---------- Appliquer un type et un niveau à un élément ---------- */
function appliquer(it, sc0, type, niv){
  const base = {id:it.id, t:'prog', sid:sc0.id, seed:it.seed || Math.floor(Math.random()*1e6), scale:it.scale || 1, bw:it.bw, numEx:it.numEx, cible:it.cible};
  for (const k of Object.keys(it)) delete it[k];
  Object.assign(it, base, {exo:type, niveau:niv, hide:[], tr:{}});
  switch (type){
    case 'completer': it.mode = 'assemble'; it.tr = pickTrous(sc0, 'completer', niv); it.banque = niv==='facile'; break;
    case 'ordre': if (niv==='difficile'){ it.mode = 'algotext'; it.shuffle = true; it.ordre = 'reperes'; } else { it.mode = 'lines'; it.shuffle = true; it.ordre = niv==='facile' ? 'cases' : 'reperes'; } break;
    case 'erreur': it.mode = 'assemble'; it.err = true; it.errN = true; break;
    case 'relier': it.mode = 'relier'; it.rel = niv==='facile' ? {g:'blocs', d:'algo'} : niv==='moyen' ? {g:'blocs', d:'chart'} : {g:'algo', d:'chart'}; break;
    case 'trajet': it.mode = 'grille'; it.gFin = niv==='facile'; it.gMarge = niv==='difficile' ? 2 : 1; break;
    case 'traduire': it.mode = it.cible==='algo' ? 'algo' : 'algotext'; it.avec = 'assemble'; it.tr = pickTrous(sc0, 'traduire', niv); it.banque = niv==='facile'; break;
    case 'programmer': it.avec = 'algotext'; if (niv==='difficile') it.mode = 'cadre'; else { it.mode = 'lines'; it.shuffle = true; it.ordre = niv==='facile' ? 'cases' : 'reperes'; } break;
    default: it.mode = 'assemble'; it.exo = 'libre'; delete it.niveau; delete it.tr; }
  const c = consigneDe(it.exo, niv, it.cible); if (c) it.consigne = c;
  return it; }
function changerExo(it, type, niv){
  const sc = scOf(it); if (!sc) return; const sc0 = errRef(sc) || sc;
  const keep = it.exo===type && it.consigneManuelle ? it.consigne : null;
  appliquer(it, sc0, type, niv);
  if (type==='erreur') errPreparer(it, sc0, niv, sc.orig ? sc : null);
  if (keep){ it.consigne = keep; it.consigneManuelle = true; }
  save(); drawDoc(); }
function changerProg(it, sid){
  const sc = S.scripts.find(s => s.id===sid); if (!sc) return;
  if (!it.exo || it.exo==='libre'){ it.sid = sid; save(); drawDoc(); return; }
  it.sid = sid; changerExo(it, it.exo, it.niveau && it.niveau!=='perso' ? it.niveau : 'moyen'); }
function exoPossible(type, sc){
  if (!sc || !sc.list.length) return 'programme vide';
  if (type==='trajet'){ const T = trajet(sc); return T.ok ? '' : T.why; }
  return ''; }

/* ---------- Galerie « ＋ Exercice » puis assistant ---------- */
const MINI = {
  completer:'<i class="b y" style="width:70%"></i><span class="r"><i class="b o" style="width:40%"></i><i class="h"></i></span><span class="r"><i class="b u" style="width:55%"></i><i class="h"></i></span><i class="b o" style="width:45%"></i>',
  ordre:'<span class="r"><b class="k">C</b><i class="b u" style="width:60%"></i></span><span class="r"><b class="k">A</b><i class="b o" style="width:40%"></i></span><span class="r"><b class="k">B</b><i class="b v" style="width:52%"></i></span>',
  erreur:'<i class="b y" style="width:70%"></i><i class="b o e" style="width:48%"></i><i class="b u" style="width:62%"></i><i class="b o" style="width:45%"></i>',
  relier:'<span class="r j"><i class="b o" style="width:38%"></i><em>SI … ALORS</em></span><span class="r j"><i class="b u" style="width:46%"></i><em>Attendre 1 s</em></span><span class="r j"><i class="b o" style="width:30%"></i><em>Avancer…</em></span>',
  trajet:'<span class="q"></span>',
  traduire:'<span class="r"><span class="c"><i class="b y" style="width:90%"></i><i class="b o" style="width:70%"></i><i class="b u" style="width:95%"></i></span><em>→</em><span class="c"><i class="d"></i><i class="d"></i><i class="d"></i></span></span>',
  programmer:'<span class="r"><span class="c t"><b>DÉBUT</b><br>Attendre 1 s<br><b>SI</b> … <b>ALORS</b></span><em>→</em><span class="c"><i class="x"></i><i class="x"></i><i class="x"></i></span></span>',
  libre:'<span class="g">⚙</span>'};
let GAL = null;
function ouvrirGalerie(opts = {}){
  if (!S.scripts.some(s => s.list.length)) return note('Aucun programme dans la zone de travail : construisez-en un d\'abord (onglet Programmes).');
  const ov = document.createElement('div'); ov.className = 'ov gal-ov';
  ov.innerHTML = '<div class="gal"></div>'; document.body.append(ov);
  ov.addEventListener('pointerdown', e => { if (e.target===ov) ov.remove(); });
  const sel = S.scripts.find(s => s.id===(opts.sid || selected));
  const sc0 = sel ? (errRef(sel) || sel) : S.scripts.find(s => !s.orig && s.list.length);
  GAL = {ov, type:opts.type || null, sid:sc0 && sc0.id, niv:'moyen', cible:'algotext', consigne:null, numEx:true, seed:Math.floor(Math.random()*1e6)};
  if (GAL.type) galEtape2(); else galEtape1(); }
function galEtape1(){
  const G = GAL, box = G.ov.querySelector('.gal'); let rec = []; try { rec = JSON.parse(localStorage.getItem('atelier-exo-recents') || '[]'); } catch(_){}
  box.className = 'gal gal1';
  box.innerHTML = `<div class="gal-h"><h2>Quel exercice ?</h2><span class="hint">Choisissez un type, puis le programme et le niveau. Tout reste modifiable ensuite.</span><span style="flex:1"></span><button class="gal-x" aria-label="Fermer">×</button></div>
    <div class="gal-grid">${EXOS.map(e => `<button class="gal-c${e.id==='libre' ? ' libre' : ''}" data-t="${e.id}"><span class="mini">${MINI[e.id]}</span><b>${esc(e.nom)}</b><span class="d">${esc(e.desc)}</span>${e.niv ? '<span class="n">Facile · Moyen · Difficile</span>' : '<span class="n">Pour les habitués</span>'}</button>`).join('')}</div>
    <div class="gal-f">${rec.length ? '<span class="hint">Récemment :</span>' + rec.map(([t, n], k) => `<button class="pill" data-r="${k}">${esc((EXOS.find(e => e.id===t) || {}).court || t)}${n ? ' · ' + NIVEAUX[n].toLowerCase() : ''}</button>`).join('') : ''}
      <span style="flex:1"></span><span class="hint">Une fiche entière sur un programme ?</span><button class="lien gal-exp">🎯 Fiche express →</button></div>`;
  box.querySelector('.gal-x').onclick = () => G.ov.remove();
  box.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { G.type = b.dataset.t; galEtape2(); });
  box.querySelectorAll('[data-r]').forEach(b => b.onclick = () => { const [t, n] = rec[+b.dataset.r]; G.type = t; if (n) G.niv = n; galEtape2(); });
  box.querySelector('.gal-exp').onclick = () => { G.ov.remove(); ouvrirExpress(S.scripts.find(s => s.id===G.sid)); }; }
function galEtape2(){
  const G = GAL, box = G.ov.querySelector('.gal'), ex = EXOS.find(e => e.id===G.type), progs = S.scripts.filter(s => !s.orig && s.list.length && !['rep', 'bool'].includes((DEF[s.list[0].type] || {}).sh));
  if (!G.sid || exoPossible(G.type, S.scripts.find(s => s.id===G.sid))){ const ok = progs.find(s => !exoPossible(G.type, s)); if (ok) G.sid = ok.id; }
  if (G.consigne===null || !G.consigneTouchee) G.consigne = consigneDe(G.type, G.niv, G.cible);
  box.className = 'gal gal2';
  const pc = s => { const why = exoPossible(G.type, s); return `<button class="gal-p${s.id===G.sid ? ' on' : ''}" data-s="${s.id}"${why ? ` disabled title="${esc(why)}"` : ''}><b>${esc(progLabel(s).replace(/ : .*/, ''))}</b><span>${esc(progLabel(s).replace(/^[^:]*: /, ''))}</span>${why ? `<em>${esc(why)}</em>` : ''}</button>`; };
  box.innerHTML = `<div class="gal-steps"><div class="pt">Nouvel exercice</div>
      <div class="st ok"><span>✓</span><div><b>Type</b><br>${esc(ex.nom)}</div></div>
      <div class="st"><span>2</span><div><b>Programme</b><br>${esc(progLabel(S.scripts.find(s => s.id===G.sid) || progs[0]).replace(/ : .*/, ''))}</div></div>
      <div class="st"><span>3</span><div><b>${ex.niv ? 'Niveau et consigne' : 'Consigne'}</b><br>${ex.niv ? NIVEAUX[G.niv] : ''}</div></div>
      <span style="flex:1"></span><button class="lien gal-back">← Changer de type</button></div>
    <div class="gal-mid">
      <h3>Sur quel programme ?</h3><div class="gal-progs">${progs.map(pc).join('')}</div>
      ${ex.niv ? `<h3>Quel niveau ?</h3><div class="gal-nivs">${['facile', 'moyen', 'difficile'].map(n => `<button class="gal-n${G.niv===n ? ' on' : ''}" data-n="${n}"><b>${NIVEAUX[n]}</b><span>${esc(ex.niv[n])}</span></button>`).join('')}</div>
        <p class="hint">${G.type==='erreur' ? 'Les erreurs sont faites par l\'appli dans une copie du programme ; vous pourrez la modifier.' : 'Les choix de l\'appli se changent ensuite d\'un clic.'} Propositions « au choix » : toujours écrites par vous.</p>` : ''}
      ${G.type==='traduire' ? `<div class="prow">Traduire en ${chips([['algotext', 'Algorithme'], ['algo', 'Algorigramme']], G.cible, 'cible')}</div>` : ''}
      <h3>Consigne</h3><input class="gal-cons" value="${esc(G.consigne)}" placeholder="Sans consigne, l'élément n'est pas numéroté">
      <div class="prow"><label><input type="checkbox" class="gal-num"${G.numEx ? ' checked' : ''}> Numéroter l'exercice</label></div>
      <span style="flex:1"></span>
      <div class="gal-act"><button class="gal-x2">Annuler</button><button class="pri gal-ok">Ajouter à la fiche</button></div></div>
    <div class="gal-prev"><div class="pt">Aperçu <span class="seg2 sm"><button data-c="0"${G.corr ? '' : ' class="on"'}>Élève</button><button data-c="1"${G.corr ? ' class="on"' : ''}>Corrigé</button></span></div><div class="gal-page"><div class="gal-zoom"></div></div></div>`;
  const q = s => box.querySelector(s);
  q('.gal-back').onclick = () => galEtape1();
  q('.gal-x2').onclick = () => G.ov.remove();
  box.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { G.sid = b.dataset.s; galEtape2(); });
  box.querySelectorAll('[data-n]').forEach(b => b.onclick = () => { G.niv = b.dataset.n; galEtape2(); });
  box.querySelectorAll('[data-cible]').forEach(b => b.onclick = () => { G.cible = b.dataset.cible; galEtape2(); });
  q('.gal-cons').oninput = e => { G.consigne = e.target.value; G.consigneTouchee = true; };
  q('.gal-num').onchange = e => { G.numEx = e.target.checked; };
  box.querySelectorAll('.gal-prev [data-c]').forEach(b => b.onclick = () => { G.corr = b.dataset.c==='1'; box.querySelectorAll('.gal-prev [data-c]').forEach(x => x.classList.toggle('on', x===b)); galApercu(); });
  q('.gal-ok').onclick = () => galAjouter();
  const cur = S.scripts.find(s => s.id===G.sid), why = exoPossible(G.type, cur); q('.gal-ok').disabled = !!why; if (why) q('.gal-ok').title = why;
  galApercu(); }
function galItem(){ // l'élément tel qu'il sera ajouté (sans créer la copie à erreurs)
  const G = GAL, sc = S.scripts.find(s => s.id===G.sid); if (!sc) return null;
  const it = appliquer({id:'__apercu', seed:G.seed, cible:G.cible, numEx:G.numEx}, sc, G.type, G.niv);
  if (G.consigne && G.consigne.trim()) it.consigne = G.consigne.trim(); else delete it.consigne;
  return it; }
function galApercu(){
  const G = GAL, z = G.ov.querySelector('.gal-zoom'); if (!z) return; z.innerHTML = '';
  const it = galItem(); if (!it) return; const sc0 = S.scripts.find(s => s.id===G.sid);
  const c0 = CORR; if (G.corr!==undefined) CORR = G.corr;
  let tmp = null;
  try {
    if (G.type==='erreur'){ tmp = {id:'__apercu_err', x:0, y:0, list:sc0.list.map(clone), orig:sc0.id}; S.scripts.push(tmp); genErreurs(tmp, {facile:1, moyen:2, difficile:3}[G.niv], it.seed); it.sid = tmp.id; }
    const box = document.createElement('div'); box.className = 'item it-prog';
    const n = S.doc.filter(x => x.t==='prog' && x.consigne && x.numEx!==false).length + 1;
    if (it.consigne && it.numEx!==false){ it.numEx = false; box.dataset.num = n; }
    ficheProg(it, -1, box, document.createElement('span'));
    if (box.dataset.num){ const c = box.querySelector('.consigne'); if (c) c.insertAdjacentHTML('afterbegin', `<b>Exercice ${n} :</b> `); }
    box.querySelectorAll('[contenteditable]').forEach(x => x.removeAttribute('contenteditable'));
    z.append(box);
  } finally { if (tmp) S.scripts.splice(S.scripts.indexOf(tmp), 1); CORR = c0; } }
function galAjouter(){
  const G = GAL, sc = S.scripts.find(s => s.id===G.sid); if (!sc) return;
  const it = appliquer({id:nid(), seed:G.seed, cible:G.cible, numEx:G.numEx}, sc, G.type, G.niv);
  if (G.consigne && G.consigne.trim()){ it.consigne = G.consigne.trim(); if (G.consigneTouchee) it.consigneManuelle = true; } else delete it.consigne;
  if (G.type==='erreur') errPreparer(it, sc, G.niv, null);
  const i = S.doc.findIndex(x => x.id===SEL_IT); S.doc.splice(i < 0 ? S.doc.length : i + 1, 0, it); SEL_IT = it.id;
  try { let rec = JSON.parse(localStorage.getItem('atelier-exo-recents') || '[]').filter(([t, n]) => !(t===G.type && n===(EXOS.find(e => e.id===G.type).niv ? G.niv : null)));
    rec.unshift([G.type, EXOS.find(e => e.id===G.type).niv ? G.niv : null]); localStorage.setItem('atelier-exo-recents', JSON.stringify(rec.slice(0, 4))); } catch(_){}
  G.ov.remove(); save();
  if (VIEW!=='doc') setView('doc'); else drawDoc();
  const el = document.querySelector(`#page .item[data-id="${it.id}"]`); if (el) el.scrollIntoView({block:'center'}); }

/* ---------- Fiche express : plusieurs exercices sur un programme ---------- */
function ouvrirExpress(sc){
  sc = sc && (errRef(sc) || sc); if (!sc) sc = S.scripts.find(s => !s.orig && s.list.length);
  if (!sc) return note('Aucun programme dans la zone de travail.');
  const DEF_EXP = {ordre:['moyen', true], completer:['moyen', true], relier:['facile', true], trajet:['moyen', true], erreur:['moyen', false], traduire:['moyen', false], programmer:['moyen', false]};
  const rows = EXOS.filter(e => e.niv).map(e => { const why = exoPossible(e.id, sc), [n, on] = DEF_EXP[e.id];
    return `<label class="exp-r${why ? ' off' : ''}"${why ? ` title="${esc(why)}"` : ''}><input type="checkbox" data-e="${e.id}"${on && !why ? ' checked' : ''}${why ? ' disabled' : ''}><span class="exp-t"><b>${esc(e.nom)}</b><span class="exp-d" data-d="${e.id}">${esc(why ? 'impossible : ' + why : e.niv[n])}</span></span>
      <select data-n="${e.id}"${why ? ' disabled' : ''}>${['facile', 'moyen', 'difficile'].map(v => `<option value="${v}"${v===n ? ' selected' : ''}>${NIVEAUX[v]}</option>`).join('')}</select></label>`; }).join('');
  dialog(`<div class="exp"><h2 style="margin:0;font-size:19px">Une fiche sur ${esc(progLabel(sc).replace(/ : .*/, ''))}</h2>
    <p class="hint" style="margin:4px 0 12px">${esc(progLabel(sc).replace(/^[^:]*: /, ''))}. Cochez les exercices : ils sont ajoutés à la fin de la fiche, dans cet ordre, avec leurs consignes.</p>
    <div class="exp-l">${rows}</div>
    <div class="prow" style="margin-top:12px"><label><input type="checkbox" class="exp-titre" checked> Titre, nom et classe en tête</label></div>
    <div class="row"><button class="no">Annuler</button><button class="pri ok">Créer la fiche</button></div></div>`, (ov, close) => {
    const ok = ov.querySelector('.ok'), maj = () => { const n = ov.querySelectorAll('[data-e]:checked').length; ok.textContent = 'Créer la fiche (' + n + ' exercice' + (n > 1 ? 's' : '') + ')'; ok.disabled = !n; };
    ov.querySelectorAll('[data-e]').forEach(c => c.onchange = maj);
    ov.querySelectorAll('select[data-n]').forEach(s => s.onchange = () => { const e = EXOS.find(x => x.id===s.dataset.n); ov.querySelector(`[data-d="${e.id}"]`).textContent = e.niv[s.value]; });
    ov.querySelector('.no').onclick = close; maj();
    ok.onclick = () => {
      const seed = Math.floor(Math.random()*1e6), nouveaux = [];
      if (ov.querySelector('.exp-titre').checked) nouveaux.push({id:nid(), t:'text', html:`<b>${esc(progLabel(sc).replace(/^[^:]*: /, ''))}</b><br>Nom : ………………………………  Prénom : ………………………………  Classe : …………`});
      ov.querySelectorAll('[data-e]:checked').forEach((c, k) => { const type = c.dataset.e, niv = ov.querySelector(`select[data-n="${type}"]`).value;
        const it = appliquer({id:nid(), seed:seed + k * 1013}, sc, type, niv); if (type==='erreur') errPreparer(it, sc, niv, null); nouveaux.push(it); });
      S.doc.push(...nouveaux); SEL_IT = (nouveaux.find(x => x.t==='prog') || {}).id || null; close(); save();
      if (VIEW!=='doc') setView('doc'); else drawDoc();
      const el = document.querySelector(`#page .item[data-id="${nouveaux[0].id}"]`); if (el) el.scrollIntoView({block:'start'}); }; }); }

/* ---------- Boutons sur le programme sélectionné (zone de travail) ---------- */
function majWsAct(){
  let d = $('#wsAct'); const ws = $('#ws'); if (!ws) return;
  if (!d){ d = document.createElement('div'); d.id = 'wsAct'; d.innerHTML = '<button class="pri wa-f">🎯 Faire une fiche</button><button class="wa-e">＋ Exercice ▾</button>'; ws.append(d);
    d.addEventListener('pointerdown', e => e.stopPropagation());
    d.querySelector('.wa-f').onclick = () => ouvrirExpress(S.scripts.find(s => s.id===selected));
    d.querySelector('.wa-e').onclick = e => { const r = e.currentTarget.getBoundingClientRect(), sid = selected;
      menu(r.left, r.bottom + 4, EXOS.map(x => [x.nom, () => ouvrirGalerie({sid, type:x.id})])); }; }
  const sc = S.scripts.find(s => s.id===selected);
  if (VIEW==='doc' || !sc || !sc.list.length || !sc._box || sc._box.x2 < -1e8){ d.style.display = 'none'; return; }
  d.style.display = 'flex';
  d.style.left = Math.max(4, (sc._box.x1 + S.px) * S.z) + 'px';
  d.style.top = Math.max(4, (sc._box.y1 + S.py) * S.z - (sc.orig ? 64 : 44)) + 'px'; }
(() => { const d0 = drawWS; drawWS = function(){ d0.apply(this, arguments); try { majWsAct(); } catch(_){} }; })();

/* ---------- Barre du haut : sur une seule ligne, la version reste à droite ---------- */
(() => { for (const id of ['bWide', 'bRange', 'bBW', 'bAlgo', 'bCap', 'bClr']){ const b = document.getElementById(id); if (!b) continue;
  const t = b.textContent.trim(), i = t.indexOf(' '); if (i > 0) b.innerHTML = esc(t.slice(0, i)) + '<span class="lbl"> ' + esc(t.slice(i + 1)) + '</span>'; } })();
