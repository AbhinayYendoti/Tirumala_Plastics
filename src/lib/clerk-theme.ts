import type { ComponentProps } from "react";
import type { ClerkProvider } from "@clerk/nextjs";

type Props = ComponentProps<typeof ClerkProvider>;

/**
 * Makes Clerk's sign-in card look like part of the register.
 * Borders and surfaces are set explicitly per element: Clerk derives them from
 * `colorBorder` at ~10% opacity, which made the Google button and divider invisible on white.
 */
export const clerkAppearance: Props["appearance"] = {
  variables: {
    colorPrimary: "#6b1a0e",
    colorPrimaryForeground: "#ffffff",
    colorForeground: "#2a1a14",
    colorMutedForeground: "#7a6a5f",
    colorNeutral: "#2a1a14",
    colorBackground: "#ffffff",
    colorInput: "#ffffff",
    colorInputForeground: "#2a1a14",
    colorRing: "#6b1a0e",
    colorDanger: "#b4351f",
    colorSuccess: "#1f7a4d",
    colorShimmer: "#fdf8f0",
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
    fontSize: "15px",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "!w-full !max-w-none !rounded-3xl !border !border-line !bg-paper !shadow-xl !shadow-maroon/5",
    card: "!rounded-none !border-0 !bg-transparent !px-6 !pb-6 !pt-7 !shadow-none sm:!px-8",
    header: "!gap-1.5",
    headerTitle: "!font-serif !text-[1.6rem] !font-normal !leading-tight !text-ink",
    headerSubtitle: "!text-[0.95rem] !text-muted",

    socialButtons: "!gap-2",
    socialButtonsBlockButton:
      "!h-12 !rounded-xl !border !border-line !bg-paper !shadow-sm !transition hover:!border-maroon/40 hover:!bg-maroon/5 active:!scale-[0.98]",
    socialButtonsBlockButtonText: "!text-[15px] !font-medium !text-ink",
    socialButtonsProviderIcon: "!h-5 !w-5",

    dividerRow: "!my-1",
    dividerLine: "!bg-line",
    dividerText: "!text-xs !uppercase !tracking-widest !text-muted",

    formFieldLabel: "!text-sm !font-medium !text-ink/80",
    formFieldInput:
      "!h-12 !rounded-xl !border !border-line !bg-paper !px-3.5 !text-base !text-ink !shadow-none !transition focus:!border-maroon focus:!ring-2 focus:!ring-maroon/15",
    formButtonPrimary:
      "!h-12 !rounded-xl !bg-maroon !text-[15px] !font-medium !normal-case !text-white !shadow-md !shadow-maroon/20 !transition hover:!bg-maroon-dark active:!scale-[0.98]",
    formResendCodeLink: "!text-maroon",
    otpCodeFieldInput: "!rounded-lg !border !border-line",
    identityPreviewEditButton: "!text-maroon",

    footer: "!rounded-b-3xl !border-t !border-line !bg-ivory/60 !bg-none",
    footerActionText: "!text-muted",
    footerActionLink: "!font-medium !text-maroon hover:!text-maroon-dark",
  },
};

export const clerkLocalization: Props["localization"] = {
  signIn: {
    start: {
      // Clerk shows the *Combined* texts when sign-in and sign-up share one form.
      title: "Welcome back",
      titleCombined: "Welcome back",
      subtitle: "Sign in to open the register",
      subtitleCombined: "Sign in to open the register",
    },
  },
};
