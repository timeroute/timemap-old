import vertexShaderSource from '../shaders/vertex_shader.glsl';
import fragShaderSource from '../shaders/frag_shader.glsl';
import { createShader } from './shader';
import { createProgram } from './program';
import { mat3, vec3 } from 'gl-matrix';
import type { CameraProps, Position } from '../../types';
import { getClipSpacePosition } from '../utils/transform';

class Renderer {
  canvas: HTMLCanvasElement;
  gl: WebGLRenderingContext;
  program: WebGLProgram | undefined;
  posLocation: number | undefined;
  positions: number[] = [];
  camera: CameraProps = {
    x: 0,
    y: 0,
    z: 0,
  };
  matrix: mat3 = mat3.create();
  startPosition: Position = {
    x: 0,
    y: 0,
  }

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

    this.updateMatrix()
  }

  updateMatrix() {
    const cameraMatrix = mat3.create();
    mat3.translate(cameraMatrix, cameraMatrix, [this.camera.x, this.camera.y]);
    const zoomScale = 1 / Math.pow(2, this.camera.z);
    mat3.scale(cameraMatrix, cameraMatrix, [zoomScale, zoomScale]);
    this.matrix = mat3.multiply(
      mat3.create(),
      mat3.create(),
      mat3.invert(mat3.create(), cameraMatrix)
    )
  }

  setData(positions: number[]) {
    this.positions = positions;
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);
  }
  
  draw() {
    if (!this.program) return;
    
    const matrixLocation = this.gl.getUniformLocation(this.program, "u_matrix");
    this.gl.uniformMatrix3fv(matrixLocation, false, this.matrix);
    
    if (this.posLocation === undefined) return;
    
    this.gl.vertexAttribPointer(this.posLocation, this.positions.length / 3, this.gl.FLOAT, false, 0, 0);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, this.positions.length / 3);
  }

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

  mousedown = (ev: MouseEvent) => {
    const [x, y] = getClipSpacePosition(ev, this.canvas);
    this.startPosition = {x, y};
    this.canvas.style.cursor = 'grabbing';
    this.canvas.addEventListener('mousemove', this.mousemove);
    this.canvas.addEventListener('mouseup', this.clear);
  }

  mousezoom = (ev: WheelEvent) => {
    ev.preventDefault();
  }

  clear = () => {
    this.canvas.style.cursor = 'grab';
    this.canvas.removeEventListener('mousemove', this.mousemove);
    this.canvas.removeEventListener('mouseup', this.clear);
  }
}

export default Renderer;
