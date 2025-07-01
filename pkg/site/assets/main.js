/**
 * Beaver Knowledge Base - Advanced UI/UX Features
 * Issue #320 Implementation
 */

class BeaverUI {
    constructor() {
        this.theme = localStorage.getItem('beaver-theme') || 'light';
        this.searchIndex = [];
        this.tocItems = [];
        this.currentSection = null;
        
        this.init();
    }

    init() {
        this.applyTheme();
        this.setupThemeToggle();
        this.setupSearch();
        this.setupTableOfContents();
        this.setupReadingProgress();
        this.setupInteractiveElements();
        this.setupAccessibility();
        this.setupPerformanceOptimizations();
        
        // Initialize on page load
        document.addEventListener('DOMContentLoaded', () => {
            this.buildSearchIndex();
            this.buildTableOfContents();
            this.updateReadingProgress();
        });
    }

    // Theme Management
    applyTheme() {
        document.documentElement.setAttribute('data-theme', this.theme);
        
        // Update theme-color meta tag
        const themeColorMetas = document.querySelectorAll('meta[name="theme-color"]');
        const color = this.theme === 'dark' ? '#1A1A1A' : '#8B4513';
        themeColorMetas.forEach(meta => meta.setAttribute('content', color));
    }

    toggleTheme() {
        this.theme = this.theme === 'light' ? 'dark' : 'light';
        localStorage.setItem('beaver-theme', this.theme);
        this.applyTheme();
        
        // Animate the toggle
        document.body.style.transition = 'background-color 0.3s ease';
        setTimeout(() => {
            document.body.style.transition = '';
        }, 300);
    }

    setupThemeToggle() {
        // Create theme toggle button
        const toggle = document.createElement('div');
        toggle.className = 'theme-toggle';
        toggle.innerHTML = `
            <button class="theme-toggle-btn" aria-label="テーマを切り替え">
                <span class="theme-icon">${this.theme === 'dark' ? '☀️' : '🌙'}</span>
            </button>
        `;
        
        const button = toggle.querySelector('.theme-toggle-btn');
        button.addEventListener('click', () => {
            this.toggleTheme();
            const icon = button.querySelector('.theme-icon');
            icon.textContent = this.theme === 'dark' ? '☀️' : '🌙';
        });
        
        document.body.appendChild(toggle);
    }

    // Search Functionality
    buildSearchIndex() {
        const content = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li');
        this.searchIndex = [];
        
        content.forEach((element, index) => {
            const text = element.textContent.trim();
            if (text.length > 3) {
                this.searchIndex.push({
                    id: index,
                    element: element,
                    text: text,
                    title: this.getElementTitle(element),
                    url: this.getElementUrl(element)
                });
            }
        });
    }

    getElementTitle(element) {
        // Find the nearest heading
        let current = element;
        while (current && current.parentElement) {
            const heading = current.parentElement.querySelector('h1, h2, h3, h4, h5, h6');
            if (heading) {
                return heading.textContent.trim();
            }
            current = current.parentElement;
        }
        return document.title;
    }

    getElementUrl(element) {
        const id = element.id || element.closest('[id]')?.id;
        return id ? `#${id}` : window.location.pathname;
    }

