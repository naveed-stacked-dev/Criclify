import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAppContext } from "@/hooks/useAppContext";
import matchService from "@/services/matchService";
import scoringService from "@/services/scoringService";
import authService from "@/services/authService";
import { decodeId, encodeId } from "@/utils/crypto";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Loader2, Shield, Calendar, Zap, PlayCircle, KeyRound, Link as LinkIcon, Monitor, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function MatchSummaryPage() {
  const params = useParams();
  const matchId = decodeId(params.matchId);
  const navigate = useNavigate();
  const { themeColor } = useAppContext();
  const [match, setMatch] = useState(null);
  const [summaryData, setSummaryData] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Stream dialog
  const [showStream, setShowStream] = useState(false);
  const [streamUrl, setStreamUrl] = useState("");

  // Assign scorer dialog
  const [showAssign, setShowAssign] = useState(false);
  const [assignForm, setAssignForm] = useState({ name: "", password: "" });

  useEffect(() => {
    const fetchMatchAndSummary = async () => {
      setLoading(true);
      try {
        const [matchRes, summaryRes, eventsRes] = await Promise.allSettled([
          matchService.getById(matchId),
          scoringService.getScorecard(matchId),
          scoringService.getEvents(matchId),
        ]);
        if (matchRes.status === "fulfilled") setMatch(matchRes.value.data?.data || matchRes.value.data);
        if (summaryRes.status === "fulfilled") setSummaryData(summaryRes.value.data?.data || summaryRes.value.data);
        if (eventsRes.status === "fulfilled") setEvents(eventsRes.value.data?.data || eventsRes.value.data || []);
      } catch (error) {
        console.error("Error fetching match summary", error);
      } finally {
        setLoading(false);
      }
    };
    if (matchId) fetchMatchAndSummary();
  }, [matchId]);

  const handleUpdateStream = async () => {
    if (!streamUrl.trim()) return toast.error("Enter a YouTube URL");
    setSubmitting(true);
    try {
      const res = await matchService.updateStreamUrl(matchId, { youtubeStreamUrl: streamUrl });
      const updated = res.data?.data || res.data;
      setMatch((prev) => ({ ...prev, youtubeStreamUrl: updated?.youtubeStreamUrl || streamUrl }));
      toast.success("Stream URL updated");
      setShowStream(false);
    } catch { /* interceptor */ } finally { setSubmitting(false); }
  };

  const handleAssignManager = async () => {
    if (!assignForm.name.trim()) return toast.error("Scorer name is required");
    if (!assignForm.password.trim()) return toast.error("Password is required");
    setSubmitting(true);
    try {
      await authService.createMatchManager({
        matchId,
        clubId: match?.clubId?._id || match?.clubId,
        name: assignForm.name,
        ...(assignForm.password.trim() && { password: assignForm.password }),
      });
      toast.success("Match Manager assigned");
      setShowAssign(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to assign scorer");
    } finally { setSubmitting(false); }
  };

  const handleCopyScorerLink = async () => {
    try {
      const res = await matchService.generateToken(matchId);
      const token = res.data?.data?.token || res.data?.token;
      if (token) {
        const link = `${window.location.origin}/scorer/login?token=${token}`;
        await navigator.clipboard.writeText(link);
        toast.success("Scorer link copied to clipboard!");
      }
    } catch { /* interceptor */ }
  };

  const handleCopyTvLink = () => {
    const base = import.meta.env.VITE_FRONTEND_URL || "http://localhost:5173";
    const url = `${base}/tv/${encodeId(matchId)}`;
    navigator.clipboard.writeText(url).then(() => toast.success("TV display link copied!"));
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-muted-foreground">
      <Loader2 className="w-10 h-10 animate-spin mb-4" style={{ color: themeColor }} />
      <p>Loading Match Summary...</p>
    </div>
  );

  if (!match) return (
    <div className="text-center py-16 text-muted-foreground">
      <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
      <p className="font-medium text-lg">Match Not Found</p>
      <Button variant="outline" className="mt-4" onClick={() => navigate(-1)} style={{ borderColor: themeColor, color: themeColor }}>
        Go Back
      </Button>
    </div>
  );

  const inningsToShow = [
    summaryData?.innings?.first?.battingTeamId && {
      label: `1st Innings — ${summaryData.innings.first.battingTeamId?.name || "Team A"}`,
      data: summaryData.innings.first,
    },
    summaryData?.innings?.second?.battingTeamId && {
      label: `2nd Innings — ${summaryData.innings.second.battingTeamId?.name || "Team B"}`,
      data: summaryData.innings.second,
    },
    summaryData?.innings?.superOverFirst?.battingTeamId && {
      label: `Super Over (1st) — ${summaryData.innings.superOverFirst.battingTeamId?.name || ""}`,
      data: summaryData.innings.superOverFirst,
      isSuperOver: true,
    },
    summaryData?.innings?.superOverSecond?.battingTeamId && {
      label: `Super Over (2nd) — ${summaryData.innings.superOverSecond.battingTeamId?.name || ""}`,
      data: summaryData.innings.superOverSecond,
      isSuperOver: true,
    },
  ].filter(Boolean);

  return (
    <>
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <motion.div variants={item} className="flex flex-col gap-4">
        {/* Back + Title row */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {match.teamA?.name} <span className="text-xl opacity-40 font-medium" style={{ color: themeColor }}>vs</span> {match.teamB?.name}
            </h1>
            <p className="text-muted-foreground mt-1">
              {match.status === "completed" ? (
                <span className="font-bold text-lg" style={{ color: themeColor }}>{match.result?.summary || "Match Completed"}</span>
              ) : (
                <span className="capitalize">{match.status} Match • {match.oversPerInning} Overs</span>
              )}
            </p>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="flex flex-wrap gap-2 pl-14">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-xs font-semibold"
            onClick={() => navigate(`/scoring/${encodeId(matchId)}`)}
            style={{ borderColor: `${themeColor}40`, color: themeColor }}
          >
            <PlayCircle className="w-4 h-4" /> Open Scorecard
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-xs font-semibold"
            onClick={() => { setAssignForm({ name: "", email: "", password: "" }); setShowAssign(true); }}
          >
            <KeyRound className="w-4 h-4" /> Assign Scorer
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-xs font-semibold"
            onClick={handleCopyScorerLink}
          >
            <LinkIcon className="w-4 h-4" /> Copy Scorer Link
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-xs font-semibold"
            onClick={() => { setStreamUrl(match.youtubeStreamUrl || ""); setShowStream(true); }}
          >
            <PlayCircle className="w-4 h-4" /> Update Stream URL
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-xs font-semibold"
            onClick={handleCopyTvLink}
          >
            <Monitor className="w-4 h-4" /> Display Link
          </Button>

          {match.youtubeStreamUrl && (
            <Button
              size="sm"
              className="gap-2 text-xs font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #ff0000, #cc0000)" }}
              onClick={() => {
                const videoId = match.youtubeStreamUrl.split("/embed/")[1]?.split("?")[0] || "";
                window.open(videoId ? `https://www.youtube.com/watch?v=${videoId}` : match.youtubeStreamUrl, "_blank");
              }}
            >
              <Play className="w-4 h-4" /> Watch Live
            </Button>
          )}
        </div>
      </motion.div>

      {/* Scorecard */}
      <motion.div variants={item}>
        {!summaryData || inningsToShow.length === 0 ? (
          <div className="text-center py-16 bg-secondary/10 rounded-2xl border border-border/50 text-muted-foreground">
            <Shield className="w-12 h-12 mx-auto mb-4 opacity-20" style={{ color: themeColor }} />
            <p className="text-xl font-medium">No Scorecard Available</p>
            <p className="text-sm mt-1">This match has not started or the data is missing.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {inningsToShow.map(({ label, data, isSuperOver }, idx) => (
              <AdminInningsBlock
                key={idx}
                label={label}
                data={data}
                themeColor={themeColor}
                isSuperOver={isSuperOver}
                isFirst={idx === 0}
              />
            ))}
          </div>
        )}
      </motion.div>

      {/* Ball by Ball Commentary */}
      <motion.div variants={item} className="mt-10">
        <h2 className="text-2xl font-bold tracking-tight mb-6 flex items-center gap-2" style={{ color: themeColor }}>
          <Zap className="w-6 h-6" /> Ball by Ball Commentary
        </h2>
        {events.length === 0 ? (
          <div className="text-center py-12 bg-secondary/10 rounded-2xl border border-border/50 text-muted-foreground">
            <p className="font-medium">No commentary events available yet.</p>
          </div>
        ) : (
          <div className="max-h-[600px] overflow-y-auto overscroll-contain pr-2 space-y-4">
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
                if (ev.isWicket || ev.eventType === "wicket" || ev.type === "wicket") currentGroup.hasWicket = true;
              });

              return groupedEvents.map((group, idx) => (
                <div key={idx} className="border border-border/50 rounded-2xl bg-card overflow-hidden shadow-sm">
                  <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between" style={{ backgroundColor: `${themeColor}08` }}>
                    <span className="font-semibold text-sm text-foreground">Over {group.over}</span>
                    <div className="flex gap-2 items-center">
                      {group.hasWicket && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 uppercase tracking-wide">Wicket</span>}
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-border/50 bg-background text-muted-foreground">
                        {group.totalRuns} Run{group.totalRuns !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <div className="divide-y divide-border/50">
                    {group.events.map((ev, i) => {
                      const isWicket = ev.isWicket || ev.eventType === "wicket" || ev.type === "wicket";
                      const isSix = ev.isSix || ev.runs === 6;
                      const isFour = ev.isBoundary || ev.runs === 4;
                      const isExtra = ["wide", "noball", "bye", "legbye"].includes(ev.eventType) || ev.type === "extra";

                      const badge = isWicket ? { bg: "bg-red-500/15", color: "text-red-500", border: "border-red-500/30", label: "W" }
                        : isSix ? { bg: "bg-purple-500/15", color: "text-purple-500", border: "border-purple-500/30", label: "6" }
                        : isFour ? { bg: "bg-blue-500/15", color: "text-blue-500", border: "border-blue-500/30", label: "4" }
                        : isExtra ? { bg: "bg-amber-500/15", color: "text-amber-500", border: "border-amber-500/30", label: ev.extraType?.[0]?.toUpperCase() || ev.eventType?.[0]?.toUpperCase() || ev.type?.[0]?.toUpperCase() || "E" }
                        : { bg: "bg-secondary", color: "text-foreground", border: "border-border", label: ev.runs ?? "·" };

                      const batsman = ev.batsmanId?.name || ev.batsmanId;
                      const bowler = ev.bowlerId?.name || ev.bowlerId;
                      const ballNumber = `${ev.over ?? "?"}.${ev.ball ?? "?"}`;

                      return (
                        <div key={i} className="flex items-start gap-4 p-4 hover:bg-secondary/20 transition-colors group">
                          <div className="flex flex-col items-center shrink-0 w-12 pt-0.5">
                            <span className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black border transition-transform group-hover:scale-110 shadow-sm ${badge.bg} ${badge.color} ${badge.border}`}>
                              {badge.label}
                            </span>
                            <span className="text-[10px] font-bold mt-2 text-muted-foreground tracking-wide">{ballNumber}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-muted-foreground mb-1 flex items-center flex-wrap gap-1.5">
                              <span className="text-foreground/80">{bowler || "Bowler"}</span>
                              <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border" style={{ color: themeColor, borderColor: `${themeColor}40`, backgroundColor: `${themeColor}10` }}>Bowler</span>
                              <span>to</span>
                              <span className="text-foreground/80">{batsman || "Batsman"}</span>
                              <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border" style={{ color: themeColor, borderColor: `${themeColor}40`, backgroundColor: `${themeColor}10` }}>Batsman</span>
                            </p>
                            <p className="text-sm font-medium text-foreground leading-relaxed">
                              {ev.description || (isWicket ? (
                                <span className="text-red-500 font-bold">OUT! {ev.wicket?.type?.replace(/-/g, ' ') || ""}</span>
                              ) : isSix ? (
                                <span className="text-purple-500 font-bold">SIX runs!</span>
                              ) : isFour ? (
                                <span className="text-blue-500 font-bold">FOUR runs!</span>
                              ) : isExtra ? (
                                <span>{ev.extras?.runs || ev.runs} {ev.extraType || ev.eventType || ev.type}</span>
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
    </motion.div>

      {/* Update Stream URL Dialog */}
      <Dialog open={showStream} onOpenChange={setShowStream}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ color: themeColor }}>Update Stream URL</DialogTitle>
            <DialogDescription>Add a YouTube URL for live streaming this match.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>YouTube URL</Label>
            <Input
              placeholder="https://www.youtube.com/watch?v=..."
              value={streamUrl}
              onChange={(e) => setStreamUrl(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStream(false)}>Cancel</Button>
            <Button onClick={handleUpdateStream} disabled={submitting} style={{ backgroundColor: themeColor, color: "#fff" }}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Update Stream
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Scorer Dialog */}
      <Dialog open={showAssign} onOpenChange={setShowAssign}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ color: themeColor }}>Assign Match Manager</DialogTitle>
            <DialogDescription>Create a dedicated scorer account for this match.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input placeholder="Scorer Name" value={assignForm.name} onChange={(e) => setAssignForm({ ...assignForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Password <span className="text-destructive">*</span></Label>
              <PasswordInput value={assignForm.password} onChange={(e) => setAssignForm({ ...assignForm, password: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssign(false)}>Cancel</Button>
            <Button onClick={handleAssignManager} disabled={submitting} style={{ backgroundColor: themeColor, color: "#fff" }}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Assign Scorer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ─── Player Avatar ─── */
function PlayerAvatar({ player, themeColor }) {
  if (!player) return <div className="w-8 h-8 rounded-full bg-muted shrink-0" />;
  if (player.avatar) {
    return <img src={player.avatar} alt={player.name} className="w-8 h-8 rounded-full object-cover shrink-0 border" />;
  }
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ backgroundColor: themeColor }}>
      {(player.name || "?")[0]}
    </div>
  );
}

/* ─── Reusable Innings Block ─── */
function AdminInningsBlock({ label, data, themeColor, isSuperOver, isFirst }) {
  return (
    <div className={`space-y-4 ${!isFirst ? "pt-8 border-t-2 border-border/30" : ""}`}>
      {/* Innings Header */}
      <div
        className="flex items-center justify-between p-5 rounded-2xl border shadow-sm"
        style={{ background: `linear-gradient(90deg, ${themeColor}15, transparent)`, borderColor: `${themeColor}30` }}
      >
        <h3 className="text-xl font-bold flex items-center gap-2" style={{ color: themeColor }}>
          {isSuperOver && <Zap className="w-5 h-5" />}{label}
        </h3>
        <Badge variant="outline" className="text-xl font-black bg-background/80 backdrop-blur-sm px-4 py-1.5 shadow-sm" style={{ borderColor: themeColor, color: themeColor }}>
          {data.score ?? 0}/{data.wickets ?? 0}
          <span className="text-base opacity-60 font-medium ml-2">({data.overs?.toFixed?.(1) || "0.0"} ov)</span>
        </Badge>
      </div>

      {/* Batting Table */}
      <div className="border border-border/50 rounded-2xl overflow-hidden shadow-sm bg-card">
        <Table>
          <TableHeader style={{ backgroundColor: `${themeColor}10` }}>
            <TableRow className="hover:bg-transparent border-b border-border/50">
              {["Batsman", "R", "B", "4s", "6s", "SR"].map((h, i) => (
                <TableHead key={h} className={`font-bold ${i > 0 ? "text-center w-12" : ""}`} style={{ color: themeColor }}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data.battingOrder || []).length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No batting data</TableCell></TableRow>
            ) : data.battingOrder.map((bat, i) => (
              <TableRow key={i} className={bat.isOut ? "opacity-75 bg-muted/10 hover:bg-muted/20" : "hover:bg-secondary/10"}>
                <TableCell className="font-medium text-base">
                  <div className="flex items-center gap-3">
                    <PlayerAvatar player={bat.playerId} themeColor={themeColor} />
                    <div>
                      {bat.playerId?._id ? (
                        <Link to={`/players/${bat.playerId._id}`} className="hover:underline font-medium" style={{ color: bat.isOut ? "inherit" : themeColor }}>
                          {bat.playerId?.name || "Unknown"}
                        </Link>
                      ) : (
                        <span style={{ color: bat.isOut ? "inherit" : themeColor }}>{bat.playerId?.name || "Unknown"}</span>
                      )}
                      {bat.isOut ? (
                        <span className="block text-xs text-red-500 font-normal capitalize">{bat.dismissalType?.replace(/-/g, " ")}</span>
                      ) : bat.balls > 0 ? (
                        <span className="block text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border w-fit mt-0.5"
                          style={{ color: themeColor, borderColor: `${themeColor}40`, backgroundColor: `${themeColor}10` }}>not out</span>
                      ) : null}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center font-bold text-base">{bat.runs}</TableCell>
                <TableCell className="text-center text-muted-foreground">{bat.balls}</TableCell>
                <TableCell className="text-center font-medium">{bat.fours}</TableCell>
                <TableCell className="text-center font-medium">{bat.sixes}</TableCell>
                <TableCell className="text-center text-muted-foreground text-sm font-mono">
                  {bat.balls > 0 ? ((bat.runs / bat.balls) * 100).toFixed(1) : "0.0"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {/* Extras */}
        <div className="px-6 py-4 border-t border-border/50 text-sm text-muted-foreground flex items-center gap-4 flex-wrap" style={{ backgroundColor: `${themeColor}05` }}>
          <span className="font-bold text-base" style={{ color: themeColor }}>Extras: {data.extras?.total ?? 0}</span>
          <span className="opacity-80">(WD {data.extras?.wides ?? 0}, NB {data.extras?.noBalls ?? 0}, B {data.extras?.byes ?? 0}, LB {data.extras?.legByes ?? 0})</span>
          <span className="ml-auto font-bold" style={{ color: themeColor }}>Total: {data.score ?? 0}/{data.wickets ?? 0}</span>
        </div>
      </div>

      {/* Bowling Table */}
      <div className="border border-border/50 rounded-2xl overflow-hidden mt-6 shadow-sm bg-card">
        <Table>
          <TableHeader style={{ backgroundColor: `${themeColor}10` }}>
            <TableRow className="hover:bg-transparent border-b border-border/50">
              {["Bowler", "O", "M", "R", "W", "Econ"].map((h, i) => (
                <TableHead key={h} className={`font-bold ${i > 0 ? "text-center w-12" : ""}`} style={{ color: themeColor }}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data.bowlingFigures || []).length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No bowling data</TableCell></TableRow>
            ) : data.bowlingFigures.map((bowl, i) => {
              const totalOvers = (bowl.overs || 0) + ((bowl.balls || 0) / 6);
              return (
                <TableRow key={i} className="hover:bg-secondary/10">
                  <TableCell className="font-medium text-base">
                    <div className="flex items-center gap-3">
                    <PlayerAvatar player={bowl.playerId} themeColor={themeColor} />
                    {bowl.playerId?._id ? (
                      <Link to={`/players/${bowl.playerId._id}`} className="hover:underline font-medium">{bowl.playerId?.name || "Unknown"}</Link>
                    ) : (
                      <span>{bowl.playerId?.name || "Unknown"}</span>
                    )}
                  </div>
                  </TableCell>
                  <TableCell className="text-center font-medium">{bowl.overs ?? 0}.{bowl.balls ?? 0}</TableCell>
                  <TableCell className="text-center text-muted-foreground">{bowl.maidens ?? 0}</TableCell>
                  <TableCell className="text-center font-medium">{bowl.runs ?? 0}</TableCell>
                  <TableCell className="text-center font-bold text-red-500 text-base">{bowl.wickets ?? 0}</TableCell>
                  <TableCell className="text-center text-muted-foreground text-sm font-mono">
                    {totalOvers > 0 ? (bowl.runs / totalOvers).toFixed(1) : "0.0"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
