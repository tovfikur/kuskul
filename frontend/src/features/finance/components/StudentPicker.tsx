import { useEffect, useMemo, useState } from "react";
import { Autocomplete, CircularProgress, TextField } from "@mui/material";

import { getStudents, type Student } from "../../../api/people";

export type StudentOption = {
  id: string;
  label: string;
  admission_no: string | null;
};

function studentLabel(s: Student): string {
  const name = [s.first_name, s.last_name || ""].filter(Boolean).join(" ").trim();
  if (s.admission_no) return `${name} (${s.admission_no})`;
  return name;
}

type Props = {
  label: string;
  value: StudentOption | null;
  onChange: (next: StudentOption | null) => void;
  disabled?: boolean;
};

export function StudentPicker(props: Props) {
  const { label, value, onChange, disabled } = props;

  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<StudentOption[]>([]);

  const query = useMemo(() => inputValue.trim(), [inputValue]);

  useEffect(() => {
    let alive = true;
    if (!query) {
      setOptions([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(() => {
      void getStudents({ search: query, limit: 20 })
        .then((resp) => {
          if (!alive) return;
          setOptions(
            resp.items.map((s) => ({
              id: s.id,
              admission_no: s.admission_no ?? null,
              label: studentLabel(s),
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
                {loading ? <CircularProgress size={18} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
}

