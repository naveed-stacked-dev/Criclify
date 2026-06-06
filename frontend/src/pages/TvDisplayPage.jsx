import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Radio, Maximize2, Minimize2, Sun, Moon } from "lucide-react";
import publicService from "../services/publicService";
import { connectSocket, disconnectSocket, joinMatch, leaveMatch, onEvent } from "../club/services/liveScoreSocket";
import { decodeId } from "../utils/crypto";

// ── helpers ───────────────────────────────────────────────────────────────────
const getInningsKey = (n) =>
  ["first", "second", "superOverFirst", "superOverSecond"][(n ?? 1) - 1] || "first";

const getPlayerName = (player) => {
  if (!player?.playerId) return null;
  return typeof player.playerId === "object" ? (player.playerId.name || null) : null;
};

const getPlayerAvatar = (player) => {
  if (!player?.playerId || typeof player.playerId !== "object") return null;
  return player.playerId.avatar || null;
};

// ── theme palettes (light / dark) ─────────────────────────────────────────────
const THEME = {
  light: {
    pageBg:         "#f1f5f9",
    cardBg:         "#ffffff",
    cardBorder:     "#e2e8f0",
    panelBg:        "#ffffff",
    panelBorder:    "#f1f5f9",
    panelsAreaBg:   "#f8fafc",
    footerBg:       "#f1f5f9",
    footerBorder:   "#e2e8f0",
    divider:        "#e2e8f0",
    vsBg:           "#f1f5f9",
    textPrimary:    "#1e293b",
    textSecondary:  "#64748b",
    textMuted:      "#94a3b8",
    textFaint:      "#cbd5e1",
    logoFallbackBg: "#f1f5f9",
    logoImgBorder:  "#f1f5f9",
  },
  dark: {
    pageBg:         "#0b1120",
    cardBg:         "#1e293b",
    cardBorder:     "#334155",
    panelBg:        "#0f172a",
    panelBorder:    "#334155",
    panelsAreaBg:   "#172132",
    footerBg:       "#0f172a",
    footerBorder:   "#334155",
    divider:        "#334155",
    vsBg:           "#0f172a",
    textPrimary:    "#f1f5f9",
    textSecondary:  "#cbd5e1",
    textMuted:      "#94a3b8",
    textFaint:      "#64748b",
    logoFallbackBg: "#334155",
    logoImgBorder:  "#334155",
  },
};

