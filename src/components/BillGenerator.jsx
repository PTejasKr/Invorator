import React, { useState, useEffect, useRef } from "react";
import Tesseract from "tesseract.js";
import { parseOCRText } from "../utils/ocrParser";
import InvoicePreview from "./InvoicePreview";
import { translations } from "../utils/translations";
import { downloadInvoiceImage, shareInvoice } from "../utils/imageExport";
import InvoicePreviewDesign2 from "./InvoicePreviewDesign2";
import InvoicePreviewDesign3 from "./InvoicePreviewDesign3";
import StampCanvas from "./StampCanvas";
import { saveVendorProfile, loadVendorProfile } from "../utils/storageController";
import * as pdfjsLib from "pdfjs-dist";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function BillGenerator({ onSaveInvoice, onCancel, lang = "en", currency = "USD", initialData = null, selectedDesign = 1, isEditMode = false, userProfile = null }) {
  const [imagePreview, setImagePreview] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState("");
  
  // OCR toast notification state
  const [ocrToast, setOcrToast] = useState(null);
  const [stampUrl, setStampUrl] = useState(null);
  const [partiesList, setPartiesList] = useState([]);
  const [inventoryList, setInventoryList] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!auth.currentUser) return;
        const uid = auth.currentUser.uid;
        const pQ = query(collection(db, "parties"), where("userId", "==", uid));
        const pSnap = await getDocs(pQ);
        setPartiesList(pSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        
        const iQ = query(collection(db, "inventory"), where("userId", "==", uid));
        const iSnap = await getDocs(iQ);
        setInventoryList(iSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error fetching data for autocomplete:", error);
      }
    };
    fetchData();
  }, []);
  const stampInputRef = useRef(null);
  
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const t = translations[lang] || translations["en"];
  const symbol = currency === "INR" ? "â‚¹" : "$";

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedItems = (items) => {
    if (!sortConfig.key) return items;
    return [...items].sort((a, b) => {
      let valA = a[sortConfig.key];
      let valB = b[sortConfig.key];
      
      // Calculate total if key is 'total'
      if (sortConfig.key === 'total') {
        valA = (parseFloat(a.quantity) || 0) * (parseFloat(a.rate) || 0);
        valB = (parseFloat(b.quantity) || 0) * (parseFloat(b.rate) || 0);
      } else if (sortConfig.key === 'quantity' || sortConfig.key === 'rate') {
        valA = parseFloat(valA) || 0;
        valB = parseFloat(valB) || 0;
      } else {
        valA = (valA || '').toString().toLowerCase();
        valB = (valB || '').toString().toLowerCase();
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Invoice form state â€” Privacy-first initialization:
  //   1. Edit/Copy mode: hydrate from initialData
  //   2. New invoice: load vendor profile (whitelisted fields only)
  //      Client fields and line items are always blank.
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [invoiceData, setInvoiceData] = useState(() => {
    if (initialData) {
      // Edit mode or Copy mode â€” hydrate the full invoice
      return { ...initialData, id: undefined };
    }
    
    // New invoice: load only whitelisted vendor profile
    const vendorProfile = loadVendorProfile();
    
    return {
      vendorName: userProfile?.companyName || vendorProfile.vendorName || "",
      vendorAddress: vendorProfile.vendorAddress || "",
      vendorPhone: vendorProfile.vendorPhone || "",
      vendorEmail: vendorProfile.vendorEmail || "",
      vendorPAN: vendorProfile.vendorPAN || "",
      vendorStateCode: vendorProfile.vendorStateCode || "",
      // Client fields: ALWAYS blank on new invoice (BLACKLISTED)
      clientName: "",
      clientAddress: userProfile?.defaultBillingAddress || "",
      clientState: "",
      clientStateCode: "",
      consigneeSameAsClient: false,
      consigneeName: "",
      consigneeAddress: userProfile?.defaultShippingAddress || "",
      consigneeGSTIN: "",
      consigneeState: "",
      consigneeStateCode: "",
      // Per-invoice fields: ALWAYS fresh
      invoiceNumber: "INV-" + Math.floor(100000 + Math.random() * 900000),
      date: new Date().toISOString().split("T")[0],
      // Core Financials
      shippingCharges: 0,
      freightCharges: 0,
      subtotal: 0,
      taxRate: 18,
      taxAmount: 0,
      total: 0,
      notes: "",
      gstRegime: "standard",
      gstinSupplier: "",
      gstinBuyer: "",
      bankName: "",
      accountName: "",
      accountNumber: "",
      ifscCode: "",
      branchName: "",
      // Spread the vendor profile on top â€” overwrites vendor fields only
      ...vendorProfile
    };
  });

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Auto-save vendor profile on vendor field changes.
  // This ONLY persists whitelisted keys â€” client data is excluded
  // by the storageController's extraction logic.
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const vendorDepsRef = useRef(null);
  useEffect(() => {
    // Debounce: only save when vendor fields actually change
    const vendorSnapshot = JSON.stringify([
      invoiceData.vendorName, invoiceData.vendorAddress, 
      invoiceData.vendorPhone, invoiceData.vendorEmail,
      invoiceData.vendorPAN, invoiceData.vendorStateCode,
      invoiceData.gstinSupplier, invoiceData.gstRegime,
      invoiceData.taxRate, invoiceData.reverseCharge,
      invoiceData.bankName, invoiceData.accountName,
      invoiceData.accountNumber, invoiceData.ifscCode,
      invoiceData.branchName, invoiceData.notes
    ]);
    
    if (vendorDepsRef.current !== vendorSnapshot) {
      vendorDepsRef.current = vendorSnapshot;
      saveVendorProfile(invoiceData);
    }
  }, [invoiceData]);

  const fileInputRef = useRef(null);

  // Recalculate subtotals, taxes, and totals dynamically
  useEffect(() => {
    const calculatedSubtotal = invoiceData.items.reduce((sum, item) => {
      const q = parseFloat(item.quantity) || 0;
      const r = parseFloat(item.rate) || 0;
      return sum + (q * r);
    }, 0);
    
    // Per-item tax calculation
    const calculatedTaxAmount = invoiceData.items.reduce((sum, item) => {
      const q = parseFloat(item.quantity) || 0;
      const r = parseFloat(item.rate) || 0;
      const tRate = parseFloat(item.taxRate ?? invoiceData.taxRate ?? 18) || 0;
      return sum + ((q * r) * (tRate / 100));
    }, 0);

    const shipping = parseFloat(invoiceData.shippingCharges) || 0;
    const freight = parseFloat(invoiceData.freightCharges) || 0;
    
    const roundedTaxAmount = Math.round(calculatedTaxAmount * 100) / 100;
    const calculatedTotal = Math.round((calculatedSubtotal + roundedTaxAmount + shipping + freight) * 100) / 100;

    setInvoiceData(prev => ({
      ...prev,
      subtotal: Math.round(calculatedSubtotal * 100) / 100,
      taxAmount: roundedTaxAmount,
      total: calculatedTotal
    }));
  }, [invoiceData.items, invoiceData.shippingCharges, invoiceData.freightCharges, invoiceData.taxRate]);

  // Auto-dismiss OCR toast after 6 seconds
  useEffect(() => {
    if (ocrToast) {
      const timer = setTimeout(() => setOcrToast(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [ocrToast]);

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // OCR / PDF Processing Pipeline
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const showOcrToast = (parsed) => {
    const meta = parsed.meta || { itemCount: parsed.items?.length || 0, confidence: "medium", warnings: [] };
    setOcrToast({
      itemCount: meta.itemCount,
      confidence: meta.confidence,
      warnings: meta.warnings
    });
  };

  const processFile = async (file) => {
    if (!file) return;

    if (file.type === "application/pdf") {
      setIsScanning(true);
      setScanProgress(0);
      setScanStatus("Parsing PDF text...");

      try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map(item => item.str).join(" ");
          fullText += pageText + "\n";
          setScanProgress(Math.round((i / pdf.numPages) * 100));
        }
        
        setIsScanning(false);
        setScanStatus("Completed successfully!");
        const parsed = parseOCRText(fullText);
        setInvoiceData(prev => ({
          ...prev,
          ...parsed,
          meta: undefined, // Don't store meta in invoice data
          gstRegime: "standard",
          taxRate: parsed.taxRate || 18,
          items: parsed.items?.map(item => ({
            ...item,
            id: Date.now() + Math.random(),
            hsnCode: "",
            unit: "PCS"
          })) || []
        }));
        showOcrToast(parsed);
        setStep(2);
      } catch (err) {
        console.error("PDF Parsing failed", err);
        setIsScanning(false);
        setScanStatus("Failed to parse PDF.");
      }
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
        setIsScanning(true);
        setScanProgress(0);
        setScanStatus("Initializing OCR Engine...");

        Tesseract.recognize(
          e.target.result,
          "eng",
          {
            logger: (m) => {
              if (m.status === "recognizing") {
                setScanStatus("Analyzing document texts...");
                setScanProgress(Math.round(m.progress * 100));
              } else {
                setScanStatus(m.status);
              }
            }
          }
        )
          .then(({ data: { text } }) => {
            setIsScanning(false);
            setScanStatus("Completed successfully!");
            const parsed = parseOCRText(text);
            setInvoiceData(prev => ({
              ...prev,
              ...parsed,
              meta: undefined,
              vendorName: parsed.vendorName || prev.vendorName,
              vendorAddress: parsed.vendorAddress || prev.vendorAddress,
              date: parsed.date || prev.date,
              invoiceNumber: parsed.invoiceNumber || prev.invoiceNumber,
              gstRegime: "standard",
              taxRate: parsed.taxRate || prev.taxRate || 18,
              items: [
                ...prev.items,
                ...(parsed.items?.map(item => ({
                  ...item,
                  id: Date.now() + Math.random(),
                  hsnCode: "",
                  unit: "PCS"
                })) || [])
              ]
            }));
            showOcrToast(parsed);
          })
          .catch((error) => {
            console.error(error);
            setIsScanning(false);
            setScanStatus("Error scanning document.");
          });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStampSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = () => setStampUrl(reader.result);
        reader.readAsDataURL(file);
      } else {
        alert("Please upload an image file for the stamp.");
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add("drag-over");
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove("drag-over");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove("drag-over");
    const file = e.dataTransfer.files[0];
    if (file) {
      if (file.type.startsWith("image/") || file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        processFile(file);
      } else {
        alert("Please upload a supported image or PDF file.");
      }
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      processFile(file);
    }
  };

  // Manual fallback initialization
  const handleManualStart = () => {
    // Load vendor profile for auto-fill, keep client fields blank
    const vendorProfile = loadVendorProfile();
    setInvoiceData(prev => ({
      ...prev,
      ...vendorProfile,
      // Ensure client fields stay blank
      clientName: prev.clientName || "",
      clientAddress: prev.clientAddress || "",
      clientState: prev.clientState || "",
      clientStateCode: prev.clientStateCode || "",
      invoiceNumber: prev.invoiceNumber || ("INV-" + Math.floor(100000 + Math.random() * 900000)),
      date: prev.date || new Date().toISOString().split("T")[0],
      items: prev.items.length > 0 ? prev.items : [
        { id: Date.now(), description: "Professional Services", quantity: 1, rate: 0, hsnCode: "", unit: "PCS", total: 0 }
      ]
    }));
    setStep(2);
  };

  const handleInputChange = (field, value) => {
    setInvoiceData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleItemChange = (itemId, field, value) => {
    setInvoiceData(prev => {
      const updatedItems = prev.items.map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item, [field]: value };
          const q = parseFloat(updatedItem.quantity) || 0;
          const r = parseFloat(updatedItem.rate) || 0;
          updatedItem.total = Math.round((q * r) * 100) / 100;
          return updatedItem;
        }
        return item;
      });
      return { ...prev, items: updatedItems };
    });
  };

  const handleAddItem = () => {
    const newItem = {
      id: Date.now() + Math.random(),
      description: "Additional Billing Item",
      quantity: 1,
      rate: 100,
      hsnCode: "",
      unit: "PCS",
      total: 100
    };
    setInvoiceData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const handleRemoveItem = (itemId) => {
    if (invoiceData.items.length <= 1) {
      alert("At least one line item is required on a corporate bill.");
      return;
    }
    setInvoiceData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }));
  };

  // Save to dashboard without printing
  const handleSaveOnly = () => {
    if (!invoiceData.vendorName) {
      alert("Please provide a valid Merchant/Vendor Name.");
      return;
    }
    
    onSaveInvoice({
      ...invoiceData,
      currency: currency
    });
  };

  // Web Share API trigger
  const handleShareInvoice = async () => {
    try {
      const canvasElement = document.getElementById("printable-invoice");
      if (!canvasElement) return;
      
      const canvas = await import("html2canvas").then(h => h.default(canvasElement, { 
        scale: 2, 
        backgroundColor: "#ffffff",
        onclone: (clonedDoc) => {
          const el = clonedDoc.getElementById("printable-invoice");
          if(el) el.style.transform = "none";
        }
      }));
      canvas.toBlob(async (blob) => {
        const result = await shareInvoice(invoiceData, blob);
        if (result.success && result.method === "fallback") {
          const openMethod = window.confirm("Web share completed. Would you like to share via WhatsApp message fallback?");
          if (openMethod) {
            window.open(result.urls.whatsapp, "_blank");
          }
        }
      }, "image/png");
    } catch (e) {
      alert("Error sharing invoice.");
    }
  };

  // Finalize PDF save trigger
  const handleFinalizeAndPrint = async () => {
    if (!invoiceData.vendorName) {
      alert("Please provide a valid Merchant/Vendor Name.");
      return;
    }
    
    onSaveInvoice({
      ...invoiceData,
      currency: currency
    });
    
    // Generate PDF using html2canvas and jsPDF
    try {
      const captureArea = document.getElementById("invoice-capture-area");
      if (!captureArea) {
        window.print(); // Fallback
        return;
      }
      
      const canvas = await html2canvas(captureArea, {
        scale: 2,
        useCORS: true,
        logging: false
      });
      
      const imgData = canvas.toDataURL("image/jpeg", 1.0);
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${invoiceData.invoiceNumber || "Invoice"}.pdf`);
      
    } catch (err) {
      console.error("Error generating PDF:", err);
      // Fallback
      window.print();
    }
  };

  // Dynamic button labels based on edit mode
  const saveLabel = isEditMode ? "ðŸ’¾ Update Invoice" : "ðŸ’¾ Save Invoice";
  const printLabel = isEditMode ? "Update & Print" : t.btnSavePrint;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Step Indicators */}
      <div className="wizard-steps">
        <div className={`step-indicator ${step === 1 ? "active" : ""}`}>
          <span className="step-number">1</span>
          <span>{t.step1Title}</span>
        </div>
        <div style={{ width: "80px", height: "1px", backgroundColor: "var(--border)" }}></div>
        <div className={`step-indicator ${step === 2 ? "active" : ""}`}>
          <span className="step-number">2</span>
          <span>{t.step2Title}</span>
        </div>
      </div>

      {/* OCR Toast Notification */}
      {ocrToast && (
        <div 
          className="ocr-toast"
          onClick={() => setOcrToast(null)}
          style={{
            padding: "1rem 1.5rem",
            backgroundColor: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "var(--radius-md)",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            cursor: "pointer",
            animation: "fadeIn 0.3s ease"
          }}
        >
          <span style={{ fontSize: "1.5rem" }}>âœ…</span>
          <div>
            <strong style={{ color: "#166534" }}>
              Scanner integration successful: {ocrToast.itemCount} item{ocrToast.itemCount !== 1 ? 's' : ''} automatically added.
            </strong>
            <p style={{ fontSize: "0.8rem", color: "#15803d", marginTop: "0.25rem" }}>
              Confidence: {ocrToast.confidence}. Please verify descriptions and pricing. Click to dismiss.
            </p>
            {ocrToast.warnings.length > 0 && (
              <p style={{ fontSize: "0.75rem", color: "#a16207", marginTop: "0.25rem" }}>
                âš ï¸ {ocrToast.warnings.join(" â€¢ ")}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Edit Mode Banner */}
      {isEditMode && (
        <div style={{
          padding: "0.75rem 1.5rem",
          backgroundColor: "#eff6ff",
          border: "1px solid #bfdbfe",
          borderRadius: "var(--radius-md)",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          fontSize: "0.85rem",
          color: "#1e40af"
        }}>
          <span style={{ fontSize: "1.2rem" }}>âœï¸</span>
          <strong>Edit Mode</strong> â€” You are editing an existing invoice. Changes will update the original record.
        </div>
      )}

      {/* Invoice Form Editor & A4 Live Preview */}
      <div className="builder-split-view">
          {/* Left Panel: Invoice Details & Items Form Editor */}
          <div className="section-container form-section">
            <div>
              <h2 style={{ fontSize: "1.2rem", marginBottom: "0.25rem" }}>{isEditMode ? "Edit Invoice Details" : t.refineTitle}</h2>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                {isEditMode ? "Modify the fields below and save to update the original invoice." : t.refineSubtitle}
              </p>
            </div>

            {/* General Corporate Metadata */}
            <div className="form-group-row">
              <div className="form-group">
                <label htmlFor="vendorName">{t.labelMerchant}</label>
                <input 
                  type="text" 
                  id="vendorName" 
                  value={invoiceData.vendorName} 
                  onChange={(e) => handleInputChange("vendorName", e.target.value)}
                  placeholder="e.g. Apple Inc, Reliance Retail"
                />
              </div>
              <div className="form-group">
                <label htmlFor="invoiceNumber">{t.labelInvoiceNum}</label>
                <input 
                  type="text" 
                  id="invoiceNumber" 
                  value={invoiceData.invoiceNumber} 
                  onChange={(e) => handleInputChange("invoiceNumber", e.target.value)}
                  placeholder="e.g. INV-203923"
                />
              </div>
            </div>

            <div className="form-group-row">
              <div className="form-group" style={{ maxWidth: "50%" }}>
                <label htmlFor="date">{t.labelDate}</label>
                <input 
                  type="date" 
                  id="date" 
                  value={invoiceData.date} 
                  onChange={(e) => handleInputChange("date", e.target.value)}
                />
              </div>
            </div>

            {/* Shipping & Handling */}
            <div className="form-group-row">
              <div className="form-group">
                <label htmlFor="shippingCharges">Delivery Charges</label>
                <input 
                  type="number" 
                  id="shippingCharges" 
                  min="0"
                  value={invoiceData.shippingCharges} 
                  onChange={(e) => handleInputChange("shippingCharges", e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="form-group">
                <label htmlFor="freightCharges">Freight Charges</label>
                <input 
                  type="number" 
                  id="freightCharges" 
                  min="0"
                  value={invoiceData.freightCharges} 
                  onChange={(e) => handleInputChange("freightCharges", e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Indian GST Regime Toggles & GSTIN Numbers */}
            <div className="form-group-row">
              <div className="form-group">
                <label htmlFor="gstRegime">{t.taxRegime}</label>
                <select 
                  id="gstRegime" 
                  value={invoiceData.gstRegime}
                  onChange={(e) => handleInputChange("gstRegime", e.target.value)}
                  className="select-pref"
                  style={{ width: "100%", padding: "0.55rem" }}
                >
                  <option value="standard">{t.standardTax}</option>
                  <option value="intrastate">{t.intrastateGST}</option>
                  <option value="interstate">{t.interstateGST}</option>
                </select>
              </div>
            </div>

            {invoiceData.gstRegime !== "standard" && (
              <div className="form-group-row">
                <div className="form-group">
                  <label htmlFor="gstinSupplier">{t.labelGSTIN}</label>
                  <input 
                    type="text" 
                    id="gstinSupplier" 
                    value={invoiceData.gstinSupplier}
                    onChange={(e) => handleInputChange("gstinSupplier", e.target.value.toUpperCase())}
                    placeholder="e.g. 27AAPCG2910R1Z2"
                    style={{ fontFamily: "monospace" }}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="gstinBuyer">{t.labelClientGSTIN}</label>
                  <input 
                    type="text" 
                    id="gstinBuyer" 
                    value={invoiceData.gstinBuyer}
                    onChange={(e) => handleInputChange("gstinBuyer", e.target.value.toUpperCase())}
                    placeholder="e.g. 27AADCB0910A1Z5"
                    style={{ fontFamily: "monospace" }}
                  />
                </div>
              </div>
            )}

            {/* Line Items Dynamic Grid */}
            <div className="form-group">
              <div className="flex justify-between items-end mb-2">
                <label style={{ marginBottom: 0 }}>{t.labelItems}</label>
                <div>
                  <button 
                    type="button"
                    className="btn btn-secondary flex items-center gap-2" 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isScanning}
                    style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}
                  >
                    {isScanning ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-slate-600 border-t-transparent rounded-full"></div>
                        {scanStatus || "Processing..."}
                      </>
                    ) : (
                      <>
                        <span>ðŸ“¸</span> Scan Receipt/Invoice
                      </>
                    )}
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileSelect} 
                    accept="image/*,application/pdf" 
                    style={{ display: "none" }}
                  />
                </div>
              </div>
              
              {isScanning && (
                <div className="w-full bg-slate-100 rounded-full h-1.5 mb-4 overflow-hidden">
                  <div className="bg-slate-900 h-1.5 rounded-full transition-all duration-300" style={{ width: `${scanProgress}%` }}></div>
                </div>
              )}

              <div className="items-editor">
                <div className="items-editor-header" style={{ gridTemplateColumns: invoiceData.gstRegime !== "standard" ? "1.8fr 1fr 0.6fr 0.6fr 0.8fr 0.8fr 0.4fr" : "2fr 0.6fr 0.6fr 1fr 1fr 0.4fr" }}>
                  <span onClick={() => handleSort('description')} className="cursor-pointer hover:text-slate-900 transition-colors flex items-center gap-1">
                    Description {sortConfig.key === 'description' && (sortConfig.direction === 'asc' ? 'â†‘' : 'â†“')}
                  </span>
                  {invoiceData.gstRegime !== "standard" && <span>{t.labelHSN}</span>}
                  <span onClick={() => handleSort('quantity')} className="cursor-pointer hover:text-slate-900 transition-colors flex items-center gap-1 justify-center" style={{ textAlign: "center" }}>
                    Qty {sortConfig.key === 'quantity' && (sortConfig.direction === 'asc' ? 'â†‘' : 'â†“')}
                  </span>
                  <span style={{ textAlign: "center" }}>{t.unitOfMeasurement || "Unit"}</span>
                  <span onClick={() => handleSort('rate')} className="cursor-pointer hover:text-slate-900 transition-colors flex items-center gap-1 justify-end" style={{ textAlign: "right" }}>
                    Rate ({symbol}) {sortConfig.key === 'rate' && (sortConfig.direction === 'asc' ? 'â†‘' : 'â†“')}
                  </span>
                  <span onClick={() => handleSort('total')} className="cursor-pointer hover:text-slate-900 transition-colors flex items-center gap-1 justify-end" style={{ textAlign: "right" }}>
                    Amount ({symbol}) {sortConfig.key === 'total' && (sortConfig.direction === 'asc' ? 'â†‘' : 'â†“')}
                  </span>
                  <span></span>
                </div>
                
                {getSortedItems(invoiceData.items).map((item) => (
                  <div key={item.id} className="item-row" style={{ gridTemplateColumns: invoiceData.gstRegime !== "standard" ? "1.8fr 1fr 0.6fr 0.6fr 0.8fr 0.8fr 0.4fr" : "2fr 0.6fr 0.6fr 1fr 1fr 0.4fr" }}>
                    <input type="text" value={item.description} onChange={(e) => {
                      const val = e.target.value;
                      handleItemChange(item.id, "description", val);
                      const invItem = inventoryList.find(i => i.name === val);
                      if (invItem) {
                        handleItemChange(item.id, "rate", invItem.price || 0);
                        handleItemChange(item.id, "hsnCode", invItem.hsn || "");
                        handleItemChange(item.id, "unit", invItem.unit || "PCS");
                      }
                    }} placeholder="Consulting services..." style={{ padding: "0.4rem 0.6rem", fontSize: "0.85rem" }} data-label="Description" list="inventory-list" />
                    {invoiceData.gstRegime !== "standard" && (
                      <input 
                        type="text"
                        value={item.hsnCode || ""}
                        onChange={(e) => handleItemChange(item.id, "hsnCode", e.target.value)}
                        placeholder="HSN/SAC Code"
                        style={{ padding: "0.4rem 0.6rem", fontSize: "0.85rem", textAlign: "center", fontFamily: "monospace" }}
                        data-label="HSN"
                      />
                    )}
                    <input 
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(item.id, "quantity", e.target.value)}
                      style={{ padding: "0.4rem 0.6rem", fontSize: "0.85rem", textAlign: "center" }}
                      data-label="Qty"
                    />
                    <input 
                      type="text"
                      value={item.unit || "PCS"}
                      onChange={(e) => handleItemChange(item.id, "unit", e.target.value)}
                      style={{ padding: "0.4rem 0.6rem", fontSize: "0.85rem", textAlign: "center", textTransform: "uppercase" }}
                      data-label="Unit"
                    />
                    <input 
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.rate}
                      onChange={(e) => handleItemChange(item.id, "rate", e.target.value)}
                      style={{ padding: "0.4rem 0.6rem", fontSize: "0.85rem", textAlign: "right" }}
                      data-label="Rate"
                    />
                    {invoiceData.gstRegime !== "standard" && (
                      <select
                        value={item.taxRate ?? invoiceData.taxRate ?? 18}
                        onChange={(e) => handleItemChange(item.id, "taxRate", e.target.value)}
                        style={{ padding: "0.4rem 0.6rem", fontSize: "0.85rem", textAlign: "center", minWidth: "70px" }}
                        data-label="GST %"
                      >
                        <option value="0">0%</option>
                        <option value="5">5%</option>
                        <option value="12">12%</option>
                        <option value="18">18%</option>
                        <option value="28">28%</option>
                      </select>
                    )}
                    <span className="item-total text-right" style={{ fontWeight: "600" }} data-label="Amount">
                      {(item.quantity * item.rate).toFixed(2)}
                    </span>
                    <button 
                      className="btn-remove" 
                      onClick={() => handleRemoveItem(item.id)}
                      title="Remove Item"
                      type="button"
                    >
                      ðŸ—‘ï¸
                    </button>
                  </div>
                ))}
              </div>
              <button 
                type="button"
                className="btn btn-secondary" 
                onClick={handleAddItem}
                style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem", alignSelf: "flex-start", marginTop: "0.5rem" }}
              >
                {t.btnAddItem}
              </button>
            </div>

            {/* Advanced Google Form-Style Sections */}
            <h2 style={{ fontSize: "1.1rem", marginTop: "1rem", color: "var(--primary)", borderBottom: "1px solid var(--border)", paddingBottom: "0.25rem" }}>
              {t.advancedFormTitle}
            </h2>

            {/* Vendor Details Form Card */}
            <div style={{ backgroundColor: "var(--bg-canvas)", border: "1px solid var(--border)", borderRadius: "8px", padding: "1rem", marginTop: "1rem", borderTop: "4px solid var(--primary)" }}>
              <h3 style={{ fontSize: "0.95rem", marginBottom: "1rem" }}>{t.vendorDetails}</h3>
              <div className="form-group-row">
                <div className="form-group">
                  <label>{t.vendorPAN}</label>
                  <input type="text" value={invoiceData.vendorPAN} onChange={(e) => handleInputChange("vendorPAN", e.target.value.toUpperCase())} placeholder="ABCDE1234F" />
                </div>
                <div className="form-group">
                  <label>Vendor GSTIN</label>
                  <input type="text" value={invoiceData.gstinSupplier} onChange={(e) => handleInputChange("gstinSupplier", e.target.value.toUpperCase())} placeholder="e.g. 27AAPCG2910R1Z2" />
                </div>
                <div className="form-group">
                  <label>{t.vendorStateCode}</label>
                  <input type="text" value={invoiceData.vendorStateCode} onChange={(e) => handleInputChange("vendorStateCode", e.target.value)} placeholder="e.g. 27" />
                </div>
              </div>
              <div className="form-group-row">
                <div className="form-group">
                  <label>{t.vendorPhone}</label>
                  <input type="text" value={invoiceData.vendorPhone} onChange={(e) => handleInputChange("vendorPhone", e.target.value)} placeholder="+91 XXXXXXXXXX" />
                </div>
                <div className="form-group">
                  <label>{t.vendorEmail}</label>
                  <input type="text" value={invoiceData.vendorEmail} onChange={(e) => handleInputChange("vendorEmail", e.target.value)} placeholder="contact@merchant.com" />
                </div>
              </div>
              <div className="form-group">
                <label>{t.vendorAddress}</label>
                <textarea rows="2" value={invoiceData.vendorAddress} onChange={(e) => handleInputChange("vendorAddress", e.target.value)} placeholder="Building, Street, City, State..." />
              </div>
            </div>

            {/* Client & Consignee Details Form Card */}
            <div style={{ backgroundColor: "var(--bg-canvas)", border: "1px solid var(--border)", borderRadius: "8px", padding: "1rem", marginTop: "1rem", borderTop: "4px solid var(--accent)" }}>
              <h3 style={{ fontSize: "0.95rem", marginBottom: "1rem" }}>{t.clientDetails}</h3>
              <div className="form-group-row">
                <div className="form-group">
                  <label>Client Name</label>
                  <input type="text" value={invoiceData.clientName} onChange={(e) => {
                    const val = e.target.value;
                    handleInputChange("clientName", val);
                    const party = partiesList.find(p => p.name === val);
                    if (party) {
                      handleInputChange("clientAddress", party.address || "");
                      handleInputChange("gstinBuyer", party.gstin || "");
                      handleInputChange("clientState", party.state || "");
                      handleInputChange("clientStateCode", party.stateCode || "");
                      handleInputChange("clientPhone", party.phone || "");
                    }
                  }} placeholder="Client Company" list="parties-list" />
                </div>
                <div className="form-group">
                  <label>Client GSTIN</label>
                  <input type="text" value={invoiceData.gstinBuyer} onChange={(e) => handleInputChange("gstinBuyer", e.target.value.toUpperCase())} placeholder="e.g. 27AADCB0910A1Z5" />
                </div>
              </div>
              <div className="form-group-row">
                <div className="form-group">
                  <label>{t.clientState} & {t.clientStateCode}</label>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <input type="text" value={invoiceData.clientState} onChange={(e) => handleInputChange("clientState", e.target.value)} placeholder="State" style={{ flex: 2 }} />
                    <input type="text" value={invoiceData.clientStateCode} onChange={(e) => handleInputChange("clientStateCode", e.target.value)} placeholder="Code" style={{ flex: 1 }} />
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label>{t.clientAddress}</label>
                <textarea rows="2" value={invoiceData.clientAddress} onChange={(e) => handleInputChange("clientAddress", e.target.value)} placeholder="Client Address..." />
              </div>

              <h3 style={{ fontSize: "0.95rem", marginBottom: "1rem", marginTop: "1.5rem" }}>{t.consigneeDetails}</h3>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem", fontSize: "0.85rem" }}>
                  <input type="checkbox" checked={invoiceData.consigneeSameAsClient} onChange={(e) => handleInputChange("consigneeSameAsClient", e.target.checked)} />
                  {t.sameAsClient}
                  <button type="button" className="btn btn-secondary" style={{ marginLeft: "auto" }} onClick={() => {
                    handleInputChange("consigneeName", invoiceData.clientName);
                    handleInputChange("consigneeAddress", invoiceData.clientAddress);
                    handleInputChange("consigneeGSTIN", invoiceData.gstinBuyer);
                    handleInputChange("consigneeState", invoiceData.clientState);
                    handleInputChange("consigneeStateCode", invoiceData.clientStateCode);
                    handleInputChange("consigneeSameAsClient", false);
                  }}>{t.copyFromClient}</button>
                </div>

              {!invoiceData.consigneeSameAsClient && (
                <>
                  <div className="form-group-row">
                    <div className="form-group">
                      <label>{t.consigneeName}</label>
                      <input type="text" value={invoiceData.consigneeName} onChange={(e) => handleInputChange("consigneeName", e.target.value)} placeholder="Consignee Name" />
                    </div>
                    <div className="form-group">
                      <label>{t.consigneeGSTIN}</label>
                      <input type="text" value={invoiceData.consigneeGSTIN} onChange={(e) => handleInputChange("consigneeGSTIN", e.target.value.toUpperCase())} placeholder="GSTIN" />
                    </div>
                  </div>
                  <div className="form-group-row">
                    <div className="form-group">
                      <label>{t.consigneeState} & {t.consigneeStateCode}</label>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <input type="text" value={invoiceData.consigneeState} onChange={(e) => handleInputChange("consigneeState", e.target.value)} placeholder="State" style={{ flex: 2 }} />
                        <input type="text" value={invoiceData.consigneeStateCode} onChange={(e) => handleInputChange("consigneeStateCode", e.target.value)} placeholder="Code" style={{ flex: 1 }} />
                      </div>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>{t.consigneeAddress}</label>
                    <textarea rows="2" value={invoiceData.consigneeAddress} onChange={(e) => handleInputChange("consigneeAddress", e.target.value)} placeholder="Consignee Address..." />
                  </div>
                </>
              )}
            </div>

            {/* Bank Details Form Card */}
            <div style={{ backgroundColor: "var(--bg-canvas)", border: "1px solid var(--border)", borderRadius: "8px", padding: "1rem", marginTop: "1rem", borderTop: "4px solid #6b7280" }}>
              <h3 style={{ fontSize: "0.95rem", marginBottom: "1rem" }}>{t.bankDetails}</h3>
              <div className="form-group-row">
                <div className="form-group">
                  <label>{t.bankName}</label>
                  <input type="text" value={invoiceData.bankName} onChange={(e) => handleInputChange("bankName", e.target.value)} placeholder="e.g. IDFC FIRST Bank" />
                </div>
                <div className="form-group">
                  <label>{t.branchName}</label>
                  <input type="text" value={invoiceData.branchName} onChange={(e) => handleInputChange("branchName", e.target.value)} placeholder="Branch Name" />
                </div>
              </div>
              <div className="form-group-row">
                <div className="form-group">
                  <label>{t.accountName}</label>
                  <input type="text" value={invoiceData.accountName} onChange={(e) => handleInputChange("accountName", e.target.value)} placeholder="Account Name" />
                </div>
              </div>
              <div className="form-group-row">
                <div className="form-group">
                  <label>{t.accountNumber}</label>
                  <input type="text" value={invoiceData.accountNumber} onChange={(e) => handleInputChange("accountNumber", e.target.value)} placeholder="Account Number" />
                </div>
                <div className="form-group">
                  <label>{t.ifscCode}</label>
                  <input type="text" value={invoiceData.ifscCode} onChange={(e) => handleInputChange("ifscCode", e.target.value.toUpperCase())} placeholder="IFSC Code" />
                </div>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: "1rem" }}>
              <label htmlFor="notes">{t.termsConditions}</label>
              <textarea 
                id="notes" 
                rows="4"
                value={invoiceData.notes} 
                onChange={(e) => handleInputChange("notes", e.target.value)}
                placeholder={"1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. will be charged if not paid within 7 days."}
              />
            </div>

            {/* Stepper Control Footer */}
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem", borderTop: "1px solid var(--border)", paddingTop: "1.25rem", flexWrap: "wrap" }}>
              <button className="btn btn-secondary" onClick={onCancel} style={{ flex: 1, minWidth: "120px" }}>
                {t.btnCancel}
              </button>
              <button className="btn btn-secondary" onClick={handleSaveOnly} style={{ flex: 1, minWidth: "120px" }}>
                {saveLabel}
              </button>
              <button className="btn btn-secondary" onClick={handleShareInvoice} style={{ flex: 1, minWidth: "120px" }}>
                ðŸ”— {t.btnShare}
              </button>
              <button className="btn btn-accent" onClick={handleFinalizeAndPrint} style={{ flex: 1.8, minWidth: "160px" }}>
                {printLabel}
              </button>
            </div>
          </div>

          {/* Right Panel: High-Fidelity A4 Live Invoice Preview */}
          <div className="preview-pane-sticky">
            <div className="preview-pane-header">
              <div className="flex items-center gap-4">
                <h3>{t.livePreviewTitle}</h3>
                <button 
                  className="btn btn-secondary flex items-center gap-1"
                  onClick={() => stampInputRef.current?.click()}
                  style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem" }}
                  title="Upload Stamp Overlay"
                >
                  <span style={{ fontSize: "1rem" }}>ðŸ’®</span> Add Stamp
                </button>
                <input 
                  type="file" 
                  ref={stampInputRef} 
                  onChange={handleStampSelect} 
                  accept="image/*" 
                  style={{ display: "none" }}
                />
              </div>
              <span style={{ fontSize: "0.75rem", color: "var(--success)", fontWeight: "600" }}>
                {t.synchronized}
              </span>
            </div>
            <div className="preview-scale-wrapper">
              <div id="invoice-capture-area" style={{ width: "100%", height: "100%", backgroundColor: "white" }}>
                <StampCanvas stampUrl={stampUrl} signatureUrl={userProfile?.signatureData}>
                  {selectedDesign === 1 && <InvoicePreview data={invoiceData} lang={lang} currency={currency} />}
                  {selectedDesign === 2 && <InvoicePreviewDesign2 data={invoiceData} lang={lang} currency={currency} />}
                  {selectedDesign === 3 && <InvoicePreviewDesign3 data={invoiceData} lang={lang} currency={currency} />}
                </StampCanvas>
              </div>
            </div>
          </div>
        </div>
          <datalist id="parties-list">
        {partiesList.map(p => <option key={p.id} value={p.name} />)}
      </datalist>
      <datalist id="inventory-list">
        {inventoryList.map(i => <option key={i.id} value={i.name} />)}
      </datalist>
    </div>
  );
}


