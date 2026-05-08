import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import { UserCircle, Search } from "lucide-react";
import clubService from "../services/clubService";

/**
 * ClubPlayersPage — Player directory and stats.
 */
export default function ClubPlayersPage() {
  const { club } = useOutletContext();
  const clubId = club?._id || club?.id;
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!clubId) return;
    const fetch = async () => {
      try {
        const res = await clubService.getPlayersByClub(clubId, { limit: 100 });
        setPlayers(res.data?.data || []);
      } catch { /* handled */ }
      finally { setLoading(false); }
    };
    fetch();
  }, [clubId]);

  const filtered = search
    ? players.filter((p) => p.name?.toLowerCase().includes(search.toLowerCase()))
    : players;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <UserCircle className="w-5 h-5" style={{ color: "var(--club-primary)" }} />
          Players
        </h2>
        <p className="text-sm text-gray-500 mt-1">{players.length} players in {club?.name}</p>
      </motion.div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          placeholder="Search players..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/20 transition-colors"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-surface p-12 text-center">
          <UserCircle className="w-12 h-12 mx-auto mb-3 text-gray-700" />
          <p className="text-gray-500">{search ? "No players match your search" : "No players registered yet"}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((player, i) => (
            <motion.div
              key={player._id || player.id || i}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="glass-card p-4 flex items-center gap-3"
            >
              {/* Avatar */}
              {player.photo || player.avatar ? (
                <img
                  src={player.photo || player.avatar}
                  alt={player.name}
                  className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-white/10"
                />
              ) : (
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border border-white/10"
                  style={{ background: `var(--club-primary)10` }}
                >
                  <span className="text-lg font-bold" style={{ color: "var(--club-primary)" }}>
                    {(player.name || "P")[0]}
                  </span>
                </div>
              )}

              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-white truncate">{player.name}</h3>
                <p className="text-[11px] text-gray-500 capitalize truncate">
                  {player.role || player.battingStyle || "Player"}
                </p>
                {player.teamId?.name && (
                  <p className="text-[10px] text-gray-600 truncate mt-0.5">{player.teamId.name}</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
