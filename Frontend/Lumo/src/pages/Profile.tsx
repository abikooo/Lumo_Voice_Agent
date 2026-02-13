import { useState } from 'react';
import { User as UserIcon, Star, Volume2, LogOut } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Toggle from '../components/ui/Toggle';
import { useAuth } from '../context/AuthContext';

const Profile = () => {
    const { user, logout } = useAuth();
    const [reminders, setReminders] = useState(true);
    const [updates, setUpdates] = useState(false);

    if (!user) {
        return <div>Loading...</div>;
    }

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', display: 'inline-block', borderBottom: '4px solid #F59E0B', paddingBottom: '0.25rem' }}>PROFILE</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Manage your account settings and preferences.</p>
                </div>

                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '80px', height: '80px', borderRadius: '50%',
                        backgroundColor: '#FECACA', marginBottom: '0.5rem',
                        backgroundImage: `url(https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email})`,
                        backgroundSize: 'cover'
                    }} />
                    <p style={{ fontWeight: '600' }}>{user.full_name}</p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{user.email}</p>
                </div>
            </div>

            <Card style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ color: 'var(--primary)' }}>
                            <div style={{ display: 'flex', gap: '2px' }}>
                                <div style={{ width: '4px', height: '4px', backgroundColor: 'var(--primary)', borderRadius: '50%' }} />
                                <div style={{ width: '4px', height: '4px', backgroundColor: 'var(--primary)', borderRadius: '50%' }} />
                                <div style={{ width: '4px', height: '4px', backgroundColor: 'var(--primary)', borderRadius: '50%' }} />
                            </div>
                        </span>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>General Settings</h2>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Full Name</label>
                        <Input defaultValue={user.full_name} icon={UserIcon} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Email Address</label>
                        <Input defaultValue={user.email} type="email" disabled />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
                    {/* Subscription Plan */}
                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Subscription Plan</label>
                        <div style={{
                            border: '1px solid #FEF3C7',
                            backgroundColor: '#FFFBEB',
                            borderRadius: 'var(--radius-md)',
                            padding: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem'
                        }}>
                            <div style={{
                                width: '40px', height: '40px', backgroundColor: '#F59E0B', borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
                            }}>
                                <Star size={20} fill="white" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <span style={{ fontWeight: 'bold', color: '#1F2937' }}>Lumo Free</span>
                                    <span style={{ backgroundColor: '#D1FAE5', color: '#065F46', fontSize: '0.75rem', padding: '0.125rem 0.5rem', borderRadius: '999px', fontWeight: '600' }}>Active</span>
                                </div>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Upgrade to Premium for more features</p>
                            </div>
                            <Button size="sm" variant="outline">Upgrade</Button>
                        </div>
                    </div>

                    {/* AI Mentor Voice */}
                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>AI Mentor Voice</label>
                        <Select
                            options={[{ value: 'atlas', label: 'Atlas (Calm & Academic)' }]}
                            defaultValue="atlas"
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            <Volume2 size={12} /> Preview voice samples in the Mentor Lab.
                        </div>
                    </div>
                </div>

                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Notifications</h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '3rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <p style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Daily Learning Reminders</p>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Get a notification at 9:00 AM every day.</p>
                        </div>
                        <Toggle checked={reminders} onChange={setReminders} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <p style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Course Updates</p>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Receive emails about new content in your enrolled courses.</p>
                        </div>
                        <Toggle checked={updates} onChange={setUpdates} />
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
                    <Button
                        variant="outline"
                        style={{ color: '#EF4444', borderColor: '#FECACA' }}
                        onClick={logout}
                    >
                        <LogOut size={16} style={{ marginRight: '8px' }} />
                        Log Out
                    </Button>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <Button variant="outline" style={{ padding: '0.75rem 2rem' }}>Cancel</Button>
                        <Button style={{ padding: '0.75rem 2rem', fontWeight: 'bold' }}>Save Changes</Button>
                    </div>
                </div>

            </Card>
        </div>
    );
};

export default Profile;
