// Device Detection and Responsive Navigation System
class DeviceDetector {
    constructor() {
        this.deviceInfo = this.detectDevice();
        this.init();
    }

    detectDevice() {
        const ua = navigator.userAgent;
        const platform = navigator.platform || navigator.userAgentData?.platform || '';
        
        // Device type detection
        const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) || 
                        (navigator.maxTouchPoints > 0 && /Mac|Windows|Linux/i.test(platform));
        
        const isTablet = /iPad|Android(?!.*Mobile)/i.test(ua) || 
                         (isMobile && window.innerWidth >= 768);
        
        const isDesktop = !isMobile && !isTablet;
        
        // Browser detection
        const isChrome = /Chrome/i.test(ua) && !/Edge|Edg|Opera|OPR/i.test(ua);
        const isFirefox = /Firefox/i.test(ua);
        const isSafari = /Safari/i.test(ua) && !/Chrome|Chromium|Edge|Edg|Opera|OPR/i.test(ua);
        const isEdge = /Edge|Edg/i.test(ua);
        const isOpera = /Opera|OPR/i.test(ua);
        
        // OS detection
        const isWindows = /Windows|WinNT|Win32/i.test(platform) || /Windows/i.test(ua);
        const isMac = /Mac|Macintosh|MacIntel|MacPPC|Mac68K/i.test(platform) || /Mac/i.test(ua);
        const isLinux = /Linux|X11/i.test(platform) || /Linux/i.test(ua);
        const isIOS = /iPhone|iPad|iPod/i.test(ua);
        const isAndroid = /Android/i.test(ua);
        
        // VR detection
        const isVR = /Oculus|VR|XR/i.test(ua) || 
                    navigator.xr !== undefined ||
                    window.isSecureContext && navigator.getVRDisplays;
        
        // Screen info
        const screenInfo = {
            width: window.screen.width,
            height: window.screen.height,
            availWidth: window.screen.availWidth,
            availHeight: window.screen.availHeight,
            colorDepth: window.screen.colorDepth,
            pixelDepth: window.screen.pixelDepth,
            devicePixelRatio: window.devicePixelRatio || 1
        };
        
        // Viewport info
        const viewport = {
            width: window.innerWidth,
            height: window.innerHeight,
            scrollWidth: document.documentElement.scrollWidth,
            scrollHeight: document.documentElement.scrollHeight
        };
        
        // Connection info (if available)
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        const networkInfo = connection ? {
            effectiveType: connection.effectiveType,
            downlink: connection.downlink,
            rtt: connection.rtt,
            saveData: connection.saveData
        } : null;
        
        // Battery info (if available and permission granted)
        let batteryInfo = null;
        if (navigator.getBattery) {
            navigator.getBattery().then(battery => {
                batteryInfo = {
                    level: battery.level,
                    charging: battery.charging,
                    chargingTime: battery.chargingTime,
                    dischargingTime: battery.dischargingTime
                };
            });
        }
        
        // IP detection (using a free API, with privacy consideration)
        const ipPromise = this.detectIP();
        
