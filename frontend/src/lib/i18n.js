// ============================================================================
// MESSOB Fleet Management System
// Advanced Internationalization (i18n) System
// Supports: English, Amharic (አማርኛ), and future languages
// SRS Section 2.5: Localization Framework
// ============================================================================

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// ============================================================================
// TRANSLATION RESOURCES
// ============================================================================

const resources = {
  en: {
    translation: {
      // Navigation
      'nav.dashboard': 'Dashboard',
      'nav.requests': 'Requests',
      'nav.newRequest': 'New Request',
      'nav.myRequests': 'My Requests',
      'nav.tracking': 'Tracking',
      'nav.dispatch': 'Dispatch',
      'nav.fleet': 'Fleet',
      'nav.admin': 'Administration',
      'nav.profile': 'Profile',
      'nav.logout': 'Logout',
      
      // Request Wizard
      'wizard.step1': 'Basics',
      'wizard.step2': 'Dates',
      'wizard.step3': 'Route',
      'wizard.step4': 'Review',
      'wizard.step5': 'Confirm',
      'wizard.purpose': 'Trip Purpose',
      'wizard.purposePlaceholder': 'Describe the official reason for this trip (min. 10 characters)',
      'wizard.vehicleCategory': 'Vehicle Category',
      'wizard.departureDate': 'Departure Date',
      'wizard.arrivalDate': 'Arrival Date',
      'wizard.startPoint': 'Starting Point',
      'wizard.destination': 'Destination',
      'wizard.submit': 'Submit Request',
      'wizard.next': 'Next',
      'wizard.previous': 'Previous',
      'wizard.confirmCheckbox': 'I confirm that all information is correct',
      
      // Vehicle Categories
      'vehicle.sedan': 'Sedan',
      'vehicle.suv': 'SUV',
      'vehicle.pickup': 'Pick-up',
      'vehicle.bus': 'Bus',
      'vehicle.minibus': 'Mini-Bus',
      
      // Status
      'status.draft': 'Draft',
      'status.pending': 'Pending',
      'status.approved': 'Approved',
      'status.rejected': 'Rejected',
      'status.inProgress': 'In Progress',
      'status.completed': 'Completed',
      'status.closed': 'Closed',
      
      // Actions
      'action.approve': 'Approve',
      'action.reject': 'Reject',
      'action.cancel': 'Cancel',
      'action.edit': 'Edit',
      'action.delete': 'Delete',
      'action.save': 'Save',
      'action.close': 'Close',
      'action.view': 'View',
      'action.assign': 'Assign',
      
      // Messages
      'msg.success': 'Success',
      'msg.error': 'Error',
      'msg.loading': 'Loading...',
      'msg.noData': 'No data available',
      'msg.confirmDelete': 'Are you sure you want to delete this?',
      
      // Help Tooltips
      'help.purpose': 'Provide a clear justification for your trip request. This helps dispatchers prioritize requests.',
      'help.vehicleCategory': 'Select the type of vehicle needed based on passenger count and trip requirements.',
      'help.dates': 'Choose your departure and return dates. Multi-day trips are supported.',
      'help.route': 'Specify your pickup location and final destination. Use the map for precise locations.',
      'help.priority': 'Priority is automatically calculated based on urgency, wait time, and other factors.',
    }
  },
  am: {
    translation: {
      // Navigation (Amharic)
      'nav.dashboard': 'ዳሽቦርድ',
      'nav.requests': 'ጥያቄዎች',
      'nav.newRequest': 'አዲስ ጥያቄ',
      'nav.myRequests': 'የእኔ ጥያቄዎች',
      'nav.tracking': 'ክትትል',
      'nav.dispatch': 'ማሰራጨት',
      'nav.fleet': 'መኪና ፓርክ',
      'nav.admin': 'አስተዳደር',
      'nav.profile': 'መገለጫ',
      'nav.logout': 'ውጣ',
      
      // Request Wizard (Amharic)
      'wizard.step1': 'መሰረታዊ',
      'wizard.step2': 'ቀናት',
      'wizard.step3': 'መንገድ',
      'wizard.step4': 'ግምገማ',
      'wizard.step5': 'ማረጋገጫ',
      'wizard.purpose': 'የጉዞ ዓላማ',
      'wizard.purposePlaceholder': 'ለዚህ ጉዞ ኦፊሴላዊ ምክንያት ይግለጹ (ቢያንስ 10 ቁምፊዎች)',
      'wizard.vehicleCategory': 'የተሽከርካሪ ምድብ',
      'wizard.departureDate': 'የመነሻ ቀን',
      'wizard.arrivalDate': 'የመድረሻ ቀን',
      'wizard.startPoint': 'መነሻ ነጥብ',
      'wizard.destination': 'መድረሻ',
      'wizard.submit': 'ጥያቄ አስገባ',
      'wizard.next': 'ቀጣይ',
      'wizard.previous': 'ቀዳሚ',
      'wizard.confirmCheckbox': 'ሁሉም መረጃ ትክክል መሆኑን አረጋግጣለሁ',
      
      // Vehicle Categories (Amharic)
      'vehicle.sedan': 'ሴዳን',
      'vehicle.suv': 'ኤስዩቪ',
      'vehicle.pickup': 'ፒክ-አፕ',
      'vehicle.bus': 'አውቶቡስ',
      'vehicle.minibus': 'ሚኒ-አውቶቡስ',
      
      // Status (Amharic)
      'status.draft': 'ረቂቅ',
      'status.pending': 'በመጠባበቅ ላይ',
      'status.approved': 'ጸድቋል',
      'status.rejected': 'ውድቅ ሆኗል',
      'status.inProgress': 'በሂደት ላይ',
      'status.completed': 'ተጠናቋል',
      'status.closed': 'ተዘግቷል',
      
      // Actions (Amharic)
      'action.approve': 'ፈቅድ',
      'action.reject': 'ውድቅ አድርግ',
      'action.cancel': 'ሰርዝ',
      'action.edit': 'አርትዕ',
      'action.delete': 'ሰርዝ',
      'action.save': 'አስቀምጥ',
      'action.close': 'ዝጋ',
      'action.view': 'ይመልከቱ',
      'action.assign': 'ይመድቡ',
      
      // Messages (Amharic)
      'msg.success': 'ስኬት',
      'msg.error': 'ስህተት',
      'msg.loading': 'በመጫን ላይ...',
      'msg.noData': 'ምንም መረጃ የለም',
      'msg.confirmDelete': 'ይህን መሰረዝ እርግጠኛ ነዎት?',
      
      // Help Tooltips (Amharic)
      'help.purpose': 'ለጉዞ ጥያቄዎ ግልጽ ማረጋገጫ ይስጡ። ይህ ዲስፓቸሮች ጥያቄዎችን ቅድሚያ እንዲሰጡ ይረዳል።',
      'help.vehicleCategory': 'በተሳፋሪ ብዛት እና የጉዞ መስፈርቶች ላይ በመመስረት የሚፈለገውን የተሽከርካሪ አይነት ይምረጡ።',
      'help.dates': 'የመነሻ እና የመመለሻ ቀናትዎን ይምረጡ። የብዙ ቀን ጉዞዎች ይደገፋሉ።',
      'help.route': 'የመነሻ ቦታዎን እና የመጨረሻ መድረሻዎን ይግለጹ። ለትክክለኛ ቦታዎች ካርታውን ይጠቀሙ።',
      'help.priority': 'ቅድሚያ በአስቸኳይነት፣ በመጠባበቂያ ጊዜ እና በሌሎች ምክንያቶች ላይ በመመስረት በራስ-ሰር ይሰላል።',
    }
  }
};

// ============================================================================
// I18N CONFIGURATION
// ============================================================================

i18n
  .use(LanguageDetector) // Detect user language
  .use(initReactI18next) // Pass i18n to react-i18next
  .init({
    resources,
    fallbackLng: 'en', // Default language
    supportedLngs: ['en', 'am'], // Supported languages
    
    detection: {
      // Order of language detection
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
    
    interpolation: {
      escapeValue: false, // React already escapes
    },
    
    react: {
      useSuspense: false, // Disable suspense for better UX
    },
  });

export default i18n;
