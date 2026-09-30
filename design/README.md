# design/

| File | Use it for |
|---|---|
| `tokens.css` | Drop-in CSS variables, the `.notched` frame, and `.btn-primary`. |
| `tokens.json` | The same tokens as data, plus altitude zones, type scale, breakpoints, reference sizes. |
| `sprites.json` | Every pixel map (balloon, level icons, landmarks, cloud, verdicts, UI). One string per row, `.` = transparent, letters map to `palette`. |
| `world.json` | Landmark altitudes and labels, cloud positions, star fade-in range for the climb scene. |
| `reference/climb-prototype.html` | **Runnable** climb (open in a browser). Desktop/phone toggle top right. The behavior to match. |
| `reference/canvas-source/` | Source of each board on the design canvas. See below. |

## Canvas boards

These files use the design tool's templating (`{{holes}}`, `<sc-for>`, `<sc-if>`, `class Component extends DCLogic`). They do not run on their own. Read them for **layout, spacing, copy, and sizes**; the logic inside `renderVals()` is plain JavaScript and matches `lib/`.

| File | Screen | Size |
|---|---|---|
| `desktop-home.dc.html` | Homepage, desktop | 1280 × 800 |
| `desktop-climb.dc.html` | The climb, desktop (same as the runnable prototype) | 1280 × 800 |
| `burner-reactions.dc.html` | Storyboard: spot on, halfway, way off | 1280 × 800 |
| `desktop-results.dc.html` | Results and riddle-by-riddle debrief, desktop | 1280 × 1400 |
| `phone-home.dc.html` | Homepage, phone | 390 × 1040 |
| `phone-climb.dc.html` | The climb, phone | 390 × 844 |
| `phone-results.dc.html` | Results and debrief, phone | 390 × 2240 |
| `camera-flow.dc.html` | Storyboard: question shot, pan, boost | 1200 × 780 |
| `pixel-kit.dc.html` | Palette, type, frames, sprites, zones, timer | 1040 × 800 |

Rendering pixel sprites: draw each pixel as a `scale`-sized square with no smoothing. The prototypes use one element with a `box-shadow` per pixel; a `<canvas>` with `imageSmoothingEnabled = false` is equally fine.

Sample numbers on these boards (RQ 118, 306 / 450, "[XX]% fell for the trap", histograms) are placeholders. Production values come from the API.
