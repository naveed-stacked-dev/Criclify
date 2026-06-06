// import { useState, useEffect, useRef } from "react";
// import { motion } from "framer-motion";
// import { Trophy, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
// import { useNavigate } from "react-router-dom";
// import clubService from "../services/clubService";

// /**
//  * RecentMatchesCarousel — Horizontal scroll of recently completed matches.
//  */
// export default function RecentMatchesCarousel({ clubId }) {
//   const [matches, setMatches] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const scrollRef = useRef(null);

//   useEffect(() => {
//     if (!clubId) return;
//     const fetch = async () => {
//       try {
//         const res = await clubService.getRecentMatches(clubId, 12);
//         const allMatches = res.data?.data || [];
//         // Only show matches that actually have a result summary/winner
//         const fullyCompleted = allMatches.filter(m => m.result?.summary || m.result?.winner);
//         setMatches(fullyCompleted);
//       } catch { /* handled */ }
//       finally { setLoading(false); }
//     };
//     fetch();
//   }, [clubId]);

//   const scroll = (dir) => {
//     if (!scrollRef.current) return;
//     const container = scrollRef.current;
//     const card = container.querySelector(".glass-card");
//     const scrollAmount = card ? card.offsetWidth + 16 : 320;

//     // We rely on 'scroll-smooth' class in CSS to make this smooth
//     container.scrollLeft += dir * scrollAmount;
//   };

//   if (loading) {
//     return (
//       <div className="flex gap-4 overflow-hidden">
//         {[1, 2, 3, 4].map((i) => (
//           <div key={i} className="skeleton min-w-[300px] h-[130px] rounded-2xl flex-shrink-0" />
//         ))}
//       </div>
//     );
//   }

//   if (!matches.length) return null;

//   return (
//     <div className="relative group">
//       {/* Scroll Buttons */}
//       <button
//         onClick={() => scroll(-1)}
//         className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10"
//       >
//         <ChevronLeft className="w-5 h-5" />
//       </button>
//       <button
//         onClick={() => scroll(1)}
//         className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10"
//       >
//         <ChevronRight className="w-5 h-5" />
//       </button>

//       {/* Scrollable Container */}
//       <div
//         ref={scrollRef}
//         className="flex gap-4 overflow-x-auto pb-2 club-scroll scroll-smooth"
//         style={{ scrollbarWidth: "none", scrollBehavior: "smooth" }}
//       >
//         {matches.map((match, i) => (
//           <MatchCard key={match._id || i} match={match} index={i} />
//         ))}
//       </div>
//     </div>
//   );
// }

// function MatchCard({ match, index }) {
//   const navigate = useNavigate();
//   const teamA = match.teamA || {};
//   const teamB = match.teamB || {};
//   const winner = match.result?.winner;
//   const winnerId = (winner && typeof winner === "object") ? winner._id : winner;

//   return (
//     <motion.div
//       initial={{ opacity: 0, x: 30 }}
//       animate={{ opacity: 1, x: 0 }}
//       transition={{ delay: index * 0.05 }}
//       onClick={() => navigate(`/matches/${match._id || match.id}`)}
//       className="glass-card min-w-[300px] max-w-[320px] p-4 relative flex-shrink-0 cursor-pointer hover:shadow-lg hover:border-white/20 hover:scale-[1.01] transition-all duration-300 overflow-hidden"
//     >
//       {/* Top Border Accent (Portal Secondary Color) */}
//       <div
//         className="absolute top-0 left-0 right-0 h-1"
//         style={{ backgroundColor: "var(--club-secondary)" }}
//       />
//       {/* Tournament Name + Date */}
//       <div className="flex items-center justify-between mb-3">
//         <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider truncate max-w-[180px]">
//           {match.tournamentId?.name || "Tournament"}
//         </span>
//         <span className="flex items-center gap-1 text-[10px] text-gray-500">
//           <Calendar className="w-3 h-3" />
//           {match.endTime ? new Date(match.endTime).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
//         </span>
//       </div>

