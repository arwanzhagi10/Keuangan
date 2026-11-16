UPDATE public.transactions
SET
  category = CASE
    WHEN lower(btrim(description)) = 'keluarga' THEN 'Keluarga'
    WHEN lower(btrim(description)) IN ('pakan entog', 'bohlam entog') THEN 'Peliharaan'
    WHEN lower(btrim(description)) = 'olahraga' THEN 'Kesehatan'
  END,
  description = CASE
    WHEN lower(btrim(description)) = 'keluarga' THEN 'Keluarga'
    ELSE description
  END
WHERE type = 'expense'
  AND lower(btrim(category)) = 'lainnya'
  AND lower(btrim(description)) IN ('keluarga', 'pakan entog', 'bohlam entog', 'olahraga');
