# AGENTS.md — Passport Photo Studio

This document defines the architectural guidelines, engineering standards, UI/UX requirements, and execution policies for **Passport Photo Studio**. Every AI agent and developer working in this repository must strictly adhere to these instructions.

---

## 1. Project Overview & Context

**Passport Photo Studio** is a focused, production-ready utility created for everyday practical use by a family member: preparing, cropping, background-editing, and tiling small portrait photos for application forms, school/college submissions, and job forms onto an A4 sheet for physical printing.

### 1.1 Product Clarification: "Passport-Size Photo"
- **Informal Definition**: "Passport-size photo" refers informally to standard small portrait headshots used across daily documents, forms, and cards.
- **Out of Scope**: This is **NOT** a country-specific passport-compliance tool. Biometric face-oval checks, official international government rules, and strict compliance validation are removed from the initial scope to ensure simplicity and immediate practical utility.
- **Visual Reference Layout**: The provided visual reference (`passport size sample.pdf`) displays **six copies of the same portrait in one horizontal row near the top of an A4 portrait page ($210 \times 297\text{ mm}$)**, leaving the rest of the page blank. Photo dimensions are modeled as configurable physical properties ($W \times H$ in millimeters or inches) that will be measured or validated separately.

### 1.2 Core Workflow
1. **Upload**: Import a portrait image (JPG, JPEG, PNG) from local disk or camera.
2. **Crop & Position**: Crop and frame the face using an intuitive 2D crop box with pan, zoom, and rotate ($90^\circ$).
3. **Optional Background Removal**: Strip the original background cleanly using an open-source AI segmentation model (`rembg`), with a clear "Skip / Keep Original" option.
4. **Background Replacement**: Composite the subject against official or common solid colors (pure white, off-white, light blue, light gray, custom).
5. **Physical Dimensions**: Set or adjust physical print dimensions ($W \times H$ in mm or inches), with provisional default dimensions easily configurable in a single location.
6. **Sheet Layout & Tiling**: Arrange copies on an A4 sheet ($210 \times 297\text{ mm}$) using a configurable single-row layout (reference pattern: 6 copies at top, with fit detection) or multi-row grid layout with optional cutting guides.
7. **Print-Ready Export**: Generate an uncompressed or high-quality 300 DPI PDF via `pdf-lib` configured for exact physical dimensions, with clear 100% scale printer guidance, or trigger direct browser/native printing.
8. **Future Extension**: Layered PSD export for professional lab handoff.

### 1.3 Product & Design Philosophy
- **Audience**: Non-technical users (family members, students, job applicants, office administrators).
- **Core Value**: Simplicity, clarity, and reliable physical accuracy over complex digital photo manipulation.
- **Aesthetic**: Clean, focused desktop/mobile utility (similar to macOS Preview or professional print utilities), **not** a generic SaaS admin dashboard.
- **Strategy**: **Web First** (React + Vite), followed by **Android** (React Native + Expo).

---

## 2. Intended Technology Architecture

```
passport-photo-studio/
├── apps/
│   ├── web/                     # React + TypeScript + Vite (Phase 2+)
│   └── android/                 # React Native + Expo + TypeScript (Phase 7)
├── packages/
│   └── shared/                  # Pure TypeScript business logic, math, layout
├── services/
│   └── background-removal/      # Python 3.11 + FastAPI + rembg (Phase 4)
├── package.json                 # npm workspaces root
└── AGENTS.md                    # Root agent guidance and standards
```

### 2.1 Workspace Components
- **Package Manager**: `npm` workspaces monorepo.
- **Shared Package (`packages/shared`)**:
  - Pure TypeScript library with zero UI dependencies.
  - Physical dimension math: conversions between millimeters, inches, printer points (`pt`), and pixels at specified DPI (default 300 DPI). Pixels do not have an inherent physical size.
  - Configurable photo dimensions and aspect ratio calculations.
  - Tiling algorithms: A4 sheet layout calculation (reference 1-row layout with 6 copies at top, multi-row grid packing, margins, gutters, cutting guides).
- **Web Application (`apps/web`)**:
  - React, TypeScript, Vite, Tailwind CSS.
  - Client-side image cropping, canvas manipulation, and color compositing.
  - Client-side PDF generation using `pdf-lib` ensuring 1:1 physical scale.
