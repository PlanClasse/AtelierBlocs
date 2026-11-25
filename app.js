'use strict';
const APP_VERSION = 'v1.17.0';
const MAJ_FILES = ['./index.html', './app.js', './catalogue.js', './algo.js', './exo.js', './import.js', './accueil.js', './ui.js', './fiche.js', './erreur.js', './relier.js', './exos.js', './flux.html', './docx.iife.js', './manifest.json'], MAJ_VFILE = 'app.js', CACHE_PREFIX = 'atelier-blocs-';
/* ═══════════════ Atelier blocs mBlock · moteur ═══════════════ */
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const cv = document.createElement('canvas').getContext('2d');
const FONT = '600 12px "Helvetica Neue", Helvetica, Arial, sans-serif';
cv.font = FONT;
const tw = s => cv.measureText(String(s)).width;
const COLORS = ['#E3001B','#F5A623','#F8E71C','#7ED321','#50E3C2','#4A90E2','#9013FE','#FF5AC8','#FFFFFF','#000000'];

/* ---------- Analyse du catalogue ---------- */
const TOK = /\((n|s|e):([^)]*)\)|<b>|\[\$(v|l|m)\]|\[([^\]]*)\]|\{c:([^}]*)\}|\{c5\}|\{\$(v|l)\}|@|\{i:(\w+)\}/g;
function splitRows(txt){ const rows = []; let d = 0, cur = '';
  for (const ch of txt){ if (ch==='[') d++; if (ch===']') d--; if (ch==='|' && d===0){ rows.push(cur); cur=''; } else cur += ch; }
  rows.push(cur); return rows; }
function parseRow(txt, st){
  const parts = []; let last = 0, m; TOK.lastIndex = 0;
  const push = s => { s = s.trim(); if (s) parts.push(s); };
  while ((m = TOK.exec(txt))){
    push(txt.slice(last, m.index)); last = TOK.lastIndex;
    const k = 'k' + (st.n++);
    if (m[1]) parts.push({t: m[1]==='e' ? 'edit' : m[1], k, v:m[2]});
    else if (m[0]==='<b>') parts.push({t:'b', k});
    else if (m[3]) parts.push({t:{v:'var', l:'list', m:'msg'}[m[3]], k});
    else if (m[4] != null){ const pill = m[4][0]==='~', o = (pill ? m[4].slice(1) : m[4]).split('|'); parts.push({t:'dd', k, opts:o, v:o[0], pill}); }
    else if (m[5]) parts.push({t:'col', k, v:m[5]});
    else if (m[0]==='{c5}') parts.push({t:'c5', k});
    else if (m[6]) parts.push({t:'vname', k, kind:m[6]});
    else if (m[0]==='@'){ st.icon = true; st.n--; }
    else if (m[7]){ parts.push({t:'ico', v:m[7]}); st.n--; }
  }
  push(txt.slice(last));
  return parts;
}
const DEF = {};
for (const [id, cat, sh, txt] of BLOCKS){
  const st = {n:0, icon: !!CATS[cat].ic};
  const rows = (sh==='e' ? splitRows(txt) : [txt]).map(r => parseRow(r, st));
  DEF[id] = {id, cat, sh, rows, icon: st.icon, txt};
}
const isRep = id => ['rep','bool'].includes(DEF[id].sh);

/* ---------- État ---------- */
const S0 = () => ({scripts:[], doc:[], vars:[MODE==='scratch' ? 'ma variable' : 'Var1'], lists:[MODE==='scratch' ? 'ma liste' : 'List1'], msgs:['message1'], procs:[], uid:0, px:20, py:20, z:1.1});
let S = S0();
const KEY = MODE==='scratch' ? 'atelier-blocs-scratch-v1' : 'atelier-blocs-v1';   // un projet en cours par mode
try { const raw = localStorage.getItem(KEY); if (raw) Object.assign(S, JSON.parse(raw)); } catch(_){}
let selected = S.scripts.length ? S.scripts[S.scripts.length-1].id : null, BW = false, VIEW = 'prog';
const nid = () => 'b' + (++S.uid) + Math.random().toString(36).slice(2,5);
let saveT = null;
const save = () => { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch(_){} }, 300); };

/* ---------- Mes blocs : définitions créées par l'utilisateur ---------- */
const HIDE_PAL = new Set(['defBloc','appelBloc']);
const PT = {n:'nombre', s:'texte', b:'booléen', l:'libellé'};
function syncProcs(){
  for (const id of Object.keys(DEF)) if (/^p(def|call|arg)_/.test(id)) delete DEF[id];
  for (const pr of S.procs||[]){
    pr.params.forEach((p,i) => { if (!p.id) p.id = String(i); });
    DEF['pdef_'+pr.id] = {id:'pdef_'+pr.id, cat:'mes', sh:'hat', icon:false, txt:'définir '+pr.name+' '+pr.params.map(p=>p.name).join(' '),
      rows:[['définir', {t:'pname', v:pr.name}, ...pr.params.map(p => p.t==='l' ? p.name : {t:'pparam', pt:p.t, v:p.name})]]};
    DEF['pcall_'+pr.id] = {id:'pcall_'+pr.id, cat:'mes', sh:'stack', icon:false, txt:pr.name+' '+pr.params.filter(p=>p.t==='l').map(p=>p.name).join(' '),
      rows:[[pr.name, ...pr.params.map(p => p.t==='l' ? p.name : {t:p.t, k:'p_'+p.id, v:''})]]};
    pr.params.forEach(p => { if (p.t!=='l') DEF['parg_'+pr.id+'_'+p.id] = {id:'parg_'+pr.id+'_'+p.id, cat:'mes', sh:p.t==='b' ? 'bool' : 'rep', icon:false, txt:p.name, rows:[[p.name]]}; });
  }
}
const MISSING = {cat:'mes', sh:'stack', icon:false, txt:'bloc supprimé', rows:[['bloc supprimé']]};
function make(type, opt = {}){
  const d = DEF[type] || MISSING, b = {id:nid(), type, f:{}, in:{}};
  for (const row of d.rows) for (const p of row) if (typeof p==='object'){
    if (p.t==='var') b.f[p.k] = S.vars[0] || 'Var1';
    else if (p.t==='list') b.f[p.k] = S.lists[0] || 'List1';
    else if (p.t==='msg') b.f[p.k] = S.msgs[0] || 'message1';
    else if (p.t==='c5') b.f[p.k] = ['#E3001B','#F5A623','#F8E71C','#7ED321','#50E3C2'];
    else if (p.t==='vname') b.f[p.k] = opt.name || (p.kind==='l' ? S.lists[0] : S.vars[0]);
    else if (p.t!=='b') b.f[p.k] = p.v;
  }
  if (['c','capc'].includes(d.sh)) b.body = [];
  if (d.sh==='e'){ b.body = []; b.body2 = []; }
  return b;
}
function clone(b){ const c = JSON.parse(JSON.stringify(b)); const re = x => { x.id = nid(); Object.values(x.in||{}).forEach(re); (x.body||[]).forEach(re); (x.body2||[]).forEach(re); }; re(c); return c; }

/* ---------- Géométrie (Scratch 3 / mBlock 5) ---------- */
const HAT = 20, ARM = 16, BOT = 32, FH = 32;
const NOTCH = 'c 2,0 3,1 4,2 l 4,4 c 1,1 2,2 4,2 h 12 c 2,0 3,-1 4,-2 l 4,-4 c 1,-1 2,-2 4,-2';
const NOTCHR = 'c -2,0 -3,1 -4,2 l -4,4 c -1,1 -2,2 -4,2 h -12 c -2,0 -3,-1 -4,-2 l -4,-4 c -1,-1 -2,-2 -4,-2';
function blockPath(w, arms, mouths, hat, cap){
  let y = hat ? HAT : 0;
  let p = hat ? `M 0,${HAT} c 25,-22 71,-22 96,0 H ${w-4} a 4,4 0 0 1 4,4` : `M 0,4 A 4,4 0 0 1 4,0 H 12 ${NOTCH} H ${w-4} a 4,4 0 0 1 4,4`;
  for (let i=0;i<mouths.length;i++){
    y += arms[i]; p += ` V ${y-4} a 4,4 0 0 1 -4,4 H ${ARM+48} ${NOTCHR} H ${ARM+4} a 4,4 0 0 0 -4,4`;
    y += mouths[i]; p += ` V ${y-4} a 4,4 0 0 0 4,4 H ${ARM+12} ${NOTCH} H ${w-4} a 4,4 0 0 1 4,4`;
  }
  y += arms[arms.length-1];
  p += ` V ${y-4} a 4,4 0 0 1 -4,4 ` + (cap ? '' : `H 48 ${NOTCHR} `) + `H 4 a 4,4 0 0 1 -4,-4 z`;
  return p;
}
const repPath = (w,h) => { const r = h/2; return `M ${r},0 H ${w-r} A ${r},${r} 0 0 1 ${w-r},${h} H ${r} A ${r},${r} 0 0 1 ${r},0 z`; };
const boolPath = (w,h) => `M ${h/2},0 H ${w-h/2} L ${w},${h/2} L ${w-h/2},${h} H ${h/2} L 0,${h/2} z`;

/* ---------- Couleurs ---------- */
function colors(b, o){ const c = CATS[DEF[b.type].cat];
  if (BW && !o.forceColor || o.bw || b.bw) return {fill:'#fff', stroke:'#111', text:'#111', fld:'#fff', fldS:'#111', fldT:'#111', dark:'#fff', darkS:'#111', icon:'#111', slot:'#fff'};
  return {fill:c.c, stroke:c.d, text:'#fff', fld:'#fff', fldS:c.d, fldT:'#575E75', dark:c.d, darkS:c.d, icon:'#fff', slot:c.d}; }

