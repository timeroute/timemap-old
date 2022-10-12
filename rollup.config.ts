import { defineConfig } from 'rollup';
import json from '@rollup/plugin-json';
import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';
import glslify from 'rollup-plugin-glslify';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import dev from 'rollup-plugin-dev';
import { babel } from '@rollup/plugin-babel';

export default defineConfig({
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/timemap.js',
      format: 'umd',
      name: 'timemap',
    }
  ],
  plugins: [
    typescript(),
    nodeResolve({
      browser: true
    }),
    babel({
      exclude: ["node_modules/**"],
      babelHelpers: 'runtime'
    }),
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