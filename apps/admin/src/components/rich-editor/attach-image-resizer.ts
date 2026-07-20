/**
 * Lightweight image-resize behaviour for the Quill editor. No extra
 * package needed — we attach a click/drag handler to the editor root
 * that shows a corner-drag overlay when an <img> inside the content is
 * clicked. Dragging the bottom-right handle scales the image (aspect
 * ratio preserved); we write the new width to the img's inline style,
 * which Quill happily round-trips through its HTML serialisation.
 *
 * Called once from the QuillEditor after Quill mounts. Returns a
 * detach function so React can clean up on unmount.
 */
export function attachImageResizer(root: HTMLElement): () => void {
  const overlay = document.createElement('div');
  overlay.className = 'shesa-image-resize-overlay';
  overlay.style.cssText = [
    'position: absolute',
    'display: none',
    'border: 2px solid var(--color-primary, #8a1533)',
    'box-shadow: 0 0 0 2px rgba(255,255,255,0.6)',
    'pointer-events: none',
    'z-index: 20',
  ].join(';');

  const handle = document.createElement('div');
  handle.style.cssText = [
    'position: absolute',
    'right: -6px',
    'bottom: -6px',
    'width: 12px',
    'height: 12px',
    'background: var(--color-primary, #8a1533)',
    'border: 2px solid #fff',
    'border-radius: 2px',
    'cursor: nwse-resize',
    'pointer-events: auto',
  ].join(';');
  overlay.appendChild(handle);

  document.body.appendChild(overlay);

  let target: HTMLImageElement | null = null;

  const position = () => {
    if (!target) return;
    const rect = target.getBoundingClientRect();
    overlay.style.left = `${rect.left + window.scrollX}px`;
    overlay.style.top = `${rect.top + window.scrollY}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
    overlay.style.display = 'block';
  };

  const hide = () => {
    target = null;
    overlay.style.display = 'none';
  };

  const onClick = (e: MouseEvent) => {
    const t = e.target;
    if (t instanceof HTMLImageElement && root.contains(t)) {
      target = t;
      position();
    } else if (!(t instanceof HTMLElement && overlay.contains(t))) {
      hide();
    }
  };

  const onScrollOrResize = () => {
    if (target) position();
  };

  let dragging = false;
  let startX = 0;
  let startW = 0;
  let ratio = 1;

  const onHandleDown = (e: MouseEvent) => {
    if (!target) return;
    e.preventDefault();
    dragging = true;
    startX = e.clientX;
    startW = target.getBoundingClientRect().width;
    ratio = target.naturalHeight ? target.naturalWidth / target.naturalHeight : 1;
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const onMove = (e: MouseEvent) => {
    if (!dragging || !target) return;
    const delta = e.clientX - startX;
    const next = Math.max(60, startW + delta);
    target.style.width = `${Math.round(next)}px`;
    target.style.height = 'auto';
    target.setAttribute('width', String(Math.round(next)));
    target.setAttribute('height', String(Math.round(next / ratio)));
    position();
  };

  const onUp = () => {
    if (!dragging) return;
    dragging = false;
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    // Force Quill to notice the change so it flushes to the hidden input.
    const evt = new Event('input', { bubbles: true });
    root.dispatchEvent(evt);
  };

  handle.addEventListener('mousedown', onHandleDown);
  document.addEventListener('click', onClick, true);
  window.addEventListener('scroll', onScrollOrResize, true);
  window.addEventListener('resize', onScrollOrResize);

  return () => {
    handle.removeEventListener('mousedown', onHandleDown);
    document.removeEventListener('click', onClick, true);
    window.removeEventListener('scroll', onScrollOrResize, true);
    window.removeEventListener('resize', onScrollOrResize);
    overlay.remove();
  };
}
