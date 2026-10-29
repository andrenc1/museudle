# MuseuDle

A daily guessing game about the history of computing, created for the **UFU Computing Museum** (Museu da Computação) as an extension project of the Federal University of Uberlândia, Brazil. *The game interface is in Portuguese.*

Every day the game picks an artifact (a person, a computer, a programming language, an operating system...) and the player has to figure out which one it is, using hints about category, year and creator.

**[▶ Play now](https://andrenc1.github.io/museudle/)**

<p align="center">
  <img src="docs/screenshot-desktop.png" alt="MuseuDle on desktop, showing three guesses and the colored hints" width="720">
</p>

## How to play

1. Type the name of an artifact, or click an item in the **Itens Disponíveis** (available items) list.
2. Each guess shows a row with four hints:

| Color | Meaning |
|---|---|
| 🟩 Green | The attribute matches the artifact of the day |
| 🟨 Yellow | Partial match: the creator or company shares a name |
| ⬜ Gray | The attribute is different |
| ⬆️ ⬇️ | The artifact of the day is newer ⬆️ or older ⬇️ than your guess |

3. The side list automatically strikes through items that can no longer be the answer, based on the hints received.
4. When you guess correctly, the **Saiba Mais** (Learn More) button shows the artifact's details and a link to the museum's digital collection or to another source about it.
5. A new artifact appears at midnight (your computer's local time).

## Features

- **52 artifacts** from the history of computing, from Ada Lovelace to cloud storage, several of them linked to the [Computing Museum's digital collection](https://tainacan.facom.ufu.br/)
- **The same challenge for every player** on the same day, with no server needed
- **Progress saved in the browser:** reloading the page doesn't erase the day's guesses
- **Elimination filter** that strikes through items incompatible with the hints
- **Responsive layout**, designed for mobile as well
- Built with **vanilla JavaScript**, no frameworks or libraries

<p align="center">
  <img src="docs/screenshot-mobile.png" alt="MuseuDle on mobile" width="260">
</p>

## How it works

**Picking the artifact of the day.** The local date (`YYYY-MM-DD`) goes through a hash function and becomes the seed of a pseudorandom number generator (Mulberry32). Since the seed is the same for everyone on the same day, everyone gets the same artifact, and it is computed entirely in the browser.

```js
const rng = getSeededRandom(getTodayString()); // e.g. "2026-10-19"
dailyItem = itens[Math.floor(rng() * itens.length)];
```

**Hints.** Each guess is compared with the artifact of the day on four attributes. The creator counts as a partial match when both share a name (names are separated by `/`, as in `Sony / Philips`).

**Elimination filter.** After each guess, the game goes through all items and strikes through those that contradict any hint already received: wrong category, year outside the possible range, or a different creator when the creator has already been matched.

**Progress.** The day's guesses are stored in the browser's `localStorage`. The next day, the old progress is discarded.

## Project structure

```
museudle/
├── index.html        # Page structure
├── css/
│   └── style.css     # Styles and responsive layout
├── js/
│   ├── itens.js      # List of game artifacts
│   └── script.js     # Game logic
└── docs/             # Images used in this README
```

Artifacts live in a `.js` file instead of a `.json` file so the game works by opening `index.html` directly from disk: browsers block loading local JSON files over `file://`.

## Running locally

No installation needed.

```bash
git clone https://github.com/andrenc1/museudle.git
cd museudle
```

Then open `index.html` in your browser.

## Adding an artifact

Add a new object to the list in `js/itens.js`:

```js
{
  "Nome": "Commodore 64",
  "Categoria": "Microcomputador",
  "Ano": 1982,
  "Criador/Empresa": "Commodore",
  "Link": "https://link-to-learn-more"
}
```

- **Categoria (category):** use a category that already exists, so the category hint works well.
- **Criador/Empresa (creator/company):** separate multiple names with ` / `, which is what enables the partial match. Use `N/A` when it doesn't apply.
- **Link:** if the item is in the museum's collection, use the Tainacan link; the button then shows **Ver no Acervo** (View in Collection).

## Next steps

- Player stats (wins and day streak)
- Button to share the day's result
- More artifacts from the museum's collection

## Credits

Developed by [André Noro Crivellenti](https://www.linkedin.com/in/andre-noro/) for the Computing Museum of the School of Computing (FACOM) at the Federal University of Uberlândia.
