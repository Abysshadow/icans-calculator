import { useState, useMemo, useCallback } from 'react';
import {
  TRUCKS,
  calcCostPerMile,
  calcTruckingCost,
  calcDumpsterPricing,
  calcSuggestedPerTon,
  calcSuggestedPerDay,
  getIncludedTonnage,
} from './pricing.js';

// ──────────────────────────────────────────────────────────────────────────
// Shared utilities for both UI variants
// ──────────────────────────────────────────────────────────────────────────

const T = {
  green: '#16a34a',
  greenDark: '#15803d',
  greenLight: '#22c55e',
  greenSoft: '#dcfce7',
  greenWash: '#f0fdf4',
  bg: '#f7faf9',
  card: '#ffffff',
  border: '#e5e7eb',
  borderHover: '#d1d5db',
  text: '#1f2937',
  textHeading: '#111827',
  textMuted: '#6b7280',
  textFaint: '#9ca3af',
  blue: '#3b82f6',
  blueSoft: '#eff6ff',
  amber: '#d97706',
  amberSoft: '#fffbeb',
  rose: '#dc2626',
  purple: '#7c3aed',
  purpleSoft: '#f5f3ff',
  // Soft pastel table tints (Variant A)
  baseTint: '#fef9c3',
  baseTintLight: '#fefce8',
  contTint: '#dbeafe',
  contTintLight: '#f0f7ff',
  flatTint: '#ede9fe',
};

const fmt$ = (v) =>
  v == null
    ? '—'
    : '$' + Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 });

const fmt$2 = (v, d = 2) => (v == null ? '—' : '$' + Number(v).toFixed(d));


