import React from 'react'

const RoadMapDay = ({ day, onToggleTask }) => {
    const total = day.tasks.length
    const completed = day.tasks.filter(t => t.completed).length
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0

    return (
        <div className='roadmap-day'>
            <div className='roadmap-day__header'>
                <span className='roadmap-day__badge'>Day {day.day}</span>
                <h3 className='roadmap-day__focus'>{day.focus}</h3>
                <span className='roadmap-day__progress'>{completed}/{total} ({pct}%)</span>
            </div>
            <ul className='roadmap-day__tasks'>
                {day.tasks.map((task) => (
                    <li key={task._id} className={task.completed ? 'roadmap-day__task--done' : ''}>
                        <input
                            type='checkbox'
                            className='roadmap-day__checkbox'
                            checked={!!task.completed}
                            onChange={(e) => onToggleTask(day._id, task._id, e.target.checked)}
                        />
                        <span>{task.text}</span>
                    </li>
                ))}
            </ul>
        </div>
    )
}

export default RoadMapDay
