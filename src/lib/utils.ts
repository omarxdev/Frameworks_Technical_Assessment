import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["button-sm", "eyebrow"] }],
    },
  },
});

export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs));
};
