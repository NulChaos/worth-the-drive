/* ================= Worth the Drive · app core ================= */
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const store={get(k,d){try{const v=localStorage.getItem("wtd_"+k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem("wtd_"+k,JSON.stringify(v))}catch(e){}}};
let DATA=[];
const ORIGINS=[
  {k:"me",n:"My location",lat:null,lng:null},
  {k:"sw",n:"Southwest · Durango & Blue Diamond",lat:36.0395,lng:-115.2790},
  {k:"durango",n:"Durango Casino",lat:36.0629,lng:-115.2818},
  {k:"chinatown",n:"Chinatown · Spring Mtn",lat:36.1260,lng:-115.1980},
  {k:"strip",n:"Center Strip",lat:36.1147,lng:-115.1728},
  {k:"summerlin",n:"Summerlin · Rampart",lat:36.1720,lng:-115.2870},
  {k:"henderson",n:"Henderson · Green Valley",lat:36.0360,lng:-115.0830},
  {k:"downtown",n:"Downtown · Fremont St",lat:36.1700,lng:-115.1420},
  {k:"nlv",n:"North Las Vegas · Craig Rd",lat:36.2390,lng:-115.1500}];
function origin(){const o=ORIGINS.find(x=>x.k===st.origin)||ORIGINS[1];if(o.k==="me"&&o.lat==null)return Object.assign({},ORIGINS[1],{k:"me",n:"My location (finding you…)"});return o}
const CATS=[["Mexican",/mexican|taco|birria|oaxacan|jalisco|sinaloan|carnitas/i],["Japanese",/japanese|ramen|sushi|izakaya|katsu|sando|yakitori|teppanyaki/i],
  ["Chinese",/chinese|dumpling|dim sum|cantonese|sichuan|taiwanese/i],["Korean",/korean/i],["Thai",/thai/i],["Vietnamese",/vietnam/i],
  ["Filipino & Hawaiian",/filipino|hawaiian|poke/i],["Indian",/indian/i],["Mediterranean & Greek",/mediterranean|greek|turkish|lebanese|bulgarian/i],
  ["Latin & Peruvian",/peruvian|salvadoran|latin/i],["Italian",/italian/i],["Steak & Seafood",/steak|seafood|cajun|oyster/i],
  ["BBQ & Soul",/(^|· )BBQ|soul|southern/i],["Chicken",/chicken/i],["Burgers & Pizza",/burger|pizza|hot dog|wings/i],
  ["Breakfast & Brunch",/breakfast|brunch|diner/i],["Coffee & Dessert",/coffee|café|cafe|bakery|dessert/i],["Vegan",/vegan/i],
  ["Buffets & Food halls",/buffet|food hall|AYCE/i],["Bars & Pubs",/pub|bar\b|tavern|gastropub|lounge|cantina/i]];
const PICK_CUISINES=CATS.map(c=>c[0]).filter(c=>!/Buffets|Bars/.test(c));
const HUE={Mexican:18,Japanese:350,Chinese:5,Korean:330,Thai:150,Vietnamese:120,"Filipino & Hawaiian":40,Indian:30,"Mediterranean & Greek":200,"Latin & Peruvian":45,Italian:140,"Steak & Seafood":210,"BBQ & Soul":15,Chicken:38,"Burgers & Pizza":28,"Breakfast & Brunch":48,"Coffee & Dessert":25,Vegan:110,"Buffets & Food halls":260,"Bars & Pubs":280};
const LOW={1:10,2:20,3:30,4:50},BAND={1:"$10–20",2:"$20–30",3:"$30–50",4:"$50+"};
const lowOf=p=>p.bmin!=null?p.bmin:(LOW[p.pr]??20);
const budgetTxt=p=>p.bmin!=null?`$${p.bmin}${p.bmax!=null?"–"+p.bmax:"+"}/person`:`${BAND[p.pr]||"$20–30"}/person${p.pe?" (est.)":""}`;
const price=p=>p==null?"":"$".repeat(p);
const PRIOR=4.4,M=100,ROAD=1.25;
function reindex(){DATA.forEach((p,i)=>{p.i=i;p.cats=CATS.filter(([,re])=>re.test(p.c)).map(([n])=>n);p.adj=(p.v/(p.v+M))*p.r+(M/(p.v+M))*PRIOR})}

/* ---------- Service: drive-thru, takeout, dine-in ---------- */
const NO_TAKEOUT=/buffet|AYCE|all-you-can-eat|korean bbq|japanese bbq|yakiniku|shabu|hot pot|steakhouse|fine dining|lounge|speakeasy|\bpub\b|tavern|sports bar|izakaya|oyster bar/i;
const takeoutOf=p=>p.takeout===true?2:p.takeout===false?0:p.m==="counter"?2:NO_TAKEOUT.test(p.c)?0:1;   // 2 yes, 1 likely, 0 unlikely
const dineOf=p=>p.dineIn===true||p.m==="sit"?2:p.dineIn===false?0:1;                                   // counter spots usually have a few tables
const SVC=[["any","Any way"],["dt","Drive-thru"],["takeout","Takeout"],["dine","Dine in"]];
const SVCICON={any:'<path d="M4 7h16M4 12h16M4 17h16"/>',dt:'<path d="M5 17h14M6 17l1.5-6h9L18 17M8 11l1-3h6l1 3"/><circle cx="8" cy="18" r="1.5"/><circle cx="16" cy="18" r="1.5"/>',
  takeout:'<path d="M5 8h14l-1.5 12h-11zM9 8V6a3 3 0 0 1 6 0v2"/>',dine:'<path d="M7 3v7a2 2 0 0 0 4 0V3M9 10v11M17 3c-2 0-3 2-3 5s1 4 3 4v9"/>'};
const svcOk=(p,s)=>s==="any"||(s==="dt"&&p.dt>0)||(s==="takeout"&&takeoutOf(p)>0)||(s==="dine"&&dineOf(p)>0);
function badges(p){const b=[];if(p.dt===2)b.push(["dt","Drive-thru"]);else if(p.dt===1)b.push(["dt","Drive-thru likely"]);
  const t=takeoutOf(p);if(t===2)b.push(["takeout","Takeout"]);else if(t===1)b.push(["takeout","Takeout likely"]);
  if(p.m==="sit"||p.dineIn===true)b.push(["dine","Dine in"]);
  return `<div class="badges">${p.live?`<span class="bdg live">${p.isNew?"New · Live":"Live"}</span>`:""}${b.map(([k,t])=>`<span class="bdg"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SVCICON[k]}</svg>${t}</span>`).join("")}</div>`}
