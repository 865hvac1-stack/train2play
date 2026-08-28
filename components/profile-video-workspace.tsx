"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, MoreHorizontal, Plus, Upload } from "lucide-react";

import {
  archiveProfileVideoAction,
  removeFeaturedProfileVideoAction,
  setFeaturedProfileVideoAction,
  submitProfileVideoToTrain2PlayAction,
  toggleHighlightProfileVideoAction,
  updateProfileVideoDetailsAction,
  updateProfileVideoVisibilityAction,
  uploadProfileVideoAction,
  type ProfileVideoActionState,
} from "@/app/(athlete)/athlete/profile-video-actions";
import { FeaturedVideoShowcase } from "@/components/player-profile-view";
import { InstructionVideoPlayer } from "@/components/instruction-video-player";
import { useVideoCompression } from "@/components/use-video-compression";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatMetricValue } from "@/lib/progress";
import {
  PROFILE_VIDEO_TYPES,
  VIDEO_SHOWCASE_VISIBILITY,
  formatShowcaseVisibility,
} from "@/lib/video-categories";
import { cn } from "@/lib/utils";

const LIBRARY_ACCEPT =
  "video/mp4,video/quicktime,video/x-m4v,video/webm,.mp4,.mov,.m4v,.webm";

export type ProfileLinkedMetric = {
  name: string;
  unit: string;
  value: number;
  delta: number | null;
  verified: boolean;
  verificationType: string;
  recordedAt: string;
};

export type ProfileVideoItem = {
  id: string;
  title: string;
  category: string;
  sport: string;
  url: string;
  submittedAt: string;
  visibility: string;
  featured: boolean;
  highlight: boolean;
  purpose: string;
  metricEntryId: string | null;
  submissionStatus: string | null;
  metric: ProfileLinkedMetric | null;
};

export type ProfileMetricOption = {
  id: string;
  name: string;
  unit: string;
  value: number;
  recordedAt: string;
};

function copyFileToInput(file: File, target: HTMLInputElement | null) {
  if (!target) return;
  const transfer = new DataTransfer();
  transfer.items.add(file);
  target.files = transfer.files;
}

