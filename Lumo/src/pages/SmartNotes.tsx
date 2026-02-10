import { Search, MoreVertical, Edit2, Download, PlayCircle } from 'lucide-react';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

const SmartNotes = () => {
    const notes = [
        {
            title: 'Python Syntax Fundamentals',
            desc: 'In this video, we cover the basic syntax rules of Python, including indentation, variable declaration, and simple data types. We also explore how to write your first function...',
            id: 1
        },
        {
            title: 'Advanced List Comprehensions',
            desc: 'Understanding list comprehensions is key for Pythonic code. This session breaks down nested loops within comprehensions and conditional logic for filtering lists efficiently...',
            id: 2
        },
        {
            title: 'Object-Oriented Programming Patterns',
            desc: 'Dive deep into OOP concepts. We start with classes and objects, then move to inheritance and polymorphism. The summary highlights the factory pattern examples discussed...',
            id: 3
        },
        {
            title: 'AsyncIO and Concurrency',
            desc: 'A practical guide to asynchronous programming in Python. Learn when to use async/await versus threading, and how to manage concurrent tasks without blocking the main thread...',
            id: 4
        }
    ];

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>SMART NOTES</h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Review your AI-generated summaries and video insights.</p>
                <Input icon={Search} placeholder="Search your notes..." style={{ maxWidth: '400px' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {notes.map((note) => (
                    <Card key={note.id} style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                        <div style={{
                            width: '200px',
                            height: '120px',
                            backgroundColor: '#E5E7EB',
                            borderRadius: 'var(--radius-md)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                        }}>
                            <PlayCircle size={32} color="#9CA3AF" />
                        </div>

                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>{note.title}</h3>
                                <button style={{ background: 'none', border: 'none', padding: 0 }}>
                                    <MoreVertical size={20} color="var(--text-light)" />
                                </button>
                            </div>

                            <div style={{
                                backgroundColor: '#FFFBEB',
                                padding: '1rem',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid #FEF3C7',
                                fontSize: '0.875rem',
                                color: '#4B5563',
                                lineHeight: '1.5'
                            }}>
                                {note.desc}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '0.5rem' }}>
                                <div style={{ display: 'flex', gap: '1.5rem' }}>
                                    <button style={{
                                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                                        background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.875rem'
                                    }}>
                                        <Edit2 size={14} /> Edit
                                    </button>
                                    <button style={{
                                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                                        background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.875rem'
                                    }}>
                                        <Download size={14} /> Download Summary
                                    </button>
                                </div>

                                <Button variant="ghost" style={{
                                    borderRadius: '50%', width: '32px', height: '32px', padding: 0,
                                    backgroundColor: '#FEF3C7', color: 'var(--primary)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    ↓
                                </Button>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default SmartNotes;
