import { Search, PlusCircle, Upload, FileText, FlaskConical, Palette, Sigma, Megaphone, Globe } from 'lucide-react';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

const MyNotes = () => {
    const categories = [
        { title: 'Python Syntax Basics', desc: 'Variables, loops, functions and basic data structures summary.', edited: '2 hrs ago', icon: FileText, color: '#FEF3C7', iconColor: '#F59E0B' },
        { title: 'Chemistry: Periodicity', desc: 'Trends in the periodic table, atomic radius, and ionization energy.', edited: 'Yesterday', icon: FlaskConical, color: '#DBEAFE', iconColor: '#3B82F6' },
        { title: 'History of Art 101', desc: 'Renaissance masters and their influence on modern perspective.', edited: '3 days ago', icon: Palette, color: '#D1FAE5', iconColor: '#10B981' },
        { title: 'Calculus II: Integrals', desc: 'Integration techniques, volumes of revolution, and arc length.', edited: '1 week ago', icon: Sigma, color: '#F3E8FF', iconColor: '#A855F7' },
        { title: 'Marketing Strategy', desc: 'Digital marketing funnels and consumer behavior analysis.', edited: '2 weeks ago', icon: Megaphone, color: '#FFE4E6', iconColor: '#F43F5E' },
        { title: 'Environmental Science', desc: 'Climate change impact on global ecosystems.', edited: '1 month ago', icon: Globe, color: '#E0F2FE', iconColor: '#0EA5E9' },
    ];

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>My Notes</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Manage and organize your learning materials.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <Button variant="outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <PlusCircle size={18} /> Create New Notes
                    </Button>
                    <Button style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Upload size={18} /> Upload Notes
                    </Button>
                </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
                <Input icon={Search} placeholder="Search for keywords, topics, or dates..." style={{ maxWidth: '600px', margin: '0 auto' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {categories.map((cat, index) => (
                    <Card key={index} style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <div style={{
                            height: '140px',
                            backgroundColor: cat.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: `linear-gradient(to bottom right, ${cat.color}, white)`
                        }}>
                            <cat.icon size={48} color={cat.iconColor} style={{ opacity: 0.5 }} />
                        </div>
                        <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{cat.title}</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: '1.4' }}>
                                {cat.desc}
                            </p>
                            <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-light)' }}>
                                <span>Edited {cat.edited}</span>
                                <span>↓</span>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default MyNotes;
