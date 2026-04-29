// Verification harness — compare pricing.js outputs against Excel ground truth
// Run with: node src/test-pricing.mjs (rename .js -> .mjs for ESM in Node)

import {
  calcCostPerMile,
  calcTruckingCost,
  calcDumpsterPricing,
  calcSuggestedPerTon,
  calcSuggestedPerDay,
  TRUCKS,
} from './pricing.js';

const tt = TRUCKS['Truck & Trailer'];
const ttItems = [
  ...tt.truck.map(([n, c, i]) => ({ name: n, cost: c, interval: i, enabled: true })),
  ...tt.trailer.map(([n, c, i]) => ({ name: n, cost: c, interval: i, enabled: true })),
];

console.log('=== TRUCK & TRAILER ===');
const cpmTT = calcCostPerMile(ttItems);
console.log(`Cost/mile from maintenance: $${cpmTT.toFixed(4)}`);
console.log(`Excel says H30 = 0.3296 (truck 0.1818 + trailer 0.1478)`);

const trucking = calcTruckingCost({
  truck: tt,
  costPerMile: cpmTT,
  avgMiles: 20,
  dieselPrice: 5,
  waitMinutes: 30,
});
console.log(`Trucking cost: $${trucking.total} (Excel M3 = $132)`);
console.log(`  Drop-off:  $${trucking.dropOff.toFixed(4)} (Excel K3 = 60.1875)`);
console.log(`  Pick-up:   $${trucking.pickUp.toFixed(4)} (Excel L3 = 72.1875)`);

console.log('\n=== MID SIZE TRUCK, 15 yd, $4000, 1 ton, landfill $95/ton ===');
const mid = TRUCKS['Mid Size Truck'];
const midItems = [
  ...mid.truck.map(([n, c, i]) => ({ name: n, cost: c, interval: i, enabled: true })),
  ...mid.trailer.map(([n, c, i]) => ({ name: n, cost: c, interval: i, enabled: true })),
];
const cpmMid = calcCostPerMile(midItems);
const truckingMid = calcTruckingCost({
  truck: mid,
  costPerMile: cpmMid,
  avgMiles: 20,
  dieselPrice: 5,
  waitMinutes: 30,
});
console.log(`Trucking cost (Mid): $${truckingMid.total} (Excel M9 = $167)`);

const result15 = calcDumpsterPricing({
  dumpster: { size: 15, tons: 1, price: 4000 },
  truckingCost: truckingMid.total,
  landfillPerTon: 95,
  landfillPerYard: 0,
  roiMonthsBase: 7,
  roiMonthsCont: 8,
  pricingMode: 'per-ton',
});
console.log(`15yd ROI 3-base: $${result15.roi3Base.toFixed(2)} (Excel B9 = 102.04)`);
console.log(`15yd ROI 7-base: $${result15.roi7Base.toFixed(2)} (Excel D9 = 142.86)`);
console.log(`15yd Landfill/ton: $${result15.landfillCostPerTon} (Excel G9 = 95)`);
console.log(`15yd Landfill flat: $${result15.landfillFlat} (Excel I9 = 427.5)`);
console.log(`15yd Recommended Per-Ton 3-base: $${result15.rec3Base} (Excel Pricing!B10 = 365)`);
console.log(`15yd Recommended Per-Ton 7-base: $${result15.rec7Base} (Excel Pricing!C10 = 405)`);
console.log(`15yd Recommended Per-Ton 3-cont: $${result15.rec3Cont} (Excel Pricing!D10 = 355)`);
console.log(`15yd Recommended Per-Ton 7-cont: $${result15.rec7Cont} (Excel Pricing!E10 = 390)`);

console.log('\n=== Test suggested helpers ===');
console.log(`Suggested $/ton: $${calcSuggestedPerTon(95, 'per-ton')} (Excel I10 = 125)`);
console.log(`Suggested $/day: $${calcSuggestedPerDay([{ price: 4000 }, { price: 4500 }, { price: 5000 }])} (Excel J10 = 25)`);
