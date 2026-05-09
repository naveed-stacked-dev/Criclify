import { motion } from "framer-motion";
import { Trophy, Users, Swords } from "lucide-react";

/**
 * ClubHero — Top banner section (20vh).
 * Club banner as blurred background, logo on left, stats on right.
 */
export default function ClubHero({ club, tournaments = [] }) {
  const bannerUrl = club?.bannerUrl || club?.theme?.bannerUrl;
  const logoUrl = club?.logo || club?.logoUrl;

  // Derive stats from tournaments list already in context
  const tournamentCount = tournaments.length;
  const uniqueTeamIds = new Set(
    tournaments.flatMap((t) => (t.teams || []).map((tm) => tm._id || tm.id || tm))
  );
  const teamCount = uniqueTeamIds.size;

  return (
    <div className="relative overflow-hidden w-full bg-black" style={{ aspectRatio: "1920/350", minHeight: "250px" }}>
      {/* Background Image - Perfectly matches the 1920:350 aspect ratio */}
      {bannerUrl ? (
        <img
          src={bannerUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: "none" }}
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${club?.theme?.primaryColor || "#1a73e8"}22 0%, ${club?.themeColor || "#7c3aed"}22 100%)`,
          }}
        />
      )}

      {/* Content */}
      <div className="absolute inset-0 z-10 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex items-end pb-5 w-full">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-4 sm:gap-6 bg-black/30 backdrop-blur-sm p-3 pr-6 rounded-2xl border border-white/10"
        >
          {/* Club Logo */}
          <div
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden flex-shrink-0 shadow-lg"
            style={{
              background: "rgba(0,0,0,0.4)",
              backdropFilter: "blur(10px)",
            }}
          >
            {logoUrl ? (
              <img src={logoUrl} alt={club?.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Trophy className="w-8 h-8" style={{ color: "#ffffff" }} />
              </div>
            )}
          </div>

          {/* Club Info */}
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight leading-tight text-white drop-shadow-md">
              {club?.name}
            </h1>
            {club?.description && (
              <p className="text-xs sm:text-sm mt-1 max-w-md line-clamp-1 text-white/80 drop-shadow-sm">
                {club.description}
              </p>
            )}
          </div>
        </motion.div>

        {/* Quick Stats — desktop only */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="hidden lg:flex items-center gap-6 ml-auto"
        >
          {[
            { icon: Swords, label: "Tournaments", value: tournamentCount || "–" },
            { icon: Users, label: "Teams", value: teamCount || "–" },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-2 text-sm bg-black/30 backdrop-blur-sm p-2 rounded-xl border border-white/10">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: `rgba(255,255,255,0.1)` }}
              >
                <Icon className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-bold text-sm leading-none text-white">{value}</p>
                <p className="text-[10px] text-white/60">{label}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
