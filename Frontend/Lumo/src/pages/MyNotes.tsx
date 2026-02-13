import { Search, PlusCircle, Upload, FileText, FlaskConical, Palette, Sigma, Megaphone, Globe } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { uploadNote, getNotes, type Note } from '../api/endpoints';

const MyNotes = () => {
    const [notes, setNotes] = useState<Note[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchNotes = async () => {
        try {
            const allNotes = await getNotes();
            // Filter by source='upload' if possible, or show all for now?
            // Ideally backend filters, but client side is fine for small scale.
            // The backend defaults source to 'generated'. 'uploads' set it to 'upload'.
            const uploads = allNotes.filter(n => n.source === 'upload');
            setNotes(uploads);
        } catch (error) {
            console.error("Failed to fetch notes:", error);
        }
    };

    useEffect(() => {
        fetchNotes();
    }, []);

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            await uploadNote(file);
            // Refresh list
            fetchNotes();
        } catch (error) {
            console.error("Upload failed:", error);
            alert("Failed to upload note.");
        }
    };

    const getIconForFile = (filename: string) => {
        if (filename.endsWith('.pdf')) return FileText;
        if (filename.endsWith('.doc') || filename.endsWith('.docx')) return FileText;
        return FileText; // Default
    };

    const getColorForNote = (index: number) => {
        const colors = ['#FEF3C7', '#DBEAFE', '#D1FAE5', '#F3E8FF', '#FFE4E6', '#E0F2FE'];
        return colors[index % colors.length];
    };

    const getIconColorForNote = (index: number) => {
        const colors = ['#F59E0B', '#3B82F6', '#10B981', '#A855F7', '#F43F5E', '#0EA5E9'];
        return colors[index % colors.length];
    }

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>My Notes</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Manage and organize your learning materials.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                        accept=".pdf,.doc,.docx,.txt"
                    />
                    <Button variant="outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <PlusCircle size={18} /> Create New Note
                    </Button>
                    <Button onClick={handleUploadClick} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Upload size={18} /> Upload Notes
                    </Button>
                </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
                <Input icon={Search} placeholder="Search for keywords, topics, or dates..." style={{ maxWidth: '600px', margin: '0 auto' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {notes.length === 0 ? (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                        <p>No uploaded notes yet. Click "Upload Notes" to add files.</p>
                    </div>
                ) : (
                    notes.map((note, index) => {
                        const Icon = getIconForFile(note.title);
                        const color = getColorForNote(index);
                        const iconColor = getIconColorForNote(index);

                        return (
                            <Card key={note.id} style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                <div style={{
                                    height: '140px',
                                    backgroundColor: color,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: `linear-gradient(to bottom right, ${color}, white)`
                                }}>
                                    <Icon size={48} color={iconColor} style={{ opacity: 0.5 }} />
                                </div>
                                <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', wordBreak: 'break-word' }}>{note.title}</h3>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: '1.4' }}>
                                        {note.content.length > 100 ? note.content.substring(0, 100) + '...' : note.content}
                                    </p>
                                    <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-light)' }}>
                                        <span>{note.created_at ? new Date(note.created_at).toLocaleDateString() : 'Unknown date'}</span>
                                        <span>↓</span>
                                    </div>
                                </div>
                            </Card>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default MyNotes;
