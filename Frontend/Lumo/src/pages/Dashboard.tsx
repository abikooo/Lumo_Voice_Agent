import { ArrowRight, Bot, ExternalLink, PlayCircle } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import ProgressBar from '../components/ui/ProgressBar';

const Dashboard = () => {
    const smartNotes = [
        { title: 'HTML', desc: 'The semantic meaning of HTML tags is crucial for accessibility...', time: '10 mins ago', color: '#F6E05E' },
        { title: 'CSS FLEXBOX', desc: 'Justify-content controls alignment along the main axis,...', time: 'Yesterday', color: '#4299E1' },
        { title: 'JS ARRAYS', desc: 'Map returns a new array, while...', time: '2 days ago', color: '#ECC94B' },
    ];

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '2rem', marginBottom: '2rem' }}>Jump back in</h1>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '2rem', alignItems: 'start' }}>

                {/* Left Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                    {/* Progress Card */}
                    <Card>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                            <span style={{
                                backgroundColor: 'var(--primary-light)',
                                color: 'var(--primary)',
                                padding: '0.25rem 0.75rem',
                                borderRadius: '999px',
                                fontSize: '0.75rem',
                                fontWeight: '600'
                            }}>
                                Continue Learning
                            </span>
                            <div style={{ display: 'flex', gap: '0.5rem', color: 'var(--primary)', fontSize: '1.2rem', fontWeight: 'bold' }}>
                                {'< >'}
                            </div>
                        </div>

                        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>HTML CSS JS basics</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>Last visited 2 hours ago</p>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span style={{ fontWeight: '600' }}>Progress</span>
                            <span style={{ fontWeight: '600', color: 'var(--primary)' }}>35%</span>
                        </div>

                        <ProgressBar progress={35} />

                        <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
                            <Button variant="ghost" style={{ color: 'var(--primary)', padding: 0 }}>
                                Resume Lesson <ArrowRight size={16} />
                            </Button>
                        </div>
                    </Card>

                    {/* Courses Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                        <Card>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <h3 style={{ fontSize: '1.1rem' }}>Python Data Structures</h3>
                                <span style={{ color: 'var(--text-light)', cursor: 'pointer' }}>•••</span>
                            </div>
                            <div style={{ marginTop: '3rem' }}>
                                <ProgressBar progress={24} />
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>24% Complete</p>
                            </div>
                        </Card>

                        <Card>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <h3 style={{ fontSize: '1.1rem' }}>React Fundamentals</h3>
                                <span style={{ color: 'var(--text-light)', cursor: 'pointer' }}>•••</span>
                            </div>
                            <div style={{ marginTop: '3rem' }}>
                                <Button variant="ghost" style={{ padding: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                                    <PlayCircle size={16} fill="var(--primary)" color="white" /> Start Course
                                </Button>
                            </div>
                        </Card>
                    </div>

                </div>

                {/* Right Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                    {/* Lumo AI Agent Card */}
                    <Card style={{
                        background: 'linear-gradient(135deg, #FF9F1C 0%, #E67E22 100%)',
                        color: 'white',
                        textAlign: 'center',
                        padding: '2.5rem 1.5rem',
                        border: 'none'
                    }}>
                        <div style={{
                            width: '64px',
                            height: '64px',
                            backgroundColor: 'rgba(255,255,255,0.2)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 1.5rem',
                            border: '2px solid rgba(255,255,255,0.4)'
                        }}>
                            <Bot size={32} />
                        </div>

                        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'white' }}>LUMO AI AGENT</h2>
                        <p style={{ fontSize: '0.875rem', marginBottom: '1.5rem', opacity: 0.9 }}>Ready to challenge your knowledge?</p>

                        <Button style={{ backgroundColor: 'white', color: 'var(--primary)', fontWeight: 'bold', width: '100%', borderRadius: 'var(--radius-md)' }}>
                            <span style={{ marginRight: '0.5rem' }}>?</span> Quiz Me Section
                        </Button>
                    </Card>

                    {/* Smart Notes Preview */}
                    <Card style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1rem', margin: 0 }}>Smart Notes Preview</h3>
                            <ExternalLink size={16} color="var(--primary)" style={{ cursor: 'pointer' }} />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {smartNotes.map((note, index) => (
                                <div key={index} style={{ backgroundColor: 'var(--bg-body)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: note.color }} />
                                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>{note.title}</span>
                                    </div>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', lineHeight: '1.4' }}>
                                        {note.desc}
                                    </p>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{note.time}</p>
                                </div>
                            ))}
                        </div>
                    </Card>

                </div>
            </div>
        </div>
    );
};

export default Dashboard;
