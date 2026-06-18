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
const contactForm = document.getElementById('contactForm');
const formMessage = document.getElementById('formMessage');

// ===========================
// INITIALIZATION
// ===========================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('Page loaded, initializing...');
    await loadProducts();
    setupEventListeners();
    updateActiveNavLink();
});


// Slideshow
(function () {
    const wrapper = document.getElementById('slidesWrapper');
    const dotsContainer = document.getElementById('slideDots');
    const prevBtn = document.getElementById('prevSlide');
    const nextBtn = document.getElementById('nextSlide');

    if (!wrapper) return;

    const slides = wrapper.querySelectorAll('.slide');
    let current = 0;
    let autoPlay;

    slides.forEach((_, i) => {
        const dot = document.createElement('div');
        dot.classList.add('dot');
        if (i === 0) dot.classList.add('active');
        dot.addEventListener('click', () => goToSlide(i));
        dotsContainer.appendChild(dot);
    });

    const dots = dotsContainer.querySelectorAll('.dot');

    function goToSlide(index) {
        current = (index + slides.length) % slides.length;
        wrapper.style.transform = `translateX(-${current * 100}%)`;
        dots.forEach(d => d.classList.remove('active'));
        dots[current].classList.add('active');
        resetAutoPlay();
    }

    function nextSlide() { goToSlide(current + 1); }
    function prevSlide() { goToSlide(current - 1); }

    function resetAutoPlay() {
        clearInterval(autoPlay);
        autoPlay = setInterval(nextSlide, 4000);
    }

    nextBtn.addEventListener('click', nextSlide);
    prevBtn.addEventListener('click', prevSlide);

    resetAutoPlay();
})();

// ===========================
// LOAD PRODUCTS FROM CSV
// ===========================

async function loadProducts() {
    try {
        const response = await fetch(CONFIG.CSV_URL);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const csvText = await response.text();
        allProducts = parseCSV(csvText);
        filteredProducts = [...allProducts];
        
        console.log(`Loaded ${allProducts.length} products`);
        renderProducts(filteredProducts);
    } catch (error) {
        console.error('Error loading products:', error);
        productsGrid.innerHTML = '<div class="loading">Failed to load products. Please refresh the page.</div>';
    }
}

// ===========================
// PARSE CSV
// ===========================

function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim());
    const products = [];
    
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '') continue;
        
        const values = lines[i].split(',').map(v => v.trim());
        const product = {};
        
        headers.forEach((header, index) => {
            product[header] = values[index] || '';
        });
        
        products.push(product);
    }
    
    return products;
}

// ===========================
// RENDER PRODUCTS
// ===========================

function renderProducts(products) {
    if (!productsGrid) return;
    
    if (products.length === 0) {
        productsGrid.innerHTML = '<div class="loading">No products found</div>';
        return;
    }
    
    productsGrid.innerHTML = products.map(product => createProductCard(product)).join('');
    attachProductCardListeners();
}

// ===========================
// CREATE PRODUCT CARD
// ===========================

function createProductCard(product) {
    const { id, name, price, image, category } = product;
    
    return `
        <div class="product-card" data-product-id="${id}">
            <div class="product-image-wrapper">
                <img class="product-image" src="${image}" alt="${name}" loading="lazy">
                <span class="product-category">${category}</span>
            </div>
            <div class="product-info">
                <h3 class="product-name">${escapeHTML(name)}</h3>
                <div class="product-price">₹${formatPrice(price)}</div>
                <div class="product-actions">
                    <button class="action-btn buy-btn" data-product-id="${id}" data-product-name="${escapeHTML(name)}" data-product-price="${price}">
                        Buy on WhatsApp
                    </button>
                    <button class="action-btn share-btn" data-product-id="${id}" data-product-name="${escapeHTML(name)}">
                        Share
                    </button>
                </div>
            </div>
        </div>
    `;
}

// ===========================
// ATTACH EVENT LISTENERS TO PRODUCT CARDS
// ===========================

function attachProductCardListeners() {
    // Buy on WhatsApp buttons
    document.querySelectorAll('.buy-btn').forEach(button => {
        button.addEventListener('click', handleBuyClick);
    });
    
    // Share buttons
    document.querySelectorAll('.share-btn').forEach(button => {
        button.addEventListener('click', handleShareClick);
    });
}

// ===========================
// HANDLE BUY CLICK
// ===========================

