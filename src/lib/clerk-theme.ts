import type { ComponentProps } from "react";
import type { ClerkProvider } from "@clerk/nextjs";

type Props = ComponentProps<typeof ClerkProvider>;

/** Makes Clerk's sign-in and account menus look like part of the register. */
export const clerkAppearance: Props["appearance"] = {
  variables: {
    colorPrimary: "#6b1a0e",
    colorPrimaryForeground: "#ffffff",
    colorForeground: "#2a1a14",
    colorMutedForeground: "#7a6a5f",
    colorBackground: "#ffffff",
    colorInput: "#ffffff",
    colorInputForeground: "#2a1a14",
    colorBorder: "#eadfce",
    colorRing: "#6b1a0e",
    colorDanger: "#b4351f",
    colorSuccess: "#1f7a4d",
    colorShimmer: "#fdf8f0",
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "w-full !max-w-none !shadow-none border border-line rounded-2xl",
    card: "!shadow-none px-6 py-7 sm:px-8",
    headerTitle: "font-serif !text-2xl !font-normal",
    headerSubtitle: "!text-muted",
    formButtonPrimary: "!h-11 !text-[15px] transition active:scale-[0.98]",
    formFieldInput: "!h-11 !text-base",
    socialButtonsBlockButton: "!h-11 transition hover:!bg-ivory",
    footer: "!bg-none !bg-transparent",
  },
};

export const clerkLocalization: Props["localization"] = {
  signIn: {
    start: {
      title: "Welcome back",
      subtitle: "Sign in to open the register",
    },
  },
};
