import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAppContext } from "@/hooks/useAppContext";
import clubService from "@/services/clubService";
import contentService from "@/services/contentService";
import { appendImageField } from "@/utils/imageUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Image as ImageIcon, Edit2, X } from "lucide-react";
import ImageUpload from "@/components/ImageUpload";

export default function SponsorsPage() {
  const { user, clubId: contextClubId, themeColor } = useAppContext();
  const [clubs, setClubs] = useState([]);
  const [selectedClub, setSelectedClub] = useState(null);
  const [clubLoading, setClubLoading] = useState(true);
  const [sponsors, setSponsors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // New sponsor state
  const [name, setName] = useState("");
  const [link, setLink] = useState("");
  const [image, setImage] = useState(null);
  const [editId, setEditId] = useState(null);

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
      } catch { }
      finally { setClubLoading(false); }
    };
    fetch();
  }, [user, contextClubId]);

  useEffect(() => {
    if (selectedClub) fetchSponsors();
  }, [selectedClub]);

  const fetchSponsors = async () => {
    if (!selectedClub) return;
    setLoading(true);
    try {
      const res = await contentService.getSponsors(selectedClub);
      setSponsors(res.data?.data || []);
    } catch (err) {
      toast.error("Failed to load sponsors");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitSponsor = async (e) => {
    e.preventDefault();
    if (!image && !editId) return toast.error("Please select an image");

    setSaving(true);
    try {
      const formData = new FormData();
      if (name) formData.append("name", name);
      if (link) formData.append("link", link);
      
      if (editId) {
        if (image && typeof image !== 'string') {
          appendImageField(formData, "image", image);
        }
        await contentService.updateSponsor(editId, formData);
        toast.success("Sponsor updated successfully");
      } else {
        appendImageField(formData, "image", image);
        await contentService.createSponsor(formData);
        toast.success("Sponsor added successfully");
      }

      handleCancelEdit();
      fetchSponsors();
    } catch (err) {
      toast.error(editId ? "Failed to update sponsor" : "Failed to add sponsor");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (sponsor) => {
    setEditId(sponsor._id);
    setName(sponsor.name || "");
    setLink(sponsor.link || "");
    setImage(sponsor.imageUrl || null);
    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditId(null);
    setName("");
    setLink("");
    setImage(null);
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this sponsor?")) return;
    try {
      await contentService.deleteSponsor(id);
      toast.success("Sponsor deleted");
      fetchSponsors();
    } catch (err) {
      toast.error("Failed to delete sponsor");
    }
  };

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-muted-foreground w-8 h-8" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ImageIcon className="w-6 h-6" style={{ color: themeColor }} /> Sponsors
        </h1>
        <p className="text-muted-foreground">Manage your club sponsors.</p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {(user?.role === "superAdmin" || user?.role === "superadmin") && (
          <div className="w-full max-w-xs">
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={selectedClub || ""}
              onChange={(e) => setSelectedClub(e.target.value)}
            >
              <option value="" disabled>Select a club</option>
              {clubs.map((l) => (
                <option key={l._id || l.id} value={l._id || l.id}>{l.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {!selectedClub && !clubLoading ? (
        <div className="text-center py-16 text-muted-foreground">
          <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">Select a club to manage sponsors</p>
        </div>
      ) : (
        <>
          <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmitSponsor} className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-lg">{editId ? "Edit Sponsor" : "Add New Sponsor"}</h3>
              {editId && (
                <Button type="button" variant="ghost" size="sm" onClick={handleCancelEdit}>
                  <X className="w-4 h-4 mr-2" /> Cancel Edit
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sponsor Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Company Name" />
              </div>
              <div className="space-y-2">
                <Label>Website Link</Label>
                <Input value={link} onChange={e => setLink(e.target.value)} placeholder="https://..." />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Sponsor Logo {!editId && "*"}</Label>
              <ImageUpload value={image} onChange={setImage} aspectHint="Any" maxSizeMB={2} />
            </div>
            <Button type="submit" disabled={saving || (!image && !editId)} style={{ backgroundColor: themeColor }}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : editId ? <Edit2 className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              {editId ? "Update Sponsor" : "Add Sponsor"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {sponsors.map(sponsor => (
          <Card key={sponsor._id} className="overflow-hidden group relative">
            <div className="h-32 bg-white flex items-center justify-center p-4">
              <img src={sponsor.imageUrl} alt={sponsor.name} className="max-h-full max-w-full object-contain" />
            </div>
            <div className="p-3 bg-muted/30 border-t flex justify-between items-center">
              <div>
                <p className="text-sm font-semibold truncate max-w-[120px]">{sponsor.name || "Unnamed"}</p>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="text-blue-500 h-8 w-8" onClick={() => handleEdit(sponsor)}>
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-red-500 h-8 w-8" onClick={() => handleDelete(sponsor._id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
        </>
      )}
    </div>
  );
}
