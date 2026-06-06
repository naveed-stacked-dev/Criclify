import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAppContext } from "@/hooks/useAppContext";
import clubService from "@/services/clubService";
import analyticsService from "@/services/analyticsService";
import tournamentService from "@/services/tournamentService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3, TrendingUp, Activity, Shield, Award, Target, Zap,
  Star, Circle, Dices, Users, Filter
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

function LeaderboardTable({ data = [], valueKey, valueFormatter, emptyText }) {
  const { themeColor } = useAppContext();
  if (!data.length) {
    return (
      <div className="py-8 text-center text-muted-foreground text-sm">
        <Target className="w-8 h-8 mx-auto mb-2 opacity-20" />
        {emptyText || "No data available yet"}
      </div>
    );
  }
  return (
    <div className="divide-y divide-border/50">
      {data.slice(0, 5).map((entry, idx) => {
        const rawVal = typeof valueKey === "function" ? valueKey(entry) : entry[valueKey];
        const displayVal = valueFormatter ? valueFormatter(rawVal, entry) : rawVal;
        return (
          <div key={idx} className="flex items-center justify-between px-4 py-2.5 hover:bg-secondary/20 transition-colors">
            <div className="flex items-center gap-3">
              <span
                className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: idx === 0 ? "#f59e0b" : idx === 1 ? "#94a3b8" : idx === 2 ? "#b45309" : `${themeColor}20`,
                  color: idx < 3 ? "#fff" : themeColor,
                }}
              >
                {idx + 1}
              </span>
              {entry.player?.id ? (
                <Link to={`/players/${entry.player.id}`} className="group">
                  <p className="font-medium text-sm leading-tight group-hover:underline">{entry.player?.name || "Unknown"}</p>
                  <p className="text-xs text-muted-foreground">{entry.player?.team?.name || "—"}</p>
                </Link>
              ) : (
                <div>
                  <p className="font-medium text-sm leading-tight">{entry.player?.name || "Unknown"}</p>
                  <p className="text-xs text-muted-foreground">{entry.player?.team?.name || "—"}</p>
                </div>
              )}
            </div>
            <span className="font-bold text-base" style={{ color: themeColor }}>{displayVal ?? "—"}</span>
          </div>
        );
      })}
    </div>
  );
}

function StatCard({ icon: Icon, title, data, valueKey, valueFormatter, emptyText, iconColor }) {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2 border-b border-border/50">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Icon className="w-4 h-4" style={{ color: iconColor || "currentColor" }} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <LeaderboardTable data={data} valueKey={valueKey} valueFormatter={valueFormatter} emptyText={emptyText} />
      </CardContent>
    </Card>
  );
}

