import React, { useState, useEffect } from "react";
import { useAuth } from "../../auth/hooks/use-auth.tsx";
import { useToast } from "../../../components/ui/Toast.tsx";
import { Button } from "../../../components/ui/Button.tsx";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../../components/ui/Card.tsx";
import { Input } from "../../../components/ui/Input.tsx";
import { motion } from "motion/react";
import {
  ShieldCheck,
  Mail,
  Calendar,
  User,
  Key,
  Check,
  BookOpen,
  Globe,
  School,
  Building,
  Clock,
  FileText,
  Sparkles,
  Image as ImageIcon
} from "lucide-react";

const AVATAR_PRESETS = [
  { name: "Pioneer", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Pioneer" },
  { name: "Explorer", url: "https://api.dicebear.com/7.x/lorelei/svg?seed=Explorer" },
  { name: "Scholar", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Scholar" },
  { name: "Innovator", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Innovator" },
  { name: "Sage", url: "https://api.dicebear.com/7.x/lorelei/svg?seed=Sage" },
  { name: "Astro", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Astro" },
  { name: "Academic", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Academic" },
  { name: "Visionary", url: "https://api.dicebear.com/7.x/lorelei/svg?seed=Visionary" },
  { name: "Adventurer", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Adventure" },
  { name: "Pixel Hero", url: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Hero" },
  { name: "Creative", url: "https://api.dicebear.com/7.x/open-peeps/svg?seed=Creative" },
  { name: "Philosopher", url: "https://api.dicebear.com/7.x/miniavs/svg?seed=Philosopher" }
];

const TIMEZONES = [
  "UTC",
  "US/Pacific",
  "US/Mountain",
  "US/Central",
  "US/Eastern",
  "Europe/London",
  "Europe/Paris",
  "Asia/Kolkata",
  "Asia/Tokyo",
  "Australia/Sydney"
];

const SEMESTERS = [
  "Freshman (Year 1)",
  "Sophomore (Year 2)",
  "Junior (Year 3)",
  "Senior (Year 4)",
  "Fall 2026",
  "Winter 2026",
  "Spring 2026",
  "Summer 2026",
  "Graduate Studies",
  "Post-Graduate Research"
];

export function ProfileView() {
  const { firebaseUser, user, updateProfile } = useAuth();
  const toast = useToast();

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState("");
  const [bio, setBio] = useState("");
  const [university, setUniversity] = useState("");
  const [department, setDepartment] = useState("");
  const [semester, setSemester] = useState("");
  const [timezone, setTimezone] = useState("");
  
  const [saving, setSaving] = useState(false);

  // Load from database user object on mount/sync
  useEffect(() => {
    if (user) {
      setName(user.name || firebaseUser?.displayName || "");
      setUsername(user.username || "academic_pioneer");
      setAvatar(user.avatar || firebaseUser?.photoURL || "");
      setBio(user.bio || "");
      setUniversity(user.university || "");
      setDepartment(user.department || "");
      setSemester(user.semester || SEMESTERS[0]);
      setTimezone(user.timezone || "US/Pacific");
    }
  }, [user, firebaseUser]);

  if (!firebaseUser) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({
        name: name || null,
        username: username || null,
        avatar: avatar || null,
        bio: bio || null,
        university: university || null,
        department: department || null,
        semester: semester || null,
        timezone: timezone || null,
      });
      toast.success("Academic student profile updated and synchronized with PostgreSQL cloud directory!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to synchronize profile changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const selectPresetAvatar = (url: string) => {
    setAvatar(url);
    toast.success("Profile avatar selection updated. Click 'Save Profile' to commit changes.");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 w-full max-w-7xl mx-auto"
    >
      {/* Title */}
      <div className="border-b border-slate-200/60 dark:border-slate-800/60 pb-5">
        <h1 className="text-3xl font-bold tracking-tight font-display bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent dark:from-white dark:to-slate-300">
          Student Profile
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Personalize your academic portfolio, custom bios, avatars, and university details.
        </p>
      </div>

      <form onSubmit={handleSaveProfile} className="grid gap-6 md:grid-cols-3">
        
        {/* Left Card: Profile & Avatar Management */}
        <div className="space-y-6 md:col-span-1">
          <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-md">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="relative inline-block">
                <img
                  src={avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${firebaseUser.email}`}
                  alt="Profile Avatar"
                  className="h-24 w-24 rounded-full mx-auto border-4 border-accent-500/10 shadow-md object-cover transition-transform duration-300 hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <span className="absolute bottom-1 right-1 h-5 w-5 bg-emerald-500 border-2 border-white dark:border-slate-950 rounded-full flex items-center justify-center text-white" title="Verified Profile Claims">
                  <Check className="h-3 w-3 font-bold" />
                </span>
              </div>

              <div className="space-y-1">
                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-50">
                  {name || "Academic Student"}
                </h3>
                <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  @{username || "academic_pioneer"}
                </p>
              </div>

              <div className="flex justify-center">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-accent-100 text-accent-800 dark:bg-accent-950/40 dark:text-accent-400 border border-accent-200/20">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Verified Student
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Preset Avatars Selection */}
          <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent-500" />
                Avatar presets
              </CardTitle>
              <CardDescription className="text-xs">
                Pick a secure, procedurally-generated student preset:
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-2.5 justify-items-center">
                {AVATAR_PRESETS.map((preset) => {
                  const isSelected = avatar === preset.url;
                  return (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => selectPresetAvatar(preset.url)}
                      className={`relative rounded-lg p-1 border transition-all hover:scale-105 ${
                        isSelected 
                          ? "border-accent-500 bg-accent-50/50 dark:bg-accent-950/20" 
                          : "border-slate-200/60 dark:border-slate-800/60 hover:border-slate-300"
                      }`}
                    >
                      <img
                        src={preset.url}
                        alt={preset.name}
                        className="h-10 w-10 rounded-md bg-white object-cover"
                      />
                      {isSelected && (
                        <div className="absolute -top-1 -right-1 bg-accent-600 rounded-full p-0.5 text-white">
                          <Check className="h-2.5 w-2.5" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <ImageIcon className="h-3 w-3" /> Or custom avatar URL
                </label>
                <Input
                  type="url"
                  value={avatar}
                  onChange={(e) => setAvatar(e.target.value)}
                  placeholder="https://example.com/avatar.png"
                  className="text-xs"
                />
              </div>
            </CardContent>
          </Card>

          {/* Credentials Info */}
          <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-sm text-xs bg-slate-50/40 dark:bg-slate-900/10">
            <CardContent className="pt-4 space-y-2 text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2 pb-1 border-b border-slate-100 dark:border-slate-800/60">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                <span className="truncate">{firebaseUser.email}</span>
              </div>
              <div className="flex items-center gap-2 pb-1 border-b border-slate-100 dark:border-slate-800/60">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>Joined {firebaseUser.metadata.creationTime ? new Date(firebaseUser.metadata.creationTime).toLocaleDateString() : "Active Session"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Key className="h-3.5 w-3.5 text-slate-400" />
                <span>Auth: {firebaseUser.providerData[0]?.providerId === "google.com" ? "Google Social" : "Identity Keypair"}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Form Fields: Personal & Academic details */}
        <div className="space-y-6 md:col-span-2">
          <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Personal Identity</CardTitle>
              <CardDescription>
                Customize how your identity appears throughout the workspace and study sessions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-slate-400" /> Full Display Name
                  </label>
                  <Input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                {/* Academic Handle / Username */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-slate-400" /> Academic Handle
                  </label>
                  <Input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    placeholder="username"
                    icon={<span className="font-mono text-xs text-slate-400 select-none">@</span>}
                    className="font-mono"
                    required
                  />
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-slate-400" /> Student Bio / Motto
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about your study focus, major interests, or career objectives..."
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-accent-500 focus:ring-1 focus:ring-accent-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50 dark:placeholder:text-slate-600 dark:hover:border-slate-700 dark:focus:border-accent-500 dark:focus:ring-accent-500"
                />
              </div>
            </CardContent>
          </Card>

          {/* Academic Profile details */}
          <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Academic Context</CardTitle>
              <CardDescription>
                Define your academic institution and course timeline details.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* University */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <School className="h-3.5 w-3.5 text-slate-400" /> University / School
                  </label>
                  <Input
                    type="text"
                    value={university}
                    onChange={(e) => setUniversity(e.target.value)}
                    placeholder="e.g. Stanford University"
                  />
                </div>

                {/* Department */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <Building className="h-3.5 w-3.5 text-slate-400" /> Department / Major
                  </label>
                  <Input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. Computer Science"
                  />
                </div>

                {/* Semester */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-slate-400" /> Semester / Phase
                  </label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition-all hover:border-slate-300 focus:border-accent-500 focus:ring-1 focus:ring-accent-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50 dark:hover:border-slate-700 dark:focus:border-accent-500 dark:focus:ring-accent-500"
                  >
                    {SEMESTERS.map((sem) => (
                      <option key={sem} value={sem}>{sem}</option>
                    ))}
                  </select>
                </div>

                {/* Timezone */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-slate-400" /> Timezone
                  </label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition-all hover:border-slate-300 focus:border-accent-500 focus:ring-1 focus:ring-accent-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50 dark:hover:border-slate-700 dark:focus:border-accent-500 dark:focus:ring-accent-500"
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-200/60 dark:border-slate-800/60 flex justify-end gap-3">
                <Button
                  type="submit"
                  loading={saving}
                  className="px-6 h-10 font-medium"
                >
                  Save Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

      </form>
    </motion.div>
  );
}
