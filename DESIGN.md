---
name: Armature
description: Drop-in visual animation editor for React — Blender power, zero ceremony.
colors:
  deep-well: "#111111"
  void: "#1a1a1a"
  surface-mid: "#222222"
  scrub-surface: "#2a2a2a"
  control-surface: "#333333"
  active-control: "#555555"
  muted: "#666666"
  secondary-ink: "#aaaaaa"
  major-tick: "#cccccc"
  primary-ink: "#dddddd"
  canvas-white: "#ffffff"
  active-ember: "#e8a020"
  playhead: "#ff0000"
typography:
  body:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  mono:
    fontFamily: "ui-monospace, Consolas, 'Courier New', monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1
  label:
    fontFamily: "ui-monospace, Consolas, 'Courier New', monospace"
    fontSize: "11px"
    fontWeight: 400
    letterSpacing: "normal"
rounded:
  none: "0px"
  sm: "3px"
  md: "4px"
  circle: "50%"
spacing:
  xs: "6px"
  sm: "8px"
  md: "10px"
components:
  button-control:
    backgroundColor: "{colors.control-surface}"
    textColor: "{colors.canvas-white}"
    rounded: "{rounded.md}"
    padding: "3px 10px"
  button-control-active:
    backgroundColor: "{colors.active-control}"
    textColor: "{colors.canvas-white}"
    rounded: "{rounded.md}"
    padding: "3px 10px"
  button-easing:
    backgroundColor: "{colors.control-surface}"
    textColor: "{colors.canvas-white}"
    rounded: "{rounded.sm}"
    padding: "2px 7px"
  button-easing-active:
    backgroundColor: "{colors.active-ember}"
    textColor: "{colors.canvas-white}"
    rounded: "{rounded.sm}"
    padding: "2px 7px"
  keyframe-dot:
    backgroundColor: "{colors.canvas-white}"
    rounded: "{rounded.circle}"
    size: "10px"
  keyframe-dot-selected:
    backgroundColor: "{colors.active-ember}"
    rounded: "{rounded.circle}"
    size: "10px"
---

# Design System: Armature

## 1. Overview

**Creative North Star: "The Engineer's Bench"**

Armature's visual system is a working surface, not a showroom. Every color, every pixel of padding, every radius decision exists because it makes the tool easier to use — not because it looks composed. The dark depth stack (#111 → #1a1a1a → #222 → #333) functions like the layered surfaces of a precision instrument: the deepest tones recede, the lighter ones come forward, and attention falls naturally on the canvas — the animated element — not on the editor holding it.

