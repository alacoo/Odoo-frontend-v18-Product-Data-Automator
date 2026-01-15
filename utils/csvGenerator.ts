
import { ParsedProduct, OdooExportData, GlobalAttributeConfig } from '../types';

const sanitizeId = (prefix: string, str: string): string => {
  const safeStr = str
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  return `__import__.${prefix}_${safeStr}`;
};

// Changed return type from OdooExportFiles (strings) to OdooExportData (arrays)
export const generateOdooData = (products: ParsedProduct[], attributeConfigs: Map<string, GlobalAttributeConfig>): OdooExportData => {
  // Data Structures
  const templatesMap = new Map<string, {
    id: string; 
    name: string;
    defaultCode: string;
    uom: string;
    detailedType: string;
    tracking: string; 
    listPrice: number;
    standardPrice: number; // Added
    saleOk: boolean;
    purchaseOk: boolean;
    weight: number;
    attributes: Map<string, Set<string>>;
    variants: ParsedProduct[];
  }>();

  const attributeSettings = new Map<string, { 
    id: string;
    displayType: string;
    creationMode: string;
  }>();

  const attributeValueIds = new Map<string, string>(); 

  // 1. Process Logic & ID Generation
  products.forEach(p => {
    // 1.1 Attribute & Value Setup
    p.attributes.forEach(attr => {
        // Attribute Settings
        if (!attributeSettings.has(attr.name)) {
            const attrId = sanitizeId('ATTR', attr.name);
            
            // Get config from global state or defaults
            const config = attributeConfigs.get(attr.name) || { displayType: 'select', creationMode: 'always' };

            attributeSettings.set(attr.name, { 
                id: attrId,
                displayType: config.displayType,
                creationMode: config.creationMode
            });
        }

        // Value ID Generation
        const valKey = `${attr.name}::${attr.value}`;
        if (!attributeValueIds.has(valKey)) {
            const attrId = attributeSettings.get(attr.name)!.id;
            const valId = `${attrId}_${sanitizeId('VAL', attr.value).replace('__import__.VAL_', '')}`;
            attributeValueIds.set(valKey, valId);
        }
    });

    // 1.2 Template Setup
    if (!templatesMap.has(p.templateName)) {
        const tmplId = sanitizeId('TMPL', p.templateName);
        const codePrefix = p.defaultCode.includes('-') ? p.defaultCode.split('-')[0] : p.defaultCode.substring(0, 4);
        
        templatesMap.set(p.templateName, {
            id: tmplId,
            name: p.templateName,
            defaultCode: `${codePrefix}`,
            uom: p.uom,
            detailedType: p.detailedType,
            tracking: p.tracking || 'none', 
            listPrice: p.price || 0, 
            standardPrice: p.standard_price || 0, // Fallback
            saleOk: p.sale_ok ?? true,
            purchaseOk: p.purchase_ok ?? true,
            weight: p.weight || 0,
            attributes: new Map(),
            variants: []
        });
    }
    
    const tmpl = templatesMap.get(p.templateName)!;
    tmpl.variants.push(p);

    p.attributes.forEach(attr => {
        if (!tmpl.attributes.has(attr.name)) {
            tmpl.attributes.set(attr.name, new Set());
        }
        tmpl.attributes.get(attr.name)!.add(attr.value);
    });
  });

  // --- 1. Attributes Data ---
  const attrRows = Array.from(attributeSettings.entries()).map(([name, conf]) => ({
      id: conf.id,
      name: name,
      display_type: conf.displayType,
      create_variant: conf.creationMode
  }));

  // --- 2. Attribute Values Data ---
  const valRows: any[] = [];
  const processedValues = new Set<string>();

  templatesMap.forEach(tmpl => {
      tmpl.attributes.forEach((vals, attrName) => {
          const attrConf = attributeSettings.get(attrName);
          if (!attrConf) return;

          vals.forEach(val => {
              const key = `${attrName}::${val}`;
              if (!processedValues.has(key)) {
                  valRows.push({
                      id: attributeValueIds.get(key),
                      name: val,
                      'attribute_id/id': attrConf.id
                  });
                  processedValues.add(key);
              }
          });
      });
  });

  // --- 3. Product Templates Data ---
  const tmplRows: any[] = [];
  templatesMap.forEach(tmpl => {
      const typeMap: Record<string, string> = { 'product': 'product', 'service': 'service', 'consu': 'consu' }; // Odoo v18 raw keys
      const dType = typeMap[tmpl.detailedType] || 'product';

      const base = {
          id: tmpl.id,
          name: tmpl.name,
          default_code: tmpl.defaultCode,
          detailed_type: dType,
          tracking: tmpl.tracking,
          list_price: tmpl.listPrice, 
          standard_price: tmpl.standardPrice,
          uom_id: tmpl.uom,
          uom_po_id: tmpl.uom,
          weight: tmpl.weight,
          // Extra handy fields for V18
          sale_ok: tmpl.saleOk ? 'True' : 'False',
          purchase_ok: tmpl.purchaseOk ? 'True' : 'False',
          type: dType // Legacy support
      };

      if (tmpl.attributes.size === 0) {
          tmplRows.push({
              ...base,
              'attribute_line_ids/attribute_id/id': '',
              'attribute_line_ids/value_ids/id': ''
          });
      } else {
          tmpl.attributes.forEach((vals, attrName) => {
              const attrId = attributeSettings.get(attrName)?.id;
              const valueIds = Array.from(vals).map(v => attributeValueIds.get(`${attrName}::${v}`)).join(',');
              
              tmplRows.push({
                  ...base,
                  'attribute_line_ids/attribute_id/id': attrId,
                  'attribute_line_ids/value_ids/id': valueIds
              });
          });
      }
  });

  // --- 4. Product Variants Update Data ---
  const variantRows: any[] = [];
  templatesMap.forEach(tmpl => {
      tmpl.variants.forEach(v => {
          // Odoo v18 often imports variants by referencing the Template + Value Combination.
          // However, for pure data update, we often need to export them to set internal references.
          // This logic assumes we are updating the automatically created variants.
          
          const combination = v.attributes.map(a => `${a.name}: ${a.value}`).join(', ');
          
          variantRows.push({
              id: '', // Empty ID usually means "find or create", but for variants it's tricky. 
              
              'product_tmpl_id/id': tmpl.id,
              default_code: v.defaultCode,
              barcode: v.barcode, // Export barcode if present
              standard_price: v.standard_price, // Update variant specific cost
              price_extra: (v.price && v.price > tmpl.listPrice) ? (v.price - tmpl.listPrice).toFixed(2) : 0,
              weight: v.weight,
              name: `${v.templateName} (${combination})` // Helper for human readability
          });
      });
  });

  return {
      attributes: attrRows,
      attributeValues: valRows,
      productTemplates: tmplRows,
      productVariants: variantRows
  };
};