const openPill=p=>{const i=p.oi||openInfo(p);return `<span class="pill ${i.s==null?"unk":i.s==="soon"?"soon":i.s==="open"?"open":"closed"}">${esc(i.t)}</span>`};
const svcPills=p=>(p.live?`<span class="pill live">${p.isNew?"New · Live":"Live"}</span>`:"")+(p.dt>0?'<span class="pill svc">Drive-thru</span>':"")+(takeoutOf(p)===2?'<span class="pill svc">Takeout</span>':"")+(p.m==="sit"?'<span class="pill svc">Dine in</span>':"");
const statusHTML=o=>`<span class="status st-${o.s??"null"}"><i></i>${esc(o.t)}</span>`;
const mapsUrl=p=>p.gurl||`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.n+" "+p.a)}&query_place_id=${p.id}`;
const IOS=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
const dirUrl=p=>IOS?`https://maps.apple.com/?daddr=${p.lat},${p.lng}&q=${encodeURIComponent(p.n)}`:`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(p.n+" "+p.a)}&destination_place_id=${p.id}`;
const cityOf=p=>(p.a.split(",").slice(-2,-1)[0]||"Las Vegas").trim();
const menuUrl=p=>`https://www.google.com/search?q=${encodeURIComponent(p.n+" "+cityOf(p)+" menu")}`;
/*@@HOURS@@*/

/* ---------- Profile ---------- */
const DEFPROF={done:false,start:"me",everyday:6,special:20,budget:40,loves:[],never:[],diet:[],dtLike:false,hideBeen:false,svc:"any"};
let PROF=Object.assign({},DEFPROF,store.get("profile",{}));
let FB=store.get("fb",{}),HIST=store.get("hist",[]),CATW={};
const saveProf=()=>store.set("profile",PROF);
const mpt=d=>0.15*Math.pow(80,d/100);
const dialFromMiles=mi=>{const k=Math.max(.15,Math.min(12,mi/10));return Math.max(0,Math.min(100,Math.round(100*Math.log(k/.15)/Math.log(80))))};
function catWeights(){const w={};for(const id in FB){const f=FB[id],s=f.v==="love"?.6:f.v==="nope"?-.6:0;(f.c||[]).forEach(c=>w[c]=(w[c]||0)+s)}for(const c in w)w[c]=Math.max(-2,Math.min(2,w[c]));return w}

/* ---------- Feelings: stackable, change on the fly ---------- */
const FI=d=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const FEELS=[
 {k:"starving",n:"Starving",i:'<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',mul:.55,open:true,why:"Fast to get to",boost:p=>(p.m==="counter"?.8:0)},
 {k:"lazy",n:"Lazy",i:'<path d="M3 18h18M5 18v-5a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v5M8 9V6h8v3"/>',mul:.45,why:"Low effort",boost:p=>(p.dt>0?2:0)+(takeoutOf(p)===2?1:0)},
 {k:"cheap",n:"Cheap eats",i:'<path d="M12 3v18M17 7.5C17 5.6 14.8 5 12 5s-5 .9-5 3 2.2 2.8 5 3.4 5 1.4 5 3.6-2.2 3-5 3-5-.8-5-2.6"/>',budget:15,why:"Easy on the wallet",boost:p=>lowOf(p)<=10?1:0},
 {k:"fancy",n:"Fancy",i:'<path d="M8 3h8l-1 7a3 3 0 0 1-6 0zM12 13v7M8 21h8"/>',mul:1.8,minr:100,why:"A nicer sit-down spot",boost:p=>(p.m==="sit"?1.5:-4)+((p.pr||2)>=3?1.5:0)+(p.adj>=4.6?1:0)},
 {k:"adventurous",n:"Adventurous",i:'<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',mul:1.3,why:"Something new for you",boost:p=>(FB[p.id]?-2:1)+(p.cats.some(c=>PROF.loves.includes(c))?-1:1)},
 {k:"comfort",n:"Comfort food",i:'<path d="M4 11h16a8 8 0 0 1-16 0zM8 7c0-1 1-1 1-2M12 7c0-1 1-1 1-2M16 7c0-1 1-1 1-2"/>',why:"Comfort pick",boost:p=>(p.cats.some(c=>PROF.loves.includes(c))?1.5:0)+(FB[p.id]?.v==="love"?2:0)+(/burger|pizza|bbq|soul|southern|chicken|diner|breakfast|ramen|pho|mexican|taco|italian/i.test(p.c)?1.2:0)},
 {k:"healthy",n:"Healthy-ish",i:'<path d="M12 21c-5 0-8-4-8-9 4 0 7 2 8 5 1-3 4-5 8-5 0 5-3 9-8 9zM12 17V8M9 5c1-1 2-2 3-2 1 0 2 1 3 2"/>',why:"Lighter option",boost:p=>/mediterranean|greek|vietnam|poke|vegan|vegetarian|salad|sushi|thai|halal/i.test(p.c+" "+p.s)?2:(/burger|pizza|fried|bbq|buffet|chicken|hot dog|dessert|donut/i.test(p.c)?-2:0)},
 {k:"friends",n:"With friends",i:'<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20a6 6 0 0 1 12 0M14 20a4.5 4.5 0 0 1 8 0"/>',why:"Good for a group",boost:p=>/AYCE|korean bbq|bbq|food hall|pizza|cantina|hot pot|buffet|seafood boil|izakaya|tacos/i.test(p.c+" "+p.s)?2:(p.m==="counter"?-.5:0)},
 {k:"late",n:"Late night",i:'<path d="M20 15A8 8 0 1 1 9 4a6.5 6.5 0 0 0 11 11z"/>',open:true,late:true,why:"Open late"}];
const MEAL={breakfast:{n:"Breakfast time",b:p=>p.cats.includes("Breakfast & Brunch")?2.5:p.cats.includes("Coffee & Dessert")?1:/steak|bar|pub|izakaya|buffet/i.test(p.c)?-2:0},
  lunch:{n:"Lunch time",b:p=>p.m==="counter"?.6:0},dinner:{n:"Dinner time",b:p=>p.cats.includes("Coffee & Dessert")?-1.5:0},late:{n:"Late night",b:()=>0}};
function mealNow(){const {min}=vegasNow();return min>=300&&min<630?"breakfast":min>=630&&min<900?"lunch":min>=900&&min<1290?"dinner":"late"}
const isLate=p=>p.oi&&p.oi.s!=="closed"&&(p.oi.t==="Open 24 hours"||(p.oi.end!=null&&(p.oi.end>=23*60||p.oi.end<5*60)));

