/**
 * Animation variants and presets using Motion.
 * These can be used with the motion component: <motion.div variants={fadeIn}>
 */

export const fadeInVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

export const fadeInUpVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
  exit: { opacity: 0, y: 20, transition: { duration: 0.2 } },
};

export const fadeInDownVariants = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.2 } },
};

export const fadeInLeftVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeOut" } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.2 } },
};

export const fadeInRightVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeOut" } },
  exit: { opacity: 0, x: 20, transition: { duration: 0.2 } },
};

export const scaleInVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: "easeOut" } },
  exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } },
};

export const slideInUpVariants = {
  hidden: { y: 40 },
  visible: { y: 0, transition: { duration: 0.4, ease: "easeOut" } },
  exit: { y: 40, transition: { duration: 0.2 } },
};

export const slideInDownVariants = {
  hidden: { y: -40 },
  visible: { y: 0, transition: { duration: 0.4, ease: "easeOut" } },
  exit: { y: -40, transition: { duration: 0.2 } },
};

export const slideInLeftVariants = {
  hidden: { x: -40 },
  visible: { x: 0, transition: { duration: 0.4, ease: "easeOut" } },
  exit: { x: -40, transition: { duration: 0.2 } },
};

export const slideInRightVariants = {
  hidden: { x: 40 },
  visible: { x: 0, transition: { duration: 0.4, ease: "easeOut" } },
  exit: { x: 40, transition: { duration: 0.2 } },
};

export const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

export const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

// Stagger variants for lists
export const listContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export const listItemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0 },
};

// Modal / Dialog animations
export const modalBackdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

export const modalContentVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.2, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: { duration: 0.15 },
  },
};

// Page transition animations
export const pageEnterVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

// Pulse animation for loading states
export const pulseVariants = {
  hidden: { opacity: 0.6 },
  visible: {
    opacity: 1,
    transition: {
      duration: 1.5,
      repeat: Number.POSITIVE_INFINITY,
      repeatType: "reverse",
    },
  },
};

// Rotate animation for spinners
export const rotateVariants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Number.POSITIVE_INFINITY,
      ease: "linear",
    },
  },
};
