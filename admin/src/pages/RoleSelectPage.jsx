import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, Users, Radio, ArrowRight } from "lucide-react";

const ROLES = [
  {
    key: "superadmin",
    label: "Super Admin",
    description: "Full platform access. Manage clubs, users, and global settings.",
    icon: Shield,
    gradient: "from-violet-600 to-indigo-600",
    glow: "violet",
    path: "/superadmin/login",
  },
  {
    key: "club-manager",
    label: "Club Manager",
    description: "Manage your club's tournaments, teams, players and matches.",
    icon: Users,
    gradient: "from-emerald-600 to-teal-600",
    glow: "emerald",
    path: "/clubmanager/login",
  },
  {
    key: "match-manager",
    label: "Scorer",
    description: "Live match scoring and real-time score management.",
    icon: Radio,
    gradient: "from-orange-500 to-red-600",
    glow: "orange",
    path: "/scorer/login",
  },
];

const glowColors = {
  violet: "rgba(139,92,246,0.25)",
  emerald: "rgba(16,185,129,0.25)",
  orange: "rgba(249,115,22,0.25)",
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.3 } },
};
const cardVariant = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 22 } },
};

export default function RoleSelectPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-indigo-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-3xl">
        {/* Brand header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-xl shadow-violet-500/30 mb-5"
          >
            <span className="text-3xl">🏏</span>
          </motion.div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">CricArena</h1>
          <p className="text-muted-foreground mt-2">Choose your role to sign in</p>
        </motion.div>

        {/* Role cards */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-3 gap-5"
        >
          {ROLES.map((role) => {
            const Icon = role.icon;
            return (
              <motion.div
                key={role.key}
                variants={cardVariant}
                whileHover={{ y: -6, scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate(role.path)}
                className="group relative cursor-pointer rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-7 flex flex-col gap-4 shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden"
                style={{
                  "--glow": glowColors[role.glow],
                }}
              >
                {/* Glow on hover */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"
                  style={{ background: `radial-gradient(circle at 50% 0%, ${glowColors[role.glow]}, transparent 70%)` }}
                />

                {/* Icon */}
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${role.gradient} flex items-center justify-center shadow-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>

                {/* Text */}
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-foreground">{role.label}</h2>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{role.description}</p>
                </div>

                {/* Arrow */}
                <div className={`flex items-center gap-1.5 text-sm font-semibold bg-gradient-to-r ${role.gradient} bg-clip-text text-transparent`}>
                  Sign In
                  <ArrowRight className="w-4 h-4 translate-x-0 group-hover:translate-x-1 transition-transform duration-200" style={{ color: "inherit" }} />
                </div>

                {/* Bottom accent line */}
                <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${role.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
              </motion.div>
            );
          })}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center text-xs text-muted-foreground mt-10"
        >
          Cricket Club Management Platform &copy; {new Date().getFullYear()}
        </motion.p>
      </div>
    </div>
  );
}
