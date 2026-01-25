

import { ParsedProduct, OdooCurrency, OdooAttribute, OdooAttributeValue, OdooPricelist, SystemHealthReport, PreCheckResult, SyncIssue } from "../types";
import { getSettings } from './settingsService';

let dynamicApiKey: string | null = null;

export function setApiKey(key: string | null) {
    dynamicApiKey = key;
}

export function getApiKey(): string | null {
    return dynamicApiKey;
}

// Helper for delay (Publicly exported for Batching)
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Core API Fetcher
 * Handles authentication headers and response unwrapping based on documentation.
 * Includes retry logic for network stability.
 */
export async function apiFetch(endpoint: string, options: RequestInit = {}, retries = 2): Promise<any> {
    const { baseUrl, login, password } = getSettings();
    
    if (!baseUrl) {
        throw new Error("Server URL configuration is missing.");
    }

    // Ensure we handle trailing slashes correctly
    let cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    let url = `${cleanBaseUrl}${endpoint}`;

    const apiKeyToUse = getApiKey();

    if (!apiKeyToUse && !endpoint.includes('odoo_connect')) {
        throw new Error("API Key missing. Please authenticate first.");
    }

    const headers: Record<string, string> = {
        'login': login,
        'password': password || '',
        'api-key': apiKeyToUse || '',
        'Content-Type': 'application/json',
        ...((options.headers as any) || {})
    };

    const performFetch = async (fetchUrl: string, attempt: number): Promise<Response> => {
        try {
            const response = await fetch(fetchUrl, { ...options, headers });
            
            // Retry on 502/503/504 Server Errors (Gateway/Service Unavailable)
            if (!response.ok && [502, 503, 504].includes(response.status) && attempt > 0) {
                console.warn(`Odoo Server Error ${response.status}. Retrying in 1s...`);
                await delay(1000);
                return performFetch(fetchUrl, attempt - 1);
            }

            if (!response.ok) {
                const text = await response.text();
                // Try to parse JSON error from body even if status is not OK
                try {
                    const data = JSON.parse(text);
                    if (data.error) {
                        return { 
                            ok: false, 
                            status: response.status, 
                            json: () => Promise.resolve(data) 
                        } as any;
                    }
                } catch (e) {
                    // fall through
                }
                
                let errorMsg = `HTTP Error ${response.status}: ${response.statusText}`;
                if (text.length < 200) errorMsg += ` - ${text}`; // Log short server errors
                console.error("API Fetch Error Raw:", text);
                throw new Error(errorMsg);
            }
            return response;
        } catch (error: any) {
            // Retry on Network Errors
            if (attempt > 0 && (error.name === 'TypeError' || error.message === 'Failed to fetch' || error.message.includes('Network request failed'))) {
                console.warn(`Network request failed. Retrying... (${attempt} attempts left)`);
                await delay(1500);
                return performFetch(fetchUrl, attempt - 1);
            }
            throw error;
        }
    };

    try {
        const response = await performFetch(url, retries);
        const data = await response.json();

        if (data && data.error) {
            console.error("Odoo Logical Error:", JSON.stringify(data.error, null, 2)); 
            const rawError = data.error;
            let code = rawError.code;
            let title = rawError.title || 'Odoo Error';
            let message = '';
            
            // Extract debug info if available
            if (rawError.data) {
                if (typeof rawError.data === 'string') {
                    message = rawError.data;
                } else if (typeof rawError.data === 'object') {
                    // Try specific Odoo exception fields
                    if (rawError.data.message) {
                        message = typeof rawError.data.message === 'object' 
                            ? JSON.stringify(rawError.data.message) 
                            : String(rawError.data.message);
                    } else if (Array.isArray(rawError.data.arguments) && rawError.data.arguments.length > 0) {
                        const arg = rawError.data.arguments[0];
                        message = typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
                    } else {
                        // Fallback: dump the data object
                        message = JSON.stringify(rawError.data);
                    }
                }
            }

            // Fallback to top-level message if detail is missing or generic
            if (!message || message.trim() === 'Odoo Server Error') {
                if (rawError.message) {
                    message = typeof rawError.message === 'object' 
                        ? JSON.stringify(rawError.message) 
                        : String(rawError.message);
                }
            }

            if (!message) message = "Unknown Odoo Error";
            
            // Detect configuration error patterns
            if (!code && message.includes('No REST API configuration found')) {
                code = 'CONFIG_NOT_FOUND';
            }

            const errObj = new Error(message);
            (errObj as any).code = code;
            (errObj as any).title = title;
            throw errObj;
        }
        
        // Handle Call Method generic response
        if (data && typeof data === 'object' && endpoint.includes('call_method')) {
            // The response might be directly the return value or wrapped
            return data; 
        }

        if (data && typeof data === 'object') {
            if ('records' in data) return data.records;
            if ('new_resource' in data) return data.new_resource;
            if ('updated_resource' in data) return data.updated_resource;
            if ('resource_deleted' in data) return data.resource_deleted;
        }
        
        return data;

    } catch (error: any) {
        if (error.name === 'TypeError' && (error.message === 'Failed to fetch' || error.message.includes('Network request failed'))) {
             const netErr = new Error(`Network Error: Could not reach ${cleanBaseUrl}. Check CORS settings or internet connection.`);
             (netErr as any).code = 'NETWORK_ERROR';
             throw netErr;
        }
        throw error;
    }
}

