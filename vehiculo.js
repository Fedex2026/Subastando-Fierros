import { db } from "./firebase-config.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const currency = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0
});

const params = new URLSearchParams(window.location.search);
const vehicleKey = params.get("id");
const vehiclePage = document.getElementById("vehiclePage");
const vehicleNotFound = document.getElementById("vehicleNotFound");

const fallbackImage = "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675"><rect width="100%" height="100%" fill="#111"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#777" font-family="Arial" font-size="38">IMAGEN PENDIENTE</text></svg>`
);

function valor(datos, ...claves) {
  for (const clave of claves) {
    const v = datos?.[clave];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return "";
}

function textoSiNo(v) {
  const s = String(v ?? "").trim().toLowerCase();
  if (["si", "sí", "true", "1"].includes(s) || v === true) return "Sí";
  if (["no", "false", "0"].includes(s) || v === false) return "No";
  return "Por confirmar";
}

function listaDesdeValor(v) {
  if (Array.isArray(v)) return v.map(x => String(x).trim()).filter(Boolean);
  if (!v) return [];
  return String(v).split(/\n|,|;/).map(x => x.trim()).filter(Boolean);
}

function urlsDesdeValor(v) {
  if (!Array.isArray(v)) return [];
  return v.map(item => {
    if (typeof item === "string") return item;
    return item?.secure_url || item?.url || "";
  }).filter(Boolean);
}

function mostrarNoEncontrado() {
  if (vehiclePage) vehiclePage.hidden = true;
  if (vehicleNotFound) vehicleNotFound.hidden = false;
}

function formatearFecha(fechaInicio) {
  if (!fechaInicio || typeof fechaInicio.toDate !== "function") return "Fecha por confirmar";
  return fechaInicio.toDate().toLocaleString("es-MX", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function textoEstado(estado) {
  if (estado === "en_vivo") return "EN VIVO";
  if (estado === "finalizada") return "FINALIZADA";
  return "PRÓXIMAMENTE";
}

function formatearKilometraje(v) {
  if (v === undefined || v === null || v === "") return "Por confirmar";
  const numero = Number(v);
  if (Number.isFinite(numero)) return `${numero.toLocaleString("es-MX")} km`;
  const texto = String(v);
  return /km/i.test(texto) ? texto : `${texto} km`;
}

function datosFicha(datos, id) {
  const nombre = `${valor(datos, "marca") || ""} ${valor(datos, "modelo") || ""}`.trim().toUpperCase() || id;
  const anio = valor(datos, "anio", "año") || "Por confirmar";
  const version = valor(datos, "version", "versión") || "Por confirmar";
  const ubicacion = valor(datos, "ubicacion", "ubicación") || "Por confirmar";
  const descripcion = valor(datos, "descripcion", "descripción") || "";
  const precioInicial = Number(valor(datos, "precioInicial", "pujaActual") || 0);

  const fotosGuardadas = urlsDesdeValor(valor(datos, "fotos", "imagenes", "images"));
  const portada = valor(datos, "fotoPortada", "portada", "coverImage");
  const fotos = [portada, ...fotosGuardadas].filter((url, index, arr) => url && arr.indexOf(url) === index);
  if (!fotos.length) fotos.push(fallbackImage);

  const videos = urlsDesdeValor(valor(datos, "videos", "videoUrls", "video"));
  const llaves = textoSiNo(valor(datos, "tieneLlaves", "llaves", "hasKeys"));
  const cantidadLlaves = valor(datos, "cantidadLlaves", "numeroLlaves", "keyCount");
  const tipoFactura = valor(datos, "tipoFactura", "factura", "invoiceType");
  const tarjeta = textoSiNo(valor(datos, "tarjetaCirculacion", "tieneTarjetaCirculacion", "registrationCard"));
  const documentosExtra = listaDesdeValor(valor(datos, "documentos", "otrosDocumentos", "documents"));
  const enciende = textoSiNo(valor(datos, "enciende", "funciona", "starts"));
  const danosEsteticos = valor(datos, "danosEsteticos", "dañosEsteticos", "damageBody", "bodyDamage");
  const danosMecanicos = valor(datos, "danosMecanicos", "dañosMecanicos", "damageMechanical", "mechanicalDamage");
  const observaciones = valor(datos, "observaciones", "notas", "damageNotes");
  const vin = valor(datos, "vin", "VIN", "serie");
  const placas = valor(datos, "placas", "plates");

  const details = [];
  details.push(`Condición: ${valor(datos, "condicion", "condición") || "Por confirmar"}`);
  details.push(`Enciende: ${enciende}`);
  details.push(`Llaves: ${llaves}${cantidadLlaves ? ` (${cantidadLlaves})` : ""}`);
  if (danosEsteticos) details.push(`Daños estéticos: ${danosEsteticos}`);
  if (danosMecanicos) details.push(`Daños mecánicos: ${danosMecanicos}`);
  if (descripcion) details.push(descripcion);

  const documents = [];
  if (tipoFactura) documents.push(`Factura: ${tipoFactura}`);
  documents.push(`Tarjeta de circulación: ${tarjeta}`);
  documentosExtra.forEach(item => documents.push(item));
  if (!tipoFactura && tarjeta === "Por confirmar" && !documentosExtra.length) {
    documents.push("Documentación pendiente de captura");
  }

  return {
    id,
    name: nombre,
    year: anio,
    version,
    brand: valor(datos, "marca") || "Por confirmar",
    model: valor(datos, "modelo") || "Por confirmar",
    vin: vin || "Por confirmar",
    plates: placas || "Por confirmar",
    transmission: valor(datos, "transmision", "transmisión") || "Por confirmar",
    mileage: formatearKilometraje(valor(datos, "kilometraje", "mileage")),
    location: ubicacion,
    condition: valor(datos, "condicion", "condición") || "Por confirmar",
    color: valor(datos, "color") || "Por confirmar",
    fuel: valor(datos, "combustible", "fuel") || "Por confirmar",
    startingBid: precioInicial,
    auctionDate: formatearFecha(valor(datos, "fechaInicio")),
    status: textoEstado(valor(datos, "estado") || "programada"),
    images: fotos,
    videos,
    details,
    documents,
    notes: observaciones || descripcion || "Sin observaciones adicionales.",
    estado: String(valor(datos, "estado") || "programada")
  };
}

function crearLi(texto) {
  const li = document.createElement("li");
  li.textContent = texto;
  return li;
}

function prepararVisorPrincipal() {
  const mainImage = document.getElementById("mainVehicleImage");
  const wrap = mainImage?.closest(".main-image-wrap");
  if (!mainImage || !wrap) return { mainImage: null, mainVideo: null };

  let mainVideo = document.getElementById("mainVehicleVideo");
  if (!mainVideo) {
    mainVideo = document.createElement("video");
    mainVideo.id = "mainVehicleVideo";
    mainVideo.controls = true;
    mainVideo.playsInline = true;
    mainVideo.preload = "metadata";
    mainVideo.hidden = true;
    mainVideo.style.width = "100%";
    mainVideo.style.height = "100%";
    mainVideo.style.objectFit = "contain";
    mainVideo.style.background = "#000";
    mainVideo.style.display = "none";
    wrap.appendChild(mainVideo);
  }

  mainImage.style.objectFit = "contain";
  return { mainImage, mainVideo };
}

function mostrarFotoPrincipal(url, vehicle, mainImage, mainVideo) {
  if (!mainImage || !mainVideo) return;
  mainVideo.pause();
  mainVideo.removeAttribute("src");
  mainVideo.load();
  mainVideo.hidden = true;
  mainVideo.style.display = "none";
  mainImage.hidden = false;
  mainImage.style.display = "block";
  mainImage.src = url || fallbackImage;
  mainImage.alt = `${vehicle.name} ${vehicle.year}`;
}

function mostrarVideoPrincipal(url, vehicle, mainImage, mainVideo) {
  if (!mainImage || !mainVideo) return;
  mainImage.hidden = true;
  mainImage.style.display = "none";
  mainVideo.hidden = false;
  mainVideo.style.display = "block";
  mainVideo.src = url;
  mainVideo.setAttribute("aria-label", `Video de ${vehicle.name}`);
  mainVideo.load();
  mainVideo.play().catch(() => {});
}

function renderGaleria(vehicle) {
  const thumbs = document.getElementById("vehicleThumbs");
  const { mainImage, mainVideo } = prepararVisorPrincipal();
  if (!thumbs || !mainImage || !mainVideo) return;

  const medios = [
    ...vehicle.images.map((url, index) => ({ tipo: "foto", url, index })),
    ...vehicle.videos.map((url, index) => ({ tipo: "video", url, index }))
  ];

  mostrarFotoPrincipal(vehicle.images[0] || fallbackImage, vehicle, mainImage, mainVideo);
  mainImage.onerror = () => {
    mainImage.onerror = null;
    mainImage.src = fallbackImage;
  };

  thumbs.innerHTML = "";
  thumbs.style.display = "flex";
  thumbs.style.gap = "12px";
  thumbs.style.overflowX = "auto";
  thumbs.style.paddingBottom = "8px";

  medios.forEach((medio, posicion) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `thumb ${posicion === 0 ? "active" : ""}`;
    button.dataset.mediaType = medio.tipo;
    button.dataset.mediaIndex = String(medio.index);
    button.style.position = "relative";
    button.style.flex = "0 0 150px";
    button.style.height = "100px";
    button.style.overflow = "hidden";
    button.style.cursor = "pointer";

    if (medio.tipo === "foto") {
      const img = document.createElement("img");
      img.src = medio.url;
      img.alt = `Foto ${medio.index + 1} de ${vehicle.name}`;
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "cover";
      img.onerror = () => {
        img.onerror = null;
        img.src = fallbackImage;
      };
      button.appendChild(img);
    } else {
      const video = document.createElement("video");
      video.src = medio.url;
      video.muted = true;
      video.preload = "metadata";
      video.playsInline = true;
      video.style.width = "100%";
      video.style.height = "100%";
      video.style.objectFit = "cover";
      button.appendChild(video);

      const play = document.createElement("span");
      play.textContent = "▶";
      play.style.position = "absolute";
      play.style.inset = "0";
      play.style.display = "grid";
      play.style.placeItems = "center";
      play.style.fontSize = "34px";
      play.style.color = "#fff";
      play.style.background = "rgba(0,0,0,.35)";
      button.appendChild(play);
    }

    button.addEventListener("click", () => {
      thumbs.querySelectorAll(".thumb").forEach(t => t.classList.remove("active"));
      button.classList.add("active");

      if (medio.tipo === "foto") {
        mostrarFotoPrincipal(medio.url, vehicle, mainImage, mainVideo);
      } else {
        mostrarVideoPrincipal(medio.url, vehicle, mainImage, mainVideo);
      }

      document.querySelector(".main-image-wrap")?.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    });

    thumbs.appendChild(button);
  });
}

function renderVehicle(vehicle) {
  if (!vehicle) {
    mostrarNoEncontrado();
    return;
  }

  if (vehiclePage) vehiclePage.hidden = false;
  if (vehicleNotFound) vehicleNotFound.hidden = true;

  document.title = `${vehicle.name} ${vehicle.year} | Subastando Fierro`;

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  setText("vehicleId", vehicle.id);
  setText("vehicleName", vehicle.name);
  setText("vehicleVersion", `${vehicle.year} | ${vehicle.version}`);
  setText("startingBid", currency.format(vehicle.startingBid));
  setText("auctionDate", vehicle.auctionDate);
  setText("mileage", vehicle.mileage);
  setText("transmission", vehicle.transmission);
  setText("location", vehicle.location);
  setText("condition", vehicle.condition);
  setText("statusBadge", vehicle.status);
  setText("vehicleNotes", vehicle.notes);

  const info = [
    ["Marca", vehicle.brand],
    ["Modelo", vehicle.model],
    ["Año", vehicle.year],
    ["Versión", vehicle.version],
    ["VIN / Serie", vehicle.vin],
    ["Placas", vehicle.plates],
    ["Transmisión", vehicle.transmission],
    ["Kilometraje", vehicle.mileage],
    ["Color", vehicle.color],
    ["Combustible", vehicle.fuel],
    ["Ubicación", vehicle.location]
  ];

  const vehicleInfo = document.getElementById("vehicleInfo");
  if (vehicleInfo) {
    vehicleInfo.innerHTML = "";
    info.forEach(([label, value]) => {
      const wrap = document.createElement("div");
      const dt = document.createElement("dt");
      const dd = document.createElement("dd");
      dt.textContent = label;
      dd.textContent = value;
      wrap.append(dt, dd);
      vehicleInfo.appendChild(wrap);
    });
  }

  const vehicleDetails = document.getElementById("vehicleDetails");
  if (vehicleDetails) {
    vehicleDetails.innerHTML = "";
    vehicle.details.forEach(item => vehicleDetails.appendChild(crearLi(item)));
  }

  const vehicleDocuments = document.getElementById("vehicleDocuments");
  if (vehicleDocuments) {
    vehicleDocuments.innerHTML = "";
    vehicle.documents.forEach(item => vehicleDocuments.appendChild(crearLi(item)));
  }

  renderGaleria(vehicle);

  const enterAuction = document.getElementById("enterAuction");
  if (enterAuction) {
    if (vehicle.estado === "en_vivo") {
      enterAuction.textContent = "ENTRAR A SUBASTA EN VIVO";
      enterAuction.onclick = () => {
        window.location.href = "index.html#en-vivo";
      };
    } else if (vehicle.estado === "finalizada") {
      enterAuction.textContent = "SUBASTA FINALIZADA";
      enterAuction.onclick = () => alert(`La subasta ${vehicle.id} ya finalizó.`);
    } else {
      enterAuction.textContent = "SUBASTA PROGRAMADA";
      enterAuction.onclick = () => alert(`La subasta ${vehicle.id} todavía no está en vivo.`);
    }
  }
}

async function cargarVehiculo() {
  if (!vehicleKey) {
    mostrarNoEncontrado();
    return;
  }

  try {
    const referencia = doc(db, "subastas", vehicleKey);
    const snapshot = await getDoc(referencia);

    if (!snapshot.exists()) {
      mostrarNoEncontrado();
      return;
    }

    renderVehicle(datosFicha(snapshot.data(), snapshot.id));
  } catch (error) {
    console.error("Error cargando vehículo desde Firestore:", error);
    mostrarNoEncontrado();
  }
}

cargarVehiculo();
