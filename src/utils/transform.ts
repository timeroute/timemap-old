import earcut from 'earcut';
import MercatorCoordinate from "./mercator-coordinate";

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

export function geometryToVertices(geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon) {
  const verticesFromPolygon = (coordinates: GeoJSON.Position[][], n: number | undefined = undefined) => {
    const data = earcut.flatten(coordinates);
    const triangles = earcut(data.vertices, data.holes, 2);

    const vertices = new Float32Array(triangles.length * 2);
    for (let i = 0; i < triangles.length; i++) {
      const point = triangles[i];
      const lng = data.vertices[point * 2];
      const lat = data.vertices[point * 2 + 1];
      const [x, y] = MercatorCoordinate.fromLngLat([lng, lat]);
      vertices[i * 2] = x;
      vertices[i * 2 + 1] = y;
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