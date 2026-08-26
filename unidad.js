const unitCatalog = {

  "aveo-2018": {

    name: "CHEVROLET AVEO",

    brand: "Chevrolet",

    model: "Aveo",

    year: 2018,

    version: "LT",

    lot: "SF-20018",

    status: "PRÓXIMAMENTE",

    transmission: "Manual",

    engine: "1.5L 4 cilindros",

    fuel: "Gasolina",

    mileage: "82,500 km",

    location: "Tultitlán, Edo. Méx.",

    vin: "3G1TA5AF0JL000001",

    saleCondition: "Se vende en el estado físico en que se encuentra",

    reserve: "$42,000 MXN",

    startingBid: 38000,

    minIncrement: 500,

    auctionDate: "2026-08-30T11:00:00-06:00",

    description: "Unidad lista para inspección. Presenta detalles normales de uso. Revisa fotografías, documentación y condiciones antes de participar.",

    conditions: ["Motor en funcionamiento","Llave disponible","Detalles ligeros de pintura","Interior completo"],

    documents: ["Factura","Tarjeta de circulación","Identificación del propietario","Comprobante de domicilio"],

    images: [

      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/sample.jpg",

      "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=1400&q=85",

      "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1400&q=85"

    ]

  },

  "jetta-2016": {

    name: "VOLKSWAGEN JETTA",

    brand: "Volkswagen",

    model: "Jetta",

    year: 2016,

    version: "Trendline",

    lot: "SF-20016",

    status: "PRÓXIMAMENTE",

    transmission: "Automática",

    engine: "2.0L 4 cilindros",

    fuel: "Gasolina",

    mileage: "104,300 km",

    location: "Naucalpan, Edo. Méx.",

    vin: "3VW2K7AJ0GM000001",

    saleCondition: "Venta sin garantía mecánica",

    reserve: "$58,000 MXN",

    startingBid: 52000,

    minIncrement: 500,

    auctionDate: "2026-08-30T14:00:00-06:00",

    description: "Jetta Trendline con documentación disponible. La unidad puede revisarse físicamente antes de la subasta.",

    conditions: ["Motor en funcionamiento","Aire acondicionado","Dos llaves","Detalle en fascia trasera"],

    documents: ["Factura","Tarjeta de circulación","Tenencias disponibles"],

    images: [

      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1400&q=85",

      "https://images.unsplash.com/photo-1542282088-fe8426682b8f?auto=format&fit=crop&w=1400&q=85",

      "https://images.unsplash.com/photo-1550355291-bbee04a92027?auto=format&fit=crop&w=1400&q=85"

    ]

  },

  "mazda3-2017": {

    name: "MAZDA 3",

    brand: "Mazda",

    model: "3",

    year: 2017,

    version: "i Sport",

    lot: "SF-20017",

    status: "PRÓXIMAMENTE",

    transmission: "Automática",

    engine: "2.0L Skyactiv",

    fuel: "Gasolina",

    mileage: "91,800 km",

    location: "Coacalco, Edo. Méx.",

    vin: "3MZBN1V70HM000001",

    saleCondition: "Unidad revisada visualmente",

    reserve: "$65,000 MXN",

    startingBid: 59000,

    minIncrement: 500,

    auctionDate: "2026-08-31T11:00:00-06:00",

    description: "Mazda 3 i Sport. Se muestran todos los detalles relevantes en la galería. La puja ganadora queda sujeta a las condiciones publicadas.",

    conditions: ["Encendido correcto","Interiores completos","Rines originales","Rayones leves"],

    documents: ["Factura","Tarjeta de circulación","Verificación disponible"],

    images: [

      "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1400&q=85",

      "https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1400&q=85",

      "https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=1400&q=85"

    ]

  },

  "civic-2015": {

    name: "HONDA CIVIC",

    brand: "Honda",

    model: "Civic",

    year: 2015,

    version: "EX",

    lot: "SF-20015",

    status: "PRÓXIMAMENTE",

    transmission: "Automática",

    engine: "1.8L i-VTEC",

    fuel: "Gasolina",

    mileage: "110,200 km",

    location: "Atizapán, Edo. Méx.",

    vin: "19XFB2F80FE000001",

    saleCondition: "Venta en condiciones actuales",

    reserve: "$70,000 MXN",

    startingBid: 63000,

    minIncrement: 500,

    auctionDate: "2026-08-31T14:00:00-06:00",

    description: "Honda Civic EX con detalles de uso. Consulta fotografías y documentos antes de realizar cualquier puja.",

    conditions: ["Motor funcionando","Quemacocos funcional","Interiores completos","Detalle de pintura"],

    documents: ["Factura","Tarjeta de circulación","Comprobante de pagos"],

    images: [

      "https://images.unsplash.com/photo-1550355291-bbee04a92027?auto=format&fit=crop&w=1400&q=85",

      "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1400&q=85",

      "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=1400&q=85"

    ]

  }

};

 

