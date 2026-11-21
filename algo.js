'use strict';
/* ═══════════════ Algorigramme : construit à partir d'un programme de blocs ═══════════════
   Deux styles : « classique » (ellipse, rectangle, losange avec la question, parallélogramme
   pour les entrées/sorties, rectangle à double trait pour Mes blocs) et « SysML » simplifié
   (disque de départ, cible de fin, rectangles arrondis, losange vide avec la condition à côté,
   [oui] / [non] sur les chemins). « Répéter n fois » : version détaillée avec un compteur. */
const AF = '13px "Helvetica Neue", Helvetica, Arial, sans-serif';
const acv = document.createElement('canvas').getContext('2d'); acv.font = AF;
const atw = s => acv.measureText(s).width;
const G = 26;                     // espace vertical entre deux éléments (avec la flèche)
const INK = '#1E293B';
const COLNAMES = {'#E3001B':'rouge','#F5A623':'orange','#F8E71C':'jaune','#7ED321':'vert','#50E3C2':'cyan','#4A90E2':'bleu','#9013FE':'violet','#FF5AC8':'rose','#FFFFFF':'blanc','#000000':'noir'};
const NAMED = [['rouge',227,0,27],['orange',245,166,35],['jaune',248,231,28],['vert',126,211,33],['cyan',80,227,194],['bleu',74,144,226],['violet',144,19,254],['rose',255,90,200],['blanc',255,255,255],['noir',0,0,0]];
function colName(c){ c = String(c).toUpperCase(); if (COLNAMES[c]) return COLNAMES[c]; const m = c.match(/^#?([0-9A-F]{2})([0-9A-F]{2})([0-9A-F]{2})$/); if (!m) return c;
  const [r,g,b] = m.slice(1).map(x => parseInt(x,16)); let best = NAMED[0], bd = 1e9; for (const n of NAMED){ const d = (n[1]-r)**2 + (n[2]-g)**2 + (n[3]-b)**2; if (d < bd){ bd = d; best = n; } } return best[0]; }

/* ---------- Textes ---------- */
const SHORT = {distance:'distance', lumiere:'lumière ambiante', sonore:'volume sonore', minuterie:'chronomètre', ecart:'écart à la ligne',
  statut:'statut de la ligne', secousse:'force de secousse', horsPortee:'aucun obstacle (hors de portée)'};
// Capteur quad RGB : le code binaire des sondes traduit en phrase (1 = la sonde voit ce qui est choisi : la ligne, le blanc…)
const QVOIT = m => ({'ligne':'la ligne', 'arrière-plan':'le fond', 'couleur auto-définie':'la couleur définie'})[m] || (m ? 'le ' + m : 'la ligne');
function quadSet(b){ const code = (String(b.f.k2 ?? '').match(/[01]+$/)||[''])[0], names = code.length===2 ? ['L1','R1'] : ['L2','L1','R1','R2'];
  return {on: names.filter((n, i) => code[i]==='1'), n: names.length, x: QVOIT(b.f.k1), cap: b.f.k0 && b.f.k0!=='1' ? ' (capteur ' + b.f.k0 + ')' : ''}; }
const etList = a => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' et ' + a[a.length-1];
const sondeNom = b => String(b.f.k1||'').replace(/^\(\d\)\s*/, '');
const CONDTXT = {
  statutEst: b => { const {on, n, x, cap} = quadSet(b);
    return (!on.length ? 'aucune sonde ne voit ' + x : on.length===n ? 'les 4 sondes voient ' + x : (on.length===1 ? 'seule ' + on[0] + ' voit ' : 'seules ' + etList(on) + ' voient ') + x) + cap; },
  etatL1R1: b => { const {on, x, cap} = quadSet(b);
    return (!on.length ? 'ni L1 ni R1 ne voit ' + x : on.length===2 ? 'L1 et R1 voient ' + x : 'seule ' + on[0] + ' voit ' + x) + cap; },
  sonde: b => { const {x, cap} = quadSet(b); return 'la sonde ' + sondeNom(b) + ' voit ' + QVOIT(b.f.k2) + cap; },
};
const NEGTXT = {
  statutEst: b => { const {on, n, x, cap} = quadSet(b);
    return (!on.length ? 'au moins une sonde voit ' + x : on.length===n ? 'au moins une sonde ne voit pas ' + x : 'pas seulement ' + etList(on) + ' sur ' + x) + cap; },
  etatL1R1: b => { const {on, x, cap} = quadSet(b);
    return (!on.length ? 'L1 ou R1 voit ' + x : on.length===2 ? 'L1 ou R1 ne voit pas ' + x : 'pas seulement ' + on[0] + ' sur ' + x) + cap; },
  sonde: b => { const {cap} = quadSet(b); return 'la sonde ' + sondeNom(b) + ' ne voit pas ' + QVOIT(b.f.k2) + cap; },
};
function valText(b){ // valeur ronde ou condition, en texte court
  if (!b) return '…';
  if (b.alg){ const a = b.alg; delete b.alg; const t = valText(b); b.alg = a; chkAlg(b, t); return b.alg ? b.alg.replace(/\s*\?$/, '') : t; }
  if (SHORT[b.type]) return SHORT[b.type];
  if (CONDTXT[b.type]) return CONDTXT[b.type](b);
  const d = DEF[b.type]; if (!d) return '?';
  if (b.type==='var' || b.type==='liste') return Object.values(b.f)[0];
  if (/^parg_/.test(b.type)) return d.rows[0][0];
  const parts = d.rows[0].map(p => partText(b, p)).filter(x => x!=='');
  let t = parts.join(' ').replace(/\s+/g,' ').replace(/ \?$/,'').trim();
  if (['add','sous','mul','div','sup','inf','egal','modulo'].includes(b.type)) t = '(' + t + ')';
  return t;
}
function partText(b, p){
  if (typeof p==='string') return p;
  if (p.t==='ico') return {flag:'le drapeau vert', cw:'à droite', ccw:'à gauche'}[p.v] || '';
  const ch = b.in && b.in[p.k];
  if (ch) return valText(ch);
  if (p.t==='b') return '…';
  if (p.t==='col') return colName(b.f[p.k]);
  if (p.t==='c5') return '5 couleurs';
  if (p.t==='pname' || p.t==='pparam') return p.v;
  return String(b.f[p.k] ?? '');
}
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
// Formulations soignées pour l'algorigramme et l'algorithme (sinon : le texte du bloc)
const fv = (b, k) => b.in && b.in[k] ? valText(b.in[k]) : String(b.f[k] ?? '');
// texte saisi : entre guillemets ; variable ou autre bloc rond : sans guillemets
const qv = (b, k) => b.in && b.in[k] ? valText(b.in[k]) : '« ' + String(b.f[k] ?? '') + ' »';
const MOT = {EM1:'le moteur gauche (EM1)', EM2:'le moteur droit (EM2)', tout:'les deux moteurs'};
const ledsTxt = (b, k) => b.f[k]==='tous' ? 'toutes les LED' : 'la LED ' + b.f[k];
const ALGTXT = {
  led5: b => 'Allumer les 5 LED : ' + (b.f.k0||[]).map(colName).join(', '),
  ledCouleur: b => 'Allumer ' + ledsTxt(b,'k0') + ' en ' + colName(b.f.k1),
  ledPendant: b => 'Allumer ' + ledsTxt(b,'k0') + ' en ' + colName(b.f.k1) + ' pendant ' + fv(b,'k2') + ' s',
  ledRVB: b => 'Allumer ' + ledsTxt(b,'k0') + ' en R ' + fv(b,'k1') + ', V ' + fv(b,'k2') + ', B ' + fv(b,'k3'),
  ledOff: b => 'Éteindre ' + ledsTxt(b,'k0'),
  anim: b => 'Jouer l\'animation « ' + b.f.k0 + ' » sur les LED',
  aff: b => 'Afficher ' + qv(b,'k0'),
  affLigne: b => 'Afficher ' + qv(b,'k0') + ' et passer à la ligne',
  effacer: () => 'Effacer l\'écran',
  attendre: b => 'Attendre ' + fv(b,'k0') + ' s',
  emStop: b => 'Arrêter ' + MOT[b.f.k0],
  emPct: b => 'Moteur gauche (EM1) à ' + fv(b,'k0') + ' %, moteur droit (EM2) à ' + fv(b,'k1') + ' %',
  emTr: b => 'Moteur gauche (EM1) à ' + fv(b,'k0') + ' tr/min, moteur droit (EM2) à ' + fv(b,'k1') + ' tr/min',
  emUnTr: b => 'Faire tourner ' + MOT[b.f.k0] + ' à ' + fv(b,'k1') + ' tr/min',
  emDeg: b => 'Faire tourner la ' + b.f.k0 + ' de ' + fv(b,'k1') + '°',
  avancerS: b => cap(b.f.k0) + ' à ' + fv(b,'k1') + ' tr/min pendant ' + fv(b,'k2') + ' s',
  avancer: b => cap(b.f.k0) + ' à ' + fv(b,'k1') + ' tr/min',
  avancerCm: b => cap(b.f.k0) + ' de ' + fv(b,'k1') + ' cm',
  tourner: b => 'Tourner à ' + b.f.k0 + ' de ' + fv(b,'k1') + '°',
  servo: b => 'Placer le servomoteur ' + b.f.k0 + ' à ' + fv(b,'k1') + '°',
  servoZero: b => 'Remettre le servomoteur ' + b.f.k0 + ' à 0°',
  defVar: b => b.f.k0 + ' ← ' + fv(b,'k1'),
  ajVar: b => b.f.k1 + ' ← ' + b.f.k1 + ' + ' + fv(b,'k0'),
  chronoZero: () => 'Remettre le chronomètre à zéro',
  son1: b => 'Jouer le son « ' + b.f.k0 + ' » jusqu\'à la fin',
  son2: b => 'Jouer le son « ' + b.f.k0 + ' »',
  lanEnvoi: b => 'Envoyer le message ' + qv(b,'k0') + ' aux autres robots',
  lanValeur: b => 'Envoyer le message ' + qv(b,'k0') + ' avec la valeur ' + fv(b,'k1') + ' aux autres robots',
  diffuser: b => 'Envoyer le message « ' + b.f.k0 + ' »',
  calib: () => 'Calibrer le capteur de ligne',
  // Scratch
  dire: b => 'Dire ' + qv(b,'k0'),
  direP: b => 'Dire ' + qv(b,'k0') + ' pendant ' + fv(b,'k1') + ' s',
  penser: b => 'Penser à ' + qv(b,'k0'),
  penserP: b => 'Penser à ' + qv(b,'k0') + ' pendant ' + fv(b,'k1') + ' s',
  demander: b => 'Demander ' + qv(b,'k0') + ' et attendre la réponse',
  tournerD: b => 'Tourner à droite de ' + fv(b,'k0') + '°',
  tournerG: b => 'Tourner à gauche de ' + fv(b,'k0') + '°',
  allerXY: b => 'Aller à x = ' + fv(b,'k0') + ', y = ' + fv(b,'k1'),
  glisserXY: b => 'Glisser en ' + fv(b,'k0') + ' s jusqu\'à x = ' + fv(b,'k1') + ', y = ' + fv(b,'k2'),
  metX: b => 'x ← ' + fv(b,'k0'),
  metY: b => 'y ← ' + fv(b,'k0'),
  ajX: b => 'x ← x + ' + fv(b,'k0'),
  ajY: b => 'y ← y + ' + fv(b,'k0'),
  orienterA: b => 'S\'orienter à ' + fv(b,'k0') + '°',
  sonFin: b => 'Jouer le son « ' + b.f.k0 + ' » jusqu\'au bout',
  sonJouer: b => 'Jouer le son « ' + b.f.k0 + ' »',
  costume: b => 'Prendre le costume « ' + b.f.k0 + ' »',
  arret: b => ({tout:'Tout arrêter', 'ce script':'Arrêter ce script'})[b.f.k0] || 'Arrêter les autres scripts',
  styloBas: () => 'Poser le stylo',
  styloHaut: () => 'Relever le stylo',
};
function procCallText(b){ const pr = (S.procs||[]).find(x => 'pcall_'+x.id===b.type); if (!pr) return blockText0(b);
  const args = pr.params.filter(p => p.t!=='l').map(p => p.name + ' = ' + (b.in && b.in['p_'+p.id] ? valText(b.in['p_'+p.id]) : (b.f['p_'+p.id] || '…')));
  return pr.name + (args.length ? ' (' + args.join(', ') + ')' : ''); }
function procHeadText(b){ const pr = (S.procs||[]).find(x => 'pdef_'+x.id===b.type); if (!pr) return '?';
  const ps = pr.params.filter(p => p.t!=='l').map(p => p.name); return pr.name + (ps.length ? ' (' + ps.join(', ') + ')' : ''); }
// Textes personnalisés : abandonnés si le bloc a été modifié depuis (b.asrc = texte automatique au moment de la saisie)
function chkAlg(b, auto){ if (b.asrc!==undefined && b.asrc!==auto){ delete b.alg; delete b.gy; delete b.gn; delete b.asrc; } }
function blockText(b){
  if (b.alg){ const a = b.alg; delete b.alg; const t = blockText(b); b.alg = a; chkAlg(b, t); return b.alg || t; }
  if (/^pcall_/.test(b.type)) return procCallText(b);
  if (ALGTXT[b.type]) try { return cap(ALGTXT[b.type](b)); } catch(_){}
  return blockText0(b);
}
function blockText0(b){
  const d = DEF[b.type]; if (!d) return '?';
  let t = d.rows[0].map(p => partText(b, p)).filter(x => x!=='').join(' ').replace(/\s+/g,' ').trim();
  t = t.replace(/ secs$/, ' s').replace(/ secs /, ' s ').replace(/ secondes\b/g, ' s');
  return cap(t);
}
function hatText(b){
  const d = DEF[b.type];
  if (b.alg){ const a = b.alg; delete b.alg; const t = hatText(b); b.alg = a; chkAlg(b, t); return b.alg || t; }
  if (b.type==='demarre') return 'Démarrage du CyberPi';
  if (b.type==='boutonA') return 'Appui sur le bouton ' + b.f.k0;
  if (b.type==='joystick') return 'Joystick ' + b.f.k0;
  if (b.type==='drapeau') return 'Clic sur le drapeau vert';
  if (b.type==='touche') return 'Appui sur la touche ' + b.f.k0;
  if (b.type==='clicSprite') return 'Clic sur le sprite';
  if (b.type==='clone') return 'Démarrage d\'un clone';
  if (b.type==='recois' && MODE==='scratch') return 'Réception du message « ' + b.f.k0 + ' »';
  if (/^pdef_/.test(b.type)) return procHeadText(b);
  let t = blockText(b).replace(/^(Lorsque|Quand) /i, ''); return cap(t);
}
const IO_CATS = new Set(['aff']);
const IO_IDS = new Set(['lanEnvoi','lanValeur','diffuser','diffuserAtt','dire','direP','penser','penserP','demander']);
function wrap(t, max = 24){
  const words = String(t).replace(/ (s|%|°|cm|pas|tr\/min)(?=$|[ ,.;)])/g, '\u00a0$1').split(' '), lines = []; let cur = '';
  for (const w of words){ if (cur && atw(cur + ' ' + w) > max * 7.2){ lines.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; }
  if (cur) lines.push(cur); return lines.length ? lines : [''];
}
const aesc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function txt(lines, cx, cy, anchor = 'middle', cls = ''){
  const n = lines.length, lh = 16, y0 = cy - (n-1)*lh/2;
  return lines.map((l, i) => `<text x="${cx}" y="${y0 + i*lh}" text-anchor="${anchor}" dominant-baseline="central"${cls ? ` class="${cls}"` : ''}>${aesc(l)}</text>`).join('');
}

/* ---------- Fragments de mise en page ----------
   frag = {w, h, cx, exit, draw(x, y)} : (x, y) = coin haut-gauche ; entrée en (x+cx, y), sortie en (x+cx, y+h). */
let ST = 'classic', CTR = 0;
const line = (pts, arrow = true) => `<path d="M ${pts.map(p => p.join(' ')).join(' L ')}" fill="none" stroke="${INK}" stroke-width="1.4"${arrow ? ' marker-end="url(#af-arr)"' : ''}/>`;
const labg = (g, x, y, t, anchor = 'start') => { if (ST==='sysml'){ if (!g) return ''; t = '[' + (t==='oui' ? g.yes : g.no) + ']'; } return lab(x, y, t, anchor); };
const lab = (x, y, t, anchor = 'start') => `<text x="${x}" y="${y}" text-anchor="${anchor}" class="lab">${aesc(t)}</text>`;
const MR = 15;   // demi-taille des losanges SysML (décision et fusion : même taille)
const mR = () => ST==='sysml' ? MR : 0;
const mergeMark = (x, y) => ST==='sysml' ? `<path d="M ${x} ${y-MR} L ${x+MR} ${y} L ${x} ${y+MR} L ${x-MR} ${y} z" fill="#fff" stroke="${INK}" stroke-width="1.6"/>` : '';
// entrée d'une boucle : T = hauteur avant le losange de test, mc = centre du losange de fusion
const loopTop = () => ST==='sysml' ? {T: 2*MR + 40, mc: MR + 8} : {T: 20, mc: 10};
const loopIn = (cx, y, T, mc) => ST==='sysml' ? line([[cx, y], [cx, y+mc-MR]], false) + mergeMark(cx, y+mc) + line([[cx, y+mc+MR], [cx, y+T-1]]) : line([[cx, y], [cx, y+T]], false);

function boxFrag(kind, text){
  const lines = wrap(text, kind==='term' ? 32 : 24); const tw0 = Math.max(...lines.map(atw));
  let w = Math.max(110, tw0 + 30), h = Math.max(38, lines.length*16 + 18);
  if (kind==='io' && ST==='classic') w += 24;
  if (kind==='sub' && ST==='classic') w += 16;
  if (kind==='term' && ST==='classic'){ w = Math.max(90, tw0 * 1.18 + 44); h = Math.max(36, lines.length*16 + 16); }
  return {w, h, cx:w/2, exit:true, draw:(x, y) => {
    let s = '';
    if (ST==='classic'){
      if (kind==='term') s += `<ellipse cx="${x+w/2}" cy="${y+h/2}" rx="${w/2}" ry="${h/2}" fill="#fff" stroke="${INK}" stroke-width="1.6"/>`;
      else if (kind==='io') s += `<path d="M ${x+14} ${y} H ${x+w} L ${x+w-14} ${y+h} H ${x} z" fill="#fff" stroke="${INK}" stroke-width="1.6"/>`;
      else if (kind==='sub') s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fff" stroke="${INK}" stroke-width="1.6"/><line x1="${x+8}" y1="${y}" x2="${x+8}" y2="${y+h}" stroke="${INK}" stroke-width="1.4"/><line x1="${x+w-8}" y1="${y}" x2="${x+w-8}" y2="${y+h}" stroke="${INK}" stroke-width="1.4"/>`;
      else s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fff" stroke="${INK}" stroke-width="1.6"/>`;
    } else {
      s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="#fff" stroke="${INK}" stroke-width="1.6"/>`;
      if (kind==='sub') s += `<path d="M ${x+w-20} ${y+h-6} v -8 M ${x+w-20} ${y+h-10} h 10 M ${x+w-15} ${y+h-10} v 4 M ${x+w-10} ${y+h-10} v 4" fill="none" stroke="${INK}" stroke-width="1.2"/>`;
    }
    return s + txt(lines, x + w/2, y + h/2);
  }};
}
function startFrag(text){
  if (ST==='classic') return boxFrag('term', text || 'DÉBUT');
  const disc = {w:20, h:20, cx:10, exit:true, draw:(x, y) => `<circle cx="${x+10}" cy="${y+10}" r="10" fill="${INK}"/>`};
  return text ? seqFrag([disc, boxFrag('act', text)]) : disc;
}
function endFrag(){
  if (ST==='classic') return boxFrag('term', 'FIN');
  return {w:24, h:24, cx:12, exit:false, draw:(x, y) => `<circle cx="${x+12}" cy="${y+12}" r="11" fill="#fff" stroke="${INK}" stroke-width="1.6"/><circle cx="${x+12}" cy="${y+12}" r="6.5" fill="${INK}"/>`};
}
const EMPTY = {w:0, h:0, cx:0, exit:true, empty:true, draw:() => ''};
function seqFrag(list){
  list = list.filter(f => !f.empty); if (!list.length) return EMPTY;
  const L = Math.max(...list.map(f => f.cx)), R = Math.max(...list.map(f => f.w - f.cx));
  let h = 0; const ys = []; let exit = true;
  for (let i=0;i<list.length;i++){ ys.push(h); h += list[i].h; if (!list[i].exit){ exit = false; list = list.slice(0, i+1); break; } if (i < list.length-1) h += G; }
  return {w:L+R, h, cx:L, exit, draw:(x, y) => { let s = '';
    list.forEach((f, i) => { s += f.draw(x + L - f.cx, y + ys[i]);
      if (i < list.length-1) s += line([[x+L, y+ys[i]+f.h], [x+L, y+ys[i+1]-1]]); });
    return s; }};
}
// Losange : renvoie ses dimensions et sa fonction de dessin (centre cx, haut y)
function diamond(cond){
  if (ST==='sysml')   // SysML : losange vide, seules les gardes des chemins portent le test
    return {w:30, h:30, tw:0, draw:(cx, y) => `<path d="M ${cx} ${y} L ${cx+15} ${y+15} L ${cx} ${y+30} L ${cx-15} ${y+15} z" fill="#fff" stroke="${INK}" stroke-width="1.6"/>`};
  const t = cond + ' ?', lines = wrap(t, 18), tw0 = Math.max(...lines.map(atw));
  const w = Math.max(120, tw0 * 1.55 + 36), h = Math.max(60, lines.length*16*1.7 + 24);
  return {w, h, draw:(cx, y) => `<path d="M ${cx} ${y} L ${cx+w/2} ${y+h/2} L ${cx} ${y+h} L ${cx-w/2} ${y+h/2} z" fill="#fff" stroke="${INK}" stroke-width="1.6"/>` + txt(lines, cx, y + h/2)};
}
const gw = (g, k) => (ST==='sysml' && g) ? atw('[' + g[k] + ']') * 0.88 + 4 : 24;   // largeur d'une garde
const dLeft = D => D.w/2;
// si … alors
function ifFrag(cond, body, g){
  const D = diamond(cond), B = body;
  const L = Math.max(dLeft(D), B.cx), R = Math.max(D.w/2 + gw(g,'no') + 4, B.w - B.cx, gw(g,'yes') + 6) + 34;
  const yB = D.h + G, yJ = yB + B.h + (B.empty ? 0 : G/2) + 10 + mR(), h = yJ + G/2 + 6 + mR();
  return {w:L+R, h, cx:L, exit:true, draw:(x, y) => { const cx = x+L; let s = D.draw(cx, y);
    if (!B.empty){ s += line([[cx, y+D.h], [cx, y+yB-1]]) + labg(g, cx+6, y+D.h+14, 'oui') + B.draw(cx - B.cx, y+yB); if (B.exit) s += line([[cx, y+yB+B.h], [cx, y+yJ-mR()-(ST==='sysml'?1:0)]], ST==='sysml'); }
    else s += line([[cx, y+D.h], [cx, y+yJ-mR()-(ST==='sysml'?1:0)]], ST==='sysml') + labg(g, cx+6, y+D.h+14, 'oui');
    const xr = x + L + R - 6;
    s += line([[cx + D.w/2, y + D.h/2], [xr, y + D.h/2], [xr, y+yJ], [cx + 2 + mR(), y+yJ]]) + labg(g, cx + D.w/2 + 6, y + D.h/2 - 6, 'non');
    s += mergeMark(cx, y+yJ) + line([[cx, y+yJ + mR()], [cx, y+h]], false);
    return s; }};
}
// si … alors … sinon
function ifElseFrag(cond, A, B, g){
  const D = diamond(cond);
  const dxA = Math.max(D.w/2 + 16, D.w/2 + gw(g,'yes') + 14, (A.w - A.cx) + 18), dxB = Math.max(D.w/2 + 16, D.w/2 + gw(g,'no') + 14, B.cx + 18);
  const L = Math.max(dLeft(D), dxA + A.cx), R = Math.max(D.w/2, dxB + (B.w - B.cx));
  const yT = D.h/2 + G + 4, yJ = yT + Math.max(A.h, B.h) + G/2 + 6, h = yJ + G/2 + 6 + mR();
  return {w:L+R, h, cx:L, exit:A.exit || B.exit, draw:(x, y) => { const cx = x+L, xa = cx - dxA, xb = cx + dxB; let s = D.draw(cx, y);
    s += line([[cx - D.w/2, y + D.h/2], [xa, y + D.h/2], [xa, y + yT - 1]], !A.empty) + labg(g, cx - D.w/2 - 6, y + D.h/2 - 6, 'oui', 'end');
    s += line([[cx + D.w/2, y + D.h/2], [xb, y + D.h/2], [xb, y + yT - 1]], !B.empty) + labg(g, cx + D.w/2 + 6, y + D.h/2 - 6, 'non');
    if (!A.empty) s += A.draw(xa - A.cx, y + yT); if (!B.empty) s += B.draw(xb - B.cx, y + yT);
    if (A.exit) s += line([[xa, y + yT + A.h], [xa, y + yJ], [cx - 2 - mR(), y + yJ]]);
    if (B.exit) s += line([[xb, y + yT + B.h], [xb, y + yJ], [cx + 2 + mR(), y + yJ]]);
    s += mergeMark(cx, y+yJ) + line([[cx, y + yJ + mR()], [cx, y + h]], false);
    return s; }};
}
// boucle avec test en tête : bodyOn = 'oui' ou 'non' (la branche qui entre dans le corps)
function loopFrag(cond, body, bodyOn, g){
  const D = diamond(cond), B = body.empty ? {w:0, h:0, cx:0, exit:true, empty:true, draw:() => ''} : body;
  const {T, mc} = loopTop(), L = Math.max(dLeft(D), B.cx) + 26 + mR(), R = Math.max(D.w/2 + gw(g, bodyOn==='oui' ? 'no' : 'yes') + 4, B.w - B.cx, gw(g, bodyOn==='oui' ? 'yes' : 'no') + 6) + 34;
  const yB = T + D.h + G, yb = yB + B.h, h = yb + 14 + G + 6;
  return {w:L+R, h, cx:L, exit:true, draw:(x, y) => { const cx = x+L, xl = x + 8, xr = x + L + R - 6; let s = '';
    s += loopIn(cx, y, T, mc);
    s += D.draw(cx, y+T) + line([[cx, y+T+D.h], [cx, y+yB-1]], B.empty ? false : true) + labg(g, cx+6, y+T+D.h+14, bodyOn);
    s += B.draw(cx - B.cx, y+yB);
    s += line([[cx, y+yb], [cx, y+yb+14], [xl, y+yb+14], [xl, y + mc], [cx - 2 - mR(), y + mc]]);
    s += line([[cx + D.w/2, y+T+D.h/2], [xr, y+T+D.h/2], [xr, y+yb+14+G/2+4], [cx, y+yb+14+G/2+4], [cx, y+h]]) + labg(g, cx + D.w/2 + 6, y+T+D.h/2 - 6, bodyOn==='oui' ? 'non' : 'oui');
    return s; }};
}
// attendre jusqu'à : le losange reboucle sur lui-même
function waitFrag(cond, g){
  const D = diamond(cond), {T, mc} = loopTop(), L = Math.max(dLeft(D), D.w/2 + gw(g,'no') + 14) + 26, R = Math.max(D.w/2, gw(g,'yes') + 6) + 10, h = T + D.h + G;
  return {w:L+R, h, cx:L, exit:true, draw:(x, y) => { const cx = x+L, xl = x + 8; let s = loopIn(cx, y, T, mc) + D.draw(cx, y+T);
    s += line([[cx - D.w/2, y+T+D.h/2], [xl, y+T+D.h/2], [xl, y+mc], [cx - 2 - mR(), y+mc]]) + labg(g, cx - D.w/2 - 6, y+T+D.h/2 + 15, 'non', 'end');
    s += line([[cx, y+T+D.h], [cx, y+h]], false) + labg(g, cx+6, y+T+D.h+14, 'oui');
    return s; }};
}
// pour toujours : retour au début du corps, pas de sortie
function foreverFrag(body){
  const B = body.empty ? boxFrag('act', '(rien)') : body, {T, mc} = loopTop(), L = Math.max(B.cx, mR()) + 26, R = B.w - B.cx + 10, h = T + B.h + 18;
  return {w:L+R, h, cx:L, exit:false, draw:(x, y) => { const cx = x+L, xl = x + 8; let s = loopIn(cx, y, T, mc) + B.draw(cx - B.cx, y+T);
    s += line([[cx, y+T+B.h], [cx, y+T+B.h+12], [xl, y+T+B.h+12], [xl, y+mc], [cx - 2 - mR(), y+mc]]);
    return s; }};
}

/* ---------- Programme → fragments ---------- */
function listFrag(list, depth){
  const out = [];
  for (const b of list){ const f = blockFrag(b, depth); if (f) out.push(f); if (f && !f.exit) break; }
  return seqFrag(out);
}
const CNT = ['i','j','k','m','n'];
const NEG = {'>':'≤', '<':'≥', '=':'≠', '≥':'<', '≤':'>', '≠':'='};
function negCond(c){
  const m = c.match(/^(.*?) ?(>|<|=|≥|≤|≠) (.+)$/); if (m) return (m[1] ? m[1] + ' ' : '') + NEG[m[2]] + ' ' + m[3];
  if (/ pressé$/.test(c)) return c.replace(/ pressé$/, ' non pressé');
  if (/ détecte /.test(c)) return c.replace(/ détecte /, ' ne détecte pas ');
  if (/ n'est pas /.test(c)) return c.replace(/ n'est pas /, ' est ');
  if (/ est /.test(c)) return c.replace(/ est /, ' n\'est pas ');
  if (/^non /.test(c)) return c.slice(4);
  return 'non ' + c;
}
function condAuto(b){ return valText(b.in && b.in.k0).replace(/^\((.*)\)$/, '$1'); }
function condOf(b){ const t = condAuto(b); chkAlg(b, t); return b.alg || t; }
function negOf(b, c){ const x = b.in && b.in.k0; if (!b.alg && x && !x.alg && NEGTXT[x.type]) return NEGTXT[x.type](x); return negCond(c); }
function guards(b, c){ c = c || condOf(b); return {yes: b.gy || c, no: b.gn || negOf(b, c)}; }
function blockFrag(b, depth = 0){
  const d = DEF[b.type]; if (!d) return null;
  const cond = () => condOf(b), g = () => guards(b);
  switch (b.type){
    case 'si': return ifFrag(cond(), listFrag(b.body, depth), g());
    case 'sinon': return ifElseFrag(cond(), listFrag(b.body, depth), listFrag(b.body2, depth), g());
    case 'jusqua': return loopFrag(cond(), listFrag(b.body, depth+1), 'non', g());
    case 'tantque': return loopFrag(cond(), listFrag(b.body, depth+1), 'oui', g());
    case 'attJusqua': return waitFrag(cond(), g());
    case 'toujours': return foreverFrag(listFrag(b.body, depth+1));
    case 'repeter': { const v = CNT[depth % CNT.length], n = b.in && b.in.k0 ? valText(b.in.k0) : b.f.k0;
      return seqFrag([boxFrag('act', v + ' ← 0'), loopFrag(v + ' < ' + n, seqFrag([listFrag(b.body, depth+1), boxFrag('act', v + ' ← ' + v + ' + 1')]), 'oui', {yes:v + ' < ' + n, no:v + ' ≥ ' + n})]); }
    case 'compter': { const v = b.f.k0, a = b.in && b.in.k1 ? valText(b.in.k1) : b.f.k1, z = b.in && b.in.k2 ? valText(b.in.k2) : b.f.k2, p = b.in && b.in.k3 ? valText(b.in.k3) : b.f.k3;
      return seqFrag([boxFrag('act', v + ' ← ' + a), loopFrag(v + ' ≤ ' + z, seqFrag([listFrag(b.body, depth+1), boxFrag('act', v + ' ← ' + v + ' + ' + p)]), 'oui', {yes:v + ' ≤ ' + z, no:v + ' > ' + z})]); }
    case 'arret': return endFrag();
  }
  if (/^pcall_/.test(b.type)) return boxFrag(b.alg ? 'sub' : 'sub', blockText(b));
  if (d.sh==='hat') return null;
  if (d.sh==='rep' || d.sh==='bool') return boxFrag('act', valText(b));
  const io = ALG.io && (IO_CATS.has(d.cat) || IO_IDS.has(b.type));
  return boxFrag(io ? 'io' : 'act', blockText(b));
}
function scriptFrag(sc){
  const first = sc.list[0]; if (!first) return null;
  const hat = DEF[first.type] && DEF[first.type].sh==='hat';
  const start = hat ? startFrag(ST==='classic' ? (first.type==='demarre' && !first.alg ? 'DÉBUT' : 'DÉBUT : ' + hatText(first)) : (first.type==='demarre' && !first.alg ? '' : hatText(first))) : startFrag(ST==='classic' ? 'DÉBUT' : '');
  const body = listFrag(hat ? sc.list.slice(1) : sc.list, 0);
  const parts = [start, body]; if (body.exit) parts.push(endFrag());
  return seqFrag(parts);
}
/* ---------- Rendu SVG ---------- */
const ALG = {style:'classic', io:false, view:'chart'};
try { Object.assign(ALG, JSON.parse(localStorage.getItem('atelier-algo') || '{}')); } catch(_){}
function algoSVG(sc, pad = 16){
  ST = ALG.style; const F = scriptFrag(sc); if (!F) return null;
  const w = Math.ceil(F.w + 2*pad), h = Math.ceil(F.h + 2*pad);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" class="algo-svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><style>text{font:${AF};fill:${INK}} .lab{font-size:12px;font-style:italic} .cond{font-size:12px}</style><defs><marker id="af-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="${INK}"/></marker></defs><rect width="${w}" height="${h}" fill="#fff"/>${F.draw(pad, pad)}</svg>`;
  return {w, h, svg};
}

/* ---------- Algorithme (texte structuré) ---------- */
// lignes : [{lvl, parts:[[texte, gras]]}]
function algoLines(sc){
  const out = [], K = t => [t, true], T = t => [t, false];
  const L = (lvl, ...parts) => out.push({lvl, parts});
  const cnd = b => condOf(b);
  const gen = (list, lvl) => { for (const b of list){ if (!DEF[b.type]) continue;
    switch (b.type){
      case 'si': L(lvl, K('SI '), T(cnd(b)), K(' ALORS')); gen(b.body, lvl+1); L(lvl, K('FIN SI')); break;
      case 'sinon': L(lvl, K('SI '), T(cnd(b)), K(' ALORS')); gen(b.body, lvl+1); L(lvl, K('SINON')); gen(b.body2, lvl+1); L(lvl, K('FIN SI')); break;
      case 'repeter': L(lvl, K('RÉPÉTER '), T(fv(b,'k0')), K(' FOIS')); gen(b.body, lvl+1); L(lvl, K('FIN RÉPÉTER')); break;
      case 'compter': L(lvl, K('POUR '), T(b.f.k0), K(' DE '), T(fv(b,'k1')), K(' À '), T(fv(b,'k2')), K(' PAR PAS DE '), T(fv(b,'k3'))); gen(b.body, lvl+1); L(lvl, K('FIN POUR')); break;
      case 'jusqua': L(lvl, K('RÉPÉTER JUSQU\'À '), T(cnd(b))); gen(b.body, lvl+1); L(lvl, K('FIN RÉPÉTER')); break;
      case 'tantque': L(lvl, K('TANT QUE '), T(cnd(b)), K(' FAIRE')); gen(b.body, lvl+1); L(lvl, K('FIN TANT QUE')); break;
      case 'toujours': L(lvl, K('RÉPÉTER POUR TOUJOURS')); gen(b.body, lvl+1); L(lvl, K('FIN RÉPÉTER')); break;
      case 'attJusqua': L(lvl, K('ATTENDRE JUSQU\'À '), T(cnd(b))); break;
      case 'arret': L(lvl, K('ARRÊTER LE PROGRAMME')); break;
      default: if (DEF[b.type].sh!=='hat') L(lvl, T(blockText(b)));
    } } };
  const first = sc.list[0]; if (!first) return out;
  const hat = DEF[first.type] && DEF[first.type].sh==='hat';
  if (hat && !(first.type==='demarre' && !first.alg)) L(0, K('DÉBUT : '), T(hatText(first))); else L(0, K('DÉBUT'));
  gen(hat ? sc.list.slice(1) : sc.list, 1);
  const last = sc.list[sc.list.length-1];
  if (!(last && ['toujours','arret'].includes(last.type))) L(0, K('FIN'));
  return out;
}
const algoPlain = sc => algoLines(sc).map(l => '    '.repeat(l.lvl) + l.parts.map(p => p[0]).join('')).join('\n');
const algoHTML = sc => algoLines(sc).map(l => `<div class="al" style="padding-left:${l.lvl*2}em">${l.parts.map(p => p[1] ? '<b>' + aesc(p[0]) + '</b>' : aesc(p[0])).join('')}</div>`).join('');
