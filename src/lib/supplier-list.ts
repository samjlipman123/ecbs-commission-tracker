// Fixed list of 68 valid suppliers for bulk import validation

export const VALID_SUPPLIERS = [
  'Airticity Acquisition',
  'Airticity Renewal',
  'British Gas Acquisition',
  'British Gas Renewal',
  'Brook Green Acquisition No Upfront',
  'Brook Green Acquisition Upfront',
  'Brook Green Renewal No Upfront',
  'Brook Green Renewal Upfront',
  'Corona Acquisition No Upfront',
  'Corona Acquisition Upfront',
  'Corona Renewal No Upfront',
  'Corona Renewal Upfront',
  'Crown Gas & Power Acquisition No Upfront',
  'Crown Gas & Power Acquisition Upfront',
  'Crown Gas & Power Renewal No Upfront',
  'Crown Gas & Power Renewal Upfront',
  'D-Energi Acquisition',
  'D-Energi Renewal',
  'Drax Acquisition',
  'Drax Renewal',
  'Dyce Energy Acquisition',
  'Dyce Energy Renewal',
  'Ecotricity Acquisition',
  'Ecotricity Renewal',
  'EDF Acquisition',
  'EDF Renewal',
  'Engie Acquisition No Upfront',
  'Engie Acquisition Upfront',
  'Engie Renewal No Upfront',
  'Engie Renewal Upfront',
  'EonNext Acquisition',
  'EonNext Renewal',
  'Jellyfish Acquisition',
  'Jellyfish Renewal',
  'Npower Acquisition No Upfront',
  'Npower Acquisition Upfront',
  'Npower Renewal No Upfront',
  'Npower Renewal Upfront',
  'Pozitive Energy Acquisition',
  'Pozitive Energy Renewal',
  'Regent Gas Acquisition',
  'Regent Gas Renewal',
  'Scottish Power Acquisition',
  'Scottish Power Renewal',
  'Sefe Acquisition',
  'Sefe Renewal',
  'Shell Energy Acquisition',
  'Shell Energy Renewal',
  'Smartest Energy Acquisition',
  'Smartest Energy Renewal',
  'SSE Acquisition',
  'SSE Renewal',
  'TEM-Energy Acquisition',
  'TEM-Energy Renewal',
  'Totalenergies Acquisition No Upfront',
  'Totalenergies Acquisition Upfront',
  'Totalenergies Renewal No Upfront',
  'Totalenergies Renewal Upfront',
  'United Gas & Power Acquisition',
  'United Gas & Power Renewal',
  'Utilita Acquisition',
  'Utilita Renewal',
  'Valda Energy Acquisition',
  'Valda Energy Renewal',
  'Yorkshire Gas & Power Acquisition',
  'Yorkshire Gas & Power Renewal',
  'Yu Energy Acquisition',
  'Yu Energy Renewal',
] as const;

export type ValidSupplier = (typeof VALID_SUPPLIERS)[number];

// Normalized lookup map for case-insensitive matching
const SUPPLIER_LOOKUP_MAP = new Map<string, string>(
  VALID_SUPPLIERS.map((s) => [s.toLowerCase().trim(), s])
);

