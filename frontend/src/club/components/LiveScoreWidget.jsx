import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Radio, ArrowRight } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { encodeId } from "../../utils/crypto";

/**
 * LiveScoreWidget — Broadcast-quality live scoreboard.
 * Stunning card with animated LIVE indicator, team logos, large scores,
 * batsman/bowler stats in styled inner panels, and a run-rate footer.
 */
export default function LiveScoreWidget({ match, summary: liveSummary, animationEvent }) {
  const navigate = useNavigate();
  const { slug } = useParams();
  const summary = liveSummary || match?.summary;
  const [showAnimation, setShowAnimation] = useState(false);

  // Trigger animation overlay when event arrives
  useEffect(() => {
    if (animationEvent) {
      setShowAnimation(true);
    }
  }, [animationEvent]);

  if (!match || !summary) return null;

  const teamA = match.teamA || {};
  const teamB = match.teamB || {};
  const inning = summary.innings;
  const currentInning = summary.currentInning || 1;
  const isSecondInnings = currentInning >= 2;

  const firstInning = inning?.first || {};
  const secondInning = inning?.second || {};
  const activeInning = isSecondInnings ? secondInning : firstInning;

  const firstBattingId = typeof firstInning?.battingTeamId === "object"
    ? firstInning?.battingTeamId?._id
    : firstInning?.battingTeamId;

  const teamBId = teamB?._id || teamB?.id;
  const teamABatsFirst = firstBattingId ? firstBattingId !== teamBId : true;

  const teamAInning = teamABatsFirst ? firstInning : secondInning;
  const teamBInning = teamABatsFirst ? secondInning : firstInning;

  const isTeamABatting = teamABatsFirst ? currentInning === 1 : currentInning >= 2;
  const isTeamBBatting = teamABatsFirst ? currentInning >= 2 : currentInning === 1;

  const teamAIsLeft = isTeamABatting || (!isTeamBBatting && teamABatsFirst);
  
  const leftTeam = teamAIsLeft ? teamA : teamB;
  const leftInning = teamAIsLeft ? teamAInning : teamBInning;
  const leftIsBatting = teamAIsLeft ? isTeamABatting : isTeamBBatting;

  const rightTeam = teamAIsLeft ? teamB : teamA;
  const rightInning = teamAIsLeft ? teamBInning : teamAInning;
  const rightIsBatting = teamAIsLeft ? isTeamBBatting : isTeamABatting;

  const striker = summary.currentBatsmen?.striker;
  const nonStriker = summary.currentBatsmen?.nonStriker;
  const bowler = summary.currentBowler;

  const getPlayerName = (player, fallback) => {
    if (!player?.playerId) return fallback;
    if (typeof player.playerId === "object") return player.playerId.name || fallback;
    return fallback;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => navigate(`/clubs/${slug}/matches/${match.slug || encodeId(match._id || match.id)}`)}
      className="relative overflow-hidden rounded-2xl cursor-pointer group transition-all duration-300 hover:scale-[1.01]"
      style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        boxShadow: "0 4px 24px -4px color-mix(in srgb, var(--club-primary) 12%, transparent), 0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      {/* ═══ Animated Red LIVE top bar with glow ═══ */}
      <div className="relative h-1 w-full overflow-hidden" style={{ background: "color-mix(in srgb, var(--club-primary) 12%, white)" }}>
        <div
          className="absolute inset-0"
          style={{
            background: "var(--club-primary)",
            animation: "liveBarPulse 2s ease-in-out infinite",
            boxShadow: "0 0 12px color-mix(in srgb, var(--club-primary) 60%, transparent)",
          }}
        />
      </div>

      {/* ═══ Header: LIVE badge + Tournament name + Watch Live ═══ */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2 mb-2">
        <div className="flex items-center gap-2">
          <span
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest text-white"
            style={{
              background: "linear-gradient(135deg, #ef4444, #dc2626)",
              boxShadow: "0 2px 8px rgba(239,68,68,0.4)",
              animation: "liveBadgePulse 2s ease-in-out infinite",
            }}
          >
            <span
              className="w-2 h-2 rounded-full bg-white"
              style={{ animation: "liveDot 1.5s ease-in-out infinite" }}
            />
            LIVE
          </span>
          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
            {currentInning === 1 ? "1st Innings" : `${currentInning}nd Innings`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium text-slate-400 truncate max-w-[100px]">
            {match.tournamentId?.name || ""}
          </span>
          {match.youtubeStreamUrl && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const videoId = match.youtubeStreamUrl.split("/embed/")[1]?.split("?")[0] || "";
                window.open(videoId ? `https://www.youtube.com/watch?v=${videoId}` : match.youtubeStreamUrl, "_blank");
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest text-white transition-opacity hover:opacity-80"
              style={{
                background: "linear-gradient(135deg, #ff0000, #cc0000)",
                boxShadow: "0 2px 8px rgba(255,0,0,0.35)",
              }}
            >
              <svg className="w-3 h-3 fill-white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              Watch-Live
            </button>
          )}
        </div>
      </div>

      {/* ═══ Score Section ═══ */}
      <div className="px-5 pb-4">
        <div className="flex items-stretch gap-3">
          {/* Left Team (Batting) */}
          <TeamScoreCard
            team={leftTeam}
            score={leftInning.score}
            wickets={leftInning.wickets}
            overs={leftInning.overs}
            isBatting={leftIsBatting}
          />

          {/* VS Divider */}
          <div className="flex flex-col items-center justify-center px-1 flex-shrink-0">
            <div className="w-px h-6 bg-slate-200" />
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center my-1 text-[9px] font-black text-slate-400"
              style={{ background: "#f1f5f9", border: "1px solid #e2e8f0" }}
            >
              VS
            </div>
            <div className="w-px h-6 bg-slate-200" />
          </div>

          {/* Right Team (Bowling) */}
          <TeamScoreCard
            team={rightTeam}
            score={rightInning.score}
            wickets={rightInning.wickets}
            overs={rightInning.overs}
            isBatting={rightIsBatting}
          />
        </div>

        {/* Target Banner */}
        {isSecondInnings && summary.target && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-3 text-center py-2.5 px-4 rounded-xl text-[11px] font-bold tracking-wide"
            style={{
              background: "linear-gradient(135deg, color-mix(in srgb, var(--club-primary) 8%, white), color-mix(in srgb, var(--club-primary) 12%, white))",
              color: "var(--club-primary)",
              border: "1px solid color-mix(in srgb, var(--club-primary) 15%, transparent)",
            }}
          >
            🎯 Need {Math.max(0, summary.target - (secondInning.score || 0))} from{" "}
            {Math.max(0, (match.oversPerInning || 20) * 6 - (secondInning.balls || 0))} balls
            {summary.requiredRunRate ? ` • RRR: ${summary.requiredRunRate}` : ""}
          </motion.div>
        )}
      </div>

      {/* ═══ Players Panel ═══ */}
      <div
        className="px-5 py-3 grid grid-cols-2 gap-3"
        style={{ background: "#f8fafc", borderTop: "1px solid #f1f5f9" }}
      >
        {/* Batting Panel */}
        <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-2.5">
            <h4 className="text-[9px] font-extrabold uppercase tracking-[0.12em] flex items-center gap-1.5" style={{ color: "var(--club-primary)" }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--club-primary)" }} />
              Batting
            </h4>
            <span className="text-[8px] text-slate-400 font-mono font-bold">R (B)</span>
          </div>
          <div className="space-y-2">
            {striker?.playerId && (
              <PlayerRow
                name={getPlayerName(striker, "Striker")}
                stat={`${striker.runs || 0} (${striker.balls || 0})`}
                isStriker
              />
            )}
            {nonStriker?.playerId && (
              <PlayerRow
                name={getPlayerName(nonStriker, "Non-Striker")}
                stat={`${nonStriker.runs || 0} (${nonStriker.balls || 0})`}
              />
            )}
          </div>
        </div>

        {/* Bowling Panel */}
        <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-2.5">
            <h4 className="text-[9px] font-extrabold uppercase tracking-[0.12em] flex items-center gap-1.5" style={{ color: "var(--club-primary)" }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--club-primary)" }} />
              Bowling
            </h4>
            <span className="text-[8px] text-slate-400 font-mono font-bold">W/R (ov)</span>
          </div>
          <div className="space-y-2">
            {bowler?.playerId && (
              <PlayerRow
                name={getPlayerName(bowler, "Bowler")}
                stat={`${bowler.wickets || 0}/${bowler.runs || 0} (${bowler.overs || 0}.${bowler.balls || 0})`}
              />
            )}
          </div>
        </div>
      </div>

      {/* ═══ Run Rate Footer ═══ */}
      <div
        className="flex items-center justify-between px-5 py-2.5 text-[11px]"
        style={{ background: "#f1f5f9", borderTop: "1px solid #e2e8f0" }}
      >
        <div className="flex items-center gap-3">
          <span className="font-bold text-slate-600">
            CRR: <span style={{ color: "var(--club-primary)" }}>{activeInning.runRate || "0.00"}</span>
          </span>
          {isSecondInnings && (
            <span className="font-bold text-slate-600">
              RRR: <span className="text-red-500">{summary.requiredRunRate || "0.00"}</span>
            </span>
          )}
        </div>
        <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 group-hover:text-slate-600 transition-colors">
          Match Details <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </span>
      </div>

      {/* ═══ Animation Video Overlay ═══ */}
      <AnimatePresence>
        {showAnimation && animationEvent && (
          <AnimationOverlay
            playerName={animationEvent.playerName}
            type={animationEvent.type}
            onComplete={() => setShowAnimation(false)}
          />
        )}
      </AnimatePresence>

      {/* ═══ CSS Keyframes ═══ */}
      <style>{`
        @keyframes liveBarPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes liveBadgePulse {
          0%, 100% { box-shadow: 0 2px 8px rgba(239,68,68,0.4); }
          50% { box-shadow: 0 2px 16px rgba(239,68,68,0.7); }
        }
        @keyframes liveDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(0.7); }
        }
      `}</style>
    </motion.div>
  );
}

