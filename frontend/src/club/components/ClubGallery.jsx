import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useOutletContext } from "react-router-dom";
import clubService from "../services/clubService";
import { X, Images, ArrowRight } from "lucide-react";

/**
 * ClubGallery — Right-column photo gallery grid with tournament/match filters.
 * Features a masonry-like grid, hover zoom, and a lightbox.
 */
export default function ClubGallery({ clubId }) {
  const { club } = useOutletContext();
  const [gallery, setGallery] = useState([]);
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    if (!clubId) return;
    clubService
      .getGallery(clubId, {})
      .then((res) => setGallery(res.data?.data || []))
      .catch(() => { });
  }, [clubId]);

  if (!gallery.length) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 px-1 mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-1 h-5 rounded-full"
            style={{ background: "var(--club-primary)" }}
          />
          <h2
            className="text-sm font-bold uppercase tracking-[0.15em]"
            style={{ color: "var(--club-text-main)" }}
          >
            Gallery
          </h2>
        </div>
        <div className="flex justify-end">
          <Link
            to={`/clubs/${club?.slug}/gallery`}
            className="flex items-center gap-1 text-sm underline"
          >
            See All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 grid-rows-3 gap-1 sm:gap-2 h-[500px]">
        <AnimatePresence mode="popLayout">
          {gallery.slice(0, 9).map((img, i) => (
            <motion.div
              key={img._id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: i * 0.03 }}
              className="group relative rounded-xl overflow-hidden bg-slate-100 cursor-pointer shadow-sm hover:shadow-lg transition-shadow"
              onClick={() => setLightbox(img)}
            >
              <img
                src={img.imageUrl}
                alt={img.caption || ""}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>


      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-6"
            onClick={() => setLightbox(null)}
          >
            <button
              className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors z-10"
              onClick={() => setLightbox(null)}
            >
              <X className="w-7 h-7" />
            </button>
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={lightbox.imageUrl}
              alt={lightbox.caption || ""}
              className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            {lightbox.caption && (
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/60 px-4 py-2 rounded-full">
                <p className="text-xs text-white font-medium">{lightbox.caption}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
