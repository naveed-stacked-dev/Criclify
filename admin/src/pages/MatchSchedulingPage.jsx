import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "@/hooks/useAppContext";
import matchService from "@/services/matchService";
import tournamentService from "@/services/tournamentService";
import teamService from "@/services/teamService";
import clubService from "@/services/clubService";
import { encodeId } from "@/utils/crypto";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar, Plus, MoreHorizontal, Pencil, Trash2, Loader2, Search, Shield,
  GitBranch, Activity, Trophy, Swords, Eye, Link2,
  TableProperties, Network, KanbanSquare, Clock, Users, Monitor
} from "lucide-react";
import { cn, toLocalISOString } from "@/lib/utils";
import BracketTree from "@/components/bracket/BracketTree";
import ProgressionView from "@/components/bracket/ProgressionView";
import BracketBuilder from "@/components/bracket/BracketBuilder";
import MatchDetailDialog from "@/components/bracket/MatchDetailDialog";
import LeagueDashboard from "@/components/league/LeagueDashboard";
import SquadSelectionDialog from "@/components/bracket/SquadSelectionDialog";
import LeagueTimeline from "@/components/league/LeagueTimeline";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function MatchSchedulingPage() {
  const { user, clubId: contextClubId, themeColor } = useAppContext();
  const navigate = useNavigate();
  const isSuperAdmin = user?.role === "superAdmin" || user?.role === "superadmin";

  // ─── State ───
  const [clubs, setClubs] = useState([]);
  const [selectedClub, setSelectedClub] = useState(null);
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState("");
  const [tournamentData, setTournamentData] = useState(null);
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [bracketData, setBracketData] = useState(null);

  const [loading, setLoading] = useState(false);
  const [clubLoading, setClubLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("table");

  // Dialogs
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showMatchDetail, setShowMatchDetail] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [showSquadSelection, setShowSquadSelection] = useState(false);
  const [matchForSquad, setMatchForSquad] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    teamA: "", teamB: "", venue: "", startTime: "", overs: "20", matchLabel: "",
  });
  const [editForm, setEditForm] = useState({
    venue: "", startTime: "", matchLabel: "",
  });

  // ─── Load clubs ───
  useEffect(() => {
    const load = async () => {
      try {
        if (isSuperAdmin) {
          const res = await clubService.adminGetAll();
          const data = res.data?.data || res.data?.clubs || res.data || [];
          setClubs(Array.isArray(data) ? data : []);
          if (data.length > 0) setSelectedClub(data[0]._id || data[0].id);
        } else if (contextClubId) {
          setSelectedClub(contextClubId);
        }
      } catch { /* interceptor */ }
      finally { setClubLoading(false); }
    };
    load();
  }, [user, contextClubId, isSuperAdmin]);

  // ─── Load tournaments + teams when club changes ───
  useEffect(() => {
    if (!selectedClub) return;
    const load = async () => {
      try {
        const [tRes, tmRes] = await Promise.allSettled([
          tournamentService.getByClub(selectedClub),
          teamService.getByClub(selectedClub, { approved: "true" }),
        ]);
        const tData = tRes.status === "fulfilled" ? (tRes.value.data?.data || tRes.value.data || []) : [];
        setTournaments(Array.isArray(tData) ? tData : []);
        const tmData = tmRes.status === "fulfilled" ? (tmRes.value.data?.data || tmRes.value.data || []) : [];
        setTeams(Array.isArray(tmData) ? tmData : []);
      } catch { /* interceptor */ }
    };
    load();
    setSelectedTournament("");
    setMatches([]);
    setBracketData(null);
  }, [selectedClub]);

  // ─── Load matches + bracket when tournament changes ───
  const fetchMatchData = useCallback(async () => {
    if (!selectedTournament) { setMatches([]); setBracketData(null); return; }
    setLoading(true);
    try {
      const [mRes, tRes] = await Promise.allSettled([
        matchService.getByTournament(selectedTournament),
        tournamentService.getById(selectedTournament),
      ]);
      let mData = mRes.status === "fulfilled"
        ? (mRes.value.data?.data || mRes.value.data?.matches || mRes.value.data || []) : [];

      setMatches(Array.isArray(mData) ? mData : []);

      const tData = tRes.status === "fulfilled" ? (tRes.value.data?.data || tRes.value.data) : null;
      setTournamentData(tData);

      // Load bracket for knockout
      if (tData?.type === "knockout") {
        try {
          const bRes = await tournamentService.getBracket(selectedTournament);
          const bd = bRes.data?.data || bRes.data;
          setBracketData(bd);
        } catch { setBracketData(null); }
      } else {
        setBracketData(null);
      }
    } catch { /* interceptor */ }
    finally { setLoading(false); }
  }, [selectedTournament]);

  useEffect(() => { fetchMatchData(); }, [fetchMatchData]);

  // ─── Handlers ───
  const handleCreate = async () => {
    if (form.teamA === form.teamB && form.teamA && form.teamA !== "TBD") return toast.error("Teams must be different");
    setSubmitting(true);
    try {
      const payload = {
        tournamentId: selectedTournament,
        clubId: selectedClub,
        venue: form.venue,
        startTime: form.startTime ? new Date(form.startTime).toISOString() : undefined,
        oversPerInning: parseInt(form.overs) || 20,
        status: form.startTime ? "upcoming" : "unscheduled",
      };
      if (form.teamA && form.teamA !== "TBD") payload.teamA = form.teamA;
      if (form.teamB && form.teamB !== "TBD") payload.teamB = form.teamB;
      if (form.matchLabel.trim()) payload.matchLabel = form.matchLabel.trim();
      await matchService.create(payload);
      toast.success("Match created");
      setShowCreate(false);
      fetchMatchData();
    } catch { /* interceptor */ } finally { setSubmitting(false); }
  };

  const handleEdit = async () => {
    if (!selectedMatch) return;
    setSubmitting(true);
    try {
      const payload = {};
      if (editForm.venue) payload.venue = editForm.venue;
      if (editForm.startTime) payload.startTime = new Date(editForm.startTime).toISOString();
      if (editForm.matchLabel !== undefined) payload.matchLabel = editForm.matchLabel.trim() || null;
      await matchService.update(selectedMatch._id || selectedMatch.id, payload);
      toast.success("Match updated");
      setShowEdit(false);
      fetchMatchData();
    } catch { /* interceptor */ } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!selectedMatch) return;
    setSubmitting(true);
    try {
      await matchService.remove(selectedMatch._id || selectedMatch.id);
      toast.success("Match deleted");
      setShowDelete(false);
      fetchMatchData();
    } catch { /* interceptor */ } finally { setSubmitting(false); }
  };

  const handleSubmitResult = async (matchId, winnerId) => {
    setSubmitting(true);
    try {
      await tournamentService.submitResult(selectedTournament, matchId, { winnerId });
      toast.success("Result submitted — bracket updated!");
      setShowMatchDetail(false);
      fetchMatchData();
    } catch { /* interceptor */ } finally { setSubmitting(false); }
  };

  const handleScheduleFromDialog = async (matchId, data) => {
    setSubmitting(true);
    try {
      await matchService.schedule(matchId, { startTime: data.startTime ? new Date(data.startTime).toISOString() : undefined, venue: data.venue, action: data.action, reason: data.reason });
      toast.success(data.action ? `Match ${data.action}d successfully` : "Match scheduled");
      setShowMatchDetail(false);
      fetchMatchData();
    } catch { /* interceptor */ } finally { setSubmitting(false); }
  };

  const copyTvLink = (m) => {
    const base = import.meta.env.VITE_FRONTEND_URL || "http://localhost:5173";
    const url = `${base}/tv/${encodeId(m._id || m.id)}`;
    navigator.clipboard.writeText(url).then(() => toast.success("TV display link copied!"));
  };

  const openEdit = (m) => {
    setSelectedMatch(m);
    setEditForm({ venue: m.venue || "", startTime: toLocalISOString(m.startTime), matchLabel: m.matchLabel || "" });
    setShowEdit(true);
  };

  const openDelete = (m) => { setSelectedMatch(m); setShowDelete(true); };

  const openMatchDetail = (m) => { setSelectedMatch(m); setShowMatchDetail(true); };

  // ─── Table filtering ───
  const filtered = matches.filter((m) => {
    const tA = m.teamA?.name || "";
    const tB = m.teamB?.name || "";
    const s = search.toLowerCase();
    return tA.toLowerCase().includes(s) || tB.toLowerCase().includes(s);
  });

  const getStatusBadge = (m) => {
    let status = m.status;

    const map = {
      live: <Badge className="bg-red-500/20 text-red-400 border-red-500/30 animate-pulse">LIVE</Badge>,
      completed: <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Completed</Badge>,
      upcoming: <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30">Upcoming</Badge>,
      unscheduled: <Badge variant="outline" className="text-muted-foreground">Unscheduled</Badge>,
      abandoned: <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">Abandoned</Badge>,
    };
    return map[status] || <Badge variant="outline">{status}</Badge>;
  };

  const isKnockout = tournamentData?.type === "knockout";
  const isLeague = tournamentData?.type === "league" || tournamentData?.type === "round-robin";

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Swords className="w-6 h-6" style={{ color: themeColor }} /> Match Scheduling
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Schedule, visualize, and manage tournament matches</p>
        </div>
        <Button
          onClick={() => { setForm({ teamA: "", teamB: "", venue: "", startTime: "", overs: "20" }); setShowCreate(true); }}
          disabled={!selectedClub || !selectedTournament}
          style={{ backgroundColor: themeColor, color: '#fff' }}
        >
          <Plus className="w-4 h-4 mr-2" /> Add Match
        </Button>
      </motion.div>

      {/* Filters */}
      <motion.div variants={item} className="flex flex-col sm:flex-row gap-3">
        {isSuperAdmin && (
          <Select value={selectedClub || ""} onValueChange={setSelectedClub}>
            <SelectTrigger className="w-full sm:w-[220px]"><SelectValue placeholder="Select Club" /></SelectTrigger>
            <SelectContent>{clubs.map((c) => <SelectItem key={c._id || c.id} value={c._id || c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        )}
        <Select value={selectedTournament} onValueChange={setSelectedTournament}>
          <SelectTrigger className="w-full sm:w-[250px]"><SelectValue placeholder="Select Tournament" /></SelectTrigger>
          <SelectContent>
            {tournaments.map((t) => (
              <SelectItem key={t._id || t.id} value={t._id || t.id}>
                {t.name} <span className="text-muted-foreground ml-1">({t.type})</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search teams..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </motion.div>

      {/* No tournament selected */}
      {!selectedTournament && (
        <motion.div variants={item}>
          <Card><CardContent className="text-center py-16 text-muted-foreground">
            <Trophy className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium">Select a tournament to view matches</p>
          </CardContent></Card>
        </motion.div>
      )}

      {/* Tabs */}
      {selectedTournament && (
        <motion.div variants={item}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-card/60 backdrop-blur-sm border border-border mb-4">
              <TabsTrigger 
                value="table" 
                className="flex items-center gap-1.5"
                style={activeTab === 'table' ? { backgroundColor: `${themeColor}20`, color: themeColor } : {}}
              >
                <Calendar className="w-3.5 h-3.5" /> Schedule Table
              </TabsTrigger>
              {isKnockout && (
                <>
                  <TabsTrigger 
                    value="builder" 
                    className="flex items-center gap-1.5"
                    style={activeTab === 'builder' ? { backgroundColor: `${themeColor}20`, color: themeColor } : {}}
                  >
                    <Link2 className="w-3.5 h-3.5" /> Build Bracket
                  </TabsTrigger>
                  <TabsTrigger 
                    value="bracket" 
                    className="flex items-center gap-1.5"
                    style={activeTab === 'bracket' ? { backgroundColor: `${themeColor}20`, color: themeColor } : {}}
                  >
                    <GitBranch className="w-3.5 h-3.5" /> Bracket
                  </TabsTrigger>
                  <TabsTrigger 
                    value="progression" 
                    className="flex items-center gap-1.5"
                    style={activeTab === 'progression' ? { backgroundColor: `${themeColor}20`, color: themeColor } : {}}
                  >
                    <Activity className="w-3.5 h-3.5" /> Progression
                  </TabsTrigger>
                  <TabsTrigger 
                    value="knockout-timeline" 
                    className="flex items-center gap-1.5"
                    style={activeTab === 'knockout-timeline' ? { backgroundColor: `${themeColor}20`, color: themeColor } : {}}
                  >
                    <Clock className="w-3.5 h-3.5" /> Timeline
                  </TabsTrigger>
                </>
              )}
              {isLeague && (
                <>
                  <TabsTrigger 
                    value="league-points" 
                    className="flex items-center gap-1.5"
                    style={activeTab === 'league-points' ? { backgroundColor: `${themeColor}20`, color: themeColor } : {}}
                  >
                    <TableProperties className="w-3.5 h-3.5" /> Points Table
                  </TabsTrigger>
                  <TabsTrigger 
                    value="league-network" 
                    className="flex items-center gap-1.5"
                    style={activeTab === 'league-network' ? { backgroundColor: `${themeColor}20`, color: themeColor } : {}}
                  >
                    <Network className="w-3.5 h-3.5" /> Network Graph
                  </TabsTrigger>
                  <TabsTrigger 
                    value="league-fixtures" 
                    className="flex items-center gap-1.5"
                    style={activeTab === 'league-fixtures' ? { backgroundColor: `${themeColor}20`, color: themeColor } : {}}
                  >
                    <KanbanSquare className="w-3.5 h-3.5" /> Fixtures
                  </TabsTrigger>
                  <TabsTrigger 
                    value="league-timeline" 
                    className="flex items-center gap-1.5"
                    style={activeTab === 'league-timeline' ? { backgroundColor: `${themeColor}20`, color: themeColor } : {}}
                  >
                    <Clock className="w-3.5 h-3.5" /> Timeline
                  </TabsTrigger>
                </>
              )}
            </TabsList>

            {/* Tab 1: Table */}
            <TabsContent value="table">
              <Card>
                <CardContent className="p-0">
                  {loading ? (
                    <div className="p-6 space-y-3">{[1,2,3,4].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>
                  ) : filtered.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground">
                      <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p className="font-medium">No matches found</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader style={{ backgroundColor: `${themeColor}10` }}>
                        <TableRow className="hover:bg-transparent">
                          <TableHead style={{ color: themeColor }}>#</TableHead>
                          <TableHead style={{ color: themeColor }}>Label</TableHead>
                          <TableHead style={{ color: themeColor }}>Team 1</TableHead>
                          <TableHead style={{ color: themeColor }}>Team 2</TableHead>
                          <TableHead style={{ color: themeColor }}>Date</TableHead>
                          <TableHead style={{ color: themeColor }}>Day</TableHead>
                          <TableHead style={{ color: themeColor }}>Time</TableHead>
                          <TableHead style={{ color: themeColor }}>Venue</TableHead>
                          <TableHead style={{ color: themeColor }}>Winner</TableHead>
                          <TableHead style={{ color: themeColor }}>Status</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map((m, idx) => {
                          const dt = m.startTime ? new Date(m.startTime) : null;
                          const winnerId = m.result?.winner?._id || m.result?.winner;
                          const winnerName = (m.result?.winner && typeof m.result.winner === "object") ? m.result.winner.name : (winnerId ? (String(winnerId) === String(m.teamA?._id) ? m.teamA?.name : m.teamB?.name) : "—");
                          return (
                            <TableRow
                              key={m._id || m.id}
                              className="group hover:bg-card/80 transition-colors cursor-pointer"
                              onClick={() => navigate(`/match/${encodeId(m._id || m.id)}/match-summary`)}
                            >
                              <TableCell className="font-mono text-xs text-muted-foreground">{m.matchNumber || idx + 1}</TableCell>
                              <TableCell>
                                <Badge 
                                  variant="outline" 
                                  className="text-[10px] uppercase tracking-wider font-bold"
                                  style={{ borderColor: `${themeColor}40`, color: themeColor, backgroundColor: `${themeColor}15` }}
                                >
                                  {m.matchLabel || "—"}
                                </Badge>
                              </TableCell>
                              <TableCell><span className="font-semibold text-sm">{m.teamA?.name || "TBD"}</span></TableCell>
                              <TableCell><span className="font-semibold text-sm">{m.teamB?.name || "TBD"}</span></TableCell>
                              <TableCell className="text-sm">{dt ? dt.toLocaleDateString() : "TBD"}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">{dt ? dt.toLocaleDateString("en", { weekday: "short" }) : "—"}</TableCell>
                              <TableCell className="text-sm">{dt ? dt.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" }) : "TBD"}</TableCell>
                              <TableCell className="text-sm">{m.venue || "TBD"}</TableCell>
                              <TableCell className="text-sm font-medium text-emerald-400">{winnerName}</TableCell>
                              <TableCell>{getStatusBadge(m)}</TableCell>
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => openMatchDetail(m)}><Eye className="w-4 h-4 mr-2" /> View Details</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => { setMatchForSquad(m); setShowSquadSelection(true); }}><Users className="w-4 h-4 mr-2" /> Manage Squad</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => openEdit(m)}><Pencil className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => openDelete(m)} className="text-red-400"><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => copyTvLink(m)}><Monitor className="w-4 h-4 mr-2" /> Display Link</DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 2: Build Bracket (Visual Builder) */}
            {isKnockout && (
              <TabsContent value="builder">
                <Card className="overflow-hidden">
                  <CardContent className="p-3">
                    <BracketBuilder
                      tournamentId={selectedTournament}
                      matches={matches}
                      onRefresh={fetchMatchData}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Tab 3: Bracket */}
            {isKnockout && (
              <TabsContent value="bracket">
                <Card className="overflow-hidden">
                  <CardContent className="p-2">
                    {loading ? (
                      <div className="p-10 text-center"><Loader2 className="w-8 h-8 mx-auto animate-spin" style={{ color: themeColor }} /></div>
                    ) : bracketData?.matches?.length > 0 ? (
                      <BracketTree
                        matches={bracketData.matches}
                        totalRounds={bracketData.totalRounds || 0}
                        onClickMatch={openMatchDetail}
                      />
                    ) : (
                      <div className="text-center py-16 text-muted-foreground">
                        <GitBranch className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No bracket data. Build your bracket using the <strong>Build Bracket</strong> tab, or generate fixtures.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Tab 4: Progression */}
            {isKnockout && (
              <TabsContent value="progression">
                <Card className="overflow-hidden">
                  <CardContent className="p-2">
                    {loading ? (
                      <div className="p-10 text-center"><Loader2 className="w-8 h-8 mx-auto animate-spin text-pink-400" /></div>
                    ) : bracketData?.matches?.length > 0 ? (
                      <ProgressionView
                        matches={bracketData.matches}
                        totalRounds={bracketData.totalRounds || 0}
                      />
                    ) : (
                      <div className="text-center py-16 text-muted-foreground">
                        <Activity className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No progression data. Build your bracket using the <strong>Build Bracket</strong> tab, or generate fixtures.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Tab 5: Knockout Timeline */}
            {isKnockout && (
              <TabsContent value="knockout-timeline">
                <LeagueTimeline matches={matches} />
              </TabsContent>
            )}

            {/* League Tabs */}
            {isLeague && (
              <LeagueDashboard
                activeTab={activeTab}
                tournamentId={selectedTournament}
                matches={matches}
                teams={tournamentData?.teams || []}
                onRefresh={fetchMatchData}
              />
            )}
          </Tabs>
        </motion.div>
      )}

      {/* Create Match Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Match</DialogTitle><DialogDescription>Schedule a new match in this tournament.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Team 1</Label>
                <Select value={form.teamA} onValueChange={(v) => setForm({ ...form, teamA: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TBD">TBD (To Be Decided)</SelectItem>
                    {teams.filter(t => t._id !== form.teamB || form.teamB === "TBD").map((t) => <SelectItem key={t._id || t.id} value={t._id || t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Team 2</Label>
                <Select value={form.teamB} onValueChange={(v) => setForm({ ...form, teamB: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TBD">TBD (To Be Decided)</SelectItem>
                    {teams.filter(t => t._id !== form.teamA || form.teamA === "TBD").map((t) => <SelectItem key={t._id || t.id} value={t._id || t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Date & Time</Label><Input type="datetime-local" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} /></div>
              <div className="space-y-2"><Label>Overs</Label><Input type="number" value={form.overs} onChange={(e) => setForm({ ...form, overs: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Venue</Label><Input placeholder="Stadium Name" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} /></div>
            <div className="space-y-2"><Label>Match Label</Label><Input placeholder="e.g. SF1, QF2, Final" value={form.matchLabel} onChange={(e) => setForm({ ...form, matchLabel: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={submitting} style={{ backgroundColor: themeColor, color: '#fff' }}>{submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Match Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Match</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Match Label</Label><Input placeholder="e.g. SF1, QF2, Final" value={editForm.matchLabel} onChange={(e) => setEditForm({ ...editForm, matchLabel: e.target.value })} /></div>
            <div className="space-y-2"><Label>Date & Time</Label><Input type="datetime-local" value={editForm.startTime} onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })} /></div>
            <div className="space-y-2"><Label>Venue</Label><Input value={editForm.venue} onChange={(e) => setEditForm({ ...editForm, venue: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={submitting}>{submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Match?</DialogTitle><DialogDescription>This action cannot be undone.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>{submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Match Detail / Result Dialog */}
      <MatchDetailDialog
        match={selectedMatch}
        open={showMatchDetail}
        onClose={setShowMatchDetail}
        onSubmitResult={handleSubmitResult}
        onSchedule={handleScheduleFromDialog}
        submitting={submitting}
      />

      <SquadSelectionDialog 
        match={matchForSquad} 
        open={showSquadSelection} 
        onClose={() => setShowSquadSelection(false)} 
        onUpdated={() => fetchMatchData()}
      />
    </motion.div>
  );
}
