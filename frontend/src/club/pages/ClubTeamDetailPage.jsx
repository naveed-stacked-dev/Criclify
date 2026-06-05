import { useState, useEffect, useMemo } from "react";
import { useParams, useOutletContext, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Users, Trophy, Calendar, TrendingUp,
  Shield, CheckCircle2, XCircle, Minus, Filter, ChevronDown
} from "lucide-react";
import clubService from "../services/clubService";

export default function ClubTeamDetailPage() {
  const { slug, teamId } = useParams();
  const { club } = useOutletContext();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTournament, setSelectedTournament] = useState("all");
  const [showTournamentDrop, setShowTournamentDrop] = useState(false);

  useEffect(() => {
    if (!teamId) return;
    setLoading(true);
    clubService
      .getTeam(teamId)
      .then((res) => setData(res.data?.data || null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [teamId]);

  // Derive unique tournaments from the matches array
  const tournaments = useMemo(() => {
    if (!data?.matches) return [];
    const seen = new Map();
    data.matches.forEach(m => {
      const t = m.tournamentId;
      if (t?._id && !seen.has(t._id)) seen.set(t._id, t);
    });
    return Array.from(seen.values());
  }, [data]);

  // Filter matches by selected tournament
  const filteredMatches = useMemo(() => {
    if (!data?.matches) return [];
    if (selectedTournament === "all") return data.matches;
    return data.matches.filter(m => {
      const tId = m.tournamentId?._id?.toString() || m.tournamentId?.toString();
      return tId === selectedTournament;
    });
  }, [data, selectedTournament]);

  // Derive stats from filtered matches
  const filteredStats = useMemo(() => {
    const completed = filteredMatches.filter(m => m.status === "completed");
    const won = completed.filter(m => {
      const w = m.result?.winner;
      if (!w) return false;
      return (w._id?.toString() || w.toString()) === teamId;
    }).length;
    const tied = completed.filter(m => !m.result?.winner).length;
    return {
      played: completed.length,
      won,
      lost: completed.length - won - tied,
      tied,
    };
  }, [filteredMatches, teamId]);

  const winPct = filteredStats.played > 0
    ? Math.round((filteredStats.won / filteredStats.played) * 100)
    : 0;

  const fmtTournament = (t) =>
    t.type ? `${t.name} (${t.type.charAt(0).toUpperCase() + t.type.slice(1)})` : t.name;

  const selectedTournamentName = selectedTournament === "all"
    ? "All Tournaments"
    : (() => { const t = tournaments.find(t => t._id?.toString() === selectedTournament); return t ? fmtTournament(t) : "All Tournaments"; })();

  if (loading) return <LoadingSkeleton />;
  if (!data) return (
    <div className="glass-surface p-12 text-center">
      <Shield className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: "var(--club-primary)" }} />
      <p style={{ color: "var(--club-text-muted)" }}>Team not found.</p>
      <button onClick={() => navigate(-1)} className="mt-4 text-sm font-semibold" style={{ color: "var(--club-primary)" }}>
        ← Go back
      </button>
    </div>
  );

  const { team, stats, players } = data;
  const createdDate = team.createdAt
    ? new Date(team.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : null;

  return (
    <div className="space-y-6">
      {/* Back */}
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm font-medium"
        style={{ color: "var(--club-text-muted)" }}
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </motion.button>

      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-surface p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {team.logo ? (
            <img src={team.logo} alt={team.name} className="w-20 h-20 rounded-2xl object-cover border-2 shrink-0" style={{ borderColor: "var(--club-border)" }} />
          ) : (
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black text-white shrink-0" style={{ backgroundColor: team.color || "var(--club-primary)" }}>
              {(team.name || "T")[0]}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black truncate" style={{ color: "var(--club-text-main)" }}>{team.name}</h1>
              {team.shortName && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${team.color || "var(--club-primary)"}20`, color: team.color || "var(--club-primary)" }}>
                  {team.shortName}
                </span>
              )}
            </div>
            <div className="flex items-center flex-wrap gap-3 mt-2">
              {createdDate && (
                <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--club-text-muted)" }}>
                  <Calendar className="w-3.5 h-3.5" />Founded {createdDate}
                </span>
              )}
              <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--club-text-muted)" }}>
                <Users className="w-3.5 h-3.5" />
                {stats.playerCount} player{stats.playerCount !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tournament filter — only shown when there are multiple tournaments */}
      {tournaments.length > 1 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }} className="relative">
          <button
            onClick={() => setShowTournamentDrop(v => !v)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all w-full sm:w-auto"
            style={{
              backgroundColor: selectedTournament !== "all" ? `${team.color || "var(--club-primary)"}15` : "var(--club-surface-2)",
              borderColor: selectedTournament !== "all" ? (team.color || "var(--club-primary)") : "var(--club-border)",
              color: selectedTournament !== "all" ? (team.color || "var(--club-primary)") : "var(--club-text-main)",
            }}
          >
            <Filter className="w-3.5 h-3.5" />
            {selectedTournamentName}
            <ChevronDown className={`w-3.5 h-3.5 ml-auto transition-transform ${showTournamentDrop ? "rotate-180" : ""}`} />
          </button>

          <AnimatePresence>
            {showTournamentDrop && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="absolute z-20 mt-2 min-w-55 rounded-xl border shadow-xl overflow-hidden"
                style={{ backgroundColor: "var(--club-surface-2)", borderColor: "var(--club-border)" }}
              >
                {[{ _id: "all", name: "All Tournaments", type: null }, ...tournaments].map(t => {
                  const id = t._id === "all" ? "all" : t._id?.toString();
                  const isActive = selectedTournament === id;
                  return (
                    <button
                      key={id}
                      onClick={() => { setSelectedTournament(id); setShowTournamentDrop(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2"
                      style={{
                        backgroundColor: isActive ? `${team.color || "var(--club-primary)"}12` : "transparent",
                        color: isActive ? (team.color || "var(--club-primary)") : "var(--club-text-main)",
                      }}
                    >
                      {isActive && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: team.color || "var(--club-primary)" }} />}
                      <span>{t.name}</span>
                      {t.type && (
                        <span className="text-[10px] opacity-60 capitalize">({t.type})</span>
                      )}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Stats grid — driven by filteredStats */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Matches", value: filteredStats.played, icon: Trophy, color: "var(--club-primary)" },
          { label: "Won", value: filteredStats.won, icon: CheckCircle2, color: "#10b981" },
          { label: "Lost", value: filteredStats.lost, icon: XCircle, color: "#ef4444" },
          { label: "Tied", value: filteredStats.tied, icon: Minus, color: "#f59e0b" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass-card p-4 text-center">
            <Icon className="w-5 h-5 mx-auto mb-2" style={{ color }} />
            <p className="text-2xl font-black" style={{ color }}>{value}</p>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--club-text-muted)" }}>{label}</p>
          </div>
        ))}
      </motion.div>

      {/* Win rate — driven by filteredStats */}
      {filteredStats.played > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-surface p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4" style={{ color: "var(--club-primary)" }} />
            <h2 className="text-sm font-bold" style={{ color: "var(--club-text-main)" }}>Win Rate</h2>
            <span className="ml-auto text-sm font-black" style={{ color: "var(--club-primary)" }}>{winPct}%</span>
          </div>
          <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: "var(--club-border)" }}>
            <motion.div
              key={`${selectedTournament}-${winPct}`}
              initial={{ width: 0 }}
              animate={{ width: `${winPct}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{ backgroundColor: "var(--club-primary)" }}
            />
          </div>
          <div className="flex justify-between mt-2 text-[10px]" style={{ color: "var(--club-text-muted)" }}>
            <span>{filteredStats.won}W  {filteredStats.lost}L  {filteredStats.tied}T</span>
            <span>{filteredStats.played} matches</span>
          </div>
        </motion.div>
      )}

      {/* Matches list — driven by filteredMatches */}
      {filteredMatches.length > 0 ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-surface p-5">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-4 h-4" style={{ color: "var(--club-primary)" }} />
            <h2 className="text-sm font-bold" style={{ color: "var(--club-text-main)" }}>
              Matches
              {selectedTournament !== "all" && (
                <span className="ml-2 text-[10px] font-normal" style={{ color: "var(--club-text-muted)" }}>
                  — {selectedTournamentName}
                </span>
              )}
            </h2>
            <span className="ml-auto text-[10px]" style={{ color: "var(--club-text-muted)" }}>{filteredMatches.length} total</span>
          </div>
          <div className="space-y-2">
            {filteredMatches.map((match, i) => {
              const isA = match.teamA?._id?.toString() === teamId || match.teamA?.toString() === teamId;
              const opponent = isA ? match.teamB : match.teamA;
              const winnerId = match.result?.winner?._id?.toString() || match.result?.winner?.toString();
              const isWin = winnerId === teamId;
              const isTied = match.status === "completed" && !winnerId;
              const isLoss = match.status === "completed" && !!winnerId && !isWin;

              const statusColor = isWin ? "#10b981" : isLoss ? "#ef4444" : isTied ? "#f59e0b" : "var(--club-text-muted)";
              const statusLabel = isWin ? "W" : isLoss ? "L" : isTied ? "T" : match.status === "live" ? "LIVE" : "—";

              return (
                <motion.div
                  key={match._id || i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-3 glass-card p-3"
                >
                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black shrink-0" style={{ backgroundColor: `${statusColor}15`, color: statusColor }}>
                    {statusLabel}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: "var(--club-text-main)" }}>
                      vs {opponent?.name || "Unknown"}
                    </p>
                    {selectedTournament === "all" && match.tournamentId?.name && (
                      <p className="text-[10px] truncate" style={{ color: "var(--club-text-muted)" }}>
                        {match.tournamentId.name}
                      </p>
                    )}
                  </div>
                  {match.startTime && (
                    <span className="text-[10px] shrink-0" style={{ color: "var(--club-text-muted)" }}>
                      {new Date(match.startTime).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      ) : data.matches.length > 0 ? (
        <div className="glass-surface p-8 text-center">
          <Trophy className="w-8 h-8 mx-auto mb-2 opacity-20" style={{ color: "var(--club-primary)" }} />
          <p className="text-sm" style={{ color: "var(--club-text-muted)" }}>No matches found for this tournament.</p>
        </div>
      ) : null}

      {/* Players */}
      {players.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-surface p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" style={{ color: "var(--club-primary)" }} />
              <h2 className="text-sm font-bold" style={{ color: "var(--club-text-main)" }}>Squad ({players.length})</h2>
            </div>
            <Link to={`/clubs/${slug}/players?teamId=${teamId}`} className="text-xs font-semibold" style={{ color: "var(--club-primary)" }}>
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {players.map((player, i) => (
              <motion.div key={player._id || i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                <Link
                  to={`/clubs/${slug}/players/${player._id}`}
                  className="flex items-center gap-2.5 glass-card p-2.5 hover:border-(--club-primary) transition-colors"
                  style={{ borderColor: "var(--club-border)" }}
                >
                  {player.photo ? (
                    <img src={player.photo} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ backgroundColor: "var(--club-primary)" }}>
                      {(player.name || "P")[0]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: "var(--club-text-main)" }}>{player.name}</p>
                    {player.role && (
                      <p className="text-[10px] capitalize" style={{ color: "var(--club-text-muted)" }}>{player.role}</p>
                    )}
                  </div>
                  {player.jerseyNumber != null && (
                    <span className="text-[10px] font-bold shrink-0" style={{ color: "var(--club-text-muted)" }}>#{player.jerseyNumber}</span>
                  )}
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="skeleton h-5 w-16 rounded" />
      <div className="glass-surface p-6">
        <div className="flex items-center gap-5">
          <div className="skeleton w-20 h-20 rounded-2xl" />
          <div className="space-y-2 flex-1">
            <div className="skeleton h-6 w-40 rounded" />
            <div className="skeleton h-4 w-56 rounded" />
          </div>
        </div>
      </div>
      <div className="skeleton h-10 w-48 rounded-xl" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-24 rounded-2xl" />)}
      </div>
      <div className="skeleton h-20 rounded-2xl" />
    </div>
  );
}
