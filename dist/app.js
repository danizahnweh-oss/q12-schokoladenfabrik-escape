(() => {
  'use strict';
  const rooms = window.ROOMS, glossary = window.GLOSSARY;
  const key = 'schokoladenfabrik-q12-v1';
  const main = document.querySelector('#main'), modal = document.querySelector('#modal');
  let current = { view: 'home', room: 0 }, saveTimer, toastTimer, storageAvailable = true, initialWarning = '';
  const blank = () => ({ version: 1, name: '', team: '', settings: { motion: true, sound: false, dark: false, large: false }, rooms: rooms.map(() => ({ notes: ['', '', ''], answers: ['', '', '', ''], completed: false, released: false, hints: 0, marked: [], page: 0 })), updated: null });
  const E = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icons = {
    lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
    unlock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 7.5-2M12 14v3"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    book: '<path d="M12 5c-3-2-6-2-10-1v15c4-1 7-1 10 1 3-2 6-2 10-1V4c-4-1-7-1-10 1Zm0 0v15"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-2 6-6 2 2-6Z"/>',
    factory: '<path d="M3 21V10l6 3V8l6 3V3h4l2 18ZM7 17h1m4 0h1m4 0h1"/>',
    package: '<path d="m3 7 9-5 9 5v10l-9 5-9-5ZM3 7l9 5 9-5M12 12v10M7.5 4.5l9 5"/>',
    layers: '<path d="m3 7 9-5 9 5-9 5ZM3 12l9 5 9-5M3 17l9 5 9-5"/>',
    shield: '<path d="M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6ZM8 12l3 3 5-6"/>',
    scale: '<path d="M12 3v18M5 21h14M4 7h16M6 7l-4 8h8ZM18 7l-4 8h8"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    people: '<circle cx="9" cy="7" r="3"/><path d="M3 20v-3a6 6 0 0 1 12 0v3M17 4a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 4v2"/>',
    bulb: '<path d="M8 18h8M9 21h6M8 15c-5-4-3-12 4-12s9 8 4 12v3H8Z"/>',
    file: '<path d="M14 2H5v20h14V7ZM14 2v5h5M8 12h8M8 16h8"/>',
    trophy: '<path d="M8 3h8v7a4 4 0 0 1-8 0ZM8 5H3v3c0 3 3 4 5 4M16 5h5v3c0 3-3 4-5 4M12 14v6M8 21h8"/>'
  };
  const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.file}</svg>`;
  function validate(value) {
    if (!value || value.version !== 1 || !Array.isArray(value.rooms) || value.rooms.length !== rooms.length) throw new Error('Dieses Backup passt nicht zu diesem Lernspiel.');
    const result = blank();
    for (const prop of ['name', 'team']) {
      if (typeof value[prop] !== 'string' || value[prop].length > 120) throw new Error('Die Angaben zum Ermittlungsheft sind ungültig.');
      result[prop] = value[prop];
    }
    if (!value.settings || typeof value.settings !== 'object') throw new Error('Die Einstellungen fehlen.');
    for (const prop of ['motion', 'sound', 'dark', 'large']) if (typeof value.settings[prop] === 'boolean') result.settings[prop] = value.settings[prop];
    value.rooms.forEach((r, i) => {
      if (!r || !Array.isArray(r.notes) || r.notes.length !== 3 || r.notes.some(x => typeof x !== 'string' || x.length > 30000) || !Array.isArray(r.answers) || r.answers.length !== 4 || r.answers.some(x => typeof x !== 'string' || x.length > 100) || typeof r.completed !== 'boolean' || typeof r.released !== 'boolean' || !Number.isInteger(r.hints) || r.hints < 0 || r.hints > 3 || !Array.isArray(r.marked) || r.marked.some(x => !Number.isInteger(x) || x < 0 || x >= rooms[i].sections.length)) throw new Error(`Die Daten in Raum ${i + 1} sind ungültig.`);
      r.answers.forEach((answer, j) => { const ex = rooms[i].exercises[j]; if (answer && ex.type !== 'number' && !ex.options.some(o => o[0] === answer)) throw new Error('Das Backup enthält unbekannte Rätselantworten.'); });
      result.rooms[i] = { notes: [...r.notes], answers: [...r.answers], completed: r.completed, released: r.released, hints: r.hints, marked: [...new Set(r.marked)], page: Number.isInteger(r.page) && r.page >= 0 && r.page < rooms[i].sections.length ? r.page : 0 };
    });
    result.updated = typeof value.updated === 'string' ? value.updated : null;
    return result;
  }
  let state;
  try { const raw = localStorage.getItem(key); state = raw ? validate(JSON.parse(raw)) : blank(); }
  catch (error) { state = blank(); initialWarning = 'Gespeicherte Daten konnten nicht geladen werden. Bitte importiere dein letztes Backup. Neue Arbeit bleibt zunächst nur in dieser Sitzung.'; storageAvailable = false; }
  function persist() {
    clearTimeout(saveTimer);
    state.updated = new Date().toISOString();
    try {
      if (!storageAvailable) throw new Error('storage unavailable');
      localStorage.setItem(key, JSON.stringify(state));
      document.querySelector('#save-status').textContent = 'Auf diesem Gerät gespeichert';
    } catch (error) {
      storageAvailable = false;
      document.querySelector('#save-status').textContent = 'Nur in dieser Sitzung · bitte Backup exportieren';
      if (!initialWarning) { toast('Speichern ist nicht verfügbar. Exportiere bitte regelmäßig dein Ermittlungsheft.'); initialWarning = 'storage'; }
    }
  }
  function queueSave() { document.querySelector('#save-status').textContent = 'Speichert …'; clearTimeout(saveTimer); saveTimer = setTimeout(persist, 450); }
  function toast(message) { const t = document.querySelector('#toast'); t.textContent = message; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 4600); }
  function settings() { document.body.classList.toggle('motion-off', !state.settings.motion); document.body.classList.toggle('dark-reader', state.settings.dark); document.body.classList.toggle('reading-large', state.settings.large); }
  const available = i => i === 0 || state.rooms[i].released || state.rooms[i].completed || state.rooms[i - 1].completed;
  const done = () => state.rooms.filter(r => r.completed).length;
  const status = i => state.rooms[i].completed ? 'Abgeschlossen' : available(i) ? 'Jetzt zugänglich' : 'Verschlossen';
  function navigate(view, index = 0) {
    if (view === 'room' && !available(index)) { toast(`Öffne zuerst die Tür in ${rooms[index - 1].name}.`); return; }
    const hash = view === 'room' ? `#raum/${index + 1}` : view === 'home' ? '#' : `#${view}`;
    if (location.hash === hash || (hash === '#' && !location.hash)) route(); else location.hash = hash;
  }
  function route() {
    persist();
    const match = location.hash.match(/^#raum\/([1-6])$/);
    if (match) {
      const i = Number(match[1]) - 1;
      if (!available(i)) { toast('Dieser Raum ist noch verschlossen. Beginne im Strategiebüro.'); history.replaceState(null, '', location.pathname + location.search); current = { view: 'home', room: 0 }; }
      else current = { view: 'room', room: i };
    } else current = { view: ['notebook','teacher'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'home', room: 0 };
    render(); main.focus({ preventScroll: true }); window.scrollTo(0, 0);
  }
  function render() {
    settings();
    document.querySelectorAll('.nav-button').forEach(b => b.removeAttribute('aria-current'));
    document.querySelector(`.nav-button[data-action="${current.view === 'room' ? 'home' : current.view}"]`)?.setAttribute('aria-current', 'page');
    if (current.view === 'home') renderHome();
    else if (current.view === 'room') renderRoom(current.room);
    else if (current.view === 'notebook') renderNotebook();
    else renderTeacher();
    document.title = `${current.view === 'room' ? rooms[current.room].name : current.view === 'notebook' ? 'Ermittlungsheft' : current.view === 'teacher' ? 'Lehrkraft' : 'Die verschlossene Schokoladenfabrik'} · Q12`;
  }
  function renderHome() {
    const next = state.rooms.findIndex(r => !r.completed);
    main.innerHTML = `<section class="hero" aria-labelledby="hero-title"><div class="factory-stage"><img src="assets/factory.png" alt="Isometrischer Schnitt einer Backsteinfabrik bei Abendlicht: Strategiebüro, Kupferkessel in der Produktion, Einkauf, Kakaolager, Prüfarchiv und Geschäftsleitung." width="1536" height="1024" fetchpriority="high">${rooms.map((r,i) => `<button class="map-pin" data-action="room" data-room="${i}" aria-disabled="${!available(i)}" aria-label="${E(r.name)}: ${status(i)}">${icon(state.rooms[i].completed ? 'check' : available(i) ? r.icon : 'lock')}${E(r.name)}</button>`).join('')}</div><div class="hero-copy"><span class="case-tag">Der Fall Heller & Söhne</span><h1 id="hero-title">Eine Fabrik.<br>Sechs Türen.<br><em>Euer Neustart.</em></h1><p>Die Produktion steht still. Entschlüsselt die Akten, verbindet die Hinweise und bringt die Schokoladenfabrik wieder auf Kurs.</p><div class="hero-actions"><button class="button" data-action="${next < 0 ? 'notebook' : 'room'}" ${next < 0 ? '' : `data-room="${next}"`}>${next < 0 ? 'Ermittlungsheft öffnen' : done() ? 'Mission fortsetzen' : 'Mission beginnen'}${icon('arrow')}</button><button class="text-button" data-action="instructions">So funktioniert’s</button></div><div class="hero-meta"><span>${icon('clock')}4 Doppelstunden</span><span>${icon('people')}2–3 Personen pro Team</span></div></div></section><section class="journey" id="doors" aria-labelledby="journey-title"><div class="journey-heading"><div><h2 id="journey-title">Euer Weg durch die Fabrik</h2><p>Jede geöffnete Tür bringt euch dem Neustart näher.</p></div><div class="progress-area"><span>${done()} von 6 Türen geöffnet</span><div class="progress-track" role="progressbar" aria-label="Geöffnete Türen" aria-valuemin="0" aria-valuemax="6" aria-valuenow="${done()}"><div class="progress-fill" style="width:${done()/6*100}%"></div></div></div></div><div class="door-row">${rooms.map((r,i) => `<button class="room-door ${state.rooms[i].completed ? 'complete' : available(i) ? 'available' : ''}" data-action="room" data-room="${i}" aria-disabled="${!available(i)}" aria-label="Raum ${i+1}: ${E(r.name)}, ${status(i)}"><span class="door-index">Raum ${i+1}${icon(r.icon)}</span><span class="door-picture" aria-hidden="true"><span class="door-leaf"><span class="door-window"></span><span class="door-handle"></span></span></span><span class="door-name">${E(r.name)}</span><span class="door-state">${icon(state.rooms[i].completed ? 'check' : available(i) ? 'unlock' : 'lock')}${status(i)}</span></button>`).join('')}</div></section>${done() === 6 ? finishPanel() : ''}<section class="mission-strip" aria-label="Drei Schritte der Mission"><article><h3>${icon('file')}Akten entschlüsseln</h3><p>Lest anspruchsvolle Texte, markiert Belege und erklärt die Zusammenhänge in eigenen Worten.</p></article><article><h3>${icon('book')}Erkenntnisse sichern</h3><p>Euer persönliches Ermittlungsheft sammelt Entscheidungen und Belege. Es bleibt auf diesem Gerät gespeichert.</p></article><article><h3>${icon('lock')}Türen öffnen</h3><p>Löst Fachrätsel, kombiniert Kennziffern und öffnet den nächsten Raum. Hilfen sind jederzeit erlaubt.</p></article></section>`;
  }
  function finishPanel() { return `<section class="finish-panel">${icon('trophy')}<h2>Die Fabrik kann neu starten.</h2><p>Alle sechs Türen sind geöffnet. Eure Entscheidungsvorlage ist bereit für die Präsentation. Besprecht Belege, Gegenargumente und offene Fragen gemeinsam.</p><div class="button-group"><button class="button" data-action="notebook">Ermittlungsheft sichern${icon('arrow')}</button><button class="button secondary" data-action="presentation">Präsentationsauftrag</button></div></section>`; }
  function fieldHTML(r, i, j) {
    const f = r.fields[j], value = state.rooms[i].notes[j], count = value.trim().length;
    return `<div class="field"><label for="note-${j}">${E(f.label)}</label><p class="prompt" id="prompt-${j}">${E(f.prompt)}</p><textarea id="note-${j}" data-note="${j}" data-room="${i}" maxlength="30000" aria-describedby="prompt-${j} note-meta-${j}" placeholder="Eure Erklärung, euer Beleg, eure Begründung …">${E(value)}</textarea><div class="field-meta" id="note-meta-${j}"><span>${count} Zeichen</span><span class="${count >= f.min ? 'ready' : ''}">${count >= f.min ? '✓ Eintrag vorhanden' : `Mindestens ${f.min} Zeichen als Arbeitsnachweis`}</span></div></div>`;
  }
  function exerciseHTML(r, i, j) {
    const ex = r.exercises[j], answer = state.rooms[i].answers[j];
    return `<div class="field puzzle-field"><label for="answer-${j}">${j + 1}. ${E(ex.label)}</label>${ex.type === 'number' ? `<div class="number-wrap"><input id="answer-${j}" data-answer="${j}" data-room="${i}" type="number" min="0" max="99" step="1" inputmode="numeric" value="${E(answer)}" aria-describedby="suffix-${j}"><span id="suffix-${j}">${E(ex.suffix)}</span></div>` : `<select id="answer-${j}" data-answer="${j}" data-room="${i}"><option value="">Bitte zuordnen</option>${ex.options.map(([v,label]) => `<option value="${E(v)}" ${answer === v ? 'selected' : ''}>${E(label)}</option>`).join('')}</select>`}</div>`;
  }
  function graphic(i) {
    const sets = [ [['compass','Gesamtstrategie'],['people','Abteilungen'],['factory','Maßnahmen']], [['package','Annahme'],['factory','Herstellung'],['shield','Freigabe'],['package','Versand']], [['package','Bedarf'],['scale','Alternativen'],['check','Entscheidung']], [['package','Bestand'],['clock','Verbrauch'],['layers','Reichweite']], [['file','Befund'],['shield','Maßnahme'],['check','Wirksamkeit']], [['file','Belege'],['scale','Abwägung'],['compass','Urteil']] ];
    return `<p class="concept-graphic-title">Die Denkspur in diesem Raum</p><div class="concept-graphic" aria-label="${sets[i].map(s=>s[1]).join(', dann ')}">${sets[i].map(([ic,label],j) => `${j ? '<span class="concept-arrow" aria-hidden="true">→</span>' : ''}<span class="concept-step">${icon(ic)}${label}</span>`).join('')}</div>`;
  }
  function renderRoom(i) {
    const r = rooms[i], s = state.rooms[i];
    main.innerHTML = `<div class="page"><div class="breadcrumb"><button data-action="home">← Fabrikplan</button><span>/</span><span>Raum ${i+1} von 6</span></div><div class="room-heading"><span class="room-number" aria-hidden="true">0${i+1}</span><div><h1>${E(r.name)}</h1><p>${E(r.subtitle)} · ${E(r.time)}</p></div></div><nav class="room-tabs" aria-label="Räume">${rooms.map((room,j)=>`<button data-action="room" data-room="${j}" class="${i===j?'current':''}" ${i===j?'aria-current="page"':''} aria-disabled="${!available(j)}">${j+1}. ${E(room.name)}${!available(j)?' 🔒':''}</button>`).join('')}</nav><div class="briefing">${icon(r.icon)}<p><strong>Nachricht aus der Fabrik</strong>${E(r.dispatch)}</p></div>${s.completed?`<div class="complete-banner"><strong>Tür geöffnet. Eure Arbeit bleibt bearbeitbar.</strong>${i<5?'Der nächste Raum ist jetzt zugänglich.':'Alle Türen sind offen. Sichert euer Ermittlungsheft.'} <button class="text-button" data-action="${i<5?'room':'notebook'}" ${i<5?`data-room="${i+1}"`:''}>${i<5?'Zum nächsten Raum →':'Zum Ermittlungsheft →'}</button></div>`:''}<div class="workspace"><article class="document" aria-labelledby="document-title"><div class="document-header"><span class="document-label">${E(r.document)} · ${r.sections.reduce((n,s)=>n+s.text.split(/\s+/).length,0)} Wörter</span><h2 id="document-title">${E(r.subtitle)}</h2><p>${E(r.intro)}</p>${r.legalNote?`<div class="legal-note">${E(r.legalNote)}</div>`:''}<div class="reading-tools"><button data-action="glossary">Fachbegriffe nachschlagen</button><button data-action="large" aria-pressed="${state.settings.large}">${state.settings.large?'Text kleiner':'Text größer'}</button><span>Absätze als Belege markieren</span></div></div><div class="document-body">${r.sections.map((sec,j)=>`<section class="paragraph ${s.marked.includes(j)?'marked':''}" id="absatz-${j+1}"><h3><span>${j+1}</span>${E(sec.title)}</h3><p>${E(sec.text)}</p><button class="mark-button" data-action="mark" data-paragraph="${j}" aria-pressed="${s.marked.includes(j)}" aria-label="Absatz ${j+1} ${s.marked.includes(j)?'Markierung entfernen':'markieren'}">${s.marked.includes(j)?'✓ Absatz markiert':'Absatz markieren'}</button></section>`).join('')}</div><footer class="document-source"><p>Quellen und Einordnung</p>${r.sources.map(source=>`<p>${source.url?`<a href="${E(source.url)}" target="_blank" rel="noopener noreferrer">${E(source.label)} ↗</a>`:E(source.label)}</p>`).join('')}<p>Eigenständiger Lerntext. Heller & Söhne und sämtliche Unternehmensdaten sind fiktiv.</p></footer></article><aside class="workbench" aria-label="Arbeitsbereich"><section class="work-panel"><div class="panel-top">${icon('book')}<h2>Ermittlungsheft</h2><span class="small-badge">Akte ${String.fromCharCode(65+i)}</span></div><p>Haltet eure Ergebnisse in eigenen Worten fest. Die Mindestlänge prüft den Arbeitsstand, nicht die fachliche Qualität.</p>${r.fields.map((_,j)=>fieldHTML(r,i,j)).join('')}<button class="text-button" data-action="notebook">Alle bisherigen Einträge ansehen →</button></section><section class="work-panel"><div class="panel-top">${icon('compass')}<h2>Das Fachrätsel</h2></div><p>${E(r.puzzle)}</p>${r.exercises.map((_,j)=>exerciseHTML(r,i,j)).join('')}<button class="button secondary" data-action="check">Zuordnungen prüfen${icon('check')}</button><div id="puzzle-feedback" class="check-feedback" role="status" aria-live="polite"></div><div class="hint-box"><div class="hint-top"><button data-action="hint">${icon('bulb')} ${s.hints<3?'Nächsten Hinweis öffnen':'Alle Hinweise geöffnet'}</button><small id="hint-count">${s.hints} / 3 Hilfen</small></div><div id="hints">${r.hints.slice(0,s.hints).map((h,j)=>`<p class="hint-text"><strong>Hinweis ${j+1}</strong><br>${E(h)}</p>`).join('')}</div></div></section><section class="lock-panel"><h2>${icon(s.completed?'unlock':'lock')}${i===5?'Das letzte Schloss':'Das Türschloss'}</h2><p>Alle vier Rätselantworten müssen stimmen und die drei Einträge vorhanden sein. Gebt dann die Kennziffern als vierstelligen Code ein.</p><form class="code-form" id="code-form"><div class="field"><label for="door-code">Vierstelliger Türcode</label><input id="door-code" name="code" type="text" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="off" required aria-describedby="lock-feedback" placeholder="· · · ·"></div><button class="button" type="submit">Tür öffnen${icon('unlock')}</button></form><div id="lock-feedback" class="check-feedback" role="status" aria-live="polite"></div></section>${graphic(i)}</aside></div></div>`;
    installBinder(i);
  }
  function installBinder(i) {
    const r=rooms[i],article=document.querySelector('.document'),body=document.querySelector('.document-body');
    article.classList.add('binder');
    article.classList.add('case-dossier');
    article.insertAdjacentHTML('afterbegin',`<div class="folder-tab" aria-hidden="true">AKTE ${String.fromCharCode(65+i)} · HELLER & SÖHNE</div><div class="dossier-band"><span>${icon('file')}Interne Ermittlungsakte</span><span class="case-reference">H&amp;S / Q12 / 0${i+1}</span></div>`);
    article.querySelector('.document-header').insertAdjacentHTML('afterbegin','<span class="confidential-stamp" aria-hidden="true">VERTRAULICH</span>');
    body.id='binder-pages';
    body.insertAdjacentHTML('beforebegin', `<div class="binder-toolbar"><span>Eine Seite pro Absatz</span><nav class="binder-pages-nav" aria-label="Seiten dieser Akte">${r.sections.map((sec,j)=>`<button data-action="page" data-page="${j}" aria-label="Seite ${j+1}: ${E(sec.title)}" aria-controls="binder-pages">${j+1}</button>`).join('')}</nav></div>`);
    body.insertAdjacentHTML('afterbegin','<span class="binder-rings" aria-hidden="true"><i></i><i></i><i></i></span>');
    body.insertAdjacentHTML('afterend','<nav class="binder-pagination" aria-label="In der Akte blättern"><button id="binder-prev" data-action="prev-page" aria-label="Vorherige Seite">← <span>Zurück</span></button><span id="binder-counter" role="status" aria-live="polite"></span><button id="binder-next" data-action="next-page" aria-label="Nächste Seite"><span>Weiter</span> →</button></nav>');
    updateBinder(i,false);
  }
  function updateBinder(i,animate=true,direction=1) {
    const active=state.rooms[i].page,body=document.querySelector('.document-body');
    body.querySelectorAll('.paragraph').forEach((p,j)=>{p.hidden=j!==active;});
    document.querySelectorAll('.binder-pages-nav button').forEach((b,j)=>{if(j===active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
    document.querySelector('#binder-counter').textContent=`Blatt ${String(active+1).padStart(2,'0')} / ${String(rooms[i].sections.length).padStart(2,'0')}`;
    document.querySelector('#binder-prev').disabled=active===0;
    document.querySelector('#binder-next').disabled=active===rooms[i].sections.length-1;
    if(animate && state.settings.motion && !matchMedia('(prefers-reduced-motion: reduce)').matches){
      const page=body.querySelector('.paragraph:not([hidden])');
      if(page.animate)page.animate([{transform:`perspective(1000px) rotateY(${direction*7}deg) translateX(${direction*10}px)`},{transform:'perspective(1000px) rotateY(0deg) translateX(0px)'}],{duration:320,easing:'cubic-bezier(.16,1,.3,1)'});
    }
  }
  function turnPage(target) {
    if(current.view!=='room')return;
    const i=current.room,previous=state.rooms[i].page,next=Math.max(0,Math.min(rooms[i].sections.length-1,target));
    if(previous===next)return;
    state.rooms[i].page=next;updateBinder(i,true,next>previous?1:-1);persist();
  }
  function notesReady(i) { return rooms[i].fields.map((f,j)=>state.rooms[i].notes[j].trim().length >= f.min); }
  function answersReady(i) { return rooms[i].exercises.map((ex,j)=>state.rooms[i].answers[j].trim() === ex.answer); }
  function checkPuzzle() {
    const good = answersReady(current.room);
    good.forEach((ok,j)=>document.querySelector(`#answer-${j}`).setAttribute('aria-invalid', String(!ok)));
    const feedback = document.querySelector('#puzzle-feedback');
    feedback.className = `check-feedback ${good.every(Boolean)?'good':'error'}`;
    feedback.textContent = good.every(Boolean) ? 'Alle vier Antworten stimmen. Lest nun die Kennziffern in der geforderten Reihenfolge und ergänzt eure Einträge.' : `Prüft noch ${good.map((ok,j)=>ok?null:`Aufgabe ${j+1}`).filter(Boolean).join(', ')}. Nutzt die Akte oder eine Hilfestufe.`;
  }
  function openDoor() {
    const i = current.room, feedback = document.querySelector('#lock-feedback');
    const pending = notesReady(i).map((ok,j)=>ok?null:j+1).filter(Boolean);
    const answers = answersReady(i);
    feedback.className = 'check-feedback error';
    if (pending.length) { feedback.textContent = `Ergänzt zuerst Eintrag ${pending.join(' und ')} im Ermittlungsheft. Die geforderte Mindestlänge steht jeweils unter dem Feld.`; return; }
    if (!answers.every(Boolean)) { feedback.textContent = 'Prüft zuerst die vier Fachaufgaben. Ein Code allein reicht zum Öffnen noch nicht.'; checkPuzzle(); return; }
    if (document.querySelector('#door-code').value.trim() !== rooms[i].code) { feedback.textContent = 'Der Code passt noch nicht. Prüft die Reihenfolge der Kennziffern. Eure Einträge bleiben erhalten.'; document.querySelector('#door-code').setAttribute('aria-invalid','true'); return; }
    state.rooms[i].completed = true; persist();
    sound();
    const overlay = document.querySelector('#unlock-overlay');
    const reduced = !state.settings.motion || matchMedia('(prefers-reduced-motion: reduce)').matches;
    feedback.className = 'check-feedback good'; feedback.textContent = 'Code richtig. Die Tür öffnet sich.';
    if (!reduced) overlay.classList.add('show');
    setTimeout(()=>{overlay.classList.remove('show');if (i<5) navigate('room',i+1);else {navigate('home');toast('Alle Türen geöffnet. Euer Unternehmensplan ist bereit.');}},reduced?100:950);
  }
  function sound() {
    if (!state.settings.sound) return;
    try {const ctx = new (window.AudioContext || window.webkitAudioContext)();const osc=ctx.createOscillator(), gain=ctx.createGain();osc.type='sine';osc.frequency.setValueAtTime(440,ctx.currentTime);osc.frequency.exponentialRampToValueAtTime(660,ctx.currentTime+.18);gain.gain.setValueAtTime(.0001,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.07,ctx.currentTime+.02);gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+.35);osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+.4);osc.onended=()=>ctx.close();}catch(e){/* Ton ist optional. */}
  }
  function showModal(title, html) { document.querySelector('#modal-title').textContent=title;document.querySelector('#modal-body').innerHTML=html;if(!modal.open)modal.showModal(); }
  function renderNotebook() {
    main.innerHTML = `<div class="page"><div class="book-heading"><div><h1>Euer Ermittlungsheft</h1><p>Belege, Erkenntnisse und Entscheidungen aus allen sechs Akten. Persönliche Einträge bleiben in diesem Browser. Sichert ein Backup für einen Gerätewechsel.</p></div><div class="button-group"><button class="button" data-action="export-md">Heft herunterladen${icon('book')}</button><button class="button secondary" data-action="print">Drucken / PDF</button></div></div><div class="profile-row"><div class="field"><label for="profile-name">Name oder Kürzel (optional)</label><input id="profile-name" data-profile="name" maxlength="120" value="${E(state.name)}" autocomplete="off"></div><div class="field"><label for="profile-team">Team (optional)</label><input id="profile-team" data-profile="team" maxlength="120" value="${E(state.team)}" autocomplete="off"></div><button class="button secondary" data-action="export-json">Backup sichern</button><button class="text-button" data-action="import">Backup importieren</button></div><p class="print-only">Name: ${E(state.name||'________________')} · Team: ${E(state.team||'________________')}</p>${rooms.map((r,i)=>`<article class="book-entry"><h2>${icon(r.icon)}${i+1}. ${E(r.name)}<span class="entry-state">${status(i)}</span></h2><p class="entry-meta">${E(r.topic)} · ${notesReady(i).filter(Boolean).length}/3 Einträge vorhanden</p><dl>${r.fields.map((f,j)=>`<dt>${E(f.label)}</dt><dd>${state.rooms[i].notes[j]?E(state.rooms[i].notes[j]):'<span class="empty-note">Hier wartet noch eure Erkenntnis.</span>'}</dd>`).join('')}</dl><p class="marks-summary">Markierte Belege: ${state.rooms[i].marked.length?state.rooms[i].marked.map(m=>`Absatz ${m+1}`).join(', '):'noch keine'}</p><button class="button secondary" data-action="room" data-room="${i}" aria-disabled="${!available(i)}">${available(i)?'Einträge weiterbearbeiten':'Raum noch verschlossen'}${icon(available(i)?'arrow':'lock')}</button></article>`).join('')}</div>`;
  }
  function renderTeacher() {
    main.innerHTML = `<div class="page"><div class="book-heading"><div><h1>Für die Lehrkraft</h1><p>Unterrichtsablauf, Erwartungshorizonte und lokale Freigaben. Offene Antworten werden im Unterricht besprochen.</p></div><button class="button secondary" data-action="release-all">Alle Räume lokal freigeben</button></div><div class="teacher-intro"><strong>Transparente Unterrichtshilfe</strong><p>Dieser Bereich ist offen zugänglich. Freigaben und Arbeitsstände betreffen ausschließlich diesen Browser, ohne Klassenübersicht oder gemeinsame Datensammlung. Für individuelle Nachweise exportiert jede Person ihr eigenes Ermittlungsheft.</p><div class="local-status">${rooms.map((r,i)=>`<span>${i+1}. ${state.rooms[i].completed?'Abgeschlossen':state.rooms[i].released?'Freigegeben':'Noch offen'}</span>`).join('')}</div></div><div class="teacher-grid"><article><h2>Vier Doppelstunden</h2><ol><li>Einstieg, Strategiebüro und Produktionshalle. Ergebnissicherung: Strategie und Prozesskette.</li><li>Einkaufsabteilung und Lager. Ergebnissicherung: Kostenvergleich und begründete Beschaffung.</li><li>Prüfarchiv und Vorbereitung der Argumentation. Ergebnissicherung: Befund, Maßnahme, Wirksamkeit.</li><li>Geschäftsleitung, Teampräsentationen und individueller Transfer. Gemeinsame Sicherung offener Fragen.</li></ol></article><article><h2>Was beurteilt wird</h2><ul><li>Fachliche Richtigkeit und trennscharfe Begriffe.</li><li>Konkrete Belege mit Absatz- oder Vorschriftenverweis.</li><li>Erklärte Ursachen, Folgen und Wechselwirkungen.</li><li>Nachvollziehbare Kriterien und ernsthafte Gegenargumente.</li><li>Begründetes Urteil und Transfer auf einen anderen Betrieb.</li></ul><p>Die Mindestlänge der Eingaben ist nur eine Arbeitsstandskontrolle. Geschwindigkeit und Hilfenutzung werden nicht bewertet.</p></article></div><h2>Akten und Erwartungshorizonte</h2>${rooms.map((r,i)=>`<details class="solution"><summary>${i+1}. ${E(r.name)} · ${E(r.topic)}</summary><div class="solution-body"><p><strong>Erwartungshorizont</strong><br>${E(r.solution)}</p><p><strong>Transferfrage</strong><br>${E(r.transfer)}</p><button class="button secondary" data-action="release" data-room="${i}">Raum auf diesem Gerät freigeben</button></div></details>`).join('')}<div class="teacher-grid"><article><h2>Differenzierung</h2><p>Absatznummern, Glossar und drei Hilfestufen unterstützen die Textarbeit. Stärkere Teams prüfen Modellannahmen und alternative Entscheidungen. Bei Schwierigkeiten kann ein Raum ohne Verlust der Einträge freigegeben werden.</p></article><article><h2>Material und Rechtsstand</h2><p>Die Lerntexte sind eigenständige Bearbeitungen eurer Themen. Historische Fälle werden nicht als heutige Unternehmensdaten dargestellt. Akte E spielt ausdrücklich im Jahr 2024. Vor einer Aktualisierung sind die aktuelle Gesetzesfassung und der Anwendungsbereich neu zu prüfen.</p></article></div></div>`;
  }
  function exportText() {
    return `# Ermittlungsheft: Die verschlossene Schokoladenfabrik\n\nName: ${state.name||'Nicht angegeben'}\nTeam: ${state.team||'Nicht angegeben'}\nDatum: ${new Date().toLocaleDateString('de-DE')}\nFortschritt: ${done()} von 6 Türen\n\n`+rooms.map((r,i)=>`## ${i+1}. ${r.name}\n\n${status(i)}\n\n`+r.fields.map((f,j)=>`### ${f.label}\n\n${state.rooms[i].notes[j]||'Noch kein Eintrag.'}\n`).join('\n')+`\nMarkierte Belege: ${state.rooms[i].marked.map(m=>`Absatz ${m+1}`).join(', ')||'Keine'}\n\n`).join('');
  }
  function download(filename, content, type) {
    persist();const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);toast('Die Datei wurde zum Herunterladen bereitgestellt.');
  }
  function importBackup() {
    showModal('Backup importieren', '<p>Ein Import ersetzt die Einträge auf diesem Gerät. Sichere dein bisheriges Heft zuerst. Die Datei wird ausschließlich in diesem Browser verarbeitet.</p><div class="field"><label for="backup-file">JSON-Backup auswählen</label><input id="backup-file" type="file" accept="application/json,.json"></div><p id="import-info" role="status"></p><div class="button-group"><button class="button secondary" data-action="export-json">Bisheriges Backup sichern</button><button class="button" data-action="confirm-import">Ausgewähltes Backup übernehmen</button></div>');
  }
  async function confirmImport() {
    const file=document.querySelector('#backup-file')?.files[0], info=document.querySelector('#import-info');
    if(!file){info.textContent='Bitte wähle ein Backup aus.';return;}
    if(file.size>2*1024*1024){info.textContent='Die Datei ist zu groß. Zulässig sind Backups bis 2 MB.';return;}
    try{const next=validate(JSON.parse(await file.text()));state=next;storageAvailable=true;initialWarning='';persist();modal.close();settings();render();toast('Backup übernommen. Eure Einträge und geöffneten Türen sind wieder da.');}catch(error){info.textContent=`Import nicht möglich: ${error.message}`;}
  }
  const actions = {
    home:()=>navigate('home'), notebook:()=>navigate('notebook'), teacher:()=>navigate('teacher'), room:b=>navigate('room',Number(b.dataset.room)),
    page:b=>turnPage(Number(b.dataset.page)), 'prev-page':()=>turnPage(state.rooms[current.room].page-1), 'next-page':()=>turnPage(state.rooms[current.room].page+1),
    'close-modal':()=>modal.close(), check:checkPuzzle,
    instructions:()=>showModal('Eure Mission in fünf Schritten',`<ol><li>Öffnet den ersten Raum und lest die Nachricht aus der Fabrik.</li><li>Erschließt die Akte. Markiert passende Absätze als Textbelege.</li><li>Haltet drei Ergebnisse im persönlichen Ermittlungsheft fest.</li><li>Löst die vier Fachaufgaben. Bei Bedarf helfen Glossar und drei Hinweise.</li><li>Gebt die Kennziffern in der geforderten Reihenfolge ein. Die nächste Tür öffnet sich.</li></ol><p>Im Team rätseln, individuell festhalten: Jede Person sollte ein eigenes Gerät oder ein eigenes exportiertes Heft verwenden. Es gibt keinen Countdown. Einträge werden lokal gespeichert.</p><button class="button" data-action="start-from-modal">Ersten Raum betreten${icon('arrow')}</button>`),
    'start-from-modal':()=>{modal.close();navigate('room',0);},
    glossary:()=>showModal('Fachbegriffe',`<dl class="glossary-list">${Object.entries(glossary).map(([term,meaning])=>`<div><dt>${E(term)}</dt><dd>${E(meaning)}</dd></div>`).join('')}</dl>`),
    large:()=>{state.settings.large=!state.settings.large;settings();persist();const button=document.querySelector('[data-action=large]');button.textContent=state.settings.large?'Text kleiner':'Text größer';button.setAttribute('aria-pressed',String(state.settings.large));},
    mark:b=>{const i=current.room,j=Number(b.dataset.paragraph), marks=state.rooms[i].marked;state.rooms[i].marked=marks.includes(j)?marks.filter(n=>n!==j):[...marks,j];const marked=state.rooms[i].marked.includes(j);b.closest('.paragraph').classList.toggle('marked',marked);b.setAttribute('aria-pressed',String(marked));b.setAttribute('aria-label',`Absatz ${j+1} ${marked?'Markierung entfernen':'markieren'}`);b.textContent=marked?'✓ Absatz markiert':'Absatz markieren';queueSave();},
    hint:()=>{const i=current.room,s=state.rooms[i];if(s.hints>=3){toast('Alle drei Hinweise stehen unter dem Rätsel.');return;}s.hints++;document.querySelector('#hints').innerHTML=rooms[i].hints.slice(0,s.hints).map((h,j)=>`<p class="hint-text"><strong>Hinweis ${j+1}</strong><br>${E(h)}</p>`).join('');document.querySelector('#hint-count').textContent=`${s.hints} / 3 Hilfen`;if(s.hints===3)document.querySelector('[data-action=hint]').innerHTML=`${icon('bulb')} Alle Hinweise geöffnet`;persist();toast(`Hinweis ${s.hints} ist geöffnet.`);},
    settings:()=>showModal('Einstellungen & Datensicherung',`<p>Passt die Website an eure Arbeitsweise an.</p>${[['motion','Animationen','Türen und kurze Übergänge. Die Geräteeinstellung für reduzierte Bewegung hat Vorrang.'],['sound','Kurzer Türklang','Standardmäßig ausgeschaltet.'],['dark','Dunkle Lesefläche','Für weniger helle Aktenflächen.'],['large','Größere Textschrift','Vergrößert die Lerntexte.']].map(([k,label,desc])=>`<div class="setting-row"><label for="setting-${k}">${label}<small>${desc}</small></label><input id="setting-${k}" data-setting="${k}" type="checkbox" ${state.settings[k]?'checked':''}></div>`).join('')}<div class="setting-actions"><button class="button secondary" data-action="export-json">Backup sichern</button><button class="button secondary" data-action="import">Backup importieren</button><button class="button secondary danger-button" data-action="reset">Neustart vorbereiten</button></div><p style="margin-top:20px">Keine Konten, keine Cloud-Synchronisation. Browserdaten löschen entfernt gespeicherte Einträge. Auf gemeinsam genutzten Geräten vor dem Wechsel exportieren und zurücksetzen.</p>`),
    'export-md':()=>download('Ermittlungsheft-Schokoladenfabrik.md',exportText(),'text/markdown;charset=utf-8'),
    'export-json':()=>{persist();download('Schokoladenfabrik-Backup.json',JSON.stringify(state,null,2),'application/json');},
    print:()=>{persist();window.print();},
    import:importBackup, 'confirm-import':confirmImport,
    reset:()=>showModal('Neue Mission starten?', '<p>Dadurch werden alle Einträge, Markierungen, Hilfen und geöffneten Türen auf diesem Gerät gelöscht. Exportiere vorher ein Backup.</p><div class="button-group"><button class="button secondary" data-action="export-json">Backup sichern</button><button class="button secondary" data-action="close-modal">Zurück zur Mission</button><button class="button danger-button" data-action="confirm-reset">Lokale Mission löschen</button></div>'),
    'confirm-reset':()=>{state=blank();storageAvailable=true;initialWarning='';persist();modal.close();settings();navigate('home');toast('Eine neue Mission ist bereit.');},
    release:b=>{const i=Number(b.dataset.room);state.rooms[i].released=true;persist();renderTeacher();toast(`${rooms[i].name} ist auf diesem Gerät freigegeben.`);},
    'release-all':()=>{state.rooms.forEach(r=>r.released=true);persist();renderTeacher();toast('Alle Räume sind lokal freigegeben. Die Codes bleiben ungelöst.');},
    presentation:()=>showModal('Präsentation: Der Neustart', '<p>Stellt euren Unternehmensplan in etwa fünf Minuten vor.</p><ol><li>Wie ist die Fabrik organisiert und welcher Ablauf wird verbessert?</li><li>Welche Leistung stellt sie selbst her, welche kauft sie ein?</li><li>Welche Beschaffungsstrategie passt zu Kakao und Verpackungen?</li><li>Wie werden Risiken und festgestellte Verletzungen in der Lieferkette bearbeitet?</li><li>Welchen Zielkonflikt habt ihr wie abgewogen?</li></ol><p>Nutzt mindestens drei Belege aus unterschiedlichen Akten. Nennt einen ernsthaften Einwand und eine Bedingung, unter der ihr euren Plan ändern würdet.</p>'),
    about:()=>showModal('Über dieses Lernspiel', '<p>Ein Lernspiel für Wirtschaft und Recht in der Q12. Unternehmensorganisation, Wertschöpfung, Beschaffung und Lieferkettenverantwortung werden durch eigenständige didaktische Texte verbunden.</p><p>Heller & Söhne und seine Unternehmensdaten sind fiktiv. Historische Fälle sind gekennzeichnet. Der Rechtsfall in Akte E spielt ausdrücklich im Jahr 2024. Quellenlinks stehen unter den jeweiligen Akten.</p><p>Das Fabrikmotiv wurde mit KI erstellt. Alle Beschriftungen und Interaktionen sind eigenständige Website-Elemente. Bewegung und Ton lassen sich abschalten.</p><p>Einträge bleiben lokal in eurem Browser. Es gibt keine Benutzerkonten, Analysewerkzeuge oder Übertragung eurer Notizen. Die offen zugänglichen Lehrkraftwerkzeuge sind für den Unterricht gedacht.</p><p>Nach dem ersten vollständigen Laden kann die Website bei unterstützten Browsern auch offline verwendet werden. Externe Quellen benötigen Internet.</p>')
  };
  document.addEventListener('click', event=>{const b=event.target.closest('[data-action]');if(!b)return;const action=actions[b.dataset.action];if(action){event.preventDefault();action(b);}});
  document.addEventListener('input',event=>{
    const el=event.target;
    if(el.dataset.note!==undefined){const i=Number(el.dataset.room),j=Number(el.dataset.note);state.rooms[i].notes[j]=el.value;const count=el.value.trim().length,ready=count>=rooms[i].fields[j].min;document.querySelector(`#note-meta-${j}`).innerHTML=`<span>${count} Zeichen</span><span class="${ready?'ready':''}">${ready?'✓ Eintrag vorhanden':`Mindestens ${rooms[i].fields[j].min} Zeichen als Arbeitsnachweis`}</span>`;queueSave();}
    if(el.dataset.profile){state[el.dataset.profile]=el.value;queueSave();}
    if(el.dataset.answer!==undefined){state.rooms[Number(el.dataset.room)].answers[Number(el.dataset.answer)]=el.value;el.removeAttribute('aria-invalid');const f=document.querySelector('#puzzle-feedback');if(f){f.textContent='Antwort geändert. Prüft die Zuordnung erneut.';f.className='check-feedback';}queueSave();}
  });
  document.addEventListener('change',event=>{const el=event.target;if(el.dataset.setting){state.settings[el.dataset.setting]=el.checked;settings();persist();}});
  document.addEventListener('submit',event=>{if(event.target.id==='code-form'){event.preventDefault();openDoor();}});
  document.addEventListener('keydown',event=>{if(current.view==='room' && event.target.closest('.document') && !event.target.matches('input,textarea,select') && !modal.open && ['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();turnPage(state.rooms[current.room].page+(event.key==='ArrowRight'?1:-1));}});
  window.addEventListener('hashchange',route);
  window.addEventListener('beforeunload',()=>{clearTimeout(saveTimer);persist();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)persist();});
  window.addEventListener('storage',event=>{if(event.key===key&&event.newValue)toast('Die Mission wurde in einem anderen Tab geändert. Verwendet möglichst nur einen Tab und sichert eure aktuellen Einträge.');});
  modal.addEventListener('click',event=>{if(event.target===modal){const rect=modal.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)modal.close();}});
  settings();route();if(initialWarning)toast(initialWarning);
  if('serviceWorker' in navigator && location.protocol !== 'file:')navigator.serviceWorker.register('sw.js').catch(()=>{/* Offline-Speicherung ist optional, Notizen funktionieren unabhängig davon. */});
})();
