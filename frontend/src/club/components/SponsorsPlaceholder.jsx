import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

/**
 * SponsorsPlaceholder — Empty premium glassmorphism section for future sponsors.
 */
export default function SponsorsPlaceholder() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="glass-surface p-6 mt-8"
    >
      <div className="flex items-center gap-2 mb-5">
        <Sparkles className="w-4 h-4" style={{ color: "var(--club-primary)" }} />
        <h3 className="text-base font-bold text-white">Sponsors</h3>
      </div>

      {/* Placeholder Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-20 rounded-xl border border-dashed border-white/10 flex items-center justify-center text-gray-700 text-xs"
          >
            Sponsor {i}
          </div>
        ))}
      </div>

      <p className="text-center text-[11px] text-gray-600 mt-4">
        Sponsor slots coming soon
      </p>
    </motion.div>
  );
}
