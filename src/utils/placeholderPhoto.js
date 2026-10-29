/**
 * 예시 데이터용 옷 사진. 실제 사진 대신 캔버스로 상품 사진처럼 그림
 * (밝은 배경 + 바닥 그림자 + 옷 모양·주름·단추 같은 디테일)
 */
const SIZE = 600

function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16)
  const mix = (c) =>
    Math.max(0, Math.min(255, Math.round(c + (amount > 0 ? (255 - c) * amount : c * amount))))
  const r = mix(n >> 16)
  const g = mix((n >> 8) & 255)
  const b = mix(n & 255)
  return `rgb(${r}, ${g}, ${b})`
}

function background(ctx) {
  const bg = ctx.createLinearGradient(0, 0, 0, SIZE)
  bg.addColorStop(0, '#f4f2ee')
  bg.addColorStop(1, '#e6e2db')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, SIZE, SIZE)
  // 바닥 그림자
  const shadow = ctx.createRadialGradient(300, 545, 10, 300, 545, 210)
  shadow.addColorStop(0, 'rgba(60, 50, 40, 0.22)')
  shadow.addColorStop(1, 'rgba(60, 50, 40, 0)')
  ctx.fillStyle = shadow
  ctx.beginPath()
  ctx.ellipse(300, 545, 210, 26, 0, 0, Math.PI * 2)
  ctx.fill()
}

/** 옷 면 채우기: 기본색 + 왼쪽 위에서 오는 빛 + 테두리 */
function fillCloth(ctx, path, color) {
  ctx.fillStyle = color
  ctx.fill(path)
  const light = ctx.createLinearGradient(120, 80, 480, 520)
  light.addColorStop(0, 'rgba(255,255,255,0.20)')
  light.addColorStop(0.55, 'rgba(255,255,255,0)')
  light.addColorStop(1, 'rgba(0,0,0,0.16)')
  ctx.fillStyle = light
  ctx.fill(path)
  ctx.strokeStyle = shade(color, -0.25)
  ctx.lineWidth = 3
  ctx.stroke(path)
}

function line(ctx, color, width, points, dash) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  if (dash) ctx.setLineDash(dash)
  ctx.beginPath()
  ctx.moveTo(...points[0])
  for (const p of points.slice(1)) ctx.lineTo(...p)
  ctx.stroke()
  ctx.restore()
}

function top(ctx, color, { long = true, neck = 'round' } = {}) {
  const sleeveEnd = long ? 440 : 250
  const p = new Path2D(`
    M 228 92 Q 300 ${neck === 'round' ? 128 : 150} 372 92
    L 450 120 Q 482 135 490 170 L ${long ? 520 : 500} ${sleeveEnd}
    L ${long ? 470 : 440} ${sleeveEnd + 12} L 432 230
    L 432 500 Q 300 516 168 500 L 168 230
    L ${long ? 130 : 160} ${sleeveEnd + 12} L ${long ? 80 : 100} ${sleeveEnd}
    L 110 170 Q 118 135 150 120 Z`)
  fillCloth(ctx, p, color)
  return p
}

