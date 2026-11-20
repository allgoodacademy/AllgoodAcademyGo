/* Take the Bait: the rules. No DOM, no Three.js, so the balance can be simulated
   headless (node) as well as played. index.html reads this state and draws it.

   THE LOOP (Mob Control, with the learning built into the gates)
   - Your cannon sits at the bottom and fires a stream of units up the field while
     you hold. Scam HQ sits at the top and sends waves of spam bots down at you.
   - Between them stands a pair of message gates. A real message multiplies whatever
     passes through it. A bait message hooks it: those units are pulled up, turned,
     and sent back down at you. The gap between the gates passes units unchanged.
   - The level is played in ROUNDS, one message pair each. A round opens with a short,
     announced intro (banner + card flip) during which the gates do nothing, so the
     cards never change underneath a stream the player is already committed to. Then
     Scam HQ releases that round's wave. When the wave has been dealt with (every bot
     destroyed or through), the round closes, its choice is logged, and the next
     message pair opens. Rounds cycle through the level's pairs until Scam HQ falls
     (win) or the cannon's hearts run out (loss).

   Field coordinates: x across (−HW…HW), z up the field. The cannon is at z=0, Scam
   HQ's front wall at z=−HQZ. Units move toward −z, enemies toward +z. A unit or enemy
   object can stand for several soldiers (n>1) once the field is crowded, so the drawn
   count stays capped; every rule counts n, never objects. */
import {LEVELS,EXTRA} from "./content.js?v=20261120b";

export const HW=4.6,HQZ=21,GZ=-7.5,CANNON_Z=0;
export const GATE_W=3.0,GATE_C=2.2;          // each gate's width, and its centre offset from the pair's middle
export const HEARTS=3,PER_HEART=10;           // a heart is lost for every 10 enemies that reach the cannon
export const CHECKS=3;
export const FIRE_RATE=6,UNIT_SPEED=8;
export const CAP=230;                         // objects kept separate before merging into ×N clumps
export const SPEEDS={relaxed:0.7,normal:1,fast:1.3};
export const INTRO_S=1.8;                     // announced, gates inert
const HQ_HP=[1300,1400,1500,1600,1400];
const ROUND_MAX_S=18;
const ENEMY_BASE=1.9;                         // march speed at level speed 6, Normal

/* A level's message pairs, each shuffled left/right. Levels 1–4 use their own five
   pairs; the Mix draws 6 from those twenty, weighted toward techniques the player has
   taken the bait on, then adds both EXTRA pairs. */
export function buildPairs(L,techStats,rng=Math.random){
  const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
  let src,ids;
  if(LEVELS[L].gates){src=LEVELS[L].gates.slice();ids=src.map((_,i)=>"L"+(L+1)+"-"+(i+1));}
  else{
    const pool=[];LEVELS.forEach((l,li)=>l.gates&&l.gates.forEach((p,pi)=>pool.push({p,id:"L"+(li+1)+"-"+(pi+1)})));
    const weight=p=>p.reduce((w,c)=>w+(c.r?0:((techStats[c.k]&&techStats[c.k].bait)||0)*10+1),0)+rng();
    const picked=shuffle(pool.map(o=>({...o,w:weight(o.p)})).sort((a,b)=>b.w-a.w).slice(0,6));
    src=picked.map(o=>o.p).concat(EXTRA);ids=picked.map(o=>o.id).concat(EXTRA.map((_,i)=>"X-"+(i+1)));
  }
  return src.map((pair,i)=>{
    const cards=rng()<0.5?[pair[0],pair[1]]:[pair[1],pair[0]];
    const anyBait=cards.some(c=>!c.r);
    // A real message pays ×2; ×3 when it sits next to a bait (spotting the lure pays more).
    return{id:ids[i],cards:cards.map(c=>({...c,mult:c.r?(anyBait?3:2):0}))};
  });
}

/* What a resolved pair means, in the vocabulary telemetry and the recap share. */
export function outcomeOf(cards,pick){
  if(pick>=0)return cards[pick].r?(cards[1-pick].r?"trusted":"spotted"):"bait";
  const baits=cards.filter(c=>!c.r).length;
  return baits===2?"smart_scroll":baits===1?"safe_scroll":"over_scroll";
}

