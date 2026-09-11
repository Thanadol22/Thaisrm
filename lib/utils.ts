import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseGoogleName(
  name?: string | null,
  givenName?: string | null,
  familyName?: string | null
) {
  let nameTh = "";
  let nameEn = "";
  const trimmed = (name || "").trim();

  if (!trimmed) {
    return { nameTh, nameEn };
  }

  const hasThai = /[\u0E00-\u0E7F]/.test(trimmed);

  if (hasThai) {
    nameTh = trimmed;
    if (givenName && /^[A-Za-z\s.-]+$/.test(givenName)) {
      nameEn = `${givenName} ${familyName || ""}`.trim();
    }
  } else {
    nameEn = trimmed;
    if (givenName && /[\u0E00-\u0E7F]/.test(givenName)) {
      nameTh = `${givenName} ${familyName || ""}`.trim();
    }
  }

  return { nameTh, nameEn };
}

