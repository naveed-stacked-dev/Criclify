import { useEffect } from "react";
import { useAppContext } from "@/hooks/useAppContext";

/**
 * Custom hook to dynamically update the document title and meta description
 * based on the authenticated user's role and associated club.
 */
export function useDynamicHead() {
  const { isSuperAdmin, isClubManager, isMatchManager, clubName, isAuthenticated } = useAppContext();

  useEffect(() => {
    let title = "CricArena Management";
    let description = "Professional cricket league management, scheduling, and live scoring platform.";

    if (isAuthenticated) {
      if (isSuperAdmin) {
        title = "CricArena | SuperAdmin Portal";
        description = "Global administration and league management for CricArena.";
      } else if (isClubManager) {
        title = `${clubName || "Club"} | Club Management`;
        description = `Manage your club (${clubName || "assigned club"}), tournaments, teams, and players.`;
      } else if (isMatchManager) {
        title = "Match Scorer | CricArena";
        description = "Live match scoring and scheduling management for assigned fixtures.";
      }
    }

    // Update Document Title
    document.title = title;

    // Update Meta Description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute("content", description);
    }

    // Update Open Graph Title/Description if they exist
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", title);

    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute("content", description);

  }, [isSuperAdmin, isClubManager, isMatchManager, clubName, isAuthenticated]);
}