// ──────────────────────────────────────────────────────────────────────────
// MAIN APP — owns all state + math, renders the calculator UI
// ──────────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState('pricing');

  // Pricing inputs — defaults from Ricardo's spec
  const [truckType, setTruckType] = useState('Truck & Trailer');
  const [pricingMode, setPricingMode] = useState('per-ton');
  const [landfillPerTon, setLandfillPerTon] = useState(45);
  const [landfillPerYard, setLandfillPerYard] = useState(0);
  const [roiBase, setRoiBase] = useState(7);
  const [roiCont, setRoiCont] = useState(8);
  const [avgMiles, setAvgMiles] = useState(20);
  const [diesel, setDiesel] = useState(5.5);
  const [waitMin, setWaitMin] = useState(30);
  const [resultMode, setResultMode] = useState('roi');

  const [dumpsters, setDumpsters] = useState([
    { size: 0, tons: 0, price: 0 },
    { size: 0, tons: 0, price: 0 },
    { size: 0, tons: 0, price: 0 },
  ]);

  // Maintenance state — independent per truck
  const [maintTruckType, setMaintTruckType] = useState('Truck & Trailer');
  const buildMaintItems = (key) => {
    const cfg = TRUCKS[key];
    return {
      truck: cfg.truck.map(([n, c, i]) => ({ name: n, cost: c, interval: i, enabled: true })),
      trailer: cfg.trailer.map(([n, c, i]) => ({ name: n, cost: c, interval: i, enabled: true })),
    };
  };
  const [maintAll, setMaintAll] = useState(() => ({
    'Truck & Trailer': buildMaintItems('Truck & Trailer'),
    'Mid Size Truck': buildMaintItems('Mid Size Truck'),
    'Large Truck': buildMaintItems('Large Truck'),
  }));
  const currentMaint = maintAll[maintTruckType];
  const updateMaintItem = (which, idx, field, val) => {
    setMaintAll((prev) => {
      const newItems = [...prev[maintTruckType][which]];
      newItems[idx] = {
        ...newItems[idx],
        [field]: field === 'enabled' ? val : Number(val) || 0,
      };
      return { ...prev, [maintTruckType]: { ...prev[maintTruckType], [which]: newItems } };
    });
  };
  const resetMaint = useCallback(() => {
    setMaintAll((prev) => ({ ...prev, [maintTruckType]: buildMaintItems(maintTruckType) }));
  }, [maintTruckType]);

  // Cost per mile from active truck's maintenance items (used by trucking calc)
  const cpmTruck = calcCostPerMile(maintAll[truckType].truck);
  const cpmTrailer = calcCostPerMile(maintAll[truckType].trailer);
  const cpmTotal = cpmTruck + cpmTrailer;

  const trucking = useMemo(
    () =>
      calcTruckingCost({
        truck: TRUCKS[truckType],
        costPerMile: cpmTotal,
        avgMiles: Number(avgMiles) || 0,
        dieselPrice: Number(diesel) || 0,
        waitMinutes: Number(waitMin) || 0,
      }),
    [truckType, cpmTotal, avgMiles, diesel, waitMin]
  );

  const results = useMemo(() => {
    return dumpsters
      .filter((d) => Number(d.size) > 0 && Number(d.price) > 0)
      .map((d) =>
        calcDumpsterPricing({
          dumpster: {
            size: Number(d.size),
            tons: Number(d.tons) || getIncludedTonnage(Number(d.size)),
            price: Number(d.price),
          },
          truckingCost: trucking.total,
          landfillPerTon: Number(landfillPerTon) || 0,
          landfillPerYard: Number(landfillPerYard) || 0,
          roiMonthsBase: Number(roiBase) || 1,
          roiMonthsCont: Number(roiCont) || 1,
          pricingMode,
        })
      );
  }, [dumpsters, trucking.total, landfillPerTon, landfillPerYard, roiBase, roiCont, pricingMode]);

  const sugTon = calcSuggestedPerTon(Number(landfillPerTon) || 0, pricingMode);
  const sugDay = calcSuggestedPerDay(dumpsters);

  // Maintenance-tab cost per mile (independent display)
  const maintCpmTruck = calcCostPerMile(currentMaint.truck);
  const maintCpmTrailer = calcCostPerMile(currentMaint.trailer);
  const maintCpmTotal = maintCpmTruck + maintCpmTrailer;

  const updateDumpster = (i, field, value) => {
    setDumpsters((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: Number(value) || 0 };
      return next;
    });
  };
  const addDumpster = () => setDumpsters([...dumpsters, { size: 0, tons: 0, price: 0 }]);
  const removeDumpster = (i) => setDumpsters(dumpsters.filter((_, j) => j !== i));
  const onSizeBlur = (i, size) => {
    const sz = Number(size);
    if (sz > 0 && (!dumpsters[i].tons || dumpsters[i].tons === 0)) {
      const suggested = getIncludedTonnage(sz);
      updateDumpster(i, 'tons', suggested);
    }
  };

  return (
    <CalculatorBody
      tab={tab} setTab={setTab}
      truckType={truckType} setTruckType={setTruckType}
      pricingMode={pricingMode} setPricingMode={setPricingMode}
      landfillPerTon={landfillPerTon} setLandfillPerTon={setLandfillPerTon}
      landfillPerYard={landfillPerYard} setLandfillPerYard={setLandfillPerYard}
      roiBase={roiBase} setRoiBase={setRoiBase}
      roiCont={roiCont} setRoiCont={setRoiCont}
      avgMiles={avgMiles} setAvgMiles={setAvgMiles}
      diesel={diesel} setDiesel={setDiesel}
      waitMin={waitMin} setWaitMin={setWaitMin}
      dumpsters={dumpsters} updateDumpster={updateDumpster}
      addDumpster={addDumpster} removeDumpster={removeDumpster}
      onSizeBlur={onSizeBlur}
      results={results} trucking={trucking}
      sugTon={sugTon} sugDay={sugDay}
      resultMode={resultMode} setResultMode={setResultMode}
      maintTruckType={maintTruckType} setMaintTruckType={setMaintTruckType}
      currentMaint={currentMaint} updateMaintItem={updateMaintItem}
      cpmTruck={maintCpmTruck} cpmTrailer={maintCpmTrailer}
      cpmTotal={maintCpmTotal} resetMaint={resetMaint}
    />
  );
}

// ──────────────────────────────────────────────────────────────────────────
// VARIANT A — Image-1 style (clean rounded cards, soft pastels, plain headers)
// This is the variant Ricardo approved on 2026-04-29.
// ──────────────────────────────────────────────────────────────────────────