- **Android Application (`apps/android`)**:
  - React Native with Expo and TypeScript.
  - Reuses `@passport-photo/shared` logic and layout engines.
- **Background Removal Service (`services/background-removal`)**:
  - Python 3.11+, FastAPI, `rembg` (ONNX runtime CPU).
  - Local HTTP microservice exposing `POST /api/remove-background`.
  - Stateless: does not store images permanently; cleans up memory buffers (`io.BytesIO`) immediately.
- **Persistence & Privacy**:
  - **No database, no user accounts, no cloud photo storage.**
  - All processing is local or ephemeral. User photos never leave the user's controlled environment without consent.

---

## 3. UI and Design Guidelines

### 3.1 Available Skills & Standards
- **Discovered Project Skills (`.agents/skills/`)**:
  - **`better-ui`**: UI polish, concentric border radius ($R_{outer} = R_{inner} + \text{padding}$), optical alignment, layered shadows for elevation.
  - **`better-layout`**: 8px modular spacing grid, clean grouping, reading order, progressive disclosure.
  - **`better-colors`**: Restrained neutral Slate palette, semantic tokens, accessible high-contrast solid color swatches.
  - **`better-typography`**: Modular type scale, tabular numbers for dimensions, no micro-text below 12px.
  - **`better-accessibility`**: WCAG 2.1 AA compliance, visible focus indicators (`focus-visible:ring-2`), minimum touch/click targets ($44\text{px}$ web, $48\text{px}$ touch).
  - **`better-writing`**: Clear, non-technical copy, plain English instructions, actionable printer-scaling warnings.
  - **`better-interface`**: Holistic pre-release review rubric.
- **Foreign / Irrelevant Skills**:
  - `depthwizard`: Contains foreign rules for an optical terrain project. **Must be completely ignored**.
  - `r3f-*`: 3D graphics/Three.js skills. **Irrelevant** to 2D photo preparation.

### 3.2 Visual & Aesthetic Standards
- **Color Palette**:
  - Restrained, neutral base: Slate neutrals (`#0f172a` text, `#f8fafc` background, `#e2e8f0` borders).
  - Single primary brand/accent color: Deep Trust Blue (`#2563eb` / `#1d4ed8`) for primary actions.
  - Functional status colors only: Success (`#16a34a`), Warning (`#d97706`), Error (`#dc2626`).
  - No decorative gradients, rainbow accents, or unnecessary drop shadows.
- **Typography & Spacing**:
  - Clean system font stack (`Inter`, system-ui, `-apple-system`, `Segoe UI`, `sans-serif`).
  - Strict modular typographic scale (Body: 14-16px, Subtitles: 16-18px, Section Headers: 20-24px, Page Title: 28-32px). Never use micro-text below 12px.
  - Tabular numerals (`font-mono` / `tnum`) for physical dimensions.
  - Generous, consistent whitespace based on an 8px grid (`p-2`, `p-4`, `p-6`, `gap-4`, `gap-6`).
- **Control Sizing & Affordance**:
  - Large, readable touch and click targets (minimum 44x44px web, 48x48px on mobile).
  - Unambiguous visual affordances: buttons look like buttons, inputs look like inputs.
  - Clear visual hierarchy: exactly **one** primary call-to-action per step.

### 3.3 Guided Workflow UX (7 Steps)
The UI is structured as a clear, step-by-step linear stepper:
1. **Step 1: Upload**: Drag-and-drop zone with format hints (JPG, PNG), sample acceptable portraits, and instant validation.
2. **Step 2: Crop & Position**: Interactive 2D crop box with pan, zoom, and rotate controls.
3. **Step 3: Background (Optional)**: One-click background removal with live preview, and a prominent "Skip / Keep Original" button.
4. **Step 4: Color**: Solid color swatches (White, Off-White, Light Blue, Light Gray, Custom Hex Picker) with instant 2D canvas composite.
5. **Step 5: Dimensions**: Familiar physical dimension controls ($W \times H$ in mm or inches), with quick informal size buttons ($35 \times 45\text{ mm}$, $2 \times 2\text{ in}$, etc.).
6. **Step 6: Sheet Layout**: Real-time A4 sheet preview showing the reference 1-row layout (6 copies near top) or multi-row grid, margin controls, and optional cut lines.
7. **Step 7: Export & Print**: High-contrast "Download Print-Ready PDF" button, direct print option, embedded 50 mm calibration ruler, and prominent printer scale 100% warning modal.

