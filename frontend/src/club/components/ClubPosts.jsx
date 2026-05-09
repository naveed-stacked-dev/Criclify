import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useOutletContext } from "react-router-dom";
import clubService from "../services/clubService";
import { Calendar, ArrowRight } from "lucide-react";

/**
 * ClubPosts — Left-column news/announcements feed.
 * Displays club posts with optional images in a vertical timeline.
 */
export default function ClubPosts({ clubId }) {
  const { club } = useOutletContext();
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    if (!clubId) return;
    clubService
      .getPosts(clubId)
      .then((res) => setPosts(res.data?.data || []))
      .catch(() => {});
  }, [clubId]);

  if (!posts.length) return null;

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-3 px-1">
        <div
          className="w-1 h-5 rounded-full"
          style={{ background: "var(--club-primary)" }}
        />
        <h2
          className="text-sm font-bold uppercase tracking-[0.15em]"
          style={{ color: "var(--club-text-main)" }}
        >
          News & Updates
        </h2>
      </div>

      {/* Posts List */}
      <div className="space-y-3 relative">
        <div 
          className="max-h-[410px] overflow-y-auto pr-1 space-y-3 club-scroll"
          style={{ overscrollBehavior: "contain" }}
          onWheel={(e) => e.stopPropagation()}
        >
          {posts.slice(0, 4).map((post, i) => (
          <motion.article
            key={post._id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow group flex flex-col"
          >
            {post.imageUrl && (
              <div className="h-32 sm:h-36 overflow-hidden bg-slate-50">
                <img
                  src={post.imageUrl}
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
            )}
            <div className="p-3">
              <h3
                className="font-bold text-sm leading-snug mb-1"
                style={{ color: "var(--club-text-main)" }}
              >
                {post.title}
              </h3>
              {post.description && (
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {post.description}
                </p>
              )}
              <div className="flex items-center gap-1 mt-3 text-[10px] text-slate-400 font-medium">
                <Calendar className="w-3 h-3" />
                {new Date(post.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
            </div>
          </motion.article>
        ))}
        </div>

        {posts.length > 3 && (
          <div className="pt-2">
            <Link
              to={`/clubs/${club?.slug}/posts`}
              className="w-full bg-slate-50 hover:bg-slate-100 text-slate-600 font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors border border-slate-100 shadow-sm"
            >
              See All Updates <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
