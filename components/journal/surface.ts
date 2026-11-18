/** What a control stands on (robin-design §4). "paper" is the default and
    sets nothing; "slate" (chalk) and "wood" (burnt-in) set data-surface,
    which redefines the ink tokens for the control (app/bloomly-theme.css).
    The focus frame stays ink over a paper halo on all of them. */
export type Surface = "paper" | "slate" | "wood";

/** data-surface value for a root element: nothing on paper. */
export const surfaceAttr = (surface: Surface) => (surface === "paper" ? undefined : surface);
