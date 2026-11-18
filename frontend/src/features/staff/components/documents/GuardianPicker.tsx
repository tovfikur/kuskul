import { useEffect, useMemo, useState } from "react";
import { Autocomplete, CircularProgress, TextField } from "@mui/material";

import { getGuardians, type Guardian } from "../../../../api/people";

export type GuardianOption = {
  id: string;
  label: string;
  id_number: string | null;
};

function guardianLabel(g: Guardian): string {
  const name = (g.full_name || "").trim();
  if (g.id_number) return `${name} (${g.id_number})`;
  return name;
}

type Props = {
  label: string;
  value: GuardianOption | null;
  onChange: (next: GuardianOption | null) => void;
  disabled?: boolean;
};

export function GuardianPicker(props: Props) {
  const { label, value, onChange, disabled } = props;
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<GuardianOption[]>([]);

  const query = useMemo(() => inputValue.trim(), [inputValue]);

  useEffect(() => {
    let alive = true;
    if (!query) {
      setOptions([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(() => {
      void getGuardians({ search: query, limit: 20, page: 1 })
        .then((resp) => {
          if (!alive) return;
          setOptions(
            resp.items.map((g) => ({
              id: g.id,
              id_number: g.id_number ?? null,
              label: guardianLabel(g),
            })),
          );
        })
        .finally(() => {
          if (!alive) return;
          setLoading(false);
        });
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [query]);

  return (
    <Autocomplete
      options={options}
      value={value}
      onChange={(_, v) => onChange(v)}
      inputValue={inputValue}
      onInputChange={(_, v) => setInputValue(v)}
      getOptionLabel={(o) => o.label}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      disabled={disabled}
      loading={loading}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          fullWidth
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={18} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
}

