/**
 * SOC 360 - Demo Data Adapter
 *
 * Provides realistic, structured digital risk & impersonation detection data
 * for hackathon demonstration when the FastAPI backend is offline.
 *
 * NOTE: All data returned here is explicitly tagged with `isDemoData: true`.
 * This must never be represented as real live surveillance.
 */

const STORAGE_KEYS = {
  BRANDS: 'soc360_demo_brands_v1',
  FINDINGS: 'soc360_demo_findings_v1',
  SCANS: 'soc360_demo_scans_v1',
};

export const INITIAL_BRANDS = [
  {
    id: 'brand-1',
    name: 'Apex Secure Bank',
    category: 'Banking & Financial Services',
    website: 'https://www.apexsecurebank.com',
    logo: 'https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?w=128&auto=format&fit=crop&q=80',
    aliases: ['Apex Bank', 'Apex Financial', 'Apex Online Banking'],
    officialSocials: [
      { platform: 'Twitter/X', url: 'https://x.com/ApexSecureBank', handle: '@ApexSecureBank', verified: true },
      { platform: 'LinkedIn', url: 'https://linkedin.com/company/apex-secure-bank', handle: 'apex-secure-bank', verified: true },
      { platform: 'Instagram', url: 'https://instagram.com/apexsecurebank', handle: '@apexsecurebank', verified: true }
    ],
    officialApps: [
      { name: 'Apex Mobile Banking', packageId: 'com.apexsecurebank.mobile', storeUrl: 'https://play.google.com/store/apps/details?id=com.apexsecurebank.mobile', developer: 'Apex Financial Technologies LLC' },
      { name: 'Apex Authenticator', packageId: 'com.apexsecurebank.auth', storeUrl: 'https://apps.apple.com/app/apex-authenticator/id14529381', developer: 'Apex Financial Technologies LLC' }
    ],
    developerNames: ['Apex Financial Technologies LLC', 'Apex Corporate Dev'],
    lastScan: '2026-10-12T07:45:00Z',
    status: 'Active Monitoring',
    findingsCount: 5,
    isDemoData: true
  },
  {
    id: 'brand-2',
    name: 'NovaPay Global',
    category: 'Fintech & Payment Gateway',
    website: 'https://novapay.global',
    logo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&auto=format&fit=crop&q=80',
    aliases: ['NovaPay', 'Nova Wallet', 'Nova Payments'],
    officialSocials: [
      { platform: 'Twitter/X', url: 'https://x.com/NovaPayGlobal', handle: '@NovaPayGlobal', verified: true },
      { platform: 'Instagram', url: 'https://instagram.com/novapay_official', handle: '@novapay_official', verified: true },
      { platform: 'Telegram', url: 'https://t.me/NovaPayOfficialAnnounce', handle: 'NovaPayOfficialAnnounce', verified: true }
    ],
    officialApps: [
      { name: 'NovaPay - Send & Receive Money', packageId: 'global.novapay.app', storeUrl: 'https://play.google.com/store/apps/details?id=global.novapay.app', developer: 'NovaPay Inc.' }
    ],
    developerNames: ['NovaPay Inc.'],
    lastScan: '2026-10-12T06:15:00Z',
    status: 'Active Monitoring',
    findingsCount: 4,
    isDemoData: true
  },
  {
    id: 'brand-3',
    name: 'CloudPulse SaaS',
    category: 'Cloud Infrastructure & DevOps',
    website: 'https://cloudpulse.io',
    logo: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=128&auto=format&fit=crop&q=80',
    aliases: ['CloudPulse', 'PulseCloud', 'CloudPulse Observability'],
    officialSocials: [
      { platform: 'Twitter/X', url: 'https://x.com/CloudPulseHQ', handle: '@CloudPulseHQ', verified: true },
      { platform: 'GitHub', url: 'https://github.com/cloudpulse-io', handle: 'cloudpulse-io', verified: true }
    ],
    officialApps: [],
    developerNames: ['CloudPulse Systems'],
    lastScan: '2026-10-11T22:30:00Z',
    status: 'Active Monitoring',
    findingsCount: 2,
    isDemoData: true
  },
  {
    id: 'brand-4',
    name: 'OmniHealth Digital',
    category: 'Telehealth & Medical Services',
    website: 'https://omnihealth.care',
    logo: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=128&auto=format&fit=crop&q=80',
    aliases: ['OmniHealth', 'Omni Care Portal'],
    officialSocials: [
      { platform: 'LinkedIn', url: 'https://linkedin.com/company/omnihealth-care', handle: 'omnihealth-care', verified: true },
      { platform: 'Facebook', url: 'https://facebook.com/OmniHealthCareOfficial', handle: 'OmniHealthCareOfficial', verified: true }
    ],
    officialApps: [
      { name: 'OmniHealth Patient Care', packageId: 'care.omnihealth.patient', storeUrl: 'https://play.google.com/store/apps/details?id=care.omnihealth.patient', developer: 'OmniHealth Group' }
    ],
    developerNames: ['OmniHealth Group'],
    lastScan: '2026-10-11T14:10:00Z',
    status: 'Active Monitoring',
    findingsCount: 2,
    isDemoData: true
  }
];

