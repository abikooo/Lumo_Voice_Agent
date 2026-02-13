import client from './client';

export interface Note {
    id: number;
    title: string;
    content: string;
    color: string;
    tags?: string;
    source?: string;
    file_path?: string;
    created_at?: string;
}

export const uploadNote = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await client.post<Note>('/uploads/', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        }
    });
    return response.data;
}

export interface Session {
    id: string;
    title: string;
    created_at: string;
    video_url?: string;
}

export interface Message {
    id: number;
    session_id: string;
    role: string;
    content: string;
    created_at: string;
}

export const createSession = async (payload: { video_url?: string }): Promise<{ session_id: number }> => {
    const response = await client.post<{ session_id: number }>('/voice/session/new', payload);
    return response.data;
};

export const getNotes = async (): Promise<Note[]> => {
    const response = await client.get<Note[]>('/notes/');
    return response.data;
};

export const setupQuiz = async (sourceType: 'session' | 'note', sourceId: number) => {
    const response = await client.post('/voice/quiz-setup', { source_type: sourceType, source_id: sourceId });
    return response.data;
};

export const createNote = async (note: Partial<Note>) => {
    const response = await client.post<Note>('/notes/', note);
    return response.data;
}

export const deleteNote = async (id: number) => {
    const response = await client.delete(`/notes/${id}`);
    return response.data;
}

export const getHistory = async () => {
    const response = await client.get<Session[]>('/history/sessions');
    return response.data;
}

export const getSessionMessages = async (sessionId: string) => {
    const response = await client.get<Message[]>(`/history/sessions/${sessionId}/messages`);
    return response.data;
}
