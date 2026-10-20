# LayoutLite UI Cleanup — Phase U1: Comprehensive Audit & Mobile-First Plan

**Product Name**: LayoutLite  
**Audit Phase**: Phase U1 (Audit Only)  
**Execution Date**: October 19, 2026  
**Status**: READ-ONLY AUDIT COMPLETE — AWAITING USER APPROVAL  
**Platform Priority**: Mobile-First (320px, 360px, 390px, 430px viewports) with desktop support retained  
**Applicable Discovered Skills**: `better-ui`, `better-layout`, `better-colors`, `better-typography`, `better-accessibility`, `better-writing`

---

## 1. Executive Summary

This audit evaluates the application prior to initiating the mobile-first UI cleanup. The product is officially renamed **LayoutLite**.

The core pipeline is fully functioning: photo upload with EXIF normalization, 2D aspect-ratio-locked cropping, local AI background removal with foreground decontamination, 2D solid background compositing, physical millimeter-to-point dimensioning, A4 tiling with fit detection, and 300 DPI client-side PDF export.

However, the user interface was designed with a desktop-centric mental model that exhibits significant friction on mobile viewports:
1. **Vertical Action Occlusion**: Primary calls-to-action (CTAs) are positioned at the bottom of long, vertically stacked cards, often pushed 200–350px below the fold on mobile screens (320–390px width).
2. **Excessive Visual Weight**: 3- to 4-layer nested card borders, redundant status pills, and repeated privacy statements clutter the interface.
3. **Decorative Incoherence**: Platform emojis (`💡`, `📷`, `🎨`, `🔍`, `⚠️`, `✓`, `✗`, `ℹ`) render inconsistently across mobile operating systems.
4. **Performance Overhead**: Synchronous bundling of `pdf-lib` yields a 701 kB chunk warning on initial page load.
5. **Legacy Branding**: References to `Passport Photo Studio` remain across user-facing HTML headers, metadata, footers, and PDF document metadata.

---

## 2. Branding Audit & Classification

Every occurrence of the legacy name `Passport Photo Studio` across the repository has been inventoried and classified into one of three strict categories:
- **[Must rename to LayoutLite]**: User-facing titles, labels, metadata, alt text, or exported file tags.
- **[Internal identifier that can safely remain temporarily]**: Internal module paths, package names, workspace configurations, and code comments that do not face end users and whose modification poses workspace regression risk.
- **[Requires a deliberate migration decision]**: Documentation files, architectural specs, and references to historical sample PDFs.

### 2.1 Inventory Table

