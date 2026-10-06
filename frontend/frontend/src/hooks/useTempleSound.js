import { useEffect, useState } from 'react';
import { isSoundEnabled, setSoundEnabled, subscribeSound } from '../utils/templeSound';

/**
 * Whether the welcome sound (temple bell + Om) is switched on, shared by every
 * control that shows it. See utils/templeSound for the sound itself.
 */
const useTempleSound = () => {
  const [enabled, setEnabled] = useState(isSoundEnabled);
  useEffect(() => {
    setEnabled(isSoundEnabled());
    return subscribeSound(setEnabled);
  }, []);
  return [enabled, setSoundEnabled];
};

export default useTempleSound;
