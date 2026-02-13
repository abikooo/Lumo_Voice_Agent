import { ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import QuizInterface from '../components/QuizInterface';
import { getHistory, getNotes, setupQuiz, createSession, type Session } from '../api/endpoints';

const Study = () => {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [notes, setNotes] = useState<any[]>([]);
    const [selectedSession, setSelectedSession] = useState("");
    const [selectedNote, setSelectedNote] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [activeQuizSessionId, setActiveQuizSessionId] = useState<number | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [sessionsData, notesData] = await Promise.all([
                    getHistory(),
                    getNotes()
                ]);
                setSessions(sessionsData);
                setNotes(notesData);
            } catch (error) {
                console.error("Failed to fetch data:", error);
            }
        };
        fetchData();
    }, []);

    const sessionOptions = sessions.map(s => ({
        value: s.id,
        label: s.title || `Session ${new Date(s.created_at).toLocaleDateString()}`
    }));

    const noteOptions = notes.map(n => ({
        value: n.id,
        label: n.title
    }));

    const handleStartQuiz = async () => {
        if (!selectedSession && !selectedNote) {
            alert("Please select a session or a note to start the quiz.");
            return;
        }

        setIsLoading(true);
        try {
            // 1. Setup Quiz Context in Backend (stores it in memory for next session)
            if (selectedSession) {
                await setupQuiz('session', Number(selectedSession));
            } else {
                await setupQuiz('note', Number(selectedNote));
            }

            // 2. Create the Voice Session immediately
            // Since context is set, this session will inherit the "Quiz System Prompt"
            const newSession = await createSession({ video_url: "" });

            // 3. Activate Interface
            setActiveQuizSessionId(newSession.session_id);

        } catch (error) {
            console.error("Quiz setup failed:", error);
            alert("Failed to setup quiz. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    if (activeQuizSessionId) {
        return (
            <div style={{
                height: '100%',
                backgroundColor: '#FEF3C7',
                margin: '-2rem',
                padding: '2rem',
            }}>
                <QuizInterface
                    sessionId={activeQuizSessionId}
                    onExit={() => setActiveQuizSessionId(null)}
                />
            </div>
        );
    }

    return (
        <div style={{
            height: '100%',
            backgroundColor: '#FEF3C7',
            margin: '-2rem',
            padding: '2rem',
            display: 'flex',
            flexDirection: 'column'
        }}>
            <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', display: 'inline-block', borderBottom: '4px solid #F59E0B', width: 'fit-content', paddingBottom: '0.25rem' }}>STUDY</h1>

            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Card style={{
                    width: '100%',
                    maxWidth: '500px',
                    padding: '2.5rem',
                    textAlign: 'center',
                    boxShadow: 'var(--shadow-lg)'
                }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '2rem', letterSpacing: '0.05em' }}>QUIZ ME</h2>

                    <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto 1rem' }}>
                        <div style={{
                            width: '100%', height: '100%',
                            borderRadius: '50%',
                            overflow: 'hidden',
                            border: '4px solid #FDE68A',
                            padding: '4px'
                        }}>
                            <img
                                src="https://api.dicebear.com/7.x/avataaars/svg?seed=Lumo"
                                alt="AI Mentor"
                                style={{ width: '100%', height: '100%', borderRadius: '50%', backgroundColor: '#1F2937' }}
                            />
                        </div>
                        <div style={{
                            position: 'absolute',
                            bottom: '5px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            backgroundColor: '#1F2937',
                            color: 'white',
                            fontSize: '0.625rem',
                            padding: '2px 8px',
                            borderRadius: '999px',
                            fontWeight: 'bold'
                        }}>
                            LUMO
                        </div>
                    </div>

                    <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                        Select content to quiz yourself on.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2.5rem', textAlign: 'left' }}>
                        <Select
                            label="Quiz on Past Session (Video)"
                            options={[
                                { value: '', label: 'Select a session...' },
                                ...sessionOptions
                            ]}
                            value={selectedSession}
                            onChange={(e) => {
                                setSelectedSession(e.target.value);
                                if (e.target.value) setSelectedNote(""); // Mutually exclusive
                            }}
                        />

                        <div style={{ textAlign: 'center', color: '#666', fontSize: '0.9rem' }}>- OR -</div>

                        <Select
                            label="Quiz on Note"
                            options={[
                                { value: '', label: 'Select a note...' },
                                ...noteOptions
                            ]}
                            value={selectedNote}
                            onChange={(e) => {
                                setSelectedNote(e.target.value);
                                if (e.target.value) setSelectedSession(""); // Mutually exclusive
                            }}
                        />
                    </div>

                    <Button
                        fullWidth
                        onClick={handleStartQuiz}
                        disabled={isLoading}
                        style={{ fontWeight: 'bold', borderRadius: '999px', padding: '1rem', fontSize: '1rem' }}
                    >
                        {isLoading ? "Setting up..." : "START QUIZ"} <ArrowRight size={20} style={{ marginLeft: '0.5rem' }} />
                    </Button>

                </Card>
            </div>
        </div>
    );
};

export default Study;