| Occurrence Location | Current Content / String | Classification | Recommended Action |
| :--- | :--- | :--- | :--- |
| `apps/web/index.html:10` | `<title>Passport Photo Studio</title>` | **Must rename to LayoutLite** | Change to `<title>LayoutLite — Photo Print & A4 Tiling</title>` |
| `apps/web/index.html:8` | `content="Passport Photo Studio - Prepare, crop..."` | **Must rename to LayoutLite** | Change to `content="LayoutLite — Prepare, crop, and tile portrait photos onto an A4 sheet for physical printing."` |
| `apps/web/src/components/Header.tsx:11` | `Passport Photo Studio` | **Must rename to LayoutLite** | Change visible header brand text to `LayoutLite` |
| `apps/web/src/components/Footer.tsx:8` | `Passport Photo Studio — Designed for practical...` | **Must rename to LayoutLite** | Change to `LayoutLite — Simple, accurate portrait photo tiling and printing.` |
| `apps/web/src/services/pdfGenerator.ts:175` | `pdfDoc.setSubject('Prepared with Passport Photo Studio...')` | **Must rename to LayoutLite** | Change PDF document Subject metadata to mention `LayoutLite` |
| `apps/web/src/services/pdfGenerator.ts:176` | `pdfDoc.setProducer('Passport Photo Studio (pdf-lib)')` | **Must rename to LayoutLite** | Change PDF Producer metadata to `LayoutLite (pdf-lib)` |
| `apps/web/src/components/CroppedResultCard.tsx:64` | `alt="Final cropped passport portrait preview"` | **Must rename to LayoutLite** | Change image alt text to `alt="Final cropped portrait preview"` |
| `apps/web/src/components/UploadDropzone.tsx:67` | `id="passport-photo-upload-input"` | **Must rename to LayoutLite** | Change DOM id to `id="layoutlite-photo-upload-input"` |
| `apps/web/src/utils/*.ts` (headers) | `* ... utility for Passport Photo Studio.` | **Internal identifier (safely remain)** | Retain or quietly update in passing; zero user impact |
| `root package.json:2` | `"name": "passport-photo-studio"` | **Internal identifier (safely remain)** | Retain to prevent breaking workspace commands |
| `packages/shared/package.json:2` | `"name": "@passport-photo/shared"` | **Internal identifier (safely remain)** | Retain npm scope to avoid breaking monorepo imports |
| `apps/web/package.json:2` | `"name": "@passport-photo/web"` | **Internal identifier (safely remain)** | Retain npm scope to avoid breaking monorepo imports |
| `services/background-removal/app/main.py:14,21` | `logger = logging.getLogger("passport_photo_studio...")`, FastAPI `title` | **Internal identifier (safely remain)** | Keep FastAPI internal service identifier intact |
| `AGENTS.md:1,3,9` | Project overview & agent instructions | **Deliberate migration decision** | Update product name in root guidance without altering engineering constraints |
| `docs/architecture.md`, `roadmap.md`, `ui-spec.md` | Historical architecture & phase specifications | **Deliberate migration decision** | Keep historical specs as project records; note rename in UI spec |
| References to `passport size sample.pdf` | Visual reference document citation | **Deliberate migration decision** | Retain filename reference as the canonical historical layout benchmark |

---

## 3. UI Clutter Audit (Workflow Step by Step)

### Step 1: Upload ([`UploadDropzone.tsx`](file:///D:/Photo-print/apps/web/src/components/UploadDropzone.tsx) & [`WorkflowExplainer.tsx`](file:///D:/Photo-print/apps/web/src/components/WorkflowExplainer.tsx))
- **Repeated Claims**: "All processing occurs locally on your device with zero cloud storage" is stated in the page subhead, header badge, and dropzone footer.
- **Unnecessary Emojis**: `💡 Photo Tips`, `📷 Clear Front-Facing Shot`, `💡 Even Lighting`, `🎨 Clean Background` in `WorkflowExplainer.tsx`.
- **Excessive Padding/Whitespace**: The upload area has 32px vertical margins on mobile. The dropzone itself has `min-h-[190px]` plus an instructional tips card below it.
- **Compacting Opportunity**: Make photo tips collapsed by default in an accordion on mobile or render as a single-line hint. Keep dropzone primary and centered.
- **Must Remain Visible**: Accepted file types (JPG, PNG, WebP), 25 MB max limit indicator, clear error alert with dismiss button, and the browse button.

### Step 2: Crop & Position ([`CropEditor.tsx`](file:///D:/Photo-print/apps/web/src/components/CropEditor.tsx))
- **Excessive Height / Occlusion**: The stage sets `h-[320px] sm:h-[420px]`. The header bar, aspect tag, zoom toolbar, rotate button, and bottom action bar stack to ~680px height. On a 360px screen, the user must scroll 250px down to see the primary "Apply Crop & Save" button.
- **Unnecessary Emojis / Decorative Text**: `🔍 Zoom:` label prefix; `→` arrow in button label.
- **Action Duplication**: "Cancel & Change Photo" competes with the stepper's Step 1 dot and the dropzone reset.
- **Compacting Opportunity**: Reduce stage height on mobile (`max-h-[42vh]` or `260px`). Combine zoom slider, zoom buttons, and rotate into a single compact horizontal toolbar. Dock the primary "Apply Crop" action in a persistent/sticky bottom bar.
- **Must Remain Visible**: 2D crop box with rule-of-thirds grid, 8 resize handles, zoom slider with +/- buttons, 90° rotate button, aspect ratio indicator ($W \times H\text{ mm}$), and error banner.

