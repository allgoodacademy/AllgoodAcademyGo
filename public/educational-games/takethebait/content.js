/* Take the Bait: content bank.
   This is the approved learning design, copied exactly. Edit the words here and
   nowhere else; game.js and index.html only read it.
   ok() = a real message; bait() = a scam message using technique k, with the
   "behind it" line c and Jodi's line j. LEVELS[4].gates is null on purpose: the
   Mix level is drawn at play time (see buildPairs in game.js). */
const TECH={
rush:{name:"The Rush",def:"Makes you act before you think.",ex:"“Only 5 minutes left!”"},
toogood:{name:"Too Good",def:"Offers something that doesn’t exist.",ex:"“10,000 free Brix”"},
disguise:{name:"The Disguise",def:"Pretends to be someone you trust.",ex:"“Support” in your DMs, or a friend’s hacked account"},
login:{name:"The Login Trap",def:"Gets you to sign in on a fake page.",ex:"brickverse-gifts.co instead of brickverse.com"},
secret:{name:"The Secret",def:"Tells you not to tell anyone.",ex:"“Don’t tell your parents we talk”"},
feelings:{name:"Big Feelings",def:"Makes you furious or scared so you share fast.",ex:"“SHOCKING! Share before they delete it!”"},
crowd:{name:"The Crowd",def:"Fakes popularity to look trustworthy.",ex:"“2M players already got theirs”"},
ask:{name:"The Ask",def:"Asks for info it shouldn’t need.",ex:"“Send me the 6-digit code you just got”"}};
const OPEN=["Mm, let’s sit with that a second.","Now hold on — let’s look at that one together.","Looked good, didn’t it? That’s the whole trick.","Come here a second — look what that gate did."];
const ok=(f,t,c)=>({f,t,r:true,c:c||"Nothing hidden here. No link, no ask."});
const bait=(f,t,k,c,j)=>({f,t,r:false,k,c,j});
const LEVELS=[
{name:"The Lobby",speed:6,mobs:1,moving:false,gates:[
[bait("@Brickverse_Rewards","You won 10,000 Brix! Claim: brickverse-gifts.co","toogood","Account made 3 days ago. The link isn’t brickverse.com.","Free currency generators don’t exist. Not one. Real rewards show up inside the game, not in a DM link."),ok("Brickverse","Your Dragon Hat sold for 40 Brix.","Inside the official app. Nothing to click.")],
[bait("Maya (friend)","omg vote for my avatar!! brickvote.net/maya","disguise","Maya’s account sent this same link to 40 people in 2 minutes.","Maya doesn’t talk like that. When a friend suddenly sends a link, check with them some other way."),ok("Maya (friend)","u on tonight? same server as yesterday","Normal Maya. No link, no ask.")],
[ok("Dropzone Item Shop","Winter bundle 40% off this week","Inside the official game store."),bait("xX_TradeKing_Xx","trade u my rare skin, just send ur login first","ask","No real trade ever needs your password.","Nobody real needs your password. Not for a trade, not for anything.")],
[bait("Brickverse Support","Account DELETED in 10 min unless you verify now","rush","Sent from a regular player account, not the app. Real support never counts down.","When it’s screaming at you to hurry, that’s the moment to slow down."),bait("@FreeBrixDaily","2M players already got free Brix. Your turn!","crowd","Followers were bought last week. The 2M is made up.","Lots of people doing it doesn’t make it real. Big numbers are easy to fake.")],
[ok("Coach Rivera","Practice moved to 4:30 tomorrow","Same team group chat as always."),ok("Brickverse","New login from your phone. Was this you?","Shows up inside the official app. Just Yes or No, no link.")]]},
{name:"The Feed",speed:6.4,mobs:2,moving:false,gates:[
[bait("@pixa_giveaways","Free headphones! Just pay $2.99 shipping","toogood","Account made last month. The “shipping fee” asks for a card number.","“Free, just pay shipping” is how they get the card number. The headphones never come."),ok("Riverside Library","Free comic swap Saturday 10am","Verified library account since 2019.")],
[bait("DailyBuzz · Sponsored","Doctors HATE this energy drink!","disguise","“Sponsored” means someone paid for this. It’s an ad.","“Sponsored” means someone paid for it. That’s an ad wearing a news costume."),ok("City News 4","Snow day: schools closed Friday","Same story is on the school district’s site.")],
[bait("@totally_real_news","SHOCKING! They’re deleting this. SHARE NOW","feelings","No other news source has it. Account is 2 weeks old.","If it makes you furious fast, slow down. That feeling is the hook."),ok("Your cousin Jay","made the varsity team!!","Jay’s real account. Just good news.")],
[bait("@MrBigDeal_gives","I’m giving $500 to the first 100 who DM me","disguise","The real creator has 30M followers. This copycat has 900.","Copycat accounts borrow a famous name and a profile pic. Check the follower count and the handle."),bait("Snack Quiz","Which snack are you? Enter your school + birthday","ask","Your school and birthday are answers to security questions.","Fun quizzes can be fishing. Your school and birthday unlock other accounts.")],
[ok("Pixa","Your post got 12 likes","A normal notification inside the app."),ok("Ms. Okafor (science)","Lab report due Monday. Rubric is on the class page.","Posted on the school’s class page.")]]},
{name:"The Group Chat",speed:6.8,mobs:3,moving:true,gates:[
[bait("Unknown number","is this u in this video?? lol [link]","feelings","Unknown sender. The link goes to a fake login page.","“Is this you?” is built to make you panic-click. Unknown sender plus a link means don’t."),ok("Lunch Crew (group)","who’s bringing chips friday","Your usual group chat.")],
[bait("Jordan","hey i sent u a code by accident, can u send it back?","ask","That code logs into YOUR account. Jordan’s account was taken over.","A login code is a key to your account. Nobody gets it, not even a friend."),ok("Jordan","did u finish the math hw? stuck on #4","Normal Jordan.")],
[bait("New friend from a game","don’t tell ur parents we talk, they won’t get it","secret","Met 4 days ago. Asks lots of personal questions.","Anybody who asks you to keep them a secret from the grown-ups who love you — that’s your cue to tell one of them."),ok("Aunt Dee","Happy early birthday!! card is in the mail","Aunt Dee’s number you already have.")],
[bait("Chain message","Forward to 10 people or your account gets banned","rush","No app bans you for not forwarding. Ever.","Threats plus a deadline is pressure, not a rule. Nobody bans you for not forwarding."),bait("Class of 2031 (group)","Everyone’s using this free grade-checker app!","crowd","The app asks for your school login.","Everyone using it doesn’t make it safe. Never put your school login into a random app.")],
[ok("School district","Early dismissal Wednesday at 1pm","Same message is on the district website."),ok("Mom","running late, grab a ride w Sam’s mom","Mom’s real number.")]]},
{name:"The Shop",speed:7.2,mobs:3,moving:true,gates:[
[bait("QuickShip (text)","Package on hold. Pay $1.99: quikship-redelivery.co","login","QuickShip never texts payment links. And “quikship” is misspelled.","Delivery companies don’t text you payment links. Check the app or the real site yourself."),ok("QuickShip app","Your package arrives Thursday","Inside the official app.")],
[bait("Ad on Clip","Wireless earbuds 90% off: $8! Today only","toogood","Store opened 6 days ago. No returns, no real address.","When the price is unbelievable, believe that. Brand-new stores with no address are a red flag."),ok("MegaMart app","Holiday sale: games 20% off","The store’s official app.")],
[bait("“Grandpa” (new number)","It’s me, lost my phone. Can u buy me gift cards?","disguise","Call Grandpa’s real number. Gift cards are how scammers get paid.","A new number plus a gift card request is a disguise. Call the real person on the number you already have."),ok("Grandpa","Can’t wait to see u for the holidays","Grandpa’s number you already have.")],
[bait("Brickverse Holiday","Secret Santa: send 500 Brix, get 5,000 back!","toogood","Brickverse has no trading event. This is a player account.","Send a little, get a lot back? That’s the oldest trick there is."),bait("Prize Center","You’re our 1,000,000th visitor! Enter card to claim","ask","Pop-up on a random site. Nobody is counting visitors.","Prizes don’t need your card number. That’s the whole scam.")],
[ok("Corner Bookstore","Your order is ready for pickup","Matches the order you actually placed."),ok("Brickverse","Winter event starts Friday!","Official announcement inside the game.")]]},
{name:"The Mix",speed:7.6,mobs:4,moving:true,gates:null}];
const EXTRA=[
[bait("@news_now_24","PHOTO: Shark swimming down Main St after storm","feelings","AI-made image. No local news or weather service reports it.","AI can make a picture of anything. If it’s wild and nobody real is reporting it, it probably didn’t happen."),ok("Weather Service","Flood watch until 8pm tonight","Official weather service account.")],
[bait("“Your favorite streamer”","Voice msg: DM me your login for a shoutout!","disguise","AI can copy voices. Real creators never need your login.","AI can copy a voice now. A real creator will never need your login."),ok("Streamer’s channel","Live at 7 tonight!","Their real channel.")]];
const SPEED=[
[{f:"Brickverse",t:"Brix are only sold in the official store.",r:true,why:"Official, no link, no ask."},{f:"@brix_generator",t:"Unlimited Brix! Enter username + password",r:false,k:"login",why:"No generator exists, and it wants your password."},{f:"Teammate",t:"gg! rematch tomorrow?",r:true,why:"Just a friend being a friend."}],
[{f:"@FreeSneakersDrop",t:"Tag 3 friends + pay shipping to win",r:false,k:"toogood",why:"“Free, just pay shipping” again."},{f:"School newspaper",t:"Winter concert photos are up",r:true,why:"Your school’s real account."},{f:"Trending · Sponsored",t:"Scientists shocked by this one trick",r:false,k:"disguise",why:"Sponsored means it’s a paid ad."}],
[{f:"Riley",t:"can u send me the 6-digit code u just got",r:false,k:"ask",why:"That code unlocks your account."},{f:"Riley",t:"bus is late again ugh",r:true,why:"Normal Riley."},{f:"Unknown",t:"we need to talk. don’t tell anyone. reply fast",r:false,k:"secret",why:"Secrecy plus speed from a stranger."}],
[{f:"Bank alert",t:"Unusual login. Confirm here: firstharbor-secure.net",r:false,k:"login",why:"Banks don’t text login links."},{f:"QuickShip app",t:"Delivered to front door",r:true,why:"Official app, nothing to click."},{f:"MegaMart",t:"Your gift card balance: $15",r:true,why:"Inside the store’s app, no ask."}],
[{f:"@celeb.crypto",t:"Double your money in 24 hours, guaranteed",r:false,k:"toogood",why:"Nothing doubles in a day."},{f:"Riverside Library",t:"Your book is due Friday",r:true,why:"A normal reminder."},{f:"Coach Rivera",t:"Final game Sat 9am. Bring water!",r:true,why:"Same team chat as always."}]];

export {TECH,OPEN,LEVELS,EXTRA,SPEED};
