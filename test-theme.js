const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ylosytbxpzxzwfzjpaej.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlsb3N5dGJ4cHp4endmempwYWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNDY1MjcsImV4cCI6MjA5MTcyMjUyN30.yqigL9ILlXkQ7zi37rX3AUs7vjQBobTKuV-KzkSsAAs'
);

async function test() {
  console.log('Testing API fetch for Satan and Iblis theme...\n');
  
  const url = 'https://ylosytbxpzxzwfzjpaej.supabase.co/rest/v1/theme_verses?select=sura,aya,arabic,arabic_transliteration,english,tigrinya,amharic&theme=eq.Satan%20and%20Iblis&limit=3';
  
  const headers = {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlsb3N5dGJ4cHp4endmempwYWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNDY1MjcsImV4cCI6MjA5MTcyMjUyN30.yqigL9ILlXkQ7zi37rX3AUs7vjQBobTKuV-KzkSsAAs',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlsb3N5dGJ4cHp4endmempwYWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNDY1MjcsImV4cCI6MjA5MTcyMjUyN30.yqigL9ILlXkQ7zi37rX3AUs7vjQBobTKuV-KzkSsAAs'
  };
  
  try {
    const response = await fetch(url, { headers });
    const data = await response.json();
    
    console.log('API Response:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data && data.length > 0) {
      console.log('\n✅ Data returned successfully');
      console.log(`   Tigrinya present: ${!!data[0].tigrinya}`);
      console.log(`   Amharic present: ${!!data[0].amharic}`);
      console.log(`   Translit present: ${!!data[0].arabic_transliteration}`);
    }
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

test();
