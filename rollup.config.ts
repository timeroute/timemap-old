import { defineConfig } from 'rollup';
import json from '@rollup/plugin-json';
import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';
import glslify from 'rollup-plugin-glslify';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import dev from 'rollup-plugin-dev';

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
    glslify(),
    dev({
      proxy: [
        { from: '/map', to: 'https://maps.ckochis.com/data/v3', opts: {
          crossOriginIsolated: true,
        } }
      ]
    })
  ]
})