// Session vibe (kept for 3 hours so reopening the app keeps how you felt)
const VIBE0=()=>({feels:[],svc:PROF.svc||"any",budget:null,maxd:null,open:true,avoid:[],t:Date.now()});
let VIBE=(()=>{const v=store.get("vibe",null);return v&&Date.now()-v.t<3*3600e3?Object.assign(VIBE0(),v):VIBE0()})();
const saveVibe=()=>{VIBE.t=Date.now();store.set("vibe",VIBE)};
let st={origin:store.get("origin",PROF.start||"me"),dial:40,dialTouched:false,q:"",qIds:new Set(),cats:new Set(),shown:8,view:"list",checked:new Date(),maxd:20};
function derive(){const fs=FEELS.filter(f=>VIBE.feels.includes(f.k));const mul=fs.reduce((a,f)=>a*(f.mul||1),1);
  if(!st.dialTouched)st.dial=dialFromMiles(PROF.everyday*mul);
  st.maxd=VIBE.maxd??Math.round(Math.max(8,PROF.special*Math.max(1,mul)));
  st.open=VIBE.open||fs.some(f=>f.open);st.late=fs.some(f=>f.late)||mealNow()==="late"&&VIBE.feels.includes("late");
  st.budget=VIBE.budget??(fs.find(f=>f.budget)?.budget??null);st.minr=Math.max(0,...fs.map(f=>f.minr||0));return fs}

/* ---------- Scoring (1 point = 0.1 trust-adjusted star) ---------- */
function compute(){const o=origin(),k=mpt(st.dial),fs=derive(),meal=MEAL[mealNow()];
  DATA.forEach(p=>{p.d=hav(o.lat,o.lng,p.lat,p.lng)*ROAD;p.isOpen=openState(p);
    const parts={rating:p.adj*10-40,dist:-p.d/k,taste:0,mood:0,fit:0},why=[];
    const fav=p.cats.find(c=>PROF.loves.includes(c));if(fav){parts.taste+=3;why.push({t:`One of your favorites: ${fav}`,w:3})}
    let cw=0;p.cats.forEach(c=>cw+=CATW[c]||0);parts.taste+=cw;if(cw>.5&&!fav)why.push({t:`You've liked ${p.cats[0]} lately`,w:2.4});
    const f=FB[p.id];if(f&&f.v==="love"){parts.taste+=3;why.push({t:"You loved it",w:4})}
    if((PROF.diet||[]).some(d=>d==="vegan"||d==="vegetarian")&&/vegan|vegetarian/i.test(p.c+" "+p.s+" "+p.o)){parts.taste+=2;why.push({t:"Plant-based friendly",w:2.6})}
    if((PROF.diet||[]).includes("halal")&&/halal/i.test(p.n+" "+p.c+" "+p.s)){parts.taste+=2;why.push({t:"Halal",w:2.6})}
    if((PROF.diet||[]).includes("gf")&&/gluten/i.test(p.s+" "+p.o+" "+p.w)){parts.taste+=1.5;why.push({t:"Gluten-free options",w:2.2})}
    parts.mood+=meal.b(p);
    fs.forEach(fl=>{if(!fl.boost)return;const b=fl.boost(p);parts.mood+=b;if(b>=1)why.push({t:fl.why,w:1.9})});
    if(PROF.dtLike&&p.dt>0&&VIBE.svc==="any"){parts.fit+=.8}
    const bud=st.budget??PROF.budget;if(bud<999){const over=lowOf(p)-bud;if(over>0){parts.fit-=over/5;if(!st.budget)why.push({t:`A bit over your usual budget (${budgetTxt(p).replace("/person","")})`,w:1.5,caution:1})}}
    if(p.oi&&p.oi.s==="soon"&&p.oi.left<=30)parts.fit-=1.5;
    if(p.v<120)why.push({t:`Only ${p.v} reviews, so the rating may still move`,w:1.1,caution:1});
    p.parts=parts;p.why=why;p.score=40+parts.rating+parts.dist+parts.taste+parts.mood+parts.fit});return k}
const qMatch=p=>!st.q||st.qIds.has(p.id)||(p.n+" "+p.c+" "+p.a).toLowerCase().includes(st.q.toLowerCase());
function visible(){return DATA.filter(p=>{if(p.closed||!qMatch(p))return false;const f=FB[p.id];if(f&&f.v==="nope")return false;if(f&&f.v==="been"&&PROF.hideBeen&&!st.q)return false;
  if(p.cats.length&&p.cats.every(c=>PROF.never.includes(c)||VIBE.avoid.includes(c)))return false;
  if(st.cats.size&&!p.cats.some(c=>st.cats.has(c)))return false;
  const inQ=st.q&&st.qIds.has(p.id);if(!inQ&&p.d>st.maxd)return false;if(p.v<st.minr)return false;
  if(!svcOk(p,VIBE.svc))return false;if(st.open&&p.oi&&p.oi.s==="closed")return false;if(st.late&&!isLate(p))return false;
  if(st.budget&&lowOf(p)>st.budget)return false;return true}).sort((a,b)=>b.score-a.score)}
const filtered=visible;
const sorted=arr=>arr.slice().sort((a,b)=>b.score-a.score);
function worthLine(p,vis){const c=p.cats[0];if(!c)return"";const same=vis.filter(q=>q.cats[0]===c);if(same.length<2)return"";const near=same.reduce((a,b)=>b.d<a.d?b:a);
  if(near===p)return`Closest ${c} spot`;const extra=p.d-near.d;return extra>.3&&p.score>near.score?`Worth ${extra.toFixed(1)} extra mi over ${near.n.replace(/\s*\(.*\)$/,"").replace(/\s*[-–|].*$/,"")}`:""}
function reasons(p,vis){const r=(p.why||[]).slice();const w=worthLine(p,vis);if(w)r.push({t:w,w:2.6,worth:1});
  r.push({t:p.v>=300?`${p.r.toFixed(1)}★ from ${p.v.toLocaleString()} reviews`:`${p.r.toFixed(1)}★`,w:p.r>=4.7?2:1.2});
  r.push({t:p.d<1?"Under a mile away":`${p.d.toFixed(1)} mi away`,w:p.d<2?1.6:.8});return r.sort((a,b)=>b.w-a.w)}
const matchPct=(p,best)=>Math.round(60+39*Math.exp(-Math.max(0,best-p.score)/5));
const cover=(p,cls="")=>{const c=p.cats[0]||"",h=HUE[c]??160,ph=PHOTOS[p.id]?.list?.[0]?.uri;
  return `<div class="cover ${cls}" style="background:linear-gradient(135deg,hsl(${h} 55% 38%),hsl(${(h+28)%360} 60% 24%))">${ph?`<img src="${esc(ph)}" alt="" onerror="this.remove()">`:""}<span class="cu">${esc(p.c.split(" · ")[0])}</span>${ph?"":`<span class="big" aria-hidden="true">${esc((c||p.c).slice(0,2))}</span>`}</div>`};
