import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Trophy, Calendar, Clock, BarChart3, Users, TrendingUp } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import clubService from "../services/clubService";

const GROUP_COLORS = { A: '#6366f1', B: '#10b981', C: '#f59e0b', D: '#ef4444', E: '#8b5cf6', F: '#06b6d4', G: '#ec4899', H: '#84cc16' };

/**
 * TournamentOverview — Left panel (60%).
 * Shows tournament selector + Points Table / Fixtures / Timeline tabs for league,
 * or Bracket / Timeline tabs for knockout.
 */
export default function TournamentOverview({ clubId, tournaments }) {
  const { slug } = useParams();
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState("points");
  const [activeGroupTab, setActiveGroupTab] = useState(null);
  const [pointsData, setPointsData] = useState({ hasGroups: false, groups: [], all: [] });
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
          clubService.getMatchesByTournament(id, { limit: 200 }).catch(() => null),
        ]);

        const ptData = ptRes?.data?.data || ptRes?.data || {};
        if (Array.isArray(ptData)) {
          setPointsData({ hasGroups: false, groups: [], all: ptData });
          setActiveGroupTab(null);
        } else {
          setPointsData(ptData);
          setActiveGroupTab(ptData.groups?.[0]?.groupName || null);
        }

        const mData = mRes?.data?.data || mRes?.data?.matches || [];
        setMatches(Array.isArray(mData) ? mData : []);
      } catch { /* handled */ }
      finally { setLoading(false); }
    };

    fetchData();

    const isKnockout = selectedTournament.type === "knockout";
    setActiveTab(isKnockout ? "bracket" : "points");
  }, [selectedTournament]);

  const isKnockout = selectedTournament?.type === "knockout";
  const hasGroups = pointsData.hasGroups && pointsData.groups?.length >= 2;

  const tabs = isKnockout
    ? [
        { key: "bracket", label: "Bracket", icon: BarChart3 },
        { key: "timeline", label: "Timeline", icon: Clock },
      ]
    : [
        { key: "points", label: hasGroups ? "Groups" : "Standings", icon: Trophy },
        { key: "fixtures", label: "Fixtures", icon: Calendar },
        { key: "teams", label: "Teams", icon: Users },
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
              {activeTab === "points" && (
                hasGroups ? (
                  <GroupStageView pointsData={pointsData} activeGroupTab={activeGroupTab} setActiveGroupTab={setActiveGroupTab} slug={slug} />
                ) : (
                  <PointsTableView data={pointsData.all} slug={slug} />
                )
              )}
              {activeTab === "fixtures" && <FixturesView matches={matches} hasGroups={hasGroups} />}
              {activeTab === "teams" && <TeamsAnalyticsView data={pointsData.all} hasGroups={hasGroups} groups={pointsData.groups} slug={slug} />}
              {activeTab === "timeline" && <TimelineView matches={matches} />}
              {activeTab === "bracket" && <BracketView matches={matches} tournament={selectedTournament} />}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

/* ─── Shared standings table ─── */
function StandingsTable({ data, slug, accentColor }) {
  const color = accentColor || "var(--club-primary)";
  if (!data?.length) return <EmptyState text="No standings data yet" />;
  return (
    <div className="relative z-0 transform-gpu overflow-x-auto overscroll-contain club-scroll">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-wider" style={{ color: "var(--club-text-muted)" }}>
            <th className="text-left py-2 px-2 w-8">#</th>
            <th className="text-left py-2 px-2">Team</th>
            <th className="text-center py-2 px-1">P</th>
            <th className="text-center py-2 px-1 text-green-500">W</th>
            <th className="text-center py-2 px-1 text-red-400">L</th>
            <th className="text-center py-2 px-1">T</th>
            <th className="text-center py-2 px-1">NRR</th>
            <th className="text-center py-2 px-1 font-bold">Pts</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => {
            const team = row.teamId || row.team;
            const isTop = i === 0;
            return (
              <motion.tr
                key={team?._id || i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="border-t transition-colors"
                style={{
                  borderColor: "var(--club-border)",
                  backgroundColor: isTop ? `${color}08` : undefined,
                }}
              >
                <td className="py-2.5 px-2 font-medium text-xs" style={{ color: isTop ? color : "var(--club-text-muted)" }}>
                  {i + 1}
                </td>
                <td className="py-2.5 px-2">
                  <Link to={`/clubs/${slug}/teams/${team?._id || team?.id || ""}`} className="flex items-center gap-2 group/team w-fit">
                    {team?.logo ? (
                      <img src={team.logo} alt="" className="w-6 h-6 rounded-md object-cover" />
                    ) : (
                      <div className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: color }}>
                        {(team?.name || "T")[0]}
                      </div>
                    )}
                    <span className="font-semibold text-xs truncate max-w-[110px] group-hover/team:underline" style={{ color: "var(--club-text-main)" }}>
                      {team?.name || "Unknown"}
                    </span>
                  </Link>
                </td>
                <td className="text-center py-2.5 px-1" style={{ color: "var(--club-text-muted)" }}>{row.played || 0}</td>
                <td className="text-center py-2.5 px-1 font-medium text-green-500">{row.won || 0}</td>
                <td className="text-center py-2.5 px-1 font-medium text-red-400">{row.lost || 0}</td>
                <td className="text-center py-2.5 px-1" style={{ color: "var(--club-text-muted)" }}>{row.tied || 0}</td>
                <td className="text-center py-2.5 px-1 text-xs font-mono" style={{ color: (row.nrr || 0) >= 0 ? '#10b981' : '#ef4444' }}>
                  {(row.nrr || 0) >= 0 ? '+' : ''}{(row.nrr || 0).toFixed(3)}
                </td>
                <td className="text-center py-2.5 px-1 font-bold text-base" style={{ color }}>{row.points || 0}</td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Points Table (no groups) ─── */
function PointsTableView({ data, slug }) {
  if (!data?.length) return <EmptyState text="Points table not available yet" />;
  return <StandingsTable data={data} slug={slug} />;
}

/* ─── Group Stage view with group tabs ─── */
function GroupStageView({ pointsData, activeGroupTab, setActiveGroupTab, slug }) {
  const groups = pointsData.groups || [];
  if (!groups.length) return <EmptyState text="No group data available yet" />;

  return (
    <div className="space-y-3">
      {/* Group tab pills */}
      <div className="flex gap-2 flex-wrap">
        {groups.map(g => {
          const color = GROUP_COLORS[g.groupName] || "var(--club-primary)";
          const isActive = activeGroupTab === g.groupName;
          return (
            <button
              key={g.groupName}
              onClick={() => setActiveGroupTab(g.groupName)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all"
              style={isActive
                ? { backgroundColor: color, color: '#fff', borderColor: color }
                : { backgroundColor: `${color}12`, color, borderColor: `${color}30` }
              }
            >
              <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black" style={isActive ? { backgroundColor: 'rgba(255,255,255,0.25)' } : { backgroundColor: `${color}20` }}>
                {g.groupName}
              </span>
              Group {g.groupName}
              <span className="opacity-70">({g.teams?.length || 0})</span>
            </button>
          );
        })}
        <button
          onClick={() => setActiveGroupTab('ALL')}
          className="px-3 py-1.5 rounded-full text-xs font-bold border transition-all"
          style={activeGroupTab === 'ALL'
            ? { backgroundColor: 'var(--club-primary)', color: '#fff', borderColor: 'var(--club-primary)' }
            : { color: 'var(--club-text-muted)', borderColor: 'var(--club-border)' }
          }
        >
          Overall
        </button>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeGroupTab === 'ALL' ? (
          <motion.div key="all" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <StandingsTable data={pointsData.all} slug={slug} />
          </motion.div>
        ) : (
          groups.filter(g => g.groupName === activeGroupTab).map(g => (
            <motion.div key={g.groupName} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <StandingsTable data={g.teams} slug={slug} accentColor={GROUP_COLORS[g.groupName]} />
            </motion.div>
          ))
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Teams tab — clickable cards that open team detail page ─── */
function TeamsAnalyticsView({ data = [], hasGroups, groups = [], slug }) {
  if (!data.length) return <EmptyState text="No team data yet." />;

  const renderTeamCard = (row, idx) => {
    const team = row.teamId || row.team;
    const teamId = team?._id || team?.id || "";
    const winPct = row.played > 0 ? Math.round((row.won / row.played) * 100) : 0;
    return (
      <motion.div
        key={teamId || idx}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: idx * 0.05 }}
        whileHover={{ scale: 1.02 }}
      >
        <Link to={`/clubs/${slug}/teams/${teamId}`} className="block glass-card p-4 space-y-2.5 hover:border-[var(--club-primary)] transition-colors" style={{ borderColor: "var(--club-border)" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {team?.logo ? (
                <img src={team.logo} alt="" className="w-9 h-9 rounded-xl object-cover shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-white shrink-0" style={{ backgroundColor: "var(--club-primary)" }}>
                  {(team?.name || 'T')[0]}
                </div>
              )}
              <div>
                <p className="font-bold text-sm" style={{ color: "var(--club-text-main)" }}>{team?.name || 'Unknown'}</p>
                <p className="text-[10px]" style={{ color: "var(--club-text-muted)" }}>{row.played || 0} matches played</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-lg font-black" style={{ color: "var(--club-primary)" }}>{row.points || 0}</span>
              <span className="text-[10px] ml-0.5" style={{ color: "var(--club-text-muted)" }}>pts</span>
            </div>
          </div>
          {row.played > 0 && (
            <div>
              <div className="flex justify-between text-[10px] mb-1" style={{ color: "var(--club-text-muted)" }}>
                <span>Win rate</span><span className="font-semibold">{winPct}%</span>
              </div>
              <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: "var(--club-border)" }}>
                <div className="h-full rounded-full" style={{ width: `${winPct}%`, backgroundColor: "var(--club-primary)" }} />
              </div>
            </div>
          )}
          <p className="text-[10px] font-medium" style={{ color: "var(--club-primary)" }}>View team details →</p>
        </Link>
      </motion.div>
    );
  };

  if (hasGroups && groups.length) {
    return (
      <div className="space-y-5">
        {groups.map(g => (
          <div key={g.groupName}>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full text-[10px] font-black flex items-center justify-center text-white" style={{ backgroundColor: GROUP_COLORS[g.groupName] || "var(--club-primary)" }}>{g.groupName}</span>
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--club-text-muted)" }}>Group {g.groupName}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(g.teams || []).map((row, i) => renderTeamCard(row, i))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {data.map((row, i) => renderTeamCard(row, i))}
    </div>
  );
}

/* ─── Fixtures ─── */
function FixturesView({ matches, hasGroups }) {
  const allFixtures = matches.filter((m) => m.status === "upcoming" || m.status === "unscheduled");
  if (!allFixtures.length) return <EmptyState text="No upcoming fixtures" />;

  const renderMatch = (match, i) => (
    <motion.div
      key={match._id || i}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.03 }}
      className="glass-card p-3 flex items-center gap-3"
    >
      {match.matchLabel && (
        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0" style={{ backgroundColor: "var(--club-surface-2)", color: "var(--club-text-muted)" }}>
          {match.matchLabel}
        </span>
      )}
      <div className="flex-1 flex items-center gap-2 min-w-0">
        <TeamBadge team={match.teamA} />
        <span className="text-[10px] font-bold shrink-0" style={{ color: "var(--club-text-muted)" }}>vs</span>
        <TeamBadge team={match.teamB} />
      </div>
      <div className="text-right text-[10px] shrink-0" style={{ color: "var(--club-text-muted)" }}>
        {match.startTime ? (
          <>
            <p>{new Date(match.startTime).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
            <p>{new Date(match.startTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</p>
          </>
        ) : <p>TBD</p>}
      </div>
    </motion.div>
  );

  if (hasGroups) {
    const groups = {};
    allFixtures.forEach(m => {
      const g = m.matchGroup || 'Other';
      if (!groups[g]) groups[g] = [];
      groups[g].push(m);
    });
    return (
      <div className="space-y-4">
        {Object.entries(groups).map(([gName, gMatches]) => {
          const color = GROUP_COLORS[gName] || "var(--club-primary)";
          return (
            <div key={gName}>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-5 h-5 rounded-full text-[9px] font-black flex items-center justify-center text-white" style={{ backgroundColor: color }}>{gName}</span>
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--club-text-muted)" }}>Group {gName}</span>
                <span className="text-[10px]" style={{ color: "var(--club-text-muted)" }}>({gMatches.length} matches)</span>
              </div>
              <div className="space-y-2">{gMatches.map((m, i) => renderMatch(m, i))}</div>
            </div>
          );
        })}
      </div>
    );
  }

  return <div className="space-y-2">{allFixtures.map((m, i) => renderMatch(m, i))}</div>;
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
    <div className="flex items-center gap-1.5 min-w-0">
      {team?.logo ? (
        <img src={team.logo} alt="" className={`${size} rounded object-cover shrink-0`} />
      ) : (
        <div className={`${size} rounded flex items-center justify-center text-[8px] font-bold text-white shrink-0`} style={{ backgroundColor: "var(--club-primary)" }}>
          {(team?.name || "?")[0]}
        </div>
      )}
      <span className={`${small ? "text-[10px]" : "text-xs"} font-semibold truncate max-w-[80px]`} style={{ color: "var(--club-text-main)" }}>
        {team?.name || "TBD"}
      </span>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="flex flex-col items-center justify-center py-12" style={{ color: "var(--club-text-muted)" }}>
      <Trophy className="w-10 h-10 mb-3 opacity-30" />
      <p className="text-sm">{text}</p>
    </div>
  );
}
