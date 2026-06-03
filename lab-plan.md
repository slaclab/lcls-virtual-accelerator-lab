# AI Computer Lab Plan — STEM Immersion Summer Program

## Context

A 2-hour hands-on computer lab for 11 high school students (ages 14-17, some minimal prior AI/ML exposure from their STEM program) at SLAC National Lab. Math level: algebra is fine, nothing beyond geometry. The lab sits within a larger session:

- 30 min: Intro to AI talk
- 30 min: Intro to the lab talk (sets up LCLS context + brief NN concepts)
- **2 hours: This lab (hands-on)**
- 30 min: AI at SLAC talk (wrap-up)

**Goal**: Students build intuition for how neural networks work AND see concretely how they're used to model a real particle accelerator (LCLS).

---

## Lab Structure (2 hours)

| Block | Duration | Activity |
|-------|----------|----------|
| Setup | ~5 min | Laptops open, playground loaded, groups settled |
| Part 1 | ~50 min | TensorFlow Playground — guided worksheet |
| Transition | ~10 min | Brief stretch + context for Part 2 |
| Part 2 | ~50 min | Surrogate model webapp — guided worksheet |
| Wrap-up | ~5 min | Group share-out: each group presents best beam + strategy |

**Format**: 4-5 groups of 2-3 students, guided worksheets, exploratory/collaborative (no competition).

---

## Pre-Lab Talk Recommendations (30 min "Intro to Lab")

This talk should cover:
1. What LCLS does — "world's brightest X-ray laser, takes molecular movies" (2-3 min)
2. Why it's hard to simulate — expensive computations, thousands of parameters (2 min)
3. The surrogate concept — analogy: flight simulator vs. real plane. Fast approximation trained on data. (5 min)
4. What a neural network is at the highest level — inputs → learned function → outputs, trained on examples (3-5 min, brief since students have some prior ML exposure)
5. What they'll do in the lab — "first you'll build your own mini neural nets, then you'll use a real one we built for LCLS" (2 min)
6. Logistics — groups, worksheets, how to ask for help (3 min)

This ensures the lab is purely hands-on from minute 1.

---

## Part 1: TensorFlow Playground (~50 min)

### Learning arc (worksheet progression)

Each section has instructions + questions students answer on their worksheet.

**Section A — "Can a single neuron learn this?" (~8 min)**
- Dataset: simple (bottom-left cluster)
- Network: 1 hidden layer, 1 neuron
- Task: Hit play, observe it classifying correctly
- Question: "What is this single neuron doing? Describe it in your own words."
- Then switch to circle dataset, same network → it fails
- Question: "Why can't one neuron separate the orange from the blue here?"
- Note: Students have some ML background, so this may click quickly — use as warm-up rather than extended discovery

**Section B — "Adding complexity" (~15 min)**
- Dataset: circle
- Task: Add neurons until it works. Try 2, 3, 4 neurons.
- Question: "How many neurons did you need? What's each one doing?"
- Guided observation: click on individual neurons to see what each learned
- Key insight to discover: each neuron learns a different "rule" and they combine

**Section C — "Layers vs. neurons" (~15 min)**
- Dataset: spiral
- Task: Try a wide single layer (8 neurons) vs. multiple layers (4-2-2)
- Question: "Which worked better for the spiral? Why do you think depth helps?"
- Try adding noise: does the network still work?
- Question: "What happens when you add too many neurons to noisy data?" (overfitting)

**Section D — "Connection to real science" (~10 min)**
- Reflection questions (no new playground tasks):
  - "Real physics problems are like the spiral — too complex for simple rules. How many neurons/layers do you think you'd need to model an entire particle accelerator?"
  - "The playground trains on dots. What would the 'dots' (training data) be for a particle accelerator model?"
  - "What's the advantage of having a trained model vs. running the real machine every time?"

---

## Part 2: Surrogate Model Webapp (~50 min)

### Primary model: LCLS Injector

**Inputs exposed (5 sliders)**:

| Slider | PV Name | Default | Range | Plain-English Label |
|--------|---------|---------|-------|-------------------|
| Solenoid | `SOLN:IN20:121:BCTRL` | 0.48 kG·m | [0.38, 0.50] | "Solenoid Current — Controls how strongly the beam is focused near the electron source" |
| Quad 425 | `QUAD:IN20:425:BCTRL` | -1.08 kG | [-7.56, -1.08] | "Upstream Quad — Sets the beam envelope entering the final focus" |
| Quad 441 | `QUAD:IN20:441:BCTRL` | -0.18 kG | [-1.08, 7.56] | "Upstream Quad 2 — Partners with the first to shape the beam" |
| Quad 511 | `QUAD:IN20:511:BCTRL` | 2.85 kG | [-1.08, 7.56] | "Final Focus H — The last magnet controlling horizontal beam size" |
| Quad 525 | `QUAD:IN20:525:BCTRL` | -3.22 kG | [-7.56, -1.08] | "Final Focus V — The last magnet controlling vertical beam size" |

