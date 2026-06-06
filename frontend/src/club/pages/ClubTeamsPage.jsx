import { useState, useEffect, useMemo, useRef } from "react";
import { useOutletContext, Link, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useLenis } from "lenis/react";
import { Users, ChevronRight, Plus, X, UserPlus, CheckCircle, Loader, AlertCircle, Info, Pencil, Trash2 } from "lucide-react";
import clubService from "../services/clubService";
import ImagePicker from "../components/ImagePicker";

const ROLES = [
  { value: "batsman", label: "Batsman" },
  { value: "bowler", label: "Bowler" },
  { value: "allrounder", label: "All-rounder" },
  { value: "wicketkeeper", label: "Wicketkeeper" },
];

const BATTING_STYLES = [
  { value: "right-hand", label: "Right-hand" },
  { value: "left-hand", label: "Left-hand" },
];

const BOWLING_STYLES = [
  "right-arm fast", "right-arm medium-fast", "right-arm medium",
  "right-arm off-spin", "right-arm leg-spin",
  "left-arm fast", "left-arm medium-fast", "left-arm medium",
  "left-arm orthodox", "left-arm chinaman",
];

const EMPTY_PLAYER = { name: "", role: "batsman", jerseyNumber: "", phone: "", battingStyle: "right-hand", bowlingStyle: "", photoFile: null };

const showsBatting = (role) => ["batsman", "allrounder", "wicketkeeper"].includes(role);
const showsBowling = (role) => ["bowler", "allrounder"].includes(role);

const fieldCls = "w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 bg-white outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition";
const labelCls = "text-sm font-medium text-slate-700";

