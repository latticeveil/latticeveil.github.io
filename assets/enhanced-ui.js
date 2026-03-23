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
        window.clearSiteData = this.clearSiteData.bind(this);
        window.fullResetSite = this.fullResetSite.bind(this);
    }

    clearBookData() {
        // Clear only book-related data
        const bookKeys = Object.keys(localStorage).filter(key => 
            key.includes('book') || 
            key.includes('echoes') || 
            key.includes('reader') ||
            key.includes('chapter') ||
            key.includes('page')
        );

        bookKeys.forEach(key => localStorage.removeItem(key));
        
        this.showNotification('Book data cleared successfully', 'success');
        this.closeAllDropdowns();
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
        const donateBtn = document.getElementById('donateIcon');
        
        if (donateBtn) {
            donateBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showDonateModal();
            });
        }
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
                    <div class="donate-form">
                        <form action="https://www.paypal.com/donate" method="post" target="_blank">
                            <input type="hidden" name="hosted_button_id" value="FAAV5R3P8YEZJ">
                            <input type="hidden" name="business" value="FAAV5R3P8YEZJ">
                            <input type="hidden" name="item_name" value="LatticeVeil Development">
                            <input type="hidden" name="currency_code" value="USD">
                            <input type="hidden" name="cmd" value="_donations">
                            <div class="donate-amounts">
                                <button type="submit" name="amount" value="5" class="donate-amount-btn">$5</button>
                                <button type="submit" name="amount" value="10" class="donate-amount-btn">$10</button>
                                <button type="submit" name="amount" value="25" class="donate-amount-btn">$25</button>
                                <button type="submit" name="amount" value="50" class="donate-amount-btn">$50</button>
                            </div>
                            <div class="donate-custom">
                                <input type="number" name="amount" min="1" placeholder="Custom amount" class="donate-custom-input">
                                <button type="submit" class="donate-custom-btn">Donate</button>
                            </div>
                        </form>
                    </div>
                    <div class="donate-alternatives">
                        <p>Or donate directly:</p>
                        <button onclick="window.open('https://www.paypal.com/donate/?hosted_button_id=FAAV5R3P8YEZJ', '_blank')" class="donate-direct-btn">
                            <i class="fas fa-external-link-alt"></i> Open PayPal
                        </button>
                    </div>
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
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.enhancedUI = new EnhancedUIManager();
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedUIManager;
}