**Outputs displayed**:
- Beam image (from Bmad simulation fed by NN outputs) — the visual centerpiece
- Beam size numbers (horizontal + vertical) — for quantitative comparison
- Possibly beam distribution plot

**Task framing**: "You're now an accelerator operator. Your job: make the beam as small and round as possible by adjusting the magnets."

### Worksheet progression

**Section A — "Explore the controls" (~10 min)**
- Set all sliders to default. Observe the beam image and record its size.
- Change ONE slider at a time. For each: "What happened to the beam? Did it get bigger, smaller, or change shape?"
- Question: "Which control seems to have the biggest effect?"

**Section B — "Understand the physics" (~15 min)**
- Guided exploration: "Set the solenoid high. Now try different quad values. What do you notice?"
- Question: "Do the controls interact with each other, or does each one act independently?"
- Question: "Can you find a setting where the beam is small horizontally but large vertically? What does that tell you about what the quads do?"

**Section C — "Optimize" (~15 min)**
- Challenge: "Find the smallest, roundest beam you can. Record your best settings and beam size."
- Question: "What strategy did you use? Random guessing? Systematic? One-at-a-time?"
- Discussion prompt: "Real operators use AI to do this optimization automatically. Why might a computer be better at this than a human?"

**Section D — "Connect back to Part 1" (~10 min)**
- "How is this webapp like the TensorFlow Playground?"
- "In the playground, the input was X/Y coordinates of dots. Here, the input is ___. In the playground, the output was orange/blue. Here, the output is ___."
- "Why did SLAC build a neural network model instead of just running the real accelerator every time someone wants to try new settings?"

### Stretch exercise: FEL Model (for fast groups)

**Model**: `lcls_fel_model` from `slaclab/LCLS_FEL_Surrogate` (235 inputs → 1 output)

**Output**: `GDET:FEE1:241:ENRC` — FEL pulse energy in mJ (displayed as large number + gauge bar)

**Inputs (10 sliders total)**:
- 5 shared with injector (SOL + 4 quads above) — these are the "connection" to Part 2a
- 5 additional high-sensitivity inputs determined by perturbation analysis at startup (likely from: undulator gaps, linac accelerator amplitudes, or downstream quads)

**Task**: "Now you're tuning the full X-ray laser. Maximize the X-ray pulse energy."
- More knobs, single number output — harder, more abstract
- Good progression from the visual injector task

### Optional chained exercise (built into webapp as a tab/mode)

**Concept**: Students see that upstream injector settings affect both the beam shape AND the final X-ray output. Shared sliders drive both models simultaneously.

**Framing**: "In the real machine, these are connected. Changing the injector settings changes everything downstream. Can you get a small beam AND strong X-rays at the same time?"

**Implementation**: Side-by-side view showing beam image (from injector+Bmad) AND FEL intensity (from FEL model), with shared sliders for inputs that overlap between the two models. Additional FEL-only sliders below.

**Note**: The injector and FEL models are independent surrogates — they don't pipe outputs to inputs. The "chaining" is achieved by shared input sliders that both models respond to, since some injector settings (SOL, quads, RF) are also inputs to the FEL model.

---

## Webapp Implementation Plan

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Browser (React + Plotly)                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐  │
│  │ Injector │  │   FEL    │  │   Combined (shared)  │  │
│  │   Tab    │  │   Tab    │  │       Tab            │  │
│  └────┬─────┘  └────┬─────┘  └──────────┬───────────┘  │
└───────┼──────────────┼───────────────────┼──────────────┘
        │ REST API     │                   │
┌───────┼──────────────┼───────────────────┼──────────────┐
│  FastAPI Backend                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Session Pool (1 instance per group)              │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐           │   │
│  │  │ Group 1 │ │ Group 2 │ │ Group 3 │ ...       │   │
│  │  │ Staged  │ │ Staged  │ │ Staged  │           │   │
│  │  │ Model + │ │ Model + │ │ Model + │           │   │
│  │  │ FEL     │ │ FEL     │ │ FEL     │           │   │
│  │  └─────────┘ └─────────┘ └─────────┘           │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Backend: FastAPI (Python)**
- Pre-creates ~6 model instances at startup (one per group + spares)
- Session routing via URL query param: `?group=1`
- Endpoints:
  - `POST /api/injector/evaluate` — slider values → particle coords (x, y) + beam sizes
  - `POST /api/fel/evaluate` — slider values → pulse intensity
  - `POST /api/combined/evaluate` — shared + FEL sliders → both outputs
  - `POST /api/reset` — reset model to defaults
