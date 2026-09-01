import React, { useState, useEffect } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { translations, languages } from "./utils/translations";

import Layout from "./components/Layout";
import Dashboard from "./components/Dashboard"; // Currently the main invoices/history list
import InvoiceEditor from "./components/InvoiceEditor";
import Auth from "./components/Auth";
import Settings from "./components/Settings";
import Inventory from "./components/Inventory";
import Parties from "./components/Parties";
import Reports from "./components/Reports";

import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { captureInvoiceBlob, shareInvoice } from "./utils/imageExport";

export default function App() {
  const [user, setUser] = useState({ uid: "local_user" });
  const [userProfile, setUserProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [history, setHistory] = useState([]);
  
  const [lang, setLang] = useState(() => localStorage.getItem("_inv_lang") || "en");
  const [currency, setCurrency] = useState(() => localStorage.getItem("_inv_currency") || "USD");

  const [activePrintInvoice, setActivePrintInvoice] = useState(null);
  const [isConvertingCurrency, setIsConvertingCurrency] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    loadDatabase("local_user");
  }, []);

  const handleLangChange = (newLang) => {
    setLang(newLang);
    localStorage.setItem("_inv_lang", newLang);
  };

  const handleCurrencyChange = async (newCurr) => {
    if (newCurr === currency) return;
    if (history.length > 0) {
      const confirm = window.confirm(
        `You are about to switch to ${newCurr}. This will update all your previously saved invoices using today's live market exchange rate. Proceed?`
      );
      if (!confirm) return;
    }

    setIsConvertingCurrency(true);
    try {
      const res = await fetch(`https://api.exchangerate-api.com/v4/latest/${currency}`);
      if (!res.ok) throw new Error("Failed to fetch exchange rates");
      const data = await res.json();
      const rate = data.rates[newCurr];
      if (!rate) throw new Error("Target currency rate not found");

      if (history.length > 0) {
        const convertedHistory = history.map(inv => {
          const convertedItems = (inv.items || []).map(item => ({
            ...item,
            rate: Math.round((item.rate * rate) * 100) / 100,
            total: Math.round((item.total * rate) * 100) / 100
          }));

          const updatedInv = {
            ...inv,
            currency: newCurr,
            subtotal: Math.round((inv.subtotal * rate) * 100) / 100,
            taxAmount: Math.round((inv.taxAmount * rate) * 100) / 100,
            total: Math.round((inv.total * rate) * 100) / 100,
            items: convertedItems
          };
          return updatedInv;
        });
        
        localStorage.setItem('invoices', JSON.stringify(convertedHistory));
        
        setHistory(convertedHistory);
      }
      
      setCurrency(newCurr);
      localStorage.setItem("_inv_currency", newCurr);
    } catch (err) {
      console.error("Currency conversion error:", err);
      alert("Failed to retrieve live market rates. Please check your internet connection.");
    } finally {
      setIsConvertingCurrency(false);
    }
  };

  const loadDatabase = async (uid) => {
    try {
      const data = JSON.parse(localStorage.getItem('invoices') || '[]');
      setHistory(data);
    } catch (err) {
      console.error("Failed to load invoice history from localStorage:", err);
      setHistory([]);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <>
      <Layout 
        onLogout={handleLogout} 
        lang={lang} 
        currency={currency} 
        onLangChange={handleLangChange} 
        onCurrencyChange={handleCurrencyChange}
      >
        <Routes>
          <Route path="/" element={
            <Dashboard 
              history={history}
              lang={lang}
              currency={currency}
              onStartGenerator={() => navigate("/invoices/new")}
              onEditInvoice={(inv) => navigate(`/invoices/edit/${inv.id}`, { state: { invoice: inv } })}
              onCopyInvoice={(inv) => navigate(`/invoices/new`, { state: { invoice: inv } })}
              onShareInvoice={async (inv) => {
                alert("Sharing is not available in local-only mode.");
              }}
              onDeleteInvoice={async (id) => {
                if (!window.confirm("Are you sure?")) return;
                const newHistory = history.filter(x => x.id !== id);
                localStorage.setItem('invoices', JSON.stringify(newHistory));
                setHistory(newHistory);
              }}
              onDownloadPDF={async (inv) => {
                navigate(`/invoices/edit/${inv.id}`);
                setTimeout(() => window.print(), 500);
              }}
              
            />
          } />
          
          <Route path="/invoices" element={
            <Dashboard 
              history={history}
              lang={lang}
              currency={currency}
              onStartGenerator={() => navigate("/invoices/new")}
              onEditInvoice={(inv) => navigate(`/invoices/edit/${inv.id}`, { state: { invoice: inv } })}
              onCopyInvoice={(inv) => navigate(`/invoices/new`, { state: { invoice: inv } })}
              onDeleteInvoice={async (id) => {
                if (!window.confirm("Are you sure?")) return;
                const newHistory = history.filter(x => x.id !== id);
                localStorage.setItem('invoices', JSON.stringify(newHistory));
                setHistory(newHistory);
              }}
              onDownloadPDF={() => {}}
              onShareInvoice={async (inv) => {
                alert("Sharing is not available in local-only mode.");
              }}
            />
          } />

          <Route path="/invoices/new" element={
            <InvoiceEditor 
              initialData={{}}
              userProfile={userProfile}
              onSave={async (inv) => {
                const invoiceId = String(Date.now());
                const toSave = { ...inv, id: invoiceId, userId: user.uid };
                const newHistory = [{ ...toSave, id: invoiceId }, ...history];
                localStorage.setItem('invoices', JSON.stringify(newHistory));
                setHistory(newHistory);
                navigate("/invoices");
              }}
              onCancel={() => navigate("/invoices")}
            />
          } />

          <Route path="/invoices/edit/:id" element={
            <InvoiceEditor 
              isEditMode={true}
              userProfile={userProfile}
              onSave={async (inv) => {
                const toSave = { ...inv, userId: user.uid };
                const newHistory = history.map(h => h.id === inv.id ? toSave : h);
                localStorage.setItem('invoices', JSON.stringify(newHistory));
                setHistory(newHistory);
                navigate("/invoices");
              }}
              onCancel={() => navigate("/invoices")}
            />
          } />

          <Route path="/inventory" element={<Inventory />} />
          <Route path="/parties" element={<Parties />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings userProfile={userProfile} onProfileUpdate={setUserProfile} />} />
        </Routes>
      </Layout>
    </>
  );
}

