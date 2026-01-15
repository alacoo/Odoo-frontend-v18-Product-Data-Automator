

export interface UomCategory {
  id: string;
  name: string;
  units: string[];
}

export const UOM_DATA: UomCategory[] = [
  {
    id: "uom.product_uom_categ_unit",
    name: "الوحدة",
    units: ["Units", "درزينات"]
  },
  {
    id: "uom.product_uom_categ_kgm",
    name: "الوزن",
    units: ["g", "أونصة", "رطل", "كجم", "t"]
  },
  {
    id: "uom.uom_categ_wtime",
    name: "وقت العمل",
    units: ["ساعات", "الأيام"]
  },
  {
    id: "uom.uom_categ_length",
    name: "الطول / المسافة",
    units: ["مليمتر", "سم", "في", "قدم", "yd", "m", "كم", "ميل"]
  },
  {
    id: "uom.uom_categ_surface",
    name: "السطح",
    units: ["قدم مربع", "متر مربع"]
  },
  {
    id: "uom.product_uom_categ_vol",
    name: "الحجم",
    units: ["إنش مكعب", "أونصة (الولايات المتحدة الأمريكية)", "الكمية (الولايات المتحدة الأمريكية)", "L", "غالون (الولايات المحدة الأمريكية)", "قدم مكعب", "متر مكعب"]
  }
];
