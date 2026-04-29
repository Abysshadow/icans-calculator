// ─────────────────────────────────────────────────────────────────────────
// iCans Dumpster Pricing Engine
// ─────────────────────────────────────────────────────────────────────────
// Every formula in this file is mirrored cell-for-cell from the source
// "Copy of Pricing Guide.xlsx" workbook. Cell references are noted in
// comments so any number on screen can be traced back to a spreadsheet
// cell. Do NOT modify formulas without updating the comment trail.
//
// Sheets referenced:
//   Input!         — driver pay, insurance, payment, ROI months, landfill,
//                    miles, diesel, wait time
//   Calculations!  — per-truck trucking cost, ROI per dumpster, landfill
//                    cost (per ton / per yard / flat)
//   Pricing!       — final rounded recommended pricing (CEILING to $5)
//
// Truck rows in Input (matches Excel order Truck&Trailer / MidSize / Large):
//   Truck data:    H22 (truck $/mi), H29 (trailer $/mi), H30 (total $/mi)
//   Pay:           Calculations!P4 / P10 / P16 (30 / 35 / 40)
//   Insurance:     Input!E5 / E11 / E17 (1100 / 2000 / 2800)
//   Payment:       Input!E4 / E10 / E16 (1200 / 2100 / 3000)
//   Extra costs:   K9 has +1 (CDL drop), L9 has +4 (CDL pick) for Mid Size
//                  K15 has +4 (CDL drop), L15 has +4 (CDL pick) for Large
// ─────────────────────────────────────────────────────────────────────────

// Excel MROUND(value, multiple) — rounds value to nearest multiple
export const mround = (value, multiple) => Math.round(value / multiple) * multiple;

// Excel CEILING(value, significance) — rounds up to nearest multiple
export const ceiling = (value, significance) => Math.ceil(value / significance) * significance;

// Lookup table from Calculations!A20:D43 — formula B = MROUND(size*2.5*250/2000, 0.25)
// then column D = B + manual adjustment column C.
// This is the "included tonnage" used for flat-rate landfill billing.
// (matches Excel exactly — verified row-by-row)
export const TONNAGE_LOOKUP = {
  8: 2.5, 9: 2.75, 10: 3.0, 11: 3.25, 12: 3.5, 13: 4.0, 14: 4.0,
  15: 4.5, 16: 4.5, 17: 4.25, 18: 4.75, 19: 5.0, 20: 5.25,
  21: 5.5, 22: 5.5, 23: 5.5, 24: 5.5, 25: 5.75, 26: 5.75,
  27: 5.75, 28: 5.75, 29: 6.0, 30: 6.0, 40: 7.0,
};

// Get included tonnage for any size (interpolates for sizes outside the table)
export const getIncludedTonnage = (size) => {
  if (TONNAGE_LOOKUP[size] != null) return TONNAGE_LOOKUP[size];
  // Fallback: use raw formula with no manual tweak
  return mround((size * 2.5 * 250) / 2000, 0.25);
};