export const INITIAL_FINDINGS = [
  {
    id: 'find-101',
    brandId: 'brand-1',
    brandName: 'Apex Secure Bank',
    candidateName: 'Apex Bank Support & Recovery Assistance',
    sourceType: 'social',
    platform: 'Twitter/X',
    candidateHandle: '@ApexBank_HelpDesk',
    candidateUrl: 'https://x.com/ApexBank_HelpDesk',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=96&auto=format&fit=crop&q=80',
    riskScore: 89,
    riskLevel: 'High',
    nameSimilarity: 92,
    logoSimilarity: 88,
    detectionDate: '2026-10-12T07:22:00Z',
    reviewStatus: 'Needs Review',
    verdict: 'Suspicious Impersonator',
    reasons: [
      'Account claiming official support status without verified organization badge',
      'Bio contains shortened external phishing link directing to non-official domain (apex-account-verify.net)',
      'High visual similarity (88%) to official Apex Secure Bank corporate badge',
      'Account created 4 days ago with high reply velocity toward customer complaint queries'
    ],
    evidenceSignals: [
      { name: 'Handle Similarity', score: 94, detail: 'Target "@ApexSecureBank" vs suspect "@ApexBank_HelpDesk"' },
      { name: 'Logo Perceptual Hash Match', score: 88, detail: 'High vector similarity match with Apex shield logo' },
      { name: 'Phishing Keyword Frequency', score: 95, detail: 'Keywords found: "Account suspended", "Verify OTP", "Direct message support"' },
      { name: 'Domain Reputation', score: 90, detail: 'Bio URL apex-account-verify.net registered 72 hours ago' }
    ],
    reviewNotes: '',
    isDemoData: true
  },
  {
    id: 'find-102',
    brandId: 'brand-1',
    brandName: 'Apex Secure Bank',
    candidateName: 'Apex Mobile Banking Pro - Instant Loan',
    sourceType: 'app',
    platform: 'APK Repository / Unofficial Store',
    candidateHandle: 'com.apexsec.bankloans',
    candidateUrl: 'https://apk-mirror-store-example.org/download/apex-mobile-pro.apk',
    avatarUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=96&auto=format&fit=crop&q=80',
    developer: 'Quick Apex Capital LTD',
    packageId: 'com.apexsec.bankloans',
    riskScore: 94,
    riskLevel: 'High',
    nameSimilarity: 86,
    logoSimilarity: 91,
    detectionDate: '2026-10-12T05:40:00Z',
    reviewStatus: 'Investigating',
    verdict: 'High Risk Fake App',
    reasons: [
      'Package identifier mimics official banking application namespace',
      'Unsigned APK distributed on unregulated third-party marketplace',
      'Requests intrusive permissions (READ_SMS, READ_CONTACTS, ACCESSIBILITY_SERVICE)',
      'Publisher "Quick Apex Capital LTD" has no corporate affiliation with Apex Financial Technologies LLC'
    ],
    evidenceSignals: [
      { name: 'App Name Similarity', score: 86, detail: 'Includes brand name + deceptive "Instant Loan" suffix' },
      { name: 'Icon Perceptual Hash', score: 91, detail: 'Near-identical color scheme and emblem to official app' },
      { name: 'Permissions Risk Matrix', score: 98, detail: 'Requests banking credential interception privileges' },
      { name: 'Developer Identity', score: 95, detail: 'Unverified developer with disposable protonmail contact' }
    ],
    reviewNotes: 'Flagged for emergency takedown notice to hosting mirror.',
    isDemoData: true
  },
  {
    id: 'find-103',
    brandId: 'brand-2',
    brandName: 'NovaPay Global',
    candidateName: 'NovaPay Airdrop & VIP Rewards',
    sourceType: 'social',
    platform: 'Telegram',
    candidateHandle: 't.me/NovaPay_VIP_Rewards',
    candidateUrl: 'https://t.me/NovaPay_VIP_Rewards',
    avatarUrl: 'https://images.unsplash.com/photo-1622979135225-d2ba269bc1df?w=96&auto=format&fit=crop&q=80',
    riskScore: 84,
    riskLevel: 'High',
    nameSimilarity: 89,
    logoSimilarity: 85,
    detectionDate: '2026-10-11T20:15:00Z',
    reviewStatus: 'Confirmed Impersonation',
    verdict: 'Cryptocurrency Scam Channel',
    reasons: [
      'Promoting unauthorized promotional bonus requesting seed phrases and private keys',
      'Copies official branding and header assets from NovaPay official Telegram announcements',
      'Automated bot redirecting users to fake web3 wallet authorization screen'
    ],
    evidenceSignals: [
      { name: 'Channel Branding Similarity', score: 89, detail: 'Uses NovaPay official typography and trademark' },
      { name: 'Scam Heuristics', score: 92, detail: 'High concentration of fraudulent giveaway language' },
      { name: 'Target Destination', score: 88, detail: 'Connects to known wallet-drainer smart contract' }
    ],
    reviewNotes: 'Confirmed malicious. Takedown requested to Telegram Trust & Safety.',
    isDemoData: true
  },
  {
    id: 'find-104',
    brandId: 'brand-3',
    brandName: 'CloudPulse SaaS',
    candidateName: 'CloudPulse Community Fans',
    sourceType: 'social',
    platform: 'Twitter/X',
    candidateHandle: '@CloudPulseFans',
    candidateUrl: 'https://x.com/CloudPulseFans',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=96&auto=format&fit=crop&q=80',
    riskScore: 38,
    riskLevel: 'Low',
    nameSimilarity: 75,
    logoSimilarity: 42,
    detectionDate: '2026-10-11T16:04:00Z',
    reviewStatus: 'False Positive',
    verdict: 'Legitimate Community Fan Page',
    reasons: [
      'Bio explicitly states: "Unofficial fan and user group. Not affiliated with CloudPulse Systems."',
      'No phishing or credential requests observed',
      'Retweets official product releases and community tutorials'
    ],
    evidenceSignals: [
      { name: 'Name Overlap', score: 75, detail: 'Contains brand name with community moniker' },
      { name: 'Logo Similarity', score: 42, detail: 'Distinct fan art illustration; no deceptive replica' },
      { name: 'Threat Language', score: 5, detail: 'Zero malicious patterns detected' }
    ],
    reviewNotes: 'Reviewed by analyst. Marked benign community fan club.',
    isDemoData: true
  },
  {
    id: 'find-105',
    brandId: 'brand-2',
    brandName: 'NovaPay Global',
    candidateName: 'Nova Fast Pay APK Wallet',
    sourceType: 'app',
    platform: 'Third-party Android Market',
    candidateHandle: 'com.novafast.paywallet',
    candidateUrl: 'https://app-host-world.cc/nova-fast-pay',
    avatarUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=96&auto=format&fit=crop&q=80',
    developer: 'Nova Soft Labs',
    packageId: 'com.novafast.paywallet',
    riskScore: 71,
    riskLevel: 'Medium',
    nameSimilarity: 81,
    logoSimilarity: 68,
    detectionDate: '2026-10-11T11:28:00Z',
    reviewStatus: 'Needs Review',
    verdict: 'Potential Unlicensed Derivative App',
    reasons: [
      'App title overlaps heavily with NovaPay brand terms',
      'Publisher has no commercial agreement or license on record',
      'Integrates third-party ad networks with aggressive redirect behaviors'
    ],
    evidenceSignals: [
      { name: 'Name Similarity', score: 81, detail: 'High lexical overlap with NovaPay terminology' },
      { name: 'Icon Similarity', score: 68, detail: 'Similar blue/violet gradient palette' },
      { name: 'Manifest Risk', score: 65, detail: 'Contains outdated WebView implementation' }
    ],
    reviewNotes: '',
    isDemoData: true
  },
  {
    id: 'find-106',
    brandId: 'brand-4',
    brandName: 'OmniHealth Digital',
    candidateName: 'OmniHealth Clinic Appointments Help',
    sourceType: 'social',
    platform: 'Facebook',
    candidateHandle: 'OmniHealthAppointmentHelp',
    candidateUrl: 'https://facebook.com/OmniHealthAppointmentHelp',
    avatarUrl: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=96&auto=format&fit=crop&q=80',
    riskScore: 68,
    riskLevel: 'Medium',
    nameSimilarity: 87,
    logoSimilarity: 72,
    detectionDate: '2026-10-10T19:50:00Z',
    reviewStatus: 'Investigating',
    verdict: 'Suspicious Third-Party Page',
    reasons: [
      'Unofficial page collecting patient contact numbers and insurance provider names',
      'Lacks healthcare provider compliance or verified verification badges',
      'Contact email points to generic webmail address rather than corporate domain'
    ],
    evidenceSignals: [
      { name: 'Name Similarity', score: 87, detail: 'Matches official brand name with support suffix' },
      { name: 'Visual Asset Match', score: 72, detail: 'Re-uses official banner photograph' },
      { name: 'Data Harvesting Risk', score: 76, detail: 'Form asking for sensitive personal health inquiries' }
    ],
    reviewNotes: '',
    isDemoData: true
  },
  {
    id: 'find-107',
    brandId: 'brand-1',
    brandName: 'Apex Secure Bank',
    candidateName: 'Apex Bank Customer Care',
    sourceType: 'social',
    platform: 'Instagram',
    candidateHandle: '@apexbank_customercare_247',
    candidateUrl: 'https://instagram.com/apexbank_customercare_247',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=96&auto=format&fit=crop&q=80',
    riskScore: 82,
    riskLevel: 'High',
    nameSimilarity: 88,
    logoSimilarity: 84,
    detectionDate: '2026-10-10T09:12:00Z',
    reviewStatus: 'Open',
    verdict: 'Deceptive Social Handle',
    reasons: [
      'Impersonating customer service team on Instagram',
      'Directing users in comments to WhatsApp phone number for card unlock',
      'Replicating official promotional graphics without authorization'
    ],
    evidenceSignals: [
      { name: 'Name Match', score: 88, detail: 'High similarity score' },
      { name: 'Image Perceptual Hash', score: 84, detail: 'Exact crop of corporate logo' },
      { name: 'Fraud Vectors', score: 91, detail: 'External WhatsApp redirection for card details' }
    ],
    reviewNotes: '',
    isDemoData: true
  }
];

