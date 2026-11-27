'use strict';
const BASE='https://yvgkebxvexsudifoaeqq.supabase.co';
const KEY='sb_publishable_sy-DKyPfGv_u7l8hyp93yQ_MCwGA46h';
const $=id=>document.getElementById(id), uid=()=>crypto.randomUUID();
const factions=['Beast Herds','Daemon Legions','Dread Elves','Dwarven Holds','Empire of Sonnstahl','Highborn Elves','Infernal Dwarves','Kingdom of Equitaine','Ogre Khans','Orcs and Goblins','Saurian Ancients','Sylvan Elves','Undying Dynasties','Vampire Covenant','Vermin Swarm','Warriors of the Dark Gods'];
const scenarios={deploy:['Frontline Clash','Bottleneck','Spearhead','Encircle','Refused Flank','Assault at First Light'],primary:['Trophies of War','Divide and Conquer','Breakthrough','Secure Targets','Hold the Centre','Skull of Harald Redstub'],secondary:['Settle the Score','Demonstrate Superiority','Slay the Beast','Assassinate','Capture their Banners','Conserve our Numbers']};
const prefix='t9a-cloud-04:',sessionKey=prefix+'session';
function read(k,d){try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}}
function write(k,v){localStorage.setItem(k,JSON.stringify(v))}
let session=read(sessionKey,null),data=null,context={},queue={},busy=false,flushing=false,online=false;
const params=new URLSearchParams(location.hash.slice(1)),matrixMode=params.get('view')==='matrix',inviteToken=params.get('invite');
const notify=t=>{$('notice').textContent=t||''};
const cacheKey=()=>prefix+'cache:'+session?.user?.id,queueKey=()=>prefix+'queue:'+session?.user?.id,contextKey=()=>prefix+'context:'+session?.user?.id;
function storeSession(s){session=s;write(sessionKey,s)}
function loadLocal(){data=read(cacheKey(),null);queue=read(queueKey(),{});context=read(contextKey(),{});if(matrixMode)for(const k of ['t','team','r','away'])if(params.has(k))context[k]=params.get(k)}
function saveContext(){if(!matrixMode)write(contextKey(),context)}
function status(){const n=Object.keys(queue).length;$('status').textContent=(online?'Connecté':'Hors ligne / non connecté')+(n?' · '+n+' saisie(s) en attente':'');}
async function request(path,{method='GET',body,token,prefer,auth=false}={}){const headers={apikey:KEY,'Content-Type':'application/json'};if(token)headers.Authorization='Bearer '+token;if(prefer)headers.Prefer=prefer;const r=await fetch(BASE+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(20000)});const txt=await r.text();let j;try{j=txt?JSON.parse(txt):null}catch{j=txt}if(!r.ok){const e=new Error(j?.message||j?.msg||j?.error_description||j?.error||('HTTP '+r.status));e.status=r.status;e.code=j?.code;throw e}return j}
async function auth(path,body){return request('/auth/v1/'+path,{method:'POST',body})}
function acceptSession(j){if(!j?.access_token||!j?.user?.id)throw Error('Session non reçue');storeSession({...j,expires_at:j.expires_at||Math.floor(Date.now()/1000)+(j.expires_in||3600)});loadLocal()}
async function token(){if(!session)throw Error('Connexion requise');const refresh=async()=>{const saved=read(sessionKey,null);if(!saved||saved.user.id!==session.user.id)throw Error('Session modifiée dans un autre onglet');session=saved;if(session.expires_at>Date.now()/1000+60)return session.access_token;const j=await auth('token?grant_type=refresh_token',{refresh_token:session.refresh_token});if(j.user.id!==session.user.id)throw Error('Identité inattendue');storeSession({...j,expires_at:j.expires_at||Math.floor(Date.now()/1000)+(j.expires_in||3600)});return session.access_token};return navigator.locks?navigator.locks.request(prefix+'refresh',refresh):refresh()}
async function api(path,method='GET',body,prefer){return request('/rest/v1/'+path,{method,body,prefer,token:await token()})}
const rpc=(name,body={})=>api('rpc/'+name,'POST',body);
const query=(table,filters={})=>table+'?'+new URLSearchParams(filters).toString();
async function all(table,filters={}){let rows=[];for(let i=0;i<100;i++){const page=await api(query(table,{select:'*',...filters,limit:500,offset:500*i}));rows.push(...page);if(page.length<500)return rows}throw Error('Limite de lecture dépassée')}
const eq=x=>'eq.'+x;
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n};
function options(id,items,value,placeholder='— Choisir —'){const s=$(id);s.replaceChildren(new Option(placeholder,''),...items.map(([v,t])=>new Option(t,v)));s.value=String(value??'');if(!s.value)s.value='';return s.value}
const who=()=>data?.members.find(m=>m.team_id===context.team&&m.user_id===session?.user?.id);
const tour=()=>data?.tournaments.find(t=>t.id===context.t);
const teams=()=>data?.teams.filter(t=>t.tournament_id===context.t)||[];
const roster=t=>(data?.players.filter(p=>p.team_id===t)||[]).sort((a,b)=>a.display_order-b.display_order||a.name.localeCompare(b.name));
const round=()=>data?.rounds.find(r=>r.tournament_id===context.t&&r.round_number===+context.r);
const matches=()=>data?.matches.filter(m=>m.tournament_id===context.t&&m.own_team_id===context.team&&m.round_number===+context.r)||[];
const match=()=>matches().find(m=>m.opponent_team_id===context.away);
const canManage=()=>data?.admin||who()?.role==='captain';
const key=(m,p,q)=>[m,p,q].join(':');
const record=(m,p,q)=>data?.estimates.find(e=>e.matchup_id===m&&e.player_id===p&&e.opponent_player_id===q);
const value=(m,p,q)=>queue[key(m,p,q)]?.value??record(m,p,q)?.estimate??'';
function person(p){const b=el('button',p.nickname||p.name,'person');b.type='button';b.append(el('small',p.faction));b.title=p.name+' · '+p.faction+'\n'+p.army_list;b.onclick=()=>{$('listTitle').textContent=p.name+' · '+p.faction+' · '+(p.army_points??'—')+' pts';$('listText').textContent=p.army_list;$('listDialog').showModal()};return b}
function color(v){return /^\d+$/.test(v)&&+v<=20?(+v<=7?'bad':+v<=12?'mid':'good'):''}
function show(){const logged=!!session; $('login').hidden=logged||!!inviteToken;$('join').hidden=!inviteToken||matrixMode;$('app').hidden=!logged||!data;$('refresh').hidden=!logged;$('logout').hidden=!logged||matrixMode;status();if(!logged||!data)return;
 $('admin').hidden=matrixMode||!data.admin;
 context.t=options('tournament',data.tournaments.map(t=>[t.id,t.name]),context.t);if(!context.t&&data.tournaments.length===1){context.t=data.tournaments[0].id;$('tournament').value=context.t}
 const available=teams().filter(t=>data.admin||data.members.some(m=>m.team_id===t.id&&m.user_id===session.user.id));context.team=options('team',available.map(t=>[t.id,t.name]),context.team);if(!context.team&&available.length===1){context.team=available[0].id;$('team').value=context.team}
 const rr=Array.from({length:tour()?.round_count||0},(_,i)=>[i+1,'Round '+(i+1)]);context.r=options('round',rr,context.r||1);if(!context.r&&rr.length){context.r='1';$('round').value='1'}
 const a=teams().filter(t=>t.id!==context.team&&(canManage()||matches().some(m=>m.opponent_team_id===t.id)));context.away=options('opponent',a.map(t=>[t.id,t.name]),context.away);if(!context.away&&matches().length===1){context.away=matches()[0].opponent_team_id;$('opponent').value=context.away}
 const r=round();for(const [k,col] of [['deploy','deployment'],['primary','primary_objective'],['secondary','secondary_objective']]){const v=r?.[col]||'';options(k,[...new Set([...scenarios[k],...(v?[v]:[])])].map(x=>[x,x]),v);$(k).disabled=matrixMode||!data.admin||!online||!r}
 $('saveRound').hidden=matrixMode||!data.admin;$('saveRound').disabled=!online||!r;$('createMatch').hidden=matrixMode||!canManage();$('createMatch').disabled=!online||!context.team||!context.away||!r||!!match();$('openMatrix').hidden=matrixMode;$('openMatrix').disabled=!match();
 const w=who(),p=roster(context.team).find(x=>x.id===w?.player_id);$('who').textContent=p?(p.nickname||p.name)+' · '+p.faction:(w?.role==='captain'?'Capitaine sans joueur':data.admin?'Administrateur':'Pas de joueur associé');
 $('invites').hidden=matrixMode||!canManage()||!context.team;const sel=$('invitePlayer').value;options('invitePlayer',[['none','Sans joueur (capitaine)'],...roster(context.team).map(p=>[p.id,p.nickname||p.name])],sel);$('inviteRole').disabled=!data.admin;if(!data.admin)$('inviteRole').value='player';$('invite').disabled=!online;renderMembers();
 $('entrySection').hidden=matrixMode;$('matrixSection').hidden=!matrixMode;const m=match(),opps=roster(context.away);$('entries').replaceChildren();$('progress').textContent='';$('entryHelp').textContent=!m?'Le capitaine doit enregistrer une rencontre pour ce round.':!p?'Un accès lié à un joueur est nécessaire pour saisir des estimations.':'Saisis une note (1 à 40 caractères, ex. 12, 8–12, +), puis Enregistrer. Les notes non envoyées restent sur cet appareil.';
 if(m&&p&&!matrixMode){$('progress').textContent=opps.filter(q=>value(m.id,p.id,q.id)!=='').length+'/'+opps.length;for(const q of opps){const row=el('div',null,'entry'),inp=el('input',null,'score');inp.maxLength=40;inp.placeholder='—';inp.value=value(m.id,p.id,q.id);inp.classList.add(color(inp.value)||'neutral');const b=el('button','Enregistrer');b.onclick=()=>saveEstimate(m,p,q,inp.value);inp.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();b.click()}};row.append(person(q),inp,b);$('entries').append(row)}}
 if(matrixMode){const tbl=$('matrix');tbl.replaceChildren();$('matrixContext').textContent='Round '+context.r+' · '+(teams().find(t=>t.id===context.team)?.name||'—')+' / '+(teams().find(t=>t.id===context.away)?.name||'—');if(m&&w){const h=el('tr');h.append(el('th','Nous / Eux'));for(const q of opps){const th=el('th');th.append(person(q));h.append(th)}tbl.append(h);for(const p of roster(context.team)){const tr=el('tr'),th=el('th');th.append(person(p));tr.append(th);for(const q of opps){const v=value(m.id,p.id,q.id),td=el('td',v||'—',color(v));tr.append(td)}tbl.append(tr)}}else tbl.append(el('caption','Une invitation de cette équipe est nécessaire pour consulter ses estimations.'))}
 saveContext();status();}
