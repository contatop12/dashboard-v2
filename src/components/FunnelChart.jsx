import { motion, useSpring, useTransform } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

const springConfig = { stiffness: 120, damping: 20, mass: 1 }
const hoverSpring = { stiffness: 300, damping: 24 }

function hSegmentPath(normStart, normEnd, segW, H, layerScale, straight = false) {
  const my = H / 2
  const h0 = normStart * H * 0.44 * layerScale
  const h1 = normEnd * H * 0.44 * layerScale
  if (straight) {
    return `M 0 ${my - h0} L ${segW} ${my - h1} L ${segW} ${my + h1} L 0 ${my + h0} Z`
  }
  const cx = segW * 0.55
  const top = `M 0 ${my - h0} C ${cx} ${my - h0}, ${segW - cx} ${my - h1}, ${segW} ${my - h1}`
  const bot = `L ${segW} ${my + h1} C ${segW - cx} ${my + h1}, ${cx} ${my + h0}, 0 ${my + h0}`
  return `${top} ${bot} Z`
}

function vSegmentPath(normStart, normEnd, segH, W, layerScale, straight = false) {
  const mx = W / 2
  const w0 = normStart * W * 0.44 * layerScale
  const w1 = normEnd * W * 0.44 * layerScale
  if (straight) {
    return `M ${mx - w0} 0 L ${mx - w1} ${segH} L ${mx + w1} ${segH} L ${mx + w0} 0 Z`
  }
  const cy = segH * 0.55
  const left = `M ${mx - w0} 0 C ${mx - w0} ${cy}, ${mx - w1} ${segH - cy}, ${mx - w1} ${segH}`
  const right = `L ${mx + w1} ${segH} C ${mx + w1} ${segH - cy}, ${mx + w0} ${cy}, ${mx + w0} 0`
  return `${left} ${right} Z`
}

function HRing({ d, color, fill, opacity, hovered, ringIndex, totalRings }) {
  const extraScale = 1 + (ringIndex / Math.max(totalRings - 1, 1)) * 0.12
  const ringSpring = { stiffness: 300 - ringIndex * 60, damping: 24 - ringIndex * 3 }
  const scaleY = useSpring(1, ringSpring)
  useEffect(() => { scaleY.set(hovered ? extraScale : 1) }, [hovered, scaleY, extraScale])
  return (
    <motion.path d={d} fill={fill ?? color} opacity={opacity} style={{ scaleY, transformOrigin: 'center center' }} />
  )
}

function VRing({ d, color, fill, opacity, hovered, ringIndex, totalRings }) {
  const extraScale = 1 + (ringIndex / Math.max(totalRings - 1, 1)) * 0.12
  const ringSpring = { stiffness: 300 - ringIndex * 60, damping: 24 - ringIndex * 3 }
  const scaleX = useSpring(1, ringSpring)
  useEffect(() => { scaleX.set(hovered ? extraScale : 1) }, [hovered, scaleX, extraScale])
  return (
    <motion.path d={d} fill={fill ?? color} opacity={opacity} style={{ scaleX, transformOrigin: 'center center' }} />
  )
}

function HSegment({ index, normStart, normEnd, segW, fullH, color, layers, staggerDelay, hovered, dimmed, renderPattern, straight, gradientStops }) {
  const patternId = `funnel-h-pattern-${index}`
  const gradientId = `funnel-h-grad-${index}`
  const growProgress = useSpring(0, springConfig)
  const entranceScaleX = useTransform(growProgress, [0, 1], [0, 1])
  const entranceScaleY = useTransform(growProgress, [0, 1], [0, 1])
  const dimOpacity = useSpring(1, hoverSpring)

  useEffect(() => { dimOpacity.set(dimmed ? 0.4 : 1) }, [dimmed, dimOpacity])
  useEffect(() => {
    const timeout = setTimeout(() => growProgress.set(1), index * staggerDelay * 1000)
    return () => clearTimeout(timeout)
  }, [growProgress, index, staggerDelay])

  const rings = Array.from({ length: layers }, (_, l) => ({
    d: hSegmentPath(normStart, normEnd, segW, fullH, 1 - (l / layers) * 0.35, straight),
    opacity: 0.18 + (l / (layers - 1 || 1)) * 0.65,
  }))

  return (
    <motion.div className="pointer-events-none relative shrink-0 overflow-visible" style={{ width: segW, height: fullH, zIndex: hovered ? 10 : 1, opacity: dimOpacity }}>
      <motion.div className="absolute inset-0 overflow-visible" style={{ scaleX: entranceScaleX, scaleY: entranceScaleY, transformOrigin: 'left center' }}>
        <svg aria-hidden="true" className="absolute inset-0 h-full w-full overflow-visible" preserveAspectRatio="none" viewBox={`0 0 ${segW} ${fullH}`}>
          <defs>
            {gradientStops && (
              <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="0">
                {gradientStops.map((stop) => (
                  <stop key={`${stop.offset}-${stop.color}`} offset={typeof stop.offset === 'number' ? `${stop.offset * 100}%` : stop.offset} stopColor={stop.color} />
                ))}
              </linearGradient>
            )}
            {renderPattern?.(patternId, color)}
          </defs>
          {rings.map((r, i) => {
            const isInnermost = i === rings.length - 1
            let ringFill
            if (isInnermost && renderPattern) ringFill = `url(#${patternId})`
            else if (isInnermost && gradientStops) ringFill = `url(#${gradientId})`
            return <HRing key={`h-ring-${i}`} color={color} d={r.d} fill={ringFill} opacity={r.opacity} hovered={hovered} ringIndex={i} totalRings={layers} />
          })}
        </svg>
      </motion.div>
    </motion.div>
  )
}

