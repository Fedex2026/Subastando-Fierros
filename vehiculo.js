year} | Subastando Fierro`;

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
    encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675"><rect width="100%" height="100%" fill="#111"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#777" font-family="Arial" font-size="38">IMAGEN PENDIENTE</text></svg>`);

  const images = vehicle.images.length ? vehicle.images : [fallback];
  mainImage.src = images[0];
  mainImage.alt = `${vehicle.name} ${vehicle.year}`;

  thumbs.innerHTML = images.map((url, index) => `
    <button class="thumb ${index === 0 ? "active" : ""}" data-index="${index}">
      <img src="${url}" alt="Foto ${index + 1} de ${vehicle.name}">
    </button>
  `).join("");

  [...thumbs.querySelectorAll(".thumb")].forEach(button => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.index);
      mainImage.src = images[index];
      [...thumbs.querySelectorAll(".thumb")].forEach(t => t.classList.remove("active"));
      button.classList.add("active");
    });
  });

  document.getElementById("enterAuction").addEventListener("click", () => {
    alert("La subasta en vivo de esta unidad se conectará en la siguiente etapa.");
  });
}