export const INITIAL_SCANS = [
  {
    id: 'scan-501',
    brandName: 'Apex Secure Bank',
    type: 'Social Profiles Scan',
    target: 'Twitter/X, Instagram, Telegram',
    timestamp: '2026-10-12T07:45:00Z',
    duration: '42s',
    candidatesAnalyzed: 18,
    findingsGenerated: 3,
    status: 'Completed',
    isDemoData: true
  },
  {
    id: 'scan-502',
    brandName: 'Apex Secure Bank',
    type: 'App Store Discovery',
    target: 'Unofficial APK Repos & Third-Party Catalogs',
    timestamp: '2026-10-12T05:38:00Z',
    duration: '1m 12s',
    candidatesAnalyzed: 9,
    findingsGenerated: 1,
    status: 'Completed',
    isDemoData: true
  },
  {
    id: 'scan-503',
    brandName: 'NovaPay Global',
    type: 'Social Profiles Scan',
    target: 'Telegram, Reddit, Twitter/X',
    timestamp: '2026-10-12T06:15:00Z',
    duration: '35s',
    candidatesAnalyzed: 14,
    findingsGenerated: 2,
    status: 'Completed',
    isDemoData: true
  },
  {
    id: 'scan-504',
    brandName: 'CloudPulse SaaS',
    type: 'Social Profiles Scan',
    target: 'Twitter/X, LinkedIn',
    timestamp: '2026-10-11T22:30:00Z',
    duration: '28s',
    candidatesAnalyzed: 8,
    findingsGenerated: 1,
    status: 'Completed',
    isDemoData: true
  }
];

