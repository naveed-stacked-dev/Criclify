import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useAppContext } from "@/hooks/useAppContext";
import clubService from "@/services/clubService";
import tournamentService from "@/services/tournamentService";
import documentService from "@/services/documentService";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FolderOpen, Plus, Trash2, Download, Loader2, Shield, FileText, File, FileImage, Eye, ExternalLink, X } from "lucide-react";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

const CATEGORIES = [
  { value: "rulebook", label: "Rule Book" },
  { value: "permit", label: "Permit" },
  { value: "schedule", label: "Schedule" },
  { value: "contract", label: "Contract" },
  { value: "announcement", label: "Announcement" },
  { value: "other", label: "Other" },
];

const CATEGORY_COLORS = {
  rulebook: "text-blue-500 bg-blue-500/10",
  permit: "text-green-500 bg-green-500/10",
  schedule: "text-violet-500 bg-violet-500/10",
  contract: "text-amber-500 bg-amber-500/10",
  announcement: "text-pink-500 bg-pink-500/10",
  other: "text-muted-foreground bg-muted",
};

function DocumentViewerDialog({ doc, onClose }) {
  if (!doc) return null;

  const mime = doc.mimeType || "";
  const url  = doc.fileUrl  || "";

  // Choose how to render based on MIME type
  let viewer;
  if (mime.startsWith("image/")) {
    viewer = (
      <div className="flex items-center justify-center h-full bg-muted/30 rounded-lg p-4">
        <img
          src={url}
          alt={doc.title}
          className="max-w-full max-h-full object-contain rounded-lg shadow"
        />
      </div>
    );
  } else if (mime === "application/pdf" || mime === "text/plain") {
    viewer = (
      <iframe
        src={url}
        title={doc.title}
        className="w-full h-full rounded-lg border-0"
      />
    );
  } else if (
    mime === "application/msword" ||
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mime === "application/vnd.ms-excel" ||
    mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    // Office Online viewer — works with any publicly accessible URL
    const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
    viewer = (
      <iframe
        src={viewerUrl}
        title={doc.title}
        className="w-full h-full rounded-lg border-0"
      />
    );
  } else {
    viewer = (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
        <FileText className="w-16 h-16 opacity-20" />
        <p className="text-sm">Preview not available for this file type.</p>
        <Button variant="outline" size="sm" onClick={() => window.open(url, "_blank")}>
          <ExternalLink className="w-4 h-4 mr-2" /> Open in new tab
        </Button>
      </div>
    );
  }

  return (
    <Dialog open={!!doc} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-full p-0 gap-0 overflow-hidden flex flex-col" hideClose style={{ height: "90vh" }}>
        {/* Visually-hidden title for accessibility */}
        <DialogTitle className="sr-only">{doc.title}</DialogTitle>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <FileIcon mimeType={mime} />
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{doc.title}</p>
              {doc.description && (
                <p className="text-xs text-muted-foreground truncate">{doc.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-4">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => window.open(url, "_blank")}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open in new tab
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Viewer */}
        <div className="flex-1 overflow-hidden p-3" style={{ height: "calc(90vh - 56px)" }}>
          {viewer}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FileIcon({ mimeType }) {
  if (!mimeType) return <FileText className="w-5 h-5 text-muted-foreground" />;
  if (mimeType.startsWith("image/")) return <FileImage className="w-5 h-5 text-blue-400" />;
  if (mimeType === "application/pdf") return <File className="w-5 h-5 text-red-400" />;
  return <FileText className="w-5 h-5 text-muted-foreground" />;
}

function formatFileSize(bytes) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsPage() {
  const { user, clubId: contextClubId, themeColor } = useAppContext();
  const [clubs, setClubs] = useState([]);
  const [selectedClub, setSelectedClub] = useState(null);
  const [tournaments, setTournaments] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [clubLoading, setClubLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterTournament, setFilterTournament] = useState("all");

  const [showCreate, setShowCreate] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [viewDoc, setViewDoc] = useState(null);
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({ title: "", description: "", category: "other", tournamentId: "", file: null });

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
      const [docRes, tRes] = await Promise.allSettled([
        documentService.getByClub(selectedClub),
        tournamentService.getByClub(selectedClub),
      ]);
      const docs = docRes.status === "fulfilled" ? (docRes.value.data?.data || docRes.value.data || []) : [];
      const tours = tRes.status === "fulfilled" ? (tRes.value.data?.data || tRes.value.data?.tournaments || tRes.value.data || []) : [];
      setDocuments(Array.isArray(docs) ? docs : []);
      setTournaments(Array.isArray(tours) ? tours : []);
    } catch { /* interceptor */ }
    finally { setLoading(false); }
  }, [selectedClub]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async () => {
    if (!form.title.trim()) return toast.error("Document title is required");
    if (!form.file) return toast.error("Please select a file to upload");
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("title", form.title);
      if (form.description) formData.append("description", form.description);
      formData.append("category", form.category);
      if (form.tournamentId && form.tournamentId !== "none") formData.append("tournamentId", form.tournamentId);
      formData.append("clubId", selectedClub);
      formData.append("file", form.file);

      await documentService.create(formData);
      toast.success("Document uploaded");
      setShowCreate(false);
      setForm({ title: "", description: "", category: "other", tournamentId: "", file: null });
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to upload document");
    } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await documentService.remove(selected._id || selected.id);
      toast.success("Document deleted");
      setShowDelete(false);
      fetchData();
    } catch { /* interceptor */ } finally { setSubmitting(false); }
  };

  const filtered = documents.filter((d) => {
    const matchCat = filterCategory === "all" || d.category === filterCategory;
    const matchTour = filterTournament === "all" || (d.tournamentId?._id || d.tournamentId) === filterTournament;
    return matchCat && matchTour;
  });

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FolderOpen className="w-6 h-6" style={{ color: themeColor }} /> Documents
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Upload and manage rule books, permits, and tournament documents</p>
        </div>
        <Button
          onClick={() => setShowCreate(true)}
          disabled={!selectedClub}
          style={{ backgroundColor: themeColor, color: "#fff" }}
        >
          <Plus className="w-4 h-4 mr-2" /> Upload Document
        </Button>
      </motion.div>

      <motion.div variants={item} className="flex flex-col sm:flex-row gap-3 flex-wrap">
        {(user?.role === "superAdmin" || user?.role === "superadmin") && (
          <Select value={selectedClub || ""} onValueChange={setSelectedClub}>
            <SelectTrigger className="w-full sm:w-[220px]"><SelectValue placeholder="Select Club" /></SelectTrigger>
            <SelectContent>{clubs.map((c) => <SelectItem key={c._id || c.id} value={c._id || c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        )}
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="All Categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterTournament} onValueChange={setFilterTournament}>
          <SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder="All Tournaments" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tournaments</SelectItem>
            {tournaments.map((t) => <SelectItem key={t._id || t.id} value={t._id || t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </motion.div>

      <motion.div variants={item}>
        <Card>
          <CardContent className="p-0">
            {clubLoading || loading ? (
              <div className="p-6 space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
            ) : !selectedClub ? (
              <div className="text-center py-16 text-muted-foreground"><Shield className="w-12 h-12 mx-auto mb-3 opacity-20" /><p>Select a club</p></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground"><FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-20" /><p className="font-medium">No documents found</p><p className="text-xs mt-1">Upload rule books, permits, or other tournament documents</p></div>
            ) : (
              <Table>
                <TableHeader style={{ backgroundColor: `${themeColor}10` }}>
                  <TableRow className="hover:bg-transparent">
                    <TableHead style={{ color: themeColor }}>Document</TableHead>
                    <TableHead style={{ color: themeColor }}>Category</TableHead>
                    <TableHead style={{ color: themeColor }}>Tournament</TableHead>
                    <TableHead style={{ color: themeColor }}>Size</TableHead>
                    <TableHead style={{ color: themeColor }}>Uploaded</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((doc) => (
                    <TableRow key={doc._id || doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <FileIcon mimeType={doc.mimeType} />
                          <div>
                            <p className="font-medium text-sm">{doc.title}</p>
                            {doc.description && <p className="text-xs text-muted-foreground">{doc.description}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`capitalize text-xs ${CATEGORY_COLORS[doc.category] || CATEGORY_COLORS.other}`}>
                          {CATEGORIES.find((c) => c.value === doc.category)?.label || doc.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {doc.tournamentId?.name || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatFileSize(doc.fileSize)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => setViewDoc(doc)}
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => window.open(doc.fileUrl, "_blank")}
                            title="Open in new tab"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => { setSelected(doc); setShowDelete(true); }}
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Upload Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ color: themeColor }}>Upload Document</DialogTitle>
            <DialogDescription>Upload a rule book, permit, or other tournament document.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input placeholder="e.g. Tournament Rule Book 2024" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input placeholder="Brief description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tournament (optional)</Label>
                <Select value={form.tournamentId || "none"} onValueChange={(v) => setForm({ ...form, tournamentId: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {tournaments.map((t) => <SelectItem key={t._id || t.id} value={t._id || t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>File</Label>
              <div
                className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                style={{ borderColor: form.file ? `${themeColor}60` : undefined }}
                onClick={() => document.getElementById("doc-file-input").click()}
              >
                {form.file ? (
                  <div className="flex items-center justify-center gap-2 text-sm">
                    <FileText className="w-4 h-4" style={{ color: themeColor }} />
                    <span className="font-medium">{form.file.name}</span>
                    <span className="text-muted-foreground">({formatFileSize(form.file.size)})</span>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p>Click to select file</p>
                    <p className="text-xs mt-1">PDF, Word, Excel, images — max 10 MB</p>
                  </div>
                )}
                <input
                  id="doc-file-input"
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setForm({ ...form, file });
                    e.target.value = "";
                  }}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={submitting} style={{ backgroundColor: themeColor, color: "#fff" }}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Viewer */}
      <DocumentViewerDialog doc={viewDoc} onClose={() => setViewDoc(null)} />

      {/* Delete Dialog */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
            <DialogDescription>Delete <strong>{selected?.title}</strong>? This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
