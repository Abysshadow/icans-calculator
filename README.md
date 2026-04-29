# iCans Pricing Calculator — Variant A

A React-based pricing calculator for roll-off dumpster operators. Replicates the formulas in the source `Copy of Pricing Guide.xlsx` workbook exactly, then renders them in a clean web UI.

This is the **Variant A** standalone build — the design Ricardo approved on 2026-04-29. No variant switcher, no comparison mode, just the single approved UI.

## What it does

Two tabs:

1. **Dumpster Pricing Calculator** — Enter dumpster sizes, included tonnage, and purchase prices; pick a truck type, ROI break-even months, landfill rate, and trip settings. The right-hand panel shows raw ROI per rental and rounded recommended prices for both 3-day and 7-day rentals across base (residential) and contractor tiers, plus suggested flat-rate pricing.
2. **Maintenance Calculator** — Edit per-truck maintenance items (tires, brakes, oil, etc.), enable/disable line items, and see the resulting cost per mile that feeds into the trucking cost on the pricing tab.

## Pre-filled defaults (per Ricardo's spec)

- **Average miles:** 20
- **Diesel $/gal:** 5.50
- **Wait (min):** 30
- **Residential ROI months:** 7
- **Contractor ROI months:** 8
- **Landfill $/ton:** 45
- **Truck Type:** Truck & Trailer
- **Pricing Mode:** Per Ton Pricing

## Math verification

All formulas live in `src/pricing.js` and are mirrored cell-for-cell from the workbook. Run the verification harness any time:

```bash
node src/test-pricing.mjs
```

Verified ground-truth values (Mid Size Truck, 15 yd, $4000, 1 ton, $95/ton landfill, 7/8 ROI, 20 mi avg, $5 diesel, 30 min wait):

| Output | Engine | Excel |
|---|---|---|
| Trucking cost | $167 | $167 (M9) |
| ROI 3-day base | $102.04 | 102.04 (B9) |
| ROI 7-day base | $142.86 | 142.86 (D9) |
| Recommended 3-day base | $365 | 365 (Pricing!B10) |
| Recommended 7-day base | $405 | 405 (Pricing!C10) |
| Recommended 3-day contractor | $355 | 355 (Pricing!D10) |
| Recommended 7-day contractor | $390 | 390 (Pricing!E10) |
| Suggested $/ton overage | $125 | 125 (I10) |
| Suggested $/day extension | $25 | 25 (J10) |

## Files

```
icans-variant-a/
├── package.json
├── vite.config.js
├── vercel.json
├── index.html
├── README.md
├── DEPLOY.md
└── src/
    ├── main.jsx          # entry
    ├── App.jsx           # state + math + UI (single file)
    ├── pricing.js        # all math, pure functions
    └── test-pricing.mjs  # ground-truth verification
```

## Development

```bash
npm install
npm run dev
```

## Deploy to Vercel

See `DEPLOY.md`.
