import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ylosytbxpzxzwfzjpaej.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlsb3N5dGJ4cHp4endmempwYWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNDY1MjcsImV4cCI6MjA5MTcyMjUyN30.yqigL9ILlXkQ7zi37rX3AUs7vjQBobTKuV-KzkSsAAs'
);

export default async (req, context) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    // Fetch L2 categories under "Sexuality, Spouses & Ḥūr"
    const { data: level2, error: l2Error } = await supabase
      .from('proposition_hierarchies')
      .select(`
        id,
        name,
        level,
        parent_id,
        quranic_anchors,
        scholarly_debate_notes,
        proposition_hierarchies!parent_id (
          id,
          name,
          level,
          quranic_anchors,
          scholarly_debate_notes,
          hadith_propositions (
            id,
            name,
            description,
            source_status,
            quranic_base,
            hadith_reference,
            hadith_grade,
            scholarly_note,
            warning,
            confidence_score
          )
        )
      `)
      .eq('level', 2)
      .in('name', [
        'Sexuality, Spouses & Ḥūr',
        'Marriage & Companionship',
        'Physical Appearance & Youth',
        'Food & Drink',
        'Gardens, Rivers & Dwellings',
        'Pleasure, Joy & Desire',
        'Peace, Security & Immortality',
        'Spiritual Rewards & Divine Presence',
        'Ranks & Degrees of Paradise',
        'Descriptions of the People of Paradise',
        'Quranic–Hadith Detail Expansion & Disputes'
      ]);

    if (l2Error) {
      console.error('Supabase error:', l2Error);
      throw l2Error;
    }

    // Transform into drill-down structure
    const hierarchyWithPropositions = (level2 || []).map((l2Category) => ({
      id: l2Category.id,
      name: l2Category.name,
      level: 2,
      tertiary_count: (l2Category['proposition_hierarchies!parent_id'] || []).length,
      tertiary: (l2Category['proposition_hierarchies!parent_id'] || []).map((l3Category) => ({
        id: l3Category.id,
        name: l3Category.name,
        level: 3,
        proposition_count: (l3Category.hadith_propositions || []).length,
        propositions: (l3Category.hadith_propositions || []).map((prop) => ({
          id: prop.id,
          name: prop.name,
          source_status: prop.source_status || 'inferred_interpretation',
          reference: prop.hadith_reference,
          hadith_grade: prop.hadith_grade,
          quranic_base: prop.quranic_base,
          scholarly_note: prop.scholarly_note,
          warning: prop.warning,
          confidence: prop.confidence_score || 0.75
        }))
      }))
    }));

    return new Response(JSON.stringify(hierarchyWithPropositions), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Proposition fetch error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch propositions', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};
