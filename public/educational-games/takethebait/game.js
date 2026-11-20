/* Take the Bait: the rules. No DOM, so the balance can be simulated headless (node)
   as well as played. index.html reads this state and draws it.

   THE GAME (pure Mob Control while you play; the learning comes after each level)
   - Your cannon sits at the bottom. Hold to fire a stream of your crew up the field;
     drag (or ← →) to aim.
   - Gate rows slide across the field. A blue gate multiplies whoever passes through it
     (×2, ×3). A red gate destroys them. Aim the stream through the blue ones.
   - Scam HQ sits at the top with a health bar. It sends waves of spam bots down at you.
     Crew and bots destroy each other one for one.
   - Crew that reach Scam HQ knock its health down. Empty it to win.
   - Bots that reach your cannon cost hearts (one heart per HURT_PER_HEART bots).
     Three hearts gone and the level is lost.
   After each level: three Real or Bait? messages from that level's content bank, and
   Jodi's recap of each one (that part lives in index.html).

   Coordinates are normalised: x 0..1 across, y 0..1 down the field. `aspect` (width /
   height of the field on screen) keeps collision distances round on any screen. A unit
   or bot can stand for several (n>1) once the field is crowded, so the number of
   objects stays capped; every rule counts n, never objects. */
export const SPEEDS={relaxed:0.75,normal:1,fast:1.3};
export const HEARTS=3,HURT_PER_HEART=5;
export const CANNON_Y=0.9,BASE_Y=0.12,FIRE_RATE=7,UNIT_SPEED=0.5,CAP=320;

/* Five levels. Each gate: x centre at rest (0..1), w width (0..1), op 'x' (multiply by v)
   or 'kill'. A row slides by `amp` at `spd` radians per second. */
export const LEVEL_DEFS=[
  {name:"The Lobby",hp:700,waveEvery:4.5,wave0:8,waveGrow:2.5,waveCap:34,enemySpeed:0.1,
    rows:[{y:0.62,amp:0.18,spd:0.7,gates:[{x:0.5,w:0.34,op:"x",v:2}]},
          {y:0.4,amp:0.22,spd:0.55,gates:[{x:0.5,w:0.3,op:"x",v:2}]}]},
  {name:"The Feed",hp:800,waveEvery:5,wave0:8,waveGrow:2.2,waveCap:30,enemySpeed:0.1,
    rows:[{y:0.64,amp:0.2,spd:0.8,gates:[{x:0.3,w:0.28,op:"x",v:2},{x:0.72,w:0.24,op:"kill"}]},
          {y:0.42,amp:0.24,spd:0.6,gates:[{x:0.5,w:0.26,op:"x",v:3}]}]},
  {name:"The Group Chat",hp:950,waveEvery:4.8,wave0:9,waveGrow:2.4,waveCap:34,enemySpeed:0.105,
    rows:[{y:0.66,amp:0.22,spd:0.9,gates:[{x:0.28,w:0.26,op:"x",v:2},{x:0.72,w:0.26,op:"x",v:2}]},
          {y:0.5,amp:0.26,spd:1.1,gates:[{x:0.5,w:0.22,op:"kill"}]},
          {y:0.34,amp:0.2,spd:0.7,gates:[{x:0.5,w:0.26,op:"x",v:3}]}]},
  {name:"The Shop",hp:1100,waveEvery:4.6,wave0:10,waveGrow:2.6,waveCap:38,enemySpeed:0.11,
    rows:[{y:0.66,amp:0.24,spd:1,gates:[{x:0.3,w:0.24,op:"x",v:3},{x:0.72,w:0.24,op:"kill"}]},
          {y:0.48,amp:0.26,spd:1.2,gates:[{x:0.3,w:0.22,op:"kill"},{x:0.72,w:0.24,op:"x",v:2}]},
          {y:0.33,amp:0.22,spd:0.8,gates:[{x:0.5,w:0.24,op:"x",v:2}]}]},
  {name:"The Mix",hp:680,waveEvery:4.8,wave0:9,waveGrow:2.3,waveCap:34,enemySpeed:0.105,
    rows:[{y:0.68,amp:0.26,spd:1.1,gates:[{x:0.28,w:0.22,op:"x",v:2},{x:0.72,w:0.22,op:"kill"}]},
          {y:0.52,amp:0.28,spd:1.3,gates:[{x:0.3,w:0.2,op:"kill"},{x:0.7,w:0.24,op:"x",v:3}]},
          {y:0.36,amp:0.24,spd:0.9,gates:[{x:0.5,w:0.24,op:"x",v:2}]}]}];

export class Battle{
  constructor({L,speed="normal",rng=Math.random,aspect=0.56}){
    this.L=L;this.def=LEVEL_DEFS[L];this.rng=rng;this.mul=SPEEDS[speed]||1;this.aspect=aspect;
    this.hp0=this.hp=this.def.hp;this.cx=0.5;this.firing=false;this.fireAcc=0;
    this.units=[];this.enemies=[];this.dmg=0;this.t=0;this.over=null;this.events=[];
    this.wave=0;this.waveT=3;this.spawnQ=[];this.ph=this.def.rows.map(()=>rng()*6.28);
    this.stats={fired:0,multiplied:0,lostToRed:0,botsStopped:0,botsThrough:0,hits:0};
  }
  get hearts(){return Math.max(0,HEARTS-this.dmg/HURT_PER_HEART);}
  get count(){return this.units.length+this.enemies.length;}
  /* Where each gate is right now (x is its centre). */
  gates(){return this.def.rows.map((r,i)=>{const off=Math.sin(this.t*r.spd+this.ph[i])*r.amp;
    return{y:r.y,gates:r.gates.map(g=>({...g,cx:Math.min(1-g.w/2,Math.max(g.w/2,g.x+off))}))};});}

