import React, { useState, useEffect } from "react";
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc, query, where } from "firebase/firestore";
import { db, auth } from "../utils/firebase";

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    hsn: "",
    salePrice: 0,
    purchasePrice: 0,
    stock: 0,
    taxRate: 18,
  });

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    if (!auth.currentUser) return;
    try {
      const q = query(collection(db, "inventory"), where("userId", "==", auth.currentUser.uid));
      const snap = await getDocs(q);
      const data = [];
      snap.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
      setItems(data);
    } catch (err) {
      console.error("Error fetching inventory:", err);
    }
    setLoading(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    const dataToSave = {
      ...formData,
      salePrice: parseFloat(formData.salePrice) || 0,
      purchasePrice: parseFloat(formData.purchasePrice) || 0,
      stock: parseInt(formData.stock) || 0,
      taxRate: parseFloat(formData.taxRate) || 0,
      userId: auth.currentUser.uid,
      updatedAt: new Date().toISOString(),
    };

    try {
      if (editingItem) {
        await updateDoc(doc(db, "inventory", editingItem.id), dataToSave);
      } else {
        await addDoc(collection(db, "inventory"), { ...dataToSave, createdAt: new Date().toISOString() });
      }
      setShowModal(false);
      fetchInventory();
    } catch (err) {
      console.error("Error saving item:", err);
      alert("Failed to save inventory item.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    try {
      await deleteDoc(doc(db, "inventory", id));
      setItems(items.filter(i => i.id !== id));
    } catch (err) {
      console.error("Error deleting item:", err);
    }
  };

  const openModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name || "",
        sku: item.sku || "",
        hsn: item.hsn || "",
        salePrice: item.salePrice || 0,
        purchasePrice: item.purchasePrice || 0,
        stock: item.stock || 0,
        taxRate: item.taxRate || 18,
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: "",
        sku: "",
        hsn: "",
        salePrice: 0,
        purchasePrice: 0,
        stock: 0,
        taxRate: 18,
      });
    }
    setShowModal(true);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Inventory Management</h1>
          <p className="text-slate-500 text-sm">Track your products, stock levels, and HSN codes.</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          + Add Item
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading inventory...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No items found. Add your first product to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 font-medium">Item Name</th>
                <th className="px-6 py-3 font-medium">SKU / Barcode</th>
                <th className="px-6 py-3 font-medium">HSN / SAC</th>
                <th className="px-6 py-3 font-medium text-right">Sale Price</th>
                <th className="px-6 py-3 font-medium text-right">Stock</th>
                <th className="px-6 py-3 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-800">{item.name}</td>
                  <td className="px-6 py-4 text-slate-500">{item.sku || "-"}</td>
                  <td className="px-6 py-4 text-slate-500">{item.hsn || "-"}</td>
                  <td className="px-6 py-4 text-right font-medium text-slate-800">{item.salePrice}</td>
                  <td className="px-6 py-4 text-right">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.stock <= 5 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                      {item.stock}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center space-x-2">
                    <button onClick={() => openModal(item)} className="text-indigo-600 hover:text-indigo-800">Edit</button>
                    <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-800">Delete</button>
                  </td>
                </tr>
              ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-800">{editingItem ? "Edit Item" : "Add New Item"}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">&times;</button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Item Name *</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">SKU</label>
                  <input type="text" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">HSN/SAC Code</label>
                  <input type="text" value={formData.hsn} onChange={e => setFormData({...formData, hsn: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Sale Price *</label>
                  <input required type="number" step="0.01" value={formData.salePrice} onChange={e => setFormData({...formData, salePrice: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Purchase Price</label>
                  <input type="number" step="0.01" value={formData.purchasePrice} onChange={e => setFormData({...formData, purchasePrice: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Stock Quantity</label>
                  <input type="number" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tax Rate (%)</label>
                  <select value={formData.taxRate} onChange={e => setFormData({...formData, taxRate: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500">
                    <option value="0">0% (Exempted)</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg">Save Item</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