export default function AnalyticsPage() {
  const { user, clubId: contextClubId, themeColor } = useAppContext();

  const [clubs, setClubs] = useState([]);
  const [selectedClub, setSelectedClub] = useState(null);
  const [clubLoading, setClubLoading] = useState(true);

  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState("all");

  const [leaderboard, setLeaderboard] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load club list (superAdmin) or set contextClubId
  useEffect(() => {
    const load = async () => {
      try {
        if (user?.role === "superAdmin" || user?.role === "superadmin") {
          const res = await clubService.adminGetAll();
          const data = res.data?.data || res.data?.clubs || res.data || [];
          setClubs(Array.isArray(data) ? data : []);
          if (data.length > 0) setSelectedClub(data[0]._id || data[0].id);
        } else {
          if (contextClubId) setSelectedClub(contextClubId);
        }
      } catch { /* interceptor */ }
      finally { setClubLoading(false); }
    };
    load();
  }, [user, contextClubId]);

  // Load tournaments whenever club changes
  useEffect(() => {
    if (!selectedClub) return;
    setSelectedTournament("all");
    setTournaments([]);
    tournamentService.getByClub(selectedClub, { limit: 100 })
      .then(res => {
        const data = res.data?.data || res.data || [];
        setTournaments(Array.isArray(data) ? data : []);
      })
      .catch(() => {});
  }, [selectedClub]);

  // Fetch leaderboard whenever club or tournament filter changes
  useEffect(() => {
    if (!selectedClub) return;
    setLoading(true);
    const params = selectedTournament !== "all" ? { tournamentId: selectedTournament } : {};
    analyticsService.getLeaderboard(selectedClub, params)
      .then(res => setLeaderboard(res.data?.data || res.data || null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedClub, selectedTournament]);

  const topRunScorers = (leaderboard?.topScorers || []).slice(0, 5).map(p => ({
    name: p.player?.name || "Unknown", runs: p.totalRuns || 0,
  }));
  const topWicketTakers = (leaderboard?.topWicketTakers || []).slice(0, 5).map(p => ({
    name: p.player?.name || "Unknown", wickets: p.totalWickets || 0,
  }));

  const fmtTournament = (t) =>
    t.type ? `${t.name} (${t.type.charAt(0).toUpperCase() + t.type.slice(1)})` : t.name;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">

      {/* Header row */}
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-fuchsia-500" /> Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Club statistics and performance leaderboards</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Club selector — superAdmin only */}
          {(user?.role === "superAdmin" || user?.role === "superadmin") && (
            <Select value={selectedClub || ""} onValueChange={v => { setSelectedClub(v); setSelectedTournament("all"); }}>
              <SelectTrigger className="w-full sm:w-55">
                <SelectValue placeholder="Select a club" />
              </SelectTrigger>
              <SelectContent position="popper" side="bottom" sideOffset={4} avoidCollisions={false}>
                {clubs.map(l => (
                  <SelectItem key={l._id || l.id} value={l._id || l.id}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Tournament filter */}
          {tournaments.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <Select value={selectedTournament} onValueChange={setSelectedTournament}>
                <SelectTrigger className="w-full sm:w-55">
                  <SelectValue placeholder="All Tournaments" />
                </SelectTrigger>
                <SelectContent position="popper" side="bottom" sideOffset={4} avoidCollisions={false} className="max-h-72 overflow-y-auto">
                  <SelectItem value="all">All Tournaments</SelectItem>
                  {tournaments.map(t => (
                    <SelectItem key={t._id || t.id} value={t._id || t.id}>
                      {fmtTournament(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </motion.div>

      {/* Active filter badge */}
      {selectedTournament !== "all" && (() => {
        const t = tournaments.find(t => (t._id || t.id) === selectedTournament);
        return t ? (
          <motion.div variants={item}>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Filter className="w-3 h-3" />
              Showing stats for <span className="font-semibold text-foreground">{fmtTournament(t)}</span>
              <button onClick={() => setSelectedTournament("all")} className="ml-1 underline hover:no-underline">Clear</button>
            </div>
          </motion.div>
        ) : null;
      })()}

      {!selectedClub && !clubLoading ? (
        <div className="text-center py-16 text-muted-foreground">
          <Shield className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">Select a club to view analytics</p>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-55 w-full rounded-xl" />)}
        </div>
      ) : (
        <Tabs defaultValue="batting">
          <motion.div variants={item}>
            <TabsList className="mb-4">
              <TabsTrigger value="batting">Batting</TabsTrigger>
              <TabsTrigger value="bowling">Bowling</TabsTrigger>
              <TabsTrigger value="fielding">Fielding</TabsTrigger>
              <TabsTrigger value="charts">Charts</TabsTrigger>
            </TabsList>
          </motion.div>

          {/* ── Batting ── */}
          <TabsContent value="batting">
            <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              <motion.div variants={item}>
                <StatCard icon={TrendingUp} title="Most Runs" iconColor="oklch(0.6 0.15 250)"
                  data={leaderboard?.topScorers} valueKey="totalRuns" />
              </motion.div>
              <motion.div variants={item}>
                <StatCard icon={Award} title="Best Batting Average" iconColor="#10b981"
                  data={leaderboard?.bestBattingAverage} valueKey="battingAverage"
                  valueFormatter={v => v?.toFixed(2) ?? "—"} />
              </motion.div>
              <motion.div variants={item}>
                <StatCard icon={Zap} title="Highest Score" iconColor="#f59e0b"
                  data={leaderboard?.highestScores} valueKey="highestScore" />
              </motion.div>
              <motion.div variants={item}>
                <StatCard icon={Star} title="Most Fifties" iconColor="#8b5cf6"
                  data={leaderboard?.mostFifties} valueKey="fifties" />
              </motion.div>
              <motion.div variants={item}>
                <StatCard icon={Star} title="Most Hundreds" iconColor="#ec4899"
                  data={leaderboard?.mostHundreds} valueKey="hundreds" />
              </motion.div>
              <motion.div variants={item}>
                <StatCard icon={Circle} title="Most Fours" iconColor="#3b82f6"
                  data={leaderboard?.mostFours} valueKey="fours" />
              </motion.div>
              <motion.div variants={item}>
                <StatCard icon={Circle} title="Most Sixes" iconColor="#ef4444"
                  data={leaderboard?.mostSixes} valueKey="sixes" />
              </motion.div>
            </motion.div>
          </TabsContent>

          {/* ── Bowling ── */}
          <TabsContent value="bowling">
            <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              <motion.div variants={item}>
                <StatCard icon={Activity} title="Most Wickets" iconColor="#ef4444"
                  data={leaderboard?.topWicketTakers} valueKey="totalWickets" />
              </motion.div>
              <motion.div variants={item}>
                <StatCard icon={Award} title="Best Bowling Average" iconColor="#10b981"
                  data={leaderboard?.bestBowlingAverage} valueKey="bowlingAverage"
                  valueFormatter={v => v?.toFixed(2) ?? "—"} />
              </motion.div>
              <motion.div variants={item}>
                <StatCard icon={TrendingUp} title="Best Economy Rate" iconColor="#6366f1"
                  data={leaderboard?.bestEconomyRate} valueKey="economy"
                  valueFormatter={v => v?.toFixed(2) ?? "—"} />
              </motion.div>
              <motion.div variants={item}>
                <StatCard icon={Dices} title="Most Dot Balls" iconColor="#f59e0b"
                  data={leaderboard?.mostDotBalls} valueKey="dotBallsBowled" />
              </motion.div>
              <motion.div variants={item}>
                <StatCard icon={Zap} title="5-Wicket Hauls" iconColor="#ec4899"
                  data={leaderboard?.wicketHauls} valueKey="fiveWicketHauls"
                  emptyText="No 5-wicket hauls recorded yet" />
              </motion.div>
            </motion.div>
          </TabsContent>

          {/* ── Fielding ── */}
          <TabsContent value="fielding">
            <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              <motion.div variants={item}>
                <StatCard icon={Users} title="Best Fielder (Total Dismissals)" iconColor="#10b981"
                  data={leaderboard?.bestFielders} valueKey="total" />
              </motion.div>
              <motion.div variants={item}>
                <StatCard icon={Award} title="Top Performer (MVP)" iconColor="#f59e0b"
                  data={leaderboard?.mvp}
                  valueKey={e => e.mvpScore}
                  valueFormatter={v => v ? `${Math.round(v)} pts` : "—"} />
              </motion.div>
            </motion.div>
          </TabsContent>

          {/* ── Charts ── */}
          <TabsContent value="charts">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div variants={item}>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-blue-500" /> Top Run Scorers
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {topRunScorers.length === 0 ? (
                      <div className="h-62.5 flex flex-col items-center justify-center text-muted-foreground bg-secondary/10 rounded-lg border border-dashed">
                        <TrendingUp className="w-8 h-8 opacity-20 mb-2" /><p className="text-sm">No run data yet</p>
                      </div>
                    ) : (
                      <div className="h-62.5 mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={topRunScorers} layout="vertical" margin={{ top: 0, right: 0, left: 20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} stroke="hsl(var(--border))" />
                            <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                            <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={70} />
                            <Tooltip cursor={{ fill: "hsl(var(--muted))" }} contentStyle={{ backgroundColor: "hsl(var(--popover))", borderRadius: "8px", border: "1px solid hsl(var(--border))" }} />
                            <Bar dataKey="runs" radius={[0, 4, 4, 0]}>
                              {topRunScorers.map((_, i) => <Cell key={i} fill="oklch(0.6 0.15 250)" />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={item}>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Activity className="w-4 h-4 text-red-500" /> Top Wicket Takers
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {topWicketTakers.length === 0 ? (
                      <div className="h-62.5 flex flex-col items-center justify-center text-muted-foreground bg-secondary/10 rounded-lg border border-dashed">
                        <Activity className="w-8 h-8 opacity-20 mb-2" /><p className="text-sm">No bowling data yet</p>
                      </div>
                    ) : (
                      <div className="h-62.5 mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={topWicketTakers} layout="vertical" margin={{ top: 0, right: 0, left: 20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} stroke="hsl(var(--border))" />
                            <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                            <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={70} />
                            <Tooltip cursor={{ fill: "hsl(var(--muted))" }} contentStyle={{ backgroundColor: "hsl(var(--popover))", borderRadius: "8px", border: "1px solid hsl(var(--border))" }} />
                            <Bar dataKey="wickets" radius={[0, 4, 4, 0]}>
                              {topWicketTakers.map((_, i) => <Cell key={i} fill="oklch(0.6 0.2 20)" />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </motion.div>
  );
}
