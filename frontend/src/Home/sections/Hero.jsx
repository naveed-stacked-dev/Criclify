import React, { useRef } from 'react';
import { motion, useTransform } from 'framer-motion';
import useScrollAnimation from '../hooks/useScrollAnimation';

export default function Hero() {
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScrollAnimation({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });

  // Parallax values
  const textY = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  return (
    <section
      ref={sectionRef}
      id="home"
      className="relative min-h-screen flex items-center overflow-hidden"
    >
      {/* Gradient background effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#00f3ff]/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#bc13fe]/10 rounded-full blur-[100px]" />
      </div>

      {/* Full-width content — 3D ball is rendered by the global FloatingBall overlay */}
      <div className="max-w-7xl mx-auto px-6 w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-center relative z-10">
        {/* Left — Spacer for the bat/ball 3D overlay area */}
        <div className="h-[500px] lg:h-[600px] relative order-2 lg:order-1" />

        {/* Right — Text Content */}
        <motion.div
          className="order-1 lg:order-2 will-change-transform"
          style={{ y: textY, opacity }}
        >
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-[#00f3ff] font-medium tracking-widest uppercase text-sm mb-4 will-change-transform"
          >
            Next-Gen Cricket Platform
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6 will-change-transform"
          >
            Manage Cricket{' '}
            <span className="bg-gradient-to-r from-[#00f3ff] to-[#bc13fe] bg-clip-text text-transparent">
              Like Never Before
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="text-gray-400 text-lg mb-8 max-w-md will-change-transform"
          >
            From live scoring to tournament management and deep analytics — 
            Criclify is the all-in-one platform powering modern cricket.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="flex flex-wrap gap-4 will-change-transform"
          >
            <button className="bg-gradient-to-r from-[#00f3ff] to-[#bc13fe] text-black font-semibold px-8 py-3 rounded-full shadow-[0_0_20px_rgba(0,243,255,0.3)] hover:shadow-[0_0_30px_rgba(188,19,254,0.5)] transition-all hover:scale-105">
              Get Started Free
            </button>
            <button className="border border-white/20 text-white font-medium px-8 py-3 rounded-full hover:bg-white/5 transition-all hover:border-white/40">
              Watch Demo
            </button>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="flex gap-8 mt-12 will-change-opacity"
          >
            {[
              { value: '50K+', label: 'Matches' },
              { value: '200+', label: 'Clubs' },
              { value: '99.9%', label: 'Uptime' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-gray-500 text-sm">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
