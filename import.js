'use strict';
/* ═══════════════ Atelier blocs · import et export de projets Scratch 3 (.sb3) et mBlock 5 (.mblock) (v1.10.0) ═══════════════
   Les deux formats sont des archives zip contenant project.json (format Scratch 3).
   Chaque bloc est converti vers le catalogue ; un bloc inconnu devient « non reconnu » (gris) avec son nom d'origine. */
(() => {
  const PEND = 'atelier-import';
  ['inconnu','inconnuC','inconnuR','inconnuB'].forEach(id => HIDE_PAL.add(id));

  /* ---------- Lecture du zip (sans bibliothèque) ---------- */
  async function inflate(bytes){ const ds = new DecompressionStream('deflate-raw'); return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(ds)).arrayBuffer()); }
  async function zipFile(buf, wanted){
    const u = new Uint8Array(buf), v = new DataView(buf); let e = u.length - 22;
    while (e >= 0 && v.getUint32(e, true)!==0x06054b50) e--; if (e < 0) throw new Error('zip');
    let p = v.getUint32(e + 16, true); const n = v.getUint16(e + 10, true), dec = new TextDecoder();
    for (let i=0;i<n;i++){
      const meth = v.getUint16(p + 10, true), csz = v.getUint32(p + 20, true), fl = v.getUint16(p + 28, true), xl = v.getUint16(p + 30, true), cl = v.getUint16(p + 32, true), off = v.getUint32(p + 42, true);
      const name = dec.decode(u.subarray(p + 46, p + 46 + fl));
      if (name===wanted || name.endsWith('/' + wanted)){
        const data = u.subarray(off + 30 + v.getUint16(off + 26, true) + v.getUint16(off + 28, true)).subarray(0, csz);
        return dec.decode(meth===0 ? data : await inflate(data)); }
      p += 46 + fl + xl + cl; }
    throw new Error('project.json absent');
  }

  /* ---------- Tables de conversion ---------- */
  const SC = MODE==='scratch';
  const tbl = o => { const f = v => o[v] ?? v; f.src = o; return f; };
  const KEYS = tbl({'space':'espace','up arrow':'flèche haut','down arrow':'flèche bas','left arrow':'flèche gauche','right arrow':'flèche droite','any':'n\'importe laquelle'});
  const STOP = tbl({'all':'tout','this script':'ce script','other scripts in sprite': SC ? 'autres scripts dans sprite' : 'les autres scripts','other scripts in stage': SC ? 'autres scripts dans sprite' : 'les autres scripts'});
  const MATH = tbl(SC ? {floor:'plancher',ceiling:'plafond',sqrt:'racine','e ^':'e^','10 ^':'10^'} : {sqrt:'racine carrée'});
  const SPR = tbl({'_random_':'position aléatoire','_mouse_':'pointeur de souris','_edge_':'bord','_myself_':'moi-même','_stage_':'la scène'});
  const EFF = tbl({COLOR:'couleur',FISHEYE:'fisheye',WHIRL:'tourbillon',PIXELATE:'pixeliser',MOSAIC:'mosaïque',BRIGHTNESS:'luminosité',GHOST:'fantôme',color:'couleur',fisheye:'fisheye',whirl:'tourbillon',pixelate:'pixeliser',mosaic:'mosaïque',brightness:'luminosité',ghost:'fantôme'});
  const SEFF = tbl({PITCH:'hauteur',PAN:'stéréo gauche/droite',pitch:'hauteur',pan:'stéréo gauche/droite'});
  const PROP = tbl({'x position':'abscisse x','y position':'ordonnée y','direction':'direction','costume #':'numéro de costume','costume name':'nom du costume','size':'taille','volume':'volume','backdrop #':'numéro de costume','backdrop name':'nom du costume'});
  const CUR = tbl({YEAR:'année',MONTH:'mois',DATE:'date',DAYOFWEEK:'jour de la semaine',HOUR:'heure',MINUTE:'minute',SECOND:'seconde'});
  const PENP = tbl({color:'couleur',saturation:'saturation',brightness:'luminosité',transparency:'transparence'});
  const COUL = tbl({line:'ligne',background:'arrière-plan',white:'blanc',red:'rouge',yellow:'jaune',green:'vert',cyan:'cyan',blue:'bleu',purple:'violet',black:'noir',custom:'couleur auto-définie'});
  const statutOpt = v => (STATUTS.split('|').find(o => o.startsWith('(' + v + ') ')) || v);
  const sondeOpt = v => (SONDES.split('|').find(o => o.endsWith(' ' + v)) || v);
  const LEDCOL = ['#000000','#E3001B','#F5A623','#F8E71C','#7ED321','#50E3C2','#4A90E2','#9013FE','#FFFFFF'];   // 1 = rouge : vérifié dans mBlock le 21/11 (« 11111 » = 5 LED rouges)
  const POSM = tbl({center:'centre de l\'écran',top_left:'en haut à gauche',top_mid:'en haut au centre',top_right:'en haut à droite',mid_left:'au milieu à gauche',mid_right:'au milieu à droite',bottom_left:'en bas à gauche',bottom_mid:'en bas au centre',bottom_right:'en bas à droite'});
  const TAILLE = tbl({'12':'petit','16':'moyen','24':'grand','32':'grand'});   // 16 = « moyen » : vérifié dans mBlock le 21/11
  const unq = v => String(v).replace(/^(["'])(.*)\1$/, '$2');
  const LEDN = v => { v = unq(v); return v==='all' ? 'tous' : v; };
  const SON = v => ({hi:'salut',hello:'bonjour',bye:'au revoir',yeah:'oui',yes:'oui',no:'non',thanks:'merci',wow:'wow',beeps:'bip',beep:'bip',ding:'ding',ok:'ok'})[unq(v)] ?? unq(v);
  const INSTR = v => ({snare:'caisse claire','bass-drum':'grosse caisse','side-stick':'rimshot','crash-cymbal':'cymbale crash','open-hi-hat':'charley ouvert','closed-hi-hat':'charley fermé',tambourine:'tambourin','hand-clap':'clappement de main',claves:'claves'})[unq(v)] ?? unq(v);
  const ACT = tbl({waveup:'signe en haut',wavedown:'signe en bas',waveleft:'signe à gauche',waveright:'signe à droite',clockwise:'tourner dans le sens horaire',anticlockwise:'tourner dans le sens antihoraire',freefall:'chute libre',shake:'secoué'});
  const ATT_EV = v => ({tiltleft:'incliné à gauche',tiltright:'incliné à droite',tiltforward:'incliné vers l\'avant',tiltback:'incliné vers l\'arrière',tiltbackward:'incliné vers l\'arrière',faceup:'écran tourné vers le haut',facedown:'écran tourné vers le bas'})[String(v).replace(/^is_/, '')] ?? v;
  const JOYN = tbl({middle:'milieu appuyé',up:'tiré↑',down:'tiré↓',left:'tiré←',right:'tiré→'});
  const DIR = tbl({forward:'avancer',backward:'reculer'});
  const EM = v => ({ALL:'tout',all:'tout'})[unq(v)] ?? unq(v);
  const SERVO = v => ({all:'tout',ALL:'tout'})[unq(v)] ?? unq(v);
  const TOUT = v => ({all:'tout'})[unq(v)] ?? unq(v);

  // opcode → [id du catalogue, [sources des paramètres k0, k1…], {k: conversion}]
  // source : nom d'une entrée (input) ou d'un champ (field) du bloc d'origine ; null = valeur par défaut
  const M = {
    control_wait:['attendre',['DURATION']], control_repeat:['repeter',['TIMES']], control_forever:['toujours',[]],
    control_if:['si',['CONDITION']], control_if_else:['sinon',['CONDITION']], control_wait_until:['attJusqua',['CONDITION']],
    control_repeat_until:['jusqua',['CONDITION']], control_while:['tantque',['CONDITION']], control_stop:['arret',['STOP_OPTION'],{k0:STOP}],
    control_start_as_clone:['clone',[]], control_create_clone_of:['creerClone',['CLONE_OPTION'],{k0:SPR}], control_delete_this_clone:['supprClone',[]],
    event_whenflagclicked:[SC ? 'drapeau' : 'drapeauMB',[]], event_whenkeypressed:[SC ? 'touche' : 'toucheMB',['KEY_OPTION'],{k0:KEYS}],
    event_whenthisspriteclicked:['clicSprite',[]], event_whenbackdropswitchesto:['quandArrPlan',['BACKDROP']],
    event_whengreaterthan:['quandSup',['WHENGREATERTHANMENU','VALUE'],{k0:tbl({LOUDNESS:'volume sonore',TIMER:'chronomètre'})}],
    event_whenbroadcastreceived:['recois',['BROADCAST_OPTION']], event_broadcast:['diffuser',['BROADCAST_INPUT']], event_broadcastandwait:['diffuserAtt',['BROADCAST_INPUT']],
    operator_add:['add',['NUM1','NUM2']], operator_subtract:['sous',['NUM1','NUM2']], operator_multiply:['mul',['NUM1','NUM2']], operator_divide:['div',['NUM1','NUM2']],
    operator_random:['hasard',['FROM','TO']], operator_gt:['sup',['OPERAND1','OPERAND2']], operator_lt:['inf',['OPERAND1','OPERAND2']], operator_equals:['egal',['OPERAND1','OPERAND2']],
    operator_and:['et',['OPERAND1','OPERAND2']], operator_or:['ou',['OPERAND1','OPERAND2']], operator_not:['pas',['OPERAND']],
    operator_join:['joindre',['STRING1','STRING2']], operator_letter_of:['lettre',['LETTER','STRING']], operator_length:['longueur',['STRING']],
    operator_contains:['comprend',['STRING1','STRING2']], operator_mod:['modulo',['NUM1','NUM2']], operator_round:['arrondir',['NUM']], operator_mathop:['math',['OPERATOR','NUM'],{k0:MATH}],
    data_variable:['var',['VARIABLE']], data_setvariableto:['defVar',['VARIABLE','VALUE']], data_changevariableby:['ajVar',['VALUE','VARIABLE']],
    data_showvariable:['montrerVar',['VARIABLE']], data_hidevariable:['cacherVar',['VARIABLE']],
    data_listcontents:['liste',['LIST']], data_addtolist:['listAj',['ITEM','LIST']], data_deleteoflist:['listSuppr',['INDEX','LIST']], data_deletealloflist:['listVide',['LIST']],
    data_insertatlist:['listIns',['ITEM','INDEX','LIST']], data_replaceitemoflist:['listRempl',['INDEX','LIST','ITEM']], data_itemoflist:['listObj',['INDEX','LIST']],
    data_itemnumoflist:['listPos',['ITEM','LIST']], data_lengthoflist:['listLong',['LIST']], data_listcontainsitem:['listComp',['LIST','ITEM']],
    data_showlist:['listMontrer',['LIST']], data_hidelist:['listCacher',['LIST']],
    // Scratch
    motion_movesteps:['avancerPas',['STEPS']], motion_turnright:['tournerD',['DEGREES']], motion_turnleft:['tournerG',['DEGREES']],
    motion_goto:['allerA',['TO'],{k0:SPR}], motion_gotoxy:['allerXY',['X','Y']], motion_glideto:['glisserA',['SECS','TO'],{k1:SPR}], motion_glidesecstoxy:['glisserXY',['SECS','X','Y']],
    motion_pointindirection:['orienterA',['DIRECTION']], motion_pointtowards:['orienterVers',['TOWARDS'],{k0:SPR}], motion_changexby:['ajX',['DX']], motion_setx:['metX',['X']],
    motion_changeyby:['ajY',['DY']], motion_sety:['metY',['Y']], motion_ifonedgebounce:['rebondir',[]],
    motion_setrotationstyle:['sensRot',['STYLE'],{k0:tbl({'left-right':'gauche-droite','don\'t rotate':'ne tourne pas','all around':'à 360°'})}],
    motion_xposition:['posX',[]], motion_yposition:['posY',[]], motion_direction:['dirSprite',[]],
    looks_sayforsecs:['direP',['MESSAGE','SECS']], looks_say:['dire',['MESSAGE']], looks_thinkforsecs:['penserP',['MESSAGE','SECS']], looks_think:['penser',['MESSAGE']],
    looks_switchcostumeto:['costume',['COSTUME']], looks_nextcostume:['costumeSuiv',[]], looks_nextbackdrop:['arrPlanSuiv',[]],
    looks_switchbackdropto:['arrPlan',['BACKDROP'],{k0:tbl({'next backdrop':'arrière-plan suivant','previous backdrop':'arrière-plan précédent','random backdrop':'arrière-plan aléatoire'})}],
    looks_changesizeby:['ajTaille',['CHANGE']], looks_setsizeto:['metTaille',['SIZE']], looks_changeeffectby:['ajEffet',['CHANGE','EFFECT'],{k1:EFF}], looks_seteffectto:['metEffet',['EFFECT','VALUE'],{k0:EFF}],
    looks_cleargraphiceffects:['annulerEffets',[]], looks_show:['montrer',[]], looks_hide:['cacher',[]],
    looks_gotofrontback:['plan',['FRONT_BACK'],{k0:tbl({front:'avant',back:'arrière'})}], looks_goforwardbackwardlayers:['deplPlans',['NUM','FORWARD_BACKWARD'],{k1:tbl({forward:'avant',backward:'arrière'})}],
    looks_costumenumbername:['numCostume',['NUMBER_NAME'],{k0:tbl({number:'numéro',name:'nom'})}], looks_backdropnumbername:['numArrPlan',['NUMBER_NAME'],{k0:tbl({number:'numéro',name:'nom'})}], looks_size:['tailleSprite',[]],
    sound_playuntildone:['sonFin',['SOUND_MENU']], sound_play:['sonJouer',['SOUND_MENU']], sound_stopallsounds:[SC ? 'sonsStop' : 'stopSons',[]],
    sound_changeeffectby:['ajEffetSon',['VALUE','EFFECT'],{k1:SEFF}], sound_seteffectto:['metEffetSon',['EFFECT','VALUE'],{k0:SEFF}], sound_cleareffects:['annulerEffetsSon',[]],
    sound_changevolumeby:['ajVolume',['VOLUME']], sound_setvolumeto:['metVolume',['VOLUME']], sound_volume:['volumeSon',[]],
    sensing_touchingobject:['toucheObj',['TOUCHINGOBJECTMENU'],{k0:SPR}], sensing_touchingcolor:['toucheCoul',['COLOR']], sensing_coloristouchingcolor:['coulTouche',['COLOR','COLOR2']],
    sensing_distanceto:['distanceDe',['DISTANCETOMENU'],{k0:SPR}], sensing_askandwait:['demander',['QUESTION']], sensing_answer:['reponse',[]],
    sensing_keypressed:['toucheP',['KEY_OPTION'],{k0:KEYS}], sensing_mousedown:['sourisP',[]], sensing_mousex:['sourisX',[]], sensing_mousey:['sourisY',[]],
    sensing_setdragmode:['glissement',['DRAG_MODE'],{k0:tbl({draggable:'glissable','not draggable':'non glissable'})}],
    sensing_loudness:['volSonore',[]], sensing_timer:[SC ? 'chrono' : 'minuterie',[]], sensing_resettimer:[SC ? 'razChrono' : 'chronoZero',[]],
    sensing_of:['attrDe',['PROPERTY','OBJECT'],{k0:PROP,k1:SPR}], sensing_current:['actuel',['CURRENTMENU'],{k0:CUR}], sensing_dayssince2000:['jours2000',[]], sensing_username:['utilisateur',[]],
    pen_clear:['effacerTout',[]], pen_stamp:['estampiller',[]], pen_penDown:['styloBas',[]], pen_penUp:['styloHaut',[]], pen_setPenColorToColor:['styloCoul',['COLOR']],
    pen_changePenColorParamBy:['styloAjParam',['VALUE','COLOR_PARAM'],{k1:PENP}], pen_setPenColorParamTo:['styloMetParam',['COLOR_PARAM','VALUE'],{k0:PENP}],
    pen_changePenSizeBy:['styloAjTaille',['SIZE']], pen_setPenSizeTo:['styloTaille',['SIZE']],
    // mBlock 5 : CyberPi, mBot2, capteurs mBuild (relevés sur de vrais fichiers ; à compléter)
    'cyberpi.cyberpi_when_button_press':['boutonA',['fieldMenu_2'],{k0:v => String(v).toUpperCase()}],
    'cyberpi.cyberpi_display_clear':['effacer',[]],
    'cyberpi.cyberpi_display_label_show_at_somewhere_with_size':['label',['fieldMenu_1','string_2','fieldMenu_2','inputMenu_4'],{k0:v => String((parseInt(v,10)||0) + 1),k2:POSM,k3:TAILLE}],
    'cyberpi.cyberpi_led_off_2':['ledOff',['fieldMenu_1'],{k0:LEDN}],
    'cyberpi.cyberpi_show_led':['led5',['ledRing'],{k0:v => String(v).padEnd(5,'0').slice(0,5).split('').map(c => LEDCOL[+c] || '#000000')}],
    'mbot2.mbot2_encoder_motor_drive_power':['emPct',['LEFT_POWER','number_2']],
    'mbot2.mbot2_encoder_motor_stop':['emStop',['fieldMenu_1'],{k0:tbl({ALL:'tout',all:'tout'})}],
    'mbot2.mbot2_move_straight_with_cm_and_inch':['avancerCm',['DIRECTION','POWER'],{k0:tbl({forward:'avancer',backward:'reculer'})}],
    'mbuild_quad_color_sensor.BLOCK_1618364921511':['statutEst',['index','inputMenu_1','inputMenu_2'],{k1:COUL,k2:statutOpt}],
    'mbuild_quad_color_sensor.mbuild_quad_color_sensor_is_line_and_background':['sonde',['index','inputMenu_2','inputMenu_3'],{k1:sondeOpt,k2:COUL}],
    // relevés sur dev\Sans titre.mblock (21/11) : audio, LED, affichage, mouvement, capteurs, LAN, contrôle
    'cyberpi.cyberpi_play_audio_until_3':['son1',['file_name'],{k0:SON}], 'cyberpi.cyberpi_play_audio_3':['son2',['file_name'],{k0:SON}],
    'cyberpi.cyberpi_start_record':['enr1',[]], 'cyberpi.cyberpi_stop_record':['enr2',[]], 'cyberpi.cyberpi_play_record_until':['enr3',[]],
    'cyberpi.cyberpi_play_music_with_tone_and_note_2':['note',['number_1','number_2']],
    'cyberpi.cyberpi_play_music_with_note':['instrument',['fieldMenu_1','number_3'],{k0:INSTR}],
    'cyberpi.cyberpi_play_buzzer_tone_with_time':['freqP',['number_1','number_2']], 'cyberpi.cyberpi_play_buzzer_tone':['freq',['number_1']],
    'cyberpi.cyberpi_stop_audio':['stopSons',[]],
    'cyberpi.cyberpi_add_volume':['volAug',['number_1']], 'cyberpi.cyberpi_set_volume':['volReg',['number_1']], 'cyberpi.cyberpi_get_volume':['vol',[]],
    'cyberpi.cyberpi_add_audio_speed':['vitAug',['number_1']], 'cyberpi.cyberpi_set_audio_speed':['vitReg',['number_1']], 'cyberpi.cyberpi_get_audio_speed':['vit',[]],
    'cyberpi.cyberpi_when_launch':['demarre',[]],
    'cyberpi.cyberpi_when_direction_key_press':['joystick',['fieldMenu_2'],{k0:tbl({up:'tiré ↑',down:'tiré ↓',left:'tiré ←',right:'tiré →',middle:'appuyé au milieu'})}],
    'cyberpi.cyberpi_when_detect_attitude':['incline',['tilt'],{k0:ATT_EV}],
    'cyberpi.cyberpi_when_detect_action':['signeEv',['tilt'],{k0:v => ACT(String(v).replace(/^is_/, ''))}],
    'cyberpi.cyberpi_when_sensor_value_bigger_or_smaller_than':['quandLum',['fieldMenu_2','fieldMenu_3','number_3'],{k0:tbl({light_sensor:'lumière',microphone:'volume sonore',loudness:'volume sonore',sound_sensor:'volume sonore'}),k1:tbl({greater:'>',bigger:'>',smaller:'<',less:'<'})}],
    'cyberpi.cyberpi_play_led_animation_until':['anim',['LED_animation'],{k0:tbl({rainbow:'arc-en-ciel',spoondrift:'vague',wave:'vague',meteor_blue:'météore',meteor_green:'météore',meteor:'météore',firefly:'feux d\'artifice',fireworks:'feux d\'artifice'})}],
    'cyberpi.cyberpi_move_led':['decaler',['led_number']],
    'cyberpi.cyberpi_led_show_single_with_color_and_time_2':['ledPendant',['fieldMenu_1','color_1','number_3'],{k0:LEDN}],
    'cyberpi.cyberpi_led_show_single_with_color_2':['ledCouleur',['fieldMenu_1','color_1'],{k0:LEDN}],
    'cyberpi.cyberpi_led_show_single_with_rgb_2':['ledRVB',['fieldMenu_1','r','g','b'],{k0:LEDN}],
    'cyberpi.cyberpi_led_show_single_with_rgb_and_time':['ledRVBP',['fieldMenu_1','r','g','b','number_5'],{k0:LEDN}],
    'cyberpi.cyberpi_add_led_brightness':['lumAug',['number_1']], 'cyberpi.cyberpi_set_led_brightness':['lumReg',['number_1']], 'cyberpi.cyberpi_get_led_brightness':['lum',[]],
    'cyberpi.cyberpi_display_print':['aff',['string_2']], 'cyberpi.cyberpi_display_println':['affLigne',['string_2']],
    'cyberpi.cyberpi_console_set_font':['taille',['inputMenu_1'],{k0:TAILLE}],
    'cyberpi.cyberpi_display_label_show_label_xy_with_size':['labelXY',['fieldMenu_1','string_2','number_2','number_3','inputMenu_4'],{k0:v => String((parseInt(v,10)||0) + 1),k4:TAILLE}],
    'cyberpi.cyberpi_display_line_chart_add_data':['graph',['number_1']], 'cyberpi.cyberpi_display_bar_chart_set_interval':['graphEsp',['number_3']],
    'cyberpi.cyberpi_display_bar_chart_add_data':['histo',['number_1']],
    'cyberpi.cyberpi_display_table_add_data_at_row_column_2':['tableau',['string_3','fieldMenu_1','fieldMenu_2']],
    'cyberpi.cyberpi_display_set_brush_with_color':['pinceau',['color_1']], 'cyberpi.cyberpi_display_set_brush_with_r_g_b':['pinceauRVB',['number_1','number_2','number_3']],
    'cyberpi.cyberpi_display_rotate_to_2':['orient',['fieldMenu_1'],{k0:tbl({'90':'le haut','0':'la gauche','180':'la droite','-90':'le bas'})}],   // mBlock : 90 par défaut, 0 à gauche, 180 à droite, -90 à l'envers (capture du 21/11)
    'cyberpi.cyberpi_detect_attitude':['inclineQ',['tilt'],{k0:tbl({tiltforward:'incliné vers l\'avant',tiltback:'incliné vers l\'arrière',tiltbackward:'incliné vers l\'arrière',tiltleft:'incliné à gauche',tiltright:'incliné à droite',faceup:'face vers le haut',facedown:'face vers le bas'})}],
    'cyberpi.cyberpi_detect_action':['signeQ',['tilt'],{k0:ACT}],
    'cyberpi.cyberpi_shaked_value':['secousse',[]], 'cyberpi.cyberpi_wave_angle':['dirSigne',[]], 'cyberpi.cyberpi_wave_speed':['vitDepl',[]],
    'cyberpi.cyberpi_tilt_degree':['angleIncl',['rotation'],{k0:tbl({up:'incliné vers l\'avant',down:'incliné vers l\'arrière',forward:'incliné vers l\'avant',back:'incliné vers l\'arrière',left:'incliné à gauche',right:'incliné à droite'})}],
    'cyberpi.cyberpi_axis_acceleration':['accel',['axis']], 'cyberpi.cyberpi_axis_angle_speed':['vitAng',['axis']], 'cyberpi.cyberpi_axis_rotation_angle':['angRot',['axis']],
    'cyberpi.cyberpi_follow_mblock_sprite':['panda',['spriteMenu_1','GRADE'],{k1:tbl({'0.2':'bas(0.2)','0.4':'millieu(0.4)','0.6':'haut(0,6)'})}],
    'cyberpi.cyberpi_button_press':['boutonQ',['fieldMenu_1'],{k0:v => String(v).toUpperCase()}],
    'cyberpi.cyberpi_direction_key_press':['joyQ',['fieldMenu_1'],{k0:tbl({up:'tiré vers le haut',down:'tiré vers le bas',left:'tiré à gauche',right:'tiré à droite',middle:'milieu appuyé'})}],
    'cyberpi.cyberpi_button_count':['nbPress',['fieldMenu_1'],{k0:v => String(v).toUpperCase()}], 'cyberpi.cyberpi_button_count_reset':['razPress',['fieldMenu_1'],{k0:v => String(v).toUpperCase()}],
    'cyberpi.cyberpi_direction_key_count':['nbJoy',['fieldMenu_1'],{k0:JOYN}], 'cyberpi.cyberpi_direction_key_count_reset':['razJoy',['fieldMenu_1'],{k0:JOYN}],
    'cyberpi.cyberpi_loudness':['sonore',[]], 'cyberpi.cyberpi_brightness':['lumiere',[]], 'cyberpi.cyberpi_timer_get':['minuterie',[]], 'cyberpi.cyberpi_timer_reset':['chronoZero',[]],
    'cyberpi.cyberpi_name':['nomMachine',[]], 'cyberpi.cyberpi_battery_macaddress_blename_and_so_on':['batterie',[]],
    'cyberpi.cyberpi_set_wifi_broadcast':['lanEnvoi',['message']], 'cyberpi.cyberpi_set_wifi_broadcast_with_value':['lanValeur',['message','value']],
    'cyberpi.cyberpi_wifi_broadcast_when_received_message':['lanRecu',['message']], 'cyberpi.cyberpi_wifi_broadcast_get_value':['lanVal',['message']],
    'cyberpi.cyberpi_set_wifi_channels':['lanCanal',['channel'],{k0:v => String(v)==='6' ? '6 (par défaut)' : String(v)}],
    control_for_new:['compter',['VARIABLE','start','end','step']],
    // relevés sur dev\Sans titre2.mblock (21/11) : mBot2, servos, ultrason 2, capteur quad RGB
    'mbot2.mbot2_move_direction_with_time':['avancerS',['DIRECTION','POWER','TIME'],{k0:DIR}],
    'mbot2.mbot2_move_direction_with_rpm':['avancer',['DIRECTION','POWER'],{k0:DIR}],
    'mbot2.mbot2_cw_and_ccw_with_angle':['tourner',['fieldMenu_1','ANGLE'],{k0:tbl({cw:'gauche',ccw:'droite'})}],
    'mbot2.mbot2_encoder_motor_set_with_time':['emUnTrS',['fieldMenu_1','LEFT_POWER','number_3'],{k0:EM}],
    'mbot2.mbot2_encoder_motor_set':['emUnTr',['inputMenu_1','LEFT_POWER'],{k0:EM}],
    'mbot2.mbot2_encoder_motor_set_with_time_angle_and_circle':['emDeg',['fieldMenu_1','LEFT_POWER'],{k0:v => ({EM1:'roue gauche (EM1)',EM2:'roue droite (EM2)'})[unq(v)] ?? unq(v)}],
    'mbot2.mbot2_encoder_motor_drive_speed2':['emTr',['LEFT_POWER','RIGHT_POWER']],
    'mbot2.mbot2_encoder_motor_reset_angle':['emRaz',['inputMenu_1'],{k0:EM}],
    'mbot2.mbot2_encoder_motor_lock_and_unlock':['emVerrou',['fieldMenu_2'],{k0:tbl({'1':'activé','0':'désactivé'})}],
    'mbot2.mbot2_encoder_motor_get_speed':['emVit',['inputMenu_2'],{k0:EM}], 'mbot2.mbot2_encoder_motor_get_angle':['emAngle',['inputMenu_1'],{k0:EM}],
    'mbot2.mbot2_servo_set_angle':['servo',['fieldMenu_1','angle'],{k0:SERVO}], 'mbot2.mbot2_servo_add_angle':['servoAug',['fieldMenu_1','angle'],{k0:SERVO}],
    'mbot2.mbot2_servo_reset_angle_to_zero':['servoZero',['fieldMenu_1'],{k0:SERVO}], 'mbot2.mbot2_servo_driver':['servos4',['number_1','number_2','number_3','number_4']],
    'mbot2.mbot2_servo_release_angle':['servoDecl',['fieldMenu_1'],{k0:v => { v = SERVO(v); return /^S\d$/.test(v) ? '(' + v.slice(1) + ') ' + v : v; }}],
    'cyberpi_mbuild_ultrasonic2.mbuild_ultrasonic2_get_distance':['distance',['index']],
    'cyberpi_mbuild_ultrasonic2.mbuild_ultrasonic2_out_of_range':['horsPortee',['index']],
    'cyberpi_mbuild_ultrasonic2.mbuild_ultrasonic2_get_bri':['usLumVal',['index','order']],
    'cyberpi_mbuild_ultrasonic2.mbuild_ultrasonic2_show_emotion':['usEmotion',['index','emotion'],{k1:v => ({sleepy:'en veille',happy:'joyeux',sad:'triste',angry:'en colère',sleep:'endormi',asleep:'endormi',surprised:'surpris',shy:'timide',curious:'curieux'})[unq(v)] ?? unq(v)}],
    'cyberpi_mbuild_ultrasonic2.mbuild_ultrasonic2_off_led':['usEteindre',['index','inputMenu_3'],{k1:TOUT}],
    'cyberpi_mbuild_ultrasonic2.mbuild_ultrasonic2_add_bri':['usLumAug',['index','order','bv'],{k1:TOUT}],
    'cyberpi_mbuild_ultrasonic2.mbuild_ultrasonic2_set_bri':['usLum',['index','order','bv'],{k1:TOUT}],
    'mbuild_quad_color_sensor.BLOCK_1618382823173':['quadLum',['index','fieldMenu_3'],{k1:tbl({green:'vert',red:'rouge',blue:'bleu'})}],
    'mbuild_quad_color_sensor.mbuild_quad_color_sensor_get_sta_with_inputMenu':['etatL1R1',['index','inputMenu_1','inputMenu_2'],{k1:COUL,k2:v => ({'0':'(0) 00','1':'(1) 01','2':'(2) 10','3':'(3) 11'})[unq(v)] ?? unq(v)}],
    'mbuild_quad_color_sensor.BLOCK_1618397596925':['etatL1R1Val',['index','inputMenu_1'],{k1:COUL}],
    'mbuild_quad_color_sensor.BLOCK_1618397679204':['statut',['index','inputMenu_1'],{k1:COUL}],
    'mbuild_quad_color_sensor.mbuild_quad_color_sensor_get_rgb_gray_light':['sondeVal',['index','inputMenu_2','inputMenu_3'],{k1:v => (SONDES2.split('|').find(o => o.endsWith(unq(v))) || unq(v)),k2:tbl({red:'valeur R de l\'objet',green:'valeur G de l\'objet',blue:'valeur B de l\'objet',gray:'niveaux de gris de l\'objet',grey:'niveaux de gris de l\'objet',light:'intensité de la lumière ambiante',color:'couleur'})}],
    'mbuild_quad_color_sensor.mbuild_quad_color_sensor_get_off_track':['ecart',['index']],
    'mbuild_quad_color_sensor.BLOCK_1620904215289':['quadEteindre',['index']],
    'mbuild_quad_color_sensor.BLOCK_1626250042594':['quadDefCoul',['index','r','g','b','tolerance']],
    'mbuild_quad_color_sensor.BLOCK_1663048571053':['calib',['index']],
    'mbuild_quad_color_sensor.BLOCK_1663048571165':['quadMode',['mode'],{k0:tbl({standard:'Standard',enhance:'Amélioration des couleurs',enhanced:'Amélioration des couleurs'})}],
  };
  const BOOL_OPS = /^(operator_(gt|lt|equals|and|or|not|contains)|data_listcontainsitem|sensing_(touching|coloristouching|keypressed|mousedown))|_is_|_detect|_pressed\b|_status_is/;

  /* ---------- Conversion d'une cible (lutin, CyberPi…) ---------- */
  function convertir(t, report){
    const B = t.blocks || {}, procByCode = {};
    const addName = (arr, n) => { if (n!=null && n!=='' && !arr.includes(n)) arr.push(n); };
    const lirePrim = a => { // [type, valeur, (id)] : 12 variable, 13 liste, 11 message
      if (!Array.isArray(a)) return a;
      if (a[0]===12){ addName(S.vars, a[1]); return {var:a[1]}; }
      if (a[0]===13){ addName(S.lists, a[1]); return {list:a[1]}; }
      if (a[0]===11){ addName(S.msgs, a[1]); return a[1]; }
      return a[1]; };
    const vBloc = v => v && v.var!=null ? make('var', {name:v.var}) : (v && v.list!=null ? make('liste', {name:v.list}) : null);
    // valeur d'une entrée : bloc emboîté, menu (bloc ombre) ou valeur simple
    function entree(raw){
      if (!Array.isArray(raw)) return undefined;
      const val = raw[1];
      if (typeof val==='string' && B[val]){ const sb = B[val];
        if (!Array.isArray(sb) && sb.shadow){ const fv = Object.values(sb.fields||{})[0]; return {val: fv ? fv[0] : ''}; }
        return {blk: bloc(val)}; }
      if (Array.isArray(val)){ const v = lirePrim(val); const vb = vBloc(v); return vb ? {blk:vb} : {val:v}; }
      if (Array.isArray(raw[2])){ const v = lirePrim(raw[2]); const vb = vBloc(v); return vb ? {blk:vb} : {val:v}; }
      return undefined; }
    function proc(mut){
      const code = mut.proccode || 'bloc'; if (procByCode[code]) return procByCode[code];
      if (!mut.argumentnames){ const pt = Object.values(B).find(x => x && !Array.isArray(x) && x.opcode==='procedures_prototype' && x.mutation && x.mutation.proccode===code); if (pt) mut = pt.mutation; }   // un appel ne donne pas les noms des paramètres : on les prend dans la définition
      let pr = (S.procs||[]).find(p => p.code===code);
      if (!pr){ let names = [], ids = []; try { names = JSON.parse(mut.argumentnames || '[]'); ids = JSON.parse(mut.argumentids || '[]'); } catch(_){}
        let ai = 0; const parts = code.split(/(%[snb])/).map(s => s.trim()).filter(Boolean);
        const name = parts[0] && !/^%[snb]$/.test(parts[0]) ? parts.shift() : 'bloc';
        const params = parts.map(s => /^%[snb]$/.test(s) ? {t: s==='%b' ? 'b' : (s==='%n' ? 'n' : 's'), id:nid(), name: names[ai] || 'param', src: ids[ai++]} : {t:'l', id:nid(), name:s});
        pr = {id:nid(), name, params, code}; S.procs.push(pr); syncProcs(); }
      if (!pr.params.some(p => p.src)){ let ids = []; try { ids = JSON.parse(mut.argumentids || '[]'); } catch(_){} let ai = 0; pr.params.forEach(p => { if (p.t!=='l') p.src = ids[ai++]; }); }
      return procByCode[code] = pr; }
    function inconnu(b, sh){ const op = b.opcode.replace(/^[^.]*\./, ''); report.add(b.opcode);
      const vals = Object.values(b.fields||{}).map(f => f[0]).concat(Object.entries(b.inputs||{}).filter(([k]) => !/^SUBSTACK/.test(k)).map(([, r]) => { const e = entree(r); return e && e.val!=null && typeof e.val!=='object' ? e.val : null; })).filter(x => x!=null && x!=='');
      const x = make(sh==='c' ? 'inconnuC' : sh==='rep' ? 'inconnuR' : sh==='bool' ? 'inconnuB' : 'inconnu'); x.f.k0 = op + (vals.length ? ' (' + vals.join(', ') + ')' : ''); return x; }
    let procCur = null;
    function estEntree(id){ const b = B[id]; if (!b || Array.isArray(b) || !b.parent || !B[b.parent]) return false;
      return Object.entries(B[b.parent].inputs||{}).some(([k, r]) => !/^SUBSTACK/.test(k) && r[1]===id); }
    function bloc(id){
      const b = B[id]; if (!b) return null;
      if (Array.isArray(b)){ const v = lirePrim(b); return vBloc(v) || make('var', {name:String(v)}); }
      const op = b.opcode;
      if (op==='procedures_definition'){ const pt = B[((b.inputs||{}).custom_block||[])[1]]; const pr = proc((pt && pt.mutation) || {}); procCur = pr; return make('pdef_' + pr.id); }
      if (op==='procedures_call'){ const pr = proc(b.mutation || {}), x = make('pcall_' + pr.id);
        pr.params.filter(p => p.t!=='l').forEach(p => { const e = entree((b.inputs||{})[p.src]); if (!e) return; if (e.blk) x.in['p_'+p.id] = e.blk; else if (e.val!=null) x.f['p_'+p.id] = String(e.val); }); return x; }
      if (op==='argument_reporter_string_number' || op==='argument_reporter_boolean'){ const nm = ((b.fields||{}).VALUE||[])[0];
        for (const pr of (procCur ? [procCur, ...S.procs] : S.procs)){ const p = pr.params.find(q => q.t!=='l' && q.name===nm); if (p) return make('parg_' + pr.id + '_' + p.id); }
        report.add(op); const x = make(op==='argument_reporter_boolean' ? 'inconnuB' : 'inconnuR'); x.f.k0 = nm; return x; }
      const m = M[op], ins = b.inputs || {}, hasSub = ins.SUBSTACK || ins.SUBSTACK2;
      let x;
      if (!m || !DEF[m[0]]) x = inconnu(b, hasSub ? 'c' : (estEntree(id) || (b.topLevel && !b.next && !ins.SUBSTACK && BOOL_OPS.test(op)) ? (BOOL_OPS.test(op) ? 'bool' : 'rep') : 'stack'));
      else {
        x = make(m[0]); const conv = m[2] || {};
        m[1].forEach((src, i) => { if (!src) return; const k = 'k' + i; let e;
          if (ins[src]) e = entree(ins[src]); else if (b.fields && b.fields[src]) e = {val: b.fields[src][0]};
          if (!e) return;
          if (e.blk){ x.in[k] = e.blk; return; }
          let v = e.val; if (v==null || typeof v==='object') return; if (conv[k]) v = conv[k](v);
          if (src==='VARIABLE') addName(S.vars, v); if (src==='LIST') addName(S.lists, v); if (/BROADCAST/.test(src)) addName(S.msgs, v);
          x.f[k] = Array.isArray(v) ? v : String(v); });
      }
      if (x.body && ins.SUBSTACK) x.body = pile(ins.SUBSTACK[1]);
      if (x.body2 && ins.SUBSTACK2) x.body2 = pile(ins.SUBSTACK2[1]);
      return x; }
    function pile(id){ const out = []; let guard = 0; while (id && B[id] && guard++ < 5000){ const x = bloc(id); if (x) out.push(x); id = Array.isArray(B[id]) ? null : B[id].next; } return out; }
    const scripts = [];
    for (const [id, b] of Object.entries(B)){
      const top = Array.isArray(b) ? true : (b.topLevel && !b.shadow); if (!top) continue;
      if (!Array.isArray(b) && b.opcode==='procedures_prototype') continue;
      procCur = null; const list = Array.isArray(b) ? [bloc(id)] : pile(id); if (list.length) scripts.push(list); }
    return scripts;
  }

  /* ---------- Fenêtre de choix et ajout à la zone de travail ---------- */
  const nbScripts = t => Object.values(t.blocks||{}).filter(b => Array.isArray(b) || (b.topLevel && !b.shadow && b.opcode!=='procedures_prototype')).length;
  function importer(proj, nomFichier){
    const cibles = (proj.targets||[]).map(t => ({t, n: nbScripts(t)})).filter(c => c.n);
    if (!cibles.length) return note('Ce fichier ne contient aucun programme.');
    dialog(`<p style="margin:0 0 6px;font-weight:600">Importer « ${esc(nomFichier)} »</p><p class="muted" style="margin:0 0 10px">Cochez ${SC ? 'les lutins' : 'les appareils et lutins'} dont les programmes seront ajoutés à la zone de travail.</p>
      <div class="ilist" style="display:flex;flex-direction:column;gap:6px;max-height:50vh;overflow:auto"></div>
      <label style="display:flex;gap:6px;align-items:center;margin-top:12px;cursor:pointer"><input type="checkbox" class="repl"> Remplacer les programmes actuels de la zone de travail</label>
      <div class="row"><button class="no">Annuler</button><button class="pri ok">Importer</button></div>`, (ov, close) => {
      const il = ov.querySelector('.ilist');
      cibles.forEach((c, i) => { const l = document.createElement('label'); l.style.cssText = 'display:flex;gap:8px;align-items:center;cursor:pointer';
        l.innerHTML = `<input type="checkbox" data-i="${i}" checked> <b>${esc(c.t.isStage ? 'Scène' : c.t.name)}</b> <span class="muted">(${c.n} programme${c.n>1?'s':''})</span>`; il.append(l); });
      ov.querySelector('.no').onclick = close;
      ov.querySelector('.ok').onclick = () => {
        const pris = [...il.querySelectorAll('input:checked')].map(c => cibles[+c.dataset.i]); if (!pris.length) return;
        if (ov.querySelector('.repl').checked){ S.scripts = []; S.procs = (S.procs||[]).filter(p => !p.code); syncProcs(); }
        const report = new Set(), avant = S.scripts.length;
        let y = S.scripts.reduce((m, s) => Math.max(m, s.y + listH(s.list, {})), 0) + (avant ? 60 : 30);
        const y0 = y;
        for (const c of pris) for (const list of convertir(c.t, report)){ S.scripts.push({id:nid(), x:30, y, list}); y += listH(list, {}) + 40; }
        const nb = S.scripts.length - avant;
        syncProcs(); selected = nb ? S.scripts[avant].id : selected; S.px = 20; S.py = 50 - y0;
        close(); setView('prog'); drawCats(); draw();
        note(nb + ' programme' + (nb>1 ? 's importés' : ' importé') + '.' + (report.size ? ' Blocs non reconnus, affichés en gris (à remplacer à la main) : ' + [...report].map(o => o.replace(/^[^.]*\./, '')).join(', ') + '.' : ''));
      };
    });
  }
  const allegee = p => ({targets:(p.targets||[]).map(t => ({name:t.name, isStage:t.isStage, blocks:t.blocks}))});
  const modeDe = p => (p.targets||[]).some(t => Object.values(t.blocks||{}).some(b => !Array.isArray(b) && /^(cyberpi|mbot2|mbuild|mbot|codey|halocode|neuron)/i.test(b.opcode))) ? 'mblock' : 'scratch';
  async function lireFichier(f){
    let proj;
    try { const buf = await f.arrayBuffer(); const txt = /\.json$/i.test(f.name) ? new TextDecoder().decode(buf) : await zipFile(buf, 'project.json'); proj = JSON.parse(txt); }
    catch(e){ console.error(e); return note('Ce fichier n\'a pas pu être lu comme un projet Scratch 3 (.sb3) ou mBlock 5 (.mblock).'); }
    const m = modeDe(proj);
    if (m!==MODE){
      try { sessionStorage.setItem(PEND, JSON.stringify({nom:f.name, proj:allegee(proj)})); sessionStorage.setItem('atelier-accueil-go', 'complet'); }
      catch(e){ return note('Ce projet est trop volumineux pour changer de mode automatiquement. Choisissez d\'abord le mode ' + (m==='scratch' ? 'Scratch' : 'mBlock') + ', puis importez-le à nouveau.'); }
      setMode(m); return; }
    importer(proj, f.name); }
  const inp = document.getElementById('fImport'); if (inp) inp.onchange = e => { const f = e.target.files[0]; if (f) lireFichier(f); e.target.value = ''; };
  window.atelierImporter = lireFichier;
  // import en attente après un changement de mode
  try { const raw = sessionStorage.getItem(PEND); if (raw){ sessionStorage.removeItem(PEND); const o = JSON.parse(raw); setTimeout(() => importer(o.proj, o.nom), 60); } } catch(_){}

  /* ═══════════════ Export vers Scratch 3 (.sb3) ou mBlock 5 (.mblock) (v1.10.0) ═══════════════
     Même table M que l'import, lue dans l'autre sens. Les gabarits TPL disent, pour chaque bloc d'origine,
     quelles entrées (I) et quels champs (F) il attend, relevés sur de vrais fichiers.
     I : 4 nombre · 5 positif · 6 entier positif · 7 entier · 8 angle · 9 couleur · 10 texte · 11 message
         'b' condition (sans ombre) · 'M' menu mBlock (bloc ombre <bloc>_<entrée>_menu) · [opcode, CHAMP] menu Scratch
     F : champs, avec la valeur par défaut écrite quand l'atelier n'en a pas (ex. « cm »). */
  const T = (I, F) => ({I: I || {}, F: F || {}});
  const TPL = {
    control_wait:T({DURATION:5}), control_repeat:T({TIMES:6}), control_forever:T(), control_if:T({CONDITION:'b'}), control_if_else:T({CONDITION:'b'}),
    control_wait_until:T({CONDITION:'b'}), control_repeat_until:T({CONDITION:'b'}), control_while:T({CONDITION:'b'}), control_stop:T(0,{STOP_OPTION:'all'}),
    control_start_as_clone:T(), control_create_clone_of:T({CLONE_OPTION:['control_create_clone_of_menu','CLONE_OPTION']}), control_delete_this_clone:T(),
    control_for_new:T({start:4,end:4,step:4},{VARIABLE:''}),
    event_whenflagclicked:T(), event_whenkeypressed:T(0,{KEY_OPTION:'space'}), event_whenthisspriteclicked:T(), event_whenbackdropswitchesto:T(0,{BACKDROP:'backdrop1'}),
    event_whengreaterthan:T({VALUE:4},{WHENGREATERTHANMENU:'LOUDNESS'}), event_whenbroadcastreceived:T(0,{BROADCAST_OPTION:''}),
    event_broadcast:T({BROADCAST_INPUT:11}), event_broadcastandwait:T({BROADCAST_INPUT:11}),
    operator_add:T({NUM1:4,NUM2:4}), operator_subtract:T({NUM1:4,NUM2:4}), operator_multiply:T({NUM1:4,NUM2:4}), operator_divide:T({NUM1:4,NUM2:4}),
    operator_random:T({FROM:4,TO:4}), operator_gt:T({OPERAND1:10,OPERAND2:10}), operator_lt:T({OPERAND1:10,OPERAND2:10}), operator_equals:T({OPERAND1:10,OPERAND2:10}),
    operator_and:T({OPERAND1:'b',OPERAND2:'b'}), operator_or:T({OPERAND1:'b',OPERAND2:'b'}), operator_not:T({OPERAND:'b'}),
    operator_join:T({STRING1:10,STRING2:10}), operator_letter_of:T({LETTER:6,STRING:10}), operator_length:T({STRING:10}), operator_contains:T({STRING1:10,STRING2:10}),
    operator_mod:T({NUM1:4,NUM2:4}), operator_round:T({NUM:4}), operator_mathop:T({NUM:4},{OPERATOR:'abs'}),
    data_variable:T(0,{VARIABLE:''}), data_setvariableto:T({VALUE:10},{VARIABLE:''}), data_changevariableby:T({VALUE:4},{VARIABLE:''}),
    data_showvariable:T(0,{VARIABLE:''}), data_hidevariable:T(0,{VARIABLE:''}), data_listcontents:T(0,{LIST:''}),
    data_addtolist:T({ITEM:10},{LIST:''}), data_deleteoflist:T({INDEX:7},{LIST:''}), data_deletealloflist:T(0,{LIST:''}), data_insertatlist:T({ITEM:10,INDEX:7},{LIST:''}),
    data_replaceitemoflist:T({INDEX:7,ITEM:10},{LIST:''}), data_itemoflist:T({INDEX:7},{LIST:''}), data_itemnumoflist:T({ITEM:10},{LIST:''}),
    data_lengthoflist:T(0,{LIST:''}), data_listcontainsitem:T({ITEM:10},{LIST:''}), data_showlist:T(0,{LIST:''}), data_hidelist:T(0,{LIST:''}),
    motion_movesteps:T({STEPS:4}), motion_turnright:T({DEGREES:4}), motion_turnleft:T({DEGREES:4}), motion_goto:T({TO:['motion_goto_menu','TO']}),
    motion_gotoxy:T({X:4,Y:4}), motion_glideto:T({SECS:4,TO:['motion_glideto_menu','TO']}), motion_glidesecstoxy:T({SECS:4,X:4,Y:4}),
    motion_pointindirection:T({DIRECTION:8}), motion_pointtowards:T({TOWARDS:['motion_pointtowards_menu','TOWARDS']}), motion_changexby:T({DX:4}), motion_setx:T({X:4}),
    motion_changeyby:T({DY:4}), motion_sety:T({Y:4}), motion_ifonedgebounce:T(), motion_setrotationstyle:T(0,{STYLE:'left-right'}),
    motion_xposition:T(), motion_yposition:T(), motion_direction:T(),
    looks_sayforsecs:T({MESSAGE:10,SECS:4}), looks_say:T({MESSAGE:10}), looks_thinkforsecs:T({MESSAGE:10,SECS:4}), looks_think:T({MESSAGE:10}),
    looks_switchcostumeto:T({COSTUME:['looks_costume','COSTUME']}), looks_nextcostume:T(), looks_switchbackdropto:T({BACKDROP:['looks_backdrops','BACKDROP']}), looks_nextbackdrop:T(),
    looks_changesizeby:T({CHANGE:4}), looks_setsizeto:T({SIZE:4}), looks_changeeffectby:T({CHANGE:4},{EFFECT:'COLOR'}), looks_seteffectto:T({VALUE:4},{EFFECT:'COLOR'}),
    looks_cleargraphiceffects:T(), looks_show:T(), looks_hide:T(), looks_gotofrontback:T(0,{FRONT_BACK:'front'}), looks_goforwardbackwardlayers:T({NUM:7},{FORWARD_BACKWARD:'forward'}),
    looks_costumenumbername:T(0,{NUMBER_NAME:'number'}), looks_backdropnumbername:T(0,{NUMBER_NAME:'number'}), looks_size:T(),
    sound_playuntildone:T({SOUND_MENU:['sound_sounds_menu','SOUND_MENU']}), sound_play:T({SOUND_MENU:['sound_sounds_menu','SOUND_MENU']}), sound_stopallsounds:T(),
    sound_changeeffectby:T({VALUE:4},{EFFECT:'PITCH'}), sound_seteffectto:T({VALUE:4},{EFFECT:'PITCH'}), sound_cleareffects:T(),
    sound_changevolumeby:T({VOLUME:4}), sound_setvolumeto:T({VOLUME:4}), sound_volume:T(),
    sensing_touchingobject:T({TOUCHINGOBJECTMENU:['sensing_touchingobjectmenu','TOUCHINGOBJECTMENU']}), sensing_touchingcolor:T({COLOR:9}), sensing_coloristouchingcolor:T({COLOR:9,COLOR2:9}),
    sensing_distanceto:T({DISTANCETOMENU:['sensing_distancetomenu','DISTANCETOMENU']}), sensing_askandwait:T({QUESTION:10}), sensing_answer:T(),
    sensing_keypressed:T({KEY_OPTION:['sensing_keyoptions','KEY_OPTION']}), sensing_mousedown:T(), sensing_mousex:T(), sensing_mousey:T(),
    sensing_setdragmode:T(0,{DRAG_MODE:'draggable'}), sensing_loudness:T(), sensing_timer:T(), sensing_resettimer:T(),
    sensing_of:T({OBJECT:['sensing_of_object_menu','OBJECT']},{PROPERTY:'x position'}), sensing_current:T(0,{CURRENTMENU:'YEAR'}), sensing_dayssince2000:T(), sensing_username:T(),
    pen_clear:T(), pen_stamp:T(), pen_penDown:T(), pen_penUp:T(), pen_setPenColorToColor:T({COLOR:9}),
    pen_changePenColorParamBy:T({COLOR_PARAM:['pen_menu_colorParam','colorParam'],VALUE:4}), pen_setPenColorParamTo:T({COLOR_PARAM:['pen_menu_colorParam','colorParam'],VALUE:4}),
    pen_changePenSizeBy:T({SIZE:4}), pen_setPenSizeTo:T({SIZE:4}),
    'cyberpi.cyberpi_add_audio_speed':T({"number_1": 4},0),
    'cyberpi.cyberpi_add_led_brightness':T({"number_1": 4},0),
    'cyberpi.cyberpi_add_volume':T({"number_1": 4},0),
    'cyberpi.cyberpi_axis_acceleration':T(0,{"axis": "x"}),
    'cyberpi.cyberpi_axis_angle_speed':T(0,{"axis": "x"}),
    'cyberpi.cyberpi_axis_rotation_angle':T(0,{"axis": "x"}),
    'cyberpi.cyberpi_battery_macaddress_blename_and_so_on':T(0,{"fieldMenu_1": "battery"}),
    'cyberpi.cyberpi_brightness':T(0,0),
    'cyberpi.cyberpi_button_count':T(0,{"fieldMenu_1": "a"}),
    'cyberpi.cyberpi_button_count_reset':T(0,{"fieldMenu_1": "a"}),
    'cyberpi.cyberpi_button_press':T(0,{"fieldMenu_1": "a"}),
    'cyberpi.cyberpi_console_set_font':T({"inputMenu_1": "M"},0),
    'cyberpi.cyberpi_detect_action':T(0,{"tilt": "waveup"}),
    'cyberpi.cyberpi_detect_attitude':T(0,{"tilt": "tiltforward"}),
    'cyberpi.cyberpi_direction_key_count':T(0,{"fieldMenu_1": "middle"}),
    'cyberpi.cyberpi_direction_key_count_reset':T(0,{"fieldMenu_1": "middle"}),
    'cyberpi.cyberpi_direction_key_press':T(0,{"fieldMenu_1": "middle"}),
    'cyberpi.cyberpi_display_bar_chart_add_data':T({"number_1": 4},0),
    'cyberpi.cyberpi_display_bar_chart_set_interval':T({"number_3": 4},0),
    'cyberpi.cyberpi_display_clear':T(0,0),
    'cyberpi.cyberpi_display_label_show_at_somewhere_with_size':T({"string_2": 10, "inputMenu_4": "M"},{"fieldMenu_1": "0", "fieldMenu_2": "center"}),
    'cyberpi.cyberpi_display_label_show_label_xy_with_size':T({"string_2": 10, "number_2": 4, "number_3": 4, "inputMenu_4": "M"},{"fieldMenu_1": "0"}),
    'cyberpi.cyberpi_display_line_chart_add_data':T({"number_1": 4},0),
    'cyberpi.cyberpi_display_print':T({"string_2": 10},0),
    'cyberpi.cyberpi_display_println':T({"string_2": 10},0),
    'cyberpi.cyberpi_display_rotate_to_2':T({"fieldMenu_1": "M"},0),
    'cyberpi.cyberpi_display_set_brush_with_color':T({"color_1": 9},0),
    'cyberpi.cyberpi_display_set_brush_with_r_g_b':T({"number_1": 4, "number_2": 4, "number_3": 4},0),
    'cyberpi.cyberpi_display_table_add_data_at_row_column_2':T({"string_3": 10, "fieldMenu_1": "M", "fieldMenu_2": "M"},0),
    'cyberpi.cyberpi_follow_mblock_sprite':T({"spriteMenu_1": "M", "GRADE": "M"},0),
    'cyberpi.cyberpi_led_off_2':T({"fieldMenu_1": "M"},0),
    'cyberpi.cyberpi_led_show_single_with_color_2':T({"fieldMenu_1": "M", "color_1": 9},0),
    'cyberpi.cyberpi_led_show_single_with_color_and_time_2':T({"fieldMenu_1": "M", "color_1": 9, "number_3": 4},0),
    'cyberpi.cyberpi_led_show_single_with_rgb_2':T({"fieldMenu_1": "M", "r": 4, "g": 4, "b": 4},0),
    'cyberpi.cyberpi_led_show_single_with_rgb_and_time':T({"fieldMenu_1": "M", "r": 4, "g": 4, "b": 4, "number_5": 4},0),
    'cyberpi.cyberpi_loudness':T(0,0),
    'cyberpi.cyberpi_move_led':T({"led_number": 4},0),
    'cyberpi.cyberpi_name':T(0,0),
    'cyberpi.cyberpi_play_audio_3':T({"file_name": "M"},0),
    'cyberpi.cyberpi_play_audio_until_3':T({"file_name": "M"},0),
    'cyberpi.cyberpi_play_buzzer_tone_with_time':T({"number_1": 4, "number_2": 4},0),
    'cyberpi.cyberpi_play_led_animation_until':T(0,{"LED_animation": "rainbow"}),
    'cyberpi.cyberpi_play_music_with_note':T({"fieldMenu_1": "M", "number_3": 4},0),
    'cyberpi.cyberpi_play_music_with_tone_and_note_2':T({"number_1": ["note", "NOTE"], "number_2": 4},0),
    'cyberpi.cyberpi_play_record_until':T(0,0),
    'cyberpi.cyberpi_set_audio_speed':T({"number_1": 4},0),
    'cyberpi.cyberpi_set_led_brightness':T({"number_1": 4},0),
    'cyberpi.cyberpi_set_volume':T({"number_1": 4},0),
    'cyberpi.cyberpi_set_wifi_broadcast':T({"message": 10},0),
    'cyberpi.cyberpi_set_wifi_broadcast_with_value':T({"message": 10, "value": 10},0),
    'cyberpi.cyberpi_set_wifi_channels':T(0,{"channel": "6"}),
    'cyberpi.cyberpi_shaked_value':T(0,0),
    'cyberpi.cyberpi_show_led':T(0,{"ledRing": "11111"}),
    'cyberpi.cyberpi_start_record':T(0,0),
    'cyberpi.cyberpi_stop_audio':T(0,0),
    'cyberpi.cyberpi_stop_record':T(0,0),
    'cyberpi.cyberpi_tilt_degree':T(0,{"rotation": "up"}),
    'cyberpi.cyberpi_timer_get':T(0,0),
    'cyberpi.cyberpi_timer_reset':T(0,0),
    'cyberpi.cyberpi_wave_angle':T(0,0),
    'cyberpi.cyberpi_wave_speed':T(0,0),
    'cyberpi.cyberpi_when_button_press':T(0,{"fieldMenu_2": "a"}),
    'cyberpi.cyberpi_when_detect_action':T(0,{"tilt": "is_waveleft"}),
    'cyberpi.cyberpi_when_detect_attitude':T(0,{"tilt": "is_tiltleft"}),
    'cyberpi.cyberpi_when_direction_key_press':T(0,{"fieldMenu_2": "up"}),
    'cyberpi.cyberpi_when_launch':T(0,0),
    'cyberpi.cyberpi_when_sensor_value_bigger_or_smaller_than':T({"number_3": 4},{"fieldMenu_2": "light_sensor", "fieldMenu_3": "greater"}),
    'cyberpi.cyberpi_wifi_broadcast_get_value':T({"message": 10},0),
    'cyberpi.cyberpi_wifi_broadcast_when_received_message':T({"message": 10},0),
    'cyberpi_mbuild_ultrasonic2.mbuild_ultrasonic2_add_bri':T({"index": "M", "order": "M", "bv": 4},0),
    'cyberpi_mbuild_ultrasonic2.mbuild_ultrasonic2_get_bri':T({"index": "M", "order": "M"},0),
    'cyberpi_mbuild_ultrasonic2.mbuild_ultrasonic2_get_distance':T({"index": "M"},0),
    'cyberpi_mbuild_ultrasonic2.mbuild_ultrasonic2_off_led':T({"index": "M", "inputMenu_3": "M"},0),
    'cyberpi_mbuild_ultrasonic2.mbuild_ultrasonic2_out_of_range':T({"index": "M"},0),
    'cyberpi_mbuild_ultrasonic2.mbuild_ultrasonic2_set_bri':T({"index": "M", "order": "M", "bv": 4},0),
    'cyberpi_mbuild_ultrasonic2.mbuild_ultrasonic2_show_emotion':T({"index": "M", "emotion": "M"},0),
    'mbot2.mbot2_cw_and_ccw_with_angle':T({"ANGLE": 4},{"fieldMenu_1": "cw"}),
    'mbot2.mbot2_encoder_motor_drive_power':T({"LEFT_POWER": 4, "number_2": 4},0),
    'mbot2.mbot2_encoder_motor_drive_speed2':T({"LEFT_POWER": 4, "RIGHT_POWER": 4},0),
    'mbot2.mbot2_encoder_motor_get_angle':T({"inputMenu_1": "M"},0),
    'mbot2.mbot2_encoder_motor_get_speed':T({"inputMenu_2": "M"},{"fieldMenu_3": "speed"}),
    'mbot2.mbot2_encoder_motor_lock_and_unlock':T({"inputMenu_1": "M"},{"fieldMenu_2": "1"}),
    'mbot2.mbot2_encoder_motor_reset_angle':T({"inputMenu_1": "M"},0),
    'mbot2.mbot2_encoder_motor_set':T({"inputMenu_1": "M", "LEFT_POWER": 4},{"fieldMenu_4": "speed"}),
    'mbot2.mbot2_encoder_motor_set_with_time':T({"fieldMenu_1": "M", "LEFT_POWER": 4, "number_3": 4},{"fieldMenu_4": "speed"}),
    'mbot2.mbot2_encoder_motor_set_with_time_angle_and_circle':T({"fieldMenu_1": "M", "LEFT_POWER": 4},0),
    'mbot2.mbot2_encoder_motor_stop':T(0,{"fieldMenu_1": "ALL"}),
    'mbot2.mbot2_move_direction_with_rpm':T({"POWER": 4},{"DIRECTION": "forward"}),
    'mbot2.mbot2_move_direction_with_time':T({"POWER": 4, "TIME": 4},{"DIRECTION": "forward"}),
    'mbot2.mbot2_move_straight_with_cm_and_inch':T({"POWER": 4},{"DIRECTION": "forward", "fieldMenu_3": "cm"}),
    'mbot2.mbot2_servo_add_angle':T({"fieldMenu_1": "M", "angle": 4},0),
    'mbot2.mbot2_servo_driver':T({"number_1": 4, "number_2": 4, "number_3": 4, "number_4": 4},0),
    'mbot2.mbot2_servo_release_angle':T({"fieldMenu_1": "M"},0),
    'mbot2.mbot2_servo_reset_angle_to_zero':T({"fieldMenu_1": "M"},0),
    'mbot2.mbot2_servo_set_angle':T({"fieldMenu_1": "M", "angle": 4},0),
    'mbuild_quad_color_sensor.BLOCK_1618364921511':T({"index": "M", "inputMenu_2": "M"},{"inputMenu_1": "line"}),
    'mbuild_quad_color_sensor.BLOCK_1618382823173':T({"index": "M"},{"fieldMenu_3": "green"}),
    'mbuild_quad_color_sensor.BLOCK_1618397596925':T({"index": "M"},{"inputMenu_1": "line"}),
    'mbuild_quad_color_sensor.BLOCK_1618397679204':T({"index": "M"},{"inputMenu_1": "line"}),
    'mbuild_quad_color_sensor.BLOCK_1620904215289':T({"index": "M"},0),
    'mbuild_quad_color_sensor.BLOCK_1626250042594':T({"index": "M", "r": 4, "g": 4, "b": 4, "tolerance": 4},0),
    'mbuild_quad_color_sensor.BLOCK_1663048571053':T(0,{"index": "1"}),
    'mbuild_quad_color_sensor.BLOCK_1663048571165':T(0,{"mode": "standard"}),
    'mbuild_quad_color_sensor.mbuild_quad_color_sensor_get_off_track':T({"index": "M"},0),
    'mbuild_quad_color_sensor.mbuild_quad_color_sensor_get_rgb_gray_light':T({"index": "M", "inputMenu_2": "M", "inputMenu_3": "M"},0),
    'mbuild_quad_color_sensor.mbuild_quad_color_sensor_get_sta_with_inputMenu':T({"index": "M", "inputMenu_2": "M"},{"inputMenu_1": "line"}),
    'mbuild_quad_color_sensor.mbuild_quad_color_sensor_is_line_and_background':T({"index": "M", "inputMenu_2": "M", "inputMenu_3": "M"},0),  };

  /* ---------- Conversions inverses (valeur de l'atelier → valeur du fichier) ---------- */
  const lower = v => String(v).toLowerCase();
  const allQ = v => v==='tous' || v==='tout' ? '"all"' : v;
  const avant = (re) => v => { const m = String(v).match(re); return m ? m[1] : v; };
  const cle = f => v => { for (const k of Object.keys(f.src)) if (f(k)===v) return k; return v; };
  const SONsrc = {hi:'salut',hello:'bonjour',bye:'au revoir',yeah:'oui',no:'non',thanks:'merci',wow:'wow',beeps:'bip',ding:'ding',ok:'ok'};
  const INSTRsrc = {snare:'caisse claire','bass-drum':'grosse caisse','side-stick':'rimshot','crash-cymbal':'cymbale crash','open-hi-hat':'charley ouvert','closed-hi-hat':'charley fermé',tambourine:'tambourin','hand-clap':'clappement de main',claves:'claves'};
  const ATTsrc = {tiltleft:'incliné à gauche',tiltright:'incliné à droite',tiltforward:'incliné vers l\'avant',tiltback:'incliné vers l\'arrière',faceup:'écran tourné vers le haut',facedown:'écran tourné vers le bas'};
  const EMOsrc = {sleepy:'en veille',happy:'joyeux',sad:'triste',angry:'en colère',sleep:'endormi',surprised:'surpris',shy:'timide',curious:'curieux'};
  const rev = o => v => { for (const [k, x] of Object.entries(o)) if (x===v) return k; return v; };
  const LEDS_INV = { k0: allQ };
  const INV = {
    'cyberpi.cyberpi_when_button_press':{k0:lower}, 'cyberpi.cyberpi_button_press':{k0:lower}, 'cyberpi.cyberpi_button_count':{k0:lower}, 'cyberpi.cyberpi_button_count_reset':{k0:lower},
    'cyberpi.cyberpi_display_label_show_at_somewhere_with_size':{k0:v => String(Math.max(0, (parseInt(v,10)||1) - 1))},
    'cyberpi.cyberpi_display_label_show_label_xy_with_size':{k0:v => String(Math.max(0, (parseInt(v,10)||1) - 1))},
    'cyberpi.cyberpi_show_led':{k0:v => (Array.isArray(v) ? v : []).slice(0,5).map(c => { const i = LEDCOL.indexOf(String(c).toUpperCase()); return i < 0 ? '1' : String(i); }).join('').padEnd(5,'0')},
    'cyberpi.cyberpi_led_off_2':LEDS_INV, 'cyberpi.cyberpi_led_show_single_with_color_and_time_2':LEDS_INV, 'cyberpi.cyberpi_led_show_single_with_color_2':LEDS_INV,
    'cyberpi.cyberpi_led_show_single_with_rgb_2':LEDS_INV, 'cyberpi.cyberpi_led_show_single_with_rgb_and_time':LEDS_INV,
    'cyberpi.cyberpi_play_audio_until_3':{k0:rev(SONsrc)}, 'cyberpi.cyberpi_play_audio_3':{k0:rev(SONsrc)},
    'cyberpi.cyberpi_play_music_with_note':{k0:v => '\'' + rev(INSTRsrc)(v) + '\''},
    'cyberpi.cyberpi_when_detect_attitude':{k0:v => 'is_' + rev(ATTsrc)(v)},
    'cyberpi.cyberpi_when_detect_action':{k0:v => 'is_' + rev(ACT.src)(v)},
    'cyberpi.cyberpi_set_wifi_channels':{k0:avant(/^(\d+)/)},
    'mbot2.mbot2_encoder_motor_stop':{k0:v => v==='tout' ? 'ALL' : v}, 'mbot2.mbot2_encoder_motor_reset_angle':{k0:v => v==='tout' ? 'ALL' : v},
    'mbot2.mbot2_encoder_motor_set_with_time_angle_and_circle':{k0:avant(/\((EM\d)\)/)},
    'mbot2.mbot2_servo_set_angle':{k0:v => v==='tout' ? 'all' : v}, 'mbot2.mbot2_servo_add_angle':{k0:v => v==='tout' ? 'all' : v},
    'mbot2.mbot2_servo_reset_angle_to_zero':{k0:v => v==='tout' ? 'all' : v}, 'mbot2.mbot2_servo_release_angle':{k0:v => v==='tout' ? 'all' : avant(/(S\d)$/)(v)},
    'cyberpi_mbuild_ultrasonic2.mbuild_ultrasonic2_show_emotion':{k1:rev(EMOsrc)},
    'cyberpi_mbuild_ultrasonic2.mbuild_ultrasonic2_off_led':{k1:allQ}, 'cyberpi_mbuild_ultrasonic2.mbuild_ultrasonic2_add_bri':{k1:allQ}, 'cyberpi_mbuild_ultrasonic2.mbuild_ultrasonic2_set_bri':{k1:allQ},
    'mbuild_quad_color_sensor.BLOCK_1618364921511':{k2:avant(/^\((\d+)\)/)}, 'mbuild_quad_color_sensor.mbuild_quad_color_sensor_get_sta_with_inputMenu':{k2:avant(/^\((\d+)\)/)},
    'mbuild_quad_color_sensor.mbuild_quad_color_sensor_is_line_and_background':{k1:avant(/(R\d|L\d)$/)},
    'mbuild_quad_color_sensor.mbuild_quad_color_sensor_get_rgb_gray_light':{k1:avant(/(R\d|L\d)$/)},
  };
  // menus présents dans mBlock mais pas dans le bloc de l'atelier : valeur écrite par défaut
  const DEFV = {'mbot2.mbot2_encoder_motor_lock_and_unlock':{inputMenu_1:'EM1'}};
  function versFichier(op, k, conv, v){
    const f = INV[op] && INV[op][k]; if (f) return f(v);
    if (conv && conv.src) return rev(conv.src)(v);
    return v; }

  /* ---------- Outils : identifiants, MD5 (nom des images), zip ---------- */
  const ALPHA = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#%()*+,-./:;=?@[]^_`{|}~';
  const uid = () => Array.from({length:20}, () => ALPHA[Math.floor(Math.random()*ALPHA.length)]).join('');
  function md5(str){
    const b = new TextEncoder().encode(str), n = ((b.length + 8 >> 6) + 1) * 16, w = new Array(n).fill(0);
    for (let i=0;i<b.length;i++) w[i>>2] |= b[i] << (i%4*8);
    w[b.length>>2] |= 0x80 << (b.length%4*8); w[n-2] = b.length*8;
    const K = Array.from({length:64}, (_, i) => Math.floor(Math.abs(Math.sin(i+1)) * 2**32) | 0);
    const R = [7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21];
    let a0 = 0x67452301, b0 = 0xefcdab89|0, c0 = 0x98badcfe|0, d0 = 0x10325476;
    for (let j=0;j<n;j+=16){ let A = a0, B = b0, C = c0, D = d0;
      for (let i=0;i<64;i++){ let F, g;
        if (i<16){ F = (B & C) | (~B & D); g = i; } else if (i<32){ F = (D & B) | (~D & C); g = (5*i+1)%16; }
        else if (i<48){ F = B ^ C ^ D; g = (3*i+5)%16; } else { F = C ^ (B | ~D); g = (7*i)%16; }
        const t = D; D = C; C = B; const x = (A + F + K[i] + w[j+g]) | 0; B = (B + ((x << R[i]) | (x >>> (32-R[i])))) | 0; A = t; }
      a0 = (a0 + A) | 0; b0 = (b0 + B) | 0; c0 = (c0 + C) | 0; d0 = (d0 + D) | 0; }
    return [a0,b0,c0,d0].map(x => Array.from({length:4}, (_, i) => ((x >>> (i*8)) & 255).toString(16).padStart(2,'0')).join('')).join(''); }
  const CRC = Array.from({length:256}, (_, n) => { let c = n; for (let k=0;k<8;k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc32 = u => { let c = 0xFFFFFFFF; for (let i=0;i<u.length;i++) c = CRC[(c ^ u[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  function zipStore(files){ // [{name, data:Uint8Array}] → Blob (fichiers non compressés)
    const enc = new TextEncoder(), parts = [], cd = []; let off = 0;
    for (const f of files){ const nm = enc.encode(f.name), crc = crc32(f.data), h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
      h.setUint32(14, crc, true); h.setUint32(18, f.data.length, true); h.setUint32(22, f.data.length, true); h.setUint16(26, nm.length, true);
      parts.push(new Uint8Array(h.buffer), nm, f.data);
      const c = new DataView(new ArrayBuffer(46)); c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true);
      c.setUint32(16, crc, true); c.setUint32(20, f.data.length, true); c.setUint32(24, f.data.length, true); c.setUint16(28, nm.length, true); c.setUint32(42, off, true);
      cd.push(new Uint8Array(c.buffer), nm); off += 30 + nm.length + f.data.length; }
    const cdSize = cd.reduce((s, p) => s + p.length, 0), e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cdSize, true); e.setUint32(16, off, true);
    return new Blob([...parts, ...cd, new Uint8Array(e.buffer)], {type:'application/zip'}); }

  /* ---------- Atelier → project.json ---------- */
  function versProjet(scripts){
    const R = {}; // id du catalogue → opcode d'origine (en mBlock, les blocs CyberPi passent avant les blocs Scratch)
    for (const op of Object.keys(M).sort((a, b) => (SC ? 0 : (b.includes('.') - a.includes('.'))))) if (TPL[op] && !R[M[op][0]]) R[M[op][0]] = op;
    const B = {}, report = new Set(), vars = {}, lists = {}, msgs = {};
    const vid = n => vars[n] || (vars[n] = uid()), lid = n => lists[n] || (lists[n] = uid()), mid = n => msgs[n] || (msgs[n] = uid());
    (S.vars||[]).forEach(vid); (S.lists||[]).forEach(lid); (S.msgs||[]).forEach(mid);
    const procCode = pr => pr.code || pr.params.reduce((s, p) => s + ' ' + (p.t==='l' ? p.name : '%' + (p.t==='b' ? 'b' : (p.t==='n' ? 'n' : 's'))), pr.name);
    const argIds = pr => pr.params.filter(p => p.t!=='l').map(p => p.src || (p.src = uid()));
    const shadow = (opcode, field, val, parent) => { const id = uid(); B[id] = {opcode, next:null, parent, inputs:{}, fields:{[field]:[String(val), null]}, shadow:true, topLevel:false}; return id; };
    function bloc(b, parent){
      const id = uid(), o = {opcode:'', next:null, parent, inputs:{}, fields:{}, shadow:false, topLevel:false};
      if (b.type==='var'){ o.opcode = 'data_variable'; o.fields.VARIABLE = [b.f.k0, vid(b.f.k0)]; B[id] = o; return id; }
      if (b.type==='liste'){ o.opcode = 'data_listcontents'; o.fields.LIST = [b.f.k0, lid(b.f.k0)]; B[id] = o; return id; }
      const mp = b.type.match(/^p(def|call|arg)_(.+?)(?:_(.+))?$/);
      if (mp){ const pr = (S.procs||[]).find(p => p.id===mp[2] || (mp[1]==='arg' && b.type.startsWith('parg_' + p.id + '_')));
        if (!pr){ report.add('bloc personnel supprimé'); return null; }
        const ids = argIds(pr), names = pr.params.filter(p => p.t!=='l');
        if (mp[1]==='def'){ const pid = uid(); o.opcode = 'procedures_definition'; o.inputs.custom_block = [1, pid];
          const pin = {}; names.forEach((p, i) => { const sid = uid(); B[sid] = {opcode: p.t==='b' ? 'argument_reporter_boolean' : 'argument_reporter_string_number', next:null, parent:pid, inputs:{}, fields:{VALUE:[p.name, null]}, shadow:true, topLevel:false}; pin[ids[i]] = [1, sid]; });
          B[pid] = {opcode:'procedures_prototype', next:null, parent:id, inputs:pin, fields:{}, shadow:true, topLevel:false,
            mutation:{tagName:'mutation', children:[], proccode:procCode(pr), argumentids:JSON.stringify(ids), argumentnames:JSON.stringify(names.map(p => p.name)), argumentdefaults:JSON.stringify(names.map(p => p.t==='b' ? 'false' : '')), warp:'false'}};
          B[id] = o; return id; }
        if (mp[1]==='call'){ o.opcode = 'procedures_call'; o.mutation = {tagName:'mutation', children:[], proccode:procCode(pr), argumentids:JSON.stringify(ids), warp:'false'};
          names.forEach((p, i) => { const k = 'p_' + p.id, ch = b.in && b.in[k] ? bloc(b.in[k], id) : null;
            if (p.t==='b'){ if (ch) o.inputs[ids[i]] = [2, ch]; }
            else o.inputs[ids[i]] = ch ? [3, ch, [10, '']] : [1, [10, String(b.f[k] ?? '')]]; });
          B[id] = o; return id; }
        const p = pr.params.find(q => b.type==='parg_' + pr.id + '_' + q.id);
        o.opcode = p && p.t==='b' ? 'argument_reporter_boolean' : 'argument_reporter_string_number'; o.fields.VALUE = [p ? p.name : '', null]; B[id] = o; return id; }
      const op = R[b.type];
      if (!op){ report.add(DEF[b.type] ? (b.f && b.f.k0 && /^inconnu/.test(b.type) ? b.f.k0 : DEF[b.type].txt) : b.type); return null; }
      const m = M[op], conv = m[2] || {}, tp = TPL[op]; o.opcode = op;
      for (const [f, d] of Object.entries(tp.F)) o.fields[f] = [String(d), null];
      m[1].forEach((src, i) => { if (!src) return; const k = 'k' + i, ch = b.in && b.in[k] ? bloc(b.in[k], id) : null;
        let v = b.f ? b.f[k] : undefined; if (v!==undefined) v = versFichier(op, k, conv[k], v);
        const spec = tp.I[src];
        if (spec===undefined){ // champ
          if (src==='VARIABLE') o.fields[src] = [v, vid(v)]; else if (src==='LIST') o.fields[src] = [v, lid(v)];
          else if (src==='BROADCAST_OPTION') o.fields[src] = [v, mid(v)]; else if (v!==undefined) o.fields[src] = [String(v), null];
          return; }
        if (spec==='b'){ if (ch) o.inputs[src] = [2, ch]; return; }
        if (spec===11){ const n = v ?? (S.msgs||[])[0] ?? 'message1'; o.inputs[src] = [1, [11, n, mid(n)]]; return; }
        if (typeof spec==='number'){
          if (ch && B[ch].opcode==='data_variable'){ const [n, vi] = B[ch].fields.VARIABLE; delete B[ch]; o.inputs[src] = [3, [12, n, vi], [spec, '']]; return; }
          o.inputs[src] = ch ? [3, ch, [spec, '']] : [1, [spec, String(v ?? '')]]; return; }
        const [mop, mf] = spec==='M' ? [op + '_' + src + '_menu', op + '_' + src + '_menu_option'] : spec;
        const sh = shadow(mop, mf, v ?? '', id); o.inputs[src] = ch ? [3, ch, sh] : [1, sh]; });
      for (const [src, spec] of Object.entries(tp.I)) if (!o.inputs[src] && (spec==='M' || Array.isArray(spec)) && DEFV[op] && DEFV[op][src]!=null){
        const [mop, mf] = spec==='M' ? [op + '_' + src + '_menu', op + '_' + src + '_menu_option'] : spec; o.inputs[src] = [1, shadow(mop, mf, DEFV[op][src], id)]; }
      if (op==='control_stop') o.mutation = {tagName:'mutation', children:[], hasnext: /other/.test(o.fields.STOP_OPTION[0]) ? 'true' : 'false'};
      if (b.body){ const f = pile(b.body, id); if (f) o.inputs.SUBSTACK = [2, f]; }
      if (b.body2){ const f = pile(b.body2, id); if (f) o.inputs.SUBSTACK2 = [2, f]; }
      B[id] = o; return id; }
    function pile(list, parent){ let first = null, prev = null;
      for (const b of list){ const id = bloc(b, prev || parent); if (!id) continue;
        if (prev) B[prev].next = id; else first = id; prev = id; }
      return first; }
    for (const sc of scripts){ const first = pile(sc.list, null); if (first){ B[first].topLevel = true; B[first].parent = null; B[first].x = Math.round(sc.x); B[first].y = Math.round(sc.y); } }
    const inv = o => Object.fromEntries(Object.entries(o).map(([n, id]) => [id, n]));
    return {blocks:B, report,
      variables: Object.fromEntries(Object.entries(vars).map(([n, id]) => [id, [n, 0]])),
      lists: Object.fromEntries(Object.entries(lists).map(([n, id]) => [id, [n, []]])),
      broadcasts: inv(msgs)};
  }

  /* ---------- Fichier final ---------- */
  const SVG_SCENE = '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="0 0 480 360"><rect width="480" height="360" fill="#ffffff"/></svg>';
  const SVG_LUTIN = '<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60"><rect x="4" y="4" width="52" height="52" rx="12" fill="#4C97FF" stroke="#3373CC" stroke-width="3"/><circle cx="22" cy="26" r="5" fill="#fff"/><circle cx="38" cy="26" r="5" fill="#fff"/><path d="M20 40 Q30 47 40 40" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/></svg>';
  const SVG_CYBERPI = '<svg xmlns="http://www.w3.org/2000/svg" width="94" height="110" viewBox="0 0 94 110"><rect x="3" y="3" width="88" height="104" rx="14" fill="#2F3542" stroke="#05A6FF" stroke-width="4"/><rect x="17" y="18" width="60" height="44" rx="4" fill="#05A6FF"/><circle cx="47" cy="86" r="9" fill="#05A6FF"/></svg>';
  const costume = (name, svg, cx, cy) => { const h = md5(svg); return {meta:{name, bitmapResolution:1, dataFormat:'svg', assetId:h, md5ext:h + '.svg', rotationCenterX:cx, rotationCenterY:cy}, file:{name:h + '.svg', svg}}; };
  function fabriquer(scripts){
    const P = versProjet(scripts), enc = new TextEncoder();
    const sc = costume('backdrop1', SVG_SCENE, 240, 180);
    const stage = {isStage:true, name:'Stage', variables:P.variables, lists:P.lists, broadcasts:P.broadcasts, blocks:{}, comments:{}, currentCostume:0, costumes:[sc.meta], sounds:[], volume:100, layerOrder:0, tempo:60, videoTransparency:50, videoState:'off', textToSpeechLanguage:null};
    let targets, extra = [], files = [sc.file];
    if (SC){
      const lu = costume('costume1', SVG_LUTIN, 30, 30); files.push(lu.file);
      targets = [stage, {isStage:false, name:'Sprite1', variables:{}, lists:{}, broadcasts:{}, blocks:P.blocks, comments:{}, currentCostume:0, costumes:[lu.meta], sounds:[], volume:100, layerOrder:1, visible:true, x:0, y:0, size:100, direction:90, draggable:false, rotationStyle:'all around'}];
    } else {
      const cp = costume('cyberpi', SVG_CYBERPI, 47, 55); files.push(cp.file);
      targets = [stage, {isStage:false, name:'cyberpi', variables:{}, lists:{}, broadcasts:{}, blocks:P.blocks, comments:{}, currentCostume:0, costumes:[cp.meta], sounds:[], volume:100, layerOrder:1, visible:false, x:0, y:0, size:100, direction:90, draggable:false, rotationStyle:'all around',
        deviceId:'cyberpi', loadedExtIds:['mbot2','cyberpi_mbuild_ultrasonic2','mbuild_quad_color_sensor'], editorMode:'block', codes:null, codeTypes:'python', online:true}];
      const ids = [uid(), uid()];
      extra = [{name:'mblock5', text:JSON.stringify({version:'5.6.0', createdAt:Date.now()})},
        {name:'mscratch.json', text:JSON.stringify({spritesState:{[ids[0]]:{id:ids[0], name:'Stage', deviceId:null, codeTypes:['python'], editorMode:'block', isEditing:false},
          [ids[1]]:{id:ids[1], name:'cyberpi', deviceId:'cyberpi', codeTypes:['python'], editorMode:'block', online:true, isEditing:true}},
          extensions:{sprites:{isScratch:false}, stage:{isScratch:false}, cyberpi:{isScratch:false, version:'1.1.38'}, mbot2:{isScratch:false, version:'0.0.13'}, cyberpi_mbuild_ultrasonic2:{isScratch:false, version:'0.0.3'}, mbuild_quad_color_sensor:{isScratch:false, version:'0.0.8'}}})}];
    }
    const usesPen = Object.values(P.blocks).some(b => /^pen_/.test(b.opcode));
    const proj = {targets, monitors:[], extensions: SC ? (usesPen ? ['pen'] : []) : ['mbot2-mbot2','cyberpi-cyberpi','cyberpi','mbuild'],
      meta:{semver:'3.0.0', vm:'2.0.13', agent:'Atelier blocs ' + APP_VERSION}};
    const zf = [{name:'project.json', data:enc.encode(JSON.stringify(proj))}, ...files.map(f => ({name:f.name, data:enc.encode(f.svg)})), ...extra.map(f => ({name:f.name, data:enc.encode(f.text)}))];
    return {blob: zipStore(zf), report:P.report, proj}; }
  window.atelierExport = fabriquer;   // pour les tests

  function exporter(){
    if (!S.scripts.length) return note('La zone de travail est vide : il n\'y a rien à exporter.');
    const ext = SC ? '.sb3' : '.mblock', sel = S.scripts.find(s => s.id===selected);
    dialog(`<p style="margin:0 0 6px;font-weight:600">Exporter vers ${SC ? 'Scratch 3' : 'mBlock 5'}</p>
      <p class="muted" style="margin:0 0 10px">Le fichier ${ext} s'ouvre dans ${SC ? 'Scratch (Fichier › Charger depuis votre ordinateur)' : 'mBlock (Fichier › Ouvrir depuis votre ordinateur)'}. ${SC ? 'Les programmes vont dans le lutin « Sprite1 ».' : 'Les programmes vont dans l\'appareil CyberPi.'}</p>
      <label style="display:flex;gap:6px;align-items:center;cursor:pointer;margin:4px 0"><input type="radio" name="qui" value="tous" checked> Tous les programmes (${S.scripts.length})</label>
      <label style="display:flex;gap:6px;align-items:center;cursor:pointer;margin:4px 0;${sel ? '' : 'opacity:.5'}"><input type="radio" name="qui" value="sel" ${sel ? '' : 'disabled'}> Seulement le programme sélectionné</label>
      <label class="muted" style="display:block;margin-top:10px">Nom du fichier</label><input class="enom" style="width:100%;font:inherit;padding:8px;border:1px solid #CBD5E1;border-radius:8px;margin-top:4px">
      <div class="row"><button class="no">Annuler</button><button class="pri ok">⬇ Exporter</button></div>`, (ov, close) => {
      const nm = ov.querySelector('.enom'); nm.value = 'Atelier blocs';
      ov.querySelector('.no').onclick = close;
      ov.querySelector('.ok').onclick = async () => {
        const qui = ov.querySelector('input[name=qui]:checked').value, liste = qui==='sel' && sel ? [sel] : S.scripts;
        const r = fabriquer(liste); close();
        await saveFile((nm.value.trim() || 'Atelier blocs').replace(/\.(sb3|mblock)$/i, '') + ext, r.blob);
        if (r.report.size) note('Fichier exporté. Blocs laissés de côté (pas d\'équivalent connu dans ' + (SC ? 'Scratch' : 'mBlock') + ') : ' + [...r.report].join(', ') + '.');
      };
    });
  }
  const bex = document.getElementById('bExport'); if (bex) bex.onclick = exporter;
  window.atelierExporter = exporter;
})();
