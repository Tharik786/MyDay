import { apiClient } from './client';
import { TaskHistoryItem, HistoryEventType } from '../types';

export const historyApi = {
  async getHistory(params?: { task_id?: number; event_type?: HistoryEventType; limit?: number }): Promise<TaskHistoryItem[]> {
    const res = await apiClient.get<TaskHistoryItem[]>('/history', { params });
    return res.data;
  },
};
