export function getClipSpacePosition (ev: MouseEvent, canvas: HTMLCanvasElement) {
  const [x, y] = [ev.clientX, ev.clientY];
  const rect = canvas.getBoundingClientRect();
  const cssX = x - rect.left;
  const cssY = y - rect.top;
  const normalizedX = cssX / canvas.clientWidth;
  const normalizedY = cssY / canvas.clientHeight;
  const clipX = normalizedX * 2 - 1;
  const clipY = normalizedY * -2 + 1;
  return [clipX, clipY];
}
