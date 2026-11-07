import {historyDate} from '../utils/history';
import React, { useState } from 'react';
import { UserProfile } from '../types/game';
import { Sparkles, Trophy, Flame, Edit3, Check, History } from 'lucide-react';
import { soundFX } from '../utils/audio';

interface ProfileScreenProps {
  profile: UserProfile;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
  onLogout: () => void;
}

const AVATAR_OPTIONS = [
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=150&auto=format&fit=crop&q=80',
];

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  profile,
  onUpdateProfile,
  onLogout,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(profile.username);
  const [tempBio, setTempBio] = useState(profile.bio);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  const winRate =
    profile.gamesPlayed > 0
      ? Math.round((profile.wins / profile.gamesPlayed) * 100)
      : 0;

  const handleSave = () => {
    soundFX.playTap();
    onUpdateProfile({
      username: tempName.trim() || 'Player',
      bio: tempBio.trim() || '',
    });
    setIsEditing(false);
  };

  const handlePickAvatar = (url: string) => {
    soundFX.playSparkle();
    onUpdateProfile({ avatar: url });
    setShowAvatarPicker(false);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-4 sm:py-6 space-y-6 animate-in fade-in duration-200">
      {/* PROFILE HERO HEADER */}
      <div className="relative rounded-3xl glass-pearl p-6 sm:p-8 border border-pink-200 shadow-xl overflow-hidden">
        {/* Soft background glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-pink-400/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10 text-center sm:text-left">
          {/* Avatar with Halo & change button */}
          <div className="relative group">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full p-1 bg-linear-to-tr from-pink-500 via-rose-400 to-amber-300 shadow-xl">
              <img
                src={profile.avatar}
                alt={profile.username}
                className="w-full h-full rounded-full object-cover border-2 border-white shadow-inner"
              />
            </div>
            <button
              onClick={() => setShowAvatarPicker(true)}
              className="absolute bottom-0 right-0 p-2 rounded-full bg-pink-600 hover:bg-pink-700 text-white shadow-md border-2 border-white transition-transform hover:scale-110 cursor-pointer"
              title="Change profile picture"
            >
              <Sparkles size={14} />
            </button>
          </div>

          {/* Name & Details */}
          <div className="flex-1 space-y-2">
            {isEditing ? (
              <div className="space-y-2 max-w-sm">
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-full bg-white border border-pink-300 text-base font-bold text-[#3E001E] focus:outline-hidden"
                  placeholder="Your Name"
                />
                <input
                  type="text"
                  value={tempBio}
                  onChange={(e) => setTempBio(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-full bg-white border border-pink-300 text-xs text-[#574048] focus:outline-hidden"
                  placeholder="Short bio"
                />
                <button
                  onClick={handleSave}
                  className="px-4 py-1.5 rounded-full btn-glam-primary text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Check size={14} /> Save Profile
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <h2 className="text-2xl sm:text-3xl font-black font-heading text-[#3E001E]">
                    {profile.username}
                  </h2>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-1.5 rounded-full text-pink-600 hover:bg-pink-100 transition-colors cursor-pointer"
                    title="Edit Name & Bio"
                  >
                    <Edit3 size={15} />
                  </button>
                </div>
                <p className="text-xs sm:text-sm text-[#574048] max-w-md">{profile.bio}</p>
              </div>
            )}

          </div>
        </div>
      </div>
      <button className="text-button" onClick={onLogout}>Log out</button>

      {/* AVATAR SELECTOR MODAL */}
      {showAvatarPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#650034]/70 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-sm glass-modal p-6 rounded-3xl shadow-2xl border-2 border-pink-300 text-center">
            <h3 className="text-xl font-black font-heading text-[#3E001E] mb-1">
              Choose your picture
            </h3>
            <p className="text-xs text-[#574048] mb-4">
              
            </p>

            <div className="grid grid-cols-4 gap-3 mb-5">
              {AVATAR_OPTIONS.map((imgUrl, i) => (
                <button
                  key={i}
                  onClick={() => handlePickAvatar(imgUrl)}
                  className={`relative rounded-2xl p-0.5 border-2 transition-all hover:scale-105 cursor-pointer ${
                    profile.avatar === imgUrl ? 'border-pink-500 ring-2 ring-pink-400' : 'border-transparent'
                  }`}
                >
                  <img
                    src={imgUrl}
                    alt={`Avatar ${i}`}
                    className="w-14 h-14 rounded-xl object-cover shadow-sm"
                  />
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowAvatarPicker(false)}
              className="w-full py-2.5 rounded-full bg-white hover:bg-pink-50 text-xs font-bold text-[#881B4D] border border-pink-200 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* CAREER STATS GRID */}
      <div>
        <h3 className="text-lg font-black font-heading text-[#3E001E] mb-3 flex items-center gap-2">
          <Trophy size={18} className="text-amber-500" />
          <span>Your stats</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="rounded-2xl glass-pearl p-4 border border-pink-200 text-center">
            <div className="text-2xl font-black font-heading text-[#3E001E]">{profile.gamesPlayed}</div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#881B4D] mt-0.5">
              Games Played
            </div>
          </div>

          <div className="rounded-2xl glass-pearl p-4 border border-pink-200 text-center">
            <div className="text-2xl font-black font-heading text-emerald-600">{profile.wins}</div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#881B4D] mt-0.5">
              Total Wins (1st)
            </div>
          </div>

          <div className="rounded-2xl glass-pearl p-4 border border-pink-200 text-center">
            <div className="text-2xl font-black font-heading text-pink-600">{winRate}%</div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#881B4D] mt-0.5">
              Win Rate
            </div>
          </div>

          <div className="rounded-2xl glass-pearl p-4 border border-pink-200 text-center">
            <div className="text-2xl font-black font-heading text-amber-500 flex items-center justify-center gap-1">
              <Flame size={20} className="text-amber-500" />
              <span>{profile.winStreak}</span>
            </div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#881B4D] mt-0.5">
              Current Streak
            </div>
          </div>
        </div>
      </div>

      {/* MATCH HISTORY LOG */}
      <div className="rounded-3xl glass-pearl p-6 border border-pink-200 shadow-md">
        <h3 className="text-lg font-black font-heading text-[#3E001E] mb-3 flex items-center gap-2">
          <History size={18} className="text-pink-600" />
          <span>Recent Match History</span>
        </h3>

        {profile.matchHistory.length === 0 ? (
          <div className="text-center py-8 text-[#574048] text-sm">
            Your completed games will appear here.
          </div>
        ) : (
          <div className="space-y-2.5">
            {profile.matchHistory.slice(0, 6).map((match) => {
              const isWin = match.placement === 1;
              return (
                <div
                  key={match.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-white/70 border border-pink-100 hover:border-pink-200 transition-all text-xs sm:text-sm"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs ${
                        isWin
                          ? 'bg-amber-400 text-amber-950 shadow-xs'
                          : match.placement === 2
                          ? 'bg-gray-300 text-gray-800'
                          : 'bg-pink-100 text-pink-700'
                      }`}
                    >
                      {match.placement === 1 ? '🥇' : match.placement === 2 ? '🥈' : `#${match.placement}`}
                    </span>
                    <div>
                      <div className="font-extrabold text-[#3E001E]">{match.tableName}</div>
                      <div className="text-[11px] text-[#574048]">{historyDate(match.date)}</div>
                    </div>
                  </div>

                  <span className="text-xs text-[#87466d]">{match.turns} turns</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
