const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('desktop',Object.fromEntries(['catalog','load','save','backup','restore','pdf','print'].map(name=>[name,(...args)=>ipcRenderer.invoke(name,...args)])));
