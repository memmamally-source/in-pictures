import { useRef, type ReactNode } from 'react';

import type { Photo } from '@/domain/types';
import { useProject } from '@/state/project';
import { ACCEPTED } from '@/storage/images';

import { Button, type ButtonProps } from './ui';

/**
 * Standard browser file input (no camera-roll access is assumed). On phones
 * the system sheet offers the library and the camera; `camera` opens the
 * camera directly where the browser supports `capture`.
 */
export function PhotoInput({ extra, camera, children, ...button }: { extra?: Partial<Pick<Photo, 'planItemId' | 'chapter'>>; camera?: boolean; children: ReactNode } & ButtonProps) {
  const ref = useRef<HTMLInputElement>(null);
  const addFiles = useProject((s) => s.addFiles);
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept={camera ? 'image/*' : `${ACCEPTED},image/*`}
        multiple={!camera}
        capture={camera ? 'environment' : undefined}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = '';
          if (files.length) void addFiles(files, extra);
        }}
      />
      <Button {...button} onClick={() => ref.current?.click()}>
        {children}
      </Button>
    </>
  );
}
