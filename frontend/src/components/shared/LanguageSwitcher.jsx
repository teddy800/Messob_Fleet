// ============================================================================
// MESSOB Fleet Management System
// Language Switcher Component
// Allows users to switch between English and Amharic
// ============================================================================

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Globe, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const languages = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'am', name: 'Amharic', nativeName: 'አማርኛ', flag: '🇪🇹' },
];

export default function LanguageSwitcher({ variant = "ghost", showLabel = false }) {
  const { i18n } = useTranslation();
  const [currentLang, setCurrentLang] = useState(i18n.language || 'en');

  const changeLanguage = (langCode) => {
    i18n.changeLanguage(langCode);
    setCurrentLang(langCode);
    localStorage.setItem('i18nextLng', langCode);
    
    // Update HTML lang attribute for accessibility
    document.documentElement.lang = langCode;
  };

  const getCurrentLanguage = () => {
    return languages.find(lang => lang.code === currentLang) || languages[0];
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={variant} 
          size="sm"
          className="gap-2"
        >
          <Globe className="h-4 w-4" />
          {showLabel && (
            <span className="hidden sm:inline">
              {getCurrentLanguage().flag} {getCurrentLanguage().nativeName}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            className="flex items-center justify-between cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <span className="text-lg">{lang.flag}</span>
              <span>{lang.nativeName}</span>
            </span>
            {currentLang === lang.code && (
              <Check className="h-4 w-4 text-brand-blue" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
