import { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Rating,
} from "@mui/material";
import { Add, Star } from "@mui/icons-material";

const mockReviews = [
  {
    id: "1",
    staff_name: "John Doe",
    period: "Q4 2023",
    rating: 4.5,
    reviewer: "Admin",
    date: "2024-01-05",
    status: "completed",
  },
  {
    id: "2",
    staff_name: "Jane Smith",
    period: "Q4 2023",
    rating: 5.0,
    reviewer: "Admin",
    date: "2024-01-03",
    status: "completed",
  },
];

export default function PerformanceTab() {
  return (
    <Box>
      {/* Actions */}
      <Box sx={{ mb: 2, textAlign: "right" }}>
        <Button variant="contained" startIcon={<Add />}>
          Create Review
        </Button>
      </Box>

      {/* Reviews Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Staff Member</TableCell>
              <TableCell>Review Period</TableCell>
              <TableCell>Rating</TableCell>
              <TableCell>Reviewer</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {mockReviews.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No performance reviews found
                </TableCell>
              </TableRow>
            ) : (
              mockReviews.map((review) => (
                <TableRow key={review.id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {review.staff_name}
                    </Typography>
                  </TableCell>
                  <TableCell>{review.period}</TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Rating value={review.rating} readOnly precision={0.5} size="small" />
                      <Typography variant="body2">({review.rating})</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{review.reviewer}</TableCell>
                  <TableCell>{review.date}</TableCell>
                  <TableCell>
                    <Chip
                      label={review.status}
                      color="success"
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Button size="small">View Details</Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
