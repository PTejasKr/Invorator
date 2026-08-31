export const calculateInvoiceTotals = (items, globalDiscount = 0, globalShipping = 0, globalTaxRate = 0, amountPaid = 0) => {
  let subtotal = 0;
  
  const processedItems = items.map(item => {
    const qty = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.rate) || 0;
    const amount = qty * rate;
    subtotal += amount;
    return { ...item, amount };
  });

  const discount = parseFloat(globalDiscount) || 0;
  const shipping = parseFloat(globalShipping) || 0;
  
  // Tax is calculated on (subtotal - discount)
  const taxableAmount = subtotal - discount;
  const tax = (taxableAmount * (parseFloat(globalTaxRate) || 0)) / 100;
  
  const total = subtotal - discount + shipping + tax;
  const balance = total - (parseFloat(amountPaid) || 0);

  return {
    items: processedItems,
    subtotal,
    discount,
    shipping,
    tax,
    amountPaid: parseFloat(amountPaid) || 0,
    total,
    balance
  };
};

export const formatCurrency = (val, currency = "USD") => {
  if (currency === "INR") {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2
    }).format(val || 0);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2
  }).format(val || 0);
};
