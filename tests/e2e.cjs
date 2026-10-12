const { chromium, webkit } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const BASE = process.env.TEST_URL || 'http://127.0.0.1:4173';
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'test-results');
fs.mkdirSync(output, { recursive: true });
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'dist/content.js'), 'utf8'), sandbox);
const content = sandbox.window.ROOMS;
const codes = ['7382','6419','8254','6927','4196','3825'];
const analysis = 'Die Unternehmensstrategie muss mit konkreten Maßnahmen der Funktionsbereiche verbunden werden. Absatz 2 beschreibt Zuständigkeiten, während Absatz 4 die Zielkonflikte erläutert. Eine sichere Qualitätsfreigabe kann die Abläufe verbessern. Höhere Lagerbestände erhöhen die Versorgungssicherheit, binden aber Kapital. Wir wägen Kosten, Qualität und Risiken ab und prüfen die Wirkung der Maßnahmen.';
let passed = 0;
function pass(name) { passed++; console.log(`✓ ${name}`); }
(async()=>{
 const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
 const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
 const page = await context.newPage();
 const errors = [], assetErrors = [];
 page.on('pageerror', e=>errors.push(e.message));
 page.on('response',response=>{if(response.status()>=400 && response.url().startsWith(BASE))assetErrors.push(`${response.status()} ${response.url()}`);});
 assert.equal((await page.goto(BASE)).status(), 200);
 await page.waitForSelector('.room-door');
 await page.screenshot({path:path.join(output,'home-desktop.png'),fullPage:true});
 await page.locator('.room-door').nth(5).click({force:true});
 assert.equal(await page.locator('.hero h1').count(),1);
 await page.goto(`${BASE}/#raum/6`);
 assert.equal(await page.locator('.hero h1').count(),1);
 pass('Verschlossene Türen und direkte Raumlinks schützen den Spielablauf');
 await page.getByRole('button',{name:'So funktioniert’s'}).click();
 assert.equal(await page.locator('dialog').evaluate(e=>e.open),true);
 await page.keyboard.press('Escape');
 assert.equal(await page.locator('dialog').evaluate(e=>e.open),false);
 pass('Dialog lässt sich per Tastatur schließen');
 await page.getByRole('button',{name:'Mission beginnen'}).click();
 await page.locator('#door-code').fill(codes[0]);
 await page.locator('#code-form').getByRole('button',{name:'Tür öffnen'}).click();
 assert.match(await page.locator('#lock-feedback').textContent(),/Eintrag/);
 pass('Ein Code allein überspringt die Ergebnissicherung nicht');
 await page.locator('[data-action=mark]').first().click();
 await page.locator('[data-action=hint]').click();
 await page.locator('[data-action=hint]').click();
 await page.reload();
 assert.equal(await page.locator('.paragraph.marked').count(),1);
 assert.match(await page.locator('#hint-count').textContent(),/2 \/ 3/);
 pass('Textmarkierungen und Hilfestufen bleiben nach Neuladen erhalten');
 assert.equal(await page.locator('.paragraph:not([hidden])').count(),1);
 await page.getByRole('button',{name:'Nächste Seite',exact:true}).click();
 assert.match(await page.locator('#binder-counter').textContent(),/Blatt 02/);
 await page.getByRole('button',{name:'Nächste Seite',exact:true}).focus();await page.keyboard.press('ArrowRight');
 assert.match(await page.locator('#binder-counter').textContent(),/Blatt 03/);
 await page.reload();assert.match(await page.locator('#binder-counter').textContent(),/Blatt 03/);
 await page.getByRole('button',{name:'Seite 1: Eine Entscheidung mit Folgen',exact:true}).click();
 assert.equal(await page.locator('.paragraph.marked:not([hidden])').count(),1);
 pass('Blätterbare Ermittlungsakte: eine Seite je Absatz, Pfeiltasten und gespeicherte Seitenauswahl');
 for (let i=0;i<6;i++) {
   await page.waitForURL(`**/#raum/${i+1}`);
   for(let j=0;j<3;j++)await page.locator(`#note-${j}`).fill(analysis);
   if(i===0){await page.locator('[data-action=report][data-value=planung]').click();await page.locator('[data-action=assign][data-slot=0]').click();await page.getByRole('button',{name:'Lösungen prüfen'}).click();assert.match(await page.locator('#puzzle-feedback').textContent(),/Aufgabe 1/);}
   if(content[i].puzzleType==='matching'){
     for(let j=0;j<4;j++){await page.locator(`[data-action=report][data-value="${content[i].exercises[j].answer}"]`).click();await page.locator(`[data-action=assign][data-slot="${j}"]`).click();}
   }else if(content[i].puzzleType==='order'){
     for(let j=0;j<4;j++){
       let position=(await page.locator('.process-order li').evaluateAll(rows=>rows.map(row=>row.dataset.value))).indexOf(content[i].exercises[j].answer);
       while(position>j){await page.locator(`[data-action=move-step][data-step="${position}"][data-delta="-1"]`).click();position--;}
     }
   }else for(let j=0;j<4;j++){
     const ex=content[i].exercises[j];
     if(ex.type==='number'||ex.type==='cloze')await page.locator(`#answer-${j}`).fill(ex.answer);
     else await page.locator(`input[name="answer-${j}"][value="${ex.answer}"]`).check();
   }
   await page.getByRole('button',{name:`Seite 7: ${content[i].sections[6].title}`,exact:true}).click();
   assert.equal(await page.locator('.document-body > .paragraph:not([hidden]) .evidence-sheet').count(),1);
   assert.equal(await page.locator('#puzzle-interaction select').count(),0);
   await page.getByRole('button',{name:'Lösungen prüfen'}).click();
   assert.match(await page.locator('#puzzle-feedback').textContent(),/Alle vier/);
   if(i===0){await page.locator('#door-code').fill('0000');await page.locator('#code-form').getByRole('button',{name:'Tür öffnen'}).click();assert.match(await page.locator('#lock-feedback').textContent(),/passt noch nicht/);await page.screenshot({path:path.join(output,'room-desktop.png'),fullPage:true});}
   await page.locator('#door-code').fill(codes[i]);
   await page.locator('#code-form').getByRole('button',{name:'Tür öffnen'}).click();
 }
 await page.waitForSelector('.finale-page');
 assert.match(await page.locator('.book-heading h1').textContent(),/Der Neustart/);
 pass('Alle sechs Räume inklusive Rechnen, falschem Code und finaler Freigabe');
 await page.getByRole('button',{name:'Ermittlungsheft sichern'}).click();
 await page.locator('#profile-name').fill('Testperson');
 await page.locator('#profile-team').fill('Team Kakao');
 const mdPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Heft herunterladen'}).click();const md=await mdPromise;await md.saveAs(path.join(output,'heft.md'));
 assert.match(fs.readFileSync(path.join(output,'heft.md'),'utf8'),/Testperson/);
 assert.match(fs.readFileSync(path.join(output,'heft.md'),'utf8'),/6 von 6/);
 assert.equal(await page.locator('.book-entry').count(),7);
 const jsonPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Backup sichern',exact:true}).click();const json=await jsonPromise;await json.saveAs(path.join(output,'backup.json'));
 assert.equal(JSON.parse(fs.readFileSync(path.join(output,'backup.json'),'utf8')).rooms.filter(r=>r.completed).length,6);
 pass('Markdown und JSON-Backup enthalten Namen und vollständige Ergebnisse');
 await page.reload();assert.equal(await page.locator('#profile-name').inputValue(),'Testperson');
 await page.emulateMedia({media:'print'});await page.pdf({path:path.join(output,'heft.pdf'),format:'A4',printBackground:false});await page.emulateMedia({media:'screen'});
 pass('Druck/PDF-Ausgabe und Wiederaufnahme des Ermittlungshefts');
 await page.getByRole('button',{name:'Backup importieren'}).click();
 await page.locator('#backup-file').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{"version":99}')});
 await page.getByRole('button',{name:'Ausgewähltes Backup übernehmen'}).click();
 await page.waitForFunction(()=>document.querySelector('#import-info')?.textContent.includes('Import nicht möglich'));
 assert.match(await page.locator('#import-info').textContent(),/Import nicht möglich/);
 assert.equal(await page.locator('#profile-name').inputValue(),'Testperson');
 await page.getByRole('button',{name:'Fenster schließen'}).click();
 pass('Fehlerhafte Backups werden abgewiesen, Einträge bleiben erhalten');
 await page.getByRole('button',{name:'Einstellungen'}).click();
 await page.locator('#setting-motion').uncheck();
 await page.getByRole('button',{name:'Neustart vorbereiten'}).click();
 assert.match(await page.locator('dialog').textContent(),/gelöscht/);
 await page.getByRole('button',{name:'Lokale Mission löschen'}).click();
 assert.match(await page.locator('.progress-area').textContent(),/0 von 6/);
 await page.getByRole('button',{name:'Ermittlungsheft',exact:true}).click();
 await page.getByRole('button',{name:'Backup importieren'}).click();
 await page.locator('#backup-file').setInputFiles(path.join(output,'backup.json'));
 await page.getByRole('button',{name:'Ausgewähltes Backup übernehmen'}).click();
 await page.waitForFunction(()=>!document.querySelector('#modal').open);
 assert.equal(await page.locator('#profile-name').inputValue(),'Testperson');
 pass('Bestätigter Neustart und vollständiger Wiederimport');
 const evil=JSON.parse(fs.readFileSync(path.join(output,'backup.json'),'utf8'));evil.rooms[0].notes[0]='<img src=x onerror="window.INJECTED=true">';fs.writeFileSync(path.join(output,'evil.json'),JSON.stringify(evil));
 await page.getByRole('button',{name:'Backup importieren'}).click();await page.locator('#backup-file').setInputFiles(path.join(output,'evil.json'));await page.getByRole('button',{name:'Ausgewähltes Backup übernehmen'}).click();await page.waitForFunction(()=>!document.querySelector('#modal').open);
 assert.equal(await page.locator('.book-entry img').count(),0);assert.equal(await page.evaluate(()=>window.INJECTED),undefined);
 pass('Importierte Texte werden sicher als Text dargestellt');
 await page.getByRole('button',{name:'Fabrikplan',exact:true}).click();
 await page.evaluate(()=>navigator.serviceWorker.ready);
 await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 await context.setOffline(true);await page.reload();await page.waitForSelector('.room-door');assert.equal(await page.locator('.room-door').count(),6);await context.setOffline(false);
 pass('Offline-Wiederaufnahme nach vollständigem Laden');
 const mobile=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});const mp=await mobile.newPage();await mp.goto(BASE);await mp.screenshot({path:path.join(output,'home-mobile.png'),fullPage:true});
 assert.equal(await mp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await mp.getByRole('button',{name:'Mission beginnen'}).click();await mp.screenshot({path:path.join(output,'room-mobile.png'),fullPage:true});assert.equal(await mp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 assert.equal(await mp.locator('.paragraph p').first().evaluate(e=>parseFloat(getComputedStyle(e).fontSize)>=16),true);
 assert.equal(await mp.locator('.page').evaluate(e=>getComputedStyle(e).animationName),'none');
 await mp.getByRole('button',{name:'Einstellungen'}).click();await mp.locator('#setting-dark').check();await mp.getByRole('button',{name:'Fenster schließen'}).click();assert.equal(await mp.locator('body').evaluate(e=>e.classList.contains('dark-reader')),true);
 pass('Handy: kein Überlauf, lesbare Texte, reduced-motion und dunkle Lesefläche');
 await mobile.close();
 await page.setViewportSize({width:820,height:1180});await page.goto(`${BASE}/#raum/4`);await page.screenshot({path:path.join(output,'room-tablet.png'),fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 pass('Tablet-Hochformat ohne horizontalen Überlauf');
 assert.deepEqual(errors,[]);assert.deepEqual(assetErrors,[]);pass('Keine JavaScript-Laufzeitfehler oder fehlenden lokalen Dateien');
 await browser.close();
 if(process.env.TEST_WEBKIT==='1'){const safari=await webkit.launch({headless:true,timeout:10000,...(process.env.WEBKIT_PATH?{executablePath:process.env.WEBKIT_PATH}:{})});const sp=await safari.newPage({viewport:{width:1024,height:768}});await sp.goto(BASE);await sp.getByRole('button',{name:'Mission beginnen'}).click();await sp.locator('#note-0').fill(analysis);await sp.reload();assert.equal(await sp.locator('#note-0').inputValue(),analysis);await safari.close();pass('WebKit: Start und Speicherung funktionieren');}
 console.log(`\n${passed} Prüfgruppen bestanden.`);
})().catch(e=>{console.error(e);process.exit(1);});
