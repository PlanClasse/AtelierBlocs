'use strict';
/* ═══════════════ Atelier blocs · Relier et Quadrillage (v1.16.0) ═══════════════
   Relier : chaque instruction (à gauche) à sa traduction (à droite, mélangée) : blocs, algorithme ou symboles d'algorigramme.
   Quadrillage : trajet du robot (mBot2 : avancer / reculer … cm, tourner …°) ou du lutin (Scratch : pas, degrés, x / y),
   calculé à partir du programme ; l'élève le trace, le corrigé le dessine. */

/* ---------- Relier ---------- */
const REL_COTES = [['blocs', 'Blocs'], ['algo', 'Algorithme'], ['chart', 'Algorigramme']];
const relG = it => (it.rel && it.rel.g) || 'blocs', relD = it => (it.rel && it.rel.d) || 'algo';
function relInstr(it, sc){
  const hid = new Set(it.hide || []), chart = relG(it)==='chart' || relD(it)==='chart';
  return errLignes(sc.list).filter(e => e.b && !hid.has(e.b.id) && !(chart && e.b.type==='toujours')).map(e => e.b); }
function relParts(b){
  const K = t => [t, true], T = t => [t, false], d = DEF[b.type], c = () => T(condOf(b));
  switch (b.type){
    case 'si': case 'sinon': return [K('SI '), c(), K(' ALORS')];
    case 'jusqua': return [K('RÉPÉTER JUSQU\'À '), c()];
    case 'tantque': return [K('TANT QUE '), c(), K(' FAIRE')];
    case 'attJusqua': return [K('ATTENDRE JUSQU\'À '), c()];
    case 'repeter': return [K('RÉPÉTER '), T(fv(b, 'k0')), K(' FOIS')];
    case 'toujours': return [K('RÉPÉTER POUR TOUJOURS')];
    case 'compter': return [K('POUR '), T(b.f.k0), K(' DE '), T(fv(b, 'k1')), K(' À '), T(fv(b, 'k2')), K(' PAR PAS DE '), T(fv(b, 'k3'))];
    case 'arret': return [K('ARRÊTER LE PROGRAMME')]; }
  if (d.sh==='hat') return b.type==='demarre' && !b.alg ? [K('DÉBUT')] : [K('DÉBUT : '), T(hatText(b))];
  return [T(blockText(b))]; }
function relFrag(b){ // un symbole d'algorigramme seul
  const d = DEF[b.type], dia = t => { const D = diamond(t);
    if (ST==='sysml'){ const lw = atw('[' + t + ']') + 8; return {w:D.w + 8 + lw, h:D.h, draw:(x, y) => D.draw(x + 15, y) + `<text x="${x + D.w + 8}" y="${y + 15}" dominant-baseline="central" class="lab">${aesc('[' + t + ']')}</text>`}; }
    return {w:D.w, h:D.h, draw:(x, y) => D.draw(x + D.w/2, y)}; };
  switch (b.type){
    case 'si': case 'sinon': case 'jusqua': case 'tantque': case 'attJusqua': return dia(condOf(b));
    case 'repeter': return dia('i < ' + fv(b, 'k0'));
    case 'compter': return dia(b.f.k0 + ' ≤ ' + fv(b, 'k2'));
    case 'arret': return endFrag(); }
  if (d.sh==='hat') return startFrag(ST==='classic' ? (b.type==='demarre' && !b.alg ? 'DÉBUT' : 'DÉBUT : ' + hatText(b)) : (b.type==='demarre' && !b.alg ? '' : hatText(b)));
  if (/^pcall_/.test(b.type)) return boxFrag('sub', blockText(b));
  if (d.sh==='rep' || d.sh==='bool') return boxFrag('act', valText(b));
  return boxFrag(ALG.io && (IO_CATS.has(d.cat) || IO_IDS.has(b.type)) ? 'io' : 'act', blockText(b)); }
function relChartDoc(it, b){
  const st = ALG.style; ALG.style = ST = it.algoStyle || ALG.style;
  try { const F = relFrag(b), pad = 3, w = Math.ceil(F.w + 2*pad), h = Math.ceil(F.h + 2*pad);
    return {w, h, svg:`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><style>text{font:${AF};fill:${INK}} .lab{font-size:12px;font-style:italic}</style><rect width="${w}" height="${h}" fill="#fff"/>${F.draw(pad, pad)}</svg>`}; }
  finally { ALG.style = st; ST = st; } }
