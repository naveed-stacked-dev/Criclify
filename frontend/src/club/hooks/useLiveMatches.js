import { useState, useEffect, useCallback } from "react";
import clubService from "../services/clubService";
import {
  connectSocket,
  disconnectSocket,
  joinClub,
  leaveClub,
  onEvent,
} from "../services/liveScoreSocket";

/**
 * Custom hook for real-time live match data.
 * Subscribes to socket.io club room and updates live match state automatically.
 */
export default function useLiveMatches(clubId) {
  const [liveMatches, setLiveMatches] = useState([]);
  const [liveSummaries, setLiveSummaries] = useState({}); // matchId → summary
  const [loading, setLoading] = useState(true);

  // Fetch initial live matches via REST
  const fetchLiveMatches = useCallback(async () => {
    if (!clubId) return;
    try {
      const res = await clubService.getLiveMatches(clubId);
      const data = res.data?.data || res.data || [];
      const matchesArray = Array.isArray(data) ? data : [];
      setLiveMatches(matchesArray);
      
      // Extract attached summaries
      const initialSummaries = {};
      matchesArray.forEach(m => {
        if (m.summary) {
          initialSummaries[m._id || m.id] = m.summary;
        }
      });
      if (Object.keys(initialSummaries).length > 0) {
        setLiveSummaries(prev => ({ ...prev, ...initialSummaries }));
      }
    } catch {
      /* handled */
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    fetchLiveMatches();
  }, [fetchLiveMatches]);

  // Subscribe to socket for real-time updates
  useEffect(() => {
    if (!clubId) return;

    const socket = connectSocket();

    // Wait for connection then join club room
    const handleConnect = () => {
      joinClub(clubId);
    };

    if (socket.connected) {
      joinClub(clubId);
    } else {
      socket.on("connect", handleConnect);
    }

    // Listen for club-wide live updates
    const unsubClub = onEvent("club_live_update", (data) => {
      if (data?.matchId && data?.summary) {
        setLiveSummaries((prev) => ({
          ...prev,
          [data.matchId]: data.summary,
        }));
      }
    });

    // Listen for match ended (remove from live list)
    const unsubEnded = onEvent("match_ended", (data) => {
      const matchId = data?.match?._id || data?.matchId;
      if (matchId) {
        setLiveMatches((prev) => prev.filter((m) => (m._id || m.id) !== matchId));
        setLiveSummaries((prev) => {
          const copy = { ...prev };
          delete copy[matchId];
          return copy;
        });
      }
    });

    return () => {
      leaveClub(clubId);
      socket.off("connect", handleConnect);
      unsubClub();
      unsubEnded();
    };
  }, [clubId]);

  return {
    liveMatches,
    liveSummaries,
    loading,
    refetch: fetchLiveMatches,
  };
}