/* ---------- Mesure ---------- */
function itemSize(p, b, o){
  if (typeof p==='string') return {w:tw(p), h:16};
  if (p.t==='trou') return trouSize(p, b, o);
  const ch = b.in && b.in[p.k];
  if ((p.t==='n' || p.t==='s' || p.t==='b') && ch && !o.noChildren){ const L = lay(ch, o); return {w:L.w, h:L.h, child:ch}; }
  if (p.t==='n' || p.t==='s'){ const v = o.blankV ? '' : String(b.f[p.k] ?? ''); return {w:Math.max(40, tw(v)+22), h:FH, v}; }
  if (p.t==='b') return {w:48, h:FH};
  if (p.t==='ico') return {w:p.v==='flag' ? 26 : 22, h:24};
  if (['dd','var','list','msg'].includes(p.t)){ const v = o.blankD ? '' : String(b.f[p.k] ?? ''); return {w:o.blankD ? 44 : tw(v) + (CATS[DEF[b.type].cat].ext || p.pill ? 32 : 34), h:FH, v}; }
  if (p.t==='col') return {w:40, h:24};
  if (p.t==='c5') return {w:5*30 + 8, h:28};
  if (p.t==='edit') return {w:tw(b.f[p.k]||' ') + (DEF[b.type].sh==='hat' ? 20 : 0), h:24, v:b.f[p.k]};
  if (p.t==='vname') return {w:tw(b.f[p.k]||''), h:16, v:b.f[p.k]};
  if (p.t==='pname') return {w:tw(p.v)+16, h:28, v:p.v};
  if (p.t==='pparam') return {w:tw(p.v) + (p.pt==='b' ? 30 : 22), h:28, v:p.v};
  return {w:0, h:0};
}
function lay(b, o){
  if (!DEF[b.type]) DEF[b.type] = {...MISSING, id:b.type};
  const d = DEF[b.type], sh = d.sh, rep = sh==='rep' || sh==='bool';
  const rows = d.rows.map((row0, ri) => {
    const exo = ri===0 && o.exo && aTrous(b), row = exo ? exoRow(row0, b) : row0;   // exercice : trous à la place de certaines parties
    let x = rep ? (sh==='bool' ? 14 : 10) : 8, mh = 16; const items = [];
    if (ri===0 && d.icon && !(exo && (b.tr.ligne || (b.tr.p || {}).nom))){ items.push({icon:true, x, w:26, h:16}); x += 26 + 8; }
    row.forEach((p, n) => { if (n || items.length) x += (typeof p==='string' && typeof row[n-1]==='string') ? 4 : 6;
      const s = itemSize(p, b, o); items.push({p, x, ...s}); x += s.w; mh = Math.max(mh, s.h); });
    const h = rep ? Math.max(40, mh + 8) : Math.max(48, mh + 16);
    return {items, w: x + (rep ? (sh==='bool' ? 14 : 10) : 10), h};
  });
  let w = Math.max(...rows.map(r => r.w));
  if (sh==='hat') w = Math.max(w, 110);
  if (['c','e','capc'].includes(sh)) w = Math.max(w, 150);
  if (sh==='stack' || sh==='cap') w = Math.max(w, 56);
  if (rep) w = Math.max(w, rows[0].h + 8);
  const L = {w, rows, sh};
  if (sh==='hat') L.h = HAT + rows[0].h;
  else if (sh==='c' || sh==='capc'){ L.m = [Math.max(24, listH(b.body, o))]; L.arms = [rows[0].h, BOT]; L.h = rows[0].h + L.m[0] + BOT; }
  else if (sh==='e'){ L.m = [Math.max(24, listH(b.body, o)), Math.max(24, listH(b.body2, o))]; L.arms = [rows[0].h, rows[1].h, BOT]; L.h = rows[0].h + L.m[0] + rows[1].h + L.m[1] + BOT; }
  else L.h = rows[0].h;
  return L;
}
const listH = (L, o) => (L||[]).reduce((a,b) => a + lay(b, o).h, 0);

/* ---------- Dessin ---------- */
const ICONS = {
  cyber: c => `<g fill="none" stroke="${c}" stroke-width="2"><rect x="1" y="1" width="24" height="12" rx="2"/></g><rect x="5" y="4.5" width="4" height="5" fill="${c}"/><rect x="17" y="4.5" width="4" height="5" fill="${c}"/>`,
  eye:   c => `<rect x="2" y="-1" width="22" height="16" rx="4" fill="none" stroke="${c}" stroke-width="2"/><circle cx="9" cy="7" r="3" fill="${c}"/><circle cx="17" cy="7" r="3" fill="${c}"/>`,
  quad:  c => `<rect x="1" y="1" width="24" height="12" rx="3" fill="none" stroke="${c}" stroke-width="2"/>${[6,11,16,21].map(x=>`<circle cx="${x-0.5}" cy="7" r="1.8" fill="${c}"/>`).join('')}`,
  mbot:  c => `<rect x="3" y="0" width="20" height="10" rx="3" fill="none" stroke="${c}" stroke-width="2"/><circle cx="8" cy="13" r="2.6" fill="${c}"/><circle cx="18" cy="13" r="2.6" fill="${c}"/><circle cx="10" cy="5" r="1.4" fill="${c}"/><circle cx="16" cy="5" r="1.4" fill="${c}"/>`,
  pen:   c => `<path d="M4 18 l2 -6 l11 -11 l4 4 l-11 11 z" fill="none" stroke="${c}" stroke-width="2" stroke-linejoin="round"/><path d="M4 18 l2 -6 l4 4 z" fill="${c}"/>`,
  plug:  c => `<rect x="3" y="2" width="20" height="11" rx="3" fill="none" stroke="${c}" stroke-width="2"/><rect x="8" y="-2" width="2.5" height="5" fill="${c}"/><rect x="15.5" y="-2" width="2.5" height="5" fill="${c}"/>`,
};
const TICONS = {   // icônes dans le texte des blocs Scratch (drapeau vert, flèches de rotation)
  flag: (c, bw) => `<path d="M4 3 v19" stroke="${bw ? '#111' : '#45993D'}" stroke-width="2.4" stroke-linecap="round"/><path d="M4.5 4 c5,-3 9,3 15,0 v10 c-6,3 -10,-3 -15,0 z" fill="${bw ? '#fff' : '#4CBF56'}" stroke="${bw ? '#111' : '#45993D'}" stroke-width="1.4" stroke-linejoin="round"/>`,
  cw:   (c) => `<path d="M6 17 a7 7 0 1 1 11 -3" fill="none" stroke="${c.icon}" stroke-width="2.6" stroke-linecap="round"/><path d="M13 12 l5 4 l2 -6 z" fill="${c.icon}"/>`,
  ccw:  (c) => `<path d="M16 17 a7 7 0 1 0 -11 -3" fill="none" stroke="${c.icon}" stroke-width="2.6" stroke-linecap="round"/><path d="M9 12 l-5 4 l-2 -6 z" fill="${c.icon}"/>`,
};
const ARROW = (x, y, c) => `<path transform="translate(${x},${y})" d="M 3,13 C 3,6 8,3 14,4 L 13,0 L 20,6 L 12,11 L 13,7 C 9,7 7,9 7,13 Z" fill="${c}"/>`;
function drawItems(b, row, top, rowH, x0, y0, col, o, kids){
  let s = ''; const cy = top + rowH/2; const ext = CATS[DEF[b.type].cat].ext;
  for (const it of row.items){
    if (it.icon){ s += `<g transform="translate(${it.x},${cy-7})">${ICONS[CATS[DEF[b.type].cat].ic || 'cyber'](col.icon)}</g>`; continue; }
    const p = it.p;
    if (p.t==='trou'){ s += trouSVG(it, p, cy, b, o); continue; }
    if (typeof p==='string'){ s += `<text x="${it.x}" y="${cy+4}" fill="${col.text}">${esc(p)}</text>`; continue; }
    if (p.t==='ico'){ s += `<g transform="translate(${it.x},${cy-12})">${(TICONS[p.v] || TICONS.flag)(col, col.icon!=='#fff')}</g>`; continue; }
    const live = o.live || o.pick ? ` data-k="${p.k}"` : '';
    if (it.child){ kids.push([it.child, x0 + it.x, y0 + cy - it.h/2]);
      if (o.snaps) o.snaps.push({kind:'in', b, k:p.k, bool:p.t==='b', x:x0+it.x, y:y0+cy}); continue; }
    if (o.snaps && (p.t==='n' || p.t==='s' || p.t==='b')) o.snaps.push({kind:'in', b, k:p.k, bool:p.t==='b', x:x0+it.x, y:y0+cy});
    if (p.t==='n' || p.t==='s') s += `<g class="fld"${live}><rect x="${it.x}" y="${cy-16}" width="${it.w}" height="32" rx="16" fill="${col.fld}" stroke="${col.fldS}"/><text x="${it.x+it.w/2}" y="${cy+4}" text-anchor="middle" fill="${col.fldT}">${esc(it.v)}</text></g>`;
    else if (p.t==='b') s += `<path d="${boolPath(48,32)}" transform="translate(${it.x},${cy-16})" fill="${col.slot}" stroke="${col.slot===col.fill?col.stroke:'none'}"/>`;
    else if (['dd','var','list','msg'].includes(p.t)){
      const arr = `<path d="M ${it.x+it.w-18},${cy-2} l 4.5,5.5 l 4.5,-5.5 z" fill="${col.text}"/>`;
      s += (ext || p.pill) ? `<g class="dd"${live}><rect x="${it.x}" y="${cy-14}" width="${it.w}" height="28" rx="14" fill="${col.dark}" stroke="${col.darkS}"/><text x="${it.x+10}" y="${cy+4}" fill="${col.text}">${esc(it.v)}</text>${arr}</g>`
               : `<g class="dd"${live}><rect x="${it.x}" y="${cy-16}" width="${it.w}" height="32" rx="4" fill="${col.fill}" stroke="${col.stroke}"/><text x="${it.x+10}" y="${cy+4}" fill="${col.text}">${esc(it.v)}</text>${arr}</g>`;
    }
    else if (p.t==='col'){ const v = o.blankD ? '#ffffff' : (b.f[p.k]||'#fff'); s += `<g class="dd"${live}><rect x="${it.x}" y="${cy-12}" width="40" height="24" rx="12" fill="${v}" stroke="${o.bw||b.bw||BW?'#111':'#fff'}" stroke-width="2"/></g>`; }
    else if (p.t==='c5'){ const vs = b.f[p.k] || []; s += `<g class="dd"${live}><rect x="${it.x}" y="${cy-14}" width="${it.w}" height="28" rx="6" fill="${col.fld}" fill-opacity=".35"/>` + vs.map((v,i)=>`<rect x="${it.x+4+i*30}" y="${cy-10}" width="28" height="20" rx="3" fill="${o.blankD?'#fff':v}" stroke="${o.bw||b.bw||BW?'#111':'none'}"/>`).join('') + '</g>'; }
    else if (p.t==='edit'){ const hat = DEF[b.type].sh==='hat';
      s += `<g class="ed"${live}>${hat ? `<rect x="${it.x}" y="${cy-14}" width="${it.w}" height="28" rx="4" fill="${col.dark}" stroke="${col.darkS}"/>` : ''}<text x="${it.x + (hat?10:0)}" y="${cy+4}" fill="${col.text}">${esc(it.v)}</text></g>`; }
    else if (p.t==='vname') s += `<text x="${it.x}" y="${cy+4}" fill="${col.text}">${esc(it.v)}</text>`;
    else if (p.t==='pname') s += `<rect x="${it.x}" y="${cy-14}" width="${it.w}" height="28" rx="4" fill="${col.dark}" stroke="${col.darkS}"/><text x="${it.x+8}" y="${cy+4}" fill="${col.text}">${esc(it.v)}</text>`;
    else if (p.t==='pparam') s += (p.pt==='b' ? `<path d="${boolPath(it.w,28)}" transform="translate(${it.x},${cy-14})" fill="${col.dark}" stroke="${col.darkS}"/>` : `<rect x="${it.x}" y="${cy-14}" width="${it.w}" height="28" rx="14" fill="${col.dark}" stroke="${col.darkS}"/>`) + `<text x="${it.x+it.w/2}" y="${cy+4}" text-anchor="middle" fill="${col.text}">${esc(it.v)}</text>`;
  }
  return s;
}
// renderBlock : ajoute le SVG du bloc (et de ses enfants) à o.svg ; renvoie la hauteur
function renderBlock(b, x, y, o){
  if (o.hide && o.hide.has(b.id)) return 0;
  const d = DEF[b.type], L = lay(b, o), col = colors(b, o), sh = d.sh;
  let path, kids = [], inner = '';
  if (sh==='rep') path = repPath(L.w, L.h);
  else if (sh==='bool') path = boolPath(L.w, L.h);
  else if (sh==='hat') path = blockPath(L.w, [L.rows[0].h], [], true, false);
  else if (sh==='c' || sh==='capc' || sh==='e') path = blockPath(L.w, L.arms, L.m, false, sh==='capc');
  else path = blockPath(L.w, [L.rows[0].h], [], false, sh==='cap');
  let top = sh==='hat' ? HAT : 0;
  inner += drawItems(b, L.rows[0], top, L.rows[0].h, x, y, col, o, kids);
  if (sh==='e') inner += drawItems(b, L.rows[1], L.rows[0].h + L.m[0], L.rows[1].h, x, y, col, o, kids);
  if (LOOP_IDS.has(b.type)) inner += ARROW(L.w - 28, L.h - BOT + 7, col.icon);
  const cls = o.live ? ` class="blk${o.sel && o.sel.has(b.id) ? ' sel' : ''}" data-bid="${b.id}"` : (o.pal ? ` class="blk pal" data-type="${b.type}"${b.f && DEF[b.type].rows[0].some(p=>p.t==='vname') ? ` data-name="${esc(Object.values(b.f)[0])}"` : ''}` : (o.pick ? ` class="pk" data-bid="${b.id}"` : ''));
  o.svg += `<g${cls} transform="translate(${x},${y})"><path d="${path}" fill="${col.fill}" stroke="${col.stroke}" stroke-width="1"/>${inner}</g>`;
  if (o.live && aTrous(b)) o.svg += `<g transform="translate(${x + L.w - 4},${y + 2})" style="pointer-events:none"><circle r="9" fill="#EA580C" stroke="#fff" stroke-width="1.5"/><text y="4" text-anchor="middle" fill="#fff" style="font-size:10px;font-weight:800">?</text></g>`;
  const bt = sh==='hat' ? 2 : 0;
  o.box.x1 = Math.min(o.box.x1, x); o.box.y1 = Math.min(o.box.y1, y + bt);
  o.box.x2 = Math.max(o.box.x2, x + L.w); o.box.y2 = Math.max(o.box.y2, y + L.h + (['rep','bool','cap','capc'].includes(sh) ? 0 : 8));
  for (const [ch, cx, cy] of kids) renderBlock(ch, cx, cy, o);
  if (sh==='c' || sh==='capc' || sh==='e'){
    const y1 = y + L.rows[0].h;
    if (o.snaps) o.snaps.push({kind:'inside', x:x+ARM, y:y1, list:b.body, i:0});
    renderList(b.body, x+ARM, y1, o);
    if (sh==='e'){ const y2 = y1 + L.m[0] + L.rows[1].h; if (o.snaps) o.snaps.push({kind:'inside', x:x+ARM, y:y2, list:b.body2, i:0}); renderList(b.body2, x+ARM, y2, o); }
  }
  if (o.errs){ const em = o.errs.get(b.id); if (em) errSVG(em, b, x, y, L, o); }
  return L.h;
}
function renderList(list, x, y, o){
  let cy = y;
  list.forEach((b, i) => { const h = renderBlock(b, x, cy, o);
    if (o.snaps && !['rep','bool','cap','capc'].includes(DEF[b.type].sh)) o.snaps.push({kind:'after', x, y:cy+h, list, i:i+1});
    cy += h; });
  return cy - y;
}
const newOut = (opt = {}) => ({svg:'', snaps:null, box:{x1:1e9, y1:1e9, x2:-1e9, y2:-1e9}, ...opt});
function svgDoc(o, pad = 4){
  const bx = o.box.x1 - pad, by = o.box.y1 - pad, bw = o.box.x2 - o.box.x1 + 2*pad, bh = o.box.y2 - o.box.y1 + 2*pad;
  return {w:bw, h:bh, svg:`<svg xmlns="http://www.w3.org/2000/svg" width="${bw}" height="${bh}" viewBox="${bx} ${by} ${bw} ${bh}"><style>text{font-family:"Helvetica Neue",Helvetica,Arial,sans-serif;font-weight:600;font-size:12px}</style>${o.svg}</svg>`};
}

