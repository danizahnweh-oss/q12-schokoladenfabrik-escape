/* Abschlussaufgabe: Fallmodell und reine Prüfregeln, keine Bewertung offener Urteile. */
(() => {
  const fields = [
    {label:'Organisation und Prozess', prompt:'Verbindet Akte A und B: Legt zwei abgestimmte Maßnahmen der Funktionsbereiche fest. Beschreibt die Kette von Rohstoffannahme bis Versand, eine kritische Informationsübergabe und die dafür verantwortlichen Stellen. Nennt je einen Absatzbeleg aus A und B.', min:200},
    {label:'Eigenfertigung oder Fremdbezug?', prompt:'Nutzt Akte C: Berechnet beide Gesamtkosten für 150.000 Hüllen. Begründet eure Empfehlung mit einem qualitativen Kriterium. Prüft auch die Nachfrage von 180.000 Hüllen bei maximal 160.000 Hüllen Eigenfertigung. Nennt einen Beleg aus C.', min:200},
    {label:'Versorgung und Verantwortung', prompt:'Verbindet Akte D und E: Berechnet einen Anfangsbestand, der die Versorgungslücke bis Tag 9 abdeckt. Begründet die Beschaffung von Kakao und Verpackungen getrennt. Plant für beide Lieferantenbefunde Maßnahme, Zuständigkeit und Wirksamkeitsprüfung. Nennt Belege aus D und E.', min:260},
    {label:'Beschluss der Geschäftsleitung', prompt:'Nutzt Akte F: Formuliert euren Gesamtbeschluss. Wägt einen konkreten Zielkonflikt ab, prüft einen ernsthaften Einwand und nennt eine Bedingung für eine andere Entscheidung. Priorisiert eure ersten Maßnahmen und belegt die Abwägung mit Akte F.', min:220}
  ];
  const positions = [0,1,2,3,0,1];
  const blank = () => ({notes:fields.map(()=>''),codes:window.ROOMS.map(()=>''),startCode:'',completed:false});
  const notesReady = f => fields.map((field,i)=>f.notes[i].trim().length>=field.min);
  const codesReady = f => window.ROOMS.map((room,i)=>f.codes[i].trim()===room.code);
  const expectedCode = () => window.ROOMS.map((room,i)=>room.code[positions[i]]).join('');
  const canStart = f => notesReady(f).every(Boolean) && codesReady(f).every(Boolean) && f.startCode.trim()===expectedCode();
  function validate(value) {
    if(value===undefined)return blank();
    if(!value || !Array.isArray(value.notes) || value.notes.length!==fields.length || value.notes.some(x=>typeof x!=='string'||x.length>30000) || !Array.isArray(value.codes) || value.codes.length!==6 || value.codes.some(x=>typeof x!=='string'|| x.length>4) || typeof value.startCode!=='string' || value.startCode.length>6 || typeof value.completed!=='boolean')throw new Error('Die Abschlussaufgabe im Backup ist ungültig.');
    const result={notes:[...value.notes],codes:[...value.codes],startCode:value.startCode,completed:false};
    result.completed=value.completed && canStart(result);
    return result;
  }
  window.FINALE={fields,positions,blank,notesReady,codesReady,expectedCode,canStart,validate};
})();
