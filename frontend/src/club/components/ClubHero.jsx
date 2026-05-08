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
    <div className="relative overflow-hidden" style={{ height: "20vh", minHeight: "160px" }}>
      {/* Background Image with blur */}
      {bannerUrl ? (
        <img
          src={bannerUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: "blur(4px) brightness(0.35)", transform: "scale(1.05)" }}
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${club?.theme?.primaryColor || "#1a73e8"}22 0%, ${club?.themeColor || "#7c3aed"}22 100%)`,
          }}
        />
      )}

      {/* Dark gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e1a] via-[#0a0e1a]/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a0e1a]/80 via-transparent to-transparent" />

      {/* Content */}
      <div className="relative z-10 h-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex items-end pb-5">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-4 sm:gap-6"
        >
          {/* Club Logo */}
          <div
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 flex-shrink-0 shadow-lg"
            style={{
              borderColor: club?.theme?.primaryColor || "#1a73e8",
              background: "rgba(255,255,255,0.05)",
              backdropFilter: "blur(10px)",
            }}
          >
            {logoUrl ? (
              <img src={logoUrl} alt={club?.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Trophy className="w-8 h-8" style={{ color: club?.theme?.primaryColor || "#1a73e8" }} />
              </div>
            )}
          </div>

          {/* Club Info */}
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight leading-tight">
              {club?.name}
            </h1>
            {club?.description && (
              <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-md line-clamp-1">
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
            <div key={label} className="flex items-center gap-2 text-sm">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: `${club?.theme?.primaryColor || "#1a73e8"}15` }}
              >
                <Icon className="w-4 h-4" style={{ color: club?.theme?.primaryColor || "#1a73e8" }} />
              </div>
              <div>
                <p className="text-white font-bold text-sm leading-none">{value}</p>
                <p className="text-[10px] text-gray-500">{label}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
