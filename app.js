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
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";


const auctions=[
  {
    id:"aveo-2018",
    category:"autos",
    name:"CHEVROLET AVEO",
    year:"2018 | LT",
    image:"https://res.cloudinary.com/vobmt656/image/upload/v1787728525/144720522-el-fondo-de-noticias-es-perfecto-para-cualquier-tipo-de-presentaci%C3%B3n-de-noticias-o-informaci%C3%B3n-el-fo.webp",
    date:"25 May 2026 · 11:00 AM",
    price:38000
  },
  {
    id:"jetta-2016",
    category:"autos",
    name:"VOLKSWAGEN JETTA",
    year:"2016 | Trendline",
    image:"https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=80",
    date:"25 May 2026 · 02:00 PM",
    price:52000
  },
  {
    id:"mazda-3-2017",
    category:"autos",
    name:"MAZDA 3",
    year:"2017 | i Sport",
    image:"https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=900&q=80",
    date:"26 May 2026 · 11:00 AM",
    price:59000
  },
  {
    id:"honda-civic-2015",
    category:"autos",
    name:"HONDA CIVIC",
    year:"2015 | EX",
    image:"https://images.unsplash.com/photo-1550355291-bbee04a92027?auto=format&fit=crop&w=900&q=80",
    date:"26 May 2026 · 02:00 PM",
    price:63000
  }
];


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
            🕐 ${i.date}
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


renderAuctionList();


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


let remainingSeconds=
  18*60+34;


function updateCountdown(){

  const h=
    Math.floor(
      remainingSeconds/3600
    );

  const m=
    Math.floor(
      (remainingSeconds%3600)/60
    );

  const s=
    remainingSeconds%60;


  document
    .getElementById("hours")
    .textContent=
      String(h).padStart(2,"0");


  document
    .getElementById("minutes")
    .textContent=
      String(m).padStart(2,"0");


  document
    .getElementById("seconds")
    .textContent=
      String(s).padStart(2,"0");


  if(remainingSeconds>0){

    remainingSeconds--;

  }else{

    const b=
      document.getElementById("bidButton");


    if(b){

      b.disabled=true;

      b.textContent=
        "SUBASTA FINALIZADA";

    }

  }

}


updateCountdown();

setInterval(
  updateCountdown,
  1000
);


/* =====================================================
   SUBASTA EN FIRESTORE
===================================================== */

const subastaActualId="SF-10048";

const subastaRef=
  doc(
    db,
    "subastas",
    subastaActualId
  );


let currentBid=42500;
let bidCount=20;
let minIncrement=500;
let subastaExiste=false;
let estadoSubasta="en_vivo";


function renderBid(){

  document
    .getElementById("currentBid")
    .innerHTML=
      `${currency.format(currentBid)} <small>MXN</small>`;


  document
    .getElementById("bidInput")
    .value=
      currentBid+minIncrement;


  document
    .getElementById("bidCount")
    .textContent=
      bidCount;

}


/* =====================================================
   ESCUCHAR SUBASTA EN TIEMPO REAL
===================================================== */

onSnapshot(
  subastaRef,
  (snapshot)=>{

    if(!snapshot.exists()){

      subastaExiste=false;

      console.warn(
        "La subasta SF-10048 todavía no existe en Firestore."
      );

      return;

    }


    subastaExiste=true;


    const datos=
      snapshot.data();


    if(
      typeof datos.pujaActual==="number"
    ){

      currentBid=
        datos.pujaActual;

    }


    if(
      typeof datos.totalPujas==="number"
    ){

      bidCount=
        datos.totalPujas;

    }


    if(
      typeof datos.incrementoMinimo==="number"
    ){

      minIncrement=
        datos.incrementoMinimo;

    }


    if(
      typeof datos.estado==="string"
    ){

      estadoSubasta=
        datos.estado;

    }


    renderBid();


    const bidButton=
      document.getElementById("bidButton");


    if(
      bidButton &&
      estadoSubasta==="finalizada"
    ){

      bidButton.disabled=true;

      bidButton.textContent=
        "SUBASTA FINALIZADA";

    }

  },
  (error)=>{

    console.error(
      "Error escuchando la subasta:",
      error
    );

  }
);


