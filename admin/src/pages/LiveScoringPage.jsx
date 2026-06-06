import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAppContext } from "@/hooks/useAppContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";
import scoringService from "@/services/scoringService";
import matchService from "@/services/matchService";
import teamService from "@/services/teamService";
import { decodeId, encodeId } from "@/utils/crypto";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlayCircle, RotateCcw, AlertTriangle, UserMinus, SkipForward, Ban, Loader2, Clock, PauseCircle, Pencil, Trophy, Monitor } from "lucide-react";

const getPlayerId = (player) => player?._id || player?.id || player;

function CountdownTimer({ startTime, onTimeUp }) {
  const { themeColor } = useAppContext();
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!startTime) return;
    
    let timer;
    const calculateTimeLeft = () => {
      const difference = new Date(startTime) - new Date();
      if (difference <= 0) {
        if (timer) clearInterval(timer);
        onTimeUp?.();
        return "Match is ready to start!";
      }
      
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);
      
      return `${days > 0 ? `${days}d ` : ''}${hours}h ${minutes}m ${seconds}s`;
    };

    setTimeLeft(calculateTimeLeft());
    timer = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000);
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [startTime, onTimeUp]);

  return (
    <div 
      className="flex items-center gap-3 text-2xl font-mono font-bold px-6 py-3 rounded-xl shadow-inner border"
      style={{
        backgroundColor: `${themeColor}15`,
        borderColor: `${themeColor}40`,
        color: themeColor
      }}
    >
      <Clock className="w-6 h-6 animate-pulse" />
      {timeLeft || "Calculating..."}
    </div>
  );
}

