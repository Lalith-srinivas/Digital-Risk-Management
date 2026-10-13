/**
 * SOC 360 - Threat Report Generators (PDF & CSV)
 *
 * Provides safe in-memory report generation for both Guest and Authenticated users.
 * Defends against CSV formula injection and supports offline printing/PDF export.
 */

/**
 * Sanitize cell values against CSV / Excel Formula Injection (CWE-1236)
 */
function sanitizeCsvValue(val) {
  if (val === null || val === undefined) return '""';
  let str = String(val).trim();
  // If value begins with =, +, -, or @, neutralize formula execution with a leading single quote
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  // Escape double quotes
  str = str.replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Generate and trigger download of CSV Threat Report
 */
export function downloadCsvReport(brandName, findings = [], scanMetadata = {}) {
  const headers = [
    'Brand Name',
    'Candidate Name',
    'Source Type',
    'Platform',
    'Candidate URL / Handle',
    'Risk Score',
    'Risk Level',
    'Evidence Summary',
    'Detection Timestamp',
    'Review Status',
    'Data Provenance'
  ];

  const rows = findings.map(f => [
    sanitizeCsvValue(f.brandName || brandName || 'Protected Brand'),
    sanitizeCsvValue(f.candidateName || 'Candidate Identity'),
    sanitizeCsvValue(f.sourceType || 'social'),
    sanitizeCsvValue(f.platform || 'Social Media'),
    sanitizeCsvValue(f.candidateUrl || f.candidateHandle || ''),
    sanitizeCsvValue(f.riskScore !== undefined ? f.riskScore : (f.risk_score || 0)),
    sanitizeCsvValue(f.riskLevel || f.risk_level || 'Low'),
    sanitizeCsvValue((f.reasons || []).join('; ') || f.explanation || 'Similarity match'),
    sanitizeCsvValue(f.detectionDate || f.created_at || new Date().toISOString()),
    sanitizeCsvValue(f.reviewStatus || f.review_status || 'New'),
    sanitizeCsvValue(f.isDemo || f.is_demo ? 'Simulated Demo' : 'Live Detection')
  ]);

  const csvContent = [
    headers.map(h => `"${h}"`).join(','),
    ...rows.map(row => row.join(','))
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeName = (brandName || 'brand').toLowerCase().replace(/[^a-z0-9]/g, '_');
  const timestamp = new Date().toISOString().split('T')[0];
  link.setAttribute('href', url);
  link.setAttribute('download', `soc360_threat_report_${safeName}_${timestamp}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate a printable Executive HTML / PDF Dossier in a clean print window
 */
export function downloadPdfReport(brandName, findings = [], scanMetadata = {}) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to generate and print the PDF Threat Report.');
    return;
  }

  const generatedDate = new Date().toLocaleString();
  const highCount = findings.filter(f => (f.riskLevel || '').toLowerCase() === 'high' || (f.riskLevel || '').toLowerCase() === 'critical').length;
  const medCount = findings.filter(f => (f.riskLevel || '').toLowerCase() === 'medium').length;
  const lowCount = findings.filter(f => (f.riskLevel || '').toLowerCase() === 'low').length;

  const findingsRows = findings.map((f, idx) => `
    <tr style="border-bottom: 1px solid #e2e8f0; font-size: 13px;">
      <td style="padding: 10px 8px; font-weight: 600; color: #1e293b;">${idx + 1}. ${f.candidateName || 'Unknown'}</td>
      <td style="padding: 10px 8px; color: #64748b;">${f.platform || f.sourceType || 'Social'}</td>
      <td style="padding: 10px 8px;">
        <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; background: ${
          (f.riskLevel || '').toLowerCase() === 'critical' ? '#fee2e2; color: #dc2626' :
          (f.riskLevel || '').toLowerCase() === 'high' ? '#fee2e2; color: #b91c1c' :
          (f.riskLevel || '').toLowerCase() === 'medium' ? '#fef3c7; color: #d97706' :
          '#dcfce7; color: #15803d'
        };">
          ${f.riskLevel || 'Low'} (${f.riskScore || 0})
        </span>
      </td>
      <td style="padding: 10px 8px; color: #334155; max-width: 280px; word-break: break-word;">
        ${(f.reasons || []).join('<br>• ') || f.explanation || 'Similarity match'}
      </td>
      <td style="padding: 10px 8px; color: #4f46e5; font-size: 12px; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
        ${f.candidateUrl || f.candidateHandle || 'N/A'}
      </td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>SOC 360 Executive Threat Dossier — ${brandName}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 20px; line-height: 1.5; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #6366f1; padding-bottom: 16px; margin-bottom: 24px; }
          .logo { font-size: 24px; font-weight: 800; color: #4338ca; }
          .badge { background: #e0e7ff; color: #4338ca; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; }
          .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
          .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center; }
          .kpi-val { font-size: 22px; font-weight: 700; color: #1e293b; }
          .kpi-lbl { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
          table { width: 100%; border-collapse: collapse; text-align: left; }
          th { background: #f1f5f9; padding: 10px 8px; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; border-bottom: 2px solid #cbd5e1; }
          .footer { margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 11px; color: #94a3b8; text-align: center; }
          @media print {
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 20px; text-align: right;">
          <button onclick="window.print()" style="background: #4f46e5; color: #fff; border: none; padding: 8px 18px; border-radius: 6px; font-weight: 600; cursor: pointer;">
            Print / Save as PDF
          </button>
        </div>

        <div class="header">
          <div>
            <div class="logo">SOC 360</div>
            <div style="font-size: 13px; color: #64748b;">Digital Risk Protection & Brand Impersonation Defense</div>
          </div>
          <div style="text-align: right;">
            <span class="badge">Executive Threat Dossier</span>
            <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Generated: ${generatedDate}</div>
          </div>
        </div>

        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px;">
          <div style="font-size: 13px; color: #64748b; text-transform: uppercase; font-weight: 600;">Target Asset</div>
          <div style="font-size: 20px; font-weight: 700; color: #0f172a;">${brandName || 'Enterprise Brand'}</div>
          <div style="font-size: 13px; color: #475569; margin-top: 4px;">
            Continuous automated surveillance across digital channels, social media ecosystems, and application marketplaces.
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-val">${scanMetadata.candidatesAnalyzed || findings.length}</div>
            <div class="kpi-lbl">Candidates Scanned</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-val" style="color: #dc2626;">${highCount}</div>
            <div class="kpi-lbl">High Priority Risks</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-val" style="color: #d97706;">${medCount}</div>
            <div class="kpi-lbl">Medium Review Alerts</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-val" style="color: #15803d;">${lowCount}</div>
            <div class="kpi-lbl">Low / Benign Profiles</div>
          </div>
        </div>

        <h3 style="font-size: 16px; font-weight: 700; color: #1e293b; margin-bottom: 10px;">
          Detected Impersonation & Trademark Infringement Findings (${findings.length})
        </h3>

        <table>
          <thead>
            <tr>
              <th>Identity / Candidate</th>
              <th>Vector</th>
              <th>Risk Score</th>
              <th>Evidence Breakdown</th>
              <th>Target URL / Identifier</th>
            </tr>
          </thead>
          <tbody>
            ${findingsRows || '<tr><td colspan="5" style="text-align: center; padding: 20px;">No suspicious candidates detected.</td></tr>'}
          </tbody>
        </table>

        <div class="footer">
          SOC 360 Digital Risk Protection Platform • Confidential Security Audit Report • Disclaimer: Similarity scores represent algorithmic review priorities and do not establish verified legal proof of fraud without analyst confirmation.
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
