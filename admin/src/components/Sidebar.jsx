import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAppContext } from "@/hooks/useAppContext";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Trophy,
  Users,
  UserCircle,
  Swords,
  Calendar,
  Radio,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Palette,
  GitBranch,
  Image as ImageIcon,
  Images,
  FileText
} from "lucide-react";

const NAV_ITEMS = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["superAdmin", "clubManager"] },
  { path: "/clubs", label: "Clubs", icon: Trophy, roles: ["superAdmin"] },
  { path: "/tournaments", label: "Tournaments", icon: Swords, roles: ["superAdmin", "clubManager"] },
  { path: "/teams", label: "Teams", icon: Users, roles: ["superAdmin", "clubManager"] },
  { path: "/players", label: "Players", icon: UserCircle, roles: ["superAdmin", "clubManager"] },
  { path: "/matches", label: "Matches", icon: Calendar, roles: ["superAdmin", "clubManager"] },
  { path: "/match-scheduling", label: "Match Scheduling", icon: GitBranch, roles: ["superAdmin", "clubManager"] },
  { path: "/scoring", label: "Live Scoring", icon: Radio, roles: ["matchManager"] },
  { path: "/sponsors", label: "Sponsors", icon: ImageIcon, roles: ["superAdmin", "clubManager"] },
  { path: "/gallery", label: "Gallery", icon: Images, roles: ["superAdmin", "clubManager"] },
  { path: "/posts", label: "Posts", icon: FileText, roles: ["superAdmin", "clubManager"] },
  { path: "/analytics", label: "Analytics", icon: BarChart3, roles: ["superAdmin", "clubManager"] },
  { path: "/club-settings", label: "Club Settings", icon: Palette, roles: ["clubManager"] },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, isClubManager, isMatchManager, clubName, clubLogo, themeColor } = useAppContext();
  const isClubOrMatchManager = isClubManager || isMatchManager;
  const location = useLocation();

  const visibleItems = NAV_ITEMS.filter(
    (item) => item.roles.includes(user?.role)
  );

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="relative h-screen bg-sidebar border-r border-sidebar-border flex flex-col shrink-0"
    >
      {/* Logo / Club Branding */}
      <div className="h-16 flex items-center gap-3 px-4 border-b border-sidebar-border">
        {isClubOrMatchManager && clubLogo ? (
          <div
            className="flex items-center justify-center w-9 h-9 rounded-lg shadow-sm shrink-0 overflow-hidden"
            style={{ backgroundColor: `${themeColor}20` }}
          >
            <img src={clubLogo} alt="" className="w-7 h-7 rounded object-cover" />
          </div>
        ) : (
          <div
            className="flex items-center justify-center w-9 h-9 rounded-lg shadow-sm shrink-0"
            style={{
              background: isClubOrMatchManager && themeColor
                ? `linear-gradient(135deg, ${themeColor}, ${themeColor}aa)`
                : undefined,
            }}
            {...(!isClubOrMatchManager ? { className: "flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 shadow-sm shrink-0" } : {})}
          >
            <span className="text-base">🏏</span>
          </div>
        )}
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="font-bold text-sidebar-foreground text-sm whitespace-nowrap truncate"
            >
              {isClubOrMatchManager && clubName ? clubName : "ClubArenaX"}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {visibleItems.map((navItem) => {
          const Icon = navItem.icon;
          const isActive = navItem.path === "/"
            ? location.pathname === "/"
            : location.pathname.startsWith(navItem.path);

          return (
            <NavLink
              key={navItem.path}
              to={navItem.path}
              className={cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-indicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                  style={{
                    backgroundColor: isClubOrMatchManager && themeColor ? themeColor : undefined,
                  }}
                  {...(!isClubOrMatchManager || !themeColor ? { className: "absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-sidebar-primary" } : {})}
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <Icon
                className={cn("w-5 h-5 shrink-0", isActive && !isClubOrMatchManager && "text-sidebar-primary")}
                style={isActive && isClubOrMatchManager && themeColor ? { color: themeColor } : undefined}
              />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -5 }}
                    className="whitespace-nowrap"
                  >
                    {navItem.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </NavLink>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 z-10 w-6 h-6 rounded-full border border-sidebar-border bg-sidebar flex items-center justify-center text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors cursor-pointer shadow-sm"
      >
        {collapsed ? (
          <ChevronRight className="w-3.5 h-3.5" />
        ) : (
          <ChevronLeft className="w-3.5 h-3.5" />
        )}
      </button>
    </motion.aside>
  );
}
