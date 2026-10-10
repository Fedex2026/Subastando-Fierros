
/* ============================================
   CIERRE Y ACTIVACIÓN DE SUBASTAS
============================================ */

const activacionesEnProceso = new Set();

function fechaLimite(s) {
  const inicio = fechaMs(s.fechaInicio);
  if (!inicio) return 0;

  const ultima = fechaMs(s.ultimaPujaFecha);
  const ronda = Math.max(
    10,
    Number(s.duracionRonda) || 120
  );

  return Math.max(inicio, ultima) + ronda * 1000;
}

async function activarSubasta(id) {
  if (!usuarioAdminActual) return;
  if (activacionesEnProceso.has(id)) return;

  activacionesEnProceso.add(id);

  try {
    await runTransaction(db, async tx => {
      const ref = doc(db, "subastas", id);
      const snap = await tx.get(ref);

      if (!snap.exists()) return;

      const s = snap.data();
      const inicio = fechaMs(s.fechaInicio);
      const limite = fechaLimite(s);
      const ahora = Date.now();

      if (s.estado !== "programada") return;
      if (!inicio || ahora < inicio) return;
      if (!limite || ahora >= limite) return;

      tx.update(ref, {
        estado: "en_vivo",
        actualizadoEn: serverTimestamp()
      });
    });

  } catch (error) {
    console.error(
      `Error activando subasta ${id}:`,
      error
    );
  } finally {
    activacionesEnProceso.delete(id);
  }
}

async function cerrarSubasta(id) {
  if (!usuarioAdminActual) return;
  if (cierresEnProceso.has(id)) return;

  cierresEnProceso.add(id);

  try {
    await runTransaction(db, async tx => {
      const ref = doc(db, "subastas", id);
      const snap = await tx.get(ref);

      if (!snap.exists()) return;

      const s = snap.data();

      if (
        s.estado !== "en_vivo" &&
        s.estado !== "programada"
      ) {
        return;
      }

      const inicio = fechaMs(s.fechaInicio);
      const limite = fechaLimite(s);
      const ahora = Date.now();

      if (!inicio || ahora < inicio) return;
      if (!limite || ahora < limite + 2000) return;

      const tieneGanador =
        Number(s.totalPujas || 0) > 0 &&
        typeof s.ultimaPujaUid === "string" &&
        s.ultimaPujaUid.length > 0 &&
        Number(s.pujaActual) > 0;

      tx.update(ref, {
        estado: "finalizada",

        resultado: tieneGanador
          ? "adjudicada"
          : "sin_ofertas",

        ganadorUid: tieneGanador
          ? s.ultimaPujaUid
          : "",

        ganadorNombre: tieneGanador
          ? String(s.ultimaPujaNombre || "Usuario")
          : "",

        precioFinal: tieneGanador
          ? Number(s.pujaActual)
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
      `Error cerrando subasta ${id}:`,
      error
    );
  } finally {
    cierresEnProceso.delete(id);
  }
}

function revisarEstadosSubastas() {
  if (!usuarioAdminActual) return;
  if (perfilAdminActual?.rol !== "admin") return;
  if (perfilAdminActual?.activo !== true) return;

  const ahora = Date.now();

  for (const s of subastasCargadas) {
    if (
      s.estado !== "programada" &&
      s.estado !== "en_vivo"
    ) {
      continue;
    }

    const inicio = fechaMs(s.fechaInicio);
    const limite = fechaLimite(s);

    if (!inicio || !limite || ahora < inicio) {
      continue;
    }

    if (ahora >= limite + 2000) {
      cerrarSubasta(s.id);
    } else if (
      s.estado === "programada" &&
      ahora < limite
    ) {
      activarSubasta(s.id);
    }
  }
}

setInterval(revisarEstadosSubastas, 3000);
