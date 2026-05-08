import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { io } from "socket.io-client";
import publicService from "@/services/publicService";
import { Radio, Loader2, Calendar, PlayCircle, Eye, ArrowLeft } from "lucide-react";

export default function MatchCenterPage() {
  const { id } = useParams();
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
            <div className="border border-white/5 rounded-2xl bg-white/[0.02] p-4 max-h-[500px] overflow-y-auto space-y-2">
              {[...events].reverse().map((ev, idx) => (
                <div key={idx} className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/[0.02] transition-colors">
                  <span className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    ev.type === "wicket" ? "bg-red-500/10 text-red-400" :
                    ev.runs === 4 ? "bg-blue-500/10 text-blue-400" :
                    ev.runs === 6 ? "bg-violet-500/10 text-violet-400" :
                    ev.type === "extra" ? "bg-amber-500/10 text-amber-400" :
                    "bg-white/5 text-gray-400"
                  }`}>
                    {ev.type === "wicket" ? "W" : ev.type === "extra" ? ev.extraType?.[0]?.toUpperCase() || "E" : ev.runs}
                  </span>
                  <div>
                    <p className="text-sm text-white">{ev.description || `${ev.runs || 0} run${ev.runs !== 1 ? "s" : ""}`}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Over {ev.over || "?"}</p>
                  </div>
                </div>
              ))}
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
