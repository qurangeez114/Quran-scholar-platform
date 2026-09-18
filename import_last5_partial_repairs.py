#!/usr/bin/env python3
"""Deterministic no-AI repair of partial proposition extraction in Qur'an 110-114."""
import json, os, urllib.parse, urllib.request, urllib.error

SB="https://ylosytbxpzxzwfzjpaej.supabase.co"
KEY=os.environ["SUPABASE_SERVICE_KEY"]
HDR={"apikey":KEY,"Authorization":"Bearer "+KEY,"Content-Type":"application/json"}
TAG="work-last5-v1:partial-repair-v1"
DATA=[
  [
    110,
    1,
    "qurtubi",
    17632,
    "Sūrat al-Naṣr is also called Sūrat al-Tawdīʿ, 'The Farewell.'",
    "al-Qurṭubī",
    "preferred"
  ],
  [
    110,
    1,
    "qurtubi",
    17632,
    "Sūrat al-Naṣr consists of three verses.",
    "al-Qurṭubī",
    "preferred"
  ],
  [
    110,
    1,
    "qurtubi",
    17632,
    "Ibn ʿAbbās stated that Sūrat al-Naṣr was the last surah revealed in its entirety.",
    "Ibn ʿAbbās",
    "reported_only"
  ],
  [
    110,
    1,
    "qurtubi",
    17632,
    "Al-Qurṭubī explains al-naṣr as assistance or help.",
    "al-Qurṭubī",
    "preferred"
  ],
  [
    110,
    1,
    "qurtubi",
    17632,
    "Al-Ṭabarī interpreted the promised help as the Prophet's victory over Quraysh.",
    "al-Ṭabarī",
    "reported_only"
  ],
  [
    110,
    1,
    "qurtubi",
    17632,
    "Al-Ḥasan, Mujāhid and others interpreted al-fatḥ as the conquest of Mecca.",
    "al-Ḥasan, Mujāhid and others",
    "reported_only"
  ],
  [
    110,
    1,
    "qurtubi",
    17632,
    "Ibn ʿAbbās and Saʿīd b. Jubayr interpreted al-fatḥ as the conquest of cities and fortresses.",
    "Ibn ʿAbbās and Saʿīd b. Jubayr",
    "reported_only"
  ],
  [
    110,
    1,
    "qurtubi",
    17632,
    "Al-Qurṭubī records both a completed-event reading of 'when'—because the surah came after the conquest—and a future reading, 'when it comes to you.'",
    "al-Qurṭubī",
    "reported_only"
  ],
  [
    110,
    3,
    "saadi",
    36317,
    "Al-Saʿdī says the command to glorify God and seek forgiveness is an act of gratitude connected with the continuation and increase of victory.",
    "al-Saʿdī",
    "preferred"
  ],
  [
    110,
    3,
    "saadi",
    36317,
    "Al-Saʿdī points to the continued expansion of Islam under the Rightly Guided Caliphs and afterward as an instance of this increase.",
    "al-Saʿdī",
    "preferred"
  ],
  [
    110,
    3,
    "saadi",
    36317,
    "Al-Saʿdī interprets the surah as indicating that the Prophet's appointed term had drawn near.",
    "al-Saʿdī",
    "preferred"
  ],
  [
    110,
    3,
    "saadi",
    36317,
    "Al-Saʿdī reasons that noble acts such as prayer and pilgrimage are concluded with seeking forgiveness, and similarly the Prophet was commanded to conclude his life with praise and forgiveness.",
    "al-Saʿdī",
    "preferred"
  ],
  [
    110,
    3,
    "saadi",
    36317,
    "Al-Saʿdī reports that the Prophet implemented this command by frequently saying in bowing and prostration, 'Glory be to You, O Allah, and with Your praise; O Allah, forgive me.'",
    "al-Saʿdī",
    "preferred"
  ],
  [
    110,
    1,
    "tabari",
    5275,
    "Al-Ṭabarī identifies al-fatḥ in 110:1 as the conquest of Mecca.",
    "al-Ṭabarī",
    "preferred"
  ],
  [
    110,
    1,
    "tabari",
    5275,
    "Al-Ṭabarī explains the 'people' entering God's religion as groups from the Arab tribes, including Yemen and the tribes of Niẓār.",
    "al-Ṭabarī",
    "preferred"
  ],
  [
    110,
    1,
    "tabari",
    5275,
    "Al-Ṭabarī explains 'entering the religion of God in crowds' as entering Islam and the obedience to which the Prophet called them, group after group.",
    "al-Ṭabarī",
    "preferred"
  ],
  [
    110,
    1,
    "tabari",
    5275,
    "Mujāhid interpreted the 'conquest' in 110:1 as the conquest of Mecca.",
    "Mujāhid",
    "reported_only"
  ],
  [
    110,
    1,
    "tabari",
    5275,
    "A report from Ibn ʿAbbās connects the coming victory with the arrival of Yemenis and describes faith, jurisprudence and wisdom as Yemeni.",
    "Ibn ʿAbbās",
    "reported_only"
  ],
  [
    111,
    1,
    "ibn_kathir",
    48468,
    "Ibn Kathīr cites the report that when the Prophet gathered Quraysh at al-Ṣafā and warned them of severe punishment, Abū Lahab cursed him, after which Sūrat al-Masad was revealed.",
    "Ibn ʿAbbās",
    "reported_only"
  ],
  [
    111,
    1,
    "ibn_kathir",
    48468,
    "Ibn Kathīr explains the first 'perish' as a supplication against Abū Lahab and the second as information that his ruin occurred.",
    "Ibn Kathīr",
    "preferred"
  ],
  [
    111,
    1,
    "ibn_kathir",
    48468,
    "Ibn Kathīr identifies Abū Lahab as ʿAbd al-ʿUzzā b. ʿAbd al-Muṭṭalib, an uncle of the Prophet, and says he was called Abū Lahab because of the brightness of his face.",
    "Ibn Kathīr",
    "preferred"
  ],
  [
    111,
    1,
    "ibn_kathir",
    48468,
    "Ibn Kathīr describes Abū Lahab as repeatedly harming, hating and scorning the Prophet and his religion.",
    "Ibn Kathīr",
    "preferred"
  ],
  [
    111,
    3,
    "ibn_kathir",
    48470,
    "Ibn Kathīr explains the fire 'full of flames' as possessing flames, evil and severe burning.",
    "Ibn Kathīr",
    "preferred"
  ],
  [
    111,
    4,
    "ibn_kathir",
    48471,
    "Ibn Kathīr identifies Abū Lahab's wife as Umm Jamīl, ʿArwah bint Ḥarb b. Umayyah, the sister of Abū Sufyān.",
    "Ibn Kathīr",
    "preferred"
  ],
  [
    111,
    4,
    "ibn_kathir",
    48471,
    "Ibn Kathīr says Umm Jamīl supported her husband in disbelief, rejection and obstinacy.",
    "Ibn Kathīr",
    "preferred"
  ],
  [
    111,
    4,
    "ibn_kathir",
    48471,
    "Ibn Kathīr interprets her carrying firewood as her carrying fuel and throwing it upon her husband in Hell to increase his punishment.",
    "Ibn Kathīr",
    "preferred"
  ],
  [
    111,
    5,
    "ibn_kathir",
    48472,
    "Mujāhid and ʿUrwah interpreted the rope of masad as palm fiber of the Fire.",
    "Mujāhid and ʿUrwah",
    "reported_only"
  ],
  [
    111,
    5,
    "ibn_kathir",
    48472,
    "Ibn ʿAbbās, ʿAṭiyyah al-Jadalī, al-Ḍaḥḥāk and Ibn Zayd are cited as saying that Umm Jamīl used to place thorns in the Prophet's path.",
    "Ibn ʿAbbās, ʿAṭiyyah al-Jadalī, al-Ḍaḥḥāk and Ibn Zayd",
    "reported_only"
  ],
  [
    111,
    5,
    "ibn_kathir",
    48472,
    "Al-Jawharī is cited as defining masad as fiber or a tightly twisted rope made from fiber, palm leaves, camel hide or camel fur.",
    "al-Jawharī",
    "reported_only"
  ],
  [
    111,
    5,
    "ibn_kathir",
    48472,
    "Mujāhid also interpreted the rope of masad as an iron collar.",
    "Mujāhid",
    "reported_only"
  ],
  [
    111,
    1,
    "qurtubi",
    17635,
    "Al-Qurṭubī cites the al-Ṣafā warning report as a reason for the revelation of Sūrat al-Masad: Abū Lahab cursed the Prophet after being warned of severe punishment.",
    "Ibn ʿAbbās",
    "reported_only"
  ],
  [
    111,
    1,
    "qurtubi",
    17635,
    "Al-Qurṭubī records a report that when Umm Jamīl approached with a stone, God prevented her from seeing the Prophet although she could see Abū Bakr.",
    "al-Ḥumaydī and others",
    "reported_only"
  ],
  [
    111,
    1,
    "qurtubi",
    17635,
    "Ibn Zayd is cited with another reason for revelation: Abū Lahab rejected a religion in which belief would leave him with no superiority over ordinary Muslims.",
    "Ibn Zayd",
    "reported_only"
  ],
  [
    111,
    1,
    "qurtubi",
    17635,
    "ʿAbd al-Raḥmān b. Kaysān is cited as saying Abū Lahab would meet visiting delegations and tell them that the Prophet was a liar and sorcerer in order to deter them from hearing him.",
    "ʿAbd al-Raḥmān b. Kaysān",
    "reported_only"
  ],
  [
    111,
    3,
    "qurtubi",
    17663,
    "Al-Qurṭubī records variant readings of yaṣlā, including causative/passive readings meaning that God causes Abū Lahab to burn.",
    "al-Qurṭubī",
    "reported_only"
  ],
  [
    111,
    3,
    "qurtubi",
    17663,
    "Al-Qurṭubī prefers the common reading yaṣlā with an open yāʾ because of the consensus of the reciters.",
    "al-Qurṭubī",
    "preferred"
  ],
  [
    111,
    5,
    "qurtubi",
    17665,
    "Al-Qurṭubī explains jīd as the neck.",
    "al-Qurṭubī",
    "preferred"
  ],
  [
    111,
    5,
    "qurtubi",
    17665,
    "Al-Qurṭubī records that masad can denote a rope made from camel hide or hair, and Abū ʿUbaydah defined it as a rope made from wool.",
    "al-Qurṭubī",
    "reported_only"
  ],
  [
    111,
    5,
    "qurtubi",
    17665,
    "Al-Ḥasan is cited as saying masad refers to ropes twisted from a tree growing in Yemen.",
    "al-Ḥasan",
    "reported_only"
  ],
  [
    111,
    5,
    "qurtubi",
    17665,
    "Al-Ḍaḥḥāk is cited as saying Umm Jamīl used a rope for gathering firewood in this world and that in the Hereafter it becomes a rope of fire.",
    "al-Ḍaḥḥāk",
    "reported_only"
  ],
  [
    111,
    5,
    "qurtubi",
    17665,
    "Ibn ʿAbbās is cited with an interpretation of the rope as a chain seventy cubits long.",
    "Ibn ʿAbbās",
    "reported_only"
  ],
  [
    111,
    5,
    "qurtubi",
    17665,
    "Mujāhid and ʿUrwah b. al-Zubayr are cited as saying the chain enters through her mouth, exits below, and the remainder is wound around her neck.",
    "Mujāhid and ʿUrwah b. al-Zubayr",
    "reported_only"
  ],
  [
    111,
    5,
    "qurtubi",
    17665,
    "Saʿīd b. al-Musayyab is cited as saying Umm Jamīl had a costly jewel necklace which she vowed to spend in hostility to Muhammad and which would become punishment around her neck on the Day of Resurrection.",
    "Saʿīd b. al-Musayyab",
    "reported_only"
  ],
  [
    111,
    5,
    "qurtubi",
    17665,
    "Al-Qurṭubī also records a figurative interpretation in which the rope signifies her being bound away from faith by her prior wretchedness.",
    "al-Qurṭubī",
    "reported_only"
  ],
  [
    111,
    1,
    "tabari",
    5037,
    "Al-Ṭabarī distinguishes the first 'tabbat' as a supplication against Abū Lahab and the second 'wa-tabb' as a statement of fact.",
    "al-Ṭabarī",
    "preferred"
  ],
  [
    111,
    1,
    "tabari",
    5037,
    "Ibn Zayd explains tabb as loss and relates a report in which Abū Lahab rejected a religion that would make him equal with other Muslims.",
    "Ibn Zayd",
    "reported_only"
  ],
  [
    111,
    1,
    "tabari",
    5037,
    "Al-Ṭabarī cites the report that the surah was revealed after the Prophet gathered his close relatives at al-Ṣafā and Abū Lahab replied, 'Perish you; is this why you gathered us?'",
    "Ibn ʿAbbās",
    "reported_only"
  ],
  [
    111,
    1,
    "tabari",
    5037,
    "Al-Ṭabarī identifies Abū Lahab as the Prophet's uncle whose personal name was ʿAbd al-ʿUzzā.",
    "al-Ṭabarī",
    "preferred"
  ],
  [
    111,
    2,
    "tabari",
    5277,
    "Al-Ṭabarī explains that Abū Lahab's wealth did not protect him or repel God's wrath from him.",
    "al-Ṭabarī",
    "preferred"
  ],
  [
    111,
    2,
    "tabari",
    5277,
    "Ibn ʿAbbās is cited as treating Abū Lahab's children as part of what he 'earned.'",
    "Ibn ʿAbbās",
    "reported_only"
  ],
  [
    111,
    5,
    "tabari",
    5280,
    "Al-Ḍaḥḥāk interpreted the rope of masad as a rope from a tree which Umm Jamīl used when gathering firewood.",
    "al-Ḍaḥḥāk",
    "reported_only"
  ],
  [
    111,
    5,
    "tabari",
    5280,
    "Ibn Zayd interpreted the rope as made from a Yemeni tree and also described it as a rope of fire around her neck.",
    "Ibn Zayd",
    "reported_only"
  ],
  [
    111,
    5,
    "tabari",
    5280,
    "ʿUrwah b. al-Zubayr interpreted the rope as an iron chain seventy cubits long.",
    "ʿUrwah b. al-Zubayr",
    "reported_only"
  ],
  [
    111,
    5,
    "tabari",
    5280,
    "Mujāhid interpreted masad as iron and also as the iron rod or fitting of a pulley.",
    "Mujāhid",
    "reported_only"
  ],
  [
    111,
    5,
    "tabari",
    5280,
    "Qatādah interpreted the rope of masad as a necklace of cowrie shells.",
    "Qatādah",
    "reported_only"
  ],
  [
    111,
    5,
    "tabari",
    5280,
    "Al-Ṭabarī prefers understanding masad as a rope twisted from different kinds of material, which he says accounts for reports mentioning fiber, iron, bark and other substances.",
    "al-Ṭabarī",
    "preferred"
  ],
  [
    112,
    2,
    "ibn_kathir",
    48387,
    "Ibn ʿAbbās is cited as interpreting al-Ṣamad as the One upon whom all creation depends for its needs and requests.",
    "Ibn ʿAbbās",
    "reported_only"
  ],
  [
    112,
    2,
    "ibn_kathir",
    48387,
    "Ibn ʿAbbās is also cited as describing al-Ṣamad as the Master perfect in sovereignty, nobility, magnificence, forbearance, knowledge and wisdom, attributes uniquely befitting God.",
    "Ibn ʿAbbās",
    "reported_only"
  ],
  [
    112,
    2,
    "ibn_kathir",
    48387,
    "Abū Wāʾil interpreted al-Ṣamad as the Master whose control is complete.",
    "Abū Wāʾil",
    "reported_only"
  ],
  [
    112,
    2,
    "ibn_kathir",
    48387,
    "A prophetic report cited by Ibn Kathīr connects al-Ṣamad with God's neither begetting nor being begotten, explaining that created beings die and leave inheritance whereas God does not.",
    "Prophet Muhammad",
    "reported_only"
  ],
  [
    112,
    4,
    "ibn_kathir",
    48389,
    "Ibn Kathīr explains 'none comparable to Him' as meaning that God has no child, parent or spouse.",
    "Ibn Kathīr",
    "preferred"
  ],
  [
    112,
    4,
    "ibn_kathir",
    48389,
    "Mujāhid specifically interpreted 'none comparable to Him' as meaning that God has no spouse.",
    "Mujāhid",
    "reported_only"
  ],
  [
    112,
    4,
    "ibn_kathir",
    48389,
    "Ibn Kathīr reasons that because God created and owns everything, no created thing can be His peer, equal or relative.",
    "Ibn Kathīr",
    "preferred"
  ],
  [
    112,
    4,
    "ibn_kathir",
    48389,
    "Ibn Kathīr cites a divine saying in which attributing a son to God is described as abuse, followed by the declaration that God is One, al-Ṣamad, neither begetting nor begotten, with none comparable to Him.",
    "Prophet Muhammad",
    "reported_only"
  ],
  [
    112,
    2,
    "qurtubi",
    17667,
    "Al-Qurṭubī says Arabic language authorities define al-Ṣamad as the master to whom one turns in calamities and needs.",
    "al-Qurṭubī",
    "reported_only"
  ],
  [
    112,
    2,
    "qurtubi",
    17667,
    "Al-Qurṭubī records an interpretation of al-Ṣamad as the Eternal and Everlasting One.",
    "Unspecified earlier interpreters",
    "reported_only"
  ],
  [
    112,
    2,
    "qurtubi",
    17667,
    "Ubayy b. Kaʿb interpreted al-Ṣamad through the following verse, 'He neither begets nor is begotten,' reasoning that created things die and leave inheritance.",
    "Ubayy b. Kaʿb",
    "reported_only"
  ],
  [
    112,
    2,
    "qurtubi",
    17667,
    "ʿAlī, Ibn ʿAbbās, Abū Wāʾil and Sufyān are cited as interpreting al-Ṣamad as the master whose nobility and leadership are complete.",
    "ʿAlī, Ibn ʿAbbās, Abū Wāʾil and Sufyān",
    "reported_only"
  ],
  [
    112,
    2,
    "qurtubi",
    17667,
    "Abū Hurayrah interpreted al-Ṣamad as the One who needs none while all are in need of Him.",
    "Abū Hurayrah",
    "reported_only"
  ],
  [
    112,
    2,
    "qurtubi",
    17667,
    "Al-Ḥasan, ʿIkrimah, al-Ḍaḥḥāk and Ibn Jubayr interpreted al-Ṣamad as the solid One with no hollow interior.",
    "al-Ḥasan, ʿIkrimah, al-Ḍaḥḥāk and Ibn Jubayr",
    "reported_only"
  ],
  [
    112,
    2,
    "qurtubi",
    17667,
    "Al-Qurṭubī prefers the first lexical interpretation of al-Ṣamad—the One to whom people turn in need—because he says the word's derivation supports it.",
    "al-Qurṭubī",
    "preferred"
  ],
  [
    112,
    2,
    "qurtubi",
    17667,
    "Al-Qurṭubī argues that deleting 'Say: He is' from the surah corrupts its meaning because the phrase marks the response to those who asked the Prophet to describe his Lord.",
    "al-Qurṭubī",
    "preferred"
  ],
  [
    112,
    4,
    "qurtubi",
    17669,
    "Al-Qurṭubī explains the verse as meaning that no one is God's like or equivalent.",
    "al-Qurṭubī",
    "preferred"
  ],
  [
    112,
    4,
    "qurtubi",
    17669,
    "Al-Qurṭubī records several accepted pronunciation variants of kufuwan.",
    "al-Qurṭubī",
    "reported_only"
  ],
  [
    112,
    4,
    "qurtubi",
    17669,
    "Al-Qurṭubī cites authentic reports stating that Sūrat al-Ikhlāṣ equals one third of the Qur'an.",
    "Prophet Muhammad",
    "reported_only"
  ],
  [
    112,
    4,
    "qurtubi",
    17669,
    "One explanation recorded by al-Qurṭubī says the surah equals one third of the Qur'an because the Qur'an consists of rulings, promises and threats, and divine names and attributes, while this surah encompasses the names-and-attributes portion.",
    "Unspecified scholars",
    "reported_only"
  ],
  [
    113,
    4,
    "qurtubi",
    17675,
    "Al-Qurṭubī cites a report stating that whoever ties a knot and blows on it has practiced sorcery, and whoever practices sorcery has committed shirk.",
    "Prophet Muhammad",
    "reported_only"
  ],
  [
    113,
    4,
    "qurtubi",
    17675,
    "Al-Qurṭubī records disagreement over blowing during ruqyah: some early authorities disliked or forbade it while others permitted it.",
    "al-Qurṭubī",
    "reported_only"
  ],
  [
    113,
    4,
    "qurtubi",
    17675,
    "Al-Qurṭubī resolves the disagreement by appealing to reports that ʿĀʾishah said the Prophet blew during ruqyah.",
    "al-Qurṭubī",
    "preferred"
  ],
  [
    113,
    4,
    "qurtubi",
    17675,
    "Al-Qurṭubī distinguishes harmful blowing into magical knots from therapeutic blowing without knots, arguing that the two actions do not have the same purpose.",
    "al-Qurṭubī",
    "preferred"
  ],
  [
    113,
    4,
    "qurtubi",
    17675,
    "Al-Qurṭubī says rejecting therapeutic wiping contradicts the Sunnah and cites the Prophet wiping ʿAlī while praying for his recovery.",
    "al-Qurṭubī",
    "preferred"
  ],
  [
    113,
    5,
    "qurtubi",
    17676,
    "Al-Qurṭubī distinguishes malicious envy from munāfasah or ghibṭah, which seeks a similar blessing without wishing for the other person's blessing to disappear.",
    "al-Qurṭubī",
    "preferred"
  ],
  [
    113,
    5,
    "qurtubi",
    17676,
    "Al-Qurṭubī says scholars held that an envier harms when envy becomes manifest in action or speech and drives the envier to seek the other's faults and slips.",
    "al-Qurṭubī",
    "reported_only"
  ],
  [
    113,
    5,
    "qurtubi",
    17676,
    "Al-Qurṭubī states that Iblīs's envy of Adam was the first sin of envy in heaven and Cain's envy of Abel the first on earth.",
    "al-Qurṭubī",
    "preferred"
  ],
  [
    113,
    5,
    "qurtubi",
    17676,
    "Al-Qurṭubī says the surah teaches that God is the creator of all evil and commands refuge from all evils through the phrase 'from the evil of what He created.'",
    "al-Qurṭubī",
    "preferred"
  ],
  [
    113,
    5,
    "qurtubi",
    17676,
    "Al-Qurṭubī says the surah ends with envy to emphasize the magnitude and abundance of its harm.",
    "al-Qurṭubī",
    "preferred"
  ],
  [
    113,
    5,
    "qurtubi",
    17676,
    "A maxim cited by al-Qurṭubī says the envier opposes God's blessing by hating another's blessing, resenting God's apportionment, opposing divine bounty, abandoning God's allies, and aiding Iblīs.",
    "Unspecified wise man",
    "reported_only"
  ],
  [
    113,
    5,
    "qurtubi",
    17676,
    "Al-Qurṭubī characterizes the envier as an enemy to God's blessing.",
    "al-Qurṭubī",
    "preferred"
  ],
  [
    113,
    5,
    "saadi",
    36328,
    "Al-Saʿdī says one must seek refuge with God from the envier's evil and seek to nullify the envier's scheming.",
    "al-Saʿdī",
    "preferred"
  ],
  [
    113,
    5,
    "saadi",
    36328,
    "Al-Saʿdī includes the evil eye within envy, saying the evil eye comes from an envier of wicked nature and corrupt soul.",
    "al-Saʿdī",
    "preferred"
  ],
  [
    113,
    5,
    "saadi",
    36328,
    "Al-Saʿdī says the surah encompasses refuge from every kind of evil, general and specific.",
    "al-Saʿdī",
    "preferred"
  ],
  [
    113,
    5,
    "saadi",
    36328,
    "Al-Saʿdī says the surah indicates that magic has a real existence whose harm and practitioners are to be sought refuge from.",
    "al-Saʿdī",
    "preferred"
  ],
  [
    113,
    3,
    "tabari",
    5254,
    "Ibn ʿAbbās interpreted the ghāsiq as the night.",
    "Ibn ʿAbbās",
    "reported_only"
  ],
  [
    113,
    3,
    "tabari",
    5254,
    "Al-Ḥasan interpreted the ghāsiq as the beginning of night when darkness falls.",
    "al-Ḥasan",
    "reported_only"
  ],
  [
    113,
    3,
    "tabari",
    5254,
    "Mujāhid interpreted ghāsiq as night and waqaba as 'entered.'",
    "Mujāhid",
    "reported_only"
  ],
  [
    113,
    3,
    "tabari",
    5254,
    "Abū Hurayrah is cited as interpreting the ghāsiq as a star.",
    "Abū Hurayrah",
    "reported_only"
  ],
  [
    113,
    3,
    "tabari",
    5254,
    "Ibn Zayd reports an Arab identification of ghāsiq with the setting of the Pleiades and a belief that disease and plague increased at its setting and decreased at its rising.",
    "Ibn Zayd",
    "reported_only"
  ],
  [
    113,
    3,
    "tabari",
    5254,
    "ʿĀʾishah reports that the Prophet pointed to the moon and told her to seek refuge from the evil of this ghāsiq when it becomes dark.",
    "ʿĀʾishah",
    "reported_only"
  ],
  [
    113,
    3,
    "tabari",
    5254,
    "Al-Ṭabarī prefers an inclusive interpretation: night, a setting star, and the moon can all be ghāsiq when darkness enters, because the verse does not restrict the term to one of them.",
    "al-Ṭabarī",
    "preferred"
  ],
  [
    113,
    3,
    "tabari",
    5254,
    "Al-Ṭabarī rejects Qatādah's gloss of waqaba as 'went away,' saying the established Arabic meaning is 'entered.'",
    "al-Ṭabarī",
    "preferred"
  ],
  [
    113,
    4,
    "tabari",
    5153,
    "Ibn ʿAbbās interpreted the verse as referring to incantations mixed with sorcery.",
    "Ibn ʿAbbās",
    "reported_only"
  ],
  [
    113,
    4,
    "tabari",
    5153,
    "Al-Ḥasan interpreted the blowers in knots as sorceresses and sorcerers.",
    "al-Ḥasan",
    "reported_only"
  ],
  [
    113,
    4,
    "tabari",
    5153,
    "Qatādah warned against incantations containing or mixed with sorcery.",
    "Qatādah",
    "reported_only"
  ],
  [
    113,
    4,
    "tabari",
    5153,
    "Mujāhid interpreted the phrase as incantations recited over knots in thread.",
    "Mujāhid",
    "reported_only"
  ],
  [
    113,
    4,
    "tabari",
    5153,
    "ʿIkrimah interpreted the phrase as working with knots in thread.",
    "ʿIkrimah",
    "reported_only"
  ],
  [
    113,
    4,
    "tabari",
    5153,
    "Ibn Zayd interpreted al-naffāthāt as sorceresses acting upon knots.",
    "Ibn Zayd",
    "reported_only"
  ],
  [
    114,
    1,
    "ibn_kathir",
    48385,
    "Ibn Kathīr says lordship, sovereignty and divinity are three divine attributes, and the person seeking protection is commanded to seek refuge in the One who possesses them.",
    "Ibn Kathīr",
    "preferred"
  ],
  [
    114,
    1,
    "ibn_kathir",
    48385,
    "Ibn Kathīr says all things are created by God, owned by Him and subservient to Him.",
    "Ibn Kathīr",
    "preferred"
  ],
  [
    114,
    2,
    "ibn_kathir",
    48395,
    "Ibn Kathīr explains that God is the King and owner of everything.",
    "Ibn Kathīr",
    "preferred"
  ],
  [
    114,
    3,
    "ibn_kathir",
    48396,
    "Ibn Kathīr explains that God is the deity of everything and that all things are subservient to Him.",
    "Ibn Kathīr",
    "preferred"
  ],
  [
    114,
    4,
    "ibn_kathir",
    48397,
    "Ibn Kathīr identifies the whisperer who withdraws as the devil assigned to a human being, who beautifies wicked deeds and seeks to confuse him.",
    "Ibn Kathīr",
    "preferred"
  ],
  [
    114,
    4,
    "ibn_kathir",
    48397,
    "Ibn Kathīr cites the report that every person has a devil-companion, while the Prophet said God helped him against his own companion.",
    "Prophet Muhammad",
    "reported_only"
  ],
  [
    114,
    4,
    "ibn_kathir",
    48397,
    "Ibn Kathīr cites the report that Satan runs through the son of Adam like blood.",
    "Prophet Muhammad",
    "reported_only"
  ],
  [
    114,
    4,
    "ibn_kathir",
    48397,
    "Ibn ʿAbbās interpreted the whisperer as the devil perched upon the human heart, whispering during heedlessness and withdrawing when God is remembered.",
    "Ibn ʿAbbās",
    "reported_only"
  ],
  [
    114,
    4,
    "ibn_kathir",
    48397,
    "A report from Ibn ʿAbbās says the whisperer whispers and then withdraws when he is obeyed.",
    "Ibn ʿAbbās",
    "reported_only"
  ],
  [
    114,
    5,
    "ibn_kathir",
    48398,
    "Ibn Kathīr records two views on 'the breasts of al-nās': one restricts it to human beings while another includes both humans and jinn.",
    "Ibn Kathīr",
    "reported_only"
  ],
  [
    114,
    5,
    "ibn_kathir",
    48398,
    "Ibn Jarīr argues that the word al-nās can include jinn, citing the expression 'men from the jinn.'",
    "Ibn Jarīr",
    "reported_only"
  ],
  [
    114,
    6,
    "ibn_kathir",
    11047,
    "One interpretation recorded by Ibn Kathīr takes 'from jinn and mankind' as explaining whose breasts receive whispers, thereby supporting inclusion of both humans and jinn.",
    "Ibn Kathīr",
    "reported_only"
  ],
  [
    114,
    6,
    "ibn_kathir",
    11047,
    "Another interpretation recorded by Ibn Kathīr takes 'from jinn and mankind' as identifying the whisperers themselves as devils from both jinn and human beings.",
    "Ibn Kathīr",
    "reported_only"
  ],
  [
    114,
    6,
    "ibn_kathir",
    11047,
    "Ibn Kathīr cites a report in which the Prophet praised God for reducing Satan's plot against a man to inward whispering.",
    "Prophet Muhammad",
    "reported_only"
  ],
  [
    114,
    1,
    "qurtubi",
    17677,
    "Al-Qurṭubī explains 'Lord of mankind' as their Master and the One who rectifies their affairs.",
    "al-Qurṭubī",
    "preferred"
  ],
  [
    114,
    1,
    "qurtubi",
    17677,
    "Al-Qurṭubī says mankind are mentioned specifically, although God is Lord of all creation, because of their honored status.",
    "al-Qurṭubī",
    "preferred"
  ],
  [
    114,
    1,
    "qurtubi",
    17677,
    "Al-Qurṭubī says mankind are also mentioned because the command is to seek refuge from their evil, indicating that God is the One who grants refuge from them.",
    "al-Qurṭubī",
    "preferred"
  ],
  [
    114,
    1,
    "qurtubi",
    17677,
    "Al-Qurṭubī cites a report from ʿUqbah b. ʿĀmir in which the Prophet says verses unlike any seen before were revealed in Sūrat al-Nās and Sūrat al-Falaq.",
    "ʿUqbah b. ʿĀmir",
    "reported_only"
  ],
  [
    114,
    1,
    "saadi",
    36329,
    "Al-Saʿdī describes Satan as the origin and source of all evils.",
    "al-Saʿdī",
    "preferred"
  ],
  [
    114,
    1,
    "saadi",
    36329,
    "Al-Saʿdī says the servant should seek aid, refuge and protection through God's lordship over all mankind.",
    "al-Saʿdī",
    "preferred"
  ],
  [
    114,
    2,
    "saadi",
    36330,
    "Al-Saʿdī says all creation falls under God's lordship and dominion and that He holds every creature by its forelock.",
    "al-Saʿdī",
    "preferred"
  ],
  [
    114,
    3,
    "saadi",
    36331,
    "Al-Saʿdī connects God's divinity with the purpose for which humans were created.",
    "al-Saʿdī",
    "preferred"
  ],
  [
    114,
    3,
    "saadi",
    36331,
    "Al-Saʿdī says Satan seeks to cut people off from devotion to God and to make them members of his party among the inhabitants of the Blaze.",
    "al-Saʿdī",
    "preferred"
  ],
  [
    114,
    4,
    "saadi",
    36332,
    "Al-Saʿdī says Satan whispers into people's hearts, beautifying evil and stimulating their desire to commit it.",
    "al-Saʿdī",
    "preferred"
  ],
  [
    114,
    4,
    "saadi",
    36332,
    "Al-Saʿdī says Satan makes good appear ugly and deters people from it by showing it in a distorted form.",
    "al-Saʿdī",
    "preferred"
  ],
  [
    114,
    4,
    "saadi",
    36332,
    "Al-Saʿdī explains khannās as Satan retreating when the servant remembers his Lord and seeks God's aid against him.",
    "al-Saʿdī",
    "preferred"
  ],
  [
    114,
    5,
    "saadi",
    36333,
    "Al-Saʿdī locates Satan's whispering in the hearts or breasts of people and describes it as a continuing effort to distort their perception of good and evil.",
    "al-Saʿdī",
    "preferred"
  ],
  [
    114,
    6,
    "saadi",
    36335,
    "Al-Saʿdī says the whisperer can be from the jinn just as it can be from mankind, which he connects directly to 'from the jinn and mankind.'",
    "al-Saʿdī",
    "preferred"
  ],
  [
    114,
    4,
    "tabari",
    5300,
    "Ibn ʿAbbās is cited as saying every newborn has a whisperer upon the heart who withdraws when the person remembers God and whispers when the person is heedless.",
    "Ibn ʿAbbās",
    "reported_only"
  ],
  [
    114,
    4,
    "tabari",
    5300,
    "Mujāhid describes the whisperer as expanding or coming forward during heedlessness and contracting or withdrawing when God is remembered.",
    "Mujāhid",
    "reported_only"
  ],
  [
    114,
    4,
    "tabari",
    5300,
    "Qatādah identifies the whisperer as Satan, who whispers in the human breast and withdraws when God is remembered.",
    "Qatādah",
    "reported_only"
  ],
  [
    114,
    4,
    "tabari",
    5300,
    "Ibn Zayd says the withdrawing whisperer can be from jinn or humans and reports the saying that a human devil can be more severe because he confronts a person visibly.",
    "Ibn Zayd",
    "reported_only"
  ],
  [
    114,
    4,
    "tabari",
    5300,
    "Another report from Ibn ʿAbbās says Satan commands a person toward obedience to Satan and then withdraws when he is obeyed.",
    "Ibn ʿAbbās",
    "reported_only"
  ],
  [
    114,
    4,
    "tabari",
    5300,
    "Al-Ṭabarī prefers a general interpretation: Satan may whisper toward disobedience or away from obedience, and he withdraws when the servant remembers God's command, obeys God and resists Satan.",
    "al-Ṭabarī",
    "preferred"
  ]  ,
  [
    110,
    3,
    "jalalayn",
    55672,
    "Al-Jalālayn reports that after this surah was revealed, the Prophet frequently said, 'Glory and praise be to Allah; I seek Allah's forgiveness and repent to Him.'",
    "al-Jalālayn",
    "preferred"
  ],
  [
    110,
    3,
    "jalalayn",
    55672,
    "Al-Jalālayn says the Prophet understood from this surah that his appointed end had drawn near.",
    "al-Jalālayn",
    "preferred"
  ],
  [
    110,
    3,
    "jalalayn",
    55672,
    "Al-Jalālayn dates the conquest of Mecca to Ramadan in the eighth year.",
    "al-Jalālayn",
    "preferred"
  ],
  [
    110,
    3,
    "jalalayn",
    55672,
    "Al-Jalālayn dates the Prophet's death to Rabiʿ al-Awwal in the tenth year.",
    "al-Jalālayn",
    "preferred"
  ],
  [
    111,
    1,
    "jalalayn",
    55673,
    "Al-Jalālayn reports that when the Prophet warned his people of a severe punishment, Abu Lahab cursed him, after which the opening of Sūrat al-Masad was revealed.",
    "al-Jalālayn",
    "preferred"
  ],
  [
    111,
    1,
    "jalalayn",
    55673,
    "Al-Jalālayn interprets the first 'tabbat' as 'perished' or 'was ruined' and treats the clause as a supplication against Abu Lahab.",
    "al-Jalālayn",
    "preferred"
  ],
  [
    111,
    1,
    "jalalayn",
    55673,
    "Al-Jalālayn interprets 'wa-tabb' as stating that Abu Lahab himself was ruined, treating this second clause as a declarative statement.",
    "al-Jalālayn",
    "preferred"
  ],
  [
    111,
    1,
    "jalalayn",
    55673,
    "Al-Jalālayn reports that when warned of punishment, Abu Lahab claimed he could ransom himself with his wealth and children, after which verse 111:2 was revealed.",
    "al-Jalālayn",
    "preferred"
  ]

]
OWN={"tabari":"al-Ṭabarī","ibn_kathir":"Ibn Kathīr","qurtubi":"al-Qurṭubī","jalalayn":"al-Jalālayn","saadi":"al-Saʿdī"}
WORK_ID={"tabari":1,"ibn_kathir":2,"qurtubi":3,"jalalayn":54,"saadi":55}

