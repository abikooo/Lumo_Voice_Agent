import { ArrowRight, Bot, ExternalLink, PlayCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import ProgressBar from '../components/ui/ProgressBar';
import { getNotes, type Note, getHistory, type Session } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [smartNotes, setSmartNotes] = useState<{ title: string; desc: string; time: string; color: string }[]>([]);
    const [recentSession, setRecentSession] = useState<Session | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch Notes
                const notes = await getNotes();
                const formattedNotes = notes.slice(0, 3).map(n => ({
                    title: n.title,
                    desc: n.content.length > 60 ? n.content.substring(0, 60) + '...' : n.content,
                    time: n.created_at ? new Date(n.created_at).toLocaleDateString() : 'Just now',
                    color: n.color
                }));
                setSmartNotes(formattedNotes);

                // Fetch History for Recent Session
                const sessions = await getHistory();
                if (sessions.length > 0) {
                    setRecentSession(sessions[0]);
                }
            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
            }
        };

        fetchData();
    }, []);

    const handleResume = () => {
        if (recentSession?.video_url) {
            window.open(recentSession.video_url, '_blank');
        } else if (recentSession) {
            navigate('/study', { state: { sessionId: recentSession.id } });
        } else {
            navigate('/study');
        }
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '2rem', marginBottom: '2rem' }}>
                Welcome, {user?.full_name || user?.email || 'Student'}
            </h1>

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

                        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
                            {recentSession ? recentSession.title : "No recent activity"}
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                            {recentSession
                                ? `Last visited ${new Date(recentSession.created_at).toLocaleDateString()} ${new Date(recentSession.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                : "Start a new session to see it here."}
                        </p>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span style={{ fontWeight: '600' }}>Progress</span>
                            <span style={{ fontWeight: '600', color: 'var(--primary)' }}>35%</span>
                        </div>

                        <ProgressBar progress={35} />

                        <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
                            <Button
                                variant="ghost"
                                style={{ color: 'var(--primary)', padding: 0 }}
                                onClick={handleResume}
                            >
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
                        border: 'none',
                        cursor: 'pointer'
                    }}
                        onClick={() => navigate('/study')}
                    >
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
                            <ExternalLink
                                size={16}
                                color="var(--primary)"
                                style={{ cursor: 'pointer' }}
                                onClick={() => navigate('/smart-notes')}
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {smartNotes.length === 0 ? (
                                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>No notes yet. Start a lesson to generate notes!</p>
                            ) : (
                                smartNotes.map((note, index) => (
                                    <div
                                        key={index}
                                        style={{ backgroundColor: 'var(--bg-body)', padding: '1rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                                        onClick={() => navigate('/smart-notes')}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: note.color }} />
                                            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>{note.title}</span>
                                        </div>
                                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', lineHeight: '1.4' }}>
                                            {note.desc}
                                        </p>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{note.time}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </Card>

                </div>
            </div>
        </div>
    );
};

export default Dashboard;
