import { supabase } from '../supabaseClient';

export const DEFAULT_RATE_TYPES = [
  { id: '1', dbId: 1, name: '22K Gold', purity: '91.6%', description: '916 Hallmark Standard Gold', status: 'ACTIVE' },
  { id: '2', dbId: 2, name: '24K Gold', purity: '99.9%', description: 'Pure 24 Karat Gold Bar / Coin', status: 'ACTIVE' },
  { id: '3', dbId: 3, name: '18K Gold', purity: '75.0%', description: '18 Karat Diamond little_rr Gold', status: 'ACTIVE' },
  { id: '4', dbId: 4, name: 'Silver (925)', purity: '92.5%', description: 'Sterling Silver 925', status: 'ACTIVE' }
];

const LOCAL_STORAGE_KEY = 'god_rate_types_data';

const getLocalRateTypes = () => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { }
  return DEFAULT_RATE_TYPES;
};

const setLocalRateTypes = (list) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch (e) { }
};

const normalizeRateType = (row) => ({
  id: row.id,
  dbId: row.id,
  name: row.name,
  purity: row.purity || '',
  description: row.description || '',
  status: row.status ? row.status.toUpperCase() : 'ACTIVE',
  createdAt: row.created_at || new Date().toISOString()
});

export async function getRateTypesFromSupabase(activeOnly = false) {
  try {
    let query = supabase
      .from('rate_types')
      .select('*')
      .order('id', { ascending: true });

    if (activeOnly) {
      query = query.eq('status', 'ACTIVE');
    }

    const { data, error } = await query;

    if (error) {
      console.warn('Supabase rate_types table:', error.message);
      // Fallback to local storage
      let items = getLocalRateTypes();
      if (activeOnly) items = items.filter(i => i.status === 'ACTIVE');
      return { data: items, usingFallback: true };
    }

    if (!data || data.length === 0) {
      let items = getLocalRateTypes();
      if (activeOnly) items = items.filter(i => i.status === 'ACTIVE');
      return { data: items, isEmpty: true };
    }

    return { data: data.map(normalizeRateType) };
  } catch (err) {
    console.error('Error fetching rate types:', err);
    let items = getLocalRateTypes();
    if (activeOnly) items = items.filter(i => i.status === 'ACTIVE');
    return { data: items, usingFallback: true };
  }
}

export async function createRateTypeInSupabase(rateType) {
  const payload = {
    name: rateType.name.trim(),
    purity: (rateType.purity || '').trim(),
    description: (rateType.description || '').trim(),
    status: rateType.status ? rateType.status.toUpperCase() : 'ACTIVE'
  };

  try {
    const { data, error } = await supabase
      .from('rate_types')
      .insert([payload])
      .select();

    if (error) throw error;
    return { success: true, data: data ? normalizeRateType(data[0]) : null };
  } catch (err) {
    console.warn('Creating rate type in fallback local storage due to:', err.message);
    const current = getLocalRateTypes();
    const newId = Date.now();
    const newItem = { id: newId, dbId: newId, ...payload, createdAt: new Date().toISOString() };
    const updated = [...current, newItem];
    setLocalRateTypes(updated);
    return { success: true, data: newItem, isLocal: true };
  }
}

export async function updateRateTypeInSupabase(id, updates) {
  const payload = {
    name: updates.name.trim(),
    purity: (updates.purity || '').trim(),
    description: (updates.description || '').trim(),
    status: updates.status ? updates.status.toUpperCase() : 'ACTIVE'
  };

  try {
    const { data, error } = await supabase
      .from('rate_types')
      .update(payload)
      .eq('id', id)
      .select();

    if (error) throw error;
    return { success: true, data: data ? normalizeRateType(data[0]) : null };
  } catch (err) {
    console.warn('Updating rate type in fallback local storage due to:', err.message);
    const current = getLocalRateTypes();
    const updated = current.map(item => item.id === id || item.dbId === id ? { ...item, ...payload } : item);
    setLocalRateTypes(updated);
    return { success: true, isLocal: true };
  }
}

export async function deleteRateTypeInSupabase(id, name) {
  try {
    // 1. Check if daily_rates has records using this type name
    if (name) {
      const { error: rateErr, count } = await supabase
        .from('daily_rates')
        .select('id', { count: 'exact' })
        .eq('type', name);

      if (!rateErr && count && count > 0) {
        return {
          success: false,
          error: `Cannot delete Rate Type "${name}" because ${count} record(s) in Live Rates are using this type. Please update or delete those rate entries first.`
        };
      }
    }

    const { error } = await supabase
      .from('rate_types')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.warn('Deleting rate type in fallback local storage due to:', err.message);
    const current = getLocalRateTypes();
    const updated = current.filter(item => item.id !== id && item.dbId !== id);
    setLocalRateTypes(updated);
    return { success: true, isLocal: true };
  }
}
