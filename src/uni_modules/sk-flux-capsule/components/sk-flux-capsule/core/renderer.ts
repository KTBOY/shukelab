/**
 * SK-FLUX Capsule — WebGL 渲染器
 *
 * 平台无关：只依赖标准 WebGLRenderingContext 接口，
 * H5 传入 <canvas> 的上下文，小程序传入 canvas node 的上下文。
 *
 * 性能设计：
 * - 单全屏三角形，顶点缓冲静态上传一次
 * - uniform location 编译期缓存，帧循环零查找
 * - dispose() 完整释放 GPU 资源，防止页面切换泄漏
 */
import { FRAGMENT_SHADER, VERTEX_SHADER } from './shaders'

/** RGB 颜色，分量取值 0~1 */
export type RGB = readonly [number, number, number]

/** 与着色器 MAX_COLORS 保持一致 */
const MAX_COLORS = 6

export interface SkFluxRendererOptions {
  /** 调色板，2~6 个颜色(单色请先经 normalizePalette 派生) */
  colors: readonly RGB[]
  /** 噪声种子，不同实例传不同值保证纹理唯一 */
  seed: number
}

export interface SkFluxRenderer {
  /** 绘制一帧。time 为累积流动时间，active 为按压强度 0~1 */
  render(time: number, active: number): void
  /** 画布物理尺寸变化时调用 */
  resize(width: number, height: number): void
  /** 释放全部 GPU 资源 */
  dispose(): void
}

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader {
  const shader = gl.createShader(type)
  if (!shader) throw new Error('[sk-flux-capsule] createShader failed')
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader)
    gl.deleteShader(shader)
    throw new Error(`[sk-flux-capsule] shader compile error: ${log ?? 'unknown'}`)
  }
  return shader
}

/**
 * 创建渲染器。调用方负责保证 gl 上下文有效；
 * 上下文丢失时 render 静默跳过，不抛异常。
 */
export function createSkFluxRenderer(
  gl: WebGLRenderingContext,
  options: SkFluxRendererOptions,
): SkFluxRenderer {
  const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER)
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER)
  const program = gl.createProgram()
  if (!program) throw new Error('[sk-flux-capsule] createProgram failed')
  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`[sk-flux-capsule] link error: ${gl.getProgramInfoLog(program) ?? ''}`)
  }
  gl.useProgram(program)

  /* 全屏三角形顶点，静态上传一次 */
  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW,
  )
  const aPos = gl.getAttribLocation(program, 'aPos')
  gl.enableVertexAttribArray(aPos)
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

  /* uniform location 一次性缓存 */
  const uRes = gl.getUniformLocation(program, 'uRes')
  const uTime = gl.getUniformLocation(program, 'uTime')
  const uActive = gl.getUniformLocation(program, 'uActive')

  /* 调色板扁平上传：不足 MAX_COLORS 的槽位用末色填充，避免未初始化数据 */
  const count = Math.max(2, Math.min(options.colors.length, MAX_COLORS))
  const palette = new Float32Array(MAX_COLORS * 3)
  for (let i = 0; i < MAX_COLORS; i++) {
    palette.set(options.colors[Math.min(i, count - 1)], i * 3)
  }
  gl.uniform3fv(gl.getUniformLocation(program, 'uColors[0]'), palette)
  gl.uniform1f(gl.getUniformLocation(program, 'uCount'), count)
  gl.uniform1f(gl.getUniformLocation(program, 'uSeed'), options.seed)

  let width = gl.drawingBufferWidth
  let height = gl.drawingBufferHeight
  gl.viewport(0, 0, width, height)

  return {
    render(time: number, active: number): void {
      if (gl.isContextLost()) return
      gl.uniform2f(uRes, width, height)
      gl.uniform1f(uTime, time)
      gl.uniform1f(uActive, active)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    },
    resize(w: number, h: number): void {
      width = w
      height = h
      gl.viewport(0, 0, w, h)
    },
    dispose(): void {
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
    },
  }
}
