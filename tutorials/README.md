# p5.millefeuille Tutorials

A step-by-step guide to building a layer system for p5.js WebGL from scratch.

## Overview

This tutorial series breaks down the concepts behind **p5.millefeuille** into digestible steps. Each tutorial builds on the previous one, progressively adding features until you have a complete layer system.

## Prerequisites

- Basic knowledge of p5.js
- Familiarity with p5.js WEBGL mode
- Understanding of JavaScript classes (helpful but not required)

## Tutorial Structure

Each step includes:
- **`.js` file**: A complete, runnable p5.js sketch in global mode
- **`.md` file**: Detailed explanations, concepts, and code walkthrough

## The Steps

### [Step 1: Basic Framebuffer](tutorial_step_001.md)
**Concepts**: Offscreen rendering, framebuffers
- Create your first framebuffer
- Draw to offscreen surface
- Display framebuffer on main canvas

**You'll learn**: What framebuffers are and why they're useful

---

### [Step 2: Multiple Framebuffers](tutorial_step_002.md)
**Concepts**: Layer compositing, stacking order
- Create multiple framebuffers
- Composite them together
- Understand layer order

**You'll learn**: How to stack layers and control which appears on top

---

### [Step 3: Layer Abstraction](tutorial_step_003.md)
**Concepts**: Object-oriented design, encapsulation
- Create a Layer class
- Wrap framebuffer functionality
- Make code more reusable

**You'll learn**: How to organize layer code for better maintainability

---

### [Step 4: Layer Properties](tutorial_step_004.md)
**Concepts**: Visibility, opacity, property management
- Add visibility toggle
- Implement opacity control
- Use tint() for transparency

**You'll learn**: How to control layer appearance dynamically

---

### [Step 5: Blend Modes](tutorial_step_005.md)
**Concepts**: Blend modes, color compositing
- Implement MULTIPLY, ADD, SCREEN, SUBTRACT
- Map custom modes to p5 constants
- Create visual effects

**You'll learn**: How layers combine visually beyond simple stacking

---

### [Step 6: Layer Management](tutorial_step_006.md)
**Concepts**: System architecture, centralized control
- Create LayerSystem class
- Manage multiple layers
- Automatic z-index sorting

**You'll learn**: How to build a scalable layer management system

---

### [Step 7: Z-Index and Ordering](tutorial_step_007.md)
**Concepts**: Z-index, dynamic reordering
- Move layers up/down in stack
- Send layers to front/back
- Interactive layer control

**You'll learn**: How to dynamically reorder layers at runtime

---

### [Step 8: Masking](tutorial_step_008.md)
**Concepts**: GLSL shaders, masking, selective revealing
- Create compositor shader
- Implement layer masking
- Use grayscale masks

**You'll learn**: How to reveal parts of layers using custom shaders

---

### [Step 9: Complete System](tutorial_step_009.md)
**Concepts**: Integration, best practices, real-world usage
- Combine all features
- Build complex compositions
- Learn production patterns

**You'll learn**: How to use the complete system and extend it

---

## How to Use These Tutorials

### Option 1: Read Through
Simply read the `.md` files in order to understand the concepts.

### Option 2: Follow Along
1. Open each `.js` file in the p5.js web editor or locally
2. Read the corresponding `.md` file
3. Experiment with the code
4. Try the challenges at the end of each tutorial

### Option 3: Build From Scratch
1. Read the tutorial
2. Try to implement it yourself without looking at the code
3. Compare your solution with the provided code
4. Learn from the differences

## Running the Examples

### In p5.js Web Editor
1. Go to [editor.p5js.org](https://editor.p5js.org/)
2. Copy the code from a `.js` file
3. Run and experiment!

### Locally with p5.js
```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/2.1.1/p5.min.js"></script>
</head>
<body>
  <script src="tutorial_step_001.js"></script>
</body>
</html>
```

### Using the Library Files
```html
<script src="../lib/p5.2.1.1.js"></script>
<script src="tutorial_step_001.js"></script>
```

## Key Concepts Progression

| Step | Framebuffer | Layer Class | Properties | Blend Modes | System | Z-Index | Masking |
|------|------------|-------------|------------|-------------|--------|---------|---------|
| 1    | ✓          |             |            |             |        |         |         |
| 2    | ✓✓         |             |            |             |        |         |         |
| 3    | ✓          | ✓           |            |             |        |         |         |
| 4    | ✓          | ✓           | ✓          |             |        |         |         |
| 5    | ✓          | ✓           | ✓          | ✓           |        |         |         |
| 6    | ✓          | ✓           | ✓          | ✓           | ✓      |         |         |
| 7    | ✓          | ✓           | ✓          | ✓           | ✓      | ✓       |         |
| 8    | ✓          | ✓           | ✓          | ✓           | ✓      | ✓       | ✓       |
| 9    | ✓          | ✓           | ✓          | ✓           | ✓      | ✓       | ✓       |

## Learning Path

### Beginner Path
Focus on Steps 1-4 to understand:
- Basic framebuffer usage
- Layer organization
- Simple properties

### Intermediate Path
Complete Steps 1-7 to learn:
- Complete layer management
- Blend modes
- Dynamic reordering

### Advanced Path
Complete all steps (1-9) to master:
- Custom shaders
- Masking techniques
- Production-ready systems

## Tips for Learning

1. **Take Your Time**: Don't rush through the tutorials
2. **Experiment**: Modify the code and see what happens
3. **Break Things**: Errors teach you how things work
4. **Build Projects**: Apply what you learn to real projects
5. **Ask Questions**: Use p5.js forums and communities

## Common Questions

**Q: Do I need to know GLSL?**
A: Steps 1-7 require no shader knowledge. Step 8 introduces shaders, but the code is provided and explained.

**Q: Can I skip steps?**
A: Each step builds on previous ones. We recommend following in order.

**Q: What if I get stuck?**
A: Each tutorial includes "Try It!" challenges. Start with those before moving to the next step.

**Q: Where can I get help?**
A: Try the [p5.js forum](https://discourse.processing.org/) or open an issue on GitHub.

## What's Next?

After completing these tutorials:

1. **Use the Library**: Try the full [p5.millefeuille library](../README.md)
2. **Explore Examples**: Check out the [examples folder](../examples/)
3. **Build Projects**: Create something unique!
4. **Contribute**: Share your creations or contribute to the library

## Credits

These tutorials were created to help understand the architecture and concepts behind p5.millefeuille, a layer system for p5.js WebGL.

**Inspired by:**
- Photoshop's layer system
- Oliver Steele's p5.layers (2D version)
- p5.js community feedback

## License

These tutorials are part of the p5.millefeuille project and are licensed under LGPL-2.1.

---

Happy learning! 🎨✨

[Back to Main README](../README.md)
