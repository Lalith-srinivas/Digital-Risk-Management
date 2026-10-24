import React, { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  Download,
  Mail,
  ShieldAlert,
  FileText,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Send,
  Building,
  Info
} from 'lucide-react';
import Modal from './Modal';

const PLATFORM_DESTINATIONS = [
  {
    id: 'google_play',
    name: 'Google Play Store Legal & Abuse',
    recipient: 'googleplay-developer-support@google.com',
    portal: 'https://support.google.com/googleplay/android-developer/contact/takedown',
    type: 'app',
    policy: 'Google Play Developer Distribution Agreement & Impersonation Policy'
  },
  {
    id: 'apple_appstore',
    name: 'Apple App Store Legal & IP',
    recipient: 'appstorenotices@apple.com',
    portal: 'https://www.apple.com/legal/internet-services/itunes/appstorenotices/',
    type: 'app',
    policy: 'Apple Developer Program License Agreement & Trademark Guidelines'
  },
  {
    id: 'twitter_x',
    name: 'X (formerly Twitter) Trust & Safety',
    recipient: 'trademark@x.com',
    portal: 'https://help.twitter.com/forms/impersonation',
    type: 'social',
    policy: 'X Trademark and Impersonation Policy'
  },
  {
    id: 'meta',
    name: 'Meta (Instagram / Facebook) Brand Rights',
    recipient: 'ip@meta.com',
    portal: 'https://www.facebook.com/help/contact/634636770043106',
    type: 'social',
    policy: 'Meta Intellectual Property & Brand Misrepresentation Terms'
  },
  {
    id: 'telegram',
    name: 'Telegram Trust & Safety',
    recipient: 'abuse@telegram.org',
    portal: 'https://telegram.org/support',
    type: 'social',
    policy: 'Telegram Terms of Service (Prohibition of Impersonation & Scam Channels)'
  },
  {
    id: 'registrar',
    name: 'Domain Registrar / Hosting Provider (ICANN)',
    recipient: 'abuse@registrar-servers.com',
    portal: 'https://www.icann.org/compliance/complaints',
    type: 'domain',
    policy: 'UDRP (Uniform Domain-Name Dispute-Resolution Policy)'
  },
  {
    id: 'generic',
    name: 'General Platform Abuse / Legal Desk',
    recipient: 'abuse@platform.com',
    portal: '',
    type: 'all',
    policy: 'Standard Trademark Impersonation and Consumer Fraud Protection Standards'
  }
];

