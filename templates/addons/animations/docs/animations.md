# Animations & Motion Plugin

This addon adds Motion (formerly Framer Motion) integration with pre-built animation presets and variants.

## Features

- **Pre-built variants** for common animations (fade, slide, scale, stagger)
- **Entrance animations** for elements entering the viewport
- **Exit animations** for smooth transitions
- **Container animations** for staggering child elements
- **Modal and dialog animations**
- **Page transition animations**
- **Loading and spinner animations**

## Usage

### Basic Fade Animation

```tsx
import { motion } from "motion/react";
import { fadeInVariants } from "@/lib/animations";

export function FadingElement() {
  return (
    <motion.div
      variants={fadeInVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      Content fades in
    </motion.div>
  );
}
```

### Slide Up Animation

```tsx
import { motion } from "motion/react";
import { slideInUpVariants } from "@/lib/animations";

export function SlidingCard() {
  return (
    <motion.div
      variants={slideInUpVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
    >
      Card slides up into view
    </motion.div>
  );
}
```

### Staggered List Animation

```tsx
import { motion } from "motion/react";
import { listContainerVariants, listItemVariants } from "@/lib/animations";

export function AnimatedList() {
  return (
    <motion.ul
      variants={listContainerVariants}
      initial="hidden"
      animate="visible"
    >
      {items.map((item) => (
        <motion.li
          key={item.id}
          variants={listItemVariants}
        >
          {item.name}
        </motion.li>
      ))}
    </motion.ul>
  );
}
```

### Modal Animation

```tsx
import { motion, AnimatePresence } from "motion/react";
import { modalBackdropVariants, modalContentVariants } from "@/lib/animations";

export function Modal({ isOpen, onClose }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            variants={modalBackdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
            className="fixed inset-0 bg-black/50"
          />
          <motion.div
            variants={modalContentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-lg"
          >
            Modal Content
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

## Available Variants

### Fade Animations
- `fadeInVariants` — Simple fade in/out
- `fadeInUpVariants` — Fade in from below
- `fadeInDownVariants` — Fade in from above
- `fadeInLeftVariants` — Fade in from left
- `fadeInRightVariants` — Fade in from right

### Slide Animations
- `slideInUpVariants` — Slide up into view
- `slideInDownVariants` — Slide down into view
- `slideInLeftVariants` — Slide in from left
- `slideInRightVariants` — Slide in from right

### Scale Animations
- `scaleInVariants` — Scale up animation

### Container Animations
- `containerVariants` — Stagger children animations
- `listContainerVariants` — List stagger
- `listItemVariants` — List item fade+slide

### Dialog/Modal
- `modalBackdropVariants` — Backdrop fade
- `modalContentVariants` — Modal content scale + fade

### Page Transitions
- `pageEnterVariants` — Page fade in

### Loading States
- `pulseVariants` — Pulsing opacity
- `rotateVariants` — Continuous rotation for spinners

## Best Practices

1. **Use `whileInView`** for animations triggered on scroll:
   ```tsx
   <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" />
   ```

2. **Combine with `AnimatePresence`** for exit animations
3. **Use `staggerChildren`** for coordinated animations
4. **Keep durations consistent** (200-400ms) for snappy UX
5. **Test with `prefers-reduced-motion`** for accessibility

## Disable Animations for Accessibility

Respect user preferences:

```tsx
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const variants = prefersReducedMotion ? { hidden: {}, visible: {} } : fadeInVariants;
```

## Resources

- [Motion Documentation](https://motion.dev/)
- [Motion Component API](https://motion.dev/docs/react-motion-component)
- [Variants & Transitions](https://motion.dev/docs/react-transitions)
