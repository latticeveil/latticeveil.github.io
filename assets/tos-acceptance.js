// TOS Acceptance System
class TOSAcceptance {
    constructor() {
        this.accepted = localStorage.getItem('latticeveil_tos_accepted') === 'true';
        this.downloadAccepted = localStorage.getItem('latticeveil_download_tos_accepted') === 'true';
        this.init();
    }

    init() {
        // Check if TOS acceptance is needed
        if (!this.accepted) {
            this.showSiteTOS();
        }
        
        // Setup download TOS for download buttons
        this.setupDownloadTOS();
        
        // Setup Google OAuth TOS
        this.setupGoogleAuthTOS();
    }

    showSiteTOS() {
        const modal = this.createTOSModal('site');
        document.body.appendChild(modal);
    }

    showDownloadTOS() {
        const modal = this.createTOSModal('download');
        document.body.appendChild(modal);
    }

    createTOSModal(type) {
        const modal = document.createElement('div');
        modal.className = `tos-modal ${type === 'download' ? 'download-tos' : ''}`;
        modal.innerHTML = `
            <div class="tos-content">
                <div class="tos-header">
                    <h2>${type === 'download' ? 'DOWNLOAD' : 'SITE'} TERMS OF SERVICE</h2>
                </div>
                <div class="tos-body">
                    <h3>📋 IMPORTANT - PLEASE READ CAREFULLY</h3>
                    <p>By using LatticeVeil, you agree to the following terms. Please scroll through and read all sections before accepting.</p>
                    
                    <h3>1. ACCEPTANCE OF TERMS</h3>
                    <p>By accessing, downloading, or using LatticeVeil, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.</p>
                    
                    <h3>2. LICENSE GRANT</h3>
                    <p>LatticeVeil grants you a limited, non-exclusive, non-transferable, revocable license to use the Game for personal, non-commercial purposes.</p>
                    
                    <h3>3. RESTRICTIONS</h3>
                    <ul>
                        <li>You may not reverse engineer, decompile, or attempt to extract source code</li>
                        <li>You may not use the Game for commercial purposes without permission</li>
                        <li>You may not cheat, hack, exploit, or use automated tools</li>
                        <li>You may not distribute, sell, or license modified versions</li>
                    </ul>
                    
                    <h3>4. PRIVACY & DATA</h3>
                    <p>LatticeVeil is designed to collect minimal personal information:</p>
                    <ul>
                        <li><strong>No location tracking</strong></li>
                        <li><strong>No usage analytics</strong></li>
                        <li><strong>No marketing data</strong></li>
                        <li>Only essential account data if you choose to create one</li>
                    </ul>
                    
                    <h3>5. ONLINE SERVICES</h3>
                    <p>Online features use Epic Online Services (EOS). Your use is subject to Epic Games' terms and policies.</p>
                    
                    <h3>6. INDEPENDENCE CLARIFICATION</h3>
                    <p>LatticeVeil is an independent project and is not affiliated with Minecraft, Trove, or other voxel games despite visual similarities.</p>
                    
                    <h3>7. SUPPORTER CONTRIBUTIONS</h3>
                    <p>PayPal donations are voluntary and non-refundable except for accidental payments (30-60 minute window).</p>
                    
                    <h3>8. FUTURE ADVERTISEMENTS</h3>
                    <p>Optional ads may be integrated to support free development, with family-friendly content and user control.</p>
                    
                    <h3>9. STARTER PACK FEATURES</h3>
                    <p>Optional starter items may be available for new players, balanced to maintain fair gameplay.</p>
                    
                    <h3>10. LAUNCHER UPDATES</h3>
                    <p>Automatic launcher updates will replace current version and assets without breaking saves.</p>
                    
                    <h3>11. DISCLAIMER</h3>
                    <p>The Game is provided "AS-IS" without warranties. We are not liable for damages arising from your use.</p>
                    
                    <h3>12. AGE REQUIREMENTS</h3>
                    <p>You must be at least 13 years old to use LatticeVeil. Users under 18 require parental consent.</p>
                    
                    <h3>📄 FULL POLICIES</h3>
                    <p>For complete details, please read our full policies:</p>
                    <ul>
                        <li><a href="terms.html" target="_blank">Terms of Service</a></li>
                        <li><a href="privacy.html" target="_blank">Privacy Policy</a></li>
                    </ul>
                </div>
                <div class="tos-footer">
                    <div class="tos-scroll-indicator">Please scroll through all terms before accepting</div>
                    <div class="tos-checkbox">
                        <input type="checkbox" id="tos-checkbox-${type}">
                        <label for="tos-checkbox-${type}">I have read and agree to the Terms of Service and Privacy Policy</label>
                    </div>
                    <div class="tos-buttons">
                        <button class="tos-btn" id="view-full-terms-${type}" onclick="window.open('terms.html', '_blank')">
                            View Full Terms
                        </button>
                        <button class="tos-btn accept" id="accept-tos-${type}" disabled>
                            Accept & Continue
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Setup scroll tracking with mobile support
        const body = modal.querySelector('.tos-body');
        const checkbox = modal.querySelector(`#tos-checkbox-${type}`);
        const acceptBtn = modal.querySelector(`#accept-tos-${type}`);
        
        let hasScrolled = false;
        
        // Enhanced scroll detection for mobile
        function checkScrollComplete() {
            const scrollThreshold = body.scrollHeight - body.clientHeight - 50;
            if (body.scrollTop >= scrollThreshold) {
                hasScrolled = true;
                modal.querySelector('.tos-scroll-indicator').style.display = 'none';
                updateAcceptButton();
            }
        }
        
        // Multiple scroll event listeners for better mobile support
        body.addEventListener('scroll', checkScrollComplete);
        body.addEventListener('touchmove', checkScrollComplete);
        body.addEventListener('touchend', checkScrollComplete);

        // Enable accept button when checkbox is checked (scroll requirement removed for better UX)
        function updateAcceptButton() {
            acceptBtn.disabled = !checkbox.checked;
            if (!acceptBtn.disabled) {
                acceptBtn.style.opacity = '1';
                acceptBtn.style.transform = 'scale(1.05)';
                // Hide scroll indicator when checkbox is checked
                modal.querySelector('.tos-scroll-indicator').style.display = 'none';
            } else {
                acceptBtn.style.opacity = '0.5';
                acceptBtn.style.transform = 'scale(1)';
            }
        }

        // Enhanced checkbox event listeners for mobile
        checkbox.addEventListener('change', updateAcceptButton);
        checkbox.addEventListener('click', updateAcceptButton);
        
        // Mobile touch handling with better event management
        checkbox.addEventListener('touchstart', (e) => {
            e.preventDefault();
            checkbox.checked = !checkbox.checked;
            updateAcceptButton();
        });
        
        checkbox.addEventListener('touchend', (e) => {
            e.preventDefault();
            updateAcceptButton();
        });

        // Also check checkbox state periodically (fallback for mobile)
        const checkboxInterval = setInterval(() => {
            updateAcceptButton();
        }, 100);

        // Clear interval when modal is removed
        const originalRemove = modal.remove;
        modal.remove = function() {
            clearInterval(checkboxInterval);
            originalRemove.call(modal);
        };

        // Accept button handler
        acceptBtn.addEventListener('click', () => {
            if (type === 'download') {
                this.downloadAccepted = true;
                localStorage.setItem('latticeveil_download_tos_accepted', 'true');
            } else {
                this.accepted = true;
                localStorage.setItem('latticeveil_tos_accepted', 'true');
            }
            
            modal.remove();
            
            if (type === 'download') {
                // Proceed with download
                this.proceedWithDownload();
            }
        });

        return modal;
    }

