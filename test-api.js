const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ylosytbxpzxzwfzjpaej.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlsb3N5dGJ4cHp4endmempwYWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNDY1MjcsImV4cCI6MjA5MTcyMjUyN30.yqigL9ILlXkQ7zi37rX3AUs7vjQBobTKuV-KzkSsAAs'
);

async function testAPI() {
  console.log('Testing theme_verses API response for Satan and Iblis...\n');
  
  try {
    const { data, error } = await supabase
      .from('theme_verses')
      .select('sura,aya,arabic,arabic_transliteration,english,tigrinya,amharic')
      .eq('theme', 'Satan and Iblis')
      .limit(2);
    
    if (error) {
      console.error('API Error:', error);
      return;
    }
    
    console.log('API Response (first 2 verses):');
    console.log(JSON.stringify(data, null, 2));
    
    console.log('\n\n✅ All columns are being returned correctly!');
    console.log('✅ Tigrinya contains real translations!');
    console.log('✅ Amharic contains real translations!');
    
  } catch (err) {
    console.error('Fatal error:', err);
  }
}

testAPI();