The single accent, Active Ember (#e8a020), is borrowed from hardware: indicator LEDs, signal lamps, the amber glow of a system under active use. It appears only where the user is working: selected keyframes, active easing buttons. Its rarity is not restraint — it is precision. A control room has one indicator lit per active channel.

This system explicitly rejects the Figma aesthetic: no light canvas, no floating inspector chrome, no generous white space. Armature is not a design tool with a developer mode — it is a developer tool with design power. The interface holds still and lets the animation move.

**Key Characteristics:**
- Dark-first: all surfaces live in the #111–#333 range; nothing is light by accident
- Monochromatic depth: the surface hierarchy reads through luminosity steps, not hue shifts
- One accent, earned: Active Ember appears only on interactive state (selected, active) — never decorative
- Functional red for the playhead: not brand, not aesthetic — a pure system signal
- Monospace data: any numeric or time-based value uses monospace type; human-readable labels use system-ui
- Sharp containers: 0px radius on all panels and tracks; small radius (3–4px) only on buttons and inputs

## 2. Colors: The Depth Stack

A single-hue descent from void to white, with one warm functional accent.

### Primary
- **Active Ember** (`#e8a020`, oklch ≈ 71% 0.16 75°): The system's only warm color. Used exclusively on selected keyframe dots and the active easing button. This is a signal, not decoration — its appearance means "you are editing this right now." Never use on multiple elements simultaneously if it can be avoided; its power is its scarcity.

### Neutral
- **Deep Well** (`#111111`): The absolute floor. Control bar background — the densest, most receding surface in the editor.
- **Void** (`#1a1a1a`): Primary timeline background. The default surface the eye rests on between tracks.
- **Surface Mid** (`#222222`): Alternating track rows. The 2px luminosity step creates rhythm without borders — the seams are tonal, not drawn.
- **Scrub Surface** (`#2a2a2a`): Scrub bar. Slightly lifted from Void to signal interactivity.
- **Control Surface** (`#333333`): All buttons, number inputs, borders. The lightest "background" element — where the hand goes.
- **Active Control** (`#555555`): Pressed or toggled button state. The jump from #333 to #555 is intentional: a clear step, not a subtle tint.
- **Muted** (`#666666`): Dividers, minor frame tick marks, separator glyphs. Below the threshold of editorial content.
- **Secondary Ink** (`#aaaaaa`): Labels, secondary data, frame counter prefix. Information that supports but doesn't lead.
- **Major Tick** (`#cccccc`): Frame marker ticks and their labels. Readable against any track surface.
- **Primary Ink** (`#dddddd`): Numbers, input values, primary label text. Not pure white — slightly pulled back to reduce eye fatigue against the dark surfaces.
- **Canvas White** (`#ffffff`): Keyframe dots (default), button icons, track labels. Maximum contrast for highest-priority signals.
- **Playhead** (`#ff0000`): The current-frame indicator. Purely functional; carries no brand meaning. Do not reuse this color for any other purpose.

**The One Ember Rule.** Active Ember (#e8a020) is the only warm or saturated color in the system. It may not be used as a background, a border, a text color, or any decorative element. Its only permitted roles are: selected keyframe fill, active easing button background.

**The Signal Red Rule.** Red (#ff0000) is reserved exclusively for the playhead. No other UI element may use red or any near-red hue. If you need an error state color, use a distinct orange-red (#cc3300) to keep them semantically separate.

## 3. Typography

**Body Font:** system-ui, -apple-system, sans-serif (OS native)
**Data / Mono Font:** ui-monospace, Consolas, 'Courier New', monospace

**Character:** Two roles, sharply divided. Human labels (track names, button text) use the system sans for native legibility with zero font-loading cost. All numeric, temporal, or data-derived content (frame numbers, duration inputs, easing values) uses monospace to enforce fixed-width alignment and signal "this is a machine value, not a word."

### Hierarchy
- **Body** (400, 14px, 1.5): Track labels, button text, general UI copy.
- **Mono** (400, 12px, 1.0): Frame counter, duration input, any numeric display. Fixed-width; numbers must align in columns.
- **Label** (400, 11px, normal): Easing button labels, dense control-bar text. Smallest readable size; do not go below 11px.

**The Monospace Fence Rule.** Any value that changes numerically — frame numbers, durations, timing values — must render in monospace type. Any value that is a word — track name, button label, tooltip — must render in system-ui. Never mix font families within a single UI element.

## 4. Elevation

Armature is flat. There are no shadows anywhere in the system. Depth is expressed entirely through the luminosity stack: darker = deeper, lighter = closer. A surface at #222 is "below" a button at #333 not because of a drop shadow but because of luminosity — the same grammar as a physical worktable under bright task lighting.

The single exception is the control bar border: `border-bottom: 1px solid #333`. This is a structural separator, not an elevation signal — it defines the edge of the control region against the track area.

**The Shadowless Bench Rule.** No `box-shadow`, no `drop-shadow`, no `filter: blur`. If you feel the urge to add a shadow for "depth", add a 1px border in `#333` instead. If that doesn't work, the layout needs restructuring, not a shadow.

## 5. Components

### Timeline Control Buttons (Play, Loop, Reset, Export, Import)
Dense, low-profile controls that stay out of the way.
- **Shape:** Gently rounded (4px) — just enough to distinguish from the flat track surfaces, not enough to feel soft.
- **Default:** `background: #333`, `color: white`, `padding: 3px 10px`, `border: none`
- **Active / Toggled (e.g. Loop on):** `background: #555` — a clear luminosity step, no color shift
- **Hover:** `background: #444` (midpoint between default and active)
- **No focus ring by default** — these are pointer controls in a tool UI; keyboard focus rings should be added during the `/impeccable harden` pass.

### Easing Buttons
Mini controls in the control bar showing available easing presets.
- **Default:** `background: #333`, `color: white`, `border-radius: 3px`, `padding: 2px 7px`, `font-size: 11px`
- **Active (selected easing):** `background: #e8a020`, `color: white` — Active Ember, the only place warm color appears in the control bar
- Do not add border or outline to inactive state; the active state is already unambiguous.

### Frame Counter / Duration Input
A monospace inline input in the control bar.
- **Style:** `background: #333`, `color: #ddd`, `border: 1px solid #555`, `border-radius: 3px`, `font-family: monospace`, `font-size: 12px`, `padding: 1px 4px`
- **Focus:** border shifts to `#e8a020` — Active Ember appears on the focused input to connect "editing" state across the UI
- **No spinners** (`-webkit-appearance: none`). It is a number input that looks like a text field; the tool context makes the type clear.

### Keyframe Dots
The primary timeline element. 10×10px circles positioned on the track at their frame percentage.
- **Default:** `background: white`, `border-radius: 50%`, `width: 10px`, `height: 10px`, `cursor: ew-resize`
- **Selected:** `background: #e8a020` — Active Ember; the selected state is the only state change
- **Centered** vertically within their 35px track row via `top: 50%; transform: translate(-50%, -50%)`
- Never add a border or outline to keyframe dots; the color change is the only state signal needed.

### Track Rows
Alternating surfaces that create the timeline's vertical rhythm.
- **Odd rows (Rotation, PosY):** `background: #222`, `height: 35px`
- **Even rows (PosX, Scale):** `background: #1a1a1a`, `height: 35px`
- **Track labels (left column):** same background as their matching row, `color: white`, `padding: 0 8px`, `line-height: 35px`
- No borders between rows. Tonal alternation is the separator.

### Playhead
A 2px vertical red line spanning the full timeline height.
- `background: red`, `width: 2px`, `position: absolute`, `pointer-events: none`, `z-index: 10`
- No shadow, no glow, no pulse animation. It is a crosshair, not a decorative element.

## 6. Do's and Don'ts

### Do:
- **Do** use `#e8a020` (Active Ember) exclusively for selected and active states — keyframe dots, active easing buttons, focused inputs. Its rarity is its signal.
- **Do** express depth through the luminosity stack (`#111` → `#333`). When you need a new surface, step one tone up or down in the existing ramp.
- **Do** use monospace type for all numeric and time-based values. Proportional type is forbidden for numbers in this system.
- **Do** keep button radius at 4px (standard controls) and 3px (compact controls). These values distinguish buttons from flat surfaces without adding softness.
- **Do** use `#ff0000` exclusively for the playhead. Never reuse it.
- **Do** keep track rows at 35px height. This is the established rhythm; changing it breaks alignment between the label column and the track area.

### Don't:
- **Don't** add a light surface. No white, near-white, or cream backgrounds anywhere in the editor UI. Armature is not Figma. The canvas is dark; the animation is the light.
- **Don't** use Active Ember as a background for any non-interactive, non-selected element — no decorative amber borders, no amber section headers, no amber hover states on non-interactive text.
- **Don't** add shadows. There are none in the system. If depth is needed, use a 1px `#333` border.
- **Don't** add a second accent color. The system has one warm signal (Ember) and one functional signal (Red). A third color would break the grammar.
- **Don't** use proportional type for frame numbers or duration values. Numeric columns must align; system-ui is variable-width.
- **Don't** round panels, the timeline container, or track rows. Sharp edges are structural; 0px radius on containers is intentional.
- **Don't** make the timeline feel like a Figma or Framer component. No white background, no floating card layout, no gradient headers. Armature's aesthetic is the broadcast desk, not the design tool.
- **Don't** add gradient text, glassmorphism, or hero-metric layouts to any Armature surface. These are banned patterns per the system's anti-references.
