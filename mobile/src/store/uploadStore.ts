import { create } from "zustand";

export interface UploadJob {
  id: string;
  filename: string;
  shotType: string;
  progress: number; // 0–1
  status: "uploading" | "confirming" | "done" | "error";
  analysisId?: string;
  error?: string;
}

interface UploadState {
  jobs: Record<string, UploadJob>;
  addJob: (job: UploadJob) => void;
  updateJob: (id: string, updates: Partial<UploadJob>) => void;
  removeJob: (id: string) => void;
  clearCompleted: () => void;
}

export const useUploadStore = create<UploadState>((set) => ({
  jobs: {},

  addJob: (job) =>
    set((state) => ({ jobs: { ...state.jobs, [job.id]: job } })),

  updateJob: (id, updates) =>
    set((state) => ({
      jobs: { ...state.jobs, [id]: { ...state.jobs[id], ...updates } },
    })),

  removeJob: (id) =>
    set((state) => {
      const { [id]: _, ...rest } = state.jobs;
      return { jobs: rest };
    }),

  clearCompleted: () =>
    set((state) => ({
      jobs: Object.fromEntries(
        Object.entries(state.jobs).filter(([, j]) => j.status !== "done"),
      ),
    })),
}));
