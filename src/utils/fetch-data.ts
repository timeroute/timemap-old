import earcut from 'earcut';
import Protobuf from 'pbf';
import { VectorTile } from '@mapbox/vector-tile';

import MercatorCoordinate from './mercator-coordinate';

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

const getTileURL = (url: string, x: number, y: number, z: number) => (
  url
    .replace('{x}', String(x))
    .replace('{y}', String(y))
    .replace('{z}', String(z))
);

export const fetchTile = async ({ tile, layers, url }: any) => {
  const [x, y, z] = tile;
  const res = await fetch(url.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y)));
  const data = await res.arrayBuffer();
  const pbf = new Protobuf(data);
  const tileData = new VectorTile(pbf);

  const layerDatas: any = {};
  Object.keys(layers).forEach((layer) => {
    if (tileData?.layers?.[layer]) {
      // @ts-ignore
      const numFeatures = tileData.layers[layer]?._features?.length || 0;
      const features = [];
      for (let i = 0; i < numFeatures; i++) {
        const geojson = tileData.layers[layer].feature(i).toGeoJSON(x, y, z);
        const vertices = geometryToVertices(geojson.geometry);
        features.push(vertices);
      }
      layerDatas[layer] = features;
    }
  });

  return layerDatas;
}