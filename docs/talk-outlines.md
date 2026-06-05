# Talk Outlines

## Talk 1: Introduction to AI (30 min)

**Audience:** 14-17 year olds in a STEM immersion program, some minimal ML exposure.
**Goal:** Build intuition for what AI/ML actually is (beyond chatbots), and set up the mental model they'll need for the lab.

### 1. What is AI, really? (5 min)

- AI today vs. science fiction (not sentient robots; it's pattern recognition)
- Machine learning = teaching computers by showing examples, not writing rules
- Quick examples they know: recommendation algorithms, image filters, voice assistants
- Key idea: ML learns the relationship between inputs and outputs from data

### 2. How does a neural network learn? (10 min)

- Analogy: a neural network is like a student learning to estimate
  - Show it thousands of examples (input, correct answer)
  - It guesses, checks how wrong it was, adjusts, repeats
- Inputs → layers of neurons → output
- Each neuron is simple (multiply, add, threshold), but together they can approximate anything
- Training = adjusting the connections until the guesses are good
- Visual: show a simple network diagram (2 inputs → hidden layer → 1 output)
- Mention: the networks at SLAC have hundreds of neurons and were trained on millions of data points

### 3. What can neural networks do? (5 min)

- Classification: "Is this image a cat or a dog?" (what you'll do in Part 1 of the lab)
- Regression: "Given these settings, what will the output be?" (what SLAC's models do)
- Generation: ChatGPT, image generators (briefly, since they know this already)
- Key point: classification and regression are the foundation; generation builds on top

### 4. AI in science (5 min)

- AI isn't just for tech companies; it's transforming how science works
- Examples beyond SLAC: protein folding (AlphaFold), weather prediction, drug discovery, astronomy
- At SLAC specifically: we use AI to model and control a particle accelerator
- Tease: "In the lab, you'll use the same neural network models we use at SLAC every day"

### 5. Key vocabulary (5 min)

- **Training data**: examples the network learns from
- **Inputs/features**: the information you give the network
- **Output/prediction**: what the network produces
- **Neurons/layers**: the building blocks and structure
- **Overfitting**: memorizing noise instead of learning patterns
- These terms will come up in the lab; you don't need to memorize them now

---

## Talk 2: Introduction to the Lab (30 min)

**Audience:** Same group, immediately before the 2-hour hands-on lab.
**Goal:** Give them just enough context about LCLS and surrogate models to make the lab meaningful. Should NOT teach them how to use the tools (they'll discover that from the worksheet).

### 1. What is LCLS? (8 min)

- LCLS = Linac Coherent Light Source, the world's brightest X-ray laser
- Located here at SLAC, 2 miles long
- Makes X-ray "flashes" a billion times brighter than a hospital X-ray
- Used to take molecular movies: watch proteins fold, batteries charge, materials form
- Show 1-2 images/videos: the facility, a sample result (molecular movie frame)
- The machine shoots electrons at nearly the speed of light, wiggles them with magnets, and the wiggling produces X-rays

### 2. Why is it hard to operate? (5 min)

- Thousands of knobs (magnet settings, RF phases, timing)
- The beam is incredibly sensitive: tiny changes in one setting ripple through the whole machine
- Running the real machine: slow (one try at a time), expensive (beam time costs ~$100K/day), risky (wrong settings can damage equipment)
- Problem: how do you find the best settings without endless trial and error?

### 3. The surrogate model idea (8 min)

- Analogy: a flight simulator vs. a real airplane
  - Pilots train on simulators because crashing a real plane is expensive
  - We built a "simulator" of the accelerator using neural networks
- How we built it:
  - Ran the real machine thousands of times with different settings
  - Recorded: "these settings → this beam shape" and "these settings → this X-ray intensity"
  - Trained a neural network on that data
  - Now the model can predict the result instantly for any settings, no real beam needed
- Two models you'll use today:
  - **Injector model**: magnet settings → beam shape (what the beam looks like at a screen)
  - **FEL model**: machine settings → X-ray pulse energy (how bright the laser is)

### 4. What you'll do in the lab (5 min)

- Part 1 (~50 min): TensorFlow Playground
  - Build your own tiny neural networks
  - See how complexity (more neurons, more layers) lets networks learn harder patterns
  - Connection: the SLAC models are just bigger versions of what you'll build
- Part 2 (~50 min): SLAC Virtual Accelerator
  - Use the actual neural network models we run at SLAC
  - Adjust magnet settings with sliders, see the beam change in real time
  - Try to optimize the beam (make it small and round)
  - Stretch: tune the full X-ray laser for maximum intensity
- Groups of 2-3, guided worksheet, no wrong answers

### 5. Logistics (4 min)

- Each group gets a laptop and worksheet
- Your group's URL: `https://lcls-lab-gN.fly.dev/` (N = your group number)
- Keep only X1 and X2 features selected in Part 1 (deselect the others)
- If your beam disappears in Part 2, just hit "Reset All"
- Ask questions anytime; raise your hand if you're stuck
- We'll regroup at the end to share what surprised you
