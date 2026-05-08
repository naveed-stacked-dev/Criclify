import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import clubService from "@/services/clubService";
import matchService from "@/services/matchService";
import {
  Trophy, Users, Calendar, Radio, TrendingUp, Activity, Layers, Globe,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

const PIE_COLORS = ["#7c3aed", "#06b6d4", "#f59e0b", "#ef4444", "#10b981"];

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState(null);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recentMatches, setRecentMatches] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const allClubs = clubData?.data || clubData?.clubs || clubData || [];
        const allMatches = matchData?.data || [];

        setClubs(Array.isArray(allClubs) ? allClubs : []);
        const completedOnly = allMatches.filter(m => m.status === 'completed');
        setRecentMatches(completedOnly.slice(0, 8));

        const live = allMatches.filter((m) => m.status === "live").length;
        const upcoming = allMatches.filter((m) => m.status === "scheduled" || m.status === "upcoming").length;

        setStats({
          totalClubs: Array.isArray(allClubs) ? allClubs.length : 0,
          totalMatches: matchData?.total || allMatches.length || 0,
          liveMatches: live,
          upcoming,
        });
      } catch {
        // handled by interceptor
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const statCards = [
    { label: "Total Clubs", value: stats?.totalClubs || 0, icon: Trophy, gradient: "from-violet-500/15 to-indigo-500/15", iconColor: "text-violet-500" },
    { label: "Total Matches", value: stats?.totalMatches || 0, icon: Calendar, gradient: "from-emerald-500/15 to-teal-500/15", iconColor: "text-emerald-500" },
    { label: "Live Now", value: stats?.liveMatches || 0, icon: Radio, gradient: "from-red-500/15 to-orange-500/15", iconColor: "text-red-500" },
    { label: "Upcoming", value: stats?.upcoming || 0, icon: TrendingUp, gradient: "from-blue-500/15 to-cyan-500/15", iconColor: "text-blue-500" },
  ];

  // Club distribution chart data
  const clubChartData = clubs.slice(0, 6).map((l) => ({
    name: l.name?.slice(0, 12) || "Club",
    teams: l.teamCount || 0,
  }));

  // Club pie data
  const clubPieData = clubs.slice(0, 5).map((l) => ({
    name: l.name?.slice(0, 12) || "Club",
    value: l.matchCount || l.teamCount || 1,
  }));

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Welcome */}
      <motion.div variants={item}>
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20">
            <Globe className="w-5 h-5 text-violet-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Super Admin Dashboard</h1>
            <p className="text-muted-foreground text-sm">Global overview across all clubs</p>
          </div>
        </div>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <motion.div key={s.label} variants={item}>
              <Card className="overflow-hidden relative group hover:shadow-md transition-shadow">
                <div className={`absolute inset-0 bg-gradient-to-br ${s.gradient} opacity-50`} />
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
                    <div className={`p-3 rounded-xl bg-background/80 ${s.iconColor}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={item}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="w-4 h-4 text-muted-foreground" />
                Club Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[260px]">
                {clubChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={clubChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                      <Bar dataKey="teams" fill="oklch(0.55 0.22 264)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    <p>No club data yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Layers className="w-4 h-4 text-muted-foreground" />
                Club Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[260px]">
                {clubPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={clubPieData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name }) => name}>
                        {clubPieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    <p>No data yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Clubs Grid */}
      <motion.div variants={item}>
        <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-violet-500" /> All Clubs
        </h2>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        ) : clubs.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12 text-muted-foreground">
              <Trophy className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No clubs created yet</p>
              <p className="text-xs mt-1">Go to Clubs page to create your first club</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {clubs.map((club) => (
              <Card key={club._id || club.id} className="overflow-hidden hover:shadow-lg transition-shadow group">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${club.themeColor || "#7c3aed"}20` }}
                    >
                      {club.logo ? (
                        <img src={club.logo} alt="" className="w-7 h-7 rounded object-cover" />
                      ) : (
                        <Trophy className="w-5 h-5" style={{ color: club.themeColor || "#7c3aed" }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground text-sm truncate">{club.name}</h3>
                      <p className="text-xs text-muted-foreground truncate">{club.slug}</p>
                    </div>
                    <div
                      className="w-3 h-3 rounded-full shrink-0 mt-1"
                      style={{ backgroundColor: club.themeColor || "#7c3aed" }}
                      title={`Theme: ${club.themeColor}`}
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    <Badge variant="outline" className="text-xs">
                      <Users className="w-3 h-3 mr-1" /> {club.manager?.name || "No Manager"}
                    </Badge>
                    {club.isActive === false && <Badge variant="destructive" className="text-xs">Inactive</Badge>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </motion.div>

      {/* Recent Matches */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Recent Matches (Global)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
              </div>
            ) : recentMatches.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No matches found yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentMatches.map((match) => (
                  <div key={match._id || match.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                    <div className="text-sm font-medium text-foreground">
                      {match.teamA?.name || "Team A"} vs {match.teamB?.name || "Team B"}
                    </div>
                    <Badge variant={match.status === "live" ? "destructive" : match.status === "completed" ? "success" : "secondary"}>
                      {match.status || "scheduled"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
