import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import teamService from "@/services/teamService";
import matchService from "@/services/matchService";
import { useAppContext } from "@/hooks/useAppContext";

export default function SquadSelectionDialog({ match, open, onClose, onUpdated }) {
  const { themeColor } = useAppContext();
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [teamAPlayers, setTeamAPlayers] = useState([]);
  const [teamBPlayers, setTeamBPlayers] = useState([]);

  const [squadA, setSquadA] = useState({ playingXI: [], substitutes: [] });
  const [squadB, setSquadB] = useState({ playingXI: [], substitutes: [] });

  useEffect(() => {
    if (open && match) {
      loadPlayers();
      // Initialize with existing data if present
      if (match.squadA) {
        setSquadA({
          playingXI: match.squadA.playingXI?.map(p => p._id || p) || [],
          substitutes: match.squadA.substitutes?.map(p => p._id || p) || []
        });
      } else {
        setSquadA({ playingXI: [], substitutes: [] });
      }
      
      if (match.squadB) {
        setSquadB({
          playingXI: match.squadB.playingXI?.map(p => p._id || p) || [],
          substitutes: match.squadB.substitutes?.map(p => p._id || p) || []
        });
      } else {
        setSquadB({ playingXI: [], substitutes: [] });
      }
    }
  }, [open, match]);

  const loadPlayers = async () => {
    if (!match?.teamA?._id && !match?.teamB?._id) return;
    setLoading(true);
    try {
      const [resA, resB] = await Promise.all([
        match.teamA?._id ? teamService.getPlayers(match.teamA._id) : Promise.resolve({ data: { data: [] } }),
        match.teamB?._id ? teamService.getPlayers(match.teamB._id) : Promise.resolve({ data: { data: [] } })
      ]);
      setTeamAPlayers(resA.data?.data || []);
      setTeamBPlayers(resB.data?.data || []);
    } catch (err) {
      toast.error("Failed to load players");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSubmitting(true);
    try {
      await matchService.update(match._id || match.id, {
        squadA,
        squadB
      });
      toast.success("Squads saved successfully");
      onUpdated?.();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save squads");
    } finally {
      setSubmitting(false);
    }
  };

  const togglePlayer = (teamSide, listType, playerId) => {
    const setSquad = teamSide === 'A' ? setSquadA : setSquadB;
    
    setSquad(prev => {
      const isSelected = prev[listType].includes(playerId);
      const otherList = listType === 'playingXI' ? 'substitutes' : 'playingXI';
      
      let newSquad = { ...prev };
      
      if (isSelected) {
        newSquad[listType] = newSquad[listType].filter(id => id !== playerId);
      } else {
        // Enforce limits: 11 for playingXI, 4 for substitutes
        if (listType === 'playingXI' && newSquad.playingXI.length >= 11) {
          toast.error("Maximum 11 players allowed in Playing XI");
          return prev;
        }
        if (listType === 'substitutes' && newSquad.substitutes.length >= 4) {
          toast.error("Maximum 4 substitutes allowed");
          return prev;
        }
        
        newSquad[listType] = [...newSquad[listType], playerId];
        // Remove from other list if present
        newSquad[otherList] = newSquad[otherList].filter(id => id !== playerId);
      }
      
      return newSquad;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle style={{ color: themeColor }}>Select Match Squads</DialogTitle>
          <DialogDescription>
            Select up to 11 playing players and 4 substitutes for each team.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6 py-4">
          {loading ? (
            <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Team A */}
              {match?.teamA && (
                <div className="space-y-4 border rounded-lg p-4 bg-card">
                  <h3 className="font-bold text-lg text-center border-b pb-2">{match.teamA.name}</h3>
                  <div className="flex justify-between text-xs font-semibold text-muted-foreground px-2">
                    <span>PLAYERS</span>
                    <div className="flex gap-4">
                      <span>XI ({squadA.playingXI.length}/11)</span>
                      <span>SUB ({squadA.substitutes.length}/4)</span>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2">
                    {teamAPlayers.map(player => {
                      const isXI = squadA.playingXI.includes(player._id);
                      const isSub = squadA.substitutes.includes(player._id);
                      return (
                        <div key={player._id} className="flex items-center justify-between p-2 rounded border bg-background hover:bg-secondary/20 transition-colors">
                          <span className="text-sm font-medium">{player.name}</span>
                          <div className="flex items-center gap-2">
                            <Button 
                              size="sm" 
                              variant={isXI ? "default" : "outline"} 
                              className={`h-7 px-3 text-xs ${isXI ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : ''}`}
                              onClick={() => togglePlayer('A', 'playingXI', player._id)}
                            >
                              XI
                            </Button>
                            <Button 
                              size="sm" 
                              variant={isSub ? "default" : "outline"} 
                              className={`h-7 px-3 text-xs ${isSub ? 'bg-amber-500 hover:bg-amber-600 text-white' : ''}`}
                              onClick={() => togglePlayer('A', 'substitutes', player._id)}
                            >
                              SUB
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    {teamAPlayers.length === 0 && <p className="text-sm text-center text-muted-foreground p-4">No players found in team</p>}
                  </div>
                </div>
              )}

              {/* Team B */}
              {match?.teamB && (
                <div className="space-y-4 border rounded-lg p-4 bg-card">
                  <h3 className="font-bold text-lg text-center border-b pb-2">{match.teamB.name}</h3>
                  <div className="flex justify-between text-xs font-semibold text-muted-foreground px-2">
                    <span>PLAYERS</span>
                    <div className="flex gap-4">
                      <span>XI ({squadB.playingXI.length}/11)</span>
                      <span>SUB ({squadB.substitutes.length}/4)</span>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2">
                    {teamBPlayers.map(player => {
                      const isXI = squadB.playingXI.includes(player._id);
                      const isSub = squadB.substitutes.includes(player._id);
                      return (
                        <div key={player._id} className="flex items-center justify-between p-2 rounded border bg-background hover:bg-secondary/20 transition-colors">
                          <span className="text-sm font-medium">{player.name}</span>
                          <div className="flex items-center gap-2">
                            <Button 
                              size="sm" 
                              variant={isXI ? "default" : "outline"} 
                              className={`h-7 px-3 text-xs ${isXI ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : ''}`}
                              onClick={() => togglePlayer('B', 'playingXI', player._id)}
                            >
                              XI
                            </Button>
                            <Button 
                              size="sm" 
                              variant={isSub ? "default" : "outline"} 
                              className={`h-7 px-3 text-xs ${isSub ? 'bg-amber-500 hover:bg-amber-600 text-white' : ''}`}
                              onClick={() => togglePlayer('B', 'substitutes', player._id)}
                            >
                              SUB
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    {teamBPlayers.length === 0 && <p className="text-sm text-center text-muted-foreground p-4">No players found in team</p>}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="mt-4 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={submitting || loading} style={{ backgroundColor: themeColor, color: '#fff' }}>
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save Squads
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
