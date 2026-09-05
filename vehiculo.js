import { db } from "./firebase-config.js";

 

import {

  doc,

  getDoc

} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

 

 

const currency = new Intl.NumberFormat("es-MX", {

  style: "currency",

  currency: "MXN",

  maximumFractionDigits: 0

});

 

 

const params = new URLSearchParams(window.location.search);

const vehicleKey = params.get("id");

 

const vehiclePage = document.getElementById("vehiclePage");

const vehicleNotFound = document.getElementById("vehicleNotFound");

 

 

const fallbackImage =

  "data:image/svg+xml;charset=UTF-8," +

  encodeURIComponent(

    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675">

      <rect width="100%" height="100%" fill="#111"/>

      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"

        fill="#777" font-family="Arial" font-size="38">IMAGEN PENDIENTE</text>

    </svg>`

  );

 

 

function mostrarNoEncontrado() {

  if (vehiclePage) vehiclePage.hidden = true;

  if (vehicleNotFound) vehicleNotFound.hidden = false;

}

 

 

function formatearFecha(fechaInicio) {

 

  if (

    !fechaInicio ||

    typeof fechaInicio.toDate !== "function"

  ) {

    return "Fecha por confirmar";

  }

 

  return fechaInicio

    .toDate()

    .toLocaleString("es-MX", {

      dateStyle: "medium",

      timeStyle: "short"

    });

 

}

 

 

function textoEstado(estado) {

 

  if (estado === "en_vivo") return "EN VIVO";

  if (estado === "finalizada") return "FINALIZADA";

  return "PRÓXIMAMENTE";

 

}

 

 

function datosFicha(datos, id) {

 

  const nombre =

    `${datos.marca || ""} ${datos.modelo || ""}`

      .trim()

      .toUpperCase() ||

    id;

 

  const anio =

    datos.anio || "Por confirmar";

 

  const version =

    datos.version || "Por confirmar";

 

  const ubicacion =

    datos.ubicacion || "Por confirmar";

 

  const descripcion =

    datos.descripcion ||

    "Información de la unidad pendiente de captura.";

 

  const precioInicial =

    Number(

      datos.precioInicial ??

      datos.pujaActual ??

      0

    );

 

  const fotos =

    Array.isArray(datos.fotos) &&

    datos.fotos.length

      ? datos.fotos

      : [fallbackImage];

 

  return {

    id,

    name: nombre,

    year: anio,

    version,

    brand: datos.marca || "Por confirmar",

    model: datos.modelo || "Por confirmar",

    transmission:

      datos.transmision ||

      "Por confirmar",

    mileage:

      datos.kilometraje ||

      "Por confirmar",

    location: ubicacion,

    condition:

      datos.condicion ||

      "Usado",

    color:

      datos.color ||

      "Por confirmar",

    fuel:

      datos.combustible ||

      "Por confirmar",

    startingBid: precioInicial,

    auctionDate:

      formatearFecha(

        datos.fechaInicio

      ),

    status:

      textoEstado(

        datos.estado

      ),

    images: fotos,

    details: [

      descripcion

    ],

    documents: [

      "Documentación pendiente de captura"

    ],

    notes: descripcion,

    estado:

      String(

        datos.estado || "programada"

      )

  };

 

}

 

 

function renderVehicle(vehicle) {

 

  if (!vehicle) {

    mostrarNoEncontrado();

    return;

  }

 

  if (vehiclePage) vehiclePage.hidden = false;

  if (vehicleNotFound) vehicleNotFound.hidden = true;

 

  document.title =

    `${vehicle.name} ${vehicle.year} | Subastando Fierro`;

 

  document.getElementById("vehicleId").textContent =

    vehicle.id;

 

  document.getElementById("vehicleName").textContent =

    vehicle.name;

 

  document.getElementById("vehicleVersion").textContent =

    `${vehicle.year} | ${vehicle.version}`;

 

  document.getElementById("startingBid").textContent =

    currency.format(vehicle.startingBid);

 

  document.getElementById("auctionDate").textContent =

    vehicle.auctionDate;

 

  document.getElementById("mileage").textContent =

    vehicle.mileage;

 

  document.getElementById("transmission").textContent =

    vehicle.transmission;

 

  document.getElementById("location").textContent =

    vehicle.location;

 

  document.getElementById("condition").textContent =

    vehicle.condition;

 

  document.getElementById("statusBadge").textContent =

    vehicle.status;

 

  document.getElementById("vehicleNotes").textContent =

    vehicle.notes;

 

 

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

 

  document.getElementById("vehicleInfo").innerHTML =

    info

      .map(

        ([label, value]) =>

          `<div><dt>${label}</dt><dd>${value}</dd></div>`

      )

      .join("");

 

 

  document.getElementById("vehicleDetails").innerHTML =

    vehicle.details

      .map(item => `<li>${item}</li>`)

      .join("");

 

 

  document.getElementById("vehicleDocuments").innerHTML =

    vehicle.documents

      .map(item => `<li>${item}</li>`)

      .join("");

 

 

  const mainImage =

    document.getElementById("mainVehicleImage");

 

  const thumbs =

    document.getElementById("vehicleThumbs");

 

  const images =

    Array.isArray(vehicle.images) &&

    vehicle.images.length

      ? vehicle.images

      : [fallbackImage];

 

  mainImage.src = images[0];

  mainImage.alt =

    `${vehicle.name} ${vehicle.year}`;

 

  mainImage.addEventListener(

    "error",

    () => {

      mainImage.src = fallbackImage;

    },

    { once: true }

  );

 

 

  thumbs.innerHTML =

    images

      .map(

        (url, index) => `

          <button

            class="thumb ${index === 0 ? "active" : ""}"

            data-index="${index}"

            type="button"

          >

            <img

              src="${url}"

              alt="Foto ${index + 1} de ${vehicle.name}"

            >

          </button>

        `

      )

      .join("");

 

 

  [...thumbs.querySelectorAll(".thumb")]

    .forEach(button => {

 

      button.addEventListener("click", () => {

 

        const index =

          Number(button.dataset.index);

 

        mainImage.src =

          images[index];

 

        [...thumbs.querySelectorAll(".thumb")]

          .forEach(t => {

            t.classList.remove("active");

          });

 

        button.classList.add("active");

 

      });

 

    });

 

 

  const enterAuction =

    document.getElementById("enterAuction");

 

  if (enterAuction) {

 

    if (vehicle.estado === "en_vivo") {

 

      enterAuction.textContent =

        "ENTRAR A SUBASTA EN VIVO";

 

      enterAuction.onclick = () => {

        window.location.href =

          `index.html#en-vivo`;

      };

 

    } else {

 

      enterAuction.textContent =

        "SUBASTA PROGRAMADA";

 

      enterAuction.onclick = () => {

        alert(

          `La subasta ${vehicle.id} todavía no está en vivo.`

        );

      };

 

    }

 

  }

 

}

 

 

async function cargarVehiculo() {

 

  if (!vehicleKey) {

    mostrarNoEncontrado();

    return;

  }

 

  try {

 

    const referencia =

      doc(

        db,

        "subastas",

        vehicleKey

      );

 

    const snapshot =

      await getDoc(referencia);

 

    if (!snapshot.exists()) {

      mostrarNoEncontrado();

      return;

    }

 

    const vehicle =

      datosFicha(

        snapshot.data(),

        snapshot.id

      );

 

    renderVehicle(vehicle);

 

  } catch (error) {

 

    console.error(

      "Error cargando vehículo desde Firestore:",

      error

    );

 

    mostrarNoEncontrado();

 

  }

 

}

 

 

cargarVehiculo();
