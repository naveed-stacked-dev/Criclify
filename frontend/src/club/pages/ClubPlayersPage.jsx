import { useState, useEffect } from "react";
import { useOutletContext, useSearchParams, Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { UserCircle, Search, Users, ChevronDown } from "lucide-react";
import clubService from "../services/clubService";

/**
 * ClubPlayersPage — Player directory and stats.
 */
export default function ClubPlayersPage() {
  const { club } = useOutletContext();
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const clubId = club?._id || club?.id;

  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Team filter state synced with URL
  const [selectedTeamId, setSelectedTeamId] = useState(searchParams.get("teamId") || "all");

  useEffect(() => {
    if (!clubId) return;
    const fetch = async () => {
      try {
        const [pRes, tRes] = await Promise.all([
          clubService.getPlayersByClub(clubId, { limit: 200 }),
          clubService.getTeamsByClub(clubId, { limit: 100 })
        ]);
        setPlayers(pRes.data?.data || []);
        setTeams(tRes.data?.data || []);
      } catch { /* handled */ }
      finally { setLoading(false); }
    };
    fetch();
  }, [clubId]);

  useEffect(() => {
    const tid = searchParams.get("teamId") || "all";
    setSelectedTeamId(tid);
  }, [searchParams]);

  const handleTeamChange = (tid) => {
    setSelectedTeamId(tid);
    const newParams = new URLSearchParams(searchParams);
    if (tid === "all") {
      newParams.delete("teamId");
    } else {
      newParams.set("teamId", tid);
    }
    setSearchParams(newParams);
  };

  const filtered = players.filter((p) => {
    const matchesSearch = p.name?.toLowerCase().includes(search.toLowerCase());
    const matchesTeam = selectedTeamId === "all" || (p.teamId?._id || p.teamId) === selectedTeamId;
    return matchesSearch && matchesTeam;
  });

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: "var(--club-text-main)" }}>
          <UserCircle className="w-5 h-5" style={{ color: "var(--club-primary)" }} />
          Players
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--club-text-muted)" }}>{players.length} players in {club?.name}</p>
      </motion.div>

      {/* Search & Filter */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search players..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all shadow-sm"
            style={{ color: "var(--club-text-main)" }}
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Filter By Team:</span>
          </div>
          <div className="relative">
            <select
              value={selectedTeamId}
              onChange={(e) => handleTeamChange(e.target.value)}
              className="appearance-none bg-white border border-slate-200 rounded-xl px-4 py-2.5 pr-10 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all cursor-pointer shadow-sm hover:border-slate-300"
              style={{ color: "var(--club-text-main)" }}
            >
              <option value="all">All Teams</option>
              {teams.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>
        </div>
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
              whileHover={{ scale: 1.02 }}
            >
              <Link to={`/clubs/${slug}/players/${player._id || player.id}`} className="glass-card p-4 flex items-center gap-3 block hover:shadow-md transition-all">
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
                <h3 className="text-sm font-semibold truncate" style={{ color: "var(--club-text-main)" }}>{player.name}</h3>
                <p className="text-[11px] text-gray-500 capitalize truncate">
                  {player.role || player.battingStyle || "Player"}
                </p>
                {player.teamId?.name && (
                  <p className="text-[10px] text-gray-600 truncate mt-0.5">{player.teamId.name}</p>
                )}
              </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