def req(url, method="GET", body=None, headers=None):
    data=None if body is None else json.dumps(body,ensure_ascii=False).encode()
    q=urllib.request.Request(url,data=data,method=method,headers=headers or HDR)
    try:
        with urllib.request.urlopen(q,timeout=90) as r:
            s=r.read().decode()
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"HTTP {e.code} {e.read().decode(errors='replace')[:1800]}") from e
    return json.loads(s) if s.strip() else None

def get(table,params):
    return req(f"{SB}/rest/v1/{table}?"+urllib.parse.urlencode(params,safe="(),.*:")) or []

def post(table,body):
    h=dict(HDR); h["Prefer"]="return=representation"
    return req(f"{SB}/rest/v1/{table}","POST",body,h)

def main():
    expected_sources={(s,a,sch,eid) for s,a,sch,eid,*_ in DATA}
    ids=sorted({eid for _,_,_,eid,*_ in DATA})
    src=get("tafsir_entries",{"select":"id,sura,aya,scholar_key","id":f"in.({','.join(map(str,ids))})","limit":"200"})
    byid={r["id"]:r for r in src}
    observed={(byid[eid]["sura"],byid[eid]["aya"],byid[eid]["scholar_key"],eid) for eid in ids if eid in byid}
    if expected_sources != observed:
        raise SystemExit(f"SOURCE_ID_MISMATCH expected={sorted(expected_sources)} observed={sorted(observed)}")

    existing=get("propositions",{"select":"id,tafsir_entry_id,statement_en,extracted_by","tafsir_entry_id":f"in.({','.join(map(str,ids))})","limit":"10000"})
    have={(r["tafsir_entry_id"],r["statement_en"]):r["id"] for r in existing}
    pids=[r["id"] for r in existing]
    voice_have={r["proposition_id"] for r in get("proposition_voice_chain",{"select":"proposition_id","proposition_id":f"in.({','.join(map(str,pids))})" if pids else "eq.-1","limit":"10000"})}
    evidence_have={r["proposition_id"] for r in get("proposition_evidence",{"select":"proposition_id","proposition_id":f"in.({','.join(map(str,pids))})" if pids else "eq.-1","limit":"10000"})}

    inserted=skipped=voice_added=evidence_added=0
    for s,a,sch,eid,statement,speaker,position in DATA:
        key=(eid,statement)
        if key in have:
            pid=have[key]; skipped+=1
        else:
            p=post("propositions",{
                "claim_type_id":43,
                "statement_en":statement,
                "extracted_by":f"{TAG}:{s}:{sch}",
                "speaker_type":"unspecified",
                "speaker_name":speaker,
                "assertion_mode":"explicit",
                "status":"active",
                "source_type":"tafsir_entry",
                "tafsir_entry_id":eid,
                "extraction_validity":"verified",
                "verification_state":"source_language_proposition_verified",
                "attribution_fidelity":"accurate_paraphrase",
                "quranic_textual_support":"not_stated",
                "mufassir_own_position":position
            })[0]
            pid=p["id"]; have[key]=pid; inserted+=1

        if pid not in voice_have:
            is_own=(speaker==OWN.get(sch))
            post("proposition_voice_chain",{
                "proposition_id":pid,
                "reporting_work_id":WORK_ID[sch],
                "originating_voice_type":"exegete_own_view" if is_own else "named_earlier_exegete",
                "originating_voice_name":None if is_own else speaker
            })
            voice_have.add(pid); voice_added+=1

        if pid not in evidence_have:
            eu=post("evidence_units",{
                "unit_type":"single_named_attribution",
                "attributed_authority_name":speaker,
                "content_summary":statement,
                "independence_state":"unknown"
            })[0]
            post("proposition_evidence",{
                "proposition_id":pid,
                "evidence_unit_id":eu["id"],
                "semantic_link_note":"Deterministic repair from the linked tafsir source entry.",
                "linked_by":TAG
            })
            evidence_have.add(pid); evidence_added+=1

    repaired=get("propositions",{"select":"id,tafsir_entry_id,statement_en","extracted_by":f"like.{TAG}%","limit":"10000"})
    if len(repaired)!=len(DATA):
        raise SystemExit(f"POSTFLIGHT_COUNT_FAIL rows={len(repaired)} expected={len(DATA)}")
    rpids=[r["id"] for r in repaired]
    rv={r["proposition_id"] for r in get("proposition_voice_chain",{"select":"proposition_id","proposition_id":f"in.({','.join(map(str,rpids))})","limit":"10000"})}
    re={r["proposition_id"] for r in get("proposition_evidence",{"select":"proposition_id","proposition_id":f"in.({','.join(map(str,rpids))})","limit":"10000"})}
    if len(rv)!=len(DATA) or len(re)!=len(DATA):
        raise SystemExit(f"POSTFLIGHT_LINK_FAIL voices={len(rv)}/{len(DATA)} evidence={len(re)}/{len(DATA)}")
    print(f"PARTIAL_REPAIR_OK inserted={inserted} skipped={skipped} voices_added={voice_added} evidence_added={evidence_added} propositions={len(repaired)} source_entries={len(ids)}")

if __name__=="__main__":
    main()
