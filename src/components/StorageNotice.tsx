import { useEffect, useState } from 'react';

import { formatBytes, requestPersistence, storageHealth, storageLevel, type StorageHealth } from '@/storage/quota';

import { Icon } from './Icon';
import { Button } from './ui';

/**
 * Honest storage messaging: photos live only in this browser on this device.
 * Shows usage, warns when nearly full, and offers to request persistent
 * storage (which makes the browser far less likely to clear it).
 */
export function StorageNotice({ className = '', compact }: { className?: string; compact?: boolean }) {
  const [health, setHealth] = useState<StorageHealth | null>(null);
  useEffect(() => {
    let live = true;
    storageHealth().then((h) => live && setHealth(h));
    return () => {
      live = false;
    };
  }, []);
  const level = health ? storageLevel(health) : 'ok';

  if (compact && level === 'ok') return null;

  return (
    <aside className={`rounded-3xl px-5 py-4 text-sm ${level === 'ok' ? 'bg-cream text-muted' : 'bg-butter text-butter-ink'} ${className}`} aria-label="Storage">
      <div className="flex gap-3">
        <Icon name="shield" size={20} className="mt-0.5 shrink-0" />
        <div className="space-y-1.5">
          {level === 'full' && <p className="font-medium">Browser storage is almost full. New photos may not save — remove photos or albums you no longer need, or export PDFs.</p>}
          {level === 'warn' && <p className="font-medium">Browser storage is getting full ({formatBytes(health!.usage)} of {formatBytes(health!.quota)}).</p>}
          <p>
            Your albums and photos are saved privately in this browser, on this device only. Nothing is uploaded. This is not a cloud backup: clearing browser data, private
            browsing, or (on iPhone) not opening the site for a while can remove them. Export a PDF of anything you want to keep safe.
          </p>
          {health?.supported && (
            <p className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span>
                Using {formatBytes(health.usage)}
                {health.quota ? ` of about ${formatBytes(health.quota)}` : ''}.
              </span>
              {health.persisted ? (
                <span className="inline-flex items-center gap-1 text-sage-ink">
                  <Icon name="check" size={16} /> Storage protected from automatic clean-up
                </span>
              ) : (
                <Button size="sm" variant="secondary" onClick={async () => (await requestPersistence(), setHealth(await storageHealth()))}>
                  Ask the browser to keep my albums
                </Button>
              )}
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
