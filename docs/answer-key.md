# Answer Key: AI at the Accelerator

**For instructor use.** Acceptable answers are listed for each question. Students don't need to match these exactly; look for evidence of observation and reasoning.

---

## Part 1: Neural Network Playground

### Section A

**1.** "It draws a straight line between the two groups." / "It divides the space into two halves, one side is orange, the other is blue." / "It learned where the boundary is."

**2.** "No, it can't. The background stays mostly one color." / "It just draws a line through the middle and gets half of them wrong." / "The blue dots inside the circle get classified as orange."

**3.** "A straight line can't go around a circle." / "You'd need a curved boundary, but one neuron only makes straight lines." / "The circle has orange on the outside and blue on the inside; one cut can't separate that." (Note: this only works with just X1 and X2 as features. If extra features like X² are enabled, a single neuron CAN separate the circle because the feature transforms do the heavy lifting.)

**Instructor note: "What if a student selects extra features (X², sin, etc.) and it works with one neuron?"** That's actually a great observation! Explain: "You're right, it works! That's because X² transforms the data into a shape a straight line CAN cut. You're basically doing the network's job for it by telling it what math to use. The point of adding neurons and layers is that the network figures this out on its own, with no hints needed."

### Section B

**4.** Typically **3-4 neurons** are needed. Accept 2-5 (depends on luck and training time).

**5.** "Each neuron learns a different line/boundary." / "One sees the top half, another sees the left side." / "They each carve out a different region." / "Each one looks at the data from a different angle."

**6.** "Each neuron handles one piece of the problem, and together they combine to make a curve." / "They vote; if enough neurons say 'blue', it's blue." / "One neuron can't draw a circle, but 4 straight lines together can approximate one."

### Section C

**7.** "Kind of, but not very well." / "It gets some of the spiral but misses the tight curves." / "It works for the outer parts but not the center." (8 neurons in 1 layer usually struggles with the spiral.)

**8.** "The deep one (6,6,4) works better." / "Multiple layers handled the spiral shape; the single wide layer couldn't get the tight curves." (Typically true. 3 layers of 6,6,4 fits the spiral; 1 layer of 8 struggles with the inner curves.)

**Instructor note: "Why doesn't even deeper work better?"** A student may try 6+ layers and find it performs worse. This is a real phenomenon. Simple explanation for students: "Think of it like a game of telephone. The more people in the chain, the more the message gets garbled. With too many layers, the learning signal (which flows backward through the network) gets weaker and weaker until the first layers can barely learn at all. Three layers is the sweet spot for this tool. Real-world networks that go deeper (50+ layers) use special tricks like 'shortcuts' that let the signal skip over layers, but this playground doesn't have those."

**Instructor note: "Why is the training glitching/flickering?"** Students may notice the boundary visualization jumping around and the loss spiking during training, especially with deeper networks. This is the learning rate being too high. Simple explanation: "The learning rate controls how big of a step the network takes each time it adjusts. Imagine trying to park a car; if you only stomp on the gas, you'll overshoot back and forth. A smaller, gentler step gets you there smoothly." Fix: lower the learning rate dropdown from 0.03 to 0.01 or 0.003. Training becomes smoother but takes longer to converge.

**9.** "The deep network makes smoother, more complex shapes. The shallow one looks blocky/choppy." / "The deep network curves around the spiral; the wide one makes straight-edged regions." / "More layers means more steps of processing, so it can build more complex boundaries."

**10.** "It memorizes every single dot including the noisy ones." / "The boundary gets really squiggly and complicated." / "It works perfectly on the training data but the pattern doesn't look like the real underlying shape." / "It's like studying for a test by memorizing answers instead of understanding the material."

### Section D

**11.** "No way, you'd need hundreds or thousands of neurons." / "A real accelerator has thousands of inputs, so the network would need to be way bigger." / "The spiral was hard with 8 neurons, so a real machine would need a much bigger network." (The actual LCLS FEL model uses ~500 neurons across 8 layers.)

**12.** "Measurements from running the actual accelerator: what settings you used and what came out." / "You'd record the magnet settings as inputs and the beam properties as outputs." / "Data from the real machine, like running it thousands of times with different settings and recording what happened."

