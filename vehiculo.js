const currency = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0
});

const vehicles = {
  "aveo-2018": {
    id: "SF-AVE018",
    name: "CHEVROLET AVEO",
    year: 2018,
    version: "LT",
    brand: "Chevrolet",
    model: "Aveo",
    transmission: "Manual",
    mileage: "92,500 km",
    location: "Tultitlán, Edo. Méx.",
    condition: "Usado",
    color: "Por confirmar",
    fuel: "Gasolina",
    startingBid: 38000,
    auctionDate: "25 May 2026 · 11:00 AM",
    status: "PRÓXIMAMENTE",
    images: [
      "https://res.cloudinary.com/vobmt656/image/upload/v1787728525/144720522-el-fondo-de-noticias-es-perfecto-para-cualquier-tipo-de-presentaci%C3%B3n-de-noticias-o-informaci%C3%B3n-el-fo.webp"
    ],
    details: [
      "Unidad disponible para inspección",
      "Estado mecánico por confirmar",
      "Detalles estéticos visibles se mostrarán en fotografías",
      "Información sujeta a revisión antes de la subasta"
    ],
    documents: [
      "Factura / documento de propiedad por confirmar",
      "Tarjeta de circulación por confirmar",
      "Identificación del propietario por confirmar"
    ],
    notes: "Esta es la ficha inicial de prueba del Aveo 2018. Cuando subas las fotografías reales a Cloudinary, únicamente agregaremos sus URLs al arreglo images de esta unidad."
  },

  "jetta-2016": {
    id: "SF-JET016",
    name: "VOLKSWAGEN JETTA",
    year: 2016,
    version: "Trendline",
    brand: "Volkswagen",
    model: "Jetta",
    transmission: "Por confirmar",
    mileage: "Por confirmar",
    location: "Edo. Méx.",
    condition: "Usado",
    color: "Por confirmar",
    fuel: "Gasolina",
    startingBid: 52000,
    auctionDate: "25 May 2026 · 02:00 PM",
    status: "PRÓXIMAMENTE",
    images: [],
    details: [
      "Información de la unidad pendiente de captura"
    ],
    documents: [
      "Documentación pendiente de captura"
    ],
    notes: "Ficha preparada. Agrega las URLs de Cloudinary del Jetta dentro del arreglo images."
  }
};

const params = new URLSearchParams(window.location.search);
const vehicleKey = params.get("id") || "aveo-2018";
const vehicle = vehicles[vehicleKey];

const vehiclePage = document.getElementById("vehiclePage");
const vehicleNotFound = document.getElementById("vehicleNotFound");

if (!vehicle) {
  if (vehiclePage) vehiclePage.hidden = true;
  if (vehicleNotFound) vehicleNotFound.hidden = false;
} else {
  document.title = `${vehicle.name} ${vehicle.year} | Subastando Fierro`;

  document.getElementById("vehicleId").textContent = vehicle.id;
  document.getElementById("vehicleName").textContent = vehicle.name;
  document.getElementById("vehicleVersion").textContent = `${vehicle.year} | ${vehicle.version}`;
  document.getElementById("startingBid").textContent = currency.format(vehicle.startingBid);
  document.getElementById("auctionDate").textContent = vehicle.auctionDate;
  document.getElementById("mileage").textContent = vehicle.mileage;
  document.getElementById("transmission").textContent = vehicle.transmission;
  document.getElementById("location").textContent = vehicle.location;
  document.getElementById("condition").textContent = vehicle.condition;
  document.getElementById("statusBadge").textContent = vehicle.status;
  document.getElementById("vehicleNotes").textContent = vehicle.notes;

  const info = [
    ["Marca", vehicle.brand],
    ["Modelo", vehicle.model],
    ["Año", vehicle.year],
    ["Versión", vehicle.version],
    ["Transmisión", vehicle.transmission],
    ["Kilometraje", vehicle.mileage],
    ["Color", vehicle.color],
    ["Combustible", vehicle.fuel],
    ["Ubicación", vehicle.location]
  ];

  document.getElementById("vehicleInfo").innerHTML = info
    .map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`)
    .join("");

  document.getElementById("vehicleDetails").innerHTML =
    vehicle.details.map(item => `<li>${item}</li>`).join("");

  document.getElementById("vehicleDocuments").innerHTML =
    vehicle.documents.map(item => `<li>${item}</li>`).join("");

  const mainImage = document.getElementById("mainVehicleImage");
  const thumbs = document.getElementById("vehicleThumbs");

  const fallback =
    "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675">
        <rect width="100%" height="100%" fill="#111"/>
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
          fill="#777" font-family="Arial" font-size="38">IMAGEN PENDIENTE</text>
      </svg>`
    );

  const images =
    Array.isArray(vehicle.images) && vehicle.images.length
      ? vehicle.images
      : [fallback];

  mainImage.src = images[0];
  mainImage.alt = `${vehicle.name} ${vehicle.year}`;

  mainImage.addEventListener("error", () => {
    mainImage.src = fallback;
  }, { once: true });

  thumbs.innerHTML = images.map((url, index) => `
    <button class="thumb ${index === 0 ? "active" : ""}" data-index="${index}" type="button">
      <img src="${url}" alt="Foto ${index + 1} de ${vehicle.name}">
    </button>
  `).join("");

  [...thumbs.querySelectorAll(".thumb")].forEach(button => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.index);
      mainImage.src = images[index];

      [...thumbs.querySelectorAll(".thumb")].forEach(t => {
        t.classList.remove("active");
      });

      button.classList.add("active");
    });
  });

  document.getElementById("enterAuction").addEventListener("click", () => {
    alert("La subasta en vivo de esta unidad se conectará en la siguiente etapa.");
  });
}
