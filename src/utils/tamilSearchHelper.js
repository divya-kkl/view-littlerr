// Tamil <-> English <-> Tanglish little_rr Search Helper

// 1. Tamil Script to Latin (English Phonetics) Transliteration Table
const TAMIL_VOWELS = {
  '\u0B85': 'a',
  '\u0B86': 'aa',
  '\u0B87': 'i',
  '\u0B88': 'ee',
  '\u0B89': 'u',
  '\u0B8A': 'oo',
  '\u0B8E': 'e',
  '\u0B8F': 'ae',
  '\u0B90': 'ai',
  '\u0B92': 'o',
  '\u0B93': 'oo',
  '\u0B94': 'au',
  '\u0B83': 'h'
};

const TAMIL_CONSONANTS = {
  '\u0B95': 'k',
  '\u0B99': 'ng',
  '\u0B9A': 's',
  '\u0B9E': 'ny',
  '\u0B9F': 't',
  '\u0BA3': 'n',
  '\u0BA4': 'th',
  '\u0BA8': 'n',
  '\u0BA9': 'n',
  '\u0BAA': 'p',
  '\u0BAE': 'm',
  '\u0BAF': 'y',
  '\u0BB0': 'r',
  '\u0BB1': 'r',
  '\u0BB2': 'l',
  '\u0BB3': 'l',
  '\u0BB4': 'zh',
  '\u0BB5': 'v',
  '\u0B9C': 'j',
  '\u0BB7': 'sh',
  '\u0BB8': 's',
  '\u0BB9': 'h'
};

const TAMIL_VOWEL_SIGNS = {
  '\u0BCD': '',      // Pulli (virama) - suppresses inherent 'a'
  '\u0BBE': 'aa',
  '\u0BBF': 'i',
  '\u0BC0': 'ee',
  '\u0BC1': 'u',
  '\u0BC2': 'oo',
  '\u0BC6': 'e',
  '\u0BC7': 'ae',
  '\u0BC8': 'ai',
  '\u0BCA': 'o',
  '\u0BCB': 'oo',
  '\u0BCC': 'au'
};

export const isTamilText = (text) => {
  return /[\u0B80-\u0BFF]/.test(text || '');
};

/**
 * Transliterates Tamil script into Latin English phonetics
 * e.g., "விநாயகர்" -> "vinaayagar" / "vinayagar"
 * e.g., "மோதிரம்" -> "mothiram"
 */
export const tamilToLatin = (text) => {
  if (!text) return '';
  const str = String(text);
  let result = '';
  let i = 0;

  while (i < str.length) {
    const char = str[i];
    const nextChar = str[i + 1];

    if (char === 'ஸ' && nextChar === '்' && str[i + 2] === 'ர' && str[i + 3] === 'ீ') {
      result += 'sri';
      i += 4;
      continue;
    }

    if (TAMIL_VOWELS[char]) {
      result += TAMIL_VOWELS[char];
      i++;
    } else if (TAMIL_CONSONANTS[char]) {
      const baseConsonant = TAMIL_CONSONANTS[char];

      if (nextChar && TAMIL_VOWEL_SIGNS[nextChar] !== undefined) {
        result += baseConsonant + TAMIL_VOWEL_SIGNS[nextChar];
        i += 2;
      } else {
        // Inherent 'a' vowel
        result += baseConsonant + 'a';
        i++;
      }
    } else {
      result += char;
      i++;
    }
  }

  return result.toLowerCase();
};

/**
 * Normalizes phonetic string for tolerant comparison:
 * e.g. simplifies double vowels (aa->a, ee->i, oo->u) and equivalent consonants (k<->g, th<->d)
 */
export const normalizePhonetic = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/aa/g, 'a')
    .replace(/ee/g, 'i')
    .replace(/ii/g, 'i')
    .replace(/oo/g, 'u')
    .replace(/uu/g, 'u')
    .replace(/ae/g, 'e')
    .replace(/dh/g, 'th')
    .replace(/ck/g, 'k')
    .replace(/gh/g, 'g')
    .replace(/zh/g, 'l')
    .replace(/sh/g, 's')
    .replace(/w/g, 'v')
    .replace(/([a-z])\1+/g, '$1') // collapse repeated letters (e.g. kka -> ka)
    .trim();
};