export default function LiveScoringPage() {
  const params = useParams();
  const routeMatchId = decodeId(params.matchId);
  const { user, themeColor } = useAppContext();
  const matchId = routeMatchId || user?.matchId;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [socket, setSocket] = useState(null);

  // Modals
  const [showStart, setShowStart] = useState(false);
  const [showWicket, setShowWicket] = useState(false);
  const [showEnd, setShowEnd] = useState(false);
  const [showPlayers, setShowPlayers] = useState(false);
  const [showPause, setShowPause] = useState(false);
  const [showBowlerChange, setShowBowlerChange] = useState(false);
  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false);
  const [showWinnerPopup, setShowWinnerPopup] = useState(false);
  const [showSuperOver, setShowSuperOver] = useState(false);

  // Forms
  const [tossWinner, setTossWinner] = useState("");
  const [tossDecision, setTossDecision] = useState("bat");
  const [activeStriker, setActiveStriker] = useState("");
  const [activeNonStriker, setActiveNonStriker] = useState("");
  const [activeBowler, setActiveBowler] = useState("");
  const [wicketForm, setWicketForm] = useState({ batsman: "", type: "bowled", fielder: "" });
  const [showExtrasMenu, setShowExtrasMenu] = useState(null); // 'wide' | 'bye' | 'legbye' | null
  const [pauseReason, setPauseReason] = useState("");
  const [pauseStartTime, setPauseStartTime] = useState("");
  const [newBowler, setNewBowler] = useState("");
  const [prevBalls, setPrevBalls] = useState(null);
  const [superOverOvers, setSuperOverOvers] = useState(1);
  const [matchResult, setMatchResult] = useState(null); // { winnerTeam, loserTeam, marginType, marginValue, summary }

  // Substitute Handling
  const [showSubPrompt, setShowSubPrompt] = useState(false);
  const [pendingSub, setPendingSub] = useState(null); // { role, playerId, squadSide }
  const [subForm, setSubForm] = useState({ replacedPlayerId: "", reason: "" });

  // Data fetching state for player selection
  const [battingTeamPlayers, setBattingTeamPlayers] = useState([]);
  const [bowlingTeamPlayers, setBowlingTeamPlayers] = useState([]);

  // 1. Setup Socket
  useEffect(() => {
    if (!matchId) return;
    const s = io(import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5000", {
      withCredentials: true,
    });
    setSocket(s);

    s.emit("join_match", { matchId });

    s.on("score_update", () => {
      queryClient.invalidateQueries({ queryKey: ["scorecard", matchId] });
    });
    s.on("match_started", () => {
      queryClient.invalidateQueries({ queryKey: ["match", matchId] });
      queryClient.invalidateQueries({ queryKey: ["scorecard", matchId] });
    });
    s.on("match_paused", () => {
      queryClient.invalidateQueries({ queryKey: ["match", matchId] });
    });
    s.on("match_resumed", () => {
      queryClient.invalidateQueries({ queryKey: ["match", matchId] });
      queryClient.invalidateQueries({ queryKey: ["scorecard", matchId] });
    });

    return () => {
      s.emit("leave_match", { matchId });
      s.disconnect();
    };
  }, [matchId, queryClient]);

  // 2. Fetch Data
  const { data: matchRaw, isLoading: matchLoading } = useQuery({
    queryKey: ["match", matchId],
    queryFn: () => matchService.getById(matchId),
    enabled: !!matchId,
  });
  const match = matchRaw?.data?.data || matchRaw?.data;

  const { data: scorecardRaw, isLoading: scoreLoading } = useQuery({
    queryKey: ["scorecard", matchId],
    queryFn: () => scoringService.getScorecard(matchId),
    enabled: !!matchId && match?.status !== "unscheduled",
    retry: false, // Do not retry on 404
  });
  const scorecard = scorecardRaw?.data?.data || scorecardRaw?.data;

  const getInningsKey = (inningNum) => {
    if (inningNum === 1) return 'first';
    if (inningNum === 2) return 'second';
    if (inningNum === 3) return 'superOverFirst';
    if (inningNum === 4) return 'superOverSecond';
    return 'first';
  };
  const currentInningKey = getInningsKey(scorecard?.currentInning);
  const currentInnings = scorecard?.innings?.[currentInningKey] || {};

  // Detect over completion and prompt bowler change
  useEffect(() => {
    if (!currentInnings?.balls) return;
    const balls = currentInnings.balls;
    if (prevBalls !== null && prevBalls !== balls && balls > 0 && balls % 6 === 0) {
      // An over just completed
      setShowBowlerChange(true);
      // Pre-load bowling team players
      const bowlId = currentInnings.bowlingTeamId?._id || currentInnings.bowlingTeamId;
      if (bowlId) teamService.getPlayers(bowlId).then(res => setBowlingTeamPlayers(res.data?.data || []));
    }
    setPrevBalls(balls);
  }, [currentInnings?.balls, prevBalls, currentInnings.bowlingTeamId]);

  // Load players when modal opens
  useEffect(() => {
    if (showPlayers && match && scorecard) {
      const batId = currentInnings.battingTeamId?._id || currentInnings.battingTeamId;
      const bowlId = currentInnings.bowlingTeamId?._id || currentInnings.bowlingTeamId;
      
      if (batId) teamService.getPlayers(batId).then(res => setBattingTeamPlayers(res.data?.data || []));
      if (bowlId) teamService.getPlayers(bowlId).then(res => setBowlingTeamPlayers(res.data?.data || []));
      
      const isOut = (playerId) => (currentInnings.battingOrder || []).some(
        (bat) => String(getPlayerId(bat.playerId)) === String(playerId) && bat.isOut
      );
      const currentStrikerId = getPlayerId(scorecard.currentBatsmen?.striker?.playerId);
      const currentNonStrikerId = getPlayerId(scorecard.currentBatsmen?.nonStriker?.playerId);
      const currentBowlerId = getPlayerId(scorecard.currentBowler?.playerId);

      setActiveStriker(currentStrikerId && !isOut(currentStrikerId) ? currentStrikerId : "");
      setActiveNonStriker(currentNonStrikerId && !isOut(currentNonStrikerId) ? currentNonStrikerId : "");
      setActiveBowler(currentBowlerId || "");
    }
  }, [showPlayers, match, scorecard, currentInnings]);

  // 3. Mutations
  const startMatchMut = useMutation({
    mutationFn: (data) => scoringService.startMatch(matchId, data),
    onSuccess: () => {
      toast.success("Match Started!");
      setShowStart(false);
      queryClient.invalidateQueries({ queryKey: ["match", matchId] });
      queryClient.invalidateQueries({ queryKey: ["scorecard", matchId] });
    },
    onError: (err) => toast.error(err?.response?.data?.message || "Failed to start match"),
  });

  const resumeMatchMut = useMutation({
    mutationFn: () => scoringService.resumeMatch(matchId),
    onSuccess: () => {
      toast.success("Match Resumed!");
      queryClient.invalidateQueries({ queryKey: ["match", matchId] });
      queryClient.invalidateQueries({ queryKey: ["scorecard", matchId] });
    },
    onError: (err) => toast.error(err?.response?.data?.message || "Failed to resume match"),
  });

  const pauseMatchMut = useMutation({
    mutationFn: (data) => scoringService.pauseMatch(matchId, data),
    onSuccess: () => {
      toast.success("Match Paused");
      setShowPause(false);
      queryClient.invalidateQueries({ queryKey: ["match", matchId] });
    },
    onError: (err) => toast.error(err?.response?.data?.message || "Failed to pause match"),
  });

  const scoreMut = useMutation({
    mutationFn: (data) => scoringService.addScore(matchId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scorecard", matchId] });
    },
    onError: (err) => toast.error(err?.response?.data?.message || "Failed to add score"),
  });

  const extraMut = useMutation({
    mutationFn: (data) => scoringService.addExtra(matchId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scorecard", matchId] });
    },
    onError: (err) => toast.error(err?.response?.data?.message || "Failed to add extra"),
  });

  const wicketMut = useMutation({
    mutationFn: (data) => scoringService.addWicket(matchId, data),
    onSuccess: () => {
      toast.success("WICKET!");
      setShowWicket(false);
      queryClient.invalidateQueries({ queryKey: ["scorecard", matchId] });
      setShowPlayers(true); // Need new batsman
    },
    onError: (err) => toast.error(err?.response?.data?.message || "Failed to record wicket"),
  });

  const setPlayersMut = useMutation({
    mutationFn: (data) => scoringService.setActivePlayers(matchId, data),
    onSuccess: () => {
      toast.success("Active players updated");
      setShowPlayers(false);
      queryClient.invalidateQueries({ queryKey: ["scorecard", matchId] });
    },
  });

  const addSubstituteMut = useMutation({
    mutationFn: (data) => scoringService.addSubstitute(matchId, data),
    onSuccess: () => {
      toast.success("Substitute added");
      setShowSubPrompt(false);
      setPendingSub(null);
      setSubForm({ replacedPlayerId: "", reason: "" });
      queryClient.invalidateQueries({ queryKey: ["scorecard", matchId] });
      queryClient.invalidateQueries({ queryKey: ["match", matchId] });
    },
    onError: (err) => toast.error(err?.response?.data?.message || "Failed to add substitute")
  });

  const undoMut = useMutation({
    mutationFn: () => scoringService.undoLastEvent(matchId),
    onSuccess: () => {
      toast.success("Undid last action");
      queryClient.invalidateQueries({ queryKey: ["scorecard", matchId] });
    },
  });

  const switchInningsMut = useMutation({
    mutationFn: () => scoringService.switchInnings(matchId),
    onSuccess: () => {
      toast.success("Innings Switched");
      setShowSwitchConfirm(false);
      setShowPlayers(true);
      queryClient.invalidateQueries({ queryKey: ["scorecard", matchId] });
      queryClient.invalidateQueries({ queryKey: ["match", matchId] });
    },
  });

  const endMatchMut = useMutation({
    mutationFn: (data) => scoringService.endMatch(matchId, data || {}),
    onSuccess: () => {
      toast.success("Match Ended");
      setShowEnd(false);
      setShowWinnerPopup(false);
      queryClient.invalidateQueries({ queryKey: ["match", matchId] });
      queryClient.invalidateQueries({ queryKey: ["scorecard", matchId] });
    },
    onError: (err) => toast.error(err?.response?.data?.message || "Failed to end match"),
  });

  const saveSuperOverMut = useMutation({
    mutationFn: (data) => scoringService.saveSuperOver(matchId, data),
    onSuccess: () => {
      toast.success("Super Over started! Set players to begin scoring.");
      setShowSuperOver(false);
      setShowWinnerPopup(false);
      setMatchResult(null);
      queryClient.invalidateQueries({ queryKey: ["scorecard", matchId] });
      queryClient.invalidateQueries({ queryKey: ["match", matchId] });
      setTimeout(() => setShowPlayers(true), 500);
    },
    onError: (err) => toast.error(err?.response?.data?.message || "Failed to start super over"),
  });

  const [isTimePassed, setIsTimePassed] = useState(false);

  useEffect(() => {
    if (match?.startTime) {
      setIsTimePassed(new Date(match.startTime) <= new Date());
    }
  }, [match?.startTime]);

  // ─── Auto-Result Detection (2nd Innings or 4th Innings) ───
  useEffect(() => {
    if (!scorecard || !match || match.status !== 'live') return;
    const isSuperOverChase = scorecard.currentInning === 4;
    if (scorecard.currentInning !== 2 && !isSuperOverChase) return;
    if (showWinnerPopup || showSuperOver) return; // Already showing a popup

    const chaseInnings = isSuperOverChase ? (scorecard.innings?.superOverSecond || {}) : (scorecard.innings?.second || {});
    const firstInnings = isSuperOverChase ? (scorecard.innings?.superOverFirst || {}) : (scorecard.innings?.first || {});
    const target = firstInnings.score + 1;
    const currentScore = chaseInnings.score || 0;
    const currentWickets = chaseInnings.wickets || 0;
    const currentBalls = chaseInnings.balls || 0;
    const totalBalls = isSuperOverChase ? (match.oversPerInning || 1) * 6 : (match.oversPerInning || 20) * 6;
    const maxWickets = isSuperOverChase ? 2 : 10; // usually 2 wickets for super over but we can just use 10 if standard rules are 10, wait, let's keep 10 to be safe unless cricarena uses 2. standard t20 super over has 2 wickets. Actually, let's just use 10 for safety since we haven't added specific super over wicket limits elsewhere.
    const effectiveMaxWickets = isSuperOverChase ? 2 : 10;

    // Resolve team names
    const batTeam = chaseInnings.battingTeamId;
    const bowlTeam = chaseInnings.bowlingTeamId;
    const batTeamName = batTeam?.name || 'Batting Team';
    const bowlTeamName = bowlTeam?.name || 'Bowling Team';
    const batTeamIdStr = batTeam?._id || batTeam;
    const bowlTeamIdStr = bowlTeam?._id || bowlTeam;

    // Case 1: Target chased — batting team wins
    if (currentScore >= target) {
      const wicketsRemaining = effectiveMaxWickets - currentWickets;
      setMatchResult({
        winner: batTeamIdStr,
        winnerName: batTeamName,
        loserName: bowlTeamName,
        summary: `${batTeamName} won by ${wicketsRemaining} wicket${wicketsRemaining !== 1 ? 's' : ''}${isSuperOverChase ? ' (Super Over)' : ''}`,
        margin: `${wicketsRemaining} wicket${wicketsRemaining !== 1 ? 's' : ''}`,
      });
      setShowWinnerPopup(true);
      return;
    }

    // Innings over conditions: all out OR overs exhausted
    const inningsOver = currentWickets >= effectiveMaxWickets || currentBalls >= totalBalls;
    if (!inningsOver) return;

    // Case 2: Scores tied — it's a draw, super over needed (if not already super over)
    if (currentScore === target - 1) {
      if (isSuperOverChase) {
        // Super over tied! We can declare draw or another super over, but let's just say Tied
        setMatchResult({
          winner: null,
          winnerName: null,
          loserName: null,
          summary: `Super Over Tied! ${batTeamName}: ${currentScore} — ${bowlTeamName}: ${firstInnings.score}`,
          margin: 'Tied',
          isTie: false, // Don't trigger another super over automatically
          batTeamName,
          bowlTeamName,
        });
      } else {
        setMatchResult({
          winner: null,
          winnerName: null,
          loserName: null,
          summary: `Match Tied! ${batTeamName}: ${currentScore} — ${bowlTeamName}: ${firstInnings.score}`,
          margin: 'Tied',
          isTie: true,
          batTeamName,
          bowlTeamName,
        });
      }
      setShowWinnerPopup(true);
      return;
    }

    // Case 3: Batting team failed to chase — bowling team wins
    if (currentScore < target - 1) {
      const runDiff = (target - 1) - currentScore;
      setMatchResult({
        winner: bowlTeamIdStr,
        winnerName: bowlTeamName,
        loserName: batTeamName,
        summary: `${bowlTeamName} won by ${runDiff} run${runDiff !== 1 ? 's' : ''}${isSuperOverChase ? ' (Super Over)' : ''}`,
        margin: `${runDiff} run${runDiff !== 1 ? 's' : ''}`,
      });
      setShowWinnerPopup(true);
      return;
    }
  }, [scorecard, match, showWinnerPopup, showSuperOver]);

  // Load bowling team players when wicket modal opens (needed for fielder dropdown)
  useEffect(() => {
    if (!showWicket) return;
    const bowlId = scorecard?.innings?.[
      scorecard?.currentInning === 1 ? 'first' : scorecard?.currentInning === 2 ? 'second' : scorecard?.currentInning === 3 ? 'superOverFirst' : 'superOverSecond'
    ]?.bowlingTeamId?._id || scorecard?.innings?.[
      scorecard?.currentInning === 1 ? 'first' : scorecard?.currentInning === 2 ? 'second' : scorecard?.currentInning === 3 ? 'superOverFirst' : 'superOverSecond'
    ]?.bowlingTeamId;
    if (bowlId && bowlingTeamPlayers.length === 0) {
      teamService.getPlayers(bowlId).then(res => setBowlingTeamPlayers(res.data?.data || []));
    }
  }, [showWicket]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Switch Innings Handler ───
  const handleSwitchInnings = () => {
    if (!scorecard || !match) return;
    const isSuperOver = match.superOver;
    const inn = isSuperOver ? (scorecard.innings?.superOverFirst || {}) : (scorecard.innings?.first || {});
    const totalBalls = (match.oversPerInning || 20) * 6;
    const maxWickets = isSuperOver ? 2 : 10;
    const ballsBowled = inn.balls || 0;
    const wicketsFallen = inn.wickets || 0;

    // If overs done or all out, switch directly
    if (ballsBowled >= totalBalls || wicketsFallen >= maxWickets) {
      switchInningsMut.mutate();
    } else {
      // Show confirmation
      setShowSwitchConfirm(true);
    }
  };

  if (!matchId) return <div className="p-8 text-center">No match selected</div>;
  if (matchLoading) return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
  if (!match) return <div className="p-8 text-center">Match not found</div>;

  const handleStartMatchClick = () => {
    if (!isTimePassed && !match.startTime) {
      toast.error("Match time not set yet!");
      return;
    }
    if (!isTimePassed && match.startTime) {
      toast.error("Match time has not started yet!");
      return;
    }
    setShowStart(true);
  };

  const hasSummary = !!scorecard;
  const isPaused = match.status === 'paused' || (match.status === 'upcoming' && match.rescheduleAction === 'postpone' && hasSummary);
  
  // Render Start/Resume Screen if upcoming/unscheduled/paused
  if (match.status === "upcoming" || match.status === "unscheduled" || match.status === "paused") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="text-center space-y-2">
          {isPaused ? (
            <Badge 
              className="mb-4 px-4 py-1 text-sm font-bold shadow-sm"
              style={{ backgroundColor: `${themeColor}20`, color: themeColor, borderColor: `${themeColor}40` }}
              variant="outline"
            >
              PAUSED
            </Badge>
          ) : (
            <Badge 
              variant="outline" 
              className="mb-4"
              style={{ borderColor: `${themeColor}40`, color: themeColor }}
            >
              Upcoming
            </Badge>
          )}
          <h1 className="text-3xl font-bold">{match.teamA?.name || 'TBD'} <span className="text-muted-foreground mx-2">vs</span> {match.teamB?.name || 'TBD'}</h1>
          <p className="text-muted-foreground">{match.oversPerInning || 20} Overs Match • {match.venue || "TBD"}</p>
        </div>
        
        {match.rescheduleAction && (
          <div 
            className="px-6 py-4 rounded-xl max-w-md w-full text-center border shadow-sm"
            style={{ backgroundColor: `${themeColor}10`, borderColor: `${themeColor}30`, color: themeColor }}
          >
            <h3 className="font-bold text-lg mb-1 flex items-center justify-center gap-2">
              <AlertTriangle className="w-5 h-5" /> 
              Match {match.rescheduleAction.charAt(0).toUpperCase() + match.rescheduleAction.slice(1)}d
            </h3>
            {match.rescheduleReason && <p className="text-sm opacity-90">Reason: {match.rescheduleReason}</p>}
          </div>
        )}

        {match.startTime && !isTimePassed && (
          <CountdownTimer 
            startTime={match.startTime} 
            onTimeUp={() => {
              setIsTimePassed(true);
              queryClient.invalidateQueries(["match", matchId]);
            }} 
          />
        )}

        {hasSummary ? (
          <Button 
            size="lg" 
            onClick={() => resumeMatchMut.mutate()} 
            disabled={(!isTimePassed && !isPaused) || resumeMatchMut.isPending} 
            className={`rounded-full px-8 py-6 text-lg shadow-lg ${!isTimePassed && !isPaused ? 'bg-secondary text-muted-foreground cursor-not-allowed' : ''}`}
            style={isTimePassed || isPaused ? { backgroundColor: themeColor, color: '#fff' } : {}}
          >
            {resumeMatchMut.isPending ? <Loader2 className="w-6 h-6 mr-2 animate-spin" /> : <RotateCcw className="w-6 h-6 mr-2" />} 
            Resume Match
          </Button>
        ) : (
          <Button 
            size="lg" 
            onClick={handleStartMatchClick} 
            disabled={!isTimePassed} 
            className={`rounded-full px-8 py-6 text-lg shadow-lg ${!isTimePassed ? 'bg-secondary text-muted-foreground cursor-not-allowed' : ''}`}
            style={isTimePassed ? { backgroundColor: themeColor, color: '#fff' } : {}}
          >
            <PlayCircle className="w-6 h-6 mr-2" /> Start Match Now
          </Button>
        )}

        <Dialog open={showStart} onOpenChange={setShowStart}>
          <DialogContent>
            <DialogHeader><DialogTitle>Match Toss</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Toss Won By</Label>
                <Select value={tossWinner} onValueChange={setTossWinner}>
                  <SelectTrigger><SelectValue placeholder="Select Team" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={match.teamA?._id || match.teamA?.id || "teamA"}>{match.teamA?.name || "Team A"}</SelectItem>
                    <SelectItem value={match.teamB?._id || match.teamB?.id || "teamB"}>{match.teamB?.name || "Team B"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Decision</Label>
                <Select value={tossDecision} onValueChange={setTossDecision}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bat">Bat First</SelectItem>
                    <SelectItem value="bowl">Bowl First</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowStart(false)}>Cancel</Button>
              <Button onClick={() => startMatchMut.mutate({ wonBy: tossWinner, decision: tossDecision })} disabled={startMatchMut.isPending || !tossWinner}>
                {startMatchMut.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Start Match
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (match.status === "completed" || match.status === "abandoned") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <Badge variant={match.status === 'completed' ? "default" : "destructive"} className="text-lg px-4 py-1">{match.status.toUpperCase()}</Badge>
        <h1 className="text-3xl font-bold">{match.teamA?.name} vs {match.teamB?.name}</h1>
        {match.result?.summary && <p className="text-xl font-medium text-emerald-500">{match.result.summary}</p>}
      </div>
    );
  }

  // Live Dashboard
  
  // Resolve teams from the summary (source of truth for innings)
  const batTeamId = currentInnings.battingTeamId?._id || currentInnings.battingTeamId;
  const bowlTeamId = currentInnings.bowlingTeamId?._id || currentInnings.bowlingTeamId;
  const isTeamABatting = String(batTeamId) === String(match.teamA?._id);
  const battingTeam = isTeamABatting ? match.teamA : match.teamB;
  const bowlingTeam = isTeamABatting ? match.teamB : match.teamA;

  const striker = scorecard?.currentBatsmen?.striker;
  const nonStriker = scorecard?.currentBatsmen?.nonStriker;
  const bowler = scorecard?.currentBowler;
  const battingOrder = currentInnings?.battingOrder || [];
  
  const strikerId = getPlayerId(striker?.playerId);
  const nonStrikerId = getPlayerId(nonStriker?.playerId);
  const bowlerId = getPlayerId(bowler?.playerId);
  const outBatsmanIds = new Set(
    battingOrder
      .filter((bat) => bat.isOut)
      .map((bat) => String(getPlayerId(bat.playerId)))
  );

  const squadBat = isTeamABatting ? match?.squadA : match?.squadB;
  const squadBowl = isTeamABatting ? match?.squadB : match?.squadA;

  const filterBySquad = (players, squad) => {
    if (!squad || !squad.playingXI || squad.playingXI.length === 0) return players;
    const squadIds = new Set([
      ...squad.playingXI.map(getPlayerId),
      ...(squad.substitutes || []).map(getPlayerId)
    ]);
    return players.filter(p => squadIds.has(String(getPlayerId(p))));
  };

  const filteredBattingPlayers = filterBySquad(battingTeamPlayers, squadBat);
  const filteredBowlingPlayers = filterBySquad(bowlingTeamPlayers, squadBowl);

  const availableBatsmen = filteredBattingPlayers.filter(
    (player) => !outBatsmanIds.has(String(getPlayerId(player)))
  );
  const strikerOptions = availableBatsmen.filter(
    (player) => String(getPlayerId(player)) !== String(activeNonStriker)
  );
  const nonStrikerOptions = availableBatsmen.filter(
    (player) => String(getPlayerId(player)) !== String(activeStriker)
  );

  const isSubstitute = (playerId, squadSide) => {
    const squad = squadSide === 'bat' ? squadBat : squadBowl;
    if (!squad || !squad.substitutes) return false;
    return squad.substitutes.map(getPlayerId).includes(String(playerId));
  };

  const handleScore = (runs) => {
    if (!strikerId || !bowlerId) return toast.error("Please set active players first");
    scoreMut.mutate({ runs, batsmanId: strikerId, bowlerId });
  };

  const handleExtra = (extraType, extraRuns = 1, additionalRuns = 0) => {
    if (!strikerId || !bowlerId) return toast.error("Please set active players first");
    extraMut.mutate({ extraType, extraRuns, runs: additionalRuns, batsmanId: strikerId, bowlerId });
    setShowExtrasMenu(null);
  };

  const handleBowlerChange = () => {
    if (!newBowler) return toast.error("Please select a bowler");
    
    if (isSubstitute(newBowler, 'bowl') && String(newBowler) !== String(bowlerId)) {
      setPendingSub({ role: 'bowler', playerId: newBowler, squadSide: 'bowl' });
      setShowSubPrompt(true);
      return;
    }

    setPlayersMut.mutate(
      { striker: strikerId, nonStriker: nonStriker?.playerId?._id || nonStriker?.playerId, bowler: newBowler },
      {
        onSuccess: () => {
          setShowBowlerChange(false);
          setNewBowler("");
        }
      }
    );
  };

  const handleUpdateActivePlayers = () => {
    if (activeStriker && activeStriker === activeNonStriker) {
      toast.error("Striker and non-striker must be different players");
      return;
    }
    
    // Check for substitutes
    if (activeStriker && isSubstitute(activeStriker, 'bat') && String(activeStriker) !== String(strikerId)) {
      setPendingSub({ role: 'striker', playerId: activeStriker, squadSide: 'bat' });
      setShowSubPrompt(true);
      return;
    }
    if (activeNonStriker && isSubstitute(activeNonStriker, 'bat') && String(activeNonStriker) !== String(nonStrikerId)) {
      setPendingSub({ role: 'nonStriker', playerId: activeNonStriker, squadSide: 'bat' });
      setShowSubPrompt(true);
      return;
    }
    if (activeBowler && isSubstitute(activeBowler, 'bowl') && String(activeBowler) !== String(bowlerId)) {
      setPendingSub({ role: 'bowler', playerId: activeBowler, squadSide: 'bowl' });
      setShowSubPrompt(true);
      return;
    }

    setPlayersMut.mutate({ striker: activeStriker, nonStriker: activeNonStriker, bowler: activeBowler });
  };

  const submitSubstitute = () => {
    if (!subForm.replacedPlayerId) return toast.error("Please select who is being replaced");
    addSubstituteMut.mutate({
      substitutedIn: pendingSub.playerId,
      substitutedOut: subForm.replacedPlayerId,
      reason: subForm.reason
    }, {
      onSuccess: () => {
        if (pendingSub.role === 'bowler' && newBowler === pendingSub.playerId) {
          setPlayersMut.mutate(
            { striker: strikerId, nonStriker: nonStriker?.playerId?._id || nonStriker?.playerId, bowler: newBowler },
            { onSuccess: () => { setShowBowlerChange(false); setNewBowler(""); } }
          );
        } else {
          const updateData = { striker: activeStriker, nonStriker: activeNonStriker, bowler: activeBowler };
          setPlayersMut.mutate(updateData);
        }
      }
    });
  };

  // Gather summary data for display
  const bowlingFigures = currentInnings?.bowlingFigures || [];
  const extras = currentInnings?.extras || {};
  const otherInningKey = currentInningKey === 'first' ? 'second' : 'first';
  const otherInnings = scorecard?.innings?.[otherInningKey];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <Card 
        className="shadow-lg bg-gradient-to-br from-card to-card/50"
        style={{ 
          borderColor: `${themeColor}60`,
          boxShadow: `0 10px 15px -3px ${themeColor}15, 0 4px 6px -4px ${themeColor}10` 
        }}
      >
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left flex-1">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                <Badge className="animate-pulse shadow-sm" style={{ backgroundColor: themeColor, color: '#fff' }}>LIVE</Badge>
                <Badge variant="outline" className="font-semibold" style={{ borderColor: `${themeColor}40`, color: themeColor }}>
                  {scorecard?.currentInning === 1 ? '1st' : scorecard?.currentInning === 2 ? '2nd' : scorecard?.currentInning === 3 ? '1st (SO)' : '2nd (SO)'} Innings
                </Badge>
                {match?.superOver && <Badge className="shadow-sm font-bold" style={{ backgroundColor: '#f59e0b', color: '#fff' }}>SUPER OVER</Badge>}
              </div>
              <h2 className="text-3xl font-bold tracking-tight">{battingTeam?.name || 'Batting Team'}</h2>
              <div className="text-6xl font-black tracking-tighter mt-2 text-foreground">
                {currentInnings.score || 0} <span className="text-3xl text-muted-foreground font-medium">/ {currentInnings.wickets || 0}</span>
              </div>
              <div className="flex items-center justify-center md:justify-start gap-4 mt-3">
                <p className="text-lg text-muted-foreground font-medium">
                  Overs: <span className="text-foreground">{currentInnings.overs?.toFixed(1) || "0.0"}</span> <span className="text-sm">/ {match.oversPerInning || 20}</span>
                </p>
                <div className="w-1.5 h-1.5 rounded-full bg-border" />
                <p className="text-lg font-medium" style={{ color: themeColor }}>
                  CRR: {currentInnings.runRate?.toFixed(2) || "0.00"}
                </p>
              </div>
              {(scorecard?.currentInning === 2 || scorecard?.currentInning === 4) && scorecard?.target && (
                <div className="mt-2 text-sm font-semibold text-emerald-500 bg-emerald-500/10 inline-block px-3 py-1 rounded-md">
                  Target: {scorecard.target} • Need {scorecard.target - (currentInnings.score || 0)} from {((match.oversPerInning || 20) * 6) - (currentInnings.balls || 0)} balls
                  {scorecard.requiredRunRate > 0 && ` • RRR: ${scorecard.requiredRunRate.toFixed(2)}`}
                </div>
              )}
            </div>
            
            <div className="flex flex-col items-center md:items-end gap-4 border-t md:border-t-0 md:border-l border-border/50 pt-4 md:pt-0 md:pl-6">
              <div className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Bowling</div>
              <div className="text-xl font-bold">{bowlingTeam?.name || 'Bowling Team'}</div>
              <div className="flex flex-wrap gap-2 justify-center md:justify-end mt-2">
                <Button variant="outline" size="sm" onClick={() => setShowPlayers(true)} className="bg-card">
                  <UserMinus className="w-4 h-4 mr-2" /> Players
                </Button>
                {(scorecard?.currentInning === 1 || scorecard?.currentInning === 3) && (
                  <Button variant="outline" size="sm" onClick={handleSwitchInnings} disabled={switchInningsMut.isPending} className="bg-card">
                    <SkipForward className="w-4 h-4 mr-2" /> Switch Innings
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowPause(true)} 
                  className="transition-all"
                  style={{ backgroundColor: `${themeColor}10`, color: themeColor, borderColor: `${themeColor}30` }}
                >
                  <PauseCircle className="w-4 h-4 mr-2" /> Pause
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  title="Open TV display in new tab"
                  onClick={() => window.open(`${import.meta.env.VITE_FRONTEND_URL || "http://localhost:5173"}/tv/${encodeId(matchId)}`, "_blank")}
                  style={{ borderColor: `${themeColor}40`, color: themeColor, backgroundColor: `${themeColor}08` }}
                >
                  <Monitor className="w-4 h-4 mr-2" /> TV Display
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setShowEnd(true)}>
                  <Ban className="w-4 h-4 mr-2" /> End Match
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Quick Actions */}
        <Card className="lg:col-span-2 border-border/50 shadow-sm">
          <CardHeader className="bg-secondary/20 border-b border-border/50 pb-4">
            <CardTitle className="text-lg">Scoring Controls</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {[0, 1, 2, 3, 4, 6].map(runs => {
                const isBoundary = runs === 4 || runs === 6;
                return (
                  <Button
                    key={runs}
                    variant="secondary"
                    className="h-20 text-2xl font-bold shadow-sm border transition-all duration-150 active:scale-95 hover:scale-[1.03] hover:shadow-md"
                    style={isBoundary
                      ? { backgroundColor: themeColor, color: '#fff', borderColor: themeColor, boxShadow: `0 4px 12px ${themeColor}40` }
                      : { borderColor: `${themeColor}20` }
                    }
                    onMouseEnter={e => {
                      if (isBoundary) {
                        e.currentTarget.style.filter = 'brightness(1.12)';
                        e.currentTarget.style.boxShadow = `0 6px 20px ${themeColor}55`;
                      } else {
                        e.currentTarget.style.backgroundColor = `${themeColor}12`;
                        e.currentTarget.style.borderColor = `${themeColor}50`;
                        e.currentTarget.style.color = themeColor;
                      }
                    }}
                    onMouseLeave={e => {
                      if (isBoundary) {
                        e.currentTarget.style.filter = '';
                        e.currentTarget.style.boxShadow = `0 4px 12px ${themeColor}40`;
                      } else {
                        e.currentTarget.style.backgroundColor = '';
                        e.currentTarget.style.borderColor = `${themeColor}20`;
                        e.currentTarget.style.color = '';
                      }
                    }}
                    onClick={() => handleScore(runs)}
                    disabled={scoreMut.isPending}
                  >
                    {runs}
                  </Button>
                );
              })}
              {/* Wide with extra runs sub-menu */}
              <div className="relative">
                <Button
                  variant="outline"
                  className="h-20 w-full text-lg font-bold shadow-sm transition-all duration-150 active:scale-95 hover:scale-[1.03] hover:shadow-md"
                  style={{ borderColor: `${themeColor}40`, color: themeColor, backgroundColor: `${themeColor}08` }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = `${themeColor}20`; e.currentTarget.style.borderColor = themeColor; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = `${themeColor}08`; e.currentTarget.style.borderColor = `${themeColor}40`; }}
                  onClick={() => setShowExtrasMenu(showExtrasMenu === "wide" ? null : "wide")}
                  disabled={extraMut.isPending}
                >
                  WD
                </Button>
                {showExtrasMenu === "wide" && (
                  <div className="absolute bottom-full mb-1 left-0 z-20 bg-popover border border-border rounded-lg shadow-lg p-2 flex gap-1 min-w-max">
                    {[1, 2, 3, 4].map((n) => (
                      <button
                        key={n}
                        className="px-3 py-1.5 rounded text-sm font-semibold hover:opacity-80 transition text-white"
                        style={{ backgroundColor: themeColor }}
                        onClick={() => handleExtra("wide", 1, n - 1)}
                      >
                        WD+{n > 1 ? `${n - 1}R` : ""}
                        {n === 1 ? "(1)" : `(${n})`}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* No Ball */}
              <Button
                variant="outline"
                className="h-20 text-lg font-bold shadow-sm transition-all duration-150 active:scale-95 hover:scale-[1.03] hover:shadow-md"
                style={{ borderColor: `${themeColor}40`, color: themeColor, backgroundColor: `${themeColor}08` }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = `${themeColor}20`; e.currentTarget.style.borderColor = themeColor; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = `${themeColor}08`; e.currentTarget.style.borderColor = `${themeColor}40`; }}
                onClick={() => handleExtra("noball")}
                disabled={extraMut.isPending}
              >
                NB
              </Button>

              {/* Byes with extra runs sub-menu */}
              <div className="relative">
                <Button
                  variant="outline"
                  className="h-20 w-full text-lg font-bold shadow-sm transition-all duration-150 active:scale-95 hover:scale-[1.03] hover:shadow-md"
                  style={{ borderColor: `${themeColor}40`, color: themeColor, backgroundColor: `${themeColor}08` }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = `${themeColor}20`; e.currentTarget.style.borderColor = themeColor; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = `${themeColor}08`; e.currentTarget.style.borderColor = `${themeColor}40`; }}
                  onClick={() => setShowExtrasMenu(showExtrasMenu === "bye" ? null : "bye")}
                  disabled={extraMut.isPending}
                >
                  B
                </Button>
                {showExtrasMenu === "bye" && (
                  <div className="absolute bottom-full mb-1 left-0 z-20 bg-popover border border-border rounded-lg shadow-lg p-2 flex gap-1 min-w-max">
                    {[1, 2, 3, 4].map((n) => (
                      <button
                        key={n}
                        className="px-3 py-1.5 rounded text-sm font-semibold hover:opacity-80 transition text-white"
                        style={{ backgroundColor: themeColor }}
                        onClick={() => handleExtra("bye", n, 0)}
                      >
                        B+{n}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Leg Byes with extra runs sub-menu */}
              <div className="relative">
                <Button
                  variant="outline"
                  className="h-20 w-full text-lg font-bold shadow-sm transition-all duration-150 active:scale-95 hover:scale-[1.03] hover:shadow-md"
                  style={{ borderColor: `${themeColor}40`, color: themeColor, backgroundColor: `${themeColor}08` }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = `${themeColor}20`; e.currentTarget.style.borderColor = themeColor; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = `${themeColor}08`; e.currentTarget.style.borderColor = `${themeColor}40`; }}
                  onClick={() => setShowExtrasMenu(showExtrasMenu === "legbye" ? null : "legbye")}
                  disabled={extraMut.isPending}
                >
                  LB
                </Button>
                {showExtrasMenu === "legbye" && (
                  <div className="absolute bottom-full mb-1 left-0 z-20 bg-popover border border-border rounded-lg shadow-lg p-2 flex gap-1 min-w-max">
                    {[1, 2, 3, 4].map((n) => (
                      <button
                        key={n}
                        className="px-3 py-1.5 rounded text-sm font-semibold hover:opacity-80 transition text-white"
                        style={{ backgroundColor: themeColor }}
                        onClick={() => handleExtra("legbye", n, 0)}
                      >
                        LB+{n}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <Button
                variant="destructive"
                className="h-20 text-xl font-bold sm:col-span-2 transition-all duration-150 active:scale-95 hover:scale-[1.02] hover:shadow-lg hover:shadow-red-500/30 hover:brightness-110"
                style={{ boxShadow: '0 4px 14px rgba(239,68,68,0.25)' }}
                onClick={() => {
                  if (!strikerId || !bowlerId) return toast.error("Please set active players first");
                  setShowExtrasMenu(null);
                  setShowWicket(true);
                }}
              >
                WICKET
              </Button>
            </div>

            <div className="mt-8 flex justify-end">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground" onClick={() => undoMut.mutate()} disabled={undoMut.isPending}>
                <RotateCcw className="w-4 h-4 mr-2" /> Undo Last Ball
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Right: Active Status */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="bg-secondary/20 border-b border-border/50 pb-4">
            <CardTitle className="text-lg flex items-center justify-between">
              At the Crease
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowPlayers(true)}><Pencil className="w-3.5 h-3.5" /></Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/50">
              <div className="p-4">
                <div className="flex justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3"><span>Batsmen</span><span>R (B)</span></div>
                <div className="space-y-2">
                  <div 
                    className="flex justify-between items-center p-3 rounded-lg shadow-sm border"
                    style={{ backgroundColor: `${themeColor}10`, borderColor: `${themeColor}30` }}
                  >
                    <span className="font-semibold flex items-center gap-2">
                      <span className="truncate max-w-[120px]">{striker?.playerId?.name || "Select Striker"}</span>
                      <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: themeColor }} />
                    </span>
                    <span className="font-mono font-bold text-lg">{striker?.runs || 0} <span className="text-sm font-normal text-muted-foreground">({striker?.balls || 0})</span></span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg hover:bg-secondary/30 transition-colors">
                    <span className="font-medium text-muted-foreground truncate max-w-[120px]">{nonStriker?.playerId?.name || "Select Non-Striker"}</span>
                    <span className="font-mono text-muted-foreground">{nonStriker?.runs || 0} <span className="text-xs">({nonStriker?.balls || 0})</span></span>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-secondary/10">
                <div className="flex justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3"><span>Bowler</span><span>O-M-R-W</span></div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-card border border-border shadow-sm">
                  <span className="font-semibold truncate max-w-[120px]">{bowler?.playerId?.name || "Select Bowler"}</span>
                  <span className="font-mono font-bold tracking-tight">
                    {bowler?.overs || 0}.{bowler?.balls || 0}-{bowler?.maidens || 0}-{bowler?.runs || 0}-<span className="text-red-500">{bowler?.wickets || 0}</span>
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ───── Match Summary Section ───── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Batting Scorecard */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="bg-secondary/20 border-b border-border/50 pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Batting — {battingTeam?.name || 'Batting'}</span>
              <Badge variant="outline" className="text-xs">{currentInnings.score || 0}/{currentInnings.wickets || 0} ({currentInnings.overs?.toFixed?.(1) || '0.0'} ov)</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {battingOrder.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No batsmen data yet</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-xs text-muted-foreground uppercase tracking-wider">
                    <th className="text-left px-4 py-2 font-medium">Batsman</th>
                    <th className="text-center px-2 py-2 font-medium">R</th>
                    <th className="text-center px-2 py-2 font-medium">B</th>
                    <th className="text-center px-2 py-2 font-medium">4s</th>
                    <th className="text-center px-2 py-2 font-medium">6s</th>
                    <th className="text-center px-2 py-2 font-medium">SR</th>
                  </tr>
                </thead>
                <tbody>
                  {battingOrder.map((bat, i) => {
                    const sr = bat.balls > 0 ? ((bat.runs / bat.balls) * 100).toFixed(1) : '0.0';
                    const isActive = String(bat.playerId?._id || bat.playerId) === String(strikerId) || String(bat.playerId?._id || bat.playerId) === String(nonStriker?.playerId?._id || nonStriker?.playerId);
                    return (
                      <tr key={i} className="border-b border-border/30 transition-colors" style={isActive ? { backgroundColor: `${themeColor}10` } : bat.isOut ? { opacity: 0.6 } : {}}>
                        <td className="px-4 py-2 font-medium">
                          {bat.playerId?.name || 'Unknown'}
                          {bat.isOut && <span className="text-xs text-red-500 ml-1">({bat.dismissalType})</span>}
                          {isActive && !bat.isOut && <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 ml-1.5" />}
                        </td>
                        <td className="text-center px-2 py-2 font-bold">{bat.runs}</td>
                        <td className="text-center px-2 py-2 text-muted-foreground">{bat.balls}</td>
                        <td className="text-center px-2 py-2">{bat.fours}</td>
                        <td className="text-center px-2 py-2">{bat.sixes}</td>
                        <td className="text-center px-2 py-2 text-muted-foreground">{sr}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            {/* Extras Row */}
            <div className="px-4 py-2 border-t border-border/50 text-xs text-muted-foreground flex gap-3 flex-wrap">
              <span className="font-semibold text-foreground">Extras: {extras.total || 0}</span>
              <span>(WD {extras.wides || 0}, NB {extras.noBalls || 0}, B {extras.byes || 0}, LB {extras.legByes || 0})</span>
            </div>
          </CardContent>
        </Card>

        {/* Bowling Figures */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="bg-secondary/20 border-b border-border/50 pb-3">
            <CardTitle className="text-base">Bowling — {bowlingTeam?.name || 'Bowling'}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {bowlingFigures.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No bowling data yet</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-xs text-muted-foreground uppercase tracking-wider">
                    <th className="text-left px-4 py-2 font-medium">Bowler</th>
                    <th className="text-center px-2 py-2 font-medium">O</th>
                    <th className="text-center px-2 py-2 font-medium">M</th>
                    <th className="text-center px-2 py-2 font-medium">R</th>
                    <th className="text-center px-2 py-2 font-medium">W</th>
                    <th className="text-center px-2 py-2 font-medium">Econ</th>
                  </tr>
                </thead>
                <tbody>
                  {bowlingFigures.map((bowl, i) => {
                    const totalOvers = bowl.overs + (bowl.balls / 6);
                    const econ = totalOvers > 0 ? (bowl.runs / totalOvers).toFixed(1) : '0.0';
                    const isActive = String(bowl.playerId?._id || bowl.playerId) === String(bowlerId);
                    return (
                      <tr key={i} className="border-b border-border/30 transition-colors" style={isActive ? { backgroundColor: `${themeColor}10` } : {}}>
                        <td className="px-4 py-2 font-medium">
                          {bowl.playerId?.name || 'Unknown'}
                          {isActive && <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 ml-1.5" />}
                        </td>
                        <td className="text-center px-2 py-2">{bowl.overs}.{bowl.balls}</td>
                        <td className="text-center px-2 py-2 text-muted-foreground">{bowl.maidens}</td>
                        <td className="text-center px-2 py-2">{bowl.runs}</td>
                        <td className="text-center px-2 py-2 font-bold text-red-500">{bowl.wickets}</td>
                        <td className="text-center px-2 py-2 text-muted-foreground">{econ}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Previous Innings Summary */}
      {(scorecard?.currentInning === 2 || scorecard?.currentInning === 4) && otherInnings && (
        <Card className="border-border/50 shadow-sm opacity-80">
          <CardHeader className="bg-secondary/10 border-b border-border/50 pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>{scorecard?.currentInning === 2 ? '1st' : 'Super Over 1st'} Innings — {otherInnings.battingTeamId?.name || 'Team'}</span>
              <Badge variant="secondary" className="text-xs">{otherInnings.score || 0}/{otherInnings.wickets || 0} ({otherInnings.overs?.toFixed?.(1) || '0.0'} ov)</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 text-xs text-muted-foreground uppercase tracking-wider">
                  <th className="text-left px-4 py-2 font-medium">Batsman</th>
                  <th className="text-center px-2 py-2 font-medium">R</th>
                  <th className="text-center px-2 py-2 font-medium">B</th>
                  <th className="text-center px-2 py-2 font-medium">4s</th>
                  <th className="text-center px-2 py-2 font-medium">6s</th>
                </tr>
              </thead>
              <tbody>
                {(otherInnings.battingOrder || []).map((bat, i) => (
                  <tr key={i} className={`border-b border-border/30 ${bat.isOut ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-2 font-medium">
                      {bat.playerId?.name || 'Unknown'}
                      {bat.isOut && <span className="text-xs text-red-500 ml-1">({bat.dismissalType})</span>}
                    </td>
                    <td className="text-center px-2 py-2 font-bold">{bat.runs}</td>
                    <td className="text-center px-2 py-2 text-muted-foreground">{bat.balls}</td>
                    <td className="text-center px-2 py-2">{bat.fours}</td>
                    <td className="text-center px-2 py-2">{bat.sixes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Wicket Modal */}
      <Dialog open={showWicket} onOpenChange={setShowWicket}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-destructive flex items-center gap-2 text-xl"><AlertTriangle className="w-6 h-6" /> Fall of Wicket</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Batsman Out</Label>
              <Select value={wicketForm.batsman} onValueChange={(v) => setWicketForm({ ...wicketForm, batsman: v })}>
                <SelectTrigger className="h-12 text-lg"><SelectValue placeholder="Select Batsman" /></SelectTrigger>
                <SelectContent>
                  {striker?.playerId && <SelectItem value={striker.playerId._id || striker.playerId.id}>{striker.playerId.name} (Striker)</SelectItem>}
                  {nonStriker?.playerId && <SelectItem value={nonStriker.playerId._id || nonStriker.playerId.id}>{nonStriker.playerId.name} (Non-Striker)</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Dismissal Type</Label>
              <Select value={wicketForm.type} onValueChange={(v) => setWicketForm({ ...wicketForm, type: v, fielder: "" })}>
                <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bowled">Bowled</SelectItem>
                  <SelectItem value="caught">Caught</SelectItem>
                  <SelectItem value="lbw">LBW</SelectItem>
                  <SelectItem value="runout">Run Out</SelectItem>
                  <SelectItem value="stumped">Stumped</SelectItem>
                  <SelectItem value="hitwicket">Hit Wicket</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Fielder / Keeper selection for caught, stumped, runout */}
            {(wicketForm.type === "caught" || wicketForm.type === "stumped" || wicketForm.type === "runout") && (
              <div className="space-y-2">
                <Label>
                  {wicketForm.type === "stumped" ? "Wicket Keeper" : wicketForm.type === "caught" ? "Caught By" : "Run Out By (Fielder)"}
                </Label>
                <Select value={wicketForm.fielder} onValueChange={(v) => setWicketForm({ ...wicketForm, fielder: v })}>
                  <SelectTrigger className="h-12"><SelectValue placeholder="Select fielder / keeper" /></SelectTrigger>
                  <SelectContent>
                    {filteredBowlingPlayers.map((p) => (
                      <SelectItem key={p._id || p.id} value={p._id || p.id}>
                        {p.name}
                        {p.role === "wicketkeeper" ? " (WK)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {wicketForm.type === "bowled" && (
              <p className="text-xs text-muted-foreground bg-secondary/30 rounded-lg px-3 py-2">
                Bowler: <span className="font-semibold">{bowler?.playerId?.name || "Current bowler"}</span> will be credited automatically.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWicket(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => wicketMut.mutate({
                batsmanId: strikerId,
                bowlerId,
                outPlayerId: wicketForm.batsman,
                wicketType: wicketForm.type,
                fielderId: wicketForm.fielder || undefined,
              })}
              disabled={wicketMut.isPending || !wicketForm.batsman}
            >
              {wicketMut.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Confirm Wicket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bowler Change Modal (auto after each over) */}
      <Dialog open={showBowlerChange} onOpenChange={setShowBowlerChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><SkipForward className="w-5 h-5" style={{ color: themeColor }} /> Over Complete — Change Bowler</DialogTitle>
            <DialogDescription>The over is complete. Please select the next bowler.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Bowler</Label>
              <Select value={newBowler} onValueChange={setNewBowler}>
                <SelectTrigger><SelectValue placeholder="Select Bowler" /></SelectTrigger>
                <SelectContent>
                  {filteredBowlingPlayers.map(p => <SelectItem key={p._id || p.id} value={p._id || p.id}>{p.name} {isSubstitute(p._id || p.id, 'bowl') ? '(Sub)' : ''}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBowlerChange(false)}>Skip</Button>
            <Button onClick={handleBowlerChange} disabled={setPlayersMut.isPending || !newBowler}>
              {setPlayersMut.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Confirm Bowler
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set Players Modal */}
      <Dialog open={showPlayers} onOpenChange={setShowPlayers}>
        <DialogContent>
          <DialogHeader><DialogTitle>Set Active Players</DialogTitle><DialogDescription>Select who is at the crease and bowling.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Striker</Label>
              <Select
                value={activeStriker}
                onValueChange={(value) => {
                  setActiveStriker(value);
                  if (value === activeNonStriker) setActiveNonStriker("");
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select Batsman" /></SelectTrigger>
                <SelectContent>
                  {strikerOptions.map(p => <SelectItem key={p._id || p.id} value={p._id || p.id}>{p.name} {isSubstitute(p._id || p.id, 'bat') ? '(Sub)' : ''}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Non-Striker</Label>
              <Select
                value={activeNonStriker}
                onValueChange={(value) => {
                  setActiveNonStriker(value);
                  if (value === activeStriker) setActiveStriker("");
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select Batsman" /></SelectTrigger>
                <SelectContent>
                  {nonStrikerOptions.map(p => <SelectItem key={p._id || p.id} value={p._id || p.id}>{p.name} {isSubstitute(p._id || p.id, 'bat') ? '(Sub)' : ''}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Bowler</Label>
              <Select value={activeBowler} onValueChange={setActiveBowler}>
                <SelectTrigger><SelectValue placeholder="Select Bowler" /></SelectTrigger>
                <SelectContent>
                  {filteredBowlingPlayers.map(p => <SelectItem key={p._id || p.id} value={p._id || p.id}>{p.name} {isSubstitute(p._id || p.id, 'bowl') ? '(Sub)' : ''}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleUpdateActivePlayers} disabled={setPlayersMut.isPending || addSubstituteMut.isPending}>
              {(setPlayersMut.isPending || addSubstituteMut.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Update Players
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Substitute Prompt Modal */}
      <Dialog open={showSubPrompt} onOpenChange={(open) => {
        if (!open && !addSubstituteMut.isPending) {
          setShowSubPrompt(false);
          setPendingSub(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-amber-500 flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> Substitute Player Selected</DialogTitle>
            <DialogDescription>You selected a substitute player. Please specify who they are replacing and the reason.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Who is being replaced?</Label>
              <Select value={subForm.replacedPlayerId} onValueChange={v => setSubForm({...subForm, replacedPlayerId: v})}>
                <SelectTrigger><SelectValue placeholder="Select Player" /></SelectTrigger>
                <SelectContent>
                  {pendingSub?.squadSide === 'bat' 
                    ? squadBat?.playingXI?.map(p => <SelectItem key={p._id || p.id} value={p._id || p.id}>{p.name}</SelectItem>)
                    : squadBowl?.playingXI?.map(p => <SelectItem key={p._id || p.id} value={p._id || p.id}>{p.name}</SelectItem>)
                  }
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reason (e.g. Injury, Concussion)</Label>
              <Input placeholder="Reason" value={subForm.reason} onChange={e => setSubForm({...subForm, reason: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubPrompt(false)}>Cancel</Button>
            <Button onClick={submitSubstitute} disabled={addSubstituteMut.isPending || !subForm.replacedPlayerId}>
              {addSubstituteMut.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Confirm Substitute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pause Modal */}
      <Dialog open={showPause} onOpenChange={setShowPause}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-amber-500 flex items-center gap-2"><PauseCircle className="w-5 h-5" /> Pause Match</DialogTitle>
          <DialogDescription>Pause the match due to rain or other interruptions. You can resume later from the Match Dashboard.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Reason (Optional)</Label>
              <Input placeholder="e.g., Rain delay, Bad light" value={pauseReason} onChange={e => setPauseReason(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Resume At (Optional)</Label>
              <Input type="datetime-local" value={pauseStartTime} onChange={e => setPauseStartTime(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPause(false)}>Cancel</Button>
            <Button 
              className="text-white shadow-md" 
              style={{ backgroundColor: themeColor }}
              onClick={() => pauseMatchMut.mutate({ reason: pauseReason, newStartTime: pauseStartTime })} 
              disabled={pauseMatchMut.isPending}
            >
              {pauseMatchMut.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Pause Match
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* End Match */}
      <Dialog open={showEnd} onOpenChange={setShowEnd}>
        <DialogContent>
          <DialogHeader><DialogTitle>End Match?</DialogTitle><DialogDescription>Are you sure you want to end this match? This cannot be undone.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEnd(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => endMatchMut.mutate()} disabled={endMatchMut.isPending}>
              {endMatchMut.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} End Match
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Switch Innings Confirmation */}
      <Dialog open={showSwitchConfirm} onOpenChange={setShowSwitchConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-500">
              <AlertTriangle className="w-5 h-5" /> Switch Innings Early?
            </DialogTitle>
            <DialogDescription>
              The first innings is not yet complete. Are you sure you want to switch?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <div className="flex justify-between items-center p-3 rounded-lg border bg-secondary/30">
              <span className="text-sm font-medium text-muted-foreground">Overs Remaining</span>
              <span className="font-bold text-lg">
                {(() => {
                  const inn = match?.superOver ? (scorecard?.innings?.superOverFirst || {}) : (scorecard?.innings?.first || {});
                  const total = (match?.oversPerInning || 20) * 6;
                  const remaining = total - (inn.balls || 0);
                  const oversLeft = Math.floor(remaining / 6);
                  const ballsLeft = remaining % 6;
                  return `${oversLeft}.${ballsLeft}`;
                })()}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg border bg-secondary/30">
              <span className="text-sm font-medium text-muted-foreground">Wickets Remaining</span>
              <span className="font-bold text-lg">
                {(match?.superOver ? 2 : 10) - ((match?.superOver ? scorecard?.innings?.superOverFirst?.wickets : scorecard?.innings?.first?.wickets) || 0)}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSwitchConfirm(false)}>Cancel</Button>
            <Button
              onClick={() => switchInningsMut.mutate()}
              disabled={switchInningsMut.isPending}
              className="text-white shadow-md"
              style={{ backgroundColor: themeColor }}
            >
              {switchInningsMut.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Force Switch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Winner Declaration Popup */}
      <Dialog open={showWinnerPopup} onOpenChange={(open) => { if (!open) { setShowWinnerPopup(false); setMatchResult(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Trophy className="w-7 h-7" style={{ color: matchResult?.isTie ? '#f59e0b' : '#10b981' }} />
              {matchResult?.isTie ? 'Match Tied!' : 'Match Result'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {matchResult?.isTie ? (
              <div className="space-y-4">
                <div className="text-center p-4 rounded-xl border-2 border-dashed border-amber-400/50 bg-amber-50/30 dark:bg-amber-950/20">
                  <p className="text-lg font-bold text-amber-600 dark:text-amber-400 mb-1">Scores are level!</p>
                  <p className="text-sm text-muted-foreground">{matchResult.summary}</p>
                </div>
                <p className="text-sm text-center text-muted-foreground">
                  A Super Over is needed to break the tie. Click below to configure.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div
                  className="text-center p-6 rounded-xl border shadow-sm"
                  style={{ backgroundColor: `${themeColor}10`, borderColor: `${themeColor}30` }}
                >
                  <p className="text-sm uppercase tracking-widest text-muted-foreground mb-2">Winner</p>
                  <p className="text-2xl font-black" style={{ color: themeColor }}>{matchResult?.winnerName}</p>
                  <p className="text-sm font-medium text-muted-foreground mt-1">defeated {matchResult?.loserName}</p>
                  <p className="text-base font-semibold mt-2">{matchResult?.margin}</p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => { setShowWinnerPopup(false); setMatchResult(null); }}>
              Dismiss
            </Button>
            {matchResult?.isTie ? (
              <Button
                onClick={() => setShowSuperOver(true)}
                className="text-white shadow-md"
                style={{ backgroundColor: '#f59e0b' }}
              >
                <SkipForward className="w-4 h-4 mr-2" /> Start Super Over
              </Button>
            ) : (
              <Button
                onClick={() => endMatchMut.mutate({
                  winner: matchResult?.winner,
                  margin: matchResult?.margin || '',
                  summary: matchResult?.summary || '',
                })}
                disabled={endMatchMut.isPending}
                className="text-white shadow-md"
                style={{ backgroundColor: '#10b981' }}
              >
                {endMatchMut.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Trophy className="w-4 h-4 mr-2" /> Confirm & End Match
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Super Over Configuration Dialog */}
      <Dialog open={showSuperOver} onOpenChange={setShowSuperOver}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-500">
              <SkipForward className="w-5 h-5" /> Super Over Configuration
            </DialogTitle>
            <DialogDescription>
              Set the number of overs per side for the Super Over tiebreaker.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Overs per side</Label>
              <Input
                type="number"
                min={1}
                max={5}
                value={superOverOvers}
                onChange={(e) => setSuperOverOvers(parseInt(e.target.value, 10) || 1)}
                className="text-center text-2xl font-bold h-14"
              />
              <p className="text-xs text-muted-foreground text-center">
                Each team will bat for {superOverOvers} over{superOverOvers !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSuperOver(false)}>Cancel</Button>
            <Button
              onClick={() => saveSuperOverMut.mutate({ overs: superOverOvers })}
              disabled={saveSuperOverMut.isPending}
              className="text-white shadow-md"
              style={{ backgroundColor: '#f59e0b' }}
            >
              {saveSuperOverMut.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Begin Super Over
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
