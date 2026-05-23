import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppContext } from "@/hooks/useAppContext";
import { toast } from "sonner";
import { Loader2, AlertCircle } from "lucide-react";
import PasswordInput from "@/components/PasswordInput";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAppContext();
  const [email, setEmail] = useState("");
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
      await login({ email, password });
      toast.success("Welcome back!");
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

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-20 px-4">
      <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-400">Welcome Back</h1>
          <p className="text-gray-400 mt-2 text-sm">Sign in to your CricArena account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); clearFieldError("email"); }}
              className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${fieldErrors.email ? "border-red-500" : "border-white/10"}`}
              placeholder="you@example.com"
              required
            />
            {fieldErrors.email && (
              <p className="text-xs text-red-400 flex items-center gap-1 mt-1.5">
                <AlertCircle className="w-3 h-3 shrink-0" /> {fieldErrors.email}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
            <PasswordInput
              value={password}
              onChange={(e) => { setPassword(e.target.value); clearFieldError("password"); }}
              className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${fieldErrors.password ? "border-red-500" : "border-white/10"}`}
              placeholder="••••••••"
              required
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
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold rounded-xl px-4 py-3 transition-all flex items-center justify-center mt-6 shadow-lg shadow-emerald-500/20"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
            Sign In
          </button>
        </form>

        <p className="text-center text-gray-400 text-sm mt-6">
          Don't have an account?{" "}
          <Link to="/register" className="text-emerald-400 hover:text-emerald-300 font-medium">Create one</Link>
        </p>
      </div>
    </div>
  );
}
