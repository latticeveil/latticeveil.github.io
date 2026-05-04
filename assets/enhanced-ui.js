// Enhanced Dropdown System and Data Management
class EnhancedUIManager {
    constructor() {
        this.init();
    }

    init() {
        this.setupDropdowns();
        this.setupDataManagement();
        this.setupDonateModal();
        this.setupMobileOptimizations();
        this.setupContinueReading();
        this.setupNovelReleaseBadges();
        this.setupMobileMenu();
        this.setupJumpToTop();
    }

    getHighestSeenReaderChapter() {
        const savedChapter = parseInt(localStorage.getItem('reader_chapter') || '0', 10) || 0;
        const highestSeen = parseInt(localStorage.getItem('reader_highest_chapter_seen') || '0', 10) || 0;
        return Math.max(savedChapter, highestSeen);
    }

    getLatestReaderChapter() {
        return Array.from(document.querySelectorAll('#bookModal .chapter-item[href*="echoes.html?chapter="]'))
            .map(link => {
                const match = (link.getAttribute('href') || '').match(/chapter=(\d+)/);
                return match ? parseInt(match[1], 10) : 0;
            })
            .reduce((max, chapter) => Math.max(max, chapter), 0);
    }

    setNovelBadgeValue(badge, value) {
        if (!badge) return;
        if (value) {
            badge.textContent = value;
            badge.classList.add('active');
            badge.setAttribute('aria-hidden', 'false');
        } else {
            badge.textContent = '';
            badge.classList.remove('active');
            badge.setAttribute('aria-hidden', 'true');
        }
    }

    setupNovelReleaseBadges() {
        const latestChapter = this.getLatestReaderChapter();
        if (!latestChapter) return;

        const highestSeen = this.getHighestSeenReaderChapter();
        const unreadCount = highestSeen > 0 ? Math.max(0, latestChapter - highestSeen) : 0;
        const buttonBadgeText = unreadCount > 9 ? '9+' : String(unreadCount || '');

        document.querySelectorAll('[data-novel-new-count]').forEach(badge => {
            this.setNovelBadgeValue(badge, buttonBadgeText);
        });

        document.querySelectorAll('#bookModal .chapter-item[href*="echoes.html?chapter="]').forEach(link => {
            const match = (link.getAttribute('href') || '').match(/chapter=(\d+)/);
            const chapterNum = match ? parseInt(match[1], 10) : 0;
            const isNew = highestSeen > 0 && chapterNum > highestSeen;
            let badge = link.querySelector('.novel-release-badge');

            if (!badge && isNew) {
                badge = document.createElement('span');
                badge.className = 'novel-release-badge';
                badge.setAttribute('aria-label', 'New unread frame');
                link.appendChild(badge);
            }

            link.classList.toggle('has-new-frame', isNew);
            this.setNovelBadgeValue(badge, isNew ? 'NEW' : '');
        });
    }

