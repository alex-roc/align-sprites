// Page-wide drop and paste of images. `dragging` drives the full-page drop overlay.
import { useEffect, useRef, useState } from 'react';

const isImage = (f: File) => f.type.startsWith('image/');
let pasteSeq = 0;

export function useDropPaste(onImages: (files: File[]) => void, enabled = true): { dragging: boolean } {
  const [dragging, setDragging] = useState(false);
  const cb = useRef(onImages);
  useEffect(() => {
    cb.current = onImages;
  });

  useEffect(() => {
    if (!enabled) return;
    let depth = 0;
    const hasFiles = (e: DragEvent) => [...(e.dataTransfer?.types ?? [])].includes('Files');
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth++;
      setDragging(true);
    };
    const leave = () => {
      depth = Math.max(0, depth - 1);
      if (!depth) setDragging(false);
    };
    const over = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
    };
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setDragging(false);
      const files = [...(e.dataTransfer?.files ?? [])].filter(isImage);
      if (files.length) cb.current(files);
    };
    const paste = (e: ClipboardEvent) => {
      const files = [...(e.clipboardData?.files ?? [])].filter(isImage);
      if (!files.length) return;
      e.preventDefault();
      cb.current(files.map((f) => (f.name && f.name !== 'image.png' ? f : new File([f], `pasted-${++pasteSeq}.png`, { type: f.type }))));
    };
    document.addEventListener('dragenter', enter);
    document.addEventListener('dragleave', leave);
    document.addEventListener('dragover', over);
    document.addEventListener('drop', drop);
    document.addEventListener('paste', paste);
    return () => {
      document.removeEventListener('dragenter', enter);
      document.removeEventListener('dragleave', leave);
      document.removeEventListener('dragover', over);
      document.removeEventListener('drop', drop);
      document.removeEventListener('paste', paste);
    };
  }, [enabled]);

  return { dragging };
}
