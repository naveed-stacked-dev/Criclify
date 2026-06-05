import { useState } from "react";
import { motion } from "framer-motion";
import { appendImageField } from "@/utils/imageUtils";

import { useAppContext } from "@/hooks/useAppContext";
import clubService from "@/services/clubService";
import ImageUpload from "@/components/ImageUpload";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Settings, Palette, ImageIcon, Loader2, CheckCircle2, Trophy, LayoutTemplate } from "lucide-react";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

const PORTAL_TEMPLATES = [
  {
    key: "classic",
    label: "Classic White",
    desc: "Clean minimal white. Professional and timeless.",
    emoji: "⚪",
    preview: { bg: "#f8fafc", surface: "#ffffff", text: "#0f172a", border: "#e2e8f0", accent: "#1a73e8", patternColor: "transparent" },
  },
  {
    key: "cricket-ball",
    label: "Cricket Ball",
    desc: "White with red cricket ball stitch patterns.",
    emoji: "🔴",
    preview: { bg: "#fffbfb", surface: "#ffffff", text: "#1c0505", border: "#fecaca", accent: "#dc2626", patternColor: "#dc2626" },
  },
  {
    key: "stadium",
    label: "Stadium Lights",
    desc: "White with dramatic floodlight glow from above.",
    emoji: "🏟️",
    preview: { bg: "#f9fafb", surface: "#ffffff", text: "#111827", border: "#d1d5db", accent: "#6366f1", patternColor: "#6366f1" },
  },
  {
    key: "pitch-lines",
    label: "Pitch Lines",
    desc: "White with cricket ground stripe markings.",
    emoji: "🟢",
    preview: { bg: "#f7fdf8", surface: "#ffffff", text: "#052e16", border: "#bbf7d0", accent: "#15803d", patternColor: "#22c55e" },
  },
  {
    key: "trophy-gold",
    label: "Trophy Gold",
    desc: "White with champion gold star accents.",
    emoji: "🏆",
    preview: { bg: "#fffdf5", surface: "#ffffff", text: "#1c1408", border: "#fde68a", accent: "#f59e0b", patternColor: "#f59e0b" },
  },
];

const PRESET_COLORS = [
  "#7c3aed", "#6366f1", "#3b82f6", "#06b6d4", "#14b8a6",
  "#10b981", "#22c55e", "#eab308", "#f59e0b", "#ef4444",
  "#ec4899", "#f43f5e", "#8b5cf6", "#0ea5e9", "#64748b",
];

