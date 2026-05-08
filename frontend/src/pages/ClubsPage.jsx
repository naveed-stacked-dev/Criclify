import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import publicService from "@/services/publicService";
import { Trophy, ArrowRight, Loader2, Users, Swords } from "lucide-react";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0 } };

export default function ClubsPage() {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await publicService.getClubs();
        const data = res.data?.data || res.data?.clubs || res.data || [];
        setClubs(Array.isArray(data) ? data : []);
      } catch { /* handled */ }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  return (
    <div className="min-h-screen pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-4">
          <Trophy className="w-3.5 h-3.5" /> Active Clubs
        </span>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight">
          Explore <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-400">Clubs</span>
        </h1>
        <p className="text-gray-400 mt-3 max-w-lg mx-auto">
          Discover cricket clubs, follow live matches, and track your favorite teams
        </p>
      </motion.div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      ) : clubs.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Trophy className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">No clubs available yet</p>
          <p className="text-sm mt-1">Check back soon for exciting cricket clubs</p>
        </div>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {clubs.map((club) => {
            const primary = club.theme?.primaryColor || "#1a73e8";
            const accent = club.themeColor || "#7c3aed";

            return (
              <motion.div key={club._id || club.id} variants={item}>
                <Link
                  to={`/clubs/${club.slug || club._id || club.id}`}
                  className="group block relative overflow-hidden rounded-2xl border border-white/[0.06] backdrop-blur-sm transition-all duration-500"
                  style={{
                    background: "rgba(255, 255, 255, 0.02)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = `${primary}40`;
                    e.currentTarget.style.boxShadow = `0 0 30px ${primary}15`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  {/* Banner */}
                  <div className="h-36 relative overflow-hidden">
                    {club.bannerUrl || club.theme?.bannerUrl || club.logo ? (
                      <img
                        src={club.bannerUrl || club.theme?.bannerUrl || club.logo}
                        alt={club.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                    ) : (
                      <div
                        className="w-full h-full"
                        style={{
                          background: `linear-gradient(135deg, ${primary}22, ${accent}22)`,
                        }}
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/40 to-transparent" />

                    {/* Theme Color Preview */}
                    <div className="absolute top-3 right-3 flex gap-1.5">
                      <div className="w-3 h-3 rounded-full border border-white/20" style={{ background: primary }} />
                      <div className="w-3 h-3 rounded-full border border-white/20" style={{ background: accent }} />
                    </div>
                  </div>

                  {/* Club Logo (overlapping) */}
                  <div className="absolute top-[100px] left-4">
                    <div
                      className="w-14 h-14 rounded-xl overflow-hidden border-2 shadow-lg"
                      style={{ borderColor: primary, background: "#0a0a0c" }}
                    >
                      {club.logo ? (
                        <img src={club.logo} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ background: `${primary}15` }}>
                          <Trophy className="w-6 h-6" style={{ color: primary }} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 pt-6">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors truncate">
                          {club.name}
                        </h3>
                        {club.description && (
                          <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">{club.description}</p>
                        )}
                      </div>
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ml-2 group-hover:scale-110 transition-transform"
                        style={{ background: `${primary}15` }}
                      >
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" style={{ color: primary }} />
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/5">
                      {club.activeTournaments > 0 && (
                        <div className="flex items-center gap-1.5">
                          <Swords className="w-3.5 h-3.5 text-gray-500" />
                          <span className="text-[11px] text-gray-400">
                            {club.activeTournaments} tournament{club.activeTournaments > 1 ? "s" : ""}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: primary }} />
                        <span className="text-[10px] capitalize" style={{ color: primary }}>
                          {club.sportType || "Cricket"}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
