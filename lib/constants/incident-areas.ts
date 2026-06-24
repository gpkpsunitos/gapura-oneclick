
export const AREA_IDS = ['TERMINAL', 'APRON', 'CARGO', 'GENERAL', 'GSE'] as const;
export type AreaId = typeof AREA_IDS[number];

export const AREA_LABELS: Record<AreaId, string> = {
  TERMINAL: 'Terminal Area',
  APRON: 'Apron Area',
  CARGO: 'Cargo Area',
  GENERAL: 'General',
  GSE: 'GSE Availability',
};

export const AREA_CATEGORIES: Record<AreaId, string[]> = {
  TERMINAL: [
    'Passenger, Baggage & Document Profiling',
    'Boarding Management',
    'Baggage/Special/Irregularities Handling',
    'Accuracy & Completeness of Service',
    'Procedure Competencies',
    'Cleanliness Table',
    'Avoids taking initiative to help',
    'Lack communication skills',
    'Other',
  ],
  APRON: [
    'Preparation Before ETA',
    'Flight Document Handling',
    'The Availability of GSE',
    'Accurancy & Completeness of Service (Apron)',
    'Qualified Competencies (Apron)',
    'Procedure Competencies',
    'Cleanliness of GSE',
    'Prompt Service and Certainty',
    'Specific Needs of Customers',
    'Other',
  ],
  CARGO: ['Acceptance', 'Build Up', 'Break Down', 'Delivery', 'Documentation', 'Storage/Warehousing', 'Other'],
  GENERAL: ['Other'],
  GSE: [
    'GSE Safety & Damage Incident',
    'GSE Operator Issue / Lack of SDM',
    'GSE Equipment Availability Issue / Lack of SDA',
    'GSE Technical Malfunction / Equipment Trouble Issue',
    'GSE Maintenance & Reliability Issue',
  ],
};

export const GSE_TYPES = ['GSE MOTORIZED', 'GSE NON - MOTORIZED'] as const;
export type GseType = typeof GSE_TYPES[number];

export const GSE_EQUIPMENT: Record<GseType, string[]> = {
  'GSE MOTORIZED': [
    'Lower, Upper Deck Loader (HLL)',
    'Conveyor Belt Loader (CBL)',
    'Incapacitated Passengger Lift (IPL)',
    'Lavatory Service Truck (LST)',
  ],
  'GSE NON - MOTORIZED': [
    '(CDL) - Container Dollies',
    '(BCT) - Baggaged Cart',
    '(PDL) - Pallet Dollies',
  ],
};
