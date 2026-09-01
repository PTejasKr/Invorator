import React, { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "../utils/firebase";
import { db, auth } from "../utils/firebase";

export default function Reports() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!auth.currentUser) return;
    try {
      const q = query(collection(db, "invoices"), where("userId", "==", auth.currentUser.uid));
      const snap = await getDocs(q);
      const data = [];
      snap.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
      setInvoices(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const generateGSTR1 = () => {
    if (invoices.length === 0) return alert("No data to generate report.");
    let csv = "GSTIN/UIN of Recipient,Receiver Name,Invoice Number,Invoice date,Invoice Value,Place Of Supply,Reverse Charge,Invoice Type,E-Commerce GSTIN,Rate,Taxable Value,Cess Amount\n";
    invoices.forEach(inv => {
      const row = `${inv.consigneeGSTIN || ''},${inv.clientName || ''},${inv.invoiceNumber},${inv.date},${inv.total},${inv.clientStateCode || ''},N,Regular,,${inv.taxRate},${inv.subtotal},0`;
      csv += row + "\n";
    });
    downloadCSV(csv, "GSTR-1_Report.csv");
  };

  const generateEInvoice = async () => {
    if (invoices.length === 0) return alert("No data to generate E-Invoice.");
    try {
      // Simulate API call for e-invoice
      await new Promise(resolve => setTimeout(resolve, 1500));
      const chars = 'abcdef0123456789';
      let fakeIrn = '';
      for(let i=0; i<64; i++) {
        fakeIrn += chars[Math.floor(Math.random() * chars.length)];
      }
      const data = {
        success: true,
        irn: fakeIrn,
        ackNo: 'ACK' + Math.floor(100000000 + Math.random() * 900000000),
        ackDate: new Date().toISOString(),
        qrCodeData: 'https://einvoice1.gst.gov.in/qr?irn=' + fakeIrn
      };
      if (data.success) {
        alert(`E-Invoice generated successfully!\nIRN: ${data.irn}\nACK: ${data.ackNo}`);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      alert("Failed to connect to backend server.");
    }
  };

  const downloadCSV = (csv, filename) => {
    const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csv);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Reports & Compliance</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="text-3xl mb-4">📊</div>
          <h2 className="text-lg font-bold text-slate-800 mb-2">GSTR-1 Export</h2>
          <p className="text-slate-500 text-sm mb-6">Export outward supplies report formatted for GST portal upload.</p>
          <button 
            onClick={generateGSTR1}
            disabled={loading}
            className="w-full bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-100 transition-colors"
          >
            {loading ? "Loading..." : "Download CSV"}
          </button>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="text-3xl mb-4">🧾</div>
          <h2 className="text-lg font-bold text-slate-800 mb-2">E-Invoice Generation</h2>
          <p className="text-slate-500 text-sm mb-6">Generate E-Invoice IRN via API integration.</p>
          <button 
            onClick={generateEInvoice}
            className="w-full bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-100 transition-colors"
          >
            Generate E-Invoice (Mock)
          </button>
        </div>
      </div>
    </div>
  );
}
