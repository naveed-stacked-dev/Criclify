import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppContext } from "@/hooks/useAppContext";
import clubService from "@/services/clubService";
import tournamentService from "@/services/tournamentService";
import teamService from "@/services/teamService";
import { toast } from "sonner";
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
import { Swords, Plus, MoreHorizontal, Pencil, CalendarDays, Loader2, Search, Shield, ListOrdered, LayoutGrid, TrendingUp, Activity, Trophy } from "lucide-react";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

const FORMATS = ["league", "knockout"];
const STATUSES = ["draft", "upcoming", "ongoing", "completed", "cancelled"];

export default function TournamentsPage() {
  const { user, clubId: contextClubId, themeColor } = useAppContext();
  const [clubs, setClubs] = useState([]);
  const [selectedClub, setSelectedClub] = useState(null);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [clubLoading, setClubLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showPointsTable, setShowPointsTable] = useState(false);
  const [showGroups, setShowGroups] = useState(false);
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [pointsTable, setPointsTable] = useState({ hasGroups: false, groups: [], all: [] });
  const [pointsLoading, setPointsLoading] = useState(false);
  const [clubTeams, setClubTeams] = useState([]);
  const [groupsForm, setGroupsForm] = useState([]); // [{ name: 'A', teams: [] }]
  const [numGroups, setNumGroups] = useState(4);
  const [teamGroupMap, setTeamGroupMap] = useState({}); // { teamId: 'A' | 'B' | ... | null }

  const ALL_GROUP_NAMES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const GROUP_COLORS = { A: '#6366f1', B: '#10b981', C: '#f59e0b', D: '#ef4444', E: '#8b5cf6', F: '#06b6d4', G: '#ec4899', H: '#84cc16' };

  const [form, setForm] = useState({ name: "", type: "league", startDate: "", endDate: "", settings: { oversPerInning: 20 }, teams: [] });

  useEffect(() => {
    const fetch = async () => {
      try {
        if (user?.role === "superAdmin" || user?.role === "superadmin") {
          const res = await clubService.adminGetAll();
          const data = res.data?.data || res.data?.clubs || res.data || [];
          setClubs(Array.isArray(data) ? data : []);
          setSelectedClub("all");
        } else {
          if (contextClubId) setSelectedClub(contextClubId);
        }
      } catch { /* interceptor */ }
      finally { setClubLoading(false); }
    };
    fetch();
  }, [user, contextClubId]);

  const fetchTournaments = useCallback(async () => {
    if (!selectedClub) return;
    setLoading(true);
    try {
      let res;
      if (selectedClub === "all") {
        res = await tournamentService.getAll();
      } else {
        res = await tournamentService.getByClub(selectedClub);
      }
      const data = res.data?.data || res.data?.tournaments || res.data || [];
      setTournaments(Array.isArray(data) ? data : []);
    } catch { /* interceptor */ }
    finally { setLoading(false); }
  }, [selectedClub]);

  useEffect(() => { fetchTournaments(); }, [fetchTournaments]);

  const fetchTeams = useCallback(async () => {
    if (!selectedClub || selectedClub === "all") return;
    try {
      const res = await teamService.getByClub(selectedClub, { approved: "true" });
      const data = res.data?.data || res.data || [];
      setClubTeams(Array.isArray(data) ? data : []);
    } catch { /* interceptor */ }
  }, [selectedClub]);

  useEffect(() => { fetchTeams(); }, [fetchTeams]);

  const handleCreate = async () => {
    if (!form.name.trim()) return toast.error("Tournament name required");
    setSubmitting(true);
    try {
      await tournamentService.create({ ...form, clubId: selectedClub });
      toast.success("Tournament created");
      setShowCreate(false);
      setForm({ name: "", type: "league", startDate: "", endDate: "", settings: { oversPerInning: 20 }, teams: [] });
      fetchTournaments();
    } catch { /* interceptor */ } finally { setSubmitting(false); }
  };

  const handleEdit = async () => {
    setSubmitting(true);
    try {
      await tournamentService.update(selected._id || selected.id, form);
      toast.success("Tournament updated");
      setShowEdit(false);
      fetchTournaments();
    } catch { /* interceptor */ } finally { setSubmitting(false); }
  };

  const handleGenerateFixtures = async (tournament) => {
    try {
      const res = await tournamentService.generateFixtures(tournament._id || tournament.id, {});
      const data = res.data?.data || res.data;
      if (data?.hasGroups) {
        toast.success(`Group-stage fixtures generated across ${data.groupCount} groups (${data.matches?.length || 0} matches)`);
      } else {
        toast.success(`Fixtures generated (${data?.matches?.length || 0} matches)`);
      }
      fetchTournaments();
    } catch { /* interceptor */ }
  };

  const openPointsTable = async (tournament) => {
    setSelected(tournament);
    setShowPointsTable(true);
    setPointsLoading(true);
    try {
      const res = await tournamentService.getPointsTable(tournament._id || tournament.id);
      const data = res.data?.data || res.data || {};
      // Handle both old flat array and new structured response
      if (Array.isArray(data)) {
        setPointsTable({ hasGroups: false, groups: [], all: data });
      } else {
        setPointsTable(data);
      }
    } catch { setPointsTable({ hasGroups: false, groups: [], all: [] }); }
    finally { setPointsLoading(false); }
  };

  const openEdit = (t) => {
    setSelected(t);
    setForm({
      name: t.name || "",
      type: t.type || "league",
      startDate: t.startDate ? new Date(t.startDate).toISOString().split('T')[0] : "",
      endDate: t.endDate ? new Date(t.endDate).toISOString().split('T')[0] : "",
      settings: { oversPerInning: t.settings?.oversPerInning || 20 },
      teams: t.teams ? t.teams.map(tm => tm._id || tm) : []
    });
    setShowEdit(true);
  };

  const openGroups = (t) => {
    setSelected(t);
    // Build flat teamId → groupName map from existing groups
    const map = {};
    if (Array.isArray(t.groups) && t.groups.length > 0) {
      t.groups.forEach(g => {
        (g.teams || []).forEach(tm => { map[tm._id || tm] = g.name; });
      });
      setNumGroups(Math.max(t.groups.length, 2));
    } else {
      setNumGroups(4);
    }
    setTeamGroupMap(map);
    setShowGroups(true);
  };

  const handleSaveGroups = async () => {
    setSubmitting(true);
    try {
      // Rebuild groups array from the flat map
      const activeGroups = ALL_GROUP_NAMES.slice(0, numGroups);
      const groups = activeGroups.map(name => ({
        name,
        teams: Object.entries(teamGroupMap).filter(([, g]) => g === name).map(([id]) => id),
      }));
      await tournamentService.update(selected._id || selected.id, { groups });
      toast.success("Groups saved successfully");
      setShowGroups(false);
      fetchTournaments();
    } catch { /* interceptor */ } finally { setSubmitting(false); }
  };

  const assignTeamToGroup = (teamId, groupName) => {
    setTeamGroupMap(prev => ({ ...prev, [teamId]: groupName || null }));
  };

  const filtered = tournaments.filter((t) => (t.name || "").toLowerCase().includes(search.toLowerCase()));

  const getStatusBadge = (status) => {
    if (status === "ongoing") return <Badge variant="destructive" className="animate-pulse">Ongoing</Badge>;
    if (status === "completed") return <Badge variant="success" className="bg-green-500 hover:bg-green-600 text-white">Completed</Badge>;
    if (status === "cancelled") return <Badge variant="secondary" className="bg-gray-500 text-white">Cancelled</Badge>;
    if (status === "draft") return <Badge variant="outline">Draft</Badge>;
    return <Badge variant="secondary" className="bg-blue-500 hover:bg-blue-600 text-white">Upcoming</Badge>;
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Swords className="w-6 h-6" style={{ color: themeColor }} /> Tournaments</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage tournaments, formats, and fixtures</p>
        </div>
        <Button onClick={() => { setForm({ name: "", type: "league", startDate: "", endDate: "", settings: { oversPerInning: 20 }, teams: [] }); setShowCreate(true); }} disabled={!selectedClub || selectedClub === "all"} style={{ backgroundColor: themeColor, color: '#fff' }}>
          <Plus className="w-4 h-4 mr-2" /> Create Tournament
        </Button>
      </motion.div>

      <motion.div variants={item} className="flex flex-col sm:flex-row gap-3">
        {(user?.role === "superAdmin" || user?.role === "superadmin") && (
          <Select value={selectedClub || ""} onValueChange={setSelectedClub}>
            <SelectTrigger className="w-full sm:w-[260px]"><SelectValue placeholder="Select a club" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clubs</SelectItem>
              {clubs.map((l) => <SelectItem key={l._id || l.id} value={l._id || l.id}>{l.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search tournaments..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </motion.div>

      <motion.div variants={item}>
        <Card>
          <CardContent className="p-0">
            {clubLoading || loading ? (
              <div className="p-6 space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
            ) : !selectedClub ? (
              <div className="text-center py-16 text-muted-foreground"><Shield className="w-12 h-12 mx-auto mb-3 opacity-20" /><p className="font-medium">Select a club</p></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground"><Swords className="w-12 h-12 mx-auto mb-3 opacity-20" /><p className="font-medium">No tournaments found</p></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tournament</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((t) => (
                    <TableRow key={t._id || t.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${themeColor}20` }}>
                            <Swords className="w-4 h-4" style={{ color: themeColor }} />
                          </div>
                          <span className="font-medium text-sm">{t.name}</span>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="capitalize text-xs">{t.type}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {t.startDate ? new Date(t.startDate).toLocaleDateString() : "?"} - {t.endDate ? new Date(t.endDate).toLocaleDateString() : "?"}
                      </TableCell>
                      <TableCell>{getStatusBadge(t.status || "upcoming")}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {t.type === 'league' && (
                              <DropdownMenuItem onClick={() => openPointsTable(t)}><ListOrdered className="w-4 h-4 mr-2" /> Points Table</DropdownMenuItem>
                            )}
                            {t.type === 'league' && (
                              <DropdownMenuItem onClick={() => openGroups(t)}><LayoutGrid className="w-4 h-4 mr-2" /> Manage Groups</DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleGenerateFixtures(t)}><CalendarDays className="w-4 h-4 mr-2" /> Auto-Generate Fixtures</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(t)}><Pencil className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
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
          <DialogHeader><DialogTitle>Create Tournament</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Name</Label><Input placeholder="Tournament Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FORMATS.map((f) => <SelectItem key={f} value={f} className="capitalize">{f}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
              <div className="space-y-2"><Label>End Date</Label><Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div>
            </div>
            <div className="space-y-2">
              <Label>Overs per Inning</Label>
              <Input type="number" min="1" value={form.settings?.oversPerInning || 20} onChange={(e) => setForm({ ...form, settings: { ...form.settings, oversPerInning: parseInt(e.target.value) || 20 } })} />
            </div>
            {clubTeams.length > 0 && (
              <div className="space-y-2">
                <Label>Participating Teams</Label>
                <div className="border rounded-md p-3 max-h-[150px] overflow-y-auto grid grid-cols-2 gap-2">
                  {clubTeams.map(t => (
                    <label key={t._id || t.id} className="flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form.teams.includes(t._id || t.id)}
                        onChange={(e) => {
                          const id = t._id || t.id;
                          if (e.target.checked) setForm({ ...form, teams: [...form.teams, id] });
                          else setForm({ ...form, teams: form.teams.filter(x => x !== id) });
                        }}
                        className="rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                      />
                      <span>{t.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
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
          <DialogHeader><DialogTitle>Edit Tournament</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FORMATS.map((f) => <SelectItem key={f} value={f} className="capitalize">{f}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
              <div className="space-y-2"><Label>End Date</Label><Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div>
            </div>
            <div className="space-y-2">
              <Label>Overs per Inning</Label>
              <Input type="number" min="1" value={form.settings?.oversPerInning || 20} onChange={(e) => setForm({ ...form, settings: { ...form.settings, oversPerInning: parseInt(e.target.value) || 20 } })} />
            </div>
            {clubTeams.length > 0 && (
              <div className="space-y-2">
                <Label>Participating Teams</Label>
                <div className="border rounded-md p-3 max-h-[150px] overflow-y-auto grid grid-cols-2 gap-2">
                  {clubTeams.map(t => (
                    <label key={t._id || t.id} className="flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form.teams.includes(t._id || t.id)}
                        onChange={(e) => {
                          const id = t._id || t.id;
                          if (e.target.checked) setForm({ ...form, teams: [...form.teams, id] });
                          else setForm({ ...form, teams: form.teams.filter(x => x !== id) });
                        }}
                        className="rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                      />
                      <span>{t.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={submitting}>{submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Points Table Dialog */}
      <Dialog open={showPointsTable} onOpenChange={setShowPointsTable}>
        <DialogContent className="max-w-4xl flex flex-col max-h-[85vh]">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <ListOrdered className="w-5 h-5" style={{ color: themeColor }} />
              {selected?.name} — Standings &amp; Analytics
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto min-h-0">
            {pointsLoading ? (
              <div className="space-y-3 py-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
            ) : pointsTable.all?.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Trophy className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="font-medium">No standings data yet</p>
                <p className="text-xs mt-1">Play some matches to see standings</p>
              </div>
            ) : (
              <Tabs defaultValue={pointsTable.hasGroups ? `group-${pointsTable.groups[0]?.groupName}` : "all"}>
                <TabsList className="mb-4 flex-wrap h-auto">
                  {pointsTable.hasGroups ? (
                    <>
                      {pointsTable.groups.map(g => (
                        <TabsTrigger key={g.groupName} value={`group-${g.groupName}`}>
                          Group {g.groupName}
                        </TabsTrigger>
                      ))}
                      <TabsTrigger value="all">Overall</TabsTrigger>
                    </>
                  ) : (
                    <TabsTrigger value="all">Standings</TabsTrigger>
                  )}
                  <TabsTrigger value="analytics">Team Analytics</TabsTrigger>
                </TabsList>

                {/* Group/All standings tabs */}
                {pointsTable.hasGroups && pointsTable.groups.map(g => (
                  <TabsContent key={g.groupName} value={`group-${g.groupName}`}>
                    <GroupStandingsTable rows={g.teams} groupName={g.groupName} themeColor={themeColor} />
                  </TabsContent>
                ))}
                <TabsContent value="all">
                  <GroupStandingsTable rows={pointsTable.all} themeColor={themeColor} />
                </TabsContent>

                {/* Team Analytics tab */}
                <TabsContent value="analytics">
                  <TeamAnalyticsView rows={pointsTable.all} themeColor={themeColor} />
                </TabsContent>
              </Tabs>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Groups Dialog — redesigned */}
      <Dialog open={showGroups} onOpenChange={setShowGroups}>
        <DialogContent className="max-w-2xl flex flex-col max-h-[90vh]">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <LayoutGrid className="w-5 h-5" style={{ color: themeColor }} />
              Manage Groups — {selected?.name}
            </DialogTitle>
            <DialogDescription>
              Select how many groups you need, then assign each team to a group.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-1 min-h-0">
          {(() => {
            const tournamentTeamIds = (selected?.teams || []).map(tt => tt._id || tt);
            const teamList = clubTeams.filter(t => tournamentTeamIds.includes(t._id || t.id));
            const activeGroups = ALL_GROUP_NAMES.slice(0, numGroups);
            const unassignedTeams = teamList.filter(t => !teamGroupMap[t._id || t.id]);
            const assignedCount = teamList.length - unassignedTeams.length;

            if (teamList.length === 0) {
              return (
                <div className="py-10 text-center text-muted-foreground">
                  <LayoutGrid className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">No teams in this tournament yet.</p>
                  <p className="text-xs mt-1">Add teams to the tournament first, then assign groups.</p>
                </div>
              );
            }

            return (
              <div className="space-y-5 py-2">
                {/* Step 1: Number of groups */}
                <div className="flex items-center gap-4 p-4 rounded-xl border bg-secondary/20">
                  <div className="flex-1">
                    <p className="text-sm font-semibold">Number of Groups</p>
                    <p className="text-xs text-muted-foreground mt-0.5">How many groups does this tournament have?</p>
                  </div>
                  <div className="flex gap-2">
                    {[2, 3, 4, 5, 6, 8].map(n => (
                      <button
                        key={n}
                        onClick={() => setNumGroups(n)}
                        className="w-9 h-9 rounded-lg text-sm font-bold border transition-all"
                        style={numGroups === n
                          ? { backgroundColor: themeColor, color: '#fff', borderColor: themeColor }
                          : { backgroundColor: 'transparent', borderColor: 'hsl(var(--border))' }
                        }
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Group Summary */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Group Summary</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {activeGroups.map(gName => {
                      const groupTeams = teamList.filter(t => teamGroupMap[t._id || t.id] === gName);
                      return (
                        <div
                          key={gName}
                          className="rounded-xl border p-3"
                          style={{ borderColor: `${GROUP_COLORS[gName]}30`, backgroundColor: `${GROUP_COLORS[gName]}08` }}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className="w-6 h-6 rounded-full text-xs font-black flex items-center justify-center text-white"
                              style={{ backgroundColor: GROUP_COLORS[gName] }}
                            >
                              {gName}
                            </span>
                            <span className="text-xs font-semibold">Group {gName}</span>
                          </div>
                          {groupTeams.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic">Empty</p>
                          ) : (
                            <div className="space-y-1">
                              {groupTeams.map(t => (
                                <p key={t._id || t.id} className="text-xs font-medium truncate">{t.name}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Assign teams */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold">Assign Teams to Groups</p>
                    <span className="text-xs text-muted-foreground">
                      {assignedCount}/{teamList.length} assigned
                      {unassignedTeams.length > 0 && (
                        <span className="ml-2 text-amber-500 font-medium">· {unassignedTeams.length} unassigned</span>
                      )}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {teamList.map(t => {
                      const tid = t._id || t.id;
                      const assigned = teamGroupMap[tid];
                      const assignedColor = assigned ? GROUP_COLORS[assigned] : null;
                      return (
                        <div
                          key={tid}
                          className="flex items-center justify-between px-4 py-3 rounded-xl border transition-all"
                          style={assigned ? { borderColor: `${assignedColor}40`, backgroundColor: `${assignedColor}08` } : {}}
                        >
                          <div className="flex items-center gap-3">
                            {assigned ? (
                              <span
                                className="w-7 h-7 rounded-full text-xs font-black flex items-center justify-center text-white shrink-0"
                                style={{ backgroundColor: assignedColor }}
                              >
                                {assigned}
                              </span>
                            ) : (
                              <span className="w-7 h-7 rounded-full border-2 border-dashed border-border flex items-center justify-center text-muted-foreground shrink-0 text-xs">
                                ?
              </span>
                            )}
                            <span className="font-medium text-sm">{t.name}</span>
                          </div>

                          <div className="flex gap-1.5 flex-wrap justify-end">
                            {activeGroups.map(gName => (
                              <button
                                key={gName}
                                onClick={() => assignTeamToGroup(tid, assigned === gName ? null : gName)}
                                className="w-8 h-8 rounded-lg text-xs font-bold border transition-all hover:scale-105"
                                title={`Assign to Group ${gName}`}
                                style={assigned === gName
                                  ? { backgroundColor: GROUP_COLORS[gName], color: '#fff', borderColor: GROUP_COLORS[gName] }
                                  : { backgroundColor: `${GROUP_COLORS[gName]}15`, color: GROUP_COLORS[gName], borderColor: `${GROUP_COLORS[gName]}40` }
                                }
                              >
                                {gName}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            );
          })()}
          </div>

          <DialogFooter className="shrink-0 border-t border-border pt-4 mt-2">
            <Button variant="outline" onClick={() => setShowGroups(false)}>Cancel</Button>
            <Button onClick={handleSaveGroups} disabled={submitting} style={{ backgroundColor: themeColor, color: "#fff" }}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save Groups
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

/* ─── Standings table (used for both group and overall) ─── */
function GroupStandingsTable({ rows = [], groupName, themeColor }) {
  const GROUP_COLORS = { A: '#6366f1', B: '#10b981', C: '#f59e0b', D: '#ef4444', E: '#8b5cf6', F: '#06b6d4', G: '#ec4899', H: '#84cc16' };
  const color = groupName ? GROUP_COLORS[groupName] || themeColor : themeColor;

  if (!rows.length) return <p className="text-sm text-muted-foreground text-center py-6">No data yet</p>;

  return (
    <div>
      {groupName && (
        <div className="flex items-center gap-2 mb-3">
          <span className="w-7 h-7 rounded-full text-xs font-black flex items-center justify-center text-white" style={{ backgroundColor: color }}>{groupName}</span>
          <span className="font-semibold text-sm">Group {groupName} Standings</span>
          <span className="text-xs text-muted-foreground ml-1">({rows.length} teams)</span>
        </div>
      )}
      <Table>
        <TableHeader style={{ backgroundColor: `${color}10` }}>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-10 text-center" style={{ color }}>Pos</TableHead>
            <TableHead style={{ color }}>Team</TableHead>
            <TableHead className="text-center" style={{ color }}>P</TableHead>
            <TableHead className="text-center" style={{ color }}>W</TableHead>
            <TableHead className="text-center" style={{ color }}>L</TableHead>
            <TableHead className="text-center" style={{ color }}>T</TableHead>
            <TableHead className="text-center" style={{ color }}>NR</TableHead>
            <TableHead className="text-center" style={{ color }}>NRR</TableHead>
            <TableHead className="text-right" style={{ color }}>Pts</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, idx) => {
            const isTop = idx === 0;
            return (
              <TableRow key={row.teamId?._id || idx} className={isTop ? "font-semibold" : ""} style={isTop ? { backgroundColor: `${color}06` } : {}}>
                <TableCell className="text-center">
                  {idx === 0 ? <span className="w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: color }}>1</span>
                   : idx + 1}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {row.teamId?.logo ? <img src={row.teamId.logo} alt="" className="w-5 h-5 rounded-full object-cover" /> : (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ backgroundColor: color }}>
                        {(row.teamId?.name || 'T')[0]}
                      </div>
                    )}
                    <span>{row.teamId?.name || 'Unknown'}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center text-muted-foreground">{row.played || 0}</TableCell>
                <TableCell className="text-center font-semibold text-green-600">{row.won || 0}</TableCell>
                <TableCell className="text-center font-semibold text-red-500">{row.lost || 0}</TableCell>
                <TableCell className="text-center text-muted-foreground">{row.tied || 0}</TableCell>
                <TableCell className="text-center text-muted-foreground">{row.noResult || 0}</TableCell>
                <TableCell className="text-center font-mono text-xs">{(row.nrr || 0) > 0 ? '+' : ''}{(row.nrr || 0).toFixed(3)}</TableCell>
                <TableCell className="text-right font-bold text-lg" style={{ color }}>{row.points || 0}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

/* ─── Team Analytics cards ─── */
function TeamAnalyticsView({ rows = [], themeColor }) {
  if (!rows.length) return <p className="text-sm text-muted-foreground text-center py-6">No analytics data yet. Play some matches first.</p>;

  const totalMatches = rows.reduce((s, r) => s + (r.played || 0), 0) / 2; // Each match counted twice
  const totalRuns = rows.reduce((s, r) => s + (r.runsScored || 0), 0);

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Matches Played", value: Math.round(totalMatches), icon: Activity },
          { label: "Total Runs Scored", value: totalRuns.toLocaleString(), icon: TrendingUp },
          { label: "Teams", value: rows.length, icon: Trophy },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="border rounded-xl p-3 text-center" style={{ borderColor: `${themeColor}30`, backgroundColor: `${themeColor}05` }}>
              <Icon className="w-4 h-4 mx-auto mb-1" style={{ color: themeColor }} />
              <p className="text-xl font-bold" style={{ color: themeColor }}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Per-team performance cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {rows.map((row, idx) => {
          const winPct = row.played > 0 ? Math.round((row.won / row.played) * 100) : 0;
          const nrrStr = (row.nrr || 0) >= 0 ? `+${(row.nrr || 0).toFixed(3)}` : (row.nrr || 0).toFixed(3);
          const nrrColor = (row.nrr || 0) >= 0 ? '#10b981' : '#ef4444';

          return (
            <div key={row.teamId?._id || idx} className="border rounded-xl p-4 space-y-3" style={{ borderColor: `${themeColor}20` }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {row.teamId?.logo ? <img src={row.teamId.logo} alt="" className="w-8 h-8 rounded-full object-cover" /> : (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm" style={{ backgroundColor: themeColor }}>
                      {(row.teamId?.name || 'T')[0]}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-sm">{row.teamId?.name || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">{row.played || 0} matches</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black" style={{ color: themeColor }}>{row.points || 0} <span className="text-xs font-normal text-muted-foreground">pts</span></p>
                </div>
              </div>

              {/* Win bar */}
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Win rate</span><span className="font-semibold">{winPct}%</span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${winPct}%`, backgroundColor: themeColor }} />
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-4 gap-2 text-center">
                {[
                  { label: 'W', value: row.won || 0, color: '#10b981' },
                  { label: 'L', value: row.lost || 0, color: '#ef4444' },
                  { label: 'T', value: row.tied || 0, color: '#f59e0b' },
                  { label: 'NRR', value: nrrStr, color: nrrColor },
                ].map(s => (
                  <div key={s.label} className="bg-secondary/40 rounded-lg p-1.5">
                    <p className="text-xs font-semibold" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Runs */}
              {row.runsScored > 0 && (
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
                  <span>Runs scored: <strong className="text-foreground">{(row.runsScored || 0).toLocaleString()}</strong></span>
                  <span>Conceded: <strong className="text-foreground">{(row.runsConceded || 0).toLocaleString()}</strong></span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