/** A single added-player row with a photo preview. */
function PlayerRow({ player, onEdit, onRemove }) {
  const avatar = useMemo(
    () => (player.photoFile instanceof File ? URL.createObjectURL(player.photoFile) : null),
    [player.photoFile]
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100"
    >
      {avatar ? (
        <img src={avatar} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
      ) : (
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-white" style={{ backgroundColor: "var(--club-primary)" }}>
          {(player.name || "?")[0].toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900 truncate">{player.name}</p>
        <p className="text-[11px] text-slate-500 capitalize">
          {ROLES.find((r) => r.value === player.role)?.label || player.role}
          {player.jerseyNumber ? ` · #${player.jerseyNumber}` : ""}
        </p>
      </div>
      <button onClick={() => onEdit(player)} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-colors shrink-0">
        <Pencil className="w-3.5 h-3.5" />
      </button>
      <button onClick={() => onRemove(player._key)} className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-50 transition-colors shrink-0">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}

export default function ClubTeamsPage() {
  const { club } = useOutletContext();
  const { slug } = useParams();
  const clubId = club?._id || club?.id;

  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [teamForm, setTeamForm] = useState({ name: "" });
  const [teamLogo, setTeamLogo] = useState(null);
  const [teamError, setTeamError] = useState("");
  const [players, setPlayers] = useState([]);

  // Inline player form
  const [showPlayerForm, setShowPlayerForm] = useState(false);
  const [editingKey, setEditingKey] = useState(null);
  const [playerForm, setPlayerForm] = useState(EMPTY_PLAYER);
  const [playerError, setPlayerError] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState(false);

  const playerFormRef = useRef(null);
  const lenis = useLenis();

  // Freeze the background (Lenis smooth-scroll + native document scroll) while the modal is open
  useEffect(() => {
    if (!showModal) return;
    lenis?.stop();
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      lenis?.start();
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, [showModal, lenis]);

  // Scroll the inline player form into view when it opens (add or edit)
  useEffect(() => {
    if (showPlayerForm) {
      const t = setTimeout(() => {
        playerFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 120);
      return () => clearTimeout(t);
    }
  }, [showPlayerForm, editingKey]);

  useEffect(() => {
    if (!clubId) return;
    const load = async () => {
      try {
        const res = await clubService.getTeamsByClub(clubId, { limit: 50 });
        setTeams(res.data?.data || []);
      } catch { /* handled */ } finally { setLoading(false); }
    };
    load();
  }, [clubId]);

  const resetModal = () => {
    setTeamForm({ name: "" });
    setTeamLogo(null);
    setTeamError("");
    setPlayers([]);
    setShowPlayerForm(false);
    setEditingKey(null);
    setPlayerForm(EMPTY_PLAYER);
    setPlayerError("");
    setSubmitError("");
    setSuccess(false);
  };

  const openModal = () => { resetModal(); setShowModal(true); };
  const closeModal = () => { if (!submitting) setShowModal(false); };

  const openAddPlayer = () => {
    setEditingKey(null);
    setPlayerForm(EMPTY_PLAYER);
    setPlayerError("");
    setShowPlayerForm(true);
  };

  const openEditPlayer = (p) => {
    setEditingKey(p._key);
    setPlayerForm({ ...p });
    setPlayerError("");
    setShowPlayerForm(true);
  };

  const validatePlayer = () => {
    if (!playerForm.name.trim()) return "Player name is required";
    if (!playerForm.role) return "Player role is required";
    if (!playerForm.jerseyNumber.trim()) return "Jersey number is required";
    if (!playerForm.phone.trim()) return "Phone number is required";
    if (!/^[\d+]{7,15}$/.test(playerForm.phone.trim())) return "Enter a valid phone (7–15 digits)";
    if (showsBatting(playerForm.role) && !playerForm.battingStyle) return "Batting style is required";
    if (showsBowling(playerForm.role) && !playerForm.bowlingStyle) return "Bowling style is required";
    if (!playerForm.photoFile) return "Player photo is required";
    return "";
  };

  const savePlayer = () => {
    const err = validatePlayer();
    if (err) return setPlayerError(err);

    // strip styles that don't apply to the role
    const clean = {
      ...playerForm,
      battingStyle: showsBatting(playerForm.role) ? playerForm.battingStyle : "",
      bowlingStyle: showsBowling(playerForm.role) ? playerForm.bowlingStyle : "",
    };

    if (editingKey) {
      setPlayers((prev) => prev.map((p) => (p._key === editingKey ? { ...clean, _key: editingKey } : p)));
    } else {
      if (players.length >= 35) return setPlayerError("Maximum 35 players allowed");
      setPlayers((prev) => [...prev, { ...clean, _key: Date.now() }]);
    }
    setShowPlayerForm(false);
    setEditingKey(null);
    setPlayerForm(EMPTY_PLAYER);
    setPlayerError("");
  };

  const removePlayer = (key) => setPlayers((prev) => prev.filter((p) => p._key !== key));

  const handleSubmit = async () => {
    setSubmitError("");
    setTeamError("");
    if (!teamForm.name.trim()) return setTeamError("Team name is required");
    if (players.length < 12) return setSubmitError(`Minimum 12 players required. You have added ${players.length}.`);

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("clubId", clubId);
      fd.append("name", teamForm.name.trim());
      if (teamLogo instanceof File) fd.append("logo", teamLogo);

      const meta = players.map((p) => {
        const m = { name: p.name.trim(), role: p.role, jerseyNumber: p.jerseyNumber.trim(), phone: p.phone.trim() };
        if (showsBatting(p.role) && p.battingStyle) m.battingStyle = p.battingStyle;
        if (showsBowling(p.role) && p.bowlingStyle) m.bowlingStyle = p.bowlingStyle;
        return m;
      });
      fd.append("players", JSON.stringify(meta));

      players.forEach((p, i) => {
        if (p.photoFile instanceof File) fd.append(`playerPhoto_${i}`, p.photoFile);
      });

      await clubService.submitTeam(fd);
      setSuccess(true);
    } catch (err) {
      setSubmitError(err.response?.data?.message || "Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const meetsMinimum = players.length >= 12;
  const progressPct = Math.min((players.length / 35) * 100, 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: "var(--club-text-main)" }}>
            <Users className="w-5 h-5" style={{ color: "var(--club-primary)" }} />
            Teams
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--club-text-muted)" }}>
            {teams.length} team{teams.length !== 1 ? "s" : ""} registered
          </p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md transition-transform hover:scale-105 active:scale-95"
          style={{ backgroundColor: "var(--club-primary)" }}
        >
          <Plus className="w-4 h-4" />
          Register Team
        </button>
      </motion.div>

      {/* Teams Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-36 rounded-2xl" />)}
        </div>
      ) : teams.length === 0 ? (
        <div className="glass-surface p-12 text-center">
          <Users className="w-12 h-12 mx-auto mb-3 text-gray-700" />
          <p className="text-gray-500 font-medium">No teams registered yet</p>
          <p className="text-sm text-gray-400 mt-1">Be the first to register your team!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {teams.map((team, i) => (
            <motion.div
              key={team._id || team.id || i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              whileHover={{ scale: 1.03 }}
              className="cursor-pointer"
            >
              <Link to={`/clubs/${slug}/teams/${team._id}`} className="block h-full">
                <div className="glass-card p-5 h-full flex flex-col items-center text-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r from-transparent via-slate-200 to-transparent opacity-50" />
                  {team.logo ? (
                    <img src={team.logo} alt={team.name} className="w-16 h-16 rounded-2xl object-cover mb-3 border border-slate-100 shadow-sm" />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl mb-3 flex items-center justify-center border border-slate-100" style={{ background: "var(--club-primary)10" }}>
                      <span className="text-xl font-black" style={{ color: "var(--club-primary)" }}>
                        {(team.name || "T")[0]}
                      </span>
                    </div>
                  )}
                  <h3 className="text-sm font-bold truncate w-full" style={{ color: "var(--club-text-main)" }}>{team.name}</h3>
                  {team.playerCount != null && (
                    <p className="text-[11px] mt-1 font-medium" style={{ color: "var(--club-text-muted)" }}>
                      {team.playerCount} player{team.playerCount !== 1 ? "s" : ""}
                    </p>
                  )}
                  <div className="mt-4 pt-3 border-t border-slate-50 w-full flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--club-primary)" }}>
                    View Details <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Registration Modal ── */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            data-lenis-prevent
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)" }}
            onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 16 }}
              className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col overflow-hidden"
              style={{ maxHeight: "92vh" }}
              onClick={(e) => e.stopPropagation()}
            >
              {success ? (
                <div className="p-10 text-center flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: "var(--club-primary)20" }}>
                    <CheckCircle className="w-8 h-8" style={{ color: "var(--club-primary)" }} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Registration Submitted!</h3>
                    <p className="text-sm mt-2 leading-relaxed text-slate-500">
                      <strong className="text-slate-900">{teamForm.name}</strong> has been submitted with{" "}
                      <strong className="text-slate-900">{players.length} players</strong>.
                      It will appear here once the club manager approves it.
                    </p>
                  </div>
                  <button onClick={() => setShowModal(false)} className="mt-2 px-8 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: "var(--club-primary)" }}>
                    Done
                  </button>
                </div>
              ) : (
                <>
                  {/* Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                    <div>
                      <h3 className="font-bold text-lg text-slate-900">Register Your Team</h3>
                      <p className="text-xs mt-0.5 text-slate-500">Enter team details, then add your players</p>
                    </div>
                    <button onClick={closeModal} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Body — data-lenis-prevent lets this scroll natively despite the global Lenis smooth-scroll */}
                  <div data-lenis-prevent className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-5 space-y-6">
                    {/* ── Team Details ── */}
                    <section className="space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Team Details</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px] gap-4">
                        <div className="space-y-1.5">
                          <label className={labelCls}>Team Name <span className="text-red-500">*</span></label>
                          <input
                            className={fieldCls}
                            type="text"
                            value={teamForm.name}
                            onChange={(e) => { setTeamForm({ name: e.target.value }); setTeamError(""); }}
                            placeholder="e.g. Thunder Kings"
                          />
                          <p className="text-xs text-slate-400 pt-1">This is how your team appears across the club portal.</p>
                        </div>
                        <div className="space-y-1.5">
                          <label className={labelCls}>Team Logo</label>
                          <ImagePicker value={teamLogo} onChange={setTeamLogo} height="h-28" />
                        </div>
                      </div>
                      {teamError && (
                        <p className="text-xs flex items-center gap-1.5 text-red-500">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />{teamError}
                        </p>
                      )}
                    </section>

                    <div className="border-t border-slate-100" />

                    {/* ── Players ── */}
                    <section className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Players</h4>
                        <span className={`text-xs font-semibold ${meetsMinimum ? "text-emerald-600" : "text-amber-600"}`}>
                          {players.length} / 35
                        </span>
                      </div>

                      <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-slate-500 leading-relaxed">
                          You must add a <strong className="text-slate-700">minimum of 12 players</strong> to register a team,
                          and can add <strong className="text-slate-700">up to 35 members</strong>. All player fields are required.
                        </p>
                      </div>

                      <div className="h-1.5 rounded-full overflow-hidden bg-slate-100">
                        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progressPct}%`, backgroundColor: meetsMinimum ? "#10b981" : "#f59e0b" }} />
                      </div>

                      {/* Player list */}
                      {players.length > 0 && (
                        <div className="space-y-1.5">
                          {players.map((p) => (
                            <PlayerRow key={p._key} player={p} onEdit={openEditPlayer} onRemove={removePlayer} />
                          ))}
                        </div>
                      )}

                      {/* Inline player form */}
                      <AnimatePresence>
                        {showPlayerForm && (
                          <motion.div ref={playerFormRef} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden scroll-mt-4">
                            <div className="rounded-xl p-4 space-y-3 bg-white border-2" style={{ borderColor: "var(--club-primary)" }}>
                              <p className="text-sm font-bold text-slate-900">{editingKey ? "Edit Player" : "Add Player"}</p>

                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                  <label className="text-xs font-medium text-slate-600">Name <span className="text-red-500">*</span></label>
                                  <input className={fieldCls} type="text" value={playerForm.name} onChange={(e) => setPlayerForm({ ...playerForm, name: e.target.value.replace(/[^a-zA-Z\s'-]/g, "") })} placeholder="Player name" />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-xs font-medium text-slate-600">Role <span className="text-red-500">*</span></label>
                                  <select className={fieldCls} value={playerForm.role} onChange={(e) => setPlayerForm({ ...playerForm, role: e.target.value })}>
                                    {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                                  </select>
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-xs font-medium text-slate-600">Jersey # <span className="text-red-500">*</span></label>
                                  <input className={fieldCls} type="text" value={playerForm.jerseyNumber} onChange={(e) => setPlayerForm({ ...playerForm, jerseyNumber: e.target.value.slice(0, 4) })} placeholder="e.g. 10" />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-xs font-medium text-slate-600">Phone <span className="text-red-500">*</span></label>
                                  <input className={fieldCls} type="tel" value={playerForm.phone} onChange={(e) => setPlayerForm({ ...playerForm, phone: e.target.value.replace(/[^\d+]/g, "") })} placeholder="+91..." />
                                </div>
                                {showsBatting(playerForm.role) && (
                                  <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-slate-600">Batting Style <span className="text-red-500">*</span></label>
                                    <select className={fieldCls} value={playerForm.battingStyle} onChange={(e) => setPlayerForm({ ...playerForm, battingStyle: e.target.value })}>
                                      <option value="">Select style</option>
                                      {BATTING_STYLES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                                    </select>
                                  </div>
                                )}
                                {showsBowling(playerForm.role) && (
                                  <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-slate-600">Bowling Style <span className="text-red-500">*</span></label>
                                    <select className={`${fieldCls} capitalize`} value={playerForm.bowlingStyle} onChange={(e) => setPlayerForm({ ...playerForm, bowlingStyle: e.target.value })}>
                                      <option value="">Select style</option>
                                      {BOWLING_STYLES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
                                    </select>
                                  </div>
                                )}
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-600">Player Photo <span className="text-red-500">*</span></label>
                                <ImagePicker value={playerForm.photoFile} onChange={(file) => setPlayerForm({ ...playerForm, photoFile: file })} height="h-28" />
                              </div>

                              {playerError && (
                                <p className="text-xs flex items-center gap-1.5 text-red-500">
                                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />{playerError}
                                </p>
                              )}

                              <div className="flex gap-2 pt-1">
                                <button onClick={() => { setShowPlayerForm(false); setEditingKey(null); setPlayerError(""); setPlayerForm(EMPTY_PLAYER); }} className="flex-1 py-2 rounded-lg text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                                  Cancel
                                </button>
                                <button onClick={savePlayer} className="flex-1 py-2 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90" style={{ backgroundColor: "var(--club-primary)" }}>
                                  {editingKey ? "Save Changes" : "Add Player"}
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {!showPlayerForm && players.length < 35 && (
                        <button onClick={openAddPlayer} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed text-sm font-semibold transition-all hover:bg-slate-50" style={{ borderColor: "var(--club-primary)", color: "var(--club-primary)" }}>
                          <UserPlus className="w-4 h-4" />
                          Add Player
                        </button>
                      )}

                      {submitError && (
                        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100">
                          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                          <p className="text-xs text-red-600">{submitError}</p>
                        </div>
                      )}
                    </section>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-100 shrink-0">
                    <button onClick={closeModal} disabled={submitting} className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50">
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={submitting || players.length < 12}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      style={{ backgroundColor: "var(--club-primary)" }}
                    >
                      {submitting ? (
                        <><Loader className="w-4 h-4 animate-spin" /> Submitting…</>
                      ) : (
                        `Submit Registration${players.length < 12 ? ` (${12 - players.length} more)` : ""}`
                      )}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