function relBlocDoc(it, b){ const c = {...b}; if (b.body) c.body = []; if (b.body2) c.body2 = [];
  const o = newOut({bw:it.bw, forceColor:true, pick:true}); renderBlock(c, 0, 0, o); return svgDoc(o, 2); }
function relCote(it, b, cote){ // {html, doc?, parts?}
  if (cote==='algo') return {parts:relParts(b)};
  return {doc: cote==='chart' ? relChartDoc(it, b) : relBlocDoc(it, b)}; }
function relPerm(it, n){ const idx = [...Array(n).keys()], r = rng(seedOf(it) + 31);
  for (let j = n - 1; j > 0; j--){ const m = Math.floor(r() * (j + 1)); [idx[j], idx[m]] = [idx[m], idx[j]]; } return idx; }
function relData(it, sc){
  const L = relInstr(it, sc), perm = relPerm(it, L.length), pos = new Map(perm.map((src, row) => [src, row]));
  return {L, perm, rep: L.map((_, i) => lettreN(pos.get(i)))}; }   // rep[i] = lettre (à droite) de l'instruction i
const relK = (it, cote) => (cote==='chart' ? 0.75 : PXK) * (it.scale || 1);
function relCellHTML(it, b, cote){
  const c = relCote(it, b, cote);
  if (c.parts) return `<span class="rel-t">${c.parts.map(([t, g]) => g ? '<b>' + aesc(t) + '</b>' : aesc(t)).join('')}</span>`;
  const w = Math.min(c.doc.w * relK(it, cote), 330), h = c.doc.h * (w / c.doc.w);
  return c.doc.svg.replace('<svg ', `<svg style="width:${w}px;height:${h}px;display:block" `); }
function relierHTML(it, sc){
  const {L, perm, rep} = relData(it, sc); if (!L.length) return '<p class="muted">Programme vide.</p>';
  let h = '<div class="rel">';
  L.forEach((b, i) => { h += `<div class="rel-r"><div class="rel-g" data-bid="${b.id}"><span class="rel-n">${i + 1}</span><span class="rel-c">${relCellHTML(it, b, relG(it))}</span>${CORR ? `<span class="rel-ans">${rep[i]}</span>` : ''}<span class="rel-dot" data-g="${i}" data-to="${perm.indexOf(i)}"></span></div><div class="rel-m"></div>`
    + `<div class="rel-d"><span class="rel-dot" data-d="${i}"></span><span class="rel-l">${lettreN(i)}</span><span class="rel-c">${relCellHTML(it, L[perm[i]], relD(it))}</span></div></div>`; });
  return h + '<svg class="rel-svg"></svg></div>'; }
function relLignes(root){ // corrigé : traits entre les points
  root.querySelectorAll('.rel').forEach(R => { const svg = R.querySelector('.rel-svg'); if (!svg) return; if (!CORR){ svg.innerHTML = ''; return; }
    const o = R.getBoundingClientRect(); let s = '';
    R.querySelectorAll('[data-g]').forEach(g => { const d = R.querySelector(`[data-d="${g.dataset.to}"]`); if (!d) return;
      const a = g.getBoundingClientRect(), b = d.getBoundingClientRect();
      s += `<line x1="${a.left + a.width/2 - o.left}" y1="${a.top + a.height/2 - o.top}" x2="${b.left + b.width/2 - o.left}" y2="${b.top + b.height/2 - o.top}" stroke="#1D4ED8" stroke-width="2.2" stroke-linecap="round"/>`; });
    svg.innerHTML = s; }); }
