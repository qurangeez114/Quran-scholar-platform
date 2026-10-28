# Tension map: Confirmation vs Alteration Claim (PROPOSED, not applied)

This report is descriptive. It sets out verses that speak of confirming earlier scripture next to verses that speak of distortion, concealment or misuse of scripture, linked when both concern the same specific scripture. It does not argue for or against any reading.

## Method
- Source themes are read from `thematic_cross_references_v2`. Confirmation of Previous Scripture has 33 verses. Quran Torah Gospel: Scripture Alteration and Concealment has 26 verses. 41:45 is in both themes.
- English and Arabic text was fetched from `ayas` (read-only).
- Each verse was classified as Torah, Gospel, Zabur, generic Book, or none. **explicit** means the verse names the scripture (e.g. Torah, Gospel, or the Scripture of Moses). **contextual** means it is inferred only from the verse text or its immediate address, e.g. 'Children of Israel', 'among the Jews', or an adjacent verse naming the scripture. The basis for each one is in the CSV.
- No verse in either theme names the Zabur. No alteration-theme verse names or addresses the Gospel specifically, so **all inserted pairs are Torah pairs**.
- Pairs are confirmation verse × alteration verse, linked only when they share a specific scripture. Each pair is inserted in both directions. A pair is 'explicit' only when both verses are explicit. There are no self-links (41:45).
- Pairs where both verses are only 'generic Book' form a secondary tier. They are listed below and are **not inserted**.

## Counts
| Scripture | pairs | rows (both directions) |
|---|---|---|
| Torah (explicit×explicit) | 23 | 46 |
| Torah (at least one contextual) | 223 | 446 |
| Gospel | 0 | 0 |
| Zabur | 0 | 0 |
| **Total** | **246** | **492** |

Theme: `Tension: Confirmation vs Alteration Claim`, category `tension`. Each reason is `Tension: confirmation vs alteration claim (Torah; explicit|contextual)`.

## Classification table
| verse | theme | Torah | Gospel | Zabur | generic | basis |
|---|---|---|---|---|---|---|
| 2:4 | Confirmation |  |  |  | explicit | scripture named or addressed in verse text |
| 2:41 | Confirmation | contextual |  |  |  | addressed to Children of Israel (2:40) |
| 2:87 | Confirmation | explicit |  |  |  | scripture named or addressed in verse text |
| 2:89 | Confirmation | contextual |  |  |  | "that which was with them" — Children of Israel passage |
| 2:91 | Confirmation | contextual |  |  |  | Children of Israel passage (killing prophets) |
| 2:136 | Confirmation | contextual | contextual |  |  | "what was given to Moses and Jesus" |
| 2:137 | Confirmation |  |  |  | contextual | continues 2:136 |
| 3:3 | Confirmation | explicit | explicit |  |  | scripture named or addressed in verse text |
| 3:4 | Confirmation | contextual | contextual |  |  | continues 3:3 (Torah and Gospel) |
| 3:50 | Confirmation | explicit |  |  |  | scripture named or addressed in verse text |
| 3:62 | Confirmation |  |  |  |  | no scripture named (narration of Jesus) |
| 3:67 | Confirmation |  |  |  |  | about Abraham; no scripture |
| 3:84 | Confirmation | contextual | contextual |  |  | "what was given to Moses and Jesus" |
| 3:199 | Confirmation |  |  |  | explicit | scripture named or addressed in verse text |
| 4:47 | Confirmation | contextual |  |  | explicit | "you who were given the Scripture"; sabbath-breakers reference |
| 5:46 | Confirmation | explicit | explicit |  |  | scripture named or addressed in verse text |
| 5:47 | Confirmation |  | explicit |  |  | scripture named or addressed in verse text |
| 5:48 | Confirmation | contextual | contextual |  | explicit | follows 5:44-47 on Torah and Gospel |
| 5:68 | Confirmation | explicit | explicit |  |  | scripture named or addressed in verse text |
| 7:52 | Confirmation |  |  |  |  | refers to the Book brought to them (the Quran) |
| 10:94 | Confirmation |  |  |  | explicit | scripture named or addressed in verse text |
| 13:36 | Confirmation |  |  |  | explicit | scripture named or addressed in verse text |
| 17:2 | Confirmation | explicit |  |  |  | scripture named or addressed in verse text |
| 26:196 | Confirmation |  |  |  | explicit | scripture named or addressed in verse text |
| 27:76 | Confirmation | contextual |  |  |  | "Children of Israel" |
| 28:52 | Confirmation |  |  |  | explicit | scripture named or addressed in verse text |
| 35:31 | Confirmation |  |  |  | explicit | scripture named or addressed in verse text |
| 41:45 | Confirmation | explicit |  |  |  | disagreement over Moses' Scripture, not alteration |
| 42:13 | Confirmation |  |  |  |  | religion enjoined on Moses and Jesus; no scripture named |
| 45:16 | Confirmation | contextual |  |  |  | "Children of Israel the Scripture" |
| 46:12 | Confirmation | explicit |  |  |  | scripture named or addressed in verse text |
| 53:36 | Confirmation | contextual |  |  |  | "scriptures (suhuf) of Moses" |
| 98:3 | Confirmation |  |  |  | contextual | "correct writings" (98:2-3) |
| 2:42 | Alteration | contextual |  |  |  | addressed to Children of Israel (2:40) |
| 2:75 | Alteration | contextual |  |  |  | Arabic "kalam Allah"; the English translation glosses it as the Torah |
| 2:77 | Alteration | contextual |  |  |  | continues 2:75-76 |
| 2:78 | Alteration | contextual |  |  |  | same passage (2:75-79) |
| 2:79 | Alteration | contextual |  |  |  | same passage (2:75-79) |
| 2:90 | Alteration | contextual |  |  |  | Children of Israel passage; rejection rather than alteration |
| 2:145 | Alteration |  |  |  | explicit | scripture named or addressed in verse text |
| 2:146 | Alteration |  |  |  | explicit | scripture named or addressed in verse text |
| 2:159 | Alteration |  |  |  | explicit | scripture named or addressed in verse text |
| 2:160 | Alteration |  |  |  | contextual | scripture named or addressed in verse text |
| 2:174 | Alteration |  |  |  | explicit | scripture named or addressed in verse text |
| 2:175 | Alteration |  |  |  | contextual | scripture named or addressed in verse text |
| 3:71 | Alteration |  |  |  | explicit | scripture named or addressed in verse text |
| 3:78 | Alteration |  |  |  | explicit | scripture named or addressed in verse text |
| 4:44 | Alteration |  |  |  | explicit | scripture named or addressed in verse text |
| 4:46 | Alteration | contextual |  |  |  | "Among the Jews" |
| 5:13 | Alteration | contextual |  |  |  | Children of Israel covenant (5:12) |
| 5:15 | Alteration |  |  |  | explicit | People of the Scripture (Jews and Christians, 5:14-15) |
| 5:41 | Alteration | contextual |  |  |  | "from among the Jews"; 5:43 names the Torah |
| 7:169 | Alteration | contextual |  |  |  | successors of the Children of Israel inherited the Scripture |
| 11:110 | Alteration | explicit |  |  |  | disagreement over Moses' Scripture, not alteration |
| 15:90 | Alteration |  |  |  |  | refers to the Quran / "separators" |
| 15:91 | Alteration |  |  |  |  | refers to the Quran |
| 41:45 | Alteration | explicit |  |  |  | disagreement over Moses' Scripture, not alteration |
| 62:5 | Alteration | explicit |  |  |  | scripture named or addressed in verse text |
| 98:4 | Alteration |  |  |  | explicit | scripture named or addressed in verse text |

