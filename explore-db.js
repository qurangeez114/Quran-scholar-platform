const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ylosytbxpzxzwfzjpaej.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlsb3N5dGJ4cHp4endmempwYWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNDY1MjcsImV4cCI6MjA5MTcyMjUyN30.yqigL9ILlXkQ7zi37rX3AUs7vjQBobTKuV-KzkSsAAs'
);

async function exploreTables() {
  console.log('Exploring Supabase tables for Tigrinya/Amharic translations...\n');
  
  // Try common table names
  const tableNames = [
    'quran_verses',
    'verses', 
    'quran_text',
    'translations',
    'quran_translations',
    'language_translations',
    'tigrinya_translations',
    'amharic_translations',
    'quran',
    'all_verses',
    'verse_translations'
  ];
  
  console.log('Checking for tables with translation data:\n');
  
  for (const tableName of tableNames) {
    try {
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: false })
        .limit(1);
      
      if (data && !error) {
        console.log(`✅ TABLE FOUND: ${tableName}`);
        console.log(`   Columns: ${Object.keys(data[0]).join(', ')}`);
        if (data[0]) {
          console.log(`   Sample row keys: ${Object.keys(data[0]).slice(0, 5).join(', ')}`);
        }
        console.log('');
      }
    } catch (e) {
      // Silently skip tables that don't exist
    }
  }
  
  // Now specifically look for tigrinya/amharic in theme_verses
  console.log('Checking theme_verses for non-placeholder translations:\n');
  
  try {
    const { data, error } = await supabase
      .from('theme_verses')
      .select('sura,aya,tigrinya,amharic')
      .limit(5);
    
    if (data && !error) {
      console.log('Sample from theme_verses:');
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (e) {
    console.log('Error querying theme_verses:', e.message);
  }
}

exploreTables();
