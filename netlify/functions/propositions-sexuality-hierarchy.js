const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://ylosytbxpzxzwfzjpaej.supabase.co',
  process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
);

exports.handler = async (event, context) => {
  try {
    const { theme_id } = event.queryStringParameters || {};
    
    if (!theme_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'theme_id required' })
      };
    }

    // Fetch all hierarchy levels for this theme
    const { data: hierarchies, error: hierError } = await supabase
      .from('proposition_hierarchies')
      .select(`
        id,
        level1_name,
        level2_name,
        level3_name,
        level4_name,
        description,
        hierarchy_path,
        quranic_anchors,
        scholarly_debate_notes
      `)
      .eq('theme_id', theme_id)
      .order('level2_name, level3_name, level4_name');

    if (hierError) throw hierError;

    // Fetch propositions linked to this theme
    const { data: propositions, error: propError } = await supabase
      .from('hadith_propositions')
      .select(`
        id,
        hierarchy_id,
        proposition_text,
        description,
        source_status,
        quranic_anchors,
        hadith_references,
        confidence
      `)
      .eq('theme_id', theme_id);

    if (propError) throw propError;

    // Organize hierarchically
    const level2Map = {};
    hierarchies.forEach(h => {
      if (!level2Map[h.level2_name]) {
        level2Map[h.level2_name] = {
          level2_name: h.level2_name,
          level3_items: {}
        };
      }
      
      if (!level2Map[h.level2_name].level3_items[h.level3_name]) {
        level2Map[h.level2_name].level3_items[h.level3_name] = {
          level3_name: h.level3_name,
          propositions: []
        };
      }
    });

    // Attach propositions to level 3
    propositions.forEach(prop => {
      const hier = hierarchies.find(h => h.id === prop.hierarchy_id);
      if (hier && level2Map[hier.level2_name]?.level3_items[hier.level3_name]) {
        level2Map[hier.level2_name].level3_items[hier.level3_name].propositions.push(prop);
      }
    });

    // Convert to array format
    const result = Object.values(level2Map).map(l2 => ({
      ...l2,
      level3_items: Object.values(l2.level3_items)
    }));

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(result)
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
