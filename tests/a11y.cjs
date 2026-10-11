const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const axePath=process.env.AXE_PATH;
if(!axePath)throw new Error('AXE_PATH muss auf axe.min.js zeigen.');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 const page=await context.newPage();
 await page.goto(process.env.TEST_URL||'http://127.0.0.1:4173');
 const reports=[];
 async function audit(label){await page.addScriptTag({path:axePath});const r=await page.evaluate(()=>axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}}));reports.push({label,violations:r.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),incomplete:r.incomplete.length});console.log(`${label}: ${r.violations.length} Verstöße, ${r.incomplete.length} manuell zu prüfende Gruppen`);}
 await audit('Fabrikplan');
 await page.getByRole('button',{name:'Mission beginnen'}).click();await audit('Strategiebüro');
 await page.getByRole('button',{name:'Einstellungen'}).click();await audit('Einstellungen-Dialog');await page.locator('#setting-dark').check();await page.getByRole('button',{name:'Fenster schließen'}).click();await audit('Dunkle Lesefläche');
 await page.getByRole('button',{name:'Ermittlungsheft',exact:true}).click();await audit('Ermittlungsheft');
 await page.goto(`${BASE}/#teacher`);await audit('Lehrkraft');
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Fabrikplan',exact:true}).click();await audit('Handy-Fabrikplan');
 const output=path.resolve(__dirname,'../test-results');fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'a11y.json'),JSON.stringify(reports,null,2));
 await browser.close();
 const violations=reports.flatMap(r=>r.violations);if(violations.length){console.log(JSON.stringify(violations,null,2));process.exit(1);}console.log('Keine automatisch erkannten WCAG 2.1 A/AA-Verstöße in den geprüften Ansichten.');
})().catch(e=>{console.error(e);process.exit(1);});