// ─────────────────────────────────────────────────────────────────────────
// TRUCK CONFIGURATIONS
// Maintenance items: [name, cost ($), interval (mi)]
// Direct from Input sheet columns G/H/I/J (T&T), L/M/N/O (Mid), Q/R/S/T (Large)
// ─────────────────────────────────────────────────────────────────────────
export const TRUCKS = {
  'Truck & Trailer': {
    label: 'Truck & Trailer',
    pay: 30,           // Calculations!P4 — non-CDL hourly
    cdl: false,
    insurance: 1100,   // Input!E5
    payment: 1200,     // Input!E4
    extraDrop: 0,      // K3 has no "+ N" tail
    extraPick: 0,      // L3 has no "+ N" tail
    truck: [
      ['Tires', 1200, 25000],
      ['Rear Brakes', 200, 30000],
      ['Front Brakes', 250, 50000],
      ['Oil Filter', 100, 10000],
      ['Air Filter', 40, 10000],
      ['Fuel Filter', 100, 15000],
      ['Oil', 100, 10000],
      ['Transmission', 5000, 250000],
      ['Engine', 10000, 500000],
      ['Undercarriage', 350, 50000],
      ['Hubs', 350, 150000],
      ['Brake Calipers', 350, 150000],
      ['Front Disc Rotors', 500, 80000],
      ['Pads', 140, 30000],
      ['Injectors', 600, 250000],
      ['Trans. Service', 608, 50000],
      ['Universal Joint', 25, 40000],
      ['Injectors (set 2)', 1000, 150000],
      ['Winch', 700, 100000],
    ],
    trailer: [
      ['Tires', 1200, 15000],
      ['Brakes', 480, 40000],
      ['Tarp', 200, 80000],
      ['Winch', 3500, 100000],
      ['Hydraulics', 1000, 120000],
      ['Tarp Arms', 1500, 150000],
    ],
  },
  'Mid Size Truck': {
    label: 'Mid Size Truck',
    pay: 35,            // Calculations!P10 — CDL hourly
    cdl: true,
    insurance: 2000,    // Input!E11
    payment: 2100,      // Input!E10
    extraDrop: 1,       // K9 ends in "+1"
    extraPick: 4,       // L9 ends in "+4"
    truck: [
      ['Tires', 2500, 22500],
      ['Rear Brakes', 500, 27500],
      ['Front Brakes', 375, 47500],
      ['Oil Filter', 65, 10000],
      ['Air Filter', 45, 8000],
      ['Fuel Filter', 70, 20000],
      ['Oil', 170, 12500],
      ['Transmission', 14500, 375000],
      ['Engine', 21000, 500000],
      ['Undercarriage', 350, 100000],
      ['Hubs', 350, 150000],
      ['Brake Calipers', 350, 150000],
      ['Front Disc Rotors', 500, 80000],
      ['Pads', 140, 30000],
      ['Injectors', 600, 250000],
      ['Trans. Service', 608, 50000],
      ['Universal Joint', 25, 40000],
      ['Injectors (set 2)', 1000, 150000],
      ['Winch', 700, 100000],
      ['Hydraulics', 2100, 250000],
      ['Tarp', 5100, 30000],
    ],
    trailer: [],
  },
  'Large Truck': {
    label: 'Large Truck',
    pay: 40,            // Calculations!P16 — CDL hourly
    cdl: true,
    insurance: 2800,    // Input!E17
    payment: 3000,      // Input!E16
    extraDrop: 4,       // K15 ends in "+4"
    extraPick: 4,       // L15 ends in "+4"
    truck: [
      ['Tires', 3800, 20000],
      ['Rear Brakes', 800, 25000],
      ['Front Brakes', 500, 45000],
      ['Oil Filter', 30, 10000],
      ['Air Filter', 50, 6000],
      ['Fuel Filter', 70, 25000],
      ['Oil', 240, 15000],
      ['Transmission', 24000, 500000],
      ['Engine', 32000, 500000],
      ['Undercarriage', 350, 150000],
      ['Hubs', 500, 150000],
      ['Brake Calipers', 500, 150000],
      ['Front Disc Rotors', 500, 80000],
      ['Pads', 140, 30000],
      ['Injectors', 600, 250000],
      ['Trans. Service', 608, 50000],
      ['Universal Joint', 25, 40000],
      ['Injectors (set 2)', 1000, 150000],
      ['Winch', 2500, 100000],
      ['Hydraulics', 4200, 100000],
      ['Tarp', 9000, 45000],
    ],
    trailer: [],
  },
};

// ─────────────────────────────────────────────────────────────────────────
// Cost-per-mile from maintenance items
// Source: Input!H3:H21 (truck) summed at H22, H23:H28 (trailer) summed at H29
// Formula per item: cost / interval. Sheet uses IFERROR — we just guard against
// divide-by-zero or disabled items.
// ─────────────────────────────────────────────────────────────────────────
export const calcCostPerMile = (items) =>
  items
    .filter((it) => it.enabled)
    .reduce((sum, it) => {
      const interval = Number(it.interval) || 0;
      const cost = Number(it.cost) || 0;
      return interval > 0 ? sum + cost / interval : sum;
    }, 0);

