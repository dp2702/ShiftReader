/* ShiftReader core timeline hotfix v4.2
   Hybrid rule:
   - Trust a verified Bottom-axis / First-break synthetic heading.
   - Use geometry scoring only for an unverified Header fallback. */
(()=>{
  'use strict';
  if (typeof window.run !== 'function') {
    console.error('ShiftReader core fix v4.2: run() not found.');
    return;
  }

  const oldBlock = "if(!A.length&&sh&&gs.length){let first=Math.ceil(sh.a/60)*60;if(first===sh.a)first+=60;gs.forEach((g,i)=>A.push({x:g.x,t:mod(first+i*60,1440)}));log('Used heading + hourly grid fallback.')}";

  const replacement = `if(!A.length&&sh&&gs.length){
    const headingText=(hr.data.text||'').replace(/\\s+/g,' ');
    const verifiedAnchor=/anchor(?:\s|[-_.])*?(?:1?6(?:[:.\s]?00)?|09(?:[:.\s]?00)?)?|anchor/i.test(headingText);
    if(verifiedAnchor){
      let first=Math.ceil(sh.a/60)*60;
      if(first===sh.a)first+=60;
      gs.forEach((g,i)=>A.push({x:g.x,t:mod(first+i*60,1440)}));
      log('Used verified synthetic anchor + hourly grid.');
      log('First grid '+hh(first)+' from '+headingText.trim()+'.');
    }else{
      let shiftStart=sh.a,shiftEnd=sh.b;
      while(shiftEnd<=shiftStart)shiftEnd+=1440;
      const firstBlockX=Math.min(...bs.map(b=>b.x));
      const lastBlockX=Math.max(...bs.map(b=>b.x));
      const firstGridX=gs[0].x;
      const baseHour=Math.ceil(shiftStart/60)*60;
      const candidates=[];
      for(let gridTime=baseHour;gridTime<=shiftEnd;gridTime+=60){
        const unwrap=t=>{while(t<shiftStart)t+=1440;while(t>shiftEnd+720)t-=1440;return t};
        const firstBreak=unwrap(gridTime+(firstBlockX-firstGridX)/ppm);
        const lastBreak=unwrap(gridTime+(lastBlockX-firstGridX)/ppm);
        let outside=0;
        for(const b of bs){const t=unwrap(gridTime+(b.x-firstGridX)/ppm);if(t<shiftStart-2||t>shiftEnd+2)outside++}
        const earlyGap=firstBreak-shiftStart;
        const lateGap=shiftEnd-lastBreak;
        let score=outside*1000;
        if(earlyGap<0)score+=Math.abs(earlyGap)*20;
        if(earlyGap>=0&&earlyGap<45)score+=(45-earlyGap)*3;
        if(lateGap<0)score+=Math.abs(lateGap)*20;
        score+=Math.abs(earlyGap-lateGap)*0.05;
        candidates.push({gridTime,firstBreak,lastBreak,outside,score});
      }
      candidates.sort((a,b)=>a.score-b.score||a.outside-b.outside||a.gridTime-b.gridTime);
      const chosen=candidates[0];
      gs.forEach((g,i)=>A.push({x:g.x,t:mod(chosen.gridTime+i*60,1440)}));
      log('Used geometry fallback because no verified axis/break anchor was present.');
      log('First grid '+hh(chosen.gridTime)+'; estimated first break '+hh(chosen.firstBreak)+'; last break '+hh(chosen.lastBreak)+'.');
    }
  }`;

  const source=window.run.toString();
  if(!source.includes(oldBlock)){
    console.error('ShiftReader core fix v4.2: expected fallback block not found. Remove older core patches and reload.');
    return;
  }
  try{
    window.run=(0,eval)('('+source.replace(oldBlock,replacement)+')');
    console.info('ShiftReader core fix v4.2 active.');
  }catch(error){
    console.error('ShiftReader core fix v4.2 failed.',error);
  }
})();
