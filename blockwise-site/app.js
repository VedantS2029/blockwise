const $=(q,r=document)=>r.querySelector(q),app=$('#app');
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const uid=()=>crypto.randomUUID();
/* ---------- storage (accounts live in this browser) ---------- */
/* ---------- Supabase storage ---------- */
const CFG_OK=window.SB_URL&&!/YOUR/.test(window.SB_URL+window.SB_KEY);
const sb=CFG_OK?supabase.createClient(window.SB_URL,window.SB_KEY):null;
const C={user:null,projects:[],sand:null,learn:null};
const me=()=>C.user,projs=()=>C.projects.map(x=>({...x}));
const syncErr=e=>{console.error(e);const x=$('.sv');if(x)x.textContent='⚠ Not saved. Check your connection.'};
const chk=rs=>{const bad=[].concat(rs).find(r=>r&&r.error);if(bad)syncErr(bad.error)};
const S={get(k,d){const t=k.split('_')[1];return(t==='learn'||t==='sand')&&C[t]!=null?C[t]:d},
 set(k,v){const t=k.split('_')[1];if(t!=='learn'&&t!=='sand')return false;C[t]=v;return sb.from('workspaces').upsert({user_id:C.user.id,kind:t,data:v,updated_at:new Date().toISOString()}).then(chk)}};
function putProjs(n){const o=new Map(C.projects.map(x=>[x.id,x])),ops=[];C.projects=n;
 const up=n.filter(x=>{const y=o.get(x.id);return!y||y.name!==x.name||y.data!==x.data}).map(x=>({id:x.id,user_id:C.user.id,name:x.name,data:x.data,updated_at:new Date(x.updated).toISOString()}));
 if(up.length)ops.push(sb.from('projects').upsert(up));
 const gone=[...o.keys()].filter(id=>!n.some(y=>y.id===id));
 if(gone.length)ops.push(sb.from('projects').delete().in('id',gone));
 return Promise.all(ops).then(chk)}
async function load(){if(!sb)return;const{data:{session}}=await sb.auth.getSession();if(!session){C.user=null;return}
 const u=session.user;C.user={id:u.id,email:u.email,name:(u.user_metadata&&u.user_metadata.name)||u.email};
 const[p,w]=await Promise.all([sb.from('projects').select('id,name,data,updated_at').order('updated_at',{ascending:false}),sb.from('workspaces').select('kind,data')]);
 C.projects=(p.data||[]).map(r=>({id:r.id,name:r.name,data:r.data,updated:Date.parse(r.updated_at)}));(w.data||[]).forEach(r=>{C[r.kind]=r.data})}
let cur=null,saveT=0;
const uk=k=>'bca_'+k+'_'+me().id;
const learnDone=()=>{try{return JSON.parse(S.get(uk('learn'),null)).done||[]}catch(e){return[]}};
window.BCA={load(){return cur?cur.data:null},save(d){if(!cur)return;cur.data=d;clearTimeout(saveT);const e=$('.sv');e&&(e.textContent='Saving…');saveT=setTimeout(flush,350)}};
async function flush(){if(!cur)return;if(cur.kind==='project'){const p=projs(),i=p.findIndex(x=>x.id===cur.id);if(i<0)return;p[i]={...p[i],data:cur.data,name:cur.name,updated:Date.now()};await putProjs(p)}else await S.set(cur.key,cur.data);const e=$('.sv');if(e)e.textContent='All changes saved'}
/* ---------- router ---------- */
function U(h){if(!h)return 'index.html';if(h==='signin')return 'signin.html';if(h==='signup')return 'signin.html?mode=signup';if(/^(projects|tutorials|sandbox)$/.test(h))return h+'.html';if(h.startsWith('editor-'))return 'project.html?id='+h.slice(7);return h}
const go=h=>{location.href=U(h)};
let poll=0;
async function boot(p){if(!sb){app.innerHTML='<div style="padding:40px;max-width:560px;margin:auto"><h2>Almost ready</h2><p>Open <b>config.js</b> and paste in your Supabase project URL and anon key.</p></div>';return}
 app.innerHTML='<p style="padding:40px;text-align:center;color:var(--mut)">Loading…</p>';try{await load()}catch(e){console.error(e)}
 const u=me(),q=new URLSearchParams(location.search),need=()=>{if(!u){go('signin');return 1}};
 if(p==='landing')return landing();
 if(p==='signin'){if(u)return go('projects');return auth(q.get('mode')==='signup'?'signup':'signin')}
 if(p==='tutorials')return tutorials();
 if(need())return;
 if(p==='projects')return projects();
 if(p==='sandbox')return editor('sandbox');
 if(p==='project')return editor('project',q.get('id')||'');
 if(p==='lesson')return editor('learn',q.has('watch')?'watch-'+q.get('watch'):q.has('n')?'learn-'+q.get('n'):'learn')}