    setupContinueReading() {
        // Make continueReading function globally available
        window.continueReading = function() {
            const lastChapter = localStorage.getItem('reader_chapter') || '1';
            const lastScroll = localStorage.getItem(`reader_scroll_ch${lastChapter}`) || '0';

            localStorage.setItem('reader_return_context', JSON.stringify({
                chapter: parseInt(lastChapter, 10),
                scroll: parseInt(lastScroll, 10) || 0,
                timestamp: Date.now()
            }));

            window.location.href = `./echoes.html?chapter=${lastChapter}`;
        };

        window.openReaderChapter = function(chapterNum) {
            const normalizedChapter = Math.max(1, parseInt(chapterNum, 10) || 1);
            const savedScroll = parseInt(localStorage.getItem(`reader_scroll_ch${normalizedChapter}`) || '0', 10) || 0;
            const highestSeen = parseInt(localStorage.getItem('reader_highest_chapter_seen') || '0', 10) || 0;

            localStorage.setItem('reader_chapter', String(normalizedChapter));
            localStorage.setItem('reader_highest_chapter_seen', String(Math.max(highestSeen, normalizedChapter)));
            localStorage.setItem('reader_return_context', JSON.stringify({
                chapter: normalizedChapter,
                scroll: savedScroll,
                timestamp: Date.now()
            }));

            window.location.href = `./echoes.html?chapter=${normalizedChapter}`;
        };
        
        // Make toggleBookDropdown function globally available
        window.toggleBookDropdown = function() {
            const dropdown = document.getElementById('bookDropdown');
            const trigger = document.getElementById('bookIcon');
            
            if (dropdown && trigger) {
                const isOpen = dropdown.style.display === 'block';
                if (isOpen) {
                    dropdown.style.display = 'none';
                    trigger.classList.remove('active');
                } else {
                    dropdown.style.display = 'block';
                    trigger.classList.add('active');
                }
            }
        };
        
        // Make modal functions globally available
        window.showBookModal = function() {
            if (window.enhancedUI && typeof window.enhancedUI.setupNovelReleaseBadges === 'function') {
                window.enhancedUI.setupNovelReleaseBadges();
            }
            const modal = document.getElementById('bookModal');
            if (modal) {
                modal.classList.add('active');
                // Prevent body scroll
                document.body.style.overflow = 'hidden';
            }
        };
        
        window.hideBookModal = function() {
            const modal = document.getElementById('bookModal');
            if (modal) {
                modal.classList.remove('active');
                // Restore body scroll
                document.body.style.overflow = '';
            }
        };
        
        // Close modal on background click
        document.addEventListener('click', function(e) {
            const modal = document.getElementById('bookModal');
            if (modal && modal.classList.contains('active') && e.target === modal) {
                hideBookModal();
            }
        });
        
        // Close modal on escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                hideBookModal();
            }
        });

        document.querySelectorAll('#bookModal .chapter-item[href*="echoes.html?chapter="]').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();

                const href = this.getAttribute('href') || '';
                const match = href.match(/chapter=(\d+)/);
                const chapterNum = match ? parseInt(match[1], 10) : 1;

                window.openReaderChapter(chapterNum);
            });
        });
    }

    setupDropdowns() {
        // Setup all dropdowns
        const dropdowns = [
            { trigger: 'bookIcon', dropdown: 'bookDropdown' },
            { trigger: 'clearDataIcon', dropdown: 'clearDataDropdown' },
            { trigger: 'profileIcon', dropdown: 'profileDropdown' }
        ];

        dropdowns.forEach(({ trigger, dropdown }) => {
            const triggerBtn = document.getElementById(trigger);
            const dropdownEl = document.getElementById(dropdown);

            if (triggerBtn && dropdownEl) {
                // Add dropdown-trigger class for styling
                triggerBtn.classList.add('dropdown-trigger');
                
                // Click to toggle
                triggerBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleDropdown(dropdownEl, triggerBtn);
                });

                // Close when clicking outside
                document.addEventListener('click', (e) => {
                    if (!triggerBtn.contains(e.target) && !dropdownEl.contains(e.target)) {
                        this.closeDropdown(dropdownEl, triggerBtn);
                    }
                });

                // Close on escape key
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape') {
                        this.closeDropdown(dropdownEl, triggerBtn);
                    }
                });
            }
        });
    }

    toggleDropdown(dropdown, trigger) {
        const isOpen = dropdown.style.display === 'block';
        
        // Close all other dropdowns first
        document.querySelectorAll('.dropdown-panel').forEach(panel => {
            panel.style.display = 'none';
        });
        document.querySelectorAll('.dropdown-trigger').forEach(btn => {
            btn.classList.remove('active');
        });

        if (!isOpen) {
            dropdown.style.display = 'block';
            trigger.classList.add('active');
            
            // Position dropdown
            this.positionDropdown(dropdown, trigger);
        }
    }

    closeDropdown(dropdown, trigger) {
        dropdown.style.display = 'none';
        trigger.classList.remove('active');
    }

    positionDropdown(dropdown, trigger) {
        const triggerRect = trigger.getBoundingClientRect();
        const dropdownRect = dropdown.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Horizontal positioning
        let left = triggerRect.left;
        if (left + dropdownRect.width > viewportWidth) {
            left = viewportWidth - dropdownRect.width - 10;
        }
        if (left < 10) {
            left = 10;
        }

        // Vertical positioning
        let top = triggerRect.bottom + 5;
        if (top + dropdownRect.height > viewportHeight) {
            top = triggerRect.top - dropdownRect.height - 5;
        }

        dropdown.style.position = 'fixed';
        dropdown.style.left = `${left}px`;
        dropdown.style.top = `${top}px`;
        dropdown.style.zIndex = '1000';
    }

    setupDataManagement() {
        // Make functions globally available
        window.clearBookData = this.clearBookData.bind(this);
        window.showBookDataClearConfirm = this.showBookDataClearConfirm.bind(this);
        window.hideBookDataClearConfirm = this.hideBookDataClearConfirm.bind(this);
        window.clearSiteData = this.clearSiteData.bind(this);
        window.fullResetSite = this.fullResetSite.bind(this);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideBookDataClearConfirm();
            }
        });
    }

    getBookDataKeys() {
        const bookKeyPatterns = [
            /^reader_/i,
            /^echoes_/i,
            /^book_/i,
            /^chapter(?:_|$|\d)/i,
            /^page(?:_|$|\d)/i
        ];

        return Object.keys(localStorage).filter((key) =>
            bookKeyPatterns.some((pattern) => pattern.test(key))
        );
    }

    showBookDataClearConfirm() {
        const modal = document.getElementById('bookDataConfirmModal');
        if (!modal) return;

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    hideBookDataClearConfirm() {
        const modal = document.getElementById('bookDataConfirmModal');
        if (!modal) return;

        modal.classList.remove('active');

        if (!document.querySelector('.book-modal-overlay.active')) {
            document.body.style.overflow = '';
        }
    }

    clearBookData() {
        const bookKeys = this.getBookDataKeys();

        bookKeys.forEach(key => localStorage.removeItem(key));

        this.hideBookDataClearConfirm();
        this.hideBookModalIfOpen();
        this.setupNovelReleaseBadges();
        this.showNotification('Novel reader data cleared for all frames', 'success');
        this.closeAllDropdowns();
    }

    hideBookModalIfOpen() {
        const modal = document.getElementById('bookModal');
        if (modal) {
            modal.classList.remove('active');
        }

        if (!document.querySelector('.book-modal-overlay.active')) {
            document.body.style.overflow = '';
        }
    }

    clearSiteData() {
        // Clear all data EXCEPT TOS acceptance
        const tosKeys = ['latticeveil_tos_accepted', 'latticeveil_download_tos_accepted'];
        const preservedData = {};

        // Preserve TOS acceptance
        tosKeys.forEach(key => {
            const value = localStorage.getItem(key);
            if (value !== null) {
                preservedData[key] = value;
            }
        });

        // Clear everything
        localStorage.clear();

        // Restore TOS acceptance
        Object.entries(preservedData).forEach(([key, value]) => {
            localStorage.setItem(key, value);
        });

        this.showNotification('Site data cleared (TOS acceptance preserved)', 'success');
        this.closeAllDropdowns();

        // Optionally reload page after a short delay
        setTimeout(() => {
            if (confirm('Would you like to reload the page to apply all changes?')) {
                window.location.reload();
            }
        }, 1000);
    }

    fullResetSite() {
        // Complete reset including TOS (for emergency use)
        if (confirm('⚠️ This will reset ALL site data including TOS acceptance. Are you sure?')) {
            localStorage.clear();
            this.showNotification('All site data reset - page will reload', 'warning');
            setTimeout(() => window.location.reload(), 1500);
        }
    }

    setupDonateModal() {
        // Make showDonateModal function globally available
        window.showDonateModal = function() {
            const modal = document.getElementById('donateModal');
            if (modal) {
                modal.classList.add('active');
                // Prevent body scroll
                document.body.style.overflow = 'hidden';
            } else {
                // Create modal if it doesn't exist
                const donateModal = this.createDonateModal();
                document.body.appendChild(donateModal);
                donateModal.style.display = 'flex';
                document.body.style.overflow = 'hidden';
            }
        }.bind(this);
        
        window.hideDonateModal = function() {
            const modal = document.getElementById('donateModal');
            if (modal) {
                modal.classList.remove('active');
                modal.style.display = 'none';
                // Restore body scroll
                document.body.style.overflow = '';
            }
        };
    }

    showDonateModal() {
        // Create modal if it doesn't exist
        let modal = document.getElementById('donateModal');
        
        if (!modal) {
            modal = this.createDonateModal();
            document.body.appendChild(modal);
        }

        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    createDonateModal() {
        const modal = document.createElement('div');
        modal.id = 'donateModal';
        modal.className = 'donate-modal';
        modal.innerHTML = `
            <div class="donate-content">
                <div class="donate-header">
                    <h2>Support Development</h2>
                    <button class="close-btn" onclick="this.closest('.donate-modal').style.display='none'; document.body.style.overflow='auto'">&times;</button>
                </div>
                <div class="donate-body">
                    <p>Your support helps keep LatticeVeil free and actively developed!</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <button onclick="window.open('https://www.paypal.com/donate/?hosted_button_id=FAAV5R3P8YEZJ', '_blank', 'width=600,height=600,scrollbars=yes,resizable=yes')" class="donate-direct-btn">
                            <i class="fab fa-paypal"></i> DONATE WITH PAYPAL
                        </button>
                    </div>
                    <p style="font-size: 0.9rem; color: #ccc; text-align: center;">
                        You'll be redirected to PayPal's secure site to complete your donation.
                    </p>
                </div>
            </div>
        `;

        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        });

        return modal;
    }

    setupMobileOptimizations() {
        // Add mobile-specific enhancements
        if (window.innerWidth <= 768) {
            this.enhanceMobileTouchTargets();
        }

        // Handle resize
        window.addEventListener('resize', () => {
            this.closeAllDropdowns();
            if (window.innerWidth <= 768) {
                this.enhanceMobileTouchTargets();
            }
        });
    }

    enhanceMobileTouchTargets() {
        // Ensure minimum touch targets on mobile
        const buttons = document.querySelectorAll('button, .dropdown-item');
        buttons.forEach(btn => {
            const rect = btn.getBoundingClientRect();
            if (rect.width < 44 || rect.height < 44) {
                btn.style.minWidth = '44px';
                btn.style.minHeight = '44px';
                btn.style.display = 'flex';
                btn.style.alignItems = 'center';
                btn.style.justifyContent = 'center';
            }
        });
    }

    showNotification(message, type = 'info') {
        // Create notification if it doesn't exist
        let notification = document.getElementById('notification');
        
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'notification';
            notification.className = 'notification';
            document.body.appendChild(notification);
        }

        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.style.display = 'block';

        // Auto-hide after 3 seconds
        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    }

    closeAllDropdowns() {
        document.querySelectorAll('.dropdown-panel').forEach(panel => {
            panel.style.display = 'none';
        });
        document.querySelectorAll('.dropdown-trigger').forEach(btn => {
            btn.classList.remove('active');
        });
    }

    setupMobileMenu() {
        // Make toggleMobileMenu function globally available
        window.toggleMobileMenu = function() {
            const dropdown = document.getElementById('mobileMenu');
            if (dropdown) {
                dropdown.classList.toggle('active');
            }
        };

        // Close mobile menu when clicking outside
        document.addEventListener('click', function(event) {
            const mobileMenu = document.getElementById('mobileMenu');
            const hamburger = document.querySelector('.mobile-hamburger');
            
            if (mobileMenu && hamburger && 
                !mobileMenu.contains(event.target) && 
                !hamburger.contains(event.target)) {
                mobileMenu.classList.remove('active');
            }
        });

        // Close mobile menu when window is resized to desktop
        window.addEventListener('resize', function() {
            const mobileMenu = document.getElementById('mobileMenu');
            if (window.innerWidth > 768 && mobileMenu) {
                mobileMenu.classList.remove('active');
            }
        });
        
        // Close mobile menu when menu items are clicked
        document.addEventListener('click', function(event) {
            const mobileMenu = document.getElementById('mobileMenu');
            if (mobileMenu && mobileMenu.classList.contains('active')) {
                const menuItem = event.target.closest('.mobile-menu-item');
                if (menuItem) {
                    mobileMenu.classList.remove('active');
                }
            }
        });
    }

    setupJumpToTop() {
        // Create jump-to-top button
        const jumpToTopBtn = document.createElement('a');
        jumpToTopBtn.href = '#top';
        jumpToTopBtn.className = 'jump-to-top';
        jumpToTopBtn.textContent = 'JUMP TO TOP';
        jumpToTopBtn.setAttribute('aria-label', 'Jump to top of page');
        
        // Add to page
        document.body.appendChild(jumpToTopBtn);
        
        // Show/hide button based on scroll position
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                if (window.scrollY > 300) {
                    jumpToTopBtn.classList.add('visible');
                } else {
                    jumpToTopBtn.classList.remove('visible');
                }
            }, 16); // Debounce for performance
        });
        
        // Smooth scroll behavior
        jumpToTopBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
        
        // Initial check
        if (window.scrollY > 300) {
            jumpToTopBtn.classList.add('visible');
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.enhancedUI = new EnhancedUIManager();
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedUIManager;
}