function CalculatorBody(p) {
  return (
    <div style={{ minHeight: '100vh', background: T.bg, padding: '24px 16px' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <Tabs tab={p.tab} setTab={p.setTab} />

        {p.tab === 'pricing' && (
          <PricingTab {...p} />
        )}

        {p.tab === 'maintenance' && (
          <MaintenanceTab {...p} />
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// TABS — text-only with green underline
// ──────────────────────────────────────────────────────────────────────────
function Tabs({ tab, setTab }) {
  const items = [
    { key: 'pricing', label: 'Dumpster Pricing Calculator' },
    { key: 'maintenance', label: 'Maintenance Calculator' },
  ];
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        borderBottom: `1px solid ${T.border}`,
        marginBottom: 24,
      }}
    >
      {items.map((it) => (
        <button
          key={it.key}
          onClick={() => setTab(it.key)}
          style={{
            padding: '14px 20px',
            border: 'none',
            background: 'none',
            fontFamily: 'inherit',
            fontSize: 15,
            fontWeight: 500,
            color: tab === it.key ? T.green : T.textMuted,
            cursor: 'pointer',
            position: 'relative',
            transition: 'color 0.15s',
          }}
        >
          {it.label}
          {tab === it.key && (
            <div
              style={{
                position: 'absolute',
                bottom: -1,
                left: '20%',
                right: '20%',
                height: 3,
                background: T.green,
                borderRadius: '3px 3px 0 0',
              }}
            />
          )}
        </button>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// PRICING TAB
// ──────────────────────────────────────────────────────────────────────────
function PricingTab(p) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(380px, 460px) 1fr',
        gap: 20,
      }}
    >
      {/* LEFT: INPUT CARD */}
      <div
        style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 12,
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          alignSelf: 'start',
        }}
      >
        {/* Truck + Pricing Mode */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field label="Truck Type">
            <Select value={p.truckType} onChange={(v) => p.setTruckType(v)}>
              {Object.keys(TRUCKS).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Pricing Mode">
            <Select value={p.pricingMode} onChange={(v) => p.setPricingMode(v)}>
              <option value="per-ton">Per Ton Pricing</option>
              <option value="per-yard">Per Yard Pricing</option>
            </Select>
          </Field>
        </div>

        {/* Landfill + ROI section — header left-aligned, inputs in 3-col row */}
        <div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: T.textHeading,
              marginBottom: 10,
            }}
          >
            Desired Break Even ROI in Months
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 16,
            }}
          >
            <div>
              <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 6 }}>
                Landfill $/Ton
              </div>
              <NumInput value={p.landfillPerTon} onChange={p.setLandfillPerTon} />
            </div>
            <div>
              <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 6 }}>
                Residential
              </div>
              <NumInput value={p.roiBase} onChange={p.setRoiBase} />
            </div>
            <div>
              <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 6 }}>
                Contractor
              </div>
              <NumInput value={p.roiCont} onChange={p.setRoiCont} />
            </div>
          </div>
        </div>

        {p.pricingMode === 'per-yard' && (
          <Field label="Landfill $/Yard">
            <NumInput value={p.landfillPerYard} onChange={p.setLandfillPerYard} />
          </Field>
        )}

        {/* Trip Settings — kept visible per Ricardo's note */}
        <div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: T.textHeading,
              marginBottom: 10,
            }}
          >
            Trip Settings
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Field label="Avg Miles">
              <NumInput value={p.avgMiles} onChange={p.setAvgMiles} />
            </Field>
            <Field label="Diesel $/Gal">
              <NumInput value={p.diesel} onChange={p.setDiesel} step="0.01" />
            </Field>
            <Field label="Wait (min)">
              <NumInput value={p.waitMin} onChange={p.setWaitMin} />
            </Field>
          </div>
        </div>

        {/* Dumpster Sizes */}
        <div>
          <h3
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: T.textHeading,
              marginBottom: 4,
            }}
          >
            Dumpster Sizes
          </h3>
          <p
            style={{
              fontSize: 12,
              color: T.textMuted,
              marginBottom: 14,
              lineHeight: 1.5,
            }}
          >
            Enter in the dumpster size, the desired Included Tonnage and the total
            purchase price for an individual dumpster of that size
          </p>
          {p.dumpsters.map((d, i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1.4fr 36px',
                gap: 8,
                marginBottom: 8,
              }}
            >
              <NumInput
                value={d.size || ''}
                placeholder="Size"
                onChange={(v) => p.updateDumpster(i, 'size', v)}
                onBlur={() => p.onSizeBlur(i, d.size)}
              />
              <NumInput
                value={d.tons || ''}
                placeholder="Tons"
                onChange={(v) => p.updateDumpster(i, 'tons', v)}
                step="0.25"
              />
              <NumInput
                value={d.price || ''}
                placeholder="Price"
                onChange={(v) => p.updateDumpster(i, 'price', v)}
              />
              <button
                onClick={() => p.removeDumpster(i)}
                style={S.removeBtn}
                aria-label="Remove"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          ))}

          <button onClick={p.addDumpster} style={S.addBtn}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 5v14M5 12h14"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
            Add Dumpster Size
          </button>

          <button
            onClick={() => {
              const el = document.activeElement;
              if (el) el.blur();
            }}
            style={S.recalcBtn}
          >
            Recalculate
          </button>
        </div>
      </div>

      {/* RIGHT: RESULTS — wrapped in its own card to match reference */}
      <div
        style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 12,
          padding: 24,
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        }}
      >
        <ResultsPanel
          trucking={p.trucking}
          truckType={p.truckType}
          pricingMode={p.pricingMode}
          results={p.results}
          resultMode={p.resultMode}
          setResultMode={p.setResultMode}
          sugTon={p.sugTon}
          sugDay={p.sugDay}
          landfillPerTon={p.landfillPerTon}
        />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// RESULTS PANEL
