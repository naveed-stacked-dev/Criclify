import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { useOutletContext } from "react-router-dom";
import clubService from "../services/clubService";
import { Calendar, LayoutList, Loader2 } from "lucide-react";

export default function ClubPostsPage() {
  const { club } = useOutletContext();
  const clubId = club?._id || club?.id;
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const observer = useRef();

  const fetchPosts = async (pageNum) => {
    if (!clubId || loading) return;
    setLoading(true);
    try {
      const res = await clubService.getPosts(clubId, { page: pageNum, limit: 6 });
      const newPosts = res.data?.data || [];
      const pagination = res.data?.pagination;
      
      setPosts((prev) => {
        // Prevent duplicates
        const existingIds = new Set(prev.map(p => p._id));
        const filteredNew = newPosts.filter(p => !existingIds.has(p._id));
        return pageNum === 1 ? newPosts : [...prev, ...filteredNew];
      });
      
      if (pagination) {
        setHasMore(pageNum < pagination.pages);
      } else {
        setHasMore(newPosts.length === 6);
      }
    } catch {
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (clubId) {
      setPage(1);
      fetchPosts(1);
    }
  }, [clubId]);

  const lastElementRef = useCallback((node) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchPosts(nextPage);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore, page]);

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-4">
      {/* Header */}
      <div className="flex flex-col items-center text-center space-y-2 mb-8">
        <LayoutList className="w-10 h-10 mb-2" style={{ color: "var(--club-primary)" }} />
        <h1 className="text-3xl font-bold" style={{ color: "var(--club-text-main)" }}>
          Club News & Updates
        </h1>
        <p className="text-gray-500 max-w-lg">
          Stay up to date with the latest announcements, match reports, and stories from {club?.name}.
        </p>
      </div>

      {/* Feed */}
      <div className="space-y-8">
        {posts.map((post, i) => (
          <motion.article
            key={post._id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ delay: i * 0.05 }}
            className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
          >
            {/* Header (Insta-like style) */}
            <div className="p-4 flex items-center gap-3 border-b border-slate-50">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 border border-slate-200">
                <img src={club?.logo} alt={club?.name} className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="font-bold text-sm" style={{ color: "var(--club-text-main)" }}>
                  {club?.name}
                </h3>
                <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                  <Calendar className="w-3 h-3" />
                  {new Date(post.createdAt).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
              </div>
            </div>

            {/* Image Content */}
            {post.imageUrl && (
              <div className="aspect-[4/5] sm:aspect-[16/9] overflow-hidden bg-slate-50">
                <img
                  src={post.imageUrl}
                  alt=""
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            {/* Body */}
            <div className="p-5 space-y-3">
              <h4 className="font-bold text-lg" style={{ color: "var(--club-text-main)" }}>
                {post.title}
              </h4>
              {post.description && (
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {post.description}
                </p>
              )}
            </div>
          </motion.article>
        ))}

        {!posts.length && !loading && (
          <div className="text-center py-20 text-gray-500">
            No posts available yet.
          </div>
        )}

        {/* Infinite Scroll trigger element */}
        <div ref={lastElementRef} className="py-4 flex justify-center">
          {loading && (
            <div className="flex items-center gap-2 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-medium">Loading more news...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
