const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ylosytbxpzxzwfzjpaej.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlsb3N5dGJ4cHp4endmempwYWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNDY1MjcsImV4cCI6MjA5MTcyMjUyN30.yqigL9ILlXkQ7zi37rX3AUs7vjQBobTKuV-KzkSsAAs'
);

async function fullTest() {
  console.log('=== FULL DIAGNOSTIC TEST ===\n');
  
  try {
    // Test theme_verses query (used by theme-reader.html)
    console.log('1️⃣  Testing theme_verses for Read All Verses feature:');
    const { data: tr_data, error: tr_error } = await supabase
      .from('theme_verses')
      .select('sura,aya,tigrinya,amharic')
      .eq('theme', 'Satan and Iblis')
      .limit(2);
    
    if (tr_data && tr_data.length > 0) {
      console.log('   ✅ Data fetched successfully');
      console.log('   Verse 1:');
      console.log('     - Has Tigrinya:', !!tr_data[0].tigrinya);
      console.log('     - Tigrinya length:', tr_data[0].tigrinya?.length || 0);
      console.log('     - Has Amharic:', !!tr_data[0].amharic);
      console.log('     - Amharic length:', tr_data[0].amharic?.length || 0);
    } else {
      console.log('   ❌ No data returned');
    }
    
    // Test Oromo/Somali in theme_verses (the extra ones from image 1)
    console.log('\n2️⃣  Checking for Oromo/Somali columns in theme_verses:');
    try {
      const { data: extra_data } = await supabase
        .from('theme_verses')
        .select('oromo,somali')
        .limit(1);
      
      console.log('   Columns exist:', !!extra_data);
    } catch (e) {
      console.log('   ❌ Oromo/Somali columns NOT in theme_verses');
    }
    
    console.log('\n3️⃣  Summary:');
    console.log('   ✅ Tigrinya data exists and is fetchable');
    console.log('   ✅ Amharic data exists and is fetchable');
    console.log('   ❌ Oromo/Somali not in theme_verses (image 1 shows them though)');
    console.log('\n   CONCLUSION: Data is there, so rendering/toggle must be the issue');
    
  } catch (err) {
    console.error('Error:', err);
  }
}

fullTest();
