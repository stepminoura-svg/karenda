/* Pure domain functions shared by the desktop UI and tests. */
(function(root) {
const normalize = s => String(s ?? '').normalize('NFKC').toLowerCase().replace(/\s/g, '');
function isoDate(value, year=2027) {
 const s=String(value || '').trim().normalize('NFKC');
 let m=s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T].*)?$/);
 if (!m) { const p=s.match(/^(\d{1,2})\/(\d{1,2})$/); if(!p)return ''; m=[null,Number(p[1])>=9?year-1:year,p[1],p[2]]; }
 const y=+m[1],mo=+m[2],d=+m[3],date=new Date(Date.UTC(y,mo-1,d));
 return date.getUTCFullYear()===y && date.getUTCMonth()===mo-1 && date.getUTCDate()===d ? `${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}` : '';
}
const kinds={application:'出願締切',exam:'試験',result:'合格発表',enrollment:'手続締切'};
function events(plans,year) {return plans.flatMap(p=>Object.entries(kinds).flatMap(([kind,label])=>{const date=isoDate(p[kind],year);return date?[{...p,kind,label,date}]:[]})).sort((a,b)=>a.date.localeCompare(b.date));}
function conflicts(plans,year) {const groups={};for(const e of events(plans,year).filter(e=>e.kind==='exam'&&!/共通テスト/.test(e.method))) (groups[e.date]??=[]).push(e);return Object.entries(groups).filter(([,v])=>v.length>1);}
function eligibility(rule,profile,year=2027) {
 const grades=['3級','準2級','準2級プラス','2級','準1級','1級']; let unknown=false,missing=false;
 for(const key of ['grade','passed','total','R','L','W','S','since']) {
  const v=String(rule[key]??'').normalize('NFKC'); if(v==='-')continue;
  if(!v||v==='未発表'){unknown=true;continue;}
  const p=profile[key]; if(p===undefined||p===null||p===''){missing=true;continue;}
  if(key==='grade'){const a=grades.indexOf(normalize(p)),b=grades.indexOf(normalize(v)); if(a<0||b<0)unknown=true;else if(a<b)return '対象外';}
  else if(key==='passed'){if(v==='合格'&&p!=='合格')return '対象外';else if(!['合格','不合格'].includes(v))unknown=true;}
  else if(key==='since'){const since=v==='2年'?`${year-2}-01-01`:isoDate(v,year);const date=isoDate(p,year);if(!since||!date)unknown=true;else if(date<since)return '対象外';}
  else if(!Number.isFinite(Number(v)))unknown=true;else if(Number(p)<Number(v))return '対象外';
 }
 return unknown?'要確認':missing?'未入力':'条件一致';
}
function validateState(s) {
 if(!s || s.version!==1 || !Number.isInteger(s.year)||s.year<2000||s.year>2100||!Array.isArray(s.students)||s.students.length>10000)throw Error('対応していないバックアップ形式です');
 const ids=new Set();
 const text=v=>typeof v==='string' && v.length<=10000;
 for(const p of s.students){if(!text(p.id)||!p.id||ids.has(p.id)||!text(p.name)||!Array.isArray(p.plans)||p.plans.length>1000||!Array.isArray(p.history)||p.history.length>100)throw Error('生徒データが不正です'); ids.add(p.id);
  for(const plan of [...p.plans,...p.history.flatMap(h=>{if(!h||!text(h.at)||!Array.isArray(h.plans)||h.plans.length>1000)throw Error('履歴が不正です');return h.plans;})]){if(!plan||!text(plan.id)||!text(plan.university)||!plan.university)throw Error('受験予定が不正です');for(const [k,v] of Object.entries(plan))if(!text(v))throw Error('受験予定の値が不正です');}
 }
 if(!s.students.some(p=>p.id===s.active))throw Error('選択中の生徒が見つかりません');
 return s;
}
const api={normalize,isoDate,kinds,events,conflicts,eligibility,validateState};
if(typeof module!=='undefined')module.exports=api;else root.Core=api;
})(globalThis);
