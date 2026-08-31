import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, FileText, Package, Users, BarChart2, Settings as SettingsIcon, X } from "lucide-react";

export default function Sidebar({ isOpen, setIsOpen }) {
  const location = useLocation();

  const navItems = [
    { name: "Dashboard", path: "/", icon: <Home size={20} /> },
    { name: "Invoices", path: "/invoices", icon: <FileText size={20} /> },
    { name: "Inventory", path: "/inventory", icon: <Package size={20} /> },
    { name: "Parties", path: "/parties", icon: <Users size={20} /> },
    { name: "Reports", path: "/reports", icon: <BarChart2 size={20} /> },
    { name: "Settings", path: "/settings", icon: <SettingsIcon size={20} /> },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden" 
          onClick={() => setIsOpen(false)}
        />
      )}
      
      {/* Sidebar Content */}
      <div className={`fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-slate-300 min-h-screen flex flex-col transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white tracking-widest" style={{ fontFamily: "'Great Vibes', cursive" }}>INVORATOR</h1>
          <button 
            className="md:hidden text-slate-300 hover:text-white"
            onClick={() => setIsOpen(false)}
          >
            <X size={24} />
          </button>
        </div>
      <nav className="flex-1 mt-6">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.name}>
              <Link
                to={item.path}
                className={`flex items-center gap-3 px-6 py-3 transition-colors ${
                  location.pathname === item.path
                    ? "bg-indigo-600 text-white border-r-4 border-indigo-400"
                    : "hover:bg-slate-800 hover:text-white"
                }`}
              >
                {item.icon}
                <span>{item.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-6 text-sm text-slate-500">
        &copy; {new Date().getFullYear()} Invorator
      </div>
    </div>
    </>
  );
}
