

import { ParsedProduct, OdooTracking } from '../types';

// Default Rates
// 1 USD = 530 YER
// 1 SAR = 145 YER
export const DEFAULT_RATES = {
  USD: 530,
  SAR: 145
};

// Helper to estimate cost price (standard_price) as 85% of sales price
const calcCost = (yerPrice: number): number => {
    return Math.ceil(yerPrice * 0.85);
};

// Helper to calculate USD price based on YER
const calcUsdPrice = (yerPrice: number): number => {
    return parseFloat((yerPrice / DEFAULT_RATES.USD).toFixed(2));
};

// Heuristic to determine tracking based on code/type
const determineTracking = (code: string, type: string): OdooTracking => {
    if (type === 'service' || type === 'consu') return 'none';
    if (code.startsWith('MACH-')) return 'serial';
    if (code.startsWith('MAT-BNR') || code.startsWith('MAT-FLX') || code.startsWith('VINYL')) return 'lot';
    if (code.startsWith('FALX') || code.startsWith('BANR')) return 'lot';
    return 'none';
};

// Heuristic to extract width for SQM calculation
const extractWidth = (attributes: {name: string, value: string}[]): number | null => {
    const widthAttr = attributes.find(a => a.name.includes('عرض') || a.name.includes('Width') || a.name.includes('المقاس'));
    if (widthAttr) {
        // Try to match meters first (e.g. 3.20m or 3.20 م)
        const match = widthAttr.value.match(/([\d\.]+)\s*(m|م)/i);
        if (match) return parseFloat(match[1]);
        
        // Fallback for just numbers if explicitly width
        const simpleMatch = widthAttr.value.match(/([\d\.]+)/);
        return simpleMatch ? parseFloat(simpleMatch[1]) : null;
    }
    return null;
};

// --- DATA PROCESSING HELPERS ---

// Helper to infer Forex Thickness based on price
const inferForexThickness = (price: number): string | null => {
    if (price >= 5000 && price <= 6000) return "3mm";
    if (price >= 7000 && price <= 8000) return "4mm";
    if (price >= 9000 && price <= 10000) return "6mm";
    if (price >= 12000 && price <= 13000) return "8mm";
    // 13780 seems like a variant of 9mm or cheap 10mm, let's map to 9mm to differentiate
    if (price >= 13500 && price <= 14500) return "9mm";
    if (price >= 15000 && price <= 16500) return "10mm";
    if (price >= 18000 && price <= 20000) return "12mm";
    if (price >= 22000 && price <= 24000) return "15mm";
    if (price >= 30000) return "20mm";
    return null;
};

// Helper to standardize Vinyl names
const standardizeVinylName = (name: string, originalAttrs: string): { newName: string, extraAttr: string | null } => {
    const keywords = ["استيكر", "لاصق طباعة", "لاصق روكو", "لاصق سلفنة", "لاصق وجهين"];
    const foundKeyword = keywords.find(k => name.includes(k));
    
    if (foundKeyword) {
        // Clean up the keyword from the name to create a specific attribute value
        // e.g., "استيكر ملون" -> "ملون"
        let specificType = name.replace(foundKeyword, '').trim();
        // Remove common dimensions or junk chars
        specificType = specificType.replace(/[\d\.]+\s*(m|م|سم)/gi, '').trim();
        specificType = specificType.replace(/عالي الجوده|مقاس|رولة|طابعه/gi, '').trim();
        
        // Create a descriptive attribute for the variant to distinguish it
        // If specificType is empty, fallback to the keyword itself (e.g. "Roco", "Sticker")
        const variantValue = specificType.length > 2 ? specificType : foundKeyword;
        
        return {
            newName: "رولة طباعة لاصق (Vinyl Roll)",
            extraAttr: `Type:${variantValue}`
        };
    }
    return { newName: name, extraAttr: null };
};


