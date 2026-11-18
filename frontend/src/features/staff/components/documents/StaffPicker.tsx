import { useEffect, useMemo, useState } from "react";
import { Autocomplete, CircularProgress, TextField } from "@mui/material";

import { listStaff, type Staff } from "../../../../api/staffManagement";

export type StaffOption = {
  id: string;
  label: string;
  employee_id: string | null;
};

function staffLabel(s: Staff): string {
  const name = (s.full_name || "").trim();
  if (s.employee_id) return `${name} (${s.employee_id})`;
  return name;
}

type Props = {
  label: string;
  value: StaffOption | null;
  onChange: (next: StaffOption | null) => void;
  disabled?: boolean;
};

export function StaffPicker(props: Props) {
  const { label, value, onChange, disabled } = props;
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<StaffOption[]>([]);

  const query = useMemo(() => inputValue.trim(), [inputValue]);

  useEffect(() => {
    let alive = true;
    if (!query) {
      setOptions([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(() => {
      void listStaff({ search: query, limit: 20, page: 1 })
        .then((resp) => {
          if (!alive) return;
          if (!resp.ok) {
            setOptions([]);
            return;
          }
          setOptions(
            (resp.data.items || []).map((s) => ({
              id: s.id,
              employee_id: s.employee_id ?? null,
              label: staffLabel(s),
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