// 2. Comprehensive Bidirectional Jewelry Concept Dictionary
// Maps concepts across English, Tamil script, and Tanglish (romanized phonetic Tamil)
export const little_rr_CONCEPTS = [
  {
    id: 'ring',
    english: ['ring', 'rings', 'finger ring', 'band'],
    tamil: ['மோதிரம்', 'மோதுரம்', 'உங்கரம்', 'அங்குலி'],
    tanglish: ['mothiram', 'modhiram', 'mothram', 'modhram', 'ring', 'ungaram']
  },
  {
    id: 'bangle',
    english: ['bangle', 'bangles', 'bracelet', 'bracelets', 'kada', 'kadas'],
    tamil: ['வளையல்', 'வளையல்கள்', 'காப்பு', 'பிரேஸ்லெட்', 'கங்கணம்'],
    tanglish: ['valayal', 'valaiyal', 'valaikal', 'kaapu', 'kaappu', 'bracelet', 'bangle', 'kada', 'kanganam']
  },
  {
    id: 'necklace',
    english: ['necklace', 'necklaces', 'haram', 'haaram', 'choker', 'chokers', 'collar'],
    tamil: ['மாலை', 'ஆரம்', 'ஹாரம்', 'நெக்லஸ்', 'அட்டிகை', 'சோக்கர்', 'கழுத்தணி', 'சரடு'],
    tanglish: ['maalai', 'malai', 'aaram', 'haram', 'haaram', 'necklace', 'attigai', 'athigai', 'choker', 'saradu', 'kazhuthani']
  },
  {
    id: 'earring',
    english: ['earring', 'earrings', 'stud', 'studs', 'jhumka', 'jhumkas', 'ear ring', 'ear rings', 'hoop', 'drop'],
    tamil: ['தோடு', 'ஜிமிக்கி', 'கம்மல்', 'காதணி', 'லோலாக்', 'குண்டலம்'],
    tanglish: ['thodu', 'jimiki', 'jhimki', 'kammal', 'kaadhani', 'kaadani', 'earring', 'jhumka', 'lolak', 'kundalam', 'stud']
  },
  {
    id: 'chain',
    english: ['chain', 'chains', 'rope chain', 'box chain', 'gold chain'],
    tamil: ['சங்கிலி', 'செயின்', 'கொடி'],
    tanglish: ['sangili', 'changili', 'chain', 'kodi']
  },
  {
    id: 'anklet',
    english: ['anklet', 'anklets', 'toe ring', 'toe rings', 'foot chain'],
    tamil: ['கொலுசு', 'கொலுசுகள்', 'மெட்டி', 'மிஞ்சி', 'தண்டை', 'சிலம்பு'],
    tanglish: ['kolusu', 'golusu', 'metti', 'minji', 'thandai', 'silambu', 'anklet']
  },
  {
    id: 'pendant',
    english: ['pendant', 'pendants', 'locket', 'lockets', 'dollar'],
    tamil: ['பதக்கம்', 'லாக்கெட்', 'டாலர்', 'பெண்டன்ட்'],
    tanglish: ['padhakkam', 'padakkam', 'locket', 'dollar', 'pendant']
  },
  {
    id: 'coin',
    english: ['coin', 'coins', 'gold coin', 'silver coin', 'bar'],
    tamil: ['காசு', 'நாணயம்', 'தங்க காசு', 'வெள்ளி காசு', 'பார்'],
    tanglish: ['kaasu', 'kasu', 'nanayam', 'naanayam', 'coin', 'bar']
  },
  {
    id: 'nose_ring',
    english: ['nose pin', 'nose ring', 'nath', 'mookkuthi'],
    tamil: ['மூக்குத்தி', 'புல்லாக்கு', 'நத்து'],
    tanglish: ['mookuthi', 'mookkuthi', 'pullaaku', 'bullakku', 'nathu', 'nosepin']
  },
  {
    id: 'waist_belt',
    english: ['waist belt', 'hip belt', 'oddiyanam', 'vaddanam', 'kamabandh'],
    tamil: ['ஒட்டியாணம்', 'இடுப்பு பட்டை'],
    tanglish: ['ottiyanam', 'oddiyanam', 'vaddanam', 'waist belt', 'hip chain']
  },
  {
    id: 'armlet',
    english: ['armlet', 'vanki', 'bajuband'],
    tamil: ['வங்கி', 'தோள் வளை', 'பாஜுபந்த்'],
    tanglish: ['vanki', 'vangki', 'armlet', 'bajuband']
  },
  {
    id: 'mangalsutra',
    english: ['thali', 'thaali', 'mangalsutra', 'mangal sutra', 'wedding chain'],
    tamil: ['தாலி', 'மாங்கல்யம்', 'மங்கலநாண்', 'திருமாங்கல்யம்'],
    tanglish: ['thali', 'thaali', 'mangalyam', 'mangalsutra', 'thirumaangalyam']
  },
  {
    id: 'maang_tikka',
    english: ['maang tikka', 'tikka', 'chutti', 'hair ornament'],
    tamil: ['நெத்திச்சுட்டி', 'சுட்டி', 'சூடாமணி', 'ஜடை பில்லை'],
    tanglish: ['nethi chutti', 'nethichutti', 'chutti', 'tikka', 'maang tikka', 'jadai']
  },
  // Deities & Motifs
  {
    id: 'vinayaka',
    english: ['vinayaka', 'vinayakar', 'ganesh', 'ganesha', 'ganapathi', 'pillayar', 'vigneshwara'],
    tamil: ['விநாயகர்', 'விநாயக', 'பிள்ளையார்', 'கணபதி', 'கணேசா', 'விக்னேஸ்வரர்'],
    tanglish: ['vinayaka', 'vinayakar', 'vinayagar', 'ganesh', 'ganesha', 'ganapathi', 'pillayar', 'pillaiyar']
  },
  {
    id: 'lakshmi',
    english: ['lakshmi', 'laxmi', 'mahalakshmi'],
    tamil: ['லட்சுமி', 'இலக்குமி', 'மகாலட்சுமி'],
    tanglish: ['lakshmi', 'laxmi', 'mahalakshmi', 'ilakkumi']
  },
  {
    id: 'murugan',
    english: ['murugan', 'vel', 'kartikeya', 'kandan', 'saravanan'],
    tamil: ['முருகன்', 'வேல்', 'கந்தன்', 'சரவணன்', 'சுப்பிரமணியர்'],
    tanglish: ['murugan', 'vel', 'kandan', 'saravanan']
  },
  {
    id: 'perumal',
    english: ['perumal', 'balaji', 'vishnu', 'venkateswara', 'tirupati'],
    tamil: ['பெருமாள்', 'பாலாஜி', 'விஷ்ணு', 'வெங்கடேஸ்வரா', 'திருப்பதி'],
    tanglish: ['perumal', 'balaji', 'vishnu', 'venkateswara', 'thirupathi', 'tirupati']
  },
  {
    id: 'shiva',
    english: ['shiva', 'sivan', 'lingam', 'rudraksha'],
    tamil: ['சிவன்', 'சிவபெருமான்', 'லிங்கம்', 'ருத்ராட்சம்'],
    tanglish: ['sivan', 'shiva', 'lingam', 'rudraksham']
  },
  {
    id: 'amman',
    english: ['amman', 'durga', 'kali', 'mariamman'],
    tamil: ['அம்மன்', 'துர்கை', 'காளி', 'மாரியம்மன்'],
    tanglish: ['amman', 'durga', 'kali', 'mariamman']
  },
  {
    id: 'peacock',
    english: ['peacock', 'mayil'],
    tamil: ['மயில்', 'மயில் டிசைன்'],
    tanglish: ['peacock', 'mayil']
  },
  {
    id: 'floral',
    english: ['floral', 'flower', 'rose', 'lotus'],
    tamil: ['பூ', 'மலர்', 'ரோஜா', 'தாமரை'],
    tanglish: ['floral', 'flower', 'malar', 'poo', 'roja', 'thamarai']
  },
  // Metal & Purity
  {
    id: 'gold',
    english: ['gold', 'golden', '22k', '24k', '18k', '916', 'hallmark'],
    tamil: ['தங்கம்', 'தங்க', 'பொன்', 'ஹால்மார்க்'],
    tanglish: ['thangam', 'thanga', 'gold', 'pon', 'hallmark', '916']
  },
  {
    id: 'silver',
    english: ['silver', '925'],
    tamil: ['வெள்ளி', 'சில்வர்'],
    tanglish: ['velli', 'silver', '925']
  },
  {
    id: 'diamond',
    english: ['diamond', 'diamonds'],
    tamil: ['வைரம்', 'டைமண்ட்'],
    tanglish: ['vairam', 'diamond']
  },
  {
    id: 'antique',
    english: ['antique', 'temple', 'traditional', 'heritage'],
    tamil: ['ஆன்டிக்', 'கோவில்', 'கோயில்', 'பாரம்பரிய'],
    tanglish: ['antique', 'temple', 'kovil', 'koyil', 'parambariya']
  },
  {
    id: 'bridal',
    english: ['bridal', 'wedding', 'marriage'],
    tamil: ['மணப்பெண்', 'கல்யாணம்', 'திருமணம்', 'முகூர்த்தம்'],
    tanglish: ['bridal', 'wedding', 'kalyanam', 'thirumanam', 'muhurtham']
  },
  {
    id: 'kids',
    english: ['kids', 'baby', 'children'],
    tamil: ['குழந்தை', 'குழந்தைகள்', 'பாப்பா'],
    tanglish: ['kids', 'baby', 'kuzhandhai', 'kulandai', 'papa', 'paappa']
  },
  {
    id: 'mens',
    english: ['mens', 'men', 'gents'],
    tamil: ['ஆண்கள்', 'ஆண்'],
    tanglish: ['men', 'mens', 'gents', 'aangal', 'aan']
  },
  {
    id: 'womens',
    english: ['womens', 'women', 'ladies'],
    tamil: ['பெண்கள்', 'பெண்'],
    tanglish: ['women', 'womens', 'ladies', 'pengal', 'pen']
  }
];

