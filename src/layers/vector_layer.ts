import Renderer from "../webgl/renderer";
import Protobuf from 'pbf';
import { VectorTile } from "@mapbox/vector-tile";
import { LAYERS } from "../constants";
import { geometryToVertices } from "../utils/transform";

export default class VectorLayer {
  renderer: Renderer;
  id: string;
  url: string;
  tileSize: number;
  minZoom: number;
  maxZoom: number;
  tileKey: string = '';
  data: any;
  
  constructor(renderer: Renderer, id: string, url: string, tileSize: number, minZoom: number, maxZoom: number) {
    this.renderer = renderer;
    this.id = id;
    this.url = url;
    this.tileSize = tileSize;
    this.minZoom = minZoom;
    this.maxZoom = maxZoom;
    this.checkOptions();
  }

  checkOptions() {
    if (!this.url) throw new Error("url must be set");
    if (this.tileSize !== 512 && this.tileSize !== 256) throw new Error("tileSize must be equal to 256 or 512");
    if (this.minZoom < 0) throw new Error("minZoom must be greater than 0");
    if (this.maxZoom > 22) throw new Error("maxZoom must be less than 22");
  }

  async fetchData() {
    this.checkOptions();
    const tilesInView = this.renderer.getTilesInView();
    const key = tilesInView.map(t => t.join('/')).join(';');
    if (this.tileKey === key) return this.data;
    const tileData: any = {}
    const tileReqs = tilesInView.map(async (tileInView) => {
      const [x, y, z] = tileInView;
      const res = await fetch(this.url.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y)));
      const data = await res.arrayBuffer();
      const pbf = new Protobuf(data);
      const tile = new VectorTile(pbf);

      const layers: any = {};
      Object.keys(LAYERS).forEach((layer) => {
        if (tile?.layers?.[layer]) {
          // @ts-ignore
          const numFeatures = tile.layers[layer]?._features?.length || 0;
          const features = [];
          for (let i = 0; i < numFeatures; i++) {
            const geojson = tile.layers[layer].feature(i).toGeoJSON(x, y, z);
            const vertices = geometryToVertices(geojson.geometry);
            features.push(vertices);
          }
          layers[layer] = features;
        }
      });
      tileData[tileInView.join('/')] = layers;
    })
    await Promise.all(tileReqs);
    this.tileKey = key;
    this.data = tileData;
    return tileData;
  }
}