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
    <article class="auction-card" data-vehicle-id="${i.id}" data-category="${i.category}" tabindex="0" role="link" aria-label="Ver ${i.name}">
      <div class="auction-card-image">
        <span class="upcoming-badge">PRÓXIMAMENTE</span>
        <img src="${i.image}" alt="${i.name}">
      </div>
      <div class="auction-card-body">
        <h3>${i.name}</h3>
        <div class="sub">${i.year}</div>
        <div class="row">
          <span>Inicia en:</span>
          <span>🕐 ${i.date}</span>
        </div>
        <div class="row">
          <span>Puja inicial:</span>
          <span class="price">${currency.format(i.price)}</span>
        </div>
      </div>
    </article>
  `).join("");

  c.querySelectorAll(".auction-card").forEach(card=>{
    const openVehicle=()=>{
      const id=card.dataset.vehicleId;
      window.location.href=`/Subastando-Fierros/vehiculo.html?id=${encodeURIComponent(id)}`;
    };

    card.addEventListener("click",openVehicle);
    card.addEventListener("keydown",e=>{
      if(e.key==="Enter"||e.key===" "){
        e.preventDefault();
        openVehicle();
      }
    });
  });
}

renderAuctionList();

document.querySelectorAll(".category-card").forEach(button=>{
  button.addEventListener("click",()=>{
    activeCategory=button.dataset.category || "todos";

    document.querySelectorAll(".category-card").forEach(item=>{
      item.classList.toggle("active",item===button);
    });

    renderAuctionList(activeCategory);
    document.getElementById("proximas")?.scrollIntoView({behavior:"smooth",block:"start"});
  });
});

document.getElementById("showAllAuctions")?.addEventListener("click",()=>{
  activeCategory="todos";
  document.querySelectorAll(".category-card").forEach(item=>{
    item.classList.toggle("active",item.dataset.category==="todos");
  });
  renderAuctionList("todos");
});

const menuButton=document.getElementById("mobileMenuButton"),
mobileMenu=document.getElementById("mobileMenu");

menuButton?.addEventListener("click",()=>mobileMenu.hidden=!mobileMenu.hidden);

mobileMenu?.querySelectorAll("a").forEach(a=>
  a.addEventListener("click",()=>mobileMenu.hidden=true)
);

document.querySelectorAll(".js-pending").forEach(b=>
  b.addEventListener("click",()=>
    alert("Login y registro se conectarán en la siguiente etapa.")
  )
);

document.querySelector(".js-scroll-auctions")?.addEventListener("click",()=>
  document.getElementById("subastas")?.scrollIntoView({behavior:"smooth"})
);

const thumbs=[...document.querySelectorAll(".thumb")],
mainImage=document.getElementById("mainAuctionImage");

let currentImageIndex=0;

function selectImage(index){
  if(!thumbs.length)return;
  currentImageIndex=(index+thumbs.length)%thumbs.length;
  thumbs.forEach((t,i)=>t.classList.toggle("active",i===currentImageIndex));
  const url=thumbs[currentImageIndex].dataset.image;
  if(mainImage&&url)mainImage.src=url;
}

thumbs.forEach((t,i)=>t.addEventListener("click",()=>selectImage(i)));

document.getElementById("prevImage")?.addEventListener("click",()=>
  selectImage(currentImageIndex-1)
);

document.getElementById("nextImage")?.addEventListener("click",()=>
  selectImage(currentImageIndex+1)
);

let remainingSeconds=18*60+34;

function updateCountdown(){
  const h=Math.floor(remainingSeconds/3600),
        m=Math.floor((remainingSeconds%3600)/60),
        s=remainingSeconds%60;

  document.getElementById("hours").textContent=String(h).padStart(2,"0");
  document.getElementById("minutes").textContent=String(m).padStart(2,"0");
  document.getElementById("seconds").textContent=String(s).padStart(2,"0");

  if(remainingSeconds>0){
    remainingSeconds--;
  }else{
    const b=document.getElementById("bidButton");
    if(b){
      b.disabled=true;
      b.textContent="SUBASTA FINALIZADA";
    }
  }
}

updateCountdown();
setInterval(updateCountdown,1000);

let currentBid=42500,
    bidCount=20;

const minIncrement=500;

function renderBid(){
  document.getElementById("currentBid").innerHTML=
    `${currency.format(currentBid)} <small>MXN</small>`;
  document.getElementById("bidInput").value=currentBid+minIncrement;
  document.getElementById("bidCount").textContent=bidCount;
}

document.getElementById("bidButton")?.addEventListener("click",()=>{
  const input=document.getElementById("bidInput"),
        message=document.getElementById("bidMessage"),
        value=Number(String(input.value).replace(/[^\d.]/g,""));

  if(!Number.isFinite(value)){
    message.hidden=false;
    message.textContent="Ingresa una cantidad válida.";
    return;
  }

  if(value<currentBid+minIncrement){
    message.hidden=false;
    message.textContent=
      `La nueva puja debe ser mínimo de ${currency.format(currentBid+minIncrement)}.`;
    return;
  }

  currentBid=value;
  bidCount++;
  renderBid();

  const now=new Date().toLocaleTimeString("es-MX",{
    hour:"2-digit",
    minute:"2-digit",
    second:"2-digit"
  });

  const history=document.getElementById("bidHistory"),
        row=document.createElement("div");

  row.innerHTML=
    `<span>1</span><span>Usuario_demo</span><strong>${currency.format(currentBid)}</strong><small>${now}</small>`;

  history.prepend(row);

  [...history.children].forEach((item,index)=>
    item.children[0].textContent=index+1
  );

  while(history.children.length>5){
    history.lastElementChild.remove();
  }

  message.hidden=false;
  message.textContent=`Puja demo registrada por ${currency.format(currentBid)}.`;
});

renderBid();

window.addEventListener("resize",()=>{
  if(window.innerWidth>720&&mobileMenu){
    mobileMenu.hidden=true;
  }
});
