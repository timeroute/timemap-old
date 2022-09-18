attribute vec3 a_position;

uniform mat3 u_matrix; // 3 X 3 matrix

void main() {
  vec3 position = (u_matrix * a_position);
  gl_Position = vec4(position, 1);
}