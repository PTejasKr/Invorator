import React, { useState, useEffect } from "react";
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc, query, where } from "../utils/firebase";
import { db, auth } from "../utils/firebase";

export default function Parties() {
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingParty, setEditingParty] = useState(null);
  const [formData, setFormData] = useState({
    type: "customer", // customer or vendor
    name: "",
    gstin: "",
    email: "",
    phone: "",
    state: "Delhi",
    stateCode: "07",
    address: "",
    openingBalance: 0,
  });

  const stateCodes = [
    { code: "07", name: "Delhi" },
    { code: "27", name: "Maharashtra" },
    { code: "29", name: "Karnataka" },
    { code: "09", name: "Uttar Pradesh" },
    { code: "33", name: "Tamil Nadu" },
    { code: "24", name: "Gujarat" },
    // A complete list would have all 37 codes, simplifying for now
  ];

  useEffect(() => {
    fetchParties();
  }, []);

  const fetchParties = async () => {
    if (!auth.currentUser) return;
    try {
      const q = query(collection(db, "parties"), where("userId", "==", auth.currentUser.uid));
      const snap = await getDocs(q);
      const data = [];
      snap.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
      setParties(data);
    } catch (err) {
      console.error("Error fetching parties:", err);
    }
    setLoading(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    const selectedState = stateCodes.find(s => s.code === formData.stateCode);

    const dataToSave = {
      ...formData,
      state: selectedState ? selectedState.name : formData.state,
      openingBalance: parseFloat(formData.openingBalance) || 0,
      userId: auth.currentUser.uid,
      updatedAt: new Date().toISOString(),
    };

    try {
      if (editingParty) {
        await updateDoc(doc(db, "parties", editingParty.id), dataToSave);
      } else {
        await addDoc(collection(db, "parties"), { ...dataToSave, createdAt: new Date().toISOString() });
      }
      setShowModal(false);
      fetchParties();
    } catch (err) {
      console.error("Error saving party:", err);
      alert("Failed to save party.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this party?")) return;
    try {
      await deleteDoc(doc(db, "parties", id));
      setParties(parties.filter(p => p.id !== id));
    } catch (err) {
      console.error("Error deleting party:", err);
    }
  };

  const openModal = (party = null) => {
    if (party) {
      setEditingParty(party);
      setFormData({
        type: party.type || "customer",
        name: party.name || "",
        gstin: party.gstin || "",
        email: party.email || "",
        phone: party.phone || "",
        stateCode: party.stateCode || "07",
        state: party.state || "Delhi",
        address: party.address || "",
        openingBalance: party.openingBalance || 0,
      });
    } else {
      setEditingParty(null);
      setFormData({
        type: "customer",
        name: "",
        gstin: "",
        email: "",
        phone: "",
        stateCode: "07",
        state: "Delhi",
        address: "",
        openingBalance: 0,
      });
    }
    setShowModal(true);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Parties</h1>
          <p className="text-slate-500 text-sm">Manage your customers and vendors.</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          + Add Party
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading parties...</div>
        ) : parties.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No parties found. Add your first customer or vendor.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 font-medium">Type</th>
                <th className="px-6 py-3 font-medium">Party Name</th>
                <th className="px-6 py-3 font-medium">GSTIN</th>
                <th className="px-6 py-3 font-medium">State / POS</th>
                <th className="px-6 py-3 font-medium text-right">Balance</th>
                <th className="px-6 py-3 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {parties.map(party => (
                <tr key={party.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${party.type === 'vendor' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                      {party.type === 'vendor' ? 'Vendor' : 'Customer'}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-800">
                    {party.name}
                    <div className="text-xs text-slate-400 font-normal">{party.phone}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-500">{party.gstin || "-"}</td>
                  <td className="px-6 py-4 text-slate-500">{party.state} ({party.stateCode})</td>
                  <td className="px-6 py-4 text-right font-medium text-slate-800">{party.openingBalance}</td>
                  <td className="px-6 py-4 text-center space-x-2">
                    <button onClick={() => openModal(party)} className="text-indigo-600 hover:text-indigo-800">Edit</button>
                    <button onClick={() => handleDelete(party.id)} className="text-red-600 hover:text-red-800">Delete</button>
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-800">{editingParty ? "Edit Party" : "Add New Party"}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">&times;</button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="flex gap-4 mb-4">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input type="radio" checked={formData.type === "customer"} onChange={() => setFormData({...formData, type: "customer"})} className="text-indigo-600 focus:ring-indigo-500" />
                  Customer
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input type="radio" checked={formData.type === "vendor"} onChange={() => setFormData({...formData, type: "vendor"})} className="text-indigo-600 focus:ring-indigo-500" />
                  Vendor
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Party Name *</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                  <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">GSTIN</label>
                  <input type="text" value={formData.gstin} onChange={e => setFormData({...formData, gstin: e.target.value})} placeholder="22AAAAA0000A1Z5" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">State of Supply (POS) *</label>
                  <select required value={formData.stateCode} onChange={e => setFormData({...formData, stateCode: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500">
                    {stateCodes.map(s => (
                      <option key={s.code} value={s.code}>{s.code} - {s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Billing Address</label>
                <textarea rows="2" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Opening Balance</label>
                <input type="number" step="0.01" value={formData.openingBalance} onChange={e => setFormData({...formData, openingBalance: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg">Save Party</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