const fbRow=p=>{const v=FB[p.id]?.v;return `<div class="fb" role="group" aria-label="Your feedback"><button class="fbb" data-fb="love" data-id="${p.i}" aria-pressed="${v==="love"}">♥ Loved it</button><button class="fbb" data-fb="nope" data-id="${p.i}" aria-pressed="${v==="nope"}">Not for me</button><button class="fbb" data-fb="been" data-id="${p.i}" aria-pressed="${v==="been"}">✓ Been there</button></div>`};

/* ---------- Render ---------- */
function greeting(){const {min}=vegasNow();return min<240?"Late-night cravings?":min<660?"Good morning":min<1020?"Good afternoon":min<1290?"Good evening":"Late-night cravings?"}
function renderVibe(){
  $("#feels").innerHTML=FEELS.map(f=>`<button class="feel" data-feel="${f.k}" aria-pressed="${VIBE.feels.includes(f.k)}">${FI(f.i)}${f.n}</button>`).join("");
  $("#svcseg").innerHTML=SVC.map(([k,n])=>`<button data-svc="${k}" aria-pressed="${VIBE.svc===k}">${FI(SVCICON[k])}${n}</button>`).join("")}
function summaryText(n){const bits=[`${n} place${n===1?"":"s"}`];if(st.open)bits.push(st.late?"open late":"open now");bits.push(`within ${st.maxd} mi`);
  if(st.budget)bits.push(`about $${st.budget} or less`);if(VIBE.svc!=="any")bits.push(SVC.find(s=>s[0]===VIBE.svc)[1].toLowerCase());
  if(VIBE.avoid.length)bits.push(`no ${VIBE.avoid.join(", ")}`);if(st.cats.size)bits.push([...st.cats].join(" or "));return bits.join(" · ")}
const vibeChanged=()=>VIBE.feels.length||VIBE.svc!==(PROF.svc||"any")||VIBE.budget||VIBE.maxd||!VIBE.open||VIBE.avoid.length||st.cats.size||st.dialTouched;
function render(){const k=compute();const vis=visible(),best=vis[0]?.score??0;
  $("#readout").innerHTML=`Half a star is worth <b>${k*5<10?(k*5).toFixed(1):Math.round(k*5)} mi</b> to me`;$("#dial").value=st.dial;
  $("#greet").textContent=greeting();$("#mealline").textContent=MEAL[mealNow()].n;
  renderVibe();$("#summary").textContent=summaryText(vis.length);$("#resetvibe").hidden=!vibeChanged();
  const h=vis[0];if(h)heroPhoto(h);
  $("#answer").innerHTML=h?`<article class="answer" data-open="${h.i}">${cover(h)}<div class="body">
      <div class="ehead"><span class="eyebrow">${st.q?"Top result":"Your best bet"}</span><span class="match">${matchPct(h,best)}% match</span></div>
      <h2>${esc(h.n)}</h2><div class="sub">${budgetTxt(h)} · ${h.d.toFixed(1)} mi · ${statusHTML(h.oi)}</div>
      ${badges(h)}
      <ul class="whys">${reasons(h,vis).slice(0,4).map(r=>`<li class="${r.worth?"worth":r.caution?"caution":""}">${esc(r.t)}</li>`).join("")}</ul>
      <div class="acts"><a class="btn go" href="${dirUrl(h)}" target="_blank" rel="noopener" data-dir="${h.i}">${FI('<path d="M3 11 21 3l-8 18-2-8-8-2z"/>')}Directions</a><button class="btn" data-open="${h.i}">Hours &amp; menu</button></div>
      ${fbRow(h)}</div></article>`
    :`<div class="empty"><b>Nothing fits right now.</b><span>Try another feeling, switch to “Any way”, or drag the car toward “Food is everything”.</span><button class="btn" id="emptyreset">Reset how I'm feeling</button></div>`;
  if(!h)$("#emptyreset").onclick=resetVibe;
  const rest=vis.slice(1);$("#count").textContent=rest.length?`${rest.length} more`:"";$("#resthead").hidden=!rest.length;
  const before=new Map([...document.querySelectorAll("#rows .row")].map(el=>[el.dataset.id,el.getBoundingClientRect().top]));
  $("#rows").innerHTML=rest.slice(0,st.shown).map((p,n)=>{const w=worthLine(p,vis);return `<li class="row" id="p${p.i}" data-open="${p.i}" data-id="${esc(p.id)}" tabindex="0">
    <span class="n">${n+2}</span><span class="nm">${esc(p.n)}</span><span class="pct">${matchPct(p,best)}%</span>
    <span class="ln"><span>${esc(p.cats[0]||p.c.split(" · ")[0])}</span><span>${p.d.toFixed(1)} mi</span><span class="st-${p.oi.s??"null"}">${esc(p.oi.t.replace("Closes soon · ","Closes "))}</span>${w?`<span class="w">${esc(w.replace(/ over .*/,""))}</span>`:""}${FB[p.id]?.v==="love"?'<span class="w">♥</span>':""}</span>
    ${VIBE.svc==="any"?"":badges(p)}</li>`}).join("");
  if(!reduce)document.querySelectorAll("#rows .row").forEach(el=>{const b=before.get(el.dataset.id);if(b==null)return;const dy=b-el.getBoundingClientRect().top;
    if(Math.abs(dy)>1)el.animate([{transform:`translateY(${dy}px)`},{transform:"none"}],{duration:320,easing:"cubic-bezier(.2,.8,.2,1)"})});
  $("#more").hidden=rest.length<=st.shown;$("#more").textContent=`Show ${Math.min(10,rest.length-st.shown)} more`;
  if(!spinning)buildWheel();updateMap(vis,new Set(vis.slice(0,3).map(p=>p.i)));if(st.view==="profile")renderProfile()}

/* ---------- Vibe controls ---------- */
function toggleFeel(k){const has=VIBE.feels.includes(k);VIBE.feels=has?VIBE.feels.filter(x=>x!==k):VIBE.feels.concat(k);
  if(!has&&k==="fancy")VIBE.feels=VIBE.feels.filter(x=>x!=="cheap"&&x!=="lazy");if(!has&&(k==="cheap"||k==="lazy"))VIBE.feels=VIBE.feels.filter(x=>x!=="fancy");
  if(!has&&k==="lazy"&&VIBE.svc==="dine")VIBE.svc="any";if(!has&&k==="fancy"&&VIBE.svc==="dt")VIBE.svc="any";
  st.dialTouched=false;st.shown=8;saveVibe();render();liveRefresh(false)}