/* ---------- Recherche dans le modèle ---------- */
function locate(id, lists = S.scripts.map(s => s.list)){
  for (const L of lists) for (let i=0;i<L.length;i++){ const r = find(L[i], id, {type:'list', list:L, i}); if (r) return r; }
  return null;
}
function find(b, id, here){
  if (b.id===id) return here;
  for (const [k, ch] of Object.entries(b.in||{})){ const r = find(ch, id, {type:'in', parent:b, k}); if (r) return r; }
  for (const key of ['body','body2']) if (b[key]) for (let i=0;i<b[key].length;i++){ const r = find(b[key][i], id, {type:'list', list:b[key], i}); if (r) return r; }
  return null;
}
const blockAt = ref => ref.type==='list' ? ref.list[ref.i] : ref.parent.in[ref.k];
function scriptOfBlock(id){ return S.scripts.find(s => locate(id, [s.list])); }
const cleanScripts = () => { S.scripts = S.scripts.filter(s => s.list.length); };

/* ═══════════════ Interface : palette ═══════════════ */
const ORDER = CAT_ORDER;
let palQ = '', openCats = new Set(JSON.parse(localStorage.getItem('atelier-open')||'["ev","ctrl","aff"]'));
function drawCats(){
  const el = $('#cats'); el.innerHTML = '';
  for (const c of ORDER){ const C = CATS[c]; const d = document.createElement('div'); d.className = 'cat'; d.innerHTML = `<i style="background:${C.c}"></i><span>${C.l}</span>`;
    d.dataset.c = c; d.onclick = () => openFly(c);
    el.append(d); }
  const q = document.createElement('div'); q.className = 'cat'; q.innerHTML = '<i class="srch">🔍</i><span>Chercher</span>'; q.onclick = () => { openFly(null); $('#palq').focus(); }; el.prepend(q);
}
let palCat = null;
function openFly(c){ if (document.body.classList.contains('fly-open') && palCat===c && c){ closeFly(); return; }
  palCat = c; palQ = ''; $('#palq').value = ''; document.body.classList.add('fly-open');
  document.querySelectorAll('.cat').forEach(x => x.classList.toggle('on', x.dataset.c===c)); drawPalette(); $('#palsecs').scrollTop = 0; }
