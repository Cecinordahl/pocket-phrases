import type { ReactNode } from "react";

type DisclaimerProps = {
  children: ReactNode;
};

export function Disclaimer({ children }: DisclaimerProps) {
  return (
    <div className="disclaimer" role="note">
      <span aria-hidden="true">⚠️</span>
      <span>{children}</span>
    </div>
  );
}