        return {
            // Device classification
            type: isTablet ? 'tablet' : (isMobile ? 'mobile' : (isDesktop ? 'desktop' : 'unknown')),
            isMobile,
            isTablet,
            isDesktop,
            isVR,
            
            // Browser info
            browser: {
                name: isChrome ? 'Chrome' : (isFirefox ? 'Firefox' : (isSafari ? 'Safari' : (isEdge ? 'Edge' : (isOpera ? 'Opera' : 'Unknown')))),
                isChrome,
                isFirefox,
                isSafari,
                isEdge,
                isOpera,
                userAgent: ua,
                language: navigator.language,
                languages: navigator.languages,
                cookieEnabled: navigator.cookieEnabled,
                doNotTrack: navigator.doNotTrack,
                onLine: navigator.onLine
            },
            
            // OS info
            os: {
                name: isWindows ? 'Windows' : (isMac ? 'macOS' : (isLinux ? 'Linux' : (isIOS ? 'iOS' : (isAndroid ? 'Android' : 'Unknown')))),
                isWindows,
                isMac,
                isLinux,
                isIOS,
                isAndroid,
                platform: platform,
                architecture: navigator.userAgentData?.platform || 'Unknown'
            },
            
            // Screen and viewport
            screen: screenInfo,
            viewport,
            
            // Network and battery
            network: networkInfo,
            battery: batteryInfo,
            
            // Capabilities
            capabilities: {
                touch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
                webgl: this.detectWebGL(),
                webWorker: typeof Worker !== 'undefined',
                localStorage: typeof Storage !== 'undefined',
                sessionStorage: typeof sessionStorage !== 'undefined',
                geolocation: 'geolocation' in navigator,
                camera: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
                microphone: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
                notifications: 'Notification' in window,
                serviceWorker: 'serviceWorker' in navigator,
                pushManager: 'pushManager' in navigator.serviceWorker?.registration || false
            },
            
            // IP (async)
            ip: null,
            
            // Timestamp
            detected: new Date().toISOString()
        };
    }
    
    async detectIP() {
        try {
            // Use a privacy-respecting IP detection service
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            console.warn('IP detection failed:', error);
            return null;
        }
    }
    
    detectWebGL() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            return !!gl;
        } catch (e) {
            return false;
        }
    }
    
    init() {
        // Get IP address
        this.detectIP().then(ip => {
            this.deviceInfo.ip = ip;
            this.updateDeviceInfoDisplay();
        });
        
        // Initial display update
        this.updateDeviceInfoDisplay();
        
        // Setup responsive navigation
        this.setupResponsiveNavigation();
        
        // Handle resize events
        window.addEventListener('resize', () => {
            this.deviceInfo.viewport = {
                width: window.innerWidth,
                height: window.innerHeight,
                scrollWidth: document.documentElement.scrollWidth,
                scrollHeight: document.documentElement.scrollHeight
            };
            this.setupResponsiveNavigation();
            this.updateDeviceInfoDisplay();
        });
        
        // Handle orientation changes
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.setupResponsiveNavigation();
                this.updateDeviceInfoDisplay();
            }, 100);
        });
    }
    
    setupResponsiveNavigation() {
        const profileIcon = document.getElementById('profileIcon');
        const profileDropdown = document.getElementById('profileDropdown');
        const tabsNav = document.querySelector('.tabs-nav');
        
        if (!profileIcon || !profileDropdown || !tabsNav) return;
        
        // Mobile-specific adjustments
        if (this.deviceInfo.isMobile || this.deviceInfo.isTablet) {
            // Ensure profile icon is visible on mobile
            profileIcon.style.display = 'flex';
            profileIcon.style.position = 'fixed';
            profileIcon.style.top = '20px';
            profileIcon.style.right = '20px';
            profileIcon.style.zIndex = '1000';
            
            // Adjust dropdown for mobile
            profileDropdown.style.position = 'fixed';
            profileDropdown.style.right = '20px';
            profileDropdown.style.top = '70px';
            profileDropdown.style.maxWidth = '280px';
            profileDropdown.style.maxHeight = '70vh';
            profileDropdown.style.overflowY = 'auto';
            
            // Adjust tabs for mobile
            if (window.innerWidth < 768) {
                tabsNav.style.display = 'flex';
                tabsNav.style.flexWrap = 'wrap';
                tabsNav.style.justifyContent = 'center';
                tabsNav.style.gap = '5px';
                tabsNav.style.padding = '10px';
                
                // Make tab buttons smaller on mobile
                const tabButtons = tabsNav.querySelectorAll('.tab-link');
                tabButtons.forEach(btn => {
                    btn.style.fontSize = '0.7rem';
                    btn.style.padding = '8px 12px';
                    btn.style.minWidth = '80px';
                    btn.style.whiteSpace = 'nowrap';
                });
            }
        } else {
            // Desktop adjustments
            profileIcon.style.position = 'fixed';
            profileIcon.style.top = '20px';
            profileIcon.style.right = '20px';
            
            profileDropdown.style.position = 'absolute';
            profileDropdown.style.right = '0';
            profileDropdown.style.top = '100%';
            profileDropdown.style.maxWidth = '300px';
            
            // Reset tabs for desktop
            tabsNav.style.display = '';
            tabsNav.style.flexWrap = '';
            tabsNav.style.justifyContent = '';
            tabsNav.style.gap = '';
            tabsNav.style.padding = '';
            
            const tabButtons = tabsNav.querySelectorAll('.tab-link');
            tabButtons.forEach(btn => {
                btn.style.fontSize = '';
                btn.style.padding = '';
                btn.style.minWidth = '';
                btn.style.whiteSpace = '';
            });
        }
    }
    
    updateDeviceInfoDisplay() {
        // Create or update device info display
        let infoDisplay = document.getElementById('device-info-display');
        
        if (!infoDisplay) {
            infoDisplay = document.createElement('div');
            infoDisplay.id = 'device-info-display';
            infoDisplay.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 20px;
                background: var(--panel);
                border: 1px solid var(--cyan);
                border-radius: 8px;
                padding: 10px;
                font-size: 0.8rem;
                max-width: 300px;
                max-height: 200px;
                overflow-y: auto;
                z-index: 1000;
                color: var(--text);
                font-family: 'VT323', monospace;
                display: none;
            `;
            document.body.appendChild(infoDisplay);
            
            // Add toggle button
            const toggleBtn = document.createElement('button');
            toggleBtn.innerHTML = '📱';
            toggleBtn.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 20px;
                width: 40px;
                height: 40px;
                background: var(--cyan);
                border: none;
                border-radius: 50%;
                color: var(--bg);
                cursor: pointer;
                z-index: 1001;
                font-size: 1rem;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            toggleBtn.onclick = () => {
                infoDisplay.style.display = infoDisplay.style.display === 'none' ? 'block' : 'none';
            };
            document.body.appendChild(toggleBtn);
        }
        
        // Update content
        const info = this.deviceInfo;
        infoDisplay.innerHTML = `
            <div style="border-bottom: 1px solid var(--cyan); margin-bottom: 8px; padding-bottom: 5px;">
                <strong>Device Info</strong>
            </div>
            <div><strong>Type:</strong> ${info.type}</div>
            <div><strong>Browser:</strong> ${info.browser.name}</div>
            <div><strong>OS:</strong> ${info.os.name}</div>
            <div><strong>Screen:</strong> ${info.screen.width}x${info.screen.height}</div>
            <div><strong>Viewport:</strong> ${info.viewport.width}x${info.viewport.height}</div>
            <div><strong>Touch:</strong> ${info.capabilities.touch ? 'Yes' : 'No'}</div>
            <div><strong>WebGL:</strong> ${info.capabilities.webgl ? 'Yes' : 'No'}</div>
            ${info.ip ? `<div><strong>IP:</strong> ${info.ip}</div>` : ''}
            ${info.network ? `<div><strong>Network:</strong> ${info.network.effectiveType}</div>` : ''}
            <div style="font-size: 0.7rem; opacity: 0.7; margin-top: 5px;">
                Detected: ${new Date(info.detected).toLocaleTimeString()}
            </div>
        `;
    }
    
    // Public method to get current device info
    getDeviceInfo() {
        return this.deviceInfo;
    }
    
    // Public method to check if mobile
    isMobile() {
        return this.deviceInfo.isMobile;
    }
    
    // Public method to check if desktop
    isDesktop() {
        return this.deviceInfo.isDesktop;
    }
    
    // Public method to check if tablet
    isTablet() {
        return this.deviceInfo.isTablet;
    }
    
    // Public method to check if VR
    isVR() {
        return this.deviceInfo.isVR;
    }
}

// Initialize device detector when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.deviceDetector = new DeviceDetector();
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DeviceDetector;
}
