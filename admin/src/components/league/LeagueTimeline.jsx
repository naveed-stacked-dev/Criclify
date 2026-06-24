import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Clock, Calendar as CalendarIcon, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAppContext } from "@/hooks/useAppContext";

export default function LeagueTimeline({ matches }) {
  const { themeColor } = useAppContext();
  // Group matches by date/week
  const groupedMatches = useMemo(() => {
    if (!matches || matches.length === 0) return {};

    const groups = {};
    const sorted = [...matches].sort((a, b) => {
      if (!a.startTime && !b.startTime) return 0;
      if (!a.startTime) return 1;
      if (!b.startTime) return -1;
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });

    sorted.forEach(match => {
      let dateKey = "Unscheduled";
      if (match.startTime) {
        const d = new Date(match.startTime);
        dateKey = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      }
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(match);
    });

    return groups;
  }, [matches]);

  if (Object.keys(groupedMatches).length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" />
        <p className="font-medium">No matches available for the timeline.</p>
      </div>
    );
  }

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const item = { hidden: { opacity: 0, x: -20 }, show: { opacity: 1, x: 0 } };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-12">
        {Object.entries(groupedMatches).map(([date, dayMatches], groupIdx) => (
          <motion.div variants={item} key={date} className="relative">
            {/* Timeline Line */}
            <div className="absolute left-[27px] top-8 bottom-[-48px] w-0.5 bg-border/50 hidden md:block"></div>
            
            <div className="flex flex-col md:flex-row gap-6">
              {/* Date Header */}
              <div className="md:w-48 flex-shrink-0 flex items-start pt-2 gap-3 relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-card border border-border shadow-sm flex flex-col items-center justify-center shrink-0">
                  <CalendarIcon className="w-5 h-5 mb-1" style={{ color: themeColor }} />
                </div>
                <div className="pt-1">
                  <h3 className="font-bold text-foreground text-sm leading-tight">{date}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{dayMatches.length} Match{dayMatches.length !== 1 ? 'es' : ''}</p>
                </div>
              </div>

              {/* Matches List */}
              <div className="flex-1 space-y-4">
                {dayMatches.map((match, idx) => {
                  const teamA = match.teamA;
                  const teamB = match.teamB;
                  const winnerId = match.result?.winner?._id || match.result?.winner;
                  
                  let statusBadge = <Badge variant="outline" className="text-muted-foreground bg-background">Unscheduled</Badge>;
                  if (match.status === 'completed') statusBadge = <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Completed</Badge>;
                  if (match.status === 'live') statusBadge = <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 animate-pulse">Live Now</Badge>;
                  if (match.status === 'upcoming') statusBadge = <Badge style={{ backgroundColor: `${themeColor}20`, color: themeColor, borderColor: `${themeColor}30` }}>Upcoming</Badge>;

                  const isAWinner = winnerId && String(winnerId) === String(teamA?._id || teamA?.id);
                  const isBWinner = winnerId && String(winnerId) === String(teamB?._id || teamB?.id);

                  return (
                    <Card key={match._id || match.id} className="overflow-hidden border-border bg-card/60 backdrop-blur-sm hover:bg-card/80 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{match.startTime ? new Date(match.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'TBD'}</span>
                            {match.venue && (
                              <>
                                <span className="px-1">•</span>
                                <MapPin className="w-3.5 h-3.5" />
                                <span>{match.venue}</span>
                              </>
                            )}
                          </div>
                          {statusBadge}
                        </div>
                        
                        <div className="flex items-center justify-between gap-4">
                          {/* Team A */}
                          <div className={`flex items-center gap-3 flex-1 ${isAWinner ? 'opacity-100' : (match.status === 'completed' && !isAWinner ? 'opacity-50' : '')}`}>
                            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-sm ring-1 ring-white/10"
                                 style={{ backgroundColor: teamA?.color || "oklch(0.3 0.02 260)" }}>
                              {teamA?.shortName || teamA?.name?.substring(0, 3).toUpperCase() || "?"}
                            </div>
                            <span className="font-bold text-sm md:text-base line-clamp-1">{teamA?.name || "TBD"}</span>
                          </div>

                          <div className="px-3 py-1 rounded bg-muted/50 text-xs font-bold text-muted-foreground shrink-0 border border-border/50">
                            VS
                          </div>

                          {/* Team B */}
                          <div className={`flex items-center justify-end gap-3 flex-1 text-right ${isBWinner ? 'opacity-100' : (match.status === 'completed' && !isBWinner ? 'opacity-50' : '')}`}>
                            <span className="font-bold text-sm md:text-base line-clamp-1">{teamB?.name || "TBD"}</span>
                            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-sm ring-1 ring-white/10"
                                 style={{ backgroundColor: teamB?.color || "oklch(0.3 0.02 260)" }}>
                              {teamB?.shortName || teamB?.name?.substring(0, 3).toUpperCase() || "?"}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