export default function ClubSettingsPage() {
  const {
    clubId, themeColor, clubTheme, updateThemeColor,
    clubName, clubLogo, clubBanner, loadClubData,
  } = useAppContext();

  const [color, setColor] = useState(themeColor || "#7c3aed");
  const [primaryColor, setPrimaryColor] = useState(clubTheme?.primaryColor || "#1a73e8");
  const [secondaryColor, setSecondaryColor] = useState(clubTheme?.secondaryColor || "#ffffff");
  const [template, setTemplate] = useState(clubTheme?.template || "classic");
  const [logo, setLogo] = useState(clubLogo);
  const [banner, setBanner] = useState(clubBanner);
  const [savingTheme, setSavingTheme] = useState(false);
  const [savingLogo, setSavingLogo] = useState(false);
  const [savingBanner, setSavingBanner] = useState(false);

  // Live preview as user picks colors
  const handleColorChange = (newColor) => {
    setColor(newColor);
    updateThemeColor(newColor); // Live preview via CSS custom property
  };

  const handleSaveAll = async () => {
    if (!clubId) return;
    setSavingTheme(true);
    try {
      const formData = new FormData();
      formData.append("themeColor", color);
      appendImageField(formData, "logo", logo);
      appendImageField(formData, "bannerUrl", banner);

      await clubService.update(clubId, formData);
      await clubService.updateTheme(clubId, { primaryColor, secondaryColor, template });
      toast.success("Settings saved successfully!");
      loadClubData(clubId);
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSavingTheme(false);
    }
  };

  const handleLogoRemove = () => setLogo(null);
  const handleBannerRemove = () => setBanner(null);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-3xl">
      {/* Header */}
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Settings className="w-6 h-6" style={{ color: themeColor }} /> Club Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Customize your club's branding, logo, and theme color
        </p>
      </motion.div>

      {/* Live Preview */}
      <motion.div variants={item}>
        <Card className="overflow-hidden border-border/50">
          <div
            className="h-20 relative"
            style={{
              background: `linear-gradient(135deg, ${color}, ${color}dd)`,
            }}
          >
            <div className="absolute inset-0 bg-black/10" />
            <div className="relative flex items-center h-full px-6 gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                {logo ? (
                  <img src={logo} alt="" className="w-6 h-6 rounded-lg object-cover" />
                ) : (
                  <Trophy className="w-5 h-5 text-white" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{clubName || "Your Club"}</h3>
                <p className="text-white/60 text-[10px] uppercase tracking-wider">Live Preview</p>
              </div>
            </div>
          </div>
          <div className="p-4 bg-background space-y-3">
            <div className="flex gap-2">
              <div className="h-8 flex-1 rounded bg-muted/50 flex items-center justify-center text-[10px] text-muted-foreground font-semibold">CONTENT AREA</div>
              <div 
                className="h-8 w-24 rounded shadow-sm flex items-center justify-center text-[10px] font-bold" 
                style={{ backgroundColor: secondaryColor, color: primaryColor }}
              >
                ACCENT
              </div>
            </div>
            <div 
              className="h-10 w-full rounded shadow-sm flex items-center justify-center text-[10px] text-white font-bold" 
              style={{ backgroundColor: primaryColor }}
            >
              PRIMARY BUTTON
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Portal Design Template */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <LayoutTemplate className="w-4 h-4" style={{ color: themeColor }} /> Portal Design Template
            </CardTitle>
            <CardDescription>Choose the look and feel of your public club portal</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {PORTAL_TEMPLATES.map((t) => {
                const isSelected = template === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTemplate(t.key)}
                    className="relative text-left rounded-xl border-2 overflow-hidden transition-all hover:scale-[1.02] cursor-pointer"
                    style={{
                      borderColor: isSelected ? themeColor : "hsl(var(--border))",
                      boxShadow: isSelected ? `0 0 0 3px ${themeColor}25` : "none",
                    }}
                  >
                    {/* Mini preview */}
                    <div
                      className="h-20 relative flex flex-col justify-between p-2.5 overflow-hidden"
                      style={{ backgroundColor: t.preview.bg }}
                    >
                      {/* Background glow effect */}
                      <div className="absolute inset-0 pointer-events-none" style={{
                        background: `radial-gradient(ellipse 80% 50% at 50% 0%, ${t.preview.patternColor}18, transparent 70%)`
                      }} />
                      {/* Fake navbar */}
                      <div className="relative flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: t.preview.accent }} />
                        <div className="h-1.5 rounded-full w-8" style={{ backgroundColor: t.preview.text, opacity: 0.25 }} />
                        <div className="ml-auto flex gap-1">
                          {[1,2,3].map(n => <div key={n} className="h-1.5 rounded-full w-4" style={{ backgroundColor: t.preview.text, opacity: 0.15 }} />)}
                        </div>
                      </div>
                      {/* Fake cards */}
                      <div className="relative flex gap-1.5">
                        <div className="flex-1 h-7 rounded border" style={{ backgroundColor: t.preview.surface, borderColor: t.preview.border, borderTopWidth: '2px', borderTopColor: t.preview.patternColor === "transparent" ? t.preview.border : `${t.preview.patternColor}40` }} />
                        <div className="flex-1 h-7 rounded border" style={{ backgroundColor: t.preview.surface, borderColor: t.preview.border }} />
                      </div>
                      {/* Bottom accent bar */}
                      <div className="relative h-1 rounded-full" style={{ backgroundColor: t.preview.accent, opacity: 0.7 }} />
                    </div>
                    {/* Label */}
                    <div className="px-3 py-2 bg-card border-t border-border/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold flex items-center gap-1.5">
                            <span>{t.emoji}</span> {t.label}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{t.desc}</p>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 shrink-0 ml-2" style={{ color: themeColor }} />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Theme Color */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Palette className="w-4 h-4" style={{ color: themeColor }} /> Dashboard Theme Color
            </CardTitle>
            <CardDescription>Choose your club's primary accent color</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Color Picker + Hex Input */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => handleColorChange(e.target.value)}
                  className="w-14 h-14 rounded-xl border-2 border-border cursor-pointer appearance-none bg-transparent [&::-webkit-color-swatch-wrapper]:p-1 [&::-webkit-color-swatch]:rounded-lg [&::-webkit-color-swatch]:border-0"
                />
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">Hex Value</Label>
                <Input
                  value={color}
                  onChange={(e) => handleColorChange(e.target.value)}
                  maxLength={7}
                  className="font-mono text-sm uppercase"
                />
              </div>
            </div>

            {/* Preset Colors */}
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Quick Presets</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => handleColorChange(c)}
                    className="w-8 h-8 rounded-lg border-2 transition-all hover:scale-110 cursor-pointer"
                    style={{
                      backgroundColor: c,
                      borderColor: c === color ? "hsl(var(--foreground))" : "transparent",
                    }}
                  />
                ))}
              </div>
            </div>

            <Separator className="my-6" />
            
            <div className="space-y-4">
              <Label className="text-sm font-semibold">Portal Primary Color</Label>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-14 h-14 rounded-xl border-2 border-border cursor-pointer appearance-none bg-transparent [&::-webkit-color-swatch-wrapper]:p-1 [&::-webkit-color-swatch]:rounded-lg [&::-webkit-color-swatch]:border-0"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <Label className="text-xs text-muted-foreground">Hex Value</Label>
                  <Input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    maxLength={7}
                    className="font-mono text-sm uppercase"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <Label className="text-sm font-semibold">Portal Secondary Color</Label>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-14 h-14 rounded-xl border-2 border-border cursor-pointer appearance-none bg-transparent [&::-webkit-color-swatch-wrapper]:p-1 [&::-webkit-color-swatch]:rounded-lg [&::-webkit-color-swatch]:border-0"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <Label className="text-xs text-muted-foreground">Hex Value</Label>
                  <Input
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    maxLength={7}
                    className="font-mono text-sm uppercase"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Club Logo */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ImageIcon className="w-4 h-4" style={{ color: themeColor }} /> Club Logo
            </CardTitle>
            <CardDescription>Upload your club's logo (recommended: square, 512×512px)</CardDescription>
          </CardHeader>
          <CardContent>
            <ImageUpload
              value={logo}
              onChange={(fileOrUrl) => {
                if (fileOrUrl === null) handleLogoRemove();
                else setLogo(fileOrUrl);
              }}
              label={null}
              aspectHint="1:1"
              maxSizeMB={5}
            />
          </CardContent>
        </Card>
      </motion.div>

      {/* Club Banner */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ImageIcon className="w-4 h-4" style={{ color: themeColor }} /> Club Banner
            </CardTitle>
            <CardDescription>Upload a cover banner for your club (recommended: 1920×350px for perfect desktop fit without vertical cropping)</CardDescription>
          </CardHeader>
          <CardContent>
            <ImageUpload
              value={banner}
              onChange={(fileOrUrl) => {
                if (fileOrUrl === null) handleBannerRemove();
                else setBanner(fileOrUrl);
              }}
              label={null}
              aspectHint="1920:350 (approx. 6:1)"
              maxSizeMB={5}
            />
          </CardContent>
        </Card>
      </motion.div>
      {/* Save Button */}
      <motion.div variants={item} className="flex justify-end pt-4">
        <Button onClick={handleSaveAll} disabled={savingTheme} size="lg" style={{ backgroundColor: themeColor, color: '#fff' }}>
          {savingTheme ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
          Save All Settings
        </Button>
      </motion.div>
    </motion.div>
  );
}