export const authenticateOdoo = async (): Promise<{ apiKey: string; uid: number }> => {
  const { baseUrl, login, password, db } = getSettings();
  if (!password) throw new Error("Password required");

  try {
      const data = await apiFetch('/odoo_connect', {
          method: "GET",
          headers: { "login": login, "password": password, "db": db }
      }, 0); 

      if (data['api-key']) {
          setApiKey(data['api-key']);
          return { apiKey: data['api-key'], uid: data['uid'] || 0 };
      } else {
          throw new Error("Authentication failed: No API Key received.");
      }
  } catch (e: any) {
      if (e.message && e.message.includes('Network Error')) {
          const err = new Error(`Connection refused to ${baseUrl}. Is the server online and accepting CORS?`);
          (err as any).code = 'NETWORK_ERROR';
          throw err;
      }
      throw e;
  }
};

/**
 * Executes a specific method on an Odoo model.
 * Used for custom endpoints.
 */
export const callOdooMethod = async (model: string, method: string, args: any[] = [], kwargs: any = {}): Promise<any> => {
    const payload = {
        model,
        method,
        ids: [],
        args,
        kwargs
    };
    return apiFetch('/call_method', {
        method: 'POST',
        body: JSON.stringify(payload)
    });
};

/**
 * Checks the system health and permissions configuration.
 * Uses strict parameters: PUT method and ids: [1].
 */
export const checkSystemHealth = async (): Promise<SystemHealthReport> => {
    try {
        const payload = {
            model: 'res.company',
            method: 'api_check_system_health',
            ids: [1], // Updated to use ID 1 as per new spec
            args: [],
            kwargs: {}
        };
        
        // Updated to use PUT method as per new spec
        const report = await apiFetch('/call_method', {
            method: 'PUT',
            body: JSON.stringify(payload)
        });

        // If the report comes back as a string (sometimes happens with legacy API wrappers), try to parse
        if (typeof report === 'string') {
             try { return JSON.parse(report); } catch(e) { return { status: 'error', error: 'Invalid JSON response' }; }
        }
        return report;
    } catch (e: any) {
        console.warn("System Health Check failed:", e);
        return { 
            status: 'warning', 
            error: `Health check failed: ${e.message}. Assuming standard configuration.`
        };
    }
};

/**
 * Analyzes the SystemHealthReport to determine sync feasibility.
 */
