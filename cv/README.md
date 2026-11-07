# CV

One-page CV set in Computer Modern (CMU Serif, OFL, in `fonts/`). Edit `cv.html`, then print it from `cv/`:

```sh
brave-browser --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf=Daniel-Fenoll-CV.pdf "file://$PWD/cv.html"
pdfinfo Daniel-Fenoll-CV.pdf | grep Pages   # must stay at 1
```

The site links the copy in `public/`. After printing, update it:

```sh
cp Daniel-Fenoll-CV.pdf ../public/Daniel-Fenoll-CV.pdf
```
