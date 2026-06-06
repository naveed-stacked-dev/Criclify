import { useState, useEffect } from "react";
import { useOutletContext, useSearchParams, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CalendarDays, Trophy, Filter, ChevronDown } from "lucide-react";
import clubService from "../services/clubService";
import { encodeId } from "../../utils/crypto";

/**
 * ClubMatchesPage — Comprehensive match list with filters.
 */
export default function ClubMatchesPage() {
  const { club, tournaments } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { slug } = useParams();
  const clubId = club?._id || club?.id;

  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  // Tournament filter state synced with URL
  const [selectedTournamentId, setSelectedTournamentId] = useState(searchParams.get("tournamentId") || "all");

  useEffect(() => {
    const tid = searchParams.get("tournamentId") || "all";
    setSelectedTournamentId(tid);
  }, [searchParams]);

  const handleTournamentChange = (tid) => {
    setSelectedTournamentId(tid);
    const newParams = new URLSearchParams(searchParams);
    if (tid === "all") {
      newParams.delete("tournamentId");
    } else {
      newParams.set("tournamentId", tid);
    }
    setSearchParams(newParams);
  };

  useEffect(() => {
    if (!clubId) return;
    const fetch = async () => {
      setLoading(true);
      try {
        const params = { limit: 50 };
        if (filter !== "all") params.status = filter;
        if (selectedTournamentId !== "all") params.tournamentId = selectedTournamentId;

        const res = await clubService.getMatchesByClub(clubId, params);
        setMatches(res.data?.data || []);
      } catch { /* handled */ }
      finally { setLoading(false); }
    };
    fetch();
  }, [clubId, filter, selectedTournamentId]);

  const filters = [
    { key: "all", label: "All" },
    { key: "live", label: "Live" },
    { key: "upcoming", label: "Upcoming" },
    { key: "completed", label: "Completed" },
  ];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: "var(--club-text-main)" }}>
            <CalendarDays className="w-5 h-5" style={{ color: "var(--club-primary)" }} />
            Matches
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--club-text-muted)" }}>All matches for {club?.name}</p>
        </div>

        {/* Tournament Filter Dropdown */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Filter By Tournament:</span>
          </div>
          <div className="relative">
            <select
              value={selectedTournamentId}
              onChange={(e) => handleTournamentChange(e.target.value)}
              className="appearance-none bg-white border border-slate-200 rounded-xl px-4 py-2 pr-10 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all cursor-pointer shadow-sm hover:border-slate-300"
              style={{ color: "var(--club-text-main)" }}
            >
              <option value="all">All Tournaments</option>
              {tournaments?.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>
        </div>
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
                whileHover={{ scale: 1.01 }}
                className="glass-card p-4 cursor-pointer hover:shadow-md transition-all"
                onClick={() => navigate(`/clubs/${slug}/matches/${match.slug || encodeId(match._id || match.id)}`)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] truncate max-w-[200px]" style={{ color: "var(--club-text-muted)" }}>
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
                  <p className="text-[11px] mt-2 pt-2 border-t border-white/5 truncate" style={{ color: "var(--club-text-muted)" }}>
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
      <span className={`text-sm truncate ${isWinner ? "font-bold" : "font-medium"}`} style={{ color: isWinner ? "var(--club-text-main)" : "var(--club-text-muted)" }}>
        {team?.name || "TBA"}
      </span>
      {isWinner && <Trophy className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--club-primary)" }} />}
    </div>
  );
}