export const runSyncPreCheck = (healthReport: SystemHealthReport): PreCheckResult => {
    // FAIL-SAFE: If the health check method on the server failed (e.g. not installed or API error),
    // we assume the user has configured things manually and bypass strict checks to prevent blocking.
    if (healthReport.error) {
        return {
            canSync: true,
            capabilities: {
                canRead: true,
                canWrite: true,
                canCreate: true,
                canDelete: false
            },
            criticalIssues: [],
            warnings: [{
                severity: 'warning',
                model: 'System',
                code: 'HEALTH_CHECK_SKIPPED',
                message_ar: 'فشل الفحص الآلي (الدالة غير موجودة أو خطأ في الاتصال). سنفترض أن الإعدادات صحيحة.',
                message_en: `Automatic check skipped: ${healthReport.error}. Assuming manual config is correct.`,
                impact: 'Configuration not verified automatically'
            }],
            summary: {
                total_issues: 0,
                critical_count: 0,
                warning_count: 1
            }
        };
    }

    const issues: SyncIssue[] = [];
    const requiredModels = [
        'product.template',
        'product.product',
        'product.attribute',
        'product.attribute.value',
        'product.template.attribute.line'
    ];
    
    // 1. Check REST API Config
    const restConfig = healthReport.rest_api_config || {};
    
    for (const model of requiredModels) {
        const config = restConfig[model];
        
        if (!config) {
            issues.push({
                severity: 'critical',
                model: model,
                code: 'NOT_CONFIGURED',
                message_ar: `الموديل ${model} غير مُهيأ في REST API`,
                message_en: `Model ${model} is not configured in REST API`,
                action: 'Add this model in Connection API settings'
            });
            continue;
        }

        if (!config.get) {
            issues.push({
                severity: 'critical',
                model: model,
                code: 'GET_DISABLED',
                message_ar: `عملية القراءة (GET) معطلة لـ ${model}`,
                message_en: `GET is disabled for ${model}`,
                action: 'Enable GET in Connection API settings'
            });
        }

        // POST/Create check for models that we usually write to
        if (model !== 'product.product' && model !== 'product.category' && !config.post) {
            issues.push({
                severity: 'warning',
                model: model,
                code: 'POST_DISABLED',
                message_ar: `عملية الإنشاء (POST) معطلة لـ ${model}`,
                message_en: `POST is disabled for ${model}`,
                impact: 'Cannot create new records for this model'
            });
        }
    }

    // 2. Check User Permissions
    const modelAccess = healthReport.model_access || {};
    
    // Check READ access for all required models + category
    for (const model of [...requiredModels, 'product.category']) {
        // Skip if modelAccess doesn't even list it (already caught by REST check usually, but good to double check)
        const access = modelAccess[model];
        if (!access) continue;

        if (!access.exists) {
            issues.push({
                severity: 'critical',
                model: model,
                code: 'MODEL_NOT_EXISTS',
                message_ar: `الموديل ${model} غير موجود (الموديول غير مثبت)`,
                message_en: `Model ${model} does not exist (module not installed)`
            });
            continue;
        }

        if (!access.read) {
            issues.push({
                severity: 'critical',
                model: model,
                code: 'NO_READ_ACCESS',
                message_ar: `ليس لديك صلاحية قراءة ${model}`,
                message_en: `No read access for ${model}`
            });
        }
    }

    // Check WRITE/CREATE access for writable models
    const writeModels = ['product.template', 'product.attribute', 'product.attribute.value', 'product.template.attribute.line'];
    
    for (const model of writeModels) {
        const access = modelAccess[model];
        if (!access) continue;

        if (!access.write) {
            issues.push({
                severity: 'warning',
                model: model,
                code: 'NO_WRITE_ACCESS',
                message_ar: `لا يمكن تعديل ${model}`,
                message_en: `No write access for ${model}`,
                impact: 'Cannot modify existing records'
            });
        }

        if (!access.create) {
            issues.push({
                severity: 'warning',
                model: model,
                code: 'NO_CREATE_ACCESS',
                message_ar: `لا يمكن إنشاء سجلات في ${model}`,
                message_en: `No create access for ${model}`,
                impact: 'Cannot create new records'
            });
        }
    }

    // Summary
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    const warnings = issues.filter(i => i.severity === 'warning');

    const canRead = !issues.some(i => i.code === 'NO_READ_ACCESS' && i.severity === 'critical');
    const canWrite = !issues.some(i => i.code === 'NO_WRITE_ACCESS');
    const canCreate = !issues.some(i => i.code === 'NO_CREATE_ACCESS');
    
    return {
        canSync: criticalIssues.length === 0,
        capabilities: {
            canRead,
            canWrite,
            canCreate,
            canDelete: false // Generally discouraged via this API wrapper for safety
        },
        criticalIssues,
        warnings,
        summary: {
            total_issues: issues.length,
            critical_count: criticalIssues.length,
            warning_count: warnings.length
        }
    };
};

// --- Product Reads ---

export const fetchOdooProducts = async (): Promise<ParsedProduct[]> => {
  const payload = {
    model: 'product.product',
    domain: ['|', ["sale_ok", "=", true], ["purchase_ok", "=", true]],
    fields: [
      "id", "name", "display_name", "default_code", "lst_price", "standard_price",
      "qty_available", "virtual_available", "uom_id", "tracking", "categ_id", "currency_id", 
      "barcode", "weight", "sale_ok", "purchase_ok", "type", // Requesting 'type' explicitly
      "allow_variable_dimensions", "price_per_sqm", "variant_price_per_sqm", "product_template_attribute_value_ids",
      "image_128", "is_favorite" // Added is_favorite
    ],
    limit: 300,
    order: "id desc"
  };

  const records = await apiFetch('/send_request?model=product.product', {
      method: 'POST',
      body: JSON.stringify(payload)
  });

  return transformOdooToLocal(records);
};

