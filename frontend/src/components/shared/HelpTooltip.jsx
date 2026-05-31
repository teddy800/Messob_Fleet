// ============================================================================
// MESSOB Fleet Management System
// Context-Sensitive Help Tooltip Component
// SRS Section 2.6: Online Help System
// ============================================================================

import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";

/**
 * Context-sensitive help tooltip component
 * Provides inline help for form fields and UI elements
 * 
 * @param {string} helpKey - Translation key for help text
 * @param {string} content - Direct help content (overrides helpKey)
 * @param {string} position - Tooltip position (top, bottom, left, right)
 * @param {string} size - Icon size (sm, md, lg)
 */
export default function HelpTooltip({ 
  helpKey, 
  content, 
  position = "top",
  size = "sm" 
}) {
  const { t } = useTranslation();
  
  const helpText = content || (helpKey ? t(helpKey) : '');
  
  if (!helpText) return null;
  
  const iconSizes = {
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
    lg: "h-5 w-5"
  };
  
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center justify-center ml-1.5 text-gray-400 hover:text-brand-blue transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-1 rounded-full"
            aria-label="Help"
          >
            <HelpCircle className={iconSizes[size]} />
          </button>
        </TooltipTrigger>
        <TooltipContent 
          side={position}
          className="max-w-xs bg-gray-900 text-white text-xs p-3 rounded-lg shadow-xl border border-gray-700"
        >
          <p className="leading-relaxed">{helpText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Field Label with integrated help tooltip
 * Combines label and help in one component
 */
export function LabelWithHelp({ 
  label, 
  helpKey, 
  helpContent, 
  required = false,
  htmlFor 
}) {
  const { t } = useTranslation();
  
  return (
    <label 
      htmlFor={htmlFor}
      className="inline-flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300"
    >
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
      <HelpTooltip helpKey={helpKey} content={helpContent} />
    </label>
  );
}
