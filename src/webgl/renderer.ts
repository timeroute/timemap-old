import vertexShaderSource from '../shaders/vertex_shader.glsl';
import fragShaderSource from '../shaders/frag_shader.glsl';
import { createShader } from './shader';
import { createProgram } from './program';
import { mat3 } from 'gl-matrix';
import type { CameraProps } from '../../types';

class Renderer {
  canvas: HTMLCanvasElement;
  gl: WebGLRenderingContext;
  program: WebGLProgram | undefined;
  posLocation: number | undefined;
  camera: CameraProps = {
    x: 0,
    y: 0,
    z: 0,
  };
  matrix: mat3 = mat3.create();

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
    this.gl.clearColor(1.0, 0.0, 0.0, 1.0);
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
  
  draw(positions: number[]) {
    if (!this.program) return;
    const matrixLocation = this.gl.getUniformLocation(this.program, "u_matrix");
    this.gl.uniformMatrix3fv(matrixLocation, false, this.matrix);
    
    if (this.posLocation === undefined) return;
    console.log(positions);
    
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);
    this.gl.vertexAttribPointer(this.posLocation, positions.length / 3, this.gl.FLOAT, false, 0, 0);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, positions.length / 3);
  }
}

export default Renderer;