    setupSearch() {
        // Create search container
        const searchContainer = document.createElement('div');
        searchContainer.className = 'search-container';
        searchContainer.innerHTML = `
            <input type="text" class="search-box" placeholder="検索... (Japanese/English)" aria-label="サイト内検索">
            <div class="search-results" role="listbox" aria-label="検索結果"></div>
        `;
        
        const main = document.querySelector('.main .container');
        if (main) {
            main.insertBefore(searchContainer, main.firstChild);
        }
        
        const searchBox = searchContainer.querySelector('.search-box');
        const searchResults = searchContainer.querySelector('.search-results');
        
        let searchTimeout;
        searchBox.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.performSearch(e.target.value, searchResults);
            }, 300);
        });
        
        // Hide results when clicking outside
        document.addEventListener('click', (e) => {
            if (!searchContainer.contains(e.target)) {
                searchResults.classList.remove('show');
            }
        });
    }

    performSearch(query, resultsContainer) {
        if (query.length < 2) {
            resultsContainer.classList.remove('show');
            return;
        }
        
        const results = this.searchIndex.filter(item => 
            item.text.toLowerCase().includes(query.toLowerCase()) ||
            item.title.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 10);
        
        if (results.length === 0) {
            resultsContainer.innerHTML = '<div class="search-result-item">検索結果が見つかりませんでした</div>';
        } else {
            resultsContainer.innerHTML = results.map(result => `
                <div class="search-result-item" data-url="${result.url}">
                    <div class="search-result-title">${this.highlightText(result.title, query)}</div>
                    <div class="search-result-excerpt">${this.highlightText(this.truncateText(result.text, 100), query)}</div>
                </div>
            `).join('');
            
            // Add click handlers
            resultsContainer.querySelectorAll('.search-result-item').forEach(item => {
                item.addEventListener('click', () => {
                    const url = item.dataset.url;
                    if (url.startsWith('#')) {
                        const element = document.querySelector(url);
                        if (element) {
                            element.scrollIntoView({ behavior: 'smooth' });
                        }
                    } else {
                        window.location.href = url;
                    }
                    resultsContainer.classList.remove('show');
                });
            });
        }
        
        resultsContainer.classList.add('show');
    }

    highlightText(text, query) {
        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    truncateText(text, maxLength) {
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    // Table of Contents
    buildTableOfContents() {
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        if (headings.length < 3) return; // Don't show TOC for short pages
        
        this.tocItems = Array.from(headings).map((heading, index) => {
            const id = heading.id || `heading-${index}`;
            if (!heading.id) {
                heading.id = id;
            }
            
            return {
                id: id,
                text: heading.textContent.trim(),
                level: parseInt(heading.tagName.charAt(1)),
                element: heading
            };
        });
        
        // Create TOC container
        const tocContainer = document.createElement('div');
        tocContainer.className = 'toc-container';
        tocContainer.innerHTML = `
            <div class="toc-title">目次</div>
            <ul class="toc-list">
                ${this.tocItems.map(item => `
                    <li class="toc-item">
                        <a href="#${item.id}" class="toc-link level-${item.level}">${item.text}</a>
                    </li>
                `).join('')}
            </ul>
        `;
        
        document.body.appendChild(tocContainer);
        
        // Show/hide TOC based on scroll position
        window.addEventListener('scroll', () => {
            const scrollTop = window.pageYOffset;
            const shouldShow = scrollTop > 300;
            tocContainer.classList.toggle('show', shouldShow);
            
            this.updateActiveTocItem();
        });
        
        // Smooth scroll for TOC links
        tocContainer.querySelectorAll('.toc-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(link.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
    }

    updateActiveTocItem() {
        const scrollTop = window.pageYOffset + 100;
        let activeItem = null;
        
        this.tocItems.forEach(item => {
            const element = document.getElementById(item.id);
            if (element && element.offsetTop <= scrollTop) {
                activeItem = item;
            }
        });
        
        // Update active states
        document.querySelectorAll('.toc-link').forEach(link => {
            link.classList.remove('active');
        });
        
        if (activeItem) {
            const activeLink = document.querySelector(`a[href="#${activeItem.id}"]`);
            if (activeLink) {
                activeLink.classList.add('active');
            }
        }
    }

    // Reading Progress
    setupReadingProgress() {
        const progressBar = document.createElement('div');
        progressBar.className = 'reading-progress';
        document.body.appendChild(progressBar);
        
        window.addEventListener('scroll', () => {
            this.updateReadingProgress();
        });
    }

    updateReadingProgress() {
        const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = (winScroll / height) * 100;
        
        const progressBar = document.querySelector('.reading-progress');
        if (progressBar) {
            progressBar.style.width = scrolled + '%';
        }
    }

    // Interactive Elements
    setupInteractiveElements() {
        this.setupCollapsibleSections();
        this.setupTooltips();
        this.setupTabs();
        this.setupModals();
    }

    setupCollapsibleSections() {
        // Auto-detect collapsible sections
        const cards = document.querySelectorAll('.beaver-card, .issue-card, .problem-card, .decision-card');
        
        cards.forEach(card => {
            const header = card.querySelector('h3, h4');
            if (header) {
                header.style.cursor = 'pointer';
                header.innerHTML += ' <span class="collapse-indicator">▼</span>';
                
                const content = Array.from(card.children).slice(1);
                const contentWrapper = document.createElement('div');
                contentWrapper.className = 'collapsible-content';
                
                content.forEach(element => {
                    contentWrapper.appendChild(element);
                });
                
                card.appendChild(contentWrapper);
                
                header.addEventListener('click', () => {
                    const isExpanded = contentWrapper.style.display !== 'none';
                    contentWrapper.style.display = isExpanded ? 'none' : 'block';
                    header.querySelector('.collapse-indicator').textContent = isExpanded ? '▶' : '▼';
                });
            }
        });
    }

    setupTooltips() {
        // Add tooltips to status indicators and labels
        const statusElements = document.querySelectorAll('.status-indicator, .label, .issue-state');
        
        statusElements.forEach(element => {
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.textContent = this.getTooltipText(element);
            
            element.style.position = 'relative';
            element.appendChild(tooltip);
            
            element.addEventListener('mouseenter', () => {
                tooltip.style.display = 'block';
            });
            
            element.addEventListener('mouseleave', () => {
                tooltip.style.display = 'none';
            });
        });
    }

    getTooltipText(element) {
        if (element.classList.contains('status-indicator')) {
            if (element.classList.contains('healthy')) return '健全な状態';
            if (element.classList.contains('warning')) return '注意が必要';
            if (element.classList.contains('error')) return 'エラー状態';
        }
        return element.textContent;
    }

    setupTabs() {
        // Auto-detect tab containers
        const tabContainers = document.querySelectorAll('.beaver-layout');
        
        tabContainers.forEach(container => {
            if (container.children.length > 3) {
                this.convertToTabs(container);
            }
        });
    }

    convertToTabs(container) {
        const cards = Array.from(container.children);
        const tabsContainer = document.createElement('div');
        tabsContainer.className = 'tabs-container';
        
        const tabsList = document.createElement('div');
        tabsList.className = 'tabs-list';
        
        const tabsContent = document.createElement('div');
        tabsContent.className = 'tabs-content';
        
        cards.forEach((card, index) => {
            const title = card.querySelector('h3')?.textContent || `タブ ${index + 1}`;
            
            const tabButton = document.createElement('button');
            tabButton.className = `tab-button ${index === 0 ? 'active' : ''}`;
            tabButton.textContent = title;
            tabButton.addEventListener('click', () => this.switchTab(index, tabsContainer));
            
            tabsList.appendChild(tabButton);
            
            card.className += ` tab-content ${index === 0 ? 'active' : ''}`;
            tabsContent.appendChild(card);
        });
        
        tabsContainer.appendChild(tabsList);
        tabsContainer.appendChild(tabsContent);
        
        container.parentNode.replaceChild(tabsContainer, container);
    }

    switchTab(activeIndex, container) {
        const buttons = container.querySelectorAll('.tab-button');
        const contents = container.querySelectorAll('.tab-content');
        
        buttons.forEach((button, index) => {
            button.classList.toggle('active', index === activeIndex);
        });
        
        contents.forEach((content, index) => {
            content.classList.toggle('active', index === activeIndex);
        });
    }

    setupModals() {
        // Add modal functionality for images and detailed content
        const images = document.querySelectorAll('img');
        
        images.forEach(img => {
            img.style.cursor = 'pointer';
            img.addEventListener('click', () => {
                this.openModal(img.src, img.alt);
            });
        });
    }

    openModal(content, title) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close" aria-label="閉じる">×</button>
                </div>
                <div class="modal-body">
                    <img src="${content}" alt="${title}" style="max-width: 100%; height: auto;">
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const closeModal = () => {
            document.body.removeChild(modal);
        };
        
        modal.querySelector('.modal-close').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeModal();
        });
    }

    // Accessibility
    setupAccessibility() {
        // Add skip navigation
        const skipNav = document.createElement('a');
        skipNav.href = '#main';
        skipNav.className = 'skip-nav';
        skipNav.textContent = 'メインコンテンツにスキップ';
        document.body.insertBefore(skipNav, document.body.firstChild);
        
        // Add ARIA labels
        this.addAriaLabels();
        
        // Focus management
        this.setupFocusManagement();
        
        // Keyboard navigation
        this.setupKeyboardNavigation();
    }

    addAriaLabels() {
        const nav = document.querySelector('.nav');
        if (nav) {
            nav.setAttribute('role', 'navigation');
            nav.setAttribute('aria-label', 'メインナビゲーション');
        }
        
        const main = document.querySelector('.main');
        if (main) {
            main.setAttribute('role', 'main');
            main.id = 'main';
        }
        
        const cards = document.querySelectorAll('.beaver-card');
        cards.forEach((card, index) => {
            card.setAttribute('role', 'article');
            card.setAttribute('aria-labelledby', `card-title-${index}`);
            
            const title = card.querySelector('h3');
            if (title) {
                title.id = `card-title-${index}`;
            }
        });
    }

    setupFocusManagement() {
        // Ensure all interactive elements are focusable
        const interactiveElements = document.querySelectorAll('button, a, input, select, textarea');
        
        interactiveElements.forEach(element => {
            if (!element.hasAttribute('tabindex')) {
                element.setAttribute('tabindex', '0');
            }
        });
    }

    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            switch (e.key) {
                case 't':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.toggleTheme();
                    }
                    break;
                case 's':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        const searchBox = document.querySelector('.search-box');
                        if (searchBox) {
                            searchBox.focus();
                        }
                    }
                    break;
                case 'Escape':
                    // Close any open overlays
                    document.querySelectorAll('.search-results, .modal-overlay').forEach(overlay => {
                        overlay.classList.remove('show');
                    });
                    break;
            }
        });
    }

    // Performance Optimizations
    setupPerformanceOptimizations() {
        this.setupLazyLoading();
        this.setupImageOptimization();
        this.setupResourcePreloading();
    }

    setupLazyLoading() {
        const images = document.querySelectorAll('img');
        
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src || img.src;
                        img.classList.remove('lazy');
                        imageObserver.unobserve(img);
                    }
                });
            });
            
            images.forEach(img => {
                img.classList.add('lazy');
                imageObserver.observe(img);
            });
        }
    }

    setupImageOptimization() {
        const images = document.querySelectorAll('img');
        
        images.forEach(img => {
            img.loading = 'lazy';
            img.addEventListener('load', () => {
                img.classList.add('loaded');
            });
        });
    }

    setupResourcePreloading() {
        // Preload critical resources
        const criticalResources = [
            '/assets/css/style.css',
            '/assets/js/main.js'
        ];
        
        criticalResources.forEach(resource => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.href = resource;
            link.as = resource.endsWith('.css') ? 'style' : 'script';
            document.head.appendChild(link);
        });
    }
}

