/* Theme tensions config: verse mapping + highlight phrases only.
 * Verse TEXT is fetched live from Supabase `ayas` (anon key, read-only).
 * Phrase matching: Arabic normalized (diacritics stripped, alif/ya/ta-marbuta folded); English case-insensitive.
 * k: 'red' = conflicting phrase, s1..sN = identical wording shared across verses.
 * Explanations are descriptive, not tafsir. */
window.THEME_TENSIONS={
 "cats": [
  {
   "n": "Quran confirming earlier revelation",
   "d": "The Quran described as sent down to confirm what came before it.",
   "v": [
    "2:97",
    "3:3",
    "3:4",
    "5:48",
    "6:92",
    "10:37",
    "12:111",
    "35:31",
    "37:37",
    "46:12",
    "46:30"
   ]
  },
  {
   "n": "Call to believe in the confirming revelation, and its rejection",
   "d": "Children of Israel or People of the Book urged to accept the confirming message; narratives of refusal.",
   "v": [
    "2:41",
    "2:87",
    "2:89",
    "2:91",
    "2:101",
    "2:137",
    "4:47"
   ]
  },
  {
   "n": "People of the Book told to judge by or uphold their own scripture",
   "d": "Torah and Gospel presented as authoritative for their communities.",
   "v": [
    "5:43",
    "5:44",
    "5:47",
    "5:66",
    "5:68"
   ]
  },
  {
   "n": "Jesus confirming the Torah and given the Gospel",
   "d": "",
   "v": [
    "3:48",
    "3:50",
    "5:46",
    "57:27",
    "61:6"
   ]
  },
  {
   "n": "Scripture given to Moses and the Children of Israel",
   "d": "",
   "v": [
    "5:32",
    "6:89",
    "6:154",
    "17:2",
    "23:49",
    "32:23",
    "45:16"
   ]
  },
  {
   "n": "Earlier scriptures cited as record or witness",
   "d": "Content said to be found in the Torah, Gospel, Psalms or former scriptures.",
   "v": [
    "7:157",
    "9:111",
    "21:105",
    "26:196",
    "48:29",
    "53:36",
    "87:18",
    "98:3"
   ]
  },
  {
   "n": "People of the Book who recognize or believe",
   "d": "",
   "v": [
    "2:121",
    "3:199",
    "6:20",
    "10:94",
    "11:17",
    "13:36",
    "28:52",
    "29:47"
   ]
  },
  {
   "n": "Believe in all prophets and books",
   "d": "",
   "v": [
    "2:4",
    "2:136",
    "3:84",
    "42:13"
   ]
  },
  {
   "n": "Disagreement, division and special laws among earlier communities",
   "d": "",
   "v": [
    "3:19",
    "6:146",
    "11:110",
    "16:118",
    "16:124",
    "27:76",
    "41:45"
   ]
  }
 ],
 "sec": {
  "2:101": "alteration/concealment (throwing scripture behind backs)",
  "5:48": "judge by what Allah revealed",
  "2:89": "rejection",
  "3:50": "confirming earlier revelation",
  "61:6": "earlier scripture as witness (Ahmad)",
  "7:157": "People of the Book recognize",
  "5:46": "Torah/Gospel sent down",
  "2:41": "exchange for a small price"
 },
 "pairs": [
  {
   "t": "Words of Allah unchangeable vs. distortion of words",
   "x": "Some verses state that no one can change Allah's words, while others describe groups distorting words from their places, raising the question of what kind of change is denied and what kind is described.",
   "v": [
    {
     "ref": "6:115",
     "out": true,
     "h": [
      {
       "k": "red",
       "a": "لا مبدل لكلمته",
       "e": "None can alter His words"
      },
      {
       "k": "s1",
       "a": "لا مبدل لكلمته",
       "e": "His words"
      }
     ]
    },
    {
     "ref": "18:27",
     "out": true,
     "h": [
      {
       "k": "red",
       "a": "لا مبدل لكلمته",
       "e": "no changer of His words"
      },
      {
       "k": "s1",
       "a": "لا مبدل لكلمته",
       "e": "His words"
      }
     ]
    },
    {
     "ref": "10:64",
     "out": true,
     "h": [
      {
       "k": "red",
       "a": "لا تبديل لكلمت الله",
       "e": "No change is there in the words of Allah"
      }
     ]
    },
    {
     "ref": "4:46",
     "out": true,
     "h": [
      {
       "k": "red",
       "a": "يحرفون الكلم عن مواضعه",
       "e": "distort words from their [proper] usages"
      },
      {
       "k": "s2",
       "a": "يحرفون الكلم عن مواضعه",
       "e": "distort words from their [proper] usages"
      }
     ]
    },
    {
     "ref": "5:13",
     "out": true,
     "h": [
      {
       "k": "red",
       "a": "يحرفون الكلم عن مواضعه",
       "e": "distort words from their [proper] usages"
      },
      {
       "k": "s2",
       "a": "يحرفون الكلم عن مواضعه",
       "e": "distort words from their [proper] usages"
      }
     ]
    },
    {
     "ref": "2:75",
     "out": true,
     "h": [
      {
       "k": "red",
       "a": "كلم الله ثم يحرفونه",
       "e": "words of Allah and then distort"
      }
     ]
    }
   ],
   "sh": [
    {
     "k": "s1",
     "a": "لا مبدل لكلمته",
     "e": "His words"
    },
    {
     "k": "s2",
     "a": "يحرفون الكلم عن مواضعه",
     "e": "distort words from their [proper] usages"
    }
   ]
  },
  {
   "t": "Torah in hand as Allah's judgement vs. scripture written by hand or altered by tongue",
   "x": "5:43 and 5:47 treat the Torah and Gospel held by their communities as containing Allah's judgement, while 2:79 and 3:78 describe people presenting their own writing or speech as 'from Allah'.",
   "v": [
    {
     "ref": "5:43",
     "out": false,
     "h": [
      {
       "k": "red",
       "a": "وعندهم التوريه فيها حكم الله",
       "e": "they have the Torah, in which is the judgement of Allah"
      }
     ]
    },
    {
     "ref": "5:47",
     "out": false,
     "h": [
      {
       "k": "red",
       "a": "وليحكم اهل الانجيل بما انزل الله فيه",
       "e": "let the People of the Gospel judge by what Allah has revealed therein"
      }
     ]
    },
    {
     "ref": "2:79",
     "out": true,
     "h": [
      {
       "k": "red",
       "a": "يكتبون الكتب بايديهم",
       "e": "write the \"scripture\" with their own hands"
      },
      {
       "k": "s1",
       "a": "من عند الله",
       "e": "This is from Allah"
      }
     ]
    },
    {
     "ref": "3:78",
     "out": true,
     "h": [
      {
       "k": "red",
       "a": "يلون السنتهم بالكتب",
       "e": "alter the Scripture with their tongues"
      },
      {
       "k": "s1",
       "a": "من عند الله",
       "e": "This is from Allah"
      }
     ]
    }
   ],
   "sh": [
    {
     "k": "s1",
     "a": "من عند الله",
     "e": "This is from Allah"
    }
   ]
  },
  {
   "t": "Judge by and uphold your scripture vs. fight those given the Scripture",
   "x": "5:47 and 5:68 direct Christians and Jews to their own scriptures, while 9:29 commands fighting some of 'those who were given the Scripture' until they pay the jizyah.",
   "v": [
    {
     "ref": "5:47",
     "out": false,
     "h": [
      {
       "k": "red",
       "a": "وليحكم اهل الانجيل بما انزل الله فيه",
       "e": "let the People of the Gospel judge by what Allah has revealed therein"
      },
      {
       "k": "s1",
       "a": "الانجيل",
       "e": "the Gospel"
      }
     ]
    },
    {
     "ref": "5:68",
     "out": false,
     "h": [
      {
       "k": "red",
       "a": "حتي تقيموا التوريه والانجيل",
       "e": "until you uphold [the law of] the Torah, the Gospel"
      },
      {
       "k": "s1",
       "a": "الانجيل",
       "e": "the Gospel"
      }
     ]
    },
    {
     "ref": "9:29",
     "out": true,
     "h": [
      {
       "k": "red",
       "a": "قتلوا الذين لا يؤمنون",
       "e": "Fight those who do not believe"
      },
      {
       "k": "red",
       "a": "حتي يعطوا الجزيه",
       "e": "until they give the jizyah"
      }
     ]
    }
   ],
   "sh": [
    {
     "k": "s1",
     "a": "الانجيل",
     "e": "the Gospel"
    }
   ]
  },
  {
   "t": "Confirming earlier scripture vs. criterion over it",
   "x": "The same formula of 'confirming what is before it' appears for the Gospel and the Quran, but 5:48 adds 'muhayminan' (criterion or guardian over it) and separate laws for each community, which bears on whether earlier scripture remains binding.",
   "v": [
    {
     "ref": "5:46",
     "out": false,
     "h": [
      {
       "k": "red",
       "a": "فيه هدي ونور",
       "e": "in which was guidance and light"
      },
      {
       "k": "s1",
       "a": "مصدقا لما بين يديه",
       "e": "confirming that which preceded it of the"
      }
     ]
    },
    {
     "ref": "3:3",
     "out": false,
     "h": [
      {
       "k": "s1",
       "a": "مصدقا لما بين يديه",
       "e": ""
      },
      {
       "k": "s2",
       "a": "الكتب بالحق مصدقا",
       "e": "the Book in truth, confirming"
      }
     ]
    },
    {
     "ref": "5:48",
     "out": false,
     "h": [
      {
       "k": "red",
       "a": "ومهيمنا عليه",
       "e": "as a criterion over it"
      },
      {
       "k": "red",
       "a": "لكل جعلنا منكم شرعه ومنهاجا",
       "e": "To each of you We prescribed a law and a method"
      },
      {
       "k": "s1",
       "a": "مصدقا لما بين يديه",
       "e": "confirming that which preceded it of the"
      },
      {
       "k": "s2",
       "a": "الكتب بالحق مصدقا",
       "e": "the Book in truth, confirming"
      }
     ]
    }
   ],
   "sh": [
    {
     "k": "s1",
     "a": "مصدقا لما بين يديه",
     "e": "confirming that which preceded it of the"
    },
    {
     "k": "s2",
     "a": "الكتب بالحق مصدقا",
     "e": "the Book in truth, confirming"
    }
   ]
  },
  {
   "t": "No change in Allah's words vs. substituting or abrogating verses (outside cluster)",
   "x": "10:64 states there is no change in the words of Allah, while 2:106 and 16:101 speak of verses being abrogated or substituted; classical scholarship discusses whether these refer to the same kind of 'words'.",
   "v": [
    {
     "ref": "10:64",
     "out": true,
     "h": [
      {
       "k": "red",
       "a": "لا تبديل لكلمت الله",
       "e": "No change is there in the words of Allah"
      }
     ]
    },
    {
     "ref": "2:106",
     "out": true,
     "h": [
      {
       "k": "red",
       "a": "ما ننسخ من ءايه",
       "e": "We do not abrogate a verse"
      },
      {
       "k": "s1",
       "a": "ءايه",
       "e": "a verse"
      }
     ]
    },
    {
     "ref": "16:101",
     "out": true,
     "h": [
      {
       "k": "red",
       "a": "بدلنا ءايه مكان ءايه",
       "e": "We substitute a verse in place of a verse"
      },
      {
       "k": "s1",
       "a": "ءايه",
       "e": "a verse"
      }
     ]
    }
   ],
   "sh": [
    {
     "k": "s1",
     "a": "ءايه",
     "e": "a verse"
    }
   ]
  },
  {
   "t": "Confirmation recognized vs. scripture thrown behind backs",
   "x": "The same phrase 'confirming what is with them' introduces both a community's disbelief (2:89) and a party discarding Allah's scripture (2:101), while 2:121 and 28:52 describe those given the Book as believing in it.",
   "v": [
    {
     "ref": "2:121",
     "out": false,
     "h": [
      {
       "k": "red",
       "a": "يتلونه حق تلاوته اولئك يؤمنون به",
       "e": "recite it with its true recital. They [are the ones who] believe in it"
      },
      {
       "k": "s2",
       "a": "الذين ءاتينهم الكتب",
       "e": "Those to whom We"
      }
     ]
    },
    {
     "ref": "28:52",
     "out": false,
     "h": [
      {
       "k": "red",
       "a": "هم به يؤمنون",
       "e": "they are believers in it"
      },
      {
       "k": "s2",
       "a": "الذين ءاتينهم الكتب",
       "e": "Those to whom We"
      }
     ]
    },
    {
     "ref": "2:89",
     "out": false,
     "h": [
      {
       "k": "red",
       "a": "كفروا به",
       "e": "they disbelieved in it"
      },
      {
       "k": "s1",
       "a": "مصدق لما معهم",
       "e": "confirming that which was with them"
      }
     ]
    },
    {
     "ref": "2:101",
     "out": false,
     "h": [
      {
       "k": "red",
       "a": "كتب الله وراء ظهورهم",
       "e": "threw the Scripture of Allah behind their backs"
      },
      {
       "k": "s1",
       "a": "مصدق لما معهم",
       "e": "confirming that which was with them"
      }
     ]
    }
   ],
   "sh": [
    {
     "k": "s1",
     "a": "مصدق لما معهم",
     "e": "confirming that which was with them"
    },
    {
     "k": "s2",
     "a": "الذين ءاتينهم الكتب",
     "e": "Those to whom We"
    }
   ]
  },
  {
   "t": "Prophet found written in their Torah vs. concealment of what was sent down",
   "x": "7:157 and 6:20 present earlier scripture as still showing the messenger and recognizable to its holders, while 2:159 and 3:187 speak of concealing what was made clear in the Scripture.",
   "v": [
    {
     "ref": "7:157",
     "out": false,
     "h": [
      {
       "k": "red",
       "a": "يجدونه مكتوبا عندهم في التوريه والانجيل",
       "e": "find written in what they have of the Torah and the Gospel"
      }
     ]
    },
    {
     "ref": "6:20",
     "out": false,
     "h": [
      {
       "k": "red",
       "a": "يعرفونه كما يعرفون ابناءهم",
       "e": "recognize it as they recognize their [own] sons"
      },
      {
       "k": "s2",
       "a": "الكتب",
       "e": "the Scripture"
      }
     ]
    },
    {
     "ref": "2:159",
     "out": true,
     "h": [
      {
       "k": "red",
       "a": "يكتمون ما انزلنا",
       "e": "conceal what We sent down"
      },
      {
       "k": "s1",
       "a": "للناس",
       "e": "the people"
      },
      {
       "k": "s2",
       "a": "الكتب",
       "e": "the Scripture"
      }
     ]
    },
    {
     "ref": "3:187",
     "out": true,
     "h": [
      {
       "k": "red",
       "a": "ولا تكتمونه فنبذوه وراء ظهورهم",
       "e": "not conceal it.\" But they threw it away behind their backs"
      },
      {
       "k": "s1",
       "a": "للناس",
       "e": "the people"
      },
      {
       "k": "s2",
       "a": "الكتب",
       "e": "the Scripture"
      }
     ]
    }
   ],
   "sh": [
    {
     "k": "s1",
     "a": "للناس",
     "e": "the people"
    },
    {
     "k": "s2",
     "a": "الكتب",
     "e": "the Scripture"
    }
   ]
  }
 ],
 "outside": [
  "10:64",
  "16:101",
  "18:27",
  "2:106",
  "2:159",
  "2:75",
  "2:79",
  "3:187",
  "3:78",
  "4:46",
  "5:13",
  "6:115",
  "9:29"
 ]
};
