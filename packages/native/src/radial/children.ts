import { Children, Fragment, isValidElement, type ReactNode } from "react";

function flattenFragments(children: ReactNode): ReactNode[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement(child) || child.type !== Fragment) {
      return [child];
    }
    return flattenFragments((child.props as { children?: ReactNode }).children);
  });
}

export function partitionChartChildren(
  children: ReactNode,
  isOverlay: (child: ReactNode) => boolean
): { chartChildren: ReactNode[]; overlayChildren: ReactNode[] } {
  const chartChildren: ReactNode[] = [];
  const overlayChildren: ReactNode[] = [];
  for (const child of flattenFragments(children)) {
    (isOverlay(child) ? overlayChildren : chartChildren).push(child);
  }
  return { chartChildren, overlayChildren };
}
