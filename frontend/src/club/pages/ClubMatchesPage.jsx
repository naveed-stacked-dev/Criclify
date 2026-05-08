import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import { CalendarDays, Trophy, Filter } from "lucide-react";
import clubService from "../services/clubService";

/**
 * ClubMatchesPage — Comprehensive match list with filters.
 */
export default function ClubMatchesPage() {
  const { club } = useOutletContext();
  const clubId = club?._id || club?.id;
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (!clubId) return;
    const fetch = async () => {
      setLoading(true);
      try {
        const params = { limit: 50 };
        if (filter !== "all") params.status = filter;
        const res = await clubService.getMatchesByClub(clubId, params);
        setMatches(res.data?.data || []);
      } catch { /* handled */ }
      finally { setLoading(false); }
    };
    fetch();
  }, [clubId, filter]);

  const filters = [
    { key: "all", label: "All" },
    { key: "live", label: "Live" },
    { key: "upcoming", label: "Upcoming" },
    { key: "completed", label: "Completed" },
  ];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <CalendarDays className="w-5 h-5" style={{ color: "var(--club-primary)" }} />
          Matches
        </h2>
        <p className="text-sm text-gray-500 mt-1">All matches for {club?.name}</p>
      </motion.div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === f.key
                ? "text-white"
                : "text-gray-500 hover:text-gray-300 bg-white/[0.02] hover:bg-white/[0.05]"
            }`}
            style={
              filter === f.key
                ? { background: `var(--club-primary)`, boxShadow: `0 4px 15px var(--club-primary)33` }
                : {}
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Matches Grid */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
        </div>
      ) : matches.length === 0 ? (
        <div className="glass-surface p-12 text-center">
          <CalendarDays className="w-12 h-12 mx-auto mb-3 text-gray-700" />
          <p className="text-gray-500">No matches found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map((match, i) => {
            const teamA = match.teamA || {};
            const teamB = match.teamB || {};
            const winner = match.result?.winner;
            const winnerId = typeof winner === "object" ? winner?._id : winner;

            const statusColor = {
              live: "#ef4444",
              completed: "#22c55e",
              upcoming: "var(--club-primary)",
              unscheduled: "#6b7280",
              abandoned: "#f59e0b",
            };

            return (
              <motion.div
                key={match._id || i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="glass-card p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-gray-500 truncate max-w-[200px]">
                    {match.tournamentId?.name || "Tournament"}
                    {match.matchLabel ? ` • ${match.matchLabel}` : ""}
                  </span>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full font-medium capitalize"
                    style={{
                      background: `${statusColor[match.status] || "#6b7280"}15`,
                      color: statusColor[match.status] || "#6b7280",
                    }}
                  >
                    {match.status === "live" && <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 mr-1 animate-pulse" />}
                    {match.status}
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <TeamInfo team={teamA} isWinner={winnerId === (teamA._id || teamA.id)} />
                  <span className="text-gray-600 text-xs font-bold">vs</span>
                  <TeamInfo team={teamB} isWinner={winnerId === (teamB._id || teamB.id)} />
                  <div className="ml-auto text-right flex-shrink-0">
                    {match.startTime && (
                      <p className="text-[11px] text-gray-500">
                        {new Date(match.startTime).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    )}
                    {match.venue && (
                      <p className="text-[10px] text-gray-600 truncate max-w-[80px]">{match.venue}</p>
                    )}
                  </div>
                </div>

                {match.result?.summary && (
                  <p className="text-[11px] text-gray-400 mt-2 pt-2 border-t border-white/5 truncate">
                    {match.result.summary}
                  </p>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TeamInfo({ team, isWinner }) {
  return (
    <div className="flex items-center gap-2 flex-1 min-w-0">
      {team?.logo ? (
        <img src={team.logo} alt="" className="w-7 h-7 rounded-lg object-cover flex-shrink-0" />
      ) : (
        <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-[9px] font-bold text-gray-500 flex-shrink-0">
          {(team?.name || "?")[0]}
        </div>
      )}
      <span className={`text-sm truncate ${isWinner ? "text-white font-bold" : "text-gray-400 font-medium"}`}>
        {team?.name || "TBA"}
      </span>
      {isWinner && <Trophy className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--club-primary)" }} />}
    </div>
  );
}