function VSegment({ index, normStart, normEnd, segH, fullW, color, layers, staggerDelay, hovered, dimmed, renderPattern, straight, gradientStops }) {
  const patternId = `funnel-v-pattern-${index}`
  const gradientId = `funnel-v-grad-${index}`
  const growProgress = useSpring(0, springConfig)
  const entranceScaleY = useTransform(growProgress, [0, 1], [0, 1])
  const entranceScaleX = useTransform(growProgress, [0, 1], [0, 1])
  const dimOpacity = useSpring(1, hoverSpring)

  useEffect(() => { dimOpacity.set(dimmed ? 0.4 : 1) }, [dimmed, dimOpacity])
  useEffect(() => {
    const timeout = setTimeout(() => growProgress.set(1), index * staggerDelay * 1000)
    return () => clearTimeout(timeout)
  }, [growProgress, index, staggerDelay])

  const rings = Array.from({ length: layers }, (_, l) => ({
    d: vSegmentPath(normStart, normEnd, segH, fullW, 1 - (l / layers) * 0.35, straight),
    opacity: 0.18 + (l / (layers - 1 || 1)) * 0.65,
  }))

  return (
    <motion.div className="pointer-events-none relative shrink-0 overflow-visible" style={{ width: fullW, height: segH, zIndex: hovered ? 10 : 1, opacity: dimOpacity }}>
      <motion.div className="absolute inset-0 overflow-visible" style={{ scaleY: entranceScaleY, scaleX: entranceScaleX, transformOrigin: 'center top' }}>
        <svg aria-hidden="true" className="absolute inset-0 h-full w-full overflow-visible" preserveAspectRatio="none" viewBox={`0 0 ${fullW} ${segH}`}>
          <defs>
            {gradientStops && (
              <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                {gradientStops.map((stop) => (
                  <stop key={`${stop.offset}-${stop.color}`} offset={typeof stop.offset === 'number' ? `${stop.offset * 100}%` : stop.offset} stopColor={stop.color} />
                ))}
              </linearGradient>
            )}
            {renderPattern?.(patternId, color)}
          </defs>
          {rings.map((r, i) => {
            const isInnermost = i === rings.length - 1
            let ringFill
            if (isInnermost && renderPattern) ringFill = `url(#${patternId})`
            else if (isInnermost && gradientStops) ringFill = `url(#${gradientId})`
            return <VRing key={`v-ring-${i}`} color={color} d={r.d} fill={ringFill} opacity={r.opacity} hovered={hovered} ringIndex={i} totalRings={layers} />
          })}
        </svg>
      </motion.div>
    </motion.div>
  )
}

function SegmentLabel({ stage, pct, isHorizontal, showValues, showPercentage, showLabels, formatPercentage, formatValue, index, staggerDelay }) {
  const display = stage.displayValue ?? formatValue(stage.value)
  return (
    <motion.div
      animate={{ opacity: 1 }}
      className={cn('absolute inset-0 flex', isHorizontal ? 'flex-col items-center' : 'flex-row items-center')}
      initial={{ opacity: 0 }}
      transition={{ delay: index * staggerDelay + 0.25, duration: 0.35, ease: 'easeOut' }}
    >
      {isHorizontal ? (
        <>
          <div className="flex h-[16%] items-end justify-center pb-1">
            {showValues && <span className="whitespace-nowrap font-semibold text-white text-xs">{display}</span>}
          </div>
          <div className="flex flex-1 items-center justify-center">
            {showPercentage && (
              <span className="rounded-full bg-white/90 px-2 py-0.5 font-bold text-black text-[10px] shadow-sm">
                {formatPercentage(pct)}
              </span>
            )}
          </div>
          <div className="flex h-[16%] items-start justify-center pt-1">
            {showLabels && <span className="whitespace-nowrap text-muted-foreground text-[10px] font-sans truncate max-w-full px-1">{stage.label}</span>}
          </div>
        </>
      ) : (
        <>
          <div className="flex w-[20%] items-center justify-end pr-2">
            {showValues && <span className="whitespace-nowrap font-semibold text-white text-xs">{display}</span>}
          </div>
          <div className="flex flex-1 items-center justify-center">
            {showPercentage && (
              <span className="rounded-full bg-white/90 px-2 py-0.5 font-bold text-black text-[10px] shadow-sm">
                {formatPercentage(pct)}
              </span>
            )}
          </div>
          <div className="flex w-[20%] items-center justify-start pl-2">
            {showLabels && <span className="text-muted-foreground text-[10px] font-sans truncate">{stage.label}</span>}
          </div>
        </>
      )}
    </motion.div>
  )
}