/* =====================================================
   HISTORIAL DE PUJAS EN TIEMPO REAL
===================================================== */

const historialQuery=
  query(
    collection(
      db,
      "subastas",
      subastaActualId,
      "pujas"
    ),
    orderBy(
      "fecha",
      "desc"
    ),
    limit(5)
  );


onSnapshot(
  historialQuery,
  (snapshot)=>{

    if(snapshot.empty){
      return;
    }


    const history=
      document.getElementById("bidHistory");


    if(!history){
      return;
    }


    history.innerHTML="";


    snapshot.docs.forEach(
      (documento,index)=>{

        const datos=
          documento.data();


        let hora="--:--:--";


        if(
          datos.fecha &&
          typeof datos.fecha.toDate==="function"
        ){

          hora=
            datos.fecha
              .toDate()
              .toLocaleTimeString(
                "es-MX",
                {
                  hour:"2-digit",
                  minute:"2-digit",
                  second:"2-digit"
                }
              );

        }


        const row=
          document.createElement("div");


        const posicion=
          document.createElement("span");

        posicion.textContent=
          index+1;


        const usuario=
          document.createElement("span");

        usuario.textContent=
          datos.nombre ||
          "Usuario";


        const monto=
          document.createElement("strong");

        monto.textContent=
          currency.format(
            Number(datos.monto) || 0
          );


        const fecha=
          document.createElement("small");

        fecha.textContent=
          hora;


        row.appendChild(posicion);
        row.appendChild(usuario);
        row.appendChild(monto);
        row.appendChild(fecha);


        history.appendChild(row);

      }
    );

  },
  (error)=>{

    console.error(
      "Error escuchando historial de pujas:",
      error
    );

  }
);


/* =====================================================
   BOTÓN PUJAR
===================================================== */