### 3.4 Interface States & Feedback
- **Zero Placeholder/Fake Functionality**: Every button, slider, and selector must be fully wired up. Never render dummy buttons or non-functional mockups.
- **Mandatory States for Every View**:
  - **Empty State**: Clear instructions and welcoming prompt when no photo is loaded.
  - **Loading / Processing State**: Explicit spinners, progress bars, or status messages during AI inference or PDF rendering.
  - **Error State**: Actionable, human-friendly error messages with recovery options (e.g., "File too large", "Network error communicating with background removal service — click Skip to keep original background").
  - **Success / Completed State**: High-fidelity visual preview of the final output.
- **Accessibility (a11y)**:
  - Contrast ratio >= 4.5:1 for standard text, >= 3:1 for large text and interactive components.
  - Full keyboard navigability (logical tab order, visible focus rings `focus-visible:ring-2`).
  - Proper ARIA attributes (`aria-live` for status announcements, descriptive `alt` tags and labels).

---

## 4. Required Engineering Rules

All developers and agents working on this codebase must observe the following technical standards:

### 4.1 Development & Inspection Discipline
1. **Inspect Before Changing**: Always check existing directory structure, dependencies, configuration files, and git status before proposing or writing code.
2. **Preserve Existing Work**: Do not overwrite or delete functional code unless explicitly directed or refactoring under an approved plan.
3. **Plan First**: Write a clear, bounded implementation plan before modifying any code.
4. **Small, Atomic Commits / Changes**: Keep modifications focused, minimal, and reviewable. Avoid massive multi-package refactors in a single step.
5. **Follow Conventions**: Adhere to existing code patterns, file naming (`kebab-case` for files, `PascalCase` for React components), and directory layouts.

### 4.2 TypeScript & Code Quality
- **Strict TypeScript**: Enable `strict: true` in all `tsconfig.json` files.
- **No Unjustified `any`**: Explicitly type all data models, props, preset specifications, and API responses. Use `unknown` with type guards if dynamic validation is required.
- **Boundary Validation**: Validate image file types (MIME detection and extension check), file sizes (e.g., max 25 MB), dimension limits, and network payloads at application boundaries.

### 4.3 Privacy & Security
- **No Secret Leaks**: Never commit API tokens, credentials, or private configuration.
- **Zero Photo Retention**: Do not persist personal photographs on servers, databases, or local disk caches longer than needed for transient processing.
- **Resource Cleanup**: Ensure all object URLs (`URL.revokeObjectURL`), canvas buffers, and temporary backend files are cleaned up in `try...finally` blocks.

### 4.4 Print & Geometry Correctness
- **Decoupled Math**: All dimension math, DPI conversions, and layout calculations must live in `@passport-photo/shared`, completely decoupled from DOM or React components.
- **Explicit DPI**: Treat pixels as having no inherent physical size. Conversions must specify explicit DPI (default 300 DPI).
- **Physical Accuracy as Correctness Requirement**:
  - A4 dimensions are exactly 210 mm x 297 mm (595.28 pt x 841.89 pt).
  - 1 inch = 25.4 mm = 72 points = 300 pixels at 300 DPI.
  - Any discrepancy in physical print sizing is considered a high-severity bug.
- **Printer Scaling Reality**: Neither PDF metadata nor CSS `@page` alone can guarantee 100% scale on consumer printers. The app must provide pre-print dialog warnings and a printed 50 mm calibration ruler for manual validation.

### 4.5 Testing & Verification Rigor
- **Meaningful Tests**: Write unit tests for all dimension conversions and A4 tiling algorithms.
- **Verification Execution**: Always run type checks (`tsc --noEmit`), linting, and unit tests when implementing changes.
- **Truth in Reporting**: **Never claim a check passed unless it was actually executed and succeeded.** Report exact command outputs and status codes.
- **Reporting Format**: At the conclusion of every step, report:
  1. Files created or modified.
  2. Commands executed and their outputs.
  3. Verification performed (tests, builds, manual checks).
  4. Known limitations or edge cases.
  5. Recommended next step.

### 4.6 Permission Boundaries
Stop and ask the user for explicit confirmation before:
- Installing large unexpected dependencies.
- Introducing external paid third-party APIs or cloud services.
- Making destructive changes to the repository.
- Expanding scope beyond the currently approved phase.

