import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAppContext } from "@/hooks/useAppContext";
import clubService from "@/services/clubService";
import teamService from "@/services/teamService";
import { appendImageField } from "@/utils/imageUtils";
import { toast } from "sonner";
import ImageUpload from "@/components/ImageUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Plus, MoreHorizontal, Pencil, Trash2, Loader2, Search, Shield, ChevronRight, CheckCircle, Clock, Eye, X, Phone, Hash } from "lucide-react";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

const ROLE_LABELS = {
  batsman: "Batsman",
  bowler: "Bowler",
  allrounder: "All-rounder",
  wicketkeeper: "Wicketkeeper",
};

export default function TeamsPage() {
  const { user, clubId: contextClubId, themeColor } = useAppContext();
  const [clubs, setClubs] = useState([]);
  const [selectedClub, setSelectedClub] = useState(null);
  const [teams, setTeams] = useState([]);
  const [pendingTeams, setPendingTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [clubLoading, setClubLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("approved");

  // Approved tab modals
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showRoster, setShowRoster] = useState(false);
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", logoUrl: "" });
  const [roster, setRoster] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [addPlayerForm, setAddPlayerForm] = useState({ playerId: "" });

  // Pending tab modal
  const [showPendingDetail, setShowPendingDetail] = useState(false);
  const [pendingDetail, setPendingDetail] = useState(null);
  const [pendingRoster, setPendingRoster] = useState([]);
  const [pendingRosterLoading, setPendingRosterLoading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [enlargedPlayer, setEnlargedPlayer] = useState(null);

  // ── Fetch clubs ──
  useEffect(() => {
    const load = async () => {
      try {
        if (user?.role === "superAdmin" || user?.role === "superadmin") {
          const res = await clubService.adminGetAll();
          const data = res.data?.data || res.data?.clubs || res.data || [];
          setClubs(Array.isArray(data) ? data : []);
          if (data.length > 0) setSelectedClub(data[0]._id || data[0].id);
        } else {
          if (contextClubId) setSelectedClub(contextClubId);
        }
      } catch { /* interceptor */ } finally { setClubLoading(false); }
    };
    load();
  }, [user, contextClubId]);

  // ── Fetch approved teams ──
  const fetchTeams = useCallback(async () => {
    if (!selectedClub) return;
    setLoading(true);
    try {
      const res = await teamService.getByClub(selectedClub, { approved: "true" });
      const data = res.data?.data || res.data?.teams || res.data || [];
      setTeams(Array.isArray(data) ? data : []);
    } catch { /* interceptor */ } finally { setLoading(false); }
  }, [selectedClub]);

  // ── Fetch pending teams ──
  const fetchPendingTeams = useCallback(async () => {
    if (!selectedClub) return;
    setPendingLoading(true);
    try {
      const res = await teamService.getByClub(selectedClub, { approved: "false" });
      const data = res.data?.data || res.data?.teams || res.data || [];
      setPendingTeams(Array.isArray(data) ? data : []);
    } catch { /* interceptor */ } finally { setPendingLoading(false); }
  }, [selectedClub]);

  useEffect(() => { fetchTeams(); }, [fetchTeams]);
  useEffect(() => {
    if (activeTab === "pending") fetchPendingTeams();
  }, [activeTab, fetchPendingTeams]);

  // ── Roster helpers ──
  const fetchRoster = async (team) => {
    setSelected(team);
    setShowRoster(true);
    setRosterLoading(true);
    try {
      const res = await teamService.getPlayers(team._id || team.id);
      setRoster(res.data?.data || res.data?.players || res.data || []);
    } catch { /* interceptor */ } finally { setRosterLoading(false); }
  };

  const openPendingDetail = async (team) => {
    setPendingDetail(team);
    setShowPendingDetail(true);
    setPendingRosterLoading(true);
    try {
      const res = await teamService.getPlayers(team._id || team.id);
      setPendingRoster(res.data?.data || res.data?.players || res.data || []);
    } catch { /* interceptor */ } finally { setPendingRosterLoading(false); }
  };

  // ── Approved tab handlers ──
  const handleCreate = async () => {
    if (!form.name.trim()) return toast.error("Team name is required");
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("clubId", selectedClub);
      appendImageField(formData, "logo", form.logoUrl);
      await teamService.create(formData);
      toast.success("Team created");
      setShowCreate(false);
      setForm({ name: "", logoUrl: "" });
      fetchTeams();
    } catch { /* interceptor */ } finally { setSubmitting(false); }
  };

  const handleEdit = async () => {
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("name", form.name);
      appendImageField(formData, "logo", form.logoUrl);
      await teamService.update(selected._id || selected.id, formData);
      toast.success("Team updated");
      setShowEdit(false);
      fetchTeams();
    } catch { /* interceptor */ } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await teamService.remove(selected._id || selected.id);
      toast.success("Team deleted");
      setShowDelete(false);
      fetchTeams();
    } catch { /* interceptor */ } finally { setSubmitting(false); }
  };

  const handleAddPlayer = async () => {
    if (!addPlayerForm.playerId.trim()) return toast.error("Player ID required");
    setSubmitting(true);
    try {
      await teamService.addPlayer(selected._id || selected.id, { playerId: addPlayerForm.playerId });
      toast.success("Player added to roster");
      setAddPlayerForm({ playerId: "" });
      fetchRoster(selected);
    } catch { /* interceptor */ } finally { setSubmitting(false); }
  };

  // ── Approve handler ──
  const handleApprove = async () => {
    if (!pendingDetail) return;
    setApproving(true);
    try {
      await teamService.approve(pendingDetail._id || pendingDetail.id);
      toast.success(`${pendingDetail.name} approved successfully`);
      setShowPendingDetail(false);
      setPendingDetail(null);
      fetchPendingTeams();
      fetchTeams();
    } catch { /* interceptor */ } finally { setApproving(false); }
  };

  const openEdit = (team) => { setSelected(team); setForm({ name: team.name || "", logoUrl: team.logo || "" }); setShowEdit(true); };
  const openDelete = (team) => { setSelected(team); setShowDelete(true); };

  const filtered = teams.filter((t) => (t.name || "").toLowerCase().includes(search.toLowerCase()));
  const filteredPending = pendingTeams.filter((t) => (t.name || "").toLowerCase().includes(search.toLowerCase()));
  const currentClubName = clubs.find((l) => (l._id || l.id) === selectedClub)?.name || "Select club";

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-6 h-6" style={{ color: themeColor }} /> Teams
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage team rosters within your clubs</p>
        </div>
        {activeTab === "approved" && (
          <Button onClick={() => { setForm({ name: "", logoUrl: "" }); setShowCreate(true); }} disabled={!selectedClub} style={{ backgroundColor: themeColor, color: "#fff" }}>
            <Plus className="w-4 h-4 mr-2" /> Create Team
          </Button>
        )}
      </motion.div>

      {/* Club Selector + Search */}
      <motion.div variants={item} className="flex flex-col sm:flex-row gap-3">
        {(user?.role === "superAdmin" || user?.role === "superadmin") && (
          <Select value={selectedClub || ""} onValueChange={setSelectedClub}>
            <SelectTrigger className="w-full sm:w-65">
              <SelectValue placeholder="Select a club" />
            </SelectTrigger>
            <SelectContent>
              {clubs.map((l) => (
                <SelectItem key={l._id || l.id} value={l._id || l.id}>{l.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search teams..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={item}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="approved" className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Approved Teams
              {teams.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">{teams.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Pending Approval
              {pendingTeams.length > 0 && (
                <Badge className="ml-1 text-xs bg-amber-500 text-white">{pendingTeams.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── Approved Tab ── */}
          <TabsContent value="approved">
            <Card>
              <CardContent className="p-0">
                {clubLoading || loading ? (
                  <div className="p-6 space-y-3">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
                  </div>
                ) : !selectedClub ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <Shield className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="font-medium">Select a club</p>
                    <p className="text-xs mt-1">Choose a club from the dropdown to view its teams</p>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="font-medium">No approved teams found</p>
                    <p className="text-xs mt-1">{search ? "Try different search" : "Create or approve a team"}</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Team</TableHead>
                        <TableHead>Players</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((team) => (
                        <TableRow key={team._id || team.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: team.color ? `${team.color}20` : `${themeColor}20` }}>
                                {team.logo
                                  ? <img src={team.logo} alt="" className="w-6 h-6 rounded object-cover" />
                                  : <Shield className="w-4 h-4" style={{ color: team.color || themeColor }} />}
                              </div>
                              <div>
                                <span className="font-medium">{team.name}</span>
                                {team.shortName && <Badge variant="outline" className="ml-2 text-[10px]">{team.shortName}</Badge>}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <button onClick={() => fetchRoster(team)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                              <Users className="w-3.5 h-3.5" />
                              {team.playerCount || 0} players
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {team.createdAt ? new Date(team.createdAt).toLocaleDateString() : "—"}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link to={`/teams/${team._id || team.id}`} className="flex items-center"><ChevronRight className="w-4 h-4 mr-2" /> View Details</Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openEdit(team)}><Pencil className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => fetchRoster(team)}><Users className="w-4 h-4 mr-2" /> View Players</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openDelete(team)} className="text-destructive focus:text-destructive"><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
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
          </TabsContent>

          {/* ── Pending Approval Tab ── */}
          <TabsContent value="pending">
            <Card>
              <CardContent className="p-0">
                {pendingLoading ? (
                  <div className="p-6 space-y-3">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
                  </div>
                ) : !selectedClub ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <Shield className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="font-medium">Select a club</p>
                  </div>
                ) : filteredPending.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="font-medium">No pending teams</p>
                    <p className="text-xs mt-1">All submitted teams have been reviewed</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Team</TableHead>
                        <TableHead>Players</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead className="w-32">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPending.map((team) => (
                        <TableRow key={team._id || team.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div
                                className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm"
                                style={{ backgroundColor: team.color ? `${team.color}20` : `${themeColor}15`, color: team.color || themeColor }}
                              >
                                {(team.name || "T")[0]}
                              </div>
                              <div>
                                <span className="font-medium">{team.name}</span>
                                {team.shortName && <Badge variant="outline" className="ml-2 text-[10px]">{team.shortName}</Badge>}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              <Users className="w-3.5 h-3.5" />
                              {team.playerCount || 0} players
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {team.createdAt ? new Date(team.createdAt).toLocaleDateString() : "—"}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openPendingDetail(team)}
                              className="flex items-center gap-1.5"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Review
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* ── Create Dialog ── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Team</DialogTitle><DialogDescription>Add a new team to {currentClubName}</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Team Name</Label><Input placeholder="e.g. Thunder Kings" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-2">
              <Label>Team Logo</Label>
              <ImageUpload value={form.logoUrl} onChange={(fileOrUrl) => setForm({ ...form, logoUrl: fileOrUrl })} label={null} aspectHint="1:1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={submitting} style={{ backgroundColor: themeColor, color: "#fff" }}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ── */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Team</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Team Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-2">
              <Label>Team Logo</Label>
              <ImageUpload value={form.logoUrl} onChange={(fileOrUrl) => setForm({ ...form, logoUrl: fileOrUrl })} label={null} aspectHint="1:1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={submitting}>{submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Dialog ── */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Team</DialogTitle><DialogDescription>Are you sure you want to delete <strong>{selected?.name}</strong>?</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>{submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Roster Dialog ── */}
      <Dialog open={showRoster} onOpenChange={setShowRoster}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Users className="w-5 h-5" style={{ color: themeColor }} /> {selected?.name} — Players</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {rosterLoading ? (
              <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : roster.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No players in this team yet</p>
            ) : (
              <div className="space-y-2 max-h-75 overflow-y-auto">
                {roster.map((p) => (
                  <Link key={p._id || p.id} to={`/players/${p._id || p.id}`} className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden shrink-0" style={{ backgroundColor: `${themeColor}20`, color: themeColor }}>
                        {p.avatar
                          ? <img src={p.avatar} alt={p.name} className="w-8 h-8 rounded-full object-cover" />
                          : (p.name || "?")[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium group-hover:underline">{p.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{ROLE_LABELS[p.role] || p.role || "Player"}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">#{p.jerseyNumber || "—"}</Badge>
                  </Link>
                ))}
              </div>
            )}
            <div className="pt-2 border-t space-y-2">
              <Label>Add player by ID</Label>
              <div className="flex gap-2">
                <Input placeholder="Player ID" value={addPlayerForm.playerId} onChange={(e) => setAddPlayerForm({ playerId: e.target.value })} />
                <Button onClick={handleAddPlayer} disabled={submitting} size="sm" style={{ backgroundColor: themeColor, color: "#fff" }}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Pending Team Detail + Approve Dialog ── */}
      <Dialog open={showPendingDetail} onOpenChange={(v) => { setShowPendingDetail(v); if (!v) setEnlargedPlayer(null); }}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          <div className="flex flex-col max-h-[85vh]">
          {/* Team banner header — fixed */}
          <div className="shrink-0 p-5 pb-4" style={{ background: `linear-gradient(135deg, ${themeColor}18, ${themeColor}08)`, borderBottom: `1px solid ${themeColor}20` }}>
            <div className="flex items-center gap-4">
              {pendingDetail?.logo ? (
                <img src={pendingDetail.logo} alt={pendingDetail.name} className="w-14 h-14 rounded-xl object-cover border-2 shadow-md shrink-0" style={{ borderColor: `${themeColor}40` }} />
              ) : (
                <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-black text-white shrink-0 shadow-md" style={{ backgroundColor: themeColor }}>
                  {(pendingDetail?.name || "T")[0]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold truncate">{pendingDetail?.name}</h2>
                  <Badge className="text-[10px] bg-amber-100 text-amber-700 border-amber-200 shrink-0">
                    <Clock className="w-3 h-3 mr-1" /> Pending Approval
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Submitted {pendingDetail?.createdAt ? new Date(pendingDetail.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Players section — scrollable middle */}
          <div className="flex-1 min-h-0 overflow-y-auto p-5 pt-4">
            <p className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" style={{ color: themeColor }} />
              Squad
              {!pendingRosterLoading && (
                <Badge variant="secondary" className="text-xs ml-1">{pendingRoster.length} players</Badge>
              )}
            </p>

            {pendingRosterLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[1,2,3,4,5,6].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
              </div>
            ) : pendingRoster.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No players found</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {pendingRoster.map((p, i) => (
                  <div
                    key={p._id || p.id}
                    className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-accent/40 transition-colors group"
                  >
                    <div
                      className="relative shrink-0 cursor-pointer"
                      onClick={() => p.avatar && setEnlargedPlayer(p)}
                    >
                      {p.avatar ? (
                        <img
                          src={p.avatar}
                          alt={p.name}
                          className="w-10 h-10 rounded-lg object-cover border shadow-sm group-hover:opacity-90 transition-opacity"
                        />
                      ) : (
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold text-white shadow-sm"
                          style={{ backgroundColor: themeColor }}
                        >
                          {(p.name || "?")[0]}
                        </div>
                      )}
                      <span className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-background border text-[9px] font-bold flex items-center justify-center text-muted-foreground">
                        {i + 1}
                      </span>
                    </div>
                    <Link to={`/players/${p._id || p.id}`} className="flex-1 min-w-0 group/link">
                      <p className="text-sm font-semibold truncate group-hover/link:underline">{p.name}</p>
                      <p className="text-xs text-muted-foreground capitalize flex items-center gap-1.5 flex-wrap">
                        <span className={`font-medium ${
                          p.role === "batsman" ? "text-blue-500" :
                          p.role === "bowler" ? "text-red-500" :
                          p.role === "allrounder" ? "text-violet-500" : "text-amber-500"
                        }`}>{ROLE_LABELS[p.role] || p.role}</span>
                        {p.battingStyle && <span>· {p.battingStyle}</span>}
                        {p.phone && <span className="flex items-center gap-0.5"><Phone className="w-2.5 h-2.5" />{p.phone}</span>}
                      </p>
                    </Link>
                    {p.jerseyNumber && (
                      <div className="shrink-0 flex items-center gap-0.5 text-xs font-bold text-muted-foreground border rounded-md px-1.5 py-0.5 bg-muted/50">
                        <Hash className="w-2.5 h-2.5" />{p.jerseyNumber}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer — fixed */}
          <div className="shrink-0 flex items-center justify-end gap-2 px-5 py-4 border-t bg-muted/30">
            <Button variant="outline" onClick={() => setShowPendingDetail(false)}>Close</Button>
            <Button onClick={handleApprove} disabled={approving} style={{ backgroundColor: themeColor, color: "#fff" }}>
              {approving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              Approve Team
            </Button>
          </div>
          </div>{/* end flex flex-col wrapper */}

          {/* ── Player image enlarge — inside DialogContent so Radix pointer-events work ── */}
          <AnimatePresence>
            {enlargedPlayer && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-lg"
                onClick={() => setEnlargedPlayer(null)}
              >
                <motion.div
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.85, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="relative bg-background rounded-2xl overflow-hidden shadow-2xl w-64"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => setEnlargedPlayer(null)}
                    className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <img src={enlargedPlayer.avatar} alt={enlargedPlayer.name} className="w-full aspect-square object-cover" />
                  <div className="p-4">
                    <p className="font-bold text-base">{enlargedPlayer.name}</p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {ROLE_LABELS[enlargedPlayer.role] || enlargedPlayer.role}
                      {enlargedPlayer.jerseyNumber ? ` · #${enlargedPlayer.jerseyNumber}` : ""}
                    </p>
                    {enlargedPlayer.phone && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {enlargedPlayer.phone}
                      </p>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
