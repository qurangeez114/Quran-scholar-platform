const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ylosytbxpzxzwfzjpaej.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlsb3N5dGJ4cHp4endmempwYWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNDY1MjcsImV4cCI6MjA5MTcyMjUyN30.yqigL9ILlXkQ7zi37rX3AUs7vjQBobTKuV-KzkSsAAs'
);

async function checkData() {
  console.log('Checking Satan and Iblis theme for data quality...\n');
  
  try {
    const { data, error } = await supabase
      .from('theme_verses')
      .select('sura,aya,tigrinya,amharic')
      .eq('theme', 'Satan and Iblis')
      .limit(5);
    
    if (error) {
      console.error('Error:', error);
      return;
    }
    
    console.log('Satan and Iblis theme data:');
    data.forEach(v => {
      console.log(`\n${v.sura}:${v.aya}`);
      console.log(`  Tigrinya: ${v.tigrinya.substring(0, 60)}...`);
      console.log(`  Amharic: ${v.amharic.substring(0, 60)}...`);
      
      // Check if it's placeholder
      const isTigrinyaPlaceholder = v.tigrinya.includes('ትግርኛ ትርጉም');
      const isAmharicPlaceholder = v.amharic.includes('አማርኛ ትርጉም');
      
      console.log(`  Tigrinya is placeholder: ${isTigrinyaPlaceholder}`);
      console.log(`  Amharic is placeholder: ${isAmharicPlaceholder}`);
    });
    
    // Count placeholders vs real data
    console.log('\n\nCounting data quality across theme_verses:');
    
    const { data: all, error: error2 } = await supabase
      .from('theme_verses')
      .select('tigrinya,amharic', { count: 'exact' });
    
    let realTigrinya = 0, realAmharic = 0;
    
    all.forEach(v => {
      if (v.tigrinya && !v.tigrinya.includes('ትግርኛ ትርጉም')) realTigrinya++;
      if (v.amharic && !v.amharic.includes('አማርኛ ትርጉም')) realAmharic++;
    });
    
    console.log(`Total rows: ${all.length}`);
    console.log(`Real Tigrinya data: ${realTigrinya} (${((realTigrinya/all.length)*100).toFixed(1)}%)`);
    console.log(`Real Amharic data: ${realAmharic} (${((realAmharic/all.length)*100).toFixed(1)}%)`);
    console.log(`Placeholder Tigrinya: ${all.length - realTigrinya}`);
    console.log(`Placeholder Amharic: ${all.length - realAmharic}`);
    
  } catch (err) {
    console.error('Fatal error:', err);
  }
}

checkData();