// ── main page ─────────────────────────────────────────────────────────────────
export default function TvDisplayPage() {
  const { matchId: rawMatchId } = useParams();
  const matchId = decodeId(rawMatchId);

  const [match, setMatch]         = useState(null);
  const [scorecard, setScorecard] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [showAnim, setShowAnim]   = useState(false);
  const [animEvent, setAnimEvent] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [animEnabled, setAnimEnabled] = useState(true);
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem("tvDisplayDark") === "1"; } catch { return false; }
  });
  const pageRef = useRef(null);

  const t = dark ? THEME.dark : THEME.light;

  useEffect(() => {
    try { localStorage.setItem("tvDisplayDark", dark ? "1" : "0"); } catch {}
  }, [dark]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      pageRef.current?.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const fetchScorecard = useCallback(async () => {
    if (!matchId) return;
    try {
      const res = await publicService.getMatchScorecard(matchId);
      setScorecard(res.data?.data || res.data);
    } catch {}
  }, [matchId]);

  // Initial load
  useEffect(() => {
    if (!matchId) return;
    const load = async () => {
      try {
        const [mRes, sRes] = await Promise.allSettled([
          publicService.getMatch(matchId),
          publicService.getMatchScorecard(matchId),
        ]);
        if (mRes.status === "fulfilled") setMatch(mRes.value.data?.data || mRes.value.data);
        if (sRes.status === "fulfilled") setScorecard(sRes.value.data?.data || sRes.value.data);
      } catch {}
      finally { setLoading(false); }
    };
    load();
  }, [matchId]);

  // Socket live updates
  useEffect(() => {
    if (!matchId) return;
    const sock = connectSocket();

    const onConnectOrReconnect = () => joinMatch(matchId);
    if (sock.connected) joinMatch(matchId);
    sock.on("connect", onConnectOrReconnect);

    const offScore = onEvent("score_update", fetchScorecard);

    // Animation events sent directly from backend
    const offSix  = onEvent("six",      (data) => { if (!data?.matchId || data.matchId === matchId) { setAnimEvent({ type: "six",    playerName: data?.playerName || "Batsman" }); setShowAnim(true); } });
    const offFour = onEvent("four",     (data) => { if (!data?.matchId || data.matchId === matchId) { setAnimEvent({ type: "four",   playerName: data?.playerName || "Batsman" }); setShowAnim(true); } });
    const offOut  = onEvent("out",      (data) => { if (!data?.matchId || data.matchId === matchId) { setAnimEvent({ type: "wicket", playerName: data?.playerName || "Batsman" }); setShowAnim(true); } });
    const offDuck = onEvent("duck_out", (data) => { if (!data?.matchId || data.matchId === matchId) { setAnimEvent({ type: "wicket", playerName: data?.playerName || "Batsman" }); setShowAnim(true); } });

    return () => {
      sock.off("connect", onConnectOrReconnect);
      offScore(); offSix(); offFour(); offOut(); offDuck();
      leaveMatch(matchId);
      disconnectSocket();
    };
  }, [matchId, fetchScorecard]);

  // ── loading ──────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ ...S.page, background: t.pageBg }}>
      <div style={{ textAlign: "center" }}>
        <div style={S.spinner} />
        <p style={{ fontSize: S.fs.md, color: t.textSecondary, fontWeight: 600, marginTop: 20 }}>
          Loading live match…
        </p>
      </div>
      <style>{KEYFRAMES}</style>
    </div>
  );

  if (!match) return (
    <div style={{ ...S.page, background: t.pageBg }}>
      <p style={{ fontSize: S.fs.lg, color: t.textMuted, fontWeight: 600 }}>Match not found</p>
      <style>{KEYFRAMES}</style>
    </div>
  );

  // ── data (same logic as LiveScoreWidget) ──────────────────────────────────
  const curInningNum  = scorecard?.currentInning || 1;
  const isSecond      = curInningNum >= 2;
  const firstIn       = scorecard?.innings?.first  || {};
  const secondIn      = scorecard?.innings?.second || {};

  const firstBatId    = typeof firstIn.battingTeamId === "object"
    ? firstIn.battingTeamId?._id : firstIn.battingTeamId;
  const teamBId       = match.teamB?._id || match.teamB?.id;
  const teamABatsFirst = firstBatId ? String(firstBatId) !== String(teamBId) : true;

  const teamAInning   = teamABatsFirst ? firstIn  : secondIn;
  const teamBInning   = teamABatsFirst ? secondIn : firstIn;

  const isTeamABatting = teamABatsFirst
    ? (curInningNum === 1 || curInningNum === 3)
    : (curInningNum === 2 || curInningNum === 4);
  const isTeamBBatting = !isTeamABatting;

  const teamAIsLeft    = isTeamABatting || (!isTeamBBatting && teamABatsFirst);
  const leftTeam       = teamAIsLeft ? match.teamA : match.teamB;
  const leftInning     = teamAIsLeft ? teamAInning : teamBInning;
  const leftIsBatting  = teamAIsLeft ? isTeamABatting : isTeamBBatting;
  const rightTeam      = teamAIsLeft ? match.teamB : match.teamA;
  const rightInning    = teamAIsLeft ? teamBInning  : teamAInning;
  const rightIsBatting = teamAIsLeft ? isTeamBBatting : isTeamABatting;

  const striker    = scorecard?.currentBatsmen?.striker;
  const nonStriker = scorecard?.currentBatsmen?.nonStriker;
  const bowler     = scorecard?.currentBowler;
  const activeIn   = isSecond ? secondIn : firstIn;

  const inningLabel = ["1st Innings", "2nd Innings", "Super Over (1st)", "Super Over (2nd)"][curInningNum - 1] || "1st Innings";

  const runsNeeded = isSecond && scorecard?.target
    ? Math.max(0, scorecard.target - ((leftIsBatting ? leftInning : rightInning).score || 0)) : null;
  const ballsLeft  = isSecond
    ? Math.max(0, (match.oversPerInning || 20) * 6 - ((leftIsBatting ? leftInning : rightInning).balls || 0)) : null;

  const panelStyle = { ...S.panel, background: t.panelBg, border: `1px solid ${t.panelBorder}` };

  return (
    <div ref={pageRef} style={{ ...S.page, background: t.pageBg, '--club-primary': match?.clubId?.theme?.primaryColor || 'var(--club-primary, #ef4444)' }}>
      <div style={{ ...S.card, background: t.cardBg, border: `1px solid ${t.cardBorder}` }}>

        {/* ══ RED LIVE TOP BAR ══ */}
        <div style={{ position: "relative", height: "0.5vh", minHeight: 4, background: "color-mix(in srgb, var(--club-primary, #ef4444) 12%, white)", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, background: "var(--club-primary, #ef4444)", animation: "liveBarPulse 2s ease-in-out infinite", boxShadow: "0 0 16px color-mix(in srgb, var(--club-primary, #ef4444) 60%, transparent)" }} />
        </div>

        {/* ══ HEADER ══ */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.8vh 3.5vw 1vh" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1.8vw" }}>
            <span style={{
              display: "flex", alignItems: "center", gap: "0.7vw",
              padding: "0.6vh 1.4vw", borderRadius: 9999,
              background: "linear-gradient(135deg, #ef4444, #dc2626)",
              boxShadow: "0 2px 16px rgba(239,68,68,0.45)",
              animation: "liveBadgePulse 2s ease-in-out infinite",
              color: "#fff", fontSize: S.fs.badge, fontWeight: 900,
              letterSpacing: "0.18em", textTransform: "uppercase",
            }}>
              <span style={{ width: S.dot, height: S.dot, minWidth: 10, minHeight: 10, borderRadius: "50%", background: "#fff", animation: "liveDot 1.5s ease-in-out infinite" }} />
              LIVE
            </span>
            <span style={{ fontSize: S.fs.sm, fontWeight: 600, color: t.textMuted, letterSpacing: "0.06em" }}>
              {inningLabel}
            </span>
          </div>
          <span style={{ fontSize: S.fs.xs, fontWeight: 500, color: t.textMuted, maxWidth: "30vw", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {match.tournamentId?.name || ""}
          </span>
        </div>

        {/* ══ SCORE SECTION ══ */}
        <div style={{ padding: "0.8vh 3.5vw 2vh" }}>
          <div style={{ display: "flex", alignItems: "stretch", gap: "1vw" }}>
            <TvTeamCard t={t} team={leftTeam}  score={leftInning.score}  wickets={leftInning.wickets}  overs={leftInning.overs}  isBatting={leftIsBatting}  oversMax={match.oversPerInning} />

            {/* VS Divider */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 0.8vw", flexShrink: 0 }}>
              <div style={{ width: 1, flex: 1, background: t.divider }} />
              <div style={{ width: S.vs, height: S.vs, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: t.vsBg, border: `1px solid ${t.divider}`, fontSize: S.fs.vs, fontWeight: 900, color: t.textMuted, margin: "1.5vh 0", flexShrink: 0 }}>VS</div>
              <div style={{ width: 1, flex: 1, background: t.divider }} />
            </div>

            <TvTeamCard t={t} team={rightTeam} score={rightInning.score} wickets={rightInning.wickets} overs={rightInning.overs} isBatting={rightIsBatting} oversMax={match.oversPerInning} />
          </div>

          {/* Target Banner */}
          {isSecond && scorecard?.target && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
              style={{ marginTop: "1.5vh", textAlign: "center", padding: "1.2vh 2vw", borderRadius: "1vw", fontSize: S.fs.sm, fontWeight: 700, letterSpacing: "0.04em", background: "linear-gradient(135deg, color-mix(in srgb, var(--club-primary, #ef4444) 7%, transparent), color-mix(in srgb, var(--club-primary, #ef4444) 12%, transparent))", color: "var(--club-primary, #ef4444)", border: "1px solid color-mix(in srgb, var(--club-primary, #ef4444) 14%, transparent)" }}
            >
              🎯 Need {runsNeeded} from {ballsLeft} balls
              {scorecard.requiredRunRate ? ` • RRR: ${scorecard.requiredRunRate}` : ""}
            </motion.div>
          )}
        </div>

        {/* ══ PLAYERS PANEL ══ */}
        <div style={{ padding: "2vh 3.5vw", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2.5vw", background: t.panelsAreaBg, borderTop: `1px solid ${t.panelBorder}` }}>
          {/* Batting */}
          <div style={panelStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.8vh" }}>
              <h4 style={{ display: "flex", alignItems: "center", gap: "0.6vw", fontSize: S.fs.panelHead, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--club-primary, #ef4444)", margin: 0 }}>
                <span style={{ width: S.dot, height: S.dot, minWidth: 8, minHeight: 8, borderRadius: "50%", background: "var(--club-primary, #ef4444)" }} />
                Batting
              </h4>
              <span style={{ fontSize: S.fs.xs, color: t.textMuted, fontFamily: "monospace", fontWeight: 700 }}>R (B)</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.2vh" }}>
              {striker?.playerId    && <TvPlayerRow t={t} name={getPlayerName(striker)    || "Striker"}     avatar={getPlayerAvatar(striker)}    stat={`${striker.runs    || 0} (${striker.balls    || 0})`} isStriker />}
              {nonStriker?.playerId && <TvPlayerRow t={t} name={getPlayerName(nonStriker) || "Non-Striker"} avatar={getPlayerAvatar(nonStriker)} stat={`${nonStriker.runs || 0} (${nonStriker.balls || 0})`} />}
              {!striker?.playerId && !nonStriker?.playerId && <p style={{ color: t.textFaint, fontSize: S.fs.sm, margin: 0 }}>Batsmen not set</p>}
            </div>
          </div>

          {/* Bowling */}
          <div style={panelStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.8vh" }}>
              <h4 style={{ display: "flex", alignItems: "center", gap: "0.6vw", fontSize: S.fs.panelHead, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--club-primary, #ef4444)", margin: 0 }}>
                <span style={{ width: S.dot, height: S.dot, minWidth: 8, minHeight: 8, borderRadius: "50%", background: "var(--club-primary, #ef4444)" }} />
                Bowling
              </h4>
              <span style={{ fontSize: S.fs.xs, color: t.textMuted, fontFamily: "monospace", fontWeight: 700 }}>W/R (ov)</span>
            </div>
            {bowler?.playerId
              ? <TvPlayerRow t={t} name={getPlayerName(bowler) || "Bowler"} avatar={getPlayerAvatar(bowler)} stat={`${bowler.wickets || 0}/${bowler.runs || 0} (${bowler.overs || 0}.${bowler.balls || 0})`} />
              : <p style={{ color: t.textFaint, fontSize: S.fs.sm, margin: 0 }}>Bowler not set</p>
            }
          </div>
        </div>

        {/* ══ RUN RATE FOOTER ══ */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.5vh 3.5vw", background: t.footerBg, borderTop: `1px solid ${t.footerBorder}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: "3vw" }}>
            <span style={{ fontWeight: 700, fontSize: S.fs.sm, color: t.textSecondary }}>
              CRR: <span style={{ color: "var(--club-primary, #ef4444)" }}>{activeIn.runRate || "0.00"}</span>
            </span>
            {isSecond && (
              <span style={{ fontWeight: 700, fontSize: S.fs.sm, color: t.textSecondary }}>
                RRR: <span style={{ color: "var(--club-primary, #ef4444)" }}>{scorecard?.requiredRunRate || "0.00"}</span>
              </span>
            )}
          </div>
          {match.venue && <span style={{ fontSize: S.fs.xs, color: t.textMuted }}>📍 {match.venue}</span>}
        </div>

        {/* ══ ANIMATION OVERLAY ══ */}
        <AnimatePresence>
          {showAnim && animEvent && animEnabled && (
            <TvAnimationOverlay
              playerName={animEvent.playerName}
              type={animEvent.type}
              onComplete={() => setShowAnim(false)}
            />
          )}
        </AnimatePresence>
      </div>

      {/* ── TOP-RIGHT ACTION BUTTONS ── */}
      <div style={{
        position: "fixed", bottom: "2vh", right: "2vw", zIndex: 9999,
        display: "flex", alignItems: "center", gap: "0.6vw",
      }}>
        {/* Light / dark mode toggle */}
        <button
          onClick={() => setDark(v => !v)}
          title={dark ? "Switch to light mode" : "Switch to dark mode"}
          style={{
            display: "flex", alignItems: "center", gap: "0.4vw",
            padding: "0.7vh 1.2vw", borderRadius: 9999, border: "none", cursor: "pointer",
            background: "rgba(15,23,42,0.60)", backdropFilter: "blur(10px)",
            color: "#fff", fontSize: S.fs.xs, fontWeight: 700,
            boxShadow: "0 4px 24px rgba(0,0,0,0.28)", transition: "background 0.2s, transform 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(15,23,42,0.92)"; e.currentTarget.style.transform = "scale(1.06)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(15,23,42,0.60)"; e.currentTarget.style.transform = "scale(1)"; }}
        >
          {dark
            ? <Sun style={{ width: "clamp(13px,1.3vw,20px)", height: "clamp(13px,1.3vw,20px)" }} />
            : <Moon style={{ width: "clamp(13px,1.3vw,20px)", height: "clamp(13px,1.3vw,20px)" }} />}
        </button>

        {/* Overlays toggle */}
        <button
          onClick={() => setAnimEnabled(v => !v)}
          title={animEnabled ? "Hide celebration overlays" : "Show celebration overlays"}
          style={{
            display: "flex", alignItems: "center", gap: "0.4vw",
            padding: "0.7vh 1.2vw", borderRadius: 9999, border: "none", cursor: "pointer",
            background: "rgba(15,23,42,0.60)", backdropFilter: "blur(10px)",
            color: "#fff", fontSize: S.fs.xs, fontWeight: 700,
            boxShadow: "0 4px 24px rgba(0,0,0,0.28)", transition: "background 0.2s, transform 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(15,23,42,0.92)"; e.currentTarget.style.transform = "scale(1.06)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(15,23,42,0.60)"; e.currentTarget.style.transform = "scale(1)"; }}
        >
          <span style={{ fontSize: "clamp(12px,1.2vw,18px)", lineHeight: 1, textDecoration: animEnabled ? "none" : "line-through", textDecorationThickness: "2px" }}>🦆</span>
          {/* <span>{animEnabled ? "Overlays On" : "Overlays Off"}</span> */}
        </button>

        {/* Fullscreen toggle */}
        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          style={{
            display: "flex", alignItems: "center", gap: "0.4vw",
            padding: "0.7vh 1.2vw", borderRadius: 9999, border: "none", cursor: "pointer",
            background: "rgba(15,23,42,0.60)", backdropFilter: "blur(10px)",
            color: "#fff", fontSize: S.fs.xs, fontWeight: 700,
            boxShadow: "0 4px 24px rgba(0,0,0,0.28)", transition: "background 0.2s, transform 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(15,23,42,0.92)"; e.currentTarget.style.transform = "scale(1.06)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(15,23,42,0.60)"; e.currentTarget.style.transform = "scale(1)"; }}
        >
          {isFullscreen
            ? <Minimize2 style={{ width: "clamp(13px,1.3vw,20px)", height: "clamp(13px,1.3vw,20px)" }} />
            : <Maximize2 style={{ width: "clamp(13px,1.3vw,20px)", height: "clamp(13px,1.3vw,20px)" }} />}
          {/* <span>{isFullscreen ? "Exit" : "Fullscreen"}</span> */}
        </button>
      </div>

      <style>{KEYFRAMES}</style>
    </div>
  );
}

// ── Scale constants (vw/vh fluid) ─────────────────────────────────────────────
const S = {
  page: {
    minHeight: "100vh", width: "100%",
    background: "#f1f5f9",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: "2vh 2vw", fontFamily: "'Inter','Segoe UI',sans-serif", boxSizing: "border-box",
    transition: "background 0.3s",
  },
  card: {
    width: "100%",
    background: "#ffffff",
    borderRadius: "clamp(16px,2vw,32px)",
    border: "1px solid #e2e8f0",
    boxShadow: "0 8px 60px -8px color-mix(in srgb, var(--club-primary, #ef4444) 15%, transparent),0 2px 12px rgba(0,0,0,0.06)",
    overflow: "hidden", position: "relative",
    transition: "background 0.3s, border-color 0.3s",
  },
  panel: {
    background: "#fff", borderRadius: "clamp(10px,1.2vw,20px)",
    padding: "1.5vh 2.5vw", border: "1px solid #f1f5f9",
    boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
  },
  spinner: {
    width: 56, height: 56, borderRadius: "50%",
    border: "5px solid color-mix(in srgb, var(--club-primary, #ef4444) 12%, white)", borderTopColor: "var(--club-primary, #ef4444)",
    animation: "spin 0.8s linear infinite", margin: "0 auto",
  },
  fs: {
    badge:     "clamp(0.7rem,1.4vw,2rem)",
    sm:        "clamp(0.75rem,1.4vw,2rem)",
    xs:        "clamp(0.65rem,1.1vw,1.6rem)",
    md:        "clamp(0.9rem,1.6vw,2.2rem)",
    lg:        "clamp(1.2rem,2.2vw,3rem)",
    teamName:  "clamp(1.2rem,3.2vw,5rem)",
    score:     "clamp(2.5rem,10vw,14rem)",
    wicket:    "clamp(1.5rem,6vw,9rem)",
    overs:     "clamp(0.65rem,1.3vw,1.8rem)",
    player:    "clamp(0.8rem,1.8vw,2.6rem)",
    stat:      "clamp(0.75rem,1.5vw,2.2rem)",
    panelHead: "clamp(0.55rem,0.9vw,1.2rem)",
    vs:        "clamp(0.6rem,1vw,1.4rem)",
  },
  dot: "clamp(6px,0.7vw,12px)",
  logo: "clamp(44px,6vw,100px)",
  vs:   "clamp(36px,4.5vw,76px)",
};

// ── Team Score Card ────────────────────────────────────────────────────────────
function TvTeamCard({ t, team, score, wickets, overs, isBatting }) {
  return (
    <div style={{ flex: 1, minWidth: 0, opacity: isBatting ? 1 : 0.5, transition: "opacity 0.3s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1.2vw", marginBottom: "1.5vh" }}>
        {team?.logo ? (
          <img src={team.logo} alt="" style={{ width: S.logo, height: S.logo, borderRadius: "clamp(8px,1.2vw,18px)", objectFit: "cover", border: `clamp(2px,0.3vw,4px) solid ${t.logoImgBorder}`, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", flexShrink: 0 }} />
        ) : (
          <div style={{ width: S.logo, height: S.logo, borderRadius: "clamp(8px,1.2vw,18px)", display: "flex", alignItems: "center", justifyContent: "center", background: t.logoFallbackBg, border: `clamp(2px,0.3vw,4px) solid ${t.cardBorder}`, fontSize: "clamp(1rem,2.5vw,4rem)", fontWeight: 900, color: t.textMuted, flexShrink: 0 }}>
            {(team?.name || "?")[0]}
          </div>
        )}
        <span style={{ fontSize: S.fs.teamName, fontWeight: 700, color: t.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {team?.name || "TBA"}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "0.4vw" }}>
          {score != null ? (
            <>
              <span style={{ fontSize: S.fs.score, fontWeight: 900, lineHeight: 1, fontVariantNumeric: "tabular-nums", color: isBatting ? "var(--club-primary, #ef4444)" : t.textPrimary }}>{score}</span>
              <span style={{ fontSize: S.fs.wicket, fontWeight: 300, color: t.textMuted, lineHeight: 1 }}>/</span>
              <span style={{ fontSize: S.fs.wicket, fontWeight: 700, lineHeight: 1, fontVariantNumeric: "tabular-nums", color: isBatting ? "var(--club-primary, #ef4444)" : t.textPrimary }}>{wickets || 0}</span>
            </>
          ) : (
            <span style={{ fontSize: S.fs.score, fontWeight: 900, lineHeight: 1, color: t.textFaint }}>—</span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1.5vw", marginTop: "0.8vh" }}>
          {overs != null && <span style={{ fontSize: S.fs.overs, fontWeight: 600, color: t.textSecondary }}>({typeof overs === "number" ? overs.toFixed(1) : overs} ov)</span>}
          {isBatting && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4vw", padding: "0.3vh 0.8vw", borderRadius: 9999, fontSize: S.fs.overs, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", background: "linear-gradient(135deg,color-mix(in srgb, var(--club-primary, #ef4444) 7%, white),color-mix(in srgb, var(--club-primary, #ef4444) 12%, white))", color: "color-mix(in srgb, var(--club-primary, #ef4444) 85%, black)", border: "1px solid color-mix(in srgb, var(--club-primary, #ef4444) 25%, white)" }}>
              <Radio style={{ width: "1.2vw", height: "1.2vw", minWidth: 10, minHeight: 10, animation: "spin 2s linear infinite" }} />
              Batting
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Player Row ─────────────────────────────────────────────────────────────────
function TvPlayerRow({ t, name, avatar, stat, isStriker }) {
  const avatarSize = "clamp(28px,3vw,52px)";
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1vw" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.8vw", minWidth: 0, flex: 1 }}>
        {/* Avatar */}
        {avatar ? (
          <img src={avatar} alt=""
            style={{ width: avatarSize, height: avatarSize, minWidth: "clamp(28px,3vw,52px)", borderRadius: "50%", objectFit: "cover", border: `clamp(2px,0.25vw,3px) solid ${isStriker ? "color-mix(in srgb, var(--club-primary, #ef4444) 25%, white)" : t.cardBorder}`, flexShrink: 0, boxShadow: isStriker ? "0 0 0 clamp(2px,0.25vw,4px) color-mix(in srgb, var(--club-primary, #ef4444) 18%, transparent)" : "none" }}
          />
        ) : (
          <div style={{ width: avatarSize, height: avatarSize, minWidth: "clamp(28px,3vw,52px)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: isStriker ? "color-mix(in srgb, var(--club-primary, #ef4444) 12%, white)" : t.logoFallbackBg, border: `clamp(2px,0.25vw,3px) solid ${isStriker ? "color-mix(in srgb, var(--club-primary, #ef4444) 25%, white)" : t.cardBorder}`, fontSize: "clamp(0.65rem,1.2vw,1.6rem)", fontWeight: 700, color: isStriker ? "var(--club-primary, #ef4444)" : t.textMuted, flexShrink: 0 }}>
            {(name || "?")[0].toUpperCase()}
          </div>
        )}
        {/* Name + striker dot */}
        <span style={{ fontSize: S.fs.player, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: isStriker ? 700 : 500, color: isStriker ? t.textPrimary : t.textSecondary, display: "flex", alignItems: "center", gap: "0.5vw" }}>
          {isStriker && <span style={{ display: "inline-block", width: "0.6vw", height: "0.6vw", minWidth: 6, minHeight: 6, borderRadius: "50%", background: "var(--club-primary, #ef4444)", flexShrink: 0, animation: "liveDot 1.5s ease-in-out infinite" }} />}
          {name}
        </span>
      </div>
      <span style={{ fontSize: S.fs.stat, fontFamily: "monospace", fontWeight: 600, color: t.textSecondary, whiteSpace: "nowrap" }}>{stat}</span>
    </div>
  );
}

// ── Animation Overlay (same logic as LiveScoreWidget) ─────────────────────────
function TvAnimationOverlay({ playerName, type, onComplete }) {
  const playCountRef = useRef(0);

  const videoCallbackRef = useCallback((node) => {
    if (!node) return;
    playCountRef.current = 0;
    node.play().catch((e) => console.warn("autoplay blocked:", e));
  }, []);

  const handleEnded = useCallback((e) => {
    playCountRef.current += 1;
    if (playCountRef.current < 2) {
      e.target.currentTime = 0;
      e.target.play().catch((err) => console.warn("replay blocked:", err));
    } else {
      onComplete();
    }
  }, [onComplete]);

  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);

  return (
    <motion.div key="tv-anim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
      style={{ position: "absolute", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: "inherit", pointerEvents: "none" }}
    >
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,rgba(0,0,0,0.87),rgba(0,0,0,0.68))", backdropFilter: "blur(8px)" }} />
      <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", width: "55%", maxHeight: "82%" }}>
        <div style={{ width: "100%", position: "relative", aspectRatio: "16/9", borderRadius: "clamp(10px,1.5vw,24px)", overflow: "hidden", boxShadow: "0 0 80px rgba(255,215,0,0.35)", filter: "drop-shadow(0 0 40px rgba(255,215,0,0.4))" }}>
          <video ref={videoCallbackRef} src={`/${type}.mp4`} playsInline muted autoPlay
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
            onEnded={handleEnded}
          />
        </div>
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          style={{ marginTop: "2.5vh", padding: "0.8vh 2.5vw", borderRadius: 9999, fontWeight: 900, color: "#fff", fontSize: S.fs.lg, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%", background: "linear-gradient(135deg,rgba(245,158,11,0.92),rgba(217,119,6,0.92))", boxShadow: "0 6px 24px rgba(245,158,11,0.45)", border: "1px solid rgba(255,255,255,0.18)", letterSpacing: "0.04em" }}
        >
          {typeLabel} — {playerName}
        </motion.div>
      </div>
    </motion.div>
  );
}

const KEYFRAMES = `
  @keyframes liveBarPulse  { 0%,100%{opacity:1;}50%{opacity:0.55;} }
  @keyframes liveBadgePulse{ 0%,100%{box-shadow:0 2px 16px rgba(239,68,68,0.45);}50%{box-shadow:0 2px 28px rgba(239,68,68,0.82);} }
  @keyframes liveDot       { 0%,100%{opacity:1;transform:scale(1);}50%{opacity:0.28;transform:scale(0.6);} }
  @keyframes spin          { to{transform:rotate(360deg);} }
`;
