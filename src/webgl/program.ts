function createProgram(gl: WebGLRenderingContext, vertexShader: WebGLShader, fragShader: WebGLShader) {
  const program = gl.createProgram();
  if (!program) throw new Error("gl can not create program");
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragShader);
  gl.linkProgram(program);
  let success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (success) {
    return program;
  }
  console.error(gl.getProgramInfoLog(program));
  gl.deleteProgram(program);
}

export {
  createProgram,
}
