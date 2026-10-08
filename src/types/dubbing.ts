export interface PipelineStep {
  key: string;
  label: string;
  done: boolean;
  active: boolean;
  failed?: boolean;
}

export interface DubbingStageProgressEvent {
  jobId: number;
  lessonId: number;
  stage: 'PREPARING' | 'ASR' | 'TRANSLATE' | 'TTS' | 'UPLOADING' | 'FINALIZING';
  chunkIndex?: number;
  totalChunks?: number;
}

export interface DubbingChunkProgressEvent {
  jobId: number;
  lessonId: number;
  chunkIndex: number;
  totalChunks: number;
  status: 'COMPLETED' | 'FAILED';
}

export interface DubbingJobFinishedEvent {
  jobId: number;
  lessonId: number;
  status: 'COMPLETED' | 'FAILED' | 'SKIPPED' | 'CANCELLED';
}

export type DubbingProgressEvent =
  | DubbingStageProgressEvent
  | DubbingChunkProgressEvent
  | DubbingJobFinishedEvent;

export interface DubbingActivateResult {
  status: 'CREATED' | 'PROCESSING' | 'AVAILABLE';
  jobId: number | null;
  audioUrl: string | null;
}

export interface DubbingCancelResult {
  status: 'CANCELLED';
  jobId: number | null;
  audioUrl: string | null;
}