    setupDownloadTOS() {
        // Intercept main download button specifically
        const mainDownloadBtn = document.getElementById('main-download-btn');
        if (mainDownloadBtn) {
            const originalHref = mainDownloadBtn.href;
            
            mainDownloadBtn.addEventListener('click', (e) => {
                e.preventDefault();
                
                if (!this.downloadAccepted) {
                    this.pendingDownload = { 
                        button: mainDownloadBtn, 
                        originalHref: originalHref 
                    };
                    this.showDownloadTOS();
                } else {
                    window.open(originalHref, '_blank');
                }
            });
        }
        
        // Also handle any other download links as fallback
        const downloadLinks = document.querySelectorAll('a[href*="download"], a[href*="release"]');
        downloadLinks.forEach(link => {
            if (link.id !== 'main-download-btn') {
                const originalHref = link.href;
                
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    
                    if (!this.downloadAccepted) {
                        this.pendingDownload = { 
                            button: link, 
                            originalHref: originalHref 
                        };
                        this.showDownloadTOS();
                    } else {
                        window.open(originalHref, '_blank');
                    }
                });
            }
        });
    }

    setupGoogleAuthTOS() {
        // This would be called after Google OAuth success
        window.showGoogleAuthTOS = () => {
            if (!this.accepted) {
                this.showSiteTOS();
            }
        };
    }

    proceedWithDownload() {
        if (this.pendingDownload) {
            const { button, originalHref } = this.pendingDownload;
            
            if (originalHref) {
                window.open(originalHref, '_blank');
            }
            
            this.pendingDownload = null;
        }
    }

    // Method to reset TOS acceptance (for testing or policy updates)
    resetAcceptance() {
        this.accepted = false;
        this.downloadAccepted = false;
        localStorage.removeItem('latticeveil_tos_accepted');
        localStorage.removeItem('latticeveil_download_tos_accepted');
    }
}

// Initialize TOS system
document.addEventListener('DOMContentLoaded', () => {
    window.tosAcceptance = new TOSAcceptance();
});
