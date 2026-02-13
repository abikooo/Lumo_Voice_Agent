import { Search, MoreVertical, Edit2, Download, PlayCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { getNotes } from '../api/endpoints';

const SmartNotes = () => {
    const [notes, setNotes] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        const fetchNotes = async () => {
            try {
                const data = await getNotes();
                const formatted = data.map(n => ({
                    title: n.title,
                    desc: n.content,
                    id: n.id
                }));
                setNotes(formatted);
            } catch (error) {
                console.error("Failed to fetch notes:", error);
            }
        };
        fetchNotes();
    }, []);

    const filteredNotes = notes.filter(note =>
        note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (note.desc && note.desc.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>SMART NOTES</h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Review your AI-generated summaries and video insights.</p>
                <Input
                    icon={Search}
                    placeholder="Search your notes..."
                    style={{ maxWidth: '400px' }}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {filteredNotes.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '2rem' }}>
                        {searchTerm ? "No notes found matching your search." : "No notes found."}
                    </p>
                ) : (
                    filteredNotes.map((note) => (
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
                    ))
                )}
            </div>
        </div>
    );
};

export default SmartNotes;