export class Game{
  constructor({L,pairs,speed="normal",rng=Math.random}){
    this.L=L;this.lv=LEVELS[L];this.pairs=pairs;this.rng=rng;
    this.mul=SPEEDS[speed]||1;
    this.hp0=this.hp=HQ_HP[L];
    this.cx=0;this.firing=false;this.fireAcc=0;
    this.units=[];this.enemies=[];this.hooks=[];
    this.dmg=0;this.checks=CHECKS;this.t=0;
    this.round=-1;this.cur=null;this.log=[];
    this.slide=0;this.slideT=rng()*6;
    this.spawnQ=[];this.hookedOnce=false;this.over=null;this.events=[];
    this.nextRound();
  }
  get hearts(){return Math.max(0,HEARTS-this.dmg/PER_HEART);}
  get count(){return this.units.length+this.enemies.length+this.hooks.length;}
  get phase(){return this.cur?this.cur.phase:"over";}
  gateX(side){return this.slide+(side?GATE_C:-GATE_C);}
  gateAt(x){for(let s=0;s<2;s++){if(Math.abs(x-this.gateX(s))<=GATE_W/2)return s;}return -1;}

  nextRound(){
    if(this.cur)this.closeRound();
    if(this.over)return;
    this.round++;const p=this.pairs[this.round%this.pairs.length];
    // Wave size grows round by round and level by level, then levels off.
    // After one full pass through the pairs, Scam HQ gets desperate: the cap climbs, so
    // playing it too safe (never taking a multiplier) runs out of road instead of winning slowly.
    const extra=Math.max(0,this.round-this.pairs.length+1)*9;
    const size=Math.min(14+4*this.lv.mobs+extra,Math.round(5+this.round*2.2+this.lv.mobs*1.5));
    this.cur={pair:p,counts:[0,0,0],phase:"intro",t:0,wave:size,spawned:false,usedCheck:false,hooked:0,mult:0};
    this.events.push({type:"round",round:this.round,pair:p,wave:size});
  }
  closeRound(){
    const r=this.cur,c=r.counts,tot=c[0]+c[1]+c[2];
    const pick=tot===0?-1:(c[2]>=c[0]&&c[2]>=c[1]?-1:(c[0]>=c[1]?0:1));
    const entry={round:this.round,pair:r.pair,counts:c.slice(),pick,outcome:outcomeOf(r.pair.cards,pick),usedCheck:r.usedCheck,fired:tot>0};
    this.log.push(entry);this.events.push({type:"roundEnd",entry});
  }
  check(){if(this.checks<=0||this.over)return false;this.checks--;if(this.cur)this.cur.usedCheck=true;this.events.push({type:"check"});return true;}

  spawnUnit(x,z,n,crossed){this.units.push({x,z,n,crossed,ph:this.rng()*6.28});}
  addEnemy(x,z,n,hooked){this.enemies.push({x,z,n,hooked,ph:this.rng()*6.28,age:0});}

