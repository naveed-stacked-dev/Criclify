import { useState, useEffect } from "react";
import { useAppContext } from "@/hooks/useAppContext";
import clubService from "@/services/clubService";
import contentService from "@/services/contentService";
import tournamentService from "@/services/tournamentService";
import matchService from "@/services/matchService";
import { appendImageField } from "@/utils/imageUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Images, X } from "lucide-react";
import ImageUpload from "@/components/ImageUpload";

export default function GalleryPage() {
  const { user, clubId: contextClubId, themeColor } = useAppContext();
  const [clubs, setClubs] = useState([]);
  const [selectedClub, setSelectedClub] = useState(null);
  const [clubLoading, setClubLoading] = useState(true);
  const [gallery, setGallery] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Filters
  const [tournaments, setTournaments] = useState([]);
  const [matches, setMatches] = useState([]);
  const [filterTournament, setFilterTournament] = useState("");
  const [filterMatch, setFilterMatch] = useState("");

  // New image form
  const [tournamentId, setTournamentId] = useState("");
  const [matchId, setMatchId] = useState("");
  const [caption, setCaption] = useState("");
  const [image, setImage] = useState(null);
  const [formMatches, setFormMatches] = useState([]);

  // Lightbox
  const [lightbox, setLightbox] = useState(null);

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
    if (selectedClub) {
      fetchGallery();
      fetchTournaments();
    }
  }, [selectedClub]);

  useEffect(() => {
    fetchGallery();
  }, [filterTournament, filterMatch]);

  useEffect(() => {
    if (tournamentId) {
      fetchMatchesForTournament(tournamentId, setFormMatches);
    } else {
      setFormMatches([]);
      setMatchId("");
    }
  }, [tournamentId]);

  useEffect(() => {
    if (filterTournament) {
      fetchMatchesForTournament(filterTournament, setMatches);
    } else {
      setMatches([]);
      setFilterMatch("");
    }
  }, [filterTournament]);

  const fetchTournaments = async () => {
    if (!selectedClub) return;
    try {
      const res = await tournamentService.getByClub(selectedClub);
      setTournaments(res.data?.data || []);
    } catch {}
  };

  const fetchMatchesForTournament = async (tId, setter) => {
    try {
      const res = await matchService.getAll({ tournamentId: tId });
      setter(res.data?.data || []);
    } catch {}
  };

  const fetchGallery = async () => {
    if (!selectedClub) return;
    setLoading(true);
    try {
      const params = {};
      if (filterTournament) params.tournamentId = filterTournament;
      if (filterMatch) params.matchId = filterMatch;
      const res = await contentService.getGallery(selectedClub, params);
      setGallery(res.data?.data || []);
    } catch {
      toast.error("Failed to load gallery");
    } finally {
      setLoading(false);
    }
  };

  const handleAddImage = async (e) => {
    e.preventDefault();
    if (!tournamentId) return toast.error("Select a tournament");
    if (!matchId) return toast.error("Select a match");
    if (!image) return toast.error("Select an image");
    
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("tournamentId", tournamentId);
      formData.append("matchId", matchId);
      if (caption) formData.append("caption", caption);
      appendImageField(formData, "image", image);

      await contentService.createGalleryImage(formData);
      toast.success("Image added to gallery");
      setCaption("");
      setImage(null);
      fetchGallery();
    } catch {
      toast.error("Failed to add image");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this image?")) return;
    try {
      await contentService.deleteGalleryImage(id);
      toast.success("Image deleted");
      fetchGallery();
    } catch {
      toast.error("Failed to delete image");
    }
  };

  if (loading)
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="animate-spin text-muted-foreground w-8 h-8" />
      </div>
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Images className="w-6 h-6" style={{ color: themeColor }} /> Gallery
        </h1>
        <p className="text-muted-foreground text-sm">
          Upload match and tournament photos for your club page.
        </p>
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
          <Images className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">Select a club to manage gallery</p>
        </div>
      ) : (
        <>
      {/* Upload Form */}
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleAddImage} className="space-y-4">
            <h3 className="font-semibold text-lg">Add New Image</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Tournament *</Label>
                <Select value={tournamentId} onValueChange={setTournamentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select tournament" />
                  </SelectTrigger>
                  <SelectContent>
                    {tournaments.map((t) => (
                      <SelectItem key={t._id} value={t._id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Match *</Label>
                <Select value={matchId} onValueChange={setMatchId} disabled={!tournamentId}>
                  <SelectTrigger>
                    <SelectValue placeholder={tournamentId ? "Select match" : "Select tournament first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {formMatches.map((m) => (
                      <SelectItem key={m._id} value={m._id}>
                        {m.title || `${m.teamA?.name || "TBA"} vs ${m.teamB?.name || "TBA"}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Caption</Label>
                <Input
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Image caption..."
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Image *</Label>
              <ImageUpload value={image} onChange={setImage} aspectHint="Any" maxSizeMB={5} />
            </div>
            <Button
              type="submit"
              disabled={saving || !image}
              style={{ backgroundColor: themeColor }}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Upload Image
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <span className="text-sm font-semibold text-muted-foreground">Filter:</span>
        <Select value={filterTournament} onValueChange={(v) => { setFilterTournament(v); setFilterMatch(""); }}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Tournaments" />
          </SelectTrigger>
          <SelectContent>
            {tournaments.map((t) => (
              <SelectItem key={t._id} value={t._id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filterTournament && (
          <Select value={filterMatch} onValueChange={setFilterMatch}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Matches" />
            </SelectTrigger>
            <SelectContent>
              {matches.map((m) => (
                <SelectItem key={m._id} value={m._id}>
                  {m.title || `${m.teamA?.name || "TBA"} vs ${m.teamB?.name || "TBA"}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {(filterTournament || filterMatch) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setFilterTournament(""); setFilterMatch(""); }}
            className="text-xs"
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Gallery Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {gallery.map((img) => (
          <Card
            key={img._id}
            className="overflow-hidden group relative cursor-pointer"
            onClick={() => setLightbox(img)}
          >
            <div className="aspect-square bg-muted">
              <img
                src={img.imageUrl}
                alt={img.caption || ""}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-end">
              <div className="p-3 translate-y-full group-hover:translate-y-0 transition-transform w-full">
                {img.caption && (
                  <p className="text-xs text-white font-medium truncate">{img.caption}</p>
                )}
                {img.tournamentId?.name && (
                  <p className="text-[10px] text-white/70">{img.tournamentId.name}</p>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-red-500 text-white rounded-full w-7 h-7"
              onClick={(e) => { e.stopPropagation(); handleDelete(img._id); }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </Card>
        ))}
        {gallery.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No images yet. Upload your first image above!
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-6 right-6 text-white hover:text-red-400 transition-colors"
            onClick={() => setLightbox(null)}
          >
            <X className="w-8 h-8" />
          </button>
          <img
            src={lightbox.imageUrl}
            alt={lightbox.caption || ""}
            className="max-w-full max-h-full rounded-xl shadow-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
        </>
      )}
    </div>
  );
}
