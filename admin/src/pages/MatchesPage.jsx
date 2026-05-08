import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useAppContext } from "@/hooks/useAppContext";
import matchService from "@/services/matchService";
import tournamentService from "@/services/tournamentService";
import teamService from "@/services/teamService";
import clubService from "@/services/clubService";
import authService from "@/services/authService";
import scoringService from "@/services/scoringService";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Plus, MoreHorizontal, Pencil, KeyRound, Loader2, Search, Link as LinkIcon, PlayCircle, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { encodeId } from "@/utils/crypto";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function MatchesPage() {
  const { user, clubId: contextClubId, themeColor } = useAppContext();
  const navigate = useNavigate();
  const [clubs, setClubs] = useState([]);
  const [selectedClub, setSelectedClub] = useState(null);
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState("all");
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [clubLoading, setClubLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [showStream, setShowStream] = useState(false);
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({ teamA: "", teamB: "", tournament: "", venue: "", startTime: "", overs: "20" });
  const [assignForm, setAssignForm] = useState({ email: "", password: "", name: "" });
  const [streamForm, setStreamForm] = useState({ streamUrl: "" });
  const [scorerLink, setScorerLink] = useState("");

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

  const fetchData = useCallback(async () => {
    if (!selectedClub) return;
    setLoading(true);
    try {
      const [tRes, tmRes, mRes] = await Promise.allSettled([
        tournamentService.getByClub(selectedClub),
        teamService.getByClub(selectedClub),
        selectedTournament === "all" 
          ? matchService.getAll({ club: selectedClub })
          : matchService.getByTournament(selectedTournament)
      ]);
      
      const tData = tRes.status === "fulfilled" ? (tRes.value.data?.data || tRes.value.data || []) : [];
      setTournaments(Array.isArray(tData) ? tData : []);
      
      const tmData = tmRes.status === "fulfilled" ? (tmRes.value.data?.data || tmRes.value.data || []) : [];
      setTeams(Array.isArray(tmData) ? tmData : []);

      const mData = mRes.status === "fulfilled" ? (mRes.value.data?.data || mRes.value.data?.matches || mRes.value.data || []) : [];
      setMatches(Array.isArray(mData) ? mData : []);
      
    } catch { /* interceptor */ }
    finally { setLoading(false); }
  }, [selectedClub, selectedTournament]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async () => {
    if (!form.teamA || !form.teamB) return toast.error("Both teams required");
    if (form.teamA === form.teamB) return toast.error("Teams must be different");
    setSubmitting(true);
    try {
      await matchService.create({ ...form, club: selectedClub });
      toast.success("Match created");
      setShowCreate(false);
      fetchData();
    } catch { /* interceptor */ } finally { setSubmitting(false); }
  };

  const handleAssignManager = async () => {
    if (!assignForm.email.trim()) return toast.error("Manager email required");
    setSubmitting(true);
    try {
      await authService.createMatchManager({
        matchId: selected._id || selected.id,
        clubId: selectedClub,
        name: assignForm.name,
        email: assignForm.email,
        password: assignForm.password,
      });
      toast.success("Match Manager assigned");
      setShowAssign(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to assign scorer");
    } finally { setSubmitting(false); }
  };

  const handleUpdateStream = async () => {
    setSubmitting(true);
    try {
      await matchService.updateStreamUrl(selected._id || selected.id, { streamUrl: streamForm.streamUrl });
      toast.success("Stream URL updated");
      setShowStream(false);
      fetchData();
    } catch { /* interceptor */ } finally { setSubmitting(false); }
  };

  const generateLink = async (match) => {
    try {
      const res = await matchService.generateToken(match._id || match.id);
      const token = res.data?.data?.token || res.data?.token;
      if (token) {
        const link = `${window.location.origin}/login?token=${token}`;
        navigator.clipboard.writeText(link);
        toast.success("Scorer link copied to clipboard!");
      }
    } catch { /* interceptor */ }
  };

  const openAssign = (m) => { setSelected(m); setAssignForm({ email: "", password: "", name: "" }); setShowAssign(true); };
  const openStream = (m) => { setSelected(m); setStreamForm({ streamUrl: m.streamUrl || "" }); setShowStream(true); };

  const filtered = matches.filter((m) => {
    const tA = m.teamA?.name || "";
    const tB = m.teamB?.name || "";
    const s = search.toLowerCase();
    return tA.toLowerCase().includes(s) || tB.toLowerCase().includes(s);
  });

  const getStatusBadge = (m) => {
    let status = m.status;

    if (status === "live") return <Badge variant="destructive" className="animate-pulse">LIVE</Badge>;
    if (status === "completed") return (
      <Badge 
        variant="outline"
        className="font-semibold"
        style={{ backgroundColor: `${themeColor}10`, color: themeColor, borderColor: `${themeColor}30` }}
      >
        Completed
      </Badge>
    );
    if (status === "upcoming") return (
      <Badge 
        variant="outline" 
        className="font-semibold" 
        style={{ borderColor: `${themeColor}40`, color: themeColor, backgroundColor: `${themeColor}15` }}
      >
        Upcoming
      </Badge>
    );
    if (status === "unscheduled") return <Badge variant="outline" className="text-muted-foreground">Unscheduled</Badge>;
    return (
      <Badge 
        variant="outline"
        className="font-semibold"
        style={{ backgroundColor: `${themeColor}05`, color: themeColor, borderColor: `${themeColor}20` }}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Calendar className="w-6 h-6" style={{ color: themeColor }} /> Matches</h1>
          <p className="text-sm text-muted-foreground mt-1">Schedule matches and assign scorers</p>
        </div>
        {/* <Button onClick={() => { setForm({ teamA: "", teamB: "", tournament: selectedTournament === "all" ? "" : selectedTournament, venue: "", startTime: "", overs: "20" }); setShowCreate(true); }} disabled={!selectedClub} className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:opacity-90">
          <Plus className="w-4 h-4 mr-2" /> Schedule Match
        </Button> */}
      </motion.div>

      <motion.div variants={item} className="flex flex-col sm:flex-row gap-3">
        {(user?.role === "superAdmin" || user?.role === "superadmin") && (
          <Select value={selectedClub || ""} onValueChange={setSelectedClub}>
            <SelectTrigger className="w-full sm:w-[220px]"><SelectValue placeholder="Club" /></SelectTrigger>
            <SelectContent>{clubs.map((l) => <SelectItem key={l._id || l.id} value={l._id || l.id}>{l.name}</SelectItem>)}</SelectContent>
          </Select>
        )}
        <Select value={selectedTournament} onValueChange={setSelectedTournament}>
          <SelectTrigger className="w-full sm:w-[220px]"><SelectValue placeholder="Tournament" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tournaments</SelectItem>
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

      <motion.div variants={item}>
        <Card>
          <CardContent className="p-0">
            {clubLoading || loading ? (
              <div className="p-6 space-y-3">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>
            ) : !selectedClub ? (
              <div className="text-center py-16 text-muted-foreground"><Shield className="w-12 h-12 mx-auto mb-3 opacity-20" /><p className="font-medium">Select a club</p></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground"><Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" /><p className="font-medium">No matches found</p></div>
            ) : (
              <Table>
                <TableHeader style={{ backgroundColor: `${themeColor}10` }}>
                  <TableRow className="hover:bg-transparent">
                    <TableHead style={{ color: themeColor }}>Match</TableHead>
                    <TableHead style={{ color: themeColor }}>Match Manager</TableHead>
                    <TableHead style={{ color: themeColor }}>Date / Venue</TableHead>
                    <TableHead style={{ color: themeColor }}>Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((m) => (
                    <TableRow 
                      key={m._id || m.id} 
                      className="cursor-pointer transition-colors"
                      style={{ '--hover-bg': `${themeColor}05` }}
                      onClick={() => navigate(`/match/${encodeId(m._id || m.id)}/match-summary`)}
                    >
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{m.teamA?.name || "TBD"} <span className="text-muted-foreground font-normal mx-1">vs</span> {m.teamB?.name || "TBD"}</span>
                            {m.matchLabel && (
                              <Badge 
                                variant="outline" 
                                className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0 h-4"
                                style={{ borderColor: `${themeColor}40`, color: themeColor, backgroundColor: `${themeColor}15` }}
                              >
                                {m.matchLabel}
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">{m.overs} Overs Match</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {m.assignedManager?.name ? (
                          <div className="flex flex-col">
                            <span className="font-medium">{m.assignedManager.name}</span>
                            <span className="text-xs text-muted-foreground">{m.assignedManager.email}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="text-sm">{m.startTime ? new Date(m.startTime).toLocaleDateString() : "TBD"}</span>
                          <span className="text-xs text-muted-foreground">{m.venue || "TBD"}</span>
                          {m.rescheduleAction && (
                             <span 
                               className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                               style={{ backgroundColor: `${themeColor}15`, color: themeColor }}
                             >
                               {m.rescheduleAction}
                             </span>
                           )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(m)}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/scoring/${encodeId(m._id || m.id)}`)}><PlayCircle className="w-4 h-4 mr-2" /> Open Scorecard</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openAssign(m)}><KeyRound className="w-4 h-4 mr-2" /> Assign Scorer</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => generateLink(m)}><LinkIcon className="w-4 h-4 mr-2" /> Copy Scorer Link</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openStream(m)}><PlayCircle className="w-4 h-4 mr-2" /> Update Stream URL</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Create */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle style={{ color: themeColor }}>Schedule Match</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Team A</Label>
                <Select value={form.teamA} onValueChange={(v) => setForm({ ...form, teamA: v })}>
                  <SelectTrigger><SelectValue placeholder="Select Team" /></SelectTrigger>
                  <SelectContent>{teams.map((t) => <SelectItem key={t._id || t.id} value={t._id || t.id}>{t.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Team B</Label>
                <Select value={form.teamB} onValueChange={(v) => setForm({ ...form, teamB: v })}>
                  <SelectTrigger><SelectValue placeholder="Select Team" /></SelectTrigger>
                  <SelectContent>{teams.map((t) => <SelectItem key={t._id || t.id} value={t._id || t.id}>{t.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tournament (Optional)</Label>
              <Select value={form.tournament} onValueChange={(v) => setForm({ ...form, tournament: v })}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {tournaments.map((t) => (
                    <SelectItem key={t._id || t.id} value={t._id || t.id}>
                      {t.name} <span className="text-muted-foreground ml-1">({t.type})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Date & Time</Label><Input type="datetime-local" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} /></div>
              <div className="space-y-2"><Label>Overs</Label><Input type="number" value={form.overs} onChange={(e) => setForm({ ...form, overs: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Venue</Label><Input placeholder="Stadium Name" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={submitting} style={{ backgroundColor: themeColor, color: '#fff' }}>{submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Scorer */}
      <Dialog open={showAssign} onOpenChange={setShowAssign}>
        <DialogContent>
          <DialogHeader><DialogTitle style={{ color: themeColor }}>Assign Match Manager</DialogTitle><DialogDescription>Create a dedicated scorer account for this match.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Name</Label><Input placeholder="Scorer Name" value={assignForm.name} onChange={(e) => setAssignForm({ ...assignForm, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" placeholder="scorer@example.com" value={assignForm.email} onChange={(e) => setAssignForm({ ...assignForm, email: e.target.value })} /></div>
            <div className="space-y-2"><Label>Password</Label><PasswordInput value={assignForm.password} onChange={(e) => setAssignForm({ ...assignForm, password: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssign(false)}>Cancel</Button>
             <Button onClick={handleAssignManager} disabled={submitting} style={{ backgroundColor: themeColor, color: '#fff' }}>{submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Assign Scorer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stream URL */}
      <Dialog open={showStream} onOpenChange={setShowStream}>
        <DialogContent>
          <DialogHeader><DialogTitle style={{ color: themeColor }}>Update Stream URL</DialogTitle><DialogDescription>Add a YouTube or Twitch embed URL.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Stream URL</Label><Input placeholder="https://youtube.com/..." value={streamForm.streamUrl} onChange={(e) => setStreamForm({ ...streamForm, streamUrl: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStream(false)}>Cancel</Button>
             <Button onClick={handleUpdateStream} disabled={submitting} style={{ backgroundColor: themeColor, color: '#fff' }}>{submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Update Stream</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </motion.div>
  );
}