export const fetchOdooCurrencies = async (): Promise<OdooCurrency[]> => {
  const payload = {
      domain: [["active", "=", true]],
      fields: ["id", "name", "symbol", "position", "active", "rate"],
      order: "id asc"
  };

  try {
      const records = await apiFetch('/send_request?model=res.currency', {
          method: 'POST',
          body: JSON.stringify(payload)
      });

      if (!Array.isArray(records)) return [];

      return records.map((r: any) => ({
          id: r.id,
          name: r.name,
          symbol: r.symbol,
          position: r.position,
          active: r.active,
          rate: r.rate || 1.0,
          inverse_rate: r.rate ? (1 / r.rate) : 1.0 
      }));
  } catch (error: any) {
      console.warn("Currency fetch skipped:", error.message);
      return [];
  }
};

// --- Attribute Management ---

export const fetchOdooAttributes = async (): Promise<OdooAttribute[]> => {
    const payload = { 
        domain: [], 
        fields: ["id", "name", "display_type", "create_variant"],
        order: "name asc"
    };
    try {
        const records = await apiFetch('/send_request?model=product.attribute', {
            method: 'POST', body: JSON.stringify(payload)
        });
        return Array.isArray(records) ? records : [];
    } catch (e: any) {
        console.warn("Attribute fetch skipped:", e.message);
        return [];
    }
};

export const fetchOdooAttributeValues = async (): Promise<OdooAttributeValue[]> => {
    const payload = { 
        domain: [], 
        fields: ["id", "name", "attribute_id"],
        order: "attribute_id asc, name asc"
    };
    try {
        const records = await apiFetch('/send_request?model=product.attribute.value', {
            method: 'POST', body: JSON.stringify(payload)
        });
        return Array.isArray(records) ? records : [];
    } catch (e: any) {
        console.warn("Attribute Value fetch skipped:", e.message);
        return [];
    }
};

// NEW: UOM Fetching
export const fetchOdooUoms = async (): Promise<{id: number, name: string}[]> => {
    const payload = {
        domain: [],
        fields: ["id", "name"],
        order: "id asc"
    };
    try {
        const records = await apiFetch('/send_request?model=uom.uom', {
            method: 'POST', body: JSON.stringify(payload)
        });
        return Array.isArray(records) ? records : [];
    } catch (e: any) {
        console.warn("UOM fetch skipped:", e.message);
        return [];
    }
};

export const createOdooUom = async (name: string): Promise<number> => {
    // Default to 'Unit' category (id: 1) and uom_type 'smaller' (smaller than reference) or 'reference'.
    const payload = {
        values: { 
            name, 
            category_id: 1, // uom.product_uom_categ_unit
            uom_type: 'smaller', 
            factor: 1.0
        },
        fields: ["id"]
    };
    
    const result = await apiFetch('/send_request?model=uom.uom', {
        method: 'POST',
        body: JSON.stringify(payload)
    });
    
    return Array.isArray(result) && result.length > 0 ? result[0].id : 0;
};

export const createOdooAttribute = async (name: string): Promise<number> => {
    const payload = {
        values: { 
            name, 
            display_type: 'select', 
            create_variant: 'always' 
        },
        fields: ["id"]
    };
    
    const result = await apiFetch('/send_request?model=product.attribute', {
        method: 'POST',
        body: JSON.stringify(payload)
    });
    
    return Array.isArray(result) && result.length > 0 ? result[0].id : 0;
};

export const createOdooAttributeValue = async (attributeId: number, name: string): Promise<number> => {
    const payload = {
        values: { 
            attribute_id: attributeId, 
            name: name 
        },
        fields: ["id"]
    };

    const result = await apiFetch('/send_request?model=product.attribute.value', {
        method: 'POST',
        body: JSON.stringify(payload)
    });

    return Array.isArray(result) && result.length > 0 ? result[0].id : 0;
};

// --- Pricelist Management ---

export const fetchOdooPricelists = async (): Promise<OdooPricelist[]> => {
    const payload = {
        domain: [],
        fields: ["id", "name", "currency_id"],
        order: "id asc"
    };
    try {
        const records = await apiFetch('/send_request?model=product.pricelist', {
            method: 'POST', body: JSON.stringify(payload)
        });
        if (!Array.isArray(records)) return [];
        
        return records.map((r: any) => ({
            id: r.id,
            name: r.name,
            currencyId: Array.isArray(r.currency_id) ? r.currency_id[0] : 0,
            currencyName: Array.isArray(r.currency_id) ? r.currency_id[1] : ''
        }));
    } catch (e: any) {
        console.warn(`Could not fetch Pricelists: ${e.message}`);
        return [];
    }
};

