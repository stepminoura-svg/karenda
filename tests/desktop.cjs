const {_electron}=require('playwright');const assert=require('node:assert/strict');const fs=require('node:fs/promises');const os=require('node:os');const path=require('node:path');
(async()=>{
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'karenda-desktop-'));let app;
 const launch=()=>_electron.launch({args:['.',...(process.platform==='linux'?['--no-sandbox','--ozone-platform=headless']:[])],env:{...process.env,XDG_CONFIG_HOME:temp,NODE_ENV:'test',KARENDA_TEST_DATA_DIR:temp},timeout:20000});
 const triggerChange=async(w,selector,value)=>{await w.locator(selector).fill(value);await w.locator(selector).dispatchEvent('change');};
 try {
  app=await launch();let w=await app.firstWindow();await w.waitForSelector('h1');
  const s=await w.evaluate(()=>desktop.load());s.students[0].name='保存テスト';s.students[0].plans=[{id:'test-plan',university:'テスト大学',faculty:'工',department:'情報',method:'一般',exam:'2/3',application:'1/20',result:'2/12',enrollment:'2/20',rank:'A',priority:'1',note:'IPC検証'}];
  await w.evaluate(s=>desktop.save(s),s);assert.equal((await w.evaluate(()=>desktop.load())).students[0].plans.length,1);
  await app.close();app=await launch();w=await app.firstWindow();await w.waitForSelector('h1');assert.match(await w.locator('h1').textContent(),/保存テスト/);
  await w.locator('nav [data-page="input1"]').click();await triggerChange(w,'[data-slot="1:2027-02-04:2"][data-draft-field="university"]','手入力大学');
  await w.locator('#input-apply').click();await w.locator('#input-target').selectOption('calendar2');await w.locator('#modal-form .primary').click();await w.waitForSelector('.sheet-detail');
  await w.locator('#sheet-split').click();await triggerChange(w,'[data-sheet-row="test-plan"] [data-plan-field="note14"]','15列目を保持');await triggerChange(w,'[data-remark="private"]','非印刷の個人メモ');await triggerChange(w,'[data-remark="first"]','印刷備考1');
  const backup=path.join(temp,'backup.json');await app.evaluate(({dialog},p)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:p});},backup);
  assert.equal(await w.evaluate(()=>desktop.backup()),true);assert.equal(JSON.parse(await fs.readFile(backup,'utf8')).students[0].plans[0].note14,'15列目を保持');
  for(const [page,name] of [['calendar','calendar1'],['calendar2','calendar2']]){
   await w.locator(`nav [data-page="${page}"]`).click();const pdf=path.join(temp,name+'.pdf');await app.evaluate(({dialog},p)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:p});},pdf);
   await w.locator('#sheet-pdf').click();await w.waitForFunction(()=>!document.body.classList.contains('printing-sheet'));
   await new Promise(r=>setTimeout(r,150));const bytes=await fs.readFile(pdf);assert.equal(bytes.subarray(0,5).toString(),'%PDF-');assert(bytes.length>1000);
  }
  await app.close();app=await launch();w=await app.firstWindow();await w.waitForSelector('h1');const persisted=await w.evaluate(()=>desktop.load());assert.equal(persisted.students[0].plans.length,2);assert.equal(persisted.students[0].plans[0].note14,'15列目を保持');assert.equal(persisted.students[0].inputDraft.length,2);
  await app.evaluate(({dialog},p)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[p]});dialog.showMessageBox=async()=>({response:1});},backup);
  const restored=await w.evaluate(()=>desktop.restore());assert.equal(restored.students[0].plans[0].note14,'15列目を保持');assert.equal(restored.students[0].remarks.private,'非印刷の個人メモ');assert.equal(await w.locator('nav [data-page="route"]').count(),0);
  const cat=await w.evaluate(()=>desktop.catalog());assert(!('routeSvg' in cat));assert(!('stations' in cat));
  console.log('PASS: 旧版データ移行、入力→カレンダー反映、15列目の永続化、再起動、JSON出力/取込、両カレンダーのPDF、路線図削除');console.log('TEST_DIR='+temp);
 }finally{if(app)await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
