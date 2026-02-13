"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

type HandwrittenTitleProps = {
  id: string;
  children: string;
  className?: string;
};

export default function HandwrittenTitle({ id, children, className = "" }: HandwrittenTitleProps) {
  const ref = useRef<HTMLHeadingElement>(null);
  const isInView = useInView(ref, { once: false, amount: 0.3 });
  const chars = Array.from(children);

  return (
    <h2
      id={id}
      ref={ref}
      className={`mb-4 text-2xl text-[#333333] md:text-3xl [font-family:var(--font-homemade-apple)] ${className}`}
    >
      {chars.map((char, i) => (
        <motion.span
          key={`${id}-${i}-${char}`}
          initial={{ opacity: 0, y: 8 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
          transition={{
            duration: 0.25,
            delay: i * 0.04,
            ease: [0.25, 0.1, 0.25, 1],
          }}
          style={{ display: char === " " ? "inline" : "inline-block" }}
        >
          {char}
        </motion.span>
      ))}
    </h2>
  );
}
