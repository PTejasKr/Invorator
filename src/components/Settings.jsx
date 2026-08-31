import React, { useState } from 'react';
import { db, auth } from '../utils/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Save, Upload, User, MapPin, Building, Image as ImageIcon } from 'lucide-react';

export default function Settings({ userProfile, onProfileUpdate }) {
  const [profile, setProfile] = useState({
    companyName: userProfile?.companyName || '',
    defaultShippingAddress: userProfile?.defaultShippingAddress || '',
    defaultBillingAddress: userProfile?.defaultBillingAddress || '',
    signatureData: userProfile?.signatureData || ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    setProfile(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile(prev => ({ ...prev, signatureData: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, profile);
      onProfileUpdate({ ...userProfile, ...profile });
      setMessage('Settings saved successfully!');
    } catch (error) {
      console.error(error);
      setMessage('Error saving settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-slate-200 mt-8">
      <div className="flex items-center gap-3 mb-8 border-b border-slate-100 pb-6">
        <div className="p-3 bg-slate-50 rounded-lg">
          <User className="w-6 h-6 text-slate-700" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Account Settings</h2>
          <p className="text-sm text-slate-500 mt-1">Manage your business profile and default invoice data</p>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg mb-6 text-sm font-medium ${message.includes('Error') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        <div className="space-y-5">
          <h3 className="text-lg font-medium text-slate-900 border-b border-slate-100 pb-2">Business Details</h3>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
              <Building className="w-4 h-4 text-slate-400" /> Company / Business Name
            </label>
            <input
              type="text"
              name="companyName"
              value={profile.companyName}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-colors outline-none"
              placeholder="e.g. Acme Corp"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400" /> Default Billing Address
              </label>
              <textarea
                name="defaultBillingAddress"
                value={profile.defaultBillingAddress}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-colors outline-none resize-none"
                placeholder="Enter billing address..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400" /> Default Shipping Address
              </label>
              <textarea
                name="defaultShippingAddress"
                value={profile.defaultShippingAddress}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-colors outline-none resize-none"
                placeholder="Enter shipping address..."
              />
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <h3 className="text-lg font-medium text-slate-900 border-b border-slate-100 pb-2">Digital Signature</h3>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-slate-400" /> Signature Image
            </label>
            <div className="flex items-center gap-6">
              <div className="flex-1">
                <label className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-colors">
                  <div className="text-center">
                    <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                    <span className="text-sm text-slate-600 font-medium">Click to upload signature</span>
                    <p className="text-xs text-slate-400 mt-1">PNG, JPG up to 1MB (Transparent PNG recommended)</p>
                  </div>
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                </label>
              </div>
              {profile.signatureData && (
                <div className="w-48 h-32 border border-slate-200 rounded-lg flex items-center justify-center bg-slate-50 overflow-hidden relative group">
                  <img src={profile.signatureData} alt="Signature Preview" className="max-w-full max-h-full object-contain p-2" />
                  <button
                    type="button"
                    onClick={() => setProfile(prev => ({ ...prev, signatureData: '' }))}
                    className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-sm font-medium"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="bg-slate-900 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
