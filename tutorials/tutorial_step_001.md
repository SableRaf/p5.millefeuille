# Tutorial Step 1: Basic Framebuffer

## Concept: What is a Framebuffer?

A **framebuffer** is an offscreen drawing surface - think of it as an invisible canvas where you can draw content before displaying it on the main canvas. This is the fundamental building block of a layer system.

## Why Use Framebuffers?

- **Offscreen rendering**: Draw complex graphics without affecting the main canvas
- **Caching**: Render once, display multiple times for better performance
- **Compositing**: Combine multiple rendered surfaces together
- **Post-processing**: Apply effects to pre-rendered content

## Code Walkthrough

### 1. Creating a Framebuffer

```javascript
myFramebuffer = createFramebuffer({ width: 400, height: 300 });
```

This creates an offscreen drawing surface with specified dimensions. The framebuffer has its own drawing context, separate from the main canvas.

### 2. Drawing to the Framebuffer

```javascript
myFramebuffer.begin();
// All drawing commands here go to the framebuffer
background(100, 150, 200);
box(100);
myFramebuffer.end();
```

The `.begin()` and `.end()` methods redirect drawing commands:
- **begin()**: Start drawing to the framebuffer
- **end()**: Stop drawing to the framebuffer, return to main canvas

### 3. Displaying the Framebuffer

```javascript
image(myFramebuffer, x, y);
```

The framebuffer acts like an image that you can display on the main canvas using the `image()` function.

## Key Concepts

- **Offscreen rendering**: The framebuffer is not visible until you explicitly draw it
- **Separate context**: What you draw to the framebuffer doesn't affect the main canvas
- **Reusable**: You can draw to the framebuffer once and display it multiple times

## What's Next?

In Step 2, we'll create multiple framebuffers and composite them together - the foundation of a layer system!

## Try It!

- Change the framebuffer size
- Draw different shapes or patterns to the framebuffer
- Display the framebuffer multiple times in different positions
- Try animating the content inside the framebuffer