export function ProfileVideoWorkspace({
  videos,
  featured,
  metrics,
  defaultSport,
  sports,
  isMinor,
  autoOpenUpload = false,
  autoOpenChoose = false,
}: {
  videos: ProfileVideoItem[];
  featured: ProfileVideoItem | null;
  metrics: ProfileMetricOption[];
  defaultSport: string;
  sports: string[];
  isMinor: boolean;
  autoOpenUpload?: boolean;
  autoOpenChoose?: boolean;
}) {
  const [uploadOpen, setUploadOpen] = useState(autoOpenUpload);
  const [chooseOpen, setChooseOpen] = useState(autoOpenChoose);
  const [submitVideo, setSubmitVideo] = useState<ProfileVideoItem | null>(null);
  const [editVideo, setEditVideo] = useState<ProfileVideoItem | null>(null);

  return (
    <div className="space-y-6">
      {featured ? (
        <FeaturedVideoShowcase
          src={featured.url}
          title={featured.title}
          actions={
            <>
              <button
                type="button"
                onClick={() => setUploadOpen(true)}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-semibold text-black"
              >
                <Plus className="size-4" />
                Upload video
              </button>
              <button
                type="button"
                onClick={() => setChooseOpen(true)}
                className="inline-flex min-h-11 items-center rounded-lg border border-white/20 px-4 text-sm font-semibold text-white"
              >
                Choose existing video
              </button>
            </>
          }
        />
      ) : (
        <section className="rounded-2xl border border-dashed border-white/15 bg-zinc-900/70 px-4 py-5">
          <p className="text-[10px] font-bold tracking-[0.18em] text-brand uppercase">
            Featured video
          </p>
          <h2 className="font-heading mt-1 text-xl font-bold">Showcase your game.</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Upload a new clip or choose one you already have in Train2Play.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setUploadOpen(true)}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-semibold text-black"
            >
              <Plus className="size-4" />
              Upload video
            </button>
            <button
              type="button"
              onClick={() => setChooseOpen(true)}
              className="inline-flex min-h-11 items-center rounded-lg border border-white/20 px-4 text-sm font-semibold text-white"
            >
              Choose existing video
            </button>
          </div>
        </section>
      )}

      {videos.length > 0 ? (
        <section>
          <h2 className="font-heading text-xl font-bold">My videos</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Featured is your main clip. Highlights are extra clips on your shareable profile.
          </p>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {videos.map((video) => (
              <li key={video.id}>
                <ProfileVideoCard
                  video={video}
                  onSubmit={() => setSubmitVideo(video)}
                  onEdit={() => setEditVideo(video)}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <UploadVideoDialog
        key={uploadOpen ? "upload-open" : "upload-closed"}
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        defaultSport={defaultSport}
        sports={sports}
        metrics={metrics}
        isMinor={isMinor}
      />
      <ChooseExistingDialog
        key={chooseOpen ? "choose-open" : "choose-closed"}
        open={chooseOpen}
        onOpenChange={setChooseOpen}
        videos={videos}
        featuredId={featured?.id ?? null}
      />
      {submitVideo ? (
        <SubmitToTrain2PlayDialog
          video={submitVideo}
          isMinor={isMinor}
          onClose={() => setSubmitVideo(null)}
        />
      ) : null}
      {editVideo ? (
        <EditVideoDialog
          video={editVideo}
          metrics={metrics}
          onClose={() => setEditVideo(null)}
        />
      ) : null}
    </div>
  );
}

function ProfileVideoCard({
  video,
  onSubmit,
  onEdit,
}: {
  video: ProfileVideoItem;
  onSubmit: () => void;
  onEdit: () => void;
}) {
  const [pending, start] = useTransition();
  const date = new Date(video.submittedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <article className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900">
      <div className="bg-black p-2">
        <InstructionVideoPlayer src={video.url} title={video.title} tone="dark" />
      </div>
      <div className="space-y-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-semibold text-white">{video.title}</p>
            <p className="text-xs text-zinc-400">
              {video.category} · {date} · {formatShowcaseVisibility(video.visibility)}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
            render={
              <Button
                type="button"
                variant="outline"
                className="min-h-11 border-white/15 bg-black/40 px-3 text-white"
              >
                <MoreHorizontal className="size-4" />
                <span className="sr-only">Video actions</span>
              </Button>
            }
          />
            <DropdownMenuContent className="min-w-52">
              <DropdownMenuItem render={<Link href={`/athlete/videos/reviews/${video.id}`} />}>
                Watch
              </DropdownMenuItem>
              {video.featured ? (
                <DropdownMenuItem
                  disabled={pending}
                  onClick={() => start(() => void removeFeaturedProfileVideoAction())}
                >
                  Remove featured
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  disabled={pending}
                  onClick={() => start(() => void setFeaturedProfileVideoAction(video.id))}
                >
                  Make featured
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                disabled={pending}
                onClick={() =>
                  start(() => void toggleHighlightProfileVideoAction(video.id, !video.highlight))
                }
              >
                {video.highlight ? "Remove from highlights" : "Add to highlights"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {Object.values(VIDEO_SHOWCASE_VISIBILITY).map((value) => (
                <DropdownMenuItem
                  key={value}
                  disabled={pending || video.visibility === value}
                  onClick={() =>
                    start(() => void updateProfileVideoVisibilityAction(video.id, value))
                  }
                >
                  Visibility: {formatShowcaseVisibility(value)}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onEdit}>Edit details</DropdownMenuItem>
              <DropdownMenuItem onClick={onSubmit}>Submit to Train2Play</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={pending}
                onClick={() => start(() => void archiveProfileVideoAction(video.id))}
              >
                Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex flex-wrap gap-1">
          {video.featured ? <Badge>Featured</Badge> : null}
          {video.highlight ? <Badge>Highlight</Badge> : null}
          {video.submissionStatus ? <Badge>{video.submissionStatus}</Badge> : null}
        </div>
        {video.metric ? (
          <LinkedMetricBlock metric={video.metric} category={video.category} />
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/athlete/videos/reviews/${video.id}`}
            className="inline-flex min-h-10 items-center rounded-lg border border-white/15 px-3 text-xs font-semibold"
          >
            Watch
          </Link>
          <button
            type="button"
            onClick={onSubmit}
            className="inline-flex min-h-10 items-center rounded-lg bg-brand px-3 text-xs font-semibold text-black"
          >
            Submit to Train2Play
          </button>
        </div>
      </div>
    </article>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-brand/40 bg-brand/10 px-2 py-0.5 text-[10px] font-bold tracking-wide text-brand uppercase">
      {children}
    </span>
  );
}

function LinkedMetricBlock({
  metric,
  category,
}: {
  metric: ProfileLinkedMetric;
  category?: string;
}) {
  const date = new Date(metric.recordedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const heading =
    category === "New PR" ? `New ${metric.name} PR` : metric.name;
  return (
    <div className="rounded-xl border border-brand/30 bg-black/40 p-3">
      <p className="text-[10px] font-bold tracking-[0.14em] text-brand uppercase">
        {heading}
        {category === "New PR" ? " 🔥" : ""}
      </p>
      <p className="font-heading text-2xl font-bold">
        {formatMetricValue(metric.value, metric.unit)}
      </p>
      {metric.delta != null ? (
        <p className="text-sm font-semibold text-brand">
          {metric.delta > 0 ? "+" : ""}
          {formatMetricValue(metric.delta, metric.unit)}
        </p>
      ) : null}
      {metric.verified ? (
        <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
          <CheckCircle2 className="size-3.5" />
          {metric.verificationType === "TRAIN2PLAY" ? "Train2Play verified" : "Coach verified"}
        </p>
      ) : (
        <p className="mt-1 text-[11px] text-zinc-500">Self reported</p>
      )}
      <p className="text-[11px] text-zinc-500">{date}</p>
    </div>
  );
}

function UploadVideoDialog({
  open,
  onOpenChange,
  defaultSport,
  sports,
  metrics,
  isMinor,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultSport: string;
  sports: string[];
  metrics: ProfileMetricOption[];
  isMinor: boolean;
}) {
  const sportOptions = sports.length > 0 ? sports : [defaultSport || "Basketball"];
  const [sport, setSport] = useState(defaultSport || sportOptions[0]!);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const formFileRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const recordRef = useRef<HTMLInputElement>(null);
  const originalFileRef = useRef<File | null>(null);
  const [optimize, setOptimize] = useState(true);
  const { state: compression, prepare, reset } = useVideoCompression();
  const [state, action, pending] = useActionState(
    uploadProfileVideoAction,
    {} as ProfileVideoActionState,
  );
  const busy = compression.status === "working";

  function onPickedFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("video/") && !/\.(mp4|mov|m4v|webm)$/i.test(file.name)) {
      setFileError("Please choose a video file.");
      setFileName(null);
      reset();
      return;
    }
    copyFileToInput(file, formFileRef.current);
    originalFileRef.current = file;
    setFileName(file.name || "Selected video");
    setFileError(null);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
    void prepare(file, formFileRef.current, { optimize });
  }

  if (state.uploaded && state.reviewId) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-zinc-950 text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Video uploaded 🔥</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-400">
            Same clip is on your Player Profile. Send it from Video coaching if you want
            coach feedback. It stays private until you feature it or change visibility.
          </p>
          <PostUploadActions
            reviewId={state.reviewId}
            isMinor={isMinor}
            onDone={() => onOpenChange(false)}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-zinc-950 text-white sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload video</DialogTitle>
        </DialogHeader>
        <form action={action} className="space-y-4" encType="multipart/form-data">
          {compression.mediaId ? (
            <input type="hidden" name="directVideoMediaId" value={compression.mediaId} />
          ) : null}
          <input
            ref={formFileRef}
            type="file"
            name="videoFile"
            accept={LIBRARY_ACCEPT}
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => onPickedFile(e.target.files?.[0])}
          />
          <input
            ref={libraryRef}
            type="file"
            accept={LIBRARY_ACCEPT}
            className="sr-only"
            onChange={(e) => {
              onPickedFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <input
            ref={recordRef}
            type="file"
            accept="video/*"
            capture="environment"
            className="sr-only"
            onChange={(e) => {
              onPickedFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => libraryRef.current?.click()}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand px-3 text-sm font-bold text-black"
            >
              <Upload className="size-4" />
              Select video
            </button>
            <button
              type="button"
              onClick={() => recordRef.current?.click()}
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/20 px-3 text-sm font-bold"
            >
              Record / capture
            </button>
          </div>
          {previewUrl ? (
            <video
              src={previewUrl}
              controls
              playsInline
              className="aspect-video w-full rounded-xl bg-black"
            />
          ) : null}
          {fileName ? (
            <div className="space-y-2 rounded-xl border border-brand/30 bg-brand/10 px-3 py-2">
              <p className="truncate text-sm text-brand">Selected: {fileName}</p>
              {compression.message ? (
                <p className="text-xs text-zinc-300">{compression.message}</p>
              ) : null}
              {busy ? (
                <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
                  <div className="h-full bg-brand" style={{ width: `${compression.percent}%` }} />
                </div>
              ) : null}
              {compression.status === "ready" ? (
                <p className="text-xs font-semibold text-emerald-400">Video ready.</p>
              ) : null}
              {compression.status === "error" ? (
                <button
                  type="button"
                  className="text-xs font-semibold text-brand underline"
                  onClick={() => {
                    const original = originalFileRef.current;
                    if (original) void prepare(original, formFileRef.current, { optimize });
                  }}
                >
                  Try again
                </button>
              ) : null}
            </div>
          ) : null}
          {fileError ?? compression.sizeError ?? compression.uploadError ? (
            <p className="text-sm text-red-400">
              {fileError ?? compression.sizeError ?? compression.uploadError}
            </p>
          ) : null}

          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setOptimize(true)}
              className={cn(
                "min-h-10 rounded-lg text-xs font-bold",
                optimize ? "bg-brand text-black" : "border border-white/15 text-zinc-400",
              )}
            >
              Optimized
            </button>
            <button
              type="button"
              onClick={() => setOptimize(false)}
              className={cn(
                "min-h-10 rounded-lg text-xs font-bold",
                !optimize ? "bg-brand text-black" : "border border-white/15 text-zinc-400",
              )}
            >
              Original
            </button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              placeholder="Auto-titled if you leave this blank"
              className="h-11 border-white/15 bg-black text-white"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sport">Sport</Label>
              <select
                id="sport"
                name="sport"
                value={sport}
                onChange={(e) => setSport(e.target.value)}
                className="h-11 w-full rounded-lg border border-white/15 bg-black px-2 text-white"
              >
                {sportOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Video type</Label>
              <select
                id="category"
                name="category"
                required
                defaultValue="Game Highlight"
                className="h-11 w-full rounded-lg border border-white/15 bg-black px-2 text-white"
              >
                {PROFILE_VIDEO_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              name="description"
              className="min-h-20 border-white/15 bg-black text-white"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="showcaseVisibility">Visibility</Label>
            <select
              id="showcaseVisibility"
              name="showcaseVisibility"
              defaultValue={VIDEO_SHOWCASE_VISIBILITY.PRIVATE}
              className="h-11 w-full rounded-lg border border-white/15 bg-black px-2 text-white"
            >
              <option value={VIDEO_SHOWCASE_VISIBILITY.PRIVATE}>Private — only me</option>
              <option value={VIDEO_SHOWCASE_VISIBILITY.COACHES}>Coaches only</option>
              <option value={VIDEO_SHOWCASE_VISIBILITY.TRAIN2PLAY}>
                Train2Play signed-in users
              </option>
              <option value={VIDEO_SHOWCASE_VISIBILITY.PUBLIC_PROFILE}>
                Public profile (still needs Privacy → allow videos)
              </option>
            </select>
            <p className="text-[11px] text-zinc-500">
              New uploads stay private by default and never become public automatically.
            </p>
          </div>
          {metrics.length > 0 ? (
            <div className="space-y-2">
              <Label htmlFor="metricEntryId">Link a performance result (optional)</Label>
              <select
                id="metricEntryId"
                name="metricEntryId"
                defaultValue=""
                className="h-11 w-full rounded-lg border border-white/15 bg-black px-2 text-white"
              >
                <option value="">None</option>
                {metrics.map((metric) => (
                  <option key={metric.id} value={metric.id}>
                    {metric.name} — {formatMetricValue(metric.value, metric.unit)} —{" "}
                    {new Date(metric.recordedAt).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {state.error ? <p className="text-sm text-red-400">{state.error}</p> : null}
          <Button
            type="submit"
            disabled={!fileName || busy || pending || Boolean(compression.sizeError)}
            className="min-h-12 w-full bg-brand text-black"
          >
            {busy
              ? compression.message?.toLowerCase().includes("compress")
                ? `Processing… ${compression.percent}%`
                : `Uploading video… ${compression.percent}%`
              : pending
                ? "Processing…"
                : "Upload"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PostUploadActions({
  reviewId,
  isMinor,
  onDone,
}: {
  reviewId: string;
  isMinor: boolean;
  onDone: () => void;
}) {
  const [pending, start] = useTransition();
  const [submitOpen, setSubmitOpen] = useState(false);
  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await setFeaturedProfileVideoAction(reviewId);
            onDone();
          })
        }
        className="flex min-h-11 w-full items-center justify-center rounded-lg bg-brand text-sm font-bold text-black"
      >
        Make featured
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await toggleHighlightProfileVideoAction(reviewId, true);
            onDone();
          })
        }
        className="flex min-h-11 w-full items-center justify-center rounded-lg border border-white/20 text-sm font-semibold"
      >
        Add to highlights
      </button>
      <button
        type="button"
        onClick={() => setSubmitOpen(true)}
        className="flex min-h-11 w-full items-center justify-center rounded-lg border border-brand/40 text-sm font-semibold text-brand"
      >
        Submit to Train2Play
      </button>
      <Link
        href={`/athlete/videos/reviews/${reviewId}`}
        className="flex min-h-11 items-center justify-center rounded-lg border border-white/20 text-sm font-semibold"
      >
        View video
      </Link>
      <button
        type="button"
        onClick={onDone}
        className="flex min-h-11 w-full items-center justify-center text-sm font-semibold text-zinc-400"
      >
        Done
      </button>
      {submitOpen ? (
        <SubmitToTrain2PlayDialog
          video={{
            id: reviewId,
            title: "Uploaded video",
            category: "Other",
            sport: "",
            url: "",
            submittedAt: new Date().toISOString(),
            visibility: "PRIVATE",
            featured: false,
            highlight: false,
            purpose: "LIBRARY",
            metricEntryId: null,
            submissionStatus: null,
            metric: null,
          }}
          isMinor={isMinor}
          onClose={() => setSubmitOpen(false)}
        />
      ) : null}
    </div>
  );
}

function ChooseExistingDialog({
  open,
  onOpenChange,
  videos,
  featuredId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videos: ProfileVideoItem[];
  featuredId: string | null;
}) {
  const [selected, setSelected] = useState(featuredId ?? videos[0]?.id ?? "");
  const [pending, start] = useTransition();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-zinc-950 text-white sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Choose existing video</DialogTitle>
        </DialogHeader>
        {videos.length === 0 ? (
          <p className="text-sm text-zinc-400">
            You do not have videos yet. Upload one from this profile.
          </p>
        ) : (
          <ul className="space-y-2">
            {videos.map((video) => (
              <li key={video.id}>
                <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-white/10 px-3 py-2">
                  <input
                    type="radio"
                    name="chooseVideo"
                    checked={selected === video.id}
                    onChange={() => setSelected(video.id)}
                    className="accent-brand"
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{video.title}</span>
                    <span className="text-xs text-zinc-400">{video.category}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={!selected || pending}
            onClick={() =>
              start(async () => {
                await setFeaturedProfileVideoAction(selected);
                onOpenChange(false);
              })
            }
            className="min-h-11 flex-1 rounded-lg bg-brand text-sm font-bold text-black"
          >
            Make featured
          </button>
          <button
            type="button"
            disabled={!selected || pending}
            onClick={() =>
              start(async () => {
                await toggleHighlightProfileVideoAction(selected, true);
                onOpenChange(false);
              })
            }
            className="min-h-11 flex-1 rounded-lg border border-white/20 text-sm font-semibold"
          >
            Add to highlights
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SubmitToTrain2PlayDialog({
  video,
  isMinor,
  onClose,
}: {
  video: ProfileVideoItem;
  isMinor: boolean;
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState(
    submitProfileVideoToTrain2PlayAction,
    {} as ProfileVideoActionState,
  );
  useEffect(() => {
    if (state.success) onClose();
  }, [state.success, onClose]);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-zinc-950 text-white sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Submit to Train2Play</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-zinc-400">
          Uses this existing video and your Player Profile. You do not re-enter who you are.
        </p>
        {video.metric ? (
          <LinkedMetricBlock metric={video.metric} category={video.category} />
        ) : null}
        <form action={action} className="space-y-3">
          <input type="hidden" name="reviewId" value={video.id} />
          <div className="space-y-2">
            <Label htmlFor="submit-category">Submission category</Label>
            <select
              id="submit-category"
              name="category"
              defaultValue={
                PROFILE_VIDEO_TYPES.includes(video.category as (typeof PROFILE_VIDEO_TYPES)[number])
                  ? video.category
                  : "Game Highlight"
              }
              className="h-11 w-full rounded-lg border border-white/15 bg-black px-2"
            >
              {PROFILE_VIDEO_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="note">Optional note</Label>
            <Textarea id="note" name="note" className="min-h-20 border-white/15 bg-black text-white" />
          </div>
          <label className="flex min-h-11 items-start gap-2 text-sm">
            <input type="checkbox" name="featurePermission" className="mt-1 accent-brand" />
            Train2Play may feature this on the platform
          </label>
          <label className="flex min-h-11 items-start gap-2 text-sm">
            <input type="checkbox" name="socialMediaPermission" className="mt-1 accent-brand" />
            Train2Play may use this on social media
          </label>
          {isMinor ? (
            <label className="flex min-h-11 items-start gap-2 text-sm">
              <input type="checkbox" name="guardianApproved" required className="mt-1 accent-brand" />
              A parent or guardian approves this submission
            </label>
          ) : null}
          {state.error ? <p className="text-sm text-red-400">{state.error}</p> : null}
          <Button type="submit" disabled={pending} className="min-h-12 w-full bg-brand text-black">
            {pending ? "Submitting…" : "Submit"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditVideoDialog({
  video,
  metrics,
  onClose,
}: {
  video: ProfileVideoItem;
  metrics: ProfileMetricOption[];
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState(
    updateProfileVideoDetailsAction,
    {} as ProfileVideoActionState,
  );
  useEffect(() => {
    if (state.success) onClose();
  }, [state.success, onClose]);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-zinc-950 text-white sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit details</DialogTitle>
        </DialogHeader>
        <form action={action} className="space-y-3">
          <input type="hidden" name="reviewId" value={video.id} />
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title</Label>
            <Input
              id="edit-title"
              name="title"
              defaultValue={video.title}
              className="h-11 border-white/15 bg-black text-white"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-category">Video type</Label>
            <select
              id="edit-category"
              name="category"
              defaultValue={
                PROFILE_VIDEO_TYPES.includes(video.category as (typeof PROFILE_VIDEO_TYPES)[number])
                  ? video.category
                  : "Other"
              }
              className="h-11 w-full rounded-lg border border-white/15 bg-black px-2"
            >
              {PROFILE_VIDEO_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-metric">Linked result</Label>
            <select
              id="edit-metric"
              name="metricEntryId"
              defaultValue={video.metricEntryId ?? ""}
              className="h-11 w-full rounded-lg border border-white/15 bg-black px-2"
            >
              <option value="">None</option>
              {metrics.map((metric) => (
                <option key={metric.id} value={metric.id}>
                  {metric.name} — {formatMetricValue(metric.value, metric.unit)}
                </option>
              ))}
            </select>
          </div>
          {state.error ? <p className="text-sm text-red-400">{state.error}</p> : null}
          <Button type="submit" disabled={pending} className="min-h-11 w-full bg-brand text-black">
            {pending ? "Saving…" : "Save"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
