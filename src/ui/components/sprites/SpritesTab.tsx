import { ResultStep } from './ResultStep.tsx';
import { SettingsStep } from './SettingsStep.tsx';
import { UploadStep } from './UploadStep.tsx';

/** Sprites tab: 1 upload → 2 settings → 3 result. Settings and result sit side by side on wide screens. */
export function SpritesTab() {
  return (
    <div className="sprites">
      <UploadStep />
      <div className="steps-2-3">
        <SettingsStep />
        <ResultStep />
      </div>
    </div>
  );
}