// ─────────────────────────────────────────────────────────────────────────
// Trucking Cost (Drop-Off + Pick-Up, MROUND to nearest $1)
//
// Excel for T&T (row 3):
//   K3 = (MROUND(P4 + B22*H30 + B22*B33, 1) + 5) + ((E4+E5)/160/2)
//   L3 = (MROUND(P4 + B22*H30 + B22*B33 + (P4*0.85)*A33, 1) + 5) + ((E4+E5)/160/2)
//   M3 = MROUND(K3 + L3, 1)
// where:
//   P4   = driver pay
//   B22  = average miles
//   H30  = total cost per mile (truck + trailer)
//   B33  = diesel / 9   (gallons per mile assumed at 9 mpg)
//   A33  = wait_minutes / 60 (hours)
//   E4   = truck payment, E5 = insurance — divided by 160 (work-hrs/mo) then by 2
//          (since this is per drop, half the fixed cost per leg)
//   *0.85 wait factor — driver paid at 85% rate while waiting at landfill
//
// Mid Size (row 9) adds +1 to drop, +4 to pick. Large (row 15) adds +4 / +4.
// ─────────────────────────────────────────────────────────────────────────
export const calcTruckingCost = ({
  truck,           // truck config from TRUCKS
  costPerMile,     // total $/mile from maintenance
  avgMiles,        // Input!B22
  dieselPrice,     // Input!C22 (per gallon)
  waitMinutes,     // Input!A22 (landfill wait time)
  mpg = 9,         // implicit constant in B33 = C22/9
  hoursPerMonth = 160,  // implicit constant in (E4+E5)/160/2
}) => {
  const dieselPerMile = dieselPrice / mpg;
  const waitHours = waitMinutes / 60;
  const fixedPerLeg = (truck.payment + truck.insurance) / hoursPerMonth / 2;

  // Drop-off leg
  const dropInner = truck.pay + avgMiles * costPerMile + avgMiles * dieselPerMile;
  const dropOff = mround(dropInner, 1) + 5 + fixedPerLeg + truck.extraDrop;

  // Pick-up leg (adds wait-time labor)
  const pickInner =
    truck.pay +
    avgMiles * costPerMile +
    avgMiles * dieselPerMile +
    truck.pay * 0.85 * waitHours;
  const pickUp = mround(pickInner, 1) + 5 + fixedPerLeg + truck.extraPick;

  return {
    dropOff,
    pickUp,
    total: mround(dropOff + pickUp, 1),
    fixedPerLeg,
    dieselPerMile,
  };
};

// ─────────────────────────────────────────────────────────────────────────
// Per-Dumpster Pricing
//
// ROI columns from Calculations!B–E (rows 3, 9, 15, etc.):
//   B = Input!C / (Input!D22 * 4 * 2 * 0.7)   — Base 3-day
//   C = Input!C / (Input!E22 * 4 * 2 * 0.7)   — Contractor 3-day
//   D = Input!C / (Input!D22 * 4)             — Base 7-day
//   E = Input!C / (Input!E22 * 4)             — Contractor 7-day
//
// Where:
//   D22 = base ROI months, E22 = contractor ROI months
//   * 4 = weeks per month (assumes 1 rental per week)
//   * 2 = additional turn factor for 3-day rentals (twice as many cycles)
//   * 0.7 = utilization factor (assumes 70% of weeks actually rented)
//
// Landfill cost (Calculations!G, H, I):
//   G = Input!D × tons_included          (per-ton mode)
//   H = size × Input!E                   (per-yard mode, requires E)
//   I = MIN(lookup_tons × Input!D, H || ∞) — flat-rate cap
//
// Final pricing (Pricing!B–G, CEILING to $5):
//   Per-Ton mode:  CEIL(ROI + Trucking + G, 5)
//   Per-Yard mode: CEIL(ROI + Trucking + H, 5)
//   Flat suggested: CEIL(ROI_7day + Trucking + I, 5)  capped at "Not Rec." > $600
// ─────────────────────────────────────────────────────────────────────────

