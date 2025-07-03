/*
 * Beaver Knowledge Base - Complete Independent JavaScript
 * 完全に独立したJavaScriptファイル - Goから生成ではなく固定ファイル
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('🦫 Beaver Knowledge Base - Main JavaScript Loaded');

    // ===== TABLE OF CONTENTS FUNCTIONALITY =====
    initializeTableOfContents();
    
    // ===== BACK TO TOP BUTTON =====
    initializeBackToTop();
    
    // ===== SMOOTH SCROLLING =====
    initializeSmoothScrolling();
    
    // ===== EXTERNAL LINKS =====
    initializeExternalLinks();
    
    // ===== CODE BLOCKS =====
    initializeCodeBlocks();
    
    // ===== TIMESTAMPS =====
    initializeTimestamps();
    
    
    console.log('🦫 Beaver Knowledge Base fully initialized');
});

/**
 * Table of Contents Functionality
 */
function initializeTableOfContents() {
    const tocContainer = document.querySelector('.table-of-contents');
    const tocToggle = document.querySelector('.toc-toggle');
    const tocList = document.querySelector('.toc-list');
    const tocLinks = document.querySelectorAll('.toc-link');
    
    if (!tocContainer || !tocToggle || !tocList) {
        console.log('TOC elements not found, skipping TOC initialization');
        return;
    }

    // TOC Toggle Functionality
    let tocExpanded = localStorage.getItem('beaver-toc-expanded') !== 'false';
    updateTOCState(tocToggle, tocList, tocExpanded);

    tocToggle.addEventListener('click', function() {
        tocExpanded = !tocExpanded;
        updateTOCState(tocToggle, tocList, tocExpanded);
        localStorage.setItem('beaver-toc-expanded', tocExpanded.toString());
    });

    // Intersection Observer for Active Section Highlighting
    if (tocLinks.length > 0) {
        const headings = Array.from(tocLinks).map(link => {
            const href = link.getAttribute('href');
            if (href && href.startsWith('#')) {
                return document.getElementById(href.substring(1));
            }
            return null;
        }).filter(heading => heading !== null);

        if (headings.length > 0) {
            const observerOptions = {
                root: null,
                rootMargin: '-10% 0px -80% 0px',
                threshold: 0
            };

            const observer = new IntersectionObserver(function(entries) {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        // Remove active class from all links
                        tocLinks.forEach(link => link.classList.remove('active'));
                        
                        // Add active class to current section link
                        const activeLink = document.querySelector(`.toc-link[href="#${entry.target.id}"]`);
                        if (activeLink) {
                            activeLink.classList.add('active');
                        }
                    }
                });
            }, observerOptions);

            headings.forEach(heading => {
                if (heading) observer.observe(heading);
            });
        }
    }
}

/**
 * Update TOC toggle state
 */
function updateTOCState(toggle, list, expanded) {
    toggle.setAttribute('aria-expanded', expanded.toString());
    if (expanded) {
        list.style.display = 'block';
        list.style.maxHeight = list.scrollHeight + 'px';
    } else {
        list.style.display = 'none';
        list.style.maxHeight = '0';
    }
}

/**
 * Back to Top Button Functionality
 */
