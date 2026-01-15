
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
    if (code.startsWith('FALX') || code.startsWith('BANR')) return 'lot'; // Added logic for new items
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
        
        // --- NEW ITEMS FROM INVOICE ---
        // Converted USD Prices to YER (Price * 530)
        
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
        { code: "VINYL.1.3.2.3.17665", name: "لاصق روكو سترو مخرم (Vinyl Roco Perforated)", price: 56392, uom: "Roll", type: "product", attrs: "عرض الرولة:1.52m, الطول:50m, النوع:Perforated" }
    ];

    return rawData.map(item => {
        // Parse attributes string "Key:Val, Key2:Val2"
        const attributes = item.attrs ? item.attrs.split(',').map(s => {
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
            rawInput: item.name,
            templateName: item.name,
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
