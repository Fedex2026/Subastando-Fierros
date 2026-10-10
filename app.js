<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="#090909" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <title>Subastando Fierros | Subastas de Autos</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles.css" />
<style>[hidden]{display:none!important}</style>
</head>
<body>
<header class="site-header">
  <div class="header-inner">
    <a href="#inicio" class="brand">
      <div class="brand-icon">🔨</div>
      <div>
        <div class="brand-name">SUBASTANDO <span>FIERROS</span></div>
        <div class="brand-tagline">SUBASTAS DE AUTOS</div>
      </div>
    </a>
    <nav class="desktop-nav">
      <a class="active" href="#inicio">INICIO</a>
      <a href="#subastas">SUBASTAS</a>
      <a href="#en-vivo">EN VIVO</a>
      <a href="#categorias">CATEGORÍAS</a>
      <a href="#proximas">PRÓXIMAS</a>
      <a href="#como-comprar">CÓMO COMPRAR</a>
      <a href="#contacto">CONTACTO</a>
    </nav>
    <div class="header-actions">
      <a
        class="btn btn-outline"
        href="login.html"
      >
        👤 INICIAR SESIÓN
      </a>
      <a
        class="btn btn-red"
        href="registro.html"
      >
        👥 REGISTRO
      </a>
    </div>
    <button
      id="mobileMenuButton"
      class="mobile-menu-button"
      aria-label="Abrir menú"
    >
      ☰
    </button>
  </div>
  <div
    id="mobileMenu"
    class="mobile-menu"
    hidden
  >
    <a href="#inicio">Inicio</a>
    <a href="#subastas">Subastas</a>
    <a href="#en-vivo">En vivo</a>
    <a href="#categorias">Categorías</a>
    <a href="#proximas">Próximas</a>
    <a href="#como-comprar">Cómo comprar</a>
    <a
      class="btn btn-outline"
      href="login.html"
    >
      Iniciar sesión
    </a>
    <a
      class="btn btn-red"
      href="registro.html"
    >
      Registro
    </a>
  </div>
</header>
<main id="inicio" class="page-shell">
<section id="en-vivo" class="section live-section">
  <div class="section-heading">
    <div>
      <h1>
        <span class="live-dot"></span>
        SUBASTAS EN VIVO
      </h1>
      <p>
        Participa en tiempo real y gana tu próximo auto.
      </p>
    </div>
    <button class="btn btn-dark js-scroll-auctions">
      VER TODAS LAS SUBASTAS →
    </button>
  </div>
  <div id="liveEmptyState" class="live-auction-card" style="padding:64px 24px;text-align:center;display:block">
    <h2 style="font-size:clamp(28px,5vw,54px)">🔨 PRÓXIMAMENTE</h2>
    <p>No hay subastas en vivo por el momento. Consulta las próximas subastas.</p>
  </div>
  <div id="liveAuctionContent" hidden>
    <div class="live-auction-card">
      <div class="gallery-panel">
        <div class="main-image-wrap">
          <span class="status-badge" id="liveStatusBadge">PRÓXIMAMENTE</span>
          <img id="mainAuctionImage" alt="Vehículo en subasta" />
          <div class="image-brand">🔨 <strong>SUBASTANDO</strong> <span>FIERROS</span></div>
        </div>
        <div class="thumb-strip"></div>
      </div>
      <div class="auction-panel">
        <div class="vehicle-title-row"><div><h2 id="liveVehicleName"></h2><p id="liveVehicleVersion"></p></div><span class="lot-id" id="liveLotId"></span></div>
        <div class="countdown-box">
          <span id="countdownLabel">LA SUBASTA COMIENZA EN:</span>
          <div class="countdown">
            <div><strong id="hours">00</strong><small>HORAS</small></div><b>:</b>
            <div><strong id="minutes">00</strong><small>MINUTOS</small></div><b>:</b>
            <div><strong id="seconds">00</strong><small>SEGUNDOS</small></div>
          </div>
          <div id="auctionTimeBar" class="auction-time-bar" hidden><div id="auctionTimeBarFill" class="auction-time-bar-fill"></div></div>
        </div>
        <div class="price-grid">
          <div class="metric-card"><span>PUJA ACTUAL</span><strong id="currentBid">$0</strong></div>
          <div class="metric-card"><span>INCREMENTO MÍNIMO</span><strong id="liveMinIncrement">$500</strong></div>
        </div>
        <div class="auction-meta"><span>👥 <strong id="participants">—</strong> participantes</span><span>↗ <strong id="bidCount">0</strong> pujas realizadas</span></div>
        <div class="bid-controls"><label><span>Ingresa tu puja</span><div class="bid-input-wrap"><b>$</b><input id="bidInput" type="number" min="1" step="1" inputmode="numeric" /></div></label><button id="bidButton" class="btn btn-red btn-bid" disabled>SUBASTA PROGRAMADA</button></div>
        <p class="login-note">🔒 Inicia sesión y activa tu membresía para participar.</p>
        <div id="bidMessage" class="bid-message" hidden></div>
      </div>
    </div>
    <div class="info-grid">
      <article class="info-card"><h3>🚗 INFORMACIÓN DEL VEHÍCULO</h3><dl id="liveVehicleInfo"></dl></article>
      <article class="info-card"><h3>📋 DETALLES DEL VEHÍCULO</h3><ul id="liveVehicleDetails" class="check-list"></ul></article>
      <article class="info-card"><h3>📄 DOCUMENTOS</h3><ul id="liveVehicleDocuments" class="doc-list"></ul></article>
      <article class="info-card"><h3>🔨 HISTORIAL DE PUJAS</h3><div id="bidHistory" class="bid-history"></div></article>
    </div>
  </div>
 
