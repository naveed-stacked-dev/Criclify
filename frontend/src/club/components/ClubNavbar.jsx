import { NavLink, Link, useParams, useNavigate } from "react-router-dom";
import { Home, Swords, CalendarDays, Users, UserCircle, Plus } from "lucide-react";

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
  const navigate = useNavigate();
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
                      ? "text-white bg-white/20 shadow-sm"
                      : "text-white/70 hover:text-white hover:bg-white/10"
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
              </NavLink>
            ))}

            {/* Register Team CTA */}
            <button
              onClick={() => navigate(`${basePath}/teams?register=true`)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg whitespace-nowrap transition-all duration-200 bg-white/20 text-white hover:bg-white/30 border border-white/30 ml-1"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Register Team</span>
            </button>
          </div>

          {/* Powered By */}
          <Link to="/" className="hidden bg-[#0f172a] px-3 py-2 rounded-full md:flex items-center gap-2 text-[11px] text-white/70 flex-shrink-0 ml-4 hover:bg-[#1e293b] hover:shadow-md transition-all cursor-pointer">
            <span>Powered by</span>
            <span className="font-bold text-white tracking-tight">
              Cric<span style={{ color: "#00f3ff" }}>lify</span>
            </span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
