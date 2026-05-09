import { useState, useEffect } from "react";
import { useOutletContext, Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Swords, Calendar, Users, ChevronRight } from "lucide-react";
import clubService from "../services/clubService";

/**
 * ClubTournamentsPage — Full list of tournaments for the club.
 */
export default function ClubTournamentsPage() {
  const { club } = useOutletContext();
  const { slug } = useParams();
  const clubId = club?._id || club?.id;
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clubId) return;
    const fetch = async () => {
      try {
        const res = await clubService.getTournaments(clubId, { limit: 50 });
        setTournaments(res.data?.data || []);
      } catch { /* handled */ }
      finally { setLoading(false); }
    };
    fetch();
  }, [clubId]);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: "var(--club-text-main)" }}>
          <Swords className="w-5 h-5" style={{ color: "var(--club-primary)" }} />
          Tournaments
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--club-text-muted)" }}>All tournaments hosted by {club?.name}</p>
      </motion.div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-40 rounded-2xl" />)}
        </div>
      ) : tournaments.length === 0 ? (
        <div className="glass-surface p-12 text-center">
          <Swords className="w-12 h-12 mx-auto mb-3 text-gray-700" />
          <p className="text-gray-500">No tournaments yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tournaments.map((t, i) => (
            <motion.div
              key={t._id || t.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ scale: 1.02 }}
              className="cursor-pointer"
            >
              <Link to={`/clubs/${slug}/matches?tournamentId=${t._id}`} className="block h-full">
                <div className="glass-card p-5 h-full flex flex-col relative overflow-hidden">
                  {/* Glow accent */}
                  <div
                    className="absolute top-0 left-0 right-0 h-0.5"
                    style={{ backgroundColor: "var(--club-secondary)" }}
                  />
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-bold" style={{ color: "var(--club-text-main)" }}>{t.name}</h3>
                      <p className="text-[11px] capitalize mt-0.5" style={{ color: "var(--club-text-muted)" }}>
                        {t.type?.replace("-", " ") || "League"} • {t.format || "Round Robin"}
                      </p>
                    </div>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-medium capitalize"
                      style={{
                        background:
                          t.status === "ongoing" ? "rgba(239,68,68,0.1)" :
                          t.status === "completed" ? "rgba(107,114,128,0.1)" :
                          "rgba(34,197,94,0.1)",
                        color:
                          t.status === "ongoing" ? "#ef4444" :
                          t.status === "completed" ? "#6b7280" :
                          "#22c55e",
                      }}
                    >
                      {t.status || "upcoming"}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-[11px] mt-auto pt-3 border-t border-white/5" style={{ color: "var(--club-text-muted)" }}>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {t.startDate ? new Date(t.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "TBD"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {t.teamsCount || t.teams?.length || "–"} teams
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
