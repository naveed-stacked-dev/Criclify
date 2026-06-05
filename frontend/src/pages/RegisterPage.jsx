import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAppContext } from "@/hooks/useAppContext";
import { toast } from "sonner";
import { Loader2, AlertCircle } from "lucide-react";
import PasswordInput from "@/components/PasswordInput";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAppContext();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const clearFieldError = (field) => {
    if (fieldErrors[field]) setFieldErrors((prev) => ({ ...prev, [field]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});
    setLoading(true);
    try {
      await register({ name, email, phone, password });
      toast.success("Account created! Welcome to CricArena.");
      navigate("/profile");
    } catch (err) {
      const data = err?.response?.data;
      if (data?.errors?.length > 0) {
        const map = {};
        data.errors.forEach((e) => { if (e.field) map[e.field] = e.message; });
        setFieldErrors(map);
      } else if (data?.field) {
        setFieldErrors({ [data.field]: data.message });
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (field) =>
    `w-full bg-white/5 border rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#bc13fe]/40 focus:border-[#bc13fe]/50 transition-all ${fieldErrors[field] ? "border-red-500/70" : "border-white/10"}`;

  return (
    <div className="relative min-h-[90vh] flex items-center justify-center px-4 py-20 overflow-hidden">
      {/* Neon glow blobs */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-[#bc13fe]/8 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[#00f3ff]/8 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#bc13fe]/3 rounded-full blur-[160px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Brand */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
          >
          </motion.div>
          <h1 className="text-2xl font-bold mt-3 bg-clip-text text-transparent bg-gradient-to-r from-[#bc13fe] to-[#00f3ff]">
            Create Account
          </h1>
          <p className="text-gray-500 mt-1 text-sm">Join CricArena and follow your favorite teams</p>
        </div>

        {/* Card */}
        <div
          className="bg-white/[0.04] border border-white/10 rounded-2xl p-8 backdrop-blur-xl shadow-2xl"
          style={{ boxShadow: "0 0 60px rgba(188,19,254,0.05), 0 0 40px rgba(0,243,255,0.05)" }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); clearFieldError("name"); }}
                className={inputClass("name")}
                placeholder="Alice"
                required
                autoComplete="name"
              />
              {fieldErrors.name && (
                <p className="text-xs text-red-400 flex items-center gap-1 mt-1.5">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {fieldErrors.name}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); clearFieldError("email"); }}
                className={inputClass("email")}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
              {fieldErrors.email && (
                <p className="text-xs text-red-400 flex items-center gap-1 mt-1.5">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {fieldErrors.email}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Password</label>
              <PasswordInput
                value={password}
                onChange={(e) => { setPassword(e.target.value); clearFieldError("password"); }}
                className={inputClass("password")}
                placeholder="Min. 6 characters"
                required
                autoComplete="new-password"
              />
              {fieldErrors.password && (
                <p className="text-xs text-red-400 flex items-center gap-1 mt-1.5">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {fieldErrors.password}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-gradient-to-r from-[#bc13fe] to-[#00f3ff] text-black font-bold rounded-xl px-4 py-3 transition-all flex items-center justify-center hover:opacity-90 hover:shadow-[0_0_25px_rgba(188,19,254,0.4)] shadow-[0_0_15px_rgba(0,243,255,0.3)] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Create Account
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/8 text-center">
            <p className="text-gray-500 text-sm">
              Already have an account?{" "}
              <Link to="/login" className="text-[#bc13fe] hover:text-[#bc13fe]/80 font-semibold transition-colors">
                Sign In
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          Cricket Club Management Platform &copy; {new Date().getFullYear()}
        </p>
      </motion.div>
    </div>
  );
}
