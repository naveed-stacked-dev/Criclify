import { motion } from "framer-motion";
import { Radio } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * LiveScoreWidget — Premium live scoreboard for active matches.
 * Displays real-time score, overs, current batsmen, bowler, and required run rate.
 */
export default function LiveScoreWidget({ match, summary: liveSummary }) {
  const navigate = useNavigate();
  // Use live socket summary if available, otherwise use the one attached to match from API
  const summary = liveSummary || match?.summary;
  if (!match || !summary) return null;

  const teamA = match.teamA || {};
  const teamB = match.teamB || {};
  const inning = summary.innings;
  const currentInning = summary.currentInning || 1;
  const isSecondInnings = currentInning >= 2;

  const firstInning = inning?.first || {};
  const secondInning = inning?.second || {};
  const activeInning = isSecondInnings ? secondInning : firstInning;

  const striker = summary.currentBatsmen?.striker;
  const nonStriker = summary.currentBatsmen?.nonStriker;
  const bowler = summary.currentBowler;

  // Helper: resolve player name from populated object or string
  const getPlayerName = (player, fallback) => {
    if (!player?.playerId) return fallback;
    if (typeof player.playerId === "object") return player.playerId.name || fallback;
    return fallback;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => navigate(`/matches/${match._id || match.id}`)}
      className="glass-card p-5 relative overflow-hidden cursor-pointer hover:shadow-lg transition-shadow duration-300 group"
    >
      {/* Live glow top bar */}
      <div
        className="absolute top-0 left-0 right-0 h-1 animate-pulse"
        style={{ background: "linear-gradient(90deg, #ef4444, var(--club-primary), #ef4444)" }}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="live-pulse text-xs font-bold text-red-400 uppercase">Live</div>
        <span className="text-[10px] text-gray-500">
          {match.tournamentId?.name || ""}
        </span>
      </div>

      {/* Scores */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <ScoreBlock
          team={teamA}
          score={firstInning.score}
          wickets={firstInning.wickets}
          overs={firstInning.overs}
          isBatting={currentInning === 1}
        />
        <ScoreBlock
          team={teamB}
          score={secondInning.score}
          wickets={secondInning.wickets}
          overs={secondInning.overs}
          isBatting={currentInning >= 2}
        />
      </div>

      {/* Target info */}
      {isSecondInnings && summary.target && (
        <div
          className="text-center py-2 px-3 rounded-lg mb-4 text-xs font-medium"
          style={{ background: "var(--club-primary)10", color: "var(--club-primary)" }}
        >
          Target: {summary.target} • Need {Math.max(0, summary.target - (secondInning.score || 0))} runs
          {summary.requiredRunRate ? ` • RRR: ${summary.requiredRunRate}` : ""}
        </div>
      )}

      {/* Current Players */}
      <div className="grid grid-cols-2 gap-3">
        {/* Batsmen */}
        <div className="space-y-1.5">
          <h4 className="text-[10px] text-gray-500 uppercase tracking-wider">Batting</h4>
          {striker?.playerId && (
            <PlayerLine
              name={getPlayerName(striker, "Striker")}
              stat={`${striker.runs || 0} (${striker.balls || 0})`}
              highlight
            />
          )}
          {nonStriker?.playerId && (
            <PlayerLine
              name={getPlayerName(nonStriker, "Non-Striker")}
              stat={`${nonStriker.runs || 0} (${nonStriker.balls || 0})`}
            />
          )}
        </div>

        {/* Bowler */}
        <div className="space-y-1.5">
          <h4 className="text-[10px] text-gray-500 uppercase tracking-wider">Bowling</h4>
          {bowler?.playerId && (
            <PlayerLine
              name={getPlayerName(bowler, "Bowler")}
              stat={`${bowler.wickets || 0}/${bowler.runs || 0} (${bowler.overs || 0}.${bowler.balls || 0})`}
            />
          )}
        </div>
      </div>

      {/* Run Rate */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5 text-[11px] text-gray-400">
        <span>CRR: {activeInning.runRate || "0.00"}</span>
        {isSecondInnings && <span>RRR: {summary.requiredRunRate || "0.00"}</span>}
      </div>
    </motion.div>
  );
}

function ScoreBlock({ team, score, wickets, overs, isBatting }) {
  return (
    <div className={`text-center ${isBatting ? "opacity-100" : "opacity-50"}`}>
      <div className="flex items-center justify-center gap-2 mb-1">
        {team?.logo ? (
          <img src={team.logo} alt="" className="w-6 h-6 rounded object-cover" />
        ) : (
          <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center text-[8px] font-bold text-gray-500">
            {(team?.name || "?")[0]}
          </div>
        )}
        <span className="text-xs font-semibold text-white truncate">{team?.name || "TBA"}</span>
      </div>
      <div className="score-glow text-xl font-black">
        {score != null ? `${score}/${wickets || 0}` : "—"}
      </div>
      {overs != null && (
        <p className="text-[10px] text-gray-500">
          ({typeof overs === "number" ? overs.toFixed(1) : overs} ov)
        </p>
      )}
      {isBatting && (
        <div className="flex items-center justify-center gap-1 mt-1">
          <Radio className="w-3 h-3 text-red-400 animate-pulse" />
          <span className="text-[9px] text-red-400">Batting</span>
        </div>
      )}
    </div>
  );
}

function PlayerLine({ name, stat, highlight }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className={highlight ? "text-white font-medium" : "text-gray-400"}>
        {highlight && <span className="mr-1" style={{ color: "var(--club-primary)" }}>●</span>}
        {name}
      </span>
      <span className="text-gray-400 font-mono">{stat}</span>
    </div>
  );
}
