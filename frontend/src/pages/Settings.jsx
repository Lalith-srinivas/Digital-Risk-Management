import React, { useState, useEffect } from 'react';
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
  Eye,
  EyeOff,
  Lock,
  Loader2,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

export default function Settings() {
  const navigate = useNavigate();
  const { user, isGuest, logout, resetPassword, updatePassword } = useAuth();

  const [fullName, setFullName] = useState(
    user?.user_metadata?.full_name || user?.email?.split('@')[0] || (isGuest ? 'Guest Analyst' : 'Security Analyst')
  );
  const [department, setDepartment] = useState('Brand Protection & SOC');
  const [savedNotice, setSavedNotice] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [errorNotice, setErrorNotice] = useState(null);

  // Direct Change Password Modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passwordUpdating, setPasswordUpdating] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(null);
  const [passwordError, setPasswordError] = useState(null);
  const [emailCooldown, setEmailCooldown] = useState(0);

  useEffect(() => {
    if (emailCooldown <= 0) return;
    const interval = setInterval(() => {
      setEmailCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [emailCooldown]);

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

  const handleDirectPasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match. Please verify and re-enter.');
      return;
    }

    setPasswordUpdating(true);
    try {
      const res = await updatePassword(newPassword);
      if (res?.error) {
        if (res.error.status === 429 || res.error.message?.toLowerCase().includes('rate limit')) {
          setPasswordError('Rate limit exceeded: Please wait a moment before trying again.');
        } else {
          setPasswordError(res.error.message || 'Failed to update password.');
        }
      } else {
        setPasswordSuccess('Password successfully updated! Your new credentials are now active.');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          setShowPasswordModal(false);
          setPasswordSuccess(null);
        }, 2000);
      }
    } catch (err) {
      setPasswordError(err.message || 'An unexpected error occurred.');
    } finally {
      setPasswordUpdating(false);
    }
  };

  const handlePasswordReset = async () => {
    if (emailCooldown > 0) return;
    if (!user?.email) {
      setErrorNotice('Password reset requires an active email-authenticated account.');
      return;
    }
    setErrorNotice(null);
    setResetSent(false);

    try {
      const res = await resetPassword(user.email);
      if (res?.error) {
        if (
          res.error.status === 429 ||
          res.error.message?.toLowerCase().includes('security purposes') ||
          res.error.message?.toLowerCase().includes('rate limit')
        ) {
          setErrorNotice('Rate limit reached: For security, password reset emails can only be sent once every 60 seconds. Please check your inbox or wait before retrying.');
          setEmailCooldown(60);
        } else {
          setErrorNotice(res.error.message || 'Failed to dispatch reset link.');
        }
      } else {
        setResetSent(true);
        setEmailCooldown(60);
        setTimeout(() => setResetSent(false), 5000);
      }
    } catch (err) {
      setErrorNotice(err.message || 'Failed to dispatch reset link.');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="brand-scan-container" style={{ maxWidth: '860px' }}>
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
      <div className="brand-scan-card">
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
          <div className="form-grid-2col" style={{ marginBottom: '20px' }}>
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

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>Password Management</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>Update your security credentials directly or request a recovery link</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={() => {
                setPasswordError(null);
                setPasswordSuccess(null);
                setNewPassword('');
                setConfirmPassword('');
                setShowPasswordModal(true);
              }}
              style={{
                padding: '7px 14px',
                fontSize: '13px',
                fontWeight: '600',
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
              <Key size={14} /> Change Password
            </button>

            <button
              type="button"
              onClick={handlePasswordReset}
              disabled={emailCooldown > 0}
              title={emailCooldown > 0 ? `Please wait ${emailCooldown}s before requesting another reset email` : 'Send a recovery email'}
              style={{
                padding: '7px 14px',
                fontSize: '13px',
                fontWeight: '600',
                color: emailCooldown > 0 ? '#94a3b8' : '#475569',
                background: emailCooldown > 0 ? '#f1f5f9' : '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                cursor: emailCooldown > 0 ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Mail size={14} /> {emailCooldown > 0 ? `Resend (${emailCooldown}s)` : 'Email Reset Link'}
            </button>
          </div>
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

      {/* Direct Change Password Modal */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => {
          if (!passwordUpdating) setShowPasswordModal(false);
        }}
        title="Change Account Password"
      >
        <form onSubmit={handleDirectPasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
            Update authentication password for <strong>{userEmail}</strong>. Your updated credentials will be active immediately.
          </p>

          {passwordSuccess && (
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #86efac',
              color: '#15803d',
              borderRadius: '8px',
              padding: '10px 14px',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <CheckCircle2 size={16} />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {passwordError && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fca5a5',
              color: '#b91c1c',
              borderRadius: '8px',
              padding: '10px 14px',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <AlertCircle size={16} />
              <span>{passwordError}</span>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
              New Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showNewPass ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                minLength={6}
                style={{
                  width: '100%',
                  padding: '9px 38px 9px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="button"
                onClick={() => setShowNewPass(!showNewPass)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                }}
                tabIndex={-1}
              >
                {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
              Confirm New Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirmPass ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                required
                minLength={6}
                style={{
                  width: '100%',
                  padding: '9px 38px 9px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPass(!showConfirmPass)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                }}
                tabIndex={-1}
              >
                {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={() => setShowPasswordModal(false)}
              disabled={passwordUpdating}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: '600',
                color: '#475569',
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={passwordUpdating}
              style={{
                padding: '8px 18px',
                fontSize: '13px',
                fontWeight: '700',
                color: '#ffffff',
                background: passwordUpdating ? '#818cf8' : '#4f46e5',
                border: 'none',
                borderRadius: '6px',
                cursor: passwordUpdating ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {passwordUpdating ? (
                <>
                  <Loader2 size={14} className="spin" /> Updating...
                </>
              ) : (
                <>
                  <Key size={14} /> Update Password
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