### Step 3: Optional Background Removal ([`BackgroundStep.tsx`](file:///D:/Photo-print/apps/web/src/components/BackgroundStep.tsx))
- **Clutter & Redundant Information**:
  - A static "How It Works" card details the `u2netp` AI model and local execution when idle. This is technical clutter for non-technical family users.
  - Service status badge ("AI Service Ready") appears in the header and again in an offline card.
- **Repeated Actions**: "Adjust Crop", "Change Photo", and "Revert to Original" compete across separate rows.
- **Compacting Opportunity**: Remove the static "How It Works" bullet card. Display service status only when an issue occurs (e.g., offline or slow). Provide a clean two-action choice: **Primary: "Remove Background"** vs **Secondary: "Skip (Keep Original)"**.
- **Must Remain Visible**: Cutout preview with checkerboard transparency, progress spinner with Cancel during AI inference, actionable error alert with retry button, and clear "Skip / Keep Original" button.

### Step 4: Background Color Selection ([`ColorStep.tsx`](file:///D:/Photo-print/apps/web/src/components/ColorStep.tsx))
- **Excessive Text when Skipped**: When background removal was skipped in Step 3, Step 4 displays an entire card explaining why color replacement is disabled, along with a large button to return to Step 3.
- **Cramped Controls on Mobile**: The 5 preset color swatches are rendered in a 2-column grid with 52px height each. At 320px width, preset names like "Off-White" or "Light Blue" crowd their hex codes.
- **Compacting Opportunity**: Render swatches as compact visual circles or a 3-column pill grid. If background removal was skipped, auto-advance or provide a compact 1-line note with a quick "Enable Background Removal" link.
- **Must Remain Visible**: Live composited photo preview, active color indicator (swatch bubble + name), preset swatches (White, Off-White, Light Blue, Light Gray, Dark Slate), custom hex input, and native color picker.

### Step 5: Physical Photo Dimensions ([`DimensionsStep.tsx`](file:///D:/Photo-print/apps/web/src/components/DimensionsStep.tsx))
- **Redundant Explanatory Cards**: A permanent "Provisional Dimensions Notice" card ("Dimensions serve as starting guidelines...") consumes vertical space directly below the preset buttons.
- **Awkward Wrapping**: Quick preset buttons ($35 \times 45\text{ mm}$, $2 \times 2\text{ in}$, $30 \times 40\text{ mm}$, $40 \times 50\text{ mm}$) render in a 2-column grid with 2 lines of description text each, wrapping awkwardly at 320px–360px.
- **Compacting Opportunity**: Remove the "Provisional Dimensions Notice" card. Simplify quick preset buttons into compact single-line chips (e.g. `35 × 45 mm`, `2 × 2 in`).
- **Must Remain Visible**: Width and height numeric inputs with unit suffix, unit toggle (mm/in), allowed bounds text (15 mm to 150 mm), aspect ratio readout, validation error messages, and live preview.

### Step 6: A4 Sheet Layout ([`SheetLayoutStep.tsx`](file:///D:/Photo-print/apps/web/src/components/SheetLayoutStep.tsx) & [`A4SheetPreview.tsx`](file:///D:/Photo-print/apps/web/src/components/A4SheetPreview.tsx))
- **Layout Inversion on Mobile**: Form controls (Mode, Stepper, Presets, Warning, Advanced Margins, Summary) stack above the A4 preview. Users must scroll through ~600px of forms before seeing the interactive sheet preview canvas.
- **Excessive Preset Pills**: 5 preset buttons (`6 Row`, `6 Grid`, `8 Grid`, `12 Grid`, `Max Fit`) wrap across 3 rows on 320px screens.
- **Compacting Opportunity**: Place a compact preview or segmented view toggle near the top. Group arrangement mode and copy counter into a single compact card. Keep margins and cut guides collapsed in the optional drawer.
- **Must Remain Visible**: Arrangement mode toggle (Single Row vs Balanced Grid), copy count input with +/- stepper buttons, capacity warning/feedback banner with auto-fix button, optional cut-guide checkbox, and interactive SVG A4 sheet preview with millimeter coordinates.