function initializeBackToTop() {
    const backToTopButton = document.querySelector('.back-to-top');
    
    if (!backToTopButton) {
        console.log('Back to top button not found, skipping initialization');
        return;
    }

    // Show/hide back to top button based on scroll position
    function updateBackToTopVisibility() {
        if (window.pageYOffset > 300) {
            backToTopButton.classList.add('visible');
        } else {
            backToTopButton.classList.remove('visible');
        }
    }

    // Initial check
    updateBackToTopVisibility();

    // Listen to scroll events
    let scrollTimeout;
    window.addEventListener('scroll', function() {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(updateBackToTopVisibility, 10);
    });

    // Back to top click handler
    backToTopButton.addEventListener('click', function() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

/**
 * Smooth Scrolling for Anchor Links
 */
function initializeSmoothScrolling() {
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    
    anchorLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                const headerOffset = 80; // Offset for fixed headers
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

/**
 * External Links Enhancement
 */
function initializeExternalLinks() {
    const externalLinks = document.querySelectorAll('a[href^="http"]');
    
    externalLinks.forEach(link => {
        // Add external link indicator
        if (!link.textContent.includes('↗')) {
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener noreferrer');
            
            // Add visual indicator
            const indicator = document.createElement('span');
            indicator.innerHTML = ' ↗';
            indicator.style.fontSize = '0.8em';
            indicator.style.opacity = '0.7';
            link.appendChild(indicator);
        }

        // Add loading state on click
        link.addEventListener('click', function() {
            this.style.opacity = '0.7';
            setTimeout(() => {
                this.style.opacity = '1';
            }, 1500);
        });
    });
}

/**
 * Code Blocks Enhancement
 */
function initializeCodeBlocks() {
    const codeBlocks = document.querySelectorAll('pre code');
    
    codeBlocks.forEach(block => {
        const pre = block.parentElement;
        
        // Make sure the pre element has relative positioning
        pre.style.position = 'relative';
        
        // Create copy button
        const copyButton = document.createElement('button');
        copyButton.textContent = 'Copy';
        copyButton.className = 'code-copy-button';
        copyButton.style.cssText = `
            position: absolute;
            top: 8px;
            right: 8px;
            padding: 4px 8px;
            font-size: 12px;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            opacity: 0.8;
            transition: all 0.2s ease;
            z-index: 10;
        `;

        // Copy button hover effect
        copyButton.addEventListener('mouseenter', function() {
            this.style.opacity = '1';
            this.style.background = '#5a6fd8';
        });

        copyButton.addEventListener('mouseleave', function() {
            this.style.opacity = '0.8';
            this.style.background = '#667eea';
        });

        // Copy functionality
        copyButton.addEventListener('click', async function() {
            try {
                await navigator.clipboard.writeText(block.textContent);
                
                const originalText = this.textContent;
                this.textContent = 'Copied!';
                this.style.background = '#28a745';
                
                setTimeout(() => {
                    this.textContent = originalText;
                    this.style.background = '#667eea';
                }, 2000);
            } catch (err) {
                console.error('Failed to copy text: ', err);
                this.textContent = 'Failed';
                this.style.background = '#dc3545';
                
                setTimeout(() => {
                    this.textContent = 'Copy';
                    this.style.background = '#667eea';
                }, 2000);
            }
        });

        pre.appendChild(copyButton);
    });
}

/**
 * Timestamp Formatting
 */
function initializeTimestamps() {
    const timestampElements = document.querySelectorAll('[data-timestamp]');
    
    timestampElements.forEach(element => {
        const timestamp = element.getAttribute('data-timestamp');
        if (timestamp) {
            try {
                const date = new Date(timestamp);
                if (!isNaN(date.getTime())) {
                    element.textContent = date.toLocaleString('ja-JP', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                }
            } catch (err) {
                console.warn('Invalid timestamp format:', timestamp);
            }
        }
    });
}


/**
 * Utility Functions
 */

// Debounce function for performance optimization
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func.apply(this, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle function for scroll events
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

// Check if element is in viewport
function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

// Add keyboard navigation support
document.addEventListener('keydown', function(e) {
    // 'T' key to toggle TOC
    if (e.key === 't' || e.key === 'T') {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
            const activeElement = document.activeElement;
            if (activeElement.tagName !== 'INPUT' && activeElement.tagName !== 'TEXTAREA') {
                const tocToggle = document.querySelector('.toc-toggle');
                if (tocToggle) {
                    tocToggle.click();
                    e.preventDefault();
                }
            }
        }
    }
    
    // 'B' key for back to top
    if (e.key === 'b' || e.key === 'B') {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
            const activeElement = document.activeElement;
            if (activeElement.tagName !== 'INPUT' && activeElement.tagName !== 'TEXTAREA') {
                const backToTop = document.querySelector('.back-to-top');
                if (backToTop && backToTop.classList.contains('visible')) {
                    backToTop.click();
                    e.preventDefault();
                }
            }
        }
    }
});