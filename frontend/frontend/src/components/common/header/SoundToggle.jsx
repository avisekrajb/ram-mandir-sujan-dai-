import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import useTempleSound from '../../../hooks/useTempleSound';

/**
 * On/off control for the welcome sound (temple bell + Om). The default is the
 * round speaker button in the header; `variant="row"` is the full-width switch
 * in the mobile menu. Switching it on plays the sound straight away.
 */
const SoundToggle = ({ t, variant = 'icon', className = '' }) => {
  const [enabled, setEnabled] = useTempleSound();
  const Icon = enabled ? Volume2 : VolumeX;
  const label = t.templeSound || 'Bell & Om sound';
  const toggle = () => setEnabled(!enabled);

  if (variant === 'row') {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={toggle}
        className={`flex min-h-[48px] w-full items-center gap-3 rounded-xl px-3 text-left text-base font-medium text-ink transition-colors hover:bg-panel ${className}`}
      >
        <Icon size={20} className="shrink-0 text-vermilion" aria-hidden="true" />
        <span className="flex-1">{label}</span>
        <span aria-hidden="true" className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${enabled ? 'bg-vermilion' : 'bg-gray-300'}`}>
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${enabled ? 'left-[1.375rem]' : 'left-0.5'}`} />
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={enabled}
      aria-label={label}
      title={enabled ? t.soundMute || 'Turn off bell sound' : t.soundUnmute || 'Turn on bell sound'}
      onClick={toggle}
      className={`icon-btn w-11 ${className}`}
    >
      <Icon size={18} aria-hidden="true" />
    </button>
  );
};

export default SoundToggle;