Full English text is in `20261028_tension_map_CLASSIFICATION.csv`.

## Pairs (Torah)
| confirmation | alteration | level | neutral summary |
|---|---|---|---|
| 2:87 | 11:110 | explicit | 2:87: Moses was given the Torah — 11:110: Moses' Scripture came under disagreement |
| 2:87 | 41:45 | explicit | 2:87: Moses was given the Torah — 41:45: Moses' Scripture came under disagreement |
| 2:87 | 62:5 | explicit | 2:87: Moses was given the Torah — 62:5: those entrusted with the Torah did not take it on |
| 3:3 | 11:110 | explicit | 3:3: the Book confirms what preceded; Torah and Gospel were revealed — 11:110: Moses' Scripture came under disagreement |
| 3:3 | 41:45 | explicit | 3:3: the Book confirms what preceded; Torah and Gospel were revealed — 41:45: Moses' Scripture came under disagreement |
| 3:3 | 62:5 | explicit | 3:3: the Book confirms what preceded; Torah and Gospel were revealed — 62:5: those entrusted with the Torah did not take it on |
| 3:50 | 11:110 | explicit | 3:50: Jesus confirms the Torah before him — 11:110: Moses' Scripture came under disagreement |
| 3:50 | 41:45 | explicit | 3:50: Jesus confirms the Torah before him — 41:45: Moses' Scripture came under disagreement |
| 3:50 | 62:5 | explicit | 3:50: Jesus confirms the Torah before him — 62:5: those entrusted with the Torah did not take it on |
| 5:46 | 11:110 | explicit | 5:46: Jesus and the Gospel confirm the Torah — 11:110: Moses' Scripture came under disagreement |
| 5:46 | 41:45 | explicit | 5:46: Jesus and the Gospel confirm the Torah — 41:45: Moses' Scripture came under disagreement |
| 5:46 | 62:5 | explicit | 5:46: Jesus and the Gospel confirm the Torah — 62:5: those entrusted with the Torah did not take it on |
| 5:68 | 11:110 | explicit | 5:68: the People of the Scripture are told to uphold the Torah and Gospel — 11:110: Moses' Scripture came under disagreement |
| 5:68 | 41:45 | explicit | 5:68: the People of the Scripture are told to uphold the Torah and Gospel — 41:45: Moses' Scripture came under disagreement |
| 5:68 | 62:5 | explicit | 5:68: the People of the Scripture are told to uphold the Torah and Gospel — 62:5: those entrusted with the Torah did not take it on |
| 17:2 | 11:110 | explicit | 17:2: Moses was given the Scripture as guidance — 11:110: Moses' Scripture came under disagreement |
| 17:2 | 41:45 | explicit | 17:2: Moses was given the Scripture as guidance — 41:45: Moses' Scripture came under disagreement |
| 17:2 | 62:5 | explicit | 17:2: Moses was given the Scripture as guidance — 62:5: those entrusted with the Torah did not take it on |
| 41:45 | 11:110 | explicit | 41:45: Moses' Scripture came under disagreement — 11:110: Moses' Scripture came under disagreement |
| 41:45 | 62:5 | explicit | 41:45: Moses' Scripture came under disagreement — 62:5: those entrusted with the Torah did not take it on |
| 46:12 | 11:110 | explicit | 46:12: the scripture of Moses is described as guide and mercy — 11:110: Moses' Scripture came under disagreement |
| 46:12 | 41:45 | explicit | 46:12: the scripture of Moses is described as guide and mercy — 41:45: Moses' Scripture came under disagreement |
| 46:12 | 62:5 | explicit | 46:12: the scripture of Moses is described as guide and mercy — 62:5: those entrusted with the Torah did not take it on |
| 2:41 | 2:42 | contextual | 2:41: asks belief in what confirms what is with the addressees — 2:42: do not mix truth with falsehood or conceal truth |
| 2:41 | 2:75 | contextual | 2:41: asks belief in what confirms what is with the addressees — 2:75: a party heard the words of Allah then distorted them |
| 2:41 | 2:77 | contextual | 2:41: asks belief in what confirms what is with the addressees — 2:77: Allah knows what they conceal |
| 2:41 | 2:78 | contextual | 2:41: asks belief in what confirms what is with the addressees — 2:78: some know the Scripture only by wishful thinking |
| 2:41 | 2:79 | contextual | 2:41: asks belief in what confirms what is with the addressees — 2:79: woe to those who write "scripture" with their hands and attribute it to Allah |
| 2:41 | 2:90 | contextual | 2:41: asks belief in what confirms what is with the addressees — 2:90: they disbelieved in what Allah revealed |
| 2:41 | 4:46 | contextual | 2:41: asks belief in what confirms what is with the addressees — 4:46: some of the Jews distort words from their usages |
| 2:41 | 5:13 | contextual | 2:41: asks belief in what confirms what is with the addressees — 5:13: they distort words and forgot a portion |
| 2:41 | 5:41 | contextual | 2:41: asks belief in what confirms what is with the addressees — 5:41: some distort words beyond their usages |
| 2:41 | 7:169 | contextual | 2:41: asks belief in what confirms what is with the addressees — 7:169: successors inherited the Scripture and took worldly gain |
| 2:41 | 11:110 | contextual | 2:41: asks belief in what confirms what is with the addressees — 11:110: Moses' Scripture came under disagreement |
| 2:41 | 41:45 | contextual | 2:41: asks belief in what confirms what is with the addressees — 41:45: Moses' Scripture came under disagreement |
| 2:41 | 62:5 | contextual | 2:41: asks belief in what confirms what is with the addressees — 62:5: those entrusted with the Torah did not take it on |
| 2:87 | 2:42 | contextual | 2:87: Moses was given the Torah — 2:42: do not mix truth with falsehood or conceal truth |
| 2:87 | 2:75 | contextual | 2:87: Moses was given the Torah — 2:75: a party heard the words of Allah then distorted them |
| 2:87 | 2:77 | contextual | 2:87: Moses was given the Torah — 2:77: Allah knows what they conceal |
| 2:87 | 2:78 | contextual | 2:87: Moses was given the Torah — 2:78: some know the Scripture only by wishful thinking |
| 2:87 | 2:79 | contextual | 2:87: Moses was given the Torah — 2:79: woe to those who write "scripture" with their hands and attribute it to Allah |
| 2:87 | 2:90 | contextual | 2:87: Moses was given the Torah — 2:90: they disbelieved in what Allah revealed |
| 2:87 | 4:46 | contextual | 2:87: Moses was given the Torah — 4:46: some of the Jews distort words from their usages |
| 2:87 | 5:13 | contextual | 2:87: Moses was given the Torah — 5:13: they distort words and forgot a portion |
| 2:87 | 5:41 | contextual | 2:87: Moses was given the Torah — 5:41: some distort words beyond their usages |
| 2:87 | 7:169 | contextual | 2:87: Moses was given the Torah — 7:169: successors inherited the Scripture and took worldly gain |
| 2:89 | 2:42 | contextual | 2:89: a Book came confirming what was with them — 2:42: do not mix truth with falsehood or conceal truth |
| 2:89 | 2:75 | contextual | 2:89: a Book came confirming what was with them — 2:75: a party heard the words of Allah then distorted them |
| 2:89 | 2:77 | contextual | 2:89: a Book came confirming what was with them — 2:77: Allah knows what they conceal |
| 2:89 | 2:78 | contextual | 2:89: a Book came confirming what was with them — 2:78: some know the Scripture only by wishful thinking |
| 2:89 | 2:79 | contextual | 2:89: a Book came confirming what was with them — 2:79: woe to those who write "scripture" with their hands and attribute it to Allah |
| 2:89 | 2:90 | contextual | 2:89: a Book came confirming what was with them — 2:90: they disbelieved in what Allah revealed |
| 2:89 | 4:46 | contextual | 2:89: a Book came confirming what was with them — 4:46: some of the Jews distort words from their usages |
| 2:89 | 5:13 | contextual | 2:89: a Book came confirming what was with them — 5:13: they distort words and forgot a portion |
| 2:89 | 5:41 | contextual | 2:89: a Book came confirming what was with them — 5:41: some distort words beyond their usages |
| 2:89 | 7:169 | contextual | 2:89: a Book came confirming what was with them — 7:169: successors inherited the Scripture and took worldly gain |
| 2:89 | 11:110 | contextual | 2:89: a Book came confirming what was with them — 11:110: Moses' Scripture came under disagreement |
| 2:89 | 41:45 | contextual | 2:89: a Book came confirming what was with them — 41:45: Moses' Scripture came under disagreement |
| 2:89 | 62:5 | contextual | 2:89: a Book came confirming what was with them — 62:5: those entrusted with the Torah did not take it on |
| 2:91 | 2:42 | contextual | 2:91: the revelation is called truth confirming what is with them — 2:42: do not mix truth with falsehood or conceal truth |
| 2:91 | 2:75 | contextual | 2:91: the revelation is called truth confirming what is with them — 2:75: a party heard the words of Allah then distorted them |
| 2:91 | 2:77 | contextual | 2:91: the revelation is called truth confirming what is with them — 2:77: Allah knows what they conceal |
| 2:91 | 2:78 | contextual | 2:91: the revelation is called truth confirming what is with them — 2:78: some know the Scripture only by wishful thinking |
| 2:91 | 2:79 | contextual | 2:91: the revelation is called truth confirming what is with them — 2:79: woe to those who write "scripture" with their hands and attribute it to Allah |
| 2:91 | 2:90 | contextual | 2:91: the revelation is called truth confirming what is with them — 2:90: they disbelieved in what Allah revealed |
| 2:91 | 4:46 | contextual | 2:91: the revelation is called truth confirming what is with them — 4:46: some of the Jews distort words from their usages |
| 2:91 | 5:13 | contextual | 2:91: the revelation is called truth confirming what is with them — 5:13: they distort words and forgot a portion |
| 2:91 | 5:41 | contextual | 2:91: the revelation is called truth confirming what is with them — 5:41: some distort words beyond their usages |
| 2:91 | 7:169 | contextual | 2:91: the revelation is called truth confirming what is with them — 7:169: successors inherited the Scripture and took worldly gain |
| 2:91 | 11:110 | contextual | 2:91: the revelation is called truth confirming what is with them — 11:110: Moses' Scripture came under disagreement |
| 2:91 | 41:45 | contextual | 2:91: the revelation is called truth confirming what is with them — 41:45: Moses' Scripture came under disagreement |
| 2:91 | 62:5 | contextual | 2:91: the revelation is called truth confirming what is with them — 62:5: those entrusted with the Torah did not take it on |
| 2:136 | 2:42 | contextual | 2:136: belief in what was given to Moses and Jesus — 2:42: do not mix truth with falsehood or conceal truth |
| 2:136 | 2:75 | contextual | 2:136: belief in what was given to Moses and Jesus — 2:75: a party heard the words of Allah then distorted them |
| 2:136 | 2:77 | contextual | 2:136: belief in what was given to Moses and Jesus — 2:77: Allah knows what they conceal |
| 2:136 | 2:78 | contextual | 2:136: belief in what was given to Moses and Jesus — 2:78: some know the Scripture only by wishful thinking |
| 2:136 | 2:79 | contextual | 2:136: belief in what was given to Moses and Jesus — 2:79: woe to those who write "scripture" with their hands and attribute it to Allah |
| 2:136 | 2:90 | contextual | 2:136: belief in what was given to Moses and Jesus — 2:90: they disbelieved in what Allah revealed |
| 2:136 | 4:46 | contextual | 2:136: belief in what was given to Moses and Jesus — 4:46: some of the Jews distort words from their usages |
| 2:136 | 5:13 | contextual | 2:136: belief in what was given to Moses and Jesus — 5:13: they distort words and forgot a portion |
| 2:136 | 5:41 | contextual | 2:136: belief in what was given to Moses and Jesus — 5:41: some distort words beyond their usages |
| 2:136 | 7:169 | contextual | 2:136: belief in what was given to Moses and Jesus — 7:169: successors inherited the Scripture and took worldly gain |
| 2:136 | 11:110 | contextual | 2:136: belief in what was given to Moses and Jesus — 11:110: Moses' Scripture came under disagreement |
| 2:136 | 41:45 | contextual | 2:136: belief in what was given to Moses and Jesus — 41:45: Moses' Scripture came under disagreement |
| 2:136 | 62:5 | contextual | 2:136: belief in what was given to Moses and Jesus — 62:5: those entrusted with the Torah did not take it on |
| 3:3 | 2:42 | contextual | 3:3: the Book confirms what preceded; Torah and Gospel were revealed — 2:42: do not mix truth with falsehood or conceal truth |
| 3:3 | 2:75 | contextual | 3:3: the Book confirms what preceded; Torah and Gospel were revealed — 2:75: a party heard the words of Allah then distorted them |
| 3:3 | 2:77 | contextual | 3:3: the Book confirms what preceded; Torah and Gospel were revealed — 2:77: Allah knows what they conceal |
| 3:3 | 2:78 | contextual | 3:3: the Book confirms what preceded; Torah and Gospel were revealed — 2:78: some know the Scripture only by wishful thinking |
| 3:3 | 2:79 | contextual | 3:3: the Book confirms what preceded; Torah and Gospel were revealed — 2:79: woe to those who write "scripture" with their hands and attribute it to Allah |
| 3:3 | 2:90 | contextual | 3:3: the Book confirms what preceded; Torah and Gospel were revealed — 2:90: they disbelieved in what Allah revealed |
| 3:3 | 4:46 | contextual | 3:3: the Book confirms what preceded; Torah and Gospel were revealed — 4:46: some of the Jews distort words from their usages |
| 3:3 | 5:13 | contextual | 3:3: the Book confirms what preceded; Torah and Gospel were revealed — 5:13: they distort words and forgot a portion |
| 3:3 | 5:41 | contextual | 3:3: the Book confirms what preceded; Torah and Gospel were revealed — 5:41: some distort words beyond their usages |
| 3:3 | 7:169 | contextual | 3:3: the Book confirms what preceded; Torah and Gospel were revealed — 7:169: successors inherited the Scripture and took worldly gain |
| 3:4 | 2:42 | contextual | 3:4: the earlier scriptures as guidance for people — 2:42: do not mix truth with falsehood or conceal truth |
| 3:4 | 2:75 | contextual | 3:4: the earlier scriptures as guidance for people — 2:75: a party heard the words of Allah then distorted them |
| 3:4 | 2:77 | contextual | 3:4: the earlier scriptures as guidance for people — 2:77: Allah knows what they conceal |
| 3:4 | 2:78 | contextual | 3:4: the earlier scriptures as guidance for people — 2:78: some know the Scripture only by wishful thinking |
| 3:4 | 2:79 | contextual | 3:4: the earlier scriptures as guidance for people — 2:79: woe to those who write "scripture" with their hands and attribute it to Allah |
| 3:4 | 2:90 | contextual | 3:4: the earlier scriptures as guidance for people — 2:90: they disbelieved in what Allah revealed |
| 3:4 | 4:46 | contextual | 3:4: the earlier scriptures as guidance for people — 4:46: some of the Jews distort words from their usages |
| 3:4 | 5:13 | contextual | 3:4: the earlier scriptures as guidance for people — 5:13: they distort words and forgot a portion |
| 3:4 | 5:41 | contextual | 3:4: the earlier scriptures as guidance for people — 5:41: some distort words beyond their usages |
| 3:4 | 7:169 | contextual | 3:4: the earlier scriptures as guidance for people — 7:169: successors inherited the Scripture and took worldly gain |
| 3:4 | 11:110 | contextual | 3:4: the earlier scriptures as guidance for people — 11:110: Moses' Scripture came under disagreement |
| 3:4 | 41:45 | contextual | 3:4: the earlier scriptures as guidance for people — 41:45: Moses' Scripture came under disagreement |
| 3:4 | 62:5 | contextual | 3:4: the earlier scriptures as guidance for people — 62:5: those entrusted with the Torah did not take it on |
| 3:50 | 2:42 | contextual | 3:50: Jesus confirms the Torah before him — 2:42: do not mix truth with falsehood or conceal truth |
| 3:50 | 2:75 | contextual | 3:50: Jesus confirms the Torah before him — 2:75: a party heard the words of Allah then distorted them |
| 3:50 | 2:77 | contextual | 3:50: Jesus confirms the Torah before him — 2:77: Allah knows what they conceal |
| 3:50 | 2:78 | contextual | 3:50: Jesus confirms the Torah before him — 2:78: some know the Scripture only by wishful thinking |
| 3:50 | 2:79 | contextual | 3:50: Jesus confirms the Torah before him — 2:79: woe to those who write "scripture" with their hands and attribute it to Allah |
| 3:50 | 2:90 | contextual | 3:50: Jesus confirms the Torah before him — 2:90: they disbelieved in what Allah revealed |
| 3:50 | 4:46 | contextual | 3:50: Jesus confirms the Torah before him — 4:46: some of the Jews distort words from their usages |
| 3:50 | 5:13 | contextual | 3:50: Jesus confirms the Torah before him — 5:13: they distort words and forgot a portion |
| 3:50 | 5:41 | contextual | 3:50: Jesus confirms the Torah before him — 5:41: some distort words beyond their usages |
| 3:50 | 7:169 | contextual | 3:50: Jesus confirms the Torah before him — 7:169: successors inherited the Scripture and took worldly gain |
| 3:84 | 2:42 | contextual | 3:84: belief in what was given to Moses and Jesus — 2:42: do not mix truth with falsehood or conceal truth |
| 3:84 | 2:75 | contextual | 3:84: belief in what was given to Moses and Jesus — 2:75: a party heard the words of Allah then distorted them |
| 3:84 | 2:77 | contextual | 3:84: belief in what was given to Moses and Jesus — 2:77: Allah knows what they conceal |
| 3:84 | 2:78 | contextual | 3:84: belief in what was given to Moses and Jesus — 2:78: some know the Scripture only by wishful thinking |
| 3:84 | 2:79 | contextual | 3:84: belief in what was given to Moses and Jesus — 2:79: woe to those who write "scripture" with their hands and attribute it to Allah |
| 3:84 | 2:90 | contextual | 3:84: belief in what was given to Moses and Jesus — 2:90: they disbelieved in what Allah revealed |
| 3:84 | 4:46 | contextual | 3:84: belief in what was given to Moses and Jesus — 4:46: some of the Jews distort words from their usages |
| 3:84 | 5:13 | contextual | 3:84: belief in what was given to Moses and Jesus — 5:13: they distort words and forgot a portion |
| 3:84 | 5:41 | contextual | 3:84: belief in what was given to Moses and Jesus — 5:41: some distort words beyond their usages |
| 3:84 | 7:169 | contextual | 3:84: belief in what was given to Moses and Jesus — 7:169: successors inherited the Scripture and took worldly gain |
| 3:84 | 11:110 | contextual | 3:84: belief in what was given to Moses and Jesus — 11:110: Moses' Scripture came under disagreement |
| 3:84 | 41:45 | contextual | 3:84: belief in what was given to Moses and Jesus — 41:45: Moses' Scripture came under disagreement |
| 3:84 | 62:5 | contextual | 3:84: belief in what was given to Moses and Jesus — 62:5: those entrusted with the Torah did not take it on |
| 4:47 | 2:42 | contextual | 4:47: the Scripture-people are told it confirms what is with them — 2:42: do not mix truth with falsehood or conceal truth |
| 4:47 | 2:75 | contextual | 4:47: the Scripture-people are told it confirms what is with them — 2:75: a party heard the words of Allah then distorted them |
| 4:47 | 2:77 | contextual | 4:47: the Scripture-people are told it confirms what is with them — 2:77: Allah knows what they conceal |
| 4:47 | 2:78 | contextual | 4:47: the Scripture-people are told it confirms what is with them — 2:78: some know the Scripture only by wishful thinking |
| 4:47 | 2:79 | contextual | 4:47: the Scripture-people are told it confirms what is with them — 2:79: woe to those who write "scripture" with their hands and attribute it to Allah |
| 4:47 | 2:90 | contextual | 4:47: the Scripture-people are told it confirms what is with them — 2:90: they disbelieved in what Allah revealed |
| 4:47 | 4:46 | contextual | 4:47: the Scripture-people are told it confirms what is with them — 4:46: some of the Jews distort words from their usages |
| 4:47 | 5:13 | contextual | 4:47: the Scripture-people are told it confirms what is with them — 5:13: they distort words and forgot a portion |
| 4:47 | 5:41 | contextual | 4:47: the Scripture-people are told it confirms what is with them — 5:41: some distort words beyond their usages |
| 4:47 | 7:169 | contextual | 4:47: the Scripture-people are told it confirms what is with them — 7:169: successors inherited the Scripture and took worldly gain |
| 4:47 | 11:110 | contextual | 4:47: the Scripture-people are told it confirms what is with them — 11:110: Moses' Scripture came under disagreement |
| 4:47 | 41:45 | contextual | 4:47: the Scripture-people are told it confirms what is with them — 41:45: Moses' Scripture came under disagreement |
| 4:47 | 62:5 | contextual | 4:47: the Scripture-people are told it confirms what is with them — 62:5: those entrusted with the Torah did not take it on |
| 5:46 | 2:42 | contextual | 5:46: Jesus and the Gospel confirm the Torah — 2:42: do not mix truth with falsehood or conceal truth |
| 5:46 | 2:75 | contextual | 5:46: Jesus and the Gospel confirm the Torah — 2:75: a party heard the words of Allah then distorted them |
| 5:46 | 2:77 | contextual | 5:46: Jesus and the Gospel confirm the Torah — 2:77: Allah knows what they conceal |
| 5:46 | 2:78 | contextual | 5:46: Jesus and the Gospel confirm the Torah — 2:78: some know the Scripture only by wishful thinking |
| 5:46 | 2:79 | contextual | 5:46: Jesus and the Gospel confirm the Torah — 2:79: woe to those who write "scripture" with their hands and attribute it to Allah |
| 5:46 | 2:90 | contextual | 5:46: Jesus and the Gospel confirm the Torah — 2:90: they disbelieved in what Allah revealed |
| 5:46 | 4:46 | contextual | 5:46: Jesus and the Gospel confirm the Torah — 4:46: some of the Jews distort words from their usages |
| 5:46 | 5:13 | contextual | 5:46: Jesus and the Gospel confirm the Torah — 5:13: they distort words and forgot a portion |
| 5:46 | 5:41 | contextual | 5:46: Jesus and the Gospel confirm the Torah — 5:41: some distort words beyond their usages |
| 5:46 | 7:169 | contextual | 5:46: Jesus and the Gospel confirm the Torah — 7:169: successors inherited the Scripture and took worldly gain |
| 5:48 | 2:42 | contextual | 5:48: the Book confirms and is a criterion over preceding Scripture — 2:42: do not mix truth with falsehood or conceal truth |
| 5:48 | 2:75 | contextual | 5:48: the Book confirms and is a criterion over preceding Scripture — 2:75: a party heard the words of Allah then distorted them |
| 5:48 | 2:77 | contextual | 5:48: the Book confirms and is a criterion over preceding Scripture — 2:77: Allah knows what they conceal |
| 5:48 | 2:78 | contextual | 5:48: the Book confirms and is a criterion over preceding Scripture — 2:78: some know the Scripture only by wishful thinking |
| 5:48 | 2:79 | contextual | 5:48: the Book confirms and is a criterion over preceding Scripture — 2:79: woe to those who write "scripture" with their hands and attribute it to Allah |
| 5:48 | 2:90 | contextual | 5:48: the Book confirms and is a criterion over preceding Scripture — 2:90: they disbelieved in what Allah revealed |
| 5:48 | 4:46 | contextual | 5:48: the Book confirms and is a criterion over preceding Scripture — 4:46: some of the Jews distort words from their usages |
| 5:48 | 5:13 | contextual | 5:48: the Book confirms and is a criterion over preceding Scripture — 5:13: they distort words and forgot a portion |
| 5:48 | 5:41 | contextual | 5:48: the Book confirms and is a criterion over preceding Scripture — 5:41: some distort words beyond their usages |
| 5:48 | 7:169 | contextual | 5:48: the Book confirms and is a criterion over preceding Scripture — 7:169: successors inherited the Scripture and took worldly gain |
| 5:48 | 11:110 | contextual | 5:48: the Book confirms and is a criterion over preceding Scripture — 11:110: Moses' Scripture came under disagreement |
| 5:48 | 41:45 | contextual | 5:48: the Book confirms and is a criterion over preceding Scripture — 41:45: Moses' Scripture came under disagreement |
| 5:48 | 62:5 | contextual | 5:48: the Book confirms and is a criterion over preceding Scripture — 62:5: those entrusted with the Torah did not take it on |
| 5:68 | 2:42 | contextual | 5:68: the People of the Scripture are told to uphold the Torah and Gospel — 2:42: do not mix truth with falsehood or conceal truth |
| 5:68 | 2:75 | contextual | 5:68: the People of the Scripture are told to uphold the Torah and Gospel — 2:75: a party heard the words of Allah then distorted them |
| 5:68 | 2:77 | contextual | 5:68: the People of the Scripture are told to uphold the Torah and Gospel — 2:77: Allah knows what they conceal |
| 5:68 | 2:78 | contextual | 5:68: the People of the Scripture are told to uphold the Torah and Gospel — 2:78: some know the Scripture only by wishful thinking |
| 5:68 | 2:79 | contextual | 5:68: the People of the Scripture are told to uphold the Torah and Gospel — 2:79: woe to those who write "scripture" with their hands and attribute it to Allah |
| 5:68 | 2:90 | contextual | 5:68: the People of the Scripture are told to uphold the Torah and Gospel — 2:90: they disbelieved in what Allah revealed |
| 5:68 | 4:46 | contextual | 5:68: the People of the Scripture are told to uphold the Torah and Gospel — 4:46: some of the Jews distort words from their usages |
| 5:68 | 5:13 | contextual | 5:68: the People of the Scripture are told to uphold the Torah and Gospel — 5:13: they distort words and forgot a portion |
| 5:68 | 5:41 | contextual | 5:68: the People of the Scripture are told to uphold the Torah and Gospel — 5:41: some distort words beyond their usages |
| 5:68 | 7:169 | contextual | 5:68: the People of the Scripture are told to uphold the Torah and Gospel — 7:169: successors inherited the Scripture and took worldly gain |
| 17:2 | 2:42 | contextual | 17:2: Moses was given the Scripture as guidance — 2:42: do not mix truth with falsehood or conceal truth |
| 17:2 | 2:75 | contextual | 17:2: Moses was given the Scripture as guidance — 2:75: a party heard the words of Allah then distorted them |
| 17:2 | 2:77 | contextual | 17:2: Moses was given the Scripture as guidance — 2:77: Allah knows what they conceal |
| 17:2 | 2:78 | contextual | 17:2: Moses was given the Scripture as guidance — 2:78: some know the Scripture only by wishful thinking |
| 17:2 | 2:79 | contextual | 17:2: Moses was given the Scripture as guidance — 2:79: woe to those who write "scripture" with their hands and attribute it to Allah |
| 17:2 | 2:90 | contextual | 17:2: Moses was given the Scripture as guidance — 2:90: they disbelieved in what Allah revealed |
| 17:2 | 4:46 | contextual | 17:2: Moses was given the Scripture as guidance — 4:46: some of the Jews distort words from their usages |
| 17:2 | 5:13 | contextual | 17:2: Moses was given the Scripture as guidance — 5:13: they distort words and forgot a portion |
| 17:2 | 5:41 | contextual | 17:2: Moses was given the Scripture as guidance — 5:41: some distort words beyond their usages |
| 17:2 | 7:169 | contextual | 17:2: Moses was given the Scripture as guidance — 7:169: successors inherited the Scripture and took worldly gain |
| 27:76 | 2:42 | contextual | 27:76: the Quran relates to the Children of Israel what they disagree on — 2:42: do not mix truth with falsehood or conceal truth |
| 27:76 | 2:75 | contextual | 27:76: the Quran relates to the Children of Israel what they disagree on — 2:75: a party heard the words of Allah then distorted them |
| 27:76 | 2:77 | contextual | 27:76: the Quran relates to the Children of Israel what they disagree on — 2:77: Allah knows what they conceal |
| 27:76 | 2:78 | contextual | 27:76: the Quran relates to the Children of Israel what they disagree on — 2:78: some know the Scripture only by wishful thinking |
| 27:76 | 2:79 | contextual | 27:76: the Quran relates to the Children of Israel what they disagree on — 2:79: woe to those who write "scripture" with their hands and attribute it to Allah |
| 27:76 | 2:90 | contextual | 27:76: the Quran relates to the Children of Israel what they disagree on — 2:90: they disbelieved in what Allah revealed |
| 27:76 | 4:46 | contextual | 27:76: the Quran relates to the Children of Israel what they disagree on — 4:46: some of the Jews distort words from their usages |
| 27:76 | 5:13 | contextual | 27:76: the Quran relates to the Children of Israel what they disagree on — 5:13: they distort words and forgot a portion |
| 27:76 | 5:41 | contextual | 27:76: the Quran relates to the Children of Israel what they disagree on — 5:41: some distort words beyond their usages |
| 27:76 | 7:169 | contextual | 27:76: the Quran relates to the Children of Israel what they disagree on — 7:169: successors inherited the Scripture and took worldly gain |
| 27:76 | 11:110 | contextual | 27:76: the Quran relates to the Children of Israel what they disagree on — 11:110: Moses' Scripture came under disagreement |
| 27:76 | 41:45 | contextual | 27:76: the Quran relates to the Children of Israel what they disagree on — 41:45: Moses' Scripture came under disagreement |
| 27:76 | 62:5 | contextual | 27:76: the Quran relates to the Children of Israel what they disagree on — 62:5: those entrusted with the Torah did not take it on |
| 41:45 | 2:42 | contextual | 41:45: Moses' Scripture came under disagreement — 2:42: do not mix truth with falsehood or conceal truth |
| 41:45 | 2:75 | contextual | 41:45: Moses' Scripture came under disagreement — 2:75: a party heard the words of Allah then distorted them |
| 41:45 | 2:77 | contextual | 41:45: Moses' Scripture came under disagreement — 2:77: Allah knows what they conceal |
| 41:45 | 2:78 | contextual | 41:45: Moses' Scripture came under disagreement — 2:78: some know the Scripture only by wishful thinking |
| 41:45 | 2:79 | contextual | 41:45: Moses' Scripture came under disagreement — 2:79: woe to those who write "scripture" with their hands and attribute it to Allah |
| 41:45 | 2:90 | contextual | 41:45: Moses' Scripture came under disagreement — 2:90: they disbelieved in what Allah revealed |
| 41:45 | 4:46 | contextual | 41:45: Moses' Scripture came under disagreement — 4:46: some of the Jews distort words from their usages |
| 41:45 | 5:13 | contextual | 41:45: Moses' Scripture came under disagreement — 5:13: they distort words and forgot a portion |
| 41:45 | 5:41 | contextual | 41:45: Moses' Scripture came under disagreement — 5:41: some distort words beyond their usages |
| 41:45 | 7:169 | contextual | 41:45: Moses' Scripture came under disagreement — 7:169: successors inherited the Scripture and took worldly gain |
| 45:16 | 2:42 | contextual | 45:16: the Children of Israel were given the Scripture — 2:42: do not mix truth with falsehood or conceal truth |
| 45:16 | 2:75 | contextual | 45:16: the Children of Israel were given the Scripture — 2:75: a party heard the words of Allah then distorted them |
| 45:16 | 2:77 | contextual | 45:16: the Children of Israel were given the Scripture — 2:77: Allah knows what they conceal |
| 45:16 | 2:78 | contextual | 45:16: the Children of Israel were given the Scripture — 2:78: some know the Scripture only by wishful thinking |
| 45:16 | 2:79 | contextual | 45:16: the Children of Israel were given the Scripture — 2:79: woe to those who write "scripture" with their hands and attribute it to Allah |
| 45:16 | 2:90 | contextual | 45:16: the Children of Israel were given the Scripture — 2:90: they disbelieved in what Allah revealed |
| 45:16 | 4:46 | contextual | 45:16: the Children of Israel were given the Scripture — 4:46: some of the Jews distort words from their usages |
| 45:16 | 5:13 | contextual | 45:16: the Children of Israel were given the Scripture — 5:13: they distort words and forgot a portion |
| 45:16 | 5:41 | contextual | 45:16: the Children of Israel were given the Scripture — 5:41: some distort words beyond their usages |
| 45:16 | 7:169 | contextual | 45:16: the Children of Israel were given the Scripture — 7:169: successors inherited the Scripture and took worldly gain |
| 45:16 | 11:110 | contextual | 45:16: the Children of Israel were given the Scripture — 11:110: Moses' Scripture came under disagreement |
| 45:16 | 41:45 | contextual | 45:16: the Children of Israel were given the Scripture — 41:45: Moses' Scripture came under disagreement |
| 45:16 | 62:5 | contextual | 45:16: the Children of Israel were given the Scripture — 62:5: those entrusted with the Torah did not take it on |
| 46:12 | 2:42 | contextual | 46:12: the scripture of Moses is described as guide and mercy — 2:42: do not mix truth with falsehood or conceal truth |
| 46:12 | 2:75 | contextual | 46:12: the scripture of Moses is described as guide and mercy — 2:75: a party heard the words of Allah then distorted them |
| 46:12 | 2:77 | contextual | 46:12: the scripture of Moses is described as guide and mercy — 2:77: Allah knows what they conceal |
| 46:12 | 2:78 | contextual | 46:12: the scripture of Moses is described as guide and mercy — 2:78: some know the Scripture only by wishful thinking |
| 46:12 | 2:79 | contextual | 46:12: the scripture of Moses is described as guide and mercy — 2:79: woe to those who write "scripture" with their hands and attribute it to Allah |
| 46:12 | 2:90 | contextual | 46:12: the scripture of Moses is described as guide and mercy — 2:90: they disbelieved in what Allah revealed |
| 46:12 | 4:46 | contextual | 46:12: the scripture of Moses is described as guide and mercy — 4:46: some of the Jews distort words from their usages |
| 46:12 | 5:13 | contextual | 46:12: the scripture of Moses is described as guide and mercy — 5:13: they distort words and forgot a portion |
| 46:12 | 5:41 | contextual | 46:12: the scripture of Moses is described as guide and mercy — 5:41: some distort words beyond their usages |
| 46:12 | 7:169 | contextual | 46:12: the scripture of Moses is described as guide and mercy — 7:169: successors inherited the Scripture and took worldly gain |
| 53:36 | 2:42 | contextual | 53:36: refers to the scriptures of Moses — 2:42: do not mix truth with falsehood or conceal truth |
| 53:36 | 2:75 | contextual | 53:36: refers to the scriptures of Moses — 2:75: a party heard the words of Allah then distorted them |
| 53:36 | 2:77 | contextual | 53:36: refers to the scriptures of Moses — 2:77: Allah knows what they conceal |
| 53:36 | 2:78 | contextual | 53:36: refers to the scriptures of Moses — 2:78: some know the Scripture only by wishful thinking |
| 53:36 | 2:79 | contextual | 53:36: refers to the scriptures of Moses — 2:79: woe to those who write "scripture" with their hands and attribute it to Allah |
| 53:36 | 2:90 | contextual | 53:36: refers to the scriptures of Moses — 2:90: they disbelieved in what Allah revealed |
| 53:36 | 4:46 | contextual | 53:36: refers to the scriptures of Moses — 4:46: some of the Jews distort words from their usages |
| 53:36 | 5:13 | contextual | 53:36: refers to the scriptures of Moses — 5:13: they distort words and forgot a portion |
| 53:36 | 5:41 | contextual | 53:36: refers to the scriptures of Moses — 5:41: some distort words beyond their usages |
| 53:36 | 7:169 | contextual | 53:36: refers to the scriptures of Moses — 7:169: successors inherited the Scripture and took worldly gain |
| 53:36 | 11:110 | contextual | 53:36: refers to the scriptures of Moses — 11:110: Moses' Scripture came under disagreement |
| 53:36 | 41:45 | contextual | 53:36: refers to the scriptures of Moses — 41:45: Moses' Scripture came under disagreement |
| 53:36 | 62:5 | contextual | 53:36: refers to the scriptures of Moses — 62:5: those entrusted with the Torah did not take it on |

