/* Exact pure-action maximin, simultaneous choices without observing the other choice. */
(function(root){
'use strict';
function solve(matrix,strategy,st){
 const n=matrix.length,full=(1<<n)-1;
 if(![4,5,6,8].includes(n)||matrix.some(r=>r.length!==n||r.some(v=>![1.5,5,8,10,12,15,18.5].includes(v))))throw Error('Matrice incomplète ou format non pris en charge.');
 if(!['global','balanced','high'].includes(strategy))throw Error('Stratégie inconnue.');
 // Lexicographic objectives: 200 > maximum total-score difference (8 × 17),
 // and 10000 > every possible secondary bonus plus total difference.
 // Balanced utility: collective midpoint total + 4 per 17–20 + 2 per 14–16.
 // This is a soft trade-off, not a hard cap on the loss of collective score.
 const W=matrix.map(r=>r.map(v=>strategy==='high'?v+(v===18.5?10000:v===15?200:0):strategy==='balanced'?v+(v===18.5?4:v===15?2:0):v));
 const ids=Array.from({length:full+1},(_,m)=>Array.from({length:n},(_,i)=>i).filter(i=>m&(1<<i)));
 const pairs=ids.map(a=>a.flatMap((i,k)=>a.slice(k+1).map(j=>[i,j])));
 const memo=new Float64Array((full+1)**2);memo.fill(NaN);
 const bit=i=>1<<i;
 function outcome(a,b,d,e,x,y,ours,theirs){
  const aa=a&~(bit(d)|bit(x)),bb=b&~(bit(e)|bit(y));
  let v=W[d][y]+W[x][e];
  if(ids[a].length===4){const rx=ours[0]===x?ours[1]:ours[0],ry=theirs[0]===y?theirs[1]:theirs[0]; const u=ids[aa&~bit(rx)][0],t=ids[bb&~bit(ry)][0];return v+W[rx][t]+W[u][ry];}
  return v+V(aa,bb);
 }
 function accept(a,b,d,e,ours,theirs,exclude=null){let best=-Infinity,choice=null;for(const y of theirs){if(y===exclude)continue;let worst=Infinity;for(const x of ours)worst=Math.min(worst,outcome(a,b,d,e,x,y,ours,theirs));if(worst>best){best=worst;choice=y}}return [best,choice];}
 function offer(a,b,d,e,exclude=null){let best=-Infinity,choice=null,witness=null;for(const ours of pairs[a&~bit(d)]){if(Array.isArray(exclude)?(ours[0]===exclude[0]&&ours[1]===exclude[1]):ours.includes(exclude))continue;let worst=Infinity,y=null;for(const theirs of pairs[b&~bit(e)]){const result=accept(a,b,d,e,ours,theirs);if(result[0]<worst){worst=result[0];y=result[1];}if(worst<=best)break;}if(worst>best){best=worst;choice=ours;witness=y}}return [best,choice,witness];}
 function defender(a,b,exclude=null){let best=-Infinity,choice=null,witness=null;for(const d of ids[a]){if(d===exclude)continue;let worst=Infinity,branch=null;for(const e of ids[b]){const result=offer(a,b,d,e);if(result[0]<worst){worst=result[0];branch={e,y:result[2]};}if(worst<=best)break;}if(worst>best){best=worst;choice=d;witness=branch}}return [best,choice,witness];}
 function V(a,b){if(!a)return 0;if(ids[a].length===1)return W[ids[a][0]][ids[b][0]];const k=a*(full+1)+b;if(!Number.isNaN(memo[k]))return memo[k];return memo[k]=defender(a,b)[0];}
 let a=full,b=full;for(const [x,y] of st.matches){a&=~bit(x);b&=~bit(y)}
 if(st.phase==='done')return {own:[],away:[]};
 let out;
 // Evaluate the strongest alternative excluding the current recommended action.
 // Same remaining players, information, objective and pure-action maximin.
 // A null alternative denotes a forced choice, not a score of zero.
 const comparison=(best,alt)=>({recommended:best,alternative:Number.isFinite(alt[0])?alt[0]:null,alternativeChoice:alt[1]});
 // The witness is one deterministic worst-case branch of the same maximin
 // calculation, not a probability or a prediction of the opponent's choice.
 // Extreme estimates on current-phase recommendations only. Both types use
 // the same choice and objective; neither changes the optimisation.
 const extreme=(i,j,cmp,extra={})=>({i,j,comparison:cmp,...extra});
 const split=hints=>({truck:hints.filter(h=>matrix[h.i][h.j]===1.5),basher:hints.filter(h=>matrix[h.i][h.j]===18.5)});
 if(st.phase==='def'){out=defender(a,b);const w=out[2],i=out[1],cmp=comparison(out[0],defender(a,b,i));return {own:[i],away:[],utility:out[0],comparison:cmp,...split(w?[extreme(i,w.y,cmp,{opponentDefender:w.e})]:[])};}
 if(st.phase==='offer'){out=offer(a,b,st.d,st.e);const cmp=comparison(out[0],offer(a,b,st.d,st.e,out[1]));return {own:out[1],away:[],utility:out[0],comparison:cmp,...split(out[1].filter(i=>[1.5,18.5].includes(matrix[i][st.e])).map(i=>extreme(i,st.e,comparison(out[0],offer(a,b,st.d,st.e,i)))))};}
 if(st.phase==='accept'){out=accept(a,b,st.d,st.e,st.ours,st.theirs);const cmp=comparison(out[0],accept(a,b,st.d,st.e,st.ours,st.theirs,out[1]));return {own:[],away:[out[1]],utility:out[0],comparison:cmp,...split([extreme(st.d,out[1],cmp)])};}
 throw Error('Étape inconnue.');
}
function resolve(n,st){const a=Array.from({length:n},(_,i)=>i).filter(i=>!st.matches.some(m=>m[0]===i)),b=Array.from({length:n},(_,i)=>i).filter(i=>!st.matches.some(m=>m[1]===i));const add=[[st.d,st.y],[st.x,st.e]];if(a.length===3)add.push([a.find(i=>i!==st.d&&i!==st.x),b.find(i=>i!==st.e&&i!==st.y)]);if(a.length===4){const rx=st.ours.find(i=>i!==st.x),ry=st.theirs.find(i=>i!==st.y);add.push([rx,b.find(i=>i!==st.e&&!st.theirs.includes(i))],[a.find(i=>i!==st.d&&!st.ours.includes(i)),ry]);}return add;}
const engine={solve,resolve};if(typeof module!=='undefined')module.exports=engine;else root.PairingEngine=engine;
if(typeof WorkerGlobalScope!=='undefined'&&root instanceof WorkerGlobalScope)root.onmessage=e=>{try{root.postMessage({id:e.data.id,result:solve(e.data.matrix,e.data.strategy,e.data.state)})}catch(err){root.postMessage({id:e.data.id,error:err.message})}};
})(typeof self==='undefined'?globalThis:self);
