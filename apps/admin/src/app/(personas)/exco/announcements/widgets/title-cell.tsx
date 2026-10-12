/**
 * Title cell — wraps to a second line if long, then truncates with an
 * ellipsis on the second line. Uses the standard `-webkit-line-clamp`
 * CSS to cap at two visible lines while preserving the underlying text
 * for the tooltip.
 */
export function TitleCell({ title }: { readonly title: string }) {
  return (
    <span
      title={title}
      className="line-clamp-2 whitespace-normal break-words text-sm leading-tight text-foreground"
    >
      {title}
    </span>
  );
}
