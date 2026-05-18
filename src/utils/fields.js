export function normalizeCF(arr, prefix = "") {
  const out = {};

  (arr || []).forEach((field) => {
    const nameKey = prefix + (field.field_name || `field_${field.field_id}`);
    const idKey = prefix + `field_${field.field_id}`;

    const val = (field.values || [])
      .map((v) => v.value)
      .filter(Boolean)
      .join(", ");

    out[nameKey] = val || null;
    out[idKey] = val || null;
  });

  return out;
}