**13.** "It's way faster; you can test settings instantly instead of waiting." / "It's cheaper/safer; you don't have to use real beam time." / "You can try millions of combinations without breaking anything." / "The real machine can only run one experiment at a time, but the model can predict results instantly."

---

## Part 2: Virtual Accelerator

### Section A

**14.** Values will vary. Typical defaults: Beam Size X ≈ 300-400 µm, Beam Size Y ≈ 100-200 µm.

**15.** Accept any two sliders with reasonable observations. Typical answers:
- "Final Focus H: made the beam wide/narrow in the horizontal direction"
- "Final Focus V: stretched or squeezed the beam vertically"
- "Solenoid: made everything bigger or smaller overall"

**16.** Usually "Final Focus H" or "Final Focus V" (quads 511/525; they're closest to the screen and have the widest range). Accept "Solenoid" if they explain why.

### Section B

**17.** "When the Solenoid is high, the Quads have a different effect than when it's low." / "The same Quad setting gives a different beam depending on where the Solenoid is." / "They interact; it's not just adding effects together."

**18.** "Yes, I turned up Final Focus H and down Final Focus V." / "I found a setting where X was tiny but Y was huge." (Any setting that produces an elongated beam.)

**19.** "The Solenoid focuses equally in both directions (like squeezing a ball), but the Quads focus in one direction and stretch in the other." / "Quads are like squeezing a balloon; it gets thinner one way but fatter the other way." / "They're directional; they work on X and Y independently." (The key insight is that quads are asymmetric focusing elements.)

### Section C

**20.** Values vary. Good results: both beam sizes under 200 µm. Excellent: under 100 µm. The exact optimum depends on model behavior.

**21.** Any strategy is acceptable. Common answers:
- "We tried random settings first, then zeroed in on what worked."
- "We changed one slider at a time and kept the good changes."
- "We noticed the last two sliders (Final Focus) mattered most, so we focused on those."
- "Trial and error; we just kept trying until it got smaller."

**22.** "A computer can try thousands of combinations per second." / "It doesn't get tired or frustrated." / "It can be systematic and try every possible combination." / "With 5 sliders, there are too many combinations for a human to try, but a computer can explore them all." / "It can use math to figure out which direction to move each slider." (Real answer: Bayesian optimization or gradient-based methods explore the space efficiently.)

### Section D

**23.** "Both use neural networks that take inputs and produce outputs." / "In both cases, the network was trained on data to learn a pattern." / "The playground network learned to classify dots; this one learned to predict beam shapes." / "Both are function approximators; they learn the relationship between inputs and outputs."

**24.**
- Input: "X and Y coordinates of the dots" → "Magnet settings (solenoid current, quad strengths)"
- Output: "Orange or blue classification" → "Beam image / beam size"

**25.** "Running the real accelerator takes time and costs money." / "You can't try thousands of settings on the real machine; it would take days." / "The model gives you the answer in less than a second; the real machine might take minutes." / "It's safer; bad settings on the real machine could damage equipment." / "Scientists can use the model to explore without needing beam time."

---

## Stretch: FEL Tab

**26.** Typical achievable maximum: 1.5–3.0 mJ. Accept anything above 1.0 mJ as a reasonable optimization result.

**27.** "Yes, harder; more sliders means more combinations to try." / "It was harder because I couldn't see the effect as clearly, just a number going up or down." / "With the beam image I could see what was happening, but with just a number it's harder to know which direction to go."

---

## Stretch: Combined Tab

**28.** "Sort of; there's a sweet spot where both are decent, but the absolute best beam doesn't give the absolute best X-rays." / "Yes, we found settings that gave both." / "We had to compromise a little." (The answer depends on the specific model behavior in the restricted range.)

**29.** "If the beam is big and spread out, the electrons aren't concentrated enough to produce strong X-rays." / "The X-ray laser needs a tight, focused beam to work well; a messy beam makes weak light." / "It's like trying to start a fire with a magnifying glass; you need to focus the light into a tiny spot." / "Garbage in, garbage out; bad beam quality propagates through the whole machine."

---

## Wrap-up

**30.** No wrong answer. Look for genuine reflection. Common responses:
- "I didn't know neural networks could model real physics."
- "It surprised me how sensitive the beam is to small changes."
- "I thought AI was just for chatbots; I didn't know it was used in science."
- "The optimization part was harder than I expected."
- "It was cool to see how a real accelerator works."
