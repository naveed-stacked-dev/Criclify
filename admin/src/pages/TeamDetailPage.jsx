import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAppContext } from "@/hooks/useAppContext";
import teamService from "@/services/teamService";
import matchService from "@/services/matchService";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ArrowLeft, Users, Trophy, Calendar, TrendingUp,
  CheckCircle2, XCircle, Minus, Shield, Filter
} from "lucide-react";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

export default function TeamDetailPage() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const { themeColor } = useAppContext();

  const [team, setTeam] = useState(null);
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTournament, setSelectedTournament] = useState("all");

  useEffect(() => {
    if (!teamId) return;

    const load = async () => {
      setLoading(true);

      // Load team + players first — these routes have no auth requirement
      const [teamRes, playersRes] = await Promise.allSettled([
        teamService.getById(teamId),
        teamService.getPlayers(teamId),
      ]);

      const teamData =
        teamRes.status === "fulfilled"
          ? teamRes.value.data?.data || teamRes.value.data || null
          : null;
      setTeam(teamData);
      setPlayers(
        playersRes.status === "fulfilled"
          ? playersRes.value.data?.data || playersRes.value.data?.players || playersRes.value.data || []
          : []
      );

      // Fetch matches using the team's clubId so it works for SuperAdmin too
      if (teamData) {
        const clubId =
          typeof teamData.clubId === "object"
            ? teamData.clubId._id?.toString()
            : teamData.clubId?.toString();
        try {
          const mRes = await matchService.getAll({ clubId, limit: 200 });
          const raw = mRes.data?.data || mRes.data?.matches || mRes.data || [];
          const list = Array.isArray(raw) ? raw : [];
          setMatches(
            list.filter(m => {
              const aId = m.teamA?._id?.toString() || m.teamA?.toString();
              const bId = m.teamB?._id?.toString() || m.teamB?.toString();
              return aId === teamId || bId === teamId;
            })
          );
        } catch { /* matches are non-critical */ }
      }

      setLoading(false);
    };

    load();
  }, [teamId]);

  // Unique tournaments from loaded matches
  const tournaments = useMemo(() => {
    const seen = new Map();
    matches.forEach(m => {
      const t = m.tournamentId;
      if (t?._id && !seen.has(t._id.toString())) seen.set(t._id.toString(), t);
    });
    return Array.from(seen.values());
  }, [matches]);

  // Filtered matches by tournament selection
  const filteredMatches = useMemo(() => {
    if (selectedTournament === "all") return matches;
    return matches.filter(m => {
      const tId = m.tournamentId?._id?.toString() || m.tournamentId?.toString();
      return tId === selectedTournament;
    });
  }, [matches, selectedTournament]);

  const completed = filteredMatches.filter(m => m.status === "completed");
  const won = completed.filter(m => {
    const w = m.result?.winner;
    if (!w) return false;
    const wId = typeof w === "object" ? w._id?.toString() : w?.toString();
    return wId === teamId;
  }).length;
  const tied = completed.filter(m => !m.result?.winner).length;
  const lost = completed.length - won - tied;
  const winPct = completed.length > 0 ? Math.round((won / completed.length) * 100) : 0;

  if (loading) return <PageSkeleton />;
  if (!team) return (
    <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
      <Shield className="w-12 h-12 mb-3 opacity-30" />
      <p>Team not found.</p>
      <Button variant="ghost" size="sm" className="mt-4" onClick={() => navigate(-1)}>← Go back</Button>
    </div>
  );

  const createdDate = team.createdAt
    ? new Date(team.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : null;

  const ROLE_COLOR = {
    batsman: "bg-blue-500/10 text-blue-500",
    bowler: "bg-green-500/10 text-green-500",
    allrounder: "bg-purple-500/10 text-purple-500",
    wicketkeeper: "bg-orange-500/10 text-orange-500",
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 p-6">
      {/* Header */}
      <motion.div variants={item} className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <p className="text-xs text-muted-foreground">
            <Link to="/teams" className="hover:underline">Teams</Link> / {team.name}
          </p>
          <h1 className="text-xl font-bold">{team.name}</h1>
        </div>
      </motion.div>

      {/* Team card */}
      <motion.div variants={item}>
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              {team.logo ? (
                <img src={team.logo} alt={team.name} className="w-20 h-20 rounded-2xl object-cover border shrink-0" />
              ) : (
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black text-white shrink-0"
                  style={{ backgroundColor: team.color || themeColor || "#6366f1" }}
                >
                  {(team.name || "T")[0]}
                </div>
              )}
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold">{team.name}</h2>
                  {team.shortName && <Badge variant="secondary">{team.shortName}</Badge>}
                  {team.color && (
                    <span className="w-5 h-5 rounded-full border border-border" style={{ backgroundColor: team.color }} title="Team color" />
                  )}
                </div>
                <div className="flex items-center flex-wrap gap-4 text-sm text-muted-foreground">
                  {createdDate && (
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      Founded {createdDate}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    {players.length} player{players.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tournament filter */}
      {tournaments.length > 1 && (
        <motion.div variants={item} className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
          <Select value={selectedTournament} onValueChange={setSelectedTournament}>
            <SelectTrigger className="w-full sm:w-65">
              <SelectValue placeholder="Filter by tournament" />
            </SelectTrigger>
            <SelectContent position="popper" side="bottom" sideOffset={4} avoidCollisions={false} className="max-h-72 overflow-y-auto">
              <SelectItem value="all">All Tournaments</SelectItem>
              {tournaments.map(t => (
                <SelectItem key={t._id?.toString()} value={t._id?.toString()}>
                  {t.name}{t.type ? ` (${t.type.charAt(0).toUpperCase() + t.type.slice(1)})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedTournament !== "all" && (
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setSelectedTournament("all")}>
              Clear
            </Button>
          )}
        </motion.div>
      )}

      {/* Stats */}
      <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Matches", value: completed.length, icon: Trophy, color: "text-primary" },
          { label: "Won", value: won, icon: CheckCircle2, color: "text-green-500" },
          { label: "Lost", value: lost, icon: XCircle, color: "text-red-500" },
          { label: "Tied", value: tied, icon: Minus, color: "text-yellow-500" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-4 text-center">
              <Icon className={`w-5 h-5 mx-auto mb-1.5 ${color}`} />
              <p className={`text-2xl font-black ${color}`}>{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Win rate */}
      {completed.length > 0 && (
        <motion.div variants={item}>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">Win Rate</span>
                <span className="ml-auto text-sm font-black text-primary">{winPct}%</span>
              </div>
              <div className="h-2.5 rounded-full overflow-hidden bg-muted">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${winPct}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full rounded-full bg-primary"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">{won}W &nbsp; {lost}L &nbsp; {tied}T &nbsp;—&nbsp; {completed.length} matches completed</p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Recent matches */}
      {matches.length > 0 && (
        <motion.div variants={item}>
          <Card>
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-primary" />
                Recent Matches
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Result</TableHead>
                    <TableHead>Opponent</TableHead>
                    <TableHead>Tournament</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matches.slice(0, 10).map((match, i) => {
                    const isA = match.teamA?._id === teamId || match.teamA === teamId;
                    const opponent = isA ? match.teamB : match.teamA;
                    const winnerId = match.result?.winner?._id?.toString() || match.result?.winner?.toString();
                    const isWin = winnerId === teamId;
                    const isTied = match.status === "completed" && !winnerId;
                    const isLoss = match.status === "completed" && !!winnerId && !isWin;

                    const resultLabel = isWin ? "W" : isLoss ? "L" : isTied ? "T" : "—";
                    const resultClass = isWin ? "bg-green-500/10 text-green-600" : isLoss ? "bg-red-500/10 text-red-500" : isTied ? "bg-yellow-500/10 text-yellow-600" : "bg-muted text-muted-foreground";

                    return (
                      <TableRow key={match._id || i}>
                        <TableCell>
                          <span className={`inline-flex w-7 h-7 rounded-full items-center justify-center text-xs font-black ${resultClass}`}>
                            {resultLabel}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium">{opponent?.name || "Unknown"}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{match.tournamentId?.name || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={match.status === "live" ? "destructive" : match.status === "completed" ? "secondary" : "outline"} className="capitalize text-[10px]">
                            {match.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {match.startTime ? new Date(match.startTime).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "TBD"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Players */}
      {players.length > 0 && (
        <motion.div variants={item}>
          <Card>
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Squad ({players.length})
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead>Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {players.map((player, i) => (
                    <TableRow key={player._id || i}>
                      <TableCell className="text-muted-foreground text-xs w-10">
                        {player.jerseyNumber != null ? `#${player.jerseyNumber}` : i + 1}
                      </TableCell>
                      <TableCell>
                        <Link to={`/players/${player._id}`} className="flex items-center gap-2.5 group">
                          {player.avatar ? (
                            <img src={player.avatar} alt="" className="w-7 h-7 rounded-lg object-cover shrink-0" />
                          ) : (
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 bg-primary">
                              {(player.name || "P")[0]}
                            </div>
                          )}
                          <span className="font-medium text-sm group-hover:underline">{player.name}</span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        {player.role && (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${ROLE_COLOR[player.role] || "bg-muted text-muted-foreground"}`}>
                            {player.role}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-36 rounded-xl" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <Skeleton className="h-16 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );
}
