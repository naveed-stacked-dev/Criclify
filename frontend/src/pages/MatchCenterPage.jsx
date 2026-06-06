import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { io } from "socket.io-client";
import publicService from "@/services/publicService";
import { Radio, Loader2, Calendar, PlayCircle, Eye, ArrowLeft } from "lucide-react";
import { decodeId } from "@/utils/crypto";

export default function MatchCenterPage() {
  const { id: rawId } = useParams();
  const id = decodeId(rawId);
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [scorecard, setScorecard] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewers, setViewers] = useState(0);
  const [tab, setTab] = useState("scorecard");
  const socketRef = useRef(null);

  // Fetch initial data
  useEffect(() => {
    const fetch = async () => {
      try {
        const [mRes, scRes, evRes] = await Promise.allSettled([
          publicService.getMatch(id),
          publicService.getMatchScorecard(id),
          publicService.getMatchEvents(id),
        ]);
        if (mRes.status === "fulfilled") setMatch(mRes.value.data?.data || mRes.value.data);
        if (scRes.status === "fulfilled") setScorecard(scRes.value.data?.data || scRes.value.data);
        if (evRes.status === "fulfilled") {
          const ed = evRes.value.data?.data || evRes.value.data?.events || evRes.value.data || [];
          setEvents(Array.isArray(ed) ? ed : []);
        }
      } catch { /* handled */ }
      finally { setLoading(false); }
    };
    fetch();
  }, [id]);

  // Socket connection for live updates
  useEffect(() => {
    const s = io(import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5000", {
      withCredentials: true,
    });
    socketRef.current = s;

    s.emit("join_match", { matchId: id });
    s.emit("get_viewers", { matchId: id });

    s.on("score_update", async () => {
      try {
        const [scRes, evRes] = await Promise.allSettled([
          publicService.getMatchScorecard(id),
          publicService.getMatchEvents(id),
        ]);
        if (scRes.status === "fulfilled") setScorecard(scRes.value.data?.data || scRes.value.data);
        if (evRes.status === "fulfilled") {
          const ed = evRes.value.data?.data || evRes.value.data?.events || evRes.value.data || [];
          setEvents(Array.isArray(ed) ? ed : []);
        }
      } catch { /* handled */ }
    });

    s.on("viewers_count", ({ count }) => setViewers(count));

    return () => {
      s.emit("leave_match", { matchId: id });
      s.disconnect();
    };
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>;

  if (!match) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-gray-500">
        <Calendar className="w-16 h-16 mb-4 opacity-20" />
        <p className="text-lg">Match not found</p>
      </div>
    );
  }

  const isLive = match.status === "live";
  const inningNumber = scorecard?.currentInning || 1;
  const currentInnings = scorecard?.innings?.[inningNumber >= 2 ? "second" : "first"] || {};

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 sm:px-6 max-w-4xl mx-auto">
      {/* Back Button */}
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-6 group cursor-pointer bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl border border-white/5"
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
        Back
      </motion.button>

      {/* Match Header Card */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative overflow-hidden rounded-2xl border p-6 sm:p-8 mb-8 ${
          isLive ? "border-red-500/30 bg-red-500/[0.03]" : "border-white/5 bg-white/[0.02]"
        }`}
      >
        {isLive && (
          <div className="absolute top-4 right-4 flex items-center gap-3">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-medium animate-pulse">
              <Radio className="w-3 h-3" /> LIVE
            </span>
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <Eye className="w-3 h-3" /> {viewers} watching
            </span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-between gap-8">
          {/* Team A */}
          <div className="text-center flex-1">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center mx-auto mb-3 text-2xl font-black text-emerald-400">
              {(match.teamA?.name || "A")[0]}
            </div>
            <h3 className="font-bold text-white text-lg">{match.teamA?.name || "Team A"}</h3>
          </div>

          {/* Score Center */}
          <div className="text-center shrink-0">
            {isLive && scorecard ? (
              <div>
                <p className="text-5xl font-black tracking-tighter text-white">
                  {currentInnings.score || 0}<span className="text-2xl text-gray-500">/{currentInnings.wickets || 0}</span>
                </p>
                <p className="text-sm text-gray-400 mt-1">Overs: {currentInnings.overs?.toFixed(1) || "0.0"}/{match.overs}</p>
              </div>
            ) : match.status === "completed" ? (
              <span className="text-xs px-3 py-1.5 rounded-full bg-gray-500/10 text-gray-400 font-medium">Completed</span>
            ) : (
              <div>
                <span className="text-xs text-gray-500 block">vs</span>
                <p className="text-sm text-gray-400 mt-2">{match.date ? new Date(match.date).toLocaleDateString() : "TBD"}</p>
              </div>
            )}
          </div>

          {/* Team B */}
          <div className="text-center flex-1">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 flex items-center justify-center mx-auto mb-3 text-2xl font-black text-violet-400">
              {(match.teamB?.name || "B")[0]}
            </div>
            <h3 className="font-bold text-white text-lg">{match.teamB?.name || "Team B"}</h3>
          </div>
        </div>

        <div className="text-center mt-4 text-xs text-gray-500">
          {match.venue || "Venue TBD"} • {match.overs} Overs
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-white/5 rounded-xl p-1 max-w-sm mx-auto">
        {[
          { key: "scorecard", label: "Scorecard" },
          { key: "commentary", label: "Ball by Ball" },
          { key: "stream", label: "Live Stream" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              tab === t.key ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25" : "text-gray-400 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Scorecard Tab */}
      {tab === "scorecard" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {!scorecard ? (
            <div className="text-center py-16 border border-white/5 rounded-2xl bg-white/[0.02]">
              <p className="text-gray-500 text-sm">Scorecard not available yet. Match hasn't started.</p>
            </div>
          ) : (
            <div className="border border-white/5 rounded-2xl bg-white/[0.02] overflow-hidden">
              <div className="p-4 border-b border-white/5">
                <h3 className="font-semibold text-sm">Innings {scorecard.currentInning || 1}</h3>
              </div>
              <div className="p-4 text-center text-gray-500 text-sm">
                <p className="text-4xl font-black text-white mb-2">
                  {currentInnings.score || 0}/{currentInnings.wickets || 0}
                </p>
                <p>Overs: {currentInnings.overs?.toFixed(1) || "0.0"}</p>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Ball by Ball Tab */}
      {tab === "commentary" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
          {events.length === 0 ? (
            <div className="text-center py-16 border border-white/5 rounded-2xl bg-white/[0.02]">
              <p className="text-gray-500 text-sm">No events yet</p>
            </div>
          ) : (
            <div data-lenis-prevent className="max-h-[500px] overflow-y-auto overscroll-contain pr-2 space-y-4">
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
                  <div key={idx} className="border border-white/5 rounded-2xl bg-white/[0.02] overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                      <span className="font-semibold text-sm text-white">Over {group.over}</span>
                      <div className="flex gap-2 items-center">
                        {group.hasWicket && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 uppercase tracking-wide">Wicket</span>}
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white/5 text-gray-300">
                          {group.totalRuns} Run{group.totalRuns !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    <div className="divide-y divide-white/5">
                      {group.events.map((ev, i) => {
                        const isWicket = ev.isWicket || ev.eventType === "wicket";
                        const isSix = ev.isSix || ev.runs === 6;
                        const isFour = ev.isBoundary || ev.runs === 4;
                        const isExtra = ["wide", "noball", "bye", "legbye"].includes(ev.eventType);

                        const badge = isWicket ? { bg: "bg-red-500/15", color: "text-red-400", border: "border-red-500/30", label: "W" }
                          : isSix ? { bg: "bg-violet-500/15", color: "text-violet-400", border: "border-violet-500/30", label: "6" }
                          : isFour ? { bg: "bg-blue-500/15", color: "text-blue-400", border: "border-blue-500/30", label: "4" }
                          : isExtra ? { bg: "bg-amber-500/15", color: "text-amber-400", border: "border-amber-500/30", label: ev.extraType?.[0]?.toUpperCase() || ev.eventType?.[0]?.toUpperCase() || "E" }
                          : { bg: "bg-white/5", color: "text-gray-300", border: "border-white/5", label: ev.runs ?? "·" };

                        const batsman = ev.batsmanId?.name || ev.batsmanId;
                        const bowler = ev.bowlerId?.name || ev.bowlerId;
                        const ballNumber = `${ev.over ?? "?"}.${ev.ball ?? "?"}`;

                        return (
                          <div key={i} className="flex items-start gap-4 p-4 hover:bg-white/[0.02] transition-colors group">
                            <div className="flex flex-col items-center shrink-0 w-12 pt-0.5">
                              <span className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black border transition-transform group-hover:scale-110 shadow-sm ${badge.bg} ${badge.color} ${badge.border}`}>
                                {badge.label}
                              </span>
                              <span className="text-[10px] font-bold mt-2 text-gray-500 tracking-wide">{ballNumber}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-semibold text-gray-500 mb-1 flex items-center flex-wrap gap-1.5">
                                <span className="text-gray-300">{bowler || "Bowler"}</span>
                                <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">Bowler</span>
                                <span>to</span>
                                <span className="text-gray-300">{batsman || "Batsman"}</span>
                                <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">Batsman</span>
                              </p>
                              <p className="text-sm font-medium text-gray-200 leading-relaxed">
                                {ev.description || (isWicket ? (
                                  <span className="text-red-400 font-bold">OUT! {ev.wicket?.type?.replace(/-/g, ' ') || ""}</span>
                                ) : isSix ? (
                                  <span className="text-violet-400 font-bold">SIX runs!</span>
                                ) : isFour ? (
                                  <span className="text-blue-400 font-bold">FOUR runs!</span>
                                ) : isExtra ? (
                                  <span>{ev.extras?.runs} {ev.extraType || ev.eventType}</span>
                                ) : (
                                  `${ev.runs ?? 0} run${ev.runs !== 1 ? "s" : ""}`
                                ))}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
        </motion.div>
      )}

      {/* Live Stream Tab */}
      {tab === "stream" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {match.streamUrl ? (
            <div className="aspect-video rounded-2xl overflow-hidden border border-white/5">
              <iframe
                src={match.streamUrl}
                className="w-full h-full"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            </div>
          ) : (
            <div className="text-center py-16 border border-white/5 rounded-2xl bg-white/[0.02]">
              <PlayCircle className="w-12 h-12 mx-auto mb-3 text-gray-600" />
              <p className="text-gray-500 text-sm">No live stream available for this match</p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
