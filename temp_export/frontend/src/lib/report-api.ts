import api from './api';

export interface ReportData {
    problem_type: string;
    description: string;
    episode_number: string;
    episode_link: string;
    server_name: string;
    page_type: string;
}

export const submitReport = async (data: ReportData) => {
    const response = await api.post('/reports', data);
    return response.data;
};
