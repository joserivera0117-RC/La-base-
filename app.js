(() => {
  // ==========================================================================
  // CONFIGURACIÓN DE RECAUDERÍA LA BASE
  // ==========================================================================
  const PHONE = '525543628190';
  const DEFAULT_MESSAGE = 'Hola, Recaudería La Base. Quiero consultar productos y hacer un pedido.';

  // Enlace de Google Sheets (puede ser el enlace normal del navegador o el enlace publicado)
  const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1nw4bIXYRl5h0qIOIB5l5wG9okG_kH8DgG2DKTFCGR3o/edit?gid=1335044589#gid=1335044589';

  const CATEGORY_META = [
    { name: 'Frutas', image: 'CAT-001.Imagen_categoria.050508.jpg', icon: '01', description: 'Dulces, cítricas y de temporada.' },
    { name: 'Verduras y Legumbres', image: 'CAT-002.Imagen_categoria.050659.jpg', icon: '02', description: 'Lo esencial para tus comidas.' },
    { name: 'Chiles', image: 'CAT-003.Imagen_categoria.050744.jpg', icon: '03', description: 'Frescura y sabor para tu mesa.' },
    { name: 'Chiles Secos', image: 'CAT-004.Imagen_categoria.050836.jpg', icon: '04', description: 'Aroma, color y tradición.' },
    { name: 'Semillas y abarrotes', image: 'CAT-005.Imagen_categoria.050956.jpg', icon: '05', description: 'Básicos para tener en casa.' },
    { name: 'Hierbas', image: 'CAT-006.Imagen_categoria.050551.jpg', icon: '06', description: 'Un toque fresco para cocinar.' }
  ];

  // Lista de productos más vendidos / básicos por categoría para priorizarlos
  const BESTSELLERS = [
    'jitomate', 'cebolla', 'chile serrano', 'chile jalapeño', 'chile morron', 'chile morrón', 
    'tomatillo', 'lechuga', 'aguacate', 'manzana', 'naranja', 'mandarina', 'plátano', 'platano', 
    'limón', 'limon', 'papa', 'zanahoria', 'calabacita', 'cilantro'
  ];

  const normalize = (str) => String(str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const parseDecimal = (value) => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    let normalized = String(value || '').trim().replace(/[$\s]/g, '');
    if (/^-?\d{1,3}(?:\.\d{3})*,\d{1,2}$/.test(normalized)) {
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = normalized.replace(',', '.');
    }
    const result = Number.parseFloat(normalized);
    return Number.isFinite(result) ? result : 0;
  };

  function enrichProduct(p) {
    const status = String(p.status || 'Disponible').trim();
    const stNorm = normalize(status);
    const nmNorm = normalize(p.name);
    const unitNorm = normalize(p.unit);
    let saleType = normalize(p.saleType || p.tipoVenta);
    const herbNames = ['cilantro', 'perejil', 'hierba buena', 'hierbabuena', 'epazote', 'manzanilla'];
    const isHerbSoldByAmount = herbNames.some((name) => nmNorm.includes(name));
    if (isHerbSoldByAmount) saleType = 'monto';
    if (!saleType) {
      saleType = unitNorm === 'kg' || unitNorm === 'gramos' || unitNorm === 'gramo'
        ? 'peso'
        : unitNorm === 'monto'
          ? 'monto'
          : 'unidad';
    }
    if (saleType === 'kilogramo') saleType = 'peso';
    if (saleType === 'dinero' || saleType === 'pesos') saleType = 'monto';
    if (saleType === 'pieza' || saleType === 'bolsa' || saleType === 'paquete') saleType = 'unidad';

    const minimum = parseDecimal(p.minimum || p.cantidadMinima) || (isHerbSoldByAmount ? (nmNorm.includes('cilantro') || nmNorm.includes('manzanilla') ? 5 : 2) : 0);
    const increment = parseDecimal(p.increment || p.incremento) || (saleType === 'monto' ? 1 : 0);
    return {
      ...p,
      status,
      unit: p.unit || 'unidad',
      saleType,
      minimum: minimum > 0 ? minimum : undefined,
      increment: increment > 0 ? increment : undefined,
      isOutOfStock: stNorm.includes('agotado') || stNorm.includes('sin existencia') || stNorm.includes('terminado'),
      isSpecial: stNorm.includes('especial') || stNorm.includes('lleg') || stNorm.includes('pocas') || stNorm.includes('temporada'),
      isBestseller: p.isBestseller === true || p.isBestseller === 'SI' || BESTSELLERS.some((b) => nmNorm.includes(b))
    };
  }

  // Catálogo inicial enriquecido
  let products = (Array.isArray(window.PRODUCTS) ? window.PRODUCTS : []).map(enrichProduct);

  const categoryGrid = document.querySelector('#category-grid');
  const filterList = document.querySelector('#filter-list');
  const productGrid = document.querySelector('#product-grid');
  const searchInput = document.querySelector('#product-search');
  const showMoreButton = document.querySelector('#show-more');
  const catalogCount = document.querySelector('#catalog-count');
  const listOpenButton = document.querySelector('#list-open');
  const drawer = document.querySelector('#list-drawer');
  const backdrop = document.querySelector('#drawer-backdrop');
  const drawerItems = document.querySelector('#drawer-items');
  const drawerEmpty = document.querySelector('#drawer-empty');
  const sendList = document.querySelector('#send-list');
  const drawerTotalAmount = document.querySelector('#drawer-total-amount');
  const drawerSummary = document.querySelector('#drawer-summary');
  const deliveryChips = document.querySelectorAll('.delivery-chip');
  const deliveryHintText = document.querySelector('#delivery-hint-text');

  const selected = new Map();
  try {
    const saved = JSON.parse(localStorage.getItem('labased_lista') || '{}');
    Object.entries(saved).forEach(([id, entry]) => {
      if (entry && typeof entry === 'object') selected.set(id, entry);
    });
  } catch (_) {}
  const saveSelected = () => {
    try { localStorage.setItem('labased_lista', JSON.stringify(Object.fromEntries(selected))); } catch (_) {}
  };
  const pageSize = 8;
  let activeCategory = 'Todos';
  let visibleCount = pageSize;
  let deliveryMode = 'recoger'; // 'recoger' | 'domicilio'
  let lastFocus = null;

  // The hero card stack uses the supplied product photographs and pauses for hover, focus, or reduced motion.
  const swapStage = document.querySelector('#hero-swap');
  const swapCards = swapStage ? [...swapStage.querySelectorAll('.swap-card')] : [];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let swapTimer = null;
  let swapPaused = false;
  function startSwap() {
    if (!swapStage || reducedMotion.matches || swapPaused || swapTimer || swapCards.length < 2) return;
    swapTimer = window.setInterval(() => {
      const front = swapStage.querySelector('.swap-card:first-child');
      if (!front) return;
      front.classList.add('is-leaving');
      window.setTimeout(() => {
        front.classList.remove('is-leaving');
        swapStage.appendChild(front);
      }, 760);
    }, 4100);
  }
  function pauseSwap() { swapPaused = true; window.clearInterval(swapTimer); swapTimer = null; }
  function resumeSwap() { swapPaused = false; startSwap(); }
  if (swapStage) {
    swapStage.addEventListener('mouseenter', pauseSwap);
    swapStage.addEventListener('mouseleave', resumeSwap);
    swapStage.addEventListener('focusin', pauseSwap);
    swapStage.addEventListener('focusout', resumeSwap);
    reducedMotion.addEventListener?.('change', () => reducedMotion.matches ? pauseSwap() : resumeSwap());
    startSwap();
  }

  let scrollFrame = false;
  window.addEventListener('scroll', () => {
    if (scrollFrame || !swapStage) return;
    scrollFrame = true;
    window.requestAnimationFrame(() => {
      swapStage.style.setProperty('--scroll-drift', `${Math.min(window.scrollY * 0.025, 34)}px`);
      scrollFrame = false;
    });
  }, { passive: true });

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const waUrl = (message) => `https://wa.me/${PHONE}?text=${encodeURIComponent(message)}`;

  document.querySelectorAll('[data-wa]').forEach((link) => {
    link.href = waUrl(DEFAULT_MESSAGE);
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  });

  // Convierte enlaces de Google Drive compartidos o rutas a imágenes directas
  function formatImageUrl(url) {
    if (!url) return 'assets/images/logo-mascota.jpeg';
    const trimmed = String(url).trim();
    const driveMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || trimmed.match(/id=([a-zA-Z0-9_-]+)/);
    if (driveMatch && (trimmed.includes('drive.google.com') || trimmed.includes('docs.google.com'))) {
      return `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w800`;
    }
    return trimmed;
  }

  // Parser CSV compatible con RFC 4180 para procesar la exportación de Google Sheets
  function parseGoogleSheetsCSV(text) {
    if (!text || typeof text !== 'string') return [];

    const firstLine = text.split(/\r\n|\r|\n/)[0] || '';
    const delimiter = firstLine.includes(';') && (firstLine.split(';').length > firstLine.split(',').length) ? ';' : ',';

    const lines = [];
    let row = [];
    let cell = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        row.push(cell.trim());
        cell = '';
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') i++;
        row.push(cell.trim());
        if (row.some((c) => c.length > 0)) lines.push(row);
        row = [];
        cell = '';
      } else {
        cell += char;
      }
    }

    if (cell.length > 0 || row.length > 0) {
      row.push(cell.trim());
      if (row.some((c) => c.length > 0)) lines.push(row);
    }

    if (lines.length < 2) return [];

    const rawHeaders = lines[0].map(normalize);
    const findIndex = (...names) => rawHeaders.findIndex((h) => names.some((n) => h === n || h.includes(n)));

    const idIdx = findIndex('id', 'codigo', 'clave');
    const nameIdx = findIndex('nombre', 'name', 'producto');
    const catIdx = findIndex('categoria', 'category');
    const unitIdx = findIndex('unidad', 'unit', 'medida');
    const priceIdx = findIndex('precio', 'price', 'costo');
    const activeIdx = findIndex('activo', 'active', 'mostrar', 'visible');
    const statusIdx = findIndex('estado', 'status', 'disponibilidad');
    const imgIdx = findIndex('imagen', 'image', 'foto', 'url');
    const destIdx = findIndex('destacado', 'popular', 'mas vendido');
    const saleTypeIdx = findIndex('tipo venta', 'tipo de venta', 'venta por', 'presentacion');
    const minimumIdx = findIndex('cantidad minima', 'minimo', 'venta minima');
    const incrementIdx = findIndex('incremento', 'de cuanto en cuanto', 'pasos');

    const result = [];
    for (let i = 1; i < lines.length; i++) {
      const r = lines[i];
      const name = nameIdx !== -1 ? r[nameIdx] : '';
      if (!name) continue;

      const activeVal = activeIdx !== -1 ? normalize(r[activeIdx]) : 'si';
      const isActive = activeVal === '' || activeVal === 'si' || activeVal === 'true' || activeVal === 'verdadero' || activeVal === '1' || activeVal === 'yes' || activeVal === 'activo';

      // Si el producto está inactivo (NO / FALSE), no se muestra en el sitio
      if (!isActive) continue;

      const id = (idIdx !== -1 && r[idIdx]) ? r[idIdx] : `PROD-${i}`;
      const category = (catIdx !== -1 && r[catIdx]) ? r[catIdx] : 'Frutas';
      const unit = (unitIdx !== -1 && r[unitIdx]) ? r[unitIdx] : 'kg';
      const price = (priceIdx !== -1 && r[priceIdx]) ? String(parseDecimal(r[priceIdx])).replace(/\.0$/, '') : '';
      const status = (statusIdx !== -1 && r[statusIdx]) ? r[statusIdx].trim() : 'Disponible';
      const image = (imgIdx !== -1 && r[imgIdx]) ? r[imgIdx].trim() : '';
      const isExplicitBestseller = destIdx !== -1 && (normalize(r[destIdx]) === 'si' || normalize(r[destIdx]) === 'true');
      const saleType = saleTypeIdx !== -1 ? r[saleTypeIdx].trim() : '';
      const minimum = minimumIdx !== -1 ? r[minimumIdx].trim() : '';
      const increment = incrementIdx !== -1 ? r[incrementIdx].trim() : '';

      result.push(enrichProduct({
        id,
        name,
        category,
        unit,
        price,
        status,
        image: formatImageUrl(image),
        saleType,
        minimum,
        increment,
        isBestseller: isExplicitBestseller || BESTSELLERS.some((b) => normalize(name).includes(b))
      }));
    }

    return result;
  }

  // Convierte cualquier enlace de Google Sheets a la versión más rápida y en tiempo real
  function getLiveGoogleSheetsUrl(rawUrl) {
    if (!rawUrl || !rawUrl.trim()) return '';
    const trimmed = rawUrl.trim();
    const normalMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (normalMatch && normalMatch[1] && !trimmed.includes('/pub?')) {
      const gidMatch = trimmed.match(/[?&#]gid=([0-9]+)/);
      const gidPart = gidMatch && gidMatch[1] ? `&gid=${gidMatch[1]}` : '';
      return `https://docs.google.com/spreadsheets/d/${normalMatch[1]}/gviz/tq?tqx=out:csv${gidPart}`;
    }
    return trimmed;
  }

  // Carga asíncrona desde Google Sheets con refresco automático y respaldo local
  async function syncProductsFromSheets() {
    if (!GOOGLE_SHEET_CSV_URL || !GOOGLE_SHEET_CSV_URL.trim()) return;

    try {
      const liveBaseUrl = getLiveGoogleSheetsUrl(GOOGLE_SHEET_CSV_URL);
      const cacheBuster = `_nocache=${Date.now()}`;
      const url = liveBaseUrl.includes('?') 
        ? `${liveBaseUrl}&${cacheBuster}` 
        : `${liveBaseUrl}?${cacheBuster}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const csvText = await response.text();
      const sheetProducts = parseGoogleSheetsCSV(csvText);

      if (sheetProducts && sheetProducts.length > 0) {
        const hasChanged = JSON.stringify(sheetProducts) !== JSON.stringify(products);
        if (hasChanged) {
          products = sheetProducts;
          const validIds = new Set(products.map((product) => product.id));
          [...selected.keys()].forEach((id) => {
            if (!validIds.has(id)) selected.delete(id);
          });
          saveSelected();
          renderCategories();
          renderFilters();
          renderSpecialsShowcase();
          renderProducts();
          renderDrawerItems();
          console.log(`Catálogo actualizado: ${products.length} productos sincronizados.`);
        }
      }
    } catch (err) {
      console.warn('No se pudo sincronizar con Google Sheets en este momento. Se mantiene catálogo local:', err);
    }
  }

  function renderCategories() {
    categoryGrid.innerHTML = CATEGORY_META.map((category, index) => {
      return `<button class="category-card reveal" type="button" data-category="${escapeHtml(category.name)}" style="transition-delay:${index * 45}ms">
        <div class="category-photo"><img src="assets/images/CATEGORIAS_Images/${category.image}" alt="${escapeHtml(category.name)}" loading="lazy"></div>
        <div class="category-info"><h3>${escapeHtml(category.name)}</h3><span>${escapeHtml(category.description)} <b aria-hidden="true">↗</b></span></div>
      </button>`;
    }).join('');
    categoryGrid.querySelectorAll('[data-category]').forEach((button) => button.addEventListener('click', () => {
      setCategory(button.dataset.category);
      document.querySelector('#productos').scrollIntoView({ behavior: 'smooth' });
    }));
    observeReveals(categoryGrid);
  }

  function renderFilters() {
    const productCategories = [...new Set(products.map((p) => p.category).filter(Boolean))];
    const baseNames = CATEGORY_META.map((category) => category.name);
    const names = ['Todos', ...baseNames, ...productCategories.filter((c) => !baseNames.includes(c))];

    filterList.innerHTML = names.map((name) => `<button class="filter-chip" type="button" data-filter="${escapeHtml(name)}" aria-pressed="${name === activeCategory}">${escapeHtml(name)}</button>`).join('');
    filterList.querySelectorAll('[data-filter]').forEach((button) => button.addEventListener('click', () => setCategory(button.dataset.filter)));
  }

  function setCategory(category) {
    activeCategory = category;
    visibleCount = pageSize;
    filterList.querySelectorAll('[data-filter]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.filter === category)));
    renderProducts();
  }

  // Tira de Especiales / Llegó hoy (Pocas piezas)
  function renderSpecialsShowcase() {
    const specialsContainer = document.querySelector('#specials-container');
    const specialsRow = document.querySelector('#specials-row');
    if (!specialsContainer || !specialsRow) return;

    // Productos marcados como especiales y que no estén agotados
    const specialItems = products.filter((p) => p.isSpecial && !p.isOutOfStock);

    if (!specialItems.length) {
      specialsContainer.hidden = true;
      return;
    }

    specialsContainer.hidden = false;
    specialsRow.innerHTML = specialItems.map((product) => {
      const isSelected = selected.has(product.id);
      const priceText = productPriceLabel(product);
      return `<article class="special-card">
        <div class="special-card-img">
          <img src="${escapeHtml(formatImageUrl(product.image))}" alt="${escapeHtml(product.name)}" loading="lazy" onerror="this.onerror=null;this.src='assets/images/logo-mascota.jpeg';">
          <span class="special-tag">Llegó hoy · Pocas piezas</span>
        </div>
        <div class="special-card-info">
          <h4>${escapeHtml(product.name)}</h4>
          <p>Por ${escapeHtml(product.unit || 'unidad')}</p>
          <div class="special-card-bottom">
            <span class="special-card-price">${priceText || 'Consultar'}</span>
            <button class="special-card-btn${isSelected ? ' is-added' : ''}" type="button" data-add="${escapeHtml(product.id)}">
              ${isSelected ? '✓ En tu lista' : '+ Agregar'}
            </button>
          </div>
        </div>
      </article>`;
    }).join('');

    specialsRow.querySelectorAll('[data-add]').forEach((btn) => {
      btn.addEventListener('click', () => toggleProduct(btn.dataset.add));
    });
  }

  function getFilteredProducts() {
    const term = searchInput.value.trim().toLocaleLowerCase('es-MX');
    const matches = products.filter((product) => {
      const matchesCategory = activeCategory === 'Todos' || product.category === activeCategory;
      const matchesSearch = !term || `${product.name} ${product.category} ${product.unit}`.toLocaleLowerCase('es-MX').includes(term);
      return matchesCategory && matchesSearch;
    });

    // Ordenamiento orgánico y profesional:
    // 1. Disponibles con mayor demanda (Bestsellers) al principio de su categoría.
    // 2. Disponibles regulares.
    // 3. Productos Agotados al final (para que el cliente sepa que se manejan, pero sin estorbar).
    return matches.sort((a, b) => {
      if (a.isOutOfStock && !b.isOutOfStock) return 1;
      if (!a.isOutOfStock && b.isOutOfStock) return -1;
      if (a.isBestseller && !b.isBestseller) return -1;
      if (!a.isBestseller && b.isBestseller) return 1;
      return 0;
    });
  }

  function renderProducts() {
    const filtered = getFilteredProducts();
    const visible = filtered.slice(0, visibleCount);
    if (!visible.length) {
      productGrid.innerHTML = '<div class="empty-results"><strong>No encontramos ese producto</strong>Prueba con otra palabra o categoría.</div>';
    } else {
      productGrid.innerHTML = visible.map((product, index) => {
        const isSelected = selected.has(product.id);
        const isOut = Boolean(product.isOutOfStock);
        const isBestseller = Boolean(product.isBestseller && !isOut);
        const saleUnit = product.saleType === 'peso' ? 'Por kilogramo' : product.saleType === 'monto' ? 'Por monto' : `Por ${product.unit || 'unidad'}`;

        const cardClasses = ['product-card'];
        if (isOut) cardClasses.push('is-out-of-stock');

        return `<article class="${cardClasses.join(' ')}" style="animation-delay:${Math.min(index, 7) * 35}ms">
          <div class="product-image">
            <img src="${escapeHtml(formatImageUrl(product.image))}" alt="${escapeHtml(product.name)}" loading="lazy" onerror="this.onerror=null;this.src='assets/images/logo-mascota.jpeg';">
            <span class="product-tag">${isOut ? 'Agotado hoy' : escapeHtml(product.category)}</span>
            ${isBestseller ? '<span class="product-badge-bestseller">★ Más vendido</span>' : ''}
            ${isOut 
              ? '<button class="add-product is-out-stock-btn" type="button" aria-disabled="true">Agotado</button>' 
              : `<button class="add-product${isSelected ? ' is-added' : ''}" type="button" data-add="${escapeHtml(product.id)}" aria-label="${isSelected ? 'Quitar' : 'Agregar'} ${escapeHtml(product.name)} ${isSelected ? 'de' : 'a'} mi lista" aria-pressed="${isSelected}">${isSelected ? '✓' : '+'}</button>`
            }
          </div>
          <div class="product-info">
            <div class="product-info-header">
              <h3>${escapeHtml(product.name)}</h3>
            </div>
            <div class="product-sale-line">
              <span class="product-sale-unit">${escapeHtml(saleUnit)}</span>
              <strong class="product-price">${productPriceLabel(product)}</strong>
            </div>
            <p class="product-availability">${isOut ? '<span class="product-badge">Agotado</span>Surtido en camino' : 'Sujeto a disponibilidad'}</p>
          </div>
        </article>`;
      }).join('');
      productGrid.querySelectorAll('[data-add]').forEach((button) => button.addEventListener('click', () => toggleProduct(button.dataset.add)));
    }
    catalogCount.textContent = filtered.length ? `Mostrando ${visible.length} de ${filtered.length} productos` : '0 productos';
    showMoreButton.hidden = filtered.length <= visibleCount;
  }

  function toggleProduct(id) {
    const product = products.find((item) => item.id === id);
    if (!product) return;
    if (selected.has(id)) {
      selected.delete(id);
      saveSelected();
      renderProducts();
      renderSpecialsShowcase();
      renderDrawerItems();
      return;
    }
    openPortionModal(product);
  }

  const portionBackdrop = document.querySelector('#portion-modal-backdrop');
  const portionWrapper = document.querySelector('#portion-modal-wrapper');
  const portionClose = document.querySelector('#portion-modal-close');
  const portionCancel = document.querySelector('#portion-cancel-btn');
  const portionConfirm = document.querySelector('#portion-confirm-btn');
  let activePortionProduct = null;
  let portionMode = 'peso';
  let portionValue = 250;

  function openPortionModal(product) {
    activePortionProduct = product;
    const tab = document.querySelector('#portion-tab-toggle');
    const title = document.querySelector('#modal-product-title');
    const subtitle = document.querySelector('#modal-product-subtitle');
    const body = document.querySelector('#modal-dynamic-body');
    const saleType = product.saleType;

    title.textContent = product.name;
    subtitle.textContent = formatProductSubtitle(product);
    body.innerHTML = '';

    if (saleType === 'peso') {
      tab.hidden = false;
      portionMode = 'peso';
      portionValue = 250;
      document.querySelectorAll('.portion-tab-btn').forEach((button) => {
        button.classList.toggle('is-active', button.dataset.tab === 'peso');
        button.setAttribute('aria-pressed', String(button.dataset.tab === 'peso'));
      });
      renderWeightFields();
    } else if (saleType === 'monto') {
      tab.hidden = true;
      portionMode = 'monto';
      const minimum = getMinimumAmount(product);
      portionValue = minimum;
      renderMoneyFields(minimum);
    } else {
      tab.hidden = true;
      portionMode = 'unidad';
      const minimum = product.minimum || 1;
      const increment = product.increment || 1;
      portionValue = minimum;
      renderUnitFields(minimum, increment);
    }

    portionBackdrop.hidden = false;
    portionWrapper.hidden = false;
    document.body.classList.add('no-scroll');
    requestAnimationFrame(() => portionClose.focus());
  }

  function formatProductSubtitle(product) {
    const price = parseDecimal(product.price);
    if (product.saleType === 'monto') return `Venta por monto · desde $${formatMoney(product.minimum || 2)} · sin peso estándar`;
    if (!price) return `${product.unit || 'unidad'} · Consulta disponibilidad`;
    if (product.saleType === 'peso') return `${product.unit || 'kg'} · $${formatMoney(price)} por kg · sujeto a disponibilidad`;
    return `$${formatMoney(price)} por ${product.unit || 'unidad'} · sujeto a disponibilidad`;
  }

  function productPriceLabel(product) {
    if (product.saleType === 'monto') return `Desde $${formatMoney(product.minimum || 2)}`;
    const price = parseDecimal(product.price);
    if (!price) return 'Consultar precio';
    return `$${formatMoney(price)}`;
  }

  function formatMoney(value) {
    return Number(value).toLocaleString('es-MX', { minimumFractionDigits: Number.isInteger(Number(value)) ? 0 : 2, maximumFractionDigits: 2 });
  }

  function getMinimumAmount(product) {
    if (product.saleType !== 'monto') return parseDecimal(product.minimumAmount) || 10;
    if (product.minimum) return product.minimum;
    const name = normalize(product.name);
    return name.includes('cilantro') || name.includes('manzanilla') ? 5 : 2;
  }

  function updatePortionSummary() {
    const product = activePortionProduct;
    if (!product) return;
    const pricePerKg = product.saleType === 'peso' ? parseDecimal(product.price) : 0;
    const value = Number(portionValue);
    let amount = 0;
    let label = '';

    if (portionMode === 'peso') {
      amount = pricePerKg * (portionValue / 1000);
      label = `${portionValue >= 1000 ? (portionValue / 1000).toLocaleString('es-MX') + ' kg' : portionValue + ' g'}`;
    } else if (portionMode === 'monto') {
      amount = value;
      label = `$${formatMoney(value)}`;
    } else {
      amount = parseDecimal(product.price) * value;
      label = `${value} ${product.unit || 'unidad'}${value === 1 ? '' : 's'}`;
    }

    document.querySelector('#portion-calc-label').textContent = portionMode === 'peso' ? 'Importe estimado por peso' : 'Importe estimado';
    document.querySelector('#portion-calc-value').textContent = `$${formatMoney(amount)} MXN`;
    document.querySelector('#modal-product-subtitle').dataset.summary = label;

    const weightEstimate = document.querySelector('#portion-weight-estimate');
    const canEstimateWeight = portionMode === 'monto' && product.saleType === 'peso';
    const approximateGrams = canEstimateWeight ? estimateGramsForAmount(product, value) : 0;
    weightEstimate.hidden = !canEstimateWeight;
    weightEstimate.textContent = !canEstimateWeight
      ? ''
      : approximateGrams
        ? `Aproximadamente ${formatGrams(approximateGrams)} por este monto. Es un cálculo orientativo; el peso final puede variar.`
        : 'Agrega el precio por kg para mostrar una estimación de peso.';
  }

  function estimateGramsForAmount(product, amount) {
    const pricePerKg = product.saleType === 'peso' ? parseDecimal(product.price) : 0;
    if (pricePerKg <= 0 || amount <= 0) return 0;
    return Math.round((amount / pricePerKg) * 1000);
  }

  function formatGrams(grams) {
    return grams >= 1000
      ? `${formatMoney(grams / 1000)} kg`
      : `${formatMoney(grams)} g`;
  }

  function renderWeightFields() {
    const body = document.querySelector('#modal-dynamic-body');
    const minimum = activePortionProduct.minimum || 50;
    const increment = activePortionProduct.increment || 50;
    portionValue = Math.max(portionValue, minimum);
    const presets = [250, 500, 1000];
    body.innerHTML = `
      <div class="portion-presets-grid">
        ${presets.map((grams) => `<button type="button" class="portion-preset-btn" data-grams="${grams}"${grams < minimum ? ' disabled' : ''}><strong>${grams === 250 ? '¼ kg' : grams === 500 ? '½ kg' : '1 kg'}</strong><small>${grams} g</small></button>`).join('')}
      </div>
      <div class="portion-manual-group">
        <label class="portion-manual-label" for="portion-grams">O escribe el peso en gramos</label>
        <div class="portion-input-wrap"><input id="portion-grams" type="number" inputmode="decimal" min="${minimum}" step="${increment}" value="${portionValue}"><span>g</span></div>
      </div>`;
    body.querySelectorAll('[data-grams]').forEach((button) => {
      button.classList.toggle('is-selected', Number(button.dataset.grams) === portionValue);
      button.addEventListener('click', () => {
        portionValue = Number(button.dataset.grams);
        body.querySelectorAll('[data-grams]').forEach((item) => item.classList.toggle('is-selected', item === button));
        document.querySelector('#portion-grams').value = portionValue;
        updatePortionSummary();
      });
    });
    const input = body.querySelector('#portion-grams');
    input.addEventListener('input', () => {
      portionValue = Math.max(0, parseDecimal(input.value));
      body.querySelectorAll('[data-grams]').forEach((item) => item.classList.toggle('is-selected', Number(item.dataset.grams) === portionValue));
      updatePortionSummary();
    });
    updatePortionSummary();
  }

  function renderMoneyFields(minimum) {
    const body = document.querySelector('#modal-dynamic-body');
    const increment = activePortionProduct.saleType === 'monto' ? activePortionProduct.increment || 1 : 1;
    body.innerHTML = `
      <div class="portion-stepper-wrap">
        <button type="button" class="portion-stepper-btn" id="portion-minus" aria-label="Disminuir monto">−</button>
        <strong class="portion-stepper-val" id="portion-money-value">$${formatMoney(minimum)}</strong>
        <button type="button" class="portion-stepper-btn" id="portion-plus" aria-label="Aumentar monto">+</button>
      </div>
      <div class="portion-manual-group">
        <label class="portion-manual-label" for="portion-money">También puedes escribir el monto</label>
        <div class="portion-input-wrap"><span>$</span><input id="portion-money" type="number" inputmode="numeric" min="${minimum}" step="${increment}" value="${minimum}"><span>MXN</span></div>
      </div>`;

    const minus = body.querySelector('#portion-minus');
    const plus = body.querySelector('#portion-plus');
    const input = body.querySelector('#portion-money');
    const valueLabel = body.querySelector('#portion-money-value');
    const applyValue = (value) => {
      const numeric = parseDecimal(value);
      portionValue = Math.max(minimum, numeric);
      input.value = String(portionValue);
      valueLabel.textContent = `$${formatMoney(portionValue)}`;
      updatePortionSummary();
    };
    minus.addEventListener('click', () => applyValue(Math.max(minimum, portionValue - increment)));
    plus.addEventListener('click', () => applyValue(portionValue + increment));
    input.addEventListener('input', () => applyValue(input.value));
    updatePortionSummary();
  }

  function renderUnitFields(minimum, increment) {
    const body = document.querySelector('#modal-dynamic-body');
    const unit = activePortionProduct.unit || 'unidad';
    body.innerHTML = `
      <div class="portion-stepper-wrap">
        <button type="button" class="portion-stepper-btn" id="portion-minus" aria-label="Disminuir cantidad">−</button>
        <strong class="portion-stepper-val" id="portion-unit-value">${portionValue}</strong>
        <button type="button" class="portion-stepper-btn" id="portion-plus" aria-label="Aumentar cantidad">+</button>
      </div>
      <div class="portion-manual-group">
        <label class="portion-manual-label" for="portion-unit">Cantidad en ${unit}</label>
        <div class="portion-input-wrap"><input id="portion-unit" type="number" inputmode="decimal" min="${minimum}" step="${increment}" value="${portionValue}"><span>${unit}</span></div>
      </div>`;

    const minus = body.querySelector('#portion-minus');
    const plus = body.querySelector('#portion-plus');
    const input = body.querySelector('#portion-unit');
    const valueLabel = body.querySelector('#portion-unit-value');
    const applyValue = (value) => {
      const numeric = parseDecimal(value);
      portionValue = Math.max(minimum, numeric);
      input.value = String(portionValue);
      valueLabel.textContent = String(portionValue);
      updatePortionSummary();
    };
    minus.addEventListener('click', () => applyValue(Math.max(minimum, portionValue - increment)));
    plus.addEventListener('click', () => applyValue(portionValue + increment));
    input.addEventListener('input', () => applyValue(input.value));
    updatePortionSummary();
  }

  function closePortionModal() {
    portionBackdrop.hidden = true;
    portionWrapper.hidden = true;
    document.body.classList.remove('no-scroll');
    activePortionProduct = null;
  }

  document.querySelectorAll('.portion-tab-btn').forEach((button) => {
    button.addEventListener('click', () => {
      portionMode = button.dataset.tab;
      document.querySelectorAll('.portion-tab-btn').forEach((item) => {
        const active = item === button;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-pressed', String(active));
      });
      portionValue = portionMode === 'peso' ? 250 : 10;
      renderWeightFields();
      if (portionMode === 'monto') {
        const minimum = getMinimumAmount(activePortionProduct);
        portionValue = minimum;
        renderMoneyFields(minimum);
      }
    });
  });

  portionClose.addEventListener('click', closePortionModal);
  portionCancel.addEventListener('click', closePortionModal);
  portionBackdrop.addEventListener('click', closePortionModal);
  portionConfirm.addEventListener('click', () => {
    if (!activePortionProduct) return;
    let valid = true;
    if (portionMode === 'peso') valid = portionValue >= (activePortionProduct.minimum || 50);
    if (portionMode === 'monto') valid = portionValue >= getMinimumAmount(activePortionProduct);
    if (portionMode === 'unidad') valid = portionValue >= (activePortionProduct.minimum || 1);
    if (!valid) return;

    const pricePerUnit = parseDecimal(activePortionProduct.price);
    let estimated = 0;
    if (portionMode === 'peso') estimated = pricePerUnit * (portionValue / 1000);
    if (portionMode === 'monto') estimated = portionValue;
    if (portionMode === 'unidad') estimated = pricePerUnit * portionValue;

    const weightEstimate = portionMode === 'monto' && activePortionProduct.saleType === 'peso'
      ? estimateGramsForAmount(activePortionProduct, portionValue)
      : 0;
    selected.set(activePortionProduct.id, {
      mode: portionMode,
      value: portionValue,
      unit: activePortionProduct.unit || 'unidad',
      estimated,
      weightEstimate
    });
    saveSelected();
    closePortionModal();
    renderProducts();
    renderSpecialsShowcase();
    renderDrawerItems();
  });

  function renderDrawerItems() {
    const chosen = products.filter((product) => selected.has(product.id));
    const totalCount = chosen.length;

    drawerItems.innerHTML = chosen.map((product) => {
      const entry = selected.get(product.id) || { mode: 'unidad', value: 1, unit: product.unit || 'unidad', estimated: parseDecimal(product.price) };
      let portionText = '';
      if (entry.mode === 'peso') portionText = entry.value >= 1000 ? `${entry.value / 1000} kg` : `${entry.value} g`;
      else if (entry.mode === 'monto') {
        const weightEstimate = product.saleType === 'peso' ? parseDecimal(entry.weightEstimate) : 0;
        portionText = `$${formatMoney(entry.value)}${weightEstimate ? ` · ${formatGrams(weightEstimate)} aproximadamente` : ''}`;
      }
      else portionText = `${entry.value} ${escapeHtml(entry.unit || product.unit || 'unidad')}`;
      const priceText = entry.estimated > 0 ? `$${formatMoney(entry.estimated)} MXN` : 'Precio por confirmar';
      return `<li class="drawer-item-card">
        <div class="drawer-item-img"><img src="${escapeHtml(formatImageUrl(product.image))}" alt="" onerror="this.onerror=null;this.src='assets/images/logo-mascota.jpeg';"></div>
        <div class="drawer-item-details">
          <div class="drawer-item-top"><strong>${escapeHtml(product.name)}</strong></div>
          <span class="drawer-item-portion">${portionText}</span>
          <div class="drawer-item-price-row"><span class="drawer-item-price">${priceText}</span><button type="button" class="drawer-item-remove" data-remove="${escapeHtml(product.id)}" aria-label="Quitar ${escapeHtml(product.name)}">Quitar</button></div>
        </div>
      </li>`;
    }).join('');

    drawerItems.querySelectorAll('[data-remove]').forEach((button) => {
      button.addEventListener('click', () => toggleProduct(button.dataset.remove));
    });

    drawerEmpty.hidden = totalCount > 0;
    drawerItems.hidden = totalCount === 0;
    if (drawerSummary) drawerSummary.hidden = totalCount === 0;

    // Calcular total estimado
    let estimatedTotal = 0;
    let itemsWithPrice = 0;
    chosen.forEach((p) => {
      const entry = selected.get(p.id);
      const num = entry ? parseDecimal(entry.estimated) : parseDecimal(p.price);
      if (num > 0) { estimatedTotal += num; itemsWithPrice++; }
    });

    if (drawerTotalAmount) {
      if (estimatedTotal > 0) {
        const hasUnpriced = itemsWithPrice < chosen.length;
        drawerTotalAmount.textContent = `$${estimatedTotal.toFixed(2)}${hasUnpriced ? '*' : ''}`;
        drawerTotalAmount.title = hasUnpriced ? 'Cálculo parcial basado en productos con precio publicado' : 'Total estimado';
      } else {
        drawerTotalAmount.textContent = 'Por confirmar';
        drawerTotalAmount.title = 'Precios a confirmar por peso en tienda';
      }
    }

    document.querySelector('#list-count').textContent = String(totalCount);
    listOpenButton.hidden = totalCount === 0;
    sendList.setAttribute('aria-disabled', String(totalCount === 0));

    // Formatear mensaje para WhatsApp (simple, directo y conversacional)
    const isDelivery = deliveryMode === 'domicilio';
    const lines = [
      'Hola, Recaudería La Base. Quiero hacer un pedido:\n',
      `*Modalidad:* ${isDelivery ? '🛵 Envío a domicilio' : '🏪 Recoger en tienda'}\n`,
      '*Productos:*'
    ];

    chosen.forEach((p) => {
      const entry = selected.get(p.id);
      let portion = '';
      if (entry?.mode === 'peso') portion = entry.value >= 1000 ? ` — ${entry.value / 1000} kg` : ` — ${entry.value} g`;
      else if (entry?.mode === 'monto') portion = ` — $${formatMoney(entry.value)}`;
      else if (entry) portion = ` — ${entry.value} ${entry.unit || p.unit || 'unidad'}`;
      const weightEstimate = p.saleType === 'peso' && entry?.mode === 'monto' ? parseDecimal(entry.weightEstimate) : 0;
      const pricePart = entry?.estimated > 0 ? ` ($${formatMoney(entry.estimated)} MXN)` : '';
      const weightPart = weightEstimate ? ` (${formatGrams(weightEstimate)} aproximadamente)` : '';
      lines.push(`• ${p.name}${portion}${weightPart}${pricePart}`);
    });

    if (estimatedTotal > 0) {
      lines.push('');
      lines.push(`*Total estimado:* $${estimatedTotal.toFixed(2)} MXN`);
    }

    lines.push('\n¿Me confirman disponibilidad y total, por favor?');

    sendList.href = totalCount > 0 ? waUrl(lines.join('\n')) : '#pedidos';
  }

  function openDrawer() {
    lastFocus = document.activeElement;
    backdrop.hidden = false;
    drawer.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => drawer.classList.add('is-open'));
    document.body.classList.add('no-scroll');
    document.querySelector('#drawer-close').focus();
  }

  function closeDrawer() {
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    backdrop.hidden = true;
    document.body.classList.remove('no-scroll');
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
  }

  // Eventos de selección de entrega (Recoger vs Domicilio)
  deliveryChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      deliveryMode = chip.dataset.mode;
      deliveryChips.forEach((c) => {
        const active = c.dataset.mode === deliveryMode;
        c.classList.toggle('is-selected', active);
        c.setAttribute('aria-pressed', String(active));
      });
      if (deliveryHintText) deliveryHintText.hidden = deliveryMode !== 'domicilio';
      renderDrawerItems();
    });
  });

  searchInput.addEventListener('input', () => { visibleCount = pageSize; renderProducts(); });
  showMoreButton.addEventListener('click', () => { visibleCount += pageSize; renderProducts(); });
  listOpenButton.addEventListener('click', openDrawer);
  document.querySelector('#drawer-close').addEventListener('click', closeDrawer);
  backdrop.addEventListener('click', closeDrawer);

  sendList.addEventListener('click', (event) => { 
    if (selected.size === 0) event.preventDefault(); 
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !portionWrapper.hidden) closePortionModal();
    if (event.key === 'Escape' && drawer.classList.contains('is-open')) closeDrawer();
    if (event.key === 'Tab' && drawer.classList.contains('is-open')) {
      const focusable = [...drawer.querySelectorAll('a[href]:not([aria-disabled="true"]),button:not([disabled])')];
      if (event.shiftKey && document.activeElement === focusable[0]) { event.preventDefault(); focusable.at(-1).focus(); }
      else if (!event.shiftKey && document.activeElement === focusable.at(-1)) { event.preventDefault(); focusable[0].focus(); }
    }
  });

  const menuToggle = document.querySelector('.menu-toggle');
  const mainNav = document.querySelector('.main-nav');
  menuToggle.addEventListener('click', () => {
    const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
    menuToggle.setAttribute('aria-expanded', String(!expanded));
    menuToggle.setAttribute('aria-label', expanded ? 'Abrir menú' : 'Cerrar menú');
    mainNav.classList.toggle('is-open', !expanded);
  });
  mainNav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Abrir menú');
    mainNav.classList.remove('is-open');
  }));

  function observeReveals(root = document) {
    const nodes = root.querySelectorAll('.reveal:not(.is-visible)');
    if (!('IntersectionObserver' in window)) { nodes.forEach((node) => node.classList.add('is-visible')); return; }
    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); currentObserver.unobserve(entry.target); }
      });
    }, { threshold: 0.13 });
    nodes.forEach((node) => observer.observe(node));
  }

  document.querySelector('#current-year').textContent = new Date().getFullYear();
  renderCategories();
  renderFilters();
  renderSpecialsShowcase();
  renderProducts();
  renderDrawerItems();
  observeReveals();

  // Sincronizar catálogo con Google Sheets (si está configurada la URL)
  syncProductsFromSheets();

  // Actualización automática: consulta si hay cambios cuando el usuario regresa a la pestaña
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') syncProductsFromSheets();
  });
  window.addEventListener('focus', syncProductsFromSheets);

  // Verificación periódica silenciosa cada 30 segundos
  window.setInterval(syncProductsFromSheets, 30000);
})();
