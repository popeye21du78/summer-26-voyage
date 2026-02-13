"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import Image from "next/image";

export default function LogoFade() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: false, amount: 0.2 });

  return (
    <motion.div
      ref={ref}
      className="flex justify-center py-8"
      initial={{ opacity: 0, scale: 0.88, y: 24, filter: "blur(5px)" }}
      animate={
        isInView
          ? {
              opacity: 1,
              scale: 1,
              y: 0,
              filter: "blur(0px)",
            }
          : {
              opacity: 0,
              scale: 0.88,
              y: 24,
              filter: "blur(5px)",
            }
      }
      transition={{
        duration: isInView ? 0.7 : 0.4,
        ease: isInView ? [0.34, 1.56, 0.64, 1] : [0.25, 0.46, 0.45, 0.94],
      }}
    >
      <Image
        src="/logo-2-W.png"
        alt="Voyage Voyage"
        width={280}
        height={112}
        className="h-24 w-auto object-contain drop-shadow-[0_2px_16px_rgba(0,0,0,0.06)] sm:h-28"
        unoptimized
      />
    </motion.div>
  );
}