document
  .getElementById("bidButton")
  ?.addEventListener("click",async()=>{


    const message=
      document.getElementById("bidMessage");


    /*
      Esperar a que Firebase confirme
      si hay usuario logueado.
    */

    if(!authCargado){

      message.hidden=false;

      message.textContent=
        "Verificando tu sesión...";

      return;

    }


    /* ---------------------------------------------
       1. NO HA INICIADO SESIÓN
    --------------------------------------------- */

    if(!usuarioActual){

      sessionStorage.setItem(
        "subastandoFierrosDestino",
        window.location.href
      );


      window.location.href=
        "login.html";

      return;

    }


    /* ---------------------------------------------
       2. NO EXISTE PERFIL FIRESTORE
    --------------------------------------------- */

    if(!perfilUsuario){

      message.hidden=false;

      message.textContent=
        "No encontramos tu perfil de usuario.";

      return;

    }


    /* ---------------------------------------------
       3. CUENTA DESACTIVADA
    --------------------------------------------- */

    if(perfilUsuario.activo===false){

      message.hidden=false;

      message.textContent=
        "Tu cuenta está desactivada.";

      return;

    }


    /* ---------------------------------------------
       4. MEMBRESÍA NO ACTIVA
    --------------------------------------------- */

    if(
      perfilUsuario.membresiaActiva !== true ||
      perfilUsuario.puedePujar !== true
    ){

      message.hidden=false;

      message.textContent=
        "Tu membresía no está activa. Necesitas una membresía activa para pujar.";

      return;

    }


    /* ---------------------------------------------
       5. COMPROBAR SUBASTA
    --------------------------------------------- */

    if(!subastaExiste){

      message.hidden=false;

      message.textContent=
        "La subasta todavía no está configurada en Firebase.";

      return;

    }


    if(estadoSubasta!=="en_vivo"){

      message.hidden=false;

      message.textContent=
        "Esta subasta no está disponible para recibir pujas.";

      return;

    }


    /* ---------------------------------------------
       6. VALIDAR MONTO
    --------------------------------------------- */

    const input=
      document.getElementById("bidInput");


    const value=
      Number(
        String(input.value)
          .replace(/[^\d.]/g,"")
      );


    if(!Number.isFinite(value)){

      message.hidden=false;

      message.textContent=
        "Ingresa una cantidad válida.";

      return;

    }


    if(value<currentBid+minIncrement){

      message.hidden=false;

      message.textContent=
        `La nueva puja debe ser mínimo de ${currency.format(currentBid+minIncrement)}.`;

      return;

    }


    /* ---------------------------------------------
       7. REGISTRAR PUJA REAL
    --------------------------------------------- */

    const bidButton=
      document.getElementById("bidButton");


    bidButton.disabled=true;

    bidButton.textContent=
      "REGISTRANDO PUJA...";


    const nombreUsuario=
      perfilUsuario.nombre ||
      usuarioActual.displayName ||
      "Usuario";


    try{

      await runTransaction(
        db,
        async(transaction)=>{


          const subastaSnapshot=
            await transaction.get(
              subastaRef
            );


          if(!subastaSnapshot.exists()){

            throw new Error(
              "subasta-no-existe"
            );

          }


          const datosSubasta=
            subastaSnapshot.data();


          if(
            datosSubasta.estado!=="en_vivo"
          ){

            throw new Error(
              "subasta-no-disponible"
            );

          }


          const pujaActualRemota=
            Number(
              datosSubasta.pujaActual
            ) || 0;


          const incrementoRemoto=
            Number(
              datosSubasta.incrementoMinimo
            ) || 500;


          const minimoPermitido=
            pujaActualRemota+
            incrementoRemoto;


          if(
            value<minimoPermitido
          ){

            throw new Error(
              `puja-minima:${minimoPermitido}`
            );

          }


          const totalPujasActual=
            Number(
              datosSubasta.totalPujas
            ) || 0;


          const nuevaPujaRef=
            doc(
              collection(
                db,
                "subastas",
                subastaActualId,
                "pujas"
              )
            );


          transaction.update(
            subastaRef,
            {

              pujaActual:value,

              totalPujas:
                totalPujasActual+1,

              ultimaPujaUid:
                usuarioActual.uid,

              ultimaPujaNombre:
                nombreUsuario,

              ultimaPujaFecha:
                serverTimestamp()

            }
          );


          transaction.set(
            nuevaPujaRef,
            {

              uid:
                usuarioActual.uid,

              nombre:
                nombreUsuario,

              monto:
                value,

              fecha:
                serverTimestamp()

            }
          );

        }
      );


      message.hidden=false;

      message.textContent=
        `Puja registrada por ${currency.format(value)}.`;


    }catch(error){

      console.error(
        "Error registrando puja:",
        error
      );


      message.hidden=false;


      if(
        error.message.startsWith(
          "puja-minima:"
        )
      ){

        const minimo=
          Number(
            error.message.split(":")[1]
          );


        message.textContent=
          `Alguien acaba de superar la puja. La nueva puja mínima es ${currency.format(minimo)}.`;


      }else if(
        error.message===
        "subasta-no-existe"
      ){

        message.textContent=
          "La subasta no existe en Firebase.";


      }else if(
        error.message===
        "subasta-no-disponible"
      ){

        message.textContent=
          "Esta subasta ya no está disponible para recibir pujas.";


      }else if(
        error.code===
        "permission-denied"
      ){

        message.textContent=
          "Firebase no permitió registrar la puja.";


      }else{

        message.textContent=
          "No se pudo registrar la puja. Intenta nuevamente.";

      }

    }finally{

      if(
        estadoSubasta==="en_vivo"
      ){

        bidButton.disabled=false;

        bidButton.textContent=
          "🔨 PUJAR AHORA";

      }

    }

  });


renderBid();


window.addEventListener("resize",()=>{

  if(
    window.innerWidth>720 &&
    mobileMenu
  ){

    mobileMenu.hidden=true;

  }

});