function closeFly(){ document.body.classList.remove('fly-open'); document.querySelectorAll('.cat').forEach(x => x.classList.remove('on')); }
document.addEventListener('pointerdown', e => { if (document.body.classList.contains('fly-open') && !e.target.closest('#flyout,#cats,.menu,.ov')) closeFly(); }, true);
addEventListener('keydown', e => { if (e.key==='Escape') closeFly(); });
function palBlocks(c){
  const out = [];
  if (c==='mes') return (S.procs||[]).flatMap(pr => procBlocks(pr));
  for (const d of Object.values(DEF)) if (d.cat===c && !HIDE_PAL.has(d.id)){
    if (d.id==='var') S.vars.forEach(n => out.push(make('var', {name:n})));
    else if (d.id==='liste') S.lists.forEach(n => out.push(make('liste', {name:n})));
    else out.push(make(d.id));
  }
  return out;
}
const procBlocks = pr => [make('pdef_'+pr.id), make('pcall_'+pr.id), ...pr.params.filter(p => p.t!=='l').map(p => make('parg_'+pr.id+'_'+p.id))];
function palSvg(blocks, Z){
  const o = newOut({pal:true}); let y = 6;
  for (const b of blocks){ const L = lay(b, o); renderBlock(b, 0, y, o); y += L.h + (['rep','bool'].includes(DEF[b.type].sh) ? 10 : 14); }
  const wmax = Math.max(300, o.box.x2 + 6);
  return `<svg viewBox="-2 0 ${wmax} ${y}" style="width:${wmax*Z}px;height:${y*Z}px">${o.svg}</svg>`;
}
function procDialog(pr){
  const isNew = !pr; const f = pr ? JSON.parse(JSON.stringify(pr)) : {id:nid(), name:'', params:[]};
  dialog(`<p style="margin:0 0 8px;font-weight:600">${isNew ? 'Créer un bloc' : 'Modifier le bloc'}</p>
    <label class="muted">Nom du bloc</label><input class="pnm" style="width:100%;font:inherit;padding:8px;border:1px solid #CBD5E1;border-radius:8px;margin:4px 0 10px">
    <div class="muted">Paramètres (facultatif) : un nombre, un texte ou un booléen (vrai ou faux), autant que nécessaire. Un libellé ajoute du texte fixe entre les paramètres (par exemple « fois »).</div>
    <div class="plist" style="display:flex;flex-direction:column;gap:6px;margin:8px 0"></div>
    <div style="display:flex;gap:6px;flex-wrap:wrap"><button class="add" data-t="n">+ Nombre</button><button class="add" data-t="s">+ Texte</button><button class="add" data-t="b">+ Booléen</button><button class="add" data-t="l">+ Libellé</button></div>
    <div class="row"><button class="no">Annuler</button><button class="pri ok">${isNew ? 'Créer' : 'Enregistrer'}</button></div>`, (ov, close) => {
    const nm = ov.querySelector('.pnm'), pl = ov.querySelector('.plist'); nm.value = f.name; nm.focus();
    const drawP = () => { pl.innerHTML = ''; f.params.forEach((p, i) => { const r = document.createElement('div'); r.style.cssText = 'display:flex;gap:6px;align-items:center';
      r.innerHTML = `<span style="width:70px;font-size:12px;color:#64748B">${PT[p.t]}</span><input style="flex:1;font:inherit;padding:5px 8px;border:1px solid #CBD5E1;border-radius:6px"><button title="Monter">↑</button><button title="Retirer">✕</button>`;
      const [inp, up, del] = [r.querySelector('input'), ...r.querySelectorAll('button')]; inp.value = p.name; inp.oninput = () => p.name = inp.value;
      up.onclick = () => { if (i){ [f.params[i-1], f.params[i]] = [f.params[i], f.params[i-1]]; drawP(); } }; del.onclick = () => { f.params.splice(i, 1); drawP(); };
      pl.append(r); }); };
    drawP();
    ov.querySelectorAll('.add').forEach(bt => bt.onclick = () => { const t = bt.dataset.t; let n = 1; while (f.params.some(p => p.name===PT[t]+n)) n++;
      f.params.push({t, id:nid(), name: t==='l' ? 'texte' : PT[t]+n}); drawP(); const ins = pl.querySelectorAll('input'); const last = ins[ins.length-1]; if (last){ last.focus(); last.select(); } });
    ov.querySelector('.no').onclick = close;
    ov.querySelector('.ok').onclick = () => { f.name = nm.value.trim(); if (!f.name){ nm.focus(); return; } f.params.forEach((p,i) => { p.name = (p.name||'').trim() || PT[p.t]+(i+1); });
      if (isNew) S.procs.push(f); else { const old = S.procs.find(x => x.id===f.id); Object.assign(old, f); }
      syncProcs(); close(); openCats.add('mes'); draw(); };
  });
}
function procUsed(pr){ let n = 0; const re = new RegExp('^p(def|call|arg)_' + pr.id + '(_|$)'); S.scripts.forEach(s => walk(s.list, b => { if (re.test(b.type)) n++; })); return n; }
function drawPalette(){
  const fly = $("#palsecs"); fly.innerHTML = ""; const q = norm(palQ); const Z = S.z * 0.9;
  for (const c of ORDER){ const C = CATS[c];
    let blocks = palBlocks(c); if (q) blocks = blocks.filter(b => norm(DEF[b.type].txt.replace(TOK,' ') + ' ' + Object.values(b.f).join(' ')).includes(q));
    if (q && !blocks.length) continue;
    if (!q && palCat && c!==palCat) continue;
    const open = q || !palCat || openCats.has(c) || c===palCat;
    const sec = document.createElement('div'); sec.className = 'sec' + (open ? '' : ' closed'); sec.id = 'sec-'+c;
    const h2 = document.createElement('h2'); h2.innerHTML = `<i style="background:${C.c}"></i>${C.l}<span class="n">${blocks.length}</span><span class="ch">▾</span>`;
    h2.onclick = () => { if (openCats.has(c)) openCats.delete(c); else openCats.add(c); localStorage.setItem('atelier-open', JSON.stringify([...openCats])); drawPalette(); };
    sec.append(h2);
    if (open){
      if (c==='mes'){ const bt = document.createElement('button'); bt.className = 'mk'; bt.textContent = '+ Créer un bloc'; bt.onclick = () => procDialog(null); sec.append(bt);
        for (const pr of S.procs||[]){ const bl = procBlocks(pr).filter(b => !q || blocks.some(x => x.type===b.type)); if (!bl.length) continue;
          const hd = document.createElement('div'); hd.className = 'proch'; hd.innerHTML = `<b></b><button title="Modifier le nom ou les paramètres">✏</button><button title="Supprimer ce bloc">🗑</button>`;
          hd.querySelector('b').textContent = pr.name;
          hd.querySelectorAll('button')[0].onclick = () => procDialog(pr);
          hd.querySelectorAll('button')[1].onclick = () => { const n = procUsed(pr); if (n) return note('Ce bloc est utilisé ' + n + ' fois dans la zone de travail : retirez-le des programmes avant de le supprimer.');
            S.procs = S.procs.filter(x => x!==pr); syncProcs(); draw(); };
          sec.append(hd); sec.insertAdjacentHTML('beforeend', palSvg(bl, Z)); }
        if (!(S.procs||[]).length) sec.insertAdjacentHTML('beforeend', '<p class="muted" style="margin:6px 12px 10px">Créez un bloc : il apparaîtra ici avec son bloc « définir » et le bloc qui l\'appelle.</p>');
        fly.append(sec); continue; }
      if (c==='var' || c==='list'){ const bt = document.createElement('button'); bt.className = 'mk'; bt.textContent = c==='var' ? '+ Créer une variable' : '+ Créer une liste';
        bt.onclick = () => ask(c==='var' ? 'Nom de la nouvelle variable' : 'Nom de la nouvelle liste', '', v => { v = v.trim(); if (!v) return; const arr = c==='var' ? S.vars : S.lists; if (!arr.includes(v)) arr.push(v); save(); drawPalette(); });
        sec.append(bt); }
      const o = newOut({pal:true, forceColor:false}); let y = 6; const W = 300;
      for (const b of blocks){ const L = lay(b, o); renderBlock(b, 0, y + (DEF[b.type].sh==='hat' ? 0 : 0), o); y += L.h + (['rep','bool'].includes(DEF[b.type].sh) ? 10 : 14); }
      const wmax = Math.max(W, o.box.x2 + 6);
      sec.insertAdjacentHTML('beforeend', `<svg viewBox="-2 0 ${wmax} ${y}" style="width:${wmax*Z}px;height:${y*Z}px">${o.svg}</svg>`);
    }
    fly.append(sec);
  }
}
const norm = s => String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();

/* ═══════════════ Zone de travail ═══════════════ */
let SNAPS = [];
function drawWS(){
  const o = newOut({live:true, snaps:[]}); let sel = '';
  for (const s of S.scripts){
    const box0 = {...o.box}; o.box = {x1:1e9, y1:1e9, x2:-1e9, y2:-1e9};
    o.errs = s.orig ? errMarks(s) : null; renderList(s.list, s.x, s.y, o); o.errs = null;
    if (s.orig && s.list.length){ const r = errRef(s); o.svg += `<text x="${o.box.x1}" y="${o.box.y1 - 12}" style="fill:#B91C1C;font-size:13px;font-weight:700;pointer-events:none">🐞 Version avec erreurs${r ? ' de ' + esc(progLabel(r).replace(/ : .*/, '')) : ' (original supprimé)'}</text>`; }
    const f = s.list[0];
    if (f && !['hat','rep','bool'].includes(DEF[f.type].sh)) o.snaps.push({kind:'before', x:s.x, y:s.y, list:s.list, s});
    if (s.id===selected && s.list.length) sel = `<rect x="${o.box.x1-6}" y="${o.box.y1-6}" width="${o.box.x2-o.box.x1+12}" height="${o.box.y2-o.box.y1+6}" rx="10" fill="none" stroke="#4C97FF" stroke-width="2" stroke-dasharray="6 5" opacity=".75"/>`;
    s._box = o.box;
    o.box = {x1:Math.min(box0.x1, o.box.x1), y1:Math.min(box0.y1, o.box.y1), x2:Math.max(box0.x2, o.box.x2), y2:Math.max(box0.y2, o.box.y2)};
  }
  SNAPS = o.snaps;
  $('#wsv').innerHTML = `<g transform="scale(${S.z}) translate(${S.px},${S.py})">${sel}${o.svg}</g>`;
  $('#empty').style.display = S.scripts.length ? 'none' : '';
}
function draw(){ S.sel = selected; drawWS(); drawPalette(); drawAlgo(); save(); if (VIEW==='doc') drawDoc(); }
const toWorld = (cx, cy) => { const r = $('#ws').getBoundingClientRect(); return [(cx - r.left)/S.z - S.px, (cy - r.top)/S.z - S.py]; };

/* ---------- Glisser-déposer ---------- */
let D = null;
function startDrag(e, blocks, gx, gy, from){
  D = {blocks, gx, gy, from, moved:false, sx:e.clientX, sy:e.clientY, snap:null, x:0, y:0};
  addEventListener('pointermove', onMove); addEventListener('pointerup', onUp, {once:true});
}
function onMove(e){
  if (!D) return;
  if (!D.moved && Math.hypot(e.clientX-D.sx, e.clientY-D.sy) < 5) return;
  if (!D.moved){ D.moved = true; if (D.from.detach) D.from.detach(); cleanScripts(); drawWS(); closeMenus(); closeFly(); }
  const [wx, wy] = toWorld(e.clientX, e.clientY); D.x = wx - D.gx; D.y = wy - D.gy;
  const first = D.blocks[0], fsh = DEF[first.type].sh, last = D.blocks[D.blocks.length-1], o0 = {};
  const dh = listH(D.blocks, o0); let best = null, bd = 30;
  if (fsh==='rep' || fsh==='bool'){
    const fh = lay(first, o0).h;
    for (const s of SNAPS) if (s.kind==='in' && (!s.bool || fsh==='bool')){ const d = Math.hypot(s.x - D.x, s.y - (D.y + fh/2)); if (d < bd){ bd = d; best = s; } }
  } else {
    for (const s of SNAPS){
      if (s.kind==='in') continue;
      if (s.kind==='before'){ if (['cap','capc'].includes(DEF[last.type].sh)) continue; const d = Math.hypot(s.x - D.x, s.y - (D.y + dh)); if (d < bd){ bd = d; best = s; } continue; }
      if (fsh==='hat') continue;
      const d = Math.hypot(s.x - D.x, s.y - D.y); if (d < bd){ bd = d; best = s; }
    }
  }
  D.snap = best;
  const r = $('#ws').getBoundingClientRect(), Z = S.z, o = newOut(); renderList(D.blocks, 0, 0, o);
  let ghost = '';
  if (best){
    if (best.kind==='in') ghost = `<rect x="${r.left + (best.x + S.px)*Z - 3}" y="${r.top + (best.y + S.py)*Z - 19*Z}" width="${54*Z}" height="${38*Z}" rx="${19*Z}" fill="none" stroke="#fff" stroke-width="3" style="filter:drop-shadow(0 0 3px #4C97FF)"/>`;
    else { const gx = best.x, gy = best.kind==='before' ? best.y - dh : best.y; const g = newOut({bw:true}); renderList(D.blocks, 0, 0, g);
      ghost = `<g transform="translate(${r.left + (gx + S.px)*Z},${r.top + (gy + S.py)*Z}) scale(${Z})" opacity=".3">${g.svg}</g>`; }
  }
  $('#dsv').innerHTML = ghost + `<g transform="translate(${e.clientX - D.gx*Z},${e.clientY - D.gy*Z}) scale(${Z})" style="filter:drop-shadow(0 6px 8px rgba(0,0,0,.3))">${o.svg}</g>`;
}
function onUp(e){
  removeEventListener('pointermove', onMove);
  const d = D; D = null; $('#dsv').innerHTML = '';
  if (!d) return;
  if (!d.moved){ d.from.click && d.from.click(e); return; }
  const r = $('#ws').getBoundingClientRect();
  if (e.clientX < r.left || VIEW!=='prog'){ draw(); return; }      // relâché sur la palette : supprimé
  const s = d.snap;
  if (s && s.kind==='in'){ const old = s.b.in[s.k]; s.b.in[s.k] = d.blocks[0];
    if (old){ const ns = {id:nid(), x:s.x + 30, y:s.y + 30, list:[old]}; S.scripts.push(ns); }
    const sc = scriptOfBlock(s.b.id); if (sc) selected = sc.id; }
  else if (s && s.kind==='before'){ s.list.unshift(...d.blocks); s.s.y -= listH(d.blocks, {}); selected = s.s.id; }
  else if (s){ s.list.splice(s.i, 0, ...d.blocks); const sc = scriptOfBlock(d.blocks[0].id); if (sc) selected = sc.id; }
  else { const ns = {id:nid(), x:d.x, y:d.y, list:d.blocks}; S.scripts.push(ns); selected = ns.id; }
  draw();
}

