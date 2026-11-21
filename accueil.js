'use strict';
/* ═══════════════ Atelier blocs · page d'accueil (v1.8.0) ═══════════════
   Affichée à l'ouverture (sauf fenêtre « #algo » et si l'utilisateur l'a désactivée).
   Les exemples sont dessinés avec le vrai moteur (blocs, algorigramme, algorithme, fiche). */
(() => {
  const A = document.getElementById('accueil'); if (!A) return;
  const OFF = 'atelier-accueil-off', SHOW = 'atelier-accueil-show';
  const get = (st, k) => { try { return st.getItem(k); } catch(_){ return null; } };
  const put = (st, k, v) => { try { v==null ? st.removeItem(k) : st.setItem(k, v); } catch(_){} };

  /* ---------- Programmes d'exemple, selon le mode ---------- */
  const mk = (type, f = {}, extra = {}) => { const b = make(type); Object.assign(b.f, f); return Object.assign(b, extra); };
  function exemples(){
    if (MODE==='scratch') return {
      carre: [mk('drapeau'), mk('repeter', {k0:'4'}, {body:[mk('avancerPas', {k0:'100'}), mk('tournerD', {k0:'90'})]})],
      mur: [mk('drapeau'), mk('jusqua', {}, {in:{k0: mk('toucheObj', {k0:'bord'})}, body:[mk('avancerPas', {k0:'10'})]}), mk('tournerD', {k0:'180'})],
      murTitre: 'le lutin avance jusqu\'au bord, puis fait demi-tour'
    };
    return {
      carre: [mk('boutonA', {k0:'A'}), mk('repeter', {k0:'4'}, {body:[mk('avancerS', {k0:'avancer', k1:'50', k2:'1'}), mk('tourner', {k0:'droite', k1:'90'})]})],
      mur: [mk('boutonA', {k0:'A'}), mk('jusqua', {}, {in:{k0: mk('inf', {k1:'10'}, {in:{k0: mk('distance', {k0:'1'})}})}, body:[mk('avancer', {k0:'avancer', k1:'50'})]}), mk('emStop', {k0:'tout'}), mk('tourner', {k0:'droite', k1:'180'})],
      murTitre: 'le robot avance jusqu\'au mur, puis fait demi-tour'
    };
  }
  const blocs = (list, opt = {}) => { const o = newOut({forceColor:true, ...opt}); renderList(list, 0, 0, o); return svgDoc(o, 2).svg; };
  const bloc = (b, opt = {}) => { const o = newOut({forceColor:true, ...opt}); renderBlock(b, 0, 0, o); return svgDoc(o, 2).svg; };
  const fit = svg => svg.replace('<svg ', '<svg style="max-width:100%;height:auto" ');

  function dessiner(){
    let ex; try { ex = exemples(); } catch(e){ return; }
    const set = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
    try { set('acc-coul', fit(blocs(ex.carre))); set('acc-nb', fit(blocs(ex.carre, {bw:true}))); } catch(_){}
    set('acc-mur-titre', 'Exemple : ' + ex.murTitre + '.');
    const sc = {id:'acc', list:ex.mur};
    try { set('acc-ex-blocs', fit(blocs(ex.mur))); } catch(_){}
    try { const d = algoSVG(sc, 6); if (d) set('acc-ex-algo', fit(d.svg)); } catch(_){}
    try { set('acc-ex-texte', algoHTML(sc)); } catch(_){}
    try { // fiche : instructions éclatées, mélangées, en noir et blanc
      const ins = explode(ex.carre), r = rng(7);
      for (let i=ins.length-1;i>0;i--){ const j = Math.floor(r()*(i+1)); [ins[i], ins[j]] = [ins[j], ins[i]]; }
      set('acc-fiche-ins', ins.map(b => `<div class="acc-ins"><span class="acc-case"></span>${fit(bloc(b, {bw:true}))}</div>`).join(''));
      const trou = ex.carre[1].body[0];
      set('acc-fiche-trou', fit(bloc(trou, {bw:true, blankV:true})));
    } catch(_){}
  }

  /* ---------- Ouvrir / fermer ---------- */
  const ouvrir = () => { A.hidden = false; document.body.classList.add('acc-on'); dessiner(); A.scrollTop = 0; };
  const fermer = () => { A.hidden = true; document.body.classList.remove('acc-on'); };
  function toast(msg, ms, then){ const t = document.createElement('div'); t.className = 'acc-toast'; t.setAttribute('role', 'status'); t.textContent = msg; document.body.append(t);
    setTimeout(() => { t.remove(); then && then(); }, ms); }
  const CHEMINS = {
    complet: () => { fermer(); setView('prog'); },
    prog:    () => { fermer(); setView('prog'); setAlgo(false); },
    fiche:   () => { fermer(); setView('doc'); },
    algo:    () => { fermer(); setView('prog'); setAlgo(true); },
    mesblocs:() => { fermer(); setView('prog'); try { openFly('mes'); } catch(_){} },
    importer:() => { fermer(); setView('prog'); const f = document.getElementById('fImport'); if (f) f.click(); },
    exporter:() => { fermer(); setView('prog'); if (window.atelierExporter) window.atelierExporter(); },
    trous: () => { fermer(); setView('prog'); note('Exercice à trous : clic droit sur une instruction (ou sur une de ses valeurs) › « Trou d\'exercice… ». Dans la fiche, un clic sur une instruction du programme assemblé fait la même chose ; la case « Corrigé » montre les réponses et le barème.'); },
    bientot: () => toast('Bientôt disponible. Vous allez accéder à l\'atelier complet.', 2600, () => { fermer(); setView('prog'); })
  };
  A.querySelectorAll('[data-go]').forEach(b => b.onclick = e => { e.preventDefault(); (CHEMINS[b.dataset.go] || CHEMINS.complet)(); });
  A.querySelectorAll('[data-lang]').forEach(b => { const on = b.dataset.lang===MODE; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on);
    b.onclick = () => { if (b.dataset.lang===MODE) return; put(sessionStorage, SHOW, '1'); setMode(b.dataset.lang); }; });
  const chk = document.getElementById('acc-demarrage');
  if (chk){ chk.checked = get(localStorage, OFF)!=='1'; chk.onchange = () => put(localStorage, OFF, chk.checked ? null : '1'); }
  const v = document.getElementById('acc-ver'); if (v) v.textContent = APP_VERSION;
  const bh = document.getElementById('bHome'); if (bh) bh.onclick = ouvrir;
  addEventListener('keydown', e => { if (!A.hidden && (e.key==='Delete' || e.key==='Backspace')) e.stopImmediatePropagation(); }, true);
  addEventListener('keydown', e => { if (e.key==='Escape' && !A.hidden && !document.querySelector('.acc-toast')) CHEMINS.complet(); });

  /* ---------- Démarrage ---------- */
  const force = get(sessionStorage, SHOW)==='1', direct = get(sessionStorage, 'atelier-accueil-go')==='complet'; put(sessionStorage, SHOW, null); put(sessionStorage, 'atelier-accueil-go', null);
  if (location.hash==='#algo' || direct || (!force && get(localStorage, OFF)==='1')) fermer(); else ouvrir();
})();