function setSvc(s){VIBE.svc=s;st.shown=8;saveVibe();render()}
function resetVibe(){VIBE=VIBE0();st.cats=new Set();st.dialTouched=false;st.shown=8;saveVibe();render();toast("Back to your usual.")}
function openTune(){const d=$("#tune");const draw=()=>{derive();const vis=(compute(),visible());
  $("#tbody").innerHTML=`<div class="sheetin"><div class="shead"><h2 id="tuneh">Right now I want…</h2><button class="x" data-close aria-label="Close">×</button></div>
    <div class="block"><h4>Budget per person</h4><div class="chipset">${[[null,"My usual"],[15,"Up to $15"],[25,"Up to $25"],[40,"Up to $40"],[60,"Up to $60"]].map(([v,l])=>`<button class="pick" data-bud="${v}" aria-pressed="${VIBE.budget===v}">${l}</button>`).join("")}</div></div>
    <label class="slider">Drive up to <b id="tmaxv">${st.maxd} mi</b><input type="range" id="tmax" min="1" max="45" value="${st.maxd}"></label>
    <label class="toggle"><input type="checkbox" id="topen" ${VIBE.open?"checked":""}> Only places open right now</label>
    <div class="block"><h4>Craving</h4><div class="chipset">${PICK_CUISINES.map(c=>`<button class="pick" data-crave="${esc(c)}" aria-pressed="${st.cats.has(c)}">${esc(c)}</button>`).join("")}</div></div>
    <div class="block"><h4>Not feeling</h4><div class="chipset">${PICK_CUISINES.map(c=>`<button class="pick ${VIBE.avoid.includes(c)?"never":""}" data-avoid="${esc(c)}">${esc(c)}</button>`).join("")}</div></div>
    <div class="snav"><button class="btn" id="treset">Back to my usual</button><button class="btn go" data-close>Show ${vis.length} places</button></div></div>`;
  const tb=$("#tbody");
  tb.querySelectorAll("[data-bud]").forEach(b=>b.onclick=()=>{VIBE.budget=b.dataset.bud==="null"?null:+b.dataset.bud;saveVibe();render();draw()});
  tb.querySelector("#tmax").oninput=e=>{VIBE.maxd=+e.target.value;$("#tmaxv").textContent=VIBE.maxd+" mi";saveVibe();render()};
  tb.querySelector("#tmax").onchange=draw;
  tb.querySelector("#topen").onchange=e=>{VIBE.open=e.target.checked;saveVibe();render();draw()};
  tb.querySelectorAll("[data-crave]").forEach(b=>b.onclick=()=>{const c=b.dataset.crave;st.cats.has(c)?st.cats.delete(c):st.cats.add(c);render();draw()});
  tb.querySelectorAll("[data-avoid]").forEach(b=>b.onclick=()=>{const c=b.dataset.avoid;VIBE.avoid=VIBE.avoid.includes(c)?VIBE.avoid.filter(x=>x!==c):VIBE.avoid.concat(c);saveVibe();render();draw()});
  tb.querySelector("#treset").onclick=()=>{resetVibe();draw()}};
  draw();if(!d.open)d.showModal()}

/* ---------- How it works ---------- */
function howItWorks(){const k=mpt(st.dial),o=origin(),fs=FEELS.filter(f=>VIBE.feels.includes(f.k));
  $("#hbody").innerHTML=`<div class="sheetin"><div class="shead"><h2>How your list works</h2><button class="x" data-close aria-label="Close">×</button></div>
    <p style="margin:0">Every place gets a score and the highest wins. You control the biggest part of it.</p>
    <dl class="kv"><dt>The car</dt><dd>Each extra 0.1★ is worth <b class="mono">${k.toFixed(2)} mi</b> of driving to you right now.</dd>
      <dt>Starting point</dt><dd>${esc(o.n)}. Distances are straight-line × 1.25 to approximate roads.</dd>
      <dt>Ratings</dt><dd>Places with few reviews are pulled toward the area average (4.4★), so a perfect score from 20 people doesn't beat 4.8★ from 2,000.</dd>
      <dt>Your taste</dt><dd>A favorite cuisine counts as +0.3★. Each “Loved it” or “Not for me” nudges similar places.</dd>
      <dt>How you feel</dt><dd>${fs.length?fs.map(f=>f.n).join(", ")+". These shift the car and boost places that fit.":"Nothing picked. Tap a feeling on the home screen to reshape the list."}</dd>
      <dt>${MEAL[mealNow()].n}</dt><dd>The time of day gives a small nudge, like breakfast spots in the morning.</dd>
      <dt>Nudges down</dt><dd>Places closing within 30 minutes, and places over your usual budget. Nothing is paid placement.</dd></dl>
    <button class="btn" data-close>Got it</button></div>`;$("#how").showModal()}

