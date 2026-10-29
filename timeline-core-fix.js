/* ShiftReader core timeline hotfix v4.0
   Load AFTER the main inline script and BEFORE timetable-addon-v3.9.js. */
(()=>{
  'use strict';
  if (typeof window.run !== 'function') {
    console.error('ShiftReader timeline hotfix: core run() was not found.');
    return;
  }

  const oldBlock = "if(!A.length&&sh&&gs.length){let first=Math.ceil(sh.a/60)*60;if(first===sh.a)first+=60;gs.forEach((g,i)=>A.push({x:g.x,t:mod(first+i*60,1440)}));log('Used heading + hourly grid fallback.')}";

  const newBlock = `if(!A.length&&sh&&gs.length){
    let shiftStart=sh.a,shiftEnd=sh.b;
    while(shiftEnd<=shiftStart)shiftEnd+=1440;
    const blockXs=bs.map(b=>b.x);
    const firstBlockX=Math.min(...blockXs),lastBlockX=Math.max(...blockXs);
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
    log('Used geometry-scored heading fallback.');
    log('First grid '+hh(chosen.gridTime)+'; estimated first break '+hh(chosen.firstBreak)+'; last break '+hh(chosen.lastBreak)+'; outside '+chosen.outside+'.');
  }`;

  const source = window.run.toString();
  if (!source.includes(oldBlock)) {
    console.error('ShiftReader timeline hotfix: expected fallback block was not found.');
    return;
  }

  try {
    window.run = (0, eval)('(' + source.replace(oldBlock, newBlock) + ')');
    console.info('ShiftReader timeline core hotfix v4.0 active.');
  } catch (error) {
    console.error('ShiftReader timeline hotfix could not patch run().', error);
  }
})();