/**
 * Finds all concept equivalents (English, Tamil, Tanglish) for a word or phrase
 */
export const expandTermWithConcepts = (term) => {
  const cleanTerm = (term || '').trim().toLowerCase();
  if (!cleanTerm) return [];

  const expansions = new Set([cleanTerm]);

  // English plurals (e.g. rings -> ring, bangles -> bangle)
  if (cleanTerm.endsWith('s') && cleanTerm.length > 3) {
    expansions.add(cleanTerm.slice(0, -1));
  }
  if (cleanTerm.endsWith('es') && cleanTerm.length > 4) {
    expansions.add(cleanTerm.slice(0, -2));
  }

  // Tamil plurals (e.g. மோதிரங்கள் -> மோதிரம், வளையல்கள் -> வளையல்)
  if (cleanTerm.endsWith('கள்')) {
    const base = cleanTerm.slice(0, -2);
    expansions.add(base);
    expansions.add(base + 'ம்');
  }
  if (cleanTerm.endsWith('gal') && cleanTerm.length > 4) {
    const base = cleanTerm.slice(0, -3);
    expansions.add(base);
    expansions.add(base + 'm');
  }
  if (cleanTerm.endsWith('kal') && cleanTerm.length > 4) {
    const base = cleanTerm.slice(0, -3);
    expansions.add(base);
    expansions.add(base + 'm');
  }

  // If term has Tamil characters, also add transliterated form
  if (isTamilText(cleanTerm)) {
    const latinForm = tamilToLatin(cleanTerm);
    if (latinForm) {
      expansions.add(latinForm);
      expansions.add(normalizePhonetic(latinForm));
    }
  }

  const termsToCheck = Array.from(expansions);

  for (const t of termsToCheck) {
    const normT = normalizePhonetic(t);
    for (const concept of little_rr_CONCEPTS) {
      const allWords = [...concept.english, ...concept.tamil, ...concept.tanglish];
      const isMatch = allWords.some((w) => {
        const cleanW = w.toLowerCase().trim();
        if (cleanW === t) return true;
        if (t.length >= 3 && cleanW.includes(t)) return true;
        if (cleanW.length >= 3 && t.includes(cleanW)) return true;
        if (normT && normalizePhonetic(cleanW) === normT) return true;
        return false;
      });

      if (isMatch) {
        concept.english.forEach(w => expansions.add(w.toLowerCase()));
        concept.tamil.forEach(w => expansions.add(w.toLowerCase()));
        concept.tanglish.forEach(w => expansions.add(w.toLowerCase()));
      }
    }
  }

  return Array.from(expansions);
};

