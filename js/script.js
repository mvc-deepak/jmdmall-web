// ===========================
// CONFIGURATION
// ===========================

const CONFIG = {
    CSV_URL: 'products.csv',
    WHATSAPP_NUMBER: '9779705446407',
    WHATSAPP_API_URL: 'https://wa.me/'
};

// ===========================
// GLOBAL VARIABLES
// ===========================

let allProducts = [];
let filteredProducts = [];

const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const productsGrid = document.getElementById('productsGrid');
const filterButtons = document.querySelectorAll('.filter-btn');

// ===========================
// INITIALIZATION
// ===========================

document.addEventListener('DOMContentLoaded', async function () {

    // initialize GA4 if configured (meta tag or global variable)
    initGA4FromMeta();

    await loadProducts();

    setupEventListeners();

    updateActiveNavLink();

    initSlideshow();

});

// ===========================
// CACHING & ANALYTICS HELPERS
// ===========================

async function getProductsCached(){
    // try sessionStorage first
    try{
        const key = 'jmdmall_products_v1';
        const cached = sessionStorage.getItem(key);
        if(cached){
            try{ return JSON.parse(cached); } catch(e){ sessionStorage.removeItem(key); }
        }

        const res = await fetch(CONFIG.CSV_URL);
        if(!res.ok) throw new Error('CSV not found');
        const text = await res.text();
        const parsed = parseCSV(text);
        try{ sessionStorage.setItem(key, JSON.stringify(parsed)); } catch(e) { /* ignore storage errors */ }
        return parsed;
    } catch(e){
        console.error('getProductsCached error', e);
        throw e;
    }
}

// GA4 bootstrap: reads <meta name="ga-id" content="G-XXXX"> or window.GA_MEASUREMENT_ID
function initGA4FromMeta(){
    try{
        const meta = document.querySelector('meta[name="ga-id"]');
        const id = (meta && meta.content) || window.GA_MEASUREMENT_ID;
        if(!id) return;
        // inject gtag script
        if(!window.gtag){
            const s1 = document.createElement('script');
            s1.async = true;
            s1.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
            document.head.appendChild(s1);
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);} // eslint-disable-line no-inner-declarations
            window.gtag = function(){ window.dataLayer.push(arguments); };
            window.gtag('js', new Date());
            window.gtag('config', id, { 'send_page_view': false }); // we'll send events manually
            console.log('GA4 initialized', id);
        }
    }catch(e){ console.warn('initGA4 error', e); }
}

function trackEvent(name, data = {}){
    const payload = { event: name, ...data };
    // console log for lightweight analytics
    try{ console.log('analytics', payload); } catch(e){}
    // push to dataLayer if present
    try{ if(window.dataLayer) window.dataLayer.push(payload); } catch(e){}
    // if gtag is available, send as GA4 event (map event name and params)
    try{
        if(window.gtag){
            // GA4 reserved event name rules: convert to lowercase underscores
            const gaName = String(name).replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
            window.gtag('event', gaName, data);
        }
    }catch(e){ console.warn('gtag send failed', e); }
}

// ===========================
// LOAD PRODUCTS
// ===========================

async function loadProducts() {

    if (!productsGrid) return;

    try {

        // use cached fetch/parse helper
        allProducts = await getProductsCached();
        filteredProducts = [...allProducts];

        // If index page (has categoriesGrid), render categories + limited featured
        if (document.getElementById('categoriesGrid')) {
            renderCategories(allProducts);
            const featured = filteredProducts.slice(0, 12);
            renderProducts(featured);
            const viewAllWrapper = document.getElementById('viewAllWrapper');
            if (viewAllWrapper) {
                viewAllWrapper.style.display = 'block';
                document.getElementById('viewAllLink').href = 'all-products.html';
            }
            trackEvent('page_load', { page: 'index', initialProducts: featured.length });
        } else {
            // standard full render
            renderProducts(filteredProducts);
            trackEvent('page_load', { page: 'products_full', totalProducts: filteredProducts.length });
        }

    }
    catch (error) {

        console.error(error);

        productsGrid.innerHTML =
            '<div class="loading">Unable to load products.</div>';
    }
}

// ===========================
// CSV PARSER
// ===========================

// Simple CSV parser that supports quoted fields containing commas.
function parseCSV(csvText) {
    const lines = csvText.trim().split(/\r?\n/).filter(Boolean);
    if (!lines.length) return [];

    const headers = parseCSVLine(lines[0]);
    const products = [];

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;

        const values = parseCSVLine(lines[i]);
        const product = {};

        headers.forEach((header, index) => {
            product[header] = values[index] ? values[index].trim() : '';
        });

        // Build images array from possible columns
        const images = [];
        if (product.main_image) images.push(product.main_image);
        ['img2','img3','img4','img5','img6'].forEach(k => {
            if (product[k] && product[k].trim()) images.push(product[k].trim());
        });

        if (product.image && !images.length) images.push(product.image);

        product.images = images;
        product.image = images[0] || product.image || 'images/placeholder.svg';

        products.push(product);
    }

    return products;
}

