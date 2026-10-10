
/* ============================================
   SUBASTANDO FIERROS
   CIERRE DE SUBASTAS Y GANADORES
   PEGAR AL FINAL DE admin.js
============================================ */

const cierresEnProcesoSF = new Set();

function fechaMsSF(valor) {
  if (valor?.toMillis) return valor.toMillis();
  if (typeof valor?.seconds === "number") {
    return valor.seconds * 1000;
  }
  return 0;
}

function limiteSF(subasta) {
  const inicio = fechaMsSF(subasta.fechaInicio);
  if (!inicio) return 0;

  const ultima = fechaMsSF(subasta.ultimaPujaFecha);
  const duracion = Math.max(
    10,
    Number(subasta.duracionRonda) || 120
  );

  return Math.max(inicio, ultima) + duracion * 1000;
}

async function cerrarSubastaSF(id) {
  if (!usuarioAdminActual) return;
  if (cierresEnProcesoSF.has(id)) return;

  cierresEnProcesoSF.add(id);

  try {
    const referencia = doc(db, "subastas", id);

    // Se importa aquí para no cambiar los
    // imports que ya tienes arriba.
    const { runTransaction } = await import(
      "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js"
    );

    await runTransaction(db, async (tx) => {
      const snapshot = await tx.get(referencia);

      if (!snapshot.exists()) return;

      const subasta = snapshot.data();

      if (subasta.estado !== "en_vivo") return;

      const limite = limiteSF(subasta);

      if (!limite || Date.now() < limite + 1500) {
        return;
      }

      const tieneGanador =
        Number(subasta.totalPujas || 0) > 0 &&
        Boolean(subasta.ultimaPujaUid) &&
        Number(subasta.pujaActual) > 0;

      tx.update(referencia, {
        estado: "finalizada",

        resultado: tieneGanador
          ? "adjudicada"
          : "sin_ofertas",

        ganadorUid: tieneGanador
          ? subasta.ultimaPujaUid
          : "",

        ganadorNombre: tieneGanador
          ? String(
              subasta.ultimaPujaNombre || "Usuario"
            )
          : "",

        precioFinal: tieneGanador
          ? Number(subasta.pujaActual)
          : 0,

        estadoPago: tieneGanador
          ? "pendiente"
          : "no_aplica",

        estadoEntrega: tieneGanador
          ? "pendiente"
          : "no_aplica",

        finalizadaEn: serverTimestamp(),
        actualizadoEn: serverTimestamp()
      });
    });

  } catch (error) {
    console.error(
      "Error cerrando subasta:",
      id,
      error
    );
  } finally {
    cierresEnProcesoSF.delete(id);
  }
}

/* REVISAR SUBASTAS CADA 3 SEGUNDOS */

function revisarCierresSF() {
  if (!usuarioAdminActual) return;

  const ahora = Date.now();

  subastasCargadas.forEach((subasta) => {
    if (subasta.estado !== "en_vivo") return;

    const limite = limiteSF(subasta);

    if (limite && ahora >= limite + 1500) {
      cerrarSubastaSF(subasta.id);
    }
  });
}

setInterval(revisarCierresSF, 3000);

/* MOSTRAR GANADORES EN ADMIN */

function dineroSF(valor) {
  return Number(valor || 0).toLocaleString(
    "es-MX",
    {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: 0
    }
  );
}

