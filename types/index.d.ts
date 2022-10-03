export interface CameraProps {
  x: number;
  y: number;
  z: number;
}

export interface Position {
  x: number;
  y: number;
}

export interface VectorLayerOptions {
  url: string;
  tileSize: number;
  minZoom: number;
  maxZoom: number;
}