# Third-party notices

## Mappa muscolare (`src/components/body/figures.ts`)

I path SVG del corpo (uomo, fronte e retro) provengono da **muscle-graph**, a sua volta
derivato da **react-muscle-highlighter**. I path originali sono mantenuti nel loro
viewBox, senza specchiature; i gruppi sono stati uniti e, dove il disegno non li
distingue (pettorale alto / pettorale, deltoide, trapezio alto / schiena media), divisi
con tagli curvi aggiunti da questo progetto. Nessuno dei due pacchetti è una dipendenza:
sono stati usati solo i dati del disegno.

### muscle-graph

<https://github.com/lilbuda/muscle-graph> (npm: `muscle-graph` 0.2.0)

MIT License

Copyright (c) 2026 lilbuda

Permission is hereby granted, free of charge, to any person obtaining a copy of this
software and associated documentation files (the "Software"), to deal in the Software
without restriction, including without limitation the rights to use, copy, modify, merge,
publish, distribute, sublicense, and/or sell copies of the Software, and to permit
persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or
substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE
FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
DEALINGS IN THE SOFTWARE.

### react-muscle-highlighter

<https://github.com/soroojshehryar/react-muscle-highlighter> (licenza MIT; autore
indicato dal registro npm: soroojshehryar)

Il file di notice di muscle-graph riporta questi path come "adapted from
react-muscle-highlighter" (commit `981291ca88a8d27205adc7532ebb2416b7e4609f`) sotto
licenza MIT, il cui testo è lo stesso riportato sopra, con il copyright dei rispettivi
autori. Il testo completo con la riga di copyright originale è nel repository indicato.
