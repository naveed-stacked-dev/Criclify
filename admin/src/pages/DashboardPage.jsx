import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAppContext } from "@/hooks/useAppContext";
import clubService from "@/services/clubService";
import matchService from "@/services/matchService";
import {
  Trophy,
  Users,
  Calendar,
  Radio,
  TrendingUp,
  Activity,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

// Placeholder chart data
const matchActivityData = [
  { name: "Mon", matches: 3 },
  { name: "Tue", matches: 5 },
  { name: "Wed", matches: 2 },
  { name: "Thu", matches: 7 },
  { name: "Fri", matches: 4 },
  { name: "Sat", matches: 9 },
  { name: "Sun", matches: 6 },
];

const scoreTrendData = [
  { over: "1", runs: 8 },
  { over: "2", runs: 12 },
  { over: "3", runs: 6 },
  { over: "4", runs: 15 },
  { over: "5", runs: 10 },
  { over: "6", runs: 18 },
  { over: "7", runs: 14 },
  { over: "8", runs: 20 },
];

export default function DashboardPage() {
  const { user, isSuperAdmin } = useAppContext();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentMatches, setRecentMatches] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [clubRes, matchRes] = await Promise.allSettled([
          clubService.getAll({ page: 1, limit: 5 }),
          matchService.getAll({ page: 1, limit: 5 }),
        ]);

        const clubs = clubRes.status === "fulfilled" ? clubRes.value.data : null;
        const matches = matchRes.status === "fulfilled" ? matchRes.value.data : null;

        setStats({
          totalClubs: clubs?.data?.length || clubs?.total || 0,
          totalMatches: matches?.data?.length || matches?.total || 0,
          liveMatches: (matches?.data || []).filter((m) => m.status === "live").length,
          upcoming: (matches?.data || []).filter((m) => m.status === "scheduled" || m.status === "upcoming").length,
        });

        const completedOnly = (matches?.data || []).filter(m => m.status === 'completed');
        setRecentMatches(completedOnly.slice(0, 5));
      } catch {
        // Errors handled by interceptor
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

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Welcome */}
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back, {user?.name?.split(" ")[0] || "Admin"} 👋
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Here's what's happening with your cricket clubs today.
        </p>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, i) => {
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
                Match Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={matchActivityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="matches" fill="oklch(0.55 0.22 264)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                Score Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={scoreTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="over" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <defs>
                      <linearGradient id="colorRuns" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="oklch(0.6 0.2 160)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="oklch(0.6 0.2 160)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="runs" stroke="oklch(0.6 0.2 160)" fill="url(#colorRuns)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Matches */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Recent Matches</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            ) : recentMatches.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No matches found yet</p>
                <p className="text-xs mt-1">Create a match to get started</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentMatches.map((match) => (
                  <div
                    key={match._id || match.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-medium text-foreground">
                        {match.teamA?.name || "Team A"} vs {match.teamB?.name || "Team B"}
                      </div>
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
