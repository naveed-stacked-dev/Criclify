import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAppContext } from "@/hooks/useAppContext";
import playerService from "@/services/playerService";
import { Loader2, ArrowLeft, UserCircle, TrendingUp, Target, Zap, ShieldAlert, Star, Award, Activity, BarChart2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function PlayerProfilePage() {
  const { playerId } = useParams();
  const navigate = useNavigate();
  const { themeColor } = useAppContext();

  const [player, setPlayer] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await playerService.getById(playerId);
        const d = res.data?.data || res.data;
        setPlayer(d?.player || d);
        setStats(d?.stats || null);
      } catch (error) {
        console.error("Failed to load player", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [playerId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-muted-foreground">
        <Loader2 className="w-10 h-10 animate-spin mb-4" style={{ color: themeColor }} />
        <p>Loading Player Profile...</p>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <UserCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
        <p className="font-medium text-lg">Player Not Found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)} style={{ borderColor: themeColor, color: themeColor }}>Go Back</Button>
      </div>
    );
  }

  const hasBatting = stats && (stats.totalInnings > 0 || stats.totalRuns > 0);
  const hasBowling = stats && (stats.totalWickets > 0 || stats.totalBallsBowled > 0);
  const hasFielding = stats && (stats.catches > 0 || stats.stumpings > 0 || stats.runOuts > 0);

  const recentScores = stats?.recentScores || [];
  const recentWickets = stats?.recentWickets || [];

  const statCard = (label, value, sub, Icon, color) => (
    <Card className="shadow-sm">
      <CardContent className="p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
          <Icon className="w-4 h-4 opacity-40" style={{ color }} />
        </div>
        <p className="text-2xl font-black text-foreground">{value ?? "—"}</p>
        {sub && <p className="text-[10px] font-medium text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-5xl mx-auto pb-12">
      <motion.div variants={item} className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Player Profile
          </h1>
        </div>
      </motion.div>

      {/* Player Hero Card */}
      <motion.div variants={item}>
        <Card className="overflow-hidden border shadow-sm">
          <div className="h-2 w-full" style={{ backgroundColor: themeColor }} />
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              {/* Avatar */}
              {player.photo || player.avatar ? (
                <img src={player.photo || player.avatar} alt={player.name} className="w-28 h-28 rounded-2xl object-cover border-2 shadow-sm flex-shrink-0" style={{ borderColor: themeColor }} />
              ) : (
                <div className="w-28 h-28 rounded-2xl flex items-center justify-center text-4xl font-black flex-shrink-0 border-2" style={{ backgroundColor: `${themeColor}15`, color: themeColor, borderColor: `${themeColor}30` }}>
                  {(player.name || "P")[0]}
                </div>
              )}

              <div className="flex-1 min-w-0 text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mb-2">
                  <h2 className="text-3xl font-black text-foreground">{player.name}</h2>
                  {player.jerseyNumber && (
                    <Badge variant="outline" className="text-sm font-black px-3 py-1 rounded-full font-mono shadow-sm" style={{ borderColor: themeColor, color: themeColor }}>
                      #{player.jerseyNumber}
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-3 text-sm text-muted-foreground">
                  {player.role && (
                    <Badge variant="secondary" className="capitalize flex items-center gap-1.5 px-3 py-1">
                      <Star className="w-3.5 h-3.5" style={{ color: themeColor }} />{player.role}
                    </Badge>
                  )}
                  {player.battingStyle && <span className="capitalize flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" />{player.battingStyle}</span>}
                  {player.bowlingStyle && <span className="capitalize flex items-center gap-1"><Zap className="w-3.5 h-3.5" />{player.bowlingStyle}</span>}
                  {player.teamId?.name && <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{player.teamId.name}</span>}
                </div>

                {/* Career Overview Pills */}
                {stats && (
                  <div className="flex flex-wrap gap-3 mt-6 justify-center sm:justify-start">
                    <OverviewPill label="Matches" value={stats.totalMatches ?? 0} />
                    <OverviewPill label="Innings" value={stats.totalInnings ?? 0} />
                    <OverviewPill label="Runs" value={stats.totalRuns ?? 0} />
                    <OverviewPill label="Wickets" value={stats.totalWickets ?? 0} />
                    {stats.hundreds > 0 && <OverviewPill label="100s" value={stats.hundreds} accent themeColor={themeColor} />}
                    {stats.fifties > 0 && <OverviewPill label="50s" value={stats.fifties} />}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Batting Stats */}
      {hasBatting && (
        <motion.section variants={item}>
          <SectionTitle icon={TrendingUp} title="Batting Stats" themeColor={themeColor} />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
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
            <Card className="mt-4 shadow-sm">
              <CardContent className="p-5">
                <p className="text-xs font-bold uppercase tracking-wider mb-4 text-muted-foreground">Recent Form (Last {recentScores.length} innings)</p>
                <div className="flex items-end gap-3 h-20">
                  {recentScores.map((s, i) => {
                    const height = Math.max(12, Math.min(80, (s / (Math.max(...recentScores) || 1)) * 80));
                    return (
                      <div key={i} className="flex flex-col items-center gap-1.5 flex-1 h-full justify-end">
                        <span className="text-xs font-bold" style={{ color: s >= 50 ? "#f59e0b" : "inherit" }}>{s}</span>
                        <div className="w-full rounded-t-md transition-all duration-500" style={{ height, backgroundColor: s >= 100 ? "#f59e0b" : s >= 50 ? themeColor : "var(--border)" }} />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </motion.section>
      )}

      {/* Bowling Stats */}
      {hasBowling && (
        <motion.section variants={item}>
          <SectionTitle icon={Zap} title="Bowling Stats" themeColor={themeColor} />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
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
            <Card className="mt-4 shadow-sm">
              <CardContent className="p-5">
                <p className="text-xs font-bold uppercase tracking-wider mb-4 text-muted-foreground">Wickets in Last {recentWickets.length} Games</p>
                <div className="flex items-end gap-3 h-20">
                  {recentWickets.map((w, i) => {
                    const height = Math.max(12, Math.min(80, (w / (Math.max(...recentWickets, 1))) * 80));
                    return (
                      <div key={i} className="flex flex-col items-center gap-1.5 flex-1 h-full justify-end">
                        <span className="text-xs font-bold text-foreground">{w}W</span>
                        <div className="w-full rounded-t-md transition-all duration-500" style={{ height, backgroundColor: w >= 3 ? "#ef4444" : themeColor }} />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </motion.section>
      )}

      {/* Fielding Stats */}
      {hasFielding && (
        <motion.section variants={item}>
          <SectionTitle icon={ShieldAlert} title="Fielding Stats" themeColor={themeColor} />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
            {statCard("Catches", stats.catches, "Caught out", ShieldAlert, "#3b82f6")}
            {statCard("Stumpings", stats.stumpings, "Keeper dismissals", Target, "#8b5cf6")}
            {statCard("Run Outs", stats.runOuts, "Direct hits", Zap, "#f59e0b")}
          </div>
        </motion.section>
      )}

      {/* No Stats */}
      {!stats && (
        <motion.div variants={item} className="bg-secondary/20 border border-border/50 rounded-2xl p-12 text-center">
          <BarChart2 className="w-12 h-12 mx-auto mb-4 opacity-20 text-muted-foreground" />
          <p className="text-sm font-medium text-muted-foreground">No stats recorded yet. Stats are updated after each completed match.</p>
        </motion.div>
      )}
    </motion.div>
  );
}

function OverviewPill({ label, value, accent, themeColor }) {
  return (
    <div className="text-center px-4 py-2 rounded-xl border shadow-sm" style={{ backgroundColor: accent ? `${themeColor}15` : "var(--background)" }}>
      <p className="text-xl font-black" style={{ color: accent ? themeColor : "inherit" }}>{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, themeColor }) {
  return (
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-lg" style={{ backgroundColor: `${themeColor}15` }}>
        <Icon className="w-5 h-5" style={{ color: themeColor }} />
      </div>
      <h2 className="text-lg font-bold tracking-tight text-foreground">{title}</h2>
      <div className="flex-1 h-px bg-border/60 ml-2" />
    </div>
  );
}