export const calcDumpsterPricing = ({
  dumpster,         // { size, tons, price, pricePerYard? }
  truckingCost,     // total trucking $
  landfillPerTon,   // Input!D
  landfillPerYard,  // Input!E (optional; defaults to 0 = use per-ton)
  roiMonthsBase,    // Input!D22
  roiMonthsCont,    // Input!E22
  pricingMode,      // 'per-ton' | 'per-yard'
}) => {
  const { size, tons, price } = dumpster;
  const pricePerYard = dumpster.pricePerYard || landfillPerYard || 0;

  // ROI buckets (Calculations B–E)
  const roi3Base = price / (roiMonthsBase * 4 * 2 * 0.7);
  const roi3Cont = price / (roiMonthsCont * 4 * 2 * 0.7);
  const roi7Base = price / (roiMonthsBase * 4);
  const roi7Cont = price / (roiMonthsCont * 4);

  // Landfill costs
  const landfillCostPerTon = landfillPerTon * tons;
  const landfillCostPerYard = pricePerYard > 0 ? size * pricePerYard : 0;

  // Flat-rate landfill: lookup_tons × $/ton, capped by yard cost if defined
  const includedTons = getIncludedTonnage(size);
  const flatRateRaw = includedTons * landfillPerTon;
  const landfillFlat =
    landfillCostPerYard > 0 ? Math.min(flatRateRaw, landfillCostPerYard) : flatRateRaw;

  // Active landfill cost based on pricing mode
  const activeLandfill =
    pricingMode === 'per-yard' && landfillCostPerYard > 0
      ? landfillCostPerYard
      : landfillCostPerTon;

  // Recommended pricing (CEILING to $5)
  const rec3Base = ceiling(roi3Base + truckingCost + activeLandfill, 5);
  const rec7Base = ceiling(roi7Base + truckingCost + activeLandfill, 5);
  const rec3Cont = ceiling(roi3Cont + truckingCost + activeLandfill, 5);
  const rec7Cont = ceiling(roi7Cont + truckingCost + activeLandfill, 5);

  // Suggested flat-rate pricing (uses 7-day ROI, "Not Recommended" if > $600)
  const flatBaseRaw = ceiling(roi7Base + truckingCost + landfillFlat, 5);
  const flatContRaw = ceiling(roi7Cont + truckingCost + landfillFlat, 5);
  const flatBase = flatBaseRaw > 600 ? null : flatBaseRaw;
  const flatCont = flatContRaw > 600 ? null : flatContRaw;

  return {
    size,
    tons,
    price,
    includedTons,
    roi3Base, roi7Base, roi3Cont, roi7Cont,
    landfillCostPerTon,
    landfillCostPerYard,
    landfillFlat,
    activeLandfill,
    truckingCost,
    rec3Base, rec7Base, rec3Cont, rec7Cont,
    flatBase, flatCont,
    flatBaseRaw, flatContRaw,
  };
};

// ─────────────────────────────────────────────────────────────────────────
// Average Suggestions
// I4 = CEILING(D3 * 1.3, 5)                — overage rate per ton (Per Ton mode only)
// J4 = CEILING(AVERAGE(prices)/212.917, 5) — daily extension fee
//   212.917 = 365 days × 7/12 utilization assumption (rough divisor used by sheet)
// ─────────────────────────────────────────────────────────────────────────
export const calcSuggestedPerTon = (landfillPerTon, pricingMode) =>
  pricingMode === 'per-ton' ? ceiling(landfillPerTon * 1.3, 5) : 0;

export const calcSuggestedPerDay = (dumpsters) => {
  const valid = dumpsters.filter((d) => Number(d.price) > 0);
  if (valid.length === 0) return 0;
  const avg = valid.reduce((s, d) => s + Number(d.price), 0) / valid.length;
  return ceiling(avg / 212.917, 5);
};