export default function TakedownModal({
  isOpen,
  onClose,
  finding,
  brand = {},
  analystName = 'Security Analyst'
}) {
  if (!finding) return null;

  // Determine intelligent default destination platform
  const getDefaultDestination = () => {
    const platform = (finding.platform || '').toLowerCase();
    const source = (finding.sourceType || '').toLowerCase();

    if (platform.includes('telegram')) return 'telegram';
    if (platform.includes('twitter') || platform.includes('x.com')) return 'twitter_x';
    if (platform.includes('instagram') || platform.includes('facebook') || platform.includes('meta')) return 'meta';
    if (platform.includes('apple') || platform.includes('ios')) return 'apple_appstore';
    if (platform.includes('google') || platform.includes('play')) return 'google_play';
    if (source === 'app') return 'google_play';
    return 'twitter_x';
  };

  const [selectedDestinationId, setSelectedDestinationId] = useState(getDefaultDestination);
  const [copied, setCopied] = useState(false);
  const [subjectLine, setSubjectLine] = useState('');
  const [reportDraft, setReportDraft] = useState('');

  const currentDestination = PLATFORM_DESTINATIONS.find(d => d.id === selectedDestinationId) || PLATFORM_DESTINATIONS[0];

  const brandName = brand.name || finding.brandName || 'Protected Brand Rights Holder';
  const brandWebsite = brand.website || 'Verified Corporate Domain';
  const authorizedDevs = brand.officialDevelopers?.length
    ? brand.officialDevelopers.join(', ')
    : brand.developerNames?.length
      ? brand.developerNames.join(', ')
      : 'Authorized Enterprise Organization';

  // Generate factual, evidence-based text avoiding unproven claims
  const generateDraft = (destinationId) => {
    const dest = PLATFORM_DESTINATIONS.find(d => d.id === destinationId) || currentDestination;
    const dateObserved = finding.detectionDate
      ? new Date(finding.detectionDate).toUTCString()
      : new Date().toUTCString();

    const subject = `[Trademark Impersonation Notice] Suspect Asset: ${finding.candidateName} (Brand: ${brandName})`;
    setSubjectLine(subject);

    // Extract objective evidence observed
    const evidenceLines = [];

    // 1. Lexical comparison
    if (finding.nameSimilarity !== undefined || finding.evidence?.name_similarity !== undefined) {
      const nameScore = finding.nameSimilarity ?? finding.evidence?.name_similarity;
      evidenceLines.push(
        `• LEXICAL SIMILARITY: An algorithmic name similarity of ${nameScore}% was measured between the protected trademark "${brandName}" and candidate name "${finding.candidateName}". The suspect identity incorporates the proprietary mark with unauthorized descriptive modifiers.`
      );
    } else {
      evidenceLines.push(
        `• IDENTITY OVERLAP: The candidate asset title "${finding.candidateName}" utilizes the trademark "${brandName}" without verified organizational affiliation.`
      );
    }

    // 2. Visual comparison
    if (finding.logoSimilarity !== undefined || (finding.evidence?.logo_similarity && finding.evidence.logo_similarity > 0)) {
      const logoScore = finding.logoSimilarity ?? finding.evidence?.logo_similarity;
      evidenceLines.push(
        `• VISUAL ASSET SIMILARITY: Perceptual image hashing determined a visual mark similarity of ${logoScore}%, indicating replication or confusingly close mimicry of the official ${brandName} brand emblem/logo.`
      );
    }

    // 3. Publisher / Developer discrepancy
    if (finding.developer || finding.sourceType === 'app') {
      evidenceLines.push(
        `• PUBLISHER DIVERGENCE: The candidate asset lists publisher/creator as "${finding.developer || 'Unverified Developer'}", which does not match authorized rights holder developer(s): "${authorizedDevs}".`
      );
    }

    // 4. Deceptive heuristics / keywords
    if (finding.reasons && finding.reasons.length > 0) {
      evidenceLines.push(
        `• BEHAVIORAL & CONTENT OBSERVATIONS:\n${finding.reasons.map(r => `    - ${r}`).join('\n')}`
      );
    } else if (finding.explanation) {
      evidenceLines.push(`• BEHAVIORAL OBSERVATION: ${finding.explanation}`);
    }

    const draft = `TAKEDOWN REQUEST & NOTICE OF BRAND IMPERSONATION
Document Ref: SOC360-TKDN-${finding.id}
Date of Notice: ${new Date().toUTCString()}

TO: ${dest.name}
Attn: Abuse, Trademark & Trust & Safety Team
Official Contact: ${dest.recipient}

================================================================================
1. RIGHTS HOLDER IDENTIFICATION
================================================================================
Official Trademark / Brand Owner: ${brandName}
Authorized Website: ${brandWebsite}
Authorized Application Developers / Representatives: ${authorizedDevs}
Authorized Reporting Platform: SOC 360 Digital Risk Protection System

================================================================================
2. SUSPECT INFRINGING ASSET DETAILS
================================================================================
Candidate Asset Title: ${finding.candidateName}
Observed Vector / Marketplace: ${finding.platform || finding.sourceType}
Identifier / Handle / Package ID: ${finding.candidateHandle || finding.packageId || 'Not Applicable'}
Observed Location URL: ${finding.candidateUrl || 'N/A'}
First Monitored Date: ${dateObserved}
Current Risk Assessment: ${finding.riskLevel?.toUpperCase()} (Score: ${finding.riskScore}/100)

================================================================================
3. FACTUAL EVIDENCE OBSERVED
================================================================================
The following objective observations were recorded by digital risk surveillance:

${evidenceLines.join('\n\n')}

Note: These factual observations indicate an unauthorized entity representing itself in association with ${brandName}, creating high likelihood of consumer confusion, credential harvesting, or brand degradation under your ${dest.policy}.

================================================================================
4. REQUESTED ENFORCEMENT ACTION
================================================================================
In accordance with your platform's ${dest.policy}, we respectfully request that you:
1. Conduct an immediate review of the reported asset (${finding.candidateUrl || finding.candidateHandle || finding.candidateName}).
2. Suspend, disable, or remove this unauthorized asset to protect consumers and prevent further confusion.
3. Notify the account holder of this trademark and identity impersonation report.

================================================================================
5. GOOD FAITH STATEMENT & DECLARATION
================================================================================
1. I have a good faith belief that the use of the trademark and proprietary identity elements described above is not authorized by the brand owner, its authorized agents, or applicable law.
2. The information contained in this notification is accurate to the best of my knowledge based upon recorded telemetry.
3. I declare under penalty of perjury that I am authorized to submit this report on behalf of the protected brand.

Submitted By:
Analyst Signature: ${analystName}
Title: Digital Risk & Brand Protection Analyst
Operations Unit: SOC 360 Security Operations Center
Generated At: ${new Date().toLocaleString()}
`;

    setReportDraft(draft);
  };

  // Re-generate draft on destination change or finding load
  useEffect(() => {
    const defaultDest = getDefaultDestination();
    setSelectedDestinationId(defaultDest);
    generateDraft(defaultDest);
  }, [finding, brand]);

  const handleDestinationChange = (e) => {
    const newDestId = e.target.value;
    setSelectedDestinationId(newDestId);
    generateDraft(newDestId);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reportDraft);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy takedown notice:', err);
    }
  };

  const handleDownload = (format = 'txt') => {
    const filename = `takedown-notice-${(finding.candidateName || 'suspect').toLowerCase().replace(/[^a-z0-9]/g, '_')}-${new Date().toISOString().split('T')[0]}.${format}`;
    const blob = new Blob([reportDraft], { type: format === 'md' ? 'text/markdown;charset=utf-8' : 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Takedown Report Draft Generator"
      size="large"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Banner notification */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          padding: '12px 16px',
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.8rem',
          color: '#166534',
          lineHeight: 1.45
        }}>
          <ShieldAlert size={18} style={{ color: '#16a34a', flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong>Evidence-Based Legal Notice Draft:</strong> This report draft cites strictly observed facts, measured similarity metrics, and publisher discrepancies. Review and customize before transmission.
          </div>
        </div>

        {/* Top Control Bar: Destination Selector & Portal Link */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 12,
          padding: '14px 16px',
          backgroundColor: '#f8fafc',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-light)'
        }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase' }}>
              Target Enforcement Destination
            </label>
            <select
              className="form-select"
              value={selectedDestinationId}
              onChange={handleDestinationChange}
              style={{ width: '100%', fontSize: '0.84rem' }}
            >
              {PLATFORM_DESTINATIONS.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.recipient})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase' }}>
              Target Abuse Channel
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 38 }}>
              <div style={{
                flex: 1,
                padding: '8px 12px',
                backgroundColor: '#ffffff',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                color: 'var(--text-main)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                <Mail size={13} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle', color: 'var(--primary)' }} />
                <span>{currentDestination.recipient}</span>
              </div>

              {currentDestination.portal && (
                <a
                  href={currentDestination.portal}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-outline btn-sm"
                  title="Open Official Platform Abuse Portal"
                  style={{ flexShrink: 0, height: 38, padding: '0 10px' }}
                >
                  <ExternalLink size={13} />
                  <span>Portal</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Subject Line Preview */}
        <div>
          <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4, textTransform: 'uppercase' }}>
            Email / Ticket Subject Line
          </label>
          <input
            type="text"
            className="form-input"
            value={subjectLine}
            onChange={(e) => setSubjectLine(e.target.value)}
            style={{ fontSize: '0.82rem', fontFamily: 'monospace', fontWeight: 600 }}
          />
        </div>

        {/* Report Body Editor */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Draft Notice Body (Editable)
            </label>
            <button
              className="btn btn-outline btn-sm"
              style={{ fontSize: '0.72rem', padding: '2px 8px', height: 26 }}
              onClick={() => generateDraft(selectedDestinationId)}
              title="Reset any edits back to original generated text"
            >
              <RefreshCw size={11} />
              <span>Reset Template</span>
            </button>
          </div>
          <textarea
            className="form-textarea"
            rows={14}
            value={reportDraft}
            onChange={(e) => setReportDraft(e.target.value)}
            style={{
              fontFamily: 'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              fontSize: '0.78rem',
              lineHeight: 1.45,
              backgroundColor: '#fafbfc',
              color: '#1e293b',
              whiteSpace: 'pre-wrap'
            }}
          />
        </div>

        {/* Modal Footer Controls */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          paddingTop: 14,
          borderTop: '1px solid var(--border-light)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => handleDownload('txt')}
              title="Download text file (.txt)"
            >
              <Download size={13} />
              <span>Download (.txt)</span>
            </button>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => handleDownload('md')}
              title="Download markdown file (.md)"
            >
              <FileText size={13} />
              <span>Download (.md)</span>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              className="btn btn-outline"
              onClick={onClose}
            >
              Close
            </button>
            <button
              className="btn btn-primary"
              onClick={handleCopy}
              style={{ minWidth: 160 }}
            >
              {copied ? (
                <>
                  <Check size={16} style={{ color: '#ffffff' }} />
                  <span>Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy size={16} />
                  <span>Copy Report</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