// Zone de travail : prendre un bloc, modifier une valeur, déplacer la vue
$('#wsv').addEventListener('pointerdown', e => {
  if (e.button) return; closeMenus();
  const g = e.target.closest('[data-bid]');
  if (!g){ // déplacer la vue
    selected = null; S.sel = null; drawWS(); drawAlgo(); save();
    const sx = e.clientX, sy = e.clientY, px = S.px, py = S.py;
    const mv = ev => { S.px = px + (ev.clientX - sx)/S.z; S.py = py + (ev.clientY - sy)/S.z; drawWS(); };
    addEventListener('pointermove', mv); addEventListener('pointerup', () => { removeEventListener('pointermove', mv); save(); }, {once:true});
    return; }
  const id = g.dataset.bid, ref = locate(id); if (!ref) return;
  const fld = e.target.closest('[data-k]');
  const [wx, wy] = toWorld(e.clientX, e.clientY);
  const tr = g.getAttribute('transform').match(/translate\(([-\d.e]+),([-\d.e]+)\)/);
  const b = blockAt(ref), sc = scriptOfBlock(id);
  const blocks = ref.type==='list' ? ref.list.slice(ref.i) : [b];
  e.preventDefault();
  startDrag(e, blocks, wx - +tr[1], wy - +tr[2], {
    detach: () => { if (ref.type==='list') ref.list.splice(ref.i); else delete ref.parent.in[ref.k]; if (sc && sc.list===ref.list && ref.i===0){} },
    click: ev => { if (sc) selected = sc.id; S.sel = selected; drawWS(); drawAlgo(); save(); const f2 = fld && document.querySelector(`[data-bid="${id}"] [data-k="${fld.dataset.k}"]`); if (f2) editValue(b, f2.dataset.k, f2, ev); }
  });
});
$('#wsv').addEventListener('contextmenu', e => {
  e.preventDefault(); const g = e.target.closest('[data-bid]'); if (!g) return;
  const ref = locate(g.dataset.bid); if (!ref) return; const b = blockAt(ref), sc = scriptOfBlock(b.id);
  menu(e.clientX, e.clientY, [
    ['📋 Dupliquer', () => { const cp = (ref.type==='list' ? ref.list.slice(ref.i) : [b]).map(clone); const [wx, wy] = toWorld(e.clientX, e.clientY); S.scripts.push({id:nid(), x:wx+20, y:wy+20, list:cp}); draw(); }],
    [b.bw ? '🎨 Remettre ce bloc en couleur' : '◐ Ce bloc en noir et blanc', () => { b.bw = !b.bw; draw(); }],
    ['◐ Tout le programme en noir et blanc', () => { walk(sc.list, x => x.bw = true); draw(); }],
    ['🎨 Tout le programme en couleur', () => { walk(sc.list, x => delete x.bw); draw(); }],
    ...(/^p(def|call|arg)_/.test(b.type) ? [['✏ Modifier ce bloc (nom, libellés, paramètres)', () => { const pr = (S.procs||[]).find(x => b.type.split('_')[1]===x.id); if (pr) procDialog(pr); }]] : []),
    ...(COND_T.includes(b.type) ? [['✏ Textes du test (losange et chemins)…', () => guardDialog(b)]] : [['✏ Texte dans l\'algorigramme et l\'algorithme…', () => { const sh = DEF[b.type].sh, txtOf = () => sh==='hat' ? hatText(b) : (sh==='rep' || sh==='bool') ? valText(b) : blockText(b); const cur = b.alg || txtOf();
      ask('Formulation de ce bloc dans l\'algorigramme et l\'algorithme (vide : formulation automatique)', cur, v => { v = v.trim(); const auto = (() => { const a = b.alg; delete b.alg; const t = txtOf(); if (a) b.alg = a; return t; })();
        if (!v || v===auto){ delete b.alg; delete b.asrc; } else { b.alg = v; b.asrc = auto; } draw(); }); }]]),
    ['✏️ Trou d\'exercice…', () => { const k = e.target.closest('[data-k]'); trouDialog(b, k ? k.dataset.k : null); }],
    ['🎯 Faire une fiche sur ce programme…', () => ouvrirExpress(sc)],
    ['＋ Exercice sur ce programme…', () => ouvrirGalerie({sid:sc.id})],
    ['🐞 Version avec erreurs (« trouver l\'erreur »)', () => errAller(errCopie(sc), ERR_AIDE)],
    ['📄 Ajouter ce programme à la fiche', () => { addProgToDoc(sc.id); }],
    ['📷 Image de ce programme', () => { selected = sc.id; capture(); }],
    ['🗑 Supprimer ce bloc', () => { if (ref.type==='list') ref.list.splice(ref.i, 1); else delete ref.parent.in[ref.k]; cleanScripts(); draw(); }],
  ]);
});
function walk(list, fn){ for (const b of list){ fn(b); Object.values(b.in||{}).forEach(x => walk([x], fn)); if (b.body) walk(b.body, fn); if (b.body2) walk(b.body2, fn); } }
$('#ws').addEventListener('wheel', e => { e.preventDefault(); if (e.ctrlKey){ zoom(e.deltaY < 0 ? .1 : -.1); return; } S.px -= e.deltaX/S.z; S.py -= e.deltaY/S.z; drawWS(); save(); }, {passive:false});

// Palette : glisser une copie, ou cliquer pour l'ajouter au programme sélectionné
$('#palsecs').addEventListener('pointerdown', e => {
  const g = e.target.closest('.pal'); if (!g || e.button) return;
  const type = g.dataset.type, svg = g.ownerSVGElement, pr = svg.getBoundingClientRect(), Z = S.z * 0.9;
  const tr = g.getAttribute('transform').match(/translate\(([-\d.e]+),([-\d.e]+)\)/);
  const gx = (e.clientX - pr.left)/Z - 2 - +tr[1], gy = (e.clientY - pr.top)/Z - +tr[2];
  const b = make(type, {name:g.dataset.name}); e.preventDefault();
  startDrag(e, [b], gx, gy, {click: () => addBySelection(b)});
});
function addBySelection(b){
  const sc = S.scripts.find(s => s.id===selected), sh = DEF[b.type].sh;
  const last = sc && sc.list[sc.list.length-1];
  if (!sc || sh==='hat' || sh==='rep' || sh==='bool' || (last && ['cap','capc','rep','bool'].includes(DEF[last.type].sh))){
    const y = S.scripts.reduce((a,s) => Math.max(a, s.y + listH(s.list, {}) + 40), 30);
    const ns = {id:nid(), x:30, y, list:[b]}; S.scripts.push(ns); selected = ns.id;
    // faire défiler la vue jusqu'au nouveau programme
    const r = $('#ws').getBoundingClientRect(); if ((y + S.py)*S.z > r.height - 80) S.py = -y + 40;
  } else sc.list.push(b);
  closeFly(); draw();
}

/* ---------- Modifier une valeur ---------- */
function editValue(b, k, el, ev){
  const p = DEF[b.type].rows.flat().find(x => x.k===k); if (!p) return;
  const r = el.getBoundingClientRect();
  if (p.t==='n' || p.t==='s' || p.t==='edit'){
    const inp = document.createElement('input'); inp.className = 'edit'; inp.value = b.f[k] ?? '';
    Object.assign(inp.style, {left:r.left+'px', top:r.top+'px', width:Math.max(r.width, 60)+'px', height:Math.max(r.height, 28)+'px'});
    if (p.t==='n') inp.inputMode = 'decimal';
    let fin = false;
    const done = ok => { if (fin) return; fin = true; if (ok){ let v = inp.value; if (p.t==='n'){ v = v.trim().replace(',', '.'); if (v!=='' && v!=='-' && isNaN(+v)) v = b.f[k]; } b.f[k] = v; } inp.remove(); draw(); };
    inp.onkeydown = ev => { if (ev.key==='Enter') done(true); if (ev.key==='Escape') done(false); };
    inp.oninput = () => { inp.style.width = Math.max(r.width, tw(inp.value)*S.z + 34) + 'px'; };
    inp.onblur = () => done(true);
    document.body.append(inp); inp.focus(); inp.select(); return;
  }
  if (p.t==='dd' || p.t==='var' || p.t==='list' || p.t==='msg'){
    const opts = p.t==='dd' ? p.opts : p.t==='var' ? S.vars : p.t==='list' ? S.lists : S.msgs;
    const items = opts.map(v => [(v===b.f[k] ? '✓ ' : ' ') + v, () => { b.f[k] = v; draw(); }]);
    if (p.t==='msg') items.push(['+ Nouveau message', () => ask('Nom du nouveau message', '', v => { v = v.trim(); if (!v) return; if (!S.msgs.includes(v)) S.msgs.push(v); b.f[k] = v; draw(); })]);
    if (p.t==='var') items.push(['+ Nouvelle variable', () => ask('Nom de la nouvelle variable', '', v => { v = v.trim(); if (!v) return; if (!S.vars.includes(v)) S.vars.push(v); b.f[k] = v; draw(); })]);
    if (p.t==='list') items.push(['+ Nouvelle liste', () => ask('Nom de la nouvelle liste', '', v => { v = v.trim(); if (!v) return; if (!S.lists.includes(v)) S.lists.push(v); b.f[k] = v; draw(); })]);
    menu(r.left, r.bottom + 4, items); return;
  }
  if (p.t==='col' || p.t==='c5'){
    const target = p.t==='col' ? null : Math.max(0, Math.min(4, Math.floor((r.width && ev ? (ev.clientX - r.left)/r.width : 0) * 5)));
    const m = document.createElement('div'); m.className = 'menu colors'; Object.assign(m.style, {left:r.left+'px', top:(r.bottom+4)+'px'});
    COLORS.forEach(c => { const sw = document.createElement('button'); sw.style.background = c; sw.title = c; sw.onclick = () => { if (p.t==='col') b.f[k] = c; else { b.f[k] = [...b.f[k]]; b.f[k][target] = c; } closeMenus(); draw(); }; m.append(sw); });
    const inp = document.createElement('input'); inp.type = 'color'; inp.value = p.t==='col' ? b.f[k] : b.f[k][target]; inp.oninput = () => { if (p.t==='col') b.f[k] = inp.value; else { b.f[k] = [...b.f[k]]; b.f[k][target] = inp.value; } drawWS(); save(); }; m.append(inp);
    openMenu(m);
  }
}

