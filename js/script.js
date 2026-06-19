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

function parseCSV(csvText) {

    const lines = csvText.trim().split('\n');

    const headers = lines[0]
        .split(',')
        .map(h => h.trim());

    const products = [];

    for (let i = 1; i < lines.length; i++) {

        if (!lines[i].trim()) continue;

        const values = lines[i].split(',');

        const product = {};

        headers.forEach((header, index) => {

            product[header] =
                values[index]
                    ? values[index].trim()
                    : '';

        });

        products.push(product);
    }

    return products;
}

// ===========================
// PRICE HELPERS
// ===========================

function getDiscountPercent(mrp, sellingPrice) {

    mrp = Number(mrp || 0);
    sellingPrice = Number(sellingPrice || 0);

    if (!mrp) return 0;

    return Math.round(
        ((mrp - sellingPrice) / mrp) * 100
    );
}

function getFinalPrice(product) {

    const selling =
        Number(product.selling_price || 0);

    const discount =
        Number(product.discount_amount || 0);

    return Math.max(
        selling - discount,
        0
    );
}

function isHotDeal(product) {

    return getDiscountPercent(
        product.mrp,
        product.selling_price
    ) > 49;
}

// ===========================
// PRODUCT GRID
// ===========================

function renderProducts(products) {

    if (!productsGrid) return;

    if (!products.length) {

        productsGrid.innerHTML =
            '<div class="loading">No products found.</div>';

        return;
    }

    productsGrid.innerHTML =
        products
            .map(createProductCard)
            .join('');
}

// ===========================
// PRODUCT CARD
// ===========================

function createProductCard(product) {

    const discountPercent =
        getDiscountPercent(
            product.mrp,
            product.selling_price
        );

    const hotDeal =
        isHotDeal(product);

    const finalPrice =
        getFinalPrice(product);

    return `

    <div class="product-card">

        <a href="product.html?id=${product.id}"
           style="text-decoration:none;color:inherit;">

            <div class="product-image-wrapper">

                <img
                    class="product-image"
                    src="${product.image}"
                    alt="${escapeHTML(product.name)}"
                    loading="lazy">

                <span class="product-category">
                    ${product.category}
                </span>

                ${
                    hotDeal
                    ? '<span class="hot-deal-badge">🔥 HOT DEAL</span>'
                    : ''
                }

                ${
                    discountPercent > 0
                    ? `
                    <span class="discount-badge">
                        ${discountPercent}% OFF
                    </span>
                    `
                    : ''
                }

            </div>

        </a>

        <div class="product-info">

            <a href="product.html?id=${product.id}"
               style="text-decoration:none;color:inherit;">

                <h3 class="product-name">
                    ${escapeHTML(product.name)}
                </h3>

            </a>

            <div class="price-box">

                <div class="mrp-price">
                    ₹${formatPrice(product.mrp)}
                </div>

                <div class="selling-price">
                    ₹${formatPrice(product.selling_price)}
                </div>

            </div>

            ${
                Number(product.discount_amount) > 0
                ? `
                <div class="flat-discount">
                    Flat ₹${product.discount_amount} OFF
                </div>
                `
                : ''
            }

            <div class="product-rating">

                ⭐ ${product.rating || '5'}

                (${product.reviews || '0'})

            </div>

            <div class="product-actions">

                <button
                    class="action-btn buy-btn"
                    data-product-id="${product.id}"
                    data-product-name="${escapeHTML(product.name)}"
                    data-product-price="${finalPrice}">

                    Buy Now

                </button>

                <button
                    class="action-btn share-btn"
                    data-product-id="${product.id}"
                    data-product-name="${escapeHTML(product.name)}">

                    Share

                </button>

            </div>

        </div>

    </div>

    `;
}

// ===========================
// ATTACH CARD EVENTS
// ===========================

function attachProductCardListeners() {

    document
        .querySelectorAll('.buy-btn')
        .forEach(btn => {

            btn.addEventListener(
                'click',
                handleBuyClick
            );

        });

    document
        .querySelectorAll('.share-btn')
        .forEach(btn => {

            btn.addEventListener(
                'click',
                handleShareClick
            );

        });
}

// ===========================
// RE-ATTACH AFTER RENDER
// ===========================

const originalRenderProducts =
    renderProducts;

renderProducts = function(products) {

    originalRenderProducts(products);

    attachProductCardListeners();

};

// ===========================
// BUY NOW
// ===========================

function handleBuyClick(event) {

    event.preventDefault();

    event.stopPropagation();

    const productName =
        event.target.getAttribute(
            'data-product-name'
        );

    const productPrice =
        event.target.getAttribute(
            'data-product-price'
        );

    const message =

`Hi,

I want to order:

${productName}

Price: ₹${productPrice}

From JMDMall.com`;

    const whatsappUrl =

        CONFIG.WHATSAPP_API_URL +
        CONFIG.WHATSAPP_NUMBER +
        '?text=' +
        encodeURIComponent(message);

    window.open(
        whatsappUrl,
        '_blank'
    );
}

// ===========================
// SHARE
// ===========================

function handleShareClick(event) {

    event.preventDefault();

    event.stopPropagation();

    const productId =
        event.target.getAttribute(
            'data-product-id'
        );

    const productName =
        event.target.getAttribute(
            'data-product-name'
        );

    const shareUrl =
        window.location.origin +
        '/product.html?id=' +
        productId;

    if (navigator.share) {

        navigator.share({

            title: productName,

            text:
                'Check this product on JMD Mall',

            url: shareUrl

        });

    } else {

        navigator.clipboard.writeText(
            shareUrl
        );

        alert(
            'Product link copied.'
        );
    }
}

