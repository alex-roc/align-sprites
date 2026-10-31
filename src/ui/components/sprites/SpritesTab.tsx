import { useI18n } from '../../../i18n/index.ts';
import { useDropPaste } from '../../lib/useDropPaste.ts';
import { EXAMPLES, fetchExample } from '../../dev/examples.ts';
import { useApp } from '../../state/context.ts';
import { useAddAssets } from '../../state/useAddAssets.ts';
import { DropOverlay } from '../common/DropOverlay.tsx';
import { EmptyStage } from '../common/EmptyStage.tsx';
import { AssetBar } from './AssetBar.tsx';
import { SpriteExport } from './SpriteExport.tsx';
import { SpriteSettings } from './SpriteSettings.tsx';
import { SpriteStage } from './SpriteStage.tsx';

/** Sprites workbench: asset bar on top, settings on the left, the stage (and export) on the right. */
export function SpritesTab() {
  const { t } = useI18n();
  const { state } = useApp();
  const { add, error, busy } = useAddAssets();
  const toIncoming = (files: File[]) => files.map((f) => ({ name: f.name, blob: f as Blob }));
  const addFiles = (files: File[]) => void add(toIncoming(files));
  const { dragging } = useDropPaste(addFiles);

  const asset = state.assets.find((a) => a.id === state.selectedId);

  const loadExample = async (id: string) => {
    const ex = EXAMPLES.find((x) => x.id === id);
    if (!ex) return;
    try {
      await add([await fetchExample(ex)]);
    } catch {
      /* the decode error path of useAddAssets reports failures; a missing file is a deploy problem */
    }
  };

  return (
    <div className="workbench-page">
      <DropOverlay show={dragging} />
      {state.assets.length > 0 && <AssetBar onFiles={addFiles} />}
      {!asset ? (
        <EmptyStage
          title={t('sprites.drop')}
          hint={t('sprites.dropHint')}
          multiple
          onFiles={addFiles}
          busy={busy}
          error={error}
          examples={EXAMPLES.map((ex) => ({ key: ex.id, label: t(ex.labelKey), onClick: () => void loadExample(ex.id) }))}
          steps={['how.s1', 'how.s2', 'how.s3']}
        />
      ) : (
        <div className="workbench">
          <aside className="settings" aria-label={t('set.label')}>
            <SpriteSettings asset={asset} key={asset.id} />
          </aside>
          <div className="main-col">
            {error && <p className="alert" role="alert">{error}</p>}
            <SpriteStage />
            <SpriteExport />
          </div>
        </div>
      )}
    </div>
  );
}
