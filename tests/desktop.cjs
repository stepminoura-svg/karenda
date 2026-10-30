const {_electron}=require('playwright');const assert=require('node:assert/strict');const fs=require('node:fs/promises');const os=require('node:os');const path=require('node:path');
(async()=>{
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'karenda-desktop-'));let app;
 const launch=()=>_electron.launch({args:['.',...(process.platform==='linux'?['--no-sandbox','--ozone-platform=headless']:[])],env:{...process.env,XDG_CONFIG_HOME:temp,NODE_ENV:'test',KARENDA_TEST_DATA_DIR:temp},timeout:20000});
 try {
  app=await launch();let w=await app.firstWindow();await w.waitForSelector('h1');
  const s=await w.evaluate(()=>desktop.load());s.students[0].name='保存テスト';s.students[0].plans=[{id:'test-plan',university:'テスト大学',faculty:'工',department:'情報',method:'一般',exam:'2/3',application:'1/20',result:'2/12',enrollment:'2/20',rank:'A',priority:'1',note:'IPC検証'}];
  await w.evaluate(s=>desktop.save(s),s);assert.equal((await w.evaluate(()=>desktop.load())).students[0].plans.length,1);
  const backup=path.join(temp,'backup.json');await app.evaluate(({dialog},p)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:p});},backup);
  assert.equal(await w.evaluate(()=>desktop.backup()),true);assert.equal(JSON.parse(await fs.readFile(backup,'utf8')).students[0].name,'保存テスト');
  await app.close();app=await launch();w=await app.firstWindow();await w.waitForSelector('h1');assert.match(await w.locator('h1').textContent(),/保存テスト/);
  await w.locator('nav [data-page="calendar"]').click();await w.waitForSelector('.event.exam');
  const pdf=path.join(temp,'calendar.pdf');await app.evaluate(({dialog},p)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:p});},pdf);
  assert.equal(await w.evaluate(()=>desktop.pdf()),true);const bytes=await fs.readFile(pdf);assert.equal(bytes.subarray(0,5).toString(),'%PDF-');assert(bytes.length>1000);
  await app.evaluate(({dialog},p)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[p]});dialog.showMessageBox=async()=>({response:1});},backup);
  const restored=await w.evaluate(()=>desktop.restore());assert.equal(restored.students[0].plans[0].university,'テスト大学');
  await w.locator('nav [data-page="route"]').click();await w.waitForSelector('.map-station');await w.locator('#route-query').fill('目黒');await w.locator('#route-query').dispatchEvent('change');await w.locator('#route-locate').click();assert.equal(await w.locator('.map-station.highlight').count(),1);
  console.log('PASS: Electron起動、実ファイル保存、再起動復元、JSON出力/取込、PDF生成');
  console.log('TEST_PDF='+pdf);
 }finally{if(app)await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
