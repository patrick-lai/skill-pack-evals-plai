# Tidy intro

## Requirements

Create a 12-15 second 1080p MP4 motion video introducing a fictional task app called Tidy: logo reveal, three feature beats, end card. Build it in code (e.g. Remotion). Deliver the MP4 and the full source with run instructions.

## Seams

`introFilm()` is the seam for the intro's structure: picture size, duration, and scene order. `renders/tidy-intro.mp4` is the seam for the delivered file. These are the public behaviors the task names. A non-interactive run could not confirm them in conversation; they are taken from the requirements above.

1. `introFilm()` catches an intro that is the wrong size, the wrong length, or the wrong sequence of passages. It misses pixels, motion, and the encode.
2. The MP4, measured from the file itself, catches a render that is not 1080p or not between 12 and 15 seconds. It misses whether the picture reads as Tidy.