const MARK=`<svg viewBox="0 0 64 64" width="34" height="34" aria-hidden="true"><g><rect x="6" y="42" width="46" height="16" rx="4" fill="#ff6b4a"/><rect x="14" y="26" width="46" height="16" rx="4" fill="#1fb5a8"/><rect x="6" y="10" width="34" height="16" rx="4" fill="#ffc93c"/>
<rect x="11" y="5" width="9" height="5" rx="1.5" fill="#ffc93c"/><rect x="26" y="5" width="9" height="5" rx="1.5" fill="#ffc93c"/><rect x="44" y="21" width="9" height="5" rx="1.5" fill="#1fb5a8"/><rect x="10" y="37" width="9" height="5" rx="1.5" fill="#ff6b4a"/>
<g fill="#fff" opacity=".3"><rect x="9" y="12" width="28" height="3" rx="1.5"/><rect x="17" y="28" width="40" height="3" rx="1.5"/><rect x="9" y="44" width="40" height="3" rx="1.5"/></g></g></svg>`;
const pgs=()=>[['tutorials','Tutorials'],['sandbox','Sandbox'],['projects','Projects']].map(([h,t])=>`<a class="pg${location.pathname.endsWith('/'+h+'.html')?' on':''}" href="${h}.html">${t}</a>`).join('');
function nav(){const u=me();return `<div class="nav"><a class="logo" href="index.html"><b>${MARK}</b>Blockwise Coding Classes</a>${pgs()}${u?`<button class="btn sm" id="out">Sign out</button>`:`<a class="btn sm" href="signin.html">Sign in</a><a class="btn sm yel" href="signin.html?mode=signup">Get started</a>`}</div>`}
function wireNav(){const o=$('#out');if(o)o.onclick=async()=>{await sb.auth.signOut();go('')}}
/* ---------- landing ---------- */
const jump=id=>document.getElementById(id)&&document.getElementById(id).scrollIntoView({behavior:'smooth'});
function landing(){const u=me(),cta=u?'projects.html':'signin.html?mode=signup',ct=u?'Open my projects':'Start for free';
app.innerHTML=`<div class="page pro">
<div class="nav"><a class="logo" href="index.html"><b><svg viewBox="0 0 64 64" width="34" height="34" aria-hidden="true"><g><rect x="6" y="42" width="46" height="16" rx="4" fill="#ff6b4a"/><rect x="14" y="26" width="46" height="16" rx="4" fill="#1fb5a8"/><rect x="6" y="10" width="34" height="16" rx="4" fill="#ffc93c"/>
<rect x="11" y="5" width="9" height="5" rx="1.5" fill="#ffc93c"/><rect x="26" y="5" width="9" height="5" rx="1.5" fill="#ffc93c"/><rect x="44" y="21" width="9" height="5" rx="1.5" fill="#1fb5a8"/><rect x="10" y="37" width="9" height="5" rx="1.5" fill="#ff6b4a"/>
<g fill="#fff" opacity=".3"><rect x="9" y="12" width="28" height="3" rx="1.5"/><rect x="17" y="28" width="40" height="3" rx="1.5"/><rect x="9" y="44" width="40" height="3" rx="1.5"/></g></g></svg></b>Blockwise Coding Classes</a>${pgs()}<button class="lk" data-j="cast">The cast</button><button class="lk" data-j="learn">What kids learn</button><button class="lk" data-j="safe">Safety</button><button class="lk" data-j="price">Free access</button><button class="lk" data-j="faq">FAQ</button>${u?`<a class="btn sm" href="projects.html">My projects</a><button class="btn sm" id="out">Sign out</button>`:`<a class="btn sm" href="signin.html">Sign in</a><a class="btn sm yel" href="signin.html?mode=signup">Get started</a>`}</div>
<div class="wrap"><div class="hero"><div><span class="eyebrow">Coding for kids, starring the characters they love</span>
<h1>Learn to code with the characters they <mark style="font-size:.9em">already know</mark>.</h1>
<p>Blockwise Coding Classes teaches real programming with drag-and-drop blocks and a cast of 23 meme characters your child already recognises. They’re not watching these characters, they’re making them move, jump and talk.</p>
<div class="row"><a class="btn yel lg" href="${cta}">${ct}</a><button class="btn lg" data-j="learn">See what’s inside</button></div>
<div class="trust"><span>Free to use</span><span>No ads</span><span>No chat with strangers</span><span>Runs in the browser</span></div></div>
<div class="win"><div class="tb"><i></i><i></i><i></i></div><div class="bd"><div class="code stack" style="transform:none;margin:0;width:auto"><div class="br" style="--c:#ffc93c">when 🏁 clicked</div><div class="br" style="--c:#ff8a3d">repeat 10</div><div class="br" style="--c:#1fb5a8">move 10 steps</div><div class="br" style="--c:#ff6b4a">say “hello!”</div></div><div class="stg"><img alt="Tung Tung Tung Sahur character" src="${CH[0].i}"></div></div></div></div></div>
<div class="wrap"><div class="strip"><div>${CH.concat(CH).map(c=>`<img alt="" src="${c.i}">`).join('')}</div></div></div>
<div class="wrap"><section class="s" id="cast"><h2>Meet the cast</h2><p class="lead">Every one of these characters is ready to go on the stage, each with its own signature move. Kids pick their favourites and then program them.</p><div class="cast">${CH.map(c=>`<div class="cc"><img alt="${c.n}" src="${c.i}"><b>${c.n}</b></div>`).join('')}</div></section></div>
<div class="band"><div class="wrap"><section class="s" id="learn"><h2>What your child will learn</h2><p class="lead">Every block is a real programming idea. The vocabulary carries straight over to text-based languages later.</p><div class="grid">
<div class="card fc" style="--c:#ffc93c"><h3>Sequences &amp; events</h3><p>Computers follow steps in order. Kids start programs with events like a flag click.</p></div>
<div class="card fc" style="--c:#ff8a3d"><h3>Loops</h3><p>Repeat blocks replace copy-paste, the first taste of working smarter.</p></div>
<div class="card fc" style="--c:#1fb5a8"><h3>Motion &amp; logic</h3><p>Position, direction and size teach coordinates and cause-and-effect.</p></div>
<div class="card fc" style="--c:#ff6b4a"><h3>Variables &amp; debugging</h3><p>Tracking values, spotting what went wrong and fixing it is what coding really is.</p></div></div></section></div></div>
<div class="wrap"><section class="s"><h2>How it works</h2><p class="lead">Kids can start on their own, and you can see their progress any time.</p><div class="grid steps">
<div class="card step"><h3>Guided lessons</h3><p>Step-by-step goals tick off automatically as your child builds.</p></div>
<div class="card step"><h3>Animated tutorials</h3><p>A voiced, animated cursor shows each technique, without touching their own work.</p></div>
<div class="card step"><h3>Their own projects</h3><p>Every project is saved to their account, so they can keep building and come back to it.</p></div></div></section></div>
<div class="band"><div class="wrap"><section class="s" id="safe"><h2>Built with parents in mind</h2><p class="lead">A calm place to learn, with nothing competing for their attention.</p><div class="grid">
<div class="card"><h3>No ads</h3><p>Nothing is sold to your child and nothing interrupts them.</p></div>
<div class="card"><h3>No chat or public profiles</h3><p>Kids build in private. There’s no way for strangers to contact them.</p></div>
<div class="card"><h3>Nothing to install</h3><p>It runs in a web browser on a laptop or desktop, with no downloads.</p></div>
<div class="card"><h3>Free right now</h3><p>No payment details needed. Just make an account to save your progress.</p></div></div></section></div></div>
<div class="wrap"><section class="s" id="price"><h2>Free while we’re launching</h2><p class="lead">No payment details needed. Just make an account to save your progress.</p>
<div class="card price"><div class="amt">$0 <small>for now</small></div><ul><li>Full access to every lesson and tutorial</li><li>Unlimited projects, saved to their account</li><li>Characters, stage and the whole block library</li><li>No ads</li></ul><a class="btn pri lg" href="${cta}">${ct}</a><p class="fine">We never ask for card details.</p></div></section>
<section class="s" id="faq"><h2>Questions parents ask</h2><div class="faq" style="margin-top:22px">
<details class="q"><summary>What age is it for?</summary><p>It’s for kids who are new to coding and can read simple instructions. Younger children usually do best with a parent beside them for the first few lessons.</p></details>
<details class="q"><summary>Does my child need any experience?</summary><p>No. The lessons start from the very first block and build up gradually.</p></details>
<details class="q"><summary>What device do we need?</summary><p>A laptop or desktop with a modern web browser. Dragging blocks is much easier with a mouse or trackpad than on a phone.</p></details>
<details class="q"><summary>Is it really free?</summary><p>Yes, everything is free to use right now.</p></details>
<details class="q"><summary>Who are the characters?</summary><p>They’re internet meme characters that kids already know and love. Your child adds them to the stage, gives them instructions with blocks and watches them act it out. Under the jokes are loops, events and variables, the same ideas used in professional software.</p></details>
</div></section>
<div class="cta"><h2>Give them a head start in coding</h2><p>Set up an account in under a minute.</p><a class="btn pri lg" href="${cta}">${ct}</a></div></div>
<footer>© Blockwise Coding Classes</footer></div>`;wireNav();document.querySelectorAll('[data-j]').forEach(b=>b.onclick=()=>jump(b.dataset.j))}
/* ---------- auth ---------- */
function auth(mode){const up=mode==='signup';app.innerHTML=`<div class="page">${nav()}<div class="auth"><form class="abox" id="af" novalidate>
<h2>${up?'Create your account':'Welcome back'}</h2><p class="sub">${up?'Save your projects and pick up where you left off.':'Sign in to open your projects.'}</p>
<div class="tabs2"><button type="button" class="${up?'':'on'}" data-m="signin">Sign in</button><button type="button" class="${up?'on':''}" data-m="signup">Sign up</button></div>
${up?'<label class="f">Display name<input id="nm" maxlength="30" autocomplete="nickname"></label>':''}
<label class="f">Email<input id="em" type="email" autocomplete="email"></label>
<label class="f">Password<input id="pw" type="password" autocomplete="${up?'new-password':'current-password'}"></label>
<p class="err" id="er"></p><button class="btn pri" style="width:100%;justify-content:center">${up?'Create account':'Sign in'}</button>
<p class="note">Your account and projects are saved securely online, so you can sign in on any device.</p></form></div></div>`;wireNav();
 document.querySelectorAll('.tabs2 button').forEach(b=>b.onclick=()=>go(b.dataset.m));
 $('#af').onsubmit=async e=>{e.preventDefault();const er=$('#er'),em=$('#em').value.trim().toLowerCase(),pw=$('#pw').value,btn=$('#af button.btn');er.style.color='';
  if(!/^\S+@\S+\.\S+$/.test(em))return er.textContent='Enter a valid email address.';
  if(up){const nm=$('#nm').value.trim();if(!nm)return er.textContent='Pick a display name.';if(pw.length<6)return er.textContent='Password needs at least 6 characters.';
   er.textContent='';btn.disabled=true;const{data,error}=await sb.auth.signUp({email:em,password:pw,options:{data:{name:nm}}});btn.disabled=false;
   if(error)return er.textContent=error.message;
   if(!data.session){er.style.color='#3ecf8e';return er.textContent='Almost there! Check your email and click the confirmation link, then sign in.'}
   go('projects')}
  else{er.textContent='';btn.disabled=true;const{error}=await sb.auth.signInWithPassword({email:em,password:pw});btn.disabled=false;
   if(error)return er.textContent=error.message;go('projects')}}}