/* ---------- Menus et boîtes ---------- */
function closeMenus(){ document.querySelectorAll('.menu').forEach(m => m.remove()); }
function openMenu(m){ closeMenus(); document.body.append(m);
  const r = m.getBoundingClientRect(); if (r.bottom > innerHeight) m.style.top = Math.max(4, innerHeight - r.height - 6) + 'px'; if (r.right > innerWidth) m.style.left = Math.max(4, innerWidth - r.width - 6) + 'px';
  setTimeout(() => document.addEventListener('pointerdown', function away(ev){ if (!m.contains(ev.target)){ m.remove(); document.removeEventListener('pointerdown', away, true); } }, true), 0); }
function menu(x, y, items){ const m = document.createElement('div'); m.className = 'menu'; Object.assign(m.style, {left:x+'px', top:y+'px'});
  for (const [l, fn] of items){ const d = document.createElement('div'); d.textContent = l; d.onclick = () => { closeMenus(); fn(); }; m.append(d); }
  openMenu(m); }
function dialog(html, onReady){ const ov = document.createElement('div'); ov.className = 'ov'; ov.innerHTML = `<div class="box">${html}</div>`; document.body.append(ov);
  const close = () => ov.remove(); ov.addEventListener('pointerdown', e => { if (e.target===ov) close(); }); onReady && onReady(ov, close); return close; }
function ask(title, val, fn){ dialog(`<p style="margin:0 0 8px;font-weight:600">${esc(title)}</p><input class="ask" style="width:100%;font:inherit;padding:8px;border:1px solid #CBD5E1;border-radius:8px"><div class="row"><button class="no">Annuler</button><button class="pri ok">OK</button></div>`, (ov, close) => {
  const i = ov.querySelector('input'); i.value = val; i.focus(); const ok = () => { close(); fn(i.value); };
  ov.querySelector('.ok').onclick = ok; ov.querySelector('.no').onclick = close; i.onkeydown = e => { if (e.key==='Enter') ok(); if (e.key==='Escape') close(); }; }); }
const COND_T = ['si','sinon','jusqua','tantque','attJusqua'];
function guardDialog(b){
  const autoC = () => condAuto(b);
  const c0 = condOf(b), g0 = guards(b, c0);
  const fld = (k, l, v, hint) => `<label style="display:block;margin:8px 0 2px;font-weight:600">${l}</label><input data-k="${k}" style="width:100%;font:inherit;padding:7px;border:1px solid #CBD5E1;border-radius:8px" value="${esc(v)}">${hint ? `<div class="muted" style="font-size:12px">${hint}</div>` : ''}`;
  dialog(`<p style="margin:0 0 4px;font-weight:700">Textes du test</p><div class="muted" style="font-size:12px">Laisser vide pour revenir au texte automatique.</div>`
    + fld('c', 'Test (losange, algorithme)', c0)
    + fld('y', 'Chemin quand le test est vrai (SysML)', g0.yes, 'Affiché entre crochets : [' + esc(g0.yes) + ']')
    + fld('n', 'Chemin quand le test est faux (SysML)', g0.no, 'Proposé automatiquement : le contraire du test')
    + `<div class="row"><button class="no">Annuler</button><button class="pri ok">OK</button></div>`, (ov, close) => {
    const I = k => ov.querySelector(`[data-k="${k}"]`);
    I('c').addEventListener('input', () => { const c = I('c').value.trim(); if (!b.gy) I('y').value = c; if (!b.gn) I('n').value = c===autoC() ? negOf(b, c) : negCond(c); });
    const ok = () => { const c = I('c').value.trim(), y = I('y').value.trim(), n = I('n').value.trim(); close();
      const ac = autoC(); delete b.asrc; if (!c || c===ac) delete b.alg; else b.alg = c;
      const cc = condOf(b); if (!y || y===cc) delete b.gy; else b.gy = y; if (!n || n===negOf(b, cc)) delete b.gn; else b.gn = n;
      if (b.alg || b.gy || b.gn) b.asrc = ac; else delete b.asrc; draw(); };
    ov.querySelector('.ok').onclick = ok; ov.querySelector('.no').onclick = close;
    ov.querySelectorAll('input').forEach(i => i.onkeydown = e => { if (e.key==='Enter') ok(); if (e.key==='Escape') close(); }); I('c').focus(); });
}
function note(msg){ dialog(`<p style="margin:0 0 12px">${esc(msg)}</p><div class="row"><button class="pri ok">OK</button></div>`, (ov, close) => ov.querySelector('.ok').onclick = close); }

/* ---------- Images (PNG) ---------- */
function toPNG(doc, K = 3){ return new Promise((ok, ko) => { const img = new Image();
  img.onload = () => { const c = document.createElement('canvas'); c.width = Math.ceil(doc.w*K); c.height = Math.ceil(doc.h*K); const x = c.getContext('2d'); x.scale(K, K); x.drawImage(img, 0, 0); c.toBlob(b => b ? ok(b) : ko(new Error('png')), 'image/png'); };
  img.onerror = ko; img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(doc.svg); }); }
async function capture(){
  const sc = S.scripts.find(s => s.id===selected) ; const list = sc ? [sc] : S.scripts; if (!list.length) return note('Aucun programme à capturer.');
  const o = newOut(); list.forEach(s => renderList(s.list, s.x, s.y, o)); const doc = svgDoc(o); const blob = await toPNG(doc, 4); const url = URL.createObjectURL(blob);
  dialog(`<b>Image ${sc ? 'du programme sélectionné' : 'de tous les programmes'}</b> <span class="muted">(${BW ? 'noir et blanc' : 'couleur'} · clic droit sur l'image : copier ou enregistrer)</span><img class="cap" src="${url}" style="width:${Math.min(doc.w*1.3, 860)}px"><div class="row"><button class="cp">📋 Copier l'image</button><button class="dl">⬇ Enregistrer en PNG</button><button class="pri ok">Fermer</button></div>`, (ov, close) => {
    ov.querySelector('.ok').onclick = close;
    ov.querySelector('.dl').onclick = () => saveFile('programme.png', blob);
    ov.querySelector('.cp').onclick = async ev => { try { await navigator.clipboard.write([new ClipboardItem({'image/png': blob})]); ev.target.textContent = '✓ Copiée'; } catch(_){ ev.target.textContent = 'Copie impossible ici'; } };
  });
}

/* ---------- Fichiers ---------- */
let DLNS;
async function saveFile(name, data){
  if (window.claude && window.claude.use){ try { if (DLNS===undefined) DLNS = await window.claude.use('downloads'); } catch(_){ DLNS = null; }
    if (DLNS){ try { await DLNS.save({filename:name, data}); return; } catch(e){ if (e && e.code==='declined') return; } } }
  const a = document.createElement('a'); a.href = URL.createObjectURL(data instanceof Blob ? data : new Blob([data])); a.download = name; document.body.append(a); a.click(); setTimeout(() => a.remove(), 100);
}

/* ═══════════════ Fiche (texte + programmes) ═══════════════ */
function addProgToDoc(sid){ S.doc.push({id:nid(), t:'prog', sid, mode:'assemble', shuffle:true, seed:Math.floor(Math.random()*1e6), blankV:false, blankD:false, bw:false, scale:1, hide:[]}); save(); setView('doc'); }
function rng(seed){ return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function explode(list){ const out = [];
  const strip = b => { const c = {id:b.id, type:b.type, f:{...b.f}, in:{}}; if (b.bw) c.bw = true; if (b.tr) c.tr = b.tr; if (b.body) c.body = []; if (b.body2) c.body2 = []; return c; };
  const rec = b => { out.push(strip(b)); Object.values(b.in||{}).forEach(rec); (b.body||[]).forEach(rec); (b.body2||[]).forEach(rec); };
  list.forEach(rec); return out; }
function instrOf(it, sc){ let ins = explode(sc.list); if (it.shuffle){ const r = rng(seedOf(it)); for (let i=ins.length-1;i>0;i--){ const j = Math.floor(r()*(i+1)); [ins[i], ins[j]] = [ins[j], ins[i]]; } } return ins; }
const progLabel = sc => { const f = sc.list[0]; if (!f) return 'Programme vide'; const n = S.scripts.indexOf(sc) + 1; return 'Programme ' + n + ' : ' + (DEF[f.type].sh==='hat' ? hatText(f) : blockText(f)).slice(0, 50) + (sc.list.length > 1 ? ' (+' + (explode(sc.list).length - 1) + ')' : '') + (sc.orig ? ' 🐞' : ''); };
const PXK = 0.62;  // taille des images dans le document (1 = taille écran)
function itemImages(it){ // [{doc, id}] pour l'aperçu et l'export
  const sc = S.scripts.find(s => s.id===it.sid); if (!sc) return null;
  const opt = {bw:it.bw, blankV:it.blankV, blankD:it.blankD, forceColor:true, errs: CORR && errOn(it, sc) ? errMarks(sc) : null, pick:it.mode==='assemble' || it.mode==='line' || it.mode==='lines', exo: it.trous!==false && progATrous(sc) ? exoCtx(sc, it) : null};
  if (it.mode==='assemble'){ const o = newOut(opt); renderList(sc.list, 0, 0, o); return [{doc:svgDoc(o, 2)}]; }
  if (it.mode==='grille'){ const d = grilleSVG(it, sc); return d.err ? [] : [{doc:d, grille:true, raw:true}]; }
  if (it.mode==='cadre'){ if (!CORR) return [{doc:cadreDoc(it, sc), raw:true}]; const o = newOut(opt); renderList(sc.list, 0, 0, o); return [{doc:svgDoc(o, 2)}]; }
  if (it.mode==='algo'){ const st = ALG.style; if (it.algoStyle) ALG.style = it.algoStyle; let d; try { d = avecTrousAlgo(sc, it, () => algoSVG(sc, 6)); } finally { ALG.style = st; } return d ? [{doc:d, algo:true}] : []; }
  return instrOf(it, sc).map(b => { const o = newOut(opt); renderBlock(b, 0, 0, o); return {doc:svgDoc(o, 2), id:b.id}; });
}
// cases à numéroter devant les instructions mises à plat (activées par défaut)
const numOn = it => aPlat(it) && ordreDe(it)==='cases';
const CASE_DOC = {w:26, h:26, svg:'<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26"><rect x="1.5" y="1.5" width="23" height="23" fill="#fff" stroke="#111" stroke-width="2"/></svg>'};
function drawDoc(){
  const page = $('#page'); page.innerHTML = '';
  if (!S.doc.length) page.innerHTML = '<p class="muted" style="text-align:center;margin-top:40px">La fiche est vide. Cliquez sur « ＋ Exercice » pour choisir un exercice, ou ajoutez un texte ou un programme libre.<br>Astuce : clic droit sur un programme de la zone de travail → « Ajouter ce programme à la fiche ».</p>';
  S.doc.forEach((it, i) => {
    const box = document.createElement('div'); box.className = 'item it-' + it.t;
    if (!it.id) it.id = nid(); box.dataset.id = it.id; if (it.id===SEL_IT) box.classList.add('sel'); box.addEventListener('pointerdown', () => ficheSel(it.id));
    const tools = document.createElement('div'); tools.className = 'itools';
    const btn = (l, t, fn) => { const b = document.createElement('button'); b.textContent = l; b.title = t; b.onclick = fn; tools.append(b); return b; };
    btn('↑', 'Monter', () => { if (i){ [S.doc[i-1], S.doc[i]] = [S.doc[i], S.doc[i-1]]; save(); drawDoc(); } });
    btn('↓', 'Descendre', () => { if (i < S.doc.length-1){ [S.doc[i+1], S.doc[i]] = [S.doc[i], S.doc[i+1]]; save(); drawDoc(); } });
    btn('✕', 'Retirer de la fiche', () => { S.doc.splice(i, 1); save(); drawDoc(); });
    if (it.t==='text'){
      const ed = document.createElement('div'); ed.className = 'txt'; ed.contentEditable = 'true'; ed.innerHTML = it.html || ''; ed.dataset.ph = 'Écrivez ici la consigne, une question…';
      ed.oninput = () => { it.html = ed.innerHTML; save(); };
      ['B','I','U'].forEach((c, n) => { const b = document.createElement('button'); b.innerHTML = ['<b>G</b>','<i>I</i>','<u>S</u>'][n]; b.title = ['Gras (Ctrl+B)','Italique (Ctrl+I)','Souligné (Ctrl+U)'][n]; b.onmousedown = e => e.preventDefault(); b.onclick = () => { ed.focus(); document.execCommand(['bold','italic','underline'][n]); it.html = ed.innerHTML; save(); }; tools.prepend(b); });
      box.append(tools, ed);
    } else if (it.t==='break'){ box.append(tools); box.insertAdjacentHTML('beforeend', '<div class="pbreak">Saut de page</div>'); }
    else if (it.t==='prog') ficheProg(it, i, box, tools);
    page.append(box);
  });
  fichePanel(); drawPlan();
}
function setView(v){ VIEW = v; document.body.dataset.view = v; document.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t.dataset.v===v)); if (v==='doc') drawDoc(); else drawWS(); }