/* ---------- Details ---------- */
const IC={dir:'<path d="M3 11 21 3l-8 18-2-8-8-2z"/>',menu:'<path d="M4 4h16v16H4zM8 9h8M8 13h8M8 17h5"/>',call:'<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  web:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',rev:'<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>'};
function openDetail(i){const p=DATA[i];if(!p)return;compute();const vis=visible(),best=vis[0]?.score??p.score,today=vegasNow().day,rank=vis.indexOf(p);
  const pts=p.parts,neg=-pts.dist,pos=[["rating",pts.rating,"var(--go)"],["taste",pts.taste,"var(--worth)"],["mood",pts.mood,"var(--lane)"],["fit",pts.fit,"var(--gold)"]],tot=Math.max(1,pos.reduce((a,[,v])=>a+Math.max(0,v),0)+neg);
  const seg=(v,c)=>v>0?`<span style="width:${100*v/tot}%;background:${c}"></span>`:"",sg=v=>(v>=0?"+":"")+v.toFixed(1);
  $("#dbody").innerHTML=`${gkey()?`<div class="gallery" id="gallery" data-id="${esc(p.id)}" aria-label="Photos"><figure class="gph"><div class="gsk"></div></figure><figure class="gph"><div class="gsk"></div></figure></div>`:cover(p,"dcover")}
   <div class="sheetin">
    <div class="shead"><div><div class="sub">${esc(p.c)}</div><h2 id="dname">${esc(p.n)}</h2><div class="sub">${budgetTxt(p)} · ${p.d.toFixed(1)} mi · <span class="mono">${p.r.toFixed(1)}★</span> (${p.v.toLocaleString()})</div></div><button class="x" data-close aria-label="Close">×</button></div>
    <div>${statusHTML(p.oi)}</div>${badges(p)}
    <div class="dacts"><a class="dact go" href="${dirUrl(p)}" target="_blank" rel="noopener" data-dir="${p.i}">${FI(IC.dir)}Directions</a><a class="dact" href="${menuUrl(p)}" target="_blank" rel="noopener">${FI(IC.menu)}Menu</a>
      ${p.ph?`<a class="dact" href="tel:${p.ph.replace(/[^\d+]/g,"")}">${FI(IC.call)}Call</a>`:""}${p.web?`<a class="dact" href="${esc(p.web)}" target="_blank" rel="noopener">${FI(IC.web)}Website</a>`:""}
      <a class="dact" href="${mapsUrl(p)}" target="_blank" rel="noopener">${FI(IC.rev)}Reviews</a></div>
    ${fbRow(p)}
    <div class="block"><h4>${rank>=0?`#${rank+1} for you · ${matchPct(p,best)}% match`:"Why it's here"}</h4><ul class="whys">${reasons(p,vis).slice(0,4).map(r=>`<li class="${r.worth?"worth":r.caution?"caution":""}">${esc(r.t)}</li>`).join("")}</ul></div>
    <div class="block"><h4>How the score adds up</h4><div class="bar" role="img" aria-label="Score breakdown">${pos.map(([,v,c])=>seg(v,c)).join("")}${seg(neg,"var(--asphalt)")}</div>
      <div class="legend"><div><span><i style="background:var(--go)"></i>Rating, adjusted for review count</span><span class="mono">${sg(pts.rating)}</span></div>
        <div><span><i style="background:var(--worth)"></i>Your taste</span><span class="mono">${sg(pts.taste)}</span></div>
        <div><span><i style="background:var(--lane)"></i>How you're feeling and time of day</span><span class="mono">${sg(pts.mood)}</span></div>
        <div><span><i style="background:var(--gold)"></i>Budget and closing time</span><span class="mono">${sg(pts.fit)}</span></div>
        <div><span><i style="background:var(--asphalt)"></i>Drive cost (${p.d.toFixed(1)} mi)</span><span class="mono">${pts.dist.toFixed(1)}</span></div></div>
      <p class="note" style="margin-top:6px">Points are tenths of a star. ${p.live?`Updated from Google ${ago(p.live)}.`:"Ratings from Google Maps as of Oct 5, 2026."}</p></div>
    <div class="block"><h4>What people say</h4><p style="margin:0">${esc(p.s)}</p>${p.o?`<p style="margin:6px 0 0"><b>Order:</b> ${esc(p.o)}</p>`:""}${p.w&&p.w!=="None that repeat"?`<p style="margin:4px 0 0"><b>Heads-up:</b> ${esc(p.w)}</p>`:""}</div>
    <div class="block"><h4>Hours</h4>${p.h&&p.h.length===7?`<table class="hours">${p.h.map((x,d)=>`<tr class="${d===today?"today":""}"><td>${DAYNAMES[d]}${d===today?'<span class="tdy">Today</span>':""}</td><td>${esc(dayStr(p,d))}</td></tr>`).join("")}</table>`:"<p class='note'>Not listed.</p>"}<p class="note" style="margin-top:6px">${p.live?"From Google.":"As of Oct 5."} Holiday hours can differ.</p></div>
    <div class="block"><h4>Address</h4><div style="user-select:text">${esc(p.a)}${p.ph?`<br>${esc(p.ph)}`:""}</div></div></div>`;
  const dlg=$("#detail");if(!dlg.open){dlg.showModal();try{history.pushState({wtdSheet:1},"")}catch(e){}}dlg.scrollTop=0;fillGallery(p)}

/* ---------- Feedback, learning, toast ---------- */
let toastT=null;
function toast(msg,undo){const t=$("#toast");t.innerHTML=`<span>${esc(msg)}</span>${undo?'<button id="tundo">Undo</button>':""}`;t.hidden=false;if(undo)$("#tundo").onclick=()=>{undo();t.hidden=true};clearTimeout(toastT);toastT=setTimeout(()=>t.hidden=true,3500)}
function setFeedback(i,v){const p=DATA[i];if(!p)return;const prev=FB[p.id]?{...FB[p.id]}:null;
  if(prev&&prev.v===v)delete FB[p.id];else FB[p.id]={v,t:Date.now(),n:p.n,c:p.cats};
  const after=()=>{store.set("fb",FB);CATW=catWeights();render();if($("#detail").open)openDetail(i)};after();
  const undo=()=>{if(prev)FB[p.id]=prev;else delete FB[p.id];after()};
  toast(!FB[p.id]?"Removed.":v==="love"?"More places like this, coming up.":v==="nope"?"Hidden. Fewer like it from now on.":PROF.hideBeen?"Marked as been there and hidden.":"Marked as been there.",undo)}
function noteTrip(i){const p=DATA[i];if(!p)return;HIST.push({d:+p.d.toFixed(1),t:Date.now()});HIST=HIST.filter(h=>Date.now()-h.t<90*864e5).slice(-20);store.set("hist",HIST);
  if(HIST.length<4)return;const ds=HIST.slice(-8).map(h=>h.d).sort((a,b)=>a-b),med=ds[Math.floor(ds.length/2)],sug=Math.max(1,Math.round(med));
  if(Math.abs(sug-PROF.everyday)<2||store.get("sugAt",0)>Date.now()-7*864e5)return;
  if(med>PROF.everyday*1.4||med<PROF.everyday*.55){store.set("sugAt",Date.now());
    setTimeout(()=>banner(`Your recent trips average about ${sug} mi, but your everyday distance is ${PROF.everyday} mi. Update it?`,`Set to ${sug} mi`,()=>{PROF.everyday=sug;saveProf();render();$("#banner").hidden=true;toast("Everyday distance updated.")}),1200)}}

/* ---------- You ---------- */
function renderProfile(){const o=ORIGINS.find(x=>x.k===PROF.start)||ORIGINS[0],L=v=>Object.entries(FB).filter(([,f])=>f.v===v).sort((a,b)=>b[1].t-a[1].t);
  const learned=Object.entries(CATW).filter(([,w])=>Math.abs(w)>=.5).sort((a,b)=>b[1]-a[1]),trips=HIST.length?(HIST.reduce((a,h)=>a+h.d,0)/HIST.length).toFixed(1):null;
  $("#v-profile").innerHTML=`<div class="hello"><h1>You</h1><div class="from">Your taste profile and what the app has learned.</div></div>
    <div class="panel"><h3>Profile</h3><dl class="kv"><dt>Starts from</dt><dd>${esc(o.n)}</dd><dt>Normal day</dt><dd>up to ${PROF.everyday} mi</dd><dt>Worth a trip</dt><dd>up to ${PROF.special} mi</dd>
      <dt>Budget</dt><dd>${PROF.budget>=999?"Doesn't matter":"About $"+PROF.budget}</dd><dt>Usually</dt><dd>${SVC.find(s=>s[0]===(PROF.svc||"any"))[1]}${PROF.dtLike?", likes drive-thrus":""}</dd>
      <dt>Loves</dt><dd>${PROF.loves.join(", ")||"Nothing yet"}</dd><dt>Never</dt><dd>${PROF.never.join(", ")||"Nothing"}</dd>
      <dt>Diet</dt><dd>${(PROF.diet||[]).map(d=>({vegetarian:"Vegetarian",vegan:"Vegan",halal:"Halal",gf:"Gluten-free"}[d])).join(", ")||"No restrictions"}</dd></dl>
      <div class="btnrow"><button class="btn go" id="editprof">Edit profile</button><button class="btn" id="opensettings">Google key &amp; settings</button></div></div>
    <div class="panel"><h3>What it has learned</h3><p style="margin:0">${learned.length?learned.map(([c,w])=>`${w>0?"More":"Less"} ${esc(c)}`).join(" · "):"Nothing yet. Tap Loved it or Not for me on any place."}</p>
      <p class="note">${trips?`Your last ${HIST.length} trips averaged ${trips} mi.`:"When you tap Directions, the app learns how far you actually drive."}</p>
      <label class="toggle"><input type="checkbox" id="phidebeen" ${PROF.hideBeen?"checked":""}> Hide places I've been</label></div>
    ${[["love","♥ Loved"],["been","✓ Been there"],["nope","Not for me"]].map(([v,t])=>`<div class="panel"><h3>${t} <span class="sub">(${L(v).length})</span></h3>${L(v).length?`<ul class="list">${L(v).map(([id,f])=>{const p=DATA.find(x=>x.id===id);return `<li>${p?`<button class="linkish" data-open="${p.i}">${esc(f.n)}</button>`:esc(f.n)}<button class="fbb" data-unfb="${esc(id)}">Remove</button></li>`}).join("")}</ul>`:'<p class="note">Nothing here yet.</p>'}</div>`).join("")}
    <div class="panel"><h3>Your data</h3><p style="margin:0">Your profile and feedback stay on this phone. There's no account.</p><div class="btnrow"><button class="btn" id="resetall">Erase and start over</button></div></div>`;
  $("#editprof").onclick=openOnboarding;$("#opensettings").onclick=openSettings;
  $("#phidebeen").onchange=e=>{PROF.hideBeen=e.target.checked;saveProf();render()};
  $("#v-profile").querySelectorAll("[data-unfb]").forEach(b=>b.onclick=()=>{delete FB[b.dataset.unfb];store.set("fb",FB);CATW=catWeights();render()});
  const rb=$("#resetall");rb.onclick=()=>{if(rb.dataset.arm){["profile","fb","hist","sugAt","vibe"].forEach(k=>store.set(k,null));PROF=Object.assign({},DEFPROF);FB={};HIST=[];CATW={};VIBE=VIBE0();openOnboarding()}
    else{rb.dataset.arm=1;rb.textContent="Tap again to erase";setTimeout(()=>{rb.dataset.arm="";rb.textContent="Erase and start over"},4000)}}}

