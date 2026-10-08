// components/Avatar.js
// Avatar bertema Zyfay: ikon + warna gradien (bukan emoji). Format nilai: "ikon:warna".
import { Zap, Gamepad2, Flame, Star, Crown, Rocket, Shield, Gem, Ghost, Trophy, Sparkles, Heart } from 'lucide-react';
import { DEFAULT_AVATAR } from '../lib/akunConfig';

export const AVATAR_ICONS = {
  zap: Zap, gamepad: Gamepad2, flame: Flame, star: Star, crown: Crown, rocket: Rocket,
  shield: Shield, gem: Gem, ghost: Ghost, trophy: Trophy, sparkles: Sparkles, heart: Heart,
};

// Nama kelas ditulis utuh (bukan disusun dari string) supaya Tailwind ikut meng-generate-nya.
export const AVATAR_COLORS = {
  purple:  'from-primary to-primary-glow',
  violet:  'from-violet-600 to-fuchsia-500',
  indigo:  'from-indigo-600 to-sky-500',
  fuchsia: 'from-fuchsia-600 to-pink-500',
  sky:     'from-sky-500 to-indigo-500',
  emerald: 'from-emerald-500 to-teal-400',
};

export default function Avatar({ value, size = 48, className = '' }) {
  const [iconKey, colorKey] = String(value || DEFAULT_AVATAR).split(':');
  const Icon = AVATAR_ICONS[iconKey] || Zap;
  const gradient = AVATAR_COLORS[colorKey] || AVATAR_COLORS.purple;

  return (
    <div
      className={`rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0 shadow-glow-sm ${className}`}
      style={{ width: size, height: size }}
    >
      <Icon size={Math.round(size * 0.5)} className="text-white" />
    </div>
  );
}