/* ---------- Export .docx ---------- */
function htmlRuns(html){ // → paragraphes [[{text,b,i,u}]]
  const box = document.createElement('div'); box.innerHTML = html || ''; const paras = [[]];
  const walkN = (n, st) => { for (const c of n.childNodes){
    if (c.nodeType===3){ if (c.textContent) paras[paras.length-1].push({text:c.textContent, ...st}); continue; }
    const tag = c.tagName; const s2 = {...st, b: st.b || tag==='B' || tag==='STRONG', i: st.i || tag==='I' || tag==='EM', u: st.u || tag==='U'};
    if (tag==='BR'){ paras.push([]); continue; }
    const block = tag==='DIV' || tag==='P';
    if (block && paras[paras.length-1].length) paras.push([]);
    walkN(c, s2);
    if (block) paras.push([]); } };
  walkN(box, {}); while (paras.length > 1 && !paras[paras.length-1].length) paras.pop(); return paras; }
async function exportDocx(){
  if (!window.docx) return note('La bibliothèque de création .docx n\'a pas pu être chargée (connexion ?).');
  const {Document, Packer, Paragraph, TextRun, ImageRun, PageBreak} = window.docx;
  const btn = $('#bDocx'); btn.disabled = true; btn.textContent = '⏳ Création…';
  try {
    const children = [], caseData = new Uint8Array(await (await toPNG(CASE_DOC, 3)).arrayBuffer());
    for (const it of S.doc){
      if (it.t==='text'){ for (const runs of htmlRuns(it.html)) children.push(new Paragraph({spacing:{after:80}, children: runs.map(r => new TextRun({text:r.text, bold:r.b, italics:r.i, underline:r.u ? {} : undefined}))})); }
      else if (it.t==='break') children.push(new Paragraph({children:[new PageBreak()]}));
      else if (it.t==='prog') await exportProg(it, children);
    }
    if (!children.length) children.push(new Paragraph({children:[]}));
    const docu = new Document({creator:'Atelier blocs', styles:{default:{document:{run:{font:'Aptos', size:24}}}},
      sections:[{properties:{page:{size:{width:11906, height:16838}, margin:{top:567, right:567, bottom:567, left:567}}}, children}]});
    const blob = await Packer.toBlob(docu);
    await saveFile(ficheNomFichier(), blob);
  } catch(e){ console.error(e); note('Erreur pendant la création du document : ' + e.message); }
  btn.disabled = false; btn.textContent = '⬇ Exporter en .docx';
}

/* ═══════════════ Algorigramme (à côté des blocs, ou dans une autre fenêtre) ═══════════════ */
const curScript = () => S.scripts.find(s => s.id===(selected || S.sel)) || S.scripts[0];
function drawAlgo(){
  const on = document.body.classList.contains('algo-on') || document.body.classList.contains('algo-only'); if (!on) return;
  const sc = curScript(), v = $('#algov');
  $('#algoName').textContent = sc ? progLabel(sc) : '';
  $('#aStyle').value = ALG.style; document.querySelectorAll('.atab').forEach(t => t.classList.toggle('on', t.dataset.v===ALG.view));
  $('#aStyle').style.display = ALG.view==='chart' ? '' : 'none'; $('#aCopy').style.display = ALG.view==='text' ? '' : 'none'; $('#aImg').style.display = ALG.view==='chart' ? '' : 'none';
  if (!sc){ v.innerHTML = '<p class="muted" style="padding:20px">Construisez un programme : son ' + (ALG.view==='text' ? 'algorithme' : 'algorigramme') + ' s\'affichera ici.</p>'; return; }
  if (ALG.view==='text'){ v.innerHTML = `<div class="algotxt" style="font-size:${15*(S.az||1)}px">${algoHTML(sc)}</div>`; return; }
  const d = algoSVG(sc); v.innerHTML = d ? d.svg.replace('<svg ', `<svg style="width:${d.w * (S.az||1)}px;height:${d.h * (S.az||1)}px" `) : '';
}
function setAlgo(on){ document.body.classList.toggle('algo-on', on); S.showAlgo = on; $('#bAlgo').classList.toggle('on', on); save(); drawAlgo(); drawWS(); }
const saveAlg = () => { try { localStorage.setItem('atelier-algo', JSON.stringify(ALG)); } catch(_){} };
$('#bAlgo').onclick = () => setAlgo(!document.body.classList.contains('algo-on'));
$('#aStyle').onchange = e => { ALG.style = e.target.value; saveAlg(); drawAlgo(); };
document.querySelectorAll('.atab').forEach(t => t.onclick = () => { ALG.view = t.dataset.v; saveAlg(); drawAlgo(); });
$('#aCopy').onclick = async e => { const sc = curScript(); if (!sc) return; try { await navigator.clipboard.writeText(algoPlain(sc)); e.target.textContent = '✓ Copié'; } catch(_){ e.target.textContent = 'Copie impossible'; } setTimeout(() => e.target.textContent = '📋 Copier', 1500); };
function settings(){
  dialog(`<p style="margin:0 0 10px;font-weight:600">⚙ Paramètres</p>
    <div class="set"><b>Algorigramme</b>
      <label><input type="radio" name="st" value="classic"> Classique (ellipse, rectangle, losange)</label>
      <label><input type="radio" name="st" value="sysml"> SysML simplifié (diagramme d'activité)</label></div>
    <div class="set"><b>Instructions d'entrée et de sortie</b> <span class="muted">(afficher, envoyer un message) dans l'algorigramme classique</span>
      <label><input type="radio" name="io" value="0"> Toutes les instructions en rectangle</label>
      <label><input type="radio" name="io" value="1"> Entrées / sorties en parallélogramme</label></div>
    <div class="row"><button class="pri ok">Fermer</button></div>`, (ov, close) => {
    ov.querySelector(`input[name=st][value=${ALG.style}]`).checked = true; ov.querySelector(`input[name=io][value="${ALG.io ? 1 : 0}"]`).checked = true;
    ov.querySelectorAll('input[name=st]').forEach(r => r.onchange = () => { ALG.style = r.value; saveAlg(); drawAlgo(); if (VIEW==='doc') drawDoc(); });
    ov.querySelectorAll('input[name=io]').forEach(r => r.onchange = () => { ALG.io = r.value==='1'; saveAlg(); drawAlgo(); if (VIEW==='doc') drawDoc(); });
    ov.querySelector('.ok').onclick = close; });
}
$('#bSet').onclick = settings;
$('#aZm').onclick = () => { S.az = Math.max(.4, (S.az||1) - .1); save(); drawAlgo(); };
$('#aZp').onclick = () => { S.az = Math.min(2.5, (S.az||1) + .1); save(); drawAlgo(); };
$('#aImg').onclick = async () => { const sc = curScript(); if (!sc) return; const d = algoSVG(sc); const blob = await toPNG(d, 3); const url = URL.createObjectURL(blob);
  dialog(`<b>Image de l'algorigramme</b> <span class="muted">(clic droit sur l'image : copier ou enregistrer)</span><img class="cap" src="${url}" style="width:${Math.min(d.w, 860)}px"><div class="row"><button class="cp">📋 Copier l'image</button><button class="dl">⬇ Enregistrer en PNG</button><button class="pri ok">Fermer</button></div>`, (ov, close) => {
    ov.querySelector('.ok').onclick = close; ov.querySelector('.dl').onclick = () => saveFile('algorigramme.png', blob);
    ov.querySelector('.cp').onclick = async ev => { try { await navigator.clipboard.write([new ClipboardItem({'image/png': blob})]); ev.target.textContent = '✓ Copiée'; } catch(_){ ev.target.textContent = 'Copie impossible ici'; } }; }); };
$('#aDoc').onclick = () => { const sc = curScript(); if (!sc) return; S.doc.push({id:nid(), t:'prog', sid:sc.id, mode: ALG.view==='text' ? 'algotext' : 'algo', algoStyle:ALG.style, scale:1, hide:[]}); save(); setView('doc'); };
$('#aWin').onclick = () => { const w = window.open(location.pathname + '#algo', 'atelier-algo', 'width=900,height=900'); if (!w) note('La fenêtre n\'a pas pu s\'ouvrir (fenêtres bloquées ?). Vous pouvez aussi ouvrir cette adresse dans un autre onglet : ' + location.href.split('#')[0] + '#algo'); };
// Fenêtre « algorigramme seul » : suit les changements faits dans la fenêtre principale
if (location.hash==='#algo'){
  document.body.classList.add('algo-only');
  addEventListener('storage', e => { if (e.key===KEY && e.newValue){ try { const o = JSON.parse(e.newValue); S = Object.assign(S, o); selected = S.sel; syncProcs(); drawAlgo(); } catch(_){} } if (e.key==='atelier-algo'){ try { Object.assign(ALG, JSON.parse(e.newValue)); drawAlgo(); } catch(_){} } });
}

