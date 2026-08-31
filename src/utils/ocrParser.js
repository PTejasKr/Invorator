export function parseOCRText(rawText, imagePath) {
  const data = { vendorName: "", vendorAddress: "", invoiceNumber: "", date: "", items: [], taxRate: 0, taxAmount: 0, subtotal: 0, total: 0, notes: "Auto-extracted from document scan." };
  const meta = { itemCount: 0, confidence: "low", warnings: [] };
  if (!rawText) return { ...data, meta };
  const text = rawText; 
  const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) return { ...data, meta };
  
  const ignoreVendorKeywords = /invoice|receipt|bill|date|tel|phone|fax|mobile|web|www|email|http|cash|payment|welcome|tax|inv|gst|vat|no\.|order|slip|memo|quotation|estimate|proforma/i;
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const cand = lines[i];
    if (cand.length > 2 && !ignoreVendorKeywords.test(cand) && !/^\d{4,}/.test(cand) && /[a-zA-Z]{2,}/.test(cand)) {
      data.vendorName = cand; break;
    }
  }
  if (!data.vendorName && lines.length > 0) { data.vendorName = lines[0]; meta.warnings.push("Vendor name fallback: used first line of document."); }
  
  const dateRegexes = [/\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/, /\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/, /\b(\d{1,2})?\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{1,2})?,?\s*(\d{2,4})\b/i];
  for (const line of lines) { let found = false; for (const r of dateRegexes) { const m = line.match(r); if (m) { data.date = m[0]; found = true; break; } } if (found) break; }
  if (!data.date) { data.date = new Date().toISOString().split("T")[0]; meta.warnings.push("No date found — defaulted to today."); }
  
  const invRegexes = [/(?:invoice|inv|bill|receipt|doc|transaction|order)\s*(?:no|num|number|#)?[:\s#-]*([a-z0-9][\w-]{2,})/i, /#\s*([a-z0-9][\w-]{2,})/i];
  for (const line of lines) { let found = false; for (const r of invRegexes) { const m = line.match(r); if (m && m[1] && m[1].length > 2) { data.invoiceNumber = m[1].toUpperCase(); found = true; break; } } if (found) break; }
  if (!data.invoiceNumber) { data.invoiceNumber = "INV-" + Math.floor(100000 + Math.random() * 900000); meta.warnings.push("No invoice number found — auto-generated."); }
  
  const allAmounts = []; 
  for (const line of lines) { 
    if (/^(Date|Tel|Phone|Fax|Email|Web)/i.test(line)) continue; 
    const matches = line.match(/(?:^|\s)[$€£?]?\s*(\d{1,6}(?:[.,]\d{2}))(?:\s|$)/g); 
    if (matches) { 
      for (const m of matches) { 
        const v = parseFloat(m.replace(/[^\d.]/g, "")); 
        if (!isNaN(v) && v > 0) allAmounts.push({ line, val: v }); 
      } 
    } 
  }
  
  let rawTotal = 0, rawSubtotal = 0, rawTax = 0;
  for (const {line, val} of allAmounts) { 
    const l = line.toLowerCase();
    const txt = text.toLowerCase();
    if (l.includes("grand total") || l.includes("net payable") || l.includes("invoice total") || (txt.includes("total") && !txt.includes("sub") && !txt.includes("tax") && !txt.includes("gst") && !txt.includes("vat")) ) {
      rawTotal = Math.max(rawTotal, val); 
    } else if (txt.includes("subtotal") || txt.includes("sub total") || txt.includes("net amount") || txt.includes("taxable value") || txt.includes("base amount") ) {
      rawSubtotal = Math.max(rawSubtotal, val); 
    } else if (txt.includes("tax") || txt.includes("gst") || txt.includes("vat") || txt.includes("cgst") || txt.includes("sgst") || txt.includes("igst") || txt.includes("cess") ) {
      rawTax += val; 
    } 
  }
  
  if (rawTotal === 0 && allAmounts.length > 0) rawTotal = Math.max(...allAmounts.map(a => a.val));
  if (rawSubtotal === 0 && rawTotal > 0 && rawTax > 0) rawSubtotal = rawTotal - rawTax;
  else if (rawTax === 0 && rawTotal > 0 && rawSubtotal > 0 && rawTotal > rawSubtotal) rawTax = Math.round((rawTotal - rawSubtotal) * 100) / 100;
  data.total = Math.round(rawTotal * 100) / 100; data.subtotal = Math.round(rawSubtotal * 100) / 100; data.taxAmount = Math.round(rawTax * 100) / 100; if (data.subtotal > 0) data.taxRate = Math.round((data.taxAmount / data.subtotal) * 100);
  
  const tabulatedPattern = /^(?:\d{1,3}[\s.)\-]+)?(.+?[a-zA-Z].+?)\s+(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)\s*$/;
  const billingKeywords = /^(total|subtotal|sub\s*total|tax|gst|vat|balance|due|cash|change|payment|visa|mastercard|card|invoice|bill|date|inv|no\.|tel|phone|email|thank|www|http|amount\s*(in|payable)|grand|net|cgst|sgst|igst|cess|round)/i;
  for (const line of lines) { 
    if (billingKeywords.test(line.trim())) continue; 
    const tabMatch = line.match(tabulatedPattern); 
    if (tabMatch) { 
      const desc = tabMatch[1].trim(); 
      const qty = parseFloat(tabMatch[2]) || 1; 
      const rate = parseFloat(tabMatch[3].replace(",", ".")) || 0; 
      const amount = parseFloat(tabMatch[4].replace(",", ".")) || 0; 
      const expected = qty * rate; 
      const tol = Math.max(expected * 0.1, 1); 
      if (desc.length > 1 && amount > 0 && Math.abs(expected - amount) <= tol) { 
        data.items.push({ id: Math.floor(Math.random()*10000000), description: desc, quantity: qty, rate: rate, taxRate: 0, total: amount }); 
      } 
    } 
  }
  
  if (data.items.length === 0) { 
    for (const line of lines) { 
      if (billingKeywords.test(line.trim())) continue; 
      const itemMatch = line.match(/^(.+?[a-zA-Z].*?)\s+[$£€?]?\s*(\d{1,6}(?:[.,]\d{3})*(?:[.,]\d{2}))[^\d]*$/i); 
      if (itemMatch) { 
        const desc = itemMatch[1].trim(); 
        const price = parseFloat(itemMatch[2].replace(",", ".")); 
        let qty = 1, rate = price; 
        const qtyPatterns = [/(\d+)\s*(?:x|×)\s*[$£€?]?\s*(\d+[.,]\d{2})/i, /(\d+)\s*@\s*[$£€?]?\s*(\d+[.,]\d{2})/i, /qty[:\s]*\d+\s.*?rate[:\s]*[$£€?]?\s*(\d+[.,]\d{2})/i, /(\d+)\s*(?:nos?|pcs?|units?)\b/i ]; 
        for (const p of qtyPatterns) { 
          const qm = desc.match(p); 
          if (qm) { 
            qty = parseFloat(qm[1]) || 1; 
            if (qm[2]) rate = parseFloat(qm[2].replace(",", ".")) || price; 
            else rate = price / qty; 
          } 
        }
        if (desc.length > 2 && price > 0 && price <= data.total) { 
          data.items.push({ id: Math.floor(Math.random()*10000000), description: desc.replace(/\d+\s*(?:x|×|@)\s*[$£€?]?\s*\d+[.,]\d{2}/i, "").trim(), quantity: qty, rate: rate, taxRate: 0, total: price }); 
        } 
      } 
    } 
  }
  
  if (data.items.length === 0) { 
    data.items.push({ id: Math.floor(Math.random()*10000000), description: "Transaction Items (Consulting/Services)", quantity: 1, rate: data.subtotal, taxRate: 0, total: data.subtotal }); 
    meta.warnings.push("No individual line items detected — created single aggregate item."); 
  }
  
  meta.itemCount = data.items.length;
  let score = 0; 
  if (data.vendorName && !meta.warnings.some(w=>w.includes("Vendor"))) score++; 
  if (data.date && !meta.warnings.some(w=>w.includes("date"))) score++; 
  if (data.invoiceNumber && !meta.warnings.some(w=>w.includes("invoice"))) score++; 
  if (data.total > 0) score++; 
  if (data.items.length > 0 && !meta.warnings.some(w=>w.includes("aggregate"))) score++; 
  
  meta.confidence = score >= 4 ? "high" : score >= 2 ? "medium" : "low";
  data.meta = meta;
  return data;
}
