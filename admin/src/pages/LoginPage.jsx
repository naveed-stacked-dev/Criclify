import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useAppContext } from "@/hooks/useAppContext";
import { useDynamicHead } from "@/hooks/useDynamicHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Shield, Users, Radio, AlertCircle } from "lucide-react";

const ROLE_CONFIG = {
  superadmin: {
    label: "Super Admin",
    description: "Sign in with your super admin credentials",
    icon: Shield,
    gradient: "from-violet-600 to-indigo-600",
    glow: "rgba(139,92,246,0.18)",
    blob1: "bg-violet-500/10",
    blob2: "bg-indigo-500/10",
  },
  "club-manager": {
    label: "Club Manager",
    description: "Sign in to manage your cricket club",
    icon: Users,
    gradient: "from-emerald-600 to-teal-600",
    glow: "rgba(16,185,129,0.18)",
    blob1: "bg-emerald-500/10",
    blob2: "bg-teal-500/10",
  },
  "match-manager": {
    label: "Scorer",
    description: "Sign in to start live match scoring",
    icon: Radio,
    gradient: "from-orange-500 to-red-600",
    glow: "rgba(249,115,22,0.18)",
    blob1: "bg-orange-500/10",
    blob2: "bg-red-500/10",
  },
};

export default function LoginPage({ role: roleProp }) {
  useDynamicHead();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const { login } = useAppContext();

  const role = roleProp || "superadmin";
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.superadmin;
  const Icon = config.icon;
  const isScorer = role === "match-manager";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const clearFieldError = (field) => {
    if (fieldErrors[field]) setFieldErrors((prev) => ({ ...prev, [field]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});
    setIsLoading(true);
    try {
      const credentials = { email, password };
      if (isScorer && token) credentials.token = token;
      await login(role, credentials);
      toast.success("Welcome back!");
      navigate("/");
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
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute -top-40 -right-40 w-96 h-96 ${config.blob1} rounded-full blur-3xl`} />
        <div className={`absolute -bottom-40 -left-40 w-96 h-96 ${config.blob2} rounded-full blur-3xl`} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Brand + Role header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${config.gradient} shadow-lg mb-4`}
            style={{ boxShadow: `0 8px 24px ${config.glow}` }}
          >
            <Icon className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-2xl font-bold text-foreground">{config.label}</h1>
          <p className="text-sm text-muted-foreground mt-1">{config.description}</p>
        </div>

        <Card
          className="border-border/50 shadow-xl backdrop-blur-sm bg-card/80"
          style={{ boxShadow: `0 20px 60px ${config.glow}` }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Sign in to continue</CardTitle>
            {isScorer && token && (
              <CardDescription className="text-emerald-500 font-medium text-xs">
                Token detected — you can sign in with just email & password or use the token link directly.
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); clearFieldError("email"); }}
                  required={!isScorer || !token}
                  autoComplete="email"
                  className={fieldErrors.email ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {fieldErrors.email && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {fieldErrors.email}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <PasswordInput
                  id="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); clearFieldError("password"); }}
                  required={!isScorer || !token}
                  autoComplete="current-password"
                  className={fieldErrors.password ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {fieldErrors.password && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {fieldErrors.password}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className={`w-full bg-gradient-to-r ${config.gradient} text-white hover:opacity-90 transition-opacity h-11 text-sm font-semibold`}
              >
                {isLoading
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in...</>
                  : "Sign In"
                }
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Cricket Club Management Platform &copy; {new Date().getFullYear()}
        </p>
      </motion.div>
    </div>
  );
}