async function relierDocx(it, sc, children, D){
  const {L, perm, rep} = relData(it, sc); if (!L.length) return;
  const none = {style:D.BorderStyle.NONE, size:0, color:'FFFFFF'}, borders = {top:none, bottom:none, left:none, right:none};
  const contenu = async (b, cote) => { const c = relCote(it, b, cote);
    if (c.parts) return c.parts.map(([t, g]) => new D.TextRun({text:t, bold:g}));
    const w = Math.min(c.doc.w * relK(it, cote), 240), h = c.doc.h * (w / c.doc.w);
    return [new D.ImageRun({type:'png', data:new Uint8Array(await (await toPNG(c.doc, 3)).arrayBuffer()), transformation:{width:Math.round(w), height:Math.round(h)}})]; };
  const W = [420, 3900, 700, 1150, 380, 420, 3802];
  const td = (k, runs, al) => new D.TableCell({borders, width:{size:W[k], type:D.WidthType.DXA}, verticalAlign:D.VerticalAlign.CENTER, children:[new D.Paragraph({alignment:al, spacing:{before:50, after:50}, children:runs})]});
  const rows = [];
  for (let i = 0; i < L.length; i++) rows.push(new D.TableRow({cantSplit:true, children:[
    td(0, [new D.TextRun({text:String(i + 1), bold:true})]),
    td(1, await contenu(L[i], relG(it)), D.AlignmentType.RIGHT),
    td(2, [...(CORR ? [new D.TextRun({text:rep[i] + ' ', bold:true, color:'1D4ED8'})] : []), new D.TextRun({text:'●', bold:true})], D.AlignmentType.RIGHT),
    td(3, []),
    td(4, [new D.TextRun({text:'●', bold:true})]),
    td(5, [new D.TextRun({text:lettreN(i), bold:true})]),
    td(6, await contenu(L[perm[i]], relD(it)))]}));
  children.push(new D.Table({width:{size:10772, type:D.WidthType.DXA}, columnWidths:W, borders:{top:none, bottom:none, left:none, right:none, insideHorizontal:none, insideVertical:none}, rows}));
  if (CORR) children.push(new D.Paragraph({spacing:{before:80, after:120}, children:[new D.TextRun({text:'Réponses : ', bold:true}), new D.TextRun({text:rep.map((r, i) => (i + 1) + '-' + r).join('   '), bold:true, color:'1D4ED8'})]}));
  else children.push(new D.Paragraph({spacing:{after:80}, children:[]})); }

