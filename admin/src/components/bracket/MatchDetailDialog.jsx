import { useState, useEffect } from "react";
import { useAppContext } from "@/hooks/useAppContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Trophy, MapPin, Clock } from "lucide-react";
import { cn, toLocalISOString } from "@/lib/utils";

export default function MatchDetailDialog({ match, open, onClose, onSubmitResult, onSchedule, submitting }) {
  const { themeColor } = useAppContext();
  const [winnerId, setWinnerId] = useState("");
  const [scheduleData, setScheduleData] = useState({ 
    startTime: toLocalISOString(match?.startTime), 
    venue: match?.venue || "",
    action: "",
    reason: ""
  });

  useEffect(() => {
    if (match) {
      setScheduleData({
        startTime: toLocalISOString(match.startTime),
        venue: match.venue || "",
        action: "",
        reason: ""
      });
    }
  }, [match]);

  const [isRescheduling, setIsRescheduling] = useState(false);

  if (!match) return null;

  const teamA = match.teamA;
  const teamB = match.teamB;
  const isCompleted = match.status === "completed";
  const isBye = match.isBye;
  const currentWinner = match.result?.winner?._id || match.result?.winner;

  // If match is upcoming but time has passed, visually display as live
  const displayStatus = match.status;

  const handleSubmitResult = () => {
    if (!winnerId) return;
    onSubmitResult?.(match._id || match.id, winnerId);
    setWinnerId("");
  };

  const handleSchedule = () => {
    onSchedule?.(match._id || match.id, scheduleData);
  };

  const statusColor = {
    completed: "text-emerald-400",
    live: "text-amber-400",
    upcoming: "text-indigo-400",
    unscheduled: "text-muted-foreground",
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" style={{ color: themeColor }} />
            {match.matchLabel || (match.matchNumber ? `Match #${match.matchNumber}` : 'Match Details')}
          </DialogTitle>
          <DialogDescription>
            {isBye ? "BYE — Auto-advance" : "Match details and result management"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Teams display */}
          <div className="flex items-center justify-center gap-6 py-3">
            <TeamCard team={teamA} isWinner={currentWinner && String(currentWinner) === String(teamA?._id)} />
            <span className="text-lg font-bold text-muted-foreground/40">VS</span>
            <TeamCard team={teamB} isWinner={currentWinner && String(currentWinner) === String(teamB?._id)} />
          </div>

          {/* Status */}
          <div className="flex items-center justify-center gap-2">
            <Badge variant="outline" className={statusColor[displayStatus]}>
              {displayStatus?.toUpperCase()}
            </Badge>
            {isBye && <Badge variant="outline" className="text-amber-400 border-amber-500/30">BYE</Badge>}
          </div>

          {/* Schedule info */}
          {match.startTime && (
            <div className="flex flex-col gap-2 px-2 text-sm text-muted-foreground bg-secondary/20 p-3 rounded-lg border border-border/50">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {new Date(match.startTime).toLocaleString()}</span>
                {match.venue && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {match.venue}</span>}
              </div>
              
              {match.rescheduleAction && (
                <div className="mt-1 pt-2 border-t border-border/50 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={match.rescheduleAction === 'prepone' ? 'text-emerald-500 border-emerald-500/50' : 'text-rose-500 border-rose-500/50'}>
                      {match.rescheduleAction.toUpperCase()}
                    </Badge>
                  </div>
                  {match.rescheduleReason && <p className="text-xs text-muted-foreground/80 italic">"{match.rescheduleReason}"</p>}
                </div>
              )}
            </div>
          )}

          {/* Schedule / Reschedule Form */}
          {!isCompleted && !isBye && teamA && teamB && (
            <div className="space-y-3 border-t border-border pt-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {match.startTime ? 'Reschedule Match' : 'Schedule Match'}
                </p>
                {match.startTime && !isRescheduling && (
                  <Button variant="ghost" size="sm" className="h-6 text-xs hover:text-indigo-300" style={{ color: themeColor }} onClick={() => setIsRescheduling(true)}>
                    Edit Schedule
                  </Button>
                )}
                {isRescheduling && (
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setIsRescheduling(false)}>
                    Cancel
                  </Button>
                )}
              </div>

              {(!match.startTime || isRescheduling) && (
                <div className="space-y-3 bg-secondary/10 p-3 rounded-md border border-border/50">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Date & Time</Label>
                      <Input
                        type="datetime-local"
                        value={scheduleData.startTime}
                        onChange={(e) => setScheduleData({ ...scheduleData, startTime: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Venue</Label>
                      <Input
                        placeholder="Stadium"
                        value={scheduleData.venue}
                        onChange={(e) => setScheduleData({ ...scheduleData, venue: e.target.value })}
                      />
                    </div>
                  </div>

                  {match.startTime && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Action *</Label>
                          <Select value={scheduleData.action} onValueChange={(v) => setScheduleData({ ...scheduleData, action: v })}>
                            <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="prepone">Prepone</SelectItem>
                              <SelectItem value="postpone">Postpone</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Reason *</Label>
                        <Input
                          placeholder="Why is it being rescheduled?"
                          value={scheduleData.reason}
                          onChange={(e) => setScheduleData({ ...scheduleData, reason: e.target.value })}
                        />
                      </div>
                    </>
                  )}

                  <Button 
                    onClick={handleSchedule} 
                    disabled={submitting || !scheduleData.startTime || (match.startTime && (!scheduleData.action || !scheduleData.reason))} 
                    size="sm" 
                    className="w-full text-white mt-2"
                    style={{ backgroundColor: themeColor }}
                  >
                    {submitting && <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />} {match.startTime ? 'Confirm Reschedule' : 'Schedule'}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Result submission (for scheduled/live matches) */}
          {!isBye && !isCompleted && teamA && teamB && (displayStatus === "upcoming" || displayStatus === "live") && (
            <div className="space-y-3 border-t border-border pt-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Set Winner</p>
              <Select value={winnerId} onValueChange={setWinnerId}>
                <SelectTrigger><SelectValue placeholder="Select winner" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={teamA._id || teamA.id}>{teamA.name}</SelectItem>
                  <SelectItem value={teamB._id || teamB.id}>{teamB.name}</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleSubmitResult} disabled={submitting || !winnerId} size="sm" className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
                {submitting && <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />} Submit Result
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onClose(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TeamCard({ team, isWinner }) {
  if (!team) {
    return (
      <div className="flex flex-col items-center gap-1.5 opacity-40">
        <div className="w-12 h-12 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
          <span className="text-xs text-muted-foreground">?</span>
        </div>
        <span className="text-xs text-muted-foreground">TBD</span>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center gap-1.5", isWinner && "scale-110")}>
      <div className={cn(
        "w-14 h-14 rounded-full border-2 flex items-center justify-center overflow-hidden transition-all",
        isWinner ? "border-emerald-400 ring-2 ring-emerald-400/30 ring-offset-1 ring-offset-background" : "border-border"
      )}>
        {team.logo ? (
          <img src={team.logo} alt={team.name} className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <span className="text-sm font-bold text-foreground/70">
            {team.shortName || team.name?.slice(0, 2)?.toUpperCase()}
          </span>
        )}
      </div>
      <span className={cn("text-xs font-medium", isWinner ? "text-emerald-400" : "text-muted-foreground")}>
        {team.name}
      </span>
      {isWinner && <span className="text-[9px] text-emerald-400">🏆 Winner</span>}
    </div>
  );
}