---

## 5. Phase-Based Execution Policy

Implementation must proceed strictly in separately approved, sequential phases.

### 5.1 The 7-Step Phase Protocol
For every implementation phase:
1. **Read & Inspect**: Read `AGENTS.md` and inspect existing codebase state.
2. **Confirm Scope**: Confirm phase goal, scope, prerequisites, and acceptance criteria.
3. **Propose Plan**: Propose a concise, actionable implementation plan.
4. **Await Approval**: Stop and wait for explicit user approval before writing code.
5. **Implement Approved Scope**: Implement only what was approved.
6. **Run Verification**: Execute tests, type checks, and production builds.
7. **Report**: Summarize changes, test results, deviations, and remaining work.

### 5.2 Project Roadmap
- **Phase 0: Project Setup & Repository Instructions** *(Complete)*
- **Phase 1A: Architecture Specification & Skill Audit** *(Current Phase — Complete)*
- **Phase 1B: Monorepo Foundation & Shared Core Package**
  - Initialize root `package.json` workspaces (`packages/*`, `apps/*`) and root `.gitignore`.
  - Scaffold `packages/shared` with strict TypeScript.
  - Implement physical measurement conversion utilities (mm, inches, pt, px at explicitly supplied DPI).
  - Implement configurable photo dimensions model (provisional default in one module; test fixtures for tests) and boundary validation.
  - Implement A4 sheet layout engine (configurable single-row layout with fit detection, multi-row grid, and mathematical cut-guide coordinates).
  - Add comprehensive unit tests covering conversions, boundary conditions, spacing, copy counts, and overflow.
  - Explicitly excludes PDF generation, print dialogs, UI, background removal, and Android code.
- **Phase 2: Web App Shell, Upload & EXIF Normalization**
  - Scaffold `apps/web` with Vite, React, TypeScript, and Tailwind CSS.
  - Apply `better-*` design tokens, concentric radii, and accessible components.
  - Implement Step 1 (Upload/Drag-and-Drop) with automatic EXIF orientation normalization.
- **Phase 3: Cropping Canvas & Physical Dimension Controls**
  - Implement Step 2 (Crop and Position) with pan, zoom, and rotate.
  - Implement Step 5 (Physical Dimension adjustment with mm/inch inputs and quick sizes).
  - Extract high-resolution cropped headshot slices.
- **Phase 4: Optional Background Removal Service & Color Compositing**
  - Scaffold `services/background-removal` with Python 3.11, FastAPI, and `rembg[cpu]`.
  - Implement Step 3 (Optional AI background removal with Skip button).
  - Implement Step 4 (Solid color replacement swatches and instant 2D canvas composite).
- **Phase 5: A4 Sheet Layout Engine & Print/PDF Export**
  - Implement Step 6 UI: Interactive A4 preview canvas (reference 1-row layout and multi-row grid).
  - Implement Step 7 UI: Client-side 300 DPI PDF generation with `pdf-lib` and 50 mm calibration ruler.
  - Implement direct browser print flow with CSS `@media print` rules.
  - Implement prominent pre-print 100% scale warning modal.
- **Phase 6: Production Hardening & Static Web Deployment**
  - Comprehensive UI/UX audit using `better-interface` and `better-accessibility`.
  - Error boundary implementation, file validation, offline warnings.
  - Production static build and deployment configuration.
- **Phase 7: Android Application (React Native / Expo)**
  - Scaffold `apps/android` with Expo and TypeScript.
  - Connect to `@passport-photo/shared`.
  - Mobile camera capture, touch crop, PDF sharing/printing.
- **Phase 8: Future Enhancements (Layered PSD Export)**
  - Research and implement layered PSD output option.

---

## 6. Subdirectory Instruction Hierarchy

As the project expands into separate workspaces, nested instruction files may be added:
- `apps/web/AGENTS.md`: Web-specific styling, Vite configurations, and browser compatibility notes.
- `apps/android/AGENTS.md`: React Native / Expo specific workflows, device permissions, and touch patterns.
- `services/background-removal/AGENTS.md`: Python environment setup, model caching, and FastAPI configuration.
- `packages/shared/AGENTS.md`: Math conventions, unit testing guidelines, and specification updates.

Nested instruction files inherit and extend this root `AGENTS.md`. In case of conflict, the root `AGENTS.md` takes precedence.
