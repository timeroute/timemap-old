import earcut from 'earcut';
import { CameraProps } from '../../types';
import { TILE_SIZE } from '../constants';
import MercatorCoordinate from "./mercator-coordinate";

/**
 * get clip space position
 * @param ev mouse event
 * @param canvas map canvas
 * @returns [x, y]
 */
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

/**
 * get vertices from geometry
 * @param geometry GeoJSON Geometry with Polygon or MultiPolygon
 * @returns Float32Array
 */
export function geometryToVertices(geometry: GeoJSON.Geometry) {
  const verticesFromPolygon = (coordinates: GeoJSON.Position[][], n: number | undefined = undefined) => {
    const data = earcut.flatten(coordinates);
    const triangles = earcut(data.vertices, data.holes, 2);    

    const vertices = new Float32Array(triangles.length * 3);
    for (let i = 0; i < triangles.length; i++) {
      const point = triangles[i];
      const lng = data.vertices[point * 2];
      const lat = data.vertices[point * 2 + 1];
      const [x, y] = MercatorCoordinate.fromLngLat([lng, lat]);
      vertices[i * 3] = x;
      vertices[i * 3 + 1] = y;
      vertices[i * 3 + 2] = 1.0;
    }
    return vertices;
  }

  if (geometry.type === 'Polygon') {
    return verticesFromPolygon(geometry.coordinates);
  }

  if (geometry.type === 'MultiPolygon') {
    const positions: number[] = [];
    geometry.coordinates.forEach((polygon, i) => {
      const vertices = verticesFromPolygon([polygon[0]], i);

      // doing an array.push with too many values can cause
      // stack size errors, so we manually iterate and append
      vertices.forEach((vertex) => {
        positions[positions.length] = vertex;
      });
    });
    return Float32Array.from(positions);
  }

  // only support Polygon & Multipolygon for now
  return new Float32Array([]);
}

/**
 * returns the lng/lat bbox for the viewport
 * @param camera camera position
 * @param width canvas width
 * @param height canvas height
 * @returns [minx, miny, maxx, maxy]
 */
export function getBounds(camera: CameraProps, width: number, height: number) {
    const zoomScale = Math.pow(2, camera.z);

  const px = (1 + camera.x) / 2;
  const py = (1 - camera.y) / 2;

  const wx = px * TILE_SIZE;
  const wy = py * TILE_SIZE;

  // get zoom px
  const zx = wx * zoomScale;
  const zy = wy * zoomScale;

  // get bottom-left and top-right pixels
  let x1 = zx - (width / 2);
  let y1 = zy + (height / 2);
  let x2 = zx + (width / 2);
  let y2 = zy - (height / 2);

  // convert to world coords
  x1 = x1 / zoomScale / TILE_SIZE;
  y1 = y1 / zoomScale / TILE_SIZE;
  x2 = x2 / zoomScale / TILE_SIZE;
  y2 = y2 / zoomScale / TILE_SIZE;

  // get LngLat bounding box
  const bbox = [
    Math.max(MercatorCoordinate.lngFromMercatorX(x1), -180),
    Math.max(MercatorCoordinate.latFromMercatorY(y1), -85.05),
    Math.min(MercatorCoordinate.lngFromMercatorX(x2), 180),
    Math.min(MercatorCoordinate.latFromMercatorY(y2), 85.05),
  ];

  return bbox;
}