import React from 'react'

const WIDTH = 560
const HEIGHT = 120
const PADDING = 16

const ScoreTrend = ({ reports }) => {
    if (!reports || reports.length < 2) {
        return null
    }

    const sorted = [ ...reports ].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))

    const usableWidth = WIDTH - PADDING * 2
    const usableHeight = HEIGHT - PADDING * 2

    const points = sorted.map((r, i) => {
        const x = PADDING + (sorted.length === 1 ? 0 : (i / (sorted.length - 1)) * usableWidth)
        const y = PADDING + usableHeight - (r.matchScore / 100) * usableHeight
        return { x, y, score: r.matchScore, title: r.title }
    })

    const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ')

    return (
        <section className='score-trend'>
            <h2>Match Score Trend</h2>
            <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className='score-trend__svg' preserveAspectRatio="none">
                <polyline
                    points={polylinePoints}
                    fill='none'
                    stroke='#ff2d78'
                    strokeWidth='2'
                />
                {points.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r='4' fill='#ff2d78'>
                        <title>{p.title}: {p.score}%</title>
                    </circle>
                ))}
            </svg>
        </section>
    )
}

export default ScoreTrend
