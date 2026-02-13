"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import Image from "next/image";

export default function LogoFade() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  return (
    <motion.div
      ref={ref}
      className="flex justify-center py-8"
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <Image
        src="/logo-2-W.png"
        alt="Voyage Voyage"
        width={280}
        height={112}
        className="h-24 w-auto object-contain sm:h-28"
        unoptimized
      />
    </motion.div>
  );
}
