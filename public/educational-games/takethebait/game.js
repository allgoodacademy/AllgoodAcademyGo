/* Take the Bait: the rules. No DOM, so the balance can be simulated headless (node)
   as well as played. index.html reads this state and draws it.

   THE LOOP
   Your friends (your crew) stand at the bottom. Scam HQ, at the top, fires messages
   down at them, one or two at a time. Tap a falling message and time stops while it
   opens up; then decide:
     - LET IT IN. A real message brings friends (+JOIN). A bait message drops hooks
       that pull about a quarter of your crew away.
     - BLOCK IT, then name the trick from two choices. Named right: the hook snaps,
       +BONUS friends. Named wrong: still blocked, no bonus. Blocking a REAL message
       means those friends never arrive (over-suspicion costs you).
   A message nobody taps reaches the crew as if it was let in. Speed is never the
   winning move: looking closer is free and stops time.
   When every message is resolved, the crew charges Scam HQ. Guards fight one for one;
   the crew wins if anyone is left standing. */
import {LEVELS,EXTRA,TECH} from "./content.js?v=20261121a";

export const START_CREW=10,JOIN=4,BONUS=2,HOOK_FRAC=0.2,MIN_HOOK=2,GUARD_SHARE=0.25;
export const SPEEDS={relaxed:0.7,normal:1,fast:1.3};
export const FALL_S=11,SPAWN_S=3.4;
export const TECH_KEYS=Object.keys(TECH);

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
  return src.map((pair,i)=>({id:ids[i],cards:rng()<0.5?[pair[0],pair[1]]:[pair[1],pair[0]]}));
}

/* Every card of every pair becomes one falling message, pair by pair. */
export function buildMessages(pairs){
  const out=[];pairs.forEach(p=>p.cards.forEach((card,j)=>out.push({id:p.id+(j?"b":"a"),pairId:p.id,card})));
  return out;
}

/* Two trick names to choose from when blocking: the right one, and one other. */
export function trickChoices(card,rng=Math.random){
  if(card.r){const a=TECH_KEYS[Math.floor(rng()*TECH_KEYS.length)];let b=a;while(b===a)b=TECH_KEYS[Math.floor(rng()*TECH_KEYS.length)];return[a,b];}
  let other=card.k;while(other===card.k)other=TECH_KEYS[Math.floor(rng()*TECH_KEYS.length)];
  return rng()<0.5?[card.k,other]:[other,card.k];
}

export function outcomeOf(card,decision){
  if(decision==="let")return card.r?"trusted":"bait";
  return card.r?"over_scroll":"spotted";
}

export class Level{
  constructor({L,messages,speed="normal",rng=Math.random}){
    this.L=L;this.lv=LEVELS[L];this.rng=rng;this.mul=SPEEDS[speed]||1;
    this.queue=messages.slice();this.total=messages.length;
    this.falling=[];this.log=[];this.crew=START_CREW;this.t=0;this.spawnT=1.2;
    this.maxOnScreen=L<2?2:3;this.events=[];this.phase="play";this.nextId=0;
    const reals=messages.filter(m=>m.card.r).length,baits=messages.length-reals;
    // Guards sit between "block everything" (START + BONUS per bait, never trusting a
    // real message) and perfect play (that plus JOIN per real message): blocking
    // everything always falls short; trusting the real ones is what wins.
    this.guards=START_CREW+BONUS*baits+Math.ceil(GUARD_SHARE*JOIN*reals);
  }
  get resolved(){return this.log.length;}
  get fallTime(){return FALL_S/this.mul;}

  step(dt){
    if(this.phase!=="play"||dt<=0)return;
    this.t+=dt;this.spawnT-=dt;
    if(this.spawnT<=0&&this.queue.length&&this.falling.length<this.maxOnScreen){
      const used=this.falling.filter(f=>f.y<0.4).map(f=>f.lane);
      const free=[0,1,2].filter(l=>!used.includes(l));
      const lane=free.length?free[Math.floor(this.rng()*free.length)]:Math.floor(this.rng()*3);
      const m=this.queue.shift();this.falling.push({key:++this.nextId,msg:m,lane,y:0});
      this.spawnT=SPAWN_S/this.mul;this.events.push({type:"spawn",key:this.nextId});
    }
    for(const f of this.falling.slice()){f.y+=dt/this.fallTime;if(f.y>=1)this.decide(f.key,"let",null,false);}
    if(!this.queue.length&&!this.falling.length)this.startCharge();
  }

  /* Resolve one falling message. `named` is the trick picked when blocking. */
  decide(key,decision,named,looked=true){
    const i=this.falling.findIndex(f=>f.key===key);if(i<0)return null;
    const f=this.falling.splice(i,1)[0],card=f.msg.card,outcome=outcomeOf(card,decision);
    let delta=0,namedRight=null;
    if(outcome==="trusted")delta=JOIN;
    else if(outcome==="bait")delta=-Math.min(this.crew,Math.max(MIN_HOOK,Math.round(this.crew*HOOK_FRAC)));
    else if(outcome==="spotted"){namedRight=named===card.k;if(namedRight)delta=BONUS;}
    this.crew=Math.max(0,this.crew+delta);
    const entry={key,msg:f.msg,card,decision,outcome,named,namedRight,delta,looked,lane:f.lane,y:f.y};
    this.log.push(entry);this.events.push({type:"resolve",entry});
    if(!this.queue.length&&!this.falling.length)this.startCharge();
    return entry;
  }
  startCharge(){if(this.phase!=="play")return;this.phase="charge";this.won=this.crew>this.guards;this.left=Math.max(0,this.crew-this.guards);this.events.push({type:"charge"});}

  summary(){
    const items=this.log;
    const baits=items.filter(e=>!e.card.r),reals=items.filter(e=>e.card.r);
    const baitsLetIn=baits.filter(e=>e.outcome==="bait").length;
    const rightCalls=items.filter(e=>e.outcome==="trusted"||e.outcome==="spotted").length;
    return{items,lures:baits.length,dodged:baits.length-baitsLetIn,baitsLetIn,
      realsTrusted:reals.filter(e=>e.outcome==="trusted").length,reals:reals.length,
      rightCalls,named:baits.filter(e=>e.namedRight).length,
      stars:this.won?(baitsLetIn===0?3:baitsLetIn===1?2:1):0};
  }
}
