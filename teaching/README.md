# Teaching: Day 3 Deck and Speaker Notes

- `Day3_Build_with_Hashi.pptx`: 13 editable slides with presenter notes.
- `Day3_Build_with_Hashi.pdf`: the same deck rendered with the real fonts.
- `day3-speaker-notes.md`: before-class checks, run of show, and the notes for every slide.

## Rebuild

```sh
pnpm slides                                           # pptx + speaker notes

PYTHON=/path/to/python-with-pymupdf pnpm slides:pdf   # macOS only: Quick Look + Chrome
```

`pnpm slides:pdf` asks Quick Look for an HTML preview of the pptx, rasterises the shapes Quick Look stores as PDFs (`render-quicklook.py`, needs PyMuPDF), injects the fonts from `fonts/`, and prints the PDF in Chrome. Set `SHOTS=<dir>` to keep one PNG per slide for checking.

## The style kit

`deck-kit.cjs` is copied unchanged from Day 2: the Account Layer Week look (the Standing Order deck), DM Sans and JetBrains Mono, dark `07080F`, paper `F4F5F8`, blue `2338FF`, periwinkle `A3B2FF`, mono `[ EYEBROW ]` labels. Fonts are under the SIL Open Font License; the licences are in `fonts/`.

## Day 3 specifics

The deck follows the class rhythm: what Hashi is, why it exists and the problem it solves, its impact on Sui, what changed since mainnet (read from Hashi's own events), what it means for developers, how to position yourself, the Ferry demo dApp and its code, a contract with its own Bitcoin address (`move/jar`), and a hands-on demo the room can try without BTC. Sources are listed at the top of the speaker notes.
