import { useState, useEffect } from "react";
import clubService from "../services/clubService";

/**
 * Custom hook to fetch and cache club data by slug.
 * Returns { club, tournaments, loading, error, refetch }
 */
export default function useClubData(slug) {
  const [club, setClub] = useState(null);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    if (!slug) return;
    setLoading(true);
    setError(null);

    try {
      const clubRes = await clubService.getClubBySlug(slug);
      const clubData = clubRes.data?.data || clubRes.data;
      setClub(clubData);

      if (clubData?._id || clubData?.id) {
        const clubId = clubData._id || clubData.id;
        const tRes = await clubService.getTournaments(clubId);
        const tData = tRes.data?.data || tRes.data?.tournaments || tRes.data || [];
        setTournaments(Array.isArray(tData) ? tData : []);
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load club data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [slug]);

  return { club, tournaments, loading, error, refetch: fetchData };
}
