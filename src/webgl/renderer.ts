import vertexShaderSource from '../shaders/vertex_shader.glsl';
import fragShaderSource from '../shaders/frag_shader.glsl';
import { createShader } from './shader';
import { createProgram } from './program';
import { mat3, vec3 } from 'gl-matrix';
import tilebelt from '@mapbox/tilebelt';
import type { CameraProps, Position, VectorLayerOptions } from '../../types';
import { getBounds, getClipSpacePosition } from '../utils/transform';
import { DEFAULT_VECTOR_LAYER_OPTIONS, LAYERS, MAX_ZOOM, MIN_ZOOM, TILE_BUFFER, TILE_SIZE } from '../constants';
import VectorLayer from '../layers/vector_layer';

/**
 * Renderer
 */
class Renderer {
  /**
   * map canvas element
   */
  canvas: HTMLCanvasElement;
  /**
   * map gl context
   */
  gl: WebGLRenderingContext;
  /**
   * webgl program
   */
  program: WebGLProgram | undefined;
  /**
   * glPosition in vertex shader
   */
  posLocation: number | undefined;
  /**
   * buffer data to glPosition
   */
  positions: Float32Array = new Float32Array([]);
  /**
   * camera in map
   */
  camera: CameraProps = {
    x: 0,
    y: 0,
    z: 0,
  };
  /**
   * transform matrix
   */
  matrix: mat3 = mat3.create();
  /**
   * mouse event start position
   */
  startPosition: Position = {
    x: 0,
    y: 0,
  }
  /**
   * layer managers
   */
  layerManagers: Array<VectorLayer> = [];

