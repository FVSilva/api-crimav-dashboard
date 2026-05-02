export function normalizeCF(arr, prefix = "") {
  const out = {};

  (arr || []).forEach((f) => {
    const key = prefix + f.field_name;

    const val = (f.values || [])
      .map((v) => v.value)
      .join(", ");

    out[key] = val || null;
  });

  return out;
}