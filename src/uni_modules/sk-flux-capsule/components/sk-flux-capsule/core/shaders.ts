/**
 * SK-FLUX Capsule — GLSL 着色器源码
 *
 * 片元着色器基于域扭曲 FBM(Domain-Warped Fractional Brownian Motion)：
 * 两层分形噪声互相推挤形成水彩云雾质感，三主题色按噪声值插值，
 * 左侧渐隐白区为文字留白。所有像素计算均在 GPU 完成。
 */

/** 顶点着色器：单个全屏三角形(比两个三角形的 quad 少一次顶点处理) */
export const VERTEX_SHADER = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`

/** 片元着色器：域扭曲 FBM 流体云雾(2~6 色分段渐变) */
export const FRAGMENT_SHADER = `
precision highp float;
#define MAX_COLORS 6
uniform vec2  uRes;              /* 画布物理分辨率 */
uniform float uTime;             /* 累积流动时间(由 JS 按速度积分) */
uniform float uActive;           /* 按压/激活强度 0~1(驱动色彩饱和) */
uniform vec3  uColors[MAX_COLORS]; /* 调色板 */
uniform float uCount;            /* 实际颜色数 2~6 */
uniform float uSeed;             /* 噪声种子，保证每颗胶囊纹理唯一 */

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21) + uSeed);
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0, amp = 0.55;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 5; i++) {
    v += amp * noise(p);
    p = rot * p * 2.0 + 3.7;
    amp *= 0.5;
  }
  return v;
}

/* 调色板分段插值：x∈[0,1] 映射到 uCount 个颜色的平滑渐变带
   WebGL1 要求常量循环上限，越界段用 uCount 条件跳过 */
vec3 paletteMix(float x) {
  float pos = clamp(x, 0.0, 1.0) * (uCount - 1.0);
  vec3 result = uColors[0];
  for (int i = 1; i < MAX_COLORS; i++) {
    if (float(i) <= uCount - 1.0) {
      float t = smoothstep(0.15, 0.85, pos - float(i - 1));
      result = mix(result, uColors[i], t);
    }
  }
  return result;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = uv * vec2(uRes.x / uRes.y, 1.0) * 1.6;
  float t = uTime;

  /* 域扭曲：两层噪声互相推动，颜色像在"呼吸" */
  vec2 q = vec2(fbm(p + t * vec2(0.6, 0.2)),
                fbm(p + t * vec2(-0.4, 0.5) + 5.2));
  vec2 r = vec2(fbm(p + 2.2 * q + t * vec2(0.3, -0.4) + 1.7),
                fbm(p + 2.2 * q + t * vec2(-0.2, 0.3) + 8.3));
  float f = fbm(p + 2.4 * r);

  /* 多色分段混合：f 主导渐变位置，q.x 提供横向色彩漂移 */
  float mixKey = clamp(
    smoothstep(0.15, 0.95, f) * 0.7 + clamp(q.x * 1.3, 0.0, 1.0) * 0.3,
    0.0, 1.0);
  vec3 col = paletteMix(mixKey);
  col += 0.15 * r.y * paletteMix(0.5);   /* 中间色高光泛色 */
  /* 按压时颜色变饱满(移动端触摸反馈) */
  col = mix(col, col * col * 1.35 + col * 0.12, uActive * 0.55);

  /* 左侧渐隐白区留白给文字，顶部淡白雾 */
  float colorZone = smoothstep(0.30, 0.80, uv.x + 0.15 * (q.y - 0.5));
  float whiteT = smoothstep(0.50, 1.05, uv.y) * 0.55;
  float density = smoothstep(0.32, 0.85, f + 0.22 * r.x);
  vec3 base = vec3(0.985);
  float mask = clamp(colorZone * density + colorZone * 0.15, 0.0, 1.0);
  vec3 outCol = mix(base, col, mask);
  outCol = mix(outCol, base, whiteT * (1.0 - mask * 0.55));

  gl_FragColor = vec4(outCol, 1.0);
}
`