// ──────────────────────────────────────────────────────────────────────────
function ResultsPanel({
  trucking,
  truckType,
  pricingMode,
  results,
  resultMode,
  setResultMode,
  sugTon,
  sugDay,
  landfillPerTon,
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h2
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: T.textHeading,
        }}
      >
        ROI + Pricing
      </h2>

      {/* Top stat strip — 3 columns matching reference */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 24,
          paddingBottom: 16,
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        <Stat label="Trucking Cost" value={fmt$(trucking.total)} />
        <Stat label="Selected Truck" value={truckType} />
        <Stat
          label="Pricing Mode"
          value={pricingMode === 'per-ton' ? 'Per Ton Pricing' : 'Per Yard Pricing'}
        />
      </div>

      {/* Result-mode tabs */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        {[
          { key: 'roi', label: 'ROI Pricing (Per Rental)' },
          { key: 'rec', label: 'Recommended Pricing (Rounded)' },
        ].map((m) => (
          <button
            key={m.key}
            onClick={() => setResultMode(m.key)}
            style={{
              padding: '12px 16px',
              border: 'none',
              background: 'none',
              fontFamily: 'inherit',
              fontSize: 14,
              fontWeight: 500,
              color: resultMode === m.key ? T.green : T.textMuted,
              cursor: 'pointer',
              position: 'relative',
              transition: 'color 0.15s',
            }}
          >
            {m.label}
            {resultMode === m.key && (
              <div
                style={{
                  position: 'absolute',
                  bottom: -1,
                  left: '20%',
                  right: '20%',
                  height: 3,
                  background: T.green,
                  borderRadius: '3px 3px 0 0',
                }}
              />
            )}
          </button>
        ))}
      </div>

      <div style={{ fontSize: 13, color: T.textMuted, lineHeight: 1.5 }}>
        {resultMode === 'roi'
          ? 'Matches spreadsheet logic (purchase price spread across expected rentals).'
          : 'Recommended Pricing = Total Cost + ROI Pricing, Rounded to Nearest 5.'}
      </div>

      {results.length === 0 ? (
        <EmptyState />
      ) : resultMode === 'roi' ? (
        <RoiTable results={results} />
      ) : (
        <RecTable results={results} />
      )}

      {/* Average Suggestions */}
      <div>
        <h3
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: T.textHeading,
            marginBottom: 12,
          }}
        >
          Average Suggestions
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <SuggestCard
            label="Suggest price per ton after allowed tons"
            value={pricingMode === 'per-ton' ? fmt$(sugTon) : 'N/A'}
          />
          <SuggestCard
            label="Suggest price per day after allowed days"
            value={fmt$(sugDay)}
          />
        </div>
        <div
          style={{
            fontSize: 12,
            color: T.textFaint,
            marginTop: 10,
          }}
        >
          Note: Admin/hidden assumptions are applied, but hidden from customers.
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        padding: 40,
        textAlign: 'center',
        background: T.bg,
        border: `1px dashed ${T.border}`,
        borderRadius: 12,
        color: T.textMuted,
        fontSize: 14,
      }}
    >
      Add dumpster sizes on the left to see pricing.
    </div>
  );
}

