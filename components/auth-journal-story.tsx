import Image from "next/image";
import type { CSSProperties } from "react";
import { Label } from "@/components/journal/label";
import { RobinNote } from "@/components/journal/robin-note";
import { GameIcon } from "@/components/journal/game-icon";
import { InkArrow } from "@/components/journal/ink";
import { authCopy } from "@/lib/copy/auth";
import styles from "./auth-journal.module.css";

const copy = authCopy.signUp;

/** The left page of the auth journal (Sign-up and Sign-in): heading,
    Robin's note, a small photo album of the places and the core loop
    (Study → Earn → Grow). Pass it to AuthLayout's `left`. The page's own
    h1 lives in the right page on Sign-in, so there it is `headingAs="p"`
    (same look). */
export function AuthJournalStory({ headingAs: Heading = "h1" }: { headingAs?: "h1" | "p" }) {
  return (
    <div className={styles.story}>
      <Heading className={styles.heading}>{copy.title}</Heading>
      <RobinNote className={styles.note}>{copy.note}</RobinNote>
      <PlaceAlbum />
      <LoopRow />
    </div>
  );
}

/* The places of the journey as small photos stuck into the album
   (robin-design §4, album exception: small, alternating tilts up to ±2°,
   no controls). Level order from §9. Kept small on purpose — the worlds'
   painting styles differ a little; together they fill the page. The
   labels carry the meaning, the photos are alt="". Narrow: only
   garden-1, Beach and Mountains (data-narrow). */
type AlbumPhoto = { src: string; tilt: number; tape: string; narrow: boolean };

const TAPE = ["/ui/tape-long-1.webp", "/ui/tape-long-2.webp", "/ui/tape-long-3.webp"] as const;

const ALBUM: { label: string; level?: number; photos: AlbumPhoto[] }[] = [
  {
    label: copy.places.garden,
    photos: [
      { src: "/ui/auth/garden-1.webp", tilt: 1.5, tape: TAPE[0], narrow: true },
      { src: "/ui/auth/garden-2.webp", tilt: -1, tape: TAPE[1], narrow: false },
    ],
  },
  { label: copy.places.beach, level: 10, photos: [{ src: "/ui/auth/beach.webp", tilt: 2, tape: TAPE[2], narrow: true }] },
  { label: copy.places.mountains, level: 20, photos: [{ src: "/ui/auth/mountains.webp", tilt: -1.5, tape: TAPE[0], narrow: true }] },
  { label: copy.places.desert, level: 30, photos: [{ src: "/ui/auth/desert.webp", tilt: 1, tape: TAPE[1], narrow: false }] },
  {
    label: copy.places.japaneseGarden,
    level: 60,
    photos: [{ src: "/ui/auth/japanese-garden.webp", tilt: -2, tape: TAPE[2], narrow: false }],
  },
];

function PlaceAlbum() {
  return (
    <ul className={styles.album} aria-label={copy.places.label}>
      {ALBUM.map((place) => (
        <li
          key={place.label}
          className={styles.place}
          data-pair={place.photos.length > 1 || undefined}
          data-narrow={place.photos.some((photo) => photo.narrow) || undefined}
        >
          <span className={styles.photos}>
            {place.photos.map((photo) => (
              <span
                key={photo.src}
                className={styles.photo}
                data-narrow={photo.narrow || undefined}
                style={{ "--tilt": `${photo.tilt}deg` } as CSSProperties}
              >
                {/* The window is hatched pencil underneath: if a photo is
                    missing, alt="" shows nothing and the hatching stays. */}
                <span className={styles.window}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- small, pre-sized WebP */}
                  <img src={photo.src} alt="" width={256} height={192} draggable={false} />
                </span>
                <span className={styles.tape} style={{ backgroundImage: `url("${photo.tape}")` }} />
              </span>
            ))}
          </span>
          {/* Wide: a framed tag. Narrow: the same text without the frame
              (three framed tags don't fit side by side there). Only one
              is ever displayed, so screen readers hear it once. */}
          <Label className={`${styles.placeLabel} ${styles.labelWide}`}>
            <PlaceText label={place.label} level={place.level} />
          </Label>
          <Label variant="inline" className={`${styles.placeLabel} ${styles.labelNarrow}`}>
            <PlaceText label={place.label} level={place.level} />
          </Label>
        </li>
      ))}
    </ul>
  );
}

function PlaceText({ label, level }: { label: string; level?: number }) {
  return (
    <>
      <span className={styles.placeName}>{label}</span>
      {level !== undefined && (
        <span className={styles.placeLevel}>{copy.places.level(level)}</span>
      )}
    </>
  );
}

/** The core loop in three steps with drawn ink arrows between them:
    Study (the Studyroom's pocket watch) → Earn (XP seed and coin) → Grow
    (the rose in full bloom). The words carry it; icons and arrows are
    decorative. */
function LoopRow() {
  return (
    <ol className={styles.loop} aria-label={copy.loop.label}>
      <li className={styles.step}>
        <span className={styles.stepIcons}>
          <GameIcon name="studyroom" size={48} className={styles.iconLarge} />
        </span>
        <span className={styles.stepWord}>{copy.loop.study}</span>
      </li>
      <li className={styles.arrow} aria-hidden="true">
        <InkArrow className={styles.inkArrow} />
      </li>
      <li className={styles.step}>
        <span className={styles.stepIcons}>
          <GameIcon name="xp" size={24} className={styles.iconSmall} />
          <GameIcon name="coin" size={24} className={styles.iconSmall} />
        </span>
        <span className={styles.stepWord}>{copy.loop.earn}</span>
      </li>
      <li className={styles.arrow} aria-hidden="true">
        <InkArrow className={styles.inkArrow} />
      </li>
      <li className={styles.step}>
        <span className={styles.stepIcons}>
          <Image
            className={styles.rose}
            src="/garden/items/rose-3.png"
            width={398}
            height={400}
            alt=""
            sizes="48px"
            draggable={false}
          />
        </span>
        <span className={styles.stepWord}>{copy.loop.grow}</span>
      </li>
    </ol>
  );
}

