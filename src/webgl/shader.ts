function createShader(gl: WebGLRenderingContext, shaderSource: string, shaderType: number) {
  const shader = gl.createShader(shaderType);
  if (!shader) throw new Error("gl can not create shader");
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);
  let success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (success) {
    return shader;
  }
  console.error(gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
}

export {
  createShader,
}
