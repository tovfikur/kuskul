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

type CommonProps = {
  label: string;
  disabled?: boolean;
  classId?: string;
  sectionId?: string;
  loadWithoutSearch?: boolean;
  limit?: number;
};

type SingleProps = CommonProps & {
  multiple?: false;
  value: StudentOption | null;
  onChange: (next: StudentOption | null) => void;
};

type MultipleProps = CommonProps & {
  multiple: true;
  value: StudentOption[];
  onChange: (next: StudentOption[]) => void;
};

type Props = SingleProps | MultipleProps;

export function StudentPicker(props: Props) {
  const {
    label,
    value,
    disabled,
    classId,
    sectionId,
    multiple = false,
    loadWithoutSearch = false,
    limit = 20,
  } = props;

  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<StudentOption[]>([]);

  const query = useMemo(() => inputValue.trim(), [inputValue]);

  useEffect(() => {
    let alive = true;
    if (disabled) {
      setOptions([]);
      return;
    }
    const shouldLoad = Boolean(query || loadWithoutSearch || classId || sectionId);
    if (!shouldLoad) {
      setOptions([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(() => {
      void getStudents({
        search: query || undefined,
        class_id: classId || undefined,
        section_id: sectionId || undefined,
        limit,
      })
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
  }, [classId, disabled, limit, loadWithoutSearch, query, sectionId]);

  return (
    <Autocomplete
      multiple={multiple}
      options={options}
      value={value}
      onChange={(_, v) => {
        if (props.multiple) {
          props.onChange(Array.isArray(v) ? v : []);
          return;
        }
        props.onChange(Array.isArray(v) ? null : v);
      }}
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

