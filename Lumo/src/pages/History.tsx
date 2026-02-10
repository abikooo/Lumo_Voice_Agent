import { Filter, PlayCircle, RotateCw, Play } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';

const History = () => {
    const historyItems = [
        {
            id: 1,
            title: 'Python syntax videonotesu',
            desc: 'A comprehensive overview of Python basic syntax, variables, and data types...',
            date: 'Oct 24, 2023',
            time: '2:30 PM',
            duration: '12:45',
            status: 'Completed',
            thumbnailColor: '#1F2937'
        },
        {
            id: 2,
            title: 'Advanced React Hooks',
            desc: 'Deep dive into useEffect, useMemo, and useCallback...',
            date: 'Oct 23, 2023',
            time: '10:15 AM',
            duration: '45:20',
            status: 'In Progress',
            thumbnailColor: '#4B5563'
        },
        {
            id: 3,
            title: 'Intro to Data Structures',
            desc: 'Understanding arrays, linked lists, and basic trees...',
            date: 'Oct 21, 2023',
            time: '09:00 AM',
            duration: '18:05',
            status: 'Completed',
            thumbnailColor: '#111827'
        },
        {
            id: 4,
            title: 'Mastering CSS Grid',
            desc: 'Building complex layouts with grid-template-areas, auto-fit, and minmax()...',
            date: 'Oct 20, 2023',
            time: '4:45 PM',
            duration: '32:15',
            status: 'Completed',
            thumbnailColor: '#6B7280'
        }
    ];

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>HISTORY</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Track your learning journey and revisit past sessions.</p>
                </div>
                <Button variant="outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '999px' }}>
                    <Filter size={16} /> FILTER
                </Button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {historyItems.map((item) => (
                    <Card key={item.id} style={{ display: 'flex', gap: '1.5rem', padding: '1rem', alignItems: 'center' }}>
                        {/* Thumbnail */}
                        <div style={{
                            width: '240px',
                            height: '135px',
                            backgroundColor: item.thumbnailColor,
                            borderRadius: 'var(--radius-md)',
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                        }}>
                            <PlayCircle size={40} color="rgba(255,255,255,0.8)" style={{ strokeWidth: 1 }} />
                            <span style={{
                                position: 'absolute',
                                bottom: '10px',
                                right: '10px',
                                backgroundColor: 'rgba(0,0,0,0.8)',
                                color: 'white',
                                fontSize: '0.75rem',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontWeight: '600'
                            }}>
                                {item.duration}
                            </span>
                            {item.status === 'In Progress' && (
                                <div style={{ position: 'absolute', top: '10px', left: '10px', width: '30%', height: '4px', backgroundColor: 'var(--primary)', borderRadius: '2px' }} />
                            )}
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{item.title}</h3>
                                <Badge variant={item.status === 'Completed' ? 'success' : 'warning'}>{item.status}</Badge>
                            </div>

                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', maxWidth: '600px' }}>
                                {item.desc}
                            </p>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-light)', fontSize: '0.875rem' }}>
                                    <span>📅 {item.date}</span>
                                    <span>⏰ {item.time}</span>
                                </div>

                                {item.status === 'In Progress' ? (
                                    <Button variant="outline" style={{ borderRadius: '999px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        Resume <Play size={14} fill="currentColor" />
                                    </Button>
                                ) : (
                                    item.id === 1 ? (
                                        <Button style={{ borderRadius: '999px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            Go to video <PlayCircle size={16} />
                                        </Button>
                                    ) : (
                                        <Button variant="outline" style={{ borderRadius: '999px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            Review <RotateCw size={14} />
                                        </Button>
                                    )
                                )}
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default History;
