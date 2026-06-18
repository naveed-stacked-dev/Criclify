import React, { useRef, useState } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';

const reviews = [
  {
    name: 'Virat Sharma',
    role: 'Captain, Delhi Strikers',
    content: 'Criclify completely transformed how we manage our team. The live scoring is incredibly accurate and the analytics have given us a real competitive edge.',
    rating: 5,
    avatar: 'VS',
  },
  {
    name: 'Aisha Patel',
    role: 'Tournament Director',
    content: 'Managing 32-team tournaments used to be a nightmare. Criclify automates fixtures, standings, and even generates brackets. It&apos;s a game-changer.',
    rating: 5,
    avatar: 'AP',
  },
  {
    name: 'Ravi Kumar',
    role: 'Coach, Mumbai Academy',
    content: 'The player analytics are next level. I can track individual performance metrics across seasons and make data-driven coaching decisions.',
    rating: 5,
    avatar: 'RK',
  },
  {
    name: 'Sarah Johnson',
    role: 'League Administrator',
    content: 'We switched from spreadsheets to Criclify and haven&apos;t looked back. The platform handles everything from registrations to final standings seamlessly.',
    rating: 4,
    avatar: 'SJ',
  },
  {
    name: 'Arjun Mehta',
    role: 'Club President, Hyderabad CC',
    content: 'Our members love the real-time notifications. Every boundary, every wicket — they don&apos;t miss a thing even when they can&apos;t be at the ground.',
    rating: 5,
    avatar: 'AM',
  },
];

export default function Reviews() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const [current, setCurrent] = useState(0);

  const prev = () => setCurrent((c) => (c === 0 ? reviews.length - 1 : c - 1));
  const next = () => setCurrent((c) => (c === reviews.length - 1 ? 0 : c + 1));

  // Show 3 cards on desktop
  const getVisibleReviews = () => {
    const items = [];
    for (let i = -1; i <= 1; i++) {
      const idx = (current + i + reviews.length) % reviews.length;
      items.push({ ...reviews[idx], offset: i });
    }
    return items;
  };

  return (
    <section id="reviews" className="py-24 relative z-20 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-[#00f3ff] font-medium tracking-widest uppercase text-sm mb-3">Testimonials</p>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Trusted by{' '}
            <span className="bg-gradient-to-r from-[#00f3ff] to-[#bc13fe] bg-clip-text text-transparent">
              Champions
            </span>
          </h2>
        </motion.div>

        {/* Carousel */}
        <div className="relative">
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={prev}
              className="flex-shrink-0 w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-400" />
            </button>

            <div className="flex-1 max-w-3xl overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={current}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white/[0.03] backdrop-blur-md border border-white/[0.06] rounded-2xl p-8"
                >
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: reviews[current].rating }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-[#00f3ff] text-[#00f3ff]" />
                    ))}
                  </div>

                  <p className="text-gray-300 text-lg leading-relaxed mb-6 italic">
                    &ldquo;{reviews[current].content}&rdquo;
                  </p>

                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00f3ff] to-[#bc13fe] flex items-center justify-center text-black font-bold text-sm">
                      {reviews[current].avatar}
                    </div>
                    <div>
                      <div className="text-white font-semibold">{reviews[current].name}</div>
                      <div className="text-gray-500 text-sm">{reviews[current].role}</div>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            <button
              onClick={next}
              className="flex-shrink-0 w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Dots */}
          <div className="flex justify-center gap-2 mt-8">
            {reviews.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === current ? 'bg-[#00f3ff] w-6' : 'bg-white/20'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
