export const INSTALL_DISMISS_KEY = "t2p.installPrompt.dismissed";

export type BeforeInstallPromptLike = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferredInstall: BeforeInstallPromptLike | null = null;
const listeners = new Set<() => void>();

export function setDeferredInstallPrompt(event: BeforeInstallPromptLike | null) {
  deferredInstall = event;
  listeners.forEach((listener) => listener());
}

export function getDeferredInstallPrompt() {
  return deferredInstall;
}

export function subscribeInstallPrompt(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function isStandaloneDisplay() {
  if (typeof window === "undefined") return false;
  const media = window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone = "standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return media || iosStandalone;
}

export function isIosDevice() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

export function isInstallDismissed() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(INSTALL_DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissInstallPrompt() {
  try {
    window.localStorage.setItem(INSTALL_DISMISS_KEY, "1");
  } catch {
    /* private mode */
  }
  listeners.forEach((listener) => listener());
}

export function clearInstallDismissal() {
  try {
    window.localStorage.removeItem(INSTALL_DISMISS_KEY);
  } catch {
    /* private mode */
  }
}
