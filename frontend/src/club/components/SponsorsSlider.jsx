import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import clubService from "../services/clubService";
import { ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";

/**
 * SponsorsSlider — Smooth professional sponsor carousel
 * - Slow continuous auto scroll
 * - Infinite looping
 * - Pause on hover
 * - Manual navigation
 */

export default function SponsorsSlider({ clubId }) {
  const [sponsors, setSponsors] = useState([]);
  const scrollRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);
  const scrollTimeoutRef = useRef(null);

  useEffect(() => {
    if (!clubId) return;

    clubService
      .getSponsors(clubId)
      .then((res) => {
        const data = res.data?.data || [];

        // duplicate items for smooth infinite effect
        setSponsors([...data, ...data]);
      })
      .catch(() => {});
  }, [clubId]);

  /**
   * Smooth auto scroll using requestAnimationFrame
   * Much smoother than setInterval
   */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || sponsors.length === 0) return;

    let animationFrameId;
    const speed = 0.5;
    let currentScroll = el.scrollLeft;

    const autoScroll = () => {
      if (!isPaused) {
        currentScroll += speed;

        // seamless infinite loop
        if (currentScroll >= el.scrollWidth / 2) {
          currentScroll = 0;
        }

        el.scrollLeft = currentScroll;

        // Sync if user manually scrolled
        if (Math.abs(el.scrollLeft - currentScroll) > 2) {
          currentScroll = el.scrollLeft;
        }
      }

      animationFrameId = requestAnimationFrame(autoScroll);
    };

    animationFrameId = requestAnimationFrame(autoScroll);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [sponsors, isPaused]);

  /**
   * Manual controls
   */
  const scroll = (dir) => {
    if (!scrollRef.current) return;

    // Temporarily pause auto-scroll to allow smooth manual scroll
    setIsPaused(true);

    scrollRef.current.scrollBy({
      left: dir * 320,
      behavior: "smooth",
    });

    // Resume auto-scroll after a delay
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      setIsPaused(false);
    }, 2500);
  };

  if (!sponsors.length) return null;

  return (
    <section className="py-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 px-1">
        <div className="flex items-center gap-3">
          <div
            className="w-1.5 h-6 rounded-full"
            style={{ background: "var(--club-primary)" }}
          />

          <h2
            className="text-sm font-bold uppercase tracking-[0.15em]"
            style={{ color: "var(--club-text-main)" }}
          >
            Our Sponsors & Partners
          </h2>
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          <button
            onClick={() => scroll(-1)}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={() => scroll(1)}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Slider */}
      <div
        ref={scrollRef}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className="flex gap-5 overflow-x-auto hide-scrollbar"
      >
        {sponsors.map((sponsor, index) => {
          const content = (
            <div className="relative p-5 flex flex-col items-center justify-center h-full">
              {/* External Link Icon */}
              {sponsor.link && (
                <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
                </div>
              )}

              {/* Logo */}
              <div className="h-28 w-full flex items-center justify-center mb-4">
                <img
                  src={sponsor.imageUrl}
                  alt={sponsor.name || "Sponsor"}
                  className="max-h-full max-w-[85%] object-contain transition-transform duration-500 group-hover:scale-105"
                />
              </div>

              {/* Name */}
              {sponsor.name && (
                <p className="text-[13px] font-bold text-slate-700 group-hover:text-slate-900 text-center truncate w-full transition-colors">
                  {sponsor.name}
                </p>
              )}
            </div>
          );

          return (
            <motion.div
              key={`${sponsor._id}-${index}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex-shrink-0 w-[220px] bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:border-slate-200 transition-all duration-300 group cursor-pointer"
            >
              {sponsor.link ? (
                <a
                  href={
                    sponsor.link.startsWith("http")
                      ? sponsor.link
                      : `https://${sponsor.link}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block h-full"
                >
                  {content}
                </a>
              ) : (
                <div className="h-full">{content}</div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Hide Scrollbar */}
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }

        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </section>
  );
}