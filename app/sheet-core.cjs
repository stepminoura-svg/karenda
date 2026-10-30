(function(root){
 const C=typeof module!=='undefined'?require('./core.cjs'):root.Core;
 const fields=[['university','大学名'],['faculty','学部'],['department','学科'],['method','方式'],['application','出願〆'],['rank','ランク'],['priority','志望順位'],['custom1','コンパネで'],['custom2','変更が'],['custom3','可能です'],['note','備考']];
 const ranks=['S+','S','A+','A','B+','B','C+','C','D+','D','E','F'];
 const clone=x=>JSON.parse(JSON.stringify(x));
 function dateRange(start,end){if(!start||!end||start>end)return [];const a=new Date(start+'T00:00:00Z'),b=new Date(end+'T00:00:00Z');if(!Number.isFinite(+a)||!Number.isFinite(+b)||b-a>732*864e5)throw Error('期間は2年以内で指定してください');const out=[];for(let d=a;+d<=+b;d=new Date(+d+864e5))out.push(d.toISOString().slice(0,10));return out;}
 function standardDates(year){return dateRange(`${year}-01-13`,`${year}-03-25`);}
 function slotInfo(slot){const [sheet,day,lane]=slot.split(':');return {sheet:Number(sheet),day,lane:Number(lane),fixed:/^\d{4}-\d\d-\d\d$/.test(day),list:sheet==='1'&&+lane<2||sheet==='2'&&day!=='extra'};}
 function examLabel(p){return `${p.university}(${p.faculty||''}${p.department?'-'+p.department:''})${p.method?'-'+p.method:''}`;}
 function plansToInputs(plans,year){const taken=new Set(),regular=new Set(standardDates(year));return plans.map((p,i)=>{const date=C.isoDate(p.exam,year),inRange=regular.has(date);let candidates=[];
  if(inRange)candidates=p.sourceId?[`1:${date}:0`,`1:${date}:1`,`2:${date}:0`,`2:${date}:1`,`2:${date}:2`,`1:${date}:2`,`3:${date}:0`,`3:${date}:1`,`3:${date}:2`]:[`1:${date}:2`,`3:${date}:0`,`3:${date}:1`,`3:${date}:2`];
  else if(p.sourceId)candidates=[0,1,2].map(n=>`2:early:${n}`);
  candidates.push(...[0,1,2].map(n=>`3:free:${n}`));
  let slot=p.entrySlot;if(!slot||taken.has(slot)||slotInfo(slot).fixed&&slotInfo(slot).day!==date)slot=candidates.find(s=>!taken.has(s))||`3:extra:${i}`;
  taken.add(slot);return {...clone(p),entrySlot:slot};});}
 function inputsToPlans(drafts,year){return drafts.filter(p=>p.university?.trim()).map(p=>{const result=clone(p),s=slotInfo(p.entrySlot);if(s.fixed)result.exam=s.day;validatePlan(result,year);return result;});}
 function validatePlan(p,year){if(!String(p.university||'').trim())throw Error('大学名を入力してください');for(const key of Object.keys(C.kinds)){const v=String(p[key]||'').trim();if(v&&v!=='未発表'&&!C.isoDate(v,year))throw Error(`${C.kinds[key]}の日付を確認してください`);}return p;}
 function defaultSettings(){return {columns:Object.fromEntries(fields.map(([key,label])=>[key,{label,visible:!['custom1','custom2','custom3'].includes(key)}])),splitNotes:false,noteHeaders:Array.from({length:15},(_,i)=>`備考${i+1}`),trimPrint:true,paper:'B4'};}
 function ensureStudent(s){if(!s.sheetSettings)s.sheetSettings=defaultSettings();if(!s.remarks)s.remarks={first:'',second:'',private:''};return s;}
 function signature(plans){return JSON.stringify(plans);}
 function sortPlans(plans,key,dir='asc',year=2027){const sign=dir==='desc'?-1:1;return [...plans].sort((a,b)=>{let va,vb;if(Object.keys(C.kinds).includes(key)){va=C.isoDate(a[key],year);vb=C.isoDate(b[key],year);}else if(key==='priority'){va=a[key]?Number(a[key]):'';vb=b[key]?Number(b[key]):'';}else if(key==='rank'){va=ranks.indexOf(a.rank);vb=ranks.indexOf(b.rank);if(va<0)va='';if(vb<0)vb='';}else{va=a[key]||'';vb=b[key]||'';}if(va===''&&vb==='')return 0;if(va==='')return 1;if(vb==='')return -1;return sign*(typeof va==='number'?va-vb:String(va).localeCompare(String(vb),'ja'));});}
 function reorder(plans,numbers){const order=numbers.split(',').map(s=>Number(s.trim()));if(order.length!==plans.length||new Set(order).size!==plans.length||order.some(n=>!Number.isInteger(n)||n<1||n>plans.length))throw Error('全ての行番号を重複なく指定してください（例：1,3,2）');return order.map(n=>plans[n-1]);}
 function noteText(p,settings){if(Array.from({length:15},(_,i)=>p['note'+i]).some(v=>v))return settings.noteHeaders.map((h,i)=>p['note'+i]?`【${h}】${p['note'+i]}`:'').filter(Boolean).join('\n');return p.note||'';}
 function splitNotes(plans){for(const p of plans)if(!Array.from({length:15},(_,i)=>p['note'+i]).some(v=>v))p.note0=p.note||'';}
 function snapshot(s){ensureStudent(s);return {at:new Date().toISOString(),plans:clone(s.plans),remarks:clone(s.remarks),sheetSettings:clone(s.sheetSettings),...(s.inputDraft?{inputDraft:clone(s.inputDraft)}:{})};}
 function restoreSnapshot(s,h){s.plans=clone(h.plans);if(h.remarks)s.remarks=clone(h.remarks);if(h.sheetSettings)s.sheetSettings=clone(h.sheetSettings);if(h.inputDraft)s.inputDraft=clone(h.inputDraft);else delete s.inputDraft;s.inputBaseSignature=signature(s.plans);ensureStudent(s);}
 function rankCandidates(p,rankings){const map=new Map();for(const r of rankings){if(r.university!==p.university||p.faculty&&p.faculty!=='全学部'&&r.faculty!==p.faculty||p.department&&r.department!==p.department)continue;const key=[r.faculty,r.department,r.rank].join('|');map.set(key,r);}return [...map.values()];}
 function calendarBounds(plans,year,trim=false){const es=C.events(plans,year);let dates=es.filter(e=>e.kind!=='application').map(e=>e.date).sort();if(!dates.length)dates=[`${year}-01-13`,`${year}-03-31`];return trim?{start:dates[0],end:dates.at(-1)}:{start:[`${year}-01-13`,dates[0]].sort()[0],end:[`${year}-03-31`,dates.at(-1)].sort().at(-1)};}
 function validateExtension(s){const text=v=>typeof v==='string'&&v.length<=10000;const planList=xs=>{if(!Array.isArray(xs)||xs.length>1000)throw Error('入力データが不正です');const slots=new Set();for(const p of xs){if(!p||!text(p.id)||!text(p.university)||!text(p.entrySlot)||!/^([123]):(\d{4}-\d{2}-\d{2}|early|free|extra):\d+$/.test(p.entrySlot)||slots.has(p.entrySlot)||Object.values(p).some(v=>!text(v)))throw Error('入力欄のデータが不正です');const info=slotInfo(p.entrySlot);if(info.fixed&&!C.isoDate(info.day))throw Error('入力日付が不正です');slots.add(p.entrySlot);}};
  const settings=o=>{if(o?.paper!==undefined&&!['A4','A3','B4'].includes(o.paper))throw Error('用紙設定が不正です');if(!o||typeof o!=='object'||typeof o.splitNotes!=='boolean'||typeof o.trimPrint!=='boolean'||!Array.isArray(o.noteHeaders)||o.noteHeaders.length!==15||o.noteHeaders.some(v=>!text(v))||!o.columns)throw Error('カレンダー設定が不正です');for(const [key]of fields){const c=o.columns[key];if(!c||!text(c.label)||typeof c.visible!=='boolean')throw Error('表示列設定が不正です');}};
  const remarks=o=>{if(!o||['first','second','private'].some(k=>!text(o[k])))throw Error('備考が不正です');};
  for(const p of s.students){for(const obj of [p,...p.history]){if(obj.inputDraft!==undefined)planList(obj.inputDraft);if(obj.sheetSettings!==undefined)settings(obj.sheetSettings);if(obj.remarks!==undefined)remarks(obj.remarks);}if(p.inputBaseSignature!==undefined&&!text(p.inputBaseSignature)&&!(typeof p.inputBaseSignature==='string'&&p.inputBaseSignature.length<10000000))throw Error('入力状態が不正です');}
  return s;
 }
 const api={fields,ranks,dateRange,standardDates,slotInfo,examLabel,plansToInputs,inputsToPlans,validatePlan,defaultSettings,ensureStudent,signature,sortPlans,reorder,noteText,splitNotes,snapshot,restoreSnapshot,rankCandidates,calendarBounds,validateExtension};
 if(typeof module!=='undefined')module.exports=api;else root.SheetCore=api;
})(globalThis);