  step(dt){
    if(this.over||dt<=0)return;
    const r=this.rng,mul=this.mul,R=this.cur;this.t+=dt;R.t+=dt;

    // gates: still on the first two levels, a slow sway after that
    this.slideT+=dt*0.4*mul;
    this.slide=this.lv.moving?Math.sin(this.slideT)*0.7:0;

    // round phases
    if(R.phase==="intro"&&R.t>=INTRO_S){R.phase="live";R.t=0;
      for(let i=0;i<R.wave;i++)this.spawnQ.push(0.6+i*0.28/Math.min(1.4,mul));
      this.events.push({type:"wave",n:R.wave});}
    // The round closes once its wave is spent: every bot from the door destroyed or through
    // (hooked units carry over — they are the player's own, turned), or after ROUND_MAX_S.
    if(R.phase==="live"&&!this.spawnQ.length&&R.t>3&&(!this.enemies.some(e=>!e.hooked)||R.t>=ROUND_MAX_S)){this.nextRound();if(this.over)return;}

    // fire
    if(this.firing){this.fireAcc+=dt*FIRE_RATE;while(this.fireAcc>=1){this.fireAcc-=1;this.spawnUnit(this.cx+(r()-0.5)*0.3,-0.7,1,false);this.events.push({type:"fire"});}}
    else this.fireAcc=Math.min(this.fireAcc,0.99);

    // the wave leaves Scam HQ's door
    for(let i=this.spawnQ.length-1;i>=0;i--){this.spawnQ[i]-=dt;if(this.spawnQ[i]<=0){this.spawnQ.splice(i,1);
      const n=this.count>=CAP?2:1,x=(r()-0.5)*3.2;this.addEnemy(x,-HQZ+0.8,n,false);this.events.push({type:"spawn",x});}}

    // units: gates (only while the round is live), then Scam HQ
    for(let i=this.units.length-1;i>=0;i--){const u=this.units[i];const z0=u.z;u.z-=UNIT_SPEED*dt;
      if(!u.crossed&&z0>GZ&&u.z<=GZ){u.crossed=true;
        if(R.phase==="live"){const s=this.gateAt(u.x);R.counts[s<0?2:s]+=u.n;
          if(s>=0){const card=R.pair.cards[s];
            if(card.r){const m=card.mult,add=u.n*(m-1);R.mult+=add;
              if(this.count+add<=CAP&&u.n===1){for(let k=0;k<add;k++)this.spawnUnit(u.x+(r()-0.5)*0.9,u.z-r()*0.6,1,true);}
              else u.n*=m;
              this.events.push({type:"mult",x:this.gateX(s),m,side:s});
            }else{
              this.units.splice(i,1);this.hooks.push({x:u.x,z:u.z,n:u.n,t:0,card});R.hooked+=u.n;
              const first=!this.hookedOnce;this.hookedOnce=true;
              this.events.push({type:"hooked",card,first,x:u.x,z:u.z});continue;
            }}}}
      if(u.z<=-HQZ+0.6){this.units.splice(i,1);this.hp-=u.n;this.events.push({type:"hq",x:u.x,n:u.n});
        if(this.hp<=0){this.hp=0;this.finish(true);return;}}
    }

    // hooked units: lifted on the line, turned, sent back down as enemies
    for(let i=this.hooks.length-1;i>=0;i--){const h=this.hooks[i];h.t+=dt;if(h.t>=0.9){this.hooks.splice(i,1);this.addEnemy(h.x,h.z,h.n,true);}}

    // enemies march at the cannon, drifting toward it
    const es=ENEMY_BASE*(this.lv.speed/6)*mul;
    for(let i=this.enemies.length-1;i>=0;i--){const e=this.enemies[i];e.age+=dt;e.z+=es*(e.hooked?0.8:1)*dt;
      const d=this.cx-e.x;e.x+=Math.sign(d)*Math.min(Math.abs(d),0.45*mul*dt);
      if(e.z>=CANNON_Z-0.3){this.enemies.splice(i,1);this.dmg+=e.n;this.events.push({type:"hit",n:e.n,x:e.x,hooked:e.hooked});
        if(this.dmg>=HEARTS*PER_HEART){this.finish(false);return;}}}

    this.collide();
  }

  /* Units and enemies destroy each other one for one on contact (by n). */
  collide(){
    const cell=new Map(),key=(x,z)=>Math.floor(z)*64+Math.floor(x+32);
    for(const e of this.enemies){const k=key(e.x,e.z);let a=cell.get(k);if(!a)cell.set(k,a=[]);a.push(e);}
    let any=false;
    for(const u of this.units){if(u.n<=0)continue;
      for(let dz=-1;dz<=1&&u.n>0;dz++)for(let dx=-1;dx<=1&&u.n>0;dx++){const a=cell.get(key(u.x,u.z)+dz*64+dx);if(!a)continue;
        for(const e of a){if(e.n<=0)continue;const ddx=e.x-u.x,ddz=e.z-u.z;if(ddx*ddx+ddz*ddz>0.22)continue;
          const k=Math.min(u.n,e.n);u.n-=k;e.n-=k;any=true;this.events.push({type:"pop",x:(u.x+e.x)/2,z:(u.z+e.z)/2});if(u.n<=0)break;}}}
    if(any){this.units=this.units.filter(u=>u.n>0);this.enemies=this.enemies.filter(e=>e.n>0);}
  }

  finish(won){if(this.over)return;if(this.cur)this.closeRound();this.cur=null;this.over=won?"win":"lose";this.events.push({type:won?"win":"lose"});}

  /* Per-pair outcome for the recap and the stars. A pair played more than once keeps
     its worst result (taking the bait once is what the recap must show). */
  summary(){
    const rank={bait:0,over_scroll:1,safe_scroll:2,trusted:3,spotted:4,smart_scroll:5};
    const byId=new Map();
    for(const e of this.log){if(!e.fired)continue;const prev=byId.get(e.pair.id);
      if(!prev||rank[e.outcome]<rank[prev.outcome])byId.set(e.pair.id,e);}
    const items=[...byId.values()];
    const lures=items.reduce((s,i)=>s+i.pair.cards.filter(c=>!c.r).length,0);
    const baitPairs=items.filter(i=>i.outcome==="bait").length;
    return{items,lures,dodged:lures-baitPairs,baitPairs};
  }
}
