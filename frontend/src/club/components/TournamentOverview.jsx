import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Trophy, Calendar, Clock, BarChart3 } from "lucide-react";
import clubService from "../services/clubService";

/**
 * TournamentOverview — Left panel (60%).
 * Shows tournament selector + Points Table / Fixtures / Timeline tabs for league,
 * or Bracket / Timeline tabs for knockout.
 */
export default function TournamentOverview({ clubId, tournaments }) {
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState("points");
  const [pointsTable, setPointsTable] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);

  // Auto-select first tournament
  useEffect(() => {
    if (tournaments?.length && !selectedTournament) {
      setSelectedTournament(tournaments[0]);
    }
  }, [tournaments]);

  // Fetch data when tournament changes
  useEffect(() => {
    if (!selectedTournament) return;
    const id = selectedTournament._id || selectedTournament.id;
    setLoading(true);

    const fetchData = async () => {
      try {
        const [ptRes, mRes] = await Promise.all([
          clubService.getPointsTable(id).catch(() => null),
          clubService.getMatchesByTournament(id, { limit: 100 }).catch(() => null),
        ]);

        setPointsTable(ptRes?.data?.data || []);
        const mData = mRes?.data?.data || mRes?.data?.matches || [];
        setMatches(Array.isArray(mData) ? mData : []);
      } catch { /* handled */ }
      finally { setLoading(false); }
    };

    fetchData();

    // Set appropriate initial tab
    const isKnockout = selectedTournament.type === "knockout";
    setActiveTab(isKnockout ? "bracket" : "points");
  }, [selectedTournament]);

  const isKnockout = selectedTournament?.type === "knockout";
  const tabs = isKnockout
    ? [
        { key: "bracket", label: "Bracket", icon: BarChart3 },
        { key: "timeline", label: "Timeline", icon: Clock },
      ]
    : [
        { key: "points", label: "Points Table", icon: Trophy },
        { key: "fixtures", label: "Fixtures", icon: Calendar },
        { key: "timeline", label: "Timeline", icon: Clock },
      ];

  return (
    <div className="glass-surface p-5 space-y-4">
      {/* Tournament Selector */}
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 hover:border-white/20 transition-all text-sm"
        >
          <span className="font-semibold text-white truncate">
            {selectedTournament?.name || "Select Tournament"}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform ${showDropdown ? "rotate-180" : ""}`}
          />
        </button>

        <AnimatePresence>
          {showDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="absolute z-20 mt-2 w-full rounded-xl bg-[#141825] border border-white/10 shadow-xl overflow-hidden"
            >
              {tournaments?.map((t) => (
                <button
                  key={t._id || t.id}
                  onClick={() => {
                    setSelectedTournament(t);
                    setShowDropdown(false);
                  }}
                  className={`w-full text-left px-4 py-3 text-sm hover:bg-white/[0.06] transition-colors flex items-center gap-3 ${
                    (selectedTournament?._id || selectedTournament?.id) === (t._id || t.id)
                      ? "text-white bg-white/[0.04]"
                      : "text-gray-400"
                  }`}
                >
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{
                      background:
                        t.status === "ongoing"
                          ? "#ef4444"
                          : t.status === "completed"
                          ? "#6b7280"
                          : "#22c55e",
                    }}
                  />
                  <span className="truncate">{t.name}</span>
                  <span className="ml-auto text-[10px] text-gray-600 capitalize">{t.type || "league"}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-white/5 pb-0">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`glass-tab flex items-center gap-1.5 text-xs ${activeTab === key ? "active" : ""}`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="min-h-[300px]">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton h-12 rounded-xl" />
            ))}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === "points" && <PointsTableView data={pointsTable} />}
              {activeTab === "fixtures" && <FixturesView matches={matches} />}
              {activeTab === "timeline" && <TimelineView matches={matches} />}
              {activeTab === "bracket" && <BracketView matches={matches} tournament={selectedTournament} />}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

/* ─── Points Table ─── */
function PointsTableView({ data }) {
  if (!data?.length) {
    return <EmptyState text="Points table not available yet" />;
  }

  return (
    <div className="relative z-0 transform-gpu overflow-x-auto overscroll-contain club-scroll">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-500 text-[11px] uppercase tracking-wider">
            <th className="text-left py-2 px-2">#</th>
            <th className="text-left py-2 px-2">Team</th>
            <th className="text-center py-2 px-1">P</th>
            <th className="text-center py-2 px-1">W</th>
            <th className="text-center py-2 px-1 text-green-400">W</th>
            <th className="text-center py-2 px-1 text-red-400">L</th>
            <th className="text-center py-2 px-1">T</th>
            <th className="text-center py-2 px-1">NRR</th>
            <th className="text-center py-2 px-1 font-bold">Pts</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <motion.tr
              key={row.teamId || i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="border-t border-white/5 hover:bg-white/[0.03] transition-colors"
            >
              <td className="py-2.5 px-2 text-gray-500 font-medium">{i + 1}</td>
              <td className="py-2.5 px-2">
                <div className="flex items-center gap-2">
                  {row.team?.logo ? (
                    <img src={row.team.logo} alt="" className="w-6 h-6 rounded-md object-cover" />
                  ) : (
                    <div className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center text-[10px] font-bold text-gray-500">
                      {(row.team?.name || "T")[0]}
                    </div>
                  )}
                  <span className="font-semibold text-white text-xs truncate max-w-[120px]">
                    {row.team?.name || "Unknown"}
                  </span>
                </div>
              </td>
              <td className="text-center py-2.5 px-1 text-gray-400">{row.played || 0}</td>
              <td className="text-center py-2.5 px-1 text-green-400 font-medium">{row.won || 0}</td>
              <td className="text-center py-2.5 px-1 text-green-400 font-medium">{row.won || 0}</td>
              <td className="text-center py-2.5 px-1 text-red-400 font-medium">{row.lost || 0}</td>
              <td className="text-center py-2.5 px-1 text-gray-400">{row.tied || 0}</td>
              <td className="text-center py-2.5 px-1 text-gray-400 text-xs">
                {row.nrr != null ? (row.nrr > 0 ? "+" : "") + row.nrr.toFixed(3) : "0.000"}
              </td>
              <td className="text-center py-2.5 px-1">
                <span
                  className="font-bold text-sm"
                  style={{ color: "var(--club-primary)" }}
                >
                  {row.points || 0}
                </span>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Fixtures ─── */
function FixturesView({ matches }) {
  const upcoming = matches.filter((m) => m.status === "upcoming" || m.status === "unscheduled");
  if (!upcoming.length) return <EmptyState text="No upcoming fixtures" />;

  return (
    <div className="space-y-3">
      {upcoming.map((match, i) => (
        <motion.div
          key={match._id || i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          className="glass-card p-3 flex items-center gap-3"
        >
          <div className="flex-1 flex items-center gap-2">
            <TeamBadge team={match.teamA} />
            <span className="text-xs text-gray-500 font-bold">vs</span>
            <TeamBadge team={match.teamB} />
          </div>
          <div className="text-right text-[11px]">
            {match.startTime ? (
              <>
                <p className="text-gray-400">
                  {new Date(match.startTime).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </p>
                <p className="text-gray-600">
                  {new Date(match.startTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </>
            ) : (
              <p className="text-gray-600">TBD</p>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* ─── Timeline ─── */
function TimelineView({ matches }) {
  const sorted = [...matches].sort((a, b) => new Date(a.startTime || 0) - new Date(b.startTime || 0));
  if (!sorted.length) return <EmptyState text="No matches scheduled" />;

  return (
    <div className="relative pl-6 space-y-4">
      {/* Vertical line */}
      <div className="absolute left-2 top-0 bottom-0 w-px bg-white/10" />

      {sorted.map((match, i) => {
        const statusColors = {
          completed: "#22c55e",
          live: "#ef4444",
          upcoming: "var(--club-primary)",
          unscheduled: "#6b7280",
        };

        return (
          <motion.div
            key={match._id || i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className="relative"
          >
            {/* Dot */}
            <div
              className="absolute -left-[17px] top-3 w-3 h-3 rounded-full border-2 border-[#0a0e1a]"
              style={{ background: statusColors[match.status] || "#6b7280" }}
            />

            <div className="glass-card p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TeamBadge team={match.teamA} small />
                  <span className="text-xs text-gray-600">vs</span>
                  <TeamBadge team={match.teamB} small />
                </div>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-medium capitalize"
                  style={{
                    background: `${statusColors[match.status]}15`,
                    color: statusColors[match.status],
                  }}
                >
                  {match.status}
                </span>
              </div>
              {match.result?.summary && (
                <p className="text-[11px] text-gray-400 mt-1.5 truncate">{match.result.summary}</p>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ─── Bracket (Knockout) using SVG Lines ─── */
const cn = (...classes) => classes.filter(Boolean).join(" ");

function BracketView({ matches, tournament }) {
  if (!matches?.length) return <EmptyState text="Bracket not available yet" />;

  const themeColor = "var(--club-primary)";
  const totalRounds = Math.max(...matches.map((m) => m.round || 1), 1);
  const containerRef = useRef(null);
  const [nodePositions, setNodePositions] = useState({});

  // Organize matches by round
  const roundsData = useMemo(() => {
    const rounds = {};
    for (let r = 1; r <= totalRounds; r++) {
      rounds[r] = (matches || [])
        .filter((m) => m.round === r)
        .sort((a, b) => (a.matchOrder ?? 0) - (b.matchOrder ?? 0));
    }
    return rounds;
  }, [matches, totalRounds]);

  // Collect node positions after render for SVG lines
  useEffect(() => {
    if (!containerRef.current) return;
    const timer = setTimeout(() => {
      const positions = {};
      const containerRect = containerRef.current.getBoundingClientRect();
      const nodes = containerRef.current.querySelectorAll("[data-match-id]");
      nodes.forEach((node) => {
        const id = node.getAttribute("data-match-id");
        const rect = node.getBoundingClientRect();
        positions[id] = {
          x: rect.left - containerRect.left + rect.width,
          y: rect.top - containerRect.top + rect.height / 2,
          left: rect.left - containerRect.left,
          width: rect.width,
        };
      });
      setNodePositions(positions);
    }, 400);
    return () => clearTimeout(timer);
  }, [matches, totalRounds]);

  // Build SVG connector lines
  const lines = useMemo(() => {
    const result = [];
    for (const match of (matches || [])) {
      const nextId = match.tournamentMeta?.nextMatchId?._id || match.tournamentMeta?.nextMatchId;
      if (!nextId) continue;
      const matchId = match._id || match.id;
      const from = nodePositions[matchId];
      const to = nodePositions[nextId?.toString()];
      if (!from || !to) continue;

      const isCompleted = match.status === "completed";
      result.push({
        key: `${matchId}-${nextId}`,
        x1: from.x,
        y1: from.y,
        x2: to.left,
        y2: to.y,
        completed: isCompleted,
        live: match.status === "live",
      });
    }
    return result;
  }, [matches, nodePositions]);

  // Round labels
  function getRoundLabelText(round) {
    const fromFinal = totalRounds - round + 1;
    switch (fromFinal) {
      case 1: return "🏆 Final";
      case 2: return "Semifinals";
      case 3: return "Quarterfinals";
      default: return `Round ${round}`;
    }
  }

  const ROUND_GAP = 80;
  const NODE_V_GAP = 20;

  return (
    <div className="relative z-0 transform-gpu w-full overflow-x-auto overflow-y-auto overscroll-contain club-scroll">
      <div ref={containerRef} className="relative flex items-start gap-0 py-8 px-4" style={{ minWidth: totalRounds * 300 }}>
        {/* SVG overlay for lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
          <defs>
            <linearGradient id="lineGradientActive" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={themeColor} stopOpacity="0.8" />
              <stop offset="100%" stopColor={themeColor} stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="lineGradientLive" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.9" />
            </linearGradient>
          </defs>
          {lines.map((line) => {
            const midX = (line.x1 + line.x2) / 2;
            const pathD = `M ${line.x1} ${line.y1} C ${midX} ${line.y1}, ${midX} ${line.y2}, ${line.x2} ${line.y2}`;
            return (
              <motion.path
                key={line.key}
                d={pathD}
                fill="none"
                stroke={
                  line.live
                    ? "url(#lineGradientLive)"
                    : line.completed
                    ? "url(#lineGradientActive)"
                    : "rgba(255,255,255,0.1)"
                }
                strokeWidth={line.completed || line.live ? 2.5 : 1.5}
                strokeDasharray={!line.completed && !line.live ? "6 4" : "none"}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            );
          })}
        </svg>

        {/* Render each round */}
        {Array.from({ length: totalRounds }, (_, i) => i + 1).map((round) => {
          const roundMatches = roundsData[round] || [];
          return (
            <div
              key={round}
              className="flex flex-col items-center shrink-0"
              style={{ marginRight: ROUND_GAP, zIndex: 1 }}
            >
              {/* Round header */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: round * 0.1 }}
                className="mb-6 px-4 py-1.5 rounded-full"
                style={{ backgroundColor: `color-mix(in srgb, ${themeColor} 15%, transparent)`, border: `1px solid color-mix(in srgb, ${themeColor} 30%, transparent)` }}
              >
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: themeColor }}>
                  {getRoundLabelText(round)}
                </span>
              </motion.div>

              {/* Match nodes */}
              <div
                className="flex flex-col justify-around flex-1"
                style={{
                  gap: NODE_V_GAP + (round - 1) * 40,
                  minHeight: roundMatches.length * 100,
                }}
              >
                {roundMatches.map((match) => (
                  <div
                    key={match._id || match.id}
                    data-match-id={match._id || match.id}
                  >
                    <BracketNode match={match} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const STATUS_STYLES = {
  completed: "border-green-500/40 shadow-[0_0_15px_rgba(34,197,94,0.1)]",
  live: "border-orange-500/60 shadow-[0_0_15px_rgba(249,115,22,0.2)] animate-pulse",
  upcoming: "",
  unscheduled: "border-white/10",
};

function TeamCircle({ team, isWinner, isBye }) {
  const fallbackColor = "#6366f1";
  const bgColor = team?.color || fallbackColor;

  return (
    <div className="flex flex-col items-center gap-1.5 min-w-[70px]">
      <div
        className={cn(
          "relative w-12 h-12 rounded-full border-2 flex items-center justify-center overflow-hidden transition-all duration-300",
          isWinner && "ring-2 ring-green-400 ring-offset-2 ring-offset-[#0a0e1a] scale-110",
          isBye && "opacity-40",
          !team && "border-dashed border-white/20"
        )}
        style={{
          borderColor: team ? `${bgColor}80` : undefined,
          background: team
            ? `linear-gradient(135deg, ${bgColor}15, ${bgColor}30)`
            : undefined,
        }}
      >
        {team?.logo ? (
          <img src={team.logo} alt={team.name} className="w-8 h-8 rounded-full object-cover" />
        ) : team ? (
          <span className="text-xs font-bold text-white/80">
            {team.shortName || team.name?.slice(0, 2)?.toUpperCase()}
          </span>
        ) : (
          <span className="text-[10px] text-gray-500">TBD</span>
        )}
        {isWinner && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center"
          >
            <span className="text-[8px] text-white">✓</span>
          </motion.div>
        )}
      </div>
      <span className={cn(
        "text-[10px] font-medium text-center leading-tight max-w-[80px] truncate",
        isWinner ? "text-green-400" : "text-gray-400"
      )}>
        {team?.name || "TBD"}
      </span>
    </div>
  );
}

function BracketNode({ match }) {
  const themeColor = "var(--club-primary)";
  if (!match) return null;

  const winnerId = match.result?.winner?._id || match.result?.winner;
  const teamAId = match.teamA?._id || match.teamA?.id;
  const teamBId = match.teamB?._id || match.teamB?.id;
  const isTeamAWinner = winnerId && winnerId.toString() === teamAId?.toString();
  const isTeamBWinner = winnerId && winnerId.toString() === teamBId?.toString();
  const statusKey = match.status || "unscheduled";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.04, zIndex: 10 }}
      transition={{ duration: 0.25 }}
      className={cn(
        "relative flex items-center gap-3 px-4 py-3 rounded-xl border glass-card cursor-pointer",
        STATUS_STYLES[statusKey]
      )}
      style={{ 
        minWidth: 200,
        borderColor: statusKey === "upcoming" ? `color-mix(in srgb, ${themeColor} 40%, transparent)` : undefined,
        boxShadow: statusKey === "upcoming" ? `0 4px 12px color-mix(in srgb, ${themeColor} 10%, transparent)` : undefined
      }}
    >
      {/* Match label */}
      <div className="absolute -top-2.5 left-3 px-2 py-0.5 rounded-full bg-[#0a0e1a] border border-white/10 text-[9px] font-semibold text-gray-400 uppercase tracking-wider">
        {match.matchLabel || `M${match.matchNumber || '?'}`}
      </div>

      {/* Teams */}
      <TeamCircle team={match.teamA} isWinner={isTeamAWinner} isBye={match.isBye} />

      <div className="flex flex-col items-center gap-0.5">
        <span className="text-[10px] font-bold text-gray-500 uppercase">vs</span>
        {match.isBye && (
          <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 font-medium">
            BYE
          </span>
        )}
      </div>

      <TeamCircle team={match.teamB} isWinner={isTeamBWinner} isBye={match.isBye} />

      {/* Status indicator */}
      {statusKey === "live" && (
        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 animate-ping" />
      )}
    </motion.div>
  );
}

function TeamBadge({ team, small }) {
  const size = small ? "w-5 h-5" : "w-6 h-6";
  return (
    <div className="flex items-center gap-1.5">
      {team?.logo ? (
        <img src={team.logo} alt="" className={`${size} rounded object-cover`} />
      ) : (
        <div className={`${size} rounded bg-white/5 flex items-center justify-center text-[8px] font-bold text-gray-500`}>
          {(team?.name || "?")[0]}
        </div>
      )}
      <span className={`${small ? "text-[11px]" : "text-xs"} font-medium text-white truncate max-w-[80px]`}>
        {team?.name || "TBD"}
      </span>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-gray-600">
      <Trophy className="w-10 h-10 mb-3 opacity-20" />
      <p className="text-sm">{text}</p>
    </div>
  );
}