  /**
   * constructor function in Renderer class
   * @param canvas canvas element to init map
   */
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    const gl = this.canvas.getContext('webgl');
    if (!gl) {
      throw new Error('webgl can not init');
    }
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    this.gl = gl;
    this.init();
  }

  /**
   * init shader, program and buffer
   */
  init() {
    this.gl.clearColor(1.0, 1.0, 1.0, 1.0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    const vertexShader = createShader(this.gl, vertexShaderSource, this.gl.VERTEX_SHADER)!;
    const fragShader = createShader(this.gl, fragShaderSource, this.gl.FRAGMENT_SHADER)!;
    const program = createProgram(this.gl, vertexShader, fragShader)!;
    this.gl.useProgram(program);
    this.program = program;

    const positionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);

    this.posLocation = this.gl.getAttribLocation(this.program, 'a_position');
    this.gl.enableVertexAttribArray(this.posLocation);
    this.canvas.addEventListener('mousedown', this.mousedown);
    this.canvas.addEventListener('wheel', this.mousezoom);

    this.updateMatrix()
  }

  /**
   * update transform matrix
   */
  updateMatrix() {
    const cameraMatrix = mat3.create();
    mat3.translate(cameraMatrix, cameraMatrix, [this.camera.x, this.camera.y]);
    const zoomScale = 1 / Math.pow(2, this.camera.z);
    const widthScale = TILE_SIZE / this.canvas.width;
    const heightScale = TILE_SIZE / this.canvas.height;
    mat3.scale(cameraMatrix, cameraMatrix, [zoomScale / widthScale, zoomScale / heightScale]);
    this.matrix = mat3.multiply(
      mat3.create(),
      mat3.create(),
      mat3.invert(mat3.create(), cameraMatrix)
    )
  }

  /**
   * get tiles in screen map
   * @returns tiles
   */
  getTilesInView(): [number, number, number][] {
    const {camera, canvas: {width, height}} = this;
    const bbox = getBounds(camera, width, height);
    
    const z = Math.min(Math.trunc(camera.z), MAX_ZOOM);
    const minTile = tilebelt.pointToTile(bbox[0], bbox[3], z); // top-left
    const maxTile = tilebelt.pointToTile(bbox[2], bbox[1], z); // bottom-right

    const tilesInView: [number, number, number][] = [];
    const [minX, maxX] = [Math.max(minTile[0], 0), maxTile[0]];
    const [minY, maxY] = [Math.max(minTile[1], 0), maxTile[1]];
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        tilesInView.push([x, y, z]);
      }
    }
    const bufferedTiles = [];
    for (let bufX = minX - TILE_BUFFER; bufX <= maxX + TILE_BUFFER; bufX++) {
      for (let bufY = minY - TILE_BUFFER; bufY <= maxY + TILE_BUFFER; bufY++) {
        bufferedTiles.push([bufX, bufY, z]); // buffer in xy direction

        // load parent tiles 2 levels up
        bufferedTiles.push(tilebelt.getParent([bufX, bufY, z]));
        bufferedTiles.push(tilebelt.getParent(tilebelt.getParent([bufX, bufY, z])));
      }
    }
    return tilesInView.concat(bufferedTiles);
  }

  /**
   * get layer by id
   * @param id layer id
   * @returns layer
   */
  getLayer(id: string) {
    return this.layerManagers.find(layer => layer.id === id);
  }
  
  /**
   * add layer
   * @param id layer id
   * @param type support vector or geojson layer
   * @param options layer options
   */
  addLayer(id: string, type: 'vector' | 'geojson', options: VectorLayerOptions) {
    if (this.getLayer(id)) throw new Error("layer id exists");
    if (type === 'vector') {
      const { url, tileSize, minZoom, maxZoom } = Object.assign(DEFAULT_VECTOR_LAYER_OPTIONS, options);
      const layer = new VectorLayer(this, id, url, tileSize, minZoom, maxZoom);
      this.layerManagers.push(layer);
    }
  }
  
  /**
   * render to map
   * @returns 
   */
  draw() {
    if (!this.program) return;
    const matrixLocation = this.gl.getUniformLocation(this.program, "u_matrix");
    this.gl.uniformMatrix3fv(matrixLocation, false, this.matrix);

    this.layerManagers.forEach(async (layerManager) => {
      layerManager.abortFetch();
      const data = await layerManager.fetchData();
      
      Object.keys(data).forEach((tile) => {
        Object.keys(LAYERS).forEach((layer) => {
          if (!this.program) return;
          const features = data[tile][layer];
          const color = LAYERS[layer].map((n: number) => n / 255); // RGBA to WebGL color
  
          // set color uniform for layer
          const colorLocation = this.gl.getUniformLocation(this.program, "u_color");
          this.gl.uniform4fv(colorLocation, color);
  
          // render each feature
          (features || []).forEach((feature: Float32Array) => {
            if (!this.program) return;  
            // create buffer for vertices
            const positionBuffer = this.gl.createBuffer();
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, feature, this.gl.STATIC_DRAW);
  
            if (this.posLocation === undefined) return;
      
            // tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
            const size = 3;
            const type = this.gl.FLOAT;
            const normalize = false;
            const stride = 0;
            let offset = 0; 
            this.gl.vertexAttribPointer(this.posLocation, size, type, normalize, stride, offset);
  
            // draw
            const primitiveType = this.gl.TRIANGLES;
            offset = 0;
            const count = feature.length / 3;
            this.gl.drawArrays(primitiveType, offset, count);
          });
        });
      });
    })
  }

  /**
   * mouse move event
   * @param ev mouse move event data
   * @returns 
   */
  mousemove = (ev: MouseEvent) => {
    const [x, y] = getClipSpacePosition(ev, this.canvas);
    const [preX, preY] = vec3.transformMat3(
      vec3.create(),
      [this.startPosition.x, this.startPosition.y, 0],
      mat3.invert(mat3.create(), this.matrix)
    );
    const [postX, postY] = vec3.transformMat3(
      vec3.create(),
      [x, y, 0],
      mat3.invert(mat3.create(), this.matrix),
    )
    let deltaX = preX - postX;
    let deltaY = preY - postY;
    
    if (isNaN(deltaX) || isNaN(deltaY)) {
      return;
    }
    this.camera.x += deltaX;
    this.camera.y += deltaY;

    this.startPosition.x = x;
    this.startPosition.y = y;
    
    this.updateMatrix();
    this.draw();
  }

  /**
   * mouse down event
   * @param ev mouse down event data
   * @returns 
   */
  mousedown = (ev: MouseEvent) => {
    const [x, y] = getClipSpacePosition(ev, this.canvas);
    this.startPosition = {x, y};
    this.canvas.style.cursor = 'grabbing';
    this.canvas.addEventListener('mousemove', this.mousemove);
    this.canvas.addEventListener('mouseup', this.mouseup);
  }

  /**
   * mouse wheel event
   * @param ev mouse wheel event data
   * @returns 
   */
  mousezoom = (ev: WheelEvent) => {
    ev.preventDefault();
    const [x, y] = getClipSpacePosition(ev, this.canvas);
    const [preZoomX, preZoomY] = vec3.transformMat3(
      vec3.create(),
      [x, y, 0],
      mat3.invert(mat3.create(), this.matrix)
    );
    const zoomDelta = -ev.deltaY * (1 / 300);
    this.camera.z += zoomDelta;
    this.camera.z = Math.max(MIN_ZOOM, Math.min(this.camera.z, MAX_ZOOM));
    this.updateMatrix();
    const [postZoomX, postZoomY] = vec3.transformMat3(
      vec3.create(),
      [x, y, 0],
      mat3.invert(mat3.create(), this.matrix)
    );

    this.camera.x += preZoomX - postZoomX;
    this.camera.y += preZoomY - postZoomY;
    this.updateMatrix();
    this.draw();
  }

  /**
   * mouse up event
   * @returns 
   */
  mouseup = () => {
    this.canvas.style.cursor = 'grab';
    this.canvas.removeEventListener('mousemove', this.mousemove);
    this.canvas.removeEventListener('mouseup', this.mouseup);
  }
}

export default Renderer;
