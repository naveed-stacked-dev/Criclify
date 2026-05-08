import { NavLink, useParams } from "react-router-dom";
import { Home, Swords, CalendarDays, Users, UserCircle } from "lucide-react";

const navItems = [
  { path: "", label: "Home", icon: Home, end: true },
  { path: "tournaments", label: "Tournaments", icon: Swords },
  { path: "matches", label: "Matches", icon: CalendarDays },
  { path: "teams", label: "Teams", icon: Users },
  { path: "players", label: "Players", icon: UserCircle },
];

/**
 * ClubNavbar — Sticky internal navigation for club pages.
 * No login/register buttons. "Powered By" on right.
 */
export default function ClubNavbar({ club }) {
  const { slug } = useParams();
  const basePath = `/clubs/${slug}`;

  return (
    <nav className="glass-nav sticky top-0 z-40">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-12">
          {/* Nav Links */}
          <div className="flex items-center gap-1 overflow-x-auto club-scroll">
            {navItems.map(({ path, label, icon: Icon, end }) => (
              <NavLink
                key={path}
                to={path ? `${basePath}/${path}` : basePath}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all duration-200 ${
                    isActive
                      ? "text-white bg-white/[0.08]"
                      : "text-gray-400 hover:text-white hover:bg-white/[0.04]"
                  }`
                }
                style={({ isActive }) =>
                  isActive
                    ? {
                        color: club?.theme?.primaryColor || "#1a73e8",
                        background: `${club?.theme?.primaryColor || "#1a73e8"}12`,
                      }
                    : {}
                }
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
              </NavLink>
            ))}
          </div>

          {/* Powered By */}
          <div className="hidden md:flex items-center gap-2 text-[11px] text-gray-500 flex-shrink-0 ml-4">
            <span>Powered by</span>
            <span className="font-bold text-gray-300 tracking-tight">
              Club<span style={{ color: "#00f3ff" }}>Arena</span>
              <span style={{ color: "#bc13fe" }}>X</span>
            </span>
          </div>
        </div>
      </div>
    </nav>
  );
}
