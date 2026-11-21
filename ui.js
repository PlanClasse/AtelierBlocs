'use strict';
/* ═══════════════ Atelier blocs · barre de menu, nouveau projet, récents, disposition en largeur, ajout groupé à la fiche (v1.11.0) ═══════════════ */
(() => {
  const $$ = s => document.querySelector(s);
  const quand = d => new Date(d).toLocaleString('fr-FR', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'}).replace(',', ' à');

  /* ---------- Fichiers récents (10), gardés dans le navigateur (IndexedDB) ---------- */
  const DB = 'atelier-blocs', ST = 'recents';
  const ouvrirDB = () => new Promise((ok, ko) => { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => r.result.createObjectStore(ST, {keyPath:'id'}); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); });
  async function tx(mode, fn){ const db = await ouvrirDB(); return new Promise((ok, ko) => { const t = db.transaction(ST, mode), st = t.objectStore(ST); const r = fn(st); t.oncomplete = () => ok(r && r.result); t.onerror = () => ko(t.error); }); }
  const lister = async () => { try { return ((await tx('readonly', st => st.getAll())) || []).sort((a, b) => b.date - a.date); } catch(_){ return []; } };
  async function retenir(nom, type, etat, mode){
    try {
      const data = etat || JSON.stringify(Object.assign({}, S, {mode:MODE})); const m = mode || MODE;
      const tous = await lister(), meme = tous.filter(r => r.nom===nom && r.mode===m);
      await tx('readwrite', st => { meme.forEach(r => st.delete(r.id)); st.put({id:Date.now() + '-' + Math.random().toString(36).slice(2, 7), nom, type, mode:m, date:Date.now(), data}); });
      const reste = (await lister()).slice(10); if (reste.length) await tx('readwrite', st => reste.forEach(r => st.delete(r.id)));
    } catch(_){} }
  window.atelierRetenir = retenir;
  const vide = () => !S.scripts.length && !S.doc.length;
  async function rouvrir(r){
    const go = async () => {
      if (!vide()) await retenir('Projet en cours (' + quand(Date.now()) + ')', 'Gardé avant ouverture');
      if (r.mode!==MODE){ try { localStorage.setItem(r.mode==='scratch' ? 'atelier-blocs-scratch-v1' : 'atelier-blocs-v1', r.data); } catch(_){} setMode(r.mode); return; }
      const o = JSON.parse(r.data); Object.keys(S).forEach(k => delete S[k]); Object.assign(S, S0(), o); delete S.mode;
      migrer(); syncProcs(); selected = S.scripts.length ? S.scripts[0].id : null; drawCats(); setView('prog'); draw(); note('« ' + r.nom + ' » est rouvert.'); };
    if (vide()) return go();
    dialog(`<p style="margin:0 0 12px">Rouvrir « ${esc(r.nom)} » ? Le projet en cours sera remplacé ; il reste disponible dans les récents.</p><div class="row"><button class="no">Annuler</button><button class="pri ok">Rouvrir</button></div>`,
      (ov, close) => { ov.querySelector('.no').onclick = close; ov.querySelector('.ok').onclick = () => { close(); go(); }; }); }

  /* ---------- Nouveau projet ---------- */
  function nouveau(){
    const go = async () => { if (!vide()) await retenir('Projet en cours (' + quand(Date.now()) + ')', 'Gardé avant nouveau projet');
      const z = S.z; Object.keys(S).forEach(k => delete S[k]); Object.assign(S, S0(), {z}); selected = null; syncProcs(); drawCats(); setView('prog'); draw(); };
    if (vide()) return go();
    dialog(`<p style="margin:0 0 6px;font-weight:600">Commencer un nouveau projet ?</p><p style="margin:0 0 12px">Les programmes, la fiche, mes blocs et les variables seront vidés. Le projet actuel reste disponible dans <b>Fichier › Récents</b>.</p>
      <div class="row"><button class="no">Annuler</button><button class="sv">💾 Enregistrer d'abord</button><button class="pri ok">Nouveau projet</button></div>`, (ov, close) => {
      ov.querySelector('.no').onclick = close; ov.querySelector('.ok').onclick = () => { close(); go(); };
      ov.querySelector('.sv').onclick = () => { close(); $$('#bSave').click(); setTimeout(go, 400); }; }); }

  /* ---------- Menu Fichier ---------- */
  async function menuFichier(ev){
    const r = ev.currentTarget.getBoundingClientRect(), m = document.createElement('div'); m.className = 'menu fmenu'; Object.assign(m.style, {left:r.left + 'px', top:(r.bottom + 4) + 'px'});
    const item = (ic, l, kb, fn) => { const d = document.createElement('div'); d.className = 'mi'; d.innerHTML = `<span class="ic">${ic}</span><span>${esc(l)}</span>${kb ? `<span class="kb">${kb}</span>` : ''}`; d.onclick = () => { closeMenus(); fn(); }; m.append(d); };
    const sep = () => { const d = document.createElement('div'); d.className = 'msep'; m.append(d); };
    const tete = t => { const d = document.createElement('div'); d.className = 'mh'; d.textContent = t; m.append(d); };
    item('📄', 'Nouveau projet', '', nouveau);
    item('📂', 'Ouvrir un projet…', 'Ctrl+O', () => $$('#fOpen').click());
    item('💾', 'Enregistrer', 'Ctrl+S', () => $$('#bSave').click());
    sep();
    item('📥', 'Importer depuis Scratch ou mBlock…', '', () => $$('#fImport').click());
    item('📤', 'Exporter vers ' + (MODE==='scratch' ? 'Scratch (.sb3)…' : 'mBlock (.mblock)…'), '', () => window.atelierExporter && window.atelierExporter());
    sep(); tete('Récents');
    const rec = await lister();
    if (!rec.length){ const d = document.createElement('div'); d.className = 'mh'; d.style.fontWeight = '400'; d.textContent = 'Aucun fichier pour l\'instant.'; m.append(d); }
    rec.forEach(x => { const d = document.createElement('div'); d.className = 'mi rec';
      d.innerHTML = `<span class="ic">${x.mode==='scratch' ? '🐱' : '🤖'}</span><span>${esc(x.nom)}<small>${esc(x.type)} · ${quand(x.date)} · ${x.mode==='scratch' ? 'Scratch' : 'mBlock'}</small></span>`;
      d.onclick = () => { closeMenus(); rouvrir(x); }; m.append(d); });
    if (rec.length){ sep(); item('🧹', 'Effacer la liste des récents', '', async () => { try { await tx('readwrite', st => st.clear()); } catch(_){} }); }
    openMenu(m); }
  $$('#bFile').onclick = menuFichier;
  addEventListener('keydown', e => { if (!(e.ctrlKey || e.metaKey) || e.altKey) return; const k = e.key.toLowerCase();
    if (k==='s'){ e.preventDefault(); $$('#bSave').click(); } else if (k==='o'){ e.preventDefault(); $$('#fOpen').click(); } });

  // ce qui alimente les récents : ouvrir, enregistrer, importer, exporter
  $$('#fOpen').addEventListener('change', e => { const f = e.target.files[0]; if (!f) return; const rd = new FileReader();
    rd.onload = () => { try { const o = JSON.parse(rd.result); if (o.scripts) retenir(f.name.replace(/\.json$/i, ''), 'Ouvert', rd.result, o.mode==='scratch' ? 'scratch' : 'mblock'); } catch(_){} }; rd.readAsText(f); });
  $$('#bSave').addEventListener('click', () => retenir(MODE==='scratch' ? 'atelier-scratch' : 'atelier-blocs', 'Enregistré'));
  window.atelierApresImport = nom => retenir(nom.replace(/\.(sb3|mblock)$/i, ''), 'Importé');
  window.atelierApresExport = nom => retenir(nom.replace(/\.(sb3|mblock)$/i, ''), 'Exporté');

  /* ---------- Langage : boutons à la place de la liste ---------- */
  document.querySelectorAll('[data-m]').forEach(b => { b.classList.toggle('on', b.dataset.m===MODE); b.onclick = () => { if (b.dataset.m!==MODE) setMode(b.dataset.m); }; });

  /* ---------- Zoom affiché ---------- */
  const zv = $$('#zoomv'), majZoom = () => { if (zv) zv.textContent = Math.round(S.z * 100) + ' %'; };
  if (zv) zv.onclick = () => { S.z = 1; draw(); };
  const draw0 = draw; draw = function(){ draw0.apply(this, arguments); majZoom(); }; majZoom();

  /* ---------- Disposer en largeur (la disposition en colonne reste « En colonne ») ---------- */
  function largeur(){ // rangement « en ligne d'horizon » : chaque programme se pose le plus haut possible, de gauche à droite
    if (!S.scripts.length) return; drawWS();
    const C = 10, gap = 36, W = Math.max(300, $$('#ws').clientWidth / S.z - 50), n = Math.max(1, Math.floor((W - 30) / C)), ciel = new Array(n).fill(30);
    for (const s of S.scripts){ const b = s._box || {x1:s.x, y1:s.y, x2:s.x + 200, y2:s.y + listH(s.list, {})}, w = Math.min(n, Math.ceil((b.x2 - b.x1 + gap) / C)), h = b.y2 - b.y1;
      let best = 0, by = Infinity;
      for (let i = 0; i + w <= n; i++){ let y = 0; for (let k = i; k < i + w; k++) if (ciel[k] > y) y = ciel[k]; if (y < by - 1){ by = y; best = i; } }
      s.x = 30 + best * C + (s.x - b.x1); s.y = by + (s.y - b.y1);
      for (let k = best; k < best + w; k++) ciel[k] = by + h + gap; }
    S.px = 20; S.py = 20; draw(); }
  $$('#bWide').onclick = largeur;

  /* ---------- Fiche : ajouter plusieurs programmes d'un coup ---------- */
  $$('#aProg').onclick = () => {
    if (!S.scripts.length) return note('Aucun programme dans la zone de travail : construisez-en un d\'abord (onglet Programmes).');
    dialog(`<p style="margin:0 0 6px;font-weight:600">Ajouter des programmes à la fiche</p>
      <div style="display:flex;gap:6px;margin:0 0 8px"><button class="tt">Tout cocher</button><button class="rien">Tout décocher</button></div>
      <div class="plist" style="display:flex;flex-direction:column;gap:5px;max-height:44vh;overflow:auto;border:1px solid #E2E8F0;border-radius:8px;padding:8px"></div>
      <div style="display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center;margin-top:12px">
        <label>Présentation <select class="pm" style="font:inherit;padding:4px 6px;border-radius:6px;border:1px solid #CBD5E1"><option value="assemble">Programme assemblé</option><option value="line">Instructions mises à plat : une ligne</option><option value="lines">Instructions mises à plat : une par ligne</option><option value="algo">Algorigramme</option><option value="algotext">Algorithme (texte)</option></select></label>
        <label style="display:flex;gap:5px;align-items:center"><input type="checkbox" class="pbw"> Noir et blanc</label>
        <label style="display:flex;gap:5px;align-items:center"><input type="checkbox" class="psh" checked> Mélanger (instructions à plat)</label>
      </div>
      <div class="row"><button class="no">Annuler</button><button class="pri ok">Ajouter</button></div>`, (ov, close) => {
      const pl = ov.querySelector('.plist');
      S.scripts.forEach(s => { const l = document.createElement('label'); l.style.cssText = 'display:flex;gap:8px;align-items:center;cursor:pointer;font-size:13px';
        l.innerHTML = `<input type="checkbox" checked data-id="${s.id}"> <span>${esc(progLabel(s))}</span>`; pl.append(l); });
      const tous = v => pl.querySelectorAll('input').forEach(c => c.checked = v);
      ov.querySelector('.tt').onclick = () => tous(true); ov.querySelector('.rien').onclick = () => tous(false);
      ov.querySelector('.no').onclick = close;
      ov.querySelector('.ok').onclick = () => {
        const ids = [...pl.querySelectorAll('input:checked')].map(c => c.dataset.id); if (!ids.length) return;
        const mode = ov.querySelector('.pm').value, bw = ov.querySelector('.pbw').checked, shuffle = ov.querySelector('.psh').checked;
        ids.forEach(sid => S.doc.push(Object.assign({id:nid(), t:'prog', sid, mode, shuffle, seed:Math.floor(Math.random()*1e6), blankV:false, blankD:false, bw, scale:1, hide:[]}, mode==='algo' ? {algoStyle:ALG.style} : {})));
        save(); close(); setView('doc'); };
    }); };
})();
