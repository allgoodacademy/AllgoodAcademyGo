// verbal-items.js — hand-authored. Semantics can't be generated safely.
const A = (id, lvl, a, b, c, ans, d1, d2, d3, mech) => ({
  id, sub: 'verbal-analogies', lvl, type: 'mc',
  stem: `<span class="hl">${a}</span> \u2192 <span class="hl">${b}</span> &nbsp;as&nbsp; <span class="hl">${c}</span> \u2192 ?`,
  _o: [ans, d1, d2, d3], mech
});
const K = (id, lvl, g1, g2, g3, ans, d1, d2, d3, mech) => ({
  id, sub: 'verbal-classification', lvl, type: 'mc',
  stem: `<span class="hl">${g1} \u00b7 ${g2} \u00b7 ${g3}</span><br><span style="font-size:16px;color:var(--muted)">Which belongs with them?</span>`,
  _o: [ans, d1, d2, d3], mech
});
const S = (id, lvl, sentence, ans, d1, d2, d3, mech) => ({
  id, sub: 'sentence-completion', lvl, type: 'mc',
  stem: sentence.replace('___', '<span class="hl">______</span>'),
  _o: [ans, d1, d2, d3], mech
});

const ITEMS = [
// ---------- VERBAL ANALOGIES ----------
// L11 — concrete, single-relation
A('V-A-01',11,'hammer','nail','wrench','bolt','pipe','grip','toolbox','Tool \u2192 the fastener it turns. "Pipe" is what you\'d turn it on, not what you turn \u2014 that\'s the trap.'),
A('V-A-02',11,'bird','nest','bee','hive','honey','flower','wing','Animal \u2192 the home it builds. "Honey" is what it makes, not where it lives.'),
A('V-A-03',11,'pen','write','scissors','cut','paper','sharp','metal','Tool \u2192 the action it performs. Two options describe the tool itself, not its use.'),
A('V-A-04',11,'hot','cold','wet','dry','water','rain','damp','Direct opposites. "Damp" is a weaker version of wet, not its opposite.'),
A('V-A-05',11,'puppy','dog','kitten','cat','pet','mouse','fur','Young animal \u2192 the adult it becomes.'),
A('V-A-06',11,'shoe','foot','glove','hand','finger','warm','leather','Item of clothing \u2192 the body part it covers. "Finger" is only part of the hand.'),
A('V-A-07',11,'library','books','bakery','bread','flour','oven','baker','Place \u2192 what it holds or sells. "Flour" is an ingredient, "oven" a tool.'),
A('V-A-08',11,'fish','swim','bird','fly','feather','sky','nest','Animal \u2192 how it moves. Options naming a place or a body part fail the relationship.'),
A('V-A-09',11,'teacher','school','doctor','hospital','patient','medicine','nurse','Worker \u2192 where they work.'),
A('V-A-10',11,'petal','flower','leaf','tree','green','branch','root','Part \u2192 the whole it belongs to. "Branch" and "root" are also parts, not wholes.'),
A('V-A-11',11,'cup','drink','plate','eat','food','round','dish','Container \u2192 the action it serves.'),
// L12 — abstract, category shifts
A('V-A-12',12,'author','novel','composer','symphony','orchestra','piano','concert','Creator \u2192 what they create. "Orchestra" performs it; it doesn\'t get created by the composer.'),
A('V-A-13',12,'drought','crops','frost','blossoms','winter','cold','garden','Damaging condition \u2192 what it destroys. "Winter" and "cold" are causes, not casualties.'),
A('V-A-14',12,'whisper','shout','stroll','sprint','walk','run','slow','Mild version \u2192 intense version of the same action.'),
A('V-A-15',12,'lens','camera','engine','car','driver','road','wheel','Essential internal component \u2192 the device it powers. A wheel is external; a driver isn\'t a part.'),
A('V-A-16',12,'apology','offense','remedy','ailment','doctor','pain','cure','Thing \u2192 the problem it responds to. "Cure" is a synonym for remedy, not the problem.'),
A('V-A-17',12,'chapter','book','scene','play','actor','stage','script','Subdivision \u2192 the work it divides. Options naming people or places break the structure.'),
A('V-A-18',12,'sculptor','marble','weaver','thread','loom','cloth','pattern','Craftsperson \u2192 the raw material they work with. "Cloth" is the product, "loom" the tool.'),
A('V-A-19',12,'thermometer','temperature','scale','weight','heavy','measure','kitchen','Instrument \u2192 what it measures.'),
A('V-A-20',12,'reckless','cautious','generous','stingy','kind','wealthy','giving','Opposites in character. "Giving" is a synonym for generous, not its opposite.'),
A('V-A-21',12,'seed','plant','egg','bird','shell','nest','feather','Origin \u2192 the mature organism. "Shell" is part of the egg, not what it becomes.'),
A('V-A-22',12,'oasis','desert','island','ocean','beach','water','sand','A small area of one kind surrounded by a vast area of its opposite.'),
// L13 — precise distinctions, cause/consequence direction
A('V-A-23',13,'drought','famine','inflation','recession','currency','shortage','economy','Cause \u2192 the crisis it produces. "Shortage" is a sibling cause, not a consequence.'),
A('V-A-24',13,'prologue','narrative','preamble','statute','law','court','clause','Introductory section \u2192 the formal document it opens. "Clause" is an internal part, not the whole.'),
A('V-A-25',13,'meticulous','careless','candid','evasive','honest','direct','blunt','Precise opposites. Two options are synonyms of candid, not antonyms.'),
A('V-A-26',13,'catalyst','reaction','spark','combustion','fire','fuel','heat','Initiator \u2192 the process it triggers. "Fuel" enables it; "fire" is the visible result, not the process.'),
A('V-A-27',13,'archipelago','islands','constellation','stars','sky','planets','telescope','Collective term \u2192 the individual units it groups.'),
A('V-A-28',13,'symptom','disease','clue','crime','detective','evidence','mystery','Observable sign \u2192 the hidden thing it points to. "Evidence" is a synonym for clue.'),
A('V-A-29',13,'abridge','text','dilute','solution','water','mixture','concentrate','Verb \u2192 what it reduces the strength of. "Concentrate" is the opposite action.'),
A('V-A-30',13,'ephemeral','permanent','obscure','renowned','hidden','vague','unknown','Opposites. Two options restate obscure rather than reversing it.'),
A('V-A-31',13,'chronicle','events','ledger','transactions','money','accountant','bank','Record \u2192 what it records. Options naming people or institutions miss the relationship.'),
A('V-A-32',13,'quarantine','contagion','embargo','trade','goods','ship','port','Restriction \u2192 what it is imposed to stop.'),
A('V-A-33',13,'sediment','river','plaque','artery','blood','heart','vessel','Accumulated deposit \u2192 the channel it builds up in. "Blood" is what flows, not the channel.'),

// ---------- VERBAL CLASSIFICATION ----------
// L11
K('V-C-01',11,'granite','marble','slate','limestone','brick','glass','plaster','All naturally occurring stone. Brick and plaster are manufactured \u2014 the group is defined by origin, not use.'),
K('V-C-02',11,'oak','maple','birch','elm','fern','moss','ivy','All are trees. The others are plants but not trees.'),
K('V-C-03',11,'violin','cello','viola','double bass','flute','drum','trumpet','All are bowed string instruments. Flute and trumpet are wind; drum is percussion.'),
K('V-C-04',11,'Mercury','Venus','Mars','Jupiter','Moon','Sun','comet','All are planets. The Moon is a satellite, the Sun a star.'),
K('V-C-05',11,'triangle','square','hexagon','pentagon','circle','sphere','line','All are polygons \u2014 closed shapes with straight sides. A circle has no sides.'),
K('V-C-06',11,'copper','silver','iron','zinc','plastic','wood','rubber','All are metals \u2014 they conduct heat and electricity. The others are insulating materials.'),
K('V-C-07',11,'rain','snow','sleet','hail','wind','cloud','fog','All are forms of precipitation \u2014 water falling from the sky. Wind and fog are weather but don\'t fall.'),
K('V-C-08',11,'carrot','potato','radish','beet','lettuce','tomato','pepper','All grow underground. The others grow above ground.'),
K('V-C-09',11,'ankle','wrist','knee','elbow','spine','skull','rib','All are joints that bend. The others are bones that don\'t.'),
K('V-C-10',11,'Atlantic','Pacific','Arctic','Indian','Mediterranean','Caribbean','Baltic','All are oceans. The others are seas \u2014 smaller and partly enclosed.'),
K('V-C-11',11,'hour','minute','second','week','clock','watch','calendar','All are units of time. The others are devices that measure it.'),
// L12
K('V-C-12',12,'whisper','murmur','mutter','mumble','shout','announce','sing','All mean speaking quietly AND indistinctly. "Shout" fails on volume; "announce" fails on clarity.'),
K('V-C-13',12,'novel','biography','encyclopedia','memoir','poem','song','letter','All are book-length prose works.'),
K('V-C-14',12,'sprint','dash','bolt','dart','stroll','march','wander','All mean to move very fast. The others are deliberate but slow.'),
K('V-C-15',12,'honesty','courage','patience','loyalty','wealth','fame','talent','All are virtues \u2014 chosen traits of character. The others are circumstances or gifts.'),
K('V-C-16',12,'drizzle','downpour','shower','deluge','breeze','gale','frost','All describe rainfall at different intensities.'),
K('V-C-17',12,'chisel','plane','lathe','sander','nail','screw','glue','All are tools that shape material by removing it. The others join material together.'),
K('V-C-18',12,'peninsula','isthmus','cape','promontory','bay','gulf','strait','All are land formations extending into water. The others are bodies of water.'),
K('V-C-19',12,'astonished','amazed','stunned','astounded','pleased','curious','content','All mean overwhelmed by surprise. The others are milder and not surprise-based.'),
K('V-C-20',12,'thesis','hypothesis','premise','proposition','conclusion','evidence','result','All are claims stated before testing. The others come after.'),
K('V-C-21',12,'pound','ounce','tonne','stone','litre','metre','degree','All measure mass. The others measure volume, length, and temperature.'),
K('V-C-22',12,'mosaic','collage','montage','patchwork','portrait','sketch','mural','All are made by assembling separate pieces into one image.'),
// L13
K('V-C-23',13,'lucid','coherent','articulate','intelligible','eloquent','verbose','fluent','All mean clearly understandable. "Eloquent" and "fluent" describe skill, not clarity; "verbose" is the opposite.'),
K('V-C-24',13,'erode','corrode','abrade','weather','construct','reinforce','fortify','All mean to wear away gradually. The others build up.'),
K('V-C-25',13,'sonnet','haiku','limerick','villanelle','essay','fable','anecdote','All are poetic forms with fixed structural rules. The others are prose forms.'),
K('V-C-26',13,'tentative','provisional','conditional','contingent','permanent','absolute','definitive','All mean dependent on something else and subject to change.'),
K('V-C-27',13,'famine','drought','blight','pestilence','harvest','abundance','surplus','All are agricultural catastrophes. The others describe plenty.'),
K('V-C-28',13,'preamble','prologue','prelude','overture','epilogue','appendix','postscript','All come before the main work. The others come after.'),
K('V-C-29',13,'skeptical','dubious','incredulous','wary','convinced','certain','assured','All express doubt. The others express confidence.'),
K('V-C-30',13,'tributary','estuary','delta','confluence','summit','ridge','plateau','All are river features. The others are landforms of elevation.'),
K('V-C-31',13,'anomaly','aberration','deviation','irregularity','norm','standard','convention','All describe departures from the expected. The others describe the expectation itself.'),
K('V-C-32',13,'philanthropy','altruism','benevolence','charity','avarice','greed','frugality','All describe generosity toward others. "Frugality" is restraint, not selfishness \u2014 but still not generosity.'),
K('V-C-33',13,'stalactite','stalagmite','column','flowstone','dune','moraine','delta','All are cave formations built by mineral deposits. The others are formed by wind, ice, or water outside caves.'),

// ---------- SENTENCE COMPLETION ----------
// L11
S('S-C-01',11,'Although the recipe called for exact measurements, Maya cooked by ___, adding ingredients until the taste seemed right.','instinct','schedule','necessity','accident','"Although" signals contrast \u2014 the blank must oppose exact measurements. The second half then defines it.'),
S('S-C-02',11,'The hallway was so ___ that we could hear the clock ticking three rooms away.','quiet','crowded','narrow','bright','The second half proves the answer: hearing something faint requires silence.'),
S('S-C-03',11,'Because the bridge was ___, the city closed it until repairs could be made.','unsafe','popular','wide','historic','"Because" links cause to effect. Only one option explains a closure.'),
S('S-C-04',11,'The puppy was ___, knocking over two lamps before anyone could catch it.','energetic','exhausted','obedient','timid','The example after the comma defines the blank \u2014 knocking things over isn\'t calm behavior.'),
S('S-C-05',11,'She spoke with such ___ that nobody doubted she had rehearsed her speech many times.','confidence','hesitation','confusion','silence','Rehearsal produces assurance; two options describe its opposite.'),
S('S-C-06',11,'The instructions were ___, so even the youngest camper set up her tent without help.','simple','lengthy','missing','technical','The result \u2014 a young child succeeding alone \u2014 tells you what the instructions must have been.'),
S('S-C-07',11,'Despite the ___ weather, the team finished the entire game.','miserable','perfect','mild','warm','"Despite" signals contrast \u2014 the weather must work against finishing.'),
S('S-C-08',11,'The museum guard remained ___, watching the same doorway for six straight hours.','alert','restless','cheerful','distracted','Six hours of watching one spot requires sustained attention, not the opposite.'),
S('S-C-09',11,'Marcus was ___ about the surprise party, refusing to give his sister even one hint.','secretive','honest','careless','forgetful','The second half defines it: withholding hints is deliberate secrecy, not forgetfulness.'),
S('S-C-10',11,'The soup needed more ___; it tasted like warm water.','flavor','liquid','heat','volume','Tasting like water means something is missing \u2014 and it isn\'t more water.'),
S('S-C-11',11,'After the long hike, everyone was ___ and collapsed onto the grass.','weary','eager','anxious','alert','Collapsing defines the state. Two options describe the opposite of tired.'),
// L12
S('S-C-12',12,'The scientist\'s conclusions were ___; she had tested her hypothesis across five separate trials.','robust','premature','disputed','unpublished','Five trials strengthen a conclusion \u2014 the semicolon\'s second half is evidence for the blank.'),
S('S-C-13',12,'Though normally ___, Dev argued passionately for nearly ten minutes and had to be asked twice to sit down.','reserved','outspoken','hostile','impatient','"Though" signals contrast \u2014 the blank must oppose arguing at length. Two options describe someone who already speaks up.'),
S('S-C-14',12,'The treaty was merely ___; both sides resumed fighting within a month.','symbolic','permanent','binding','effective','If fighting resumed, the treaty accomplished nothing real. Three options claim it worked.'),
S('S-C-15',12,'Her explanation was so ___ that even students who had missed the lesson understood immediately.','lucid','technical','brief','detailed','The result \u2014 immediate understanding by the unprepared \u2014 requires clarity specifically, not brevity or detail.'),
S('S-C-16',12,'The committee\'s decision seemed ___, arrived at without consulting anyone affected by it.','arbitrary','democratic','considered','transparent','"Without consulting anyone affected" defines the blank. Three options describe the opposite process.'),
S('S-C-17',12,'Rainfall this season was ___, less than half the usual amount for the region.','scarce','abundant','typical','excessive','The measurement after the comma defines the word precisely.'),
S('S-C-18',12,'The novel\'s ending felt ___, resolving in two pages what the previous three hundred had built.','abrupt','gradual','satisfying','inevitable','The contrast between two pages and three hundred is the clue \u2014 the pacing collapsed.'),
S('S-C-19',12,'He was ___ in his praise, mentioning every member of the team by name.','generous','sparing','reluctant','vague','Naming everyone is the definition of unstinting praise.'),
S('S-C-20',12,'The instructions were deliberately ___, leaving each team free to solve the problem its own way.','open-ended','rigid','detailed','mandatory','"Leaving each team free" defines the blank \u2014 and "deliberately" tells you it was a choice.'),
S('S-C-21',12,'Once a ___ port, the town now sees perhaps one cargo ship a year.','bustling','forgotten','modest','quiet','"Once" plus "now" signals a reversal \u2014 the blank must contrast with near-emptiness.'),
S('S-C-22',12,'The witness\'s account was ___, changing in three important details between the first and second interviews.','inconsistent','thorough','credible','rehearsed','Changing details is the definition given after the comma.'),
// L13
S('S-C-23',13,'The senator\'s argument was ___: it relied on a single statistic that later proved to be outdated.','tenuous','persuasive','lengthy','controversial','The colon means the second half defines the blank. One outdated statistic = weakly supported.'),
S('S-C-24',13,'Far from being ___, the policy actually widened the very gap it was designed to close.','remedial','harmful','ambitious','expensive','"Far from" reverses the blank \u2014 the policy did the opposite of what the blank claims.'),
S('S-C-25',13,'Her prose is admirably ___, conveying in a single clause what others require a paragraph to say.','economical','ornate','ambiguous','exhaustive','The comparison defines it: saying more with fewer words.'),
S('S-C-26',13,'The evidence, though ___, was enough to justify reopening the investigation.','circumstantial','conclusive','fabricated','overwhelming','"Though" signals concession \u2014 the evidence must be weak-but-sufficient, not strong.'),
S('S-C-27',13,'Critics called the reforms ___, noting that they addressed symptoms while leaving the underlying structure untouched.','superficial','radical','comprehensive','overdue','The second half defines the word: surface-level, not structural.'),
S('S-C-28',13,'The two accounts are not contradictory but ___ \u2014 each supplies detail the other leaves out.','complementary','identical','redundant','conflicting','"Not contradictory but" sets up a contrast, and the dash then defines it: they fill each other\'s gaps.'),
S('S-C-29',13,'His optimism proved ___; the conditions he dismissed as temporary persisted for another decade.','unfounded','prescient','justified','contagious','The second half disproves his view \u2014 so the blank must mean he was wrong.'),
S('S-C-30',13,'The manuscript was ___, with whole chapters missing and several pages out of order.','fragmentary','pristine','annotated','lengthy','Missing chapters and disordered pages define an incomplete, broken-up text.'),
S('S-C-31',13,'Rather than ___ the dispute, the mediator\'s intervention hardened both sides\' positions.','resolving','inflaming','prolonging','ignoring','"Rather than" reverses it \u2014 the blank is what was intended, and the opposite happened.'),
S('S-C-32',13,'The species is remarkably ___, surviving in habitats ranging from arctic tundra to equatorial swamp.','adaptable','specialized','endangered','sedentary','The range of habitats defines the trait. "Specialized" is precisely the opposite.'),
S('S-C-33',13,'Although the theory was initially ___, decades of subsequent data have made it the accepted explanation.','dismissed','embraced','confirmed','popular','"Although" plus "subsequent acceptance" means the early reception must have been negative.'),
];

// shuffle options deterministically per item, record correct index
let s = 987654321;
const r = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
ITEMS.forEach(it => {
  const correct = it._o[0];
  const arr = it._o.slice();
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1));[arr[i], arr[j]] = [arr[j], arr[i]]; }
  it.opts = arr;
  it.ans = arr.indexOf(correct);
  delete it._o;
});

module.exports = ITEMS;
