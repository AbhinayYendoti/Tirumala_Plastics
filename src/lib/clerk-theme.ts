import type { ComponentProps } from "react";
import type { ClerkProvider } from "@clerk/nextjs";

type Props = ComponentProps<typeof ClerkProvider>;

// Same 48px height for the Google button, email field and Continue, and one focus ring everywhere.
const FIELD_H = "!h-12 !min-h-12 !max-h-none"; // Clerk caps inputs with max-height: 36px
const FOCUS_RING = "focus-visible:!outline-none focus-visible:!ring-2 focus-visible:!ring-maroon/40 focus-visible:!ring-offset-2";

/**
 * Clerk's sign-in form, restyled to sit inside our AuthCard (src/components/auth-hero.tsx).
 * Clerk's own card chrome is removed; every visible element is styled explicitly, because
 * Clerk derives borders from its variables at ~10% opacity (invisible on white).
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
    rootBox: "!w-full !max-w-full",
    cardBox: "!w-full !max-w-full !rounded-none !border-0 !bg-transparent !shadow-none",
    card: "!w-full !max-w-full !gap-6 !rounded-none !border-0 !bg-transparent !px-6 !pb-6 !pt-6 !shadow-none sm:!px-7 lg:!pt-5",

    header: "!items-start !gap-1 !text-left",
    headerTitle: "!font-serif !text-[1.625rem] !font-normal !leading-tight !text-ink",
    headerSubtitle: "!text-[0.95rem] !text-muted",

    main: "!gap-5",
    socialButtons: "!gap-2",
    socialButtonsBlockButton: `${FIELD_H} !rounded-xl !border !border-line !bg-paper !shadow-none !transition hover:!border-maroon/40 hover:!bg-maroon/5 active:!scale-[0.99] ${FOCUS_RING}`,
    socialButtonsBlockButtonText: "!text-[15px] !font-medium !text-ink",
    socialButtonsProviderIcon: "!h-5 !w-5",

    dividerRow: "!my-0",
    dividerLine: "!bg-line",
    dividerText: "!px-3 !text-[11px] !font-medium !uppercase !tracking-[0.2em] !text-muted",

    form: "!gap-4",
    formFieldLabel: "!mb-1.5 !text-sm !font-medium !text-ink/80",
    formFieldInput: `${FIELD_H} !rounded-xl !border !border-line !bg-paper !px-3.5 !text-base !text-ink !shadow-none !transition placeholder:!text-muted/60 hover:!border-maroon/30 focus:!border-maroon focus:!ring-4 focus:!ring-maroon/10`,
    formButtonPrimary: `${FIELD_H} !rounded-xl !bg-maroon !text-[15px] !font-medium !normal-case !text-white !shadow-sm !shadow-maroon/20 !transition hover:!bg-maroon-dark active:!scale-[0.99] ${FOCUS_RING}`,
    formResendCodeLink: "!text-maroon",
    otpCodeFieldInput: "!rounded-lg !border !border-line focus:!border-maroon",
    identityPreviewEditButton: "!text-maroon",
    formFieldAction: "!text-maroon hover:!text-maroon-dark",

    // "Secured by Clerk" / development badge: a quiet strip at the bottom of the same card.
    footer: "!mt-0 !rounded-none !border-t !border-line !bg-ivory/50 !bg-none !px-6 !py-3 sm:!px-7",
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
      subtitle: "Sign in to open today's register",
      subtitleCombined: "Sign in to open today's register",
    },
  },
};