const DRAW = {
  knit(ctx, color) {
    top(ctx, color)
    const dark = shade(color, -0.18)
    // 목·소매·밑단 고무단
    for (let x = 176; x <= 424; x += 12)
      line(ctx, dark, 2, [
        [x, 478],
        [x, 500],
      ])
    for (let i = 0; i < 6; i++) {
      line(ctx, dark, 2, [
        [86 + i * 8, 420 + i * 2],
        [80 + i * 8, 440 + i * 2],
      ])
      line(ctx, dark, 2, [
        [514 - i * 8, 420 + i * 2],
        [520 - i * 8, 440 + i * 2],
      ])
    }
    ctx.strokeStyle = dark
    ctx.lineWidth = 8
    ctx.beginPath()
    ctx.moveTo(232, 98)
    ctx.quadraticCurveTo(300, 140, 368, 98)
    ctx.stroke()
    // 꽈배기 무늬
    for (const x of [250, 350]) {
      for (let y = 170; y < 460; y += 34) {
        line(ctx, dark, 3, [
          [x - 12, y],
          [x + 12, y + 17],
          [x - 12, y + 34],
        ])
      }
    }
  },
  tee(ctx, color) {
    top(ctx, color, { long: false })
    const dark = shade(color, -0.12)
    ctx.strokeStyle = dark
    ctx.lineWidth = 6
    ctx.beginPath()
    ctx.moveTo(234, 98)
    ctx.quadraticCurveTo(300, 134, 366, 98)
    ctx.stroke()
    line(
      ctx,
      dark,
      2,
      [
        [172, 486],
        [428, 486],
      ],
      [6, 6],
    )
    line(
      ctx,
      dark,
      2,
      [
        [108, 246],
        [158, 258],
      ],
      [6, 6],
    )
    line(
      ctx,
      dark,
      2,
      [
        [492, 246],
        [442, 258],
      ],
      [6, 6],
    )
  },
  blouse(ctx, color) {
    top(ctx, color, { neck: 'v' })
    const dark = shade(color, -0.2)
    // 단추 줄
    line(ctx, dark, 2, [
      [300, 150],
      [300, 500],
    ])
    for (let y = 180; y < 480; y += 50) {
      ctx.fillStyle = '#fffaf5'
      ctx.beginPath()
      ctx.arc(312, y, 6, 0, Math.PI * 2)
      ctx.fill()
    }
    // 레이스 칼라
    ctx.fillStyle = '#fffaf5'
    for (let i = 0; i < 7; i++) {
      ctx.beginPath()
      ctx.arc(236 + i * 21, 104 + Math.sin((i / 6) * Math.PI) * 40, 11, 0, Math.PI * 2)
      ctx.fill()
    }
    for (let x = 180; x < 430; x += 22) {
      ctx.beginPath()
      ctx.arc(x, 502, 9, 0, Math.PI)
      ctx.fill()
    }
  },
  coat(ctx, color) {
    const p = new Path2D(`
      M 236 70 L 364 70 L 452 104 Q 486 120 492 160 L 518 470 L 470 478 L 440 230
      L 446 540 L 154 540 L 160 230 L 130 478 L 82 470 L 108 160 Q 114 120 148 104 Z`)
    fillCloth(ctx, p, color)
    const dark = shade(color, -0.3)
    const lapel = new Path2D(
      'M 236 70 L 300 230 L 266 248 L 214 110 Z M 364 70 L 300 230 L 334 248 L 386 110 Z',
    )
    ctx.fillStyle = shade(color, 0.08)
    ctx.fill(lapel)
    ctx.strokeStyle = dark
    ctx.lineWidth = 3
    ctx.stroke(lapel)
    line(ctx, dark, 3, [
      [300, 230],
      [300, 540],
    ])
    for (const y of [300, 380, 460]) {
      for (const x of [262, 338]) {
        ctx.fillStyle = shade(color, -0.45)
        ctx.beginPath()
        ctx.arc(x, y, 9, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    line(ctx, dark, 3, [
      [186, 400],
      [246, 400],
    ])
    line(ctx, dark, 3, [
      [354, 400],
      [414, 400],
    ])
  },
  jacket(ctx, color) {
    const p = new Path2D(`
      M 236 100 L 364 100 L 448 128 Q 482 142 488 182 L 512 440 L 466 448 L 436 250
      L 440 420 L 160 420 L 164 250 L 134 448 L 88 440 L 112 182 Q 118 142 152 128 Z`)
    fillCloth(ctx, p, color)
    const dark = shade(color, -0.25)
    ctx.fillStyle = shade(color, -0.06)
    ctx.fill(new Path2D('M 236 100 Q 300 150 364 100 L 360 130 Q 300 172 240 130 Z'))
    line(ctx, dark, 3, [
      [300, 150],
      [300, 420],
    ])
    line(
      ctx,
      dark,
      2,
      [
        [160, 396],
        [440, 396],
      ],
      [5, 5],
    )
    // 지퍼·주머니
    line(ctx, shade(color, -0.4), 4, [
      [306, 150],
      [306, 420],
    ])
    line(ctx, dark, 3, [
      [196, 300],
      [256, 300],
    ])
    line(ctx, dark, 3, [
      [344, 300],
      [404, 300],
    ])
  },
  skirt(ctx, color) {
    const p = new Path2D('M 200 110 L 400 110 L 404 150 L 500 500 Q 300 530 100 500 L 196 150 Z')
    fillCloth(ctx, p, color)
    const dark = shade(color, -0.35)
    const light = shade(color, 0.18)
    ctx.fillStyle = shade(color, -0.1)
    ctx.fillRect(198, 110, 204, 40)
    // 주름
    for (let i = 1; i < 10; i++) {
      const t = i / 10
      const xTop = 196 + 208 * t
      const xBottom = 100 + 400 * t
      line(ctx, i % 2 ? dark : light, 3, [
        [xTop, 152],
        [xBottom, 506 + Math.sin(t * Math.PI) * 14],
      ])
    }
  },
  slacks(ctx, color) {
    const p = new Path2D('M 196 80 L 404 80 L 430 520 L 330 524 L 302 210 L 298 210 L 270 524 L 170 520 Z')
    fillCloth(ctx, p, color)
    const dark = shade(color, -0.25)
    ctx.fillStyle = shade(color, -0.08)
    ctx.fillRect(196, 80, 208, 34)
    line(ctx, dark, 2, [
      [244, 120],
      [222, 518],
    ])
    line(ctx, dark, 2, [
      [356, 120],
      [378, 518],
    ])
    line(ctx, dark, 3, [
      [300, 114],
      [300, 200],
    ])
    for (const x of [214, 260, 340, 386])
      line(ctx, dark, 4, [
        [x, 78],
        [x, 116],
      ])
  },
  denim(ctx, color) {
    const p = new Path2D('M 200 80 L 400 80 L 416 520 L 322 524 L 302 220 L 298 220 L 278 524 L 184 520 Z')
    fillCloth(ctx, p, color)
    const stitch = '#d9a35b'
    ctx.fillStyle = shade(color, -0.1)
    ctx.fillRect(200, 80, 200, 32)
    line(
      ctx,
      stitch,
      2,
      [
        [200, 112],
        [400, 112],
      ],
      [5, 5],
    )
    line(
      ctx,
      stitch,
      2,
      [
        [300, 112],
        [300, 210],
      ],
      [5, 5],
    )
    line(
      ctx,
      stitch,
      2,
      [
        [214, 130],
        [262, 170],
      ],
      [5, 5],
    )
    line(
      ctx,
      stitch,
      2,
      [
        [386, 130],
        [338, 170],
      ],
      [5, 5],
    )
    line(
      ctx,
      stitch,
      2,
      [
        [190, 500],
        [276, 504],
      ],
      [5, 5],
    )
    line(
      ctx,
      stitch,
      2,
      [
        [410, 500],
        [324, 504],
      ],
      [5, 5],
    )
    ctx.fillStyle = '#c9a15f'
    ctx.beginPath()
    ctx.arc(300, 96, 7, 0, Math.PI * 2)
    ctx.fill()
  },
}

/** 시드 데이터용 옷 사진 JPEG Blob. kind: knit·tee·blouse·coat·jacket·skirt·slacks·denim */
export function createPlaceholderPhoto(kind, color = '#94a3b8') {
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')
  background(ctx)
  ;(DRAW[kind] ?? DRAW.tee)(ctx, color)

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.82)
  })
}
