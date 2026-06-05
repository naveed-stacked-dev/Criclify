import { useEffect } from "react";
import { Outlet, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import useClubData from "../hooks/useClubData";
import ClubHero from "../components/ClubHero";
import ClubNavbar from "../components/ClubNavbar";
import "../styles/glassmorphism.css";

/**
 * ClubLayout wraps all /clubs/:slug/* pages.
 * Fetches club data, injects dynamic theme CSS vars, and renders hero + navbar + outlet.
 */
export default function ClubLayout() {
  const { slug } = useParams();
  const { club, tournaments, loading, error } = useClubData(slug);

  // Inject dynamic theme CSS variables
  useEffect(() => {
    if (!club) return;

    const root = document.documentElement;
    const primary = club.theme?.primaryColor || "#1a73e8";
    const secondary = club.theme?.secondaryColor || "#ffffff";
    const accent = club.themeColor || "#7c3aed";

    root.style.setProperty("--club-primary", primary);
    root.style.setProperty("--club-secondary", secondary);
    root.style.setProperty("--club-accent", accent);

    return () => {
      root.style.removeProperty("--club-primary");
      root.style.removeProperty("--club-secondary");
      root.style.removeProperty("--club-accent");
    };
  }, [club]);

  const template = club?.theme?.template || "classic";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--club-bg)" }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="w-10 h-10 animate-spin" style={{ color: "var(--club-accent)" }} />
          <p className="text-sm text-gray-400">Loading club...</p>
        </motion.div>
      </div>
    );
  }

  if (error || !club) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-gray-400 px-4" style={{ backgroundColor: "var(--club-bg)" }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-white/5 flex items-center justify-center">
            <span className="text-3xl">🏏</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Club Not Found</h2>
          <p className="text-sm text-gray-500 mb-6">{error || "The club you're looking for doesn't exist."}</p>
          <a href="/clubs" className="glow-btn inline-block">← Back to Clubs</a>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen transition-colors duration-500"
      data-theme={template}
      style={{ backgroundColor: "var(--club-bg)", color: "var(--club-text-main)" }}
    >
      <ClubHero club={club} tournaments={tournaments} />
      <ClubNavbar club={club} />
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20">
        <Outlet context={{ club, tournaments }} />
      </main>
    </div>
  );
}