- Returns JSON: `{ particles: {x: [...], y: [...]}, beam_size_x: float, beam_size_y: float }`
- Concurrency: one asyncio lock per model instance (prevents concurrent access to same Tao)

**Frontend: React + Vite + TypeScript**
- 3 tabs: Injector | FEL | Combined
- Sliders: real physics names with plain-English subtitles
- Beam image: Plotly 2D histogram (heatmap) from particle coordinates
- FEL output: large number display or gauge
- Debounced API calls (300ms after last slider change)
- Loading indicator during model evaluation
- Reset-to-defaults button

**Deployment:**
- Single Docker container (FastAPI serves built React static files)
- Deployed on SLAC cluster, accessible via lab network URL
- No authentication (group ID in URL, assigned at lab start)
- `docker-compose.yml` for easy spin-up

### Project Structure

```
webapp/
├── backend/
│   ├── main.py              # FastAPI app, CORS, static file serving
│   ├── session_pool.py      # Model instance management per group
│   ├── schemas.py           # Pydantic request/response models
│   └── requirements.txt     # FastAPI, uvicorn, virtual-accelerator, FEL model
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── src/
│       ├── App.tsx           # Tab navigation
│       ├── api/
│       │   └── client.ts    # API call helpers with debouncing
│       ├── components/
│       │   ├── InjectorPanel.tsx   # Injector tab
│       │   ├── FELPanel.tsx        # FEL tab
│       │   ├── CombinedPanel.tsx   # Side-by-side chained view
│       │   ├── BeamImage.tsx       # Plotly 2D histogram component
│       │   ├── IntensityGauge.tsx  # FEL output display
│       │   ├── SliderControl.tsx   # Reusable labeled slider
│       │   └── ScalarDisplay.tsx   # Beam size readout
│       └── config/
│           └── sliders.ts   # Slider definitions (name, label, description, min, max, default)
├── Dockerfile
├── docker-compose.yml
└── README.md
```

### Slider Configuration

Defined in a config file so they're easy to update without touching component code:

```typescript
// Example slider config
{
  id: "SOLN:IN20:121:BCTRL",
  label: "Solenoid Current",
  description: "Controls how strongly the beam is focused near the electron source",
  min: 0.38,
  max: 0.50,
  default: 0.48,
  unit: "kG·m",
  model: "both"  // appears in injector, FEL, and combined tabs
}
```

Sliders marked `"both"` appear in the Combined tab and drive both models.

### Prerequisites — Status

| # | Item | Status |
|---|------|--------|
| 1 | Injector model inputs (PVs, ranges, defaults) | DONE — SOL + quads 425, 441, 511, 525 |
| 2 | FEL model package (`lcls_fel_model` from `slaclab/LCLS_FEL_Surrogate`) | DONE — `from lcls_fel_model import load_model` |
| 3 | FEL model inputs | PARTIAL — 5 shared with injector + 5 TBD via sensitivity analysis |
| 4 | Overlapping inputs between models | DONE — all 5 injector sliders exist in FEL model |
| 5 | SLAC deployment target (server/URL) | TBD — need from you before lab day |

**Remaining before implementation can begin:**
- Sensitivity analysis script to select 5 best FEL-only sliders (will build as part of Step 1)
- Deployment target (can defer until webapp is working locally)

### Implementation Order

1. Backend: model loading + injector evaluate endpoint
2. Frontend: injector tab with sliders + beam image
3. Backend: FEL model evaluate endpoint
4. Frontend: FEL tab
5. Frontend: Combined tab (shared sliders, side-by-side display)
6. Docker packaging + deployment
7. Integration testing with real model instances

---

## Verification / Testing the Lab

Before running with students:
1. **Dry run the worksheet** with a colleague unfamiliar with ML — can they follow Part 1 without help?
2. **Test the webapp** on the actual hardware students will use (school laptops via browser)
3. **Time the worksheet** — a group of adults will be faster than 14-17 year olds, so if adults take 35 min per part, it's about right for students at 50 min
4. **Check the "aha" moments land** — does the playground progression actually produce the insight that more complexity handles harder problems?
5. **Validate the injector model** — do slider changes produce visually distinct beam images? If the differences are too subtle, students won't engage
6. **Load test the backend** — verify 5 concurrent groups hitting the API doesn't degrade response below 2s
7. **Test on target network** — ensure SLAC firewall/network allows student laptops to reach the server
