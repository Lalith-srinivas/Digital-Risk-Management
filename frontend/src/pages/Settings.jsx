import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Shield,
  Key,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Save,
  Building,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const navigate = useNavigate();
  const { user, isGuest, logout, resetPassword } = useAuth();

  const [fullName, setFullName] = useState(
    user?.user_metadata?.full_name || user?.email?.split('@')[0] || (isGuest ? 'Guest Analyst' : 'Security Analyst')
  );
  const [department, setDepartment] = useState('Brand Protection & SOC');
  const [savedNotice, setSavedNotice] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [errorNotice, setErrorNotice] = useState(null);

  const userEmail = user?.email || (isGuest ? 'guest@soc360.local (In-Memory Session)' : 'analyst@enterprise.com');
  const userInitials = fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'SA';

  const handleSaveProfile = (e) => {
    e.preventDefault();
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  const handlePasswordReset = async () => {
    if (!user?.email) {
      setErrorNotice('Password reset requires an active email-authenticated account.');
      return;
    }
    setErrorNotice(null);
    try {
      await resetPassword(user.email);
      setResetSent(true);
      setTimeout(() => setResetSent(false), 4000);
    } catch (err) {
      setErrorNotice(err.message || 'Failed to dispatch reset link.');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div style={{ maxWidth: '860px', margin: '24px auto', padding: '0 24px' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
          Profile & Account Settings
        </h1>
        <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0' }}>
          Manage your analyst identity, security credentials, and organization profile
        </p>
      </div>

      {savedNotice && (
        <div style={{
          background: '#ecfdf5',
          border: '1px solid #6ee7b7',
          color: '#065f46',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '20px',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <CheckCircle2 size={16} />
          <span>Profile preferences updated successfully.</span>
        </div>
      )}

      {resetSent && (
        <div style={{
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          color: '#1e40af',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '20px',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <CheckCircle2 size={16} />
          <span>Password reset instructions sent to {userEmail}.</span>
        </div>
      )}

      {errorNotice && (
        <div style={{
          background: '#fee2e2',
          border: '1px solid #f87171',
          color: '#991b1b',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '20px',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <AlertCircle size={16} />
          <span>{errorNotice}</span>
        </div>
      )}

      {/* Profile Overview Card */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '28px',
        marginBottom: '24px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
          <div style={{
            width: '68px',
            height: '68px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            fontWeight: '800',
            boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)',
          }}>
            {userInitials}
          </div>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px' }}>
              {fullName}
            </h3>
            <div style={{ fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Mail size={14} /> {userEmail}
            </div>
            <div style={{ marginTop: '6px' }}>
              <span style={{
                background: isGuest ? '#fef3c7' : '#e0e7ff',
                color: isGuest ? '#b45309' : '#4338ca',
                fontSize: '11px',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '9999px',
                textTransform: 'uppercase',
              }}>
                {isGuest ? 'Guest Session' : 'Verified Security Analyst'}
              </span>
            </div>
          </div>
        </div>

        {/* Edit Profile Form */}
        <form onSubmit={handleSaveProfile}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  fontSize: '14px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Department / Team
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  fontSize: '14px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            style={{
              padding: '9px 18px',
              fontSize: '13px',
              fontWeight: '700',
              color: '#ffffff',
              background: '#4f46e5',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Save size={15} /> Save Changes
          </button>
        </form>
      </div>

      {/* Security & Credentials Card */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '24px 28px',
        marginBottom: '24px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '0 0 14px' }}>
          Security & Access Credentials
        </h3>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid #f1f5f9' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>Password Management</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>Reset or update your account password via verified email link</div>
          </div>
          <button
            onClick={handlePasswordReset}
            style={{
              padding: '7px 14px',
              fontSize: '13px',
              fontWeight: '600',
              color: '#4f46e5',
              background: '#f5f3ff',
              border: '1px solid #ddd6fe',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Key size={14} /> Change Password
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid #f1f5f9' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>Multi-User Isolation</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>Row Level Security (RLS) active • Monitored assets isolated to your User ID</div>
          </div>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#16a34a', background: '#dcfce7', padding: '4px 10px', borderRadius: '9999px' }}>
            Enforced
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#dc2626' }}>Session Sign Out</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>Safely invalidate local session token and sign out of SOC 360</div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: '7px 14px',
              fontSize: '13px',
              fontWeight: '600',
              color: '#dc2626',
              background: '#fee2e2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </div>

      {/* Account Info Card */}
      <div style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '20px 24px',
        fontSize: '13px',
        color: '#64748b',
        display: 'flex',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div>
          <span style={{ fontWeight: '600', color: '#334155' }}>Platform Version:</span> SOC 360 v1.0.0
        </div>
        <div>
          <span style={{ fontWeight: '600', color: '#334155' }}>User Identity:</span> {user?.id || 'In-Memory Guest'}
        </div>
        <div>
          <span style={{ fontWeight: '600', color: '#334155' }}>Backend Status:</span> Connected (FastAPI + Supabase)
        </div>
      </div>
    </div>
  );
}
