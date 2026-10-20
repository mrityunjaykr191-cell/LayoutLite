# Passport Photo Studio — Skill Audit

**Date**: October 2026  
**Environment**: Windows, PowerShell, Node.js 24, npm 11, Python 3.11, Antigravity / Gemini CLI  
**Scope**: Comprehensive evaluation of skills located in `.agents/skills/` and global environment.

---

## 1. Skill Discovery Mechanism in Gemini CLI

Antigravity / Gemini CLI discovers skills using the following mechanism (defined in `agy-customizations`):
1. **Workspace Scanning**: Traverses `.agents/skills/` (and `.agent/`, `_agents/`) from the current workspace root.
2. **Skill Manifest Parsing**: Reads each `<skill-name>/SKILL.md` and parses its YAML frontmatter.
3. **Model Invocation Eligibility**:
   - If `disable-model-invocation: true` is set in the frontmatter, the skill is **NOT** injected into the model's active `<skills>` prompt. It remains available strictly as an on-disk reference or for manual slash-command triggering by the user.
   - If `disable-model-invocation` is absent or `false`, the skill name and description are dynamically injected into the system prompt's `<skills>` block, allowing the model to progressively read and activate it when relevant.

---

## 2. Comprehensive Audit of Workspace Skills

### 2.1 UI & Design System Skills (`better-*`)

These skills are directly relevant to delivering a clean, accessible, and high-polish utility UI for non-technical users.

| Skill Name | Path | Discovered by CLI | Status & Role in Passport Photo Studio |
| :--- | :--- | :--- | :--- |
| **`better-ui`** | `.agents/skills/better-ui/SKILL.md` | **Yes** (Active in `<skills>`) | **Primary UI Polish Standard**: Prescribes concentric border radii ($R_{outer} = R_{inner} + \text{padding}$), optical alignment over geometric centering, layered transparent shadows for depth, and subtle transitions. Essential for the web workspace and card containers. |
| **`better-layout`** | `.agents/skills/better-layout/SKILL.md` | **Yes** (Active in `<skills>`) | **Primary Layout Standard**: Governs the 8px spacing grid, reading order, progressive disclosure in the 7-step workflow, and responsive layout between the canvas and control pane. |
| **`better-colors`** | `.agents/skills/better-colors/SKILL.md` | **Yes** (Active in `<skills>`) | **Color Token Standard**: Guides the neutral Slate base, semantic role mappings, and high-contrast solid background swatches (white, off-white, light blue, custom) for portrait compositing. |
| **`better-typography`** | `.agents/skills/better-typography/SKILL.md` | **Yes** (Active in `<skills>`) | **Typography Standard**: Defines clean system font stack, modular type scale, tabular numerals for physical dimension inputs ($mm$ and $in$), and prohibition of micro-text below 12px. |
| **`better-accessibility`** | `.agents/skills/better-accessibility/SKILL.md` | **Yes** (Active in `<skills>`) | **A11y Standard**: Enforces WCAG 2.1 AA compliance, visible focus indicators (`focus-visible:ring-2`), minimum touch/click targets ($44\text{px}$ web, $48\text{px}$ touch), and ARIA announcements. |
| **`better-writing`** | `.agents/skills/better-writing/SKILL.md` | **Yes** (Active in `<skills>`) | **Product Copywriting**: Ensures concise, non-technical instructions, unambiguous button labels, and actionable error/printer-scaling warning dialogs. |
| **`better-interface`** | `.agents/skills/better-interface/SKILL.md` | **Yes** (Active in `<skills>`) | **Holistic Review Framework**: Combines all `better-*` criteria into a consolidated review rubric. Used before completing major milestones. |

---

### 2.2 Developer Review & Stress-Testing Skills

| Skill Name | Path | Discovered by CLI | Status & Role in Passport Photo Studio |
| :--- | :--- | :--- | :--- |
| **`interface-review`** | `.agents/skills/interface-review/SKILL.md` | **Manual Only** (`disable-model-invocation: true`) | **Change Review Tool**: Scopes git diffs and classifies UI findings. File exists on disk; cannot be auto-invoked by the model, but can be referenced manually or triggered via `/interface-review`. |
| **`break`** | `.agents/skills/break/SKILL.md` | **Manual Only** (`disable-model-invocation: true`) | **Stress-Testing Tool**: Renders a component across edge-case scenarios on a temporary page. Can be manually referenced to test the interactive crop box and dimension inputs. |
| **`variant`** | `.agents/skills/variant/SKILL.md` | **Manual Only** (`disable-model-invocation: true`) | **Design Exploration Tool**: Creates 3 deliberate visual variants behind an in-page picker. Useful if exploring alternative A4 sheet preview layouts. |
| **`explain-interface`**| `.agents/skills/explain-interface/SKILL.md`| **Manual Only** (`disable-model-invocation: true`) | **Deconstruction Tool**: Analyzes external web interfaces. Not needed for this project. |

---

### 2.3 Foreign & Irrelevant Skills (Must NOT Be Used)

| Skill Name | Path | Discovered by CLI | Reason for Exclusion |
| :--- | :--- | :--- | :--- |
| **`depthwizard`** | `.agents/skills/depthwizard/SKILL.md` | **Yes** (Active in `<skills>`) | **Foreign Project Rules**: Contains operating instructions and constraints for "DepthWizard" (a technical geospatial terrain reconstruction tool). It has zero relevance to Passport Photo Studio. Its product, ML, and documentation authority rules **must be strictly ignored**. |
| **`r3f-*` (11 skills)** | `.agents/skills/r3f-*/SKILL.md` | **Yes** (Active in `<skills>`) | **3D Graphics Skills**: Covers React Three Fiber, Three.js shaders, 3D physics, GLTF meshes, and 3D lighting. Passport Photo Studio is a 2D image preparation and PDF printing utility. No 3D libraries are used. |

---

## 3. Sample Reference Artifact Status

- **Reference File Mentioned**: `passport size sample.pdf`
- **Physical Presence in Workspace**: Not present as a loose file in `D:\Photo-print`.
- **Visual Description Provided**:
  - The sample shows **six copies** of the same portrait arranged in **one horizontal row** near the top of an A4 portrait page ($210 \times 297\text{ mm}$), leaving the rest of the page blank.
  - The sample serves as a visual layout reference for initial A4 output, but its physical dimensions have not yet been measured with calipers or verified.
- **Architectural Policy**:
  - Do **not** guess or invent exact physical dimensions for the sample.
  - Model physical dimensions as configurable parameters ($W\text{ mm} \times H\text{ mm}$, with optional inches display).
  - Keep default photo dimensions provisional and easily configured in a single module (relying on explicitly labeled test fixtures for unit tests) while giving the user simple controls to adjust size, copy count, and layout.

---

## 4. Execution Guidance for Future Phases

1. **Active UI Guidelines**: When building UI components in `apps/web` (Phases 2–5), actively adhere to the domain rules in `better-ui`, `better-layout`, `better-colors`, `better-typography`, `better-accessibility`, and `better-writing`.
2. **Isolation of Scope**: Do not permit `depthwizard` or `r3f-*` rules to influence dependencies, architecture, or code structure.
3. **Manual Review Skills**: If visual stress testing or change audits are needed, read `break/SKILL.md` or `interface-review/SKILL.md` directly as reference documentation.
