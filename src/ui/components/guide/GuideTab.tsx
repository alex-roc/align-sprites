// In-site guide (en/es). Implemented by the guide task; the shell only mounts it.
// `section` is the anchor from the hash route (#/guide/<section>), or undefined for the top.
export function GuideTab({ section }: { section?: string }) {
  void section;
  return <div className="guide" />;
}
