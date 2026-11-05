import type { Photo } from '@/domain/types';
import { usePhotoUrl } from '@/storage/urls';

export function Thumb({ photo, className = '', alt = '' }: { photo: Pick<Photo, 'id'>; className?: string; alt?: string }) {
  const url = usePhotoUrl(photo.id, 'thumb');
  return url ? <img src={url} alt={alt} className={`object-cover ${className}`} draggable={false} /> : <div className={`animate-pulse bg-sand ${className}`} />;
}
