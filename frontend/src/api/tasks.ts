import { apiClient } from './client';
import { 
  Task, 
  TaskCreatePayload, 
  TaskUpdatePayload, 
  TaskSummary, 
  TaskStatus,
  SnoozePayload,
  ReschedulePayload,
  PlanDayRequest,
  PlanDayResponse
} from '../types';

export const tasksApi = {
  async planDay(payload: PlanDayRequest): Promise<PlanDayResponse> {
    const res = await apiClient.post<PlanDayResponse>('/tasks/plan-day', payload);
    return res.data;
  },

  async createBatchTasks(tasks: TaskCreatePayload[]): Promise<Task[]> {
    const res = await apiClient.post<Task[]>('/tasks/batch', { tasks });
    return res.data;
  },
  async getTasks(params?: { status?: TaskStatus; search?: string; date_filter?: string }): Promise<Task[]> {
    const res = await apiClient.get<Task[]>('/tasks', { params });
    return res.data;
  },

  async getSummary(): Promise<TaskSummary> {
    const res = await apiClient.get<TaskSummary>('/tasks/summary');
    return res.data;
  },

  async getTask(id: number): Promise<Task> {
    const res = await apiClient.get<Task>(`/tasks/${id}`);
    return res.data;
  },

  async createTask(payload: TaskCreatePayload): Promise<Task> {
    const res = await apiClient.post<Task>('/tasks', payload);
    return res.data;
  },

  async updateTask(id: number, payload: TaskUpdatePayload): Promise<Task> {
    const res = await apiClient.put<Task>(`/tasks/${id}`, payload);
    return res.data;
  },

  async deleteTask(id: number): Promise<void> {
    await apiClient.delete(`/tasks/${id}`);
  },

  async pauseTask(id: number): Promise<Task> {
    const res = await apiClient.post<Task>(`/tasks/${id}/pause`);
    return res.data;
  },

  async resumeTask(id: number): Promise<Task> {
    const res = await apiClient.post<Task>(`/tasks/${id}/resume`);
    return res.data;
  },

  async snoozeTask(id: number, payload: SnoozePayload): Promise<Task> {
    const res = await apiClient.post<Task>(`/tasks/${id}/snooze`, payload);
    return res.data;
  },

  async rescheduleTask(id: number, payload: ReschedulePayload): Promise<Task> {
    const res = await apiClient.post<Task>(`/tasks/${id}/reschedule`, payload);
    return res.data;
  },

  async completeTask(id: number): Promise<Task> {
    const res = await apiClient.post<Task>(`/tasks/${id}/complete`);
    return res.data;
  },

  async updateNotificationId(id: number, notificationId: string): Promise<Task> {
    const res = await apiClient.patch<Task>(`/tasks/${id}/notification`, {
      notification_id: notificationId
    });
    return res.data;
  }
};