/* ═══════════════ Barre d'outils ═══════════════ */
function zoom(dz){ S.z = Math.max(.5, Math.min(2, +(S.z + dz).toFixed(2))); draw(); }
$('#bBW').onclick = e => { BW = !BW; e.currentTarget.classList.toggle('on', BW); draw(); };
$('#bZp').onclick = () => zoom(.1); $('#bZm').onclick = () => zoom(-.1);
$('#bCap').onclick = capture;
$('#bClr').onclick = () => dialog('<p style="margin:0 0 12px">Vider la zone de travail ? Tous les programmes seront supprimés (la fiche est gardée). Pour tout recommencer, utilisez plutôt Fichier › Nouveau projet.</p><div class="row"><button class="no">Annuler</button><button class="danger ok">Effacer</button></div>', (ov, close) => { ov.querySelector('.no').onclick = close; ov.querySelector('.ok').onclick = () => { close(); S.scripts = []; selected = null; draw(); }; });
$('#bRange').onclick = () => { let y = 30; S.scripts.forEach(s => { s.x = 30; s.y = y; y += listH(s.list, {}) + 40; }); S.px = 20; S.py = 20; draw(); };
$('#palq').oninput = e => { palQ = e.target.value; drawPalette(); };
document.querySelectorAll('.tab').forEach(t => t.onclick = () => setView(t.dataset.v));
$('#aText').onclick = () => { S.doc.push({id:nid(), t:'text', html:''}); save(); drawDoc(); const eds = document.querySelectorAll('.txt'); eds[eds.length-1].focus(); };
$('#aBreak').onclick = () => { S.doc.push({id:nid(), t:'break'}); save(); drawDoc(); };
$('#aProg').onclick = e => { const r = e.currentTarget.getBoundingClientRect();
  if (!S.scripts.length) return note('Aucun programme dans la zone de travail : construisez-en un d\'abord (onglet Programmes).');
  menu(r.left, r.bottom + 4, S.scripts.map(s => [progLabel(s), () => addProgToDoc(s.id)])); };
$('#bDocx').onclick = exportDocx;
$('#bSave').onclick = () => { S.mode = MODE; saveFile(MODE==='scratch' ? 'atelier-scratch.json' : 'atelier-blocs.json', new Blob([JSON.stringify(S, null, 1)], {type:'application/json'})); };
$('#fOpen').onchange = e => { const f = e.target.files[0]; if (!f) return; const rd = new FileReader();
  rd.onload = () => { try { const o = JSON.parse(rd.result); if (!o.scripts) throw new Error('format'); const om = o.mode==='scratch' ? 'scratch' : 'mblock';
    if (om!==MODE){ localStorage.setItem(om==='scratch' ? 'atelier-blocs-scratch-v1' : 'atelier-blocs-v1', JSON.stringify(o)); setMode(om); return; }
    S = Object.assign(S0(), o); migrer(); syncProcs(); selected = null; draw(); note('Projet ouvert.'); } catch(_){ note('Ce fichier n\'est pas un projet de l\'atelier.'); } };
  rd.readAsText(f); e.target.value = ''; };
addEventListener('keydown', e => { if ((e.key==='Delete' || e.key==='Backspace') && VIEW==='prog' && selected && !/INPUT|TEXTAREA/.test(document.activeElement.tagName) && !document.activeElement.isContentEditable){
  dialog('<p style="margin:0 0 12px">Supprimer le programme sélectionné ?</p><div class="row"><button class="no">Annuler</button><button class="danger ok">Supprimer</button></div>', (ov, close) => { ov.querySelector('.no').onclick = close; ov.querySelector('.ok').onclick = () => { close(); S.scripts = S.scripts.filter(s => s.id!==selected); selected = null; draw(); }; }); } });

/* ---------- Démarrage ---------- */
if (!S.scripts.length && !localStorage.getItem(KEY)){
  const sc = MODE==='scratch', a = make(sc ? 'drapeau' : 'boutonA'), r = make('repeter'), t = make(sc ? 'direP' : 'aff'), w = make(sc ? 'avancerPas' : 'attendre'); r.f.k0 = '3'; t.f.k0 = 'Bonjour'; r.body.push(t, w);
  S.scripts.push({id:nid(), x:30, y:30, list:[a, r]}); selected = S.scripts[0].id;
}
// anciens projets : capteur quad RGB sans le menu « ligne » (ajouté en v1.6.3), « fond » devenu « arrière-plan »
function migrer(){ for (const sc of S.scripts) walk(sc.list, b => {
  if ((b.type==='statutEst' || b.type==='etatL1R1') && b.f && /^\(\d+\) [01]+$/.test(b.f.k1||'') && b.f.k2===undefined){ b.f.k2 = b.f.k1; b.f.k1 = 'ligne'; }
  if (b.type==='sonde' && b.f && b.f.k2==='fond') b.f.k2 = 'arrière-plan';
  if (b.type==='bandeLED' && b.f && typeof b.f.k1==='string') b.f.k1 = Array(5).fill(b.f.k1); }); }
migrer(); syncProcs(); drawCats(); setView('prog'); if (S.showAlgo!==false && location.hash!=='#algo') setAlgo(true); draw(); if (location.hash==='#algo'){ selected = S.sel; drawAlgo(); }
$('#ver').textContent = APP_VERSION;
function setMode(m){ try { clearTimeout(saveT); localStorage.setItem(KEY, JSON.stringify(S)); localStorage.setItem('atelier-mode', m); } catch(_){} location.reload(); }
$('#mode').value = MODE; $('#mode').onchange = e => setMode(e.target.value);
document.body.dataset.mode = MODE; $('#palq').placeholder = MODE==='scratch' ? 'Chercher un bloc : avancer, dire, costume…' : 'Chercher un bloc : avancer, LED, distance…';
addEventListener('storage', e => { if (e.key==='atelier-mode' && e.newValue && e.newValue!==MODE) location.reload(); });
$('#ver').onclick = async () => { const v = await majVerifier(); note(v===null ? 'Vérification possible seulement sur le site en ligne, avec une connexion.' : v ? 'Version ' + v + ' disponible : utilisez « Mettre à jour » dans le bandeau.' : 'Vous avez la dernière version (' + APP_VERSION + ').'); };

/* ═══════ Nouvelle version en ligne ? (contrôle à chaque ouverture, comme PlanClasse) ═══════
   Lit la version dans l'en-tête de sw.js sur le site ; si elle est plus récente que APP_VERSION,
   bandeau « Mettre à jour » : téléchargement forcé des fichiers, caches remplacés, rechargement. */
const majCmp = (a, b) => { const p = x => String(x||'').replace(/^v/i,'').split('.').map(n => parseInt(n,10)||0); const A = p(a), B = p(b);
  for (let i=0;i<3;i++){ const x = A[i]||0, y = B[i]||0; if (x!==y) return x<y ? -1 : 1; } return 0; };
async function majVerifier(){
  try { if (location.protocol!=='https:' || navigator.onLine===false) return null;
    const r = await fetch('sw.js?maj=' + Date.now(), {cache:'no-store'}); if (!r || !r.ok) return null;
    const m = (await r.text()).match(/\(V(\d+)\.(\d+)\.(\d+)\)/); const v = m ? 'v'+m[1]+'.'+m[2]+'.'+m[3] : '';
    if (v && majCmp(APP_VERSION, v) < 0){ majBandeau(v); return v; }
    return '';
  } catch(e){ return null; }
}
function majBandeau(v){
  let b = document.getElementById('maj-bandeau'); if (b) b.remove();
  b = document.createElement('div'); b.id = 'maj-bandeau'; b.className = 'maj-bandeau'; b.setAttribute('role','status');
  const tx = document.createElement('span'); tx.textContent = '🆕 Nouvelle version ' + v + ' disponible (vous avez ' + APP_VERSION + ')';
  const ok = document.createElement('button'); ok.className = 'maj-ok'; ok.textContent = 'Mettre à jour';
  const later = document.createElement('button'); later.className = 'maj-plt'; later.textContent = 'Plus tard'; later.title = 'Le bandeau reviendra à la prochaine ouverture';
  ok.onclick = () => majAppliquer(v, tx, ok, later); later.onclick = () => b.remove();
  b.append(tx, ok, later); document.body.append(b);
}
async function majAppliquer(v, tx, ok, later){
  ok.disabled = true; later.style.display = 'none'; tx.textContent = '⏳ Téléchargement de la version ' + v + '…';
  try {
    const base = new URL('./', location.href.split('#')[0]).href, got = [];
    for (const f of MAJ_FILES){ const u = new URL(f, base).href;
      const r = await fetch(u + (u.includes('?') ? '&' : '?') + 'maj=' + Date.now(), {cache:'no-store'}); if (!r.ok) throw new Error('HTTP ' + r.status);
      got.push([u, await r.arrayBuffer(), r.headers.get('content-type') || '']); }
    const vf = got.find(g => g[0].endsWith(MAJ_VFILE)); const txt = vf ? new TextDecoder().decode(vf[1]) : '';
    if (!txt.includes("const APP_VERSION = '" + v + "'")){ tx.textContent = 'La version ' + v + ' n\'est pas encore servie par le site : réessayez dans quelques minutes.'; ok.disabled = false; later.style.display = ''; return; }
    tx.textContent = '⏳ Installation…';
    if (window.caches){ for (const k of await caches.keys()) await caches.delete(k);
      for (const name of [CACHE_PREFIX + APP_VERSION.replace(/\./g,'-'), CACHE_PREFIX + v.replace(/\./g,'-')]){ const c = await caches.open(name);
        for (const [u, buf, type] of got){ const rep = new Response(buf.slice(0), {status:200, headers:{'Content-Type':type}}); await c.put(u, rep); if (u===base + 'index.html') await c.put(base, new Response(buf.slice(0), {status:200, headers:{'Content-Type':type}})); } } }
    try { const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration(); if (reg) await reg.update(); } catch(_){}
    tx.textContent = '⏳ Redémarrage…'; location.reload();
  } catch(e){ tx.textContent = 'Mise à jour impossible pour l\'instant (réseau ?). Fermez et rouvrez l\'application.'; ok.disabled = false; later.style.display = ''; }
}
setTimeout(majVerifier, 3000);