/* ---------- Quadrillage ---------- */
const num = (b, k) => (b.in && b.in[k]) ? NaN : parseFloat(String(b.f[k] ?? '').replace(',', '.'));
const SANS_DEPLACEMENT = new Set(['emStop', 'emRaz', 'emVerrou']);
function trajet(sc, it = {}){
  const scratch = MODE==='scratch', R = {ok:true, why:'', segs:[], unite: scratch ? 'pas' : 'cm', note:''};
  let x = 0, y = 0, dir = scratch ? 90 : (it.gDir ?? 0), pen = true, n = 0;   // dir : degrés, 0 = haut (mBot2) ; Scratch : 90 = droite
  const usesPen = scratch && (() => { let u = false; walk(sc.list, b => { if (b.type==='styloBas' || b.type==='styloHaut') u = true; }); return u; })();
  if (usesPen) pen = false;
  const start = () => ({x, y, dir});
  let st0 = null;
  const vers = (nx, ny) => { if (Math.hypot(nx - x, ny - y) > 1e-9) R.segs.push({a:[x, y], b:[nx, ny], pen}); x = nx; y = ny; if (++n > 600) throw new Error('trop d\'étapes (boucle trop longue)'); };
  const avance = d => { const a = (scratch ? 90 - dir : 90 - dir) * Math.PI / 180; vers(x + d * Math.cos(a), y + d * Math.sin(a)); };
  const nb = (b, k) => { const v = num(b, k); if (!isFinite(v)) throw new Error('la valeur de « ' + repLigne(b) + ' » n\'est pas un nombre'); return v; };
  const run = list => { for (const b of list){ const d = DEF[b.type]; if (!d) continue;
    switch (b.type){
      case 'avancerCm': avance((b.f.k0==='reculer' ? -1 : 1) * nb(b, 'k1')); break;
      case 'tourner': dir += (b.f.k0==='gauche' ? -1 : 1) * nb(b, 'k1'); break;
      case 'avancerPas': avance(nb(b, 'k0')); break;
      case 'tournerD': dir += nb(b, 'k0'); break;
      case 'tournerG': dir -= nb(b, 'k0'); break;
      case 'orienterA': dir = nb(b, 'k0'); break;
      case 'allerXY': vers(nb(b, 'k0'), nb(b, 'k1')); break;
      case 'glisserXY': vers(nb(b, 'k1'), nb(b, 'k2')); break;
      case 'ajX': vers(x + nb(b, 'k0'), y); break;
      case 'ajY': vers(x, y + nb(b, 'k0')); break;
      case 'metX': vers(nb(b, 'k0'), y); break;
      case 'metY': vers(x, nb(b, 'k0')); break;
      case 'styloBas': pen = true; break;
      case 'styloHaut': pen = false; break;
      case 'repeter': { const k = nb(b, 'k0'); for (let i = 0; i < k; i++) if (run(b.body || [])==='stop') return 'stop'; break; }
      case 'compter': { const a = nb(b, 'k1'), z = nb(b, 'k2'), p = nb(b, 'k3') || 1; for (let v = a; p > 0 ? v <= z : v >= z; v += p) if (run(b.body || [])==='stop') return 'stop'; break; }
      case 'toujours': { const cle = () => [x.toFixed(4), y.toFixed(4), (((dir % 360) + 360) % 360).toFixed(4)].join(), s0 = cle(); let k = 0;
        do { if (run(b.body || [])==='stop') return 'stop'; k++; } while (k < 8 && cle()!==s0);
        R.note = k < 8 ? 'boucle « pour toujours » : jusqu\'au retour au départ' : 'boucle « pour toujours » : 8 tours dessinés'; return 'stop'; }
      case 'arret': return 'stop';
      default:
        if (/^pcall_/.test(b.type)){ const def = S.scripts.find(s => s.list[0] && s.list[0].type==='pdef_' + b.type.slice(6)); if (def){ if (run(def.list.slice(1))==='stop') return 'stop'; } break; }
        if (d.sh==='hat' || SANS_DEPLACEMENT.has(b.type)) break;
        if (['si', 'sinon', 'jusqua', 'tantque', 'attJusqua'].includes(b.type)) throw new Error('« ' + repLigne(b) + ' » dépend des capteurs');
        if (d.cat==='chassis' || d.cat==='motion') throw new Error('« ' + repLigne(b) + ' » ne donne pas une distance ou un angle précis');
    }
    if (b.type!=='repeter' && b.type!=='compter' && b.body && b.body.length) throw new Error('« ' + repLigne(b) + ' » n\'est pas pris en charge'); } };
  st0 = start();
  try { run(sc.list); } catch(e){ R.ok = false; R.why = e.message; }
  R.start = st0; R.end = {x, y, dir};
  if (R.ok && !R.segs.length){ R.ok = false; R.why = 'le programme ne contient aucun déplacement'; }
  return R; }
const pgcd = (a, b) => { a = Math.abs(Math.round(a)); b = Math.abs(Math.round(b)); while (b){ [a, b] = [b, a % b]; } return a; };
function grilleCase(T, it){
  if (it.gCase > 0) return it.gCase;
  let g = 0; for (const s of T.segs) for (const v of [s.b[0] - s.a[0], s.b[1] - s.a[1]]) if (Math.abs(v) > 1e-6) g = pgcd(g, v);
  for (const v of [T.start.x, T.start.y]) if (Math.abs(v) > 1e-6) g = pgcd(g, v);
  const pts = T.segs.flatMap(s => [s.a, s.b]), ext = Math.max(1, ...pts.map(p => Math.abs(p[0] - T.start.x)), ...pts.map(p => Math.abs(p[1] - T.start.y)));
  const nice = v => { const p = Math.pow(10, Math.floor(Math.log10(v))); for (const m of [1, 2, 5, 10]) if (m * p >= v) return m * p; return 10 * p; };
  if (!g || ext / g > 16) g = nice(ext / 12);
  return g; }
