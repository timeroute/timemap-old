export const MIN_ZOOM: number = 0;
export const MAX_ZOOM: number = 16;
export const TILE_SIZE: number = 512;
export const TILE_BUFFER: number = 1;
export const LAYERS: any = {
  water: [180, 240, 250, 255],
  landcover: [202, 246, 193, 255],
  park: [202, 255, 193, 255],
  building: [185, 175, 139, 191],
};

export const DEFAULT_VECTOR_LAYER_OPTIONS = {
  tileSize: 512,
  minZoom: 0,
  maxZoom: 22,
}