import type { MapOptions, VectorLayerOptions } from '../types';
import MercatorCoordinate from "./utils/mercator-coordinate";
import Renderer from "./webgl/renderer";

const defaultMapOptions: MapOptions = {
  center: [0, 0],
  zoom: 1,
  pitch: 90,
  bearing: 0,
}

class Map {
  dom: HTMLElement;
  canvas: HTMLCanvasElement;
  renderer: Renderer;
  options: MapOptions;

  constructor(id: string, options: MapOptions) {
    const dom = document.getElementById(id);
    if (!dom) {
      throw new Error("dom id not found");
    }
    this.options = Object.assign(defaultMapOptions, options);
    this.canvas = document.createElement('canvas');
    dom.style.overflow = 'hidden';
    this.canvas.width = dom.clientWidth;
    this.canvas.height = dom.clientHeight;
    dom.append(this.canvas);
    this.dom = dom;
    this.renderer = new Renderer(this.canvas);
    this.setZoom(this.options.zoom);
    this.flyTo(this.options.center);
  }

  setZoom(zoom: number) {
    const {x, y} = this.renderer.camera;
    this.renderer.camera = {
      x, y, z: zoom,
    }
    this.renderer.updateMatrix();
  }

  flyTo(center: [number, number]) {
    const [x, y] = MercatorCoordinate.fromLngLat(center);
    this.renderer.camera = {
      x, y, z: this.renderer.camera.z
    }
    this.renderer.updateMatrix();
  }

  addLayer(id: string, type: 'vector' | 'geojson', options: VectorLayerOptions) {
    this.renderer.addLayer(id, type, options);
    this.renderer.draw();
  }
}

export default Map;