function grilleSVG(it, sc){
  const T = trajet(sc, it); if (!T.ok) return {err:T.why};
  const c = grilleCase(T, it), m = it.gMarge ?? 1, P = 30 * (it.scale || 1);
  const pts = [[T.start.x, T.start.y], ...T.segs.flatMap(s => [s.a, s.b])].map(p => [p[0] / c, p[1] / c]);
  const x0 = Math.floor(Math.min(...pts.map(p => p[0]) ) + 1e-6) - m, x1 = Math.ceil(Math.max(...pts.map(p => p[0])) - 1e-6) + m;
  const y0 = Math.floor(Math.min(...pts.map(p => p[1])) + 1e-6) - m, y1 = Math.ceil(Math.max(...pts.map(p => p[1])) - 1e-6) + m;
  const nx = x1 - x0, ny = y1 - y0; if (nx > 40 || ny > 40) return {err:'trajet trop grand pour la grille choisie (carreau de ' + c + ' ' + T.unite + ')'};
  const X = v => 20 + (v / c - x0) * P, Y = v => 20 + (y1 - v / c) * P, W = Math.max(nx * P + 40, 470), H = ny * P + 64;
  let s = `<rect width="${W}" height="${H}" fill="#fff"/>`;
  for (let i = 0; i <= nx; i++) s += `<line x1="${20 + i*P}" y1="20" x2="${20 + i*P}" y2="${20 + ny*P}" stroke="#94A3B8" stroke-width="${i===0 || i===nx ? 1.6 : 0.8}"/>`;
  for (let j = 0; j <= ny; j++) s += `<line x1="20" y1="${20 + j*P}" x2="${20 + nx*P}" y2="${20 + j*P}" stroke="#94A3B8" stroke-width="${j===0 || j===ny ? 1.6 : 0.8}"/>`;
  const fleche = (px, py, d, col, r) => { const a = (90 - d) * Math.PI / 180, ux = Math.cos(a), uy = -Math.sin(a);
    return `<path d="M ${px + ux*r*1.5} ${py + uy*r*1.5} L ${px - uy*r - ux*r*0.6} ${py + ux*r - uy*r*0.6} L ${px + uy*r - ux*r*0.6} ${py - ux*r - uy*r*0.6} z" fill="${col}" stroke="#fff" stroke-width="1.2"/>`; };
  if (CORR){
    T.segs.forEach(g => { s += `<line x1="${X(g.a[0])}" y1="${Y(g.a[1])}" x2="${X(g.b[0])}" y2="${Y(g.b[1])}" stroke="#1D4ED8" stroke-width="3.2" stroke-linecap="round"${g.pen ? '' : ' stroke-dasharray="6 6" opacity=".6"'}/>`;
      const mx = (X(g.a[0]) + X(g.b[0])) / 2, my = (Y(g.a[1]) + Y(g.b[1])) / 2, d = 90 - Math.atan2(g.b[1] - g.a[1], g.b[0] - g.a[0]) * 180 / Math.PI;
      if (Math.hypot(X(g.b[0]) - X(g.a[0]), Y(g.b[1]) - Y(g.a[1])) > P * 0.8) s += fleche(mx, my, d, '#1D4ED8', 5); });
    s += `<rect x="${X(T.end.x) - 6}" y="${Y(T.end.y) - 6}" width="12" height="12" fill="#1D4ED8" stroke="#fff" stroke-width="1.5"/>`; }
  else if (it.gFin){ s += `<rect x="${X(T.end.x) - 6}" y="${Y(T.end.y) - 6}" width="12" height="12" fill="#111" stroke="#fff" stroke-width="1.5"/>`; }
  s += `<circle cx="${X(T.start.x)}" cy="${Y(T.start.y)}" r="${P*0.36}" fill="#fff" stroke="#111" stroke-width="2"/>` + fleche(X(T.start.x), Y(T.start.y), T.start.dir, '#111', P*0.2);
  s += `<text x="20" y="${H - 14}" style="font:600 13px Arial,sans-serif;fill:#334155">Départ : cercle et flèche · 1 carreau = ${c} ${T.unite}${it.gFin && !CORR ? ' · ■ arrivée' : ''}${CORR ? ' · ■ arrivée' : ''}${CORR && T.note ? ' · ' + T.note : ''}</text>`;
  return {w:W, h:H, svg:`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${s}</svg>`}; }