/* ---------- Onboarding ---------- */
let OB=null,obStep=0;const OBSTEPS=4;
function openOnboarding(){OB=JSON.parse(JSON.stringify(PROF));OB.diet=OB.diet||[];obStep=0;$("#onb").hidden=false;document.body.style.overflow="hidden";drawOB()}
function closeOnboarding(save){if(save){OB.done=true;PROF=OB;saveProf();st.origin=PROF.start;store.set("origin",st.origin);$("#origin").value=st.origin;if(st.origin==="me")startGPS();VIBE=VIBE0();saveVibe()}
  else if(!PROF.done){PROF.done=true;saveProf()}
  $("#onb").hidden=true;document.body.style.overflow="";st.dialTouched=false;showTab("list");if(save)toast("Your list is ready.")}
function drawOB(){$("#obdots").innerHTML=Array.from({length:OBSTEPS},(_,i)=>`<i class="${i<=obStep?"on":""}"></i>`).join("");
  $("#obback").style.visibility=obStep?"visible":"hidden";$("#obnext").textContent=obStep===OBSTEPS-1?"Show my list":"Next";const el=$("#obstep");
  if(obStep===0)el.innerHTML=`<h2 id="onbh">Let's build your list.</h2><p>Where do you usually start, and how far will you go?</p>
    <div class="chipset">${ORIGINS.map(o=>`<button class="pick" data-v="${o.k}" aria-pressed="${OB.start===o.k}">${esc(o.n)}</button>`).join("")}</div>
    <label class="slider">On a normal day, up to <b id="obev">${OB.everyday} mi</b><input type="range" id="obevr" min="1" max="20" value="${OB.everyday}"></label>
    <label class="slider">For something really good, up to <b id="obsp">${OB.special} mi</b><input type="range" id="obspr" min="3" max="45" value="${OB.special}"></label>`;
  if(obStep===1)el.innerHTML=`<h2 id="onbh">What do you love?</h2><p>Tap once for love, twice for never, a third time to clear.</p>
    <div class="chipset">${PICK_CUISINES.map(c=>`<button class="pick ${OB.loves.includes(c)?"love":OB.never.includes(c)?"never":""}" data-v="${esc(c)}">${esc(c)}</button>`).join("")}</div>`;
  if(obStep===2)el.innerHTML=`<h2 id="onbh">How do you usually eat?</h2><p>This is just your default. You can switch it any time from the home screen.</p>
    <div class="chipset">${SVC.map(([k,n])=>`<button class="pick" data-svc="${k}" aria-pressed="${(OB.svc||"any")===k}">${n}</button>`).join("")}</div>
    <div class="chipset"><button class="pick" data-dt="1" aria-pressed="${OB.dtLike}">I like drive-thrus for quick meals</button></div>`;
  if(obStep===3)el.innerHTML=`<h2 id="onbh">Budget and anything else?</h2><p>Per person. Pricier places sink in your list instead of disappearing.</p>
    <div class="chipset">${[[15,"About $15"],[25,"About $25"],[40,"About $40"],[60,"About $60"],[999,"Doesn't matter"]].map(([v,l])=>`<button class="pick" data-bud="${v}" aria-pressed="${OB.budget===v}">${l}</button>`).join("")}</div>
    <div class="chipset">${[["vegetarian","Vegetarian"],["vegan","Vegan"],["halal","Halal"],["gf","Gluten-free"]].map(([v,l])=>`<button class="pick" data-diet="${v}" aria-pressed="${OB.diet.includes(v)}">${l}</button>`).join("")}</div>
    <p class="note">Everything stays on this phone. Change or erase it any time under You.</p>`;
  el.querySelectorAll(".pick").forEach(b=>b.onclick=()=>{const v=b.dataset.v;
    if(obStep===0&&v)OB.start=v;
    if(obStep===1){if(OB.loves.includes(v)){OB.loves=OB.loves.filter(x=>x!==v);OB.never.push(v)}else if(OB.never.includes(v))OB.never=OB.never.filter(x=>x!==v);else OB.loves.push(v)}
    if(b.dataset.svc)OB.svc=b.dataset.svc;if(b.dataset.dt)OB.dtLike=!OB.dtLike;if(b.dataset.bud)OB.budget=+b.dataset.bud;
    if(b.dataset.diet){const d=b.dataset.diet;OB.diet=OB.diet.includes(d)?OB.diet.filter(x=>x!==d):OB.diet.concat(d)}drawOB()});
  if(obStep===0){$("#obevr").oninput=e=>{OB.everyday=+e.target.value;$("#obev").textContent=OB.everyday+" mi";if(OB.special<OB.everyday){OB.special=OB.everyday;$("#obspr").value=OB.special;$("#obsp").textContent=OB.special+" mi"}};
    $("#obspr").oninput=e=>{OB.special=Math.max(+e.target.value,OB.everyday);$("#obsp").textContent=OB.special+" mi"}}}

