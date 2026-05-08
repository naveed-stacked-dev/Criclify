import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAppContext } from "@/hooks/useAppContext";
import clubService from "@/services/clubService";
import { decodeId } from "@/utils/crypto";
import { appendImageField } from "@/utils/imageUtils";
import { toast } from "sonner";
import ImageUpload from "@/components/ImageUpload";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Trophy, 
  ChevronLeft, 
  Loader2, 
  Paintbrush, 
  Info, 
  Globe, 
  Calendar,
  Save,
  ImageIcon,
  UserPlus
} from "lucide-react";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function ClubDetailsPage() {
  const params = useParams();
  const clubId = decodeId(params.clubId);
  const navigate = useNavigate();
  const { user } = useAppContext();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [club, setClub] = useState(null);
  
  // Manager assignment
  const [showManager, setShowManager] = useState(false);
  const [assignForm, setAssignForm] = useState({ email: "", password: "", name: "" });
  
  // Editable fields
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    logo: null,
    banner: null,
    themeColor: "#7c3aed",
    primaryColor: "#1a73e8",
    secondaryColor: "#ffffff"
  });

  const fetchClub = useCallback(async () => {
    try {
      const res = await clubService.getById(clubId);
      const data = res.data?.data || res.data;
      setClub(data);
      setForm({
        name: data.name || "",
        slug: data.slug || "",
        description: data.description || "",
        logo: data.logo || null,
        banner: data.bannerUrl || null,
        themeColor: data.themeColor || "#7c3aed",
        primaryColor: data.theme?.primaryColor || "#1a73e8",
        secondaryColor: data.theme?.secondaryColor || "#ffffff"
      });
    } catch (error) {
      toast.error("Failed to fetch club details");
      navigate("/clubs");
    } finally {
      setLoading(false);
    }
  }, [clubId, navigate]);

  useEffect(() => {
    fetchClub();
  }, [fetchClub]);

  const handleSave = async () => {
    setSubmitting(true);
    try {
      // 1. Update basic info & files via FormData
      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("slug", form.slug);
      formData.append("description", form.description);
      formData.append("themeColor", form.themeColor);
      
      appendImageField(formData, "logo", form.logo);
      appendImageField(formData, "bannerUrl", form.banner);

      await clubService.update(clubId, formData);

      // 2. Update nested theme colors via JSON
      await clubService.updateTheme(clubId, {
        primaryColor: form.primaryColor,
        secondaryColor: form.secondaryColor
      });

      toast.success("Club details and branding updated");
      fetchClub(); // Refresh data to get new URLs
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update club");
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  const handleManagerSubmit = async () => {
    if (!assignForm.email.trim()) return toast.error("Manager email is required");
    if (!club?.manager && !assignForm.password.trim()) return toast.error("Password is required for new manager");
    setSubmitting(true);
    try {
      if (club.manager) {
        await clubService.updateManager(club._id || club.id, club.manager._id, assignForm);
        toast.success("Manager updated successfully");
      } else {
        await clubService.createManager(club._id || club.id, assignForm);
        toast.success("Manager created successfully");
      }
      setShowManager(false);
      fetchClub();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save manager");
    } finally {
      setSubmitting(false);
    }
  };

  const openManager = () => { 
    if (club?.manager) {
      setAssignForm({ email: club.manager.email || "", password: "", name: club.manager.name || "" });
    } else {
      setAssignForm({ email: "", password: "", name: "" });
    }
    setShowManager(true); 
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-[400px] rounded-xl" />
          <Skeleton className="h-[400px] rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Header */}
      <motion.div variants={item} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/clubs")} className="rounded-full">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Trophy className="w-6 h-6 text-violet-500" /> {club?.name}
            </h1>
            <p className="text-sm text-muted-foreground">Manage details and branding for this club</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={submitting} className="bg-gradient-to-r from-violet-600 to-indigo-600 shadow-lg shadow-indigo-500/20 w-full sm:w-auto">
          {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save All Changes
        </Button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Info & Assets */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div variants={item}>
            <Card className="border-border/50 shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/30 pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Info className="w-4 h-4 text-primary" /> Club Information
                </CardTitle>
                <CardDescription>Basic identification and metadata</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Club Name</Label>
                    <Input 
                      id="name" 
                      value={form.name} 
                      onChange={(e) => setForm({ ...form, name: e.target.value })} 
                      placeholder="Enter club name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slug">Slug (URL Identifier)</Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        id="slug" 
                        className="pl-10 font-mono"
                        value={form.slug} 
                        onChange={(e) => setForm({ ...form, slug: e.target.value })} 
                        placeholder="club-slug"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea 
                    id="description" 
                    rows={4}
                    value={form.description} 
                    onChange={(e) => setForm({ ...form, description: e.target.value })} 
                    placeholder="Tell us about this club..."
                  />
                </div>

                <div className="pt-4 border-t border-border/50 flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Created: {new Date(club?.createdAt).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-[10px] uppercase">{club?.sportType || "Cricket"}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Visual Assets Section */}
          <motion.div variants={item}>
            <Card className="border-border/50 shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/30 pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-primary" /> Visual Assets
                </CardTitle>
                <CardDescription>Upload logo and banner for the club portal</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6 pb-16">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Club Logo</Label>
                    <ImageUpload
                      value={form.logo}
                      onChange={(val) => setForm({ ...form, logo: val })}
                      aspectHint="1:1"
                      className="h-40"
                    />
                    <p className="text-[10px] text-muted-foreground text-center">Recommended: Square PNG/JPG</p>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Club Banner</Label>
                    <ImageUpload
                      value={form.banner}
                      onChange={(val) => setForm({ ...form, banner: val })}
                      aspectHint="3:1"
                      className="h-40"
                    />
                    <p className="text-[10px] text-muted-foreground text-center">Recommended: 1200x400px</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="border-border/50 shadow-sm mt-6">
              <CardHeader className="bg-muted/30 pb-4 flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-primary" /> Club Manager
                  </CardTitle>
                  <CardDescription>Manage the user account responsible for this club</CardDescription>
                </div>
                <Button onClick={openManager} variant={club?.manager ? "outline" : "default"} size="sm">
                  {club?.manager ? "Edit Manager" : "Assign Manager"}
                </Button>
              </CardHeader>
              <CardContent className="pt-6">
                {club?.manager ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground uppercase">Name</Label>
                      <p className="font-medium">{club.manager.name}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground uppercase">Email</Label>
                      <p className="font-medium">{club.manager.email}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground border-2 border-dashed rounded-xl border-border">
                    <UserPlus className="w-8 h-8 mb-2 opacity-50" />
                    <p className="font-medium text-foreground">No Manager Assigned</p>
                    <p className="text-sm">Assign a manager so they can configure this club's portal.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Right Col: Branding */}
        <div className="space-y-6">
          <motion.div variants={item}>
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="bg-muted/30 pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Paintbrush className="w-4 h-4 text-primary" /> Branding & Theming
                </CardTitle>
                <CardDescription>Customize colors for this club</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Dashboard Theme Color</Label>
                    <div className="flex gap-2">
                      <div 
                        className="w-12 h-10 rounded-lg border border-border/50 shadow-inner overflow-hidden relative cursor-pointer"
                        style={{ backgroundColor: form.themeColor }}
                      >
                        <Input 
                          type="color" 
                          value={form.themeColor} 
                          onChange={(e) => setForm({ ...form, themeColor: e.target.value })}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                      </div>
                      <Input 
                        value={form.themeColor} 
                        onChange={(e) => setForm({ ...form, themeColor: e.target.value })}
                        className="flex-1 font-mono uppercase"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Portal Primary Color</Label>
                    <div className="flex gap-2">
                      <div 
                        className="w-12 h-10 rounded-lg border border-border/50 shadow-inner overflow-hidden relative cursor-pointer"
                        style={{ backgroundColor: form.primaryColor }}
                      >
                        <Input 
                          type="color" 
                          value={form.primaryColor} 
                          onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                      </div>
                      <Input 
                        value={form.primaryColor} 
                        onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                        className="flex-1 font-mono uppercase"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Portal Secondary Color</Label>
                    <div className="flex gap-2">
                      <div 
                        className="w-12 h-10 rounded-lg border border-border/50 shadow-inner overflow-hidden relative cursor-pointer"
                        style={{ backgroundColor: form.secondaryColor }}
                      >
                        <Input 
                          type="color" 
                          value={form.secondaryColor} 
                          onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                      </div>
                      <Input 
                        value={form.secondaryColor} 
                        onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })}
                        className="flex-1 font-mono uppercase"
                      />
                    </div>
                  </div>
                </div>

                <Separator className="bg-border/50" />

                <div className="space-y-3">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Live Theme Preview</Label>
                  <div className="rounded-xl border border-border/50 overflow-hidden bg-background">
                    <div 
                      className="h-16 px-4 flex items-center gap-2"
                      style={{ background: `linear-gradient(135deg, ${form.themeColor}, ${form.themeColor}dd)` }}
                    >
                      <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center">
                        <Trophy className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="h-2 w-24 bg-white/40 rounded-full mb-1" />
                        <div className="h-1.5 w-16 bg-white/20 rounded-full" />
                      </div>
                    </div>
                    <div className="p-4 space-y-2">
                      <div className="flex gap-2">
                        <div className="h-8 flex-1 rounded bg-muted/50 flex items-center justify-center text-[10px] text-muted-foreground font-semibold">CONTENT</div>
                        <div className="h-8 w-20 rounded shadow-sm flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: form.secondaryColor, color: form.primaryColor }}>
                          ACCENT
                        </div>
                      </div>
                      <div className="h-10 w-full rounded shadow-sm flex items-center justify-center text-[10px] text-white font-bold" style={{ backgroundColor: form.primaryColor }}>
                        PRIMARY BUTTON
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <div className="rounded-xl border-2 border-violet-200 bg-violet-50 p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 p-2 bg-violet-600 rounded-lg shadow-sm shadow-violet-600/20">
                  <Info className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-violet-950 tracking-tight">
                    SuperAdmin Tip
                  </h4>
                  <p className="mt-1 text-xs font-semibold text-violet-900 leading-relaxed">
                    Theme colors will be applied across the club's private dashboard and public portal. Ensure high contrast for better accessibility.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <Dialog open={showManager} onOpenChange={setShowManager}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-violet-500" /> {club?.manager ? "Edit Manager" : "Create Manager"}
            </DialogTitle>
            <DialogDescription>
              {club?.manager ? `Update manager details for ${club?.name}` : `Create a new manager for ${club?.name}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Manager Name</Label>
              <Input placeholder="John Doe" value={assignForm.name} onChange={(e) => setAssignForm({ ...assignForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Manager Email</Label>
              <Input type="email" placeholder="manager@example.com" value={assignForm.email} onChange={(e) => setAssignForm({ ...assignForm, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <PasswordInput placeholder={club?.manager ? "Leave blank to keep current password" : "Set initial password"} value={assignForm.password} onChange={(e) => setAssignForm({ ...assignForm, password: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowManager(false)}>Cancel</Button>
            <Button onClick={handleManagerSubmit} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} {club?.manager ? "Update" : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
