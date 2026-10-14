(() => {
  'use strict';
  const rooms = window.ROOMS, glossary = window.GLOSSARY, finale = window.FINALE;
  const preview = new URLSearchParams(location.search).get('vorschau') === '1';
  const key = preview ? 'schokoladenfabrik-q12-v1-vorschau' : 'schokoladenfabrik-q12-v1';
  const main = document.querySelector('#main'), modal = document.querySelector('#modal');
  let current = { view: 'home', room: 0 }, saveTimer, toastTimer, storageAvailable = true, initialWarning = '';
  let binderMotion = null, pendingTextSelection = null;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const blank = () => ({ version: 1, name: '', team: '', settings: { motion: true, sound: true, soundDefaultVersion: 2, dark: false, large: false }, rooms: rooms.map(() => ({ notes: ['', '', ''], answers: ['', '', '', ''], clueAnswers: ['', ''], completed: false, released: false, hints: 0, marked: [], highlights: [], page: 0 })), finale: finale.blank(), updated: null });
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
    if (value.settings.soundDefaultVersion !== 2) result.settings.sound = true;
    value.rooms.forEach((r, i) => {
      if (!r || !Array.isArray(r.notes) || r.notes.length !== 3 || r.notes.some(x => typeof x !== 'string' || x.length > 30000) || !Array.isArray(r.answers) || r.answers.length !== 4 || r.answers.some(x => typeof x !== 'string' || x.length > 100) || typeof r.completed !== 'boolean' || typeof r.released !== 'boolean' || !Number.isInteger(r.hints) || r.hints < 0 || r.hints > 3 || !Array.isArray(r.marked) || r.marked.some(x => !Number.isInteger(x) || x < 0 || x >= rooms[i].sections.length)) throw new Error(`Die Daten in Raum ${i + 1} sind ungültig.`);
      r.answers.forEach((answer, j) => { const ex = rooms[i].exercises[j]; if (answer && ex.type !== 'number' && ex.type !== 'cloze' && !ex.options.some(o => o[0] === answer)) throw new Error('Das Backup enthält unbekannte Rätselantworten.'); });
      const clueAnswers = r.clueAnswers === undefined ? ['', ''] : r.clueAnswers;
      if (!Array.isArray(clueAnswers) || clueAnswers.length !== 2 || clueAnswers.some(x => typeof x !== 'string' || x.length > 30)) throw new Error(`Die Spuren in Raum ${i + 1} sind ungültig.`);
      clueAnswers.forEach((answer,j)=>{const check=rooms[i].evidenceCheck.checks[j];if(answer && check.type!=='number' && !check.options.some(option=>option[0]===answer))throw new Error('Das Backup enthält unbekannte Spuren.');});
      const highlights = r.highlights === undefined ? [] : r.highlights;
      if (!Array.isArray(highlights) || highlights.length > 500 || highlights.some(h => !h || !Number.isInteger(h.paragraph) || !Number.isInteger(h.start) || !Number.isInteger(h.end) || h.paragraph < 0 || h.paragraph >= rooms[i].sections.length || h.start < 0 || h.end <= h.start || h.end > rooms[i].sections[h.paragraph].text.length)) throw new Error(`Die Textmarkierungen in Raum ${i + 1} sind ungültig.`);
      result.rooms[i] = { notes: [...r.notes], answers: [...r.answers], clueAnswers: [...clueAnswers], completed: r.completed, released: r.released, hints: r.hints, marked: [...new Set(r.marked)], highlights: highlights.map(h => ({ paragraph: h.paragraph, start: h.start, end: h.end })), page: Number.isInteger(r.page) && r.page >= 0 && r.page < rooms[i].sections.length ? r.page : 0 };
    });
    result.finale = finale.validate(value.finale);
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
  function settings() { document.body.classList.toggle('motion-off', !state.settings.motion); document.body.classList.toggle('dark-reader', state.settings.dark); document.body.classList.toggle('reading-large', state.settings.large); binderMotion?.stop?.(); binderMotion?.measure?.(); }
  const available = i => preview || i === 0 || state.rooms[i].released || state.rooms[i].completed || state.rooms[i - 1].completed;
  const done = () => state.rooms.filter(r => r.completed).length;
  const finaleAvailable = () => preview || done() === rooms.length;
  const status = i => preview ? 'Frei zugänglich' : state.rooms[i].completed ? 'Abgeschlossen' : available(i) ? 'Jetzt zugänglich' : 'Verschlossen';
  function navigate(view, index = 0) {
    if (view === 'room' && !available(index)) { toast(`Öffne zuerst die Tür in ${rooms[index - 1].name}.`); return; }
    if(view === 'finale' && !finaleAvailable()){toast('Öffnet zuerst alle sechs Türen.');return;}
    const hash = view === 'room' ? `#raum/${index + 1}` : view === 'home' ? '#' : `#${view}`;
    if (location.hash === hash || (hash === '#' && !location.hash)) route(); else location.hash = hash;
  }
  function route() {
    pendingTextSelection = null;
    persist();
    const match = location.hash.match(/^#raum\/([1-6])$/);
    if (match) {
      const i = Number(match[1]) - 1;
      if (!available(i)) { toast('Dieser Raum ist noch verschlossen. Beginne im Strategiebüro.'); history.replaceState(null, '', location.pathname + location.search); current = { view: 'home', room: 0 }; }
      else current = { view: 'room', room: i };
    } else current = { view: ['notebook','teacher','finale'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'home', room: 0 };
    if(current.view === 'finale' && !finaleAvailable()){history.replaceState(null,'',location.pathname+location.search);current={view:'home',room:0};toast('Die Abschlussaufgabe wird nach allen sechs Türen zugänglich.');}
    render(); main.focus({ preventScroll: true }); window.scrollTo(0, 0);
  }
  function render() {
    binderMotion?.stop?.();
    binderMotion?.observer.disconnect();
    binderMotion = null;
    settings();
    document.querySelectorAll('.nav-button').forEach(b => b.removeAttribute('aria-current'));
    document.querySelector(`.nav-button[data-action="${current.view === 'room' ? 'home' : current.view}"]`)?.setAttribute('aria-current', 'page');
    if (current.view === 'home') renderHome();
    else if (current.view === 'room') renderRoom(current.room);
    else if (current.view === 'notebook') renderNotebook();
    else if (current.view === 'finale') renderFinale();
    else renderTeacher();
    document.title = `${current.view === 'room' ? rooms[current.room].name : current.view === 'notebook' ? 'Ermittlungsheft' : current.view === 'finale' ? 'Der Neustart' : current.view === 'teacher' ? 'Lehrkraft' : 'Die verschlossene Schokoladenfabrik'} · Q12`;
  }
  function renderHome() {
    const next = state.rooms.findIndex(r => !r.completed);
    main.innerHTML = `<section class="hero" aria-labelledby="hero-title"><div class="factory-stage"><img src="assets/factory.png" alt="Isometrischer Schnitt einer Backsteinfabrik bei Abendlicht: Strategiebüro, Kupferkessel in der Produktion, Einkauf, Kakaolager, Prüfarchiv und Geschäftsleitung." width="1536" height="1024" fetchpriority="high">${rooms.map((r,i) => `<button class="map-pin" data-action="room" data-room="${i}" aria-disabled="${!available(i)}" aria-label="${E(r.name)}: ${status(i)}">${icon(state.rooms[i].completed ? 'check' : available(i) ? r.icon : 'lock')}${E(r.name)}</button>`).join('')}</div><div class="hero-copy"><span class="case-tag">Der Fall Heller & Söhne</span><h1 id="hero-title">Eine Fabrik.<br>Sechs Türen.<br><em>Euer Neustart.</em></h1><p>Die Produktion steht still. Entschlüsselt die Akten, verbindet die Hinweise und bringt die Schokoladenfabrik wieder auf Kurs.</p><div class="hero-actions"><button class="button" data-action="${next < 0 ? 'finale' : 'room'}" ${next < 0 ? '' : `data-room="${next}"`}>${next < 0 ? 'Abschlussaufgabe öffnen' : done() ? 'Mission fortsetzen' : 'Mission beginnen'}${icon('arrow')}</button><button class="text-button" data-action="instructions">So funktioniert’s</button></div><div class="hero-meta"><span>${icon('people')}2–3 Personen pro Team</span></div></div></section><section class="journey" id="doors" aria-labelledby="journey-title"><div class="journey-heading"><div><h2 id="journey-title">Euer Weg durch die Fabrik</h2><p>Jede geöffnete Tür bringt euch dem Neustart näher.</p></div><div class="progress-area"><span>${done()} von 6 Türen geöffnet</span><div class="progress-track" role="progressbar" aria-label="Geöffnete Türen" aria-valuemin="0" aria-valuemax="6" aria-valuenow="${done()}"><div class="progress-fill" style="width:${done()/6*100}%"></div></div></div></div><div class="door-row">${rooms.map((r,i) => `<button class="room-door ${state.rooms[i].completed ? 'complete' : available(i) ? 'available' : ''}" data-action="room" data-room="${i}" aria-disabled="${!available(i)}" aria-label="Raum ${i+1}: ${E(r.name)}, ${status(i)}"><span class="door-index">Raum ${i+1}${icon(r.icon)}</span><span class="door-picture" aria-hidden="true"><span class="door-leaf"><span class="door-window"></span><span class="door-handle"></span></span></span><span class="door-name">${E(r.name)}</span><span class="door-state">${icon(state.rooms[i].completed ? 'check' : available(i) ? 'unlock' : 'lock')}${status(i)}</span></button>`).join('')}</div></section>${finaleAvailable() ? finishPanel() : ''}<section class="mission-strip" aria-label="Drei Schritte der Mission"><article><h3>${icon('file')}Akten entschlüsseln</h3><p>Lest anspruchsvolle Texte, markiert Belege und erklärt die Zusammenhänge in eigenen Worten.</p></article><article><h3>${icon('book')}Erkenntnisse sichern</h3><p>Euer persönliches Ermittlungsheft sammelt Entscheidungen und Belege. Es bleibt auf diesem Gerät gespeichert.</p></article><article><h3>${icon('lock')}Türen öffnen</h3><p>Löst Fachrätsel, kombiniert Kennziffern und öffnet den nächsten Raum. Hilfen sind jederzeit erlaubt.</p></article></section>`;
  }
  function finishPanel() { return `<section class="finish-panel">${icon(state.finale.completed?'trophy':'factory')}<h2>${state.finale.completed?'Die Fabrik ist wieder in Betrieb.':'Der letzte Auftrag: der Neustart'}</h2><p>${state.finale.completed?'Euer Neustartplan und der gemeinsame Startcode sind gesichert.':preview?'In der Vorschau ist auch die Abschlussaufgabe frei zugänglich.':'Alle sechs Türen sind geöffnet. Verbindet jetzt eure Erkenntnisse und alle Türcodes zu einem gemeinsamen Neustart.'}</p><div class="button-group"><button class="button" data-action="finale">${state.finale.completed?'Neustartplan ansehen':'Abschlussaufgabe öffnen'}${icon('arrow')}</button><button class="button secondary" data-action="notebook">Ermittlungsheft sichern</button></div></section>`; }
  function fieldHTML(r, i, j) {
    const f = r.fields[j], value = state.rooms[i].notes[j], count = value.trim().length;
    return `<div class="field"><label for="note-${j}">${E(f.label)}</label><p class="prompt" id="prompt-${j}">${E(f.prompt)}</p><textarea id="note-${j}" data-note="${j}" data-room="${i}" maxlength="30000" aria-describedby="prompt-${j} note-meta-${j}" placeholder="Eure Erklärung, euer Beleg, eure Begründung …">${E(value)}</textarea><div class="field-meta" id="note-meta-${j}"><span>${count} Zeichen</span><span class="${count >= f.min ? 'ready' : ''}">${count >= f.min ? '✓ Eintrag vorhanden' : `Mindestens ${f.min} Zeichen als Arbeitsnachweis`}</span></div></div>`;
  }
  function evidenceReady(i) {
    return rooms[i].evidenceCheck.checks.map((check,j)=>state.rooms[i].clueAnswers[j].trim()===check.answer);
  }
  function evidenceHTML(r,i) {
    const clue=r.evidenceCheck,answers=state.rooms[i].clueAnswers,ready=evidenceReady(i),solved=ready.every(Boolean);
    return `<section class="work-panel evidence-check" aria-labelledby="evidence-heading"><div class="panel-top">${icon('file')}<h2 id="evidence-heading" tabindex="-1">Spurenprüfung</h2><span class="small-badge">${ready.filter(Boolean).length} / 2</span></div><p><strong>${E(clue.title)}</strong><br>${E(clue.intro)}</p>${clue.checks.map((check,j)=>check.type==='number'?`<div class="field clue-field" id="clue-${j}"><label for="clue-answer-${j}">Spur ${j+1}: ${E(check.prompt)}</label><div class="number-wrap"><input id="clue-answer-${j}" type="number" min="0" step="1" inputmode="numeric" data-clue="${j}" data-room="${i}" value="${E(answers[j])}" aria-describedby="clue-suffix-${j} clue-feedback"><span id="clue-suffix-${j}">${E(check.suffix)}</span></div></div>`:`<fieldset class="clue-field answer-cards" id="clue-${j}" aria-describedby="clue-feedback"><legend>Spur ${j+1}: ${E(check.prompt)}</legend>${check.options.map(([value,label],n)=>`<label class="answer-card" for="clue-answer-${j}-${n}"><input id="clue-answer-${j}-${n}" type="radio" name="clue-${j}" data-clue="${j}" data-room="${i}" value="${E(value)}" ${answers[j]===value?'checked':''}><span>${E(label)}</span></label>`).join('')}</fieldset>`).join('')}<button class="button secondary" data-action="check-clues">Spuren prüfen${icon('check')}</button><p id="clue-feedback" class="check-feedback ${solved?'good':''}" role="status" aria-live="polite">${solved?`Beweisstück gesichert. ${E(clue.reward)}`:''}</p><div class="evidence-stamp-result ${solved?'secured':''}" aria-label="${solved?'Beweisstück gesichert':'Beweisstück noch offen'}">${solved?'✓ BEWEISSTÜCK GESICHERT':'BEWEISSTÜCK OFFEN'}</div></section>`;
  }
  let selectedReport = '';
  const terms = {oekonomisch:'ökonomisch',oekologisch:'ökologisch',sozial:'sozial',neutral:'Zielneutralität',konflikt:'Zielkonflikt',kongruenz:'Zielkongruenz'};
  function canonical(value) {
    const word=value.trim().toLocaleLowerCase('de').replace(/ö/g,'oe').replace(/ä/g,'ae').replace(/ü/g,'ue').replace(/[ .\-/]/g,'');
    return ({wirtschaftlich:'oekonomisch',oekonomischesargument:'oekonomisch',menschenrechtlich:'sozial',zielkonflikt:'konflikt',zielkongruenz:'kongruenz',zielneutralitaet:'neutral'})[word] || word;
  }
  function exerciseHTML(r,i,j) {
    const ex=r.exercises[j],answer=state.rooms[i].answers[j];
    if(ex.type==='number')return `<div class="field puzzle-field" id="task-${j}"><label for="answer-${j}">${j+1}. ${E(ex.label)}</label><div class="number-wrap"><input id="answer-${j}" data-answer="${j}" data-room="${i}" type="number" min="0" max="99" step="1" inputmode="numeric" value="${E(answer)}" aria-describedby="suffix-${j} puzzle-feedback"><span id="suffix-${j}">${E(ex.suffix)}</span></div></div>`;
    if(ex.type==='cloze')return `<div class="field puzzle-field cloze-field" id="task-${j}"><label for="answer-${j}">${j+1}. ${E(ex.label)}</label><input id="answer-${j}" data-answer="${j}" data-room="${i}" type="text" maxlength="100" autocomplete="off" spellcheck="false" value="${E(terms[answer]||answer)}" placeholder="Fachbegriff eintragen" aria-describedby="terms-${j} puzzle-feedback"><p class="term-key" id="terms-${j}">Kennziffern: ${ex.options.map(([key,label])=>`${E(terms[key])} · ${E(label.split(' · ').pop())}`).join(' / ')}</p></div>`;
    return `<fieldset class="puzzle-field answer-cards" id="task-${j}" aria-describedby="puzzle-feedback"><legend>${j+1}. ${E(ex.label)}</legend>${ex.options.map(([value,label],n)=>`<label class="answer-card" for="answer-${j}-${n}"><input id="answer-${j}-${n}" type="radio" name="answer-${j}" data-answer="${j}" data-room="${i}" value="${E(value)}" ${answer===value?'checked':''}><span>${E(label)}</span></label>`).join('')}</fieldset>`;
  }
  function orderValues(i) {
    const answers=state.rooms[i].answers,keys=rooms[i].exercises[0].options.map(o=>o[0]);
    return answers.every(a=>keys.includes(a)) && new Set(answers).size===4 ? [...answers] : keys;
  }
  function puzzleHTML(r,i) {
    const answers=state.rooms[i].answers;
    if(r.puzzleType==='matching')return `<div id="puzzle-interaction" class="matching-board"><p class="puzzle-instruction">Wählt einen Bericht und danach die passende Abteilung. Bereits belegte Plätze werden getauscht.</p><div class="report-bank" role="group" aria-label="Abteilungsberichte">${r.exercises[0].options.map(([value,label])=>`<button data-action="report" data-value="${E(value)}" aria-pressed="${selectedReport===value}">${E(label)}${answers.includes(value)?'<small>Zugeordnet</small>':''}</button>`).join('')}</div><p id="matching-status" class="puzzle-instruction" role="status">${selectedReport?'Bericht gewählt. Wählt jetzt eine Abteilung.':'Noch kein Bericht gewählt.'}</p><div class="assignment-slots">${r.exercises.map((ex,j)=>`<div id="task-${j}" class="assignment-slot"><span>${j+1}. ${E(ex.label.split(':')[0])}</span><button data-action="assign" data-slot="${j}" aria-label="Bericht zu ${E(ex.label.split(':')[0])} zuordnen">${E(ex.options.find(o=>o[0]===answers[j])?.[1]||'Bericht hier ablegen')}</button></div>`).join('')}</div></div>`;
    if(r.puzzleType==='order')return `<div id="puzzle-interaction" class="order-board"><p class="puzzle-instruction">Verschiebt die Stationen mit den Pfeilen. Oben steht der erste Schritt.</p><ol class="process-order">${orderValues(i).map((value,j)=>`<li id="task-${j}" data-value="${E(value)}"><span class="step-position">${j+1}</span><strong>${E(r.exercises[0].options.find(o=>o[0]===value)[1])}</strong><div class="order-controls"><button data-action="move-step" data-step="${j}" data-delta="-1" aria-label="${E(r.exercises[0].options.find(o=>o[0]===value)[1])} nach oben" ${j===0?'disabled':''}>↑</button><button data-action="move-step" data-step="${j}" data-delta="1" aria-label="${E(r.exercises[0].options.find(o=>o[0]===value)[1])} nach unten" ${j===3?'disabled':''}>↓</button></div></li>`).join('')}</ol><p id="order-status" role="status" class="puzzle-instruction">Reihenfolge vom Anfang bis zum Versand prüfen.</p></div>`;
    return `<div id="puzzle-interaction" class="puzzle-${r.puzzleType}">${r.puzzleType==='cloze'?'<p class="puzzle-instruction">Ergänzt die passenden Fachbegriffe aus der Akte. Die Kennziffern stehen jeweils unter der Lücke.</p>':''}${r.exercises.map((_,j)=>exerciseHTML(r,i,j)).join('')}</div>`;
  }
  function answerChanged() {
    document.querySelectorAll('[data-invalid]').forEach(el=>el.removeAttribute('data-invalid'));
    document.querySelectorAll('[aria-invalid]').forEach(el=>el.removeAttribute('aria-invalid'));
    const feedback=document.querySelector('#puzzle-feedback');
    if(feedback){feedback.textContent='Antwort geändert. Prüft eure Lösung erneut.';feedback.className='check-feedback';}
    queueSave();
  }
  function refreshPuzzle() {
    document.querySelector('#puzzle-interaction').outerHTML=puzzleHTML(rooms[current.room],current.room);
  }
  function exhibitHTML(kind) {
    const flow=(items)=>`<ol class="evidence-flow">${items.map(([title,detail])=>`<li><strong>${E(title)}</strong><span>${E(detail)}</span></li>`).join('')}</ol>`;
    const table=(caption,heads,rows)=>`<table class="evidence-table"><caption>${E(caption)}</caption><thead><tr>${heads.map(h=>`<th scope="col">${E(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map((c,j)=>j===0?`<th scope="row">${E(c)}</th>`:`<td>${E(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    const chart=(title,desc,plot,labels)=>`<figure class="evidence-chart"><svg viewBox="0 0 560 330" role="img" aria-label="${E(title)}. ${E(desc)}"><path class="chart-axis" d="M65 35V265H515"/>${[0,1,2,3].map(n=>`<path class="chart-grid" d="M65 ${265-n*70}H515"/>`).join('')}${plot}${labels}</svg><figcaption>${E(desc)}</figcaption></figure>`;
    if(kind==='organisation')return `<div class="evidence-sheet"><span class="evidence-stamp">Organisationsplan · Stand: Fallmodell</span><div class="org-director">Geschäftsleitung</div><div class="org-branches">${[['Beschaffung','Rohstoffe & Lieferanten'],['Produktion','Kapazität & Qualität'],['Marketing','Kundschaft & Angebot'],['Finanzierung','Investitionen & Liquidität']].map(([a,b])=>`<div><strong>${a}</strong><span>${b}</span></div>`).join('')}</div><p class="evidence-note">Die Linien zeigen Zuständigkeiten. Informationsaustausch zwischen den Bereichen ist zusätzlich erforderlich.</p></div>`;
    if(kind==='process')return `<div class="evidence-sheet"><span class="evidence-stamp">Übergabevermerk · Produktionsleitung</span>${flow([['Rohstoffe annehmen und prüfen','Liefernachweis + Prüfergebnis'],['Pralinen herstellen','Rezeptur + Chargennummer'],['Charge kontrollieren und freigeben','Freigabestatus + verantwortliche Stelle'],['Verpacken und versenden','Freigabe + Versandadresse']])}<p class="evidence-note">Material und Informationen müssen gemeinsam weitergegeben werden.</p></div>`;
    if(kind==='costs')return `<div class="evidence-sheet"><span class="evidence-stamp">Rechenanlage · Fiktives Jahresmodell</span>${chart('Gesamtkosten von Eigenfertigung und Fremdbezug','Eigenfertigung: 12.000 € + 0,20 € × Menge. Fremdbezug: 0,30 € × Menge. Schnittpunkt bei 120.000 Stück und 36.000 €. Weitere Kosten und Kapazitätsgrenzen fehlen.', '<path class="chart-primary" d="M65 223L515 83"/><path class="chart-secondary" d="M65 265L515 55"/><circle cx="335" cy="139" r="5" class="chart-point"/><path class="chart-guide" d="M335 139V265"/>','<text x="65" y="21">Kosten / 1.000 €</text><text x="29" y="270">0</text><text x="20" y="200">20</text><text x="20" y="130">40</text><text x="20" y="60">60</text><text x="60" y="286">0</text><text x="280" y="286">100</text><text x="490" y="286">200</text><text x="230" y="316">Menge / 1.000 Stück</text>')}<div class="chart-legend"><span class="legend-primary">━ Eigenfertigung</span><span class="legend-secondary">┄ Fremdbezug</span></div>${table('Kontrollwerte der Rechnung',['Menge','Eigenfertigung','Fremdbezug'],[['100.000','32.000 €','30.000 €'],['120.000','36.000 €','36.000 €'],['200.000','52.000 €','60.000 €']])}</div>`;
    if(kind==='stock')return `<div class="evidence-sheet"><span class="evidence-stamp">Lagerjournal · Verbrauch 80 kg / Tag</span>${chart('Lagerbestand ohne neue Lieferung','480 kg reichen für sechs volle Produktionstage, 720 kg für neun. Ab Tag 7 liegt der Ausgangsbestand bei null. Die zusätzliche Menge ermöglicht drei weitere Produktionstage.', '<path class="chart-primary" d="M65 125L365 265H515"/><path class="chart-secondary" d="M65 55L515 265"/><path class="chart-guide" d="M365 35V265"/>','<text x="65" y="21">Bestand / kg</text><text x="29" y="270">0</text><text x="12" y="200">240</text><text x="12" y="130">480</text><text x="12" y="60">720</text><text x="60" y="286">0</text><text x="210" y="286">3</text><text x="360" y="286">6</text><text x="510" y="286">9</text><text x="204" y="316">Volle Produktionstage</text>')}<div class="chart-legend"><span class="legend-primary">━ Start: 480 kg</span><span class="legend-secondary">┄ Start: 720 kg</span></div>${table('Auszug: Bestand nach Verbrauch, ohne Lieferung',['Tag','Start 480 kg','Start 720 kg'],[['0','480 kg','720 kg'],['6','0 kg','240 kg'],['7','0 kg','160 kg'],['8','0 kg','80 kg'],['9','0 kg','0 kg']])}<p class="evidence-note">Ersatzlieferung im Ausgangsfall: zu Beginn von Tag 9.</p></div>`;
    if(kind==='supply')return `<div class="evidence-sheet"><span class="evidence-stamp">Prüfvermerk · Historischer Fall 2024</span>${flow([['Kakaovorverarbeitung','Mittelbar: kein direkter Vertrag mit der Fabrik'],['Direkter Kakaolieferant','Vertragliche Lieferung an Heller & Söhne'],['Heller & Söhne','Eigene Herstellung und Vertrieb']])}<p class="evidence-note">Separater direkter Vertrag: Verpackungslieferant → Heller & Söhne.</p>${table('Dokumentierte Hinweise aus Akte E',['Befund','Betroffene Stufe'],[['Verschlossene Fluchtwege','Direkter Verpackungslieferant'],['Konkrete Hinweise auf gefährliche Kinderarbeit','Mittelbare Kakaovorverarbeitung']])}<p class="evidence-note">Die Pfeile bilden Lieferbeziehungen ab. Die Übersicht ist keine Aussage über heutige Unternehmensdaten.</p></div>`;
    return `<div class="evidence-sheet meeting-minutes"><span class="evidence-stamp">Sitzungsvermerk · Beschluss noch offen</span><dl><dt>Einkaufsleitung</dt><dd>„Ein zusätzlicher Vorrat verbessert die Versorgung, bindet aber mehr Kapital.“</dd><dt>Beschäftigtenvertretung</dt><dd>„Sichere Fluchtwege müssen gewährleistet sein.“</dd><dt>Produktionsleitung</dt><dd>„Weniger Ausschuss kann Kosten und Materialverbrauch senken.“</dd></dl><div class="minute-resolution"><strong>Offener Beschlusspunkt</strong><p>Welche Maßnahmen soll die Fabrik priorisieren? Nennt Kriterien, Belege und einen ernsthaften Einwand.</p></div></div>`;
  }
  function graphic(i) {
    const sets = [ [['compass','Gesamtstrategie'],['people','Abteilungen'],['factory','Maßnahmen']], [['package','Annahme'],['factory','Herstellung'],['shield','Freigabe'],['package','Versand']], [['package','Bedarf'],['scale','Alternativen'],['check','Entscheidung']], [['package','Bestand'],['clock','Verbrauch'],['layers','Reichweite']], [['file','Befund'],['shield','Maßnahme'],['check','Wirksamkeit']], [['file','Belege'],['scale','Abwägung'],['compass','Urteil']] ];
    return `<p class="concept-graphic-title">Die Denkspur in diesem Raum</p><div class="concept-graphic" aria-label="${sets[i].map(s=>s[1]).join(', dann ')}">${sets[i].map(([ic,label],j) => `${j ? '<span class="concept-arrow" aria-hidden="true">→</span>' : ''}<span class="concept-step">${icon(ic)}${label}</span>`).join('')}</div>`;
  }
  function audioExhibitHTML(section) {
    return `<div class="audio-evidence"><div class="audio-evidence-heading"><span class="audio-evidence-seal" aria-hidden="true">C3</span><div><strong>Gespräch hinter verschlossener Tür</strong><span>Fiktive Szene · zwei Mitarbeitende · KI-generierte Stimmen</span></div></div><audio controls preload="metadata" aria-label="Tonakte C3: vertrauliches Gespräch zwischen Einkauf und Produktion"><source src="assets/tonakte-c-dialog.mp3" type="audio/mpeg">Euer Browser kann die Tonakte nicht abspielen. <a href="assets/tonakte-c-dialog.mp3">Tonakte öffnen</a>.</audio><p class="audio-evidence-task">Hört auf die Begründungen beider Seiten. Eine Entscheidung wurde noch nicht getroffen.</p><details class="audio-transcript"><summary>Mitschrift bei Bedarf öffnen</summary><div>${section.transcript.map(turn=>`<p><strong>${E(turn.speaker)}</strong><br>${E(turn.text)}</p>`).join('')}</div></details></div>`;
  }
  function videoExhibitHTML(section) {
    const { reference, title, url, question } = section.video;
    return `<div class="video-evidence"><div class="video-evidence-heading"><span class="video-evidence-seal" aria-hidden="true">${E(reference)}</span><div><strong>Filmakte: ${E(title)}</strong><span>Externe Quelle · Studyflix</span></div></div><div class="video-evidence-frame" aria-hidden="true"><span class="video-evidence-play">▶</span><span>FILMARCHIV / ${E(reference)}</span></div><a class="video-evidence-link" href="${E(url)}" target="_blank" rel="noopener noreferrer" aria-label="Filmakte ${E(reference)}: ${E(title)} auf Studyflix in neuem Tab öffnen">Video auf Studyflix ansehen <span aria-hidden="true">↗</span></a><p class="video-evidence-note">Öffnet sich in einem neuen Tab. Internetverbindung erforderlich.</p><div class="video-evidence-question"><strong>Beobachtungsauftrag</strong><p>${E(question)}</p></div></div>`;
  }
  function highlightedTextHTML(text, marks) {
    let html = '', position = 0;
    for (const mark of [...marks].sort((a,b) => a.start-b.start)) {
      if (mark.start < position) continue;
      html += E(text.slice(position, mark.start)) + `<mark class="word-highlight">${E(text.slice(mark.start, mark.end))}</mark>`;
      position = mark.end;
    }
    return html + E(text.slice(position));
  }
  function renderTextHighlights(i, j) {
    const page = document.querySelector(`.document-body > #absatz-${j+1}`);
    if (!page) return;
    const marks = state.rooms[i].highlights.filter(h => h.paragraph === j).sort((a,b) => a.start-b.start);
    page.querySelector('.case-text').innerHTML = highlightedTextHTML(rooms[i].sections[j].text, marks);
    page.querySelector('.word-highlight-list').innerHTML = marks.length ? `<span>Markierte Textstellen:</span>${marks.map(h => `<button type="button" data-action="unmark-text" data-start="${h.start}" data-end="${h.end}" data-paragraph="${j}" aria-label="Markierung entfernen: ${E(rooms[i].sections[j].text.slice(h.start,h.end))}">× ${E(rooms[i].sections[j].text.slice(h.start,h.end))}</button>`).join('')}` : '';
    binderMotion?.measure?.();
  }
  function rememberTextSelection() {
    if (current.view !== 'room') return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    const start = (range.startContainer.nodeType === 1 ? range.startContainer : range.startContainer.parentElement)?.closest('p.case-text');
    const end = (range.endContainer.nodeType === 1 ? range.endContainer : range.endContainer.parentElement)?.closest('p.case-text');
    if (!start || start !== end || !start.closest('.paragraph') || start.closest('.paragraph').hidden) return;
    const paragraph = Number(start.closest('.paragraph').id.replace('absatz-', '')) - 1;
    if (paragraph !== state.rooms[current.room].page) return;
    const prefix = document.createRange();
    prefix.selectNodeContents(start);
    prefix.setEnd(range.startContainer, range.startOffset);
    const from = prefix.toString().length;
    prefix.setEnd(range.endContainer, range.endOffset);
    const to = prefix.toString().length;
    if (to > from && rooms[current.room].sections[paragraph].text.slice(from, to).trim()) pendingTextSelection = { room: current.room, paragraph, start: from, end: to };
  }
  function markSelectedText() {
    rememberTextSelection();
    const selected = pendingTextSelection;
    if (!selected || selected.room !== current.room || selected.paragraph !== state.rooms[current.room].page) { toast('Wählt zuerst ein Wort oder eine Textstelle auf diesem Blatt aus.'); return; }
    const list = state.rooms[current.room].highlights;
    let { start, end } = selected;
    for (let n = list.length - 1; n >= 0; n--) if (list[n].paragraph === selected.paragraph && list[n].start <= end && list[n].end >= start) {
      start = Math.min(start, list[n].start); end = Math.max(end, list[n].end); list.splice(n, 1);
    }
    list.push({ paragraph: selected.paragraph, start, end });
    pendingTextSelection = null;
    window.getSelection()?.removeAllRanges();
    renderTextHighlights(current.room, selected.paragraph); persist(); toast('Textstelle markiert und gespeichert.');
  }
  function renderRoom(i) {
    selectedReport='';
    const r = rooms[i], s = state.rooms[i];
    main.innerHTML = `<div class="page"><div class="breadcrumb"><button data-action="home">← Fabrikplan</button><span>/</span><span>Raum ${i+1} von 6</span></div><div class="room-heading"><span class="room-number" aria-hidden="true">0${i+1}</span><div><h1>${E(r.name)}</h1><p>${E(r.subtitle)}</p></div></div><nav class="room-tabs" aria-label="Räume">${rooms.map((room,j)=>`<button data-action="room" data-room="${j}" class="${i===j?'current':''}" ${i===j?'aria-current="page"':''} aria-disabled="${!available(j)}">${j+1}. ${E(room.name)}${!available(j)?' 🔒':''}</button>`).join('')}</nav><div class="briefing">${icon(r.icon)}<p><strong>Nachricht aus der Fabrik</strong>${E(r.dispatch)}</p></div>${s.completed?`<div class="complete-banner"><strong>Tür geöffnet. Eure Arbeit bleibt bearbeitbar.</strong>${i<5?'Der nächste Raum ist jetzt zugänglich.':'Alle Türen sind offen. Die Abschlussaufgabe wartet.'} <button class="text-button" data-action="${i<5?'room':'finale'}" ${i<5?`data-room="${i+1}"`:''}>${i<5?'Zum nächsten Raum →':'Zur Abschlussaufgabe →'}</button></div>`:''}<div class="workspace"><article class="document" aria-labelledby="document-title"><div class="document-header"><span class="document-label">${E(r.document)} · ${r.sections.reduce((n,s)=>n+s.text.split(/\s+/).length,0)} Wörter</span><h2 id="document-title">${E(r.subtitle)}</h2><p>${E(r.intro)}</p>${r.legalNote?`<div class="legal-note">${E(r.legalNote)}</div>`:''}<div class="reading-tools"><button data-action="glossary">Fachbegriffe nachschlagen</button><button data-action="large" aria-pressed="${state.settings.large}">${state.settings.large?'Text kleiner':'Text größer'}</button><span>Wörter und Absätze als Belege markieren</span></div></div><div class="document-body">${r.sections.map((sec,j)=>`<section class="paragraph ${s.marked.includes(j)?'marked':''}" id="absatz-${j+1}"><h3><span>${j+1}</span>${E(sec.title)}</h3><p>${E(sec.text)}</p>${sec.exhibit==='audio'?audioExhibitHTML(sec):sec.exhibit==='video'?videoExhibitHTML(sec):sec.exhibit?exhibitHTML(sec.exhibit):''}<button class="mark-button" data-action="mark" data-paragraph="${j}" aria-pressed="${s.marked.includes(j)}" aria-label="Absatz ${j+1} ${s.marked.includes(j)?'Markierung entfernen':'markieren'}">${s.marked.includes(j)?'✓ Absatz markiert':'Absatz markieren'}</button></section>`).join('')}</div><footer class="document-source"><p>Quellen und Einordnung</p><p>Alle benötigten Informationen stehen in den Akten und im Glossar. Externe Quellen sind nur zur freiwilligen Vertiefung gedacht.</p>${r.sources.map(source=>`<p>${source.url?`<a href="${E(source.url)}" target="_blank" rel="noopener noreferrer">${E(source.label)} ↗</a>`:E(source.label)}</p>`).join('')}<p>Eigenständiger Lerntext. Heller & Söhne und die Daten des Fallmodells sind fiktiv. Historische Unternehmensbeispiele sind als solche gekennzeichnet.</p></footer></article><aside class="workbench" aria-label="Arbeitsbereich"><section class="work-panel"><div class="panel-top">${icon('book')}<h2 id="notes-heading" tabindex="-1">Ermittlungsheft</h2><span class="small-badge">Akte ${String.fromCharCode(65+i)}</span></div><p>Haltet eure Ergebnisse in eigenen Worten fest. Die Mindestlänge prüft den Arbeitsstand, nicht die fachliche Qualität.</p>${r.fields.map((_,j)=>fieldHTML(r,i,j)).join('')}<button class="text-button" data-action="notebook">Alle bisherigen Einträge ansehen →</button></section>${evidenceHTML(r,i)}<section class="work-panel"><div class="panel-top">${icon('compass')}<h2 id="puzzle-heading" tabindex="-1">Das Fachrätsel</h2></div><p>${E(r.puzzle)}</p>${puzzleHTML(r,i)}<button class="button secondary" data-action="check">Lösungen prüfen${icon('check')}</button><div id="puzzle-feedback" class="check-feedback" role="status" aria-live="polite"></div><div class="hint-box"><div class="hint-top"><button data-action="hint">${icon('bulb')} ${s.hints<3?'Nächsten Hinweis öffnen':'Alle Hinweise geöffnet'}</button><small id="hint-count">${s.hints} / 3 Hilfen</small></div><div id="hints">${r.hints.slice(0,s.hints).map((h,j)=>`<p class="hint-text"><strong>Hinweis ${j+1}</strong><br>${E(h)}</p>`).join('')}</div></div></section><section class="lock-panel"><h2>${icon(s.completed?'unlock':'lock')}${i===5?'Das Schloss der Geschäftsleitung':'Das Türschloss'}</h2><p>Die zwei Spuren, alle vier Fachaufgaben und die drei Einträge müssen stimmen. Gebt dann die Kennziffern als vierstelligen Code ein.</p><form class="code-form" id="code-form"><div class="field"><label for="door-code">Vierstelliger Türcode</label><input id="door-code" name="code" type="text" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="off" required aria-describedby="lock-feedback" placeholder="· · · ·"></div><button class="button" type="submit">Tür öffnen${icon('unlock')}</button></form><div id="lock-feedback" class="check-feedback" role="status" aria-live="polite"></div></section>${graphic(i)}</aside></div></div>`;
    main.querySelectorAll('.document-body > .paragraph').forEach((page,j) => {
      const paragraph = page.querySelector(':scope > p');
      paragraph.classList.add('case-text');
      paragraph.innerHTML = highlightedTextHTML(r.sections[j].text, s.highlights.filter(h => h.paragraph === j));
      page.querySelector('.mark-button').insertAdjacentHTML('afterend', `<div class="word-mark-tools"><button type="button" data-action="mark-text">Auswahl markieren</button><span>Wörter oder Sätze im Text auswählen und hier markieren.</span></div><div class="word-highlight-list" aria-label="Markierte Textstellen"></div>`);
      const marks = s.highlights.filter(h => h.paragraph === j).sort((a,b) => a.start-b.start);
      page.querySelector('.word-highlight-list').innerHTML = marks.length ? `<span>Markierte Textstellen:</span>${marks.map(h => `<button type="button" data-action="unmark-text" data-start="${h.start}" data-end="${h.end}" data-paragraph="${j}" aria-label="Markierung entfernen: ${E(r.sections[j].text.slice(h.start,h.end))}">× ${E(r.sections[j].text.slice(h.start,h.end))}</button>`).join('')}` : '';
    });
    if(preview){
      document.querySelector('.lock-panel').innerHTML=`<h2>${icon('unlock')}Freier Zugang</h2><p>In dieser Vorschau könnt ihr jeden Raum ohne Code öffnen.</p><button class="button" data-action="${i<5?'room':'finale'}" ${i<5?`data-room="${i+1}"`:''}>${i<5?'Nächsten Raum ansehen':'Abschlussaufgabe ansehen'}${icon('arrow')}</button>`;
    }
    installBinder(i);
    document.querySelector('#document-title').tabIndex=-1;
    const lockTitle=document.querySelector('.lock-panel h2');lockTitle.id='lock-heading';lockTitle.tabIndex=-1;
    main.insertAdjacentHTML('beforeend',`<nav class="room-quicknav has-evidence" aria-label="Schnellzugriff im Raum"><button data-action="jump" data-target="document-title">${icon('file')}Akte</button><button data-action="jump" data-target="notes-heading">${icon('book')}Notizen</button><button data-action="jump" data-target="evidence-heading">${icon('file')}Spuren</button><button data-action="jump" data-target="puzzle-heading">${icon('compass')}Rätsel</button><button data-action="jump" data-target="lock-heading">${icon(preview?'arrow':'lock')}${preview?'Weiter':'Tür'}</button></nav>`);
  }
  function installBinder(i) {
    const r=rooms[i],article=document.querySelector('.document'),body=document.querySelector('.document-body');
    article.classList.add('binder');
    article.classList.add('case-dossier');
    article.insertAdjacentHTML('afterbegin',`<div class="folder-tab" aria-hidden="true">AKTE ${String.fromCharCode(65+i)} · HELLER & SÖHNE</div><div class="dossier-band"><span>${icon('file')}Interne Ermittlungsakte</span><span class="case-reference">H&amp;S / Q12 / 0${i+1}</span></div>`);
    article.querySelector('.document-header').insertAdjacentHTML('afterbegin','<span class="confidential-stamp" aria-hidden="true">VERTRAULICH</span>');
    body.id='binder-pages';
    body.insertAdjacentHTML('beforebegin', `<div class="binder-toolbar"><span>Textblätter & Anlagen</span><nav class="binder-pages-nav" aria-label="Seiten dieser Akte">${r.sections.map((sec,j)=>`<button data-action="page" data-page="${j}" aria-label="Seite ${j+1}: ${E(sec.title)}" aria-controls="binder-pages">${sec.exhibit==='audio'?'Ton':sec.exhibit==='video'?'Film':sec.exhibit?'Anlage':j+1}</button>`).join('')}</nav></div>`);
    body.insertAdjacentHTML('afterbegin','<span class="binder-rings" aria-hidden="true"><i></i><i></i><i></i></span>');
    body.insertAdjacentHTML('afterend','<nav class="binder-pagination" aria-label="In der Akte blättern"><button id="binder-prev" data-action="prev-page" aria-label="Vorherige Seite">← <span>Zurück</span></button><span id="binder-counter" role="status" aria-live="polite"></span><button id="binder-next" data-action="next-page" aria-label="Nächste Seite"><span>Weiter</span> →</button></nav>');
    updateBinder(i);
    const measure=()=>{
      if(!body.isConnected)return;
      const padding=getComputedStyle(body);
      body.style.setProperty('--leaf-left',padding.paddingLeft);
      body.style.setProperty('--leaf-right',padding.paddingRight);
      body.style.setProperty('--leaf-top',padding.paddingTop);
      body.style.setProperty('--leaf-bottom',padding.paddingBottom);
      const probe=document.createElement('div');
      probe.className='binder-measure';probe.setAttribute('aria-hidden','true');probe.inert=true;
      body.querySelectorAll(':scope > .paragraph').forEach(page=>probe.append(paperCopy(page)));
      body.append(probe);
      const height=Math.max(...Array.from(probe.children,page=>page.getBoundingClientRect().height));
      probe.remove();
      body.style.setProperty('--binder-page-height',`${Math.ceil(height+parseFloat(padding.paddingTop)+parseFloat(padding.paddingBottom))}px`);
    };
    let width=0;
    const observer=new ResizeObserver(entries=>{
      const next=entries[0].contentRect.width;
      if(Math.abs(next-width)<1)return;
      width=next;binderMotion?.stop?.();measure();
    });
    binderMotion={stop:null,measure,observer};measure();observer.observe(body);
  }
  function updateBinder(i) {
    const active=state.rooms[i].page,body=document.querySelector('.document-body');
    body.querySelectorAll('.paragraph').forEach((p,j)=>{p.hidden=j!==active;});
    document.querySelectorAll('.binder-pages-nav button').forEach((b,j)=>{if(j===active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
    document.querySelector('#binder-counter').textContent=`Blatt ${String(active+1).padStart(2,'0')} / ${String(rooms[i].sections.length).padStart(2,'0')}`;
    document.querySelector('#binder-prev').disabled=active===0;
    document.querySelector('#binder-next').disabled=active===rooms[i].sections.length-1;
  }
  function paperCopy(page) {
    const copy=page.cloneNode(true);
    copy.hidden=false;copy.removeAttribute('id');
    copy.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));
    copy.querySelectorAll('button').forEach(button=>{
      const label=document.createElement('span');label.className=button.className;label.textContent=button.textContent;button.replaceWith(label);
    });
    return copy;
  }
  function animatePaper(body,outgoing,incoming,direction) {
    if(!state.settings.motion || reducedMotion.matches || !body.animate)return;
    const scene=document.createElement('div');scene.className='binder-turn';scene.setAttribute('aria-hidden','true');scene.inert=true;
    if(direction<0){const under=document.createElement('div');under.className='binder-underpage';under.append(outgoing);scene.append(under);}
    const shadow=document.createElement('div');shadow.className='binder-turn-shadow';scene.append(shadow);
    const leaf=document.createElement('div');leaf.className='binder-leaf';
    const front=document.createElement('div');front.className='binder-leaf-front';
    const printed=direction>0?outgoing:paperCopy(incoming);front.append(printed);
    const light=document.createElement('span');light.className='binder-leaf-light';front.append(light);
    const curl=document.createElement('span');curl.className='binder-leaf-curl';front.append(curl);
    const back=document.createElement('div');back.className='binder-leaf-back';
    const ghost=paperCopy(printed);ghost.classList.add('binder-ink-bleed');back.append(ghost);
    leaf.append(front,back);scene.append(leaf);body.append(scene);
    const options={duration:500,easing:'cubic-bezier(.4,0,.2,1)',fill:'both',direction:direction>0?'normal':'reverse'};
    const animation=leaf.animate([
      {transform:'rotateY(0deg) rotateZ(0deg)',opacity:1,offset:0},
      {transform:'rotateY(-24deg) rotateZ(-.6deg)',opacity:1,offset:.22},
      {transform:'rotateY(-82deg) rotateZ(-1.2deg)',opacity:1,offset:.55},
      {transform:'rotateY(-142deg) rotateZ(-.4deg)',opacity:1,offset:.86},
      {transform:'rotateY(-172deg) rotateZ(0deg)',opacity:0,offset:1}
    ],options);
    const animations=[animation,
      shadow.animate([{opacity:0,transform:'scaleX(1)'},{opacity:.3,transform:'scaleX(.55)',offset:.45},{opacity:0,transform:'scaleX(.06)'}],options),
      light.animate([{opacity:0},{opacity:.55,offset:.5},{opacity:.1}],options),
      curl.animate([{transform:'rotateY(0deg)'},{transform:'rotateY(-26deg)',offset:.4},{transform:'rotateY(0deg)'}],options)
    ];
    const controller=binderMotion;
    const cleanup=()=>{animations.forEach(a=>a.cancel());scene.remove();if(controller?.stop===cleanup)controller.stop=null;};
    controller.stop=cleanup;
    Promise.all(animations.map(a=>a.finished.catch(()=>{}))).then(cleanup);
  }
  function turnPage(target) {
    if(current.view!=='room')return;
    const i=current.room,previous=state.rooms[i].page,next=Math.max(0,Math.min(rooms[i].sections.length-1,target));
    if(previous===next)return;
    pendingTextSelection=null;
    binderMotion?.stop?.();
    const body=document.querySelector('.document-body'),outgoing=paperCopy(body.querySelector(':scope > .paragraph:not([hidden])'));
    state.rooms[i].page=next;updateBinder(i);persist();
    animatePaper(body,outgoing,body.querySelector(':scope > .paragraph:not([hidden])'),next>previous?1:-1);
  }
  function notesReady(i) { return rooms[i].fields.map((f,j)=>state.rooms[i].notes[j].trim().length >= f.min); }
  function answersReady(i) { const values=rooms[i].puzzleType==='order'?orderValues(i):state.rooms[i].answers;return rooms[i].exercises.map((ex,j)=>(ex.type==='cloze'?canonical(values[j]):values[j].trim()) === ex.answer); }
  function checkEvidence() {
    const good=evidenceReady(current.room),feedback=document.querySelector('#clue-feedback');
    good.forEach((ok,j)=>{document.querySelector(`#clue-${j}`).dataset.invalid=String(!ok);document.querySelectorAll(`#clue-${j} input`).forEach(el=>el.setAttribute('aria-invalid',String(!ok)));});
    feedback.className=`check-feedback ${good.every(Boolean)?'good':'error'}`;
    feedback.textContent=good.every(Boolean)?`Beweisstück gesichert. ${rooms[current.room].evidenceCheck.reward}`:good.some(Boolean)?`Eine von zwei Spuren stimmt. Prüft Spur ${good.findIndex(ok=>!ok)+1} noch einmal anhand der Akte.`:'Noch keine Spur stimmt. Lest die Fallangaben und Anlagen noch einmal.';
    document.querySelector('.evidence-check .small-badge').textContent=`${good.filter(Boolean).length} / 2`;
    const stamp=document.querySelector('.evidence-stamp-result');stamp.classList.toggle('secured',good.every(Boolean));stamp.textContent=good.every(Boolean)?'✓ BEWEISSTÜCK GESICHERT':'BEWEISSTÜCK OFFEN';stamp.setAttribute('aria-label',good.every(Boolean)?'Beweisstück gesichert':'Beweisstück noch offen');
  }
  function checkPuzzle() {
    const good = answersReady(current.room);
    if(rooms[current.room].puzzleType==='order'){state.rooms[current.room].answers=orderValues(current.room);queueSave();}
    good.forEach((ok,j)=>{document.querySelector(`#task-${j}`).dataset.invalid=String(!ok);document.querySelectorAll(`#task-${j} input`).forEach(el=>el.setAttribute('aria-invalid',String(!ok)));});
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
    if (!state.rooms[i].completed && !evidenceReady(i).every(Boolean)) { feedback.textContent = 'Sichert zuerst die beiden Spuren in der Spurenprüfung.'; checkEvidence(); return; }
    if (!answers.every(Boolean)) { feedback.textContent = 'Prüft zuerst die vier Fachaufgaben. Ein Code allein reicht zum Öffnen noch nicht.'; checkPuzzle(); return; }
    if (document.querySelector('#door-code').value.trim() !== rooms[i].code) { feedback.textContent = 'Der Code passt noch nicht. Prüft die Reihenfolge der Kennziffern. Eure Einträge bleiben erhalten.'; document.querySelector('#door-code').setAttribute('aria-invalid','true'); return; }
    state.rooms[i].completed = true; persist();
    sound();
    const overlay = document.querySelector('#unlock-overlay');
    const reduced = !state.settings.motion || matchMedia('(prefers-reduced-motion: reduce)').matches;
    feedback.className = 'check-feedback good'; feedback.textContent = 'Code richtig. Die Tür öffnet sich.';
    if (!reduced) overlay.classList.add('show');
    setTimeout(()=>{overlay.classList.remove('show');if (i<5) navigate('room',i+1);else {navigate('finale');toast('Alle Türen geöffnet. Verbindet jetzt eure Erkenntnisse im Neustartplan.');}},reduced?100:950);
  }
  let doorAudio;
  function sound(reportError = false) {
    if (!state.settings.sound) return false;
    try {
      if (!doorAudio) {
        doorAudio = new Audio('assets/door-open.mp3');
        doorAudio.preload = 'auto';
        doorAudio.volume = .65;
      }
      doorAudio.pause();
      if (doorAudio.readyState > 0) doorAudio.currentTime = 0;
      const playback = doorAudio.play();
      if (playback?.catch) playback.catch(() => { if (reportError) toast('Der Türklang konnte nicht abgespielt werden.'); });
      return true;
    } catch (error) { return false; }
  }
  function showModal(title, html) { document.querySelector('#modal-title').textContent=title;document.querySelector('#modal-body').innerHTML=html;if(!modal.open)modal.showModal(); }
  function renderNotebook() {
    main.innerHTML = `<div class="page"><div class="book-heading"><div><h1>Euer Ermittlungsheft</h1><p>Belege, Erkenntnisse und Entscheidungen aus allen sechs Akten. Persönliche Einträge bleiben in diesem Browser. Sichert ein Backup für einen Gerätewechsel.</p></div><div class="button-group"><button class="button" data-action="export-md">Heft herunterladen${icon('book')}</button><button class="button secondary" data-action="print">Drucken / PDF</button></div></div><div class="profile-row"><div class="field"><label for="profile-name">Name oder Kürzel (optional)</label><input id="profile-name" data-profile="name" maxlength="120" value="${E(state.name)}" autocomplete="off"></div><div class="field"><label for="profile-team">Team (optional)</label><input id="profile-team" data-profile="team" maxlength="120" value="${E(state.team)}" autocomplete="off"></div><button class="button secondary" data-action="export-json">Backup sichern</button><button class="text-button" data-action="import">Backup importieren</button></div><p class="print-only">Name: ${E(state.name||'________________')} · Team: ${E(state.team||'________________')}</p>${rooms.map((r,i)=>`<article class="book-entry"><h2>${icon(r.icon)}${i+1}. ${E(r.name)}<span class="entry-state">${status(i)}</span></h2><p class="entry-meta">${E(r.topic)} · ${notesReady(i).filter(Boolean).length}/3 Einträge vorhanden</p><dl>${r.fields.map((f,j)=>`<dt>${E(f.label)}</dt><dd>${state.rooms[i].notes[j]?E(state.rooms[i].notes[j]):'<span class="empty-note">Hier wartet noch eure Erkenntnis.</span>'}</dd>`).join('')}</dl><p class="entry-meta">Türcode: ${state.rooms[i].completed||preview?E(r.code):'nach dem Öffnen verfügbar'}</p><p class="marks-summary">Markierte Belege: ${state.rooms[i].marked.length?state.rooms[i].marked.map(m=>`Absatz ${m+1}`).join(', '):'noch keine'}</p><button class="button secondary" data-action="room" data-room="${i}" aria-disabled="${!available(i)}">${available(i)?'Einträge weiterbearbeiten':'Raum noch verschlossen'}${icon(available(i)?'arrow':'lock')}</button></article>`).join('')}${finaleNotebookHTML()}</div>`;
  }

  function finaleNotebookHTML() {
    if(!finaleAvailable() && !state.finale.notes.some(Boolean))return '';
    return `<article class="book-entry finale-book"><h2>${icon('factory')}Abschluss: Der Neustartplan<span class="entry-state">${state.finale.completed?'Fabrik gestartet':'In Arbeit'}</span></h2><dl>${finale.fields.map((f,i)=>`<dt>${E(f.label)}</dt><dd>${E(state.finale.notes[i]||'Noch kein Eintrag.')}</dd>`).join('')}</dl><p class="entry-meta">Türcodes: ${E(state.finale.codes.filter(Boolean).join(' / ')||'noch nicht zusammengeführt')} · Startcode: ${E(state.finale.startCode||'noch offen')}</p><button class="button secondary" data-action="finale">Neustartplan weiterbearbeiten</button></article>`;
  }
  function renderFinale() {
    const f=state.finale;
    main.innerHTML=`<div class="page finale-page"><div class="breadcrumb"><button data-action="home">← Fabrikplan</button><span>/</span><span>Abschlussauftrag</span></div><div class="book-heading"><div><h1>Der Neustart</h1><p>Verbindet die sechs Akten zu einem begründeten Unternehmensplan. Alle sechs Türcodes werden für den gemeinsamen Startcode benötigt.</p></div><button class="button secondary" data-action="notebook">Ermittlungsheft sichern</button></div>${f.completed?`<section class="restart-success" aria-labelledby="restart-title"><img src="assets/factory.png" alt="Die Schokoladenfabrik ist für den fiktiven Neustart freigegeben." width="1536" height="1024"><div><h2 id="restart-title" tabindex="-1">Die Fabrik ist wieder in Betrieb.</h2><p>Der Startcode stimmt. Euer Neustartplan ist gespeichert und bleibt bearbeitbar. Stellt eure Entscheidung vor und prüft gemeinsam die Begründungen.</p></div></section>`:''}<nav class="finale-links" aria-label="Akten für den Abschlussauftrag">${rooms.map((r,i)=>`<button data-action="room" data-room="${i}">Akte ${String.fromCharCode(65+i)} · ${E(r.name)}</button>`).join('')}<button data-action="glossary">Fachbegriffe</button></nav><div class="finale-layout"><article class="finale-case" aria-labelledby="final-case-title"><h2 id="final-case-title" tabindex="-1">Neue Lage, neuer Beschluss</h2><p>Die Geschäftsleitung bittet euch um eine gemeinsame Entscheidungsvorlage. Die Nachfrage ist gestiegen, während Materialversorgung und Arbeitsschutz noch nicht verlässlich geklärt sind. Der folgende fiktive Fall spielt weiterhin im Jahr 2024.</p><dl><dt>Auftrag und Strategie</dt><dd>Für das nächste Jahr werden 150.000 Pralinenhüllen erwartet. Hohe Qualität und nachvollziehbare Kakaoherkunft bleiben verbindliche Ziele. Der Versand darf nur freigegebene Chargen verschicken.</dd><dt>Kosten und Kapazität</dt><dd>Eigenfertigung: 12.000 € fixe Jahreskosten plus 0,20 € je Hülle. Fremdbezug: 0,30 € je Hülle. Beide erfüllen zunächst dieselben Qualitätsanforderungen. Die eigene Anlage kann höchstens 160.000 Hüllen pro Jahr herstellen. Als zusätzliches Szenario ist eine Nachfrage von 180.000 Hüllen zu prüfen. Für das Modell sind zusätzliche Fremdbezugsmengen verfügbar; weitere Kosten werden nicht angesetzt.</dd><dt>Kakao und Verpackungen</dt><dd>Zu Beginn von Tag 1: 480 kg Kakao. Tagesverbrauch: 80 kg. Ersatzlieferung: zu Beginn von Tag 9. Auch zusätzlicher Kakao bleibt im betrachteten Zeitraum nutzbar, benötigt aber Platz und Kapital. Verpackungen kommen zuverlässig von einem regionalen Lieferanten; unterschiedliche Schachteln werden in der Produktionsreihenfolge gebraucht.</dd><dt>Lieferantenbefunde</dt><dd>Beim unmittelbaren Verpackungslieferanten sind verschlossene Fluchtwege dokumentiert. Bei einem mittelbaren Kakaoverarbeiter liegt ein konkreter Hinweis auf gefährliche Kinderarbeit vor. Die Rechtsregeln und Fallannahmen stehen vollständig in Akte E, Rechtsblätter E2 bis E5.</dd></dl><h3>Was eure Vorlage leisten soll</h3><p>Verknüpft Ursachen und Folgen. Nutzt aus jeder der sechs Akten mindestens einen konkreten Absatzbeleg. Nennt Zuständigkeiten, überprüfbare Wirkung und eine begründete Abwägung. Unterschiedliche Empfehlungen sind möglich.</p></article><section class="finale-work" aria-labelledby="final-work-title"><h2 id="final-work-title" tabindex="-1">Euer gemeinsamer Neustartplan</h2><p>Besprecht im Team und sichert eure eigene Fassung. Die Mindestlänge prüft nur den Arbeitsstand; die fachliche Qualität wird gemeinsam besprochen.</p>${finale.fields.map((field,i)=>`<div class="field"><label for="final-note-${i}">${i+1}. ${E(field.label)}</label><p class="prompt" id="final-prompt-${i}">${E(field.prompt)}</p><textarea id="final-note-${i}" data-final-note="${i}" maxlength="30000" aria-describedby="final-prompt-${i} final-note-meta-${i}">${E(f.notes[i])}</textarea><div class="field-meta"><span id="final-note-meta-${i}">${f.notes[i].trim().length} Zeichen · mindestens ${field.min} als Arbeitsnachweis</span></div></div>`).join('')}</section></div><section class="finale-lock" aria-labelledby="final-lock-title"><h2 id="final-lock-title" tabindex="-1">Sechs Türcodes, ein Startcode</h2><p>Übertragt alle sechs Türcodes. Ihr findet eure geöffneten Codes im Ermittlungsheft. Entnehmt jedem Code die unten genannte Ziffer; zählt dabei von links. Setzt diese sechs Ziffern in der Reihenfolge der Akten A bis F zum Startcode zusammen.</p><button class="text-button" data-action="notebook">Codepass im Ermittlungsheft ansehen →</button><ol class="finale-code-list">${rooms.map((r,i)=>`<li><div><label for="final-code-${i}">Akte ${String.fromCharCode(65+i)} · ${E(r.name)}</label><span id="final-code-help-${i}">Für den Startcode: ${finale.positions[i]+1}. Ziffer von links</span></div><input id="final-code-${i}" data-final-code="${i}" type="text" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="off" aria-describedby="final-code-help-${i} final-codes-feedback" value="${E(f.codes[i])}" placeholder="····"></li>`).join('')}</ol><button class="button secondary" data-action="check-final-codes">Sechs Türcodes prüfen</button><p id="final-codes-feedback" class="check-feedback" role="status" aria-live="polite"></p><form id="final-start-form" class="finale-start"><div class="field"><label for="final-start-code">Sechsstelliger Startcode</label><input id="final-start-code" type="text" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="off" required aria-describedby="final-start-feedback" value="${E(f.startCode)}" placeholder="6 Ziffern"></div><button class="button" type="submit">Fabrik neu starten${icon('factory')}</button></form><p id="final-start-feedback" class="check-feedback" role="status" aria-live="polite"></p></section><nav class="room-quicknav" aria-label="Schnellzugriff im Abschlussauftrag"><button data-action="jump" data-target="final-case-title">${icon('file')}Fall</button><button data-action="jump" data-target="final-work-title">${icon('book')}Plan</button><button data-action="jump" data-target="final-lock-title">${icon('lock')}Codes</button><button data-action="notebook">${icon('book')}Heft</button></nav></div>`;
  }
  function invalidateFinale() {
    if(state.finale.completed && !finale.canStart(state.finale)){state.finale.completed=false;document.querySelector('.restart-success')?.remove();}
    document.querySelector('#final-start-code')?.removeAttribute('aria-invalid');
  }
  function checkFinalCodes() {
    const good=finale.codesReady(state.finale);
    good.forEach((ok,i)=>document.querySelector(`#final-code-${i}`).setAttribute('aria-invalid',String(!ok)));
    const feedback=document.querySelector('#final-codes-feedback');feedback.className=`check-feedback ${good.every(Boolean)?'good':'error'}`;
    feedback.textContent=good.every(Boolean)?'Alle sechs Türcodes stimmen. Entnehmt jetzt die angegebenen Ziffern für den Startcode.':`Prüft den Türcode aus Akte ${good.map((ok,i)=>ok?null:String.fromCharCode(65+i)).filter(Boolean).join(', ')}. Der Codepass im Ermittlungsheft hilft euch.`;
    return good.every(Boolean);
  }
  function startFactory() {
    if(!finaleAvailable())return;
    const feedback=document.querySelector('#final-start-feedback');feedback.className='check-feedback error';
    const missing=finale.notesReady(state.finale).map((ok,i)=>ok?null:i+1).filter(Boolean);
    if(missing.length){feedback.textContent=`Ergänzt zuerst Teil ${missing.join(', ')} eures Neustartplans. Eure Einträge bleiben erhalten.`;return;}
    if(!checkFinalCodes()){feedback.textContent='Für den Neustart müssen alle sechs Türcodes stimmen.';return;}
    if(state.finale.startCode.trim()!==finale.expectedCode()){feedback.textContent='Der Startcode passt noch nicht. Zählt die Ziffern von links und verbindet sie in der Reihenfolge A bis F.';document.querySelector('#final-start-code').setAttribute('aria-invalid','true');return;}
    state.finale.completed=true;persist();sound();renderFinale();document.querySelector('#restart-title').focus();toast('Startcode richtig. Die Fabrik ist wieder in Betrieb.');
  }

  function renderTeacher() {
    main.innerHTML = `<div class="page"><div class="book-heading"><div><h1>Für die Lehrkraft</h1><p>Unterrichtsablauf, Erwartungshorizonte und lokale Freigaben. Offene Antworten werden im Unterricht besprochen.</p></div><button class="button secondary" data-action="release-all">Alle Räume lokal freigeben</button></div><div class="teacher-intro"><strong>Transparente Unterrichtshilfe</strong><p>Dieser Bereich ist offen zugänglich. Freigaben und Arbeitsstände betreffen ausschließlich diesen Browser, ohne Klassenübersicht oder gemeinsame Datensammlung. Für individuelle Nachweise exportiert jede Person ihr eigenes Ermittlungsheft.</p><div class="local-status">${rooms.map((r,i)=>`<span>${i+1}. ${state.rooms[i].completed?'Abgeschlossen':state.rooms[i].released?'Freigegeben':'Noch offen'}</span>`).join('')}</div></div><div class="teacher-grid"><article><h2>Unterrichtsablauf</h2><ol><li>Einstieg, Strategiebüro und Produktionshalle. Ergebnissicherung: Strategie und Prozesskette.</li><li>Einkaufsabteilung und Lager. Ergebnissicherung: Kostenvergleich und begründete Beschaffung.</li><li>Prüfarchiv und Vorbereitung der Argumentation. Ergebnissicherung: Befund, Maßnahme, Wirksamkeit.</li><li>Geschäftsleitung, Teampräsentationen und individueller Transfer. Gemeinsame Sicherung offener Fragen.</li></ol></article><article><h2>Was beurteilt wird</h2><ul><li>Fachliche Richtigkeit und trennscharfe Begriffe.</li><li>Konkrete Belege mit Absatz- oder Vorschriftenverweis.</li><li>Erklärte Ursachen, Folgen und Wechselwirkungen.</li><li>Nachvollziehbare Kriterien und ernsthafte Gegenargumente.</li><li>Begründetes Urteil und Transfer auf einen anderen Betrieb.</li></ul><p>Die Mindestlänge der Eingaben ist nur eine Arbeitsstandskontrolle. Geschwindigkeit und Hilfenutzung werden nicht bewertet.</p></article></div><h2>Akten und Erwartungshorizonte</h2>${rooms.map((r,i)=>`<details class="solution"><summary>${i+1}. ${E(r.name)} · ${E(r.topic)}</summary><div class="solution-body"><p><strong>Erwartungshorizont</strong><br>${E(r.solution)}</p><p><strong>Transferfrage</strong><br>${E(r.transfer)}</p><button class="button secondary" data-action="release" data-room="${i}">Raum auf diesem Gerät freigeben</button></div></details>`).join('')}<div class="teacher-grid"><article><h2>Differenzierung</h2><p>Absatznummern, Glossar und drei Hilfestufen unterstützen die Textarbeit. Stärkere Teams prüfen Modellannahmen und alternative Entscheidungen. Bei Schwierigkeiten kann ein Raum ohne Verlust der Einträge freigegeben werden.</p></article><article><h2>Material und Rechtsstand</h2><p>Die Lerntexte sind eigenständige Bearbeitungen eurer Themen. Historische Fälle werden nicht als heutige Unternehmensdaten dargestellt. Akte E spielt ausdrücklich im Jahr 2024. Vor einer Aktualisierung sind die aktuelle Gesetzesfassung und der Anwendungsbereich neu zu prüfen.</p></article></div></div>`;
  }
  function exportText() {
    return `# Ermittlungsheft: Die verschlossene Schokoladenfabrik\n\nName: ${state.name||'Nicht angegeben'}\nTeam: ${state.team||'Nicht angegeben'}\nDatum: ${new Date().toLocaleDateString('de-DE')}\nFortschritt: ${done()} von 6 Türen\n\n`+rooms.map((r,i)=>`## ${i+1}. ${r.name}\n\n${status(i)}\n\n`+r.fields.map((f,j)=>`### ${f.label}\n\n${state.rooms[i].notes[j]||'Noch kein Eintrag.'}\n`).join('\n')+`\nMarkierte Belege: ${state.rooms[i].marked.map(m=>`Absatz ${m+1}`).join(', ')||'Keine'}\n\nMarkierte Textstellen:\n${(state.rooms[i].highlights||[]).map(h=>`- Absatz ${h.paragraph+1}: ${r.sections[h.paragraph].text.slice(h.start,h.end)}`).join('\n')||'Keine'}\n\n`).join('')+`## Abschluss: Neustartplan\n\n${state.finale.completed?'Fabrik neu gestartet':'Noch in Arbeit'}\n\n`+finale.fields.map((f,i)=>`### ${f.label}\n\n${state.finale.notes[i]||'Noch kein Eintrag.'}\n`).join('\n')+`\nTürcodes: ${state.finale.codes.join(' / ')}\nStartcode: ${state.finale.startCode}\n`;
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
    jump:b=>{const target=document.getElementById(b.dataset.target);if(!target)return;target.focus({preventScroll:true});target.scrollIntoView({block:'start',behavior:state.settings.motion&&!reducedMotion.matches?'smooth':'instant'});},
    report:b=>{selectedReport=b.dataset.value;document.querySelectorAll('[data-action=report]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.value===selectedReport)));document.querySelector('#matching-status').textContent='Bericht gewählt. Wählt jetzt eine Abteilung.';},
    assign:b=>{if(!selectedReport){document.querySelector('#matching-status').textContent='Wählt zuerst einen Bericht aus.';return;}const j=Number(b.dataset.slot),answers=state.rooms[current.room].answers,previous=answers.indexOf(selectedReport),old=answers[j];if(previous!==-1&&previous!==j)answers[previous]=old;answers[j]=selectedReport;selectedReport='';refreshPuzzle();answerChanged();document.querySelector(`[data-action=assign][data-slot="${j}"]`).focus();},
    'move-step':b=>{const j=Number(b.dataset.step),target=j+Number(b.dataset.delta);if(target<0||target>3)return;const values=orderValues(current.room),moved=values[j];[values[j],values[target]]=[values[target],values[j]];state.rooms[current.room].answers=values;refreshPuzzle();answerChanged();document.querySelector('#order-status').textContent=`Station auf Position ${target+1} verschoben.`;const row=document.querySelector(`[data-value="${moved}"]`);row.querySelector('button:not(:disabled)').focus();},
    finale:()=>navigate('finale'), 'check-final-codes':checkFinalCodes,
    home:()=>navigate('home'), notebook:()=>navigate('notebook'), teacher:()=>navigate('teacher'), room:b=>navigate('room',Number(b.dataset.room)),
    page:b=>turnPage(Number(b.dataset.page)), 'prev-page':()=>turnPage(state.rooms[current.room].page-1), 'next-page':()=>turnPage(state.rooms[current.room].page+1),
    'close-modal':()=>modal.close(), check:checkPuzzle, 'check-clues':checkEvidence,
    instructions:()=>showModal('Eure Mission in fünf Schritten',`<ol><li>Öffnet den ersten Raum und lest die Nachricht aus der Fabrik.</li><li>Erschließt die Akte. Markiert passende Wörter, Sätze oder ganze Absätze als Textbelege.</li><li>Haltet drei Ergebnisse im persönlichen Ermittlungsheft fest.</li><li>Sichert zwei verknüpfte Spuren und löst die vier Fachaufgaben. Bei Bedarf helfen Glossar und Hinweise.</li><li>Gebt die Kennziffern in der geforderten Reihenfolge ein. Die nächste Tür öffnet sich.</li></ol><p>Im Team rätseln, individuell festhalten: Jede Person sollte ein eigenes Gerät oder ein eigenes exportiertes Heft verwenden. Es gibt keinen Countdown. Einträge werden lokal gespeichert.</p><button class="button" data-action="start-from-modal">Ersten Raum betreten${icon('arrow')}</button>`),
    'start-from-modal':()=>{modal.close();navigate('room',0);},
    glossary:()=>showModal('Fachbegriffe',`<dl class="glossary-list">${Object.entries(glossary).map(([term,meaning])=>`<div><dt>${E(term)}</dt><dd>${E(meaning)}</dd></div>`).join('')}</dl>`),
    large:()=>{state.settings.large=!state.settings.large;settings();persist();const button=document.querySelector('[data-action=large]');button.textContent=state.settings.large?'Text kleiner':'Text größer';button.setAttribute('aria-pressed',String(state.settings.large));},
    mark:b=>{const i=current.room,j=Number(b.dataset.paragraph), marks=state.rooms[i].marked;state.rooms[i].marked=marks.includes(j)?marks.filter(n=>n!==j):[...marks,j];const marked=state.rooms[i].marked.includes(j);b.closest('.paragraph').classList.toggle('marked',marked);b.setAttribute('aria-pressed',String(marked));b.setAttribute('aria-label',`Absatz ${j+1} ${marked?'Markierung entfernen':'markieren'}`);b.textContent=marked?'✓ Absatz markiert':'Absatz markieren';queueSave();},
    'mark-text':markSelectedText,
    'unmark-text':b=>{const i=current.room,j=Number(b.dataset.paragraph),start=Number(b.dataset.start),end=Number(b.dataset.end);state.rooms[i].highlights=state.rooms[i].highlights.filter(h=>h.paragraph!==j||h.start!==start||h.end!==end);renderTextHighlights(i,j);persist();toast('Textmarkierung entfernt.');},
    hint:()=>{const i=current.room,s=state.rooms[i];if(s.hints>=3){toast('Alle drei Hinweise stehen unter dem Rätsel.');return;}s.hints++;document.querySelector('#hints').innerHTML=rooms[i].hints.slice(0,s.hints).map((h,j)=>`<p class="hint-text"><strong>Hinweis ${j+1}</strong><br>${E(h)}</p>`).join('');document.querySelector('#hint-count').textContent=`${s.hints} / 3 Hilfen`;if(s.hints===3)document.querySelector('[data-action=hint]').innerHTML=`${icon('bulb')} Alle Hinweise geöffnet`;persist();toast(`Hinweis ${s.hints} ist geöffnet.`);},
    settings:()=>showModal('Einstellungen & Datensicherung',`<p>Passt die Website an eure Arbeitsweise an.</p>${[['motion','Animationen','Türen und kurze Übergänge. Die Geräteeinstellung für reduzierte Bewegung hat Vorrang.'],['sound','Kurzer Türklang','Standardmäßig eingeschaltet. Der Klang startet nach einer Berührung.'],['dark','Dunkle Lesefläche','Für weniger helle Aktenflächen.'],['large','Größere Textschrift','Vergrößert die Lerntexte.']].map(([k,label,desc])=>`<div class="setting-row"><label for="setting-${k}">${label}<small>${desc}</small></label><input id="setting-${k}" data-setting="${k}" type="checkbox" ${state.settings[k]?'checked':''}></div>`).join('')}<button class="button secondary sound-preview" data-action="test-sound">Türklang probehören</button><div class="setting-actions"><button class="button secondary" data-action="export-json">Backup sichern</button><button class="button secondary" data-action="import">Backup importieren</button><button class="button secondary danger-button" data-action="reset">Neustart vorbereiten</button></div><p style="margin-top:20px">Keine Konten, keine Cloud-Synchronisation. Browserdaten löschen entfernt die gespeicherten Einträge. Auf gemeinsam genutzten Geräten vor dem Wechsel exportieren und zurücksetzen.</p>`),
    'test-sound':()=>{if(!state.settings.sound){toast('Aktiviere zuerst den Türklang.');return;}if(!sound(true))toast('Der Türklang ist in diesem Browser nicht verfügbar.');},
    'export-md':()=>download('Ermittlungsheft-Schokoladenfabrik.md',exportText(),'text/markdown;charset=utf-8'),
    'export-json':()=>{persist();download('Schokoladenfabrik-Backup.json',JSON.stringify(state,null,2),'application/json');},
    print:()=>{persist();window.print();},
    import:importBackup, 'confirm-import':confirmImport,
    reset:()=>showModal('Neue Mission starten?', '<p>Dadurch werden alle Einträge, Markierungen, Hilfen und geöffneten Türen auf diesem Gerät gelöscht. Exportiere vorher ein Backup.</p><div class="button-group"><button class="button secondary" data-action="export-json">Backup sichern</button><button class="button secondary" data-action="close-modal">Zurück zur Mission</button><button class="button danger-button" data-action="confirm-reset">Lokale Mission löschen</button></div>'),
    'confirm-reset':()=>{state=blank();storageAvailable=true;initialWarning='';persist();modal.close();settings();navigate('home');toast('Eine neue Mission ist bereit.');},
    release:b=>{const i=Number(b.dataset.room);state.rooms[i].released=true;persist();renderTeacher();toast(`${rooms[i].name} ist auf diesem Gerät freigegeben.`);},
    'release-all':()=>{state.rooms.forEach(r=>r.released=true);persist();renderTeacher();toast('Alle Räume sind lokal freigegeben. Die Codes bleiben ungelöst.');},
    presentation:()=>showModal('Präsentation: Der Neustart', '<p>Stellt euren Unternehmensplan vor.</p><ol><li>Wie ist die Fabrik organisiert und welcher Ablauf wird verbessert?</li><li>Welche Leistung stellt sie selbst her, welche kauft sie ein?</li><li>Welche Beschaffungsstrategie passt zu Kakao und Verpackungen?</li><li>Wie werden Risiken und festgestellte Verletzungen in der Lieferkette bearbeitet?</li><li>Welchen Zielkonflikt habt ihr wie abgewogen?</li></ol><p>Nutzt mindestens drei Belege aus unterschiedlichen Akten. Nennt einen ernsthaften Einwand und eine Bedingung, unter der ihr euren Plan ändern würdet.</p>'),
    about:()=>showModal('Über dieses Lernspiel', '<p>Ein Lernspiel für Wirtschaft und Recht in der Q12. Unternehmensorganisation, Wertschöpfung, Beschaffung und Lieferkettenverantwortung werden durch eigenständige didaktische Texte verbunden.</p><p>Heller & Söhne und seine Unternehmensdaten sind fiktiv. Historische Fälle sind gekennzeichnet. Der Rechtsfall in Akte E spielt ausdrücklich im Jahr 2024. Quellenlinks stehen unter den jeweiligen Akten.</p><p>Das Fabrikmotiv wurde mit KI erstellt. Alle Beschriftungen und Interaktionen sind eigenständige Website-Elemente. Bewegung und Ton lassen sich abschalten.</p><p>Einträge bleiben lokal in eurem Browser. Es gibt keine Benutzerkonten, Analysewerkzeuge oder Übertragung eurer Notizen. Die offen zugänglichen Lehrkraftwerkzeuge sind für den Unterricht gedacht.</p><p>Nach dem ersten vollständigen Laden kann die Website bei unterstützten Browsern auch offline verwendet werden. Externe Quellen benötigen Internet.</p>')
  };
  document.addEventListener('click', event=>{const b=event.target.closest('[data-action]');if(!b)return;const action=actions[b.dataset.action];if(action){event.preventDefault();action(b);}});
  document.addEventListener('selectionchange', rememberTextSelection);
  document.addEventListener('input',event=>{
    const el=event.target;
    if(el.dataset.note!==undefined){const i=Number(el.dataset.room),j=Number(el.dataset.note);state.rooms[i].notes[j]=el.value;const count=el.value.trim().length,ready=count>=rooms[i].fields[j].min;document.querySelector(`#note-meta-${j}`).innerHTML=`<span>${count} Zeichen</span><span class="${ready?'ready':''}">${ready?'✓ Eintrag vorhanden':`Mindestens ${rooms[i].fields[j].min} Zeichen als Arbeitsnachweis`}</span>`;queueSave();}
    if(el.dataset.finalNote!==undefined){const i=Number(el.dataset.finalNote);state.finale.notes[i]=el.value;const count=el.value.trim().length;document.querySelector(`#final-note-meta-${i}`).textContent=`${count} Zeichen · mindestens ${finale.fields[i].min} als Arbeitsnachweis`;invalidateFinale();queueSave();}
    if(el.dataset.finalCode!==undefined){state.finale.codes[Number(el.dataset.finalCode)]=el.value;invalidateFinale();queueSave();}
    if(el.id==='final-start-code'){state.finale.startCode=el.value;invalidateFinale();queueSave();}
    if(el.dataset.profile){state[el.dataset.profile]=el.value;queueSave();}
    if(el.dataset.answer!==undefined){state.rooms[Number(el.dataset.room)].answers[Number(el.dataset.answer)]=el.value;answerChanged();}
    if(el.dataset.clue!==undefined){state.rooms[Number(el.dataset.room)].clueAnswers[Number(el.dataset.clue)]=el.value;document.querySelector(`#clue-${el.dataset.clue}`).dataset.invalid='false';document.querySelectorAll(`#clue-${el.dataset.clue} input`).forEach(input=>input.removeAttribute('aria-invalid'));document.querySelector('#clue-feedback').textContent='Spur geändert. Prüft eure beiden Spuren erneut.';document.querySelector('#clue-feedback').className='check-feedback';const stamp=document.querySelector('.evidence-stamp-result');stamp.classList.remove('secured');stamp.textContent='BEWEISSTÜCK OFFEN';stamp.setAttribute('aria-label','Beweisstück noch offen');queueSave();}
  });
  document.addEventListener('change',event=>{const el=event.target;if(el.dataset.setting){state.settings[el.dataset.setting]=el.checked;settings();persist();}});
  document.addEventListener('submit',event=>{if(event.target.id==='code-form'){event.preventDefault();openDoor();}if(event.target.id==='final-start-form'){event.preventDefault();startFactory();}});
  document.addEventListener('keydown',event=>{if(current.view==='room' && event.target.closest('.document') && !event.target.matches('input,textarea,select') && !modal.open && ['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();turnPage(state.rooms[current.room].page+(event.key==='ArrowRight'?1:-1));}});
  reducedMotion.addEventListener('change',()=>{if(reducedMotion.matches)binderMotion?.stop?.();});
  window.addEventListener('hashchange',route);
  window.addEventListener('beforeunload',()=>{clearTimeout(saveTimer);persist();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){binderMotion?.stop?.();persist();}});
  window.addEventListener('storage',event=>{if(event.key===key&&event.newValue)toast('Die Mission wurde in einem anderen Tab geändert. Verwendet möglichst nur einen Tab und sichert eure aktuellen Einträge.');});
  modal.addEventListener('click',event=>{if(event.target===modal){const rect=modal.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)modal.close();}});
  if(preview){
    document.querySelector('.site-header').insertAdjacentHTML('afterend',`<div class="preview-banner"><strong>Freie Vorschau</strong><span>Alle sechs Räume sind direkt zugänglich.</span><a href="${E(location.pathname)}">Zur Spielversion →</a></div>`);
  }
  settings();route();if(initialWarning)toast(initialWarning);
  if('serviceWorker' in navigator && location.protocol !== 'file:')navigator.serviceWorker.register('sw.js').catch(()=>{/* Offline-Speicherung ist optional, Notizen funktionieren unabhängig davon. */});
})();