// parse a single CSV line into fields, handling quoted values with commas
function parseCSVLine(line) {
    const result = [];
    let cur = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const ch = line[i];

        if (ch === '"') {
            // Check for escaped quote
            if (inQuotes && line[i+1] === '"') {
                cur += '"';
                i++; // skip escaped quote
            } else {
                inQuotes = !inQuotes;
            }
            continue;
        }

        if (ch === ',' && !inQuotes) {
            result.push(cur);
            cur = '';
            continue;
        }

        cur += ch;
    }

    result.push(cur);
    return result;
}

// ===========================
// PRICE HELPERS
// ===========================

function getDiscountPercent(mrp, sellingPrice) {
    mrp = Number(mrp || 0);
    sellingPrice = Number(sellingPrice || 0);

    if (!mrp) return 0;

    return Math.round(((mrp - sellingPrice) / mrp) * 100);
}

function getFinalPrice(product) {
    const selling = Number(product.selling_price || 0);
    const discount = Number(product.discount_amount || 0);
    return Math.max(selling - discount, 0);
}

function isHotDeal(product) {
    return getDiscountPercent(product.mrp, product.selling_price) > 49;
}

// ===========================
// CATEGORY HELPERS (with counts)
// ===========================

function getUniqueCategoriesWithCount(products){
    const map = {};
    products.forEach(p=>{
        const c = (p.category || 'Uncategorized').trim();
        if(!c) return;
        if(!map[c]) map[c] = { name: c, sampleImage: p.image || 'images/placeholder.svg', count: 0 };
        map[c].count++;
    });
    return Object.values(map);
}

function renderCategories(products){
    const container = document.getElementById('categoriesGrid');
    if(!container) return;
    const cats = getUniqueCategoriesWithCount(products);
    container.innerHTML = cats.map(cat => `
      <div class="category-tile" data-category="${escapeHTML(cat.name)}">
        <a href="category.html?cat=${encodeURIComponent(cat.name)}" style="text-decoration:none;color:inherit;">
          <div class="category-image">
            <img src="${cat.sampleImage}" loading="lazy" alt="${escapeHTML(cat.name)}">
            <div class="category-count-badge">${cat.count}</div>
          </div>
          <div class="category-name">${escapeHTML(cat.name)}</div>
        </a>
      </div>
    `).join('');
}

// ===========================
// PRODUCT GRID
// ===========================

function renderProducts(products) {
    if (!productsGrid) return;

    if (!products.length) {
        productsGrid.innerHTML = '<div class="loading">No products found.</div>';
        return;
    }

    productsGrid.innerHTML = products.map(createProductCard).join('');

    // observe lazy images after render
    requestAnimationFrame(() => { window.observeLazyImages && window.observeLazyImages(); });
}

// New helper: render a slice of products and optionally append
function renderProductCards(products, append = false){
    if (!productsGrid) return;
    if(!products || !products.length){
        if(!append) productsGrid.innerHTML = '<div class="loading">No products found.</div>';
        return;
    }
    const html = products.map(createProductCard).join('');
    if(append){
        productsGrid.insertAdjacentHTML('beforeend', html);
    } else {
        productsGrid.innerHTML = html;
    }
    requestAnimationFrame(() => { window.observeLazyImages && window.observeLazyImages(); });
}

// ===========================
// PRODUCT CARD (GRID)
// ===========================

function createProductCard(product) {
    const discountPercent = getDiscountPercent(product.mrp, product.selling_price);
    const finalPrice = getFinalPrice(product);

    const shortDesc = (product.description || '').split('\n')[0] || '';

    const flatDiscountBadge = Number(product.discount_amount) > 0
        ? `<div class="flat-image-badge">Save ₹${Number(product.discount_amount).toLocaleString('en-IN')}</div>`
        : '';

    const imageRatingBadge = `<div class="image-rating-badge">⭐ ${escapeHTML(product.rating || '5')} <span class="rating-count">(${formatCount(product.reviews || '0')})</span></div>`;

    const imgSrc = product.image || 'images/placeholder.svg';

    return `
    <div class="product-card" data-product-id="${escapeHTML(product.id)}" data-product-name="${escapeHTML(product.name)}">
        <a class="product-link" href="product.html?id=${product.id}" style="text-decoration:none;color:inherit;">
            <div class="product-image-wrapper">
                <img class="product-image" src="${imgSrc}" alt="${escapeHTML(product.name)}" loading="lazy" onerror="this.src='images/placeholder.svg'">
                ${flatDiscountBadge}
                ${imageRatingBadge}
            </div>
        </a>

        <div class="product-info compact">
            <a class="product-link" href="product.html?id=${product.id}" style="text-decoration:none;color:inherit;">
                <h4 class="grid-product-name">${escapeHTML(product.name)}</h4>
            </a>

            <p class="grid-product-desc">${escapeHTML(shortDesc)}</p>

            <div class="price-row-grid">
                <span class="mrp-price">₹${formatPrice(product.mrp)}</span>
                <span class="selling-price">₹${formatPrice(product.selling_price)}</span>
                ${discountPercent > 0 ? `<span class="discount-percent">${discountPercent}%</span>` : ''}
            </div>

        </div>
    </div>
    `;
}

