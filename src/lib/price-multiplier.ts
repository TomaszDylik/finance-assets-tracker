export interface PriceAnomalyResult {
  detected: boolean;
  suggestedMultiplier: number;
  label: string;
  severity: 'auto' | 'warning';
  ratio: number;
}

/**
 * Sub-unit currencies where exchanges quote in minor units (pence, cents, agorot).
 * GBX/GBp = 1/100 GBP · ZAC = 1/100 ZAR · ILA = 1/100 ILS
 */
const SUB_UNIT_CURRENCIES = new Set(['GBX', 'GBp', 'ZAC', 'ILA']);

/**
 * Detect pricing anomalies between user-entered price and live Yahoo quote.
 * Returns a suggested multiplier and human-readable explanation.
 */
export function detectPriceMultiplier(
  userPrice: number,
  yahooPrice: number,
  yahooCurrency?: string,
): PriceAnomalyResult {
  const noAnomaly: PriceAnomalyResult = {
    detected: false,
    suggestedMultiplier: 1,
    label: '',
    severity: 'auto',
    ratio: 0,
  };

  if (!userPrice || !yahooPrice || userPrice <= 0 || yahooPrice <= 0) {
    return noAnomaly;
  }

  const ratio = yahooPrice / userPrice;

  // Scenario 1: User entered in major units, Yahoo quotes in minor (e.g. GBP vs GBX)
  // ratio ≈ 100 → multiply user price by 100 to match Yahoo
  if (isInRange(ratio, 85, 115)) {
    const isSubUnit = yahooCurrency ? SUB_UNIT_CURRENCIES.has(yahooCurrency) : false;
    return {
      detected: true,
      suggestedMultiplier: 100,
      label: isSubUnit
        ? `Converted to ${yahooCurrency} (×100)`
        : 'Price ~100× lower — likely needs conversion to Pence/Cents',
      severity: 'auto',
      ratio,
    };
  }

  // Scenario 2: User entered in minor units, Yahoo quotes in major
  // ratio ≈ 0.01 → multiply user price by 0.01 to match Yahoo
  if (isInRange(ratio, 0.008, 0.012)) {
    return {
      detected: true,
      suggestedMultiplier: 0.01,
      label: 'Price ~100× higher — likely needs conversion to major currency',
      severity: 'auto',
      ratio,
    };
  }

  // Scenario 3: Stock split suspects
  const splitCandidates = [
    { min: 0.08, max: 0.12, splitLabel: '10:1', multiplier: 0.1 },
    { min: 0.18, max: 0.22, splitLabel: '5:1', multiplier: 0.2 },
    { min: 0.23, max: 0.27, splitLabel: '4:1', multiplier: 0.25 },
    { min: 0.45, max: 0.55, splitLabel: '2:1', multiplier: 0.5 },
  ];

  for (const c of splitCandidates) {
    if (isInRange(ratio, c.min, c.max)) {
      return {
        detected: true,
        suggestedMultiplier: c.multiplier,
        label: `Price mismatch (~${c.splitLabel} ratio) — possible stock split?`,
        severity: 'warning',
        ratio,
      };
    }
  }

  // Scenario 4: Unclassified significant mismatch (>50% difference)
  if (ratio < 0.5 || ratio > 2.0) {
    return {
      detected: true,
      suggestedMultiplier: 1,
      label: `Significant price mismatch (ratio: ${ratio.toFixed(2)}×)`,
      severity: 'warning',
      ratio,
    };
  }

  return noAnomaly;
}

/** Apply a multiplier to adjust a price (e.g. 15000 × 0.01 → 150). */
export function applyMultiplier(price: number, multiplier: number): number {
  return +(price * multiplier).toFixed(8);
}

function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}
