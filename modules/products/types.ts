export interface Attribute {
  name: string;
  value: string;
}

export type OdooTracking = 'none' | 'lot' | 'serial';

export interface ParsedProduct {
  id: string;
  rawInput: string;
  templateName: string;
  defaultCode: string;
  uom: string;
  attributes: Attribute[];
  price?: number; // List Price (Sale) in Company Currency (YER)
  standard_price?: number; // Cost Price
  currency?: string; // e.g. 'SAR', 'USD' (Display context)
  
  // New: Specific prices for other currencies (for Pricelists)
  multiCurrencyPrices?: { currency: string; price: number }[]; 

  detailedType: 'product' | 'service' | 'consu';
  tracking: OdooTracking;
  
  // Odoo Logistics & Identification
  barcode?: string;
  weight?: number;
  sale_ok?: boolean;
  purchase_ok?: boolean;
  
  // New V18 Fields
  qty_available?: number; // On Hand
  virtual_available?: number; // Forecasted
  categ_name?: string; // Product Category
  is_favorite?: boolean; // Added favorited status
  
  // Media
  image?: string; // Base64 string

  // Custom Odoo Fields (Restored)
  allow_variable_dimensions?: boolean;
  price_per_sqm?: number;
  variant_price_per_sqm?: number;
  incomeAccountName?: string;
  incomeAccountId?: number;
}
