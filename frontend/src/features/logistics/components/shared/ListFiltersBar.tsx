import {
  Box,
  Button,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";
import { Download, Refresh, Search } from "@mui/icons-material";

type ListFiltersBarProps = {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  statusValue?: string;
  onStatusChange?: (value: string) => void;
  statusOptions?: { value: string; label: string }[];
  additionalFilters?: React.ReactNode;
  onRefresh?: () => void;
  onExport?: () => void;
  loading?: boolean;
};

export default function ListFiltersBar({
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Search...",
  statusValue = "",
  onStatusChange,
  statusOptions,
  additionalFilters,
  onRefresh,
  onExport,
  loading = false,
}: ListFiltersBarProps) {
  return (
    <Box
      sx={{
        display: "flex",
        gap: 2,
        alignItems: "center",
        flexWrap: "wrap",
        mb: 2,
      }}
    >
      {/* Left: Search and Filters */}
      <Box sx={{ display: "flex", gap: 2, flexGrow: 1, flexWrap: "wrap" }}>
        {onSearchChange && (
          <TextField
            size="small"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            sx={{ minWidth: 250 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
        )}

        {statusOptions && onStatusChange && (
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusValue}
              label="Status"
              onChange={(e) => onStatusChange(e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              {statusOptions.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {additionalFilters}
      </Box>

      {/* Right: Actions */}
      <Box sx={{ display: "flex", gap: 1 }}>
        {onRefresh && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<Refresh />}
            onClick={onRefresh}
            disabled={loading}
          >
            Refresh
          </Button>
        )}
        {onExport && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<Download />}
            onClick={onExport}
            disabled={loading}
          >
            Export CSV
          </Button>
        )}
      </Box>
    </Box>
  );
}
