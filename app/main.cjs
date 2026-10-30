const {app,BrowserWindow,ipcMain,dialog}=require('electron');
const fs=require('node:fs/promises');const path=require('node:path');const {validateState:validateBase}=require('./core.cjs');const {validateExtension}=require('./sheet-core.cjs');const validateState=s=>validateExtension(validateBase(s));
if(process.env.NODE_ENV==='test'&&process.env.KARENDA_TEST_DATA_DIR)app.setPath('userData',process.env.KARENDA_TEST_DATA_DIR);
let win; const file=()=>path.join(app.getPath('userData'),'students.json');
async function read(){try{return validateState(JSON.parse(await fs.readFile(file(),'utf8')));}catch(e){if(e.code==='ENOENT')return null;throw Error('保存データを読み込めません。既存ファイルを保護するため処理を停止しました。 '+e.message);}}
async function write(state){validateState(state);const p=file();await fs.mkdir(path.dirname(p),{recursive:true});await fs.writeFile(p+'.tmp',JSON.stringify(state,null,2),'utf8');try{await fs.copyFile(p,p+'.bak');}catch(e){if(e.code!=='ENOENT')throw e;}await fs.rename(p+'.tmp',p);return true;}
app.whenReady().then(()=>{
 ipcMain.handle('catalog',async()=>JSON.parse(await fs.readFile(path.join(__dirname,'../data/catalog.json'),'utf8')));
 ipcMain.handle('load',read);ipcMain.handle('save',(_,s)=>write(s));
 ipcMain.handle('backup',async()=>{const s=await read();if(!s)throw Error('保存データがありません');const r=await dialog.showSaveDialog(win,{defaultPath:'Karenda-backup.json',filters:[{name:'Karenda backup',extensions:['json']}]});if(!r.canceled)await fs.writeFile(r.filePath,JSON.stringify(s,null,2),'utf8');return !r.canceled;});
 ipcMain.handle('restore',async()=>{const r=await dialog.showOpenDialog(win,{filters:[{name:'Karenda backup',extensions:['json']}],properties:['openFile']});if(r.canceled)return null;const stat=await fs.stat(r.filePaths[0]);if(stat.size>20*1024*1024)throw Error('ファイルが大きすぎます');const s=validateState(JSON.parse(await fs.readFile(r.filePaths[0],'utf8')));const c=await dialog.showMessageBox(win,{type:'question',buttons:['キャンセル','読み込む'],defaultId:0,cancelId:0,message:'現在のデータをバックアップの内容に置き換えますか？',detail:'置換前のデータは students.json.bak に保存されます。'});if(c.response!==1)return null;await write(s);return s;});
 ipcMain.handle('pdf',async(_,options={})=>{const r=await dialog.showSaveDialog(win,{defaultPath:'受験校カレンダー.pdf',filters:[{name:'PDF',extensions:['pdf']}]});if(r.canceled)return false;await fs.writeFile(r.filePath,await win.webContents.printToPDF({landscape:true,printBackground:true,pageSize:options.paper==='B4'?{width:257000,height:364000}:options.paper==='A3'?'A3':'A4',preferCSSPageSize:true}));return true;});
 ipcMain.handle('print',(_,options={})=>new Promise((resolve,reject)=>win.webContents.print({silent:false,printBackground:true,landscape:true,pageSize:options.paper==='B4'?{width:257000,height:364000}:options.paper==='A3'?'A3':'A4'},(ok,reason)=>ok?resolve(true):reason==='cancelled'?resolve(false):reject(Error(reason)))));
 win=new BrowserWindow({width:1440,height:940,minWidth:1000,minHeight:700,backgroundColor:'#f5f7fb',webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
 win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',e=>e.preventDefault());win.loadFile(path.join(__dirname,'index.html'));
});
app.on('window-all-closed',()=>app.quit());
