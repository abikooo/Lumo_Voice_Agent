import { ArrowRight } from 'lucide-react';
import Card from '../components/ui/Card';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';

const Study = () => {
    return (
        <div style={{
            height: '100%',
            backgroundColor: '#FEF3C7', // Yellow background from design
            margin: '-2rem', // Negative margin to fill the layout padding
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
                        <div style={{
                            position: 'absolute',
                            bottom: '10px',
                            right: '10px',
                            width: '12px',
                            height: '12px',
                            backgroundColor: '#10B981',
                            borderRadius: '50%',
                            border: '2px solid white'
                        }} />
                    </div>

                    <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Your AI mentor is ready.</p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2.5rem', textAlign: 'left' }}>
                        <Select
                            label="Content Selection"
                            options={[
                                { value: '', label: 'Choose content part...' },
                                { value: 'basics', label: 'Python Basics' },
                                { value: 'loops', label: 'Loops & Conditions' },
                            ]}
                            defaultValue=""
                        />

                        <Select
                            label="Source Material"
                            options={[
                                { value: '', label: 'Choose notes...' },
                                { value: 'all', label: 'All Smart Notes' },
                                { value: 'python', label: 'Python Notes' },
                            ]}
                            defaultValue=""
                        />
                    </div>

                    <Button fullWidth style={{ fontWeight: 'bold', borderRadius: '999px', padding: '1rem', fontSize: '1rem' }}>
                        START QUIZ <ArrowRight size={20} style={{ marginLeft: '0.5rem' }} />
                    </Button>

                </Card>
            </div>
        </div>
    );
};

export default Study;