const money = new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN",maximumFractionDigits:0});

const params = new URLSearchParams(location.search);

const unitId = params.get("id") || "aveo-2018";

const unit = unitCatalog[unitId];

 

const $ = id => document.getElementById(id);

 

if(!unit){

  $("loadingState").hidden = true;

  $("errorState").hidden = false;

}else{

  $("loadingState").hidden = true;

  $("unitView").hidden = false;

  renderUnit(unit);

}

 

let currentPhoto = 0;

let countdownTimer = null;

 

function renderUnit(data){

  document.title = `${data.name} | Subastando Fierro`;

  $("unitStatus").textContent = data.status;

  $("unitName").textContent = data.name;

  $("unitSubtitle").textContent = `${data.year} | ${data.version}`;

  $("unitLot").textContent = data.lot;

  $("auctionDate").textContent = new Date(data.auctionDate).toLocaleString("es-MX",{dateStyle:"medium",timeStyle:"short"});

  $("startingBid").textContent = `${money.format(data.startingBid)} MXN`;

  $("minIncrement").textContent = `${money.format(data.minIncrement)} MXN`;

 

  $("brandValue").textContent = data.brand;

  $("modelValue").textContent = data.model;

  $("yearValue").textContent = data.year;

  $("versionValue").textContent = data.version;

  $("transmissionValue").textContent = data.transmission;

  $("engineValue").textContent = data.engine;

  $("fuelValue").textContent = data.fuel;

  $("mileageValue").textContent = data.mileage;

  $("locationValue").textContent = data.location;

  $("vinValue").textContent = data.vin;

  $("saleConditionValue").textContent = data.saleCondition;

  $("reserveValue").textContent = data.reserve;

  $("descriptionValue").textContent = data.description;

 

  $("conditionList").innerHTML = data.conditions.map(item => `<li>${item}</li>`).join("");

  $("documentList").innerHTML = data.documents.map(item => `<li>${item}</li>`).join("");

 

  currentPhoto = 0;

  renderGallery(data.images);

  startCountdown(data.auctionDate);

}

 

function renderGallery(images){

  $("thumbs").innerHTML = images.map((url,index)=>`

    <button class="thumb ${index===0?"active":""}" data-index="${index}">

      <img src="${url}" alt="Foto ${index+1}">

    </button>

  `).join("");

 

  $("thumbs").querySelectorAll(".thumb").forEach(btn=>{

    btn.addEventListener("click",()=>selectPhoto(Number(btn.dataset.index)));

  });

 

  selectPhoto(0);

}

 

function selectPhoto(index){

  const images = unit.images;

  currentPhoto = (index + images.length) % images.length;

  $("mainPhoto").src = images[currentPhoto];

  $("thumbs").querySelectorAll(".thumb").forEach((btn,i)=>btn.classList.toggle("active",i===currentPhoto));

}

 

$("prevPhoto")?.addEventListener("click",()=>selectPhoto(currentPhoto-1));

$("nextPhoto")?.addEventListener("click",()=>selectPhoto(currentPhoto+1));

 

function startCountdown(dateString){

  if(countdownTimer) clearInterval(countdownTimer);

  const target = new Date(dateString).getTime();

 

  function tick(){

    const diff = Math.max(0,target-Date.now());

    const days = Math.floor(diff/86400000);

    const hours = Math.floor((diff%86400000)/3600000);

    const minutes = Math.floor((diff%3600000)/60000);

    const seconds = Math.floor((diff%60000)/1000);

 

    $("days").textContent = String(days).padStart(2,"0");

    $("hours").textContent = String(hours).padStart(2,"0");

    $("minutes").textContent = String(minutes).padStart(2,"0");

    $("seconds").textContent = String(seconds).padStart(2,"0");

 

    if(diff<=0){

      clearInterval(countdownTimer);

      $("goAuctionButton").textContent = "🔴 SUBASTA EN VIVO";

    }

  }

 

  tick();

  countdownTimer = setInterval(tick,1000);

}

 

$("goAuctionButton")?.addEventListener("click",()=>{

  alert("La sala de subasta en vivo se conectará en la siguiente etapa.");

});
