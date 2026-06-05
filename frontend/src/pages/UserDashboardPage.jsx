import { useState } from "react";
import { motion } from "framer-motion";
import { useAppContext } from "@/hooks/useAppContext";
import authService from "@/services/authService";
import { toast } from "sonner";
import { User, Lock, Loader2, LogOut, Mail, Phone, Shield } from "lucide-react";
import PasswordInput from "@/components/PasswordInput";

const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#00f3ff]/40 focus:border-[#00f3ff]/50 transition-all";

export default function UserDashboardPage() {
  const { user, logout } = useAppContext();
  const [tab, setTab] = useState("profile");
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) return toast.error("Passwords don't match");
    if (passwords.newPassword.length < 6) return toast.error("Password must be at least 6 characters");
    setSubmitting(true);
    try {
      await authService.changePassword({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      toast.success("Password changed successfully");
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch { /* handled */ }
    finally { setSubmitting(false); }
  };

  const initial = (user?.name || "U")[0].toUpperCase();

  return (
    <div className="relative min-h-screen pt-28 pb-20 px-4 sm:px-6 overflow-hidden">
      {/* Neon blobs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#00f3ff]/6 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#bc13fe]/6 rounded-full blur-[130px] pointer-events-none" />

      <div className="relative z-10 max-w-3xl mx-auto">
        {/* Profile header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-5 mb-10"
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-black shadow-lg shrink-0"
            style={{ background: "linear-gradient(135deg, #00f3ff, #bc13fe)", boxShadow: "0 0 20px rgba(0,243,255,0.3)" }}
          >
            {initial}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{user?.name || "User"}</h1>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 bg-white/[0.04] border border-white/8 rounded-xl p-1 max-w-xs">
          {[
            { key: "profile", label: "Profile", icon: User },
            { key: "security", label: "Security", icon: Lock },
          ].map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                  active
                    ? "text-black font-bold shadow-lg"
                    : "text-gray-400 hover:text-white"
                }`}
                style={active ? { background: "linear-gradient(135deg, #00f3ff, #bc13fe)", boxShadow: "0 0 12px rgba(0,243,255,0.3)" } : {}}
              >
                <Icon className="w-4 h-4" /> {t.label}
              </button>
            );
          })}
        </div>

        {/* Profile Tab */}
        {tab === "profile" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div
              className="border border-white/8 rounded-2xl bg-white/[0.03] backdrop-blur-xl p-6"
              style={{ boxShadow: "0 0 40px rgba(0,243,255,0.03)" }}
            >
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-5">Account Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#00f3ff]/10 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-[#00f3ff]" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Full Name</p>
                    <p className="text-white font-medium">{user?.name || "—"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#bc13fe]/10 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4 text-[#bc13fe]" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Email</p>
                    <p className="text-white font-medium">{user?.email || "—"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#bc13fe]/10 flex items-center justify-center shrink-0">
                    <Shield className="w-4 h-4 text-[#bc13fe]" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Account Type</p>
                    <p className="text-white font-medium capitalize">{user?.role || "User"}</p>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:border-red-500/40 transition-all text-sm font-medium cursor-pointer"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </motion.div>
        )}

        {/* Security Tab */}
        {tab === "security" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div
              className="border border-white/8 rounded-2xl bg-white/[0.03] backdrop-blur-xl p-6"
              style={{ boxShadow: "0 0 40px rgba(188,19,254,0.03)" }}
            >
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-6">Change Password</h3>
              <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm">
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Current Password</label>
                  <PasswordInput
                    value={passwords.currentPassword}
                    onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">New Password</label>
                  <PasswordInput
                    value={passwords.newPassword}
                    onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Confirm New Password</label>
                  <PasswordInput
                    value={passwords.confirmPassword}
                    onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-black transition-all mt-2 disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, #00f3ff, #bc13fe)", boxShadow: "0 0 15px rgba(0,243,255,0.3)" }}
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Update Password
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
