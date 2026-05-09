import { useState } from "react";
import { useAppContext } from "@/hooks/useAppContext";
import authService from "@/services/authService";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Lock, Mail, Shield, Building, Clock, Loader2 } from "lucide-react";
import { PasswordInput } from "@/components/ui/password-input";

export default function ProfilePage() {
  const { user, updateUser, isClubManager, isMatchManager, clubName, themeColor } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user?.name || "",
    email: user?.email || "",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authService.updateProfile(profileData);
      updateUser(res.data.data);
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      return toast.error("Passwords do not match");
    }
    setLoading(true);
    try {
      await authService.changePassword(passwordData);
      toast.success("Password changed successfully");
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  const initials = (user?.name || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const roleLabel = {
    superadmin: "Super Admin",
    clubManager: "Club Manager",
    matchManager: "Match Manager",
  }[user?.role] || user?.role;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Profile Section */}
      <div className="flex flex-col md:flex-row items-center gap-6 p-8 bg-card rounded-xl border border-border shadow-sm bg-gradient-to-br from-card to-muted/20">
        <Avatar className="h-24 w-24 border-4 border-background shadow-xl">
          <AvatarFallback 
            className="text-white text-2xl font-bold"
            style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}aa)` }}
          >
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">{user?.name}</h1>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-3">
            <Badge 
              variant="outline" 
              className="px-3 py-1"
              style={{ backgroundColor: `${themeColor}15`, color: themeColor, borderColor: `${themeColor}30` }}
            >
              <Shield className="w-3.5 h-3.5 mr-1.5" /> {roleLabel}
            </Badge>
            {isClubManager && clubName && (
              <Badge 
                variant="outline" 
                className="px-3 py-1"
                style={{ backgroundColor: `${themeColor}15`, color: themeColor, borderColor: `${themeColor}30` }}
              >
                <Building className="w-3.5 h-3.5 mr-1.5" /> {clubName}
              </Badge>
            )}
            <Badge variant="outline" className="bg-muted text-muted-foreground px-3 py-1">
              <Clock className="w-3.5 h-3.5 mr-1.5" /> Joined {new Date(user?.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </Badge>
          </div>
        </div>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className={`grid w-full mb-8 bg-muted/50 p-1 rounded-xl ${isMatchManager ? 'grid-cols-1' : 'grid-cols-2'}`}>
          <TabsTrigger 
            value="general" 
            className="flex items-center gap-2 py-3 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm"
            style={{ '--theme-color': themeColor }}
          >
            <User className="w-4 h-4" /> General Information
          </TabsTrigger>
          {!isMatchManager && (
            <TabsTrigger 
              value="security" 
              className="flex items-center gap-2 py-3 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm"
              style={{ '--theme-color': themeColor }}
            >
              <Lock className="w-4 h-4" /> Security
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">Profile Details</CardTitle>
              <CardDescription>Update your personal information and contact details.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-semibold">Full Name</Label>
                    <div className="relative group">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <Input
                        id="name"
                        className="pl-10 h-11 bg-muted/30 border-border/50 focus:bg-background transition-all"
                        value={profileData.name}
                        onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                        required
                        placeholder="John Doe"
                        disabled={isMatchManager || isClubManager}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-semibold">Email Address</Label>
                    <div className="relative group">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <Input
                        id="email"
                        type="email"
                        className="pl-10 h-11 bg-muted/30 border-border/50 focus:bg-background transition-all"
                        value={profileData.email}
                        onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                        required
                        placeholder="john@example.com"
                        disabled={isMatchManager || isClubManager}
                      />
                    </div>
                  </div>
                </div>
                {!isMatchManager && !isClubManager && (
                  <div className="flex justify-end pt-4 border-t border-border/50">
                    <Button 
                      type="submit" 
                      disabled={loading} 
                      className="h-11 px-8 hover:opacity-90 transition-all shadow-md"
                      style={{ backgroundColor: themeColor, color: '#fff', boxShadow: `0 4px 12px ${themeColor}40` }}
                    >
                      {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Save Changes"}
                    </Button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">Change Password</CardTitle>
              <CardDescription>Ensure your account is using a long, random password to stay secure.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-6 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword" className="text-sm font-semibold">Current Password</Label>
                  <PasswordInput
                    id="currentPassword"
                    className="h-11 bg-muted/30 border-border/50 focus:bg-background transition-all"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    required
                  />
                </div>
                <Separator className="my-2 bg-border/50" />
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-sm font-semibold">New Password</Label>
                  <PasswordInput
                    id="newPassword"
                    className="h-11 bg-muted/30 border-border/50 focus:bg-background transition-all"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-semibold">Confirm New Password</Label>
                  <PasswordInput
                    id="confirmPassword"
                    className="h-11 bg-muted/30 border-border/50 focus:bg-background transition-all"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    required
                  />
                </div>
                <div className="flex justify-end pt-4 border-t border-border/50">
                  <Button type="submit" disabled={loading} variant="destructive" className="h-11 px-8 shadow-md shadow-destructive/20">
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Update Password"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
