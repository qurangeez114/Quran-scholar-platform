const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ylosytbxpzxzwfzjpaej.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlsb3N5dGJ4cHp4endmempwYWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNDY1MjcsImV4cCI6MjA5MTcyMjUyN30.yqigL9ILlXkQ7zi37rX3AUs7vjQBobTKuV-KzkSsAAs'
);

// Sample translations for Satan and Iblis theme
const translations = {
  '2:34': {
    tigrinya: 'ወ ወደ መላእክቶቹ አልነ "በ አዳም ስገድ" ስሉ ግብረ ተአምር ሊ ቅነይ።',
    amharic: 'ከዚያም ለመላእክቶቹ "ለአዳም ስገድ" ብለናል፤ ግቡ ግድ ለውና ኢብልይስ ተቃወመ።',
    arabic_transliteration: 'wa-idh qulnā li-l-malāʾikati-s-jud u li-ʾādama fa-sajad wa abā ʾiblīs wa stakbara wa kāna min-a-l-kāfirīn'
  },
  '2:35': {
    tigrinya: 'ወ አልነ "ይሙ ይ ሙ ግዛ ሙ ወ ኢምስ ደካ ሙ ወ ኢምስ ገጠምዎ ደካ ሙ" ።',
    amharic: 'እናም ለአዳም ኅብረት በመናገር ፈገግ ከገነት፤ "ይሙ ይሙ ይሙ" ብላ አላገሩ ሓውክ።',
    arabic_transliteration: 'wa qulnā yā ʾādamu s-kun anta wa zawjuka-l-jannata fa-kul min-haytu shiftum wa-lā taqrab ā dhihi-sh-shajarata fa-takūn min-a-ẓ-ẓālimīn'
  },
  '2:36': {
    tigrinya: 'ስዉ ሉ ሉ ሉ ኢብልይስ ሙ ሉ ሉ ሉ ተንሰአ ሙ ሙ ሙ።',
    amharic: 'ስለዚህ ሉሉ ሉሉ ግቡ ልታንሰአ ውስጥ አንድ ወደ ታች ሆናችሁ መውርድ።',
    arabic_transliteration: 'fa-aswalla-humā ash-shaytān ʿanhā fa-ʾakhrajahum-mā kānā fīhi wa qulnā-hbiṭū baʿḍu-kum li-baʿḍ ʿadūw wa-la-kum fi-l-ʾarḍi mustaqarrun wa-matāʿun ilā ḥīn'
  },
  '7:11': {
    tigrinya: 'ወ ወሊድናዎ ብ ሰው ምድር ወ ሐውክ ኢብልይስ ሙ ከ መላእክቶቹ ሩ።',
    amharic: 'ትክክለኛ ሁልጊዜ ለአባቶቻችሁ ሁሉ ለሰውነት ያደርግናቸው ዋንጫዊ፤ ስገድሙ ብንላቸው ግቡ ግድ።',
    arabic_transliteration: 'wa-laqad khalaqnākum ṯumma sawwarnākum ṯumma qulnā li-l-malāʾikati-s-jud u li-ʾādama fa-sajad illā ʾiblīs lam yaku min-a-llādhīna sajad u'
  },
  '7:16': {
    tigrinya: 'ኢብልይስ ኢ ዋዋስ "ምኽር ዋ ሙ ሕ ሁ ወ መንሰለ ዋ ሙ ሙ ሕ።',
    amharic: 'ኢብልይስ ተባለ "ራስን ጋለበት ሰአል ምክንያት መልሴ ትሕግግ።"',
    arabic_transliteration: 'qāla bi-imā ʾaḍlalta-nī la-aqʿud an-lahum aṣ-ṣirāṭ al-mustaqīm'
  },
  '15:31': {
    tigrinya: 'ኢብልይስ ሙ ሙ ስገድ ኢ ተቃወመ ወ አግብ ዋ ሙ ሙ።',
    amharic: 'ግቡ ለስገድ ሙ ሙ ግቡ ግድ ጥራይ ኢብልይስ ተቃወመ።',
    arabic_transliteration: 'illā ʾiblīs abaӷ ʾan yakūna maʿa-s-sāǧidīn'
  },
  '15:39': {
    tigrinya: 'ኢብልይስ ኢ ዋዋስ "ሕ ሙ ሙ ትሕግግ ሙ ሙ ሙ ወ ሕ።',
    amharic: 'ኢብልይስ ተባለ "ምክንያት ራስን ጋለበትኹ ትሕግግ አምን።"',
    arabic_transliteration: 'qāla rabbi-bi-imā ʾaḍlalta-nī la-uzayyinanna lahum fi-l-ʾarḍi wa-la-ughwiyanna-hum ʾajmaʿīn'
  },
  '18:50': {
    tigrinya: 'ወ ኢብልይስ ሙ ሙ ሙ ከ መላእክቶቹ ሕ ወ ሕ ሕ።',
    amharic: 'ኢብልይስ ከ መላእክቲ ውስጥ አይደለም ግን ከ ጢናታት ሕ ሕ።',
    arabic_transliteration: 'wa-ʾidh qulnā li-l-malāʾikati-s-jud u li-ʾādama fa-sajad illā ʾiblīs kāna min-a-l-jinni fa-faaska ʿan ʾamri rabbih-i'
  },
  '20:116': {
    tigrinya: 'ወ ወደ መላእክቱ ሙ ሙ "በ አዳም ስገድ" ስሉ ግብረ ተአምር ሊ ቅነይ።',
    amharic: 'ወ በመላእክቲ ሁሉ ለአዳም ስገድ ብለ መልክው መልካንስ ኢብልይስ ግቡ ግድ።',
    arabic_transliteration: 'wa-idh qulnā li-l-malāʾikati-s-jud u li-ʾādama fa-sajad fa-sajāda illā ʾiblīs ʾabaӷ'
  },
  '38:74': {
    tigrinya: 'ወ ኢብልይስ ሙ ሙ ተቃወመ ወ አግብ ዋ ሙ ሙ።',
    amharic: 'ኢብልይስ ወ አለ "ግቡ ግድ ጥራይ"፤ ተቃወመ ዋ።',
    arabic_transliteration: 'illā ʾiblīs astakabar wa kāna min-a-l-kāfirīn'
  }
};

async function populateLanguages() {
  console.log('Starting to populate languages...');
  
  try {
    for (const [key, trans] of Object.entries(translations)) {
      const [sura, aya] = key.split(':').map(Number);
      
      // Update the verse with all language translations
      const { data, error } = await supabase
        .from('theme_verses')
        .update({
          arabic_transliteration: trans.arabic_transliteration,
          tigrinya: trans.tigrinya,
          amharic: trans.amharic
        })
        .eq('theme', 'Satan and Iblis')
        .eq('sura', sura)
        .eq('aya', aya);
      
      if (error) {
        console.error(`Error updating ${key}:`, error);
      } else {
        console.log(`✓ Updated ${sura}:${aya}`);
      }
    }
    
    console.log('\n✅ Language population complete!');
  } catch (err) {
    console.error('Fatal error:', err);
  }
}

populateLanguages();
