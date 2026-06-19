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

    await loadProducts();

    setupEventListeners();

    updateActiveNavLink();

    initSlideshow();

});

// ===========================
// LOAD PRODUCTS
// ===========================

async function loadProducts() {

    if (!productsGrid) return;

    try {

        const response = await fetch(CONFIG.CSV_URL);

        if (!response.ok) {
            throw new Error('CSV not found');
        }

        const csvText = await response.text();

        allProducts = parseCSV(csvText);

        filteredProducts = [...allProducts];

        renderProducts(filteredProducts);

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

// ===========================
// PRODUCT CARD (GRID) - adjusted layout for compact Flipkart-like box
// ===========================

function createProductCard(product) {
    const discountPercent = getDiscountPercent(product.mrp, product.selling_price);
    const finalPrice = getFinalPrice(product);

    // compact name and description (one-line name, two-line desc)
    const shortDesc = (product.description || '').split('\n')[0] || '';

    // image badge for flat discount displayed on image
    const flatDiscountBadge = Number(product.discount_amount) > 0
        ? `<div class="flat-image-badge">₹${Number(product.discount_amount).toLocaleString('en-IN')} off</div>`
        : '';

    const imgSrc = product.image || 'images/placeholder.svg';

    return `
    <div class="product-card">
        <a href="product.html?id=${product.id}" style="text-decoration:none;color:inherit;">
            <div class="product-image-wrapper">
                <img class="product-image" src="${imgSrc}" alt="${escapeHTML(product.name)}" loading="lazy" onerror="this.src='images/placeholder.svg'">
                ${flatDiscountBadge}
            </div>
        </a>

        <div class="product-info compact">
            <a href="product.html?id=${product.id}" style="text-decoration:none;color:inherit;">
                <h4 class="grid-product-name">${escapeHTML(product.name)}</h4>
            </a>

            <p class="grid-product-desc">${escapeHTML(shortDesc)}</p>

            <div class="price-row-grid">
                <span class="mrp-price">₹${formatPrice(product.mrp)}</span>
                <span class="selling-price">₹${formatPrice(product.selling_price)}</span>
                ${discountPercent > 0 ? `<span class="discount-percent">${discountPercent}% OFF</span>` : ''}
                <span class="product-rating small">⭐ ${product.rating || '5'} (${formatCount(product.reviews || '0')})</span>
            </div>

        </div>
    </div>
    `;
}

// ===========================
// ATTACH CARD EVENTS (grid has no buy/share buttons)
// ===========================

function attachProductCardListeners() {
    // nothing needed for compact grid cards
}

// Re-attach after render (no special listeners needed now)
const originalRenderProducts = renderProducts;
// renderProducts already redefined above to call observeLazyImages.

// ===========================
// SEARCH & FILTER (unchanged)
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
}

// ===========================
// UTILITIES
// ===========================

function formatPrice(price) { return Number(price || 0).toLocaleString('en-IN'); }
function escapeHTML(text) { if (!text) return ''; const map = {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#039;"}; return String(text).replace(/[&<>"']/g,m=>map[m]); }

// Format large counts: 1200 -> 1.2K, 1,200,000 -> 1.2M
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
