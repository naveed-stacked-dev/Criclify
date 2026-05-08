import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAppContext } from "@/hooks/useAppContext";
import teamService from "@/services/teamService";
import tournamentService from "@/services/tournamentService";
import matchService from "@/services/matchService";
import playerService from "@/services/playerService";
import {
  Trophy, Users, Calendar, Radio, TrendingUp, UserCircle, Swords, Activity,
  LayoutDashboard
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function ClubManagerDashboard() {
  const { user, clubId, clubName, clubLogo, themeColor } = useAppContext();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentMatches, setRecentMatches] = useState([]);

  useEffect(() => {
    if (!clubId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const [teamRes, tournamentRes, matchRes, playerRes] = await Promise.allSettled([
          teamService.getByClub(clubId),
          tournamentService.getByClub(clubId),
          matchService.getAll({ clubId, page: 1, limit: 10 }),
          playerService.getByClub(clubId),
        ]);

        const teams = teamRes.status === "fulfilled" ? teamRes.value.data : null;
        const tournaments = tournamentRes.status === "fulfilled" ? tournamentRes.value.data : null;
        const matches = matchRes.status === "fulfilled" ? matchRes.value.data : null;
        const players = playerRes.status === "fulfilled" ? playerRes.value.data : null;

        const allMatches = matches?.data || [];
        const completedOnly = allMatches.filter(m => m.status === 'completed');
        setRecentMatches(completedOnly.slice(0, 5));

        setStats({
          totalTeams: teams?.total || (teams?.data || []).length || 0,
          totalTournaments: tournaments?.total || (tournaments?.data || []).length || 0,
          totalMatches: matches?.total || allMatches.length || 0,
          totalPlayers: players?.total || (players?.data || []).length || 0,
          liveMatches: allMatches.filter((m) => m.status === "live").length,
          upcoming: allMatches.filter((m) => m.status === "scheduled" || m.status === "upcoming").length,
        });
      } catch {
        // handled by interceptor
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [clubId]);

  const statCards = [
    { label: "Teams", value: stats?.totalTeams || 0, icon: Users, gradient: "from-emerald-500/15 to-teal-500/15", iconColor: "text-emerald-500" },
    { label: "Tournaments", value: stats?.totalTournaments || 0, icon: Swords, gradient: "from-amber-500/15 to-orange-500/15", iconColor: "text-amber-500" },
    { label: "Matches", value: stats?.totalMatches || 0, icon: Calendar, gradient: "from-blue-500/15 to-cyan-500/15", iconColor: "text-blue-500" },
    { label: "Players", value: stats?.totalPlayers || 0, icon: UserCircle, gradient: "from-violet-500/15 to-indigo-500/15", iconColor: "text-violet-500" },
  ];

  // Placeholder match trend data
  const matchTrend = [
    { label: "W1", count: 2 }, { label: "W2", count: 4 }, { label: "W3", count: 3 },
    { label: "W4", count: 5 }, { label: "W5", count: 7 }, { label: "W6", count: 4 },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Club Banner Header */}
      <motion.div variants={item}>
        <Card className="overflow-hidden border-0 shadow-lg">
          <div
            className="relative h-32 bg-gradient-to-br from-violet-600/90 to-indigo-700/90"
            style={{
              background: `linear-gradient(135deg, ${themeColor}dd, ${themeColor}88)`,
            }}
          >
            <div className="absolute inset-0 bg-black/10" />
            <div className="relative flex items-center h-full px-6 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg border border-white/20">
                {clubLogo ? (
                  <img src={clubLogo} alt="" className="w-10 h-10 rounded-lg object-cover" />
                ) : (
                  <Trophy className="w-8 h-8 text-white" />
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{clubName || "My Club"}</h1>
                <p className="text-white/70 text-sm">Welcome back, {user?.name?.split(" ")[0] || "Manager"} 👋</p>
              </div>
              <div className="ml-auto flex flex-col items-end gap-2">
                <div className="flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4 text-white/50" />
                  <span className="text-[10px] text-white/50 font-bold uppercase tracking-widest">Control Center</span>
                </div>
                {stats?.liveMatches > 0 && (
                  <Badge className="bg-red-500 text-white animate-pulse">
                    <Radio className="w-3 h-3 mr-1" /> {stats.liveMatches} Live
                  </Badge>
                )}
                {stats?.upcoming > 0 && (
                  <Badge className="bg-white/20 text-white backdrop-blur-sm">
                    <TrendingUp className="w-3 h-3 mr-1" /> {stats.upcoming} Upcoming
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <motion.div key={s.label} variants={item}>
              <Card className="overflow-hidden relative group hover:shadow-md transition-shadow border-0 shadow-sm">
                <div 
                  className="absolute inset-0 opacity-10 transition-opacity group-hover:opacity-20" 
                  style={{ backgroundColor: themeColor }}
                />
                <CardContent className="relative p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{s.label}</p>
                      {loading ? (
                        <Skeleton className="h-8 w-16 mt-1" />
                      ) : (
                        <p className="text-3xl font-bold text-foreground mt-1">{s.value}</p>
                      )}
                    </div>
                    <div 
                      className="p-3 rounded-xl bg-background shadow-sm"
                      style={{ color: themeColor }}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Chart + Recent Matches */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={item}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="w-4 h-4 text-muted-foreground" />
                Match Activity Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <AreaChart data={matchTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                    <defs>
                      <linearGradient id="clubColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={themeColor} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={themeColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="count" stroke={themeColor} fill="url(#clubColor)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Recent Matches</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
                </div>
              ) : recentMatches.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>No matches yet</p>
                  <p className="text-xs mt-1">Create a tournament and generate fixtures</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentMatches.map((match) => (
                    <div key={match._id || match.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors border-l-4" style={{ borderLeftColor: match.status === 'live' ? '#ef4444' : themeColor }}>
                      <div className="text-sm font-medium text-foreground">
                        {match.teamA?.name || "Team A"} <span className="text-muted-foreground font-normal mx-1">vs</span> {match.teamB?.name || "Team B"}
                      </div>
                      <Badge 
                        variant={match.status === "live" ? "destructive" : match.status === "completed" ? "success" : "secondary"}
                        style={match.status === "upcoming" || match.status === "scheduled" ? { backgroundColor: `${themeColor}20`, color: themeColor, borderColor: `${themeColor}40` } : {}}
                      >
                        {match.status || "scheduled"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
