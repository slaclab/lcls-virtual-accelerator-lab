# AI at the Accelerator: Lab Worksheet

**SLAC National Accelerator Laboratory**

Work in your group. Write your answers below each question. There are no wrong answers! The goal is to explore, observe, and think like a scientist. Describe what you see and what you think is happening.

---

## Part 1: Neural Network Playground (~50 min)

Open: **https://playground.tensorflow.org**

This tool lets you build and train tiny neural networks in real time. The colored dots are data points (orange and blue), and the network's job is to learn which regions are orange and which are blue.

---

### Section A: Can a single neuron learn this?

**Setup:** On the left side under "FEATURES", make sure only **X1** and **X2** are selected (deselect all others like X1², X2², etc.). Select the dataset with two clusters (bottom-left icon). Set the network to 1 hidden layer with 1 neuron. Click the Play button.

1. Watch it train. What is this single neuron doing? Describe what you see.

   _______________________________________________________________

   _______________________________________________________________

**Now:** Switch to the **circle** dataset (the one that looks like a bullseye). Keep the same 1-neuron network. Hit Play.

2. Can one neuron separate the orange from the blue? What happens?

   _______________________________________________________________

3. A single neuron can only draw one straight line to divide the space. Why doesn't a straight line work for the circle pattern?

   _______________________________________________________________

---

### Section B: Adding complexity

**Setup:** Keep the circle dataset. Now add neurons to your hidden layer: try 2, 3, then 4.

4. How many neurons did you need before the network could correctly separate the circle? ____

5. Click on individual neurons in the hidden layer. Each one shows a different colored region. What is each neuron learning?

   _______________________________________________________________

   _______________________________________________________________

6. In your own words: how do multiple neurons work together to solve a problem one neuron couldn't?

   _______________________________________________________________

   _______________________________________________________________

---

### Section C: Layers vs. neurons

**Setup:** Switch to the **spiral** dataset. This is the hardest pattern.

7. First try: 1 hidden layer with 8 neurons. Hit Play and let it train for a while. Does it work?

   _______________________________________________________________

8. Now try: 3 hidden layers with 6, 6, 4 neurons (delete the old layer, add new ones). Which setup does better on the spiral, wide and shallow or narrow and deep?

   _______________________________________________________________

9. Describe the difference between what the wide/shallow network produces vs. what the deep network produces. (Look at the output visualization on the right.)

   _______________________________________________________________

   _______________________________________________________________

**Bonus:** Crank the noise slider up to 25 or 50. Add lots of neurons.

10. What happens when you give the network too much capacity on noisy data? Does it learn the real pattern, or does it memorize the noise? (This is called **overfitting**.)

    _______________________________________________________________

---

### Section D: Connecting to real science

No new playground tasks. Just think about what you've learned.

11. Do you think the small playground-sized networks (4-8 neurons) could handle a real physics problem with thousands of parameters? Why or why not?

    _______________________________________________________________

    _______________________________________________________________

12. In the playground, the training data was colored dots. What do you think the "training data" would be for a particle accelerator model? (Hint: what would you measure from the real machine?)

    _______________________________________________________________

    _______________________________________________________________

13. What's the advantage of having a trained neural network model vs. running the real machine every time you want to test something?

    _______________________________________________________________

    _______________________________________________________________

---

## Part 2: Virtual Accelerator (~50 min)

> In Part 1, the network learned to **classify** (orange or blue, a category). The accelerator models in Part 2 do something slightly different: they predict a **number** (like beam size) from inputs. This is called **regression**. The core idea is the same: the network learns patterns from data. But instead of drawing boundaries between categories, it learns a continuous relationship between inputs and outputs.

Open the webapp your instructor provides. Click the **Injector** tab.

You are now an **accelerator operator** at SLAC's LCLS X-ray laser. The image on the right shows the electron beam's shape at a screen inside the machine. The bright spot is where the electrons hit. Your controls are magnets that squeeze and focus the beam, like using a lens to focus light.

**Your mission: Make the beam spot as small and round as possible.**

---

### Section A: Explore the controls

14. With all sliders at their default positions, record the beam size:

    Beam Size X: ________ µm &nbsp;&nbsp;&nbsp; Beam Size Y: ________ µm

15. Change **one slider at a time**. Pick the **2 sliders** that seem to have the most dramatic effect on the beam, and describe what they do:

    Slider name: __________________ What it does to the beam: __________________

    Slider name: __________________ What it does to the beam: __________________

16. Which single control has the biggest effect on beam size?

    _______________________________________________________________

---

### Section B: Understand the physics

17. Set the Solenoid to its maximum value. Now try moving the Quad sliders. What do you notice? Do the controls work the same regardless of where the Solenoid is set?

    _______________________________________________________________

    _______________________________________________________________

18. Can you find a setting where the beam is small in X but stretched out in Y (or vice versa)? Describe what you did.

    _______________________________________________________________

19. Based on what you just saw: the Solenoid focuses the beam equally in all directions. What do the Quad magnets do differently? (Hint: "quad" = four poles. They push in one direction and pull in the other.)

    _______________________________________________________________

    _______________________________________________________________

---

### Section C: Optimize!

20. Find the smallest, roundest beam you can. Record your best result:

    | Setting | Value |
    |---------|-------|
    | Solenoid Current | |
    | Upstream Quad | |
    | Upstream Quad 2 | |
    | Final Focus H | |
    | Final Focus V | |
    | **Best Beam Size X** | µm |
    | **Best Beam Size Y** | µm |

21. What strategy did your group use? (Random guessing? Changing one thing at a time? Something else?)

    _______________________________________________________________

    _______________________________________________________________

22. Real accelerator operators use AI to find the best settings automatically. Why might a computer be better at this than a human with 5 sliders?

    _______________________________________________________________

    _______________________________________________________________

---

### Section D: Connect back to Part 1

23. Both the Playground and this webapp use a neural network. What's similar about them?

    _______________________________________________________________

    _______________________________________________________________

24. Fill in the blanks:

    - In the playground, the **input** was ________________. Here, the input is ________________.
    - In the playground, the **output** was ________________. Here, the output is ________________.

25. Why did SLAC build a neural network model of the accelerator instead of just running the real machine every time?

    _______________________________________________________________

    _______________________________________________________________

---

## Stretch: FEL Tab (if you finish early)

Click the **FEL** tab. Now you're tuning the full X-ray laser. The output is a single number: **pulse energy in millijoules (mJ)**. This is how intense the X-ray beam is.

26. Maximize the X-ray pulse energy. What's the highest value your group can achieve? ________ mJ

27. This tab has more sliders than the Injector tab. Was it harder to find the best settings? Why?

    _______________________________________________________________

---

## Stretch: Combined Tab

Click the **Combined** tab. Now you can see both the beam image AND the X-ray intensity at the same time. The shared sliders affect both outputs.

28. Can you get a small beam AND strong X-rays at the same time? Or do you have to choose one or the other?

    _______________________________________________________________

29. In the real machine, the injector beam feeds into the X-ray laser. Why would a bad (large/unfocused) beam at the start lead to weak X-rays at the end?

    _______________________________________________________________

    _______________________________________________________________

---

## Wrap-up

30. What surprised you most in this lab?

    _______________________________________________________________

    _______________________________________________________________