/**
 * Checks whether a single product matches a search query
 * Supports:
 * 1) Direct English / Tamil substring match
 * 2) Tamil search query matching English product (e.g. "மோதிரம்" -> matches "ring")
 * 3) English / Tanglish search query matching Tamil product (e.g. "ring" or "mothiram" -> matches "மோதிரம்")
 * 4) Phonetic transliteration match (e.g. "vinayagar" -> matches "vinayaka", "விநாயகர்" -> matches "vinayaka")
 */
export const doesProductMatchQuery = (product, searchQuery) => {
  if (!product || !searchQuery) return false;

  const rawQuery = String(searchQuery).trim().toLowerCase();
  if (!rawQuery) return false;

  // Extract all searchable fields from product
  const productName = String(product.name || '').toLowerCase();
  const productCode = String(product.productCode || '').toLowerCase();
  const categoryName = String(product.categoryName || '').toLowerCase();
  const subcategoryName = String(product.subcategoryName || '').toLowerCase();
  const tagName = String(product.tagName || '').toLowerCase();
  const badge = String(product.badge || '').toLowerCase();
  const description = String(product.description || '').toLowerCase();

  // 1. Direct match on code or name
  if (productCode && productCode.includes(rawQuery)) return true;
  if (productName && productName.includes(rawQuery)) return true;

  // Combined product text
  const combinedText = `${productName} ${productCode} ${categoryName} ${subcategoryName} ${tagName} ${badge} ${description}`;

  // If combined text directly includes the query
  if (combinedText.includes(rawQuery)) return true;

  // 2. Transliterate product text if it contains Tamil
  let transliteratedProductText = '';
  if (isTamilText(combinedText)) {
    transliteratedProductText = tamilToLatin(combinedText);
  }
  const normProductText = normalizePhonetic(`${combinedText} ${transliteratedProductText}`);

  // 3. Break search query into individual words/tokens
  const tokens = rawQuery.split(/\s+/).filter(Boolean);

  // Check if every token in the query can find a match in the product
  const allTokensMatch = tokens.every((token) => {
    // 3a. Direct check
    if (combinedText.includes(token)) return true;
    if (transliteratedProductText && transliteratedProductText.includes(token)) return true;

    // 3b. Phonetic match
    const normToken = normalizePhonetic(token);
    if (normToken.length >= 3 && normProductText.includes(normToken)) return true;

    // 3c. If token is in Tamil, transliterate it and check
    if (isTamilText(token)) {
      const latinToken = tamilToLatin(token);
      if (latinToken && combinedText.includes(latinToken)) return true;
      const normLatin = normalizePhonetic(latinToken);
      if (normLatin && normProductText.includes(normLatin)) return true;
      // Also check partial root stem (e.g. vinayag in vinayaka)
      if (normLatin.length >= 4) {
        const root = normLatin.slice(0, 4);
        if (normProductText.includes(root)) return true;
      }
    }

    // 3d. Check concept dictionary expansion
    const expansions = expandTermWithConcepts(token);
    const hasConceptMatch = expansions.some((exp) => {
      if (combinedText.includes(exp)) return true;
      if (transliteratedProductText && transliteratedProductText.includes(exp)) return true;
      const normExp = normalizePhonetic(exp);
      if (normExp.length >= 3 && normProductText.includes(normExp)) return true;
      return false;
    });

    if (hasConceptMatch) return true;

    // 3e. Root prefix matching (e.g., "vinayaka" vs "vinayagar")
    if (token.length >= 5) {
      const rootPrefix = token.slice(0, 5);
      if (combinedText.includes(rootPrefix)) return true;
      if (normProductText.includes(normalizePhonetic(rootPrefix))) return true;
    }

    return false;
  });

  return allTokensMatch;
};

/**
 * Filters a list of products with bilingual relevance ranking
 */
export const filterProductsBilingual = (products, searchQuery) => {
  if (!products || !Array.isArray(products)) return [];
  if (!searchQuery || !searchQuery.trim()) return products;

  const cleanQ = searchQuery.trim().toLowerCase();

  const matched = [];

  for (const item of products) {
    if (!item) continue;
    if (doesProductMatchQuery(item, cleanQ)) {
      let score = 0;
      const name = String(item.name || '').toLowerCase();
      const code = String(item.productCode || '').toLowerCase();

      // Priority ranking
      if (code === cleanQ) score += 100;
      else if (name === cleanQ) score += 90;
      else if (name.startsWith(cleanQ)) score += 80;
      else if (name.includes(cleanQ)) score += 60;
      else if (code.includes(cleanQ)) score += 50;
      else score += 10;

      matched.push({ item, score });
    }
  }

  // Sort higher score first
  matched.sort((a, b) => b.score - a.score);

  return matched.map(m => m.item);
};