// Legacy/alias mappings for old-style supplier names
// These map old names to suggested new names for better error messages
const LEGACY_SUPPLIER_ALIASES: Record<string, string[]> = {
  'british gas': ['British Gas Acquisition', 'British Gas Renewal'],
  'brook green supply': ['Brook Green Acquisition No Upfront', 'Brook Green Acquisition Upfront', 'Brook Green Renewal No Upfront', 'Brook Green Renewal Upfront'],
  'corona': ['Corona Acquisition No Upfront', 'Corona Renewal No Upfront'],
  'corona upfront': ['Corona Acquisition Upfront', 'Corona Renewal Upfront'],
  'crown gas & power': ['Crown Gas & Power Acquisition No Upfront', 'Crown Gas & Power Renewal No Upfront'],
  'crown gas & power upfront': ['Crown Gas & Power Acquisition Upfront', 'Crown Gas & Power Renewal Upfront'],
  'engie': ['Engie Acquisition No Upfront', 'Engie Acquisition Upfront', 'Engie Renewal No Upfront', 'Engie Renewal Upfront'],
  'engie renewal': ['Engie Renewal No Upfront', 'Engie Renewal Upfront'],
  'eonnext': ['EonNext Acquisition', 'EonNext Renewal'],
  'npower': ['Npower Acquisition No Upfront', 'Npower Acquisition Upfront', 'Npower Renewal No Upfront', 'Npower Renewal Upfront'],
  'npower upfront': ['Npower Acquisition Upfront', 'Npower Renewal Upfront'],
  'npower upfront/npower': ['Npower Acquisition Upfront', 'Npower Acquisition No Upfront'],
  'smartest energy': ['Smartest Energy Acquisition', 'Smartest Energy Renewal'],
  'totalenergies': ['Totalenergies Acquisition No Upfront', 'Totalenergies Acquisition Upfront', 'Totalenergies Renewal No Upfront', 'Totalenergies Renewal Upfront'],
  'total energies': ['Totalenergies Acquisition No Upfront', 'Totalenergies Acquisition Upfront', 'Totalenergies Renewal No Upfront', 'Totalenergies Renewal Upfront'],
};

/**
 * Find a matching supplier from the valid list (case-insensitive)
 * @param input - The supplier name from the uploaded file
 * @returns The matched supplier name or null if not found
 */
export function findSupplierMatch(input: string): string | null {
  const normalized = input.toLowerCase().trim();
  return SUPPLIER_LOOKUP_MAP.get(normalized) || null;
}

/**
 * Get suggested suppliers based on partial match or legacy alias
 * @param input - Partial supplier name
 * @returns Array of suggested supplier names (max 5)
 */
export function getSuggestedSuppliers(input: string): string[] {
  const normalized = input.toLowerCase().trim();

  if (!normalized) return [];

  // First check if there's a legacy alias match
  const legacyMatch = LEGACY_SUPPLIER_ALIASES[normalized];
  if (legacyMatch) {
    return legacyMatch.slice(0, 5);
  }

  // Otherwise do partial matching
  return VALID_SUPPLIERS.filter((s) => {
    const supplierNorm = s.toLowerCase();
    return supplierNorm.includes(normalized) || normalized.includes(supplierNorm);
  }).slice(0, 5);
}

/**
 * Check if a supplier name is valid
 * @param input - The supplier name to check
 * @returns True if the supplier is in the valid list
 */
export function isValidSupplier(input: string): boolean {
  return findSupplierMatch(input) !== null;
}

// --- Dynamic matching against database suppliers ---

/**
 * Find a matching supplier from a dynamic list (exact case-insensitive match only)
 * @param input - The supplier name from the uploaded file
 * @param supplierNames - List of valid supplier names from the database
 * @returns The matched supplier name or null if not found
 */
export function findSupplierMatchDynamic(input: string, supplierNames: string[]): string | null {
  const normalized = input.toLowerCase().trim();

  for (const name of supplierNames) {
    if (name.toLowerCase().trim() === normalized) {
      return name;
    }
  }

  return null;
}

/**
 * Get suggested suppliers from a dynamic list based on partial match
 * @param input - Partial supplier name
 * @param supplierNames - List of valid supplier names from the database
 * @returns Array of suggested supplier names (max 5)
 */
export function getSuggestedSuppliersDynamic(input: string, supplierNames: string[]): string[] {
  const normalized = input.toLowerCase().trim();
  if (!normalized) return [];

  return supplierNames.filter((s) => {
    const supplierNorm = s.toLowerCase();
    return supplierNorm.includes(normalized) || normalized.includes(supplierNorm);
  }).slice(0, 5);
}
