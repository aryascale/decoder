import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { message } from 'antd';
import { Navigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function Profile() {
  const { user, refreshUser, loading } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'IDLE' | 'OTP_SENT'>('IDLE');
  const [emailStep, setEmailStep] = useState<'IDLE' | 'OTP_SENT'>('IDLE');
  const [emailToVerify, setEmailToVerify] = useState(user?.email || '');
  const [emailCode, setEmailCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editUsername, setEditUsername] = useState(user?.username || '');
  const [editName, setEditName] = useState((user as any)?.name || '');

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-gray-200 border-t-red-500 rounded-full animate-spin" /></div>;
  if (!user) return <Navigate to="/login" />;

  const requestOtp = async () => {
    if (!phoneNumber) { message.error('Please enter a phone number'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/profile-request-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phoneNumber }) });
      if (res.ok) { 
        const data = await res.json();
        message.success(`MOCK SMS RECEIVED: Your code is ${data.data?.mockCode || 'Check Server Console'}`); 
        if (data.data?.mockCode) setCode(data.data.mockCode);
        setStep('OTP_SENT'); 
        await refreshUser(); 
      }
      else { const data = await res.json(); message.error(data.error || 'Failed to send OTP'); }
    } catch { message.error('An error occurred'); }
    finally { setSubmitting(false); }
  };

  const verifyOtp = async () => {
    if (!code) { message.error('Please enter the OTP code'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/profile-verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phoneNumber, code }) });
      if (res.ok) { message.success('Phone verified!'); setStep('IDLE'); await refreshUser(); }
      else { const data = await res.json(); message.error(data.error || 'Invalid OTP'); }
    } catch { message.error('An error occurred'); }
    finally { setSubmitting(false); }
  };

  const requestEmailOtp = async () => {
    if (!emailToVerify) { message.error('Please enter an email address'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/profile-request-email-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: emailToVerify }) });
      if (res.ok) { 
        const data = await res.json();
        message.success(`MOCK EMAIL RECEIVED: Your code is ${data.data?.mockCode || 'Check Server Console'}`); 
        if (data.data?.mockCode) setEmailCode(data.data.mockCode);
        setEmailStep('OTP_SENT'); 
        await refreshUser(); 
      }
      else { const data = await res.json(); message.error(data.error || 'Failed to send OTP'); }
    } catch { message.error('An error occurred'); }
    finally { setSubmitting(false); }
  };

  const verifyEmailOtp = async () => {
    if (!emailCode) { message.error('Please enter the OTP code'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/profile-verify-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: emailToVerify, code: emailCode }) });
      if (res.ok) { message.success('Email verified!'); setEmailStep('IDLE'); await refreshUser(); }
      else { const data = await res.json(); message.error(data.error || 'Invalid OTP'); }
    } catch { message.error('An error occurred'); }
    finally { setSubmitting(false); }
  };

  const handleUpdateProfile = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/profile-update', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: editUsername, name: editName }) });
      if (res.ok) { message.success('Profile updated!'); setIsEditing(false); await refreshUser(); }
      else { const data = await res.json(); message.error(data.error || 'Failed to update'); }
    } catch { message.error('An error occurred'); }
    finally { setSubmitting(false); }
  };

  const initials = ((user as any)?.name || user.username || user.email || '?').charAt(0).toUpperCase();

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#fafafa]" style={{ paddingTop: 64 }}>

        {/* Hero Banner */}
        <div className="h-40 bg-gradient-to-r from-gray-800 via-gray-900 to-gray-800 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyem0wLTR2Mkgy NHYtMmgxMnptMC00djJIMjR2LTJoMTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-16 relative z-10 pb-12">

          {/* Profile Header Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg ring-4 ring-white -mt-14 sm:-mt-14">
                {initials}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-bold text-gray-900">{(user as any)?.name || user.username || 'User'}</h1>
                  {user.isPhoneVerified && (
                    <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                  )}
                </div>
                <p className="text-sm text-gray-500">@{user.username || 'username'} · {user.email}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-600 uppercase tracking-wide">{user.role}</span>
                  {user.isPhoneVerified
                    ? <span className="text-xs text-emerald-600 font-medium">✓ Phone Verified</span>
                    : <span className="text-xs text-amber-600 font-medium">⚠ Phone Unverified</span>
                  }
                  {user.isEmailVerified
                    ? <span className="text-xs text-emerald-600 font-medium">✓ Email Verified</span>
                    : <span className="text-xs text-amber-600 font-medium">⚠ Email Unverified</span>
                  }
                </div>
              </div>
            </div>
          </div>

          {/* Personal Info */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">Personal Info</h2>
              {!isEditing && (
                <button
                  onClick={() => { setEditUsername(user?.username || ''); setEditName((user as any)?.name || ''); setIsEditing(true); }}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  Edit
                </button>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-4 max-w-lg">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Name</label>
                    <input type="text" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Full Name"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Username</label>
                    <input type="text" value={editUsername} onChange={e => setEditUsername(e.target.value)} placeholder="Username"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400" />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={handleUpdateProfile} disabled={submitting}
                    className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50">Save Changes</button>
                  <button onClick={() => setIsEditing(false)} disabled={submitting}
                    className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-8">
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-1">Name</p>
                  <p className="text-sm font-semibold text-gray-900">{(user as any)?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-1">Username</p>
                  <p className="text-sm font-semibold text-gray-900">@{user.username || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-1">Email</p>
                  <p className="text-sm font-semibold text-gray-900">{user.email}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-1">Phone</p>
                  <p className="text-sm font-semibold text-gray-900">{user.phoneNumber || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-1">Role</p>
                  <p className="text-sm font-semibold text-gray-900 capitalize">{user.role}</p>
                </div>
              </div>
            )}
          </div>

          {/* Phone Verification */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Phone Verification</h2>
            {user.isPhoneVerified ? (
              <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-800">Phone verified</p>
                  <p className="text-xs text-emerald-600">{user.phoneNumber}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 max-w-md">
                <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl">
                  <svg className="w-5 h-5 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  <p className="text-sm text-amber-700 font-medium">Phone not verified yet</p>
                </div>

                {step === 'IDLE' && (
                  <div className="flex gap-2">
                    <input type="tel" placeholder="+628123456789" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)}
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400" />
                    <button onClick={requestOtp} disabled={submitting}
                      className="px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap">Send OTP</button>
                  </div>
                )}

                {step === 'OTP_SENT' && (
                  <div className="space-y-3">
                    <p className="text-xs text-gray-500">OTP sent to <span className="font-semibold">{phoneNumber}</span></p>
                    <div className="flex gap-2">
                      <input type="text" placeholder="6-digit code" value={code} onChange={e => setCode(e.target.value)}
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400" />
                      <button onClick={verifyOtp} disabled={submitting}
                        className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50">Verify</button>
                    </div>
                    <button onClick={() => setStep('IDLE')} className="text-xs text-red-500 hover:underline">Change phone number</button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Email Verification */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mt-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Email Verification</h2>
            {user.isEmailVerified ? (
              <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-800">Email verified</p>
                  <p className="text-xs text-emerald-600">{user.email}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 max-w-md">
                <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl">
                  <svg className="w-5 h-5 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  <p className="text-sm text-amber-700 font-medium">Email not verified yet</p>
                </div>

                {emailStep === 'IDLE' && (
                  <div className="flex gap-2">
                    <input type="email" placeholder="name@example.com" value={emailToVerify} onChange={e => setEmailToVerify(e.target.value)}
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400" />
                    <button onClick={requestEmailOtp} disabled={submitting}
                      className="px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap">Send OTP</button>
                  </div>
                )}

                {emailStep === 'OTP_SENT' && (
                  <div className="space-y-3">
                    <p className="text-xs text-gray-500">OTP sent to <span className="font-semibold">{emailToVerify}</span></p>
                    <div className="flex gap-2">
                      <input type="text" placeholder="6-digit code" value={emailCode} onChange={e => setEmailCode(e.target.value)}
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400" />
                      <button onClick={verifyEmailOtp} disabled={submitting}
                        className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50">Verify</button>
                    </div>
                    <button onClick={() => setEmailStep('IDLE')} className="text-xs text-red-500 hover:underline">Change email address</button>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
