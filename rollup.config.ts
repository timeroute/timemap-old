import { defineConfig } from 'rollup';
import json from '@rollup/plugin-json';
import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';
import serve from 'rollup-plugin-serve'
import glslify from 'rollup-plugin-glslify';
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default defineConfig({
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/timemap.cjs',
      format: 'cjs',
      name: 'timemap'
    },
    {
      file: 'dist/timemap.mjs',
      format: 'umd',
      name: 'timemap'
    }
  ],
  plugins: [
    typescript({
      resolveJsonModule: true
    }),
    nodeResolve(),
    commonjs(),
    json(),
    serve(),
    glslify()
  ]
})