// Social Features
class BeaverSocial {
    constructor() {
        this.setupSocialSharing();
        this.setupBookmarks();
        this.setupQRCode();
    }

    setupSocialSharing() {
        const shareContainer = document.createElement('div');
        shareContainer.className = 'social-share';
        shareContainer.innerHTML = `
            <button class="share-btn twitter" data-platform="twitter">Twitter</button>
            <button class="share-btn facebook" data-platform="facebook">Facebook</button>
            <button class="share-btn linkedin" data-platform="linkedin">LinkedIn</button>
            <button class="share-btn copy-link" data-platform="copy">リンクをコピー</button>
        `;
        
        const footer = document.querySelector('.footer .container');
        if (footer) {
            footer.appendChild(shareContainer);
        }
        
        shareContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('share-btn')) {
                this.shareContent(e.target.dataset.platform);
            }
        });
    }

    shareContent(platform) {
        const url = encodeURIComponent(window.location.href);
        const title = encodeURIComponent(document.title);
        
        const shareUrls = {
            twitter: `https://twitter.com/intent/tweet?url=${url}&text=${title}`,
            facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
            linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`
        };
        
        if (platform === 'copy') {
            navigator.clipboard.writeText(window.location.href).then(() => {
                this.showNotification('リンクがコピーされました');
            });
        } else {
            window.open(shareUrls[platform], '_blank', 'width=600,height=400');
        }
    }

    setupBookmarks() {
        const bookmarkBtn = document.createElement('button');
        bookmarkBtn.className = 'bookmark-btn';
        bookmarkBtn.innerHTML = '📌 ブックマーク';
        bookmarkBtn.addEventListener('click', () => {
            this.toggleBookmark();
        });
        
        const header = document.querySelector('.header .container');
        if (header) {
            header.appendChild(bookmarkBtn);
        }
    }

    toggleBookmark() {
        const bookmarks = JSON.parse(localStorage.getItem('beaver-bookmarks') || '[]');
        const currentPage = {
            url: window.location.href,
            title: document.title,
            timestamp: Date.now()
        };
        
        const existingIndex = bookmarks.findIndex(b => b.url === currentPage.url);
        
        if (existingIndex >= 0) {
            bookmarks.splice(existingIndex, 1);
            this.showNotification('ブックマークを削除しました');
        } else {
            bookmarks.push(currentPage);
            this.showNotification('ブックマークに追加しました');
        }
        
        localStorage.setItem('beaver-bookmarks', JSON.stringify(bookmarks));
    }

    setupQRCode() {
        const qrBtn = document.createElement('button');
        qrBtn.className = 'qr-btn';
        qrBtn.innerHTML = '📱 QRコード';
        qrBtn.addEventListener('click', () => {
            this.showQRCode();
        });
        
        const shareContainer = document.querySelector('.social-share');
        if (shareContainer) {
            shareContainer.appendChild(qrBtn);
        }
    }

    showQRCode() {
        const qrContainer = document.createElement('div');
        qrContainer.className = 'qr-modal';
        qrContainer.innerHTML = `
            <div class="qr-content">
                <h3>QRコード</h3>
                <div class="qr-code">
                    <canvas id="qr-canvas"></canvas>
                </div>
                <p>スマートフォンでスキャンしてください</p>
                <button class="close-qr">閉じる</button>
            </div>
        `;
        
        document.body.appendChild(qrContainer);
        
        // Generate QR code (simple implementation)
        this.generateQRCode(window.location.href, 'qr-canvas');
        
        qrContainer.querySelector('.close-qr').addEventListener('click', () => {
            document.body.removeChild(qrContainer);
        });
    }

    generateQRCode(text, canvasId) {
        // Simple QR code generation (you might want to use a library like qrcode.js)
        const canvas = document.getElementById(canvasId);
        const ctx = canvas.getContext('2d');
        
        canvas.width = 200;
        canvas.height = 200;
        
        // Simple placeholder - in production, use a proper QR code library
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, 200, 200);
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.fillText('QR Code', 80, 100);
        ctx.fillText('Placeholder', 70, 120);
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
}

// Initialize everything
document.addEventListener('DOMContentLoaded', () => {
    window.beaverUI = new BeaverUI();
    window.beaverSocial = new BeaverSocial();
});

// Service Worker registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}