function handleBuyClick(event) {
    event.preventDefault();
    
    const productName = event.target.getAttribute('data-product-name');
    const productPrice = event.target.getAttribute('data-product-price');
    
    const message = `I want to buy ${productName} for ₹${productPrice} from JMD Mall`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `${CONFIG.WHATSAPP_API_URL}${CONFIG.WHATSAPP_NUMBER}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
}

// ===========================
// HANDLE SHARE CLICK
// ===========================

function handleShareClick(event) {
    event.preventDefault();
    
    const productName = event.target.getAttribute('data-product-name');
    const productId = event.target.getAttribute('data-product-id');
    const currentUrl = window.location.origin + window.location.pathname + `?product=${productId}`;
    
    const shareData = {
        title: 'JMD Mall',
        text: `Check out ${productName} on JMD Mall`,
        url: currentUrl
    };
    
    // Use Web Share API if available
    if (navigator.share) {
        navigator.share(shareData)
            .then(() => console.log('Product shared successfully'))
            .catch(err => {
                if (err.name !== 'AbortError') {
                    console.error('Error sharing:', err);
                    fallbackShare(shareData);
                }
            });
    } else {
        // Fallback: copy to clipboard
        fallbackShare(shareData);
    }
}

// ===========================
// FALLBACK SHARE (COPY TO CLIPBOARD)
// ===========================

function fallbackShare(shareData) {
    const text = `${shareData.title}\n${shareData.text}\n${shareData.url}`;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text)
            .then(() => showNotification('Link copied to clipboard!'))
            .catch(() => showNotification('Could not copy to clipboard', 'error'));
    } else {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            showNotification('Link copied to clipboard!');
        } catch (err) {
            showNotification('Could not copy to clipboard', 'error');
        }
        document.body.removeChild(textarea);
    }
}

// ===========================
// SHOW NOTIFICATION
// ===========================

function showNotification(message, type = 'success') {
    // Create a temporary notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        padding: 1rem 1.5rem;
        background-color: ${type === 'success' ? '#4CAF50' : '#f44336'};
        color: white;
        border-radius: 4px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        z-index: 1001;
        font-weight: 500;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ===========================
// SETUP EVENT LISTENERS
// ===========================

function setupEventListeners() {
    // Search functionality
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') handleSearch();
        });
    }
    
    if (searchBtn) {
        searchBtn.addEventListener('click', handleSearch);
    }
    
    // Filter buttons
    filterButtons.forEach(button => {
        button.addEventListener('click', handleFilter);
    });
    
    // Contact form
    if (contactForm) {
        contactForm.addEventListener('submit', handleFormSubmit);
    }
}

// ===========================
// HANDLE SEARCH
// ===========================

function handleSearch() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    if (searchTerm === '') {
        filteredProducts = [...allProducts];
    } else {
        filteredProducts = allProducts.filter(product => 
            product.name.toLowerCase().includes(searchTerm) ||
            product.category.toLowerCase().includes(searchTerm)
        );
    }
    
    renderProducts(filteredProducts);
}

// ===========================
// HANDLE FILTER
// ===========================

function handleFilter(event) {
    const filterValue = event.target.getAttribute('data-filter');
    
    // Update active button
    filterButtons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Filter products
    if (filterValue === 'all') {
        filteredProducts = [...allProducts];
    } else {
        filteredProducts = allProducts.filter(product => product.category === filterValue);
    }
    
    // Clear search
    if (searchInput) searchInput.value = '';
    
    renderProducts(filteredProducts);
}

// ===========================
// HANDLE FORM SUBMIT
// ===========================

function handleFormSubmit(event) {
    event.preventDefault();
    
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const subject = document.getElementById('subject').value.trim();
    const message = document.getElementById('message').value.trim();
    
    // Validate
    if (!name || !email || !phone || !subject || !message) {
        showFormMessage('Please fill in all fields.', 'error');
        return;
    }
    
    if (!isValidEmail(email)) {
        showFormMessage('Please enter a valid email address.', 'error');
        return;
    }
    
    if (!isValidPhone(phone)) {
        showFormMessage('Please enter a valid phone number.', 'error');
        return;
    }
    
    // Log form data (in real app, send to server)
    console.log('Form submitted:', {
        name, email, phone, subject, message,
        timestamp: new Date().toISOString()
    });
    
    showFormMessage('Thank you! Your message has been received. We will get back to you soon.', 'success');
    contactForm.reset();
    
    setTimeout(() => {
        formMessage.style.display = 'none';
    }, 5000);
}

// ===========================
// SHOW FORM MESSAGE
// ===========================

function showFormMessage(message, type) {
    if (!formMessage) return;
    
    formMessage.textContent = message;
    formMessage.className = `form-message ${type}`;
    formMessage.style.display = 'block';
    
    formMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ===========================
// VALIDATION HELPERS
// ===========================

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isValidPhone(phone) {
    const phoneRegex = /^[\d\s\-\+\(\)]{10,}$/;
    return phoneRegex.test(phone);
}

// ===========================
// UTILITY FUNCTIONS
// ===========================

function formatPrice(price) {
    return parseInt(price).toLocaleString('en-IN');
}

function escapeHTML(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

function updateActiveNavLink() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        
        const href = link.getAttribute('href');
        if (href === currentPage || (currentPage === '' && href === 'index.html')) {
            link.classList.add('active');
        }
    });
}

// ===========================
// PERFORMANCE MONITORING
// ===========================

window.addEventListener('load', function() {
    const perfData = window.performance.timing;
    const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
    console.log(`Page loaded in ${pageLoadTime}ms`);
});

// ===========================
// ERROR HANDLING
// ===========================

window.addEventListener('error', function(e) {
    console.error('Error occurred:', e.error);
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled promise rejection:', e.reason);
});
