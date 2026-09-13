import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  Task, 
  TaskSummary, 
  TaskCreatePayload, 
  TaskUpdatePayload, 
  TaskStatus,
  SnoozePayload,
  ReschedulePayload
} from '../types';
import { tasksApi } from '../api/tasks';
import { schedulerSync } from '../notifications/schedulerSync';
import { useAuth } from './AuthContext';

interface TaskContextType {
  tasks: Task[];
  summary: TaskSummary | null;
  isLoading: boolean;
  selectedTask: Task | null;
  setSelectedTask: (task: Task | null) => void;
  refreshTasks: (filters?: { status?: TaskStatus; search?: string; date_filter?: string }) => Promise<void>;
  createTask: (payload: TaskCreatePayload) => Promise<Task>;
  updateTask: (id: number, payload: TaskUpdatePayload) => Promise<Task>;
  deleteTask: (id: number) => Promise<void>;
  pauseTask: (id: number) => Promise<Task>;
  resumeTask: (id: number) => Promise<Task>;
  snoozeTask: (id: number, payload: SnoozePayload) => Promise<Task>;
  rescheduleTask: (id: number, payload: ReschedulePayload) => Promise<Task>;
  completeTask: (id: number) => Promise<Task>;
  syncNotifications: () => Promise<number>;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const TaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [summary, setSummary] = useState<TaskSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const refreshTasks = useCallback(async (filters?: { status?: TaskStatus; search?: string; date_filter?: string }) => {
    if (!token) return;
    setIsLoading(true);
    try {
      const [fetchedTasks, fetchedSummary] = await Promise.all([
        tasksApi.getTasks(filters),
        tasksApi.getSummary(),
      ]);
      setTasks(fetchedTasks);
      setSummary(fetchedSummary);

      // Keep local notifications in sync with active scheduled tasks
      schedulerSync.syncWithTasks(fetchedTasks).catch(console.warn);
    } catch (err) {
      console.warn('Error refreshing tasks:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      refreshTasks();
    } else {
      setTasks([]);
      setSummary(null);
      setSelectedTask(null);
    }
  }, [token, refreshTasks]);

  const createTask = async (payload: TaskCreatePayload): Promise<Task> => {
    const newTask = await tasksApi.createTask(payload);
    await refreshTasks();
    return newTask;
  };

  const updateTask = async (id: number, payload: TaskUpdatePayload): Promise<Task> => {
    const updated = await tasksApi.updateTask(id, payload);
    if (selectedTask?.id === id) {
      setSelectedTask(updated);
    }
    await refreshTasks();
    return updated;
  };

  const deleteTask = async (id: number): Promise<void> => {
    await tasksApi.deleteTask(id);
    if (selectedTask?.id === id) {
      setSelectedTask(null);
    }
    await refreshTasks();
  };

  const pauseTask = async (id: number): Promise<Task> => {
    const updated = await tasksApi.pauseTask(id);
    if (selectedTask?.id === id) {
      setSelectedTask(updated);
    }
    await refreshTasks();
    return updated;
  };

  const resumeTask = async (id: number): Promise<Task> => {
    const updated = await tasksApi.resumeTask(id);
    if (selectedTask?.id === id) {
      setSelectedTask(updated);
    }
    await refreshTasks();
    return updated;
  };

  const snoozeTask = async (id: number, payload: SnoozePayload): Promise<Task> => {
    const updated = await tasksApi.snoozeTask(id, payload);
    if (selectedTask?.id === id) {
      setSelectedTask(updated);
    }
    await refreshTasks();
    return updated;
  };

  const rescheduleTask = async (id: number, payload: ReschedulePayload): Promise<Task> => {
    const updated = await tasksApi.rescheduleTask(id, payload);
    if (selectedTask?.id === id) {
      setSelectedTask(updated);
    }
    await refreshTasks();
    return updated;
  };

  const completeTask = async (id: number): Promise<Task> => {
    const updated = await tasksApi.completeTask(id);
    if (selectedTask?.id === id) {
      setSelectedTask(updated);
    }
    await refreshTasks();
    return updated;
  };

  const syncNotifications = async (): Promise<number> => {
    return await schedulerSync.syncWithTasks(tasks);
  };

  return (
    <TaskContext.Provider
      value={{
        tasks,
        summary,
        isLoading,
        selectedTask,
        setSelectedTask,
        refreshTasks,
        createTask,
        updateTask,
        deleteTask,
        pauseTask,
        resumeTask,
        snoozeTask,
        rescheduleTask,
        completeTask,
        syncNotifications,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
};

export const useTasks = (): TaskContextType => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
};
