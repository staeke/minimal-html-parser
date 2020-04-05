A minimalistic html parser supporting a subset of standard DOM APIs , just because...

Includes TypeScript typings. 1.3Kb minified/mangled/gzipped without dependencies. (`he` is 30Kb though)
   
### Usage

```
import {parseHtml} from 'minimal-html-parser'

const dom = parseHtml('<strong>&quot;Hello\n\nthere&quot;</strong>')

// Prints: strong "Hello there"
console.log(dom[0].tagName, dom[0].innerText)
```

### Dependencies
   
   - **`he`** https://www.npmjs.com/package/he - Well known author, very popular
   
### API
Just supports a limited version of the DOM

Functions:

- `parseHtml(str:string):Node[]`

Classes behave like standard, see MDN docss:

- `Node`
- `Element`
    - `tagName`
    - `atttributes`
    - `childNodes`
- `CharacterData`
    - `textContent`
    - `innerText`
- `Text` (inherits `CharacterData`)
- `Comment` (inherits `CharacterData`)
- `DocType` (inherits `CharacterData`)

