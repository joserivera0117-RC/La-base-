(() => {
  // ==========================================================================
  // CONFIGURACIÓN DE RECAUDERÍA LA BASE
  // ==========================================================================
  const PHONE = '525543964883';
  const DEFAULT_MESSAGE = 'Hola, Recaudería La Base. Quiero consultar productos y hacer un pedido.';
  const ORDER_GREETING = 'Hola, quiero hacer un pedido en Recaudería La Base:';
  const FAVORITES_FILTER = '__favorites__';

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

  const PACKAGE_RECIPES = {
    ponche: {
      title: 'Ponche navideño',
      ingredients: [
        { id: 'PROD-002', name: 'Guayaba', quantity: 500, unit: 'g', step: 50 },
        { id: 'PROD-092', name: 'Manzana Amarilla Chica', quantity: 1000, unit: 'g', step: 50 },
        { id: 'PROD-069', name: 'Piloncillo Moreno', quantity: 2, unit: 'pieza', step: 1, priceNote: 'El importe final depende del peso de cada pieza.' },
        { id: 'PROD-082', name: 'Canela', quantity: 4, unit: 'pieza', step: 1 },
        { id: 'PROD-083', name: 'Jamaica', quantity: 100, unit: 'g', step: 50 },
        { id: 'PROD-081', name: 'Tamarindo', quantity: 200, unit: 'g', step: 50 },
        { id: 'PROD-076', name: 'Ciruela pasa', quantity: 150, unit: 'g', step: 50 },
        { id: 'PROD-089', name: 'Tejocote', quantity: 500, unit: 'g', step: 50 },
        { id: 'PROD-090', name: 'Caña de azúcar', quantity: 4, unit: 'pieza', step: 1 }
      ]
    },
    ensalada: {
      title: 'Ensalada de manzana',
      ingredients: [
        { id: 'PROD-091', name: 'Manzana Amarilla Grande', quantity: 1000, unit: 'g', step: 50 },
        { id: 'PROD-010', name: 'Piña', quantity: 1, unit: 'pieza', step: 1 },
        { id: 'PROD-077', name: 'Pasas', quantity: 100, unit: 'g', step: 50 },
        { id: 'PROD-084', name: 'Nuez', quantity: 150, unit: 'g', step: 50 },
        { id: 'PROD-086', name: 'Arándanos', quantity: 100, unit: 'g', step: 50 }
      ]
    }
  };

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
    const categoryNorm = normalize(p.category);
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
    if (['pieza por kg', 'pieza por kilo', 'pieza con precio por kg', 'pieza con precio por kilo'].includes(saleType)) {
      saleType = 'pieza-peso';
    }

    const configuredMinimum = parseDecimal(p.minimum || p.cantidadMinima);
    const minimum = isHerbSoldByAmount
      ? nmNorm.includes('cilantro') ? 5 : 2
      : configuredMinimum;
    const increment = parseDecimal(p.increment || p.incremento) || (saleType === 'monto' ? 1 : 0);
    const hasPieceOrderSetting = p.allowPieceOrder !== undefined && p.allowPieceOrder !== null && String(p.allowPieceOrder).trim() !== '';
    const pieceOrderExclusions = ['ejote', 'chicharo', 'frijol', 'espinaca', 'verdolaga'];
    const defaultPieceOrder = saleType === 'peso'
      && ['frutas', 'verduras y legumbres', 'chiles'].includes(categoryNorm)
      && !pieceOrderExclusions.some((name) => nmNorm.includes(name));
    const allowPieceOrder = hasPieceOrderSetting
      ? ['si', 'true', '1', 'yes', 'activo'].includes(normalize(p.allowPieceOrder))
      : defaultPieceOrder;
    const pieceWeightGrams = parseDecimal(p.pieceWeightGrams || p.approxPieceWeight);
    const regularPrice = parseDecimal(p.price);
    const offerPrice = parseDecimal(p.offerPrice);
    return {
      ...p,
      status,
      unit: p.unit || 'unidad',
      saleType,
      offerPrice,
      isOnSale: saleType !== 'monto' && regularPrice > 0 && offerPrice > 0 && offerPrice < regularPrice,
      allowPieceOrder,
      pieceWeightGrams: pieceWeightGrams > 0 ? pieceWeightGrams : 0,
      minimum: minimum > 0 ? minimum : undefined,
      increment: increment > 0 ? increment : undefined,
      isOutOfStock: stNorm.includes('agotado') || stNorm.includes('sin existencia') || stNorm.includes('terminado'),
      isSpecial: stNorm.includes('especial') || stNorm.includes('lleg') || stNorm.includes('pocas') || stNorm.includes('temporada'),
      isBestseller: p.isBestseller === true || p.isBestseller === 'SI' || BESTSELLERS.some((b) => nmNorm.includes(b))
    };
  }

  function getEffectivePrice(product) {
    return product.isOnSale ? parseDecimal(product.offerPrice) : parseDecimal(product.price);
  }

  // Catálogo inicial enriquecido
  let products = (Array.isArray(window.PRODUCTS) ? window.PRODUCTS : []).map(enrichProduct);

  const categoryGrid = document.querySelector('#category-grid');
  const filterList = document.querySelector('#filter-list');
  const productGrid = document.querySelector('#product-grid');
  const offersContainer = document.querySelector('#offers-container');
  const offersRow = document.querySelector('#offers-row');
  const searchInput = document.querySelector('#product-search');
  const heroSearchForm = document.querySelector('#hero-search-form');
  const heroSearchInput = document.querySelector('#hero-search');
  const heroSearchSuggestions = document.querySelector('#hero-search-suggestions');
  const productSearchSuggestions = document.querySelector('#product-search-suggestions');
  const catalogSearch = document.querySelector('.catalog-search-autocomplete');
  const showMoreButton = document.querySelector('#show-more');
  const catalogCount = document.querySelector('#catalog-count');
  const listOpenButton = document.querySelector('#list-open');
  const drawer = document.querySelector('#list-drawer');
  const backdrop = document.querySelector('#drawer-backdrop');
  const drawerBody = document.querySelector('.drawer-body');
  const drawerItems = document.querySelector('#drawer-items');
  const drawerEmpty = document.querySelector('#drawer-empty');
  const sendList = document.querySelector('#send-list');
  const drawerTotalAmount = document.querySelector('#drawer-total-amount');
  const drawerSummary = document.querySelector('#drawer-summary');
  const orderDeliveryMode = document.querySelector('#order-delivery-mode');
  const orderPaymentMethod = document.querySelector('#order-payment-method');
  const deliveryHintText = document.querySelector('#delivery-hint-text');
  const orderCustomerBackdrop = document.querySelector('#order-customer-backdrop');
  const orderCustomerWrapper = document.querySelector('#order-customer-wrapper');
  const orderCustomerForm = document.querySelector('#order-customer-form');
  const orderCustomerName = document.querySelector('#order-customer-name');
  const orderReferenceValue = document.querySelector('#order-reference-value');

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
  const selectedPackages = new Map();
  try {
    const savedPackages = JSON.parse(localStorage.getItem('labased_paquetes') || '[]');
    if (!Array.isArray(savedPackages)) throw new TypeError('El formato guardado debe ser una lista.');
    savedPackages.forEach((savedPackage) => {
      if (!savedPackage || typeof savedPackage.id !== 'string' || !PACKAGE_RECIPES[savedPackage.key] || !Array.isArray(savedPackage.ingredients)) return;
      const recipe = PACKAGE_RECIPES[savedPackage.key];
      const servings = Math.min(30, Math.max(2, parseDecimal(savedPackage.servings) || 10));
      const ingredients = savedPackage.ingredients
        .filter((ingredient) => ingredient && typeof ingredient.id === 'string' && typeof ingredient.name === 'string')
        .map((ingredient) => {
          const quantity = parseDecimal(ingredient.quantity);
          if (savedPackage.key === 'ponche' && ingredient.id === 'PROD-069' && ingredient.unit === 'g') {
            return {
              ...ingredient,
              quantity: Math.max(1, Math.round((quantity / 300) * 2 * (servings / 10))),
              unit: 'pieza',
              step: 1,
              priceNote: 'El importe final depende del peso de cada pieza.'
            };
          }
          return {
            ...ingredient,
            quantity,
            step: parseDecimal(ingredient.step) || 1
          };
        })
        .filter((ingredient) => ingredient.quantity > 0);
      if (!ingredients.length) return;
      selectedPackages.set(savedPackage.id, {
        id: savedPackage.id,
        key: savedPackage.key,
        title: recipe.title,
        servings,
        ingredients
      });
    });
  } catch (error) {
    console.warn('No se pudieron cargar los paquetes guardados.', error);
  }
  const saveSelectedPackages = () => {
    try {
      localStorage.setItem('labased_paquetes', JSON.stringify([...selectedPackages.values()]));
    } catch (error) {
      console.error('No se pudieron guardar los paquetes en este dispositivo.', error);
    }
  };
  const favoriteIds = new Set();
  try {
    const savedFavorites = JSON.parse(localStorage.getItem('labased_favoritos') || '[]');
    if (!Array.isArray(savedFavorites)) throw new TypeError('El formato guardado debe ser una lista.');
    savedFavorites.forEach((id) => {
      if (typeof id === 'string' || typeof id === 'number') favoriteIds.add(String(id));
    });
  } catch (error) {
    console.warn('No se pudieron cargar los favoritos guardados.', error);
  }
  function saveFavoriteIds() {
    try {
      localStorage.setItem('labased_favoritos', JSON.stringify([...favoriteIds]));
    } catch (error) {
      console.error('No se pudieron guardar los favoritos en este dispositivo.', error);
    }
  }
  const pageSize = 8;
  let activeCategory = 'Todos';
  let visibleCount = pageSize;
  let deliveryMode = 'recoger'; // 'recoger' | 'domicilio'
  let lastFocus = null;
  let currentOrderMessage = '';
  let activePackageKey = null;
  let activePackageListId = null;
  let packageServings = 10;
  let packageTrigger = null;

  // The hero carousel uses local artwork, manual controls, swipe, and optional autoplay.
  const swapStage = document.querySelector('#hero-swap');
  const swapCards = swapStage ? [...swapStage.querySelectorAll('.swap-card')] : [];
  const swapCounter = document.querySelector('#swap-counter');
  const swapPagination = [...document.querySelectorAll('[data-swap-to]')];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let swapTimer = null;
  let swapPaused = false;
  let swapHovered = false;
  let swapFocused = false;
  let swapBusy = false;
  let swipeStartX = null;
  let swipeResumeTimer = null;
  let suppressSwapClick = false;
  const swapDuration = 340;

  function activeSwapIndex() {
    return Number(swapStage?.querySelector('.swap-card:first-child')?.dataset.swapIndex || 0);
  }

  function updateSwapControls() {
    if (!swapStage) return;
    const activeIndex = activeSwapIndex();
    if (swapCounter) swapCounter.textContent = `${activeIndex + 1} / ${swapCards.length}`;
    swapPagination.forEach((button) => {
      const active = Number(button.dataset.swapTo) === activeIndex;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function resetSwapTimer() {
    window.clearInterval(swapTimer);
    swapTimer = null;
    if (!swapPaused) startSwap();
  }

  function finishSwap() {
    swapBusy = false;
    updateSwapControls();
    resetSwapTimer();
  }

  function showNextSwap() {
    if (!swapStage || swapBusy || swapCards.length < 2) return;
    swapBusy = true;
    const front = swapStage.querySelector('.swap-card:first-child');
    front.classList.add('is-leaving');
    window.setTimeout(() => {
      front.classList.remove('is-leaving');
      swapStage.appendChild(front);
      finishSwap();
    }, swapDuration);
  }

  function showPreviousSwap() {
    if (!swapStage || swapBusy || swapCards.length < 2) return;
    swapBusy = true;
    const back = swapStage.querySelector('.swap-card:last-child');
    back.classList.add('is-entering');
    swapStage.prepend(back);
    window.setTimeout(() => {
      back.classList.remove('is-entering');
      finishSwap();
    }, swapDuration);
  }

  function moveSwapTo(index) {
    if (!swapStage || swapBusy || index === activeSwapIndex()) return;
    resetSwapTimer();
    const total = swapCards.length;
    const forward = (index - activeSwapIndex() + total) % total;
    const backward = (activeSwapIndex() - index + total) % total;
    const move = forward <= backward ? showNextSwap : showPreviousSwap;
    move();
    window.setTimeout(() => moveSwapTo(index), swapDuration + 40);
  }

  function startSwap() {
    if (!swapStage || reducedMotion.matches || swapPaused || swapTimer || swapCards.length < 2) return;
    swapTimer = window.setInterval(() => {
      showNextSwap();
    }, 2600);
  }
  function pauseSwap() { swapPaused = true; window.clearInterval(swapTimer); swapTimer = null; }
  function resumeSwap() { swapPaused = false; startSwap(); }
  function scheduleSwapResume() {
    window.clearTimeout(swipeResumeTimer);
    if (!swapHovered && !swapFocused) {
      swipeResumeTimer = window.setTimeout(resumeSwap, swapDuration);
    }
  }
  if (swapStage) {
    const swapRegion = swapStage.parentElement;
    swapRegion.addEventListener('mouseenter', () => {
      swapHovered = true;
      pauseSwap();
    });
    swapRegion.addEventListener('mouseleave', () => {
      swapHovered = false;
      if (!swapFocused) resumeSwap();
    });
    swapRegion.addEventListener('focusin', () => {
      swapFocused = true;
      pauseSwap();
    });
    swapRegion.addEventListener('focusout', (event) => {
      if (!swapRegion.contains(event.relatedTarget)) {
        swapFocused = false;
        if (!swapHovered) resumeSwap();
      }
    });
    swapStage.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        showNextSwap();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        showPreviousSwap();
      }
    });
    swapStage.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'touch') {
        window.clearTimeout(swipeResumeTimer);
        swipeStartX = event.clientX;
        pauseSwap();
        swapStage.setPointerCapture(event.pointerId);
      }
    });
    swapStage.addEventListener('pointerup', (event) => {
      if (swipeStartX === null) return;
      const swipeDistance = event.clientX - swipeStartX;
      swipeStartX = null;
      if (Math.abs(swipeDistance) >= 45) {
        suppressSwapClick = true;
        window.setTimeout(() => { suppressSwapClick = false; }, 300);
        if (swipeDistance < 0) showNextSwap();
        else showPreviousSwap();
      }
      scheduleSwapResume();
    });
    swapStage.addEventListener('pointercancel', () => {
      swipeStartX = null;
      scheduleSwapResume();
    });
    swapStage.addEventListener('click', (event) => {
      if (suppressSwapClick) {
        event.preventDefault();
        suppressSwapClick = false;
        return;
      }
      const card = event.target.closest('.swap-card');
      const destination = card && document.querySelector(card.getAttribute('href'));
      if (destination?.hidden) {
        event.preventDefault();
        window.location.hash = '#productos';
      }
    }, true);
    document.querySelector('#swap-next')?.addEventListener('click', showNextSwap);
    document.querySelector('#swap-previous')?.addEventListener('click', showPreviousSwap);
    swapPagination.forEach((button) => {
      button.addEventListener('click', () => moveSwapTo(Number(button.dataset.swapTo)));
    });
    updateSwapControls();
    reducedMotion.addEventListener?.('change', () => {
      if (reducedMotion.matches) pauseSwap();
      else if (!swapHovered && !swapFocused) resumeSwap();
    });
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

  const packageModalBackdrop = document.querySelector('#package-modal-backdrop');
  const packageModalWrapper = document.querySelector('#package-modal-wrapper');
  const packageModalTitle = document.querySelector('#package-modal-title');
  const packageModalContent = document.querySelector('.package-modal-content');
  const packageIngredients = document.querySelector('#package-ingredients');
  const packageServingsValue = document.querySelector('#package-servings-value');
  const packageTotal = document.querySelector('#package-total');
  const packageSendLabel = document.querySelector('#package-send-label');
  let activePackageIngredients = [];

  function estimatePackageIngredient(ingredient) {
    if (!ingredient.id) return 0;
    const product = products.find((item) => item.id === ingredient.id)
      || products.find((item) => normalize(item.name) === normalize(ingredient.name));
    if (!product) return 0;
    const price = getEffectivePrice(product);
    if (ingredient.unit === 'g' || ingredient.unit === 'ml') return price * (ingredient.quantity / 1000);
    if (ingredient.unit === 'pieza' && ['peso', 'pieza-peso'].includes(product.saleType)) {
      return price * (product.pieceWeightGrams * ingredient.quantity / 1000);
    }
    return price * ingredient.quantity;
  }

  function getPackageEstimate(ingredients) {
    return ingredients.reduce((estimate, ingredient) => {
      const amount = estimatePackageIngredient(ingredient);
      if (amount <= 0) return { ...estimate, hasUnpriced: true };
      return { total: estimate.total + Math.round(amount), hasUnpriced: estimate.hasUnpriced };
    }, { total: 0, hasUnpriced: false });
  }

  function formatPackageQuantity(ingredient) {
    if (ingredient.unit === 'g') return `${formatQuantity(ingredient.quantity)} g`;
    if (ingredient.unit === 'ml') return `${formatQuantity(ingredient.quantity)} ml`;
    if (ingredient.unit === 'pieza') return `${formatQuantity(ingredient.quantity)} ${ingredient.quantity === 1 ? 'pieza' : 'piezas'}`;
    if (ingredient.unit === 'lata') return `${formatQuantity(ingredient.quantity)} ${ingredient.quantity === 1 ? 'lata' : 'latas'}`;
    return `${formatQuantity(ingredient.quantity)} ${ingredient.unit || ''}`;
  }

  function updatePackageEstimate() {
    const estimate = getPackageEstimate(activePackageIngredients);
    packageTotal.textContent = estimate.total > 0
      ? `$${formatMoney(estimate.total)}${estimate.hasUnpriced ? '*' : ''} MXN`
      : 'Por confirmar';
    packageTotal.title = estimate.hasUnpriced ? 'Estimación parcial; hay precios por confirmar' : 'Total estimado';
  }

  function renderPackageIngredients() {
    if (!packageIngredients) return;
    packageIngredients.innerHTML = activePackageIngredients.map((ingredient, index) => `
      <div class="package-ingredient">
        <div class="package-ingredient-name">
          <strong>${escapeHtml(ingredient.name)}</strong>
          ${ingredient.priceNote ? `<small>${escapeHtml(ingredient.priceNote)}</small>` : ''}
        </div>
        <button type="button" data-package-minus="${index}" aria-label="Disminuir ${escapeHtml(ingredient.name)}">−</button>
        <span class="package-ingredient-value">${formatPackageQuantity(ingredient)}</span>
        <button type="button" data-package-plus="${index}" aria-label="Aumentar ${escapeHtml(ingredient.name)}">+</button>
        <button type="button" class="package-ingredient-remove" data-package-remove="${index}" aria-label="Quitar ${escapeHtml(ingredient.name)} del paquete"${activePackageIngredients.length === 1 ? ' disabled' : ''}>×</button>
      </div>`).join('');

    packageIngredients.querySelectorAll('[data-package-minus]').forEach((button) => {
      button.addEventListener('click', () => {
        const ingredient = activePackageIngredients[Number(button.dataset.packageMinus)];
        const minimum = ingredient.unit === 'pieza' || ingredient.unit === 'lata' ? 1 : ingredient.step;
        ingredient.quantity = Math.max(minimum, ingredient.quantity - ingredient.step);
        renderPackageIngredients();
        updatePackageEstimate();
      });
    });
    packageIngredients.querySelectorAll('[data-package-remove]').forEach((button) => {
      button.addEventListener('click', () => {
        if (activePackageIngredients.length <= 1) return;
        activePackageIngredients.splice(Number(button.dataset.packageRemove), 1);
        renderPackageIngredients();
        updatePackageEstimate();
      });
    });
    packageIngredients.querySelectorAll('[data-package-plus]').forEach((button) => {
      button.addEventListener('click', () => {
        const ingredient = activePackageIngredients[Number(button.dataset.packagePlus)];
        ingredient.quantity += ingredient.step;
        renderPackageIngredients();
        updatePackageEstimate();
      });
    });
  }

  function openPackageModal(key) {
    const recipe = PACKAGE_RECIPES[key];
    if (!recipe || !packageModalWrapper) return;
    activePackageKey = key;
    activePackageListId = null;
    packageServings = 10;
    activePackageIngredients = recipe.ingredients.map((ingredient) => ({ ...ingredient }));
    packageModalTitle.textContent = recipe.title;
    packageServingsValue.textContent = '10';
    packageSendLabel.textContent = 'Agregar paquete a mi lista';
    renderPackageIngredients();
    updatePackageEstimate();
    packageModalContent.scrollTop = 0;
    packageModalBackdrop.hidden = false;
    packageModalWrapper.hidden = false;
    document.body.classList.add('no-scroll');
    document.querySelector('#package-modal-close').focus();
  }

  function openSavedPackage(packageId, trigger) {
    const savedPackage = selectedPackages.get(packageId);
    if (!savedPackage || !packageModalWrapper) return;
    activePackageListId = packageId;
    activePackageKey = savedPackage.key;
    packageTrigger = trigger;
    packageServings = savedPackage.servings;
    activePackageIngredients = savedPackage.ingredients.map((ingredient) => ({ ...ingredient }));
    packageModalTitle.textContent = savedPackage.title;
    packageServingsValue.textContent = String(packageServings);
    packageSendLabel.textContent = 'Guardar cambios en mi lista';
    renderPackageIngredients();
    updatePackageEstimate();
    packageModalContent.scrollTop = 0;
    packageModalBackdrop.hidden = false;
    packageModalWrapper.hidden = false;
    document.body.classList.add('no-scroll');
    document.querySelector('#package-modal-close').focus();
  }

  function closePackageModal() {
    packageModalBackdrop.hidden = true;
    packageModalWrapper.hidden = true;
    activePackageListId = null;
    if (!drawer.classList.contains('is-open')) document.body.classList.remove('no-scroll');
    if (packageTrigger?.isConnected) packageTrigger.focus();
  }

  document.querySelectorAll('[data-package]').forEach((button) => {
    button.addEventListener('click', () => {
      packageTrigger = button;
      openPackageModal(button.dataset.package);
    });
  });
  document.querySelector('#package-modal-close')?.addEventListener('click', closePackageModal);
  packageModalBackdrop?.addEventListener('click', closePackageModal);
  document.querySelector('#package-minus')?.addEventListener('click', () => {
    if (packageServings <= 2) return;
    const previous = packageServings;
    packageServings -= 1;
    activePackageIngredients.forEach((ingredient) => {
      ingredient.quantity = Math.max(ingredient.step, Math.round((ingredient.quantity / previous) * packageServings / ingredient.step) * ingredient.step);
    });
    packageServingsValue.textContent = String(packageServings);
    renderPackageIngredients();
    updatePackageEstimate();
  });
  document.querySelector('#package-plus')?.addEventListener('click', () => {
    if (packageServings >= 30) return;
    const previous = packageServings;
    packageServings += 1;
    activePackageIngredients.forEach((ingredient) => {
      ingredient.quantity = Math.max(ingredient.step, Math.round((ingredient.quantity / previous) * packageServings / ingredient.step) * ingredient.step);
    });
    packageServingsValue.textContent = String(packageServings);
    renderPackageIngredients();
    updatePackageEstimate();
  });
  document.querySelector('#package-send')?.addEventListener('click', () => {
    const recipe = PACKAGE_RECIPES[activePackageKey];
    if (!recipe) return;
    if (activePackageListId) {
      const packageId = activePackageListId;
      selectedPackages.set(packageId, {
        id: packageId,
        key: activePackageKey,
        title: recipe.title,
        servings: packageServings,
        ingredients: activePackageIngredients.map((ingredient) => ({ ...ingredient }))
      });
      saveSelectedPackages();
      closePackageModal();
      renderDrawerItems();
      drawerItems.querySelector(`[data-edit-package="${packageId}"]`)?.focus();
      activePackageListId = null;
      return;
    }

    const id = `paquete-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    selectedPackages.set(id, {
      id,
      key: activePackageKey,
      title: recipe.title,
      servings: packageServings,
      ingredients: activePackageIngredients.map((ingredient) => ({ ...ingredient }))
    });
    saveSelectedPackages();
    closePackageModal();
    renderDrawerItems();
    drawerBody.scrollTop = drawerBody.scrollHeight;
    openDrawer(packageTrigger);
  });

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
    const regularPriceIdx = rawHeaders.findIndex((header) => ['precio', 'price', 'costo'].includes(header));
    const priceIdx = regularPriceIdx !== -1 ? regularPriceIdx : findIndex('precio', 'price', 'costo');
    const offerPriceIdx = findIndex('precio oferta', 'precio promocional', 'precio rebaja', 'offer price', 'sale price');
    const activeIdx = findIndex('activo', 'active', 'mostrar', 'visible');
    const statusIdx = findIndex('estado', 'status', 'disponibilidad');
    const imgIdx = findIndex('imagen', 'image', 'foto', 'url');
    const destIdx = findIndex('destacado', 'popular', 'mas vendido');
    const saleTypeIdx = findIndex('tipo venta', 'tipo de venta', 'venta por', 'presentacion');
    const minimumIdx = findIndex('cantidad minima', 'minimo', 'venta minima');
    const incrementIdx = findIndex('incremento', 'de cuanto en cuanto', 'pasos');
    const pieceWeightIdx = findIndex('peso aprox. por pieza', 'peso aprox por pieza', 'peso aproximado por pieza', 'gramos aprox por pieza');
    const allowPieceIdx = findIndex('permitir compra por pieza', 'habilitar compra por pieza', 'permitir por pieza');

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
      const offerPrice = (offerPriceIdx !== -1 && r[offerPriceIdx]) ? String(parseDecimal(r[offerPriceIdx])).replace(/\.0$/, '') : '';
      const status = (statusIdx !== -1 && r[statusIdx]) ? r[statusIdx].trim() : 'Disponible';
      const image = (imgIdx !== -1 && r[imgIdx]) ? r[imgIdx].trim() : '';
      const isExplicitBestseller = destIdx !== -1 && (normalize(r[destIdx]) === 'si' || normalize(r[destIdx]) === 'true');
      const saleType = saleTypeIdx !== -1 ? r[saleTypeIdx].trim() : '';
      const minimum = minimumIdx !== -1 ? r[minimumIdx].trim() : '';
      const increment = incrementIdx !== -1 ? r[incrementIdx].trim() : '';
      const pieceWeightGrams = pieceWeightIdx !== -1 ? parseDecimal(r[pieceWeightIdx]) : 0;
      const allowPieceOrder = allowPieceIdx !== -1 && r[allowPieceIdx]
        ? ['si', 'true', '1', 'yes', 'activo'].includes(normalize(r[allowPieceIdx]))
        : undefined;

      result.push(enrichProduct({
        id,
        name,
        category,
        unit,
        price,
        offerPrice,
        status,
        image: formatImageUrl(image),
        saleType,
        minimum,
        increment,
        pieceWeightGrams,
        allowPieceOrder,
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
          renderOffersShowcase();
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
      productGrid.scrollIntoView({ behavior: 'instant', block: 'start' });
    }));
    observeReveals(categoryGrid);
  }

  function renderFilters() {
    const productCategories = [...new Set(products.map((p) => p.category).filter(Boolean))];
    const baseNames = CATEGORY_META.map((category) => category.name);
    const categoryNames = [...new Set([...baseNames, ...productCategories])];
    const filters = [
      { label: 'Todos', value: 'Todos' },
      { label: 'Favoritos', value: FAVORITES_FILTER },
      ...categoryNames.map((name) => ({ label: name, value: name }))
    ];

    filterList.innerHTML = filters.map(({ label, value }) => `<button class="filter-chip" type="button" data-filter="${escapeHtml(value)}" aria-pressed="${value === activeCategory}">${escapeHtml(label)}</button>`).join('');
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
      const priceText = productPriceMarkup(product);
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
            <button class="special-card-btn${isSelected ? ' is-added' : ''}" type="button" data-add="${escapeHtml(product.id)}" aria-label="${isSelected ? 'Modificar' : 'Agregar'} ${escapeHtml(product.name)} ${isSelected ? 'en' : 'a'} mi lista" aria-pressed="${isSelected}">
              ${isSelected ? '✓ Modificar' : '+ Agregar'}
            </button>
          </div>
        </div>
      </article>`;
    }).join('');

    specialsRow.querySelectorAll('[data-add]').forEach((btn) => {
      btn.addEventListener('click', () => toggleProduct(btn.dataset.add));
    });
  }

  function renderOffersShowcase() {
    if (!offersContainer || !offersRow) return;
    const offerProducts = products.filter((product) => product.isOnSale && !product.isOutOfStock);
    if (!offerProducts.length) {
      offersContainer.hidden = true;
      offersRow.innerHTML = '';
      return;
    }

    offersContainer.hidden = false;
    offersRow.innerHTML = offerProducts.map((product) => {
      const isSelected = selected.has(product.id);
      const discountPercent = Math.max(1, Math.round((1 - getEffectivePrice(product) / parseDecimal(product.price)) * 100));
      const saleUnit = ['peso', 'pieza-peso'].includes(product.saleType)
        ? 'Precio por kg'
        : `Por ${product.unit || 'unidad'}`;
      return `<article class="special-card offer-card">
        <div class="special-card-img">
          <img src="${escapeHtml(formatImageUrl(product.image))}" alt="${escapeHtml(product.name)}" loading="lazy" onerror="this.onerror=null;this.src='assets/images/logo-mascota.jpeg';">
          <span class="special-tag offer-tag">Rebaja · ${discountPercent}%</span>
        </div>
        <div class="special-card-info">
          <h4>${escapeHtml(product.name)}</h4>
          <p>${escapeHtml(product.category || 'Producto')} · ${escapeHtml(saleUnit)}</p>
          <span class="special-card-price">${productPriceMarkup(product)}</span>
          <button class="special-card-btn${isSelected ? ' is-added' : ''}" type="button" data-add="${escapeHtml(product.id)}" aria-label="${isSelected ? 'Modificar' : 'Agregar'} ${escapeHtml(product.name)} ${isSelected ? 'en' : 'a'} mi lista" aria-pressed="${isSelected}">
            ${isSelected ? '✓ Modificar' : '+ Agregar'}
          </button>
        </div>
      </article>`;
    }).join('');

    offersRow.querySelectorAll('[data-add]').forEach((button) => {
      button.addEventListener('click', () => toggleProduct(button.dataset.add));
    });
  }

  function getFilteredProducts() {
    const term = normalize(searchInput.value);
    const matches = products.filter((product) => {
      const matchesCategory = activeCategory === 'Todos'
        || activeCategory === FAVORITES_FILTER
        || normalize(product.category) === normalize(activeCategory);
      const matchesFavorite = activeCategory !== FAVORITES_FILTER || favoriteIds.has(String(product.id));
      const matchesSearch = !term || normalize(`${product.name} ${product.category} ${product.unit}`).includes(term);
      return matchesCategory && matchesFavorite && matchesSearch;
    });

    // Ordenamiento orgánico y profesional:
    // 1. Disponibles con mayor demanda (Bestsellers) al principio de su categoría.
    // 2. Disponibles regulares.
    // 3. Productos Agotados al final (para que el cliente sepa que se manejan, pero sin estorbar).
    return matches.sort((a, b) => {
      if (a.isOutOfStock && !b.isOutOfStock) return 1;
      if (!a.isOutOfStock && b.isOutOfStock) return -1;
      const aOnSale = a.isOnSale && !a.isOutOfStock;
      const bOnSale = b.isOnSale && !b.isOutOfStock;
      if (aOnSale && !bOnSale) return -1;
      if (!aOnSale && bOnSale) return 1;
      if (a.isBestseller && !b.isBestseller) return -1;
      if (!a.isBestseller && b.isBestseller) return 1;
      return 0;
    });
  }

  function getAvailableSubstitutes(product) {
    return products
      .filter((candidate) => (
        String(candidate.id) !== String(product.id)
        && candidate.category === product.category
        && !candidate.isOutOfStock
      ))
      .sort((a, b) => Number(Boolean(b.isBestseller)) - Number(Boolean(a.isBestseller)))
      .slice(0, 3);
  }

  function renderProducts() {
    const filtered = getFilteredProducts();
    const visible = filtered.slice(0, visibleCount);
    if (!visible.length) {
      productGrid.innerHTML = activeCategory === FAVORITES_FILTER
        ? `<div class="empty-results"><strong>${favoriteIds.size ? 'No hay favoritos que coincidan' : 'Aún no tienes favoritos'}</strong>${favoriteIds.size ? 'Prueba otra búsqueda.' : 'Guarda productos con el corazón para encontrarlos aquí.'}</div>`
        : '<div class="empty-results"><strong>No encontramos ese producto</strong>Prueba con otra palabra o categoría.</div>';
    } else {
      productGrid.innerHTML =       visible.map((product) => {
        const isSelected = selected.has(product.id);
        const isFavorite = favoriteIds.has(String(product.id));
        const isOut = Boolean(product.isOutOfStock);
        const isBestseller = Boolean(product.isBestseller && !isOut);
        const isSpecial = Boolean(product.isSpecial && !isOut);
        const substitutes = isOut ? getAvailableSubstitutes(product) : [];
        const pieceWeightHint = product.pieceWeightGrams > 0
          ? `<small>≈${formatCompactGrams(product.pieceWeightGrams)}</small>`
          : '';
        const saleUnit = product.saleType === 'peso'
          ? product.allowPieceOrder ? 'Kg/pza' : 'Por kg'
          : product.saleType === 'pieza-peso'
            ? 'Pieza/kg'
            : product.saleType === 'monto'
              ? 'Por monto'
              : `Por ${product.unit || 'unidad'}`;
        const cardPrice = productPriceMarkup(product).replace(/\s*\/\s*/g, '/');
        const substituteMarkup = substitutes.length
          ? `<div class="product-substitutes">
              <span class="product-substitutes-label">Alternativas disponibles</span>
              <div class="product-substitute-list">${substitutes.map((alternative) => `<button class="product-substitute" type="button" data-add="${escapeHtml(alternative.id)}" aria-label="Agregar ${escapeHtml(alternative.name)} a mi lista como alternativa">${escapeHtml(alternative.name)}</button>`).join('')}</div>
            </div>`
          : '';

        const cardClasses = ['product-card'];
        if (isOut) cardClasses.push('is-out-of-stock');
        if (isSpecial) cardClasses.push('is-special');
        if (isSelected) cardClasses.push('is-selected');

        return `<article class="${cardClasses.join(' ')}" data-product-id="${escapeHtml(product.id)}">
          <div class="product-image">
            <img src="${escapeHtml(formatImageUrl(product.image))}" alt="${escapeHtml(product.name)}" loading="lazy" onerror="this.onerror=null;this.src='assets/images/logo-mascota.jpeg';">
            ${isOut ? '<span class="product-tag">Agotado hoy</span>' : ''}
            <button class="favorite-toggle${isFavorite ? ' is-favorite' : ''}" type="button" data-favorite="${escapeHtml(product.id)}" aria-label="${isFavorite ? `Quitar ${escapeHtml(product.name)} de favoritos` : `Agregar ${escapeHtml(product.name)} a favoritos`}" aria-pressed="${isFavorite}" title="${isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}">${isFavorite ? '♥' : '♡'}</button>
            ${isOut 
              ? '<button class="add-product is-out-stock-btn" type="button" aria-disabled="true">Agotado</button>' 
              : `<button class="add-product${isSelected ? ' is-added' : ''}" type="button" data-add="${escapeHtml(product.id)}" aria-label="${isSelected ? 'Modificar' : 'Agregar'} ${escapeHtml(product.name)} ${isSelected ? 'en' : 'a'} mi lista" aria-pressed="${isSelected}">${isSelected ? '✓' : '+'}</button>`
            }
          </div>
          <div class="product-info">
            <div class="product-card-labels">
              <span class="product-category-label">${escapeHtml(product.category || 'Producto')}</span>
              ${isBestseller ? '<span class="product-badge-bestseller">★ Más vendido</span>' : ''}
              ${isSpecial ? '<span class="product-badge-special">✦ Llegó hoy</span>' : ''}
            </div>
            <div class="product-info-header">
              <h3>${escapeHtml(product.name)}</h3>
            </div>
            <div class="product-sale-line">
              <span class="product-sale-unit">${escapeHtml(saleUnit)}${pieceWeightHint}</span>
              <span class="product-price">${cardPrice}</span>
            </div>
            ${isOut ? '<p class="product-availability"><span class="product-badge">Agotado</span>Surtido en camino</p>' : ''}
            ${substituteMarkup}
          </div>
        </article>`;
      }).join('');
      productGrid.querySelectorAll('[data-add]').forEach((button) => button.addEventListener('click', () => toggleProduct(button.dataset.add)));
      productGrid.querySelectorAll('[data-favorite]').forEach((button) => button.addEventListener('click', () => toggleFavorite(button.dataset.favorite)));
    }
    catalogCount.textContent = filtered.length ? `Mostrando ${visible.length} de ${filtered.length} productos` : '0 productos';
    showMoreButton.hidden = filtered.length <= visibleCount;
  }

  function toggleProduct(id) {
    const product = products.find((item) => item.id === id);
    if (!product) return;
    if (selected.has(id)) {
      openPortionModal(product, selected.get(id));
      return;
    }
    openPortionModal(product);
  }

  function toggleFavorite(id) {
    const favoriteId = String(id);
    if (favoriteIds.has(favoriteId)) favoriteIds.delete(favoriteId);
    else favoriteIds.add(favoriteId);
    saveFavoriteIds();
    renderProducts();
    const updatedButton = [...productGrid.querySelectorAll('[data-favorite]')]
      .find((button) => button.dataset.favorite === favoriteId);
    if (updatedButton) updatedButton.focus();
    else filterList.querySelector(`[data-filter="${FAVORITES_FILTER}"]`).focus();
  }

  function removeProductFromList(id) {
    if (!selected.has(id)) return;
    selected.delete(id);
    saveSelected();
    renderProducts();
    renderSpecialsShowcase();
    renderOffersShowcase();
    renderDrawerItems();
  }

  const portionBackdrop = document.querySelector('#portion-modal-backdrop');
  const portionWrapper = document.querySelector('#portion-modal-wrapper');
  const portionClose = document.querySelector('#portion-modal-close');
  const portionCancel = document.querySelector('#portion-cancel-btn');
  const portionConfirm = document.querySelector('#portion-confirm-btn');
  let activePortionProduct = null;
  let portionMode = 'peso';
  let portionValue = 500;

  function openPortionModal(product, selectedEntry = null) {
    activePortionProduct = product;
    portionConfirm.querySelector('span').textContent = selectedEntry ? 'GUARDAR CAMBIOS' : 'AGREGAR A MI LISTA';
    const tab = document.querySelector('#portion-tab-toggle');
    const pieceTab = tab.querySelector('[data-tab="pieza"]');
    const title = document.querySelector('#modal-product-title');
    const subtitle = document.querySelector('#modal-product-subtitle');
    const body = document.querySelector('#modal-dynamic-body');
    const saleType = product.saleType;

    title.textContent = product.name;
    subtitle.textContent = formatProductSubtitle(product);
    body.innerHTML = '';

    if (saleType === 'peso') {
      tab.hidden = false;
      pieceTab.hidden = !product.allowPieceOrder;
      tab.classList.toggle('has-piece-option', product.allowPieceOrder);
      portionMode = selectedEntry?.mode === 'monto'
        || (selectedEntry?.mode === 'pieza' && product.allowPieceOrder)
        ? selectedEntry.mode
        : 'peso';
      portionValue = selectedEntry?.mode === portionMode
        ? parseDecimal(selectedEntry.value)
        : portionMode === 'pieza' ? 1 : portionMode === 'monto' ? getMinimumAmount(product) : 500;
      document.querySelectorAll('.portion-tab-btn').forEach((button) => {
        const isActive = button.dataset.tab === portionMode;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-pressed', String(isActive));
      });
      renderPortionModeFields();
    } else if (saleType === 'monto') {
      tab.hidden = true;
      tab.classList.remove('has-piece-option');
      portionMode = 'monto';
      const minimum = getMinimumAmount(product);
      portionValue = selectedEntry ? Math.max(minimum, parseDecimal(selectedEntry.value)) : minimum;
      renderMoneyFields(minimum);
    } else {
      tab.hidden = true;
      tab.classList.remove('has-piece-option');
      portionMode = 'unidad';
      const minimum = product.saleType === 'pieza-peso' ? 1 : product.minimum || 1;
      const increment = product.saleType === 'pieza-peso' ? 1 : product.increment || 1;
      const savedUnitQuantity = selectedEntry
        && (product.saleType !== 'pieza-peso' || selectedEntry.mode === 'unidad');
      portionValue = savedUnitQuantity ? Math.max(minimum, parseDecimal(selectedEntry.value)) : minimum;
      if (product.saleType === 'pieza-peso') renderPieceFields();
      else renderUnitFields(minimum, increment);
    }

    portionBackdrop.hidden = false;
    portionWrapper.hidden = false;
    document.body.classList.add('no-scroll');
    requestAnimationFrame(() => portionClose.focus());
  }

  function formatProductSubtitle(product) {
    const price = getEffectivePrice(product);
    const regularPrice = parseDecimal(product.price);
    const describePrice = (suffix = '') => product.isOnSale
      ? `$${formatMoney(price)}${suffix} · antes $${formatMoney(regularPrice)}${suffix}`
      : `$${formatMoney(price)}${suffix}`;
    if (product.saleType === 'pieza-peso') {
      const pieceWeightHint = product.pieceWeightGrams > 0
        ? ` · pieza ≈${formatCompactGrams(product.pieceWeightGrams)}`
        : '';
      return price ? `${describePrice('/kg')}${pieceWeightHint}` : 'Precio por kg pendiente';
    }
    if (product.saleType === 'monto') return `Desde $${formatMoney(product.minimum || 2)} · por monto`;
    if (!price) return product.saleType === 'peso' && product.allowPieceOrder
      ? 'Por kg o pieza · precio pendiente'
      : `${product.unit || 'unidad'} · precio pendiente`;
    if (product.saleType === 'peso') {
      const pieceOptionHint = product.allowPieceOrder
        ? ` · pieza${product.pieceWeightGrams > 0 ? ` ≈${formatCompactGrams(product.pieceWeightGrams)}` : ''}`
        : '';
      return `${describePrice('/kg')}${pieceOptionHint}`;
    }
    return `${describePrice()} por ${product.unit || 'unidad'} · sujeto a disponibilidad`;
  }

  function getProductPriceLabel(product, price, forcePerKg = false) {
    if (product.saleType === 'pieza-peso') return price ? `$${formatMoney(price)} / kg` : 'Consultar precio por kg';
    if (product.saleType === 'monto') return `Desde $${formatMoney(product.minimum || 2)}`;
    if (!price) return 'Consultar precio';
    if (forcePerKg || (product.saleType === 'peso' && product.allowPieceOrder)) return `$${formatMoney(price)} / kg`;
    return `$${formatMoney(price)}`;
  }

  function productPriceLabel(product) {
    return getProductPriceLabel(product, getEffectivePrice(product));
  }

  function productPriceMarkup(product, forcePerKg = false) {
    const currentPrice = forcePerKg
      ? getProductPriceLabel(product, getEffectivePrice(product), true)
      : productPriceLabel(product);
    if (!product.isOnSale) return escapeHtml(currentPrice);

    const regularPrice = getProductPriceLabel(product, parseDecimal(product.price), forcePerKg);
    const discountPercent = Math.max(1, Math.round((1 - getEffectivePrice(product) / parseDecimal(product.price)) * 100));
    return `<span class="product-price-discount">
      <s class="product-price-was">${escapeHtml(regularPrice)}</s>
      <strong class="product-price-now">${escapeHtml(currentPrice)}</strong>
      <span class="product-price-sale-tag">-${discountPercent}%</span>
    </span>`;
  }

  function formatMoney(value) {
    return Math.round(Number(value)).toLocaleString('es-MX', { maximumFractionDigits: 0 });
  }

  function formatQuantity(value) {
    return Number(value).toLocaleString('es-MX', { maximumFractionDigits: 2 });
  }

  function getMinimumAmount(product) {
    const name = normalize(product.name);
    if (product.saleType === 'monto') {
      if (name.includes('cilantro')) return 5;
      if (['perejil', 'hierbabuena', 'hierba buena', 'epazote', 'manzanilla'].some((herb) => name.includes(herb))) return 2;
      return Math.max(10, parseDecimal(product.minimum));
    }
    return Math.max(10, parseDecimal(product.minimumAmount));
  }

  function renderPortionModeFields() {
    if (portionMode === 'peso') {
      renderWeightFields();
    } else if (portionMode === 'pieza') {
      renderPieceFields();
    } else {
      renderMoneyFields(getMinimumAmount(activePortionProduct));
    }
  }

  function renderPieceFields() {
    const body = document.querySelector('#modal-dynamic-body');
    const product = activePortionProduct;
    const pieceWeight = parseDecimal(product.pieceWeightGrams);
    portionValue = Math.max(1, Math.floor(parseDecimal(portionValue) || 1));
    const pieceHint = pieceWeight
      ? `≈ ${formatGrams(pieceWeight)} por pieza · importe orientativo`
      : 'El importe final se confirma al pesar.';
    body.innerHTML = `
      <div class="portion-piece-selector">
        <button type="button" class="portion-stepper-btn" id="portion-minus" aria-label="Disminuir piezas">−</button>
        <div class="portion-piece-count">
          <strong id="portion-piece-value">${portionValue}</strong>
          <small id="portion-piece-unit">${portionValue === 1 ? 'pieza' : 'piezas'}</small>
        </div>
        <button type="button" class="portion-stepper-btn" id="portion-plus" aria-label="Aumentar piezas">+</button>
      </div>
      ${pieceHint ? `<p class="portion-piece-hint">${pieceHint}</p>` : ''}`;

    const minus = body.querySelector('#portion-minus');
    const plus = body.querySelector('#portion-plus');
    const valueLabel = body.querySelector('#portion-piece-value');
    const unitLabel = body.querySelector('#portion-piece-unit');
    const applyValue = (value) => {
      const numeric = Math.max(1, Math.floor(parseDecimal(value) || 1));
      portionValue = numeric;
      valueLabel.textContent = String(numeric);
      unitLabel.textContent = numeric === 1 ? 'pieza' : 'piezas';
      updatePortionSummary();
    };
    minus.addEventListener('click', () => applyValue(portionValue - 1));
    plus.addEventListener('click', () => applyValue(portionValue + 1));
    updatePortionSummary();
  }

  function updatePortionSummary() {
    const product = activePortionProduct;
    if (!product) return;
    const pricePerKg = ['peso', 'pieza-peso'].includes(product.saleType) ? getEffectivePrice(product) : 0;
    const value = Number(portionValue);
    const isApproxPieceMode = (product.saleType === 'peso' && portionMode === 'pieza')
      || (product.saleType === 'pieza-peso' && portionMode === 'unidad');
    const pieceWeightGrams = isApproxPieceMode ? parseDecimal(product.pieceWeightGrams) : 0;
    const approximateTotalWeight = pieceWeightGrams * value;
    let amount = 0;
    let label = '';

    if (portionMode === 'peso') {
      amount = pricePerKg * (portionValue / 1000);
      label = `${portionValue >= 1000 ? (portionValue / 1000).toLocaleString('es-MX') + ' kg' : portionValue + ' g'}`;
    } else if (portionMode === 'monto') {
      amount = value;
      label = `$${formatMoney(value)}`;
    } else if (isApproxPieceMode) {
      amount = pieceWeightGrams > 0 && pricePerKg > 0
        ? pricePerKg * (approximateTotalWeight / 1000)
        : 0;
      label = `${value} ${value === 1 ? 'pieza' : 'piezas'}`;
    } else {
      amount = getEffectivePrice(product) * value;
      label = `${value} ${product.unit || 'unidad'}${value === 1 ? '' : 's'}`;
    }

    const hasPieceEstimate = isApproxPieceMode && pieceWeightGrams > 0 && pricePerKg > 0;
    document.querySelector('#portion-calc-label').textContent = isApproxPieceMode
      ? 'Total aprox.'
      : portionMode === 'peso' ? 'Importe estimado por peso' : 'Importe estimado';
    document.querySelector('#portion-calc-value').textContent = isApproxPieceMode
      ? hasPieceEstimate ? `$${formatMoney(amount)} MXN` : 'Por confirmar'
      : `$${formatMoney(amount)} MXN`;
    document.querySelector('#modal-product-subtitle').dataset.summary = label;

    const weightEstimate = document.querySelector('#portion-weight-estimate');
    const canEstimateWeight = portionMode === 'monto' && product.saleType === 'peso';
    const approximateGrams = canEstimateWeight ? estimateGramsForAmount(product, value) : 0;
    weightEstimate.hidden = !canEstimateWeight;
    if (canEstimateWeight) {
      weightEstimate.textContent = approximateGrams
        ? `≈ ${formatGrams(approximateGrams)} de peso · puede variar al pesar.`
        : 'Agrega el precio por kg para estimar el peso.';
    } else {
      weightEstimate.textContent = '';
    }
  }

  function estimateGramsForAmount(product, amount) {
    const pricePerKg = product.saleType === 'peso' ? getEffectivePrice(product) : 0;
    if (pricePerKg <= 0 || amount <= 0) return 0;
    return Math.round((amount / pricePerKg) * 1000);
  }

  function estimateProductSelection(product, entry) {
    const quantity = parseDecimal(entry.value);
    const price = getEffectivePrice(product);
    if (entry.mode === 'peso') return Math.round(price * (quantity / 1000));
    if (entry.mode === 'monto') return Math.round(quantity);

    if (entry.mode === 'pieza' || (entry.mode === 'unidad' && product.saleType === 'pieza-peso')) {
      const pieceWeight = parseDecimal(product.pieceWeightGrams) * quantity;
      return pieceWeight > 0 && price > 0 ? Math.round(price * (pieceWeight / 1000)) : 0;
    }

    if (entry.mode === 'unidad') return Math.round(price * quantity);
    return 0;
  }

  function formatGrams(grams) {
    return grams >= 1000
      ? `${formatQuantity(grams / 1000)} kg`
      : `${formatQuantity(grams)} g`;
  }

  function formatCompactGrams(grams) {
    return formatGrams(grams).replace(/\s/g, '');
  }

  function renderWeightFields() {
    const body = document.querySelector('#modal-dynamic-body');
    const minimum = activePortionProduct.minimum || 50;
    const increment = activePortionProduct.increment || 50;
    portionValue = Math.max(portionValue, minimum);
    const presets = [500, 1000];
    body.innerHTML = `
      <div class="portion-presets-grid">
        ${presets.map((grams) => `<button type="button" class="portion-preset-btn" data-grams="${grams}"${grams < minimum ? ' disabled' : ''}><strong>${grams === 500 ? '½ kg' : '1 kg'}</strong><small>${grams} g</small></button>`).join('')}
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
    portionValue = Math.max(minimum, Math.round(parseDecimal(portionValue) || minimum));
    body.innerHTML = `
      <div class="portion-stepper-wrap">
        <button type="button" class="portion-stepper-btn" id="portion-minus" aria-label="Disminuir monto">−</button>
        <strong class="portion-stepper-val" id="portion-money-value">$${formatMoney(portionValue)}</strong>
        <button type="button" class="portion-stepper-btn" id="portion-plus" aria-label="Aumentar monto">+</button>
      </div>
      <div class="portion-manual-group">
        <label class="portion-manual-label" for="portion-money">También puedes escribir el monto</label>
        <div class="portion-input-wrap"><span>$</span><input id="portion-money" type="number" inputmode="numeric" min="${minimum}" step="${increment}" value="${portionValue}" aria-describedby="portion-money-minimum portion-money-error" aria-invalid="false"><span>MXN</span></div>
        <small class="portion-minimum-hint" id="portion-money-minimum">Mínimo: $${formatMoney(minimum)} MXN</small>
        <p class="portion-input-error" id="portion-money-error" role="alert" hidden>El monto mínimo para este producto es $${formatMoney(minimum)} MXN.</p>
      </div>`;

    const minus = body.querySelector('#portion-minus');
    const plus = body.querySelector('#portion-plus');
    const input = body.querySelector('#portion-money');
    const valueLabel = body.querySelector('#portion-money-value');
    const applyValue = (value) => {
      const numeric = parseDecimal(value);
      portionValue = Math.max(minimum, Math.round(numeric));
      input.value = String(portionValue);
      valueLabel.textContent = `$${formatMoney(portionValue)}`;
      input.setAttribute('aria-invalid', 'false');
      input.closest('.portion-input-wrap').classList.remove('is-invalid');
      body.querySelector('#portion-money-error').hidden = true;
      updatePortionSummary();
    };
    minus.addEventListener('click', () => applyValue(Math.max(minimum, portionValue - increment)));
    plus.addEventListener('click', () => applyValue(portionValue + increment));
    input.addEventListener('input', () => {
      const rawValue = input.value.trim();
      portionValue = rawValue ? Math.round(parseDecimal(rawValue)) : 0;
      valueLabel.textContent = rawValue ? `$${formatMoney(portionValue)}` : 'Escribe un monto';
      const isValid = rawValue !== '' && portionValue >= minimum;
      input.setAttribute('aria-invalid', String(!isValid));
      input.closest('.portion-input-wrap').classList.toggle('is-invalid', !isValid);
      body.querySelector('#portion-money-error').hidden = isValid;
      updatePortionSummary();
    });
    updatePortionSummary();
  }

  function renderUnitFields(minimum, increment) {
    const body = document.querySelector('#modal-dynamic-body');
    const unit = activePortionProduct.unit || 'unidad';
    const isWholePieceByWeight = activePortionProduct.saleType === 'pieza-peso';
    const quantityIncrement = isWholePieceByWeight ? 1 : increment;
    body.innerHTML = `
      <div class="portion-stepper-wrap">
        <button type="button" class="portion-stepper-btn" id="portion-minus" aria-label="Disminuir cantidad">−</button>
        <strong class="portion-stepper-val" id="portion-unit-value">${portionValue}</strong>
        <button type="button" class="portion-stepper-btn" id="portion-plus" aria-label="Aumentar cantidad">+</button>
      </div>
      <div class="portion-manual-group">
        <label class="portion-manual-label" for="portion-unit">${isWholePieceByWeight ? 'Cantidad de piezas enteras' : `Cantidad en ${unit}`}</label>
        <div class="portion-input-wrap"><input id="portion-unit" type="number" inputmode="${isWholePieceByWeight ? 'numeric' : 'decimal'}" min="${minimum}" step="${quantityIncrement}" value="${portionValue}"><span>${unit}</span></div>
      </div>`;

    const minus = body.querySelector('#portion-minus');
    const plus = body.querySelector('#portion-plus');
    const input = body.querySelector('#portion-unit');
    const valueLabel = body.querySelector('#portion-unit-value');
    const applyValue = (value) => {
      const parsed = parseDecimal(value);
      const numeric = isWholePieceByWeight ? Math.floor(parsed) : parsed;
      portionValue = Math.max(minimum, numeric);
      input.value = String(portionValue);
      valueLabel.textContent = String(portionValue);
      updatePortionSummary();
    };
    minus.addEventListener('click', () => applyValue(Math.max(minimum, portionValue - quantityIncrement)));
    plus.addEventListener('click', () => applyValue(portionValue + quantityIncrement));
    input.addEventListener('input', () => applyValue(input.value));
    updatePortionSummary();
  }

  function closePortionModal() {
    portionBackdrop.hidden = true;
    portionWrapper.hidden = true;
    document.body.classList.remove('no-scroll');
    activePortionProduct = null;
    portionConfirm.querySelector('span').textContent = 'AGREGAR A MI LISTA';
  }

  document.querySelectorAll('.portion-tab-btn').forEach((button) => {
    button.addEventListener('click', () => {
      if (button.hidden || !activePortionProduct) return;
      portionMode = button.dataset.tab;
      document.querySelectorAll('.portion-tab-btn').forEach((item) => {
        const active = item === button;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-pressed', String(active));
      });
      portionValue = portionMode === 'peso'
        ? 500
        : portionMode === 'pieza' ? 1 : getMinimumAmount(activePortionProduct);
      renderPortionModeFields();
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
    if (portionMode === 'pieza') {
      valid = activePortionProduct.allowPieceOrder && portionValue >= 1 && Number.isInteger(portionValue);
    }
    if (portionMode === 'unidad') {
      const minimum = activePortionProduct.saleType === 'pieza-peso' ? 1 : activePortionProduct.minimum || 1;
      valid = portionValue >= minimum;
      if (activePortionProduct.saleType === 'pieza-peso') valid = valid && Number.isInteger(portionValue);
    }
    if (!valid) {
      if (portionMode === 'monto') {
        const input = document.querySelector('#portion-money');
        const error = document.querySelector('#portion-money-error');
        if (input && error) {
          error.hidden = false;
          input.setAttribute('aria-invalid', 'true');
          input.closest('.portion-input-wrap').classList.add('is-invalid');
          input.focus();
        }
      }
      return;
    }

    const estimated = estimateProductSelection(activePortionProduct, { mode: portionMode, value: portionValue });

    const weightEstimate = portionMode === 'monto' && activePortionProduct.saleType === 'peso'
      ? estimateGramsForAmount(activePortionProduct, portionValue)
      : 0;
    selected.set(activePortionProduct.id, {
      mode: portionMode,
      value: portionValue,
      unit: portionMode === 'pieza' ? 'pieza' : activePortionProduct.unit || 'unidad',
      estimated,
      weightEstimate
    });
    saveSelected();
    closePortionModal();
    renderProducts();
    renderSpecialsShowcase();
    renderOffersShowcase();
    renderDrawerItems();
  });

  function editSelectedProduct(id) {
    const product = products.find((item) => item.id === id);
    const entry = selected.get(id);
    if (product && entry) openPortionModal(product, entry);
  }

  function renderPackageDrawerItem(packageEntry) {
    const estimate = getPackageEstimate(packageEntry.ingredients);
    const totalText = estimate.total > 0
      ? `~$${formatMoney(estimate.total)}${estimate.hasUnpriced ? '*' : ''}`
      : 'Por confirmar';

    return `<li class="drawer-package-card" data-package-id="${escapeHtml(packageEntry.id)}">
      <button type="button" class="drawer-package-open" data-edit-package="${escapeHtml(packageEntry.id)}" aria-label="Ver y editar ${escapeHtml(packageEntry.title)}">
        <span class="drawer-package-title"><strong>${escapeHtml(packageEntry.title)}</strong><small>Paquete · ${packageEntry.servings} personas · ${packageEntry.ingredients.length} productos</small><small class="drawer-package-edit-hint">Ver productos y editar</small></span>
        <span class="drawer-package-total">${totalText}</span>
        <span class="drawer-package-arrow" aria-hidden="true">↗</span>
      </button>
      <button type="button" class="drawer-package-remove" data-remove-package="${escapeHtml(packageEntry.id)}" aria-label="Quitar ${escapeHtml(packageEntry.title)} de mi lista">Quitar paquete</button>
    </li>`;
  }

  function renderDrawerItems() {
    const chosen = products.filter((product) => selected.has(product.id));
    const packages = [...selectedPackages.values()];
    const drawerScrollTop = drawerBody.scrollTop;
    const totalCount = chosen.length + packages.length;
    let migratedSelection = false;

    const productItems = chosen.map((product) => {
      let entry = selected.get(product.id) || { mode: 'unidad', value: 1, unit: product.unit || 'unidad', estimated: getEffectivePrice(product) };
      if (product.saleType === 'pieza-peso') {
        const quantity = parseDecimal(entry.value);
        const validPieceEntry = entry.mode === 'unidad'
          && Number.isInteger(quantity)
          && quantity >= 1
          && entry.unit === 'pieza'
          && parseDecimal(entry.weightEstimate) === 0;
        if (!validPieceEntry) {
          entry = {
            mode: 'unidad',
            value: entry.mode === 'unidad' && Number.isInteger(quantity) && quantity >= 1 ? quantity : 1,
            unit: 'pieza',
            estimated: 0,
            weightEstimate: 0
          };
          selected.set(product.id, entry);
          migratedSelection = true;
        }
      }
      let portionText = '';
      if (entry.mode === 'pieza') {
        portionText = `${entry.value} ${Number(entry.value) === 1 ? 'pieza' : 'piezas'}`;
      } else if (entry.mode === 'unidad') {
        const unit = product.saleType === 'pieza-peso'
          ? Number(entry.value) === 1 ? 'pieza' : 'piezas'
          : entry.unit || product.unit || 'unidad';
        portionText = `${entry.value} ${escapeHtml(unit)}`;
      }
      const pieceQuantity = entry.mode === 'pieza'
        || (product.saleType === 'pieza-peso' && entry.mode === 'unidad')
        ? parseDecimal(entry.value)
        : 0;
      const estimatedPieceWeight = parseDecimal(product.pieceWeightGrams) * pieceQuantity;
      const isApproxPieceEntry = pieceQuantity > 0;
      const currentPrice = getEffectivePrice(product);
      const canRecalculateEstimate = currentPrice > 0 || entry.mode === 'monto';
      const recalculatedEstimate = canRecalculateEstimate
        ? estimateProductSelection(product, entry)
        : isApproxPieceEntry ? 0 : parseDecimal(entry.estimated);
      const recalculatedWeightEstimate = product.saleType === 'peso'
        && entry.mode === 'monto'
        && currentPrice > 0
        ? estimateGramsForAmount(product, entry.value)
        : parseDecimal(entry.weightEstimate);
      if (parseDecimal(entry.estimated) !== recalculatedEstimate
        || parseDecimal(entry.weightEstimate) !== recalculatedWeightEstimate) {
        entry = { ...entry, estimated: recalculatedEstimate, weightEstimate: recalculatedWeightEstimate };
        selected.set(product.id, entry);
        migratedSelection = true;
      }
      const weightEstimate = product.saleType === 'peso' && entry.mode === 'monto' ? recalculatedWeightEstimate : 0;
      const hasPieceEstimate = estimatedPieceWeight > 0 && getEffectivePrice(product) > 0;
      const pieceEstimateAmount = isApproxPieceEntry ? recalculatedEstimate : 0;
      let weightInfoText = '';
      if (product.saleType === 'peso' && entry.mode === 'peso') {
        weightInfoText = formatGrams(entry.value);
      } else if (product.saleType === 'peso' && entry.mode === 'monto') {
        weightInfoText = weightEstimate ? `${formatGrams(weightEstimate)} aprox.` : 'Peso por confirmar';
      } else if (pieceQuantity > 0) {
        weightInfoText = estimatedPieceWeight > 0 ? `${formatGrams(estimatedPieceWeight)} aprox.` : 'Peso pendiente';
      }
      const priceText = isApproxPieceEntry
        ? hasPieceEstimate ? `$${formatMoney(pieceEstimateAmount)} aprox.` : 'Por confirmar'
        : entry.estimated > 0 ? `$${formatMoney(entry.estimated)}` : 'Por confirmar';
      const pricePerKg = getEffectivePrice(product);
      const hasPerKgPrice = ['peso', 'pieza-peso'].includes(product.saleType);
      const showUnitPrice = product.saleType === 'pieza-peso' || entry.mode === 'pieza' || product.isOnSale;
      const pricePerKgText = showUnitPrice
        ? pricePerKg > 0
          ? `${productPriceMarkup(product, hasPerKgPrice)}${hasPerKgPrice ? '' : ` por ${escapeHtml(product.unit || 'unidad')}`}`
          : 'Precio por kg por confirmar'
        : '';
      return `<li class="drawer-item-card">
        <div class="drawer-item-img"><img src="${escapeHtml(formatImageUrl(product.image))}" alt="" onerror="this.onerror=null;this.src='assets/images/logo-mascota.jpeg';"></div>
        <div class="drawer-item-details">
          <div class="drawer-item-main">
            <strong>${escapeHtml(product.name)}</strong>
            ${portionText ? `<span class="drawer-item-portion">${portionText}</span>` : ''}
            <div class="drawer-item-actions"><button type="button" class="drawer-item-edit" data-edit="${escapeHtml(product.id)}" aria-label="Modificar cantidad de ${escapeHtml(product.name)}">Editar</button><button type="button" class="drawer-item-remove" data-remove="${escapeHtml(product.id)}" aria-label="Quitar ${escapeHtml(product.name)}">Quitar</button></div>
          </div>
          <div class="drawer-item-summary">
            <div class="drawer-item-price-line">
              ${weightInfoText ? `<span class="drawer-item-weight-estimate">${weightInfoText}</span>` : ''}
              <strong class="drawer-item-price">${priceText}</strong>
            </div>
            ${pricePerKgText ? `<span class="drawer-item-unit-price">${pricePerKgText}</span>` : ''}
          </div>
        </div>
      </li>`;
    }).join('');
    drawerItems.innerHTML = `${productItems}${packages.map(renderPackageDrawerItem).join('')}`;
    drawerBody.scrollTop = drawerScrollTop;
    if (migratedSelection) saveSelected();

    drawerItems.querySelectorAll('[data-remove]').forEach((button) => {
      button.addEventListener('click', () => removeProductFromList(button.dataset.remove));
    });
    drawerItems.querySelectorAll('[data-edit]').forEach((button) => {
      button.addEventListener('click', () => editSelectedProduct(button.dataset.edit));
    });
    drawerItems.querySelectorAll('[data-remove-package]').forEach((button) => {
      button.addEventListener('click', () => {
        selectedPackages.delete(button.dataset.removePackage);
        saveSelectedPackages();
        renderDrawerItems();
      });
    });
    drawerItems.querySelectorAll('[data-edit-package]').forEach((button) => {
      button.addEventListener('click', () => openSavedPackage(button.dataset.editPackage, button));
    });

    drawerEmpty.hidden = totalCount > 0;
    drawerItems.hidden = totalCount === 0;
    if (drawerSummary) drawerSummary.hidden = totalCount === 0;

    // Calcular total estimado
    let estimatedTotal = 0;
    let hasUnpriced = false;
    chosen.forEach((p) => {
      const entry = selected.get(p.id);
      const num = entry ? parseDecimal(entry.estimated) : getEffectivePrice(p);
      if (num > 0) estimatedTotal += Math.round(num);
      else hasUnpriced = true;
    });
    packages.forEach((packageEntry) => {
      const estimate = getPackageEstimate(packageEntry.ingredients);
      estimatedTotal += estimate.total;
      if (estimate.hasUnpriced) hasUnpriced = true;
    });

    if (drawerTotalAmount) {
      if (estimatedTotal > 0) {
        drawerTotalAmount.textContent = `$${formatMoney(estimatedTotal)}${hasUnpriced ? '*' : ''}`;
        drawerTotalAmount.title = hasUnpriced ? 'Cálculo parcial basado en productos con precio publicado' : 'Total estimado';
      } else {
        drawerTotalAmount.textContent = 'Por confirmar';
        drawerTotalAmount.title = 'Precios a confirmar por peso en tienda';
      }
    }

    document.querySelector('#list-count').textContent = String(totalCount);
    listOpenButton.hidden = totalCount === 0;
    sendList.setAttribute('aria-disabled', String(totalCount === 0));

    const lines = [ORDER_GREETING, ''];
    if (packages.length) {
      lines.push('*Paquetes*');
      packages.forEach((packageEntry, packageIndex) => {
        if (packageIndex > 0) lines.push('');
        lines.push(`*${packageEntry.title} — ${packageEntry.servings} personas*`);
        packageEntry.ingredients.forEach((ingredient) => {
          const amount = estimatePackageIngredient(ingredient);
          const pricePart = amount > 0 ? ` · aprox. $${formatMoney(Math.round(amount))}` : ' · precio por confirmar';
          const notePart = ingredient.priceNote ? ` · ${ingredient.priceNote}` : '';
          lines.push(`• ${ingredient.name} — ${formatPackageQuantity(ingredient)}${pricePart}${notePart}`);
        });
      });
    }

    if (chosen.length) {
      if (packages.length) lines.push('');
      lines.push(packages.length ? '*Productos sueltos*' : '*Productos*');

      chosen.forEach((p) => {
        const entry = selected.get(p.id);
        let portion = '';
        if (entry?.mode === 'peso') portion = formatGrams(entry.value);
        else if (entry?.mode === 'monto') portion = `por $${formatMoney(entry.value)}`;
        else if (entry?.mode === 'pieza') portion = `${entry.value} ${Number(entry.value) === 1 ? 'pieza' : 'piezas'}`;
        else if (entry) {
          const unit = p.saleType === 'pieza-peso'
            ? Number(entry.value) === 1 ? 'pieza' : 'piezas'
            : entry.unit || p.unit || 'unidad';
          portion = `${entry.value} ${unit}`;
        }
        const estimate = parseDecimal(entry?.estimated);
        const pricePart = entry?.mode === 'monto'
          ? ''
          : estimate > 0 ? ` · aprox. $${formatMoney(estimate)}` : ' · precio por confirmar';
        lines.push(`• ${p.name}${portion ? ` — ${portion}` : ''}${pricePart}`);
      });
    }

    if (estimatedTotal > 0) {
      lines.push('');
      lines.push(`*Total estimado${hasUnpriced ? ' parcial' : ''}:* $${formatMoney(estimatedTotal)}`);
    } else {
      lines.push('');
      lines.push('*Total estimado:* Por confirmar');
    }

    lines.push('');
    lines.push('¿Me confirman disponibilidad y total final? Gracias.');

    currentOrderMessage = totalCount > 0 ? lines.join('\n') : '';
  }

  function createOrderReference() {
    const now = new Date();
    const date = [
      String(now.getFullYear()).slice(-2),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0')
    ].join('');
    const number = Math.floor(100000 + Math.random() * 900000);
    return `LB-${date}-${number}`;
  }

  function openOrderCustomerForm() {
    if (!currentOrderMessage || (selected.size === 0 && selectedPackages.size === 0)) return;
    orderReferenceValue.textContent = createOrderReference();
    orderCustomerName.value = '';
    syncOrderFormChoices();
    orderCustomerBackdrop.hidden = false;
    orderCustomerWrapper.hidden = false;
    requestAnimationFrame(() => orderCustomerName.focus());
  }

  function syncOrderFormChoices() {
    deliveryMode = orderDeliveryMode.value;
    const isDelivery = deliveryMode === 'domicilio';
    const cardOption = orderPaymentMethod.querySelector('option[value="tarjeta"]');
    deliveryHintText.hidden = !isDelivery;
    cardOption.disabled = isDelivery;
    cardOption.hidden = isDelivery;
    if (isDelivery && orderPaymentMethod.value === 'tarjeta') {
      orderPaymentMethod.value = 'efectivo';
    }
  }

  function closeOrderCustomerForm() {
    orderCustomerBackdrop.hidden = true;
    orderCustomerWrapper.hidden = true;
    if (!drawer.classList.contains('is-open')) document.body.classList.remove('no-scroll');
    sendList.focus();
  }

  orderCustomerBackdrop.addEventListener('click', closeOrderCustomerForm);
  document.querySelector('#order-customer-close').addEventListener('click', closeOrderCustomerForm);
  document.querySelector('#order-customer-cancel').addEventListener('click', closeOrderCustomerForm);
  orderCustomerForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!currentOrderMessage || (selected.size === 0 && selectedPackages.size === 0)) {
      closeOrderCustomerForm();
      return;
    }

    const reference = orderReferenceValue.textContent;
    const customerName = orderCustomerName.value.trim().replace(/[\r\n]+/g, ' ').slice(0, 80);
    const deliveryLabel = deliveryMode === 'domicilio'
      ? '🛵 Envío a domicilio (costo por confirmar)'
      : '🏪 Recoger en tienda';
    const paymentLabel = orderPaymentMethod.options[orderPaymentMethod.selectedIndex].textContent;
    const customerDetails = [
      `*Folio:* ${reference}`,
      customerName ? `*Nombre:* ${customerName}` : '',
      `*Entrega:* ${deliveryLabel}`,
      `*Pago:* ${paymentLabel}`
    ].filter(Boolean).join('\n');
    const message = currentOrderMessage.replace(
      `${ORDER_GREETING}\n\n`,
      `${ORDER_GREETING}\n\n${customerDetails}\n\n`
    );
    const whatsappWindow = window.open(waUrl(message), '_blank');
    if (whatsappWindow) {
      whatsappWindow.opener = null;
      closeOrderCustomerForm();
    }
    else window.location.assign(waUrl(message));
  });

  function openDrawer(returnFocusTarget = document.activeElement) {
    lastFocus = returnFocusTarget;
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

  orderDeliveryMode.addEventListener('change', () => {
    syncOrderFormChoices();
    renderDrawerItems();
  });

  function hideSearchSuggestions() {
    [
      [heroSearchInput, heroSearchSuggestions],
      [searchInput, productSearchSuggestions]
    ].forEach(([input, list]) => {
      list.hidden = true;
      input.setAttribute('aria-expanded', 'false');
    });
  }

  function getSearchSuggestions(term) {
    const normalizedTerm = normalize(term);
    if (normalizedTerm.length < 2) return [];

    return products
      .filter((product) => normalize(product.name).includes(normalizedTerm) || normalize(product.category).includes(normalizedTerm))
      .sort((a, b) => {
        const aName = normalize(a.name);
        const bName = normalize(b.name);
        const aStartsWithTerm = aName.startsWith(normalizedTerm);
        const bStartsWithTerm = bName.startsWith(normalizedTerm);
        if (aStartsWithTerm !== bStartsWithTerm) return aStartsWithTerm ? -1 : 1;
        if (a.isOutOfStock !== b.isOutOfStock) return a.isOutOfStock ? 1 : -1;
        return a.name.localeCompare(b.name, 'es-MX');
      })
      .slice(0, 6);
  }

  function renderSearchSuggestions(term, activeInput) {
    const suggestions = getSearchSuggestions(term);
    const fields = [
      [heroSearchInput, heroSearchSuggestions],
      [searchInput, productSearchSuggestions]
    ];

    fields.forEach(([input, list]) => {
      const isActive = input === activeInput && suggestions.length > 0;
      list.innerHTML = isActive
        ? suggestions.map((product) => `<button class="search-suggestion" type="button" role="option" data-product-id="${escapeHtml(product.id)}">
            <span class="search-suggestion-copy"><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.category || 'Producto')}${product.isOutOfStock ? ' · Agotado' : ''}</small></span>
            <span class="search-suggestion-arrow" aria-hidden="true">↗</span>
          </button>`).join('')
        : '';
      list.hidden = !isActive;
      input.setAttribute('aria-expanded', String(isActive));

      if (!isActive) return;
      list.querySelectorAll('[data-product-id]').forEach((option) => {
        option.addEventListener('click', () => {
          const product = products.find((item) => String(item.id) === option.dataset.productId);
          if (product) navigateToSearchResult(product.name, product.id);
        });
        option.addEventListener('keydown', (event) => {
          const options = [...list.querySelectorAll('[role="option"]')];
          const index = options.indexOf(option);
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            options[Math.min(index + 1, options.length - 1)].focus();
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            if (index === 0) input.focus();
            else options[index - 1].focus();
          } else if (event.key === 'Escape') {
            event.preventDefault();
            hideSearchSuggestions();
            input.focus();
          }
        });
      });
    });
  }

  function applySearchTerm(term, activeInput) {
    searchInput.value = term;
    heroSearchInput.value = term;
    visibleCount = pageSize;
    setCategory('Todos');
    renderSearchSuggestions(term, activeInput);
  }

  function navigateToSearchResult(term, productId) {
    applySearchTerm(term, null);
    const filteredProducts = getFilteredProducts();
    const productIndex = productId === undefined
      ? -1
      : filteredProducts.findIndex((product) => String(product.id) === String(productId));
    if (productIndex >= visibleCount) {
      visibleCount = productIndex + 1;
      renderProducts();
    }

    const resultCards = [...productGrid.querySelectorAll('.product-card')];
    const firstResult = productId === undefined
      ? resultCards[0]
      : resultCards.find((card) => card.dataset.productId === String(productId));
    if (!firstResult) {
      document.querySelector('#productos').scrollIntoView({ behavior: 'smooth' });
      return;
    }

    firstResult.classList.add('search-result-highlight');
    firstResult.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => firstResult.classList.remove('search-result-highlight'), 2200);
  }

  function handleSearchKeydown(event, input, list) {
    if (event.key === 'ArrowDown' && !list.hidden) {
      event.preventDefault();
      list.querySelector('[role="option"]')?.focus();
    } else if (event.key === 'Escape' && !list.hidden) {
      event.preventDefault();
      hideSearchSuggestions();
    }
  }

  searchInput.addEventListener('input', () => applySearchTerm(searchInput.value, searchInput));
  heroSearchInput.addEventListener('input', () => applySearchTerm(heroSearchInput.value, heroSearchInput));
  searchInput.addEventListener('focus', () => renderSearchSuggestions(searchInput.value, searchInput));
  heroSearchInput.addEventListener('focus', () => renderSearchSuggestions(heroSearchInput.value, heroSearchInput));
  searchInput.addEventListener('keydown', (event) => {
    handleSearchKeydown(event, searchInput, productSearchSuggestions);
    if (event.key === 'Enter') {
      event.preventDefault();
      const firstSuggestion = productSearchSuggestions.querySelector('[data-product-id]');
      navigateToSearchResult(searchInput.value, firstSuggestion?.dataset.productId);
    }
  });
  heroSearchInput.addEventListener('keydown', (event) => handleSearchKeydown(event, heroSearchInput, heroSearchSuggestions));
  heroSearchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const firstSuggestion = heroSearchSuggestions.querySelector('[data-product-id]');
    navigateToSearchResult(heroSearchInput.value, firstSuggestion?.dataset.productId);
  });
  document.addEventListener('click', (event) => {
    if (!heroSearchForm.contains(event.target) && !catalogSearch.contains(event.target)) hideSearchSuggestions();
  });
  showMoreButton.addEventListener('click', () => { visibleCount += pageSize; renderProducts(); });
  listOpenButton.addEventListener('click', () => openDrawer());
  document.querySelector('#drawer-close').addEventListener('click', closeDrawer);
  backdrop.addEventListener('click', closeDrawer);

  sendList.addEventListener('click', openOrderCustomerForm);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (!orderCustomerWrapper.hidden) closeOrderCustomerForm();
      else if (!portionWrapper.hidden) closePortionModal();
      else if (drawer.classList.contains('is-open')) closeDrawer();
    }
    if (event.key === 'Tab' && !orderCustomerWrapper.hidden) {
      const focusable = [...orderCustomerWrapper.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled])')];
      if (event.shiftKey && document.activeElement === focusable[0]) { event.preventDefault(); focusable.at(-1).focus(); }
      else if (!event.shiftKey && document.activeElement === focusable.at(-1)) { event.preventDefault(); focusable[0].focus(); }
    } else if (event.key === 'Tab' && drawer.classList.contains('is-open')) {
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
  renderOffersShowcase();
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
