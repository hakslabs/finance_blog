/**
 * ModalPortal — render children inside document.body so `position: fixed`
 * is always relative to the viewport, never to a transformed ancestor.
 *
 * Why this exists: any ancestor with a non-`none` `transform`, `filter`,
 * `backdrop-filter`, `perspective`, or `will-change` becomes the
 * containing block for descendant fixed-positioned elements (CSS spec).
 * That used to land our modals at the bottom of the page instead of the
 * viewport center. Portaling to body sidesteps the entire problem class.
 *
 * Use as a transparent wrapper around the existing modal JSX:
 *   <ModalPortal>
 *     <div className="fixed inset-0 z-50 flex items-center justify-center ...">
 *       ...
 *     </div>
 *   </ModalPortal>
 */
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function ModalPortal({ children }: { children: ReactNode }) {
  // SSR-safe: only access document on the client.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}
