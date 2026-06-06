import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Radio, CheckCircle2, Clock, Trophy, ExternalLink } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import clubService from "../services/clubService";
import { encodeId } from "../../utils/crypto";

/**
 * LiveMatchesPanel — Right panel (40%).
 * Tabbed: Live | Results | Schedule
 */
export default function LiveMatchesPanel({ clubId, liveMatches = [], liveSummaries = {}, liveLoading = false }) {
  const [activeTab, setActiveTab] = useState("live");
  const [results, setResults] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [loadingOther, setLoadingOther] = useState(false);

  // Fetch results & schedule
  useEffect(() => {
    if (!clubId) return;
    const fetch = async () => {
      setLoadingOther(true);
      try {
        const [resR, resS] = await Promise.all([
          clubService.getMatchesByClub(clubId, { status: "completed", limit: 10 }),
          clubService.getMatchesByClub(clubId, { status: "upcoming", limit: 10 }),
        ]);
        const allResults = resR.data?.data || [];
        setResults(allResults.filter(m => m.result?.summary || m.result?.winner));
        setSchedule(resS.data?.data || []);
      } catch { /* handled */ }
      finally { setLoadingOther(false); }
    };
    fetch();
  }, [clubId]);

  const tabs = [
    { key: "live", label: "Live", icon: Radio, count: liveMatches.length },
    { key: "results", label: "Results", icon: CheckCircle2, count: results.length },
    { key: "schedule", label: "Schedule", icon: Clock, count: schedule.length },
  ];

  return (
    <div className="glass-surface p-5 space-y-4">
      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-white/5">
        {tabs.map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`glass-tab flex items-center gap-1.5 text-xs ${activeTab === key ? "active" : ""}`}
          >
            <Icon className={`w-3.5 h-3.5 ${key === "live" && activeTab === "live" ? "text-red-400" : ""}`} />
            {label}
            {count > 0 && key === "live" && (
              <span className="ml-1 w-5 h-5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold flex items-center justify-center">
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content — plain div so wheel events are not consumed by Framer Motion */}
      <div
        className="min-h-[300px] max-h-[500px] overflow-y-auto club-scroll pr-1"
        style={{ overscrollBehavior: "contain" }}
        onWheel={(e) => e.stopPropagation()}
      >
        {activeTab === "live" && (
          <div className="space-y-3">
            {liveLoading ? (
              <SkeletonCards />
            ) : liveMatches.length === 0 ? (
              <EmptyPanel text="No live matches right now" icon="📺" />
            ) : (
              liveMatches.map((m) => (
                <LiveMatchCard
                  key={m._id || m.id}
                  match={m}
                  summary={liveSummaries[m._id || m.id]}
                />
              ))
            )}
          </div>
        )}

        {activeTab === "results" && (
          <div className="space-y-3">
            {loadingOther ? (
              <SkeletonCards />
            ) : results.length === 0 ? (
              <EmptyPanel text="No completed matches yet" icon="🏆" />
            ) : (
              results.map((m) => <ResultCard key={m._id} match={m} />)
            )}
          </div>
        )}

        {activeTab === "schedule" && (
          <div className="space-y-3">
            {loadingOther ? (
              <SkeletonCards />
            ) : schedule.length === 0 ? (
              <EmptyPanel text="No upcoming matches" icon="📅" />
            ) : (
              schedule.map((m) => <ScheduleCard key={m._id} match={m} />)
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Live Match Card ─── */
function LiveMatchCard({ match, summary }) {
  const navigate = useNavigate();
  const { slug } = useParams();
  const teamA = match.teamA || {};
  const teamB = match.teamB || {};

  const inning = summary?.innings;
  const firstScore = inning?.first;
  const secondScore = inning?.second;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={() => navigate(`/clubs/${slug}/matches/${match.slug || encodeId(match._id || match.id)}`)}
      className="glass-card p-4 space-y-3 relative overflow-hidden cursor-pointer hover:shadow-lg transition-shadow duration-300"
    >
      {/* Glow accent */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5"
        style={{ backgroundColor: "var(--club-secondary)" }}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="live-pulse text-[11px] font-bold text-red-400 uppercase">Live</span>
        <span className="text-[10px] text-gray-500 truncate max-w-[140px]">
          {match.tournamentId?.name || ""}
        </span>
      </div>

      {/* Teams & Scores */}
      <div className="space-y-2">
        <TeamScoreLine
          team={teamA}
          score={firstScore?.score}
          wickets={firstScore?.wickets}
          overs={firstScore?.overs}
        />
        <TeamScoreLine
          team={teamB}
          score={secondScore?.score}
          wickets={secondScore?.wickets}
          overs={secondScore?.overs}
        />
      </div>

      {/* Status */}
      {summary?.target && (
        <p className="text-[11px] text-gray-400">
          Need {summary.target - (secondScore?.score || 0)} runs from{" "}
          {Math.max(0, (match.oversPerInning || 20) * 6 - (secondScore?.balls || 0))} balls
          {summary.requiredRunRate ? ` • RRR: ${summary.requiredRunRate}` : ""}
        </p>
      )}
    </motion.div>
  );
}

/* ─── Result Card ─── */
function ResultCard({ match }) {
  const teamA = match.teamA || {};
  const teamB = match.teamB || {};
  const winner = match.result?.winner;
  const winnerId = typeof winner === "object" ? winner?._id : winner;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-3 space-y-2">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-gray-500 truncate max-w-[140px]">{match.tournamentId?.name || ""}</span>
        <span className="result-badge-won px-2 py-0.5 rounded-full text-[10px] font-medium">Completed</span>
      </div>

      <div className="flex items-center gap-3">
        <TeamSmall team={teamA} isWinner={winnerId === (teamA._id || teamA.id)} />
        <span className="text-gray-600 text-xs font-bold">vs</span>
        <TeamSmall team={teamB} isWinner={winnerId === (teamB._id || teamB.id)} />
      </div>

      {(match.result?.summary || winnerId) && (
        <p className="text-[11px] text-gray-400 truncate">
          {match.result?.summary || 
            (winnerId === (teamA._id || teamA.id) ? `${teamA.name} won` : 
             winnerId === (teamB._id || teamB.id) ? `${teamB.name} won` : 
             'Match Completed')}
        </p>
      )}
    </motion.div>
  );
}

/* ─── Schedule Card ─── */
function ScheduleCard({ match }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-3 space-y-2">
      <div className="flex items-center gap-3">
        <TeamSmall team={match.teamA} />
        <span className="text-gray-600 text-xs font-bold">vs</span>
        <TeamSmall team={match.teamB} />
      </div>
      <div className="flex items-center justify-between text-[10px] text-gray-500">
        <span>
          {match.startTime
            ? new Date(match.startTime).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "TBD"}
        </span>
        {match.venue && <span className="truncate max-w-[100px]">{match.venue}</span>}
      </div>
    </motion.div>
  );
}

/* ─── Helpers ─── */
function TeamScoreLine({ team, score, wickets, overs }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {team?.logo ? (
          <img src={team.logo} alt="" className="w-6 h-6 rounded object-cover" />
        ) : (
          <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center text-[8px] font-bold text-gray-500">
            {(team?.name || "?")[0]}
          </div>
        )}
        <span className="text-sm font-semibold text-white truncate max-w-[100px]">
          {team?.name || "TBA"}
        </span>
      </div>
      {score != null && (
        <span className="text-sm font-bold score-glow">
          {score}/{wickets || 0}
          <span className="text-[10px] text-gray-500 ml-1">
            ({typeof overs === "number" ? overs.toFixed(1) : overs || "0.0"} ov)
          </span>
        </span>
      )}
    </div>
  );
}

function TeamSmall({ team, isWinner }) {
  return (
    <div className="flex items-center gap-1.5 flex-1 min-w-0">
      {team?.logo ? (
        <img src={team.logo} alt="" className="w-5 h-5 rounded object-cover flex-shrink-0" />
      ) : (
        <div className="w-5 h-5 rounded bg-white/5 flex items-center justify-center text-[8px] font-bold text-gray-500 flex-shrink-0">
          {(team?.name || "?")[0]}
        </div>
      )}
      <span className={`text-xs truncate ${isWinner ? "text-white font-semibold" : "text-gray-400"}`}>
        {team?.name || "TBA"}
      </span>
    </div>
  );
}

function EmptyPanel({ text, icon }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-gray-600">
      <span className="text-3xl mb-3">{icon}</span>
      <p className="text-sm">{text}</p>
    </div>
  );
}

function SkeletonCards() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="skeleton h-24 rounded-2xl" />
      ))}
    </div>
  );
}