### Step 7: Export & Print ([`ExportPrintStep.tsx`](file:///D:/Photo-print/apps/web/src/components/ExportPrintStep.tsx) & [`PrePrintWarningModal.tsx`](file:///D:/Photo-print/apps/web/src/components/PrePrintWarningModal.tsx))
- **Clutter & Emojis**: `⚠️` in callout; `⚠️`, `✓`, `✗`, `ℹ` in `PrePrintWarningModal.tsx`.
- **Card Density**: A 6-item "Final Print Summary" card takes significant space on mobile before the primary download button.
- **Compacting Opportunity**: Consolidate the print summary into a concise 1-line badge (e.g. `6 copies • 35 × 45 mm • A4 100% scale`). Replace all emojis with crisp Tailwind/Lucide SVG icons.
- **Must Remain Visible**: Primary "Download Print-Ready PDF (300 DPI)" button, secondary "Print Directly in Browser" button, 100% scale warning dialog, and the 50 mm calibration ruler preview.

---

## 4. Mobile Usability Audit by Viewport Width

*Note on methodology: Findings below are derived from rigorous static code inspection, CSS class analysis, box-model geometry, and Vitest responsive DOM assertions. Physical mobile touchscreen hardware tests were not executed in this read-only phase.*

### 4.1 320px Viewport (iPhone SE 1st Gen / Minimum Responsive Boundary)
- **Horizontal Overflow**: None detected. All containers use `w-full max-w-5xl`, `box-sizing: border-box`, and percentage widths.
- **Header**: Title text (`Passport Photo Studio`) truncates cleanly, but the "100% Private" pill wraps or crowds the title line.
- **Step 2 (Crop)**: Extreme vertical height. Total card height is ~680px; the primary action is 2.5 screens below the fold.
- **Step 4 (Color)**: Swatch grid buttons have only ~135px width, causing color names and hex values to wrap tightly.
- **Step 5 (Dimensions)**: Quick size buttons wrap descriptive text onto 3 lines, causing uneven button heights.
- **Step 6 (Layout)**: Preset pills wrap onto 3 uneven rows. A4 sheet preview is pushed completely off-screen.

### 4.2 360px Viewport (Standard Android / Galaxy S-Series Baseline)
- **Header**: Single-row header fits comfortably.
- **Crop Stage**: `h-[320px]` still forces 200–240px of scrolling past the stage to reach the primary CTA.
- **Touch Targets**: All primary buttons and handle hitboxes meet the 44×44px touch-target requirement (`min-h-[44px]`).
- **Form Inputs**: Width and height inputs in Step 5 fit cleanly side-by-side.

### 4.3 390px Viewport (Standard iPhone 12/13/14/15/16)
- **Horizontal Spacing**: Good breathing room (`px-3.5 sm:px-6`).
- **Primary Friction**: Action placement. Across Steps 2, 5, 6, and 7, the forward navigation button requires scrolling to discover.

### 4.4 430px Viewport (iPhone Pro Max / Large Android)
- **General**: Layout scales well. However, the nested border aesthetic ("cards inside cards inside cards") makes the interface feel overly heavy and boxed-in.

---

## 5. Prioritized Issues (P0 / P1 / P2)