// ===========================
// SEARCH
// ===========================

function handleSearch() {

    const searchTerm =
        searchInput.value
            .toLowerCase()
            .trim();

    if (!searchTerm) {

        filteredProducts =
            [...allProducts];

    } else {

        filteredProducts =
            allProducts.filter(product =>

                (product.name || '')
                    .toLowerCase()
                    .includes(searchTerm)

                ||

                (product.category || '')
                    .toLowerCase()
                    .includes(searchTerm)

                ||

                (product.brand || '')
                    .toLowerCase()
                    .includes(searchTerm)

            );
    }

    renderProducts(filteredProducts);
}

// ===========================
// CATEGORY FILTER
// ===========================

function handleFilter(event) {

    const category =
        event.target.dataset.filter;

    filterButtons.forEach(btn =>
        btn.classList.remove('active')
    );

    event.target.classList.add('active');

    if (category === 'all') {

        filteredProducts =
            [...allProducts];

    } else {

        filteredProducts =
            allProducts.filter(product =>

                product.category === category

            );
    }

    if (searchInput) {
        searchInput.value = '';
    }

    renderProducts(filteredProducts);
}

// ===========================
// EVENT LISTENERS
// ===========================

function setupEventListeners() {

    if (searchInput) {

        searchInput.addEventListener(
            'input',
            handleSearch
        );

        searchInput.addEventListener(
            'keypress',
            e => {

                if (e.key === 'Enter') {

                    handleSearch();

                }

            }
        );
    }

    if (searchBtn) {

        searchBtn.addEventListener(
            'click',
            handleSearch
        );

    }

    filterButtons.forEach(button => {

        button.addEventListener(
            'click',
            handleFilter
        );

    });

    const contactForm =
        document.getElementById(
            'contactForm'
        );

    if (contactForm) {

        contactForm.addEventListener(
            'submit',
            handleFormSubmit
        );

    }
}

// ===========================
// CONTACT FORM
// ===========================

function handleFormSubmit(e) {

    e.preventDefault();

    showNotification(
        'Thank you. We received your message.'
    );

    e.target.reset();
}

// ===========================
// NOTIFICATION
// ===========================

function showNotification(message) {

    const div =
        document.createElement('div');

    div.innerText = message;

    div.style.position = 'fixed';
    div.style.top = '90px';
    div.style.right = '20px';
    div.style.background = '#28a745';
    div.style.color = '#fff';
    div.style.padding = '12px 18px';
    div.style.borderRadius = '8px';
    div.style.zIndex = '9999';

    document.body.appendChild(div);

    setTimeout(() => {

        div.remove();

    }, 3000);
}

// ===========================
// FORMAT PRICE
// ===========================

function formatPrice(price) {

    return Number(price || 0)
        .toLocaleString('en-IN');

}

// ===========================
// ESCAPE HTML
// ===========================

function escapeHTML(text) {

    if (!text) return '';

    const map = {

        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'

    };

    return text.replace(
        /[&<>"']/g,
        m => map[m]
    );
}

// ===========================
// ACTIVE MENU
// ===========================

function updateActiveNavLink() {

    const currentPage =
        window.location.pathname
        .split('/')
        .pop();

    document
        .querySelectorAll('.nav-link')
        .forEach(link => {

            link.classList.remove(
                'active'
            );

            if (
                link.getAttribute('href')
                === currentPage
            ) {

                link.classList.add(
                    'active'
                );

            }

        });
}

// ===========================
// SLIDESHOW
// ===========================

function initSlideshow() {

    const wrapper =
        document.getElementById(
            'slidesWrapper'
        );

    if (!wrapper) return;

    const slides =
        wrapper.querySelectorAll(
            '.slide'
        );

    const dotsContainer =
        document.getElementById(
            'slideDots'
        );

    const prevBtn =
        document.getElementById(
            'prevSlide'
        );

    const nextBtn =
        document.getElementById(
            'nextSlide'
        );

    let current = 0;

    slides.forEach((slide, index) => {

        const dot =
            document.createElement('div');

        dot.className = 'dot';

        if (index === 0) {

            dot.classList.add(
                'active'
            );

        }

        dot.addEventListener(
            'click',
            () => goToSlide(index)
        );

        dotsContainer.appendChild(dot);

    });

    const dots =
        dotsContainer.querySelectorAll(
            '.dot'
        );

    function goToSlide(index) {

        current = index;

        wrapper.style.transform =
            `translateX(-${current * 100}%)`;

        dots.forEach(dot =>
            dot.classList.remove(
                'active'
            )
        );

        dots[current].classList.add(
            'active'
        );
    }

    function nextSlide() {

        current++;

        if (
            current >= slides.length
        ) {

            current = 0;

        }

        goToSlide(current);
    }

    function prevSlide() {

        current--;

        if (current < 0) {

            current =
                slides.length - 1;

        }

        goToSlide(current);
    }

    if (nextBtn) {

        nextBtn.addEventListener(
            'click',
            nextSlide
        );

    }

    if (prevBtn) {

        prevBtn.addEventListener(
            'click',
            prevSlide
        );

    }

    setInterval(
        nextSlide,
        4000
    );
}

// ===========================
// PERFORMANCE
// ===========================

window.addEventListener(
    'load',
    function () {

        console.log(
            'JMD Mall Loaded'
        );

    }
);

// ===========================
// ERROR HANDLING
// ===========================

window.addEventListener(
    'error',
    function (e) {

        console.error(
            'JS Error:',
            e.error
        );

    }
);

window.addEventListener(
    'unhandledrejection',
    function (e) {

        console.error(
            'Promise Error:',
            e.reason
        );

    }
);

