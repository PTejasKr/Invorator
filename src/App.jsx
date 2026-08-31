import React, { useState, useEffect } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc, writeBatch } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { db, auth } from "./utils/firebase";
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
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [history, setHistory] = useState([]);
  
  const [lang, setLang] = useState(() => localStorage.getItem("_inv_lang") || "en");
  const [currency, setCurrency] = useState(() => localStorage.getItem("_inv_currency") || "USD");

  const [activePrintInvoice, setActivePrintInvoice] = useState(null);
  const [isConvertingCurrency, setIsConvertingCurrency] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const { doc, getDoc } = await import("firebase/firestore");
        const profileSnap = await getDoc(doc(db, "users", currentUser.uid));
        if (profileSnap.exists()) {
          setUserProfile(profileSnap.data());
        }
        loadDatabase(currentUser.uid);
      } else {
        setHistory([]);
        setUserProfile(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
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
        const batch = writeBatch(db);
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

          const invRef = doc(db, "invoices", String(updatedInv.id));
          batch.update(invRef, updatedInv);
          return updatedInv;
        });
        
        await batch.commit();
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
      const { query, where } = await import("firebase/firestore");
      const q = query(collection(db, "invoices"), where("userId", "==", uid));
      const querySnapshot = await getDocs(q);
      const parsedHistory = [];
      querySnapshot.forEach((docSnap) => {
        parsedHistory.push({ id: docSnap.id, ...docSnap.data() });
      });
      parsedHistory.sort((a, b) => Number(b.id) - Number(a.id));
      setHistory(parsedHistory);
    } catch (err) {
      console.error("Failed to load invoice history from Firebase:", err);
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
                try {
                  const phone = prompt("Enter customer WhatsApp number (with country code, e.g. +91...):", inv.clientPhone || "");
                  if (!phone) return;
                  const message = `Hello ${inv.clientName},\n\nYour invoice ${inv.invoiceNumber} for ${inv.total} has been generated.`;
                  
                  const res = await fetch("/api/whatsapp/send", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ phone, message, pdfUrl: "https://invorator-mock.com/invoice/" + inv.id })
                  });
                  const data = await res.json();
                  if (data.success) {
                    alert("WhatsApp message sent successfully!");
                  } else {
                    alert("Error: " + data.error);
                  }
                } catch (e) {
                  alert("Failed to connect to backend server.");
                }
              }}
              onDeleteInvoice={async (id) => {
                if (!window.confirm("Are you sure?")) return;
                await deleteDoc(doc(db, "invoices", String(id)));
                setHistory(h => h.filter(x => x.id !== id));
              }}
              onDownloadPDF={async (inv) => {
                try {
                  const response = await fetch("/api/invoices/pdf", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ invoiceData: inv })
                  });
                  if (!response.ok) throw new Error("PDF generation failed");
                  const blob = await response.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `Invoice_${inv.invoiceNumber}.pdf`;
                  a.click();
                  window.URL.revokeObjectURL(url);
                } catch (e) {
                  alert("Failed to generate PDF from backend.");
                  console.error(e);
                }
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
                await deleteDoc(doc(db, "invoices", String(id)));
                setHistory(h => h.filter(x => x.id !== id));
              }}
              onDownloadPDF={() => {}}
              onShareInvoice={async (inv) => {
                try {
                  const phone = prompt("Enter customer WhatsApp number (with country code, e.g. +91...):", inv.clientPhone || "");
                  if (!phone) return;
                  const message = `Hello ${inv.clientName},\n\nYour invoice ${inv.invoiceNumber} for ${inv.total} has been generated.`;
                  
                  const res = await fetch("http://localhost:3001/api/whatsapp/send", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ phone, message, pdfUrl: "https://invorator-mock.com/invoice/" + inv.id })
                  });
                  const data = await res.json();
                  if (data.success) {
                    alert("WhatsApp message sent successfully!");
                  } else {
                    alert("Error: " + data.error);
                  }
                } catch (e) {
                  alert("Failed to connect to backend server.");
                }
              }}
            />
          } />

          <Route path="/invoices/new" element={
            <InvoiceEditor 
              initialData={{}}
              userProfile={userProfile}
              onSave={async (inv) => {
                const invoiceId = String(Date.now());
                const invRef = doc(db, "invoices", invoiceId);
                const toSave = { ...inv, userId: user.uid };
                await updateDoc(invRef, toSave).catch(async () => {
                   const { setDoc } = await import("firebase/firestore");
                   await setDoc(invRef, toSave);
                });
                setHistory([{ ...toSave, id: invoiceId }, ...history]);
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
                // Implementation for edit
                const invRef = doc(db, "invoices", String(inv.id));
                const toSave = { ...inv, userId: user.uid };
                await updateDoc(invRef, toSave);
                setHistory(history.map(h => h.id === inv.id ? toSave : h));
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

