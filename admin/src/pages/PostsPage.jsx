import { useState, useEffect } from "react";
import { useAppContext } from "@/hooks/useAppContext";
import contentService from "@/services/contentService";
import { appendImageField } from "@/utils/imageUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, FileText, Calendar, Edit2, X } from "lucide-react";
import ImageUpload from "@/components/ImageUpload";

export default function PostsPage() {
  const { clubId, themeColor } = useAppContext();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState(null);
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    if (clubId) fetchPosts();
  }, [clubId]);

  const fetchPosts = async () => {
    try {
      const res = await contentService.getPosts(clubId);
      setPosts(res.data?.data || []);
    } catch {
      toast.error("Failed to load posts");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return toast.error("Title is required");
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      
      if (editId) {
        appendImageField(formData, "image", image, true);
        await contentService.updatePost(editId, formData);
        toast.success("Post updated");
      } else {
        if (image) appendImageField(formData, "image", image);
        await contentService.createPost(formData);
        toast.success("Post created");
      }
      
      handleCancelEdit();
      fetchPosts();
    } catch {
      toast.error(editId ? "Failed to update post" : "Failed to create post");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (post) => {
    setEditId(post._id);
    setTitle(post.title);
    setDescription(post.description || "");
    setImage(post.imageUrl || null);
    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditId(null);
    setTitle("");
    setDescription("");
    setImage(null);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this post?")) return;
    try {
      await contentService.deletePost(id);
      toast.success("Post deleted");
      fetchPosts();
    } catch {
      toast.error("Failed to delete post");
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
          <FileText className="w-6 h-6" style={{ color: themeColor }} /> Posts
        </h1>
        <p className="text-muted-foreground text-sm">
          Create news updates and announcements for your club page.
        </p>
      </div>

      {/* Create / Edit Form */}
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-lg">{editId ? "Edit Post" : "New Post"}</h3>
              {editId && (
                <Button type="button" variant="ghost" size="sm" onClick={handleCancelEdit}>
                  <X className="w-4 h-4 mr-2" /> Cancel Edit
                </Button>
              )}
            </div>
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Post title..."
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Write your post content..."
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Image (optional)</Label>
              <ImageUpload value={image} onChange={setImage} aspectHint="Any" maxSizeMB={5} />
            </div>
            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={saving || !title.trim()}
                style={{ backgroundColor: themeColor }}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : editId ? (
                  <Edit2 className="w-4 h-4 mr-2" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                {editId ? "Update Post" : "Publish Post"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Posts List */}
      <div className="space-y-4">
        {posts.map((post) => (
          <Card key={post._id} className="overflow-hidden">
            <div className="flex">
              {post.imageUrl && (
                <div className="w-40 h-32 flex-shrink-0">
                  <img
                    src={post.imageUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <CardContent className="p-4 flex-1 flex justify-between items-start">
                <div className="min-w-0">
                  <h4 className="font-semibold text-foreground truncate">{post.title}</h4>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {post.description || "No description"}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(post.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-blue-500 bg-blue-50 hover:bg-blue-100 h-8 w-8"
                    onClick={() => handleEdit(post)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-500 bg-red-50 hover:bg-red-100 h-8 w-8"
                    onClick={() => handleDelete(post._id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </div>
          </Card>
        ))}
        {posts.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No posts yet. Create your first post above!
          </div>
        )}
      </div>
    </div>
  );
}