## Secondary tier: generic 'Book' only (not inserted)
121 confirmation×alteration combinations where both verses refer only to scripture in general:

- 2:4 × 2:145, 2:146, 2:159, 2:160, 2:174, 2:175, 3:71, 3:78, 4:44, 5:15, 98:4
- 2:137 × 2:145, 2:146, 2:159, 2:160, 2:174, 2:175, 3:71, 3:78, 4:44, 5:15, 98:4
- 3:199 × 2:145, 2:146, 2:159, 2:160, 2:174, 2:175, 3:71, 3:78, 4:44, 5:15, 98:4
- 4:47 × 2:145, 2:146, 2:159, 2:160, 2:174, 2:175, 3:71, 3:78, 4:44, 5:15, 98:4
- 5:48 × 2:145, 2:146, 2:159, 2:160, 2:174, 2:175, 3:71, 3:78, 4:44, 5:15, 98:4
- 10:94 × 2:145, 2:146, 2:159, 2:160, 2:174, 2:175, 3:71, 3:78, 4:44, 5:15, 98:4
- 13:36 × 2:145, 2:146, 2:159, 2:160, 2:174, 2:175, 3:71, 3:78, 4:44, 5:15, 98:4
- 26:196 × 2:145, 2:146, 2:159, 2:160, 2:174, 2:175, 3:71, 3:78, 4:44, 5:15, 98:4
- 28:52 × 2:145, 2:146, 2:159, 2:160, 2:174, 2:175, 3:71, 3:78, 4:44, 5:15, 98:4
- 35:31 × 2:145, 2:146, 2:159, 2:160, 2:174, 2:175, 3:71, 3:78, 4:44, 5:15, 98:4
- 98:3 × 2:145, 2:146, 2:159, 2:160, 2:174, 2:175, 3:71, 3:78, 4:44, 5:15, 98:4

## Interpretive note
Classical exegetes discuss distinctions that bear on how these verse groups relate, for example alteration of meaning or interpretation versus alteration of the text itself, and concealment of passages versus changing them. This report takes no position on which view is correct. No sources are cited because none were found in the repository or database.

## Caveats
- The classification is a manual reading of the English translation and its immediate context. Contextual tags are judgment calls that can be reviewed in the CSV.
- 2:75: the Arabic says *kalām Allāh*, and 'Torah' is the translation's gloss, so it is tagged contextual.
- 11:110 and 41:45 speak of *disagreement* over Moses' Scripture, and 2:90 of rejection, rather than alteration. They are kept because they are members of the source theme, and flagged here.
- All pairs are Torah pairs. 'Gospel' tension cannot be represented because no alteration-theme verse names the Gospel. 5:14 (Christians forgot a portion) is not a member of that theme.
- Files: `20261028_tension_map_crossrefs.sql`, `_ROLLBACK.sql`, and `_dryrun.py` (read-only, exact counts from live data).

## Frontend
`index.html` Cross-Refs tab: themes starting `Tension:` get a slate-blue header, the ⚖ icon and a 'tension' badge. Other themes are unchanged.