/* ---------- projects ---------- */
const COL=['#1fb5a8','#ff6b4a','#ffc93c','#ff8a3d','#8bd450'];
function info(d){try{const j=JSON.parse(d);const ch=(j.c||[]).length,bl=(j.c||[]).reduce((a,c)=>a+(c.s||[]).reduce((b,s)=>b+(s.b||[]).length,0),0);return{ch,bl,les:(j.done||[]).length}}catch(e){return{ch:0,bl:0,les:0}}}
const ago=t=>{const m=Math.round((Date.now()-t)/6e4);return m<1?'just now':m<60?m+' min ago':m<1440?Math.round(m/60)+' h ago':Math.round(m/1440)+' d ago'};
function projects(){const u=me(),p=projs().sort((a,b)=>b.updated-a.updated),tot=p.reduce((a,x)=>{const i=info(x.data);a.b+=i.bl;return a},{b:0,l:learnDone().length});
 app.innerHTML=`<div class="page">${nav()}<div class="wrap"><div class="ph2"><h2>Hey ${esc(u.name)} 👋</h2><button class="btn pri" id="new">＋ New project</button></div>
<div class="stat"><div><b>${p.length}</b><span>projects</span></div><div><b>${tot.b}</b><span>blocks placed</span></div><div><b>${tot.l}</b><span>lessons done</span></div></div>
${p.length?`<div class="grid">${p.map(x=>{const i=info(x.data);return`<div class="card pcard" data-id="${x.id}" style="--c:${COL[x.id.charCodeAt(0)%5]}"><div class="thumb">${Array.from({length:Math.min(Math.max(i.bl,2),14)},(_,k)=>`<i style="height:${24+(k*17)%46}px;background:${COL[k%5]}"></i>`).join('')}</div>
<h3>${esc(x.name)}</h3><div class="meta">${i.ch} character${i.ch==1?'':'s'} · ${i.bl} blocks · edited ${ago(x.updated)}</div>
<div class="acts"><button class="btn sm" data-a="open">Open</button><button class="btn sm" data-a="ren">Rename</button><button class="btn sm" data-a="dup">Duplicate</button><button class="btn sm dng" data-a="del">Delete</button></div></div>`}).join('')}</div>`
:`<div class="empty"><h3>No projects yet</h3><p>Create your first one and start snapping blocks.</p></div>`}
</div></div>`;wireNav();
 const mk=(name,data)=>{const p=projs(),x={id:uid(),name,data:data||null,updated:Date.now()};p.push(x);putProjs(p);return x};
 $('#new').onclick=()=>{const n=prompt('Name your project','Untitled project');if(n===null)return;go('editor-'+mk(n.trim()||'Untitled project').id)};
 document.querySelectorAll('.pcard').forEach(c=>c.onclick=e=>{const id=c.dataset.id,a=e.target.dataset.a,all=projs(),x=all.find(y=>y.id===id);
  if(!a||a==='open')return go('editor-'+id);e.stopPropagation();
  if(a==='ren'){const n=prompt('Rename project',x.name);if(n&&n.trim()){x.name=n.trim();putProjs(all);projects()}}
  if(a==='dup'){mk(x.name+' (copy)',x.data);projects()}
  if(a==='del'&&confirm('Delete “'+x.name+'”? This can’t be undone.')){putProjs(all.filter(y=>y.id!==id));projects()}})}
