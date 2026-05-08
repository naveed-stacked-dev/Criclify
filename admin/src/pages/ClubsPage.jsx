import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "@/hooks/useAppContext";
import clubService from "@/services/clubService";
import authService from "@/services/authService";
import { appendImageField } from "@/utils/imageUtils";
import { toast } from "sonner";
import { encodeId } from "@/utils/crypto";
import ImageUpload from "@/components/ImageUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Trophy,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  UserPlus,
  Loader2,
  Search,
  Globe,
  KeyRound,
  Settings,
} from "lucide-react";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function ClubsPage() {
  const navigate = useNavigate();
  const { isSuperAdmin } = useAppContext();
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modal states
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showManager, setShowManager] = useState(false);
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form
  const [form, setForm] = useState({ name: "", slug: "", sportType: "cricket", logoUrl: "" });
  const [assignForm, setAssignForm] = useState({ email: "", password: "", name: "" });

  const fetchClubs = useCallback(async () => {
    try {
      const res = await clubService.adminGetAll();
      const data = res.data?.data || res.data?.clubs || res.data || [];
      setClubs(Array.isArray(data) ? data : []);
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchClubs(); }, [fetchClubs]);

  const resetForm = () => setForm({ name: "", slug: "", sportType: "cricket", logoUrl: "" });

  const handleCreate = async () => {
    if (!form.name.trim()) return toast.error("Club name is required");
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("name", form.name);
      if (form.slug) formData.append("slug", form.slug);
      formData.append("sportType", form.sportType);
      appendImageField(formData, "logo", form.logoUrl);

      await clubService.adminCreate(formData);
      toast.success("Club created successfully");
      setShowCreate(false);
      resetForm();
      fetchClubs();
    } catch { /* interceptor */ } finally { setSubmitting(false); }
  };



  const handleEdit = async () => {
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("name", form.name);
      if (form.slug) formData.append("slug", form.slug);
      formData.append("sportType", form.sportType);
      appendImageField(formData, "logo", form.logoUrl);

      await clubService.update(selected._id || selected.id, formData);
      toast.success("Club updated");
      setShowEdit(false);
      fetchClubs();
    } catch { /* interceptor */ } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await clubService.remove(selected._id || selected.id);
      toast.success("Club deleted");
      setShowDelete(false);
      fetchClubs();
    } catch { /* interceptor */ } finally { setSubmitting(false); }
  };

  const handleManagerSubmit = async () => {
    if (!assignForm.email.trim()) return toast.error("Manager email is required");
    if (!selected?.manager && !assignForm.password.trim()) return toast.error("Password is required for new manager");
    
    setSubmitting(true);
    try {
      if (selected.manager) {
        await clubService.updateManager(selected._id || selected.id, selected.manager._id, assignForm);
        toast.success("Manager updated successfully");
      } else {
        await clubService.createManager(selected._id || selected.id, assignForm);
        toast.success("Manager created successfully");
      }
      setShowManager(false);
      setAssignForm({ email: "", password: "", name: "" });
      fetchClubs();
    } catch { /* interceptor */ } finally { setSubmitting(false); }
  };

  const openEdit = (club) => {
    setSelected(club);
    setForm({ name: club.name || "", slug: club.slug || "", sportType: club.sportType || "cricket", logoUrl: club.logoUrl || "" });
    setShowEdit(true);
  };

  const openDelete = (club) => { setSelected(club); setShowDelete(true); };
  const openManager = (club) => { 
    setSelected(club); 
    if (club.manager) {
      setAssignForm({ email: club.manager.email || "", password: "", name: club.manager.name || "" });
    } else {
      setAssignForm({ email: "", password: "", name: "" }); 
    }
    setShowManager(true); 
  };

  const filtered = clubs.filter((l) =>
    (l.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (l.slug || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Trophy className="w-6 h-6 text-violet-500" /> Clubs
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage all cricket clubs across the platform</p>
        </div>
        <Button onClick={() => { resetForm(); setShowCreate(true); }} className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:opacity-90">
          <Plus className="w-4 h-4 mr-2" /> Create Club
        </Button>
      </motion.div>

      {/* Search */}
      <motion.div variants={item}>
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search clubs..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </motion.div>

      {/* Table */}
      <motion.div variants={item}>
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Trophy className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="font-medium">No clubs found</p>
                <p className="text-xs mt-1">{search ? "Try a different search term" : "Create your first club to get started"}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Club</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Sport</TableHead>
                    <TableHead>Manager</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {filtered.map((club) => (
                      <motion.tr
                        key={club._id || club.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="border-b transition-colors hover:bg-muted/50 cursor-pointer"
                        onClick={() => navigate(`/clubs/${encodeId(club._id || club.id)}`)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500/20 to-indigo-500/20 flex items-center justify-center">
                              {club.logoUrl ? (
                                <img src={club.logoUrl} alt="" className="w-6 h-6 rounded object-cover" />
                              ) : (
                                <Trophy className="w-4 h-4 text-violet-500" />
                              )}
                            </div>
                            <span className="font-medium text-foreground">{club.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-mono text-xs">
                            <Globe className="w-3 h-3 mr-1" />{club.slug || "—"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground capitalize">{club.sportType || "cricket"}</TableCell>
                        <TableCell>
                          {club.manager?.name || club.manager?.email ? (
                            <Badge variant="outline" className="text-xs">{club.manager?.name || club.manager?.email}</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {club.createdAt ? new Date(club.createdAt).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/clubs/${encodeId(club._id || club.id)}`)}>
                                <Settings className="w-4 h-4 mr-2 text-violet-500" /> Manage Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(club); }}>
                                <Pencil className="w-4 h-4 mr-2" /> Quick Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openManager(club); }}>
                                <UserPlus className="w-4 h-4 mr-2" /> {club.manager ? "Edit Manager" : "Create Manager"}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openDelete(club); }} className="text-destructive focus:text-destructive">
                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Club</DialogTitle>
            <DialogDescription>Add a new cricket club to the platform</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Club Name</Label>
              <Input placeholder="e.g. Premier Cricket Club" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input placeholder="e.g. premier-cricket-club" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Club Logo</Label>
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
            <Button onClick={handleCreate} disabled={submitting} className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white">
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Club</DialogTitle>
            <DialogDescription>Update club details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Club Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Club Logo</Label>
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
            <Button onClick={handleEdit} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Club</DialogTitle>
            <DialogDescription>Are you sure you want to delete <strong>{selected?.name}</strong>? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Manager Dialog */}
      <Dialog open={showManager} onOpenChange={setShowManager}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-violet-500" /> {selected?.manager ? "Edit Manager" : "Create Manager"}
            </DialogTitle>
            <DialogDescription>
              {selected?.manager ? `Update manager details for ` : `Create a new manager for `}
              <strong>{selected?.name}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Manager Name</Label>
              <Input placeholder="Full name" value={assignForm.name} onChange={(e) => setAssignForm({ ...assignForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Manager Email</Label>
              <Input type="email" placeholder="manager@example.com" value={assignForm.email} onChange={(e) => setAssignForm({ ...assignForm, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><KeyRound className="w-3 h-3" /> Password</Label>
              <PasswordInput placeholder={selected?.manager ? "Leave blank to keep current password" : "Set initial password"} value={assignForm.password} onChange={(e) => setAssignForm({ ...assignForm, password: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowManager(false)}>Cancel</Button>
            <Button onClick={handleManagerSubmit} disabled={submitting} className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} {selected?.manager ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
