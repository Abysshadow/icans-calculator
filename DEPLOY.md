# Deployment Instructions

## 1. Push to a new GitHub repo

In a terminal, from inside this folder:

```bash
git init
git add .
git commit -m "iCans pricing calculator — variant A"
git branch -M main
```

Then on GitHub: click **New repository**, name it `icans-variant-a`,
**don't** check "Initialize with README" (this folder already has one),
click **Create**. Copy the two-line setup GitHub shows under
"…or push an existing repository":

```bash
git remote add origin https://github.com/YOUR_USERNAME/icans-variant-a.git
git push -u origin main
```

## 2. Deploy to Vercel

1. Go to vercel.com → **Add New** → **Project**
2. Find `icans-variant-a` in the repo list, click **Import**
3. Vercel auto-detects Vite. **Do not change any settings.**
4. Click **Deploy**. Live in ~30 seconds.

## 3. Updating later

When Ricardo asks for tweaks:

```bash
git add .
git commit -m "describe the change"
git push
```

Vercel auto-redeploys within a minute.

## Folder structure (do not restructure)

```
icans-variant-a/
├── .gitignore
├── README.md
├── DEPLOY.md
├── index.html              ← must be at root
├── package.json            ← must be at root
├── vite.config.js          ← must be at root
├── vercel.json             ← must be at root
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── pricing.js
    └── test-pricing.mjs
```

The #1 cause of Vercel deploy failures is `package.json` not at the
repo root. This zip has it in the right place — don't restructure.

## Sanity check after deploy

Open the live URL. You should see:

- Two tabs at top: "Dumpster Pricing Calculator" / "Maintenance Calculator"
- Pricing inputs pre-filled with: Landfill $/Ton 45, Residential 7, Contractor 8, Avg Miles 20, Diesel 5.5, Wait 30
- Three empty dumpster rows ready to fill
- Right side: ROI + Pricing summary (showing Trucking Cost based on the defaults)
- Maintenance tab populated with the truck's default service items, "Operating Cost ($)" rounded to cents

## Local development

```bash
npm install
npm run dev
```

## Verifying the math

Run any time:

```bash
node src/test-pricing.mjs
```

It compares engine output to known Excel values from
`Copy of Pricing Guide.xlsx`. Every line should report a match.