export const createOdooPricelist = async (name: string, currencyId: number): Promise<number | null> => {
    const { enablePricelists } = getSettings();
    if (!enablePricelists) return null;

    try {
        const payload = {
            values: { name, currency_id: currencyId },
            fields: ["id"]
        };
        const result = await apiFetch('/send_request?model=product.pricelist', {
            method: 'POST', body: JSON.stringify(payload)
        });
        return Array.isArray(result) && result.length > 0 ? result[0].id : null;
    } catch (e: any) {
        console.warn(`Failed to create pricelist '${name}'`, e);
        return null;
    }
};

export const createOdooPricelistItem = async (pricelistId: number, productVariantId: number, price: number): Promise<boolean> => {
    const { enablePricelists } = getSettings();
    if (!enablePricelists) return false;

    try {
        const payload = {
            values: {
                pricelist_id: pricelistId,
                product_id: productVariantId,
                applied_on: '0_product_variant',
                compute_price: 'fixed',
                fixed_price: price,
                min_quantity: 0
            },
            fields: ["id"]
        };
        await apiFetch('/send_request?model=product.pricelist.item', {
            method: 'POST', body: JSON.stringify(payload)
        });
        return true;
    } catch (e) {
        return false;
    }
};

// --- Product Management ---

/**
 * Creates a product template with robust error handling for type mismatch.
 * Automatically tries 'type' vs 'detailed_type' and downgrades 'product' to 'consu' if permissions fail.
 */
export const createOdooTemplate = async (data: any): Promise<number> => {
    const create = async (payloadValues: any) => {
        const payload = { values: payloadValues, fields: ["id"] };
        const result = await apiFetch('/send_request?model=product.template', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        return Array.isArray(result) && result.length > 0 ? result[0].id : 0;
    };

    // 1. Try with initial data (likely detailed_type='product')
    try {
        return await create(data);
    } catch (err: any) {
        const errMsg = (err.message || "").toLowerCase();
        
        // Strategy 1: Check if 'detailed_type' field is invalid (older Odoo versions)
        if (errMsg.includes("invalid field") && errMsg.includes("detailed_type")) {
             const fallbackData = { ...data, type: data.detailed_type };
             delete fallbackData.detailed_type;
             
             return await create(fallbackData);
        }
        
        // We do NOT handle Downgrade logic here anymore. 
        // We throw the error so the caller (MigrationManager) can log it to the UI and retry.
        throw err;
    }
};

/**
 * Robust Variant Search with Retry Logic
 * Used to handle race conditions where Odoo takes time to generate variants after Template creation.
 */
export const waitForProductVariants = async (templateId: number, expectedMinCount: number = 1, maxRetries: number = 6): Promise<any[]> => {
    const payload = {
        domain: [["product_tmpl_id", "=", templateId]],
        fields: ["id", "product_template_attribute_value_ids", "default_code", "display_name"],
    };

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const records = await apiFetch('/send_request?model=product.product', {
            method: 'POST', body: JSON.stringify(payload)
        });
        
        if (Array.isArray(records) && records.length >= expectedMinCount) {
            return records;
        }
        
        // Exponential backoff: 500ms, 1000ms, 1500ms...
        await delay(500 * attempt);
    }
    
    // Fallback: return whatever we found, even if partial
    console.warn(`Timeout waiting for variants of template ${templateId}`);
    return await apiFetch('/send_request?model=product.product', {
        method: 'POST', body: JSON.stringify(payload)
    });
};

/**
 * Creates a product with auto-downgrade logic for storable type.
 */