function renderMembers(){const box=$('members');box.replaceChildren();if($('invites').hidden)return;for(const m of data.members.filter(m=>m.team_id===context.team)){const p=roster(m.team_id).find(p=>p.id===m.player_id);const row=el('div',null,'row');row.append(el('small',(p?.nickname||p?.name||'Capitaine')+' · '+m.role,'grow'));if(data.admin||m.role==='player'){const b=el('button','Révoquer');b.disabled=!online;b.onclick=()=>action(async()=>{if(confirm('Révoquer cet accès ? Les estimations restent.')){await rpc('t9a_revoke_member',{p_member:m.id});await reload()}});row.append(b)}box.append(row)}}
async function reload({quiet=false}={}){if(!session||busy)return;busy=true;try{const admin=await rpc('t9a_is_admin');const [tournaments,teams,members]=await Promise.all([all('t9a_tournaments',{order:'created_at.desc,id'}),all('t9a_teams',{order:'name,id'}),all('t9a_members',{order:'id'})]);const [players,rounds,matches,estimates]=await Promise.all([all('t9a_players',{order:'id'}),all('t9a_rounds',{order:'tournament_id,round_number'}),all('t9a_matchups',{order:'id'}),all('t9a_estimates',{order:'matchup_id,player_id,opponent_player_id'})]);data={admin,tournaments,teams,members,players,rounds,matches,estimates};online=true;write(cacheKey(),data);if(!quiet||matrixMode||!document.activeElement?.matches('input,select,textarea'))show();if(!flushing&&!matrixMode&&Object.keys(queue).length)await flush();}catch(e){online=false;if(e.status===401||e.status===403){data=null;localStorage.removeItem(cacheKey());notify('Accès refusé ou session expirée. '+e.message)}else if(!quiet)notify('Connexion indisponible : '+e.message);show()}finally{busy=false;status()}}
async function action(fn){try{notify('');await fn()}catch(e){notify(e.message||String(e))}}
async function saveEstimate(m,p,q,v){v=v.trim();if(v.length>40)return notify('40 caractères maximum.');const k=key(m.id,p.id,q.id),old=record(m.id,p.id,q.id);queue=read(queueKey(),queue);const prior=queue[k];let base=prior?prior.base:old?.updated_at??null;if(prior&&prior.base!==(old?.updated_at??null)&&online){if(!confirm('Une version différente existe sur le serveur. Confirmer le remplacement par cette note ?'))return;base=old?.updated_at??null;}queue[k]={row:{matchup_id:m.id,own_team_id:m.own_team_id,opponent_team_id:m.opponent_team_id,player_id:p.id,opponent_player_id:q.id},value:v,base};try{write(queueKey(),queue)}catch(e){return notify('Stockage local indisponible : estimation non enregistrée.')}show();await flush();}
async function flush(){if(flushing||!session||matrixMode||!navigator.onLine||!Object.keys(read(queueKey(),queue)).length)return;flushing=true;try{queue=read(queueKey(),queue);for(const [k,item] of Object.entries(queue)){const r=item.row,filters={matchup_id:eq(r.matchup_id),player_id:eq(r.player_id),opponent_player_id:eq(r.opponent_player_id)};const current=(await api(query('t9a_estimates',filters)))[0];if((current?.estimate??'')!==item.value){if((current?.updated_at??null)!==item.base){notify('Conflit de synchronisation : une note a changé depuis ta dernière lecture. Ta note reste en attente. Actualise puis contacte le capitaine si nécessaire.');continue}if(current){const guarded={...filters,updated_at:eq(current.updated_at)};const changed=await api(query('t9a_estimates',guarded),item.value?'PATCH':'DELETE',item.value?{estimate:item.value}:undefined,'return=representation');if(!changed?.length){notify('Conflit : note conservée localement.');continue}}else if(item.value){await api('t9a_estimates','POST',{...r,estimate:item.value},'return=representation')}}const latest=read(queueKey(),{});if(JSON.stringify(latest[k])===JSON.stringify(item))delete latest[k];queue=latest;write(queueKey(),queue);if(data){data.estimates=data.estimates.filter(e=>key(e.matchup_id,e.player_id,e.opponent_player_id)!==k);if(item.value){const x=(await api(query('t9a_estimates',filters)))[0];if(x)data.estimates.push(x)}write(cacheKey(),data)}}online=true;}catch(e){if(!e.status)online=false;notify('Envoi en attente : '+e.message)}finally{flushing=false;show();status()}}
function parse(text,filename,def){
 const source=text.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').split('\n').map((raw,i)=>({raw,t:raw.trim(),n:i+1})).filter(x=>x.t&&!/^Created with newrecruit\.eu\b/i.test(x.t));
 const faction=t=>factions.find(f=>f.toLowerCase()===t.toLowerCase());
 const same=(a,b)=>a.trim().replace(/\s+/g,' ').toLowerCase()===b.trim().replace(/\s+/g,' ').toLowerCase();
 const unit=/^(\d+)\s+[-–—]\s+(.+)$/,total=/^(\d+)$/;
 let team=def||'',cur=null,out=[],warnings=[];
 function fail(x,m){throw Error(filename+' · ligne '+x.n+' : '+m+' ('+x.t.slice(0,100)+')')}
 function start(x,name,army){if(!team)fail(x,'équipe absente — renseigne l’équipe par défaut');if(!name.trim())fail(x,'nom de joueur absent');cur={id:uid(),team,name:name.trim(),army,listLines:[],sum:0,header:x.n}}
 for(let i=0;i<source.length;i++){
   const x=source[i],v=x.t,next=source[i+1],m=v.match(unit);
   if(cur){
     if(m){cur.listLines.push(x.raw);cur.sum+=Number(m[1]);continue}
     if(total.test(v)){
       if(!cur.listLines.length)fail(x,'liste vide');
       const pts=Number(v);
       if(pts!==cur.sum)warnings.push(cur.team+' / '+cur.name+' : total déclaré '+pts+' ≠ somme '+cur.sum);
       out.push({id:cur.id,team:cur.team,name:cur.name,army:cur.army,list:[...cur.listLines,'',x.raw].join('\n'),points:pts});
       cur=null;continue;
     }
     fail(x,'fin de liste attendue (total numérique)');
   }
   if(m||total.test(v))fail(x,'liste sans en-tête de joueur');
   const last=v.match(/^(.*)\s+[-–—]\s+(.+)$/);
   if(last&&faction(last[2])){start(x,last[1],faction(last[2]));continue}
   if(next&&faction(next.t)){
     let name=v;
     if(team){
       const parts=v.split(/\s+[-–—]\s+/);
       for(let j=parts.length-1;j>=1;j--){
         if(same(parts.slice(0,j).join(' - '),team)){name=parts.slice(j).join(' - ');break}
       }
       if(name===v&&v.startsWith(team+' - '))name=v.slice(team.length+3);
     }
     start(x,name,faction(next.t));i++;continue;
   }
   if(faction(v))fail(x,'nom de joueur manquant');
   if(next&&!unit.test(next.t)&&!total.test(next.t)){team=v;continue}
   fail(x,'en-tête non reconnu');
 }
 if(cur)throw Error(filename+' · liste incomplète à partir de la ligne '+cur.header+' : total manquant');
 if(!out.length)throw Error(filename+' : aucune liste NewRecruit reconnue');
 return {players:out,warnings};
}
$('loginForm').onsubmit=e=>{e.preventDefault();action(async()=>{const j=await auth('token?grant_type=password',{email:$('email').value,password:$('password').value});$('password').value='';acceptSession(j);await reload()})};
$('accept').onclick=()=>action(async()=>{if(!/^[a-f0-9]{64}$/.test(inviteToken))throw Error('Lien invalide');if(!session){acceptSession(await auth('signup',{data:{}}))}await rpc('t9a_redeem_invitation',{p_token:inviteToken});location.replace(location.pathname+location.search)});
$('logout').onclick=()=>action(async()=>{if(Object.keys(queue).length)throw Error('Des estimations restent à synchroniser. Ne te déconnecte pas maintenant.');if(session.user.is_anonymous&&!confirm('Tu perdras cet accès individuel. Un nouveau lien sera nécessaire. Continuer ?'))return;await request('/auth/v1/logout',{method:'POST',token:await token()});for(const k of [cacheKey(),queueKey(),contextKey(),sessionKey])localStorage.removeItem(k);location.replace(location.pathname+location.search)});
$('refresh').onclick=()=>reload();$('closeList').onclick=()=>$('listDialog').close();
for(const [id,k] of [['tournament','t'],['team','team'],['round','r'],['opponent','away']])$(id).onchange=e=>{context[k]=e.target.value;if(k==='t'){context.team='';context.r='1';context.away=''}if(k==='team'||k==='r')context.away='';$('inviteResult').hidden=true;show()};
$('openMatrix').onclick=()=>{const u=new URL(location.href);u.hash=new URLSearchParams({view:'matrix',t:context.t,team:context.team,r:context.r,away:context.away}).toString();window.open(u,'_blank','noopener')};
$('saveRound').onclick=()=>action(async()=>{await api(query('t9a_rounds',{tournament_id:eq(context.t),round_number:eq(context.r)}),'PATCH',{deployment:$('deploy').value||null,primary_objective:$('primary').value||null,secondary_objective:$('secondary').value||null},'return=representation');await reload();notify('Scénarios enregistrés.')});
$('createMatch').onclick=()=>action(async()=>{await api('t9a_matchups','POST',{tournament_id:context.t,round_number:+context.r,own_team_id:context.team,opponent_team_id:context.away},'return=representation');await reload();notify('Rencontre enregistrée.')});
$('invite').onclick=()=>action(async()=>{const p=$('invitePlayer').value,role=$('inviteRole').value;if(!p||p==='none'&&role!=='captain')throw Error('Sélectionne un joueur.');const j=await rpc('t9a_create_invitation',{p_team:context.team,p_player:p==='none'?null:p,p_role:role});const u=new URL(location.href);u.hash='invite='+j[0].token;$('inviteLink').value=u.href;$('inviteResult').hidden=false;notify('Invitation créée. Copie le lien maintenant.')});
$('copyLink').onclick=()=>action(async()=>{await navigator.clipboard.writeText($('inviteLink').value);notify('Lien copié.')});
$('import').onclick=()=>action(async()=>{const name=$('tname').value.trim(),n=+$('nround').value,files=[...$('txt').files];if(!name||!Number.isInteger(n)||n<1||n>100||!files.length)throw Error('Renseigne le nom, les rounds et au moins un TXT.');let ps=[],warnings=[];for(const f of files){const x=parse(await f.text(),f.name,'');ps.push(...x.players);warnings.push(...x.warnings)}const unique=new Set();for(const p of ps){const k=p.team.toLowerCase()+'\0'+p.name.toLowerCase();if(unique.has(k))throw Error('Doublon : '+p.name);unique.add(k)}const names=[...new Set(ps.map(p=>p.team))];if(warnings.length&&!confirm(warnings.join('\n')+'\nContinuer ?'))return;if(!confirm('Créer '+name+' : '+names.length+' équipes, '+ps.length+' joueurs, '+n+' rounds ?'))return;const id=uid(),map=new Map(names.map(x=>[x,uid()]));$('import').disabled=true;try{await api('t9a_tournaments','POST',{id,name,round_count:n,owner_id:session.user.id},'return=representation');await api('t9a_teams','POST',names.map(x=>({id:map.get(x),name:x,tournament_id:id})),'return=minimal');const rows=ps.map((p,i)=>{const nick=p.name.match(/^(.*?)\s*\(([^()]*)\)\s*$/);return {team_id:map.get(p.team),name:nick?.[1].trim()||p.name,nickname:nick?.[2].trim()||null,faction:p.army,army_list:p.list,army_points:p.points,display_order:i}});for(let i=0;i<rows.length;i+=40)await api('t9a_players','POST',rows.slice(i,i+40),'return=minimal');await api('t9a_rounds','POST',Array.from({length:n},(_,i)=>({tournament_id:id,round_number:i+1})),'return=minimal');context={t:id,r:'1'};await reload();notify('Import terminé : '+names.length+' équipes, '+ps.length+' joueurs.')}catch(e){try{await api(query('t9a_tournaments',{id:eq(id)}),'DELETE',undefined,'return=minimal')}catch{throw Error('Import interrompu : '+e.message+' ; nettoyage non confirmé. Vérifie le tournoi dans Supabase avant de réessayer.')}throw Error('Import interrompu ; suppression du tournoi partiel demandée : '+e.message)}finally{$('import').disabled=false}});
window.addEventListener('storage',e=>{if(e.key===sessionKey){const s=read(sessionKey,null);if(!s||s.user.id!==session?.user?.id){location.reload();return}session=s}if(session&&(e.key===cacheKey()||e.key===queueKey())&&matrixMode){data=read(cacheKey(),data);queue=read(queueKey(),queue);show()}});
window.addEventListener('online',()=>reload());window.addEventListener('offline',()=>{online=false;status()});
if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('./sw.js').catch(e=>notify('Cache hors ligne indisponible : '+e.message));
if(session){loadLocal();show();reload()}else show();setInterval(()=>{if(session&&navigator.onLine&&document.visibilityState==='visible'&&(matrixMode||!document.activeElement?.matches('input,select,textarea')))reload({quiet:true})},15000);
