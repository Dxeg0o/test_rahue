import type { StageTimestamps } from "@/lib/demo-context";

export type WorkflowVisualStatus = "RUNNING" | "PAUSED" | "COMPLETED";

export type WorkflowStageState =
  | "completed"
  | "current"
  | "skipped"
  | "pending";

type StageLike = {
  stageName: string;
};

interface WorkflowProgressInput {
  flow?: string[];
  currentStageName?: string | "COMPLETADO";
  status: WorkflowVisualStatus;
  stageTimestamps?: Record<string, StageTimestamps>;
  stagesDetail?: StageLike[];
}

export interface WorkflowStageMeta {
  stageName: string;
  index: number;
  state: WorkflowStageState;
  timestamps?: StageTimestamps;
}

export interface WorkflowProgressSummary {
  stages: WorkflowStageMeta[];
  completedCount: number;
  currentCount: number;
  skippedCount: number;
  pendingCount: number;
  processedCount: number;
  totalCount: number;
}

function hasStageDetail(stageName: string, stagesDetail?: StageLike[]) {
  return stagesDetail?.some((stage) => stage.stageName === stageName) ?? false;
}

export function getWorkflowProgressSummary({
  flow = [],
  currentStageName,
  status,
  stageTimestamps,
  stagesDetail,
}: WorkflowProgressInput): WorkflowProgressSummary {
  const currentStageIndex =
    currentStageName && currentStageName !== "COMPLETADO"
      ? flow.indexOf(currentStageName)
      : -1;

  const observedIndexes = flow
    .map((stageName, index) => {
      const timestamps = stageTimestamps?.[stageName];
      const hasEvidence =
        Boolean(timestamps?.start) ||
        Boolean(timestamps?.end) ||
        hasStageDetail(stageName, stagesDetail) ||
        index === currentStageIndex;

      return hasEvidence ? index : -1;
    })
    .filter((index) => index >= 0);

  const furthestObservedIndex =
    observedIndexes.length > 0 ? Math.max(...observedIndexes) : currentStageIndex;

  const stages = flow.map<WorkflowStageMeta>((stageName, index) => {
    const timestamps = stageTimestamps?.[stageName];
    const hasStarted = Boolean(timestamps?.start) || hasStageDetail(stageName, stagesDetail);
    const hasCompleted =
      Boolean(timestamps?.end) ||
      hasStageDetail(stageName, stagesDetail) ||
      (status === "COMPLETED" && Boolean(timestamps?.start));
    const isCurrent = currentStageIndex === index && status !== "COMPLETED";

    let state: WorkflowStageState = "pending";

    if (status === "COMPLETED") {
      state = hasStarted ? "completed" : "skipped";
    } else if (hasCompleted) {
      state = "completed";
    } else if (isCurrent) {
      state = "current";
    } else if (!hasStarted && furthestObservedIndex > index) {
      state = "skipped";
    } else if (hasStarted && index < furthestObservedIndex) {
      state = "completed";
    }

    return {
      stageName,
      index,
      state,
      timestamps,
    };
  });

  const completedCount = stages.filter((stage) => stage.state === "completed").length;
  const currentCount = stages.filter((stage) => stage.state === "current").length;
  const skippedCount = stages.filter((stage) => stage.state === "skipped").length;
  const pendingCount = stages.filter((stage) => stage.state === "pending").length;

  return {
    stages,
    completedCount,
    currentCount,
    skippedCount,
    pendingCount,
    processedCount: completedCount + currentCount,
    totalCount: stages.length,
  };
}