//       {/* Teams */}
//       <div className="flex items-center gap-3">
//         {/* Team A */}
//         <div className="flex-1 flex items-center gap-2">
//           <TeamLogo team={teamA} />
//           <div className="min-w-0">
//             <p className={`text-sm font-bold truncate ${winnerId === (teamA._id || teamA.id) ? "text-white" : "text-gray-400"}`}>
//               {teamA.name || "TBA"}
//             </p>
//           </div>
//         </div>

//         {/* VS */}
//         <div className="text-xs font-bold text-gray-600 px-1">vs</div>

//         {/* Team B */}
//         <div className="flex-1 flex items-center gap-2 justify-end text-right">
//           <div className="min-w-0">
//             <p className={`text-sm font-bold truncate ${winnerId === (teamB._id || teamB.id) ? "text-white" : "text-gray-400"}`}>
//               {teamB.name || "TBA"}
//             </p>
//           </div>
//           <TeamLogo team={teamB} />
//         </div>
//       </div>

//       {/* Result */}
//       {(match.result?.summary || winnerId) && (
//         <div className="mt-3 pt-2 border-t border-white/5">
//           <p
//             className="text-[11px] font-medium truncate px-2 py-1 rounded-lg text-center"
//             style={{
//               background: `color-mix(in srgb, var(--club-secondary) 15%, transparent)`,
//               color: "var(--club-secondary)",
//             }}
//           >
//             {match.result?.summary || 
//               (winnerId === (teamA._id || teamA.id) ? `${teamA.name} won` : 
//                winnerId === (teamB._id || teamB.id) ? `${teamB.name} won` : 
//                'Match Completed')}
//           </p>
//         </div>
//       )}
//     </motion.div>
//   );
// }

// function TeamLogo({ team }) {
//   return team?.logo ? (
//     <img src={team.logo} alt={team.name} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
//   ) : (
//     <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
//       <Trophy className="w-4 h-4 text-gray-600" />
//     </div>
//   );
// }

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Trophy, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import clubService from "../services/clubService";
import { encodeId } from "../../utils/crypto";

/**
 * RecentMatchesCarousel
 * - Infinite smooth auto-scroll
 * - Pause on hover
 * - Manual controls
 * - Same UI preserved
 */

export default function RecentMatchesCarousel({ clubId }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const scrollRef = useRef(null);
  const scrollTimeoutRef = useRef(null);

  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!clubId) return;

    const fetch = async () => {
      try {
        const res = await clubService.getRecentMatches(clubId, 12);

        const allMatches = res.data?.data || [];

        // Only completed matches
        const fullyCompleted = allMatches.filter(
          (m) => m.result?.summary || m.result?.winner
        );

        // Duplicate for infinite loop
        setMatches([...fullyCompleted, ...fullyCompleted]);
      } catch {
        /* handled */
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [clubId]);

  /**
   * Smooth infinite auto-scroll
   */
  useEffect(() => {
    const el = scrollRef.current;

    if (!el || matches.length === 0) return;

    let animationFrameId;

    const speed = 0.45;
    let currentScroll = el.scrollLeft;

    const autoScroll = () => {
      if (!isPaused) {
        currentScroll += speed;

        // infinite reset
        if (currentScroll >= el.scrollWidth / 2) {
          currentScroll = 0;
        }

        el.scrollLeft = currentScroll;

        // sync manual scroll
        if (Math.abs(el.scrollLeft - currentScroll) > 2) {
          currentScroll = el.scrollLeft;
        }
      }

      animationFrameId = requestAnimationFrame(autoScroll);
    };

    animationFrameId = requestAnimationFrame(autoScroll);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [matches, isPaused]);

  /**
   * Manual scroll buttons
   */
  const scroll = (dir) => {
    if (!scrollRef.current) return;

    setIsPaused(true);

    scrollRef.current.scrollBy({
      left: dir * 320,
      behavior: "smooth",
    });

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      setIsPaused(false);
    }, 2500);
  };

  if (loading) {
    return (
      <div className="flex gap-4 overflow-hidden">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="skeleton min-w-[300px] h-[130px] rounded-2xl flex-shrink-0"
          />
        ))}
      </div>
    );
  }

  if (!matches.length) return null;

  return (
    <div
      className="relative group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Left Button */}
      <button
        onClick={() => scroll(-1)}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {/* Right Button */}
      <button
        onClick={() => scroll(1)}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Scrollable */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-2 club-scroll"
        style={{
          scrollbarWidth: "none",
        }}
      >
        {matches.map((match, i) => (
          <MatchCard key={`${match._id}-${i}`} match={match} index={i} />
        ))}
      </div>
    </div>
  );
}

