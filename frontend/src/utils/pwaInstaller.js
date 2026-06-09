/**
 * PWA Installation Utilities
 * Handles PWA installation prompt and app updates
 */

let deferredPrompt = null;

// Listen for beforeinstallprompt event
window.addEventListener('beforeinstallprompt', (e) => {
  console.log('💡 PWA install prompt available');
  e.preventDefault();
  deferredPrompt = e;
  
  // Dispatch custom event for UI components to show install button
  window.dispatchEvent(new CustomEvent('pwa-installable', { detail: { prompt: e } }));
});

// Listen for app installed event
window.addEventListener('appinstalled', () => {
  console.log('✅ PWA installed successfully');
  deferredPrompt = null;
  
  // Track installation in analytics
  if (window.gtag) {
    window.gtag('event', 'pwa_installed', {
      event_category: 'engagement',
      event_label: 'PWA Installation'
    });
  }
});

/**
 * Prompt user to install PWA
 * @returns {Promise<boolean>} Whether user accepted installation
 */
export async function promptInstall() {
  if (!deferredPrompt) {
    console.warn('⚠️ PWA install prompt not available');
    return false;
  }

  try {
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for user response
    const choiceResult = await deferredPrompt.userChoice;
    
    if (choiceResult.outcome === 'accepted') {
      console.log('✅ User accepted PWA installation');
      return true;
    } else {
      console.log('❌ User dismissed PWA installation');
      return false;
    }
  } catch (error) {
    console.error('❌ Error showing install prompt:', error);
    return false;
  } finally {
    deferredPrompt = null;
  }
}

/**
 * Check if app is running as installed PWA
 * @returns {boolean}
 */
export function isPWA() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    document.referrer.includes('android-app://')
  );
}

/**
 * Check if PWA installation is supported
 * @returns {boolean}
 */
export function isPWAInstallable() {
  return deferredPrompt !== null;
}

/**
 * Check for service worker updates
 */
export async function checkForUpdates() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
        console.log('🔄 Checking for app updates...');
      }
    } catch (error) {
      console.error('❌ Error checking for updates:', error);
    }
  }
}

/**
 * Show update notification when new version is available
 */
export function setupUpdateListener(onUpdateAvailable) {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('🆕 New app version detected');
      if (onUpdateAvailable) {
        onUpdateAvailable();
      }
    });
  }
}

/**
 * Force reload to activate new service worker
 */
export function activateUpdate() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistration().then((registration) => {
      if (registration && registration.waiting) {
        registration.waiting.postMessage({ action: 'skipWaiting' });
        window.location.reload();
      }
    });
  }
}

/**
 * Detect iOS device
 * @returns {boolean}
 */
export function isIOS() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/**
 * Detect Android device
 * @returns {boolean}
 */
export function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}

/**
 * Get device type for analytics
 * @returns {string}
 */
export function getDeviceType() {
  if (isIOS()) return 'iOS';
  if (isAndroid()) return 'Android';
  return 'Desktop';
}