/* ---------- tutorials */
const LS=[
{t:'First steps',tag:'Sequences & events',idea:'A program is a list of instructions. The computer reads them from top to bottom and does exactly what they say, nothing more and nothing less.',why:'The yellow hat block is an event: it says when to start. Blocks snap under it in order because order matters. “Move then turn” is not the same as “turn then move”.',code:'when flag clicked\n  move(10)',goal:'Make Tung walk 10 steps.',w:2},
{t:'Loops',tag:'Repetition',idea:'A loop repeats instructions so you don’t have to write them again and again. Computers are brilliant at doing the same thing many times without getting bored.',why:'“Repeat 4” with a move and a turn inside walks a square: four sides, four turns. Fewer blocks, same result, and changing one number changes the whole shape.',code:'repeat 4 times:\n  move(80)\n  turn(90)',goal:'Make Tripi walk a square.',w:4},
{t:'Say it',tag:'Data & text',idea:'The words inside a block are information the program uses. Change the information and the program does something different, without changing how it works.',why:'Programmers call this data. The “say” block is the machine, and your words are what you feed into it. The same block can say a million different things.',code:'say("Hello!", 2)',goal:'Make Cappuccino say your own words.',w:3},
{t:'Party',tag:'Messages',idea:'Characters can talk to each other with messages. One character broadcasts a message, and any character who is listening reacts when it arrives.',why:'This is how real apps work: one part announces that something happened and other parts decide what to do about it. The sender doesn’t need to know who is listening.',code:'broadcast("party")\n\nwhen I receive "party":\n  do_special_move()',goal:'Tung starts the party and Cappuccino spins.',w:5},
{t:'Pen art',tag:'Putting it together',idea:'Put the pen down and a moving character leaves a trail. Mix loops, moves and turns and your code draws pictures.',why:'Small rules repeated many times make big patterns. Change the angle or the number of repeats and you get a brand new shape.',code:'pen_down()\nrepeat 4 times:\n  move(80)\n  turn(90)',goal:'Draw a square with the pen.',w:9}];
const TT=[['🧭','Tour of the editor','What every part of the screen does'],['🎭','Add & remove characters','Bring characters onto the stage'],['🏁','Build your first script','Hat block, studs, flag'],['✏️','Edit block values','Type text and numbers into blocks'],['🔁','Loops','Repeat blocks with a C-shaped block'],['📣','Messages between characters','Make one character trigger another'],['⌨️','Keys & clicks','React to the keyboard and the mouse'],['🧮','Variables','Make a variable that remembers a number'],['➕','Operators','Put a block inside another block'],['🖍️','Pen art','Draw shapes on the stage'],['🗑️','Delete, move & tidy','Rearrange, remove and tidy blocks'],['📍','Character settings & lessons','Position, size, direction, visibility']];
const GL=[['Event','Something that starts your code, like clicking the flag or pressing a key.'],['Loop','A way to repeat instructions without rewriting them.'],['Data','Information a program uses, like numbers and words.'],['Message','A signal one part of a program sends so another part can react.'],['Variable','A labelled box that remembers a value, like a score.']];
function tutorials(){const u=me(),dn=u?learnDone():[],pc=Math.round(dn.length/LS.length*100);
 app.innerHTML=`<div class="page">${nav()}<div class="wrap"><div class="ph2"><div style="flex:1"><h2>Tutorials</h2><p class="meta" style="margin:6px 0 0">Five short lessons. Each one explains the idea first, then you build it.</p></div></div>
<div class="card" style="margin-bottom:22px"><b>${dn.length} of ${LS.length} lessons complete</b><div class="bar"><i style="width:${pc}%"></i></div>${u?'':'<p class="meta" style="margin:10px 0 0"><a href="signin.html?mode=signup" style="color:var(--hi)">Sign up</a> to save your progress.</p>'}</div>
${LS.map((l,i)=>`<div class="card les"><div class="lh2"><span class="num">${i+1}</span><div style="flex:1"><h3>${l.t}</h3><span class="meta">${l.tag}</span></div>${dn.includes(i)?'<span class="ok">✓ Done</span>':''}</div>
<h4>💡 The idea</h4><p>${l.idea}</p><h4>🔍 Why it works</h4><p>${l.why}</p><h4>⌨️ In real code it looks like</h4><pre>${l.code}</pre>
<p class="meta" style="margin-top:12px"><b>Your goal:</b> ${l.goal}</p><div class="acts"><a class="btn pri sm" href="${u?'lesson.html?n='+i:'signin.html?mode=signup'}">${dn.includes(i)?'Do it again':u?'Start lesson':'Sign up to start'}</a><a class="btn sm" href="${u?'lesson.html?watch='+l.w:'signin.html?mode=signup'}">▶ Watch how first</a></div></div>`).join('')}
<h2 style="font-size:26px;margin:34px 0 14px">Words to know</h2><div class="grid">${GL.map(g=>`<div class="card"><h3>${g[0]}</h3><p style="color:var(--mut)">${g[1]}</p></div>`).join('')}</div>
<h2 style="font-size:26px;margin:34px 0 6px">Watch and learn</h2><p class="meta" style="margin:0 0 14px">An animated cursor does it for you, with a voice. Your own work is never touched.</p>
<div class="grid" style="margin-bottom:50px">${TT.map((t,i)=>`<a class="card tt" href="${u?'lesson.html?watch='+i:'signin.html?mode=signup'}"><span class="em">${t[0]}</span><div><b>${t[1]}</b><p>${t[2]}</p></div></a>`).join('')}</div></div></div>`;wireNav()}
/* ---------- editor / sandbox */
function editor(kind,arg){let css='',key=kind==='learn'?uk('learn'):kind==='sandbox'?uk('sand'):null,bar;
 if(kind==='project'){const x=projs().find(p=>p.id===arg);if(!x){go('projects');return}cur={kind,id:arg,name:x.name,data:x.data};css='#lcard{display:none!important}';
  bar=`<input id="pn" maxlength="60" value="${esc(x.name)}" aria-label="Project name"><span class="sv">All changes saved</span>`}
 else{cur={kind,key,name:kind,data:S.get(key,null)};
  if(kind==='sandbox'){css='#lcard{display:none!important}';bar=`<b class="lbl">🧪 Sandbox</b><span class="hint">Build anything you like. It saves automatically.</span><button class="btn sm" id="sap">Save as project</button><span class="sv">All changes saved</span>`}
  else bar=`<b class="lbl">📚 Lessons</b><span class="sv">All changes saved</span>`}
 app.innerHTML=`<div class="ebar"><a class="logo" href="index.html" style="flex:none" title="Home"><b>${MARK}</b></a>${pgs()}${bar}</div>${kind==='learn'?'<div id="ip" class="ip"></div>':''}<iframe id="frame" title="Editor"></iframe>`;
 const pn=$('#pn');if(pn)pn.oninput=e=>{cur.name=e.target.value.trim()||'Untitled project';clearTimeout(saveT);saveT=setTimeout(flush,350)};
 const sap=$('#sap');if(sap)sap.onclick=()=>{const n=prompt('Name this project','My sandbox project');if(n===null)return;flush();const p=projs(),x={id:uid(),name:n.trim()||'Untitled project',data:cur.data,updated:Date.now()};p.push(x);putProjs(p);go('editor-'+x.id)};
 const fr=$('#frame');fr.src='editor.html'+(css?'?mode=nolessons':'');
 if(kind==='learn')fr.onload=()=>{const w=fr.contentWindow,m=/-(\d+)$/.exec(arg),n=m?+m[1]:-1;
  if(arg.startsWith('learn')&&n>=0&&n<LS.length)try{w.eval('showLesson('+n+')')}catch(e){}
  if(arg.startsWith('watch'))setTimeout(()=>{try{w.play(n)}catch(e){}},900);
  let shown=-1,sd=null,hid=false;const ip=$('#ip');
  const paint=()=>{const l=LS[shown];if(!l)return;ip.innerHTML=`<div class="ipt"><b>Lesson ${shown+1}: ${l.t}</b>${sd?' <span class="ok">✓ Done</span>':''}<button class="btn sm" id="ih">${hid?'Show the idea':'Hide'}</button></div>${hid?'':`<div class="ipb"><p><b>💡 The idea.</b> ${l.idea}</p><p><b>🔍 Why it works.</b> ${l.why}</p><pre>${l.code}</pre></div>`}`;$('#ih').onclick=()=>{hid=!hid;paint()}};
  const upd=()=>{try{const i=w.eval('L'),dd=w.eval('done.includes(L)');if(i!==shown||dd!==sd){shown=i;sd=dd;paint()}}catch(e){}};
  upd();poll=setInterval(upd,700)}}
addEventListener('pagehide',flush);
