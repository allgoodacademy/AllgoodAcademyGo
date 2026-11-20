/* Take the Bait: the rules. No DOM, no Three.js, so the balance can be simulated
   headless (node) as well as played. index.html reads this state and draws it.

   Field coordinates: x across (−HW…HW), z up the field. The cannon sits at z=0;
   Scam HQ's front wall is at z=−HQZ. Units (yours) move toward −z, enemies
   toward +z. A "unit" can stand for several soldiers (n>1) once the field is
   crowded, so the drawn count stays under the cap; every rule counts n, never
   the number of objects. */
import {LEVELS,EXTRA} from "./content.js";

export const HW=4.6,HQZ=30,GZ=-8,CANNON_Z=0;
export const GATE_W=3.0,GATE_C=2.2;          // each gate's width, and its centre offset from the pair's middle
export const HEARTS=3,PER_HEART=10;           // 1 heart per 10 enemies that reach the bottom
export const CHECKS=3,ROTATE_S=12,ROTATE_SHOTS=36;
export const FIRE_RATE=6,UNIT_SPEED=9;
export const CAP=230;                          // most objects (units + enemies) kept separate before merging into clumps
export const SPEEDS={relaxed:0.7,normal:1,fast:1.3};
const HQ_HP=[740,800,830,880,760];
const LATE_S=150;
const ENEMY_BASE=2.1;                          // march speed at level speed 6, Normal

/* A level's message pairs, each shuffled left/right. Levels 1–4 use their own
   five pairs; the Mix draws 6 pairs from those twenty, weighting techniques the
   player has taken the bait on, then adds both EXTRA pairs. */
export function buildPairs(L,techStats,rng=Math.random){
  const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
  let src;
  if(LEVELS[L].gates)src=LEVELS[L].gates.slice();
  else{
    const pool=[];LEVELS.forEach(l=>l.gates&&l.gates.forEach(p=>pool.push(p)));
    const weight=p=>p.reduce((w,c)=>w+(c.r?0:((techStats[c.k]&&techStats[c.k].bait)||0)*10+1),0)+rng();
    const picked=pool.map(p=>({p,w:weight(p)})).sort((a,b)=>b.w-a.w).slice(0,6).map(o=>o.p);
    src=shuffle(picked).concat(EXTRA);
  }
  return src.map((pair,i)=>{
    const cards=rng()<0.5?[pair[0],pair[1]]:[pair[1],pair[0]];
    const anyBait=cards.some(c=>!c.r);
    // A real message pays ×2; ×3 when it sits next to a bait (spotting the lure pays more).
    return{id:i,cards:cards.map(c=>({...c,mult:c.r?(anyBait?3:2):0}))};
  });
}

export class Game{
  constructor({L,pairs,speed="normal",rng=Math.random}){
    this.L=L;this.lv=LEVELS[L];this.pairs=pairs;this.rng=rng;
    this.mul=SPEEDS[speed]||1;
    this.hp0=this.hp=HQ_HP[L];
    this.cx=0;this.firing=false;this.fireAcc=0;
    this.units=[];this.enemies=[];this.hooks=[];
    this.dmg=0;this.checks=CHECKS;this.t=0;
    this.pi=-1;this.cur=null;this.log=[];
    this.slide=0;this.slideT=rng()*6;
    this.wave=0;this.waveT=3.5;this.spawnQ=[];
    this.hookedOnce=false;this.over=null;this.events=[];
    this.nextPair();
  }
  get hearts(){return Math.max(0,HEARTS-this.dmg/PER_HEART);}
  get count(){return this.units.length+this.enemies.length+this.hooks.length;}
  gateX(side){return this.slide+(side?GATE_C:-GATE_C);}
  /* Which gate (0/1) an x position is inside, or -1 for the gap. */
  gateAt(x){for(let s=0;s<2;s++){if(Math.abs(x-this.gateX(s))<=GATE_W/2)return s;}return -1;}

  nextPair(){
    if(this.cur)this.closePair();
    this.pi++;const p=this.pairs[this.pi%this.pairs.length];
    this.cur={pair:p,counts:[0,0,0],shots:0,t:0};
    this.events.push({type:"pair",pair:p});
  }
  closePair(){
    const c=this.cur.counts,tot=c[0]+c[1]+c[2];
    if(tot>0){const pick=c[2]>=c[0]&&c[2]>=c[1]?-1:(c[0]>=c[1]?0:1);
      this.log.push({pair:this.cur.pair,counts:c.slice(),pick});}
  }
  check(){if(this.checks<=0||this.over)return false;this.checks--;this.events.push({type:"check"});return true;}

  spawnUnit(x,z,n,crossed){this.units.push({x,z,n,crossed,ph:this.rng()*6.28,age:0});}
  addEnemy(x,z,n,hooked){this.enemies.push({x,z,n,hooked,ph:this.rng()*6.28});}