export function FunnelChart({
  data,
  orientation = 'horizontal',
  color = '#F5C518',
  layers = 3,
  className,
  style,
  showPercentage = true,
  showValues = true,
  showLabels = true,
  hoveredIndex: hoveredIndexProp,
  onHoverChange,
  formatPercentage = (p) => `${Math.round(p)}%`,
  formatValue = (v) => v.toLocaleString('pt-BR'),
  staggerDelay = 0.12,
  gap = 4,
  renderPattern,
  edges = 'curved',
}) {
  const ref = useRef(null)
  const [sz, setSz] = useState({ w: 0, h: 0 })
  const [internalHoveredIndex, setInternalHoveredIndex] = useState(null)

  const isControlled = hoveredIndexProp !== undefined
  const hoveredIndex = isControlled ? hoveredIndexProp : internalHoveredIndex
  const setHoveredIndex = useCallback((index) => {
    if (isControlled) onHoverChange?.(index)
    else setInternalHoveredIndex(index)
  }, [isControlled, onHoverChange])

  const measure = useCallback(() => {
    if (!ref.current) return
    const { width: w, height: h } = ref.current.getBoundingClientRect()
    if (w > 0 && h > 0) setSz({ w, h })
  }, [])

  useEffect(() => {
    measure()
    const ro = new ResizeObserver(measure)
    if (ref.current) ro.observe(ref.current)
    return () => ro.disconnect()
  }, [measure])

  if (!data.length) return null

  const max = data[0].value
  const n = data.length
  const norms = data.map(d => d.value / max)
  const horiz = orientation === 'horizontal'
  const { w: W, h: H } = sz

  const totalGap = gap * (n - 1)
  const segW = (W - (horiz ? totalGap : 0)) / n
  const segH = (H - (horiz ? 0 : totalGap)) / n

  return (
    <div
      ref={ref}
      className={cn('relative w-full select-none overflow-visible', className)}
      style={{ aspectRatio: horiz ? '2.2 / 1' : '1 / 1.8', ...style }}
    >
      {W > 0 && H > 0 && (
        <>
          <div className={cn('absolute inset-0 flex overflow-visible', horiz ? 'flex-row' : 'flex-col')} style={{ gap }}>
            {data.map((stage, i) => {
              const normStart = norms[i] ?? 0
              const normEnd = norms[Math.min(i + 1, n - 1)] ?? 0
              const segColor = stage.gradient?.[0]?.color ?? stage.color ?? color
              return horiz ? (
                <HSegment key={stage.label} index={i} normStart={normStart} normEnd={normEnd} segW={segW} fullH={H} color={segColor} layers={layers} staggerDelay={staggerDelay} hovered={hoveredIndex === i} dimmed={hoveredIndex !== null && hoveredIndex !== i} renderPattern={renderPattern} straight={edges === 'straight'} gradientStops={stage.gradient} />
              ) : (
                <VSegment key={stage.label} index={i} normStart={normStart} normEnd={normEnd} segH={segH} fullW={W} color={segColor} layers={layers} staggerDelay={staggerDelay} hovered={hoveredIndex === i} dimmed={hoveredIndex !== null && hoveredIndex !== i} renderPattern={renderPattern} straight={edges === 'straight'} gradientStops={stage.gradient} />
              )
            })}
          </div>

          {data.map((stage, i) => {
            const pct = (stage.value / max) * 100
            const posStyle = horiz
              ? { left: (segW + gap) * i, width: segW, top: 0, height: H }
              : { top: (segH + gap) * i, height: segH, left: 0, width: W }
            const isDimmed = hoveredIndex !== null && hoveredIndex !== i
            return (
              <motion.div
                key={`lbl-${stage.label}`}
                animate={{ opacity: isDimmed ? 0.4 : 1 }}
                className="absolute cursor-pointer"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{ ...posStyle, zIndex: 20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              >
                <SegmentLabel stage={stage} pct={pct} isHorizontal={horiz} showValues={showValues} showPercentage={showPercentage} showLabels={showLabels} formatPercentage={formatPercentage} formatValue={formatValue} index={i} staggerDelay={staggerDelay} />
              </motion.div>
            )
          })}
        </>
      )}
    </div>
  )
}

export default FunnelChart
