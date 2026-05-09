import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOutletContext } from "react-router-dom";
import clubService from "../services/clubService";
import { X, Images, ChevronDown } from "lucide-react";

export default function ClubGalleryPage() {
  const { club } = useOutletContext();
  const clubId = club?._id || club?.id;

  const [gallery, setGallery] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [matches, setMatches] = useState([]);

  const [filterTournament, setFilterTournament] = useState("");
  const [filterMatch, setFilterMatch] = useState("");
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!clubId) return;
    clubService
      .getTournaments(clubId)
      .then((res) => {
        const data = res.data?.data || [];
        setTournaments(data);
        if (data.length > 0 && !filterTournament) {
          setFilterTournament(data[0]._id);
        }
      })
      .catch(() => {});
  }, [clubId]);

  useEffect(() => {
    if (!clubId) return;
    const params = {};
    if (filterTournament) params.tournamentId = filterTournament;
    if (filterMatch) params.matchId = filterMatch;

    clubService
      .getGallery(clubId, params)
      .then((res) => setGallery(res.data?.data || []))
      .catch(() => {});
  }, [clubId, filterTournament, filterMatch]);

  useEffect(() => {
    if (filterTournament) {
      clubService
        .getMatchesByTournament(filterTournament)
        .then((res) => {
          const data = res.data?.data || [];
          setMatches(data);
          if (data.length > 0) {
            setFilterMatch(data[0]._id);
          } else {
            setFilterMatch("");
          }
        })
        .catch(() => {});
    } else {
      setMatches([]);
      setFilterMatch("");
    }
  }, [filterTournament]);

  return (
    <div className="space-y-8 py-4">
      {/* Header */}
      <div className="flex flex-col items-center text-center space-y-2 mb-8">
        <Images className="w-10 h-10 mb-2" style={{ color: "var(--club-primary)" }} />
        <h1 className="text-3xl font-bold" style={{ color: "var(--club-text-main)" }}>
          Photo Gallery
        </h1>
        <p className="text-gray-500 max-w-lg">
          Explore moments from our latest tournaments and matches.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm max-w-3xl mx-auto">
        <div className="relative min-w-[200px]">
          <select
            value={filterTournament}
            onChange={(e) => {
              setFilterTournament(e.target.value);
              setFilterMatch("");
            }}
            className="w-full appearance-none text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 pr-10 text-slate-700 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 cursor-pointer"
          >
            <option value="">All Tournaments</option>
            {tournaments.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>

        {filterTournament && matches.length > 0 && (
          <div className="relative min-w-[200px]">
            <select
              value={filterMatch}
              onChange={(e) => setFilterMatch(e.target.value)}
              className="w-full appearance-none text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 pr-10 text-slate-700 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 cursor-pointer"
            >
              <option value="">All Matches</option>
              {matches.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.title || `${m.teamA?.name || "TBA"} vs ${m.teamB?.name || "TBA"}`}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        )}

        {(filterTournament || filterMatch) && (
          <button
            onClick={() => {
              setFilterTournament("");
              setFilterMatch("");
            }}
            className="text-sm font-semibold text-slate-500 hover:text-red-500 transition-colors px-3 py-2"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <AnimatePresence mode="popLayout">
          {gallery.map((img, i) => (
            <motion.div
              key={img._id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: (i % 10) * 0.05 }}
              className="group relative aspect-square rounded-2xl overflow-hidden bg-slate-100 cursor-pointer shadow-sm hover:shadow-xl transition-all"
              onClick={() => setLightbox(img)}
            >
              <img
                src={img.imageUrl}
                alt={img.caption || ""}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                {img.caption && (
                  <p className="text-sm text-white font-medium line-clamp-2">
                    {img.caption}
                  </p>
                )}
                {img.tournamentId?.name && (
                  <p className="text-[11px] text-white/70 mt-1 truncate">
                    {img.tournamentId.name}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {gallery.length === 0 && (
        <div className="text-center py-24 text-slate-400 text-sm flex flex-col items-center gap-3">
          <Images className="w-12 h-12 text-slate-200" />
          <p className="text-base text-slate-500">No photos found for this filter.</p>
        </div>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6 backdrop-blur-sm"
            onClick={() => setLightbox(null)}
          >
            <button
              className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors z-10"
              onClick={() => setLightbox(null)}
            >
              <X className="w-10 h-10" />
            </button>
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={lightbox.imageUrl}
              alt={lightbox.caption || ""}
              className="max-w-full max-h-[85vh] rounded-xl shadow-2xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            {lightbox.caption && (
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur px-6 py-3 rounded-full max-w-[90vw]">
                <p className="text-sm text-white font-medium text-center">{lightbox.caption}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
