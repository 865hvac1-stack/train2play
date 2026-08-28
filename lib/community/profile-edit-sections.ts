export const PROFILE_EDIT_SECTIONS = [
  { id: "profile", label: "Profile" },
  { id: "athletic", label: "Athletic info" },
  { id: "social", label: "Social" },
  { id: "videos", label: "Videos" },
  { id: "privacy", label: "Privacy" },
  { id: "recruiting", label: "Recruiting" },
] as const;

export type ProfileEditSectionId = (typeof PROFILE_EDIT_SECTIONS)[number]["id"];

export function isProfileEditSection(value: string | null | undefined): value is ProfileEditSectionId {
  return PROFILE_EDIT_SECTIONS.some((section) => section.id === value);
}
