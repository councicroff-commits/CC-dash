import React, { useState } from "react";
import type { UserNode } from "./Users";

interface UserDetailProps {
  node: UserNode;
  onBack: () => void;
  onVerify: () => Promise<void> | void;
  onDelete: () => Promise<void> | void;
}

const UserDetail: React.FC<UserDetailProps> = ({ node, onBack, onVerify, onDelete }) => {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleDeleteTrigger = async () => {
    if (isConfirmingDelete) {
      try {
        setIsDeleting(true);
        await onDelete();
      } catch (err) {
        setIsDeleting(false);
        setIsConfirmingDelete(false);
      }
    } else {
      setIsConfirmingDelete(true);
      setTimeout(() => setIsConfirmingDelete(false), 4000); 
    }
  };

  const handleVerifyClick = async () => {
    try {
      setIsVerifying(true);
      await onVerify();
    } finally {
      setIsVerifying(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return "Invalid Date";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto">
        
        {/* Back Button */}
        <button 
          onClick={onBack}
          className="mb-6 flex items-center gap-2 text-sm text-gray-600 hover:text-indigo-600 transition-colors font-bold"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
          Back to Directory
        </button>

        <div className="bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden">
          {/* Header Bar */}
          <div className="bg-gray-50 px-8 py-6 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-black text-gray-900">User Profile</h2>
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${node.isVerified ? 'bg-indigo-100 text-indigo-800' : 'bg-amber-100 text-amber-800'}`}>
              {node.isVerified ? 'Verified' : 'Unverified'}
            </span>
          </div>

          <div className="p-8 flex flex-col md:flex-row gap-10">
            {/* Left Column: Details */}
            <div className="flex-1 space-y-8">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-2xl bg-indigo-50 flex items-center justify-center overflow-hidden shrink-0 border-2 border-indigo-100 text-indigo-600 text-3xl font-black shadow-sm">
                  {node.avatar ? <img src={node.avatar} className="w-full h-full object-cover" alt="Avatar" /> : node.fullName?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h1 className="text-2xl font-black text-gray-900">{node.fullName}</h1>
                  <p className="text-gray-500 font-semibold text-sm">@{node.username}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <InfoItem label="Email Address" value={node.email} />
                <InfoItem label="Mobile Number" value={node.mobile || "Not Provided"} />
                <InfoItem label="Date of Birth" value={node.birthDate || "Not Provided"} />
                <InfoItem label="Gender" value={node.gender || "Not Provided"} />
                <InfoItem label="Age" value={node.age?.toString() || "N/A"} />
                <InfoItem label="Member Since" value={formatDate(node.created_at)} />
                <InfoItem label="Facebook" value={node.facebook || "N/A"} />
                <InfoItem label="Database ID" value={node.id} isCode />
              </div>
            </div>

            {/* Right Column: Actions */}
            <div className="md:w-64 space-y-4 pt-2">
              <button 
                onClick={handleVerifyClick}
                disabled={node.isVerified || isVerifying}
                className={`w-full py-3 px-4 rounded-xl text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-2 ${
                  node.isVerified 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none' 
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {isVerifying ? (
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                ) : node.isVerified ? (
                  'Already Verified'
                ) : (
                  'Verify Identity'
                )}
              </button>

              <button 
                onClick={handleDeleteTrigger}
                disabled={isDeleting}
                className={`w-full py-3 px-4 rounded-xl text-sm font-bold border transition-all shadow-sm flex items-center justify-center gap-2 ${
                  isConfirmingDelete 
                    ? 'bg-red-600 text-white border-red-600 hover:bg-red-700' 
                    : 'bg-white text-red-600 border-red-200 hover:bg-red-50'
                }`}
              >
                {isDeleting ? (
                  <div className="animate-spin h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full" />
                ) : isConfirmingDelete ? (
                  'Confirm Delete User?'
                ) : (
                  'Delete User'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const InfoItem = ({ label, value, isCode = false }: { label: string, value: string, isCode?: boolean }) => (
  <div>
    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
    <p className={`text-sm font-semibold ${isCode ? 'font-mono text-indigo-600 bg-indigo-50 p-2.5 rounded-xl border border-indigo-100 break-all' : 'text-gray-900'}`}>
      {value}
    </p>
  </div>
);

export default UserDetail;
