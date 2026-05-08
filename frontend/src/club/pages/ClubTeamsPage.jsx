import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, Trophy } from "lucide-react";
import clubService from "../services/clubService";

/**
 * ClubTeamsPage — Grid of teams belonging to the club.
 */
export default function ClubTeamsPage() {
  const { club } = useOutletContext();
  const clubId = club?._id || club?.id;
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clubId) return;
    const fetch = async () => {
      try {
        const res = await clubService.getTeamsByClub(clubId, { limit: 50 });
        setTeams(res.data?.data || []);
      } catch { /* handled */ }
      finally { setLoading(false); }
    };
    fetch();
  }, [clubId]);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Users className="w-5 h-5" style={{ color: "var(--club-primary)" }} />
          Teams
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {teams.length} team{teams.length !== 1 ? "s" : ""} registered
        </p>
      </motion.div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-36 rounded-2xl" />)}
        </div>
      ) : teams.length === 0 ? (
        <div className="glass-surface p-12 text-center">
          <Users className="w-12 h-12 mx-auto mb-3 text-gray-700" />
          <p className="text-gray-500">No teams registered yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {teams.map((team, i) => (
            <motion.div
              key={team._id || team.id || i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="glass-card p-5 flex flex-col items-center text-center"
            >
              {/* Team Logo */}
              {team.logo ? (
                <img
                  src={team.logo}
                  alt={team.name}
                  className="w-16 h-16 rounded-2xl object-cover mb-3 border border-white/10"
                />
              ) : (
                <div
                  className="w-16 h-16 rounded-2xl mb-3 flex items-center justify-center border border-white/10"
                  style={{ background: `var(--club-primary)10` }}
                >
                  <span className="text-xl font-black" style={{ color: "var(--club-primary)" }}>
                    {(team.name || "T")[0]}
                  </span>
                </div>
              )}

              <h3 className="text-sm font-bold text-white truncate w-full">{team.name}</h3>

              {team.playerCount != null && (
                <p className="text-[11px] text-gray-500 mt-1">
                  {team.playerCount} player{team.playerCount !== 1 ? "s" : ""}
                </p>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
