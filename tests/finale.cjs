const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const box={window:{}};
for(const file of ['content.js','finale.js'])vm.runInNewContext(fs.readFileSync('dist/'+file,'utf8'),box);
const F=box.window.FINALE,rooms=box.window.ROOMS;
const old=F.validate(undefined);assert.equal(old.notes.length,4);assert.equal(old.codes.length,6);assert.equal(old.completed,false);
assert.equal(F.canStart(old),false);
const solved=F.blank();solved.notes=F.fields.map(f=>'a'.repeat(f.min));solved.codes=rooms.map(r=>r.code);solved.startCode='745748';assert.equal(F.canStart(solved),true);
for(let i=0;i<6;i++){const wrong=F.validate(solved);wrong.codes[i]='0000';assert.equal(F.canStart(wrong),false,'Jeder der sechs Codes muss benötigt werden.');}
const missing=F.validate(solved);missing.notes[3]='';assert.equal(F.canStart(missing),false);
const wrongStart=F.validate(solved);wrongStart.startCode='111111';wrongStart.completed=true;assert.equal(F.validate(wrongStart).completed,false);
solved.completed=true;assert.equal(F.validate(JSON.parse(JSON.stringify(solved))).completed,true);
const invalidInput=F.validate({...solved,codes:['12x4',...solved.codes.slice(1)],completed:false});assert.equal(F.canStart(invalidInput),false);assert.equal(invalidInput.notes[0],solved.notes[0]);
assert.throws(()=>F.validate({...solved,codes:['7382']}));assert.throws(()=>F.validate({...solved,notes:['x']}));assert.throws(()=>F.validate({...solved,startCode:'<script>'}));
console.log('Abschluss: alte Backups, alle sechs Codes, Arbeitsstand, Startcode und sichere Wiederaufnahme geprüft.');
// Prüft den tatsächlichen Markdown-Export der Anwendung einschließlich aller Abschlusseinträge.
const app=fs.readFileSync('dist/app.js','utf8');
const exporter=app.slice(app.indexOf('  function exportText() {'),app.indexOf('  function download('));
const exportState={name:'QA',team:'Test',rooms:rooms.map(()=>({notes:['Notiz A','Notiz B','Notiz C'],marked:[],highlights:[]})),finale:{...solved,notes:['Organisation-Beleg','Kosten-Beleg','Versorgung-Beleg','Urteil-Beleg']}};
exportState.rooms[0].highlights=[{paragraph:0,start:4,end:10}];
box.exportState=exportState;
vm.runInNewContext('const rooms=window.ROOMS,finale=window.FINALE,state=exportState;const done=()=>6,status=()=>"Abgeschlossen";'+exporter+'\nmarkdownResult=exportText();',box);
for(const note of exportState.finale.notes)assert.ok(box.markdownResult.includes(note));
assert.ok(box.markdownResult.includes('7382 / 6419 / 8254 / 6927 / 4196 / 3825'));
assert.ok(box.markdownResult.includes('745748'));
assert.ok(box.markdownResult.includes(`Absatz 1: ${rooms[0].sections[0].text.slice(4,10)}`));
console.log('Markdown-Export enthält alle Abschlusseinträge und Codes.');
// Tatsächliche Importprüfung der App: ein älteres Backup ohne Abschluss bleibt lesbar.
const legacy={version:1,name:'Alt',team:'Team',settings:{motion:false,sound:false,dark:false,large:false},rooms:rooms.map(()=>({notes:['vorhandene Notiz','',''],answers:['','','',''],completed:false,released:false,hints:0,marked:[0],page:2})),updated:null};
const importBox={URLSearchParams,location:{search:""},window:box.window,document:{querySelector:()=>({})},matchMedia:()=>({matches:false}),legacy};
const prefix=app.slice(0,app.indexOf('  let state;'));
vm.runInNewContext(prefix+'window.validateMission=validate;})();',importBox);
const resumed=importBox.window.validateMission(legacy);assert.equal(resumed.rooms[0].notes[0],'vorhandene Notiz');assert.equal(resumed.rooms[0].page,2);assert.equal(resumed.finale.notes.length,4);assert.equal(resumed.settings.sound,true);assert.equal(resumed.rooms[0].highlights.length,0);
const withMarks=JSON.parse(JSON.stringify(legacy));withMarks.settings.soundDefaultVersion=2;withMarks.rooms[0].highlights=[{paragraph:0,start:4,end:10}];
const restored=importBox.window.validateMission(withMarks);assert.equal(restored.settings.sound,false);assert.equal(restored.rooms[0].highlights[0].end,10);
withMarks.rooms[0].highlights[0].end=99999;assert.throws(()=>importBox.window.validateMission(withMarks));
console.log('Alte Backups bleiben lesbar; Türklang-Vorgabe und Wortmarkierungen werden geprüft.');
