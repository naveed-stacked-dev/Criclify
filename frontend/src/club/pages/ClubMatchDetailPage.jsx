import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useOutletContext, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { io } from "socket.io-client";
import clubService from "../services/clubService";
import {
  Radio, Loader2, Calendar, PlayCircle, Eye, ArrowLeft,
  Trophy, Activity, Clock, MapPin, Zap, ChevronRight,
  ShieldAlert, Target, TrendingUp,
} from "lucide-react";
import { decodeId } from "../../utils/crypto";

export default function ClubMatchDetailPage() {
  const { matchId: rawMatchId, slug } = useParams();
  const matchId = decodeId(rawMatchId);
  const navigate = useNavigate();
  const { club } = useOutletContext();

  const [match, setMatch] = useState(null);
  const [scorecard, setScorecard] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewers, setViewers] = useState(0);
  const [tab, setTab] = useState("scorecard");
  const socketRef = useRef(null);

  // The real MongoDB _id — resolved once the match is fetched
  // (matchId param may be a slug)
  const realMatchIdRef = useRef(null);

  const fetchAll = async (resolvedId) => {
    const id = resolvedId || realMatchIdRef.current || matchId;
    const [mRes, scRes, evRes] = await Promise.allSettled([
      clubService.getMatchById(matchId),      // can be slug — backend resolves it
      clubService.getMatchScorecard(matchId),  // same
      clubService.getMatchEvents(matchId),     // same
    ]);
    if (mRes.status === "fulfilled") {
      const m = mRes.value.data?.data || mRes.value.data;
      setMatch(m);
      // Store the real _id so socket can use it
      if (m?._id) realMatchIdRef.current = m._id;
    }
    if (scRes.status === "fulfilled") setScorecard(scRes.value.data?.data || scRes.value.data);
    if (evRes.status === "fulfilled") {
      const ed = evRes.value.data?.data || evRes.value.data?.events || evRes.value.data || [];
      setEvents(Array.isArray(ed) ? ed : []);
    }
  };

  useEffect(() => {
    const load = async () => { try { await fetchAll(); } catch {} finally { setLoading(false); } };
    load();
  }, [matchId]);

  useEffect(() => {
    // Wait until we have the real _id before joining socket room
    const getIdAndConnect = async () => {
      let id = realMatchIdRef.current;
      if (!id) {
        // If match not loaded yet, fetch the id first
        try {
          const res = await clubService.getMatchById(matchId);
          id = res.data?.data?._id || res.data?._id;
          realMatchIdRef.current = id;
        } catch { return; }
      }
      const s = io(import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5000", { withCredentials: true });
      socketRef.current = s;
      s.emit("join_match", { matchId: id });
      s.emit("get_viewers", { matchId: id });
      s.on("score_update", async () => { try { await fetchAll(); } catch {} });
      s.on("viewers_count", ({ count }) => setViewers(count));
      return () => { s.emit("leave_match", { matchId: id }); s.disconnect(); };
    };
    getIdAndConnect();
    return () => { socketRef.current?.disconnect(); };
  }, [matchId]);

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--club-primary)" }} />
    </div>
  );

  if (!match) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center" style={{ color: "var(--club-text-muted)" }}>
      <Calendar className="w-14 h-14 mb-4 opacity-20" />
      <p className="text-base font-medium">Match not found</p>
      <button onClick={() => navigate(`/clubs/${slug}/matches`)} className="mt-4 text-sm font-semibold px-4 py-2 rounded-xl border" style={{ borderColor: "var(--club-border)", color: "var(--club-primary)" }}>
        ← Back to Matches
      </button>
    </div>
  );

  const isLive = match.status === "live";
  const isCompleted = match.status === "completed";
  const winner = match.result?.winner;
  const winnerId = typeof winner === "object" ? winner?._id : winner;
  const teamAId = match.teamA?._id || match.teamA?.id;
  const teamBId = match.teamB?._id || match.teamB?.id;
  const currentInning = scorecard?.currentInning || 1;

  const firstBattingId = typeof scorecard?.innings?.first?.battingTeamId === "object"
    ? scorecard?.innings?.first?.battingTeamId?._id
    : scorecard?.innings?.first?.battingTeamId;

  const teamABatsFirst = firstBattingId ? firstBattingId !== teamBId : true;
  const teamAInning = teamABatsFirst ? scorecard?.innings?.first : scorecard?.innings?.second;
  const teamBInning = teamABatsFirst ? scorecard?.innings?.second : scorecard?.innings?.first;
  const isTeamABatting = teamABatsFirst ? currentInning === 1 : currentInning >= 2;
  const isTeamBBatting = teamABatsFirst ? currentInning >= 2 : currentInning === 1;

  const teamAIsLeft = isTeamABatting || (!isTeamBBatting && teamABatsFirst);

  const leftTeam = teamAIsLeft ? match.teamA : match.teamB;
  const leftInning = teamAIsLeft ? teamAInning : teamBInning;
  const leftIsBatting = teamAIsLeft ? isTeamABatting : isTeamBBatting;
  const leftId = teamAIsLeft ? teamAId : teamBId;

  const rightTeam = teamAIsLeft ? match.teamB : match.teamA;
  const rightInning = teamAIsLeft ? teamBInning : teamAInning;
  const rightIsBatting = teamAIsLeft ? isTeamBBatting : isTeamABatting;
  const rightId = teamAIsLeft ? teamBId : teamAId;

  const inningsToShow = [
    scorecard?.innings?.first && { key: "first", label: `1st Innings`, data: scorecard.innings.first },
    scorecard?.innings?.second?.battingTeamId && { key: "second", label: `2nd Innings`, data: scorecard.innings.second },
    scorecard?.innings?.superOverFirst?.battingTeamId && { key: "superOverFirst", label: `Super Over — 1st`, data: scorecard.innings.superOverFirst },
    scorecard?.innings?.superOverSecond?.battingTeamId && { key: "superOverSecond", label: `Super Over — 2nd`, data: scorecard.innings.superOverSecond },
  ].filter(Boolean);

  const tabs = [
    { key: "scorecard", label: "Scorecard", icon: Activity },
    { key: "commentary", label: "Ball by Ball", icon: Zap },
    { key: "stream", label: "Live Stream", icon: PlayCircle },
  ];

  return (
    <div className="space-y-5">
      {/* Back */}
      <motion.button initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
        onClick={() => navigate(`/clubs/${slug}/matches`)}
        className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl border transition-all hover:shadow-sm group"
        style={{ borderColor: "var(--club-border)", color: "var(--club-text-muted)", backgroundColor: "var(--club-surface)" }}>
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> Back to Matches
      </motion.button>

      {/* Match Header */}
      <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} className="glass-surface p-5 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: "var(--club-primary)" }} />

        {/* Status Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs px-3 py-1 rounded-full font-semibold capitalize flex items-center gap-1.5"
              style={{ background: isLive ? "rgba(239,68,68,0.1)" : isCompleted ? "rgba(34,197,94,0.1)" : "rgba(100,116,139,0.1)", color: isLive ? "#ef4444" : isCompleted ? "#22c55e" : "#64748b" }}>
              {isLive && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
              {match.status}
            </span>
            {match.tournamentId?.name && <span className="text-xs font-medium px-3 py-1 rounded-full bg-slate-100" style={{ color: "var(--club-text-muted)" }}>{match.tournamentId.name}</span>}
            {match.matchLabel && <span className="text-xs font-medium px-3 py-1 rounded-full bg-slate-100" style={{ color: "var(--club-text-muted)" }}>{match.matchLabel}</span>}
          </div>
          <div className="flex items-center gap-4 text-xs" style={{ color: "var(--club-text-muted)" }}>
            {isLive && <span className="flex items-center gap-1.5 font-medium text-red-500"><Eye className="w-3.5 h-3.5" />{viewers} watching</span>}
            {match.startTime && <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{new Date(match.startTime).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>}
            {match.venue && <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{match.venue}</span>}
            {match.oversPerInning && <span className="flex items-center gap-1.5"><Target className="w-3.5 h-3.5" />{match.oversPerInning} overs</span>}
          </div>
        </div>

        {/* Teams */}
        <div className="flex items-center justify-between gap-4">
          <TeamHeader team={leftTeam} innings={leftInning} isWinner={winnerId === leftId} isBatting={isLive && leftIsBatting} />
          <div className="text-center shrink-0 px-3">
            {isCompleted ? (
              <div className="space-y-1">
                <Trophy className="w-5 h-5 mx-auto" style={{ color: "var(--club-primary)" }} />
                {match.result?.summary && <p className="text-xs font-semibold max-w-[120px] text-center leading-tight" style={{ color: "var(--club-primary)" }}>{match.result.summary}</p>}
              </div>
            ) : isLive ? (
              <span className="text-xs font-bold text-red-500 flex items-center gap-1"><Radio className="w-3 h-3 animate-pulse" />LIVE</span>
            ) : (
              <span className="text-lg font-black" style={{ color: "var(--club-text-muted)" }}>vs</span>
            )}
          </div>
          <TeamHeader team={rightTeam} innings={rightInning} isWinner={winnerId === rightId} isBatting={isLive && rightIsBatting} reverse />
        </div>

        {/* Target Banner */}
        {isLive && scorecard?.target && currentInning >= 2 && (
          <div className="mt-4 pt-4 border-t text-center text-sm font-semibold" style={{ borderColor: "var(--club-border)", color: "var(--club-primary)" }}>
            🎯 Target: {scorecard.target} &nbsp;|&nbsp; Need {Math.max(0, scorecard.target - (scorecard?.innings?.second?.score || 0))} runs
            {scorecard.requiredRunRate ? ` · RRR: ${scorecard.requiredRunRate}` : ""}
          </div>
        )}
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl border" style={{ backgroundColor: "var(--club-surface)", borderColor: "var(--club-border)" }}>
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all"
            style={tab === key ? { background: "var(--club-primary)", color: "#fff" } : { color: "var(--club-text-muted)" }}>
            <Icon className="w-3.5 h-3.5" />{label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {tab === "scorecard" && (
          <motion.div key="scorecard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
            {!scorecard || inningsToShow.length === 0 ? (
              <div className="glass-surface p-16 text-center">
                <Activity className="w-10 h-10 mx-auto mb-3 opacity-20" style={{ color: "var(--club-text-muted)" }} />
                <p className="text-sm" style={{ color: "var(--club-text-muted)" }}>Scorecard not available yet. Match hasn't started.</p>
              </div>
            ) : (
              inningsToShow.map(({ key, label, data }) => (
                <InningsBlock key={key} label={label} data={data} slug={slug} />
              ))
            )}
          </motion.div>
        )}

        {tab === "commentary" && (
          <motion.div key="commentary" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {events.length === 0 ? (
              <div className="glass-surface p-16 text-center">
                <Zap className="w-10 h-10 mx-auto mb-3 opacity-20" style={{ color: "var(--club-text-muted)" }} />
                <p className="text-sm" style={{ color: "var(--club-text-muted)" }}>No ball-by-ball commentary yet</p>
              </div>
            ) : (
              <div className="glass-surface overflow-hidden">
                <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--club-border)" }}>
                  <h3 className="text-sm font-bold" style={{ color: "var(--club-text-main)" }}>Ball by Ball Commentary</h3>
                  <span className="text-xs" style={{ color: "var(--club-text-muted)" }}>{events.length} deliveries</span>
                </div>
                <div data-lenis-prevent className="max-h-[520px] overflow-y-auto overscroll-contain pr-2 club-scroll space-y-4 pt-1" style={{ borderColor: "var(--club-border)" }}>
                  {(() => {
                    const groupedEvents = [];
                    let currentGroup = null;
                    [...events].forEach((ev) => {
                      if (!currentGroup || currentGroup.over !== ev.over) {
                        currentGroup = { over: ev.over, events: [], totalRuns: 0, hasWicket: false };
                        groupedEvents.push(currentGroup);
                      }
                      currentGroup.events.push(ev);
                      currentGroup.totalRuns += (ev.runs || 0) + (ev.extras?.runs || 0);
                      if (ev.isWicket || ev.eventType === "wicket") currentGroup.hasWicket = true;
                    });

                    return groupedEvents.map((group, idx) => (
                      <div key={idx} className="glass-surface overflow-hidden border rounded-xl" style={{ borderColor: "var(--club-border)" }}>
                        <div className="px-4 py-2.5 border-b flex justify-between items-center" style={{ borderColor: "var(--club-border)", background: "color-mix(in srgb, var(--club-primary) 8%, transparent)" }}>
                          <span className="font-bold text-sm" style={{ color: "var(--club-text-main)" }}>Over {group.over}</span>
                          <div className="flex gap-2 items-center">
                            {group.hasWicket && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 uppercase">Wicket</span>}
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg" style={{ backgroundColor: "var(--club-surface)", color: "var(--club-text-main)" }}>
                              {group.totalRuns} Run{group.totalRuns !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                        <div className="divide-y" style={{ borderColor: "var(--club-border)" }}>
                          {group.events.map((ev, i) => <EventRow key={ev._id || i} ev={ev} />)}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {tab === "stream" && (
          <motion.div key="stream" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {match.youtubeStreamUrl ? (
              <div className="aspect-video rounded-2xl overflow-hidden border" style={{ borderColor: "var(--club-border)" }}>
                <iframe src={match.youtubeStreamUrl} className="w-full h-full" allowFullScreen title="Live Stream" />
              </div>
            ) : (
              <div className="glass-surface p-16 text-center">
                <PlayCircle className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: "var(--club-text-muted)" }} />
                <p className="text-sm" style={{ color: "var(--club-text-muted)" }}>No live stream available</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Team Header Card ─── */
function TeamHeader({ team, innings, isWinner, isBatting, reverse }) {
  return (
    <div className={`flex-1 flex flex-col ${reverse ? "items-end text-right" : "items-start text-left"}`}>
      <div className={`flex items-center gap-3 ${reverse ? "flex-row-reverse" : ""}`}>
        {team?.logo ? (
          <img src={team.logo} alt={team.name} className="w-12 h-12 rounded-xl object-cover border" style={{ borderColor: "var(--club-border)" }} />
        ) : (
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black border" style={{ borderColor: "var(--club-border)", background: `color-mix(in srgb, var(--club-primary) 10%, transparent)`, color: "var(--club-primary)" }}>
            {(team?.name || "T")[0]}
          </div>
        )}
        <div>
          <p className="font-bold text-base flex items-center gap-1.5" style={{ color: "var(--club-text-main)" }}>
            {isWinner && <Trophy className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--club-primary)" }} />}
            {team?.name || "TBA"}
          </p>
          {isBatting && <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Batting ●</span>}
        </div>
      </div>
      {innings?.score != null && (
        <div className={`mt-2 ${reverse ? "text-right" : ""}`}>
          <p className="text-3xl font-black" style={{ color: "var(--club-text-main)" }}>
            {innings.score}<span className="text-lg font-bold" style={{ color: "var(--club-text-muted)" }}>/{innings.wickets ?? 0}</span>
          </p>
          {innings.overs != null && <p className="text-xs" style={{ color: "var(--club-text-muted)" }}>({typeof innings.overs === "number" ? innings.overs.toFixed(1) : innings.overs} ov)</p>}
        </div>
      )}
    </div>
  );
}

/* ─── Innings Block ─── */
function InningsBlock({ label, data, slug }) {
  const sr = (runs, balls) => balls > 0 ? ((runs / balls) * 100).toFixed(1) : "-";
  const econ = (runs, overs, balls) => {
    const total = (overs || 0) + (balls || 0) / 6;
    return total > 0 ? (runs / total).toFixed(2) : "-";
  };

  return (
    <div className="glass-surface overflow-hidden">
      {/* Innings Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--club-border)", background: "color-mix(in srgb, var(--club-primary) 6%, transparent)" }}>
        <div>
          <h3 className="text-sm font-bold" style={{ color: "var(--club-primary)" }}>{label}</h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--club-text-muted)" }}>
            {data.battingTeamId?.name || "Batting Team"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black" style={{ color: "var(--club-text-main)" }}>
            {data.score ?? 0}<span className="text-base font-semibold" style={{ color: "var(--club-text-muted)" }}>/{data.wickets ?? 0}</span>
          </p>
          <p className="text-xs" style={{ color: "var(--club-text-muted)" }}>
            {typeof data.overs === "number" ? data.overs.toFixed(1) : data.overs ?? "0.0"} ov
            {data.runRate ? ` · RR: ${data.runRate}` : ""}
          </p>
        </div>
      </div>

      {/* Batting Table */}
      <div>
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] px-5 py-2 text-[10px] font-bold uppercase tracking-wider border-b" style={{ color: "var(--club-text-muted)", borderColor: "var(--club-border)", backgroundColor: "var(--club-surface)" }}>
          <span>Batsman</span>
          <span className="w-12 text-center">R</span>
          <span className="w-12 text-center">B</span>
          <span className="w-10 text-center">4s</span>
          <span className="w-10 text-center">6s</span>
          <span className="w-14 text-center">SR</span>
        </div>
        {(data.battingOrder || []).length === 0 ? (
          <p className="text-center py-8 text-sm" style={{ color: "var(--club-text-muted)" }}>No batting data</p>
        ) : data.battingOrder.map((b, i) => {
          const playerId = b.playerId?._id || b.playerId;
          const playerName = b.playerId?.name || "Unknown";
          return (
            <div key={i} className={`grid grid-cols-[1fr_auto_auto_auto_auto_auto] px-5 py-3 text-sm border-b transition-colors ${b.isOut ? "opacity-80" : ""}`}
              style={{ borderColor: "var(--club-border)" }}>
              <div className="min-w-0">
                {playerId ? (
                  <Link to={`/clubs/${slug}/players/${playerId}`} className="font-semibold hover:underline" style={{ color: b.isOut ? "var(--club-text-muted)" : "var(--club-primary)" }}>
                    {playerName}
                  </Link>
                ) : (
                  <span className="font-semibold" style={{ color: "var(--club-text-main)" }}>{playerName}</span>
                )}
                {b.isOut ? (
                  <span className="ml-2 text-[10px] text-red-500 font-medium capitalize">({b.dismissalType?.replace(/-/g, " ") || "out"})</span>
                ) : b.balls > 0 ? (
                  <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "color-mix(in srgb, var(--club-primary) 10%, transparent)", color: "var(--club-primary)" }}>not out</span>
                ) : null}
              </div>
              <span className="w-12 text-center font-black" style={{ color: "var(--club-text-main)" }}>{b.runs}</span>
              <span className="w-12 text-center" style={{ color: "var(--club-text-muted)" }}>{b.balls}</span>
              <span className="w-10 text-center font-medium" style={{ color: "var(--club-text-muted)" }}>{b.fours}</span>
              <span className="w-10 text-center font-medium" style={{ color: "var(--club-text-muted)" }}>{b.sixes}</span>
              <span className="w-14 text-center text-xs font-mono" style={{ color: "var(--club-text-muted)" }}>{sr(b.runs, b.balls)}</span>
            </div>
          );
        })}

        {/* Extras */}
        <div className="px-5 py-3 text-xs border-b flex items-center gap-4 flex-wrap" style={{ borderColor: "var(--club-border)", backgroundColor: "var(--club-surface)", color: "var(--club-text-muted)" }}>
          <span className="font-bold" style={{ color: "var(--club-text-main)" }}>Extras: {data.extras?.total ?? 0}</span>
          <span>(WD {data.extras?.wides ?? 0}, NB {data.extras?.noBalls ?? 0}, B {data.extras?.byes ?? 0}, LB {data.extras?.legByes ?? 0})</span>
          <span className="font-bold ml-auto" style={{ color: "var(--club-text-main)" }}>
            Total: {(data.score ?? 0)} / {data.wickets ?? 0}
          </span>
        </div>
      </div>

      {/* Bowling Table */}
      <div className="border-t-4 border-dashed" style={{ borderColor: "var(--club-border)" }}>
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] px-5 py-2 text-[10px] font-bold uppercase tracking-wider border-b" style={{ color: "var(--club-text-muted)", borderColor: "var(--club-border)", backgroundColor: "var(--club-surface)" }}>
          <span>Bowler</span>
          <span className="w-12 text-center">O</span>
          <span className="w-12 text-center">M</span>
          <span className="w-12 text-center">R</span>
          <span className="w-12 text-center">W</span>
          <span className="w-14 text-center">Econ</span>
        </div>
        {(data.bowlingFigures || []).length === 0 ? (
          <p className="text-center py-8 text-sm" style={{ color: "var(--club-text-muted)" }}>No bowling data</p>
        ) : data.bowlingFigures.map((b, i) => {
          const playerId = b.playerId?._id || b.playerId;
          const playerName = b.playerId?.name || "Unknown";
          return (
            <div key={i} className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] px-5 py-3 text-sm border-b" style={{ borderColor: "var(--club-border)" }}>
              <div>
                {playerId ? (
                  <Link to={`/clubs/${slug}/players/${playerId}`} className="font-semibold hover:underline" style={{ color: "var(--club-primary)" }}>
                    {playerName}
                  </Link>
                ) : (
                  <span className="font-semibold" style={{ color: "var(--club-text-main)" }}>{playerName}</span>
                )}
              </div>
              <span className="w-12 text-center font-mono text-xs" style={{ color: "var(--club-text-muted)" }}>{b.overs ?? 0}.{b.balls ?? 0}</span>
              <span className="w-12 text-center" style={{ color: "var(--club-text-muted)" }}>{b.maidens ?? 0}</span>
              <span className="w-12 text-center font-medium" style={{ color: "var(--club-text-muted)" }}>{b.runs ?? 0}</span>
              <span className="w-12 text-center font-black text-red-500">{b.wickets ?? 0}</span>
              <span className="w-14 text-center text-xs font-mono" style={{ color: "var(--club-text-muted)" }}>{econ(b.runs, b.overs, b.balls)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Event Row ─── */
function EventRow({ ev }) {
  const isWicket = ev.isWicket || ev.eventType === "wicket";
  const isSix = ev.isSix || ev.runs === 6;
  const isFour = ev.isBoundary || ev.runs === 4;
  const isExtra = ["wide", "noball", "bye", "legbye"].includes(ev.eventType);

  const badge = isWicket ? { bg: "rgba(239,68,68,0.15)", color: "#ef4444", label: "W", border: "rgba(239,68,68,0.3)" }
    : isSix ? { bg: "rgba(139,92,246,0.15)", color: "#8b5cf6", label: "6", border: "rgba(139,92,246,0.3)" }
    : isFour ? { bg: "rgba(59,130,246,0.15)", color: "#3b82f6", label: "4", border: "rgba(59,130,246,0.3)" }
    : isExtra ? { bg: "rgba(245,158,11,0.15)", color: "#f59e0b", label: ev.extraType?.[0]?.toUpperCase() || ev.eventType?.[0]?.toUpperCase() || "E", border: "rgba(245,158,11,0.3)" }
    : { bg: "var(--club-surface)", color: "var(--club-text-main)", label: ev.runs ?? "·", border: "var(--club-border)" };

  const batsman = ev.batsmanId?.name || ev.batsmanId;
  const bowler = ev.bowlerId?.name || ev.bowlerId;
  const ballNumber = `${ev.over ?? "?"}.${ev.ball ?? "?"}`;

  return (
    <div className="flex items-start gap-4 px-5 py-4 transition-colors hover:bg-black/5 dark:hover:bg-white/5 group">
      <div className="flex flex-col items-center shrink-0 w-12 pt-1">
        <span className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black transition-transform group-hover:scale-110 shadow-sm border" 
          style={{ background: badge.bg, color: badge.color, borderColor: badge.border }}>
          {badge.label}
        </span>
        <span className="text-[10px] font-bold mt-2 tracking-wide" style={{ color: "var(--club-text-muted)" }}>{ballNumber}</span>
      </div>
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="text-[13px] font-semibold mb-1 flex items-center flex-wrap gap-1.5" style={{ color: "var(--club-text-muted)" }}>
          <span style={{ color: "var(--club-text-main)" }}>{bowler || "Bowler"}</span>
          <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ backgroundColor: "color-mix(in srgb, var(--club-primary) 10%, transparent)", color: "var(--club-primary)" }}>Bowler</span>
          <span>to</span>
          <span style={{ color: "var(--club-text-main)" }}>{batsman || "Batsman"}</span>
          <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ backgroundColor: "color-mix(in srgb, var(--club-primary) 10%, transparent)", color: "var(--club-primary)" }}>Batsman</span>
        </p>
        <p className="text-sm leading-relaxed font-medium" style={{ color: "var(--club-text-main)" }}>
          {ev.description || (isWicket ? (
            <span className="text-red-500 font-bold">OUT! {ev.wicket?.type?.replace(/-/g, ' ') || ""}</span>
          ) : isSix ? (
            <span className="text-purple-500 font-bold">SIX runs!</span>
          ) : isFour ? (
            <span className="text-blue-500 font-bold">FOUR runs!</span>
          ) : isExtra ? (
            <span>{ev.extras?.runs} {ev.extraType || ev.eventType}</span>
          ) : (
            `${ev.runs ?? 0} run${ev.runs !== 1 ? "s" : ""}`
          ))}
        </p>
      </div>
    </div>
  );
}