  step(dt){
    if(this.over||dt<=0)return;
    const r=this.rng;this.t+=dt;
    if(this.firing){this.fireAcc+=dt*FIRE_RATE;while(this.fireAcc>=1){this.fireAcc-=1;this.units.push({x:this.cx+(r()-0.5)*0.025,y:CANNON_Y-0.03,n:1,mask:0});this.stats.fired++;this.events.push({type:"fire"});}}
    else this.fireAcc=Math.min(this.fireAcc,0.99);

    // waves of spam bots from Scam HQ: bigger every wave, capped per level
    this.waveT-=dt;
    if(this.waveT<=0){this.wave++;this.waveT=this.def.waveEvery/this.mul;
      const size=Math.min(this.def.waveCap,Math.round(this.def.wave0+(this.wave-1)*this.def.waveGrow));
      for(let i=0;i<size;i++)this.spawnQ.push(i*0.07);this.events.push({type:"wave",n:size,wave:this.wave});}
    for(let i=this.spawnQ.length-1;i>=0;i--){this.spawnQ[i]-=dt;if(this.spawnQ[i]<=0){this.spawnQ.splice(i,1);
      this.enemies.push({x:0.5+(r()-0.5)*0.28,y:BASE_Y+0.04,n:this.count>=CAP?2:1,ph:r()*6.28});}}

    // crew: up the field, through gates, into Scam HQ
    const rows=this.gates();
    for(let i=this.units.length-1;i>=0;i--){const u=this.units[i],y0=u.y;u.y-=UNIT_SPEED*dt;
      for(let ri=0;ri<rows.length;ri++){const row=rows[ri];if(u.mask&(1<<ri))continue;if(!(y0>row.y&&u.y<=row.y))continue;u.mask|=1<<ri;
        const g=row.gates.find(g=>Math.abs(u.x-g.cx)<=g.w/2);if(!g)continue;
        if(g.op==="kill"){this.units.splice(i,1);this.stats.lostToRed+=u.n;this.events.push({type:"red",x:u.x,y:row.y,n:u.n});break;}
        const add=u.n*(g.v-1);this.stats.multiplied+=add;
        if(u.n===1&&this.count+add<=CAP){for(let k=0;k<add;k++)this.units.push({x:Math.min(0.98,Math.max(0.02,u.x+(r()-0.5)*0.05)),y:u.y-r()*0.02,n:1,mask:u.mask});}
        else u.n*=g.v;
        this.events.push({type:"mult",x:g.cx,y:row.y,v:g.v});}
      if(!this.units[i]||this.units[i]!==u)continue;
      if(u.y<=BASE_Y+0.02){this.units.splice(i,1);this.hp-=u.n;this.stats.hits+=u.n;this.events.push({type:"hq",x:u.x,n:u.n});
        if(this.hp<=0){this.hp=0;return this.finish(true);}}}

    // bots: down at the cannon, drifting toward it
    const es=this.def.enemySpeed*this.mul;
    for(let i=this.enemies.length-1;i>=0;i--){const e=this.enemies[i];e.y+=es*dt;
      const d=this.cx-e.x;e.x+=Math.sign(d)*Math.min(Math.abs(d),0.06*this.mul*dt);
      if(e.y>=CANNON_Y){this.enemies.splice(i,1);this.dmg+=e.n;this.stats.botsThrough+=e.n;this.events.push({type:"hurt",x:e.x,n:e.n});
        if(this.dmg>=HEARTS*HURT_PER_HEART)return this.finish(false);}}

    this.collide();
  }
  collide(){
    const R=0.022,cell=new Map(),key=(x,y)=>Math.floor(y/0.04)*100+Math.floor(x*this.aspect/0.04);
    for(const e of this.enemies){const k=key(e.x,e.y);let a=cell.get(k);if(!a)cell.set(k,a=[]);a.push(e);}
    let any=false;
    for(const u of this.units){if(u.n<=0)continue;const k0=key(u.x,u.y);
      for(let dy=-1;dy<=1&&u.n>0;dy++)for(let dx=-1;dx<=1&&u.n>0;dx++){const a=cell.get(k0+dy*100+dx);if(!a)continue;
        for(const e of a){if(e.n<=0)continue;const ddx=(e.x-u.x)*this.aspect,ddy=e.y-u.y;if(ddx*ddx+ddy*ddy>R*R*4)continue;
          const k=Math.min(u.n,e.n);u.n-=k;e.n-=k;this.stats.botsStopped+=k;any=true;this.events.push({type:"pop",x:(u.x+e.x)/2,y:(u.y+e.y)/2});if(u.n<=0)break;}}}
    if(any){this.units=this.units.filter(u=>u.n>0);this.enemies=this.enemies.filter(e=>e.n>0);}
  }
  finish(won){if(this.over)return;this.over=won?"win":"lose";this.firing=false;this.events.push({type:won?"win":"lose"});}
  /* Stars for the battle: a win with no hearts lost is 3. */
  get stars(){if(this.over!=="win")return 0;const h=this.hearts;return h>=HEARTS?3:h>=HEARTS-1?2:1;}
}

/* The Real or Bait? round after each level: three messages from that level's own content
   bank (the Mix draws from all of them), always at least one real and one bait. */
export function quizItems(LEVELS,EXTRA,L,rng=Math.random){
  const pairs=LEVELS[L].gates||LEVELS.flatMap(l=>l.gates||[]).concat(EXTRA);
  const cards=pairs.flat();
  const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
  const reals=shuffle(cards.filter(c=>c.r)),baits=shuffle(cards.filter(c=>!c.r));
  const pick=[reals[0],baits[0],rng()<0.5?reals[1]:baits[1]].filter(Boolean);
  return shuffle(pick);
}
