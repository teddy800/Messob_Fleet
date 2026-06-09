import { useState, useEffect } from 'react';
import { promptInstall, isPWA, isIOS } from '../../utils/pwaInstaller';

/**
 * PWA Installation Prompt Component
 * Shows installation banner for non-installed users
 */
export default function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Don't show if already installed as PWA
    if (isPWA()) {
      return;
    }

    // Handle iOS separately (no beforeinstallprompt event)
    if (isIOS()) {
      const hasSeenPrompt = localStorage.getItem('pwa-ios-prompt-dismissed');
      if (!hasSeenPrompt) {
        setShowIOSInstructions(true);
      }
      return;
    }

    // Listen for PWA installable event
    const handleInstallable = () => {
      const hasDismissed = localStorage.getItem('pwa-prompt-dismissed');
      if (!hasDismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('pwa-installable', handleInstallable);

    return () => {
      window.removeEventListener('pwa-installable', handleInstallable);
    };
  }, []);

  const handleInstall = async () => {
    const accepted = await promptInstall();
    if (accepted) {
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa-prompt-dismissed', 'true');
    setShowPrompt(false);
  };

  const handleIOSDismiss = () => {
    localStorage.setItem('pwa-ios-prompt-dismissed', 'true');
    setShowIOSInstructions(false);
  };

  // iOS Installation Instructions
  if (showIOSInstructions) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-slide-up">
        <div className="bg-white rounded-lg shadow-2xl border border-gray-200 p-5">
          <div className="flex items-start gap-3">
            <div className="text-3xl">📱</div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 mb-2">Install MESSOB Fleet</h3>
              <p className="text-sm text-gray-600 mb-3">
                Install this app on your iPhone for a better experience:
              </p>
              <ol className="text-sm text-gray-700 space-y-2 ml-4 list-decimal">
                <li>Tap the Share button <span className="inline-block">📤</span></li>
                <li>Scroll down and tap "Add to Home Screen"</li>
                <li>Tap "Add" to confirm</li>
              </ol>
            </div>
            <button
              onClick={handleIOSDismiss}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Dismiss"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Standard PWA Install Prompt
  if (!showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-slide-up">
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg shadow-2xl p-5 text-white">
        <div className="flex items-start gap-3">
          <div className="text-3xl">🚀</div>
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-1">Install MESSOB Fleet</h3>
            <p className="text-sm text-purple-100 mb-4">
              Get faster access and work offline by installing our app
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleInstall}
                className="flex-1 bg-white text-purple-600 hover:bg-purple-50 font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Install
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-2 text-white hover:bg-white/20 rounded-lg transition-colors"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
