import type { ProfileMetricOption, ProfileVideoItem } from "@/components/profile-video-workspace";
import { VIDEO_REVIEW_STATUS, VIDEO_SHOWCASE_VISIBILITY } from "@/lib/video-categories";

type MetricRow = {
  id: string;
  value: number;
  recordedAt: Date;
  verificationType: string;
  metricDefinition: {
    id: string;
    name: string;
    unit: string;
    direction: string;
    isSensitive: boolean;
  };
};

export function mapProfileMetricOptions(entries: MetricRow[]): ProfileMetricOption[] {
  return entries
    .filter((entry) => !entry.metricDefinition.isSensitive)
    .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime())
    .slice(0, 25)
    .map((entry) => ({
      id: entry.id,
      name: entry.metricDefinition.name,
      unit: entry.metricDefinition.unit,
      value: entry.value,
      recordedAt: entry.recordedAt.toISOString(),
    }));
}

export function mapProfileVideos(options: {
  reviews: {
    id: string;
    title: string;
    category: string;
    sport: string;
    submittedAt: Date;
    purpose: string;
    status: string;
    showcaseVisibility: string;
    metricEntryId: string | null;
    trainingVideo: { videoUrl: string };
    metricEntry: {
      value: number;
      recordedAt: Date;
      verificationType: string;
      metricDefinition: { name: string; unit: string; direction: string; id: string };
    } | null;
    contentSubmissions: { status: string }[];
  }[];
  featuredId: string | null;
  highlightIds: string[];
  metricHistory: MetricRow[];
}): ProfileVideoItem[] {
  return options.reviews
    .filter((review) => review.status !== VIDEO_REVIEW_STATUS.ARCHIVED)
    .map((review) => {
    let metric = null;
    if (review.metricEntry) {
      const history = options.metricHistory
        .filter((row) => row.metricDefinition.id === review.metricEntry!.metricDefinition.id)
        .sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());
      const first = history[0];
      const latest = review.metricEntry;
      const delta =
        first && history.length > 1
          ? latest.metricDefinition.direction === "LOWER_IS_BETTER"
            ? first.value - latest.value
            : latest.value - first.value
          : null;
      metric = {
        name: latest.metricDefinition.name,
        unit: latest.metricDefinition.unit,
        value: latest.value,
        delta,
        verified:
          latest.verificationType === "COACH" || latest.verificationType === "TRAIN2PLAY",
        verificationType: latest.verificationType,
        recordedAt: latest.recordedAt.toISOString(),
      };
    }
    const pending = review.contentSubmissions.find((row) => row.status === "PENDING");
    return {
      id: review.id,
      title: review.title,
      category: review.category,
      sport: review.sport,
      url: review.trainingVideo.videoUrl,
      submittedAt: review.submittedAt.toISOString(),
      visibility: review.showcaseVisibility || VIDEO_SHOWCASE_VISIBILITY.PRIVATE,
      featured: review.id === options.featuredId,
      highlight: options.highlightIds.includes(review.id),
      purpose: review.purpose,
      metricEntryId: review.metricEntryId,
      submissionStatus: pending?.status ?? review.contentSubmissions[0]?.status ?? null,
      metric,
    };
  });
}
