import React, { useState, useEffect } from 'react';
import '../styles/invoice.css';
import { calculateInvoiceTotals, formatCurrency } from '../utils/calculations';

export default function InvoiceEditor({ 
  initialData, 
  userProfile, 
  onSave, 
  onCancel,
  isEditMode = false 
}) {
  // Merge initialData with userProfile defaults for vendor
  const [invoice, setInvoice] = useState(() => {
    const data = initialData || {};
    return {
      logo: data.logo || userProfile?.logoUrl || '',
      vendorName: data.vendorName || userProfile?.companyName || '',
      vendorAddress: data.vendorAddress || userProfile?.defaultBillingAddress || '',
      clientName: data.clientName || '',
      clientAddress: data.clientAddress || '',
      invoiceNumber: data.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
      date: data.date || new Date().toISOString().split('T')[0],
      paymentTerms: data.paymentTerms || '',
      dueDate: data.dueDate || '',
      poNumber: data.poNumber || '',
      items: data.items && data.items.length > 0 ? data.items : [
        { description: '', quantity: 1, rate: 0, amount: 0 }
      ],
      discount: data.discount || 0,
      shipping: data.shipping || 0,
      taxRate: data.taxRate || 0,
      amountPaid: data.amountPaid || 0,
      notes: data.notes || '',
      terms: data.terms || '',
      currency: data.currency || 'USD'
    };
  });

  const [totals, setTotals] = useState({
    subtotal: 0,
    tax: 0,
    total: 0,
    balance: 0
  });

  useEffect(() => {
    // Recalculate whenever items or global numeric fields change
    const result = calculateInvoiceTotals(
      invoice.items,
      invoice.discount,
      invoice.shipping,
      invoice.taxRate,
      invoice.amountPaid
    );
    
    // Auto-update item amounts in state if they don't match (to keep state in sync)
    let itemsChanged = false;
    const newItems = invoice.items.map((it, i) => {
      const computedAmount = result.items[i].amount;
      if (it.amount !== computedAmount) {
        itemsChanged = true;
        return { ...it, amount: computedAmount };
      }
      return it;
    });

    if (itemsChanged) {
      setInvoice(prev => ({ ...prev, items: newItems }));
    }

    setTotals({
      subtotal: result.subtotal,
      tax: result.tax,
      total: result.total,
      balance: result.balance
    });
  }, [invoice.items, invoice.discount, invoice.shipping, invoice.taxRate, invoice.amountPaid]);

  const handleFieldChange = (field, value) => {
    setInvoice(prev => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...invoice.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setInvoice(prev => ({ ...prev, items: newItems }));
  };

  const addItem = () => {
    setInvoice(prev => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 1, rate: 0, amount: 0 }]
    }));
  };

  const removeItem = (index) => {
    if (invoice.items.length === 1) return;
    setInvoice(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleSaveOnly = () => {
    // Save to DB via onSave prop
    onSave({
      ...invoice,
      ...totals
    });
  };

  return (
    <div className="flex flex-col items-center py-8 bg-slate-50 min-h-screen">
      <div className="w-full max-w-4xl flex justify-between items-center mb-4 px-4">
        <h1 className="text-2xl font-bold text-slate-800">
          {isEditMode ? 'Edit Invoice' : 'New Invoice'}
        </h1>
        <div className="flex gap-2">
          <button onClick={onCancel} className="btn bg-slate-200 text-slate-800 px-4 py-2 rounded-lg hover:bg-slate-300">
            Cancel
          </button>
          <button onClick={handleSaveOnly} className="btn bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            Save Invoice
          </button>
        </div>
      </div>

      <div className="invoice-document editor-mode shadow-xl relative group">
        <div className="invoice-header">
          <div className="w-1/2">
            {/* Logo placeholder - click to upload logic could go here */}
            {invoice.logo ? (
               <img src={invoice.logo} alt="Logo" className="invoice-logo" />
            ) : (
               <div className="w-32 h-16 border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-sm rounded bg-slate-50 cursor-pointer">
                 + Add Logo
               </div>
            )}
          </div>
          <div className="w-1/2 text-right">
            <h1 className="invoice-title">INVOICE</h1>
          </div>
        </div>

        <div className="invoice-parties">
          <div className="invoice-party-col pr-8">
            <div className="invoice-party-title">From</div>
            <input 
              type="text" 
              placeholder="Who is this invoice from?" 
              value={invoice.vendorName}
              onChange={(e) => handleFieldChange('vendorName', e.target.value)}
              className="font-bold text-lg mb-1"
            />
            <textarea
              placeholder="Address / Phone / Email"
              value={invoice.vendorAddress}
              onChange={(e) => handleFieldChange('vendorAddress', e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
          <div className="invoice-party-col pl-8">
            <div className="invoice-party-title">Bill To</div>
            <input 
              type="text" 
              placeholder="Who is this invoice to?" 
              value={invoice.clientName}
              onChange={(e) => handleFieldChange('clientName', e.target.value)}
              className="font-bold text-lg mb-1"
            />
            <textarea
              placeholder="Address / Phone / Email"
              value={invoice.clientAddress}
              onChange={(e) => handleFieldChange('clientAddress', e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        <div className="invoice-details">
          <table className="invoice-details-table">
            <tbody>
              <tr>
                <td>Date</td>
                <td>
                  <input 
                    type="date" 
                    value={invoice.date}
                    onChange={(e) => handleFieldChange('date', e.target.value)}
                    className="text-right"
                  />
                </td>
              </tr>
              <tr>
                <td>Payment Terms</td>
                <td>
                  <input 
                    type="text" 
                    value={invoice.paymentTerms}
                    onChange={(e) => handleFieldChange('paymentTerms', e.target.value)}
                    className="text-right"
                    placeholder="e.g. NET 30"
                  />
                </td>
              </tr>
              <tr>
                <td>Due Date</td>
                <td>
                  <input 
                    type="date" 
                    value={invoice.dueDate}
                    onChange={(e) => handleFieldChange('dueDate', e.target.value)}
                    className="text-right"
                  />
                </td>
              </tr>
              <tr>
                <td>PO Number</td>
                <td>
                  <input 
                    type="text" 
                    value={invoice.poNumber}
                    onChange={(e) => handleFieldChange('poNumber', e.target.value)}
                    className="text-right"
                    placeholder="PO Number"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <table className="invoice-items-table">
          <thead>
            <tr>
              <th className="w-[50%]">Item</th>
              <th className="qty w-[15%]">Quantity</th>
              <th className="rate w-[15%]">Rate</th>
              <th className="amount w-[20%]">Amount</th>
              <th className="w-10 opacity-0 group-hover:opacity-100 transition-opacity"></th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, idx) => (
              <tr key={idx} className="group/row">
                <td>
                  <textarea 
                    value={item.description}
                    onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                    placeholder="Description of service or product..."
                    rows={1}
                    className="resize-none overflow-hidden block w-full"
                    onInput={(e) => {
                      e.target.style.height = 'auto';
                      e.target.style.height = (e.target.scrollHeight) + 'px';
                    }}
                  />
                </td>
                <td className="qty">
                  <input 
                    type="number" 
                    value={item.quantity}
                    onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                    className="text-right"
                    min="0"
                    step="any"
                  />
                </td>
                <td className="rate">
                  <input 
                    type="number" 
                    value={item.rate}
                    onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                    className="text-right"
                    min="0"
                    step="any"
                  />
                </td>
                <td className="amount">
                  <div className="py-1 px-2 text-right">
                    {formatCurrency(item.amount, invoice.currency)}
                  </div>
                </td>
                <td className="align-middle opacity-0 group-hover/row:opacity-100 transition-opacity">
                  <button 
                    onClick={() => removeItem(idx)}
                    className="text-red-400 hover:text-red-600 px-2"
                    title="Remove item"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <div className="mb-6 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={addItem}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            + Add Line Item
          </button>
        </div>

        <div className="flex justify-between items-start">
          <div className="invoice-notes-terms w-1/2 pr-8 mt-12">
            <div className="invoice-section-title">Notes</div>
            <textarea 
              value={invoice.notes}
              onChange={(e) => handleFieldChange('notes', e.target.value)}
              placeholder="Notes - any relevant information not already covered"
              rows={3}
              className="invoice-section-content resize-none mb-6"
            />
            
            <div className="invoice-section-title">Terms</div>
            <textarea 
              value={invoice.terms}
              onChange={(e) => handleFieldChange('terms', e.target.value)}
              placeholder="Terms and conditions - late fees, payment methods, delivery schedule"
              rows={3}
              className="invoice-section-content resize-none"
            />
          </div>

          <div className="invoice-summary w-[40%]">
            <table className="invoice-summary-table w-full">
              <tbody>
                <tr>
                  <td>Subtotal</td>
                  <td className="w-32">{formatCurrency(totals.subtotal, invoice.currency)}</td>
                </tr>
                <tr>
                  <td>Discount</td>
                  <td>
                    <div className="flex items-center justify-end">
                      <span className="mr-1">-</span>
                      <input 
                        type="number" 
                        value={invoice.discount}
                        onChange={(e) => handleFieldChange('discount', e.target.value)}
                        className="text-right w-24"
                        min="0"
                        step="any"
                      />
                    </div>
                  </td>
                </tr>
                <tr>
                  <td>Tax (%)</td>
                  <td>
                    <div className="flex items-center justify-end">
                      <input 
                        type="number" 
                        value={invoice.taxRate}
                        onChange={(e) => handleFieldChange('taxRate', e.target.value)}
                        className="text-right w-20"
                        min="0"
                        step="any"
                      />
                      <span className="ml-1">%</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td>Shipping</td>
                  <td>
                    <div className="flex items-center justify-end">
                      <span className="mr-1">+</span>
                      <input 
                        type="number" 
                        value={invoice.shipping}
                        onChange={(e) => handleFieldChange('shipping', e.target.value)}
                        className="text-right w-24"
                        min="0"
                        step="any"
                      />
                    </div>
                  </td>
                </tr>
                <tr>
                  <td>Amount Paid</td>
                  <td>
                    <div className="flex items-center justify-end">
                      <span className="mr-1">-</span>
                      <input 
                        type="number" 
                        value={invoice.amountPaid}
                        onChange={(e) => handleFieldChange('amountPaid', e.target.value)}
                        className="text-right w-24"
                        min="0"
                        step="any"
                      />
                    </div>
                  </td>
                </tr>
                <tr className="total-row">
                  <td>Balance Due</td>
                  <td>{formatCurrency(totals.balance, invoice.currency)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