<div
    id="como-comprar"
    class="feature-grid"
  >
    <article>
      <div>
        📡
      </div>
      <strong>
        SUBASTAS 100% EN VIVO
      </strong>
      <p>
        Participa en tiempo real desde cualquier lugar.
      </p>
    </article>
    <article>
      <div>
        🛡️
      </div>
      <strong>
        AUTOS VERIFICADOS
      </strong>
      <p>
        Revisamos cada unidad antes de publicar.
      </p>
    </article>
    <article>
      <div>
        🔐
      </div>
      <strong>
        COMPRA SEGURA
      </strong>
      <p>
        Proceso transparente y confiable.
      </p>
    </article>
    <article>
      <div>
        🎧
      </div>
      <strong>
        SOPORTE
      </strong>
      <p>
        Te ayudamos en todo el proceso.
      </p>
    </article>
  </div>
</section>
<section
  id="categorias"
  class="section categories-section"
>
  <div class="section-heading compact">
    <div>
      <h2>
        🔨 SUBASTANDO TODO
      </h2>
      <p>
        Explora oportunidades por categoría. Los autos siguen siendo la categoría principal.
      </p>
    </div>
  </div>
  <div
    class="category-grid"
    id="categoryFilters"
  >
    <button
      class="category-card active"
      type="button"
      data-category="todos"
    >
      <span>🔥</span>
      <strong>TODO</strong>
      <small>Ver todas</small>
    </button>
    <button
      class="category-card"
      type="button"
      data-category="autos"
    >
      <span>🚗</span>
      <strong>AUTOS</strong>
      <small>Autos y camionetas</small>
    </button>
    <button
      class="category-card"
      type="button"
      data-category="motos"
    >
      <span>🏍️</span>
      <strong>MOTOS</strong>
      <small>Motos y scooters</small>
    </button>
    <button
      class="category-card"
      type="button"
      data-category="electronica"
    >
      <span>📱</span>
      <strong>ELECTRÓNICA</strong>
      <small>Celulares y tecnología</small>
    </button>
    <button
      class="category-card"
      type="button"
      data-category="herramientas"
    >
      <span>🛠️</span>
      <strong>HERRAMIENTAS</strong>
      <small>Equipo y maquinaria</small>
    </button>
    <button
      class="category-card"
      type="button"
      data-category="relojes"
    >
      <span>⌚</span>
      <strong>RELOJES</strong>
      <small>Relojes y joyería</small>
    </button>
    <button
      class="category-card"
      type="button"
      data-category="lotes"
    >
      <span>📦</span>
      <strong>LOTES</strong>
      <small>Mercancía y lotes</small>
    </button>
    <button
      class="category-card"
      type="button"
      data-category="hogar"
    >
      <span>🏠</span>
      <strong>HOGAR</strong>
      <small>Casa y artículos</small>
    </button>
  </div>
</section>
<section
  id="subastas"
  class="section"
>
  <div
    id="proximas"
    class="section-heading compact"
  >
    <div>
      <h2>
        📅 PRÓXIMAS SUBASTAS
      </h2>
      <p id="auctionCategoryLabel">
        Mostrando todas las subastas disponibles.
      </p>
    </div>
    <button
      class="link-button"
      id="showAllAuctions"
      type="button"
    >
      VER TODAS →
    </button>
  </div>
  <div
    class="auction-list"
    id="auctionList"
  ></div>
</section>
<section
  id="contacto"
  class="footer-cta"
>
  <div>
    <strong>
      SUBASTANDO
      <span>FIERRO</span>
    </strong>
    <p>
      La subasta de autos clara, rápida y en vivo.
    </p>
  </div>
  <a
    class="btn btn-red"
    href="registro.html"
  >
    CREAR CUENTA
  </a>
</section>
</main>
<footer class="site-footer">
  <span>
    © 2026 Subastando Fierro
  </span>
  <span>
    Subastas de autos
  </span>
</footer>
<script type="module" src="app.js"></script>
</body>
</html>
