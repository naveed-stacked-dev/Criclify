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
import { Users, Plus, MoreHorizontal, Pencil, Trash2, Loader2, Search, UserPlus, Shield, ChevronRight } from "lucide-react";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function TeamsPage() {
  const { user, clubId: contextClubId, themeColor } = useAppContext();
  const [clubs, setClubs] = useState([]);
  const [selectedClub, setSelectedClub] = useState(null);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [clubLoading, setClubLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modal
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

  // Fetch clubs for drill-down
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

  // Fetch teams for selected club
  const fetchTeams = useCallback(async () => {
    if (!selectedClub) return;
    setLoading(true);
    try {
      const res = await teamService.getByClub(selectedClub);
      const data = res.data?.data || res.data?.teams || res.data || [];
      setTeams(Array.isArray(data) ? data : []);
    } catch { /* interceptor */ }
    finally { setLoading(false); }
  }, [selectedClub]);

  useEffect(() => { fetchTeams(); }, [fetchTeams]);

  const fetchRoster = async (team) => {
    setSelected(team);
    setShowRoster(true);
    setRosterLoading(true);
    try {
      const res = await teamService.getPlayers(team._id || team.id);
      setRoster(res.data?.data || res.data?.players || res.data || []);
    } catch { /* interceptor */ }
    finally { setRosterLoading(false); }
  };

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

  const openEdit = (team) => { setSelected(team); setForm({ name: team.name || "", logoUrl: team.logo || "" }); setShowEdit(true); };
  const openDelete = (team) => { setSelected(team); setShowDelete(true); };

  const filtered = teams.filter((t) => (t.name || "").toLowerCase().includes(search.toLowerCase()));

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
        <Button onClick={() => { setForm({ name: "", logoUrl: "" }); setShowCreate(true); }} disabled={!selectedClub} style={{ backgroundColor: themeColor, color: '#fff' }}>
          <Plus className="w-4 h-4 mr-2" /> Create Team
        </Button>
      </motion.div>

      {/* Club Selector + Search */}
      <motion.div variants={item} className="flex flex-col sm:flex-row gap-3">
        {(user?.role === "superAdmin" || user?.role === "superadmin") && (
          <Select value={selectedClub || ""} onValueChange={setSelectedClub}>
            <SelectTrigger className="w-full sm:w-[260px]">
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

      {/* Teams Table */}
      <motion.div variants={item}>
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
                <p className="font-medium">No teams found</p>
                <p className="text-xs mt-1">{search ? "Try different search" : "Create the first team for this club"}</p>
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
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${themeColor}20` }}>
                            {team.logo ? <img src={team.logo} alt="" className="w-6 h-6 rounded object-cover" /> : <Shield className="w-4 h-4" style={{ color: themeColor }} />}
                          </div>
                          <span className="font-medium">{team.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <button onClick={() => fetchRoster(team)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                          <Users className="w-3.5 h-3.5" />
                          {team.players?.length || team.playerCount || 0} players
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
      </motion.div>

      {/* Create */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Team</DialogTitle><DialogDescription>Add a new team to {currentClubName}</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Team Name</Label><Input placeholder="e.g. Thunder Kings" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-2">
              <Label>Team Logo</Label>
              <ImageUpload
                value={form.logoUrl}
                onChange={(fileOrUrl) => setForm({ ...form, logoUrl: fileOrUrl })}
                label={null}
                aspectHint="1:1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={submitting} style={{ backgroundColor: themeColor, color: '#fff' }}>{submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Team</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Team Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-2">
              <Label>Team Logo</Label>
              <ImageUpload
                value={form.logoUrl}
                onChange={(fileOrUrl) => setForm({ ...form, logoUrl: fileOrUrl })}
                label={null}
                aspectHint="1:1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={submitting}>{submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Team</DialogTitle><DialogDescription>Are you sure you want to delete <strong>{selected?.name}</strong>?</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>{submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Roster Drawer */}
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
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {roster.map((p) => (
                  <div key={p._id || p.id} className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/30">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: `${themeColor}20`, color: themeColor }}>
                        {(p.name || "?")[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{p.role || "Player"}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">#{p.jerseyNumber || "—"}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