/* ---------- Panneau ---------- */
function panelRelGrille(it, sc){
  if (it.mode==='relier'){ const n = (it.hide || []).length;
    return `<div class="ps"><div class="pt">Relier</div>
      <div class="prow">À gauche ${chips(REL_COTES, relG(it), 'relg')}</div>
      <div class="prow">À droite ${chips(REL_COTES, relD(it), 'reld')}</div>
      ${relG(it)===relD(it) ? '<p class="hint" style="color:#B91C1C">Choisissez deux présentations différentes.</p>' : ''}
      ${relG(it)==='chart' || relD(it)==='chart' ? `<div class="prow">Symboles ${chips([['classic', 'Classique'], ['sysml', 'SysML']], it.algoStyle || ALG.style, 'astyle')}</div>` : ''}
      <div class="prow"><button class="sm pre-mix">🔀 Autre ordre à droite</button></div>
      <p class="hint">Clic sur une instruction à gauche pour la retirer (programmes longs).${n ? ` ${n} retirée${n > 1 ? 's' : ''}. <button class="sm pre-show">Tout remettre</button>` : ''}</p>
      <p class="hint">Le corrigé trace les traits et donne les réponses (1-C, 2-A…).</p></div>`; }
  if (it.mode==='grille'){ const T = trajet(sc, it), c = T.ok ? grilleCase(T, it) : 0;
    return `<div class="ps"><div class="pt">Quadrillage</div>
      ${T.ok ? `<p class="hint">Trajet calculé : ${T.segs.length} déplacement${T.segs.length > 1 ? 's' : ''}${T.note ? ' (' + T.note + ')' : ''}. L'élève le trace à partir du départ ; le corrigé le dessine en bleu.</p>`
        : `<p class="hint" style="color:#B91C1C">Trajet impossible à calculer : ${esc(T.why)}.</p><p class="hint">Instructions prises en charge : ${MODE==='scratch' ? 'avancer de … pas, tourner de … degrés, s\'orienter à, aller à x y, glisser à x y, ajouter à x / y, mettre x / y, stylo' : 'avancer / reculer … cm, tourner à gauche / droite …°'}, répéter … fois, pour toujours, mes blocs. Les autres instructions (affichage, LED, son, attente…) sont ignorées.</p>`}
      <div class="prow"><label>1 carreau = <input type="number" class="gcase" min="0" step="any" value="${it.gCase || ''}" placeholder="${c || 'auto'}" style="width:64px;font:inherit;padding:3px 6px;border:1px solid #CBD5E1;border-radius:6px"> ${MODE==='scratch' ? 'pas' : 'cm'}</label></div>
      <div class="prow">Marge ${chips([['0', '0'], ['1', '1 carreau'], ['2', '2'], ['3', '3']], String(it.gMarge ?? 1), 'gmarge')}</div>
      ${MODE==='scratch' ? '' : `<div class="prow">Départ ${chips([['0', '↑'], ['90', '→'], ['180', '↓'], ['270', '←']], String(it.gDir ?? 0), 'gdir')}</div>`}
      <div class="prow"><label><input type="checkbox" class="gfin"${it.gFin ? ' checked' : ''}> Montrer l'arrivée à l'élève</label></div></div>`; }
  return ''; }
function bindRelGrille(P, it){
  const up = fn => { fn(); save(); drawDoc(); };
  P.querySelectorAll('[data-relg]').forEach(x => x.onclick = () => up(() => it.rel = {...(it.rel || {}), g:x.dataset.relg}));
  P.querySelectorAll('[data-reld]').forEach(x => x.onclick = () => up(() => it.rel = {...(it.rel || {}), d:x.dataset.reld}));
  P.querySelectorAll('[data-gmarge]').forEach(x => x.onclick = () => up(() => it.gMarge = +x.dataset.gmarge));
  P.querySelectorAll('[data-gdir]').forEach(x => x.onclick = () => up(() => it.gDir = +x.dataset.gdir));
  const gc = P.querySelector('.gcase'); if (gc) gc.onchange = () => up(() => it.gCase = +gc.value > 0 ? +gc.value : 0);
  const gf = P.querySelector('.gfin'); if (gf) gf.onchange = () => up(() => it.gFin = gf.checked); }