function RoiTable({ results }) {
  return (
    <div style={S.tableWrap}>
      <table style={S.table}>
        <thead>
          <tr>
            <th rowSpan={2} style={{ ...S.th, textAlign: 'left', verticalAlign: 'middle' }}>
              Size
            </th>
            <th
              colSpan={2}
              style={{
                ...S.thGroup,
                background: T.baseTint,
                color: T.textHeading,
              }}
            >
              ROI Base
            </th>
            <th
              colSpan={2}
              style={{
                ...S.thGroup,
                background: T.contTint,
                color: T.textHeading,
              }}
            >
              ROI Contractor
            </th>
          </tr>
          <tr>
            <th style={{ ...S.thSub, background: T.baseTintLight }}>3-day</th>
            <th style={{ ...S.thSub, background: T.baseTintLight }}>7-day</th>
            <th style={{ ...S.thSub, background: T.contTintLight }}>3-day</th>
            <th style={{ ...S.thSub, background: T.contTintLight }}>7-day</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r, i) => (
            <tr key={i}>
              <td style={S.tdSize}>{r.size}</td>
              <td style={{ ...S.td, background: T.baseTintLight }}>{fmt$(r.roi3Base)}</td>
              <td style={{ ...S.td, background: T.baseTintLight }}>{fmt$(r.roi7Base)}</td>
              <td style={{ ...S.td, background: T.contTintLight }}>{fmt$(r.roi3Cont)}</td>
              <td style={{ ...S.td, background: T.contTintLight }}>{fmt$(r.roi7Cont)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecTable({ results }) {
  return (
    <div style={S.tableWrap}>
      <table style={S.table}>
        <thead>
          <tr>
            <th rowSpan={2} style={{ ...S.th, textAlign: 'left', verticalAlign: 'middle' }}>
              Size
            </th>
            <th
              colSpan={2}
              style={{
                ...S.thGroup,
                background: T.baseTint,
                color: T.textHeading,
              }}
            >
              Base
            </th>
            <th
              colSpan={2}
              style={{
                ...S.thGroup,
                background: T.contTint,
                color: T.textHeading,
              }}
            >
              Contractor
            </th>
            <th
              rowSpan={2}
              style={{
                ...S.th,
                background: T.flatTint,
                color: T.purple,
                verticalAlign: 'middle',
              }}
            >
              Suggested Flat
              <div style={{ fontSize: 11, opacity: 0.75, fontWeight: 500, marginTop: 2 }}>
                (Contractor)
              </div>
            </th>
          </tr>
          <tr>
            <th style={{ ...S.thSub, background: T.baseTintLight }}>3-day</th>
            <th style={{ ...S.thSub, background: T.baseTintLight }}>7-day</th>
            <th style={{ ...S.thSub, background: T.contTintLight }}>3-day</th>
            <th style={{ ...S.thSub, background: T.contTintLight }}>7-day</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r, i) => (
            <tr key={i}>
              <td style={S.tdSize}>{r.size}</td>
              <td style={{ ...S.td, background: T.baseTintLight }}>{fmt$(r.rec3Base)}</td>
              <td style={{ ...S.td, background: T.baseTintLight }}>{fmt$(r.rec7Base)}</td>
              <td style={{ ...S.td, background: T.contTintLight }}>{fmt$(r.rec3Cont)}</td>
              <td style={{ ...S.td, background: T.contTintLight }}>{fmt$(r.rec7Cont)}</td>
              <td
                style={{
                  ...S.td,
                  background: T.flatTint,
                  fontWeight: 700,
                }}
              >
                {r.flatCont == null ? (
                  <span style={{ color: T.rose, fontSize: 12, fontWeight: 600 }}>
                    Not Rec.
                  </span>
                ) : (
                  fmt$(r.flatCont)
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// MAINTENANCE TAB
// ──────────────────────────────────────────────────────────────────────────
function MaintenanceTab({
  maintTruckType,
  setMaintTruckType,
  currentMaint,
  updateMaintItem,
  cpmTruck,
  cpmTrailer,
  cpmTotal,
  resetMaint,
}) {
  return (
    <div
      style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 12,
        padding: 24,
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 4,
          background: T.bg,
          padding: 4,
          borderRadius: 999,
          marginBottom: 24,
          width: 'fit-content',
          marginInline: 'auto',
        }}
      >
        {Object.keys(TRUCKS).map((t) => (
          <button
            key={t}
            onClick={() => setMaintTruckType(t)}
            style={{
              padding: '10px 28px',
              border: 'none',
              background: maintTruckType === t ? T.blue : 'transparent',
              fontFamily: 'inherit',
              fontSize: 14,
              fontWeight: 500,
              color: maintTruckType === t ? '#fff' : T.textMuted,
              borderRadius: 999,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: currentMaint.trailer.length > 0 ? '1fr 1fr' : '1fr',
          gap: 24,
        }}
      >
        <MaintTable
          items={currentMaint.truck}
          onChange={(i, f, v) => updateMaintItem('truck', i, f, v)}
        />
        {currentMaint.trailer.length > 0 && (
          <MaintTable
            items={currentMaint.trailer}
            onChange={(i, f, v) => updateMaintItem('trailer', i, f, v)}
          />
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: currentMaint.trailer.length > 0
            ? '1fr 1fr 1fr auto'
            : '1fr 1fr auto',
          gap: 12,
          marginTop: 24,
          alignItems: 'stretch',
        }}
      >
        <SummaryCard
          label="Truck Direct Operating Cost"
          value={fmt$2(cpmTruck)}
        />
        {currentMaint.trailer.length > 0 && (
          <SummaryCard
            label="Trailer Direct Operating Cost"
            value={fmt$2(cpmTrailer)}
          />
        )}
        <SummaryCard label="Cost Per Mile" value={fmt$2(cpmTotal)} />
        <button
          onClick={() => {
            const el = document.activeElement;
            if (el) el.blur();
          }}
          style={S.recalcBtnMaint}
        >
          Recalculate
        </button>
      </div>

      <div style={{ textAlign: 'right', marginTop: 12 }}>
        <button onClick={resetMaint} style={S.resetLink}>
          Reset Defaults
        </button>
      </div>
    </div>
  );
}

function MaintTable({ items, onChange }) {
  return (
    <div
      style={{
        border: `1px solid ${T.border}`,
        borderRadius: 12,
        overflow: 'hidden',
        background: T.card,
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: T.bg }}>
            <th style={S.thMaint}></th>
            <th style={{ ...S.thMaint, textAlign: 'left' }}>Maintenance</th>
            <th style={S.thMaint}>Cost ($)</th>
            <th style={S.thMaint}>Interval (mi)</th>
            <th style={S.thMaint}>Operating Cost ($)</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={i} style={{ borderTop: `1px solid ${T.border}` }}>
              <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                <Checkbox
                  checked={it.enabled}
                  onChange={(v) => onChange(i, 'enabled', v)}
                />
              </td>
              <td
                style={{
                  padding: '8px 12px',
                  color: it.enabled ? T.text : T.textFaint,
                }}
              >
                {it.name}
              </td>
              <td style={{ padding: '6px 8px' }}>
                <div style={{ position: 'relative' }}>
                  <span
                    style={{
                      position: 'absolute',
                      left: 8,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: T.textMuted,
                      fontSize: 13,
                      pointerEvents: 'none',
                    }}
                  >
                    $
                  </span>
                  <input
                    type="number"
                    value={it.cost}
                    onChange={(e) => onChange(i, 'cost', e.target.value)}
                    style={{
                      ...S.input,
                      padding: '6px 8px 6px 18px',
                      fontSize: 13,
                      textAlign: 'right',
                    }}
                  />
                </div>
              </td>
              <td style={{ padding: '6px 8px' }}>
                <input
                  type="number"
                  value={it.interval}
                  onChange={(e) => onChange(i, 'interval', e.target.value)}
                  style={{
                    ...S.input,
                    padding: '6px 8px',
                    fontSize: 13,
                    textAlign: 'right',
                  }}
                />
              </td>
              <td
                style={{
                  padding: '8px 12px',
                  textAlign: 'center',
                  fontSize: 13,
                  color: it.enabled && it.interval > 0 ? T.text : T.textFaint,
                  fontWeight: 500,
                }}
              >
                {it.enabled && it.interval > 0
                  ? '$' + (it.cost / it.interval).toFixed(2)
                  : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Checkbox({ checked, onChange }) {
  return (
    <label
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
      />
      <span
        style={{
          width: 20,
          height: 20,
          borderRadius: 5,
          background: checked ? T.green : T.card,
          border: `1.5px solid ${checked ? T.green : T.borderHover}`,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.15s',
        }}
      >
        {checked && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 13l4 4L19 7"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
    </label>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div
      style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 10,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: T.textMuted,
          fontWeight: 500,
          lineHeight: 1.3,
          flex: 1,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: T.textHeading }}>{value}</div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// SHARED UI BITS
// ──────────────────────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 13, color: T.textMuted }}>{label}</span>
      {children}
    </label>
  );
}

function NumInput({ value, onChange, placeholder, step, onBlur }) {
  const display = value === 0 || value === '0' || value == null ? '' : value;
  return (
    <input
      type="number"
      value={display}
      placeholder={placeholder ?? '0'}
      step={step}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      style={S.input}
    />
  );
}

function Select({ value, onChange, children }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        ...S.input,
        cursor: 'pointer',
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'><path d='M2 4l4 4 4-4' stroke='%236b7280' stroke-width='2' fill='none'/></svg>")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center',
        paddingRight: 32,
      }}
    >
      {children}
    </select>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: T.textHeading, lineHeight: 1.2 }}>
        {value}
      </div>
    </div>
  );
}

function SuggestCard({ label, value }) {
  return (
    <div
      style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 10,
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <div style={{ fontSize: 13, color: T.textMuted, lineHeight: 1.4, flex: 1 }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: T.textHeading }}>{value}</div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// STYLES
// ──────────────────────────────────────────────────────────────────────────
const S = {
  input: {
    width: '100%',
    padding: '10px 12px',
    border: `1px solid ${T.border}`,
    borderRadius: 8,
    fontSize: 14,
    fontFamily: 'inherit',
    color: T.text,
    background: T.card,
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  },
  removeBtn: {
    width: 36,
    height: 40,
    border: `1px solid ${T.greenSoft}`,
    borderRadius: 8,
    background: T.card,
    color: T.green,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s',
  },
  addBtn: {
    width: '100%',
    padding: '12px',
    border: `1.5px solid ${T.green}`,
    borderRadius: 8,
    background: T.card,
    color: T.green,
    fontFamily: 'inherit',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    transition: 'all 0.15s',
  },
  recalcBtn: {
    width: '100%',
    padding: '14px',
    border: 'none',
    borderRadius: 8,
    background: T.green,
    color: 'white',
    fontFamily: 'inherit',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 12,
    transition: 'all 0.15s',
  },
  tableWrap: {
    border: `1px solid ${T.border}`,
    borderRadius: 12,
    overflow: 'hidden',
    background: T.card,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 14,
  },
  th: {
    padding: '12px 16px',
    fontSize: 13,
    fontWeight: 600,
    color: T.textMuted,
    background: T.card,
    borderBottom: `1px solid ${T.border}`,
    textAlign: 'center',
  },
  thGroup: {
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 700,
    textAlign: 'center',
    borderBottom: `1px solid ${T.border}`,
  },
  thSub: {
    padding: '6px 16px',
    fontSize: 12,
    fontWeight: 500,
    color: T.textMuted,
    textAlign: 'center',
    borderBottom: `1px solid ${T.border}`,
  },
  thMaint: {
    padding: '10px 12px',
    fontSize: 12,
    fontWeight: 600,
    color: T.textMuted,
    textAlign: 'center',
  },
  td: {
    padding: '14px 16px',
    textAlign: 'center',
    fontWeight: 500,
    borderTop: `1px solid ${T.border}`,
    color: T.text,
  },
  tdSize: {
    padding: '14px 16px',
    fontWeight: 500,
    color: T.text,
    borderTop: `1px solid ${T.border}`,
    fontSize: 14,
    textAlign: 'center',
  },
  recalcBtnMaint: {
    padding: '14px 28px',
    border: 'none',
    borderRadius: 10,
    background: T.green,
    color: 'white',
    fontFamily: 'inherit',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  resetLink: {
    background: 'none',
    border: 'none',
    color: T.textMuted,
    fontFamily: 'inherit',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    textDecoration: 'underline',
    padding: '4px 8px',
  },
};