/* ─── Team Score Card ─── */
function TeamScoreCard({ team, score, wickets, overs, isBatting }) {
  return (
    <div className={`flex-1 min-w-0 transition-all duration-300 ${isBatting ? "" : "opacity-50"}`}>
      {/* Team identity */}
      <div className="flex items-center gap-2.5 mb-2">
        {team?.logo ? (
          <img
            src={team.logo}
            alt=""
            className="w-9 h-9 rounded-xl object-cover shadow-sm"
            style={{ border: "2px solid #f1f5f9" }}
          />
        ) : (
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black shadow-sm"
            style={{ background: "#f1f5f9", border: "2px solid #e2e8f0", color: "#94a3b8" }}
          >
            {(team?.name || "?")[0]}
          </div>
        )}
        <span className="text-sm font-bold truncate" style={{ color: "var(--club-text-main)" }}>
          {team?.name || "TBA"}
        </span>
      </div>

      {/* Score */}
      <div className="flex flex-col">
        <div
          className="text-3xl font-black tracking-tight leading-none tabular-nums"
          style={{ color: isBatting ? "var(--club-primary)" : "var(--club-text-main)" }}
        >
          {score != null ? `${score}/${wickets || 0}` : "—"}
        </div>
        <div className="flex items-center gap-2 mt-1">
          {overs != null && (
            <span className="text-[11px] font-semibold text-slate-400">
              ({typeof overs === "number" ? overs.toFixed(1) : overs} ov)
            </span>
          )}
          {isBatting && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase tracking-widest"
              style={{
                background: "linear-gradient(135deg, color-mix(in srgb, var(--club-primary) 7%, white), color-mix(in srgb, var(--club-primary) 12%, white))",
                color: "color-mix(in srgb, var(--club-primary) 85%, black)",
                border: "1px solid color-mix(in srgb, var(--club-primary) 25%, white)",
              }}
            >
              <Radio className="w-2.5 h-2.5 animate-pulse" />
              Batting
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Player Row ─── */
function PlayerRow({ name, stat, isStriker }) {
  return (
    <div className="flex items-center justify-between">
      <span
        className={`text-xs truncate mr-2 ${isStriker ? "font-bold" : "font-medium text-slate-500"}`}
        style={{ color: isStriker ? "var(--club-primary)" : undefined }}
      >
        {isStriker && (
          <span
            className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle"
            style={{ background: "var(--club-primary)" }}
          />
        )}
        {name}
      </span>
      <span className="text-[11px] font-mono font-semibold text-slate-500 whitespace-nowrap">
        {stat}
      </span>
    </div>
  );
}

/* ─── Animation Video Overlay ─── */
function AnimationOverlay({ playerName, type, onComplete }) {
  const playCountRef = useRef(0);

  // Callback ref — fires exactly when the DOM video element mounts
  const videoCallbackRef = useCallback(
    (node) => {
      if (!node) return;
      node.play().catch((e) => console.warn("animation autoplay blocked:", e));
    },
    []
  );

  const handleVideoEnded = useCallback(
    (e) => {
      playCountRef.current += 1;
      if (playCountRef.current < 2) {
        // Play a second time
        e.target.currentTime = 0;
        e.target.play().catch((err) => console.warn("animation replay blocked:", err));
      } else {
        onComplete();
      }
    },
    [onComplete]
  );

  // Capitalize type for label (e.g., "Duckout", "Four", "Six")
  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);

  return (
    <motion.div
      key="animation-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="absolute inset-0 z-50 flex items-center justify-center overflow-hidden rounded-2xl"
      style={{ pointerEvents: "none" }}
    >
      {/* Dark backdrop */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(135deg, rgba(0,0,0,0.85), rgba(0,0,0,0.65))",
          backdropFilter: "blur(6px)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center justify-center w-[60%] max-h-[80%]">
        {/* Scaled video container */}
        <div className="w-full relative aspect-video shadow-2xl rounded-xl overflow-hidden"
             style={{ filter: "drop-shadow(0 0 30px rgba(255, 215, 0, 0.4))" }}>
          <video
            ref={videoCallbackRef}
            src={`/${type}.mp4`}
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
            onEnded={handleVideoEnded}
          />
        </div>

        {/* Text Label */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-4 px-4 py-2 rounded-full font-bold text-white text-sm whitespace-nowrap overflow-hidden text-ellipsis max-w-full"
          style={{
            background: "linear-gradient(135deg, rgba(245, 158, 11, 0.9), rgba(217, 119, 6, 0.9))",
            boxShadow: "0 4px 15px rgba(245, 158, 11, 0.4)",
            border: "1px solid rgba(255, 255, 255, 0.2)"
          }}
        >
          {typeLabel} - {playerName}
        </motion.div>
      </div>
    </motion.div>
  );
}
