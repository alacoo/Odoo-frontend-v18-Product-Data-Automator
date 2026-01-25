
import React, { useState, useEffect } from 'react';
import { Moon, Sun, Languages } from 'lucide-react';
import { ProductAutomatorDashboard } from './modules/product-automator';

export default function App() {
  // Global Theme & Direction State
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  const [direction, setDirection] = useState<'rtl' | 'ltr'>('rtl');

  // Update HTML dir and class attributes for Tailwind
  useEffect(() => {
    document.dir = direction;
    document.documentElement.lang = direction === 'rtl' ? 'ar' : 'en';
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [direction, mode]);

  const toggleColorMode = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  const toggleDirection = () => {
    setDirection((prevDir) => (prevDir === 'rtl' ? 'ltr' : 'rtl'));
  };

  return (
      <div className="flex flex-col h-screen bg-gray-50 dark:bg-zinc-900 transition-colors duration-200">
        
        {/* Global Toolbar (Simulating Host App Header) */}
        <div className="h-12 bg-white dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-700 flex items-center justify-end px-4 z-50">
             <div className="flex items-center gap-2">
                  <button title={mode === 'light' ? "Dark Mode" : "Light Mode"} onClick={toggleColorMode} className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-600 dark:text-gray-300 transition-colors">
                      {mode === 'light' ? <Moon size={16} /> : <Sun size={16} />}
                  </button>
                  <button title="Switch Language/Direction" onClick={toggleDirection} className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-600 dark:text-gray-300 transition-colors">
                      <Languages size={16} />
                  </button>
             </div>
        </div>

        {/* Module Content */}
        <div className="flex-1 overflow-hidden">
            <ProductAutomatorDashboard 
                onBack={() => console.log("Back navigation requested")} 
                appMode="demo"
            />
        </div>
      </div>
  );
}