### P0: Critical Mobile Failures & Blockers
1. **P0-1: Crop Stage Pushes Primary Action Below the Fold**
   - *File*: [`CropEditor.tsx:432`](file:///D:/Photo-print/apps/web/src/components/CropEditor.tsx#L432)
   - *Issue*: Fixed stage height (`320px`) occludes the zoom bar, rotate button, and "Apply Crop" CTA on screens < 400px wide.
   - *Fix*: Adapt mobile stage height (`max-h-[42vh]` or `260px` on small screens); dock action in sticky bottom bar.
2. **P0-2: Synchronous `pdf-lib` Bundle Overhead (701 kB)**
   - *File*: [`pdfGenerator.ts:1`](file:///D:/Photo-print/apps/web/src/services/pdfGenerator.ts#L1), [`ExportPrintStep.tsx:9`](file:///D:/Photo-print/apps/web/src/components/ExportPrintStep.tsx#L9)
   - *Issue*: Bundle size warning on initial mobile page load (`dist/assets/index-BX76d-pz.js` is 701.84 kB).
   - *Fix*: Lazy load `pdf-lib` via dynamic `import('pdf-lib')` inside `generatePrintReadyPdf()`.

### P1: High-Impact Mobile Usability & Navigation
3. **P1-1: Missing Sticky Bottom Action Bar on Mobile**
   - *Files*: [`App.tsx`](file:///D:/Photo-print/apps/web/src/App.tsx) and all 7 step components.
   - *Issue*: Forward actions are buried at the bottom of long content cards.
   - *Fix*: Introduce a persistent mobile bottom navigation bar (`sticky bottom-0 bg-white/95 backdrop-blur border-t border-slate-200 p-3 z-40`) housing the primary CTA and secondary back button.
4. **P1-2: Non-Interactive Stepper on Mobile**
   - *File*: [`Stepper.tsx:28-54`](file:///D:/Photo-print/apps/web/src/components/Stepper.tsx#L28-L54)
   - *Issue*: On mobile, completed steps cannot be tapped to jump backwards; users must hunt for internal card buttons.
   - *Fix*: Make completed step dots and badges interactive tap targets with back-navigation handlers.
5. **P1-3: Form Clutter Obscuring A4 Preview in Step 6**
   - *File*: [`SheetLayoutStep.tsx:132-250`](file:///D:/Photo-print/apps/web/src/components/SheetLayoutStep.tsx#L132-L250)
   - *Issue*: 600px of stacked controls push the sheet preview off-screen on mobile.
   - *Fix*: Streamline arrangement controls into a compact card; prioritize preview visibility.
6. **P1-4: Crop Handle Touch Occlusion & Missing Active State**
   - *File*: [`CropEditor.tsx:495-595`](file:///D:/Photo-print/apps/web/src/components/CropEditor.tsx#L495-L595)
   - *Issue*: 12×12px visual handle markers are hidden under the user's thumb without active scale expansion cues.
   - *Fix*: Add `active:scale-125` visual feedback and high-contrast rings when handles are engaged.

### P2: UI Decluttering, Polish & Copy Cleanup
7. **P2-1: Remove Decorative Platform Emojis**
   - *Files*: [`WorkflowExplainer.tsx`](file:///D:/Photo-print/apps/web/src/components/WorkflowExplainer.tsx), [`CropEditor.tsx`](file:///D:/Photo-print/apps/web/src/components/CropEditor.tsx), [`ExportPrintStep.tsx`](file:///D:/Photo-print/apps/web/src/components/ExportPrintStep.tsx), [`PrePrintWarningModal.tsx`](file:///D:/Photo-print/apps/web/src/components/PrePrintWarningModal.tsx).
   - *Fix*: Replace all emojis (`💡`, `📷`, `🎨`, `🔍`, `⚠️`, `✓`, `✗`, `ℹ`) with clean, lightweight SVG icons.
8. **P2-2: Eliminate Redundant Cards and Repeated Privacy Statements**
   - *Files*: [`Header.tsx`](file:///D:/Photo-print/apps/web/src/components/Header.tsx), [`Footer.tsx`](file:///D:/Photo-print/apps/web/src/components/Footer.tsx), [`BackgroundStep.tsx`](file:///D:/Photo-print/apps/web/src/components/BackgroundStep.tsx), [`DimensionsStep.tsx`](file:///D:/Photo-print/apps/web/src/components/DimensionsStep.tsx).
   - *Fix*: Remove static "How It Works" and "Provisional Notice" cards. Retain single, clean privacy indicator in header.
9. **P2-3: Consolidate Multi-Layer Nested Card Borders**
   - *Files*: Across all step wrappers.
   - *Fix*: Apply `better-ui` surface depth principles: subtle elevation shadows (`shadow-xs` / `shadow-sm`) and borderless sub-sections.
10. **P2-4: Standardize Flow Vocabulary**
    - *Files*: Across all buttons.
    - *Fix*: Use uniform verb-first labels: `Continue to [Next Step]` and `Back to [Previous Step]`.

---

## 6. Proposed Mobile-First Design System

In alignment with the installed `better-*` skills (`better-ui`, `better-layout`, `better-colors`, `better-typography`, `better-accessibility`, `better-writing`):

### 6.1 Layout & Elevation Structure
- **Outer Shell**: Clean neutral background (`bg-slate-50`).
- **Card Surfaces**: Clean white surface (`bg-white`), single outer border (`border-slate-200`), rounded corners using concentric radii ($R_{\text{outer}} = 12\text{px}$, $R_{\text{inner}} = 8\text{px}$).
- **Elevation over Borders**: Replace nested interior borders with subtle spacing and tinted backgrounds (`bg-slate-50/70`) rather than creating boxes inside boxes.
- **Sticky Bottom Action Bar**:
  ```tsx
  <div className="sticky bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-sm sm:hidden">
    <div className="flex items-center justify-between gap-3">
      {/* Secondary Back Button */}
      {/* Primary Continue Button */}
    </div>
  </div>
  ```

### 6.2 Typography & Spacing Grid
- **Font Stack**: Clean system sans-serif (`Inter`, system-ui, -apple-system, sans-serif).
- **Scale**:
  - Page/Card Title: `text-base sm:text-lg font-bold text-slate-900`
  - Section Headers: `text-xs font-bold uppercase tracking-wider text-slate-500`
  - Body Text: `text-xs sm:text-sm text-slate-600`
  - Physical Dimensions / Numbers: `font-mono tabular-nums font-bold text-slate-900`
  - Micro-labels: No text smaller than `11px` (`text-[11px]`).
- **Modular 8px Spacing**: `gap-2` (8px), `gap-3` (12px), `gap-4` (16px), `gap-6` (24px).

### 6.3 Touch & Control Affordances
- **Minimum Hit Targets**: 44×44px minimum for all clickable buttons, handle hitboxes, and stepper nodes.
- **Tactile Scale on Press**: `active:scale-[0.97] transition-transform` on primary buttons.
- **Handle Feedback**: Crop handles visually expand on pointer down (`active:scale-125 ring-2 ring-blue-500/50`).

---

## 7. Files and Components Likely to Change

| File / Component Path | Primary Purpose in UI Cleanup |
| :--- | :--- |
| [`apps/web/index.html`](file:///D:/Photo-print/apps/web/index.html) | Product rename in `<title>` and `<meta name="description">` |
| [`apps/web/src/App.tsx`](file:///D:/Photo-print/apps/web/src/App.tsx) | Integrate sticky mobile action bar; wire stepper back-navigation |
| [`apps/web/src/components/Header.tsx`](file:///D:/Photo-print/apps/web/src/components/Header.tsx) | Compact mobile header (44px), LayoutLite branding, clean lock icon |
| [`apps/web/src/components/Footer.tsx`](file:///D:/Photo-print/apps/web/src/components/Footer.tsx) | LayoutLite copy, simplified footer note |
| [`apps/web/src/components/Stepper.tsx`](file:///D:/Photo-print/apps/web/src/components/Stepper.tsx) | Interactive tap-to-jump on completed steps, compact mobile bar |
| [`apps/web/src/components/UploadDropzone.tsx`](file:///D:/Photo-print/apps/web/src/components/UploadDropzone.tsx) | Update input ID, compact mobile padding, clear dropzone focus |
| [`apps/web/src/components/WorkflowExplainer.tsx`](file:///D:/Photo-print/apps/web/src/components/WorkflowExplainer.tsx) | Remove emojis; collapse tips by default on mobile |
| [`apps/web/src/components/CropEditor.tsx`](file:///D:/Photo-print/apps/web/src/components/CropEditor.tsx) | Mobile stage height reduction (`max-h-[42vh]`), remove emojis, active handle styling |
| [`apps/web/src/components/BackgroundStep.tsx`](file:///D:/Photo-print/apps/web/src/components/BackgroundStep.tsx) | Remove static idle "How It Works" card; streamline actions |
| [`apps/web/src/components/ColorStep.tsx`](file:///D:/Photo-print/apps/web/src/components/ColorStep.tsx) | Compact swatch grid; minimize text when background removal was skipped |
| [`apps/web/src/components/DimensionsStep.tsx`](file:///D:/Photo-print/apps/web/src/components/DimensionsStep.tsx) | Remove provisional notice card; streamline quick preset chips |
| [`apps/web/src/components/SheetLayoutStep.tsx`](file:///D:/Photo-print/apps/web/src/components/SheetLayoutStep.tsx) | Compact arrangement controls; optimize mobile preview placement |
| [`apps/web/src/components/ExportPrintStep.tsx`](file:///D:/Photo-print/apps/web/src/components/ExportPrintStep.tsx) | Remove emojis, compact final summary card, lazy-load `pdf-lib` |
| [`apps/web/src/components/PrePrintWarningModal.tsx`](file:///D:/Photo-print/apps/web/src/components/PrePrintWarningModal.tsx) | Replace emojis with SVG status icons |
| [`apps/web/src/services/pdfGenerator.ts`](file:///D:/Photo-print/apps/web/src/services/pdfGenerator.ts) | Dynamic `import('pdf-lib')`, LayoutLite PDF metadata |

---

## 8. Features and Logic That Must NOT Change

To ensure absolute regression safety, the following core logic is strictly protected:

1. **Sheet Geometry & Tiling Mathematics**:
   - `packages/shared/src/layout.ts`: Millimeter placement math, single-row layout ($210\text{ mm}$ width distribution), multi-row balanced grid packing, sub-micron floating point epsilon tolerances, and cut-guide tick coordinates.
2. **Physical Unit Conversions**:
   - `packages/shared/src/dimensions.ts` & `units.ts`: Exact conversions between mm, inches, printer points ($72\text{ pt/in}$), and pixels at explicit 300 DPI.
3. **Local AI Model & Segmentation**:
   - `services/background-removal/*`: Python FastAPI backend, `rembg` session with `u2netp`, alpha floor refinement, and foreground color decontamination.
4. **Client-Side Canvas Compositing**:
   - `apps/web/src/utils/colorCompositor.ts`: 2D canvas pixel composition against solid background colors.
5. **High-Resolution Crop Extraction**:
   - `apps/web/src/utils/cropExporter.ts` & `cropGeometry.ts`: Aspect-ratio-locked crop slicing from full-resolution source image files.
6. **Print Calibration & PDF Accuracy**:
   - Vector 50 mm calibration ruler geometry and 1:1 scale rendering in `pdfGenerator.ts` and `ExportPrintStep.tsx`.
7. **Object URL Lifecycle Safety**:
   - `apps/web/src/utils/photoUrlTracker.ts` and `imageLoadManager.ts`: Session tokens and orderly URL cleanup to prevent memory leaks and revoked URL errors.
8. **Internal Monorepo Names**:
   - `@passport-photo/shared` and `@passport-photo/web` in package workspace files.

---

## 9. Incremental Implementation Plan & Acceptance Criteria

We recommend executing the cleanup across four bounded, independently testable phases:

### Phase U2: Branding, Copy & Token Polish
- **Scope**:
  - Update user-facing title and metadata in `index.html` to **LayoutLite**.
  - Update `Header.tsx`, `Footer.tsx`, and `pdfGenerator.ts` metadata to LayoutLite.
  - Replace all decorative emojis with inline SVG icons (`lucide-react` / Tailwind SVG).
  - Remove redundant cards (Step 5 Provisional Notice, Step 3 How It Works).
- **Acceptance Criteria**:
  - `grep -ri "Passport Photo Studio"` yields zero user-visible occurrences in `apps/web/src/components/` and `index.html`.
  - Zero emojis present in rendered DOM.
  - All automated tests (`npm run test`) pass.

### Phase U3: Performance & Bundle Code-Splitting
- **Scope**:
  - Convert `pdf-lib` in `pdfGenerator.ts` to dynamic import: `const { PDFDocument, rgb } = await import('pdf-lib');`.
- **Acceptance Criteria**:
  - `npm run build` succeeds without Vite chunk size warning (> 500 kB).
  - Main bundle size drops below 250 kB uncompressed.
  - PDF generation in Step 7 continues to produce valid 300 DPI documents identical to current output.

### Phase U4: Mobile Stage Height & Sticky Action Bar
- **Scope**:
  - Add responsive stage constraints in `CropEditor.tsx` (`max-h-[40vh]` on mobile) so the crop box and zoom toolbar fit above the fold.
  - Implement the sticky bottom mobile action bar in `App.tsx` / step components.
  - Make completed steps in `Stepper.tsx` clickable to allow direct backward navigation.
- **Acceptance Criteria**:
  - At 320px and 360px viewports, the primary "Apply Crop & Save" action is immediately visible without scrolling.
  - Tapping completed step nodes in the Stepper returns user to that step.
  - All existing unit tests and crop geometry tests pass.

### Phase U5: Final Responsive Verification & Audit Signoff
- **Scope**:
  - Run full suite of checks across simulated 320px, 360px, 390px, and 430px viewports.
  - Verify WCAG 2.1 AA contrast compliance on all swatches and buttons (`better-accessibility`).
  - Verify print CSS rules (`@media print`) and calibration ruler visual accuracy.
- **Acceptance Criteria**:
  - `npm run typecheck` passes with 0 errors.
  - `npm run test` passes with 182/182 tests.
  - `npm run build` succeeds.
  - Backend `pytest` passes with 14/14 tests.

---

## 10. Actual Verification Results Recorded

| Check Suite | Target Command | Result | Notes |
| :--- | :--- | :---: | :--- |
| **Frontend Typecheck** | `npm run typecheck` | **PASS (0 errors)** | Checked `@passport-photo/shared` and `@passport-photo/web` |
| **Unit Test Suite** | `npm run test` | **PASS (182/182 tests)** | 77 shared package tests, 105 web component tests |
| **Production Build** | `npm run build` | **PASS (Clean dist/)** | Vite v6.4.4 compiled in 3.13s (701 kB chunk warning flagged for Phase U3) |
| **Backend Tests** | `pytest tests/` | **PASS (14/14 tests)** | Python 3.11 FastAPI + u2netp segmentation tests passed in 3.55s |
| **File Modifications** | Repository Inspection | **0 code files changed** | Strictly read-only audit; only deliverable markdown updated |

---

### Phase U1 Conclusion
Phase U1 is complete. No functional code, mathematical logic, or backend services were modified.  
**Awaiting your approval to begin Phase U2 (Branding, Copy & Token Polish).**
