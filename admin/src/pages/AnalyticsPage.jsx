import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAppContext } from "@/hooks/useAppContext";
import clubService from "@/services/clubService";
import analyticsService from "@/services/analyticsService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, TrendingUp, Users, Activity, Shield } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function AnalyticsPage() {
  const { user, clubId: contextClubId } = useAppContext();
  const [clubs, setClubs] = useState([]);
  const [selectedClub, setSelectedClub] = useState(null);
  
  const [leaderboard, setLeaderboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [clubLoading, setClubLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
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
    fetch();
  }, [user, contextClubId]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!selectedClub) return;
      setLoading(true);
      try {
        const res = await analyticsService.getLeaderboard(selectedClub);
        setLeaderboard(res.data?.data || res.data || null);
      } catch { /* interceptor */ }
      finally { setLoading(false); }
    };
    fetchAnalytics();
  }, [selectedClub]);

  // Transform data for charts
  const topRunScorers = leaderboard?.topScorers?.length > 0 
    ? leaderboard.topScorers.slice(0, 5).map(p => ({
        name: p.player?.name || "Unknown",
        runs: p.totalRuns || 0
      })) 
    : [];

  const topWicketTakers = leaderboard?.topWicketTakers?.length > 0
    ? leaderboard.topWicketTakers.slice(0, 5).map(p => ({
        name: p.player?.name || "Unknown",
        wickets: p.totalWickets || 0
      }))
    : [];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><BarChart3 className="w-6 h-6 text-fuchsia-500" /> Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Deep dive into club statistics and performance metrics</p>
        </div>
      </motion.div>

      {(user?.role === "superAdmin" || user?.role === "superadmin") && (
        <motion.div variants={item} className="w-full max-w-xs">
          <Select value={selectedClub || ""} onValueChange={setSelectedClub}>
            <SelectTrigger>
              <SelectValue placeholder="Select a club" />
            </SelectTrigger>
            <SelectContent>
              {clubs.map((l) => <SelectItem key={l._id || l.id} value={l._id || l.id}>{l.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </motion.div>
      )}

      {!selectedClub && !clubLoading ? (
        <div className="text-center py-16 text-muted-foreground">
          <Shield className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">Select a club to view analytics</p>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-[300px] w-full rounded-xl" />
          <Skeleton className="h-[300px] w-full rounded-xl" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Run Scorers Chart */}
          <motion.div variants={item}>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-500" /> Top Run Scorers
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topRunScorers.length === 0 ? (
                  <div className="h-[250px] w-full mt-4 flex flex-col items-center justify-center text-muted-foreground bg-secondary/10 rounded-lg border border-dashed border-border/50">
                    <TrendingUp className="w-8 h-8 opacity-20 mb-2" />
                    <p className="text-sm">No run data available yet</p>
                  </div>
                ) : (
                  <div className="h-[250px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topRunScorers} layout="vertical" margin={{ top: 0, right: 0, left: 20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                        <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={60} />
                        <Tooltip cursor={{ fill: "hsl(var(--muted))" }} contentStyle={{ backgroundColor: "hsl(var(--popover))", borderRadius: "8px", border: "1px solid hsl(var(--border))" }} />
                        <Bar dataKey="runs" radius={[0, 4, 4, 0]}>
                          {topRunScorers.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill="oklch(0.6 0.15 250)" />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Top Wicket Takers Chart */}
          <motion.div variants={item}>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Activity className="w-4 h-4 text-red-500" /> Top Wicket Takers
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topWicketTakers.length === 0 ? (
                  <div className="h-[250px] w-full mt-4 flex flex-col items-center justify-center text-muted-foreground bg-secondary/10 rounded-lg border border-dashed border-border/50">
                    <Activity className="w-8 h-8 opacity-20 mb-2" />
                    <p className="text-sm">No bowling data available yet</p>
                  </div>
                ) : (
                  <div className="h-[250px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topWicketTakers} layout="vertical" margin={{ top: 0, right: 0, left: 20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                        <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={60} />
                        <Tooltip cursor={{ fill: "hsl(var(--muted))" }} contentStyle={{ backgroundColor: "hsl(var(--popover))", borderRadius: "8px", border: "1px solid hsl(var(--border))" }} />
                        <Bar dataKey="wickets" radius={[0, 4, 4, 0]}>
                          {topWicketTakers.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill="oklch(0.6 0.2 20)" />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