/* ---------- Views ---------- */
function showTab(w){st.view=w;["list","map","wheel","profile"].forEach(k=>$("#v-"+k).hidden=k!==w);
  document.querySelectorAll(".tab").forEach(t=>t.setAttribute("aria-current",t.dataset.v===w));
  const nodock=w==="profile"||w==="wheel";$("#dock").hidden=nodock;document.body.classList.toggle("nodock",nodock);
  if(w==="map"){initMap();setTimeout(()=>map&&map.invalidateSize(),60)}render();window.scrollTo({top:0})}

function setup(){
  $("#origin").innerHTML=ORIGINS.map(o=>`<option value="${o.k}">${o.n}</option>`).join("");$("#origin").value=st.origin;
  $("#origin").onchange=e=>{st.origin=e.target.value;store.set("origin",st.origin);if(st.origin==="me")startGPS();st.shown=8;render();liveRefresh(false)};
  $("#dial").addEventListener("input",e=>{st.dial=+e.target.value;st.dialTouched=true;render()});
  $("#feels").onclick=e=>{const b=e.target.closest("[data-feel]");if(b)toggleFeel(b.dataset.feel)};
  $("#svcseg").onclick=e=>{const b=e.target.closest("[data-svc]");if(b)setSvc(b.dataset.svc)};
  $("#tunebtn").onclick=openTune;$("#resetvibe").onclick=resetVibe;$("#howbtn").onclick=howItWorks;
  $("#more").onclick=()=>{st.shown+=10;render()};
  $("#searchbtn").onclick=()=>{const f=$("#sform"),open=f.hidden;f.hidden=!open;$("#searchbtn").setAttribute("aria-expanded",open);if(open)$("#q").focus();else if(st.q){$("#q").value="";liveSearch("")}};
  $("#sform").onsubmit=e=>{e.preventDefault();liveSearch($("#q").value.trim())};
  $("#q").addEventListener("search",()=>{if(!$("#q").value)liveSearch("")});
  $("#refresh").onclick=async()=>{const b=$("#refresh");b.classList.add("spinning");st.checked=new Date();render();if(isApp)Native.checkWebUpdate();await liveRefresh(true);b.classList.remove("spinning")};
  document.querySelector(".tabs").onclick=e=>{const t=e.target.closest(".tab");if(t)showTab(t.dataset.v)};
  ["#wsize","#wweight"].forEach(s=>$(s).onchange=()=>{if(!spinning)buildWheel()});$("#spin").onclick=spin;$("#spin2").onclick=spin;
  $("#obnext").onclick=()=>{if(obStep<OBSTEPS-1){obStep++;drawOB();$("#onb").scrollTop=0}else closeOnboarding(true)};
  $("#obback").onclick=()=>{if(obStep>0){obStep--;drawOB()}};$("#obskip").onclick=()=>closeOnboarding(false);
  setupSettings();
  document.querySelectorAll("dialog.sheet").forEach(d=>{d.addEventListener("click",e=>{if(e.target===d||e.target.closest("[data-close]"))d.close()});
    d.addEventListener("close",()=>{if(d.id==="detail"&&history.state&&history.state.wtdSheet)history.back()})});
  addEventListener("popstate",()=>{const d=$("#detail");if(d.open)d.close()});
  document.addEventListener("click",e=>{const fb=e.target.closest("[data-fb]");if(fb){e.preventDefault();setFeedback(+fb.dataset.id,fb.dataset.fb);return}
    const dr=e.target.closest("[data-dir]");if(dr)noteTrip(+dr.dataset.dir);
    const dt=e.target.closest("[data-detail]");if(dt){e.preventDefault();openDetail(+dt.dataset.detail);return}
    const op=e.target.closest("[data-open]");if(op&&!e.target.closest("a")&&op.dataset.open!==""){openDetail(+op.dataset.open)}});
  document.addEventListener("keydown",e=>{const r=e.target.closest&&e.target.closest(".row");if(r&&(e.key==="Enter"||e.key===" ")){e.preventDefault();openDetail(+r.dataset.open)}});
  matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change",()=>drawWheel());
  setInterval(()=>{st.checked=new Date();render()},5*60000);
  CATW=catWeights();reindex();render();
  if(!PROF.done)openOnboarding();
  if(st.origin==="me")startGPS();
  liveRefresh(false);setTimeout(()=>checkRelease(false),3000);
  if(location.hash==="#map")showTab("map");if(location.hash==="#wheel")showTab("wheel");
}
async function boot(){try{const r=await fetch("data.json",{cache:"no-store"});DATA=await r.json()}catch(e){DATA=[]}
  Object.values(LIVE).forEach(applyLive);setup()}
boot();
if(!isApp&&"serviceWorker" in navigator&&location.protocol==="https:")navigator.serviceWorker.register("sw.js").catch(()=>{});
setTimeout(()=>{const standalone=matchMedia("(display-mode: standalone)").matches||navigator.standalone;
  if(IOS&&!isApp&&!standalone&&!store.get("iosHint",false)){banner("Install it: tap Share, then “Add to Home Screen”. It opens full-screen like an app.","Got it",()=>{store.set("iosHint",true);$("#banner").hidden=true})}},2500);