// Helper to initialize local demo store
export function getStoredDemoData() {
  let brands = INITIAL_BRANDS;
  let findings = INITIAL_FINDINGS;
  let scans = INITIAL_SCANS;

  try {
    const storedBrands = localStorage.getItem(STORAGE_KEYS.BRANDS);
    if (storedBrands) brands = JSON.parse(storedBrands);
    else localStorage.setItem(STORAGE_KEYS.BRANDS, JSON.stringify(INITIAL_BRANDS));

    const storedFindings = localStorage.getItem(STORAGE_KEYS.FINDINGS);
    if (storedFindings) findings = JSON.parse(storedFindings);
    else localStorage.setItem(STORAGE_KEYS.FINDINGS, JSON.stringify(INITIAL_FINDINGS));

    const storedScans = localStorage.getItem(STORAGE_KEYS.SCANS);
    if (storedScans) scans = JSON.parse(storedScans);
    else localStorage.setItem(STORAGE_KEYS.SCANS, JSON.stringify(INITIAL_SCANS));
  } catch (err) {
    console.warn('LocalStorage unavailable for demo data, using in-memory defaults', err);
  }

  return { brands, findings, scans };
}

export function saveStoredDemoData({ brands, findings, scans }) {
  try {
    if (brands) localStorage.setItem(STORAGE_KEYS.BRANDS, JSON.stringify(brands));
    if (findings) localStorage.setItem(STORAGE_KEYS.FINDINGS, JSON.stringify(findings));
    if (scans) localStorage.setItem(STORAGE_KEYS.SCANS, JSON.stringify(scans));
  } catch (err) {
    console.warn('Failed to save to localStorage', err);
  }
}