// ===========================
// ATTACH CARD EVENTS
// ===========================

function attachProductCardListeners() {
    // nothing needed for compact grid cards; product click tracking handled globally
}

const originalRenderProducts = renderProducts;

// ===========================
// SEARCH & FILTER
// ===========================

function handleSearch() {
    const searchTerm = (searchInput && searchInput.value || '').toLowerCase().trim();

    if (!searchTerm) {
        filteredProducts = [...allProducts];
    } else {
        filteredProducts = allProducts.filter(product =>
            (product.name || '').toLowerCase().includes(searchTerm) ||
            (product.category || '').toLowerCase().includes(searchTerm) ||
            (product.brand || '').toLowerCase().includes(searchTerm)
        );
    }

    renderProducts(filteredProducts);
}

function handleFilter(event) {
    const category = event.target.dataset.filter;

    filterButtons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    if (category === 'all') {
        filteredProducts = [...allProducts];
    } else {
        filteredProducts = allProducts.filter(product => product.category === category);
    }

    if (searchInput) searchInput.value = '';
    renderProducts(filteredProducts);
}

function setupEventListeners() {
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
        searchInput.addEventListener('keypress', e => { if (e.key === 'Enter') handleSearch(); });
    }
    if (searchBtn) searchBtn.addEventListener('click', handleSearch);
    filterButtons.forEach(button => button.addEventListener('click', handleFilter));

    // product click tracking - delegate from productsGrid
    try{
        if(productsGrid){
            productsGrid.addEventListener('click', function(e){
                const link = e.target.closest('a.product-link');
                if(!link) return;
                const href = link.getAttribute('href') || '';
                if(href.indexOf('product.html') !== 0) return; // not a product link

                const card = link.closest('.product-card');
                const pid = card && card.dataset && card.dataset.productId;
                const pname = card && card.dataset && card.dataset.productName;

                // send analytics event
                trackEvent('product_click', { product_id: pid || '', product_name: pname || '', href });
                // do not prevent navigation; GA may send asynchronously
            });
        }
    }catch(e){ console.warn('product click tracking setup failed', e); }
}

// ===========================
// UTILITIES
// ===========================

function formatPrice(price) { return Number(price || 0).toLocaleString('en-IN'); }
function escapeHTML(text) { if (!text) return ''; const map = {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#039;"}; return String(text).replace(/[&<>\"']/g,m=>map[m]); }

function formatCount(value){
    const n = Number(String(value).replace(/[^0-9.-]+/g,'')) || 0;
    if (n >= 1000000) return (Math.round(n/100000)/10).toFixed(1).replace(/\.0$/,'') + 'M';
    if (n >= 1000) return (Math.round(n/100)/10).toFixed(1).replace(/\.0$/,'') + 'K';
    return String(n);
}

function updateActiveNavLink() {
    const currentPage = window.location.pathname.split('/').pop();
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === currentPage) link.classList.add('active');
    });
}

// ===========================
// SLIDESHOW (unchanged)
// ===========================

function initSlideshow() {
    const wrapper = document.getElementById('slidesWrapper');
    if (!wrapper) return;

    const slides = wrapper.querySelectorAll('.slide');
    const dotsContainer = document.getElementById('slideDots');
    const prevBtn = document.getElementById('prevSlide');
    const nextBtn = document.getElementById('nextSlide');

    let current = 0;

    dotsContainer.innerHTML = '';

    slides.forEach((slide, index) => {
        const dot = document.createElement('div');
        dot.className = 'dot';
        if (index === 0) dot.classList.add('active');
        dot.addEventListener('click', () => goToSlide(index));
        dotsContainer.appendChild(dot);
    });

    const dots = dotsContainer.querySelectorAll('.dot');

    function goToSlide(index) {
        current = index;
        wrapper.style.transform = `translateX(-${current * 100}%)`;
        dots.forEach(dot => dot.classList.remove('active'));
        dots[current].classList.add('active');
    }

    function nextSlide() { current = (current + 1) % slides.length; goToSlide(current); }
    function prevSlide() { current = (current - 1 + slides.length) % slides.length; goToSlide(current); }

    if (nextBtn) nextBtn.addEventListener('click', nextSlide);
    if (prevBtn) prevBtn.addEventListener('click', prevSlide);

    setInterval(nextSlide, 4000);
}

window.addEventListener('load', () => console.log('JMD Mall Loaded'));
