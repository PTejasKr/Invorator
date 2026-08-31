import React, { useState } from "react";
import { Menu } from "lucide-react";
import Sidebar from "./Sidebar";

export default function Layout({ children, onLogout, lang, currency, onLangChange, onCurrencyChange }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="bg-white shadow-sm h-16 flex items-center justify-between px-4 md:px-8 z-10 sticky top-0">
          <div className="flex items-center gap-4">
            <button 
              className="md:hidden text-slate-600 hover:text-slate-900"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={24} />
            </button>
            <div className="text-lg font-medium text-slate-800">
              {/* Contextual Title could go here */}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <select 
              value={lang} 
              onChange={(e) => onLangChange(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg px-2 py-1 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="en">English</option>
              <option value="hi">हिन्दी</option>
            </select>
            <select 
              value={currency} 
              onChange={(e) => onCurrencyChange(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg px-2 py-1 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
            </select>
            <button 
              onClick={onLogout}
              className="text-sm font-medium text-slate-600 hover:text-indigo-600"
            >
              Log Out
            </button>
          </div>
        </header>
        {/* Main Content Area */}
        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
