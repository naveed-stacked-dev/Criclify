import { useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import RecentMatchesCarousel from "../components/RecentMatchesCarousel";
import TournamentOverview from "../components/TournamentOverview";
import LiveMatchesPanel from "../components/LiveMatchesPanel";
import LiveScoreWidget from "../components/LiveScoreWidget";
import SponsorsSlider from "../components/SponsorsSlider";
import ClubPosts from "../components/ClubPosts";
import ClubGallery from "../components/ClubGallery";
import useLiveMatches from "../hooks/useLiveMatches";

/**
 * ClubHomePage — The dynamic dashboard for the club.
 *
 * Layout:
 *   [Recent Matches Horizontal Scroll]
 *   [Live Score Widgets (if live matches)]
 *   [Left 60% - Tournament Overview] [Right 40% - Live/Results/Schedule]
 *   [Sponsors Slider]
 *   [Left 30% - Posts] [Right 70% - Gallery]
 */
export default function ClubHomePage() {
  const { club, tournaments } = useOutletContext();
  const clubId = club?._id || club?.id;
  const { liveMatches, liveSummaries, loading: liveLoading, animationEvent } = useLiveMatches(clubId);

  return (
    <div className="space-y-6">
      {/* ─── Recent Matches Carousel ─── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Recent Matches
        </h2>
        <RecentMatchesCarousel clubId={clubId} />
      </motion.section>

      {/* ─── Live Score Widgets ─── */}
      {liveMatches.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            🔴 Live Scoring
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {liveMatches.map((match) => (
              <LiveScoreWidget
                key={match._id || match.id}
                match={match}
                summary={liveSummaries[match._id || match.id]}
                animationEvent={
                  animationEvent?.matchId === (match._id || match.id)
                    ? animationEvent
                    : null
                }
              />
            ))}
          </div>
        </motion.section>
      )}

      {/* ─── Main Grid: Left 60% + Right 40% ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.66fr] gap-6">
        {/* Left — Tournament Overview */}
        <motion.section
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Tournament Overview
          </h2>
          <TournamentOverview clubId={clubId} tournaments={tournaments} />
        </motion.section>

        {/* Right — Live / Results / Schedule */}
        <motion.section
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Match Center
          </h2>
          <LiveMatchesPanel clubId={clubId} liveMatches={liveMatches} liveSummaries={liveSummaries} liveLoading={liveLoading} />
        </motion.section>
      </div>

      {/* ─── Sponsors Slider ─── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <SponsorsSlider clubId={clubId} />
      </motion.section>

      {/* ─── Posts (30%) + Gallery (70%) ─── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-[0.25fr_0.6fr] gap-50">
          <ClubPosts clubId={clubId} />
          <ClubGallery clubId={clubId} />
        </div>
      </motion.section>
    </div>
  );
}
