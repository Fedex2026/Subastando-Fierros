import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import {
  doc,
  getDoc,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  Timestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
/* =====================================================
   SUBASTAS PÚBLICAS DESDE FIRESTORE
   - El admin crea la subasta.
   - Si está "programada", aparece automáticamente
     en PRÓXIMAS SUBASTAS.
   - No se toca la subasta EN VIVO SF-10048 de arriba.
===================================================== */
let auctions=[];
let todasSubastas=[];
let subastaSeleccionada=null;
let unsubscribeSubasta=null;
let unsubscribePujas=null;
const defaultAuctionImage=
  "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=900&q=80";
function normalizarCategoriaSubasta(valor){
  const categoria=
    String(valor || "")
      .trim()
      .toLowerCase();
  if(
    categoria==="vehiculo" ||
    categoria==="auto" ||
    categoria==="autos"
  ){
    return "autos";
  }
  if(
    categoria==="moto" ||
    categoria==="motos"
  ){
    return "motos";
  }
  if(
    categoria==="maquinaria" ||
    categoria==="herramientas"
  ){
    return "herramientas";
  }
  return "otros";
}
function fechaSubastaMs(subasta){
  if(
    subasta.fechaInicio &&
    typeof subasta.fechaInicio.toMillis==="function"
  ){
    return subasta.fechaInicio.toMillis();
  }
  return 0;
}
function formatearFechaSubasta(fechaInicio){
  if(
    !fechaInicio ||
    typeof fechaInicio.toDate!=="function"
  ){
    return "Fecha por confirmar";
  }
  return fechaInicio
    .toDate()
    .toLocaleString(
      "es-MX",
      {
        dateStyle:"medium",
        timeStyle:"short"
      }
    );
}
function tiempoHastaSubasta(fechaMs){
  if(!fechaMs){
    return "Fecha por confirmar";
  }
  const diferencia=
    fechaMs-Date.now();
  if(diferencia<=0){
    return "Iniciando...";
  }
  const segundos=
    Math.floor(diferencia/1000);
  const dias=
    Math.floor(segundos/86400);
  const horas=
    Math.floor(
      (segundos%86400)/3600
    );
  const minutos=
    Math.floor(
      (segundos%3600)/60
    );
  const seg=
    segundos%60;
  if(dias>0){
    return `${dias}d ${String(horas).padStart(2,"0")}h ${String(minutos).padStart(2,"0")}m`;
  }
  return `${String(horas).padStart(2,"0")}:${String(minutos).padStart(2,"0")}:${String(seg).padStart(2,"0")}`;
}
function cargarSubastasPublicas(){
  onSnapshot(
    collection(db,"subastas"),
    (snapshot)=>{
      todasSubastas=
        snapshot.docs
          .map(documento=>{
            const datos=
              documento.data();
            const fechaMs=
              fechaSubastaMs(datos);
            const fotos=
              Array.isArray(datos.fotos)
                ? datos.fotos
                : [];
            return {
              id:documento.id,
              category:
                normalizarCategoriaSubasta(
                  datos.categoria
                ),
              name:
                `${datos.marca || ""} ${datos.modelo || ""}`
                  .trim()
                  .toUpperCase() ||
                documento.id,
              year:
                [
                  datos.anio || "",
                  datos.version || ""
                ]
                  .filter(Boolean)
                  .join(" | "),
              fotos: fotos.map(f => typeof f === "string" ? f : (f?.secure_url || f?.url || "")).filter(Boolean),
              datos,
              image:
                (typeof fotos[0] === "string" ? fotos[0] : (fotos[0]?.secure_url || fotos[0]?.url)) ||
                datos.fotoPortada || datos.imagenPortada ||
                defaultAuctionImage,
              date:
                formatearFechaSubasta(
                  datos.fechaInicio
                ),
              dateMs:fechaMs,
              price:
                Number(
                  datos.precioInicial ??
                  datos.pujaActual ??
                  0
                ),
              estado:
                String(
                  datos.estado || ""
                )
            };
          });
 
      auctions=todasSubastas
          .filter(subasta=>
            subasta.estado==="programada"
          )
          .sort(
            (a,b)=>
              (a.dateMs || Infinity)-
              (b.dateMs || Infinity)
          );
      renderAuctionList(activeCategory);
      seleccionarSubasta();
    },
    (error)=>{
      console.error(
        "Error cargando subastas públicas:",
        error
      );
      auctions=[];
      todasSubastas=[];
      renderAuctionList(activeCategory);
      seleccionarSubasta();
      seleccionarSubasta();
    }
  );
}
const currency=new Intl.NumberFormat("es-MX",{
  style:"currency",
  currency:"MXN",
  maximumFractionDigits:0
});
let activeCategory="todos";
const categoryNames={
  todos:"todas las categorías",
  autos:"autos",
  motos:"motos",
  electronica:"electrónica",
  herramientas:"herramientas y maquinaria",
  relojes:"relojes y joyería",
  lotes:"lotes y mercancía",
  hogar:"hogar"
};
/* =====================================================
   SESIÓN Y MEMBRESÍA
===================================================== */
let usuarioActual = null;
let perfilUsuario = null;
let authCargado = false;
// Mantiene sincronizados los accesos visibles con Firebase Authentication.
function actualizarAccesosSesion(usuario) {
  document.querySelectorAll('a[href]').forEach(enlace => {
    const destino = enlace.getAttribute('href') || '';
    if (!/(^|\/)login\.html(?:[?#].*)?$/i.test(destino)) return;
    if (!enlace.dataset.textoSinSesion) {
      enlace.dataset.textoSinSesion = enlace.textContent;
    }
    if (usuario) {
      enlace.textContent = 'SESIÓN ACTIVA';
      enlace.removeAttribute('href');
      enlace.setAttribute('aria-label', 'Sesión iniciada');
      enlace.style.cursor = 'default';
    } else {
      enlace.textContent = enlace.dataset.textoSinSesion;
      enlace.setAttribute('href', destino);
      enlace.removeAttribute('aria-label');
      enlace.style.cursor = '';
    }
  });
}
onAuthStateChanged(auth, async (usuario) => {
  usuarioActual = usuario;
  perfilUsuario = null;
  if (usuario) {
    try {
      const usuarioSnap = await getDoc(
        doc(db, "usuarios", usuario.uid)
      );
      if (usuarioSnap.exists()) {
        perfilUsuario = usuarioSnap.data();
      }
    } catch (error) {
      console.error(
        "Error al consultar perfil del usuario:",
        error
      );
    }
  }
  authCargado = true;
  actualizarAccesosSesion(usuario);
});
function renderAuctionList(category=activeCategory){
  const c=document.getElementById("auctionList");
  if(!c)return;
  const filtered=category==="todos"
    ? auctions
    : auctions.filter(i=>i.category===category);
  const label=document.getElementById("auctionCategoryLabel");
  if(label){
    label.textContent=category==="todos"
      ? "Mostrando todas las subastas disponibles."
      : `Mostrando subastas de ${categoryNames[category] || category}.`;
  }
  if(!filtered.length){
    c.innerHTML=`
      <div class="auction-empty-state">
        <span>🔨</span>
        <strong>AÚN NO HAY SUBASTAS EN ESTA CATEGORÍA</strong>
        <p>Muy pronto aparecerán nuevas oportunidades de ${categoryNames[category] || "esta categoría"}.</p>
      </div>
    `;
    return;
  }
  c.innerHTML=filtered.map(i=>`
    <article
      class="auction-card"
      data-vehicle-id="${i.id}"
      data-category="${i.category}"
      data-start-ms="${i.dateMs || ""}"
      tabindex="0"
      role="link"
      aria-label="Ver ${i.name}"
    >
      <div class="auction-card-image">
        <span class="upcoming-badge">
          PRÓXIMAMENTE
        </span>
        <img
          src="${i.image}"
          alt="${i.name}"
        >
      </div>
      <div class="auction-card-body">
        <h3>${i.name}</h3>
        <div class="sub">
          ${i.year}
        </div>
        <div class="row">
          <span>
            Inicia en:
          </span>
          <span>
            🕐 <strong class="auction-card-countdown">${tiempoHastaSubasta(i.dateMs)}</strong>
          </span>
        </div>
        <div class="row">
          <span>
            Fecha:
          </span>
          <span>
            ${i.date}
          </span>
        </div>
        <div class="row">
          <span>
            Puja inicial:
          </span>
          <span class="price">
            ${currency.format(i.price)}
          </span>
        </div>
      </div>
    </article>
  `).join("");
  c.querySelectorAll(".auction-card").forEach(card=>{
    const openVehicle=()=>{
      const id=card.dataset.vehicleId;
      window.location.href=
        `/Subastando-Fierros/vehiculo.html?id=${encodeURIComponent(id)}`;
    };
    card.addEventListener(
      "click",
      openVehicle
    );
    card.addEventListener(
      "keydown",
      e=>{
        if(
          e.key==="Enter" ||
          e.key===" "
        ){
          e.preventDefault();
          openVehicle();
        }
      }
    );
  });
}
cargarSubastasPublicas();
document.querySelectorAll(".category-card").forEach(button=>{
  button.addEventListener("click",()=>{
    activeCategory=
      button.dataset.category || "todos";
    document.querySelectorAll(".category-card").forEach(item=>{
      item.classList.toggle(
        "active",
        item===button
      );
    });
    renderAuctionList(activeCategory);
    document
      .getElementById("proximas")
      ?.scrollIntoView({
        behavior:"smooth",
        block:"start"
      });
  });
});
document
  .getElementById("showAllAuctions")
  ?.addEventListener("click",()=>{
    activeCategory="todos";
    document.querySelectorAll(".category-card").forEach(item=>{
      item.classList.toggle(
        "active",
        item.dataset.category==="todos"
      );
    });
    renderAuctionList("todos");
  });
function actualizarRelojesTarjetas(){
  document
    .querySelectorAll(".auction-card")
    .forEach(card=>{
      const reloj=
        card.querySelector(
          ".auction-card-countdown"
        );
      if(!reloj){
        return;
      }
      const fechaMs=
        Number(
          card.dataset.startMs || 0
        );
      reloj.textContent=
        tiempoHastaSubasta(
          fechaMs
        );
    });
}
setInterval(
  actualizarRelojesTarjetas,
  1000
);
const menuButton=
  document.getElementById("mobileMenuButton");
const mobileMenu=
  document.getElementById("mobileMenu");
menuButton?.addEventListener("click",()=>{
  mobileMenu.hidden=
    !mobileMenu.hidden;
});
mobileMenu?.querySelectorAll("a").forEach(a=>
  a.addEventListener(
    "click",
    ()=>mobileMenu.hidden=true
  )
);
/*
  Esto se puede quedar.
  Ya no afecta login/registro porque quitamos
  js-pending de esos botones en index.html.
*/
document.querySelectorAll(".js-pending").forEach(b=>
  b.addEventListener("click",()=>
    alert(
      "Esta función se conectará próximamente."
    )
  )
);
document
  .querySelector(".js-scroll-auctions")
  ?.addEventListener("click",()=>
    document
      .getElementById("subastas")
      ?.scrollIntoView({
        behavior:"smooth"
      })
  );
const thumbs=[
  ...document.querySelectorAll(".thumb")
];
const mainImage=
  document.getElementById("mainAuctionImage");
let currentImageIndex=0;
function selectImage(index){
  if(!thumbs.length)return;
  currentImageIndex=
    (index+thumbs.length)%thumbs.length;
  thumbs.forEach((t,i)=>
    t.classList.toggle(
      "active",
      i===currentImageIndex
    )
  );
  const url=
    thumbs[currentImageIndex].dataset.image;
  if(mainImage&&url){
    mainImage.src=url;
  }
}
thumbs.forEach((t,i)=>
  t.addEventListener(
    "click",
    ()=>selectImage(i)
  )
);
document
  .getElementById("prevImage")
  ?.addEventListener("click",()=>
    selectImage(
      currentImageIndex-1
    )
  );
document
  .getElementById("nextImage")
  ?.addEventListener("click",()=>
    selectImage(
      currentImageIndex+1
    )
  );
/* =====================================================
   EN VIVO DINÁMICO · SIN SUBASTAS DE EJEMPLO
   IMPORTANTE: esta interfaz no modifica estados de Firestore.
   Un backend seguro debe activar/cerrar la subasta y validar pujas.
===================================================== */
const LIVE_BID_SECONDS = 120;
const $ = id => document.getElementById(id);
const moneda = value => currency.format(Number(value) || 0);
let currentBid=0, bidCount=0, minIncrement=500;
let estadoSubasta="programada", subastaExiste=false;
let ultimoDato=null, esperandoPuja=false;
 
function ponerTexto(id, valor) { const el=$(id); if(el) el.textContent=String(valor); }
function fechaMs(valor) { return valor && typeof valor.toMillis==="function" ? valor.toMillis() : 0; }
function escaparTexto(s) { return String(s ?? ""); }
function fotosDe(subasta) {
  const d=subasta?.datos || {};
  const todas=[d.fotoPortada,d.imagenPortada,...(subasta?.fotos || [])];
  return [...new Set(todas.filter(x=>typeof x==="string" && /^https:\/\//i.test(x)))];
}
function cambiarGaleria(subasta) {
  const fotos=fotosDe(subasta);
  const imagen=$("mainAuctionImage");
  const strip=document.querySelector(".thumb-strip");
  if(imagen) {
    if(fotos.length) { imagen.src=fotos[0]; imagen.hidden=false; }
    else { imagen.removeAttribute("src"); imagen.hidden=true; }
    imagen.alt=subasta?.name || "Subasta";
  }
  if(!strip) return;
  strip.innerHTML="";
  if(!fotos.length) return;
  const anterior=document.createElement("button"); anterior.className="gallery-arrow"; anterior.textContent="‹";
  const siguiente=document.createElement("button"); siguiente.className="gallery-arrow"; siguiente.textContent="›";
  let actual=0;
  const botones=fotos.map((url,i)=>{
    const b=document.createElement("button"); b.className="thumb"; b.type="button";
    const img=document.createElement("img"); img.src=url; img.alt=`Foto ${i+1}`;
    b.appendChild(img);
    b.addEventListener("click",()=>mostrar(i));
    return b;
  });
  function mostrar(i) {
    actual=(i+fotos.length)%fotos.length;
    imagen.src=fotos[actual];
    botones.forEach((b,n)=>b.classList.toggle("active",n===actual));
  }
  anterior.addEventListener("click",()=>mostrar(actual-1));
  siguiente.addEventListener("click",()=>mostrar(actual+1));
  strip.append(anterior,...botones,siguiente);
  mostrar(0);
}
function mostrarDatos(subasta) {
  const d=subasta?.datos || {};
  ponerTexto("liveVehicleName",subasta?.name || "PRÓXIMAMENTE");
  ponerTexto("liveVehicleVersion",subasta?.year || "Sin subastas en vivo por el momento");
  ponerTexto("liveLotId",subasta ? `ID: ${subasta.id}` : "");
  const info=$("liveVehicleInfo");
  if(info) {
    info.replaceChildren();
    if(subasta) for(const [titulo,valor] of [
      ["Marca",d.marca],["Modelo",d.modelo],["Año",d.anio],["Versión",d.version],
      ["Transmisión",d.transmision],["Kilometraje",d.kilometraje],["Ubicación",d.ubicacion]
    ]) {
      const div=document.createElement("div"), dt=document.createElement("dt"),dd=document.createElement("dd");
      dt.textContent=titulo+":"; dd.textContent=escaparTexto(valor || "Por confirmar");
      div.append(dt,dd); info.appendChild(div);
    }
  }
  const detalles=$("liveVehicleDetails");
  if(detalles) {
    detalles.replaceChildren();
    if(subasta) for(const valor of [d.condicion,d.descripcion,d.observaciones,d.danosEsteticos,d.danosMecanicos].filter(Boolean)) {
      const li=document.createElement("li"); li.textContent=escaparTexto(valor); detalles.appendChild(li);
    }
  }
  const docs=$("liveVehicleDocuments");
  if(docs) {
    docs.replaceChildren();
    if(subasta) for(const valor of [d.tipoFactura && `Factura: ${d.tipoFactura}`,d.tarjetaCirculacion && `Tarjeta de circulación: ${d.tarjetaCirculacion}`].filter(Boolean)) {
      const li=document.createElement("li"); li.textContent=escaparTexto(valor); docs.appendChild(li);
    }
  }
  cambiarGaleria(subasta);
}
function seleccionarSubasta() {
  const ahora=Date.now();
  const activas=todasSubastas.filter(s=>s.estado==="en_vivo")
    .sort((a,b)=>a.dateMs-b.dateMs);
  const proxima=todasSubastas.filter(s=>s.estado==="programada" && s.dateMs>ahora)
    .sort((a,b)=>a.dateMs-b.dateMs)[0];
  const seleccion=activas[0] || (proxima && proxima.dateMs-ahora<=300000 ? proxima : null);
  if(seleccion?.id===subastaSeleccionada?.id) return;
  if(unsubscribeSubasta) {unsubscribeSubasta(); unsubscribeSubasta=null;}
  if(unsubscribePujas) {unsubscribePujas(); unsubscribePujas=null;}
  subastaSeleccionada=seleccion || null;
  ultimoDato=seleccion?.datos || null;
  subastaExiste=!!seleccion;
  estadoSubasta=seleccion?.estado || "programada";
  currentBid=Number(ultimoDato?.pujaActual ?? ultimoDato?.precioInicial ?? 0);
  bidCount=Number(ultimoDato?.totalPujas || 0);
  minIncrement=Number(ultimoDato?.incrementoMinimo || 500);
  mostrarDatos(seleccion);
  mostrarPuja();
  const historial=$("bidHistory"); if(historial) historial.replaceChildren();
  if(!seleccion) { actualizarRelojPrincipal(); return; }
  const ref=doc(db,"subastas",seleccion.id);
  unsubscribeSubasta=onSnapshot(ref,snap=>{
    if(!snap.exists()) { seleccionarSubasta(); return; }
    ultimoDato=snap.data();
    estadoSubasta=ultimoDato.estado || "programada";
    currentBid=Number(ultimoDato.pujaActual ?? ultimoDato.precioInicial ?? 0);
    bidCount=Number(ultimoDato.totalPujas || 0);
    minIncrement=Number(ultimoDato.incrementoMinimo || 500);
    mostrarPuja(); actualizarRelojPrincipal();
    if(estadoSubasta==="finalizada") { seleccionarSubasta(); }
  },error=>console.error("Error leyendo subasta:",error));
  unsubscribePujas=onSnapshot(query(collection(db,"subastas",seleccion.id,"pujas"),orderBy("fecha","desc"),limit(5)),snap=>{
    if(!historial) return;
    historial.replaceChildren();
    snap.docs.forEach((docu,i)=>{
      const d=docu.data(); const fila=document.createElement("div");
      for(const texto of [String(i+1),d.nombre || "Usuario",moneda(d.monto),d.fecha?.toDate?.().toLocaleTimeString("es-MX") || "--:--"]){
        const span=document.createElement("span"); span.textContent=texto; fila.appendChild(span);
      }
      historial.appendChild(fila);
    });
  },error=>console.error("Error leyendo pujas:",error));
}
function mostrarPuja() {
  ponerTexto("currentBid",moneda(currentBid));
  ponerTexto("liveMinIncrement",moneda(minIncrement));
  ponerTexto("bidCount",bidCount);
  ponerTexto("participants","—"); // No inventamos número de participantes.
  const input=$("bidInput"); if(input && !esperandoPuja) input.value=currentBid+minIncrement;
}
function pintarTiempo(segundos) {
  const n=Math.max(0,Math.ceil(segundos));
  ponerTexto("hours",String(Math.floor(n/3600)).padStart(2,"0"));
  ponerTexto("minutes",String(Math.floor((n%3600)/60)).padStart(2,"0"));
  ponerTexto("seconds",String(n%60).padStart(2,"0"));
}
function actualizarRelojPrincipal() {
  const vacio=$("liveEmptyState"), contenido=$("liveAuctionContent");
  const subasta=subastaSeleccionada;
  if(vacio) vacio.hidden=!!subasta;
  if(contenido) contenido.hidden=!subasta;
  if(!subasta) return;
  const ahora=Date.now();
  const programada=estadoSubasta!=="en_vivo";
  const inicio=subasta.dateMs;
  const aviso=$("liveStatusBadge");
  const boton=$("bidButton");
  const barra=$("auctionTimeBar"), relleno=$("auctionTimeBarFill");
  let segundos=0;
  if(programada) {
    segundos=Math.max(0,(inicio-ahora)/1000);
    const mins=Math.ceil(segundos/60);
    ponerTexto("countdownLabel",segundos<=60 ? "¡ÚLTIMO MINUTO!" : segundos<=180 ? "¡FALTAN 3 MINUTOS O MENOS!" : "LA SUBASTA COMIENZA EN:");
    if(aviso) aviso.textContent="PRÓXIMAMENTE";
    if(barra) barra.hidden=true;
  } else {
    const ultima=fechaMs(ultimoDato?.ultimaPujaFecha);
    const fin=fechaMs(ultimoDato?.fechaFinPujas) || ((ultima || inicio)+LIVE_BID_SECONDS*1000);
    segundos=Math.max(0,(fin-ahora)/1000);
    ponerTexto("countdownLabel",segundos>0 ? "EN VIVO · TIEMPO PARA PUJAR:" : "TIEMPO AGOTADO · ESPERANDO CIERRE");
    if(aviso) aviso.textContent=segundos>0 ? "EN VIVO" : "CIERRE PENDIENTE";
    if(barra) barra.hidden=false;
    if(relleno) relleno.style.width=`${Math.min(100,segundos/LIVE_BID_SECONDS*100)}%`;
  }
  pintarTiempo(segundos);
  if(boton) {
    boton.disabled=esperandoPuja || programada || segundos<=0;
    boton.textContent=programada ? "SUBASTA PROGRAMADA" : segundos<=0 ? "ESPERANDO CIERRE" : esperandoPuja ? "REGISTRANDO PUJA..." : "🔨 PUJAR AHORA";
  }
}
setInterval(()=>{ seleccionarSubasta(); actualizarRelojPrincipal(); },1000);
actualizarRelojPrincipal();
 
// La verificación definitiva de membresía, importe y plazo debe estar en reglas/backend.
$("bidButton")?.addEventListener("click",async()=>{
  const mensaje=$("bidMessage");
  const avisar=s=>{if(mensaje){mensaje.hidden=false; mensaje.textContent=s;}};
  if(!authCargado) return avisar("Verificando tu sesión...");
  if(!usuarioActual) {
    sessionStorage.setItem("subastandoFierrosDestino",window.location.href);
    window.location.href="login.html"; return;
  }
  if(!perfilUsuario || perfilUsuario.activo===false) return avisar("No encontramos un perfil activo.");
  if(perfilUsuario.membresiaActiva!==true || perfilUsuario.puedePujar!==true) return avisar("Necesitas membresía activa para pujar.");
  if(!subastaSeleccionada || estadoSubasta!=="en_vivo") return avisar("No hay una subasta habilitada.");
  const monto=Number($("bidInput")?.value);
  if(!Number.isFinite(monto) || monto<=0 || monto<currentBid+minIncrement) return avisar(`La puja mínima es ${moneda(currentBid+minIncrement)}.`);
  esperandoPuja=true; actualizarRelojPrincipal();
  const id=subastaSeleccionada.id;
  try {
    await runTransaction(db,async tx=>{
      const ref=doc(db,"subastas",id);
      const snap=await tx.get(ref);
      if(!snap.exists()) throw new Error("Subasta no encontrada");
      const d=snap.data();
      const fin=fechaMs(d.fechaFinPujas) || ((fechaMs(d.ultimaPujaFecha) || fechaMs(d.fechaInicio))+LIVE_BID_SECONDS*1000);
      if(d.estado!=="en_vivo" || Date.now()>=fin) throw new Error("Subasta cerrada o tiempo agotado");
      const minimo=Number(d.pujaActual ?? d.precioInicial ?? 0)+Number(d.incrementoMinimo || 500);
      if(monto<minimo) throw new Error(`La puja mínima ahora es ${moneda(minimo)}`);
      const nombre=perfilUsuario.nombre || usuarioActual.displayName || "Usuario";
      const pujaRef=doc(collection(db,"subastas",id,"pujas"));
      tx.update(ref,{pujaActual:monto,totalPujas:Number(d.totalPujas||0)+1,ultimaPujaUid:usuarioActual.uid,ultimaPujaNombre:nombre,ultimaPujaFecha:serverTimestamp()});
      tx.set(pujaRef,{uid:usuarioActual.uid,nombre,monto,fecha:serverTimestamp()});
    });
    avisar(`Puja registrada: ${moneda(monto)}.`);
  } catch(e) {console.error(e); avisar(e.code==="permission-denied" ? "Firebase rechazó la puja. Revisa las reglas de seguridad." : e.message || "No se pudo registrar la puja.");}
  finally { esperandoPuja=false; actualizarRelojPrincipal(); }
});
 
window.addEventListener("resize",()=>{
  if(
    window.innerWidth>720 &&
    mobileMenu
  ){
    mobileMenu.hidden=true;
  }
});