export const createOdooProduct = async (product: Partial<ParsedProduct>): Promise<number> => {
    const create = async (vals: any) => {
        const payload = { values: vals, fields: ["id"] };
        const result = await apiFetch('/send_request?model=product.product', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        return Array.isArray(result) && result.length > 0 ? result[0].id : 0;
    };

    const values = transformLocalToOdoo(product);

    try {
        return await create(values);
    } catch (err: any) {
        // We strictly throw errors now to allow callers to handle logic/notifications
        throw err;
    }
};

export const updateOdooProduct = async (id: number, data: Partial<ParsedProduct>) => {
    const values = transformLocalToOdoo(data);
    const payload = { values: values, fields: ["id"] };
    await apiFetch(`/send_request?model=product.product&Id=${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
    });
};

export const deleteOdooProduct = async (id: number) => {
    await apiFetch(`/send_request?model=product.product&Id=${id}`, {
        method: 'DELETE'
    });
};

// --- Transformers ---

const transformLocalToOdoo = (p: Partial<ParsedProduct>): any => {
    const payload: any = {};
    if (p.templateName) payload.name = p.templateName;
    if (p.defaultCode !== undefined) payload.default_code = p.defaultCode;
    
    if (p.price !== undefined) payload.list_price = p.price; 
    if (p.standard_price !== undefined) payload.standard_price = p.standard_price;
    
    if (p.tracking) payload.tracking = p.tracking;
    if (p.barcode) payload.barcode = p.barcode;
    if (p.weight) payload.weight = p.weight;
    
    // Image Handling
    if (p.image) {
        // Strip prefix if exists, Odoo expects pure base64
        const base64 = p.image.includes('base64,') ? p.image.split('base64,')[1] : p.image;
        payload.image_1920 = base64;
    }
    
    // Default to 'detailed_type' which is standard in v15+
    // If 'detailedType' in local is 'product', we map it.
    if (p.detailedType) payload.detailed_type = p.detailedType;
    else if (p.detailedType === undefined) payload.detailed_type = 'product'; // Default to storable if not specified

    payload.sale_ok = p.sale_ok === true;
    payload.purchase_ok = true;

    // Force 0% Taxes (Clear existing taxes)
    payload.taxes_id = [[6, 0, []]];
    payload.supplier_taxes_id = [[6, 0, []]];

    // Default to 'All' category
    payload.categ_id = 1; 
    
    if (p.allow_variable_dimensions !== undefined) payload.allow_variable_dimensions = p.allow_variable_dimensions;
    if (p.price_per_sqm !== undefined) payload.price_per_sqm = p.price_per_sqm;
    if (p.variant_price_per_sqm !== undefined) payload.variant_price_per_sqm = p.variant_price_per_sqm;
    
    // Favorite mapping (Priority in Odoo might differ, but assuming direct field mapping requested)
    if (p.is_favorite !== undefined) payload.is_favorite = p.is_favorite;

    return payload;
};

const transformOdooToLocal = (odooData: any[]): ParsedProduct[] => {
  if (!Array.isArray(odooData)) return [];

  return odooData.map(item => {
    const uomName = Array.isArray(item.uom_id) ? item.uom_id[1] : 'Units';
    // Use the fetched 'detailed_type' or 'type', default to 'product' (storable) if missing
    const dType = item.detailed_type || item.type || 'product'; 
    const currency = Array.isArray(item.currency_id) ? item.currency_id[1] : 'SAR';

    let attributes: {name: string, value: string}[] = [];
    const displayName = item.display_name || item.name;
    const match = displayName.match(/^(.*?)\s*\((.*)\)$/);
    
    if (match && match[2]) {
        attributes = match[2].split(',').map((s: string, idx: number) => {
            const parts = s.split(':');
            if (parts.length > 1) {
                return { name: parts[0].trim(), value: parts[1].trim() };
            }
            return { name: `Attr`, value: s.trim() };
        });
    }

    return {
      id: String(item.id),
      rawInput: displayName,
      templateName: item.name,
      defaultCode: item.default_code || '',
      uom: uomName,
      price: item.lst_price || item.list_price || 0,
      standard_price: item.standard_price || 0,
      currency: currency,
      detailedType: dType,
      tracking: item.tracking || 'none',
      barcode: item.barcode || '',
      weight: item.weight || 0,
      sale_ok: item.sale_ok,
      purchase_ok: item.purchase_ok,
      attributes: attributes,
      
      // Stock & Cat
      qty_available: item.qty_available || 0,
      virtual_available: item.virtual_available || 0,
      categ_name: item.categ_id ? item.categ_id[1] : 'All',
      is_favorite: item.is_favorite || false,
      
      image: item.image_128, // Map thumbnail to local image prop
      allow_variable_dimensions: item.allow_variable_dimensions || false,
      price_per_sqm: item.price_per_sqm || 0,
      variant_price_per_sqm: item.variant_price_per_sqm || 0,
      incomeAccountName: item.property_account_income_id ? item.property_account_income_id[1] : '',
      incomeAccountId: item.property_account_income_id ? item.property_account_income_id[0] : undefined,
    };
  });
};