  step(dt){
    if(this.over||dt<=0)return;
    const r=this.rng,mul=this.mul;this.t+=dt;

    // gates slide slowly; a moving level slides further
    this.slideT+=dt*0.45*mul;
    this.slide=Math.sin(this.slideT)*(this.lv.moving?0.75:0.4);

    // rotation: on a timer, or once the pair has been shot through enough
    this.cur.t+=dt;
    if(this.cur.t>=ROTATE_S/mul||this.cur.shots>=ROTATE_SHOTS)this.nextPair();

    // fire
    if(this.firing){this.fireAcc+=dt*FIRE_RATE;while(this.fireAcc>=1){this.fireAcc-=1;this.spawnUnit(this.cx+(r()-0.5)*0.3,-0.6,1,false);}}
    else this.fireAcc=Math.min(this.fireAcc,0.99);

    // waves from Scam HQ: bigger every wave, bigger on later levels
    this.waveT-=dt;
    if(this.waveT<=0){this.wave++;this.waveT=7.5;
      // Waves level off at a cap. After LATE_S the cap climbs, so playing it too safe
      // (never shooting a multiplier) runs out of time instead of winning slowly.
      const cap=12+3*this.lv.mobs+Math.max(0,Math.floor((this.t-LATE_S)/7.5))*7;
      const size=Math.min(cap,Math.round((4+this.wave*1.3)*(0.85+0.15*this.lv.mobs)));
      for(let i=0;i<size;i++)this.spawnQ.push(i*0.09);
      this.events.push({type:"wave",n:size});}
    for(let i=this.spawnQ.length-1;i>=0;i--){this.spawnQ[i]-=dt;if(this.spawnQ[i]<=0){this.spawnQ.splice(i,1);
      const n=this.count>=CAP?2:1;this.addEnemy((r()-0.5)*5.2,-HQZ+1.2,n,false);}}

    // move units, resolve gates and Scam HQ
    for(let i=this.units.length-1;i>=0;i--){const u=this.units[i];const z0=u.z;u.z-=UNIT_SPEED*dt;u.age+=dt;
      if(!u.crossed&&z0>GZ&&u.z<=GZ){u.crossed=true;const s=this.gateAt(u.x);
        this.cur.counts[s<0?2:s]+=u.n;if(s>=0)this.cur.shots+=u.n;
        if(s>=0){const card=this.cur.pair.cards[s];
          if(card.r){const m=card.mult,add=u.n*(m-1);
            if(this.count+add<=CAP&&u.n===1){for(let k=0;k<add;k++)this.spawnUnit(u.x+(r()-0.5)*0.9,u.z-r()*0.6,1,true);}
            else u.n*=m;
            this.events.push({type:"mult",x:this.gateX(s),m,side:s});
          }else{
            this.units.splice(i,1);this.hooks.push({x:u.x,z:u.z,n:u.n,t:0,card});
            const first=!this.hookedOnce;this.hookedOnce=true;
            this.events.push({type:"hooked",card,first,x:u.x,z:u.z});continue;
          }}}
      if(u.z<=-HQZ+0.6){this.units.splice(i,1);this.hp-=u.n;this.events.push({type:"hq",x:u.x,n:u.n});
        if(this.hp<=0){this.hp=0;this.finish(true);return;}}
    }

    // hooked units: lifted on the line, turned, sent back as enemies
    for(let i=this.hooks.length-1;i>=0;i--){const h=this.hooks[i];h.t+=dt;if(h.t>=0.8){this.hooks.splice(i,1);this.addEnemy(h.x,h.z,h.n,true);}}

    // enemies march at the cannon, drifting toward it
    const es=ENEMY_BASE*(this.lv.speed/6)*mul;
    for(let i=this.enemies.length-1;i>=0;i--){const e=this.enemies[i];e.z+=es*dt;
      const d=this.cx-e.x;e.x+=Math.sign(d)*Math.min(Math.abs(d),0.55*mul*dt);
      if(e.z>=CANNON_Z-0.2){this.enemies.splice(i,1);this.dmg+=e.n;this.events.push({type:"hit",n:e.n,x:e.x});
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
        for(const e of a){if(e.n<=0)continue;const ddx=e.x-u.x,ddz=e.z-u.z;if(ddx*ddx+ddz*ddz>0.2)continue;
          const k=Math.min(u.n,e.n);u.n-=k;e.n-=k;any=true;this.events.push({type:"pop",x:(u.x+e.x)/2,z:(u.z+e.z)/2});if(u.n<=0)break;}}}
    if(any){this.units=this.units.filter(u=>u.n>0);this.enemies=this.enemies.filter(e=>e.n>0);}
  }

  finish(won){if(this.over)return;this.closePair();this.cur=null;this.over=won?"win":"lose";this.events.push({type:won?"win":"lose"});}

  /* Per-pair outcome for the recap and the stars. */
  summary(){
    const byId=new Map();
    for(const e of this.log){const p=e.pair,cards=p.cards,picked=e.pick>=0?cards[e.pick]:null,anyBait=cards.some(c=>!c.r);
      let kind;
      if(picked&&!picked.r)kind="bait";
      else if(picked&&anyBait)kind="spotted";
      else if(picked)kind="trusted";
      else kind=anyBait?"scrolled":"bothreal";
      const prev=byId.get(p.id);
      if(!prev||kind==="bait")byId.set(p.id,{pair:p,kind,picked});
    }
    const items=[...byId.values()];
    const lures=items.reduce((s,i)=>s+i.pair.cards.filter(c=>!c.r).length,0);
    const hooked=items.filter(i=>i.kind==="bait").length;
    return{items,lures,dodged:lures-hooked,baitPairs:hooked};
  }
}
