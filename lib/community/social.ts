export const SOCIAL_NETWORKS = ["instagram", "x", "tiktok", "youtube"] as const;
export type SocialNetwork = (typeof SOCIAL_NETWORKS)[number];

export type SocialLink = {
  network: SocialNetwork;
  label: string;
  handle: string;
  url: string;
  public: boolean;
};

const HANDLE = /^[A-Za-z0-9._]{1,30}$/;

function stripAt(value: string) {
  return value.trim().replace(/^@+/, "");
}

function hostname(url: URL) {
  return url.hostname.replace(/^www\./, "").toLowerCase();
}

export function parseSocialInput(
  network: SocialNetwork,
  raw: string | null | undefined,
): { handle: string; url: string } | { error: string } | null {
  const value = raw?.trim();
  if (!value) return null;

  if (network === "youtube") {
    try {
      const withProto = value.startsWith("http") ? value : `https://${value}`;
      const url = new URL(withProto);
      const host = hostname(url);
      if (host === "youtu.be" || host === "youtube.com" || host === "m.youtube.com") {
        return { handle: value.replace(/^https?:\/\//, ""), url: url.toString() };
      }
    } catch {
      // fall through to handle parsing
    }
    const handle = stripAt(value);
    if (!HANDLE.test(handle) && !handle.startsWith("channel/")) {
      return { error: "Enter a YouTube URL or @handle." };
    }
    return {
      handle,
      url: handle.startsWith("channel/")
        ? `https://www.youtube.com/${handle}`
        : `https://www.youtube.com/@${handle}`,
    };
  }

  const hosts: Record<Exclude<SocialNetwork, "youtube">, string[]> = {
    instagram: ["instagram.com"],
    x: ["x.com", "twitter.com"],
    tiktok: ["tiktok.com"],
  };

  try {
    const withProto = value.startsWith("http") ? value : `https://${value}`;
    const url = new URL(withProto);
    if (hosts[network].includes(hostname(url))) {
      const parts = url.pathname.split("/").filter(Boolean);
      const handle = stripAt(parts[0] ?? "");
      if (!handle || !HANDLE.test(handle.replace(/^@/, ""))) {
        return { error: `That ${network} URL does not look like a profile.` };
      }
      const cleanHandle = stripAt(handle);
      return { handle: cleanHandle, url: canonicalSocialUrl(network, cleanHandle) };
    }
  } catch {
    // handle-only input
  }

  const handle = stripAt(value);
  if (!HANDLE.test(handle)) {
    return { error: `Enter a valid ${labelForNetwork(network)} handle or profile URL.` };
  }
  return { handle, url: canonicalSocialUrl(network, handle) };
}

export function canonicalSocialUrl(network: SocialNetwork, handle: string) {
  const clean = stripAt(handle);
  switch (network) {
    case "instagram":
      return `https://www.instagram.com/${clean}`;
    case "x":
      return `https://x.com/${clean}`;
    case "tiktok":
      return `https://www.tiktok.com/@${clean}`;
    case "youtube":
      return `https://www.youtube.com/@${clean}`;
  }
}

export function labelForNetwork(network: SocialNetwork) {
  switch (network) {
    case "instagram":
      return "Instagram";
    case "x":
      return "X";
    case "tiktok":
      return "TikTok";
    case "youtube":
      return "YouTube";
  }
}

export function collectSocialLinks(profile: {
  instagramHandle: string | null;
  instagramUrl: string | null;
  instagramPublic: boolean;
  xHandle: string | null;
  xUrl: string | null;
  xPublic: boolean;
  tiktokHandle: string | null;
  tiktokUrl: string | null;
  tiktokPublic: boolean;
  youtubeHandle: string | null;
  youtubeUrl: string | null;
  youtubePublic: boolean;
}): SocialLink[] {
  const rows: Array<{
    network: SocialNetwork;
    handle: string | null;
    url: string | null;
    public: boolean;
  }> = [
    {
      network: "instagram",
      handle: profile.instagramHandle,
      url: profile.instagramUrl,
      public: profile.instagramPublic,
    },
    {
      network: "x",
      handle: profile.xHandle,
      url: profile.xUrl,
      public: profile.xPublic,
    },
    {
      network: "tiktok",
      handle: profile.tiktokHandle,
      url: profile.tiktokUrl,
      public: profile.tiktokPublic,
    },
    {
      network: "youtube",
      handle: profile.youtubeHandle,
      url: profile.youtubeUrl,
      public: profile.youtubePublic,
    },
  ];

  return rows.flatMap((row) => {
    if (!row.handle && !row.url) return [];
    const handle = row.handle || row.url || "";
    const url = row.url || canonicalSocialUrl(row.network, handle);
    return [
      {
        network: row.network,
        label: labelForNetwork(row.network),
        handle,
        url,
        public: row.public,
      },
    ];
  });
}
