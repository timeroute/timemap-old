import Renderer from "../webgl/renderer";
import { LAYERS } from "../constants";
import { fetchTile } from "../utils/fetch-data";

export default class VectorLayer {
  renderer: Renderer;
  id: string;
  url: string;
  tileSize: number;
  minZoom: number;
  maxZoom: number;
  tileData: any = {};
  fetchController: AbortController | undefined;
  
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
    // get latest tiles in view
    let tilesInView = this.renderer.getTilesInView();
    tilesInView = tilesInView.filter(([x, y, z]) => {
      const N = Math.pow(2, z);
      const validX = x >= 0 && x < N;
      const validY = y >= 0 && y < N;
      const validZ = z >= this.minZoom && z <= this.maxZoom;
      return validX && validY && validZ;
    });
    const tileData: any = {}
    const fetchController: AbortController = new AbortController();
    const tileReqs = tilesInView.map(async (tileInView) => {
      const tileKey = tileInView.join('/');
      tileData[tileKey] = this.tileData[tileKey];
      if (tileData[tileKey]) {
        console.log(tileKey, 'has cached');
        return;
      }
      const _tileData = await fetchTile({
        tile: tileInView,
        layers: LAYERS,
        url: this.url,
      });
      if (_tileData) tileData[tileKey] = _tileData;
    })
    await Promise.all(tileReqs);
    this.fetchController = fetchController;
    this.tileData = tileData;
    return tileData;
  }

  abortFetch() {
    if (this.fetchController) {
      this.fetchController.abort();
      this.fetchController = undefined;
    }
  }
}