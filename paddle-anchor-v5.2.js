/* ShiftReader v5: PaddleOCR medium anchors + geometry + manual anchor fallback.
   Load last, after the existing core and timetable scripts. */
(()=>{
'use strict';
const $=id=>document.getElementById(id), MINS={Short:15,Meal:30,WB20:20,WB70:70};
const state={ocr:null,busy:false,manual:null,mode:localStorage.getItem('srOcrMode')||'auto'};
const mod=(x,n)=>((x%n)+n)%n;
const median=a=>{a=[...a].sort((x,y)=>x-y);return a.length?a.length%2?a[a.length>>1]:(a[a.length/2-1]+a[a.length/2])/2:NaN};
const fmt=m=>{m=mod(Math.round(m),1440);return String(m/60|0).padStart(2,'0')+':'+String(m%60).padStart(2,'0')};
function parseTime(s){const m=String(s).match(/([0-2]?\d)\s*[:.]\s*([0-5]\d)/);return m?+m[1]*60+ +m[2]:null}
function parseRange(text){const s=String(text).replace(/[Oo]/g,'0').replace(/[Il|]/g,'1').replace(/[–—]/g,'-').replace(/(\d)[.,](\d)/g,'$1:$2');const a=[];for(const m of s.matchAll(/([0-2]?\d)\s*:\s*([0-5]\d)/g))a.push(+m[1]*60+ +m[2]);for(let i=0;i<a.length;i++)for(let j=0;j<a.length;j++)if(i!==j)return[a[i],a[j]];return null}
function validPair(pair,type){return pair&&Math.abs(mod(pair[1]-pair[0],1440)-MINS[type])<=2}
function sourceCanvas(){const c=document.createElement('canvas');c.width=S.img.naturalWidth||S.img.width;c.height=S.img.naturalHeight||S.img.height;c.getContext('2d').drawImage(S.img,0,0);return c}
function crop(src,b,scale=5){const p=3,c=document.createElement('canvas');c.width=(b.w+p*2)*scale;c.height=(b.h+p*2)*scale;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.imageSmoothingEnabled=true;x.imageSmoothingQuality='high';x.drawImage(src,Math.max(0,b.x-p),Math.max(0,b.y-p),b.w+p*2,b.h+p*2,0,0,c.width,c.height);return c}
function robustFit(anchors,ppm){let best=null;for(const base of anchors){const vals=anchors.map(a=>mod(a.start-a.x/ppm,1440)),ds=vals.map(v=>mod(v-(base.start-base.x/ppm)+720,1440)-720),center=median(ds),mad=median(ds.map(d=>Math.abs(d-center))),ids=ds.map((d,i)=>({d,i})).filter(z=>Math.abs(z.d-center)<=Math.max(6,mad*3)).map(z=>z.i);if(!best||ids.length>best.ids.length||(ids.length===best.ids.length&&mad<best.mad))best={offset:mod(vals[base===anchors[0]?0:anchors.indexOf(base)]+median(ids.map(i=>ds[i])),1440),ids,mad}}return best}
async function getOCR(){if(state.ocr)return state.ocr;if(!window.PaddleOCRSDK?.PaddleOCR)throw Error('PaddleOCR bundle is missing. Run the GitHub Action first.');say('Loading PP-OCRv6 medium models…','warn');state.ocr=await PaddleOCRSDK.PaddleOCR.create({
 textDetectionModelName:'PP-OCRv6_medium_det',textDetectionModelAsset:{url:'./vendor/paddleocr/PP-OCRv6_medium_det.tar'},
 textRecognitionModelName:'PP-OCRv6_medium_rec',textRecognitionModelAsset:{url:'./vendor/paddleocr/PP-OCRv6_medium_rec.tar'},
 textDetectionBatchSize:2,textRecognitionBatchSize:8,
 ortOptions:{backend:'wasm',wasmPaths:new URL('./vendor/paddleocr/ort/',document.baseURI).href,numThreads:2,simd:true}
});return state.ocr}
function selectBlocks(boxes){const wide=[...boxes].sort((a,b)=>b.w-a.w),out=[];for(const b of wide){if(out.length>=24)break;if(!out.some(q=>Math.abs(q.x-b.x)<b.w*.3&&Math.abs(q.y-b.y)<b.h*2))out.push(b)}return out}
async function recognizeAnchors(src,boxes,ppm){const ocr=await getOCR(),chosen=selectBlocks(boxes),anchors=[];for(let i=0;i<chosen.length;i++){const b=chosen[i];say(`PaddleOCR medium: block ${i+1}/${chosen.length}…`,'warn');const [res]=await ocr.predict(crop(src,b),{textRecScoreThresh:.25,textDetBoxThresh:.2});const text=(res.items||[]).map(x=>x.text).join(' '),pair=parseRange(text);if(validPair(pair,b.type))anchors.push({x:b.x,y:b.y,start:pair[0],type:b.type,text,score:Math.max(0,...(res.items||[]).map(x=>x.score||0))});if(anchors.length>=7&&i>=12)break}return anchors}
function applyTimeline(boxes,fit,ppm){for(const b of boxes){b.start=Math.round((fit.offset+b.x/ppm)/5)*5;b.end=b.start+MINS[b.type]}}
function showManual(src,boxes,ppm){state.manual={src,boxes,ppm};let m=$('paddleManual');if(!m){document.body.insertAdjacentHTML('beforeend','<div id="paddleManual" class="sr-modal show"><div class="sr-dialog"><h2>Set one timeline anchor</h2><p>Automatic OCR could not verify enough labels. Click a readable colored block in the image, then enter that block’s visible start time.</p><canvas id="manualCanvas" style="max-width:100%;max-height:55vh;cursor:crosshair"></canvas><div id="manualChoice" class="note">No block selected.</div><input id="manualTime" type="time" step="300"><button id="manualApply" class="primary">Apply anchor</button><button id="manualCancel">Cancel</button></div></div>');m=$('paddleManual') }else m.classList.add('show');const c=$('manualCanvas');c.width=src.width;c.height=src.height;c.getContext('2d').drawImage(src,0,0);let selected=null;c.onclick=e=>{const r=c.getBoundingClientRect(),x=(e.clientX-r.left)*c.width/r.width,y=(e.clientY-r.top)*c.height/r.height;selected=boxes.reduce((best,b)=>{const d=Math.hypot(x-(b.x+b.w/2),y-(b.y+b.h/2));return!best||d<best.d?{b,d}:best},null).b;$('manualChoice').textContent=`Selected ${selected.type} block. Expected duration ${MINS[selected.type]} minutes.`};$('manualApply').onclick=()=>{const t=parseTime($('manualTime').value);if(!selected||t==null)return alert('Select a block and enter its start time.');applyTimeline(boxes,{offset:mod(t-selected.x/ppm,1440)},ppm);m.classList.remove('show');finishFromBoxes(src,boxes)};$('manualCancel').onclick=()=>m.classList.remove('show')}
async function finishFromBoxes(src,boxes){const rs=group(boxes,src.height),gap=rs.length>1?median(rs.slice(1).map((r,i)=>r.y-rs[i].y)):35,nw=Math.max(35,Math.min(...boxes.map(b=>b.x))-4),wk=await Tesseract.createWorker('tur+eng',1,{workerPath:'./vendor/tesseract/worker.min.js',corePath:'./vendor/tesseract/',langPath:'./vendor/tessdata/',gzip:true});await wk.setParameters({tessedit_pageseg_mode:'7',tessedit_char_whitelist:''});S.rows=[];for(let i=0;i<rs.length;i++){say(`Reading names ${i+1}/${rs.length}…`);const y=Math.max(0,rs[i].y-gap*.43),r=await wk.recognize(cropNameLocal(src,0,y,nw,gap*.86,3)),name=(r.data.text||'').replace(/[^\p{L}\p{M}'’ -]/gu,' ').replace(/\s+/g,' ').trim()||`Employee ${i+1}`;S.rows.push({name,breaks:rs[i].boxes.sort((a,b)=>a.x-b.x).map(b=>({start:mod(b.start,1440),end:mod(b.end,1440),type:b.type}))})}await wk.terminate();render();say(`Finished with PaddleOCR/manual timeline: ${S.rows.length} employees, ${boxes.length} breaks.`,'ok')}
function cropNameLocal(src,x,y,w,h,s){const c=document.createElement('canvas');c.width=w*s;c.height=h*s;const z=c.getContext('2d');z.fillStyle='#fff';z.fillRect(0,0,c.width,c.height);z.drawImage(src,x,y,w,h,0,0,c.width,c.height);return c}

function installModeControls(){
  if($('ocrModePanel'))return;
  const read=$('read');
  const panel=document.createElement('div');
  panel.id='ocrModePanel';
  panel.style.cssText='margin:12px 0;padding:12px;border:1px solid var(--line,#263750);border-radius:10px;background:var(--panel2,#111d31)';
  panel.innerHTML=`<strong style="display:block;margin-bottom:8px">OCR mode</strong>
    <label style="display:block;margin:6px 0"><input type="radio" name="srOcrMode" value="auto"> Auto <span class="note">Choose fast or PaddleOCR from image quality</span></label>
    <label style="display:block;margin:6px 0"><input type="radio" name="srOcrMode" value="paddle"> Force PaddleOCR <span class="note">Slowest, most reliable</span></label>
    <label style="display:block;margin:6px 0"><input type="radio" name="srOcrMode" value="fast"> Do not use PaddleOCR <span class="note">Fast legacy reader</span></label>
    <div id="ocrModeDecision" class="note" style="margin-top:8px"></div>`;
  read.closest('.actions')?.before(panel);
  panel.querySelector(`[value="${state.mode}"]`)?.setAttribute('checked','checked');
  panel.querySelectorAll('[name="srOcrMode"]').forEach(r=>r.onchange=()=>{state.mode=r.value;localStorage.setItem('srOcrMode',state.mode);$('ocrModeDecision').textContent='Mode saved.'});
}
function assessFastMode(src,boxes){
  if(!boxes.length)return{usePaddle:true,reasons:['no colored blocks detected'],score:0};
  const heights=boxes.map(b=>b.h),widths=boxes.map(b=>b.w),medH=median(heights),medW=median(widths);
  const scale=Math.min(2400,src.width)/src.width;
  const displayH=medH*scale,displayW=medW*scale;
  const rowCount=new Set(boxes.map(b=>Math.round((b.y+b.h/2)/Math.max(8,medH*1.25)))).size;
  let score=0,reasons=[];
  if(src.width>=1500)score+=2;else reasons.push(`width ${src.width}px`);
  if(src.height>=700)score+=1;else reasons.push(`height ${src.height}px`);
  if(displayH>=19)score+=3;else reasons.push(`small block text height ${displayH.toFixed(1)}px`);
  if(displayW>=45)score+=1;else reasons.push(`narrow blocks ${displayW.toFixed(1)}px`);
  if(boxes.length>=20)score+=1;else reasons.push(`only ${boxes.length} blocks`);
  if(rowCount>=4)score+=1;
  const usePaddle=score<7;
  return{usePaddle,reasons,score,medH:displayH,medW:displayW};
}
async function runFastWithWarning(decision){
  const msg=decision?`Auto selected fast OCR (quality score ${decision.score}/9).`:'Fast OCR was forced.';
  $('ocrModeDecision').textContent=msg+' Check several visible times after extraction. If anything is shifted or misread, select Force PaddleOCR and run again.';
  await window.run();
  if($('status').classList.contains('ok'))say($('status').textContent+' Fast mode was used. Verify visible breaks; rerun with PaddleOCR if wrong.','warn');
}
async function choosePipeline(){
  if(!S.img)return;
  if(state.mode==='paddle'){$('ocrModeDecision').textContent='Force PaddleOCR selected.';return start()}
  if(state.mode==='fast')return runFastWithWarning(null);
  const src=sourceCanvas(),boxes=detect(src),decision=assessFastMode(src,boxes);
  $('ocrModeDecision').textContent=decision.usePaddle
    ?`Auto selected PaddleOCR (quality score ${decision.score}/9: ${decision.reasons.join(', ')||'difficult image'}).`
    :`Auto selected fast OCR (quality score ${decision.score}/9). Results must be checked.`;
  return decision.usePaddle?start():runFastWithWarning(decision);
}

async function start(){if(state.busy||!S.img)return;state.busy=true;const btn=$('read'),old=btn.textContent;try{btn.disabled=true;const src=sourceCanvas(),boxes=detect(src);if(boxes.length<5)throw Error('Too few colored blocks detected.');const ratios=boxes.map(b=>b.w/MINS[b.type]).sort((a,b)=>a-b),ppm=median(ratios.slice(Math.floor(ratios.length*.15),Math.ceil(ratios.length*.85))),anchors=await recognizeAnchors(src,boxes,ppm),fit=anchors.length>=2?robustFit(anchors,ppm):null;console.info('PaddleOCR anchors',anchors,fit);if(!fit||fit.ids.length<2||fit.mad>12){showManual(src,boxes,ppm);say(`PaddleOCR found ${anchors.length} anchors but could not verify the timeline. Use one manual anchor.`,'warn');return}applyTimeline(boxes,fit,ppm);await finishFromBoxes(src,boxes)}catch(e){console.error(e);say(`PaddleOCR failed: ${e.message}`,'bad')}finally{state.busy=false;btn.disabled=false;btn.textContent=old}}
installModeControls();const old=$('read');if(old){const b=old.cloneNode(true);old.replaceWith(b);b.onclick=choosePipeline}
console.info('ShiftReader adaptive OCR pipeline v5.2 active. Mode:',state.mode);
})();
