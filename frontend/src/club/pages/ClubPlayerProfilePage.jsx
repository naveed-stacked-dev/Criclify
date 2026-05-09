import { useState, useEffect } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, ArrowLeft, UserCircle, TrendingUp, Target, Zap, ShieldAlert, Star, Award, Activity, BarChart2, Users } from "lucide-react";
import clubService from "../services/clubService";

export default function ClubPlayerProfilePage() {
  const { slug, playerId } = useParams();
  const navigate = useNavigate();
  const { club } = useOutletContext();

  const [player, setPlayer] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await clubService.getPlayer(playerId);
        const d = res.data?.data || res.data;
        setPlayer(d?.player || d);
        setStats(d?.stats || null);
      } catch { /* handled */ }
      finally { setLoading(false); }
    };
    load();
  }, [playerId]);

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--club-primary)" }} />
    </div>
  );

  if (!player) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4" style={{ color: "var(--club-text-muted)" }}>
      <UserCircle className="w-16 h-16 opacity-20" />
      <p className="font-medium">Player not found</p>
      <button onClick={() => navigate(`/clubs/${slug}/players`)} className="text-sm font-semibold px-4 py-2 rounded-xl border" style={{ borderColor: "var(--club-border)", color: "var(--club-primary)" }}>
        ← Back to Players
      </button>
    </div>
  );

  const hasBatting = stats && (stats.totalInnings > 0 || stats.totalRuns > 0);
  const hasBowling = stats && (stats.totalWickets > 0 || stats.totalBallsBowled > 0);
  const hasFielding = stats && (stats.catches > 0 || stats.stumpings > 0 || stats.runOuts > 0);

  const recentScores = stats?.recentScores || [];
  const recentWickets = stats?.recentWickets || [];

  const statCard = (label, value, sub, Icon, color) => (
    <div className="glass-card p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--club-text-muted)" }}>{label}</span>
        <Icon className="w-4 h-4 opacity-40" style={{ color }} />
      </div>
      <p className="text-2xl font-black" style={{ color: "var(--club-text-main)" }}>{value ?? "—"}</p>
      {sub && <p className="text-[10px] font-medium" style={{ color: "var(--club-text-muted)" }}>{sub}</p>}
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back */}
      <motion.button initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
        onClick={() => navigate(`/clubs/${slug}/players`)}
        className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl border transition-all hover:shadow-sm group"
        style={{ borderColor: "var(--club-border)", color: "var(--club-text-muted)", backgroundColor: "var(--club-surface)" }}>
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> Back to Players
      </motion.button>

      {/* Player Hero Card */}
      <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} className="glass-surface p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: "var(--club-primary)" }} />
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          {/* Avatar */}
          {player.photo || player.avatar ? (
            <img src={player.photo || player.avatar} alt={player.name} className="w-24 h-24 rounded-2xl object-cover border-2 shadow-sm flex-shrink-0" style={{ borderColor: "var(--club-primary)" }} />
          ) : (
            <div className="w-24 h-24 rounded-2xl flex items-center justify-center text-3xl font-black flex-shrink-0 border-2" style={{ background: `color-mix(in srgb, var(--club-primary) 10%, transparent)`, color: "var(--club-primary)", borderColor: `color-mix(in srgb, var(--club-primary) 20%, transparent)` }}>
              {(player.name || "P")[0]}
            </div>
          )}

          <div className="flex-1 min-w-0 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
              <h1 className="text-2xl font-black" style={{ color: "var(--club-text-main)" }}>{player.name}</h1>
              {player.jerseyNumber && (
                <span className="text-sm font-black px-2.5 py-0.5 rounded-full border font-mono" style={{ borderColor: "var(--club-border)", color: "var(--club-primary)" }}>
                  #{player.jerseyNumber}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-2 text-xs" style={{ color: "var(--club-text-muted)" }}>
              {player.role && (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold capitalize" style={{ background: "color-mix(in srgb, var(--club-primary) 10%, transparent)", color: "var(--club-primary)" }}>
                  <Star className="w-3 h-3" />{player.role}
                </span>
              )}
              {player.battingStyle && <span className="capitalize flex items-center gap-1"><TrendingUp className="w-3 h-3" />{player.battingStyle}</span>}
              {player.bowlingStyle && <span className="capitalize flex items-center gap-1"><Zap className="w-3 h-3" />{player.bowlingStyle}</span>}
              {player.teamId?.name && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{player.teamId.name}</span>}
            </div>

            {/* Career Overview Pills */}
            {stats && (
              <div className="flex flex-wrap gap-3 mt-4 justify-center sm:justify-start">
                <OverviewPill label="Matches" value={stats.totalMatches ?? 0} />
                <OverviewPill label="Innings" value={stats.totalInnings ?? 0} />
                <OverviewPill label="Runs" value={stats.totalRuns ?? 0} />
                <OverviewPill label="Wickets" value={stats.totalWickets ?? 0} />
                {stats.hundreds > 0 && <OverviewPill label="100s" value={stats.hundreds} accent />}
                {stats.fifties > 0 && <OverviewPill label="50s" value={stats.fifties} />}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Batting Stats */}
      {hasBatting && (
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <SectionTitle icon={TrendingUp} title="Batting Stats" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-3">
            {statCard("Runs", stats.totalRuns, "Career total", TrendingUp, "#3b82f6")}
            {statCard("Average", stats.battingAverage?.toFixed(2), `${stats.totalInnings} innings`, BarChart2, "#8b5cf6")}
            {statCard("Strike Rate", stats.strikeRate?.toFixed(1), `${stats.totalBallsFaced} balls`, Activity, "#f59e0b")}
            {statCard("Highest Score", stats.highestScore, "Best innings", Award, "#ef4444")}
            {statCard("50s / 100s", `${stats.fifties} / ${stats.hundreds}`, "Milestones", Star, "#22c55e")}
            {statCard("Fours", stats.fours, "Boundary hits", Target, "#3b82f6")}
            {statCard("Sixes", stats.sixes, "Over the rope", Zap, "#8b5cf6")}
            {statCard("Not Outs", stats.notOuts, "Times undefeated", ShieldAlert, "#22c55e")}
          </div>
          {/* Recent Form */}
          {recentScores.length > 0 && (
            <div className="mt-4 glass-surface p-4">
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--club-text-muted)" }}>Recent Form (Last {recentScores.length} innings)</p>
              <div className="flex items-end gap-2">
                {recentScores.map((s, i) => {
                  const height = Math.max(12, Math.min(60, (s / (Math.max(...recentScores) || 1)) * 60));
                  return (
                    <div key={i} className="flex flex-col items-center gap-1 flex-1">
                      <span className="text-xs font-bold" style={{ color: s >= 50 ? "#f59e0b" : "var(--club-text-main)" }}>{s}</span>
                      <div className="w-full rounded-t" style={{ height, backgroundColor: s >= 100 ? "#f59e0b" : s >= 50 ? "var(--club-primary)" : "var(--club-border)" }} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.section>
      )}

      {/* Bowling Stats */}
      {hasBowling && (
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <SectionTitle icon={Zap} title="Bowling Stats" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-3">
            {statCard("Wickets", stats.totalWickets, "Career total", Zap, "#ef4444")}
            {statCard("Economy", stats.economy?.toFixed(2), "Runs per over", BarChart2, "#f59e0b")}
            {statCard("Average", stats.bowlingAverage?.toFixed(2), "Runs per wicket", TrendingUp, "#8b5cf6")}
            {statCard("Strike Rate", stats.bowlingStrikeRate?.toFixed(1), "Balls per wicket", Activity, "#3b82f6")}
            {statCard("Best Bowling", stats.bestBowling || "—", "Best figures", Award, "#ef4444")}
            {statCard("Overs", stats.totalOversBowled?.toFixed(1), `${stats.totalBallsBowled} balls`, Target, "#22c55e")}
            {statCard("Maidens", stats.maidens, "Maiden overs", ShieldAlert, "#22c55e")}
            {statCard("Dot Balls", stats.dotBallsBowled, "Dots bowled", Zap, "#64748b")}
          </div>
          {recentWickets.length > 0 && (
            <div className="mt-4 glass-surface p-4">
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--club-text-muted)" }}>Wickets in Last {recentWickets.length} Games</p>
              <div className="flex items-end gap-2">
                {recentWickets.map((w, i) => {
                  const height = Math.max(12, Math.min(60, (w / (Math.max(...recentWickets, 1))) * 60));
                  return (
                    <div key={i} className="flex flex-col items-center gap-1 flex-1">
                      <span className="text-xs font-bold" style={{ color: "var(--club-text-main)" }}>{w}W</span>
                      <div className="w-full rounded-t" style={{ height, backgroundColor: w >= 3 ? "#ef4444" : "var(--club-primary)" }} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.section>
      )}

      {/* Fielding Stats */}
      {hasFielding && (
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <SectionTitle icon={ShieldAlert} title="Fielding Stats" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
            {statCard("Catches", stats.catches, "Caught out", ShieldAlert, "#3b82f6")}
            {statCard("Stumpings", stats.stumpings, "Keeper dismissals", Target, "#8b5cf6")}
            {statCard("Run Outs", stats.runOuts, "Direct hits", Zap, "#f59e0b")}
          </div>
        </motion.section>
      )}

      {/* No Stats */}
      {!stats && (
        <div className="glass-surface p-12 text-center">
          <BarChart2 className="w-10 h-10 mx-auto mb-3 opacity-20" style={{ color: "var(--club-text-muted)" }} />
          <p className="text-sm" style={{ color: "var(--club-text-muted)" }}>No stats recorded yet. Stats are updated after each completed match.</p>
        </div>
      )}
    </div>
  );
}

function OverviewPill({ label, value, accent }) {
  return (
    <div className="text-center px-3 py-1.5 rounded-xl border" style={{ borderColor: "var(--club-border)", background: accent ? `color-mix(in srgb, var(--club-primary) 8%, transparent)` : "var(--club-surface)" }}>
      <p className="text-lg font-black" style={{ color: accent ? "var(--club-primary)" : "var(--club-text-main)" }}>{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--club-text-muted)" }}>{label}</p>
    </div>
  );
}

function SectionTitle({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4" style={{ color: "var(--club-primary)" }} />
      <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: "var(--club-text-main)" }}>{title}</h2>
      <div className="flex-1 h-px" style={{ backgroundColor: "var(--club-border)" }} />
    </div>
  );
}
