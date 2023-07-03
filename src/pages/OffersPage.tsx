import React from "react";

import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";

function OffersPage() {
  return (
    <React.Fragment>
      <Box sx={{ width: "48rem" }}>
        <Paper sx={{ position: "relative", padding: "1.5rem" }} elevation={1}>
          <Typography sx={{ marginBottom: "0.75rem" }} variant="h5">
            Event Attendances:
          </Typography>
        </Paper>
      </Box>
    </React.Fragment>
  );
}

export default OffersPage;