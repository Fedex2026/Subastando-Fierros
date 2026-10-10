
 // Subastando Fierros — página pública. No modifica login.js ni admin.js.
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';
import { collection, doc, getDoc, onSnapshot, query, orderBy, limit, runTransaction, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';

const $ = id => document.getElementById(id);
const money = n => new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',maximumFractionDigits:0}).format(Number(n)||0);
const text = (id,value) => { if($(id)) $(id).textContent=String(value??''); };
const ms = t => t?.toMillis?.() ?? (t?.seconds ? t.seconds*1000 : 0);
const duration = s => { const n=Math.max(0,Math.ceil(s)); text('hours',String(Math.floor(n/3600)).padStart(2,'0')); text('minutes',String(Math.floor(n%3600/60)).padStart(2,'0')); text('seconds',String(n%60).padStart(2,'0')); };
const category = v => ({vehiculo:'autos',auto:'autos',autos:'autos',moto:'motos',motos:'motos',maquinaria:'herramientas'}[String(v||'').toLowerCase()]||String(v||'otros').toLowerCase());
const escapeHTML = v => String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;':'&quot;',"'":'&#39;'}[c]));
const fmtDate = t => ms(t) ? new Date(ms(t)).toLocaleString('es-MX',{dateStyle:'medium',timeStyle:'short'}) : 'Por confirmar';
const FALLBACK='https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=900&q=80';
let lots=[],activeCategory='todos',active=null,unsubBids=null,user=null,profile=null,authReady=false,latestBids=[];
let auctionEndedLocally=false;

onAuthStateChanged(auth,async u=>{
  user=u;profile=null;authReady=false;
  if(u){try{const s=await getDoc(doc(db,'usuarios',u.uid));if(s.exists())profile=s.data();}catch(e){console.error('Perfil:',e);}}
  authReady=true; updateBidButton();
});

function upcoming(l){return l.estado==='programada' && ms(l.fechaInicio)>Date.now();}
function running(l){const start=ms(l.fechaInicio),round=Math.max(10,Number(l.duracionRonda)||120),last=ms(l.ultimaPujaFecha);return (l.estado==='en_vivo'||l.estado==='programada') && start>0 && start<=Date.now() && Date.now()<Math.max(start,last)+round*1000;}
function chooseLive(){
  const runningLots=lots.filter(running).sort((a,b)=>ms(a.fechaInicio)-ms(b.fechaInicio));
  if(runningLots.length)return runningLots[0];
  const next=lots.filter(upcoming).sort((a,b)=>ms(a.fechaInicio)-ms(b.fechaInicio))[0];
  return next && ms(next.fechaInicio)-Date.now()<=5*60*1000 ? next : null;
}
function refreshLive(){
  const chosen=chooseLive();
  if(!chosen){
    if(active){active=null;auctionEndedLocally=false;unsubBids?.();unsubBids=null;latestBids=[];}
    if($('liveEmptyState'))$('liveEmptyState').hidden=false;
    if($('liveAuctionContent'))$('liveAuctionContent').hidden=true;
    return;
  }
  if($('liveEmptyState'))$('liveEmptyState').hidden=true;
  if($('liveAuctionContent'))$('liveAuctionContent').hidden=false;
  if(!active || active.id!==chosen.id){
    active=chosen;auctionEndedLocally=false;latestBids=[];
    listenBids(chosen.id);
    renderLive(chosen);
  } else {active=chosen;renderLive(chosen);}
  updateBidButton();
}
function addDL(container,label,value){if(value===null||value===undefined||value==='')return;const row=document.createElement('div');const dt=document.createElement('dt');dt.textContent=label;const dd=document.createElement('dd');dd.textContent=String(value);row.append(dt,dd);container.append(row);}
function addLI(container,value){if(!value)return;const li=document.createElement('li');li.textContent=String(value);container.append(li);}
function renderLive(l){
  text('liveVehicleName',`${l.marca||''} ${l.modelo||''}`.trim().toUpperCase());
  text('liveVehicleVersion',[l.anio,l.version].filter(Boolean).join(' | '));
  text('liveLotId',`ID: ${l.id}`);
  text('currentBid',money(l.pujaActual??l.precioInicial));
  text('liveMinIncrement',money(l.incrementoMinimo||500));
  text('bidCount',l.totalPujas||0);
  text('participants',l.participantes??'—');
  const input=$('bidInput');if(input && document.activeElement!==input)input.value=Number(l.pujaActual??l.precioInicial??0)+Number(l.incrementoMinimo||500);
  const photos=(Array.isArray(l.fotos)?l.fotos:[]).filter(v=>typeof v==='string'&&/^https:\/\//.test(v));
  const main=$('mainAuctionImage');if(main && main.dataset.lot!==l.id){main.src=photos[0]||l.fotoPortada||FALLBACK;main.dataset.lot=l.id;}
  const strip=document.querySelector('#liveAuctionContent .thumb-strip');
  if(strip && strip.dataset.lot!==l.id){strip.replaceChildren();strip.dataset.lot=l.id;photos.forEach((url,i)=>{const b=document.createElement('button');b.type='button';b.className='thumb'+(i===0?' active':'');const img=document.createElement('img');img.src=url;img.alt=`Foto ${i+1}`;b.append(img);b.addEventListener('click',()=>{if(main)main.src=url;strip.querySelectorAll('.thumb').forEach(x=>x.classList.toggle('active',x===b));});strip.append(b);});}
  const info=$('liveVehicleInfo');if(info){info.replaceChildren();[['Marca',l.marca],['Modelo',l.modelo],['Año',l.anio],['Versión',l.version],['Transmisión',l.transmision],['Kilometraje',l.kilometraje!=null?`${l.kilometraje} km`:null],['Ubicación',l.ubicacion],['Combustible',l.combustible],['Color',l.color]].forEach(([k,v])=>addDL(info,k,v));}
  const details=$('liveVehicleDetails');if(details){details.replaceChildren();[l.condicion,l.descripcion,l.observaciones,l.danosEsteticos,l.danosMecanicos].forEach(v=>addLI(details,v));}
  const docs=$('liveVehicleDocuments');if(docs){docs.replaceChildren();[l.tipoFactura,l.documentos,l.tarjetaCirculacion].forEach(v=>addLI(docs,v));}
}
function listenBids(id){
  unsubBids?.();latestBids=[];renderHistory();
  unsubBids=onSnapshot(query(collection(db,'subastas',id,'pujas'),orderBy('fecha','desc'),limit(10)),s=>{latestBids=s.docs.map(d=>d.data());renderHistory();},e=>console.error('Historial de pujas:',e));
}
function renderHistory(){const target=$('bidHistory');if(!target)return;target.replaceChildren();latestBids.forEach((b,i)=>{const row=document.createElement('div');const a=document.createElement('span');a.textContent=String(i+1);const n=document.createElement('span');n.textContent=b.nombre||'Usuario';const amount=document.createElement('strong');amount.textContent=money(b.monto);const time=document.createElement('small');time.textContent=ms(b.fecha)?new Date(ms(b.fecha)).toLocaleTimeString('es-MX'):'—';row.append(a,n,amount,time);target.append(row);});}
function secondsLeft(l){const start=ms(l.fechaInicio);if(start>Date.now())return (start-Date.now())/1000;const last=ms(l.ultimaPujaFecha);const round=Math.max(10,Number(l.duracionRonda)||120);return ((last>=start?last:start)+round*1000-Date.now())/1000;}
function tick(){
  refreshLive();if(!active)return;
  const start=ms(active.fechaInicio),waiting=start>Date.now(),left=secondsLeft(active);
  const finished=active.estado==='finalizada'||active.estado==='cancelada'||(!waiting&&left<=0);
  auctionEndedLocally=finished;
  text('liveStatusBadge',finished?'FINALIZADA':waiting?'PRÓXIMAMENTE':'EN VIVO');
  text('countdownLabel',finished?'SUBASTA FINALIZADA':waiting?'LA SUBASTA COMIENZA EN:':'EN VIVO · TIEMPO PARA PUJAR:');
  duration(finished?0:left);
  const bar=$('auctionTimeBar');if(bar){bar.hidden=waiting||finished;const fill=$('auctionTimeBarFill');if(fill)fill.style.width=`${Math.max(0,Math.min(100,left/Math.max(10,Number(active.duracionRonda)||120)*100))}%`;}
  updateBidButton();
}
function updateBidButton(){const b=$('bidButton');if(!b)return;const waiting=!active||ms(active.fechaInicio)>Date.now();const enabled=!!active&&!waiting&&!auctionEndedLocally&&active.estado==='en_vivo';b.disabled=!enabled;b.textContent=!active?'SIN SUBASTA':auctionEndedLocally?'SUBASTA FINALIZADA':waiting?'SUBASTA PROGRAMADA':active.estado!=='en_vivo'?'ESPERANDO ACTIVACIÓN':'🔨 PUJAR AHORA';}
function renderList(){
  const container=$('auctionList');if(!container)return;
  const filtered=lots.filter(l=>upcoming(l)&&(activeCategory==='todos'||category(l.categoria)===activeCategory)).sort((a,b)=>ms(a.fechaInicio)-ms(b.fechaInicio));
  text('auctionCategoryLabel',activeCategory==='todos'?'Mostrando todas las subastas disponibles.':`Mostrando subastas de ${activeCategory}.`);
  container.replaceChildren();
  if(!filtered.length){container.innerHTML='<div class="auction-empty-state"><span>🔨</span><strong>AÚN NO HAY SUBASTAS EN ESTA CATEGORÍA</strong><p>Muy pronto aparecerán nuevas oportunidades.</p></div>';return;}
  filtered.forEach(l=>{
    const card=document.createElement('article');card.className='auction-card';card.tabIndex=0;card.setAttribute('role','link');
    const name=escapeHTML(`${l.marca||''} ${l.modelo||''}`.trim());const cover=(Array.isArray(l.fotos)&&l.fotos[0])||l.fotoPortada||FALLBACK;
    const safeCover=/^https:\/\//.test(cover)?escapeHTML(cover):FALLBACK;
    card.innerHTML=`<div class="auction-card-image"><span class="upcoming-badge">PRÓXIMAMENTE</span><img src="${safeCover}" alt="${name}"></div><div class="auction-card-body"><h3>${name}</h3><div class="sub">${escapeHTML([l.anio,l.version].filter(Boolean).join(' | '))}</div><div class="row"><span>Inicia en:</span><span>🕐 <strong class="auction-card-countdown"></strong></span></div><div class="row"><span>Fecha:</span><span>${escapeHTML(fmtDate(l.fechaInicio))}</span></div><div class="row"><span>Puja inicial:</span><span class="price">${money(l.precioInicial)}</span></div></div>`;
    const open=()=>location.href=`vehiculo.html?id=${encodeURIComponent(l.id)}`;
    card.addEventListener('click',open);card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}});
    card.querySelector('.auction-card-countdown').textContent=formatCountdown((ms(l.fechaInicio)-Date.now())/1000);
    container.append(card);
  });
}
function formatCountdown(seconds){const n=Math.max(0,Math.ceil(seconds));const d=Math.floor(n/86400);return (d?`${d}d `:'')+[Math.floor(n%86400/3600),Math.floor(n%3600/60),n%60].map(v=>String(v).padStart(2,'0')).join(':');}
function updateCardClocks(){document.querySelectorAll('#auctionList .auction-card').forEach((card,i)=>{const filtered=lots.filter(l=>upcoming(l)&&(activeCategory==='todos'||category(l.categoria)===activeCategory)).sort((a,b)=>ms(a.fechaInicio)-ms(b.fechaInicio));const el=card.querySelector('.auction-card-countdown');if(el&&filtered[i])el.textContent=formatCountdown((ms(filtered[i].fechaInicio)-Date.now())/1000);});}
function notice(msg){const el=$('bidMessage');if(el){el.hidden=false;el.textContent=msg;}else alert(msg);}
$('bidButton')?.addEventListener('click',async()=>{
  if(!authReady)return notice('Verificando sesión...');
  if(!user){sessionStorage.setItem('subastandoFierrosDestino',location.href);location.href='login.html';return;}
  if(!profile?.activo||!profile?.membresiaActiva||!profile?.puedePujar)return notice('Necesitas una membresía activa y autorización para pujar.');
  if(!active||active.estado!=='en_vivo'||ms(active.fechaInicio)>Date.now()||auctionEndedLocally)return notice('La subasta todavía no está habilitada para pujar.');
  const amount=Number($('bidInput')?.value),lotId=active.id;
  if(!Number.isSafeInteger(amount)||amount<=0)return notice('Ingresa una cantidad válida.');
  const button=$('bidButton');button.disabled=true;
  try{
    await runTransaction(db,async tx=>{
      const ref=doc(db,'subastas',lotId);const snap=await tx.get(ref);
      if(!snap.exists())throw Error('La subasta ya no existe.');
      const l=snap.data(),start=ms(l.fechaInicio),round=Math.max(10,Number(l.duracionRonda)||120),last=ms(l.ultimaPujaFecha);
      if(l.estado!=='en_vivo'||start>Date.now()||Date.now()>=Math.max(start,last)+round*1000)throw Error('La subasta no está activa.');
      const minimum=Number(l.pujaActual??l.precioInicial??0)+Number(l.incrementoMinimo||500);
      if(amount<minimum)throw Error(`La puja mínima es ${money(minimum)}.`);
      const bidRef=doc(collection(db,'subastas',lotId,'pujas'));
      tx.update(ref,{pujaActual:amount,totalPujas:Number(l.totalPujas||0)+1,ultimaPujaUid:user.uid,ultimaPujaNombre:profile.nombre||user.displayName||'Usuario',ultimaPujaFecha:serverTimestamp()});
      tx.set(bidRef,{monto:amount,uid:user.uid,nombre:profile.nombre||user.displayName||'Usuario',fecha:serverTimestamp()});
    });notice('¡Puja registrada!');
  }catch(e){console.error('Error de puja:',e);notice(e?.message||'No se pudo registrar la puja.');}
  finally{updateBidButton();}
});

onSnapshot(collection(db,'subastas'),snap=>{lots=snap.docs.map(d=>({id:d.id,...d.data()}));refreshLive();renderList();},err=>{console.error('No se pudieron cargar subastas:',err);notice('Error al cargar subastas. Revisa la conexión o permisos de Firebase.');});
setInterval(()=>{tick();updateCardClocks();},1000);tick();

document.querySelectorAll('.category-card').forEach(b=>b.addEventListener('click',()=>{activeCategory=b.dataset.category||'todos';document.querySelectorAll('.category-card').forEach(x=>x.classList.toggle('active',x===b));renderList();$('proximas')?.scrollIntoView({behavior:'smooth'});}));
$('showAllAuctions')?.addEventListener('click',()=>{activeCategory='todos';document.querySelectorAll('.category-card').forEach(x=>x.classList.toggle('active',x.dataset.category==='todos'));renderList();});
const menu=$('mobileMenu');$('mobileMenuButton')?.addEventListener('click',()=>{if(menu)menu.hidden=!menu.hidden;});menu?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>menu.hidden=true));
document.querySelectorAll('.js-scroll-auctions').forEach(b=>b.addEventListener('click',()=>$('subastas')?.scrollIntoView({behavior:'smooth'})));
