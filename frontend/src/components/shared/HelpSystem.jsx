import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useUserStore } from '@/store/useUserStore';
import { HelpCircle, X, Book, FileText, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import helpContent from './help-content.json';

/**
 * Context-Sensitive Help System
 * SRS Requirement 2.6: Online Help System integrated into web application
 * 
 * Features:
 * - Context-aware help based on current route
 * - Quick tips for current page
 * - Search functionality
 * - Links to detailed documentation
 * - Video tutorials (when available)
 */
export default function HelpSystem() {
  const location = useLocation();
  const user = useUserStore((s) => s.user);
  const [isOpen, setIsOpen] = useState(false);
  const [currentHelp, setCurrentHelp] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Get context-sensitive help based on current route
  useEffect(() => {
    const path = location.pathname;
    const helpKey = Object.keys(helpContent.pages).find(key => 
      path.includes(key) || path === helpContent.pages[key].route
    );
    
    if (helpKey && helpContent.pages[helpKey]) {
      setCurrentHelp(helpContent.pages[helpKey]);
    } else {
      setCurrentHelp(helpContent.pages.default);
    }
  }, [location]);

  // Filter manuals based on user role
  const userRole = user?.role || 'Staff';
  const filteredManuals = (helpContent.manuals || []).filter(manual => {
    // Show all manuals to Admin
    if (userRole === 'Admin') return true;
    // Show role-specific manual to each user
    return manual.role === userRole;
  });

  // Filter videos based on user role
  const filteredVideos = (helpContent.videos || []).filter(video => {
    if (userRole === 'Staff') {
      return ['Getting Started with MESSOB Fleet', 'Creating Your First Trip Request', 'Live GPS Tracking Tutorial'].includes(video.title);
    }
    if (userRole === 'Dispatcher') {
      return ['Getting Started with MESSOB Fleet', 'Dispatcher Quick Start', 'Live GPS Tracking Tutorial'].includes(video.title);
    }
    if (userRole === 'Driver') {
      return ['Getting Started with MESSOB Fleet', 'Live GPS Tracking Tutorial'].includes(video.title);
    }
    if (userRole === 'Maintainer') {
      return ['Getting Started with MESSOB Fleet'].includes(video.title);
    }
    // Admin sees all videos
    return true;
  });

  // Filter documentation based on user role
  const filteredDocs = (helpContent.documentation || []).filter(doc => {
    // Only Admin sees technical documentation
    if (userRole === 'Admin') return true;
    // Other roles don't see technical docs
    return false;
  });

  // Filter FAQ based on search
  const filteredFaq = currentHelp?.faq?.filter(item =>
    item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.answer.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="fixed bottom-4 right-4 h-12 w-12 rounded-full shadow-md bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg transition-all z-50"
          title="Help & Documentation"
        >
          <HelpCircle className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto max-h-screen">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-xl font-extrabold text-gray-950 dark:text-white">
            <HelpCircle className="h-6 w-6" />
            Help & Documentation
          </SheetTitle>
          <SheetDescription className="text-base font-bold text-gray-800 dark:text-gray-200">
            {currentHelp?.title || 'Get help with MESSOB Fleet Management'}
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="quickhelp" className="mt-6">
          <TabsList className="grid w-full grid-cols-3 font-bold">
            <TabsTrigger value="quickhelp" className="font-extrabold">Quick Help</TabsTrigger>
            <TabsTrigger value="guides" className="font-extrabold">Guides</TabsTrigger>
            <TabsTrigger value="resources" className="font-extrabold">Resources</TabsTrigger>
          </TabsList>

          {/* Quick Help Tab */}
          <TabsContent value="quickhelp" className="space-y-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-extrabold mb-3 text-gray-950 dark:text-white">Current Page</h3>
                <p className="text-base text-gray-900 dark:text-gray-100 mb-4 font-bold">
                  {currentHelp?.description || 'Help for this page'}
                </p>
              </div>

              {currentHelp?.quickTips && currentHelp.quickTips.length > 0 && (
                <div className="bg-blue-100 dark:bg-blue-900 border-[3px] border-blue-500 dark:border-blue-400 rounded-lg p-5 shadow-md">
                  <h4 className="font-extrabold text-blue-950 dark:text-blue-50 mb-4 text-lg">
                    💡 Quick Tips
                  </h4>
                  <ul className="space-y-3 text-base text-blue-950 dark:text-blue-50 font-bold">
                    {currentHelp.quickTips.map((tip, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <ChevronRight className="h-5 w-5 mt-0.5 flex-shrink-0 text-blue-700 dark:text-blue-300 font-extrabold" />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {currentHelp?.steps && currentHelp.steps.length > 0 && (
                <div>
                  <h4 className="font-extrabold mb-4 text-gray-950 dark:text-white text-lg">How to Use This Page</h4>
                  <ol className="space-y-4">
                    {currentHelp.steps.map((step, index) => (
                      <li key={index} className="flex gap-3">
                        <span className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-base font-extrabold shadow-md">
                          {index + 1}
                        </span>
                        <span className="text-base pt-0.5 font-bold text-gray-900 dark:text-gray-100">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* FAQ Section */}
              {currentHelp?.faq && currentHelp.faq.length > 0 && (
                <div>
                  <h4 className="font-extrabold mb-4 text-gray-950 dark:text-white text-lg">Frequently Asked Questions</h4>
                  <div className="space-y-4">
                    {filteredFaq.slice(0, 3).map((item, index) => (
                      <div key={index} className="border-[3px] border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-800 shadow-md">
                        <h5 className="font-extrabold text-base mb-2 text-gray-950 dark:text-white">{item.question}</h5>
                        <p className="text-base text-gray-900 dark:text-gray-100 font-bold">{item.answer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* User Guides Tab */}
          <TabsContent value="guides" className="space-y-4">
            <div>
              <h3 className="text-xl font-extrabold mb-5 text-gray-950 dark:text-white">User Manuals & Guides</h3>
              <div className="space-y-4">
                {filteredManuals.map((manual, index) => {
                  const isAvailable = manual.available !== false;
                  return isAvailable ? (
                    <a
                      key={index}
                      href={manual.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-4 p-5 border-[3px] border-gray-300 dark:border-gray-600 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900 hover:border-blue-500 dark:hover:border-blue-400 transition-all shadow-md hover:shadow-lg"
                    >
                      <FileText className="h-10 w-10 text-blue-700 dark:text-blue-300 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-extrabold text-lg text-gray-950 dark:text-white">{manual.title}</h4>
                        <p className="text-base text-gray-900 dark:text-gray-100 font-bold mt-1">{manual.description}</p>
                        {manual.pages && (
                          <span className="text-sm text-gray-800 dark:text-gray-200 font-extrabold mt-2 inline-block">{manual.pages} pages</span>
                        )}
                      </div>
                      <ChevronRight className="h-6 w-6 text-blue-700 dark:text-blue-300" />
                    </a>
                  ) : (
                    <div
                      key={index}
                      className="flex items-center gap-4 p-5 border-[3px] border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-800 opacity-70 cursor-not-allowed shadow-sm"
                    >
                      <FileText className="h-10 w-10 text-gray-500 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-extrabold text-base text-gray-700 dark:text-gray-300">{manual.title}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-bold">{manual.description}</p>
                        <span className="text-base text-orange-600 dark:text-orange-400 font-extrabold">Coming Soon</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {filteredManuals.length === 0 && (
              <div className="text-center py-8 text-muted-foreground font-bold text-base">
                <p>No guides available for your role.</p>
              </div>
            )}
          </TabsContent>

          {/* Resources Tab */}
          <TabsContent value="resources" className="space-y-4">
            <div>
              <h3 className="text-xl font-extrabold mb-5 text-gray-950 dark:text-white">Additional Resources</h3>
              
              <div className="space-y-5">
                {filteredDocs.length > 0 && (
                  <div className="border-[3px] border-gray-300 dark:border-gray-600 rounded-lg p-5 bg-white dark:bg-gray-800 shadow-md">
                    <h4 className="font-extrabold mb-4 flex items-center gap-2 text-gray-950 dark:text-white text-lg">
                      <Book className="h-6 w-6 text-blue-700 dark:text-blue-300" />
                      System Documentation
                    </h4>
                    <ul className="space-y-3 ml-8">
                      {filteredDocs.map((doc, index) => (
                      <li key={index}>
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-base text-blue-700 dark:text-blue-300 hover:underline flex items-center gap-2 font-extrabold hover:text-blue-800 dark:hover:text-blue-200"
                        >
                          {doc.title}
                          <ChevronRight className="h-4 w-4" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
                )}

                <div className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 border-[3px] border-gray-400 dark:border-gray-500 rounded-lg p-5 shadow-lg">
                  <h4 className="font-extrabold mb-3 text-gray-950 dark:text-white text-lg">Need More Help?</h4>
                  <p className="text-base text-gray-900 dark:text-gray-100 mb-4 font-bold">
                    Contact your system administrator or IT support team
                  </p>
                  <div className="space-y-2 text-base text-gray-950 dark:text-white">
                    <p className="font-extrabold"><strong className="font-extrabold">Email:</strong> support@messob.et</p>
                    <p className="font-extrabold"><strong className="font-extrabold">Phone:</strong> +251 11 XXX XXXX</p>
                    <p className="font-extrabold"><strong className="font-extrabold">Hours:</strong> Monday-Friday, 9:00-17:00 EAT</p>
                  </div>
                </div>

                <div className="text-sm text-gray-700 dark:text-gray-300 text-center pt-4 font-bold">
                  MESSOB Fleet Management System v1.1.0
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
