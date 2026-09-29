// A template re-mounts on every navigation, so each page gently rises into place.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-fade-up">{children}</div>;
}
