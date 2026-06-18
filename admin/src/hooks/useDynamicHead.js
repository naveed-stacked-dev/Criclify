import { useEffect } from "react";
import { useAppContext } from "@/hooks/useAppContext";

function setFavicon(href) {
  let link = document.querySelector("link[rel~='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.type = href.endsWith(".svg") ? "image/svg+xml" : "image/png";
  link.href = href;
}

export function useDynamicHead() {
  const { isSuperAdmin, isClubManager, isMatchManager, clubName, clubLogo, isAuthenticated } = useAppContext();

  useEffect(() => {
    let title = "Criclify Management";
    let description = "Professional cricket league management, scheduling, and live scoring platform.";

    if (isAuthenticated) {
      if (isSuperAdmin) {
        title = "Criclify | SuperAdmin Portal";
        description = "Global administration and league management for Criclify.";
        setFavicon("/logo.png");
      } else if (isClubManager) {
        title = `${clubName || "Club"} | Club Management`;
        description = `Manage your club (${clubName || "assigned club"}), tournaments, teams, and players.`;
        setFavicon(clubLogo || "/logo.png");
      } else if (isMatchManager) {
        title = "Match Scorer | Criclify";
        description = "Live match scoring and scheduling management for assigned fixtures.";
        setFavicon(clubLogo || "/logo.png");
      }
    } else {
      setFavicon("/favicon.svg");
    }

    document.title = title;

    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) metaDescription.setAttribute("content", description);

    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", title);

    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute("content", description);

  }, [isSuperAdmin, isClubManager, isMatchManager, clubName, clubLogo, isAuthenticated]);
}