function MatchCard({ match, index }) {
  const navigate = useNavigate();
  const { slug } = useParams();

  const teamA = match.teamA || {};
  const teamB = match.teamB || {};

  const winner = match.result?.winner;

  const winnerId =
    winner && typeof winner === "object" ? winner._id : winner;

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={() => navigate(`/clubs/${slug}/matches/${match.slug || encodeId(match._id || match.id)}`)}
      className="glass-card min-w-[300px] max-w-[320px] p-4 relative flex-shrink-0 cursor-pointer hover:shadow-lg hover:border-white/20 hover:scale-[1.01] transition-all duration-300 overflow-hidden"
    >
      {/* Top Accent */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ backgroundColor: "var(--club-secondary)" }}
      />

      {/* Tournament + Date */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider truncate max-w-[180px]">
          {match.tournamentId?.name || "Tournament"}
        </span>

        <span className="flex items-center gap-1 text-[10px] text-gray-500">
          <Calendar className="w-3 h-3" />

          {match.endTime
            ? new Date(match.endTime).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            : ""}
        </span>
      </div>

      {/* Teams */}
      <div className="flex items-center gap-3">
        {/* Team A */}
        <div className="flex-1 flex items-center gap-2">
          <TeamLogo team={teamA} />

          <div className="min-w-0">
            <p
              className={`text-sm font-bold truncate ${
                winnerId === (teamA._id || teamA.id)
                  ? "text-white"
                  : "text-gray-400"
              }`}
            >
              {teamA.name || "TBA"}
            </p>
          </div>
        </div>

        {/* VS */}
        <div className="text-xs font-bold text-gray-600 px-1">vs</div>

        {/* Team B */}
        <div className="flex-1 flex items-center gap-2 justify-end text-right">
          <div className="min-w-0">
            <p
              className={`text-sm font-bold truncate ${
                winnerId === (teamB._id || teamB.id)
                  ? "text-white"
                  : "text-gray-400"
              }`}
            >
              {teamB.name || "TBA"}
            </p>
          </div>

          <TeamLogo team={teamB} />
        </div>
      </div>

      {/* Result */}
      {(match.result?.summary || winnerId) && (
        <div className="mt-3 pt-2 border-t border-white/5">
          <p
            className="text-[11px] font-medium truncate px-2 py-1 rounded-lg text-center"
            style={{
              background: `color-mix(in srgb, var(--club-secondary) 15%, transparent)`,
              color: "var(--club-secondary)",
            }}
          >
            {match.result?.summary ||
              (winnerId === (teamA._id || teamA.id)
                ? `${teamA.name} won`
                : winnerId === (teamB._id || teamB.id)
                ? `${teamB.name} won`
                : "Match Completed")}
          </p>
        </div>
      )}
    </motion.div>
  );
}

function TeamLogo({ team }) {
  return team?.logo ? (
    <img
      src={team.logo}
      alt={team.name}
      className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
    />
  ) : (
    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
      <Trophy className="w-4 h-4 text-gray-600" />
    </div>
  );
}