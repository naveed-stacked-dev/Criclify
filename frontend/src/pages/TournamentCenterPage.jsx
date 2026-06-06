import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import publicService from "@/services/publicService";
import { Swords, Calendar, Loader2, Trophy } from "lucide-react";
import { encodeId } from "@/utils/crypto";

export default function TournamentCenterPage() {
  const { id } = useParams();
  const [tournament, setTournament] = useState(null);
  const [pointsTable, setPointsTable] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("standings");

  useEffect(() => {
    const fetch = async () => {
      try {
        const [tRes, ptRes, mRes] = await Promise.allSettled([
          publicService.getTournament(id),
          publicService.getPointsTable(id),
          publicService.getMatches({ tournament: id }),
        ]);

        if (tRes.status === "fulfilled") setTournament(tRes.value.data?.data || tRes.value.data);
        if (ptRes.status === "fulfilled") setPointsTable(ptRes.value.data?.data || ptRes.value.data || []);
        if (mRes.status === "fulfilled") {
          const md = mRes.value.data?.data || mRes.value.data?.matches || mRes.value.data || [];
          setMatches(Array.isArray(md) ? md : []);
        }
      } catch { /* handled */ }
      finally { setLoading(false); }
    };
    fetch();
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>;

  if (!tournament) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-gray-500">
        <Swords className="w-16 h-16 mb-4 opacity-20" />
        <p className="text-lg">Tournament not found</p>
      </div>
    );
  }

  const tabs = [
    { key: "standings", label: "Standings" },
    { key: "fixtures", label: "Fixtures & Results" },
  ];

  return (
    <div className="min-h-screen pt-28 pb-20 px-4 sm:px-6 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium mb-4 capitalize">
          {tournament.format?.replace("-", " ") || "Tournament"}
        </span>
        <h1 className="text-3xl sm:text-4xl font-black">{tournament.name}</h1>
        <p className="text-gray-400 mt-2 text-sm">
          {tournament.startDate ? new Date(tournament.startDate).toLocaleDateString() : "TBD"} — {tournament.endDate ? new Date(tournament.endDate).toLocaleDateString() : "TBD"}
        </p>
      </motion.div>

      {/* Tabs */}
      <div className="flex justify-center gap-1 mb-8 bg-white/5 rounded-xl p-1 max-w-xs mx-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              tab === t.key ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25" : "text-gray-400 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Standings */}
      {tab === "standings" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {pointsTable.length === 0 ? (
            <div className="text-center py-16 border border-white/5 rounded-2xl bg-white/[0.02]">
              <Trophy className="w-12 h-12 mx-auto mb-3 text-gray-600" />
              <p className="text-gray-500 text-sm">Points table not available yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-white/5 rounded-2xl bg-white/[0.02]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-10">#</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Team</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">P</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">W</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">L</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">NRR</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {pointsTable.map((row, idx) => (
                    <tr key={row.teamId || idx} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 text-gray-400 font-medium">{idx + 1}</td>
                      <td className="px-4 py-3 font-semibold text-white">{row.teamName || "Unknown"}</td>
                      <td className="px-4 py-3 text-center text-gray-400">{row.played || 0}</td>
                      <td className="px-4 py-3 text-center text-emerald-400 font-medium">{row.won || 0}</td>
                      <td className="px-4 py-3 text-center text-red-400">{row.lost || 0}</td>
                      <td className="px-4 py-3 text-center font-mono text-xs text-gray-400">{row.nrr?.toFixed(3) || "0.000"}</td>
                      <td className="px-4 py-3 text-right font-bold text-amber-400">{row.points || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      )}

      {/* Fixtures */}
      {tab === "fixtures" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          {matches.length === 0 ? (
            <div className="text-center py-16 border border-white/5 rounded-2xl bg-white/[0.02]">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-600" />
              <p className="text-gray-500 text-sm">No fixtures generated yet</p>
            </div>
          ) : (
            matches.map((m) => (
              <Link
                key={m._id || m.id}
                to={`/matches/${encodeId(m._id || m.id)}`}
                className="group block border border-white/5 rounded-xl bg-white/[0.02] p-4 hover:border-emerald-500/30 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-white text-sm">
                      {m.teamA?.name || "TBA"} <span className="text-gray-500 mx-2">vs</span> {m.teamB?.name || "TBA"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{m.venue || "TBD"} • {m.date ? new Date(m.date).toLocaleDateString() : "TBD"}</p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    m.status === "live" ? "bg-red-500/10 text-red-400 animate-pulse" :
                    m.status === "completed" ? "bg-gray-500/10 text-gray-400" :
                    "bg-emerald-500/10 text-emerald-400"
                  }`}>
                    {m.status === "live" ? "LIVE" : m.status || "Scheduled"}
                  </span>
                </div>
              </Link>
            ))
          )}
        </motion.div>
      )}
    </div>
  );
}
