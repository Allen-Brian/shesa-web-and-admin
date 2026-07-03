// Static image imports. Next.js supplies richer StaticImageData when it
// processes the module (`{ src, width, height, blurDataURL? }`), but a
// bare `string` matches too since Next accepts either shape at the call
// site. Kept minimal so tsc --noEmit in this package (which is not run
// through the Next compiler) still resolves the type.
declare module '*.png' {
  const value: string | { src: string; width: number; height: number };
  export default value;
}

declare module '*.jpg' {
  const value: string | { src: string; width: number; height: number };
  export default value;
}

declare module '*.svg' {
  const value: string | { src: string; width: number; height: number };
  export default value;
}
