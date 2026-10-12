import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Building2,
  ExternalLink,
  Trash2,
  Play,
  CheckCircle,
  AlertCircle,
  X,
  Share2,
  Smartphone,
  Eye
} from 'lucide-react';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import DemoBanner from '../components/DemoBanner';
import api from '../services/api';
import { formatDate, formatRelativeTime } from '../utils/formatters';

export default function BrandProfiles() {
  const navigate = useNavigate();
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    website: '',
    logo: '',
    developerNames: '',
    aliases: [''],
    officialSocials: [{ platform: 'Twitter/X', url: '', handle: '' }],
    officialApps: [{ name: '', packageId: '', storeUrl: '', developer: '' }]
  });

  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const fetchBrands = async () => {
    setLoading(true);
    try {
      const res = await api.getBrands();
      setBrands(res.data || []);
      setIsDemo(res.isDemoData || false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  // Filtered brands
  const filteredBrands = brands.filter(b => {
    if (!b) return false;
    const q = search.toLowerCase();
    const nameMatch = b.name ? b.name.toLowerCase().includes(q) : false;
    const catMatch = b.category ? b.category.toLowerCase().includes(q) : false;
    return nameMatch || catMatch;
  });

  // Dynamic Array Handlers
  const handleAddSocial = () => {
    setFormData(prev => ({
      ...prev,
      officialSocials: [...prev.officialSocials, { platform: 'Twitter/X', url: '', handle: '' }]
    }));
  };

  const handleRemoveSocial = (idx) => {
    setFormData(prev => ({
      ...prev,
      officialSocials: prev.officialSocials.filter((_, i) => i !== idx)
    }));
  };

  const handleSocialChange = (idx, field, value) => {
    setFormData(prev => {
      const updated = [...prev.officialSocials];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...prev, officialSocials: updated };
    });
  };

  const handleAddApp = () => {
    setFormData(prev => ({
      ...prev,
      officialApps: [...prev.officialApps, { name: '', packageId: '', storeUrl: '', developer: '' }]
    }));
  };

  const handleRemoveApp = (idx) => {
    setFormData(prev => ({
      ...prev,
      officialApps: prev.officialApps.filter((_, i) => i !== idx)
    }));
  };

  const handleAppChange = (idx, field, value) => {
    setFormData(prev => {
      const updated = [...prev.officialApps];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...prev, officialApps: updated };
    });
  };

  const handleAddAlias = () => {
    setFormData(prev => ({
      ...prev,
      aliases: [...prev.aliases, '']
    }));
  };

  const handleRemoveAlias = (idx) => {
    setFormData(prev => ({
      ...prev,
      aliases: prev.aliases.filter((_, i) => i !== idx)
    }));
  };

  const handleAliasChange = (idx, value) => {
    setFormData(prev => {
      const updated = [...prev.aliases];
      updated[idx] = value;
      return { ...prev, aliases: updated };
    });
  };

  const [scanningBrandId, setScanningBrandId] = useState(null);
  const [scanNotification, setScanNotification] = useState('');

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Brand name is required';
    if (formData.website.trim() && !/^https?:\/\//i.test(formData.website)) {
      errors.website = 'Website must start with http:// or https://';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmitSuccess(false);

    try {
      const cleanAliases = formData.aliases.filter(a => a.trim().length > 0);
      const cleanSocials = formData.officialSocials.filter(s => s.url.trim().length > 0 || s.handle.trim().length > 0);
      const cleanApps = formData.officialApps.filter(a => a.name.trim().length > 0 || a.packageId.trim().length > 0);
      const devList = formData.developerNames.split(',').map(d => d.trim()).filter(Boolean);

      const payload = {
        name: formData.name.trim(),
        category: formData.category.trim() || 'General Enterprise',
        website: formData.website.trim() || undefined,
        logo: formData.logo.trim() || undefined,
        aliases: cleanAliases,
        officialSocials: cleanSocials,
        officialApps: cleanApps,
        developerNames: devList
      };

      const res = await api.createBrand(payload);
      const newBrand = res.data;

      // Start initial monitoring automatically for newly registered brand
      if (newBrand?.id) {
        try {
          await api.scanBrand(newBrand.id);
        } catch (scanErr) {
          console.warn('Initial scan error:', scanErr);
        }
      }

      setSubmitSuccess(true);
      setTimeout(() => {
        setIsAddModalOpen(false);
        setSubmitSuccess(false);
        // Reset form
        setFormData({
          name: '',
          category: '',
          website: '',
          logo: '',
          developerNames: '',
          aliases: [''],
          officialSocials: [{ platform: 'Twitter/X', url: '', handle: '' }],
          officialApps: [{ name: '', packageId: '', storeUrl: '', developer: '' }]
        });
        fetchBrands();
      }, 700);
    } catch (err) {
      setFormErrors({ submit: err.message || 'Failed to register brand' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBrand = async (brandId, e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to remove this brand profile and its associated telemetry?')) {
      await api.deleteBrand(brandId);
      fetchBrands();
    }
  };

  const handleInitiateScan = async (brand) => {
    setScanningBrandId(brand.id);
    try {
      const res = await api.scanBrand(brand.id);
      const count = res.data?.findings_generated || res.data?.findings?.length || 0;
      setScanNotification(`Monitoring scan completed for ${brand.name}: ${count} findings evaluated.`);
      setTimeout(() => setScanNotification(''), 5000);
      await fetchBrands();
    } catch (err) {
      alert(`Monitoring scan failed: ${err.message}`);
    } finally {
      setScanningBrandId(null);
    }
  };

  // Columns for DataTable
  const columns = [
    {
      header: 'Brand Name',
      key: 'name',
      sortable: true,
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img
            src={row.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(row.name)}&background=6366f1&color=fff`}
            alt=""
            style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', objectFit: 'cover', border: '1px solid #e2e8f0' }}
          />
          <div>
            <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.88rem' }}>{row.name}</div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{row.category || 'Enterprise'}</div>
          </div>
        </div>
      )
    },
    {
      header: 'Website',
      key: 'website',
      render: (row) => row.website ? (
        <a
          href={row.website}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--primary)', fontSize: '0.8rem', fontWeight: 600 }}
          onClick={(e) => e.stopPropagation()}
        >
          <span>{(row.website || '').replace(/^https?:\/\//, '')}</span>
          <ExternalLink size={12} />
        </a>
      ) : (
        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
      )
    },
    {
      header: 'Official Socials',
      key: 'socialCount',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem' }}>
          <Share2 size={14} style={{ color: '#6366f1' }} />
          <span>{row.officialSocials?.length || 0} Handles</span>
        </div>
      )
    },
    {
      header: 'Official Apps',
      key: 'appCount',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem' }}>
          <Smartphone size={14} style={{ color: '#06b6d4' }} />
          <span>{row.officialApps?.length || 0} Packages</span>
        </div>
      )
    },
    {
      header: 'Last Scan',
      key: 'lastScan',
      sortable: true,
      render: (row) => (
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          {formatRelativeTime(row.lastScan)}
        </span>
      )
    },
    {
      header: 'Findings',
      key: 'findingsCount',
      sortable: true,
      render: (row) => (
        <span style={{
          display: 'inline-block',
          padding: '3px 8px',
          borderRadius: 999,
          fontSize: '0.75rem',
          fontWeight: 700,
          backgroundColor: row.findingsCount > 0 ? '#fef2f2' : '#f8fafc',
          color: row.findingsCount > 0 ? '#b91c1c' : 'var(--text-muted)'
        }}>
          {row.findingsCount || 0} flagged
        </span>
      )
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={(e) => e.stopPropagation()}>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => {
              setSelectedBrand(row);
              setIsDetailsModalOpen(true);
            }}
            title="Inspect Brand Profile"
          >
            <Eye size={13} />
            <span>Details</span>
          </button>

          <button
            className="btn btn-primary btn-sm"
            onClick={() => handleInitiateScan(row)}
            disabled={scanningBrandId === row.id}
            title="Initiate Impersonation Scan"
          >
            <Play size={12} fill="#fff" />
            <span>{scanningBrandId === row.id ? 'Scanning...' : 'Start Monitoring'}</span>
          </button>

          <button
            className="btn btn-outline btn-sm"
            style={{ color: '#ef4444', borderColor: '#fecaca' }}
            onClick={(e) => handleDeleteBrand(row.id, e)}
            title="Delete Brand"
          >
            <Trash2 size={13} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div>
      <DemoBanner isDemo={isDemo} />

      <div className="page-content">
        {scanNotification && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 18px',
            backgroundColor: '#ecfdf5',
            borderRadius: 'var(--radius-md)',
            border: '1px solid #a7f3d0',
            color: '#047857',
            fontSize: '0.84rem',
            marginBottom: 16
          }}>
            <CheckCircle size={18} />
            <span>{scanNotification}</span>
          </div>
        )}
        {/* Page Top Actions Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <div style={{ position: 'relative', width: 280 }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: 36, borderRadius: 999 }}
              placeholder="Search monitored brands..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn btn-primary"
              onClick={() => setIsAddModalOpen(true)}
            >
              <Plus size={16} />
              <span>Add Brand Profile</span>
            </button>
          </div>
        </div>

        {/* Brands Table Card */}
        <div className="card">
          <div className="card-header">
            <div className="card-title-group">
              <h3 className="card-title">Monitored Brand Assets ({filteredBrands.length})</h3>
              <p className="card-subtitle">
                Official baselines used to evaluate candidate similarity and detect brand spoofing
              </p>
            </div>
          </div>

          <DataTable
            columns={columns}
            data={filteredBrands}
            loading={loading}
            emptyTitle="No monitored brands"
            emptyMessage="Get started by registering a brand profile with official website and handles."
            emptyActionLabel="Register Brand"
            onEmptyAction={() => setIsAddModalOpen(true)}
            pageSize={6}
          />
        </div>
      </div>

      {/* ========================================================
          ADD BRAND MODAL
         ======================================================== */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register Monitored Brand Profile"
        size="large"
      >
        <form onSubmit={handleFormSubmit}>
          {submitSuccess && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 16px',
              backgroundColor: '#ecfdf5',
              borderRadius: 'var(--radius-md)',
              border: '1px solid #a7f3d0',
              color: '#047857',
              fontSize: '0.84rem',
              marginBottom: 16
            }}>
              <CheckCircle size={18} />
              <span>Brand profile successfully saved and queued for automated monitoring.</span>
            </div>
          )}

          {formErrors.submit && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 16px',
              backgroundColor: '#fef2f2',
              borderRadius: 'var(--radius-md)',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              fontSize: '0.84rem',
              marginBottom: 16
            }}>
              <AlertCircle size={18} />
              <span>{formErrors.submit}</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Brand Name */}
            <div className="form-group">
              <label className="form-label required">Brand Name</label>
              <input
                type="text"
                className={`form-input ${formErrors.name ? 'error' : ''}`}
                placeholder="e.g. Apex Secure Bank"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              {formErrors.name && <span className="form-error-text">{formErrors.name}</span>}
            </div>

            {/* Industry / Category */}
            <div className="form-group">
              <label className="form-label">Industry Sector</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Banking & Financial Services"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Official Website */}
            <div className="form-group">
              <label className="form-label required">Official Website URL</label>
              <input
                type="url"
                className={`form-input ${formErrors.website ? 'error' : ''}`}
                placeholder="https://www.apexsecurebank.com"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              />
              {formErrors.website && <span className="form-error-text">{formErrors.website}</span>}
            </div>

            {/* Brand Logo URL */}
            <div className="form-group">
              <label className="form-label">Logo Image URL</label>
              <input
                type="url"
                className="form-input"
                placeholder="https://.../logo.png (or leave blank for generated)"
                value={formData.logo}
                onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
              />
            </div>
          </div>

          {/* Official Developer / Publisher Names */}
          <div className="form-group">
            <label className="form-label">Authorized App Developer / Publisher Names</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Apex Financial Technologies LLC, Apex Corp (comma-separated)"
              value={formData.developerNames}
              onChange={(e) => setFormData({ ...formData, developerNames: e.target.value })}
            />
            <span className="form-hint">Used to distinguish genuine apps from fake third-party publishers</span>
          </div>

          {/* Known Aliases (Dynamic) */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label className="form-label">Known Brand Aliases & Trademarks</label>
              <button type="button" className="btn btn-outline btn-sm" onClick={handleAddAlias}>
                <Plus size={12} /> Add Alias
              </button>
            </div>
            {formData.aliases.map((alias, idx) => (
              <div key={idx} className="dynamic-row">
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Apex Bank, Apex Financial"
                  value={alias}
                  onChange={(e) => handleAliasChange(idx, e.target.value)}
                />
                {formData.aliases.length > 1 && (
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => handleRemoveAlias(idx)}>
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Official Social Media URLs (Dynamic) */}
          <div className="form-group" style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label className="form-label">Official Social Media Accounts</label>
              <button type="button" className="btn btn-outline btn-sm" onClick={handleAddSocial}>
                <Plus size={12} /> Add Social Account
              </button>
            </div>

            {formData.officialSocials.map((social, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 140px auto', gap: 8, marginBottom: 8 }}>
                <select
                  className="form-select"
                  value={social.platform}
                  onChange={(e) => handleSocialChange(idx, 'platform', e.target.value)}
                >
                  <option value="Twitter/X">Twitter/X</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Instagram">Instagram</option>
                  <option value="Facebook">Facebook</option>
                  <option value="Telegram">Telegram</option>
                  <option value="YouTube">YouTube</option>
                </select>

                <input
                  type="url"
                  className="form-input"
                  placeholder="https://x.com/ApexSecureBank"
                  value={social.url}
                  onChange={(e) => handleSocialChange(idx, 'url', e.target.value)}
                />

                <input
                  type="text"
                  className="form-input"
                  placeholder="@ApexSecureBank"
                  value={social.handle}
                  onChange={(e) => handleSocialChange(idx, 'handle', e.target.value)}
                />

                {formData.officialSocials.length > 1 && (
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => handleRemoveSocial(idx)}>
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Official Applications (Dynamic) */}
          <div className="form-group" style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label className="form-label">Official Mobile Applications</label>
              <button type="button" className="btn btn-outline btn-sm" onClick={handleAddApp}>
                <Plus size={12} /> Add Application
              </button>
            </div>

            {formData.officialApps.map((app, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, marginBottom: 8 }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="App Name (e.g. Apex Mobile Banking)"
                  value={app.name}
                  onChange={(e) => handleAppChange(idx, 'name', e.target.value)}
                />

                <input
                  type="text"
                  className="form-input"
                  placeholder="Package ID (e.g. com.apexsecurebank.mobile)"
                  value={app.packageId}
                  onChange={(e) => handleAppChange(idx, 'packageId', e.target.value)}
                />

                {formData.officialApps.length > 1 && (
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => handleRemoveApp(idx)}>
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24, borderTop: '1px solid var(--border-light)', paddingTop: 16 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsAddModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Registering & Initiating Monitoring...' : 'Save Brand & Start Monitoring'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================
          BRAND DETAILS MODAL
         ======================================================== */}
      {selectedBrand && (
        <Modal
          isOpen={isDetailsModalOpen}
          onClose={() => setIsDetailsModalOpen(false)}
          title={`Brand Profile: ${selectedBrand.name}`}
          size="large"
          footer={
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" onClick={() => setIsDetailsModalOpen(false)}>
                Close
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setIsDetailsModalOpen(false);
                  handleInitiateScan(selectedBrand);
                }}
              >
                <Play size={14} fill="#fff" />
                <span>Launch Impersonation Scan</span>
              </button>
            </div>
          }
        >
          <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border-light)' }}>
            <img
              src={selectedBrand.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedBrand.name)}&background=6366f1&color=fff`}
              alt=""
              style={{ width: 64, height: 64, borderRadius: 'var(--radius-md)', objectFit: 'cover', border: '1px solid #e2e8f0' }}
            />
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>{selectedBrand.name}</h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{selectedBrand.category} • Monitored since {formatDate(selectedBrand.lastScan)}</p>
              {selectedBrand.website && (
                <a
                  href={selectedBrand.website}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: '0.78rem', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4 }}
                >
                  {(selectedBrand.website || '').replace(/^https?:\/\//, '')} <ExternalLink size={12} />
                </a>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 8, color: 'var(--text-main)' }}>Official Social Media Handles</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {selectedBrand.officialSocials?.map((s, idx) => (
                  <div key={idx} style={{ padding: '8px 12px', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', fontSize: '0.78rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{s.platform}: {s.handle || s.url}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{s.url}</div>
                  </div>
                ))}
                {(!selectedBrand.officialSocials || selectedBrand.officialSocials.length === 0) && (
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>No official social handles configured.</span>
                )}
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 8, color: 'var(--text-main)' }}>Official Mobile Applications</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {selectedBrand.officialApps?.map((app, idx) => (
                  <div key={idx} style={{ padding: '8px 12px', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', fontSize: '0.78rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{app.name}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Package: {app.packageId || 'N/A'}</div>
                  </div>
                ))}
                {(!selectedBrand.officialApps || selectedBrand.officialApps.length === 0) && (
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>No official mobile apps registered.</span>
                )}
              </div>
            </div>
          </div>

          {selectedBrand.aliases?.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 8, color: 'var(--text-main)' }}>Protected Aliases</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {selectedBrand.aliases.map((alias, i) => (
                  <span key={i} style={{ padding: '4px 10px', backgroundColor: '#eef2ff', color: '#4338ca', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600 }}>
                    {alias}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