function mostrarGanadoresSF() {
  const seccion = document.getElementById(
    "section-ventas"
  );

  if (!seccion) return;

  let contenedor = document.getElementById(
    "ganadoresListaSF"
  );

  if (!contenedor) {
    contenedor = document.createElement("div");
    contenedor.id = "ganadoresListaSF";
    seccion.appendChild(contenedor);

    [...seccion.children].forEach((hijo) => {
      if (
        hijo !== contenedor &&
        /Aún no hay ventas registradas/i.test(
          hijo.textContent || ""
        )
      ) {
        hijo.style.display = "none";
      }
    });
  }

  contenedor.replaceChildren();

  const terminadas = subastasCargadas
    .filter((s) => s.estado === "finalizada")
    .sort(
      (a, b) =>
        fechaMsSF(b.finalizadaEn) -
        fechaMsSF(a.finalizadaEn)
    );

  if (!terminadas.length) {
    const vacio = document.createElement("p");
    vacio.textContent =
      "Todavía no hay subastas finalizadas.";
    vacio.style.padding = "30px";
    vacio.style.textAlign = "center";
    contenedor.appendChild(vacio);
    return;
  }

  terminadas.forEach((subasta) => {
    const adjudicada =
      subasta.resultado === "adjudicada" &&
      Boolean(subasta.ganadorUid);

    const usuario = usuariosCargados.find(
      (u) => u.id === subasta.ganadorUid
    );

    const tarjeta = document.createElement("article");

    tarjeta.style.cssText = `
      background:#15161b;
      border:1px solid #34363c;
      border-radius:14px;
      padding:22px;
      margin:14px 0;
      color:white;
    `;

    const titulo = document.createElement("h3");
    titulo.textContent = [
      subasta.marca,
      subasta.modelo,
      subasta.anio,
      "·",
      subasta.id
    ].filter(Boolean).join(" ");

    tarjeta.appendChild(titulo);

    const datos = [
      [
        "Resultado",
        adjudicada
          ? "🏆 ADJUDICADA"
          : "SIN OFERTAS"
      ],
      [
        "Ganador",
        adjudicada
          ? usuario?.nombre ||
            subasta.ganadorNombre ||
            "Usuario"
          : "Ninguno"
      ],
      [
        "Correo",
        adjudicada
          ? usuario?.correo || "No disponible"
          : "—"
      ],
      [
        "UID",
        adjudicada
          ? subasta.ganadorUid
          : "—"
      ],
      [
        "Precio final",
        adjudicada
          ? dineroSF(subasta.precioFinal)
          : "—"
      ],
      [
        "Pago",
        adjudicada
          ? subasta.estadoPago || "pendiente"
          : "No aplica"
      ],
      [
        "Entrega",
        adjudicada
          ? subasta.estadoEntrega || "pendiente"
          : "No aplica"
      ]
    ];

    datos.forEach(([etiqueta, valor]) => {
      const fila = document.createElement("div");

      fila.style.cssText = `
        display:flex;
        justify-content:space-between;
        flex-wrap:wrap;
        gap:12px;
        padding:10px 0;
        border-bottom:1px solid #303138;
      `;

      const nombre = document.createElement("span");
      nombre.textContent = etiqueta;
      nombre.style.color = "#aeb0b9";

      const contenido = document.createElement("strong");
      contenido.textContent = String(valor);

      fila.append(nombre, contenido);
      tarjeta.appendChild(fila);
    });

    contenedor.appendChild(tarjeta);
  });
}

/* SINCRONIZACIÓN CON FIREBASE */

let escuchaGanadoresSF = null;

onAuthStateChanged(auth, (usuario) => {
  if (escuchaGanadoresSF) {
    escuchaGanadoresSF();
    escuchaGanadoresSF = null;
  }

  if (!usuario) return;

  getDoc(doc(db, "usuarios", usuario.uid))
    .then((snapshot) => {
      if (
        !snapshot.exists() ||
        snapshot.data().rol !== "admin" ||
        snapshot.data().activo !== true
      ) {
        return;
      }

      escuchaGanadoresSF = onSnapshot(
        collection(db, "subastas"),
        () => {
          setTimeout(() => {
            mostrarGanadoresSF();
            revisarCierresSF();
          }, 100);
        },
        (error) => {
          console.error(
            "Error leyendo ganadores:",
            error
          );
        }
      );
    })
    .catch(console.error);
});

/* REFRESCAR LA PANTALLA DE VENTAS */

setInterval(() => {
  if (usuarioAdminActual) {
    mostrarGanadoresSF();
  }
}, 3000);