export const getDemoData = (): ParsedProduct[] => {
    const rawData = [
        { code: "MAT-BNR-180-110", name: "رولة طباعة بنر (Banner Roll)", price: 197, uom: "m", type: "product", attrs: "الوزن:180g, عرض الرولة:1.10m, النوع:Light/Economic" },
        { code: "MAT-BNR-240-160", name: "رولة طباعة بنر (Banner Roll)", price: 492, uom: "m", type: "product", attrs: "الوزن:240g, عرض الرولة:1.60m, النوع:Glossy, النسيج:500x300" },
        { code: "MAT-BNR-280-105", name: "رولة طباعة بنر (Banner Roll)", price: 334, uom: "m", type: "product", attrs: "الوزن:280g, عرض الرولة:1.05m, النوع:Glossy, النسيج:500x300" },
        { code: "MAT-BNR-280-110", name: "رولة طباعة بنر (Banner Roll)", price: 390, uom: "m", type: "product", attrs: "الوزن:280g, عرض الرولة:1.10m, النوع:Glossy, النسيج:500x300" },
        { code: "MAT-BNR-280-130", name: "رولة طباعة بنر (Banner Roll)", price: 414, uom: "m", type: "product", attrs: "الوزن:280g, عرض الرولة:1.30m, النوع:Glossy, النسيج:500x300" },
        { code: "MAT-BNR-280-136", name: "رولة طباعة بنر (Banner Roll)", price: 484, uom: "m", type: "product", attrs: "الوزن:280g, عرض الرولة:1.36m, النوع:Glossy, النسيج:500x300" },
        { code: "MAT-BNR-280-155", name: "رولة طباعة بنر (Banner Roll)", price: 510, uom: "m", type: "product", attrs: "الوزن:280g, عرض الرولة:1.55m, النوع:Glossy, النسيج:500x300" },
        { code: "MAT-BNR-280-160", name: "رولة طباعة بنر (Banner Roll)", price: 576, uom: "m", type: "product", attrs: "الوزن:280g, عرض الرولة:1.60m, النوع:Glossy, النسيج:500x300" },
        { code: "MAT-BNR-280-215", name: "رولة طباعة بنر (Banner Roll)", price: 723, uom: "m", type: "product", attrs: "الوزن:280g, عرض الرولة:2.15m, النوع:Glossy, النسيج:500x300" },
        { code: "MAT-BNR-280-220", name: "رولة طباعة بنر (Banner Roll)", price: 817, uom: "m", type: "product", attrs: "الوزن:280g, عرض الرولة:2.20m, النوع:Glossy, النسيج:500x300" },
        { code: "MAT-BNR-280-260", name: "رولة طباعة بنر (Banner Roll)", price: 965, uom: "m", type: "product", attrs: "الوزن:280g, عرض الرولة:2.60m, النوع:Glossy, النسيج:500x300" },
        { code: "MAT-BNR-280-320", name: "رولة طباعة بنر (Banner Roll)", price: 1188, uom: "m", type: "product", attrs: "الوزن:280g, عرض الرولة:3.20m, النوع:Glossy, النسيج:500x300" },
        { code: "MAT-BNR-340-110", name: "رولة طباعة بنر (Banner Roll)", price: 514, uom: "m", type: "product", attrs: "الوزن:340g, عرض الرولة:1.10m, النوع:Glossy, النسيج:500x300" },
        { code: "MAT-BNR-340-137", name: "رولة طباعة بنر (Banner Roll)", price: 607, uom: "m", type: "product", attrs: "الوزن:340g, عرض الرولة:1.37m, النوع:Glossy, النسيج:500x300" },
        { code: "MAT-BNR-340-160", name: "رولة طباعة بنر (Banner Roll)", price: 747, uom: "m", type: "product", attrs: "الوزن:340g, عرض الرولة:1.60m, النوع:Glossy, النسيج:500x300" },
        { code: "MAT-BNR-340-220", name: "رولة طباعة بنر (Banner Roll)", price: 1027, uom: "m", type: "product", attrs: "الوزن:340g, عرض الرولة:2.20m, النوع:Glossy, النسيج:500x300" },
        { code: "MAT-BNR-340-260", name: "رولة طباعة بنر (Banner Roll)", price: 1213, uom: "m", type: "product", attrs: "الوزن:340g, عرض الرولة:2.60m, النوع:Glossy, النسيج:500x300" },
        { code: "MAT-BNR-340-320", name: "رولة طباعة بنر (Banner Roll)", price: 1493, uom: "m", type: "product", attrs: "الوزن:340g, عرض الرولة:3.20m, النوع:Glossy, النسيج:500x300" },
        { code: "MAT-BNR-340M-160", name: "رولة طباعة بنر (Banner Roll)", price: 679, uom: "m", type: "product", attrs: "الوزن:340g, عرض الرولة:1.60m, النوع:Matte, النسيج:500x300" },
        { code: "MAT-BNR-ABK-450-110", name: "رولة طباعة بنر (Banner Roll)", price: 671, uom: "m", type: "product", attrs: "الوزن:450g, الماركة:Abikan, عرض الرولة:1.10m, النسيج:1000x1000" },
        { code: "MAT-BNR-ABK-450-160", name: "رولة طباعة بنر (Banner Roll)", price: 1103, uom: "m", type: "product", attrs: "الوزن:450g, الماركة:Abikan, عرض الرولة:1.60m, النسيج:1000x1000" },
        { code: "MAT-BNR-ABK-450-220", name: "رولة طباعة بنر (Banner Roll)", price: 1537, uom: "m", type: "product", attrs: "الوزن:450g, الماركة:Abikan, عرض الرولة:2.20m, النسيج:1000x1000" },
        { code: "MAT-BNR-ABK-450-270", name: "رولة طباعة بنر (Banner Roll)", price: 1802, uom: "m", type: "product", attrs: "الوزن:450g, الماركة:Abikan, عرض الرولة:2.70m, النسيج:1000x1000" },
        { code: "MAT-BNR-ABK-450-320", name: "رولة طباعة بنر (Banner Roll)", price: 2226, uom: "m", type: "product", attrs: "الوزن:450g, الماركة:Abikan, عرض الرولة:3.20m, النسيج:1000x1000" },
        { code: "MAT-FLX-STAR-110", name: "رولة طباعة فلكس (Flex Roll)", price: 1247, uom: "m", type: "product", attrs: "الماركة:Star, عرض الرولة:1.10m" },
        { code: "MAT-FLX-TRK-110", name: "رولة طباعة فلكس (Flex Roll)", price: 1050, uom: "m", type: "product", attrs: "الماركة:Turkish, عرض الرولة:1.10m" },
        { code: "MAT-FLX-TRK-136", name: "رولة طباعة فلكس (Flex Roll)", price: 1241, uom: "m", type: "product", attrs: "الماركة:Turkish, عرض الرولة:1.36m" },
        { code: "MAT-FLX-TRK-160", name: "رولة طباعة فلكس (Flex Roll)", price: 1527, uom: "m", type: "product", attrs: "الماركة:Turkish, عرض الرولة:1.60m" },
        { code: "MAT-FLX-TRK-220", name: "رولة طباعة فلكس (Flex Roll)", price: 2099, uom: "m", type: "product", attrs: "الماركة:Turkish, عرض الرولة:2.20m" },
        { code: "MAT-FLX-TRK-270", name: "رولة طباعة فلكس (Flex Roll)", price: 2576, uom: "m", type: "product", attrs: "الماركة:Turkish, عرض الرولة:2.70m" },
        { code: "MAT-FLX-TRK-320", name: "رولة طباعة فلكس (Flex Roll)", price: 3053, uom: "m", type: "product", attrs: "الماركة:Turkish, عرض الرولة:3.20m" },
        { code: "VINYL-THM-107", name: "رولة طباعة لاصق (Vinyl Roll)", price: 871, uom: "m", type: "product", attrs: "النوع:Thermal, عرض الرولة:1.07m" },
        { code: "VINYL-THM-127", name: "رولة طباعة لاصق (Vinyl Roll)", price: 1010, uom: "m", type: "product", attrs: "النوع:Thermal, عرض الرولة:1.27m" },
        { code: "VINYL-THM-136", name: "رولة طباعة لاصق (Vinyl Roll)", price: 1044, uom: "m", type: "product", attrs: "النوع:Thermal, عرض الرولة:1.36m" },
        { code: "VINYL-THM-152", name: "رولة طباعة لاصق (Vinyl Roll)", price: 1249, uom: "m", type: "product", attrs: "النوع:Thermal, عرض الرولة:1.52m" },
        { code: "VINYL-THM-200", name: "رولة طباعة لاصق (Vinyl Roll)", price: 1767, uom: "m", type: "product", attrs: "النوع:Thermal, عرض الرولة:2.00m" },
        { code: "VINYL-MESH-107", name: "رولة طباعة شبكي (See-Thru Mesh)", price: 927, uom: "m", type: "product", attrs: "النوع:Mesh, عرض الرولة:1.07m" },
        { code: "VINYL-MESH-136", name: "رولة طباعة شبكي (See-Thru Mesh)", price: 1304, uom: "m", type: "product", attrs: "النوع:Mesh, عرض الرولة:1.36m" },
        { code: "VINYL-MESH-152", name: "رولة طباعة شبكي (See-Thru Mesh)", price: 1330, uom: "m", type: "product", attrs: "النوع:Mesh, عرض الرولة:1.52m" },
        { code: "PAPER-CALC-320", name: "ورق كلك (Calc Paper)", price: 732, uom: "m", type: "product", attrs: "النوع:Calc 320g, عرض الرولة:0.92m" },
        { code: "CONS-SIL-WAK-BLK", name: "مستلزمات - سيليكون (Silicon Sealant)", price: 1150, uom: "Piece", type: "product", attrs: "اللون:Black, الماركة:Wacker German" },
        { code: "CONS-SIL-WAK-CLR", name: "مستلزمات - سيليكون (Silicon Sealant)", price: 1150, uom: "Piece", type: "product", attrs: "اللون:Clear, الماركة:Wacker German" },
        { code: "CONS-SIL-WAK-WHT", name: "مستلزمات - سيليكون (Silicon Sealant)", price: 1150, uom: "Piece", type: "product", attrs: "اللون:White, الماركة:Wacker German" },
        { code: "CONS-GLUE-BOND-200", name: "مستلزمات - بخاخات وكيميائيات (Sprays & Chemicals)", price: 1250, uom: "Piece", type: "product", attrs: "الماركة:Mr Build Bond, الحجم:200ml, النوع:Glue" },
        { code: "CONS-GLUE-BOND-400", name: "مستلزمات - بخاخات وكيميائيات (Sprays & Chemicals)", price: 2100, uom: "Piece", type: "product", attrs: "الماركة:Mr Build Bond, الحجم:400ml, النوع:Glue" },
        { code: "CONS-SPRAY-ORG", name: "مستلزمات - بخاخات وكيميائيات (Sprays & Chemicals)", price: 650, uom: "Piece", type: "product", attrs: "اللون:Orange, الماركة:Mr Build, الحجم:400ml, النوع:Spray Paint" },
        { code: "CONS-SPRAY-GLD-MR", name: "مستلزمات - بخاخات وكيميائيات (Sprays & Chemicals)", price: 650, uom: "Piece", type: "product", attrs: "اللون:Gold Mirror, الماركة:Mr Build, الحجم:400ml, النوع:Spray Paint" },
        { code: "CONS-SPRAY-BLK-GLS", name: "مستلزمات - بخاخات وكيميائيات (Sprays & Chemicals)", price: 600, uom: "Piece", type: "product", attrs: "اللون:Black Glossy, الماركة:Mr Build, الحجم:400ml, النوع:Spray Paint" },
        { code: "ACC-TAPE-ELEC-BLK", name: "لصق (Tapes)", price: 200, uom: "Piece", type: "product", attrs: "النوع:Electrical, اللون:Black" },
        { code: "ACC-TAPE-DUCT-GRY", name: "لصق (Tapes)", price: 1500, uom: "Piece", type: "product", attrs: "النوع:Duct Tape, اللون:Grey, المقاس:2 inch x 50y" },
        { code: "ACC-TAPE-CLR-300", name: "لصق (Tapes)", price: 19000, uom: "Piece", type: "product", attrs: "النوع:Clear Packaging, المقاس:300 Yard" },
        { code: "ACC-ALU-TAPE-05-7-W", name: "شريط لف حروف (Channel Letter Strip)", price: 79500, uom: "Roll", type: "product", attrs: "النوع:Aluminum Tape Perforated, اللون:White, المقاس:0.5mm x 7cm x 100m" },
        { code: "ACC-ALU-TAPE-05-7-G", name: "شريط لف حروف (Channel Letter Strip)", price: 79500, uom: "Roll", type: "product", attrs: "النوع:Aluminum Tape, اللون:Gold, المقاس:0.5mm x 7cm x 100m" },
        { code: "ACC-ALU-TAPE-05-7-S", name: "شريط لف حروف (Channel Letter Strip)", price: 79500, uom: "Roll", type: "product", attrs: "النوع:Aluminum Tape, اللون:Silver, المقاس:0.5mm x 7cm x 100m" },
        { code: "ACC-ALU-TAPE-05-7-B", name: "شريط لف حروف (Channel Letter Strip)", price: 79500, uom: "Roll", type: "product", attrs: "النوع:Aluminum Tape, اللون:Black, المقاس:0.5mm x 7cm x 100m" },
        { code: "ACC-ALU-TAPE-05-7-GRN", name: "شريط لف حروف (Channel Letter Strip)", price: 79000, uom: "Roll", type: "product", attrs: "النوع:Aluminum Tape, اللون:Green, المقاس:0.5mm x 7cm x 100m" },
        { code: "ACC-ALU-TAPE-05-7-BLU", name: "شريط لف حروف (Channel Letter Strip)", price: 79500, uom: "Roll", type: "product", attrs: "النوع:Aluminum Tape, اللون:Blue, المقاس:0.5mm x 7cm x 100m" },
        { code: "ACC-ALU-TAPE-05-7-RED", name: "شريط لف حروف (Channel Letter Strip)", price: 79500, uom: "Roll", type: "product", attrs: "النوع:Aluminum Tape, اللون:Red, المقاس:0.5mm x 7cm x 100m" },
        { code: "ACC-ALU-TAPE-6CM-BLU", name: "شريط لف حروف (Channel Letter Strip)", price: 900, uom: "m", type: "product", attrs: "النوع:Aluminum Tape Perforated, اللون:Blue, المقاس:6cm" },
        { code: "ACC-ALU-TAPE-6CM-WHT", name: "شريط لف حروف (Channel Letter Strip)", price: 900, uom: "m", type: "product", attrs: "النوع:Aluminum Tape Perforated, اللون:White, المقاس:6cm" },
        { code: "ACC-ALU-TAPE-05-7-200-S", name: "شريط لف حروف (Channel Letter Strip)", price: 79500, uom: "Roll", type: "product", attrs: "النوع:Aluminum Tape, اللون:Silver, المقاس:0.5mm x 7cm x 200m" },
        { code: "ACC-ALU-TAPE-05-7-200-G", name: "شريط لف حروف (Channel Letter Strip)", price: 79500, uom: "Roll", type: "product", attrs: "النوع:Aluminum Tape, اللون:Gold, المقاس:0.5mm x 7cm x 200m" },
        { code: "ACC-ALU-TAPE-5CM-100-RED", name: "شريط لف حروف (Channel Letter Strip)", price: 81000, uom: "Roll", type: "product", attrs: "النوع:Aluminum Tape, اللون:Red, المقاس:5cm x 100m" },
        { code: "FAST-SCR-YEL-05", name: "براغي (Screws)", price: 1000, uom: "Packet", type: "product", attrs: "اللون:Yellow, الوزن:0.5kg" },
        { code: "FAST-SCR-GIANT-42-25", name: "براغي (Screws)", price: 2500, uom: "Packet", type: "product", attrs: "الماركة:Giant, المقاس:4.2*25" },
        { code: "FAST-SCR-GIANT-19-42", name: "براغي (Screws)", price: 2500, uom: "Packet", type: "product", attrs: "الماركة:Giant, المقاس:19*4.2 Sunk" },
        { code: "FAST-SCR-YEL-30440", name: "براغي (Screws)", price: 1500, uom: "Packet", type: "product", attrs: "اللون:Yellow, الوزن:0.5kg" },
        { code: "FAST-HINGE-35-4", name: "براغي (Screws)", price: 750, uom: "Set", type: "product", attrs: "النوع:Hinge Conical, المقاس:3.5*4" },
        { code: "FAST-HINGE-GLD-3", name: "براغي (Screws)", price: 300, uom: "Piece", type: "product", attrs: "النوع:Safat Gold, المقاس:3 inch" },
        { code: "FAST-SCR-GIANT-42-13", name: "براغي (Screws)", price: 2000, uom: "Packet", type: "product", attrs: "الماركة:Giant, المقاس:4.2*13" },
        { code: "FAST-SCR-GIANT-42-19-K", name: "براغي (Screws)", price: 2500, uom: "Packet", type: "product", attrs: "الماركة:Giant, المقاس:4.2*19 Kofia" },
        { code: "FAST-SCR-GIANT-42-19-G", name: "براغي (Screws)", price: 2500, uom: "Packet", type: "product", attrs: "الماركة:Giant, المقاس:4.2*19 Sunk" },
        { code: "FAST-BOLT-PANEL-17", name: "براغي (Screws)", price: 65, uom: "Piece", type: "product", attrs: "النوع:Panel Bolt, المقاس:17mm x 1cm" },
        { code: "FAST-BOLT-HANGAR-1", name: "براغي (Screws)", price: 25, uom: "Piece", type: "product", attrs: "النوع:Hangar Bolt, المقاس:1 inch" },
        { code: "TOOL-SIL-GUN", name: "أدوات (Tools)", price: 2750, uom: "Piece", type: "product", attrs: "النوع:Silicon Gun, اللون:Black" },
        { code: "TOOL-BIT-5IN", name: "أدوات (Tools)", price: 250, uom: "Piece", type: "product", attrs: "النوع:Cutting Disc Steel, المقاس:5 inch" },
        { code: "TOOL-WELD-ROD", name: "أدوات (Tools)", price: 2000, uom: "Packet", type: "product", attrs: "النوع:Welding Rods, المقاس:2.5" },
        { code: "TOOL-BIT-FREZA-8", name: "أدوات (Tools)", price: 1000, uom: "Piece", type: "product", attrs: "النوع:Freza Bit, المقاس:8mm" },
        { code: "TOOL-BIT-FREZA-10", name: "أدوات (Tools)", price: 1000, uom: "Piece", type: "product", attrs: "النوع:Freza Bit, المقاس:10mm" },
        { code: "MAT-FOR-3MM-WHT", name: "لوح فوركس (Forex Sheet)", price: 5565, uom: "Sheet", type: "product", attrs: "السمك:3mm, اللون:White, الأبعاد:1.22x2.44m" },
        { code: "MAT-FOR-4MM-WHT", name: "لوح فوركس (Forex Sheet)", price: 7420, uom: "Sheet", type: "product", attrs: "السمك:4mm, اللون:White, الأبعاد:1.22x2.44m" },
        { code: "MAT-FOR-6MM-WHT", name: "لوح فوركس (Forex Sheet)", price: 9540, uom: "Sheet", type: "product", attrs: "السمك:6mm, اللون:White, الأبعاد:1.22x2.44m" },
        { code: "MAT-FOR-8MM-WHT", name: "لوح فوركس (Forex Sheet)", price: 12720, uom: "Sheet", type: "product", attrs: "السمك:8mm, اللون:White, الأبعاد:1.22x2.44m" },
        { code: "MAT-FOR-10MM-WHT", name: "لوح فوركس (Forex Sheet)", price: 15900, uom: "Sheet", type: "product", attrs: "السمك:10mm, اللون:White, الأبعاد:1.22x2.44m" },
        { code: "MAT-FOR-12MM-WHT", name: "لوح فوركس (Forex Sheet)", price: 19080, uom: "Sheet", type: "product", attrs: "السمك:12mm, اللون:White, الأبعاد:1.22x2.44m" },
        { code: "MAT-FOR-15MM-WHT", name: "لوح فوركس (Forex Sheet)", price: 23850, uom: "Sheet", type: "product", attrs: "السمك:15mm, اللون:White, الأبعاد:1.22x2.44m" },
        { code: "MAT-FOR-20MM-WHT", name: "لوح فوركس (Forex Sheet)", price: 37100, uom: "Sheet", type: "product", attrs: "السمك:20mm, اللون:White, الأبعاد:1.22x2.44m" },
        { code: "MAT-ACR-2MM-CLR", name: "لوح أكريليك (Acrylic Sheet)", price: 15900, uom: "Sheet", type: "product", attrs: "اللون:Clear, السمك:2mm, الأبعاد:1.22x2.44m" },
        { code: "MAT-ACR-3MM-CLR", name: "لوح أكريليك (Acrylic Sheet)", price: 22790, uom: "Sheet", type: "product", attrs: "اللون:Clear, السمك:3mm, الأبعاد:1.22x2.44m" },
        { code: "MAT-ACR-4MM-CLR", name: "لوح أكريليك (Acrylic Sheet)", price: 29680, uom: "Sheet", type: "product", attrs: "اللون:Clear, السمك:4mm, الأبعاد:1.22x2.44m" },
        { code: "MAT-ACR-8MM-CLR", name: "لوح أكريليك (Acrylic Sheet)", price: 58300, uom: "Sheet", type: "product", attrs: "اللون:Clear, السمك:8mm, الأبعاد:1.22x2.44m" },
        { code: "MAT-ACR-12MM-CLR", name: "لوح أكريليك (Acrylic Sheet)", price: 90100, uom: "Sheet", type: "product", attrs: "اللون:Clear, السمك:12mm, الأبعاد:1.22x2.44m" },
        { code: "MAT-ACR-3MM-YEL-235", name: "لوح أكريليك (Acrylic Sheet)", price: 22790, uom: "Sheet", type: "product", attrs: "اللون:Yellow 235, السمك:3mm, الأبعاد:1.22x2.44m" },
        { code: "MAT-ACR-3MM-TURQ-3288", name: "لوح أكريليك (Acrylic Sheet)", price: 22790, uom: "Sheet", type: "product", attrs: "اللون:Turquoise UV 3288, السمك:3mm, الأبعاد:1.22x2.44m" },
        { code: "MAT-ACR-3MM-ICE-422", name: "لوح أكريليك (Acrylic Sheet)", price: 22790, uom: "Sheet", type: "product", attrs: "اللون:Ice 422, السمك:3mm, الأبعاد:1.22x2.44m" },
        { code: "MAT-ACR-3MM-BW-402", name: "لوح أكريليك (Acrylic Sheet)", price: 22790, uom: "Sheet", type: "product", attrs: "اللون:Bone White UV 402, السمك:3mm, الأبعاد:1.22x2.44m" },
        { code: "MAT-ACR-3MM-BLK-502", name: "لوح أكريليك (Acrylic Sheet)", price: 22790, uom: "Sheet", type: "product", attrs: "اللون:Black UV 502, السمك:3mm, الأبعاد:1.22x2.44m" },
        { code: "MAT-ACR-3MM-RED-136", name: "لوح أكريليك (Acrylic Sheet)", price: 22790, uom: "Sheet", type: "product", attrs: "اللون:Red 136, السمك:3mm, الأبعاد:1.22x2.44m" },
        { code: "MAT-ACR-3MM-BLU-322", name: "لوح أكريليك (Acrylic Sheet)", price: 22790, uom: "Sheet", type: "product", attrs: "اللون:Blue 322, السمك:3mm, الأبعاد:1.22x2.44m" },
        { code: "MAT-ACR-3MM-GRN", name: "لوح أكريليك (Acrylic Sheet)", price: 22790, uom: "Sheet", type: "product", attrs: "اللون:Green 348, السمك:3mm, الأبعاد:1.22x2.44m" },
        { code: "MAT-ACR-3MM-ORG", name: "لوح أكريليك (Acrylic Sheet)", price: 22790, uom: "Sheet", type: "product", attrs: "اللون:Orange 266, السمك:3mm, الأبعاد:1.22x2.44m" },
        { code: "MAT-ACR-3MM-YEL", name: "لوح أكريليك (Acrylic Sheet)", price: 22790, uom: "Sheet", type: "product", attrs: "اللون:Turmeric (Kurkumi) 238, السمك:3mm, الأبعاد:1.22x2.44m" },
        { code: "MAT-ACR-2MM-MIR-SLV", name: "لوح أكريليك (Acrylic Sheet)", price: 24000, uom: "Sheet", type: "product", attrs: "اللون:Silver Mirror, السمك:2mm, الأبعاد:1.22x2.44m" },
        { code: "MAT-ACR-2MM-BRN-5021", name: "لوح أكريليك (Acrylic Sheet)", price: 18000, uom: "Sheet", type: "product", attrs: "اللون:Brown Translucent 5021, السمك:2mm, الأبعاد:1.22x2.44m" },
        { code: "MAT-ACR-3MM-MIX", name: "لوح أكريليك (Acrylic Sheet)", price: 22000, uom: "Sheet", type: "product", attrs: "اللون:Mixed, السمك:3mm, الأبعاد:1.22x2.44m" },
        { code: "MAT-ACR-1MM-ADH-LGLD", name: "أكريليك لاصق (Acrylic Adhesive)", price: 9250, uom: "Sheet", type: "product", attrs: "اللون:Light Gold, السمك:1mm, الأبعاد:1.22x2.44m" },
        { code: "MAT-ACR-1MM-ADH-MIR-SLV", name: "أكريليك لاصق (Acrylic Adhesive)", price: 10000, uom: "Sheet", type: "product", attrs: "اللون:Silver Mirror, السمك:1mm, الأبعاد:1.22x2.44m" },
        { code: "MAT-ACR-1MM-ADH-RED", name: "أكريليك لاصق (Acrylic Adhesive)", price: 9750, uom: "Sheet", type: "product", attrs: "اللون:Red, السمك:1mm, الأبعاد:1.22x2.44m" },
        { code: "MAT-ACR-1MM-ADH-BLU-19", name: "أكريليك لاصق (Acrylic Adhesive)", price: 9750, uom: "Sheet", type: "product", attrs: "اللون:Blue 19, السمك:1mm, الأبعاد:1.22x2.44m" },
        { code: "MAT-ACR-1MM-ADH-PURP-13", name: "أكريليك لاصق (Acrylic Adhesive)", price: 9750, uom: "Sheet", type: "product", attrs: "اللون:Purple 13, السمك:1mm, الأبعاد:1.22x2.44m" },
        { code: "MAT-ACR-1MM-ADH-GRN-26", name: "أكريليك لاصق (Acrylic Adhesive)", price: 10000, uom: "Sheet", type: "product", attrs: "اللون:Green 26, السمك:1mm, الأبعاد:1.22x2.44m" },
        { code: "MAT-ACR-1MM-ADH-BRNZ-7", name: "أكريليك لاصق (Acrylic Adhesive)", price: 10000, uom: "Sheet", type: "product", attrs: "اللون:Bronze 7, السمك:1mm, الأبعاد:1.22x2.44m" },
        { code: "ACC-STRIP-CHEN-SLV-M-7", name: "شريط لف حروف (Channel Letter Strip)", price: 39750, uom: "Roll", type: "product", attrs: "النوع:Chenille Perforated, اللون:Silver Matte, المقاس:7cm x 50m" },
        { code: "ACC-STRIP-CHEN-GLD-B-7", name: "شريط لف حروف (Channel Letter Strip)", price: 35775, uom: "Roll", type: "product", attrs: "النوع:Chenille Brushed, اللون:Gold, المقاس:7cm x 50m" },
        { code: "ACC-STRIP-CHEN-GLD-M-7", name: "شريط لف حروف (Channel Letter Strip)", price: 39750, uom: "Roll", type: "product", attrs: "النوع:Chenille Perforated, اللون:Gold Matte, المقاس:7cm x 50m" },
        { code: "ACC-STRIP-CHEN-SLV-B-7", name: "شريط لف حروف (Channel Letter Strip)", price: 35775, uom: "Roll", type: "product", attrs: "النوع:Chenille Brushed, اللون:Silver, المقاس:7cm x 50m" },
        { code: "ACC-STRIP-CHEN-BLK-7", name: "شريط لف حروف (Channel Letter Strip)", price: 34450, uom: "Roll", type: "product", attrs: "النوع:Chenille, اللون:Black, المقاس:7cm x 50m" },
        { code: "ACC-STRIP-STL-GLD-3", name: "شريط لف حروف (Channel Letter Strip)", price: 21200, uom: "Roll", type: "product", attrs: "النوع:Steel, اللون:Gold Mirror, المقاس:3cm x 100m" },
        { code: "ACC-STRIP-STL-GLD-4", name: "شريط لف حروف (Channel Letter Strip)", price: 26500, uom: "Roll", type: "product", attrs: "النوع:Steel, اللون:Gold Mirror, المقاس:4cm x 100m" },
        { code: "ACC-STRIP-STL-SLV-5", name: "شريط لف حروف (Channel Letter Strip)", price: 34450, uom: "Roll", type: "product", attrs: "النوع:Steel, اللون:Silver Mirror, المقاس:5cm x 100m" },
        { code: "ACC-STRIP-STL-GLD-5", name: "شريط لف حروف (Channel Letter Strip)", price: 37100, uom: "Roll", type: "product", attrs: "النوع:Steel, اللون:Gold Mirror, المقاس:5cm x 100m" },
        { code: "ACC-STRIP-STL-SLV-6", name: "شريط لف حروف (Channel Letter Strip)", price: 39750, uom: "Roll", type: "product", attrs: "النوع:Steel, اللون:Silver Mirror, المقاس:6cm x 100m" },
        { code: "ACC-STRIP-STL-GLD-6", name: "شريط لف حروف (Channel Letter Strip)", price: 42400, uom: "Roll", type: "product", attrs: "النوع:Steel, اللون:Gold Mirror, المقاس:6cm x 100m" },
        { code: "ACC-STRIP-ALU-SLV-P-6", name: "شريط لف حروف (Channel Letter Strip)", price: 45050, uom: "Roll", type: "product", attrs: "النوع:Aluminum Perforated, اللون:Silver Mirror, المقاس:6cm x 100m" },
        { code: "ACC-STRIP-ALU-GLD-P-6", name: "شريط لف حروف (Channel Letter Strip)", price: 47700, uom: "Roll", type: "product", attrs: "النوع:Aluminum Perforated, اللون:Gold Mirror, المقاس:6cm x 100m" },
        { code: "MAT-LIK-AM-1107-4MM", name: "الواح كلادينج (Cladding Sheet)", price: 30250, uom: "Sheet", type: "product", attrs: "النوع:American Glossy, اللون:1107, السمك:4mm, الأبعاد:1.25x2.44m" },
        { code: "MAT-LIK-4MM-PEARL", name: "الواح كلادينج (Cladding Sheet)", price: 29300, uom: "Sheet", type: "product", attrs: "اللون:Pearl 70, السمك:4mm, الأبعاد:1.25x2.44m" },
        { code: "MAT-LIK-4MM-WHT-001", name: "الواح كلادينج (Cladding Sheet)", price: 23500, uom: "Sheet", type: "product", attrs: "اللون:White 001 Glossy, السمك:4mm, الأبعاد:1.22x2.44m" },
        { code: "MAT-LIK-4MM-BLK-066", name: "الواح كلادينج (Cladding Sheet)", price: 23000, uom: "Sheet", type: "product", attrs: "اللون:Black 066 Glossy, السمك:4mm, الأبعاد:1.22x2.44m" },
        { code: "MAT-LIK-4MM-ORG", name: "الواح كلادينج (Cladding Sheet)", price: 25400, uom: "Sheet", type: "product", attrs: "اللون:Orange 005 Glossy, السمك:4mm, الأبعاد:1.22x2.44m" },
        { code: "MAT-LIK-4MM-COPPER", name: "الواح كلادينج (Cladding Sheet)", price: 29300, uom: "Sheet", type: "product", attrs: "اللون:Copper Glossy 9, السمك:4mm, الأبعاد:1.25x2.44m" },
        { code: "MAT-LIK-4MM-WOOD-DARK", name: "الواح كلادينج (Cladding Sheet)", price: 39000, uom: "Sheet", type: "product", attrs: "اللون:Dark Wood 45, السمك:4mm, الأبعاد:1.25x2.44m" },
        { code: "MAT-LIK-3MM-GLD-USD", name: "الواح كلادينج (Cladding Sheet)", price: 28090, uom: "Sheet", type: "product", attrs: "اللون:Golden, السمك:3mm, الأبعاد:1.22x2.44m" },
        { code: "MAT-LIK-3MM-WOOD", name: "الواح كلادينج (Cladding Sheet)", price: 23500, uom: "Sheet", type: "product", attrs: "الماركة:Royal, اللون:Wood, السمك:3mm, الأبعاد:1.22x2.44m" },
        { code: "MAT-LIK-3MM-MIR-GLD", name: "الواح كلادينج (Cladding Sheet)", price: 26500, uom: "Sheet", type: "product", attrs: "الماركة:Royal, اللون:Gold Mirror 032, السمك:3mm, الأبعاد:1.22x2.44m" },
        { code: "MAT-LIK-3MM-MOD23", name: "الواح كلادينج (Cladding Sheet)", price: 19800, uom: "Sheet", type: "product", attrs: "الماركة:23 F, السمك:3mm, الأبعاد:1.22x2.44m" },
        { code: "MAT-LIK-AM-1107-LG", name: "الواح كلادينج (Cladding Sheet)", price: 75800, uom: "Sheet", type: "product", attrs: "النوع:American Glossy, اللون:1107, السمك:4mm, الأبعاد:1.25x5.80m" },
        { code: "MAT-LIK-4MM-BRN-81-LG", name: "الواح كلادينج (Cladding Sheet)", price: 71500, uom: "Sheet", type: "product", attrs: "اللون:Brown 81, السمك:4mm, الأبعاد:1.25x5.80m" },
        { code: "MAT-LIK-4MM-WHT-1024-LG", name: "الواح كلادينج (Cladding Sheet)", price: 75800, uom: "Sheet", type: "product", attrs: "اللون:White 1024 Glossy, السمك:4mm, الأبعاد:1.25x5.80m" },
        { code: "MAT-LIK-4MM-BRN-1156-LG", name: "الواح كلادينج (Cladding Sheet)", price: 58000, uom: "Sheet", type: "product", attrs: "اللون:Burnt Brown 1156, السمك:4mm, الأبعاد:1.25x4.88m" },
        { code: "MAT-LIK-3MM-SLV-004", name: "الواح كلادينج (Cladding Sheet)", price: 19000, uom: "Sheet", type: "product", attrs: "اللون:Silver Glossy 004, السمك:3mm, الأبعاد:1.22x2.44m" },
        { code: "MAT-LIK-3MM-WOOD-542", name: "الواح كلادينج (Cladding Sheet)", price: 23500, uom: "Sheet", type: "product", attrs: "اللون:Wood 542, السمك:3mm, الأبعاد:1.22x2.44m" },
        { code: "MAT-STEEL-05-GLD", name: "لوح استيل (Steel Sheet)", price: 16500, uom: "Sheet", type: "product", attrs: "اللون:Gold, السمك:0.5mm, الأبعاد:1.22x2.44m" },
        { code: "MAT-STEEL-06-GLD", name: "لوح استيل (Steel Sheet)", price: 16500, uom: "Sheet", type: "product", attrs: "اللون:Gold, السمك:0.6mm, الأبعاد:1.22x2.44m" },
        { code: "STEEL.STRIP.GLD.2CM", name: "شريط لف حروف (Channel Letter Strip)", price: 220, uom: "Meter", type: "product", attrs: "النوع:Steel, اللون:Gold, المقاس:0.5mm x 2cm" },
        { code: "MAT-STEEL-05-GLD-SM", name: "لوح استيل (Steel Sheet)", price: 11000, uom: "Sheet", type: "product", attrs: "اللون:Gold, السمك:0.5mm, الأبعاد:1.00x2.00m" },
        { code: "WOOD.PLY.12", name: "خشب أبلكش (Plywood)", price: 11300, uom: "Sheet", type: "product", attrs: "السمك:12mm, الأبعاد:1.22x2.44m" },
        { code: "WOOD-MDF-4MM", name: "لوح خشب MDF (MDF Board)", price: 2500, uom: "Sheet", type: "product", attrs: "السمك:4mm, الأبعاد:1.22x2.44m" },
        { code: "WOOD-MDF-6MM", name: "لوح خشب MDF (MDF Board)", price: 4000, uom: "Sheet", type: "product", attrs: "السمك:6mm, الأبعاد:1.22x2.44m" },
        { code: "WOOD-MDF-9MM", name: "لوح خشب MDF (MDF Board)", price: 4750, uom: "Sheet", type: "product", attrs: "السمك:9mm, الأبعاد:1.22x2.44m" },
        { code: "WOOD-MDF-12MM", name: "لوح خشب MDF (MDF Board)", price: 6000, uom: "Sheet", type: "product", attrs: "السمك:12mm, الأبعاد:1.22x2.44m" },
        { code: "WOOD-MDF-16MM", name: "لوح خشب MDF (MDF Board)", price: 7600, uom: "Sheet", type: "product", attrs: "السمك:16mm, الأبعاد:1.22x2.44m" },
        { code: "WOOD-MDF-18MM", name: "لوح خشب MDF (MDF Board)", price: 9800, uom: "Sheet", type: "product", attrs: "السمك:18mm, الأبعاد:1.22x2.44m" },
        { code: "ELEC-LED-MOD-SAM-3", name: "إضاءة ليد (LED Module)", price: 80, uom: "Piece", type: "product", attrs: "النوع:Samsung 3-LED, اللون:Gold/Warm" },
        { code: "INK-ECO-ART-1L-C", name: "حبر إيكوسولفنت (Eco-Solvent Ink)", price: 8480, uom: "Liter", type: "product", attrs: "الماركة:Art Jet Eco Puls, اللون:Cyan, الحجم:1L" },
        { code: "INK-ECO-ART-1L-M", name: "حبر إيكوسولفنت (Eco-Solvent Ink)", price: 8480, uom: "Liter", type: "product", attrs: "الماركة:Art Jet Eco Puls, اللون:Magenta, الحجم:1L" },
        { code: "INK-ECO-ART-1L-Y", name: "حبر إيكوسولفنت (Eco-Solvent Ink)", price: 8480, uom: "Liter", type: "product", attrs: "الماركة:Art Jet Eco Puls, اللون:Yellow, الحجم:1L" },
        { code: "INK-ECO-ART-1L-K", name: "حبر إيكوسولفنت (Eco-Solvent Ink)", price: 8480, uom: "Liter", type: "product", attrs: "الماركة:Art Jet Eco Puls, اللون:Black, الحجم:1L" },
        { code: "INK-ECO-ART-PREM-5L-C", name: "حبر إيكوسولفنت (Eco-Solvent Ink)", price: 31800, uom: "Piece", type: "product", attrs: "الماركة:Art Jet Premium, اللون:Cyan, الحجم:5L" },
        { code: "INK-ECO-ART-PREM-5L-M", name: "حبر إيكوسولفنت (Eco-Solvent Ink)", price: 31800, uom: "Piece", type: "product", attrs: "الماركة:Art Jet Premium, اللون:Magenta, الحجم:5L" },
        { code: "INK-ECO-ART-PREM-5L-Y", name: "حبر إيكوسولفنت (Eco-Solvent Ink)", price: 31800, uom: "Piece", type: "product", attrs: "الماركة:Art Jet Premium, اللون:Yellow, الحجم:5L" },
        { code: "INK-ECO-ART-PREM-5L-K", name: "حبر إيكوسولفنت (Eco-Solvent Ink)", price: 31800, uom: "Piece", type: "product", attrs: "الماركة:Art Jet Premium, اللون:Black, الحجم:5L" },
        { code: "INK-ECO-LECAI-1L", name: "حبر إيكوسولفنت (Eco-Solvent Ink)", price: 9010, uom: "Liter", type: "product", attrs: "الماركة:LECAI, الحجم:1L" },
        { code: "INK-FLORA-5L-C", name: "حبر فلورا (Flora Ink)", price: 26500, uom: "Piece", type: "product", attrs: "الماركة:Flora Konica 35PL, اللون:Cyan, الحجم:5L" },
        { code: "INK-FLORA-5L-M", name: "حبر فلورا (Flora Ink)", price: 26500, uom: "Piece", type: "product", attrs: "الماركة:Flora Konica 35PL, اللون:Magenta, الحجم:5L" },
        { code: "INK-FLORA-5L-Y", name: "حبر فلورا (Flora Ink)", price: 26500, uom: "Piece", type: "product", attrs: "الماركة:Flora Konica 35PL, اللون:Yellow, الحجم:5L" },
        { code: "INK-FLORA-5L-K", name: "حبر فلورا (Flora Ink)", price: 26500, uom: "Piece", type: "product", attrs: "الماركة:Flora Konica 35PL, اللون:Black, الحجم:5L" },
        { code: "INK-UV-EPS-HARD-05-W", name: "حبر يوفي (UV Ink)", price: 10600, uom: "Piece", type: "product", attrs: "النوع:Epson Hard, اللون:White, الحجم:0.5L" },
        { code: "INK-UV-EPS-HARD-025-W", name: "حبر يوفي (UV Ink)", price: 5300, uom: "Piece", type: "product", attrs: "النوع:Epson Hard, اللون:White, الحجم:0.25L" },
        { code: "INK-UV-EPS-HARD-025-CMYK", name: "حبر يوفي (UV Ink)", price: 5300, uom: "Piece", type: "product", attrs: "النوع:Epson Hard, اللون:CMYK, الحجم:0.25L" },
        { code: "INK-UV-EPS-HARD-05-CMYK", name: "حبر يوفي (UV Ink)", price: 10600, uom: "Piece", type: "product", attrs: "النوع:Epson Hard, اللون:CMYK, الحجم:0.5L" },
        { code: "INK-UV-VARNISH-05", name: "حبر يوفي (UV Ink)", price: 11660, uom: "Piece", type: "product", attrs: "النوع:Varnish, الحجم:0.5L" },
        { code: "INK-UV-XP600-05-W", name: "حبر يوفي (UV Ink)", price: 8480, uom: "Piece", type: "product", attrs: "النوع:XP600, اللون:White, الحجم:0.5L" },
        { code: "INK-DTF-05", name: "حبر طباعة (DTF Ink)", price: 7420, uom: "Piece", type: "product", attrs: "النوع:DTF, الحجم:0.5L" },
        { code: "CONS-FLUSH-ART-5L", name: "محلول تنظيف (Flush Solution)", price: 39750, uom: "Piece", type: "product", attrs: "الماركة:Art Jet, الحجم:5L" },
        { code: "CONS-FLUSH-FLORA-5L", name: "محلول تنظيف (Flush Solution)", price: 26500, uom: "Piece", type: "product", attrs: "الماركة:Flora, الحجم:5L" },
        { code: "CONS-FLUSH-ECO-1L", name: "محلول تنظيف (Flush Solution)", price: 5300, uom: "Liter", type: "product", attrs: "النوع:Eco-Solvent, الحجم:1L" },
        { code: "CONS-FIX-UV-GLS-10", name: "مستلزمات - بخاخات وكيميائيات (Sprays & Chemicals)", price: 530, uom: "Piece", type: "product", attrs: "الحجم:10ml, النوع:Fixative" },
        { code: "CONS-FIX-UV-GLS-40", name: "مستلزمات - بخاخات وكيميائيات (Sprays & Chemicals)", price: 2120, uom: "Piece", type: "product", attrs: "الحجم:40ml, النوع:Fixative" },
        { code: "CONS-PROT-VARNISH", name: "حبر يوفي (UV Ink)", price: 10600, uom: "Piece", type: "product", attrs: "النوع:Varnish, اللون:Clear/Transparent" },
        { code: "MACH-LASER-300W", name: "معدات - ماكينة ليزر (Laser Machine)", price: 6625000, uom: "Piece", type: "product", attrs: "الماركة:HQ2513, القدرة:300W" },
        { code: "MACH-FIBER-30W", name: "معدات - ماكينة ليزر (Laser Machine)", price: 901000, uom: "Piece", type: "product", attrs: "الماركة:3030, النوع:Fiber, القدرة:30W" },
        { code: "MACH-PRINT-BLUE-512I", name: "معدات - طابعة (Large Format Printer)", price: 9275000, uom: "Piece", type: "product", attrs: "المقاس:3.2m" },
        { code: "MACH-WELD-300W", name: "معدات - تصنيع (Fabrication Machine)", price: 2756000, uom: "Piece", type: "product", attrs: "النوع:Steel Welding, القدرة:300W" },
        { code: "MACH-BEND-S150", name: "معدات - تصنيع (Fabrication Machine)", price: 3286000, uom: "Piece", type: "product", attrs: "الماركة:S150, النوع:Channel Letter Bender" },
        { code: "MACH-UPS-3KVA", name: "معدات - ملحقات طاقة (Power Accessories)", price: 145750, uom: "Piece", type: "product", attrs: "القدرة:3KVA, الماركة:SC2K" },
        { code: "PART-HEAD-XP600", name: "قطع غيار - رأس طابعة (Print Head)", price: 148400, uom: "Piece", type: "product", attrs: "الموديل:XP600" },
        { code: "PART-HEAD-KM512", name: "قطع غيار - رأس طابعة (Print Head)", price: 132500, uom: "Piece", type: "product", attrs: "الموديل:Konica 512" },
        { code: "PART-HEAD-DX5", name: "قطع غيار - رأس طابعة (Print Head)", price: 450500, uom: "Piece", type: "product", attrs: "الموديل:Epson DX5" },
        { code: "PART-INK-PUMP", name: "قطع غيار - نظام الحبر (Ink System Parts)", price: 13250, uom: "Piece", type: "product", attrs: "النوع:Pump, الموديل:W6.5" },
        { code: "PART-INK-FILTER-JYY", name: "قطع غيار - نظام الحبر (Ink System Parts)", price: 5300, uom: "Piece", type: "product", attrs: "النوع:Filter, الموديل:Disc JYY" },
        { code: "PART-INK-CAP-SKY", name: "قطع غيار - نظام الحبر (Ink System Parts)", price: 15900, uom: "Piece", type: "product", attrs: "النوع:Cap Top, الموديل:SkyColor" },
        { code: "PART-INK-DAMP-DX5", name: "قطع غيار - نظام الحبر (Ink System Parts)", price: 3710, uom: "Piece", type: "product", attrs: "النوع:Damper, الموديل:DX5/UV" },
        { code: "PART-ELEC-ENC-180", name: "قطع غيار - إلكترونيات (Electronics)", price: 15900, uom: "Piece", type: "product", attrs: "النوع:Encoder Strip, المواصفات:180 DPI" },
        { code: "PART-ELEC-CABLE-DATA", name: "قطع غيار - إلكترونيات (Electronics)", price: 7950, uom: "Piece", type: "product", attrs: "النوع:Flat Cable, المواصفات:14 Pin" },
        { code: "PART-LSR-LENS-20", name: "قطع غيار - ليزر (Laser Parts)", price: 31800, uom: "Piece", type: "product", attrs: "النوع:Lens, القطر:20mm" },
        { code: "PART-LSR-MIR-25", name: "قطع غيار - ليزر (Laser Parts)", price: 18550, uom: "Piece", type: "product", attrs: "النوع:Mirror, القطر:25mm" },
        { code: "DISP-ROLLUP-85", name: "استاند عرض (Roll-up Stand)", price: 22260, uom: "Piece", type: "product", attrs: "المقاس:85x200cm, النوع:Broad Base" },
        { code: "DISP-LB-12060", name: "لوحة مضيئة (Light Box)", price: 19080, uom: "Piece", type: "product", attrs: "المقاس:120x60cm" },
        { code: "DISP-LB-12075", name: "لوحة مضيئة (Light Box)", price: 21200, uom: "Piece", type: "product", attrs: "المقاس:120x75cm" },
        { code: "DISP-LB-9060", name: "لوحة مضيئة (Light Box)", price: 16960, uom: "Piece", type: "product", attrs: "المقاس:90x60cm" },
        { code: "DISP-LB-A2", name: "لوحة مضيئة (Light Box)", price: 8480, uom: "Piece", type: "product", attrs: "المقاس:A2" },
        { code: "DISP-LB-A3", name: "لوحة مضيئة (Light Box)", price: 5300, uom: "Piece", type: "product", attrs: "المقاس:A3" },
        { code: "DISP-LB-A4", name: "لوحة مضيئة (Light Box)", price: 4240, uom: "Piece", type: "product", attrs: "المقاس:A4" },
        { code: "DISP-LB-HANG-9060", name: "مستلزمات عرض (Display Hangers)", price: 5830, uom: "Piece", type: "product", attrs: "المقاس:90x60cm, النوع:Hanger" },
        { code: "DISP-ELITE-A2", name: "لوحة مضيئة (Light Box)", price: 8480, uom: "Piece", type: "product", attrs: "المقاس:A2, النوع:Elite Box" },
        { code: "DISP-ELITE-6090", name: "لوحة مضيئة (Light Box)", price: 16960, uom: "Piece", type: "product", attrs: "المقاس:60x90cm, النوع:Elite Box" },
        { code: "GIFT-TROPHY-CRYSTAL-LG", name: "درع تذكاري (Trophy)", price: 7000, uom: "Piece", type: "product", attrs: "الحجم:Large" },
        { code: "GIFT-TROPHY-CRYSTAL-SM", name: "درع تذكاري (Trophy)", price: 3000, uom: "Piece", type: "product", attrs: "الحجم:Small" },
        { code: "STAMP-WOOD-RND", name: "ختم (Stamp)", price: 3000, uom: "Piece", type: "service", attrs: "النوع:Wooden" },
        { code: "STAMP-LASER-AUTO", name: "ختم (Stamp)", price: 6000, uom: "Piece", type: "service", attrs: "النوع:Laser Automatic" },
        { code: "PART-PSU-RAIN-700W", name: "قطع غيار - مزود طاقة (Power Supply)", price: 9010, uom: "Piece", type: "product", attrs: "النوع:Rainproof, القدرة:700W, التيار:58.3A" },
        { code: "PART-PSU-RAIN-600W", name: "قطع غيار - مزود طاقة (Power Supply)", price: 7950, uom: "Piece", type: "product", attrs: "النوع:Rainproof, القدرة:600W, التيار:50.0A" },
        { code: "PART-PSU-RAIN-500W", name: "قطع غيار - مزود طاقة (Power Supply)", price: 6890, uom: "Piece", type: "product", attrs: "النوع:Rainproof, القدرة:500W, التيار:41.7A" },
        { code: "PART-PSU-RAIN-400W", name: "قطع غيار - مزود طاقة (Power Supply)", price: 6625, uom: "Piece", type: "product", attrs: "النوع:Rainproof, القدرة:400W, التيار:33.33A" },
        { code: "PART-PSU-RAIN-300W", name: "قطع غيار - مزود طاقة (Power Supply)", price: 4611, uom: "Piece", type: "product", attrs: "النوع:Rainproof, القدرة:300W, التيار:25.0A" },
        { code: "PART-PSU-RAIN-200W", name: "قطع غيار - مزود طاقة (Power Supply)", price: 3551, uom: "Piece", type: "product", attrs: "النوع:Rainproof, القدرة:200W, التيار:16.66A" },
        { code: "PART-PSU-STD-150W", name: "قطع غيار - مزود طاقة (Power Supply)", price: 3180, uom: "Piece", type: "product", attrs: "النوع:Standard, القدرة:150W, التيار:12.5A" },
        { code: "PART-PSU-RAIN-100W", name: "قطع غيار - مزود طاقة (Power Supply)", price: 3180, uom: "Piece", type: "product", attrs: "النوع:Rainproof, القدرة:100W, التيار:8.33A" },
        { code: "PART-PSU-STD-60W", name: "قطع غيار - مزود طاقة (Power Supply)", price: 2120, uom: "Piece", type: "product", attrs: "النوع:Standard, القدرة:60W, التيار:5.0A" },
        { code: "FALX.1.1.1.16886", name: "فلكس تورجيت (Flex Tourjet)", price: 127200, uom: "Roll", type: "product", attrs: "الوزن:610g, عرض الرولة:3.20m, الطول:50m" },
        { code: "FALX.1.1.1.16884", name: "فلكس تورجيت (Flex Tourjet)", price: 87450, uom: "Roll", type: "product", attrs: "الوزن:610g, عرض الرولة:2.20m, الطول:50m" },
        { code: "FALX.1.1.1.16883", name: "فلكس تورجيت (Flex Tourjet)", price: 63600, uom: "Roll", type: "product", attrs: "الوزن:610g, عرض الرولة:1.60m, الطول:50m" },
        { code: "FALX.1.1.1.16880", name: "فلكس تورجيت (Flex Tourjet)", price: 51675, uom: "Roll", type: "product", attrs: "الوزن:610g, عرض الرولة:1.30m, الطول:50m" },
        { code: "FALX.1.1.1.16882", name: "فلكس تورجيت (Flex Tourjet)", price: 43725, uom: "Roll", type: "product", attrs: "الوزن:610g, عرض الرولة:1.10m, الطول:50m" },
        { code: "BANR.1.1.1.2.16642", name: "بنر طباعة لماع (Glossy Banner)", price: 23415, uom: "Roll", type: "product", attrs: "الوزن:280g, عرض الرولة:1.55m, الطول:50m, النوع:Glossy" },
        { code: "BANR.1.1.1.2.16636", name: "بنر طباعة لماع (Glossy Banner)", price: 15863, uom: "Roll", type: "product", attrs: "الوزن:280g, عرض الرولة:1.05m, الطول:50m, النوع:Glossy" },
        { code: "VINYL.1.3.2.3.17663", name: "لاصق روكو سترو مخرم (Vinyl Roco Perforated)", price: 39326, uom: "Roll", type: "product", attrs: "عرض الرولة:1.06m, الطول:50m, النوع:Perforated" },
        { code: "VINYL.1.3.2.2.17757", name: "لاصق روكو ابيض (Vinyl Roco White)", price: 35112, uom: "Roll", type: "product", attrs: "عرض الرولة:1.06m, الطول:50m, اللون:White" },
        { code: "Inc.2.2.17111", name: "حبر ارت جت (Art Jet Ink)", price: 30210, uom: "Piece", type: "product", attrs: "الماركة:Prem, اللون:Red, الحجم:5L" },
        { code: "Inc.2.2.17110", name: "حبر ارت جت (Art Jet Ink)", price: 30210, uom: "Piece", type: "product", attrs: "الماركة:Prem, اللون:Blue, الحجم:5L" },
        { code: "Inc.2.2.17112", name: "حبر ارت جت (Art Jet Ink)", price: 30210, uom: "Piece", type: "product", attrs: "الماركة:Prem, اللون:Yellow, الحجم:5L" },
        { code: "Inc.2.2.16118", name: "حبر ايكو سولفنت (Eco Solvent Ink)", price: 7950, uom: "Liter", type: "product", attrs: "الماركة:Eco Plus Art Jet, اللون:Red" },
        { code: "Inc.2.2.16119", name: "حبر ايكو سولفنت (Eco Solvent Ink)", price: 7950, uom: "Liter", type: "product", attrs: "الماركة:Eco Plus Art Jet, اللون:Blue" },
        { code: "Inc.2.2.16121", name: "حبر ايكو سولفنت (Eco Solvent Ink)", price: 7950, uom: "Liter", type: "product", attrs: "الماركة:Eco Plus Art Jet, اللون:Yellow" },
        { code: "BANR.1.1.2.1.16364", name: "بنر طباعة لماع (Glossy Banner)", price: 55120, uom: "Roll", type: "product", attrs: "الوزن:340g, عرض الرولة:3.20m, الطول:50m, النوع:Glossy" },
        { code: "BANR.1.1.1.2.16457", name: "بنر طباعة لماع (Glossy Banner)", price: 48336, uom: "Roll", type: "product", attrs: "الوزن:280g, عرض الرولة:3.20m, الطول:50m, النوع:Glossy" },
        { code: "VINYL.1.3.2.3.17665", name: "لاصق روكو سترو مخرم (Vinyl Roco Perforated)", price: 56392, uom: "Roll", type: "product", attrs: "عرض الرولة:1.52m, الطول:50m, النوع:Perforated" },
        
        // --- Added from imported CSV ---
        { code: "1768715677-1", name: "اعواد تنظيف رؤوس الطابعات ابيض كبير", price: 0, uom: "Piece", type: "product", attrs: "النوع:أعواد تنظيف, اللون:White, الحجم:Large" },
        { code: "1768715688-2", name: "ورنيش يوفي G6-UV", price: 0, uom: "Liter", type: "product", attrs: "النوع:Varnish, الموديل:G6-UV" },
        { code: "1768715695-3", name: "ورنيش يوفي Epson هارد UV", price: 0, uom: "Can", type: "product", attrs: "النوع:Varnish, الموديل:Epson Hard, الحجم:0.5L" },
        { code: "1768715702-4", name: "ورنيش يوفي 1600-3200 UV هارد", price: 0, uom: "Can", type: "product", attrs: "النوع:Varnish, الموديل:Hard, الحجم:0.50L" },
        { code: "1768715709-5", name: "بروميشن استاند عرض فيبر ابيض مقاس 85×183 سم", price: 0, uom: "Piece", type: "product", attrs: "النوع:Promotion Stand, اللون:White, المقاس:85x183cm, المادة:Fiber" },
        { code: "1768715719-6", name: "استاند اكس 160 ×60 سم انيق ذات جودة", price: 0, uom: "Piece", type: "product", attrs: "النوع:X-Stand, المقاس:160x60cm" },
        { code: "1768715726-7", name: "بروميشن استاند عرض فيبر رمادي مقاس 90×180 سم", price: 0, uom: "Piece", type: "product", attrs: "النوع:Promotion Stand, اللون:Grey, المقاس:90x180cm, المادة:Fiber" },
        { code: "1768715734-8", name: "ورق كليشات بلوتر 80 جرام مقاس 1.20 م", price: 0, uom: "Roll", type: "product", attrs: "الوزن:80g, العرض:1.20m, الطول:200m" },
        { code: "1768715742-9", name: "ورق كليشات بلوتر 220 جرام مقاس 1.20 م", price: 0, uom: "Roll", type: "product", attrs: "الوزن:220g, العرض:1.20m, الطول:100m" },
        { code: "1768715763-15", name: "ورق طباعة مائي فيلم مقلوب", price: 22960, uom: "Roll", type: "product", attrs: "النوع:Water Transfer Film" },
        { code: "1768715763-16", name: "ورق طباعة مائي فيلم مقلوب", price: 38266, uom: "Roll", type: "product", attrs: "النوع:Water Transfer Film" },
        { code: "1768715778-17", name: "ورق طباعة استاند ضد الماء", price: 25520, uom: "Roll", type: "product", attrs: "النوع:Stand Paper Waterproof, الطول:50m" },
        { code: "1768715778-19", name: "ورق طباعة استاند ضد الماء", price: 30290, uom: "Roll", type: "product", attrs: "النوع:Stand Paper Waterproof, الطول:50m" },
        { code: "1768715778-20", name: "ورق طباعة استاند ضد الماء", price: 36252, uom: "Roll", type: "product", attrs: "النوع:Stand Paper Waterproof, الطول:50m" },
        { code: "1768715786-21", name: "ورق برونز فويل ذهبي فلات نقل يوفي UV مقاس 0.32 م", price: 0, uom: "Roll", type: "product", attrs: "اللون:Gold, النوع:Bronze Foil, العرض:0.32m, الطول:120m" },
        { code: "1768715793-22", name: "ورق فيلم A فلات نقل يوفي شفاف A3", price: 0, uom: "Piece", type: "product", attrs: "المقاس:A3, النوع:Film A Transparent" },
        { code: "1768715807-23", name: "ورق ترانسفير DTF A3 فنايل – جاهز للطباعة", price: 0, uom: "Piece", type: "product", attrs: "المقاس:A3, النوع:DTF Transfer" },
        { code: "1768715815-24", name: "معالق لوحات عرض LED لايت بوكس مقاس 90×60", price: 0, uom: "Piece", type: "product", attrs: "المقاس:90x60cm, النوع:Hangers" },
        { code: "1768715823-25", name: "مشرط تقطيع بلاستيك", price: 0, uom: "Piece", type: "product", attrs: "النوع:Plastic Cutter" },
        { code: "1768715831-26", name: "مشرط بنر", price: 0, uom: "Piece", type: "product", attrs: "النوع:Banner Cutter" },
        { code: "1768715838-27", name: "محول كهرباء Rainproof ضد الماء 12 فولت", price: 2120, uom: "Piece", type: "product", attrs: "النوع:Power Supply Rainproof, الجهد:12V, التيار:58.3A" },
        { code: "1768715846-28", name: "محول كهرباء 12 فولت", price: 2120, uom: "Piece", type: "product", attrs: "النوع:Power Supply, الجهد:12V, التيار:20.83A" },
        { code: "1768715853-29", name: "ماكينة لف حروف S150", price: 0, uom: "Piece", type: "product", attrs: "الموديل:S150, النوع:Letter Bender" },
        { code: "1768715860-30", name: "ماكينة لحام حروف استيل 300 وات", price: 0, uom: "Piece", type: "product", attrs: "القدرة:300W, النوع:Steel Welder" },
        { code: "1768715890-31", name: "لوح فوركس ابيض 122×244 سم", price: 5300, uom: "Sheet", type: "product", attrs: "اللون:White, المقاس:122x244cm" },
        { code: "1768715890-32", name: "لوح فوركس ابيض 122×244 سم", price: 15370, uom: "Sheet", type: "product", attrs: "اللون:White, المقاس:122x244cm" },
        { code: "1768715890-33", name: "لوح فوركس ابيض 122×244 سم", price: 18550, uom: "Sheet", type: "product", attrs: "اللون:White, المقاس:122x244cm" },
        { code: "1768715890-34", name: "لوح فوركس ابيض 122×244 سم", price: 22790, uom: "Sheet", type: "product", attrs: "اللون:White, المقاس:122x244cm" },
        { code: "1768715890-35", name: "لوح فوركس ابيض 122×244 سم", price: 31800, uom: "Sheet", type: "product", attrs: "اللون:White, المقاس:122x244cm" },
        { code: "1768715890-37", name: "لوح فوركس ابيض 122×244 سم", price: 7155, uom: "Sheet", type: "product", attrs: "اللون:White, المقاس:122x244cm" },
        { code: "1768715890-38", name: "لوح فوركس ابيض 122×244 سم", price: 9275, uom: "Sheet", type: "product", attrs: "اللون:White, المقاس:122x244cm" },
        { code: "1768715890-39", name: "لوح فوركس ابيض 122×244 سم", price: 12190, uom: "Sheet", type: "product", attrs: "اللون:White, المقاس:122x244cm" },
        { code: "1768715890-40", name: "لوح فوركس ابيض 122×244 سم", price: 13780, uom: "Sheet", type: "product", attrs: "اللون:White, المقاس:122x244cm" },
        { code: "1768715903-41", name: "لمبات حروف كبسولة", price: 0, uom: "Packet", type: "product", attrs: "النوع:Capsule LED, الكمية:50pcs" },
        { code: "1768715910-43", name: "لاصق طباعة روكو شفاف مقاس 1.27م", price: 0, uom: "Roll", type: "product", attrs: "النوع:Roco Clear, العرض:1.27m, الطول:50m" },
        { code: "1768715927-44", name: "لاصق طباعه روكو ابيض", price: 35113, uom: "Roll", type: "product", attrs: "اللون:White, الطول:50m" },
        { code: "1768715927-46", name: "لاصق طباعه روكو ابيض", price: 42071, uom: "Roll", type: "product", attrs: "اللون:White, الطول:50m" },
        { code: "1768715927-47", name: "لاصق طباعه روكو ابيض", price: 50350, uom: "Roll", type: "product", attrs: "اللون:White, الطول:50m" },
        { code: "1768715927-48", name: "لاصق طباعه روكو ابيض", price: 69589, uom: "Roll", type: "product", attrs: "اللون:White, الطول:50m" },
        { code: "1768715937-49", name: "لاصق طباعة عاكس يتكسر Brkـ 1.24 م", price: 0, uom: "Roll", type: "product", attrs: "النوع:Reflective Brk, العرض:1.24m, الطول:45.7m" },
        { code: "1768715950-50", name: "لاصق طباعة شفاف Respect", price: 0, uom: "Roll", type: "product", attrs: "النوع:Transparent Respect, الطول:50m" },
        { code: "1768715950-51", name: "لاصق طباعة شفاف Respect", price: 67310, uom: "Roll", type: "product", attrs: "النوع:Transparent Respect, الطول:50m" },
        { code: "1768715950-52", name: "لاصق طباعة شفاف Respect", price: 80560, uom: "Roll", type: "product", attrs: "النوع:Transparent Respect, الطول:50m" },
        { code: "1768715958-53", name: "لاصق سلفنة ارضيات مقاس 1.52 م", price: 0, uom: "Roll", type: "product", attrs: "النوع:Floor Lamination, العرض:1.52m, الطول:50m" },
        { code: "1768715965-54", name: "كلورفورم غراء اكريلك", price: 0, uom: "Can", type: "product", attrs: "النوع:Chloroform Glue, الحجم:500ml" },
        { code: "1768715980-55", name: "قماش طباعة مائي ابيض 110 جرام", price: 14469, uom: "Roll", type: "product", attrs: "الوزن:110g, الطول:50m, النوع:Waterbased Fabric" },
        { code: "1768715980-57", name: "قماش طباعة مائي ابيض 110 جرام", price: 17278, uom: "Roll", type: "product", attrs: "الوزن:110g, الطول:50m, النوع:Waterbased Fabric" },
        { code: "1768715980-58", name: "قماش طباعة مائي ابيض 110 جرام", price: 21348, uom: "Roll", type: "product", attrs: "الوزن:110g, الطول:50m, النوع:Waterbased Fabric" },
        { code: "1768716002-59", name: "قماش طباعة حراري فبرك لماع", price: 15450, uom: "Roll", type: "product", attrs: "النوع:Fabric Glossy, الطول:100m" },
        { code: "1768716002-61", name: "قماش طباعة حراري فبرك لماع", price: 18513, uom: "Roll", type: "product", attrs: "النوع:Fabric Glossy, الطول:100m" },
        { code: "1768716002-62", name: "قماش طباعة حراري فبرك لماع", price: 22154, uom: "Roll", type: "product", attrs: "النوع:Fabric Glossy, الطول:100m" },
        { code: "1768716002-63", name: "قماش طباعة حراري فبرك لماع", price: 44308, uom: "Roll", type: "product", attrs: "النوع:Fabric Glossy, الطول:100m" },
        { code: "1768716020-65", name: "بنر طباعه مطفي 350 جرام", price: 20988, uom: "Roll", type: "product", attrs: "الوزن:350g, الطول:50m, النوع:Matte" },
        { code: "1768716020-67", name: "بنر طباعه مطفي 350 جرام", price: 30528, uom: "Roll", type: "product", attrs: "الوزن:350g, الطول:50m, النوع:Matte" },
        { code: "1768716020-68", name: "بنر طباعه مطفي 350 جرام", price: 41976, uom: "Roll", type: "product", attrs: "الوزن:350g, الطول:50m, النوع:Matte" },
        { code: "1768716020-69", name: "بنر طباعه مطفي 350 جرام", price: 61056, uom: "Roll", type: "product", attrs: "الوزن:350g, الطول:50m, النوع:Matte" },
        { code: "1768716032-70", name: "قماش طباعة حراري فبرك مطفي مقاس3.20م", price: 0, uom: "Roll", type: "product", attrs: "النوع:Fabric Matte, العرض:3.20m, الطول:50m" },
        { code: "1768716048-71", name: "قماش طباعة حراري فبرك مطفي", price: 30899, uom: "Roll", type: "product", attrs: "النوع:Fabric Matte, الطول:100m" },
        { code: "1768716048-73", name: "قماش طباعة حراري فبرك مطفي", price: 37021, uom: "Roll", type: "product", attrs: "النوع:Fabric Matte, الطول:100m" },
        { code: "1768716048-74", name: "قماش طباعة حراري فبرك مطفي", price: 44308, uom: "Roll", type: "product", attrs: "النوع:Fabric Matte, الطول:100m" },
        { code: "1768716055-75", name: "فلاش تنظيف Epson UV – هارد", price: 0, uom: "Can", type: "product", attrs: "النوع:Flush Epson UV, الحجم:500ml" },
        { code: "1768716063-76", name: "فلاش تنظيف فلورا", price: 0, uom: "Can", type: "product", attrs: "النوع:Flush Flora, الحجم:5L" },
        { code: "1768716071-77", name: "فلاش تنظيف ايكوسولفنت /ارت جت", price: 0, uom: "Liter", type: "product", attrs: "النوع:Flush EcoSolvent ArtJet" },
        { code: "1768716082-78", name: "فلاش تنظيف ابسون اخضر", price: 0, uom: "Can", type: "product", attrs: "النوع:Flush Epson Green" },
        { code: "1768716100-79", name: "حبر مائي سكاي كلر 5113 – EPS3200", price: 0, uom: "Liter", type: "product", attrs: "النوع:Waterbased Ink SkyColor" },
        { code: "1768716108-81", name: "فلاش تنظيف ارت جت C/S", price: 0, uom: "Can", type: "product", attrs: "النوع:Flush ArtJet C/S, الحجم:5L" },
        { code: "1768716118-82", name: "فاين مسح روؤس 9 انش", price: 0, uom: "Bag", type: "product", attrs: "النوع:Head Wipes, المقاس:9 inch" },
        { code: "1768716125-83", name: "غراء يوفي 100 جرام", price: 0, uom: "Can", type: "product", attrs: "النوع:UV Glue, الوزن:100g" },
        { code: "1768716134-84", name: "غراء فوركس", price: 0, uom: "Can", type: "product", attrs: "النوع:Forex Glue, الحجم:100ml" },
        { code: "1768716144-85", name: "غراء حروف سليكون", price: 0, uom: "Can", type: "product", attrs: "النوع:Silicon Letter Glue, الحجم:300ml" },
        { code: "1768716153-86", name: "غراء حروف", price: 0, uom: "Can", type: "product", attrs: "النوع:Letter Glue, الوزن:1kg" },
        { code: "1768716160-87", name: "غراء ابرو سوبر", price: 0, uom: "Can", type: "product", attrs: "النوع:Abro Super Glue, الوزن:50g" },
        { code: "1768716172-88", name: "بودره DTF سوداء", price: 0, uom: "kg", type: "product", attrs: "النوع:DTF Powder, اللون:Black" },
        { code: "1768716179-89", name: "بودره DTF ابيض", price: 0, uom: "kg", type: "product", attrs: "النوع:DTF Powder, اللون:White" },
        { code: "1768716187-90", name: "علاقي وسائل اسود", price: 0, uom: "Piece", type: "product", attrs: "النوع:Hanger Black, الطول:2.4m" },
        { code: "1768716197-91", name: "عصا مشرط بنر", price: 0, uom: "Piece", type: "product", attrs: "النوع:Banner Cutter Stick" },
        { code: "1768716205-92", name: "طابعة سكاي ارت UV-6090 يوفي اربعة رؤوس XP600", price: 0, uom: "Piece", type: "product", attrs: "الموديل:SkyArt UV-6090, الرؤوس:4x XP600" },
        { code: "1768716212-93", name: "طابعة ارت جت XP600 مقاس 1.8م راس واحد", price: 0, uom: "Piece", type: "product", attrs: "الموديل:ArtJet XP600, العرض:1.8m, الرؤوس:1" },
        { code: "1768716219-94", name: "طابعة سكاي كلر شبكة E3200- SC6160S ـ ايكو سلفنت 1.6م", price: 0, uom: "Piece", type: "product", attrs: "الموديل:SkyColor SC6160S, العرض:1.6m" },
        { code: "1768716227-95", name: "سخان طعج 1250 مم مع الزاوية", price: 0, uom: "Piece", type: "product", attrs: "النوع:Bending Heater, المقاس:1250mm" },
        { code: "1768716234-96", name: "طابعة بنر بلوبرنت K512i نظام 8 رؤوس", price: 0, uom: "Piece", type: "product", attrs: "الموديل:Blueprint K512i, الرؤوس:8" },
        { code: "1768716242-97", name: "طابعة سكاي ارت UV-3060 يوفي راسين XP600", price: 0, uom: "Piece", type: "product", attrs: "الموديل:SkyArt UV-3060, الرؤوس:2x XP600" },
        { code: "1768716250-98", name: "ماكينة سلفنة حراري A3 مع قاعدة الرول", price: 0, uom: "Piece", type: "product", attrs: "النوع:Laminator A3" },
        { code: "1768716258-99", name: "ماكينة سلفنة مقاس 1.60 م", price: 0, uom: "Piece", type: "product", attrs: "النوع:Laminator, العرض:1.60m" },
        { code: "1768716265-100", name: "ماكينة فيبر ليزر 30 وات 3030", price: 0, uom: "Piece", type: "product", attrs: "النوع:Fiber Laser, القدرة:30W, المقاس:3030" },
        { code: "1768716275-101", name: "ماكينه ليزر 150 وات HQ1313", price: 0, uom: "Piece", type: "product", attrs: "النوع:Laser HQ1313, القدرة:150W" },
        { code: "1768716283-102", name: "طابعة سكاي كلر مقاس 3.20م", price: 0, uom: "Piece", type: "product", attrs: "الموديل:SkyColor, العرض:3.20m" },
        { code: "1768716294-103", name: "طابعة DTF ورق فيلم فنايل 30 سم ارت جت I1600", price: 0, uom: "Piece", type: "product", attrs: "الموديل:DTF ArtJet I1600, العرض:30cm" },
        { code: "1768716354-104", name: "سير S2M460/B230-ملي15 ارت جت وكاله", price: 0, uom: "Piece", type: "product", attrs: "النوع:Belt S2M460" },
        { code: "1768716361-105", name: "سنة مشرط بنر", price: 0, uom: "Piece", type: "product", attrs: "النوع:Banner Cutter Blade" },
        { code: "1768716368-106", name: "سنة مشرط بلاستيك عادي", price: 0, uom: "Piece", type: "product", attrs: "النوع:Plastic Cutter Blade" },
        { code: "1768716375-107", name: "سخان طعج 600 مم مع الزاوية", price: 0, uom: "Piece", type: "product", attrs: "النوع:Bending Heater, المقاس:600mm" },
        { code: "1768716382-108", name: "سخان طعج 600 مم", price: 0, uom: "Piece", type: "product", attrs: "النوع:Bending Heater, المقاس:600mm" },
        { code: "1768716389-109", name: "سخان طعج 1250 مم", price: 0, uom: "Piece", type: "product", attrs: "النوع:Bending Heater, المقاس:1250mm" },
        { code: "1768716397-110", name: "سخان طعج 2500 مم", price: 0, uom: "Piece", type: "product", attrs: "النوع:Bending Heater, المقاس:2500mm" },
        { code: "1768716404-111", name: "ماكينة روتر 1325 CNC", price: 0, uom: "Piece", type: "product", attrs: "النوع:CNC Router 1325" },
        { code: "1768716411-112", name: "ماكينة ليزر 300 وات HQ1325", price: 0, uom: "Piece", type: "product", attrs: "النوع:Laser HQ1325, القدرة:300W" },
        { code: "1768716418-113", name: "ريشة شد مسامير -دريل", price: 0, uom: "Piece", type: "product", attrs: "النوع:Drill Bit" },
        { code: "1768716428-114", name: "ريشة روتر قص 4×2×6 اكرليك", price: 0, uom: "Piece", type: "product", attrs: "النوع:Router Bit Acrylic" },
        { code: "1768716435-115", name: "ورنيش يوفي Epson هارد برونز حراري", price: 0, uom: "Can", type: "product", attrs: "النوع:Varnish Epson Bronze, الحجم:0.5L" },
        { code: "1768716442-116", name: "دمبر DX5 ـ 2 ملي", price: 0, uom: "Piece", type: "product", attrs: "النوع:Damper DX5" },
        { code: "1768716449-117", name: "خازن SC2K(S)- UPS 3KVA", price: 0, uom: "Piece", type: "product", attrs: "النوع:UPS 3KVA" },
        { code: "1768716456-118", name: "حلق تخريم 10 ملي", price: 0, uom: "Bag", type: "product", attrs: "النوع:Eyelets, المقاس:10mm, الكمية:100pcs" },
        { code: "1768716464-119", name: "حلق تخريم 10 ملي مكبس شبه اتوماتيك", price: 0, uom: "Bag", type: "product", attrs: "النوع:Eyelets Semi-Auto, المقاس:10mm, الكمية:100pcs" },
        { code: "1768716482-120", name: "حبر يوفي G6-UV", price: 0, uom: "Liter", type: "product", attrs: "النوع:UV Ink G6" },
        { code: "1768716501-122", name: "حبر يوفي XP600-UV", price: 4240, uom: "Piece", type: "product", attrs: "النوع:UV Ink XP600" },
        { code: "1768716520-124", name: "حبر 1600-3200 UV يوفي هارد", price: 8480, uom: "Can", type: "product", attrs: "النوع:UV Ink Hard, الحجم:0.50L" },
        { code: "1768716538-126", name: "حبر ايكو سولفنت ايكو بلس – ارت جت", price: 7950, uom: "Liter", type: "product", attrs: "النوع:EcoSolvent Ink EcoPlus, الماركة:ArtJet" },
        { code: "1768716557-128", name: "حبر DTF بثبات لوني عالي علبه", price: 0, uom: "Can", type: "product", attrs: "النوع:DTF Ink, الحجم:0.50L" },
        { code: "1768716565-130", name: "حامل ديكور اكريلك شفاف 30×19 mm", price: 0, uom: "Piece", type: "product", attrs: "النوع:Decor Holder Acrylic, المقاس:30x19mm" },
        { code: "1768716578-131", name: "حامل ديكور اكريلك شفاف 13×19 mm", price: 0, uom: "Piece", type: "product", attrs: "النوع:Decor Holder Acrylic, المقاس:13x19mm" },
        { code: "1768716585-132", name: "حامل ديكور استيل اكريلك فضي 30×19 mm", price: 0, uom: "Piece", type: "product", attrs: "النوع:Decor Holder Steel, المقاس:30x19mm" },
        { code: "1768716594-133", name: "مسامير شد PATTA", price: 0, uom: "Packet", type: "product", attrs: "النوع:Screws PATTA" },
        { code: "1768716709-134", name: "بنر طباعه مطفي عبيكان 450 جرام", price: 32940, uom: "Roll", type: "product", attrs: "الوزن:450g, النوع:Matte Abikan, الطول:50m" },
        { code: "1768716709-136", name: "بنر طباعه مطفي عبيكان 450 جرام", price: 47912, uom: "Roll", type: "product", attrs: "الوزن:450g, النوع:Matte Abikan, الطول:50m" },
        { code: "1768716709-137", name: "بنر طباعه مطفي عبيكان 450 جرام", price: 65879, uom: "Roll", type: "product", attrs: "الوزن:450g, النوع:Matte Abikan, الطول:50m" },
        { code: "1768716709-138", name: "بنر طباعه مطفي عبيكان 450 جرام", price: 80852, uom: "Roll", type: "product", attrs: "الوزن:450g, النوع:Matte Abikan, الطول:50m" },
        { code: "1768716709-139", name: "بنر طباعه مطفي عبيكان 450 جرام", price: 95824, uom: "Roll", type: "product", attrs: "الوزن:450g, النوع:Matte Abikan, الطول:50m" },
        { code: "1768716726-140", name: "بنر طباعة مطفي 440 جرام سوبر", price: 22446, uom: "Roll", type: "product", attrs: "الوزن:440g, النوع:Matte Super, الطول:50m" },
        { code: "1768716726-142", name: "بنر طباعة مطفي 440 جرام سوبر", price: 32648, uom: "Roll", type: "product", attrs: "الوزن:440g, النوع:Matte Super, الطول:50m" },
        { code: "1768716726-143", name: "بنر طباعة مطفي 440 جرام سوبر", price: 44891, uom: "Roll", type: "product", attrs: "الوزن:440g, النوع:Matte Super, الطول:50m" },
        { code: "1768716726-144", name: "بنر طباعة مطفي 440 جرام سوبر", price: 65296, uom: "Roll", type: "product", attrs: "الوزن:440g, النوع:Matte Super, الطول:50m" },
        { code: "1768716794-145", name: "بنر طباعة لماع 340 جرام", price: 18948, uom: "Roll", type: "product", attrs: "الوزن:340g, النوع:Glossy, الطول:50m" },
        { code: "1768716794-147", name: "بنر طباعة لماع 340 جرام", price: 22393, uom: "Roll", type: "product", attrs: "الوزن:340g, النوع:Glossy, الطول:50m" },
        { code: "1768716794-148", name: "بنر طباعة لماع 340 جرام", price: 27560, uom: "Roll", type: "product", attrs: "الوزن:340g, النوع:Glossy, الطول:50m" },
        { code: "1768716794-149", name: "بنر طباعة لماع 340 جرام", price: 37895, uom: "Roll", type: "product", attrs: "الوزن:340g, النوع:Glossy, الطول:50m" },
        { code: "1768716794-150", name: "بنر طباعة لماع 340 جرام", price: 44785, uom: "Roll", type: "product", attrs: "الوزن:340g, النوع:Glossy, الطول:50m" },
        { code: "1768716794-151", name: "بنر طباعة لماع 340 جرام", price: 55120, uom: "Roll", type: "product", attrs: "الوزن:340g, النوع:Glossy, الطول:50m" },
        { code: "1768716802-152", name: "بطاقات بلاستيكية PVC قابلة للطباعة", price: 0, uom: "Piece", type: "product", attrs: "النوع:PVC Cards" },
        { code: "1768716811-153", name: "ورق فيلم A فلات نقل يوفي شفاف 0.30 م", price: 0, uom: "Roll", type: "product", attrs: "النوع:Film A Flat, العرض:0.30m, الطول:100m" },
        { code: "1768716818-154", name: "ورق كلك خلفيه رمادي مقاس0.92م", price: 0, uom: "Roll", type: "product", attrs: "النوع:Calc Paper Grey, العرض:0.92m, الطول:50m" },
        { code: "1768716933-160", name: "بنر عاكس 520 جرام", price: 69960, uom: "Roll", type: "product", attrs: "الوزن:520g, النوع:Reflective, الطول:50m" },
        { code: "1768716933-162", name: "بنر عاكس 520 جرام", price: 101760, uom: "Roll", type: "product", attrs: "الوزن:520g, النوع:Reflective, الطول:50m" },
        { code: "1768716933-163", name: "بنر عاكس 520 جرام", price: 139920, uom: "Roll", type: "product", attrs: "الوزن:520g, النوع:Reflective, الطول:50m" },
        { code: "1768716933-164", name: "بنر عاكس 520 جرام", price: 142856, uom: "Roll", type: "product", attrs: "الوزن:520g, النوع:Reflective, الطول:50m" },
        { code: "1768717250-166", name: "الواح اكريلك 122×244 سم عالي الجودة", price: 20670, uom: "Sheet", type: "product", attrs: "المقاس:122x244cm, النوع:High Quality" },
        { code: "1768717264-178", name: "اعواد تنظيف الرؤوس ابيض صغير", price: 0, uom: "Piece", type: "product", attrs: "النوع:Head Cleaning Swabs, اللون:White, الحجم:Small" },
        { code: "1768717276-179", name: "استيكر ملون مقاس 1.06 عالي الجوده", price: 0, uom: "Roll", type: "product", attrs: "العرض:1.06m" },
        { code: "1768717283-181", name: "استاند سحاب المنيوم فضي 200×85سم", price: 0, uom: "Piece", type: "product", attrs: "النوع:Rollup Aluminum Silver, المقاس:200x85cm" },
        { code: "1768717290-182", name: "استاند سحاب عريض المنيوم فضي 200×85سم", price: 0, uom: "Piece", type: "product", attrs: "النوع:Rollup Wide Aluminum Silver, المقاس:200x85cm" },
        { code: "1768717299-183", name: "استاند اكس 40 × 30سم اسود", price: 0, uom: "Piece", type: "product", attrs: "النوع:X-Stand Black, المقاس:40x30cm" },
        { code: "1768717313-184", name: "حبر ارت جت Stan", price: 5565, uom: "Liter", type: "product", attrs: "الماركة:ArtJet Standard" },
        { code: "1768717322-186", name: "استاند اكس 40 × 30سم ابيض", price: 0, uom: "Piece", type: "product", attrs: "النوع:X-Stand White, المقاس:40x30cm" },
        { code: "1768717337-187", name: "حبر ارت جت Prem", price: 6625, uom: "Liter", type: "product", attrs: "الماركة:ArtJet Premium" },
        { code: "1768717345-189", name: "استاند اكس 180 ×80 سم انيق ذات جودة", price: 0, uom: "Piece", type: "product", attrs: "النوع:X-Stand, المقاس:180x80cm" },
        { code: "1768717400-190", name: "لاصق طباعه روكو سترو مخرم", price: 39326, uom: "Roll", type: "product", attrs: "النوع:Perforated Roco, الطول:50m" },
        { code: "1768717400-192", name: "لاصق طباعه روكو سترو مخرم", price: 47117, uom: "Roll", type: "product", attrs: "النوع:Perforated Roco, الطول:50m" },
        { code: "1768717400-193", name: "لاصق طباعه روكو سترو مخرم", price: 50827, uom: "Roll", type: "product", attrs: "النوع:Perforated Roco, الطول:50m" },
        { code: "1768717400-194", name: "لاصق طباعه روكو سترو مخرم", price: 56392, uom: "Roll", type: "product", attrs: "النوع:Perforated Roco, الطول:50m" },
        { code: "1768717443-195", name: "ارت فلكس 610 جرام", price: 51013, uom: "Roll", type: "product", attrs: "الوزن:610g, الماركة:ArtFlex, الطول:50m" },
        { code: "1768717443-197", name: "ارت فلكس 610 جرام", price: 60288, uom: "Roll", type: "product", attrs: "الوزن:610g, الماركة:ArtFlex, الطول:50m" },
        { code: "1768717443-198", name: "ارت فلكس 610 جرام", price: 64925, uom: "Roll", type: "product", attrs: "الوزن:610g, الماركة:ArtFlex, الطول:50m" },
        { code: "1768717443-199", name: "ارت فلكس 610 جرام", price: 74200, uom: "Roll", type: "product", attrs: "الوزن:610g, الماركة:ArtFlex, الطول:50m" },
        { code: "1768717443-200", name: "ارت فلكس 610 جرام", price: 102025, uom: "Roll", type: "product", attrs: "الوزن:610g, الماركة:ArtFlex, الطول:50m" },
        { code: "1768717443-201", name: "ارت فلكس 610 جرام", price: 120575, uom: "Roll", type: "product", attrs: "الوزن:610g, الماركة:ArtFlex, الطول:50m" },
        { code: "1768717443-202", name: "ارت فلكس 610 جرام", price: 148400, uom: "Roll", type: "product", attrs: "الوزن:610g, الماركة:ArtFlex, الطول:50m" },
        { code: "1768717459-203", name: "لاصق طباعة ابيض Respect", price: 0, uom: "Roll", type: "product", attrs: "اللون:White, الماركة:Respect, الطول:50m" },
        { code: "1768717459-204", name: "لاصق طباعة ابيض Respect", price: 54060, uom: "Roll", type: "product", attrs: "اللون:White, الماركة:Respect, الطول:50m" },
        { code: "1768717459-205", name: "لاصق طباعة ابيض Respect", price: 67310, uom: "Roll", type: "product", attrs: "اللون:White, الماركة:Respect, الطول:50m" },
        { code: "1768717459-206", name: "لاصق طباعة ابيض Respect", price: 80560, uom: "Roll", type: "product", attrs: "اللون:White, الماركة:Respect, الطول:50m" },
        { code: "1768717479-207", name: "ورق طباعة صور ايكوسولفنت", price: 21068, uom: "Roll", type: "product", attrs: "النوع:Photo Paper EcoSolvent, الطول:50m" },
        { code: "1768717479-209", name: "ورق طباعة صور ايكوسولفنت", price: 42533, uom: "Roll", type: "product", attrs: "النوع:Photo Paper EcoSolvent, الطول:50m" },
        { code: "1768717479-210", name: "ورق طباعة صور ايكوسولفنت", price: 50483, uom: "Roll", type: "product", attrs: "النوع:Photo Paper EcoSolvent, الطول:50m" },
        { code: "1768717479-211", name: "ورق طباعة صور ايكوسولفنت", price: 60420, uom: "Roll", type: "product", attrs: "النوع:Photo Paper EcoSolvent, الطول:50m" },
        { code: "1768717525-217", name: "بنر مطفي 440 جرام", price: 23903, uom: "Roll", type: "product", attrs: "الوزن:440g, النوع:Matte, الطول:50m" },
        { code: "1768717525-219", name: "بنر مطفي 440 جرام", price: 28249, uom: "Roll", type: "product", attrs: "الوزن:440g, النوع:Matte, الطول:50m" },
        { code: "1768717525-220", name: "بنر مطفي 440 جرام", price: 34768, uom: "Roll", type: "product", attrs: "الوزن:440g, النوع:Matte, الطول:50m" },
        { code: "1768717525-221", name: "بنر مطفي 440 جرام", price: 47806, uom: "Roll", type: "product", attrs: "الوزن:440g, النوع:Matte, الطول:50m" },
        { code: "1768717525-222", name: "بنر مطفي 440 جرام", price: 58671, uom: "Roll", type: "product", attrs: "الوزن:440g, النوع:Matte, الطول:50m" },
        { code: "1768717525-223", name: "بنر مطفي 440 جرام", price: 69536, uom: "Roll", type: "product", attrs: "الوزن:440g, النوع:Matte, الطول:50m" },
        { code: "1768717629-230", name: "بنر طباعه مطفي 280 جرام", price: 16616, uom: "Roll", type: "product", attrs: "الوزن:280g, النوع:Matte, الطول:50m" },
        { code: "1768717629-231", name: "بنر طباعه مطفي 280 جرام", price: 15863, uom: "Roll", type: "product", attrs: "الوزن:280g, النوع:Matte, الطول:50m" },
        { code: "1768717629-233", name: "بنر طباعه مطفي 280 جرام", price: 23415, uom: "Roll", type: "product", attrs: "الوزن:280g, النوع:Matte, الطول:50m" },
        { code: "1768717629-234", name: "بنر طباعه مطفي 280 جرام", price: 28700, uom: "Roll", type: "product", attrs: "الوزن:280g, النوع:Matte, الطول:50m" },
        { code: "1768717629-235", name: "بنر طباعه مطفي 280 جرام", price: 33231, uom: "Roll", type: "product", attrs: "الوزن:280g, النوع:Matte, الطول:50m" },
        { code: "1768717629-236", name: "بنر طباعه مطفي 280 جرام", price: 48336, uom: "Roll", type: "product", attrs: "الوزن:280g, النوع:Matte, الطول:50m" },
        { code: "1768717680-237", name: "بنر طباعة لماع 280 جرام", price: 15863, uom: "Roll", type: "product", attrs: "الوزن:280g, النوع:Glossy, الطول:50m" },
        { code: "1768717680-239", name: "بنر طباعة لماع 280 جرام", price: 19637, uom: "Roll", type: "product", attrs: "الوزن:280g, النوع:Glossy, الطول:50m" },
        { code: "1768717680-240", name: "بنر طباعة لماع 280 جرام", price: 23415, uom: "Roll", type: "product", attrs: "الوزن:280g, النوع:Glossy, الطول:50m" },
        { code: "1768717680-241", name: "بنر طباعة لماع 280 جرام", price: 28700, uom: "Roll", type: "product", attrs: "الوزن:280g, النوع:Glossy, الطول:50m" },
        { code: "1768717680-242", name: "بنر طباعة لماع 280 جرام", price: 33231, uom: "Roll", type: "product", attrs: "الوزن:280g, النوع:Glossy, الطول:50m" },
        { code: "1768717680-243", name: "بنر طباعة لماع 280 جرام", price: 39273, uom: "Roll", type: "product", attrs: "الوزن:280g, النوع:Glossy, الطول:50m" },
        { code: "1768717680-244", name: "بنر طباعة لماع 280 جرام", price: 48336, uom: "Roll", type: "product", attrs: "الوزن:280g, النوع:Glossy, الطول:50m" },
        { code: "1768717949-253", name: "ورق فيلم B سلفنه مقاس 0.32 م", price: 0, uom: "Roll", type: "product", attrs: "النوع:Film B Lamination, العرض:0.32m" },
        { code: "1768717949-254", name: "ورق فيلم B سلفنه مقاس 0.32 م", price: 15900, uom: "Roll", type: "product", attrs: "النوع:Film B Lamination, العرض:0.32m" },
        { code: "1768717949-255", name: "ورق فيلم B سلفنه مقاس 0.32 م", price: 6360, uom: "Roll", type: "product", attrs: "النوع:Film B Lamination, العرض:0.32m" },
        { code: "1768717961-256", name: "ورق فنايل فيلم DTF", price: 0, uom: "Roll", type: "product", attrs: "النوع:DTF Film Vinyl, الطول:100m, العرض:30cm" },
        { code: "1768717961-257", name: "ورق فنايل فيلم DTF", price: 15900, uom: "Roll", type: "product", attrs: "النوع:DTF Film Vinyl, الطول:100m, العرض:30cm" },
        { code: "1768717961-258", name: "ورق فنايل فيلم DTF", price: 29150, uom: "Roll", type: "product", attrs: "النوع:DTF Film Vinyl, الطول:100m, العرض:30cm" },
        { code: "1768717999-266", name: "لاصق وجهين لبراويز الصور", price: 0, uom: "Roll", type: "product", attrs: "النوع:Double Sided Tape, الطول:50m" },
        { code: "1768717999-267", name: "لاصق وجهين لبراويز الصور", price: 11501, uom: "Roll", type: "product", attrs: "النوع:Double Sided Tape, الطول:50m" },
        { code: "1768717999-268", name: "لاصق وجهين لبراويز الصور", price: 23002, uom: "Roll", type: "product", attrs: "النوع:Double Sided Tape, الطول:50m" },
        { code: "1768718009-269", name: "فاين تغطيه رؤوس", price: 0, uom: "Bag", type: "product", attrs: "النوع:Head Cover Wipes, الكمية:50pcs" },
        { code: "1768718078-270", name: "بنر لماع بالمتر", price: 0, uom: "m", type: "product", attrs: "النوع:Glossy Banner" },
        { code: "1768718092-293", name: "حبر فلورا 35PL", price: 0, uom: "Can", type: "product", attrs: "الماركة:Flora 35PL, الحجم:5L" },
        { code: "1768718101-295", name: "مكبس فنايل 4X1", price: 0, uom: "Piece", type: "product", attrs: "النوع:Vinyl Press 4x1" },
        { code: "1768718110-296", name: "مكبس فنايل 38X38", price: 0, uom: "Piece", type: "product", attrs: "النوع:Vinyl Press, المقاس:38x38cm" },
        { code: "1768718194-305", name: "لي حبر 8 منافذ طابعه 4 × 2.2 ايكوسلفنت سكاي كلر وكاله", price: 0, uom: "m", type: "product", attrs: "النوع:Ink Tube 8-port" },
        { code: "1768718202-306", name: "كيبل داتا 31 خط A 40×32 DX5", price: 0, uom: "Piece", type: "product", attrs: "النوع:Data Cable 31pin, الموديل:DX5" },
        { code: "1768718210-307", name: "كيبل داتا 29 خط A 40×30 ـ XP600", price: 0, uom: "Piece", type: "product", attrs: "النوع:Data Cable 29pin, الموديل:XP600" },
        { code: "1768718217-308", name: "قماش طباعة ايكوسولفنت اعلام 1.52 م", price: 0, uom: "Roll", type: "product", attrs: "النوع:Flag Fabric EcoSolvent, العرض:1.52m" },
        { code: "1768718225-309", name: "سلك نحاس صافي 1 ملي بطول 25 متر عالي الجودة", price: 0, uom: "Roll", type: "product", attrs: "النوع:Copper Wire 1mm, الطول:25m" },
        { code: "1768718237-310", name: "سلفان / لكر", price: 0, uom: "Piece", type: "product", attrs: "النوع:Cellophane/Lacquer" },
        { code: "1768718244-311", name: "راس طابعه XP600", price: 0, uom: "Piece", type: "product", attrs: "الموديل:Printhead XP600" },
    ];

    return rawData.map(item => {
        let finalName = item.name;
        let finalAttrsString = item.attrs || "";

        // --- APPLY LOGIC: Forex Thickness ---
        if (finalName.includes("لوح فوركس ابيض 122×244 سم")) {
            const thickness = inferForexThickness(item.price);
            if (thickness) {
                // Check if thickness is already in attributes to avoid dups
                if (!finalAttrsString.includes("السمك")) {
                    finalAttrsString = finalAttrsString ? `${finalAttrsString}, السمك:${thickness}` : `السمك:${thickness}`;
                }
            }
        }

        // --- APPLY LOGIC: Vinyl Naming Standardization ---
        const standardization = standardizeVinylName(finalName, finalAttrsString);
        if (standardization.newName !== finalName) {
            finalName = standardization.newName;
            if (standardization.extraAttr) {
                 finalAttrsString = finalAttrsString ? `${finalAttrsString}, ${standardization.extraAttr}` : standardization.extraAttr;
            }
        }

        // Parse attributes string "Key:Val, Key2:Val2"
        const attributes = finalAttrsString ? finalAttrsString.split(',').map(s => {
            const parts = s.split(':');
            return {
                name: parts[0]?.trim() || 'Attr',
                value: parts[1]?.trim() || ''
            };
        }).filter(a => a.value) : [];

        // Calculate SQM Price if applicable (width is found)
        let pricePerSqm = 0;
        const width = extractWidth(attributes);
        if (width && item.price > 0 && (item.uom === 'm' || item.uom === 'sqm')) {
            pricePerSqm = Math.ceil(item.price / width);
        }

        return {
            id: item.code,
            rawInput: item.name, // Keep original name for reference
            templateName: finalName, // Use standardized name for Template grouping
            defaultCode: item.code,
            uom: item.uom,
            price: item.price,
            standard_price: calcCost(item.price),
            currency: 'YER',
            detailedType: item.type as any,
            tracking: determineTracking(item.code, item.type),
            attributes: attributes,
            price_per_sqm: pricePerSqm,
            variant_price_per_sqm: pricePerSqm,
            multiCurrencyPrices: [
                { currency: 'USD', price: calcUsdPrice(item.price) }
            ]
        };
    });
};
