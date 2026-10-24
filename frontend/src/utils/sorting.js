/**
 * SOC 360 - Brand Matching & Monitoring Results Prioritization
 *
 * Ensures that findings matching the protected brand name appear FIRST in all
 * queues and monitoring displays, followed by remaining third-party candidates,
 * maintaining high-to-low risk score prioritization within each tier.
 */

/**
 * Checks if a candidate/finding matches a specified brand name or aliases.
 *
 * @param {Object} finding The candidate or finding object
 * @param {string} targetBrand Optional specific brand name to match against
 * @param {Array<string>} aliases Optional list of brand aliases
 * @returns {boolean} True if candidate explicitly mentions or matches the brand name
 */
export function matchesBrandName(finding, targetBrand = '', aliases = []) {
  if (!finding) return false;

  // Resolve target brand name
  let brandName = (
    targetBrand ||
    finding.brandName ||
    finding.brand_name ||
    finding.brandDetails?.name ||
    ''
  ).trim();

  // If brandName is generic fallback 'Protected Brand', check if finding has a brandDetails object with a name
  if (brandName.toLowerCase() === 'protected brand') {
    brandName = (finding.brandDetails?.name || '').trim();
    if (brandName.toLowerCase() === 'protected brand') {
      brandName = '';
    }
  }

  if (!brandName || brandName.length < 2) {
    return false;
  }

  // Build clean search tokens from brand name
  const rawTerms = [brandName];
  if (Array.isArray(aliases)) {
    aliases.forEach(a => {
      if (a && typeof a === 'string' && a.trim().length > 1) {
        rawTerms.push(a.trim());
      }
    });
  }

  // Pre-process search terms (lowercase, trimmed, and alphanumeric normalized)
  const searchTerms = [];
  rawTerms.forEach(term => {
    const lower = term.toLowerCase();
    searchTerms.push(lower);
    const alphaNum = lower.replace(/[^a-z0-9]/gi, '');
    if (alphaNum.length >= 3 && alphaNum !== lower) {
      searchTerms.push(alphaNum);
    }
    // Also include individual significant words if brand is multi-word (e.g. "Nike Inc" -> "nike")
    const words = lower.split(/[\s,._-]+/).filter(w => w.length >= 3 && !['inc', 'llc', 'ltd', 'corp', 'co', 'the', 'app', 'official'].includes(w));
    words.forEach(w => {
      if (!searchTerms.includes(w)) {
        searchTerms.push(w);
      }
    });
  });

  // Candidate fields to inspect
  const candidateFields = [
    finding.candidateName,
    finding.candidate_name,
    finding.candidateHandle,
    finding.username,
    finding.packageId,
    finding.package_identifier,
    finding.developer,
    finding.developer_name,
    finding.candidateUrl,
    finding.source_url,
    finding.description,
  ].filter(Boolean).map(v => String(v).toLowerCase());

  if (candidateFields.length === 0) return false;

  // Test if any candidate field contains any of the search terms
  return candidateFields.some(field => {
    const alphaField = field.replace(/[^a-z0-9]/gi, '');
    return searchTerms.some(term => {
      // Substring check in field
      if (field.includes(term)) return true;
      // Substring check in alphanumeric normalized string (useful for package IDs like com.nike.ntc)
      if (term.length >= 3 && alphaField.includes(term)) return true;
      return false;
    });
  });
}

/**
 * Sorts and partitions findings so that candidates matching the brand name
 * appear FIRST, followed by remaining third-party candidates.
 *
 * Within both the brand-matching tier and the remaining tier, items are sorted
 * by the requested sortBy criteria (defaulting to riskScore descending).
 *
 * @param {Array} findings List of finding or candidate objects
 * @param {string|Object} targetBrand Optional brand name or brand object
 * @param {string} sortBy Sort order: 'riskScore' | 'date' | 'name'
 * @param {Object} brandMap Optional map of brandId -> brand object
 * @returns {Array} Partitioned and sorted findings list
 */
export function sortFindingsByBrandRelevance(findings = [], targetBrand = '', sortBy = 'riskScore', brandMap = null) {
  if (!Array.isArray(findings) || findings.length === 0) {
    return [];
  }

  // Extract brand name and aliases if targetBrand is an object
  let brandName = '';
  let aliases = [];
  if (targetBrand && typeof targetBrand === 'object') {
    brandName = targetBrand.name || '';
    aliases = targetBrand.aliases || [];
  } else if (typeof targetBrand === 'string') {
    brandName = targetBrand;
  }

  // Internal comparator for sorting within each partition
  const compareItems = (a, b) => {
    if (sortBy === 'riskScore' || !sortBy) {
      const scoreA = Number(a.riskScore ?? a.risk_score ?? 0);
      const scoreB = Number(b.riskScore ?? b.risk_score ?? 0);
      if (scoreB !== scoreA) {
        return scoreB - scoreA; // Highest risk score first
      }
      // Tie-breaker: most recent date
      const dateA = new Date(a.detectionDate || a.created_at || 0).getTime();
      const dateB = new Date(b.detectionDate || b.created_at || 0).getTime();
      return dateB - dateA;
    }

    if (sortBy === 'date') {
      const dateA = new Date(a.detectionDate || a.created_at || 0).getTime();
      const dateB = new Date(b.detectionDate || b.created_at || 0).getTime();
      if (dateB !== dateA) {
        return dateB - dateA;
      }
      const scoreA = Number(a.riskScore ?? a.risk_score ?? 0);
      const scoreB = Number(b.riskScore ?? b.risk_score ?? 0);
      return scoreB - scoreA;
    }

    if (sortBy === 'name') {
      const nameA = String(a.candidateName || a.candidate_name || '').toLowerCase();
      const nameB = String(b.candidateName || b.candidate_name || '').toLowerCase();
      return nameA.localeCompare(nameB);
    }

    return 0;
  };

  const brandMatches = [];
  const remainingMatches = [];

  findings.forEach(item => {
    // Resolve brand name for this specific finding if targetBrand was not supplied
    let itemBrandName = brandName;
    let itemAliases = aliases;

    if (!itemBrandName) {
      if (brandMap && item.brandId && brandMap[item.brandId]) {
        itemBrandName = brandMap[item.brandId].name || '';
        itemAliases = brandMap[item.brandId].aliases || [];
      } else if (item.brandName && item.brandName.toLowerCase() !== 'protected brand') {
        itemBrandName = item.brandName;
      } else if (item.brand_name) {
        itemBrandName = item.brand_name;
      }
    }

    const isMatch = matchesBrandName(item, itemBrandName, itemAliases);
    if (isMatch) {
      brandMatches.push(item);
    } else {
      remainingMatches.push(item);
    }
  });

  // Sort each partition independently
  brandMatches.sort(compareItems);
  remainingMatches.sort(compareItems);

  // Return brand-matching results first, followed by remaining
  return [...brandMatches, ...remainingMatches];
}
